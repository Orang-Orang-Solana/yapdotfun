import { isAddress } from 'gill'

import { ApiError } from '../error/api-error'

export function checkIfAddressVald(address: string): string {
  const isValid = isAddress(address)
  if (!isValid) ApiError.badRequest(`${address} is not valid address!`)

  return address
}
