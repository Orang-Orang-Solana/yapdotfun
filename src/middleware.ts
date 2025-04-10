// middleware.ts (Contoh dasar)
import { JwtPayload } from 'jsonwebtoken'
import { NextRequest, NextResponse } from 'next/server'

import { verifyToken } from './lib/jwt'

// Pustaka populer untuk JWT

// Pastikan Anda menyimpan secret key dengan aman (misalnya di environment variable)
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET_KEY || 'default-secret-key'
)
const COOKIE_NAME = 'yap-auth-token' // Nama cookie yang tetap

export async function middleware(request: NextRequest) {
  // Tentukan path mana saja yang perlu autentikasi
  const protectedPaths = ['/api/comments'] // Tambahkan path lain jika perlu
  const currentPath = request.nextUrl.pathname

  // Hanya jalankan middleware untuk path yang dilindungi
  if (protectedPaths.some((path) => currentPath.startsWith(path))) {
    const token = request.cookies.get(COOKIE_NAME)?.value

    if (!token) {
      console.log('[Middleware] No token found')
      return NextResponse.json(
        { message: 'Authentication required: No token' },
        { status: 401 }
      )
    }

    try {
      // Verifikasi token
      const payload: JwtPayload | null = verifyToken(token)
      if (!payload) {
        throw new Error('Invalid token')
      }

      // Token valid, ekstrak alamat (sesuaikan 'sub' jika claim Anda berbeda)
      const userAddress = payload.sub as string

      if (!userAddress) {
        throw new Error('Address (sub) not found in token payload')
      }

      console.log(`[Middleware] Authenticated user: ${userAddress}`)

      // Buat header baru untuk diteruskan ke API route
      const requestHeaders = new Headers(request.headers)
      requestHeaders.set('x-user-address', userAddress)

      // Lanjutkan ke API route dengan header yang dimodifikasi
      return NextResponse.next({
        request: {
          headers: requestHeaders
        }
      })
    } catch (error) {
      console.error('[Middleware] Invalid token:', error)
      // Hapus cookie jika token tidak valid/error
      const response = NextResponse.json(
        { message: 'Authentication required: Invalid token' },
        { status: 401 }
      )
      response.cookies.delete(COOKIE_NAME)
      return response
    }
  }

  // Jika bukan path yang dilindungi, lanjutkan saja
  return NextResponse.next()
}

// Konfigurasi matcher agar middleware hanya berjalan pada path tertentu
export const config = {
  matcher: [
    /*
     * Cocokkan semua path request kecuali untuk:
     * - path API Next.js (misal /api/auth/*)
     * - file statis (_next/static)
     * - file gambar (_next/image)
     * - favicon.ico
     * Anda mungkin perlu menyesuaikan ini sesuai struktur proyek
     */
    '/((?!api/auth|api/hello|_next/static|_next/image|favicon.ico).*)'
    // Anda bisa lebih spesifik jika perlu:
    // '/api/comments/:path*',
  ]
}
