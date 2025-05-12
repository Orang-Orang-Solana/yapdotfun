'use client'

import { useCluster } from '@/components/cluster/cluster-data-access'
import { useAnchorProvider } from '@/components/solana/solana-provider'
import type { MarketAccount } from '@/types/yapping'
import type { Program } from '@coral-xyz/anchor'
import {
  type Yapping,
  getYappingProgram,
  YAPPING_PROGRAM_ID as programId
} from '@project/anchor'
import { useConnection } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { useQuery } from '@tanstack/react-query'

export function useYappingMarketFetchers(address?: string) {
  const { connection } = useConnection()
  const { cluster } = useCluster()
  const provider = useAnchorProvider()
  const program = getYappingProgram(provider)

  const getProgramAccount = useQuery({
    queryKey: ['get-program-account', { cluster }],
    queryFn: () => connection.getParsedAccountInfo(programId)
  })

  const marketAccount = useQuery({
    queryKey: ['get-market-account', { cluster }],
    queryFn: () => program.account.market.fetch(address ?? ''),
    enabled: !!address
  })

  const { data: marketAccounts } = useQuery({
    queryKey: ['get-market-accounts', { cluster }],
    queryFn: () => getMarketAccounts(program)
  })

  console.info('marketaccounts->2', marketAccounts)

  return {
    program,
    programId,
    getProgramAccount,
    marketAccount,
    marketAccounts
  }
}

export async function getMarketAccounts(
  program: Program<Yapping>
): Promise<MarketAccount[]> {
  const marketAccounts = await program.account.market.all()
  console.info('marketAccounts->', marketAccounts)
  const marketWithMetadata = await Promise.all(
    marketAccounts.map(async (market) => {
      // find PDA for market metadata
      const [marketMetadataPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('market_metadata'), market.publicKey.toBuffer()],
        program.programId
      )

      console.info('marketMetadataPDA->', marketMetadataPDA)

      const marketMetadata =
        await program.account.marketMetadata.fetch(marketMetadataPDA)

      return { ...market, ...marketMetadata }
    })
  )

  return marketWithMetadata
}
