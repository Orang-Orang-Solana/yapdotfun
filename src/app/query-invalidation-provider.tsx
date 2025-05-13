'use client'

import { type ReactNode, createContext, useContext } from 'react'

import { useQueryInvalidation } from '@/hooks/use-query-invalidation'

type QueryInvalidationContextType = ReturnType<typeof useQueryInvalidation>

const QueryInvalidationContext = createContext<
  QueryInvalidationContextType | undefined
>(undefined)

/**
 * Provider component that makes query invalidation methods available to all components
 */
export function QueryInvalidationProvider({
  children
}: {
  children: ReactNode
}) {
  const queryInvalidation = useQueryInvalidation()

  return (
    <QueryInvalidationContext.Provider value={queryInvalidation}>
      {children}
    </QueryInvalidationContext.Provider>
  )
}

/**
 * Hook to access query invalidation methods from any component
 */
export function useQueryInvalidationContext() {
  const context = useContext(QueryInvalidationContext)

  if (context === undefined) {
    throw new Error(
      'useQueryInvalidationContext must be used within a QueryInvalidationProvider'
    )
  }

  return context
}
