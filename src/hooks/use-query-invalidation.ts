'use client'

import { useQueryClient } from '@tanstack/react-query'

/**
 * Hook that provides a way to invalidate queries after user actions
 * This ensures the UI updates instantly after operations like betting, selling, etc.
 */
export function useQueryInvalidation() {
  const queryClient = useQueryClient()

  /**
   * Invalidates all market-related queries including charts, balances, and voter data
   * @param marketId Optional market ID to target specific market invalidation
   */
  const invalidateMarketData = (marketId?: string) => {
    // Invalidate market-specific queries if marketId is provided
    if (marketId) {
      // Invalidate market account data
      queryClient.refetchQueries({
        queryKey: ['get-market-account']
      })

      // Invalidate chart data for this specific market
      queryClient.refetchQueries({
        queryKey: ['chart-data', marketId]
      })

      // Invalidate voter data (user's bets/positions)
      queryClient.refetchQueries({
        queryKey: ['get-market-voter']
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
      queryClient.refetchQueries({
        queryKey: ['get-market-accounts']
      })
      queryClient.refetchQueries({
        queryKey: ['get-market-account']
      })
      queryClient.refetchQueries({
        queryKey: ['chart-data']
      })
      queryClient.refetchQueries({
        queryKey: ['get-market-voter']
      })
    }

    // Always invalidate balance-related queries after market actions
    invalidateBalanceData()
  }

  /**
   * Invalidates all account balance-related queries
   */
  const invalidateBalanceData = () => {
    queryClient.refetchQueries({
      queryKey: ['get-balance']
    })
    queryClient.refetchQueries({
      queryKey: ['get-signatures']
    })
    queryClient.refetchQueries({
      queryKey: ['getTokenAccountBalance']
    })
    queryClient.refetchQueries({
      queryKey: ['getTokenAccounts']
    })
  }

  return {
    invalidateMarketData,
    invalidateBalanceData
  }
}
