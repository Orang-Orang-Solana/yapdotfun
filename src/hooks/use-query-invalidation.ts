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
      queryClient.invalidateQueries({
        queryKey: ['get-market-account']
      })

      // Invalidate chart data for this specific market
      queryClient.invalidateQueries({
        queryKey: ['chart-data', marketId]
      })

      // Invalidate voter data (user's bets/positions)
      queryClient.invalidateQueries({
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
      queryClient.invalidateQueries({
        queryKey: ['get-market-accounts']
      })
      queryClient.invalidateQueries({
        queryKey: ['get-market-account']
      })
      queryClient.invalidateQueries({
        queryKey: ['chart-data']
      })
      queryClient.invalidateQueries({
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
    queryClient.invalidateQueries({
      queryKey: ['get-balance']
    })
    queryClient.invalidateQueries({
      queryKey: ['get-signatures']
    })
    queryClient.invalidateQueries({
      queryKey: ['getTokenAccountBalance']
    })
    queryClient.invalidateQueries({
      queryKey: ['getTokenAccounts']
    })
  }

  return {
    invalidateMarketData,
    invalidateBalanceData
  }
}
