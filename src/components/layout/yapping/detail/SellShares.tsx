'use client'

import { useState } from 'react'
import { toast } from 'sonner'

import { useAnchorProvider } from '@/components/solana/solana-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTransactionToast } from '@/components/ui/ui-layout'
import { BN } from '@coral-xyz/anchor'
import { getYappingProgram } from '@project/anchor'
import { useWallet } from '@solana/wallet-adapter-react'
import { LAMPORTS_PER_SOL, PublicKey, Transaction } from '@solana/web3.js'

// Constant to match the backend's share calculation
const LAMPORTS_PER_SHARE = 1_000_000

interface SellSharesProps {
  marketPublicKey: string
  userVote?: boolean | null
  userShares?: number
  userAmount?: number
}

export default function SellShares({
  marketPublicKey,
  userVote,
  userShares = 0,
  userAmount = 0
}: SellSharesProps) {
  const [sharesToSell, setSharesToSell] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const { connected } = useWallet()
  const transactionToast = useTransactionToast()
  const provider = useAnchorProvider()
  const program = getYappingProgram(provider)

  // Calculate the maximum shares the user can sell
  const maxShares = userAmount ? Math.floor(userAmount / LAMPORTS_PER_SHARE) : 0
  const hasShares = maxShares > 0 && userVote !== null && userVote !== undefined

  // Calculate the SOL value of the shares
  const solValue = sharesToSell
    ? ((Number(sharesToSell) * LAMPORTS_PER_SHARE) / LAMPORTS_PER_SOL).toFixed(
        3
      )
    : '0'

  async function submitSell() {
    if (!sharesToSell || !connected || !marketPublicKey || !hasShares) {
      toast.error('Please connect your wallet and enter the amount of shares')
      return
    }

    if (!provider.wallet.publicKey) {
      toast.error('Wallet not connected')
      return
    }

    try {
      setIsLoading(true)

      // Convert shares to a number and then to BN
      const shares = new BN(Math.floor(Number(sharesToSell)))

      // Make sure user isn't trying to sell more than they have
      if (shares.gt(new BN(maxShares))) {
        toast.error(`You can't sell more than ${maxShares} shares`)
        return
      }

      // Prepare market PublicKey
      const marketPDA = new PublicKey(marketPublicKey)

      // Find the PDAs needed for the instruction
      const [marketMetadataPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('market_metadata'), marketPDA.toBuffer()],
        program.programId
      )

      const [marketVoterPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('market_voter'),
          provider.wallet.publicKey.toBuffer(),
          marketPDA.toBuffer()
        ],
        program.programId
      )

      // Create the instruction directly
      const sellInstruction = await program.methods
        .sell(!!userVote, shares)
        .accounts({
          market: marketPDA
          // Use this approach to bypass TypeScript interface issues
        })
        .instruction()

      // Manually add all accounts
      sellInstruction.keys = [
        { pubkey: marketPDA, isWritable: true, isSigner: false },
        { pubkey: marketMetadataPDA, isWritable: true, isSigner: false },
        { pubkey: marketVoterPDA, isWritable: true, isSigner: false },
        { pubkey: provider.wallet.publicKey, isWritable: true, isSigner: true },
        {
          pubkey: new PublicKey('11111111111111111111111111111111'),
          isWritable: false,
          isSigner: false
        }
      ]

      // Create and send the transaction
      const transaction = new Transaction().add(sellInstruction)
      const signature = await provider.sendAndConfirm(transaction)

      // Show success message
      transactionToast(signature)
      toast.success('Shares sold successfully!')

      // Reset form
      setSharesToSell('')
    } catch (error) {
      console.error('Selling error:', error)
      toast.error('Failed to sell shares. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!hasShares) {
    return (
      <div className="space-y-5 border rounded p-5 mt-5">
        <h1 className="font-medium">Sell Your Shares</h1>
        <p className="text-sm text-muted-foreground">
          You don&apos;t have any shares to sell in this market.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5 border rounded p-5 mt-5">
      <h1 className="font-medium">Sell Your Shares</h1>
      <div className="p-3 bg-muted rounded-md">
        <p className="text-sm">
          <span className="text-muted-foreground">Your position: </span>
          <span className="font-medium">
            {userVote ? 'YES' : 'NO'} ({maxShares} shares)
          </span>
        </p>
        <p className="text-sm mt-1">
          <span className="text-muted-foreground">Amount invested: </span>
          <span className="font-medium">
            {(userAmount / LAMPORTS_PER_SOL).toFixed(3)} SOL
          </span>
        </p>
      </div>
      <section className="space-y-5">
        <div className="flex items-center relative">
          <Input
            placeholder="Shares to sell"
            type="number"
            value={sharesToSell}
            onChange={(e) => setSharesToSell(e.target.value)}
            disabled={isLoading}
            max={maxShares}
            min={1}
            step={1}
          />
          <span className="bg-black border p-1 px-3 font-semibold rounded-md absolute right-0">
            Shares
          </span>
        </div>
        <div className="text-sm text-muted-foreground">
          {Number(sharesToSell) > 0 && (
            <p>
              Selling {sharesToSell} shares (≈ {solValue} SOL)
              {Number(sharesToSell) < maxShares && (
                <span>
                  {' '}
                  - You will still have {maxShares - Number(sharesToSell)}{' '}
                  shares after this sale
                </span>
              )}
            </p>
          )}
        </div>
        <Button
          onClick={submitSell}
          disabled={
            !sharesToSell ||
            isLoading ||
            !connected ||
            Number(sharesToSell) > maxShares ||
            Number(sharesToSell) <= 0
          }
          variant="destructive"
        >
          {isLoading ? 'Selling...' : 'Sell Shares'}
        </Button>
      </section>
    </div>
  )
}
