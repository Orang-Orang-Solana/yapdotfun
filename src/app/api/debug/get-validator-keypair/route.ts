import { NextResponse } from 'next/server'

// This endpoint is for development purposes only
// In production, you should NEVER expose validator keypairs
export async function GET() {
  // Only serve this in development
  if (process.env.NEXT_PUBLIC_APP_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    )
  }

  try {
    // Import the validator keypair (this should be the same one used in your Anchor tests)
    // In a real production app, you should NEVER expose this endpoint
    // This is only for development and debugging
    const validatorKeyPair = [
      192, 68, 69, 137, 150, 213, 241, 88, 159, 80, 195, 245, 95, 212, 52, 45,
      116, 21, 235, 76, 244, 38, 85, 4, 165, 194, 234, 201, 28, 167, 196, 190,
      111, 5, 68, 188, 20, 202, 194, 6, 233, 170, 11, 8, 106, 128, 48, 54, 89,
      237, 150, 56, 161, 94, 248, 84, 152, 140, 28, 218, 6, 5, 85, 169
    ]

    return NextResponse.json({ secretKey: validatorKeyPair })
  } catch (error) {
    console.error('Error serving validator keypair:', error)
    return NextResponse.json(
      { error: 'Failed to get validator keypair' },
      { status: 500 }
    )
  }
}
