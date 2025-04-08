import {
  Address,
  getPublicKeyFromAddress,
  getUtf8Encoder,
  verifySignature
} from 'gill'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

import { getRedisClient } from '@/lib/db/redis'
import { ApiError, handleApiError } from '@/lib/error/api-error'
import { generateToken } from '@/lib/jwt'
import { checkIfAddressValid } from '@/lib/validation/address'
import { LoginRequest } from '@/types/auth'

export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const requestBody: LoginRequest = await request.json()
    const cookieStore = await cookies() // use await for anticipate nextjs upgrade (14 to 15)

    const address = checkIfAddressValid(searchParams.get('address') || '')
    const signature = requestBody.signature

    const [publicKey, redisClient] = await Promise.all([
      getPublicKeyFromAddress(address as Address),
      getRedisClient()
    ])

    const rawChallenge = await redisClient.get(`login-challenge-${address}`)
    if (!rawChallenge) {
      throw ApiError.badRequest('[LoginError] Expired or invalid request')
    }
    const challenge = getUtf8Encoder().encode(rawChallenge)

    const isOriginalSignature = await verifySignature(
      publicKey,
      signature,
      challenge
    )
    if (!isOriginalSignature)
      throw ApiError.unauthorized('[LoginError] Invalid signature')

    const tokenExp = Math.floor(Date.now() / 1000) + 604800 // 1 week
    const token = generateToken({
      iss: 'yap',
      sub: address,
      aud: 'yap.fun',
      exp: tokenExp
    })
    cookieStore.set(`yap-${address}`, token)

    return NextResponse.json({ message: 'Login successful' })
  } catch (error) {
    return handleApiError(error)
  }
}
