import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

import { Prisma } from '@/app/generated/prisma'

// Error codes enum for better type safety
export enum ErrorCode {
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  SERVER_ERROR = 'SERVER_ERROR',
  FOREIGN_KEY_VIOLATION = 'FOREIGN_KEY_VIOLATION',
  RECORD_NOT_FOUND = 'RECORD_NOT_FOUND',
  UNIQUE_CONSTRAINT_VIOLATION = 'UNIQUE_CONSTRAINT_VIOLATION',
  PRISMA_ERROR = 'PRISMA_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

// Type for API error response
interface ApiErrorResponse {
  message: string
  code: string
}

export class ApiError extends Error {
  code: string
  statusCode: number

  constructor(message: string, code: string, statusCode: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.statusCode = statusCode
  }

  static badRequest(message: string, code = ErrorCode.BAD_REQUEST) {
    return new ApiError(message, code, 400)
  }

  static unauthorized(message: string, code = ErrorCode.UNAUTHORIZED) {
    return new ApiError(message, code, 401)
  }

  static forbidden(message: string, code = ErrorCode.FORBIDDEN) {
    return new ApiError(message, code, 403)
  }

  static notFound(message: string, code = ErrorCode.NOT_FOUND) {
    return new ApiError(message, code, 404)
  }

  static serverError(message: string, code = ErrorCode.SERVER_ERROR) {
    return new ApiError(message, code, 500)
  }
}

// Helper function to create API response
function createApiResponse(
  message: string,
  code: string,
  statusCode: number
): NextResponse {
  return NextResponse.json({ message, code }, { status: statusCode })
}

// Helper function to handle Prisma errors
function handlePrismaError(
  error: Prisma.PrismaClientKnownRequestError
): NextResponse {
  switch (error.code) {
    case 'P2003': // Foreign key constraint violation
      const fieldName = error.meta?.field_name as string | undefined
      return createApiResponse(
        `Failed dependency: The specified ${fieldName ?? 'related record'} does not exist.`,
        ErrorCode.FOREIGN_KEY_VIOLATION,
        400
      )

    case 'P2025': // Record not found
      const model = error.meta?.model as string | undefined
      const where = error.meta?.where as { id?: string } | undefined
      const id = where?.id
      return createApiResponse(
        `Record not found for ${model} with ID ${id}.`,
        ErrorCode.RECORD_NOT_FOUND,
        404
      )

    case 'P2002': // Unique constraint violation
      const target = error.meta?.target as string | undefined
      return createApiResponse(
        `Unique constraint violation: ${target}.`,
        ErrorCode.UNIQUE_CONSTRAINT_VIOLATION,
        400
      )

    default: // Other Prisma errors
      return createApiResponse(
        `Prisma error: ${error.message}`,
        ErrorCode.PRISMA_ERROR,
        500
      )
  }
}

export function handleApiError(error: unknown): NextResponse {
  // Log the error
  console.error(`API Error: ${error}`)

  // Early return for ApiError
  if (error instanceof ApiError) {
    return createApiResponse(error.message, error.code, error.statusCode)
  }

  // Early return for ZodError
  if (error instanceof ZodError) {
    return createApiResponse(
      `[ZodError] Validation Error: ${JSON.stringify(error)}`,
      ErrorCode.BAD_REQUEST,
      400
    )
  }

  // Early return for Prisma error
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return handlePrismaError(error)
  }

  // Default case for unknown errors
  return createApiResponse(
    'Internal server error',
    ErrorCode.INTERNAL_ERROR,
    500
  )
}
