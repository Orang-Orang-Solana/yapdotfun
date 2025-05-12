import { isAddress } from 'gill'

import { ApiError } from '../error/api-error'

export function checkIfAddressValid(address: string): string {
  const isValid = isAddress(address)
  if (!isValid)
    throw ApiError.badRequest(
      `[AddressError] Validation Error: '${address}' is not a valid solana address!`
    )

  return address
}
