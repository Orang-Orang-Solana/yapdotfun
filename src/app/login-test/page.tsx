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
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      const { solana } = window as any
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
        // Force a cookie check after successful login
        setTimeout(async () => {
          // Give browser a moment to set the cookie
          await checkAuthStatus()
        }, 500)
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

  // Check auth status
  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/auth/check', {
        method: 'GET',
        credentials: 'include' // Important for cookies
      })

      const data = await response.json()
      if (data.authenticated) {
        setStatus(`Authenticated as ${data.address}`)
      } else {
        setStatus('Not authenticated or session expired')
      }
    } catch (error) {
      console.error('Error checking auth status:', error)
    }
  }

  // post comment
  const [comment, setComment] = useState('')
  const [commentStatus, setCommentStatus] = useState('')

  const postComment = async () => {
    if (!walletAddress || !comment.trim()) {
      setCommentStatus('Please connect wallet and enter a comment')
      return
    }

    try {
      setCommentStatus('Posting comment...')

      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Important! Ensures cookies are sent with the request
        body: JSON.stringify({
          content: comment,
          programId: '1' // Static programId as requested
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to post comment')
      }

      const result = await response.json()
      setCommentStatus('Comment posted successfully!')
      setComment('') // Clear the comment field
      console.log('Comment posted:', result.data)
    } catch (error: any) {
      console.error('Error posting comment:', error)
      setCommentStatus(
        `Error posting comment: ${error.message || 'Unknown error'}`
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

            <div className="mt-8 border-t pt-6">
              <h2 className="text-xl font-semibold mb-4">
                Test Comment Feature
              </h2>
              <div className="mb-4">
                <label
                  htmlFor="comment"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Comment
                </label>
                <textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-black bg-white"
                  rows={3}
                  placeholder="Enter your comment here..."
                />
              </div>
              <button
                onClick={postComment}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition disabled:opacity-50"
                disabled={!comment.trim() || !walletAddress}
              >
                Post Comment
              </button>
              {commentStatus && (
                <p className="mt-2 text-sm font-medium text-black">
                  {commentStatus}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
