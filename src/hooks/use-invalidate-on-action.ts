'use client'

import { useCallback } from 'react'

import { useQueryInvalidationContext } from '@/app/query-invalidation-provider'

type InvalidationOptions = {
  invalidateMarkets?: boolean
  marketId?: string
  invalidateBalances?: boolean
}

/**
 * Custom hook that returns a function to invalidate queries after user actions
 *
 * @example
 * const invalidateQueries = useInvalidateOnAction({
 *   invalidateMarkets: true,
 *   marketId: marketPublicKey
 * })
 *
 * // Later after a user action:
 * await someAction()
 * invalidateQueries()
 */
export function useInvalidateOnAction({
  invalidateMarkets = false,
  marketId,
  invalidateBalances = false
}: InvalidationOptions = {}) {
  const { invalidateMarketData, invalidateBalanceData } =
    useQueryInvalidationContext()

  const invalidateQueries = useCallback(() => {
    if (invalidateMarkets) {
      invalidateMarketData(marketId)
    }

    if (invalidateBalances) {
      invalidateBalanceData()
    }
  }, [
    invalidateMarketData,
    invalidateBalanceData,
    invalidateMarkets,
    invalidateBalances,
    marketId
  ])

  return invalidateQueries
}
