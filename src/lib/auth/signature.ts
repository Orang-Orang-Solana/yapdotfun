// Helper function to convert signature from various possible JSON formats (user request body) to Uint8Array
export function convertSignatureToUint8Array(
  rawSignature: unknown
): Uint8Array | null {
  try {
    // Case 1: Object { type: 'Buffer', data: [...] }
    if (
      typeof rawSignature === 'object' &&
      rawSignature !== null &&
      'type' in rawSignature &&
      rawSignature.type === 'Buffer' &&
      'data' in rawSignature &&
      Array.isArray(rawSignature.data)
    ) {
      const uint8Array = Uint8Array.from(rawSignature.data)
      // Ensure the signature has the expected length (e.g., 64 bytes for Ed25519)
      if (uint8Array.length === 64) return uint8Array
      console.warn(
        `[Signature Util] Converted signature length is ${uint8Array.length}, expected 64.`
      )
      return null // Invalid length
    }

    // Case 2: Plain array of numbers
    if (Array.isArray(rawSignature)) {
      const uint8Array = Uint8Array.from(rawSignature)
      // Ensure the signature has the expected length
      if (uint8Array.length === 64) return uint8Array
      console.warn(
        `[Signature Util] Converted signature length is ${uint8Array.length}, expected 64.`
      )
      return null // Invalid length
    }

    console.error(
      '[Signature Util] Unexpected signature format received:',
      rawSignature
    )
    return null
  } catch (error) {
    console.error(
      '[Signature Util] Error converting signature:',
      error,
      'Raw signature:',
      rawSignature
    )
    return null
  }
}
