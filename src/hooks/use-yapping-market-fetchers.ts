'use client'

import { useCluster } from '@/components/cluster/cluster-data-access'
import { useAnchorProvider } from '@/components/solana/solana-provider'
import type { Program } from '@coral-xyz/anchor'
import {
  type Yapping,
  getYappingProgram,
  YAPPING_PROGRAM_ID as programId
} from '@project/anchor'
import { useConnection } from '@solana/wallet-adapter-react'
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

  return {
    program,
    programId,
    getProgramAccount,
    marketAccount,
    marketAccounts
  }
}

export async function getMarketAccounts(program: Program<Yapping>) {
  const marketAccounts = await program.account.market.all()
  console.info('marketAccounts->', marketAccounts)

  return marketAccounts
}
