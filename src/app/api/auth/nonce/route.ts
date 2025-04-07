import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

import { getRedisClient } from '@/lib/db/redis'
import { handleApiError } from '@/lib/error/api-error'
import { checkIfAddressValid } from '@/lib/validation/address'
import { NonceResponse } from '@/types/auth'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const address = checkIfAddressValid(searchParams.get('address') || '')
    const redisClient = await getRedisClient()
    const nonce: string = randomUUID()
    const DEFAULT_NONCE_EXPIRATION = 60 //1 minute
    const responseData: NonceResponse = { address, nonce }

    redisClient.setEx(`login-nonce-${address}`, DEFAULT_NONCE_EXPIRATION, nonce)

    return NextResponse.json(responseData)
  } catch (error) {
    return handleApiError(error)
  }
}
