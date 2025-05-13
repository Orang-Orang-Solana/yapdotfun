'use client'

import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { useTransactionToast } from '@/components/ui/ui-layout'
import { useYappingMarketActions } from '@/hooks/use-yapping-market-actions'
import { useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'

// No need for this declaration anymore since we're using the invalidation hook
// declare global {
//   interface Window {
//     refreshMarketChart?: (marketId: string) => void
//   }
// }

interface WithdrawRewardsProps {
  marketPublicKey: string
  marketStatus: string
  userVote?: boolean | null
  marketOutcome?: boolean | null
}

export default function WithdrawRewards({
  marketPublicKey,
  marketStatus,
  userVote,
  marketOutcome
}: WithdrawRewardsProps) {
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const { connected } = useWallet()
  const transactionToast = useTransactionToast()
  const { withdrawRewards } = useYappingMarketActions()

  // Check if market is resolved and the user can claim rewards
  const isClosed = marketStatus === 'Closed'
  const isWinner = userVote !== null && userVote === marketOutcome
  const canClaim = connected && isClosed && isWinner

  async function handleWithdraw() {
    if (!connected || !marketPublicKey) {
      toast.error('Please connect your wallet')
      return
    }

    if (!isClosed) {
      toast.error('Market is not closed yet')
      return
    }

    try {
      setIsLoading(true)

      // Prepare market PublicKey
      const marketPDA = new PublicKey(marketPublicKey)

      // Call the withdrawRewards function from our hook
      const tx = await withdrawRewards({
        marketPDA
      })

      // Show success message
      transactionToast(tx)
      toast.success('Rewards withdrawn successfully!')

      // No need to manually dispatch events or refresh the chart anymore
      // This is now handled by the invalidateMarketData function in our hook
    } catch (error) {
      console.error('Withdrawal error:', error)
      toast.error('Failed to withdraw rewards. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // If market is not closed or user has no position, don't show component
  if (!isClosed || userVote === null || userVote === undefined) {
    return null
  }

  return (
    <div className="space-y-5 border rounded p-5 mt-5">
      <h1 className="font-medium">Claim Your Rewards</h1>
      <div className="p-3 bg-muted rounded-md">
        <p className="text-sm">
          <span className="text-muted-foreground">Market status: </span>
          <span className="font-medium">{marketStatus}</span>
        </p>
        <p className="text-sm mt-1">
          <span className="text-muted-foreground">Your position: </span>
          <span className="font-medium">{userVote ? 'YES' : 'NO'}</span>
        </p>
        <p className="text-sm mt-1">
          <span className="text-muted-foreground">Market outcome: </span>
          <span className="font-medium">
            {marketOutcome === null || marketOutcome === undefined
              ? 'Not resolved'
              : marketOutcome
                ? 'YES'
                : 'NO'}
          </span>
        </p>
        <p className="text-sm mt-1">
          <span className="text-muted-foreground">Status: </span>
          <span className="font-medium">
            {!isClosed
              ? 'Market not resolved yet'
              : isWinner
                ? 'You won! Claim your rewards.'
                : 'Sorry, you did not win in this market.'}
          </span>
        </p>
      </div>
      <Button
        onClick={handleWithdraw}
        disabled={isLoading || !canClaim}
        variant={isWinner ? 'default' : 'outline'}
      >
        {isLoading
          ? 'Processing...'
          : isWinner
            ? 'Claim Rewards'
            : 'No Rewards to Claim'}
      </Button>
    </div>
  )
}
