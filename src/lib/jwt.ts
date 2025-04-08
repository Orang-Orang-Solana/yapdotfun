import jwt, { JwtPayload } from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET

export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, JWT_SECRET as string)
}

export const verifyToken = (token: string): object | null => {
  try {
    return jwt.verify(token, JWT_SECRET as string) as object
  } catch (error) {
    return null
  }
}
