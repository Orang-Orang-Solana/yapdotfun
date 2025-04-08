'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function LoginTestPage() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [status, setStatus] = useState('Disconnected')
  const router = useRouter()

  // Connect to the Phantom wallet
  const connectWallet = async () => {
    setStatus('Connecting wallet...')
    const { solana } = window as any

    if (!solana?.isPhantom) {
      setStatus('Phantom wallet not detected. Please install it.')
      return
    }

    try {
      const response = await solana.connect()
      setWalletAddress(response.publicKey.toString())
      setStatus('Wallet Connected')
    } catch (error) {
      console.error('Error connecting wallet:', error)
      setStatus('Failed to connect wallet')
    }
  }

  // Sign a challenge and authenticate with the backend
  const signAndAuthenticate = async () => {
    if (!walletAddress) return

    setStatus('Getting nonce...')

    try {
      // 1. Get nonce from the server
      const nonceResponse = await fetch(
        `/api/auth/nonce?address=${walletAddress}`
      )
      if (!nonceResponse.ok) {
        const errorText = await nonceResponse.text()
        throw new Error(
          `Failed to get nonce: ${nonceResponse.status} ${errorText}`
        )
      }
      const { data } = await nonceResponse.json()

      if (!data?.nonce) {
        setStatus('Failed to get nonce from server')
        return
      }

      // 2. Prepare and sign the challenge
      const challenge = {
        address: walletAddress,
        nonce: data.nonce
      }
      const challengeString = JSON.stringify(challenge)
      const encodedMessage = new TextEncoder().encode(challengeString)

      setStatus('Signing message...')
      const { solana } = window
      const signatureResponse = await solana.signMessage(encodedMessage, 'utf8')

      // 3. Send signature to server for verification
      setStatus('Verifying signature...')
      const verifyResponse = await fetch(
        `/api/auth/login?address=${walletAddress}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            signature: signatureResponse.signature
          })
        }
      )

      if (!verifyResponse.ok) {
        const errorText = await verifyResponse.text()
        throw new Error(
          `Authentication failed: ${verifyResponse.status} ${errorText}`
        )
      }

      const result = await verifyResponse.json()

      if (result.success) {
        setStatus('Authentication successful! ')
      } else {
        // Use error message from backend if available
        setStatus(`Authentication failed: ${result.message || 'Unknown error'}`)
      }
    } catch (error: any) {
      console.error('Authentication error:', error)
      setStatus(
        `Authentication error: ${error.message || 'An unknown error occurred'}`
      )
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-6">
        Login with Solana Wallet (Test)
      </h1>

      <div className="bg-gray-100 p-6 rounded-lg shadow-md w-full max-w-md">
        <p className="mb-4 text-black break-words">
          <strong>Status:</strong> {status}
        </p>

        {!walletAddress ? (
          <button
            onClick={connectWallet}
            className="w-full bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700 transition disabled:opacity-50"
            disabled={status.startsWith('Connecting')}
          >
            Connect Wallet
          </button>
        ) : (
          <>
            <p className="mb-4 text-black break-words">
              <strong>Wallet Address:</strong> {walletAddress}
            </p>
            <button
              onClick={signAndAuthenticate}
              className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition disabled:opacity-50"
              disabled={
                !walletAddress ||
                status.startsWith('Starting') ||
                status.startsWith('Signing') ||
                status.startsWith('Verifying')
              }
            >
              Sign & Authenticate
            </button>
          </>
        )}
      </div>
    </div>
  )
}
