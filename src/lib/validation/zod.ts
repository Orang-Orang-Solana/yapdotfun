import { ZodError, ZodType } from 'zod'

import { ApiError, handleApiError } from '../error/api-error'

export function validate<T>(schema: ZodType, data: T): T | undefined {
  try {
    return schema.parse(data)
  } catch (error) {
    handleApiError(error)
  }
}
