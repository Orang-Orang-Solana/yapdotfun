'use client'

import toast from 'react-hot-toast'

import { useCluster } from '@/components/cluster/cluster-data-access'
import { useAnchorProvider } from '@/components/solana/solana-provider'
import { useTransactionToast } from '@/components/ui/ui-layout'
import type * as anchor from '@coral-xyz/anchor'
import {
  getYappingProgram,
  YAPPING_PROGRAM_ID as programId
} from '@project/anchor'
import { useConnection } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { useMutation, useQuery } from '@tanstack/react-query'

export function useYappingMarketActions() {
  const { connection } = useConnection()
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const provider = useAnchorProvider()
  const program = getYappingProgram(provider)

  const getProgramAccount = useQuery({
    queryKey: ['get-program-account', { cluster }],
    queryFn: () => connection.getParsedAccountInfo(programId)
  })

  const { mutateAsync: initializeMarket } = useMutation({
    mutationKey: ['yapping', 'initializeMarket', { cluster }],
    mutationFn: async (params: {
      description: string
      imageUrl: string
      expectedResolutionDate: anchor.BN
    }) => {
      const descHash = await fetch(
        `/api/get-desc-hash?desc=${params.description}`
      )

      const response = await descHash.arrayBuffer()
      const hashedDesc = Buffer.from(response)

      const [marketPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('market'), hashedDesc],
        program.programId
      )

      console.table({
        marketPDA: marketPDA.toBase58(),
        hashedDesc: hashedDesc.toString('hex')
      })

      return program.methods
        .initializeMarket(
          params.description,
          params.imageUrl,
          params.expectedResolutionDate
        )
        .accounts({
          market: marketPDA
        })
        .rpc()
    },
    onSuccess: (signature) => {
      transactionToast(signature)
    },
    onError: (error) => {
      toast.error('Failed to initialize market')
      console.error(error)
    }
  })

  const { mutateAsync: buy } = useMutation({
    mutationKey: ['yapping', 'buy', { cluster }],
    mutationFn: (params: { bet: boolean; amount: anchor.BN }) =>
      program.methods.buy(params.bet, params.amount).rpc()
  })

  const { mutateAsync: sell } = useMutation({
    mutationKey: ['yapping', 'sell', { cluster }],
    mutationFn: (params: { bet: boolean; shares: anchor.BN }) =>
      program.methods.sell(params.bet, params.shares).rpc()
  })

  // commented coz only validator can resolve market
  //   const resolveMarketInstruction = useMutation({
  //     mutationKey: ['yapping', 'resolveMarket', { cluster }],
  //     mutationFn: (params: { answer: boolean }) =>
  //       program.methods.resolveMarket(params.answer).rpc()
  //   })

  const { mutateAsync: withdrawRewards } = useMutation({
    mutationKey: ['yapping', 'withdrawRewards', { cluster }],
    mutationFn: () => program.methods.withdrawRewards().rpc()
  })

  return {
    program,
    programId,
    getProgramAccount,
    initializeMarket,
    buy,
    sell,
    //   resolveMarket: resolveMarketInstruction.mutate,
    withdrawRewards
  }
}
