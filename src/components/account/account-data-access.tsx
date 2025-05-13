'use client'

import toast from 'react-hot-toast'

import { useQueryInvalidation } from '@/hooks/use-query-invalidation'
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import {
  type Connection,
  LAMPORTS_PER_SOL,
  type PublicKey,
  SystemProgram,
  TransactionMessage,
  type TransactionSignature,
  VersionedTransaction
} from '@solana/web3.js'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useTransactionToast } from '../ui/ui-layout'

export function useGetBalance({ address }: { address: PublicKey }) {
  const { connection } = useConnection()

  return useQuery({
    queryKey: ['get-balance', { endpoint: connection.rpcEndpoint, address }],
    queryFn: () => connection.getBalance(address)
  })
}

export function useGetSignatures({ address }: { address: PublicKey }) {
  const { connection } = useConnection()

  return useQuery({
    queryKey: ['get-signatures', { endpoint: connection.rpcEndpoint, address }],
    queryFn: () => connection.getSignaturesForAddress(address)
  })
}

export function useGetTokenAccounts({ address }: { address: PublicKey }) {
  const { connection } = useConnection()

  return useQuery({
    queryKey: [
      'get-token-accounts',
      { endpoint: connection.rpcEndpoint, address }
    ],
    queryFn: async () => {
      const [tokenAccounts, token2022Accounts] = await Promise.all([
        connection.getParsedTokenAccountsByOwner(address, {
          programId: TOKEN_PROGRAM_ID
        }),
        connection.getParsedTokenAccountsByOwner(address, {
          programId: TOKEN_2022_PROGRAM_ID
        })
      ])
      return [...tokenAccounts.value, ...token2022Accounts.value]
    }
  })
}

export function useTransferSol({ address }: { address: PublicKey }) {
  const { connection } = useConnection()
  const transactionToast = useTransactionToast()
  const wallet = useWallet()
  const client = useQueryClient()
  const { invalidateBalanceData } = useQueryInvalidation()

  return useMutation({
    mutationKey: [
      'transfer-sol',
      { endpoint: connection.rpcEndpoint, address }
    ],
    mutationFn: async (input: { destination: PublicKey; amount: number }) => {
      let signature: TransactionSignature = ''
      try {
        const { transaction, latestBlockhash } = await createTransaction({
          publicKey: address,
          destination: input.destination,
          amount: input.amount,
          connection
        })

        // Send transaction and await for signature
        signature = await wallet.sendTransaction(transaction, connection)

        // Send transaction and await for signature
        await connection.confirmTransaction(
          { signature, ...latestBlockhash },
          'confirmed'
        )

        console.log(signature)
        return signature
      } catch (error: unknown) {
        console.log('error', `Transaction failed! ${error}`, signature)

        return
      }
    },
    onSuccess: (signature) => {
      if (signature) {
        transactionToast(signature)
      }
      invalidateBalanceData()
    },
    onError: (error) => {
      toast.error(`Transaction failed! ${error}`)
    }
  })
}

export function useRequestAirdrop({ address }: { address: PublicKey }) {
  const { connection } = useConnection()
  const transactionToast = useTransactionToast()
  const client = useQueryClient()
  const { invalidateBalanceData } = useQueryInvalidation()

  return useMutation<string, Error, number>({
    mutationKey: ['airdrop', { endpoint: connection.rpcEndpoint, address }],
    mutationFn: async (amount = 1) => {
      // Convert amount to lamports (LAMPORTS_PER_SOL is a numeric constant)
      const lamports = Number(amount) * LAMPORTS_PER_SOL

      const [latestBlockhash, signature] = await Promise.all([
        connection.getLatestBlockhash(),
        connection.requestAirdrop(address, lamports)
      ])

      await connection.confirmTransaction(
        { signature, ...latestBlockhash },
        'confirmed'
      )
      return signature
    },
    onSuccess: (signature) => {
      transactionToast(signature)
      invalidateBalanceData()
    }
  })
}

async function createTransaction({
  publicKey,
  destination,
  amount,
  connection
}: {
  publicKey: PublicKey
  destination: PublicKey
  amount: number
  connection: Connection
}): Promise<{
  transaction: VersionedTransaction
  latestBlockhash: { blockhash: string; lastValidBlockHeight: number }
}> {
  // Get the latest blockhash to use in our transaction
  const latestBlockhash = await connection.getLatestBlockhash()

  // Create instructions to send, in this case a simple transfer
  const instructions = [
    SystemProgram.transfer({
      fromPubkey: publicKey,
      toPubkey: destination,
      lamports: amount * LAMPORTS_PER_SOL
    })
  ]

  // Create a new TransactionMessage with version and compile it to legacy
  const messageLegacy = new TransactionMessage({
    payerKey: publicKey,
    recentBlockhash: latestBlockhash.blockhash,
    instructions
  }).compileToLegacyMessage()

  // Create a new VersionedTransaction which supports legacy and v0
  const transaction = new VersionedTransaction(messageLegacy)

  return {
    transaction,
    latestBlockhash
  }
}
