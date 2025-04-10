import * as jose from 'jose'
// jose library is edge-compatible
import { JwtPayload } from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET

// Function to convert string to Uint8Array for jose
const textEncoder = new TextEncoder()

export const generateToken = async (payload: JwtPayload): Promise<string> => {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined')
  }

  const secret = textEncoder.encode(JWT_SECRET)

  return await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .sign(secret)
}

export const verifyToken = async (
  token: string
): Promise<JwtPayload | null> => {
  try {
    console.info(`token: ${token}`)

    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined')
    }

    const secret = textEncoder.encode(JWT_SECRET)

    const { payload } = await jose.jwtVerify(token, secret)
    console.info(`payload: ${JSON.stringify(payload)}`)

    return payload as JwtPayload
  } catch (error) {
    console.error(`Error verifying token: ${error}`)
    return null
  }
}
