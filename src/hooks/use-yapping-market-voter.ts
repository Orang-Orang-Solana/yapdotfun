'use client'

import { useCluster } from '@/components/cluster/cluster-data-access'
import { useAnchorProvider } from '@/components/solana/solana-provider'
import { getYappingProgram } from '@project/anchor'
import { useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { useQuery } from '@tanstack/react-query'

// Constant to match the backend's share calculation
// 1,000,000 lamports per share
const LAMPORTS_PER_SHARE = 1_000_000

// Helper function to convert amount to shares - mimics backend IntoShares trait
function intoShares(amount: number): number {
  return Math.floor(amount / LAMPORTS_PER_SHARE)
}

export function useYappingMarketVoter(marketAddress?: string) {
  const { cluster } = useCluster()
  const provider = useAnchorProvider()
  const program = getYappingProgram(provider)
  const { publicKey } = useWallet()

  const {
    data: voterData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['get-market-voter', { cluster, marketAddress, publicKey }],
    queryFn: async () => {
      if (!publicKey || !marketAddress) {
        return null
      }

      try {
        const marketPDA = new PublicKey(marketAddress)

        // Find market voter PDA
        const [marketVoterPDA] = PublicKey.findProgramAddressSync(
          [
            Buffer.from('market_voter'),
            publicKey.toBuffer(),
            marketPDA.toBuffer()
          ],
          program.programId
        )

        // Fetch market voter data
        const marketVoterData =
          await program.account.marketVoter.fetch(marketVoterPDA)

        // Find market metadata PDA
        const [marketMetadataPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from('market_metadata'), marketPDA.toBuffer()],
          program.programId
        )

        // Get market metadata
        const marketMetadata =
          await program.account.marketMetadata.fetch(marketMetadataPDA)

        // Use the same share calculation logic as the backend
        const userAmount = marketVoterData.amount.toNumber()
        const userShares = intoShares(userAmount)

        return {
          vote: marketVoterData.vote,
          amount: userAmount,
          shares: userShares,
          pubkey: marketVoterPDA
        }
      } catch (error) {
        console.log('No voter data found for this market and user', error)
        return null
      }
    },
    enabled: !!publicKey && !!marketAddress
  })

  return {
    voterData,
    isLoading,
    error,
    refetch
  }
}
