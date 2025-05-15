'use client'

import { Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { WalletButton } from '@/components/solana/solana-provider'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useWallet } from '@solana/wallet-adapter-react'

interface Message {
  id: string
  sender: string
  content: string
  timestamp: string
}

interface ChatYappingProps {
  messages: Message[]
  marketId: string
  userAddress: string
  onMessageSent: () => void
}

export default function ChatYapping({
  messages,
  marketId,
  userAddress,
  onMessageSent
}: ChatYappingProps) {
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [authenticating, setAuthenticating] = useState(false)
  const [authStatus, setAuthStatus] = useState<string>('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const { publicKey, connected, signMessage } = useWallet()

  // Check authentication status on mount and after login
  useEffect(function checkAuth() {
    async function fetchAuth() {
      try {
        const res = await fetch('/api/auth/check', { credentials: 'include' })
        const data = await res.json()
        setIsAuthenticated(!!data.authenticated)
      } catch (e) {
        setIsAuthenticated(false)
      }
    }
    fetchAuth()
  }, [])

  function handleSendMessage() {
    if (!newMessage.trim() || !userAddress) return
    setSending(true)
    fetch('/api/comments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-address': userAddress
      },
      credentials: 'include',
      body: JSON.stringify({
        content: newMessage,
        programId: marketId
      })
    })
      .then((res) => res.json())
      .then((data) => {
        setNewMessage('')
        onMessageSent()
      })
      .catch((err) => {
        // Optionally handle error
        console.error('Error sending message:', err)
      })
      .finally(() => {
        setSending(false)
      })
  }

  async function handleLogin() {
    if (!publicKey || !connected || !signMessage) return
    setAuthenticating(true)
    setAuthStatus('Getting nonce...')
    try {
      // 1. Get nonce from the server
      const walletAddress = publicKey.toBase58()
      const nonceResponse = await fetch(
        `/api/auth/nonce?address=${walletAddress}`
      )
      const { data } = await nonceResponse.json()
      if (!data?.nonce) throw new Error('Failed to get nonce from server')
      // 2. Prepare and sign the challenge
      const challenge = { address: walletAddress, nonce: data.nonce }
      const challengeString = JSON.stringify(challenge)
      const encodedMessage = new TextEncoder().encode(challengeString)
      setAuthStatus('Signing message...')
      const signature = await signMessage(encodedMessage)
      // 3. Send signature to server for verification
      setAuthStatus('Verifying signature...')
      const verifyResponse = await fetch(
        `/api/auth/login?address=${walletAddress}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ signature })
        }
      )
      const result = await verifyResponse.json()
      if (result.success) {
        setAuthStatus('Authentication successful!')
        setIsAuthenticated(true)
      } else {
        setAuthStatus(
          `Authentication failed: ${result.message || 'Unknown error'}`
        )
        setIsAuthenticated(false)
      }
    } catch (error: unknown) {
      setAuthStatus(
        `Authentication error: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      setIsAuthenticated(false)
    } finally {
      setAuthenticating(false)
    }
  }

  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  return (
    <div className="border rounded">
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="flex-1 p-4 h-[400px] xl:h-[425px]">
          <div className="space-y-4 max-w-3xl mx-auto">
            {messages.map((msg) => (
              <div key={msg.id} className="flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm">
                    {msg.sender.slice(0, 4)}...{msg.sender.slice(-4)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(msg.timestamp).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: true
                    })}
                  </span>
                </div>
                <Card className="p-3 max-w-[80%] bg-accent">
                  <p className="break-words text-sm">{msg.content}</p>
                </Card>
              </div>
            ))}
          </div>
          <div ref={messagesEndRef} />{' '}
        </ScrollArea>
      </div>

      <div className="p-4 border-t">
        <div className="flex gap-2 max-w-3xl mx-auto">
          {isAuthenticated ? (
            <>
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1"
                disabled={sending}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sending}
                size={'icon'}
              >
                <Send className="h-4 w-4" />
              </Button>
            </>
          ) : connected && publicKey ? (
            <div className="flex flex-col w-full items-center justify-center">
              <span className="mb-2 text-muted-foreground text-sm">
                Login to chat
              </span>
              <Button onClick={handleLogin} disabled={authenticating}>
                {authenticating ? 'Logging in...' : 'Login'}
              </Button>
              {authStatus && (
                <span className="mt-2 text-xs text-muted-foreground">
                  {authStatus}
                </span>
              )}
            </div>
          ) : (
            <div className="flex flex-col w-full items-center justify-center">
              <span className="mb-2 text-muted-foreground text-sm">
                Connect wallet to chat
              </span>
              <WalletButton />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
