import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

import { verifyToken } from '@/lib/jwt-edge'

export async function GET(request: NextRequest) {
  const cookieStore = cookies()
  const token = cookieStore.get('yap-auth-token')?.value

  if (!token) {
    return NextResponse.json(
      { authenticated: false, message: 'No authentication token found' },
      { status: 200 }
    )
  }

  try {
    // Verifikasi token
    const payload = await verifyToken(token)

    if (!payload || !payload.sub) {
      return NextResponse.json(
        { authenticated: false, message: 'Invalid authentication token' },
        { status: 200 }
      )
    }

    // Token valid, kirim informasi user
    return NextResponse.json(
      {
        authenticated: true,
        address: payload.sub,
        expiresAt: payload.exp
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[Auth Check] Error verifying token:', error)
    return NextResponse.json(
      { authenticated: false, message: 'Authentication error' },
      { status: 200 }
    )
  }
}
