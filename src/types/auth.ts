import { SignatureBytes } from 'gill'

export interface NonceResponse {
  address: string
  nonce: string
}

export interface LoginRequest {
  address: string
  signature: SignatureBytes
}
