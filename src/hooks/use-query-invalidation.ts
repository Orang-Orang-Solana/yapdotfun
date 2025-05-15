'use client'

import { useCluster } from '@/components/cluster/cluster-data-access'
import { useQueryClient } from '@tanstack/react-query'

/**
 * Hook that provides a way to invalidate queries after user actions
 * This ensures the UI updates instantly after operations like betting, selling, etc.
 */
export function useQueryInvalidation() {
  const { cluster } = useCluster()
  const queryClient = useQueryClient()

  /**
   * Invalidates all market-related queries including charts, balances, and voter data
   * @param marketId Optional market ID to target specific market invalidation
   */
  const invalidateMarketData = async (marketId?: string) => {
    // Invalidate market-specific queries if marketId is provided
    if (marketId) {
      // Invalidate market account data
      await queryClient.invalidateQueries({
        queryKey: ['get-market-account', { cluster }]
      })

      // Invalidate chart data for this specific market
      await queryClient.invalidateQueries({
        queryKey: ['chart-data', marketId]
      })

      // Invalidate voter data (user's bets/positions)
      await queryClient.invalidateQueries({
        queryKey: ['get-market-voter', { cluster }]
      })

      // Dispatch a custom event for components listening for market updates
      window.dispatchEvent(
        new CustomEvent('market-update', {
          detail: { marketId }
        })
      )

      // Call global refresh function if it exists
      if (window.refreshMarketChart) {
        window.refreshMarketChart(marketId)
      }
    } else {
      // Invalidate all market-related queries
      await queryClient.invalidateQueries({
        queryKey: ['get-market-accounts', { cluster }]
      })
      await queryClient.invalidateQueries({
        queryKey: ['get-market-account', { cluster }]
      })
      await queryClient.invalidateQueries({
        queryKey: ['chart-data', marketId]
      })
      await queryClient.invalidateQueries({
        queryKey: ['get-market-voter', { cluster }]
      })
    }

    // Always invalidate balance-related queries after market actions
    invalidateBalanceData()
  }

  /**
   * Invalidates all account balance-related queries
   */
  const invalidateBalanceData = async () => {
    await queryClient.invalidateQueries({
      queryKey: ['get-balance', { cluster }]
    })
    await queryClient.invalidateQueries({
      queryKey: ['get-signatures', { cluster }]
    })
    await queryClient.invalidateQueries({
      queryKey: ['getTokenAccountBalance', { cluster }]
    })
    await queryClient.invalidateQueries({
      queryKey: ['getTokenAccounts', { cluster }]
    })
  }

  return {
    invalidateMarketData,
    invalidateBalanceData
  }
}
