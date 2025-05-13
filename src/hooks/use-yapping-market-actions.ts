'use client'

import toast from 'react-hot-toast'

import { useCluster } from '@/components/cluster/cluster-data-access'
import { useAnchorProvider } from '@/components/solana/solana-provider'
import { useTransactionToast } from '@/components/ui/ui-layout'
import { useQueryInvalidation } from '@/hooks/use-query-invalidation'
import type * as anchorTypes from '@coral-xyz/anchor'
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
  const { invalidateMarketData } = useQueryInvalidation()

  const getProgramAccount = useQuery({
    queryKey: ['get-program-account', { cluster }],
    queryFn: () => connection.getParsedAccountInfo(programId)
  })

  const { mutateAsync: initializeMarket } = useMutation({
    mutationKey: ['yapping', 'initializeMarket', { cluster }],
    mutationFn: async (params: {
      description: string
      imageUrl: string
      endTime: anchorTypes.BN
    }) => {
      if (!provider.wallet.publicKey) {
        throw new Error('Wallet not connected')
      }
      const descHashResponse = await fetch(
        `/api/get-desc-hash?desc=${encodeURIComponent(params.description)}`
      )
      if (!descHashResponse.ok) {
        throw new Error('Failed to get description hash')
      }
      const hashedDescBytes = await descHashResponse.arrayBuffer()
      const hashedDesc = Buffer.from(hashedDescBytes)

      if (hashedDesc.length !== 32) {
        throw new Error('Description hash must be 32 bytes')
      }

      const [marketPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('market'), hashedDesc],
        program.programId
      )

      console.table({
        marketPDA: marketPDA.toBase58(),
        hashedDesc: hashedDesc.toString('hex'),
        description: params.description,
        imageUrl: params.imageUrl,
        endTime: params.endTime
      })

      return program.methods
        .initializeMarket(params.description, params.imageUrl, params.endTime)
        .accounts({
          market: marketPDA,
          signer: provider.wallet.publicKey
        })
        .rpc()
    },
    onSuccess: (signature) => {
      transactionToast(signature)
      toast.success('Market initialized successfully!')
      invalidateMarketData(undefined)
    },
    onError: (error) => {
      toast.error(`Failed to initialize market: ${(error as Error).message}`)
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

      const [marketPositionPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('market_position'),
          params.marketPDA.toBuffer(),
          provider.wallet.publicKey.toBuffer()
        ],
        program.programId
      )

      const [vaultPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('vault'),
          params.marketPDA.toBuffer(),
          provider.wallet.publicKey.toBuffer()
        ],
        program.programId
      )

      console.log({
        marketPDA: params.marketPDA.toBase58(),
        marketPositionPDA: marketPositionPDA.toBase58(),
        vaultPDA: vaultPDA.toBase58(),
        signer: provider.wallet.publicKey.toBase58(),
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
        toast.error(`Failed to place bet: ${(error as Error).message}`)
        throw error
      }
    },
    onSuccess: (signature, variables) => {
      transactionToast(signature)
      toast.success('Your bet has been placed successfully!')
      invalidateMarketData(variables.marketPDA.toBase58())
    },
    onError: (error: unknown) => {
      if (error instanceof Error) {
        if (!error.message?.includes('Failed to place bet')) {
          toast.error(`Bet placement failed: ${error.message}`)
        }
      } else {
        toast.error('An unknown error occurred during bet placement.')
      }
      console.error(error)
    }
  })

  const { mutateAsync: sell } = useMutation({
    mutationKey: ['yapping', 'sell', { cluster }],
    mutationFn: async (params: {
      marketPDA: PublicKey
      shares: anchorTypes.BN
    }) => {
      if (!provider.wallet.publicKey) {
        throw new Error('Wallet not connected')
      }

      const [marketPositionPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('market_position'),
          params.marketPDA.toBuffer(),
          provider.wallet.publicKey.toBuffer()
        ],
        program.programId
      )

      const [vaultPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('vault'),
          params.marketPDA.toBuffer(),
          provider.wallet.publicKey.toBuffer()
        ],
        program.programId
      )

      console.log({
        marketPDA: params.marketPDA.toBase58(),
        marketPositionPDA: marketPositionPDA.toBase58(),
        vaultPDA: vaultPDA.toBase58(),
        signer: provider.wallet.publicKey.toBase58(),
        shares: params.shares.toString()
      })

      try {
        return await program.methods
          .sell(params.shares)
          .accounts({
            market: params.marketPDA,
            signer: provider.wallet.publicKey
          })
          .rpc()
      } catch (error) {
        console.error('Error executing sell transaction:', error)
        toast.error(`Failed to sell shares: ${(error as Error).message}`)
        throw error
      }
    },
    onSuccess: (signature, variables) => {
      transactionToast(signature)
      toast.success('Your shares have been sold successfully!')
      invalidateMarketData(variables.marketPDA.toBase58())
    },
    onError: (error: unknown) => {
      if (error instanceof Error) {
        if (!error.message?.includes('Failed to sell shares')) {
          toast.error(`Share sell failed: ${error.message}`)
        }
      } else {
        toast.error('An unknown error occurred during share sell.')
      }
      console.error(error)
    }
  })

  // commented out coz only validators can close markets
  // const { mutateAsync: closeMarket } = useMutation({
  //   mutationKey: ['yapping', 'closeMarket', { cluster }],
  //   mutationFn: async (params: { marketPDA: PublicKey }) => {
  //     throw new Error('Not implemented')
  //   }
  // })

  const { mutateAsync: withdrawRewards } = useMutation({
    mutationKey: ['yapping', 'withdrawRewards', { cluster }],
    mutationFn: async (params: { marketPDA: PublicKey }) => {
      if (!provider.wallet.publicKey) {
        throw new Error('Wallet not connected')
      }

      const [marketPositionPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('market_position'),
          params.marketPDA.toBuffer(),
          provider.wallet.publicKey.toBuffer()
        ],
        program.programId
      )

      const [vaultPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('vault'),
          params.marketPDA.toBuffer(),
          provider.wallet.publicKey.toBuffer()
        ],
        program.programId
      )

      console.log({
        marketPDA: params.marketPDA.toBase58(),
        marketPositionPDA: marketPositionPDA.toBase58(),
        vaultPDA: vaultPDA.toBase58(),
        signer: provider.wallet.publicKey.toBase58()
      })

      try {
        return await program.methods
          .withdrawRewards()
          .accounts({
            market: params.marketPDA,
            signer: provider.wallet.publicKey
          })
          .rpc()
      } catch (error) {
        console.error('Error executing withdraw rewards transaction:', error)
        toast.error(`Failed to withdraw rewards: ${(error as Error).message}`)
        throw error
      }
    },
    onSuccess: (signature, variables) => {
      transactionToast(signature)
      toast.success('Your rewards have been withdrawn successfully!')
      invalidateMarketData(variables.marketPDA.toBase58())
    },
    onError: (error: unknown) => {
      if (error instanceof Error) {
        if (!error.message?.includes('Failed to withdraw rewards')) {
          toast.error(`Withdrawal failed: ${error.message}`)
        }
      } else {
        toast.error('An unknown error occurred during rewards withdrawal.')
      }
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
    // closeMarket,
    withdrawRewards
  }
}
