import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

export class ApiError extends Error {
  code: string
  statusCode: number

  constructor(message: string, code: string, statusCode: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.statusCode = statusCode
  }

  static badRequest(message: string, code = 'BAD_REQUEST') {
    return new ApiError(message, code, 400)
  }

  static unauthorized(message: string, code = 'UNAUTHORIZED') {
    return new ApiError(message, code, 401)
  }

  static forbidden(message: string, code = 'FORBIDDEN') {
    return new ApiError(message, code, 403)
  }

  static notFound(message: string, code = 'NOT_FOUND') {
    return new ApiError(message, code, 404)
  }

  static serverError(message: string, code = 'SERVER_ERROR') {
    return new ApiError(message, code, 500)
  }
}

export function handleApiError(error: unknown): NextResponse {
  console.error(`API Error: ${error}`)

  if (error instanceof ApiError) {
    return NextResponse.json(
      { message: error.message, code: error.code },
      { status: error.statusCode }
    )
  } else if (error instanceof ZodError) {
    return NextResponse.json(
      {
        message: `[ZodError] Validation Error: ${JSON.stringify(error)}`,
        code: 'BAD_REQUEST'
      },
      { status: 400 }
    )
  } else {
    // unknown error
    return NextResponse.json(
      {
        message: 'Internal server error',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    )
  }
}
