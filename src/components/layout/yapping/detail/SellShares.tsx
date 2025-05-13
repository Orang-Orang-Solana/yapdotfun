'use client'

import { useState } from 'react'
import { toast } from 'sonner'

import { useAnchorProvider } from '@/components/solana/solana-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTransactionToast } from '@/components/ui/ui-layout'
import { useYappingMarketActions } from '@/hooks/use-yapping-market-actions'
import { BN } from '@coral-xyz/anchor'
import { useWallet } from '@solana/wallet-adapter-react'
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'

// Declare global function for TypeScript
declare global {
  interface Window {
    refreshMarketChart?: (marketId: string) => void
  }
}

// Constant to match the backend's share calculation
const LAMPORTS_PER_SHARE = 1_000_000

interface SellSharesProps {
  marketPublicKey: string
  userVote?: boolean | null
  userShares?: number
  userAmount?: number
  isMarketOpen?: boolean
}

// Helper to hash a string in the same way as the Rust code
async function hashString(str: string): Promise<Buffer> {
  // Create a UTF-8 encoded buffer from the string
  const msgBuffer = new TextEncoder().encode(str)

  // Hash it using the Web Crypto API (SHA-256)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)

  // Convert to a Buffer
  return Buffer.from(new Uint8Array(hashBuffer))
}

export default function SellShares({
  marketPublicKey,
  userVote,
  userShares = 0,
  userAmount = 0,
  isMarketOpen = false
}: SellSharesProps) {
  const [sharesToSell, setSharesToSell] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const { connected } = useWallet()
  const transactionToast = useTransactionToast()
  const provider = useAnchorProvider()
  const { sell } = useYappingMarketActions()

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

    if (!isMarketOpen) {
      toast.error('Market must be open before selling shares')
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

      const tx = await sell({
        marketPDA,
        shares
      })

      // Show success message
      transactionToast(tx)
      toast.success('Shares sold successfully!')

      // Trigger UI updates by dispatching a custom event
      window.dispatchEvent(
        new CustomEvent('market-update', {
          detail: { marketId: marketPublicKey }
        })
      )

      // Also try to use the global refresh function if available
      if (window.refreshMarketChart) {
        window.refreshMarketChart(marketPublicKey)
      }

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

  if (!isMarketOpen) {
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
        <p className="text-sm text-warning-foreground font-medium">
          Market must be open to sell shares. This is a requirement from the
          Solana program.
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
