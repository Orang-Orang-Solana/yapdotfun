'use client'

import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { useTransactionToast } from '@/components/ui/ui-layout'
import { useYappingMarketActions } from '@/hooks/use-yapping-market-actions'
import { PublicKey } from '@solana/web3.js'

interface DebugCloseMarketProps {
  marketPublicKey: string
  marketStatus: string
}

export default function DebugCloseMarket({
  marketPublicKey,
  marketStatus
}: DebugCloseMarketProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { closeMarket } = useYappingMarketActions()
  const transactionToast = useTransactionToast()

  // Only show in development mode
  if (process.env.NEXT_PUBLIC_APP_ENV !== 'development') {
    return null
  }

  // Don't show if market is already closed
  const isMarketOpen = marketStatus !== 'Closed'
  if (!isMarketOpen) {
    return null
  }

  async function handleCloseMarket(outcome: boolean) {
    try {
      setIsLoading(true)
      const marketPDA = new PublicKey(marketPublicKey)

      const tx = await closeMarket({
        marketPDA,
        result: outcome
      })

      transactionToast(tx)
      toast.success(
        `Market closed successfully with outcome: ${outcome ? 'YES' : 'NO'}`
      )
    } catch (error) {
      console.error('Error closing market:', error)
      toast.error(
        `Failed to close market: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950">
      <CardHeader>
        <CardTitle>🔧 Debug: Close Market</CardTitle>
        <CardDescription>
          Development use only - Close this market and set its outcome
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-amber-800 dark:text-amber-200 mb-4">
          This will close the market and determine the winning outcome. This
          action cannot be undone.
        </p>
      </CardContent>
      <CardFooter className="flex gap-4">
        <Button
          onClick={() => handleCloseMarket(true)}
          disabled={isLoading}
          variant="outline"
          className="w-full bg-green-100 hover:bg-green-200 dark:bg-green-900 dark:hover:bg-green-800"
        >
          {isLoading ? 'Processing...' : 'Close with YES ✓'}
        </Button>
        <Button
          onClick={() => handleCloseMarket(false)}
          disabled={isLoading}
          variant="outline"
          className="w-full bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800"
        >
          {isLoading ? 'Processing...' : 'Close with NO ✗'}
        </Button>
      </CardFooter>
    </Card>
  )
}
