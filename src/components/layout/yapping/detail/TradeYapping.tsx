'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

export default function TradeYapping({
  chanceBetYES,
  chanceBetNO,
  marketPublicKey
}: {
  chanceBetYES: number
  chanceBetNO: number
  marketPublicKey: string
}) {
  const [amount, setAmount] = useState<string>('')
  const [betting, setBetting] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [accumulativePayout, setAccumulativePayout] = useState<number | null>(
    null
  )
  const { buy } = useYappingMarketActions()
  const { connected } = useWallet()

  // Use a ref to track previous values to avoid unnecessary updates
  const prevAmountRef = useRef<string>('')
  const prevBettingRef = useRef<number | null>(null)

  // Update accumulative payouts whenever amount or betting changes
  useEffect(() => {
    // Only update if the values have actually changed
    if (
      prevAmountRef.current === amount &&
      prevBettingRef.current === betting
    ) {
      return
    }

    prevAmountRef.current = amount
    prevBettingRef.current = betting

    if (betting !== null && amount) {
      try {
        const amountNum = Number.parseFloat(amount)
        if (!Number.isNaN(amountNum)) {
          const payout =
            betting === 1
              ? (amountNum * chanceBetYES) / 100 + amountNum
              : (amountNum * chanceBetNO) / 100 + amountNum
          setAccumulativePayout(payout)
        }
      } catch (error) {
        console.error('Error calculating payout:', error)
        setAccumulativePayout(null)
      }
    } else {
      setAccumulativePayout(null)
    }
  }, [amount, betting, chanceBetYES, chanceBetNO])

  function chooseBetting(bet: number) {
    if (bet === betting) return // Don't update if the same value
    setBetting(bet)
    console.log(`You chose: ${bet === 1 ? 'YES' : 'NO'}`)
  }

  async function submitBetting() {
    if (!amount || !connected || !marketPublicKey) {
      toast.error('Please connect your wallet and enter an amount')
      return
    }

    try {
      setIsLoading(true)
      // Convert amount from SOL to lamports
      const lamports = new BN(Number.parseFloat(amount) * LAMPORTS_PER_SOL)

      // Prepare market PublicKey
      const marketPDA = new PublicKey(marketPublicKey)

      // Call the buy function from our hook
      await buy({
        marketPDA,
        bet: betting === 1, // true for YES, false for NO
        amount: lamports
      })

      // Notify success
      toast.success(
        `Successfully placed ${betting === 1 ? 'YES' : 'NO'} bet of ${amount} SOL`
      )

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
      setAmount('')
      setBetting(null)
    } catch (error) {
      console.error('Betting error:', error)
      toast.error('Failed to place bet. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-5 border rounded p-5">
      <h1 className="font-medium">Select Your BET</h1>
      <div className="grid grid-cols-2 gap-5">
        <Button
          variant={betting === 1 ? 'default' : 'outline'}
          onClick={() => chooseBetting(1)}
          disabled={!connected || isLoading}
        >
          YES
        </Button>
        <Button
          variant={betting === 2 ? 'default' : 'outline'}
          onClick={() => chooseBetting(2)}
          disabled={!connected || isLoading}
        >
          NO
        </Button>
      </div>
      <section className="space-y-5">
        <div className="flex items-center relative">
          <Input
            placeholder="Amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isLoading}
          />
          <span className="bg-black border p-1 px-3 font-semibold rounded-md absolute right-0">
            SOL
          </span>
        </div>
        <Button
          onClick={submitBetting}
          disabled={!amount || betting === null || isLoading || !connected}
        >
          {isLoading ? 'Confirming...' : 'Confirm'}
        </Button>
      </section>
      <p className="text-sm">
        <span className="text-muted-foreground">Accumulative payouts: </span>
        {accumulativePayout !== null
          ? `${accumulativePayout.toFixed(2)} SOL`
          : 'N/A'}
      </p>
    </div>
  )
}
