import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

import { getRedisClient } from '@/lib/db/redis'
import { handleApiError } from '@/lib/error/api-error'
import { checkIfAddressValid } from '@/lib/validation/address'
import { ApiResponse } from '@/types/api'
import { NonceResponse } from '@/types/auth'

const DEFAULT_NONCE_EXPIRATION = 60 // 1 minute

// Function to generate and store nonce for address
async function generateNonce(address: string): Promise<string> {
  const nonce = randomUUID()
  const redisClient = await getRedisClient()

  // Create message as challenge and save temporary
  const message = JSON.stringify({ address, nonce })
  await redisClient.setEx(
    `login-challenge-${address}`,
    DEFAULT_NONCE_EXPIRATION,
    message
  )

  return nonce
}

// Get nonce before user signing
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams
    const address = checkIfAddressValid(searchParams.get('address') || '')

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
