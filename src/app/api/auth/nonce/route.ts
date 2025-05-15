import { type NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'

import { getRedisClient } from '@/lib/db/redis'
import { handleApiError } from '@/lib/error/api-error'
import { checkIfAddressValid } from '@/lib/validation/address'
import type { ApiResponse } from '@/types/api'
import type { NonceResponse } from '@/types/auth'

const DEFAULT_NONCE_EXPIRATION = 60 // 1 minute

// Function to generate and store nonce for address
async function generateNonce(address: string): Promise<string> {
  console.debug('[Auth Nonce] Generating nonce for address:', address)
  const nonce = randomUUID()
  console.debug('[Auth Nonce] Generated nonce:', nonce)
  const redisClient = await getRedisClient()
  console.debug('[Auth Nonce] Redis client:', redisClient)

  // Create message as challenge and save temporary
  const message = JSON.stringify({ address, nonce })
  console.debug('[Auth Nonce] Message:', message)
  console.debug(
    '[Auth Nonce] Generating nonce for address:',
    address,
    'Nonce:',
    nonce
  )
  await redisClient.setEx(
    `login-challenge-${address}`,
    DEFAULT_NONCE_EXPIRATION,
    message
  )
  console.debug('[Auth Nonce] Nonce stored in Redis for address:', address)

  return nonce
}

// Get nonce before user signing
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams
    const address = checkIfAddressValid(searchParams.get('address') || '')
    console.debug('[Auth Nonce] GET called for address:', address)

    // Generate the nonce
    const nonce = await generateNonce(address)

    const responseData: ApiResponse<NonceResponse> = {
      message: 'Get nonce successfully',
      data: { nonce }
    }

    // Return the nonce without CORS headers
    return NextResponse.json(responseData)
  } catch (error) {
    return handleApiError(error)
  }
}
