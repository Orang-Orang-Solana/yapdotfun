import { createClient } from 'redis'

import { ApiError } from '../error/api-error'

const client = createClient({ url: process.env.REDIS_URL })

client.on('error', (err) => {
  throw ApiError.serverError(`Something went wrong!`)
})

export async function getRedisClient() {
  if (!client.isOpen) await client.connect()
  return client
}
