import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

import { getRedisClient } from '@/lib/db/redis'
import { handleApiError } from '@/lib/error/api-error'
import { checkIfAddressValid } from '@/lib/validation/address'
import { ApiResponse } from '@/types/api'
import { NonceResponse } from '@/types/auth'

// Get nonce before user signing
export async function GET(request: NextRequest) {
  // Handle CORS
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': 'http://localhost:3001',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400'
      }
    })
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const address = checkIfAddressValid(searchParams.get('address') || '')
    const redisClient = await getRedisClient()
    const nonce: string = randomUUID()
    const DEFAULT_NONCE_EXPIRATION = 60 //1 minute

    // Create message as challenge and save temporary
    const message: string = JSON.stringify({ address, nonce })
    redisClient.setEx(
      `login-challenge-${address}`,
      DEFAULT_NONCE_EXPIRATION,
      message
    )

    const responseData: ApiResponse<NonceResponse> = {
      message: 'Get nonce successfully',
      data: { nonce }
    }
    return NextResponse.json<ApiResponse<NonceResponse>>(responseData, {
      headers: {
        'Access-Control-Allow-Origin': 'http://localhost:3001',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true'
      }
    })
  } catch (error) {
    return handleApiError(error)
  }
}
