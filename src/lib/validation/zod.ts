import { ZodType } from 'zod'

export function validate<T>(schema: ZodType, data: T): T {
  return schema.parse(data)
}
