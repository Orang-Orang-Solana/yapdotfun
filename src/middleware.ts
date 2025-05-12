import type { JwtPayload } from 'jsonwebtoken'
import { type NextRequest, NextResponse } from 'next/server'

import { verifyToken } from './lib/jwt-edge'

const COOKIE_NAME = 'yap-auth-token'

export async function middleware(request: NextRequest) {
  const protectedPaths = ['/api/comments'] // Add more protected paths if needed
  const currentPath = request.nextUrl.pathname

  // Only run middleware for protected paths
  if (protectedPaths.some((path) => currentPath.startsWith(path))) {
    // GET requests don't require authentication
    if (request.method === 'GET') {
      return NextResponse.next()
    }

    const token = request.cookies.get(COOKIE_NAME)?.value

    if (!token) {
      console.log('[Middleware] No token found')
      return NextResponse.json(
        { message: 'Authentication required: No token' },
        { status: 401 }
      )
    }

    try {
      // Verify token
      const payload: JwtPayload | null = await verifyToken(token)
      if (!payload) {
        console.error('[Middleware] Token verification failed')
        throw new Error('Invalid token')
      }

      // Extract user address from token
      const userAddress = payload.sub as string

      if (!userAddress) {
        console.error('[Middleware] No user address in token')
        throw new Error('Address (sub) not found in token payload')
      }

      console.log(`[Middleware] Authenticated user: ${userAddress}`)

      // Pass user address to API route via headers
      const requestHeaders = new Headers(request.headers)
      requestHeaders.set('x-user-address', userAddress)

      return NextResponse.next({
        request: {
          headers: requestHeaders
        }
      })
    } catch (error) {
      console.error('[Middleware] Authentication error:', error)

      // Log token for debugging
      console.log(
        '[Middleware] Token debug:',
        token ? `${token.substring(0, 10)}...` : 'none'
      )

      // Clear invalid token cookie
      const response = NextResponse.json(
        { message: 'Authentication required: Invalid token' },
        { status: 401 }
      )
      response.cookies.delete(COOKIE_NAME)
      return response
    }
  }

  // Skip middleware for unprotected paths
  return NextResponse.next()
}

// Configure middleware to run only on specific paths
export const config = {
  matcher: ['/api/comments/:path*'],
  runtime: 'nodejs'
}
