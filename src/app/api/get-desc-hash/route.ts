import * as crypto from 'node:crypto'

function hashString(str: string) {
  return crypto.createHash('sha256').update(str).digest()
}

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const desc = searchParams.get('desc')

  if (!desc) {
    return new Response('Missing description', { status: 400 })
  }

  const hash = hashString(desc)

  return new Response(hash, { status: 200 })
}
