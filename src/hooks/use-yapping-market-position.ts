'use client'

import { useCluster } from '@/components/cluster/cluster-data-access'
import { useAnchorProvider } from '@/components/solana/solana-provider'
import { getYappingProgram } from '@project/anchor'
import { useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { useQuery, useQueryClient } from '@tanstack/react-query'

// Constant to match the backend's share calculation
// 1,000,000 lamports per share
const LAMPORTS_PER_SHARE = 1_000_000

// Helper function to convert amount to shares - mimics backend IntoShares trait
function intoShares(amount: number): number {
  return Math.floor(amount / LAMPORTS_PER_SHARE)
}

export function useYappingMarketPosition(marketAddress?: string) {
  const { cluster } = useCluster()
  const provider = useAnchorProvider()
  const program = getYappingProgram(provider)
  const { publicKey } = useWallet()
  const queryClient = useQueryClient()
  const {
    data: positionData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['get-market-position', { cluster, marketAddress, publicKey }],
    queryFn: async () => {
      if (!publicKey || !marketAddress) {
        return null
      }

      try {
        const marketPDA = new PublicKey(marketAddress)

        // Find market position PDA
        const [marketPosition] = PublicKey.findProgramAddressSync(
          [
            Buffer.from('market_position'),
            marketPDA.toBuffer(),
            publicKey.toBuffer()
          ],
          program.programId
        )

        // Fetch market position data
        const marketPositionData =
          await program.account.marketPosition.fetch(marketPosition)

        // Use the same share calculation logic as the backend
        const userAmount = marketPositionData.amount.toNumber()
        const userShares = intoShares(userAmount)

        return {
          bet: marketPositionData.bet,
          amount: userAmount,
          shares: userShares,
          pubkey: marketPosition
        }
      } catch (error) {
        console.log('No position data found for this market and user', error)
        return null
      }
    },
    enabled: !!publicKey && !!marketAddress
  })

  function invalidatePositionData() {
    queryClient.invalidateQueries({
      queryKey: ['get-market-position', { cluster, marketAddress, publicKey }]
    })
  }

  return {
    positionData,
    isLoading,
    error,
    refetch,
    invalidatePositionData
  }
}
