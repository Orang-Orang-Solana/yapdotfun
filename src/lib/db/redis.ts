import { createClient } from 'redis'

import { handleApiError } from '../error/api-error'

const client = createClient({ url: process.env.REDIS_URL })

client.on('error', (err) => {
  return handleApiError(err)
})

export async function getRedisClient() {
  if (!client.isOpen) await client.connect()
  return client
}
