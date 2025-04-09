import {
  Address,
  SignatureBytes,
  getPublicKeyFromAddress,
  getUtf8Encoder,
  verifySignature
} from 'gill'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

import { convertSignatureToUint8Array } from '@/lib/auth/signature'
import prisma from '@/lib/db/prisma'
import { getRedisClient } from '@/lib/db/redis'
import { ApiError, handleApiError } from '@/lib/error/api-error'
import { generateToken } from '@/lib/jwt'
import { checkIfAddressValid } from '@/lib/validation/address'
import { LoginRequest } from '@/types/auth'

export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const requestBody: LoginRequest = await request.json()
    const cookieStore = cookies() // Use await for future Next.js compatibility

    const address = checkIfAddressValid(searchParams.get('address') || '')

    // Convert the signature received from the client
    const signatureUint8Array = convertSignatureToUint8Array(
      requestBody.signature
    )
    if (!signatureUint8Array) {
      throw ApiError.badRequest(
        '[Login API] Invalid or malformed signature format received'
      )
    }

    // Fetch public key and Redis client concurrently
    const [publicKey, redisClient] = await Promise.all([
      getPublicKeyFromAddress(address as Address),
      getRedisClient()
    ])

    // Retrieve the challenge nonce from Redis
    const rawChallenge = await redisClient.get(`login-challenge-${address}`)
    if (!rawChallenge) {
      // Ensure nonce exists and hasn't expired
      throw ApiError.badRequest(
        '[Login API] Expired or invalid login challenge'
      )
    }
    const challengeBytes = getUtf8Encoder().encode(rawChallenge)

    // Verify the signature against the challenge
    const isSignatureValid = await verifySignature(
      publicKey,
      signatureUint8Array as SignatureBytes, // Cast to expected branded type
      challengeBytes
    )

    if (!isSignatureValid) {
      throw ApiError.unauthorized('[Login API] Invalid signature')
    }

    // Signature is valid, generate JWT
    const token = generateToken({
      iss: 'yap',
      sub: address,
      aud: 'yap.fun',
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 // 7 days expiration
    })

    // Set token in HTTP-only cookie
    cookieStore.set(`yap-${address}`, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // Cookie expires in 7 days
    })

    // Clean up the used nonce from Redis
    await redisClient.del(`login-challenge-${address}`)

    const user = await prisma.user.findUnique({ where: { address: address } })

    if (!user) {
      await prisma.user.create({ data: { address: address } })
    }

    return NextResponse.json({ success: true, message: 'Login successful' })
  } catch (error) {
    // Handle known API errors and unexpected errors
    return handleApiError(error)
  }
}
