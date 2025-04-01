'use client'

import { Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'

interface Message {
  id: string
  sender: string
  content: string
  timestamp: string
}

export default function ChatYapping({
  messages: initialMessages
}: {
  messages: Message[]
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [newMessage, setNewMessage] = useState('')

  const handleSendMessage = () => {
    if (!newMessage.trim()) return

    const messageData: Message = {
      id: Date.now().toString(),
      sender: '0xadasd12312323', // Replace with actual user data
      content: newMessage,
      timestamp: new Date().toISOString()
    }

    setMessages((prevMessages) => [...prevMessages, messageData])
    setNewMessage('')
  }

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
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
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            size={'icon'}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
