import { SignatureBytes } from 'gill'

export interface NonceResponse {
  nonce: string
}

export interface LoginRequest {
  address: string
  signature: SignatureBytes
}
