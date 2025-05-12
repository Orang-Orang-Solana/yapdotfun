import jwt, { JwtPayload } from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET

export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, JWT_SECRET as string)
}

export const verifyToken = (token: string): JwtPayload | null => {
  try {
    console.info(`token: ${token}`)
    const payload = jwt.verify(token, JWT_SECRET as string) as JwtPayload
    console.info(`payload: ${JSON.stringify(payload)}`)
    return payload
  } catch (error) {
    console.error(`Error verifying token: ${error}`)
    return null
  }
}
