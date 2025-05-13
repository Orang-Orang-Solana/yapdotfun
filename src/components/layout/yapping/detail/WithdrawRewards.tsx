'use client'

import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { useTransactionToast } from '@/components/ui/ui-layout'
import { useYappingMarketActions } from '@/hooks/use-yapping-market-actions'
import { useYappingMarketPosition } from '@/hooks/use-yapping-market-position'
import { useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'

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
  const { refetch: refetchPosition } = useYappingMarketPosition(marketPublicKey)

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

    if (!isWinner) {
      toast.error(
        'You can only withdraw rewards if you bet on the winning outcome'
      )
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

      // Force refetch position data to update UI
      setTimeout(() => {
        refetchPosition()
      }, 2000)
    } catch (error) {
      console.error('Withdrawal error:', error)

      // Format error message for user
      let errorMessage = 'Failed to withdraw rewards. Please try again.'

      if (error instanceof Error) {
        // Check for common errors
        if (error.message.includes('Market not closed')) {
          errorMessage = 'The market is not closed yet.'
        } else if (error.message.includes('No shares')) {
          errorMessage = "You don't have any shares to claim rewards for."
        }
      }

      toast.error(errorMessage)
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
          <span
            className={`font-medium ${isWinner ? 'text-green-600' : 'text-red-600'}`}
          >
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
        className={isWinner ? 'bg-green-600 hover:bg-green-700' : ''}
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
