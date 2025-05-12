'use client'

import toast from 'react-hot-toast'

import { useCluster } from '@/components/cluster/cluster-data-access'
import { useAnchorProvider } from '@/components/solana/solana-provider'
import { useTransactionToast } from '@/components/ui/ui-layout'
import type * as anchorTypes from '@coral-xyz/anchor'
import * as anchor from '@coral-xyz/anchor'
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
      expectedResolutionDate: anchorTypes.BN
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
    mutationFn: async (params: {
      marketPDA: PublicKey
      bet: boolean
      amount: anchorTypes.BN
    }) => {
      if (!provider.wallet.publicKey) {
        throw new Error('Wallet not connected')
      }

      const [marketMetadataPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('market_metadata'), params.marketPDA.toBuffer()],
        program.programId
      )

      const [marketVoterPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('market_voter'),
          provider.wallet.publicKey.toBuffer(),
          params.marketPDA.toBuffer()
        ],
        program.programId
      )

      console.log({
        marketPDA: params.marketPDA.toBase58(),
        marketMetadataPDA: marketMetadataPDA.toBase58(),
        marketVoterPDA: marketVoterPDA.toBase58(),
        betting: params.bet ? 'YES' : 'NO',
        amount: params.amount.toString()
      })

      try {
        return await program.methods
          .buy(params.bet, params.amount)
          .accounts({
            market: params.marketPDA,
            signer: provider.wallet.publicKey
          })
          .rpc()
      } catch (error) {
        console.error('Error executing buy transaction:', error)
        throw error
      }
    },
    onSuccess: (signature) => {
      transactionToast(signature)
      toast.success('Your bet has been placed successfully!')
    },
    onError: (error) => {
      toast.error('Failed to place bet')
      console.error(error)
    }
  })

  const { mutateAsync: sell } = useMutation({
    mutationKey: ['yapping', 'sell', { cluster }],
    mutationFn: async (params: {
      marketPDA: PublicKey
      bet: boolean
      shares: anchorTypes.BN
    }) => {
      if (!provider.wallet.publicKey) {
        throw new Error('Wallet not connected')
      }

      const [marketMetadataPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('market_metadata'), params.marketPDA.toBuffer()],
        program.programId
      )

      const [marketVoterPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('market_voter'),
          provider.wallet.publicKey.toBuffer(),
          params.marketPDA.toBuffer()
        ],
        program.programId
      )

      console.log({
        marketPDA: params.marketPDA.toBase58(),
        marketMetadataPDA: marketMetadataPDA.toBase58(),
        marketVoterPDA: marketVoterPDA.toBase58(),
        selling: params.bet ? 'YES' : 'NO',
        shares: params.shares.toString()
      })

      try {
        // Use lower-level rpc call to bypass TypeScript checking
        return await program.rpc.sell(params.bet, params.shares, {
          accounts: {
            market: params.marketPDA,
            marketMetadata: marketMetadataPDA,
            marketVoter: marketVoterPDA,
            signer: provider.wallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId
          }
        })
      } catch (error) {
        console.error('Error executing sell transaction:', error)
        throw error
      }
    },
    onSuccess: (signature) => {
      transactionToast(signature)
      toast.success('Your shares have been sold successfully!')
    },
    onError: (error) => {
      toast.error('Failed to sell shares')
      console.error(error)
    }
  })

  // commented coz only validator can resolve market
  //   const resolveMarketInstruction = useMutation({
  //     mutationKey: ['yapping', 'resolveMarket', { cluster }],
  //     mutationFn: (params: { answer: boolean }) =>
  //       program.methods.resolveMarket(params.answer).rpc()
  //   })

  const { mutateAsync: withdrawRewards } = useMutation({
    mutationKey: ['yapping', 'withdrawRewards', { cluster }],
    mutationFn: async (params: { marketPDA: PublicKey }) => {
      if (!provider.wallet.publicKey) {
        throw new Error('Wallet not connected')
      }

      // Find the market metadata PDA
      const [marketMetadataPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('market_metadata'), params.marketPDA.toBuffer()],
        program.programId
      )

      // Find the market voter PDA for the current user
      const [marketVoterPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('market_voter'),
          provider.wallet.publicKey.toBuffer(),
          params.marketPDA.toBuffer()
        ],
        program.programId
      )

      console.log({
        marketPDA: params.marketPDA.toBase58(),
        marketMetadataPDA: marketMetadataPDA.toBase58(),
        marketVoterPDA: marketVoterPDA.toBase58(),
        user: provider.wallet.publicKey.toBase58()
      })

      try {
        return await program.methods
          .withdrawRewards()
          .accounts({
            market: params.marketPDA,
            user: provider.wallet.publicKey
          })
          .rpc()
      } catch (error) {
        console.error('Error executing withdraw rewards transaction:', error)
        throw error
      }
    },
    onSuccess: (signature) => {
      transactionToast(signature)
      toast.success('Rewards withdrawn successfully!')
    },
    onError: (error) => {
      toast.error('Failed to withdraw rewards')
      console.error(error)
    }
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
