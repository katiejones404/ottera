'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { loadSession } from '@/app/lib/session'

export default function ChatPage() {
  const params = useParams()
  const conversationId = params?.conversation_id

  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)

  const BACKEND_URL = 'http://localhost:4000'

  useEffect(() => {
    const stored = loadSession()
    setSession(stored)
  }, [])

  async function loadMessages() {
    try {
      const res = await fetch(`${BACKEND_URL}/chat/${conversationId}`)
      const data = await res.json()
      setMessages(data.data || [])
    } catch (err) {
      console.error('Error loading messages:', err)
    } finally {
      setLoading(false)
    }
  }

  async function sendMessage() {
    if (!newMessage.trim()) return

    const senderId = session?.account?.id

    if (!senderId) {
      alert('User not logged in')
      return
    }

    try {
      const res = await fetch(`${BACKEND_URL}/chat/${conversationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id: senderId,
          content: newMessage
        })
      })

      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(errorText || 'Failed to send message')
      }

      setNewMessage('')
      loadMessages()
    } catch (err) {
      console.error('Error sending message:', err)
    }
  }

  useEffect(() => {
    if (conversationId) {
      loadMessages()
    }
  }, [conversationId])

  return (
    <div style={{ padding: 20 }}>
      <h2>Chat</h2>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div
          style={{
            border: '1px solid #ccc',
            padding: 10,
            height: 300,
            overflowY: 'auto',
            marginBottom: 10
          }}
        >
          {messages.map((msg) => {
            const isMe =
              msg.sender?.first_name === session?.account?.name

            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  justifyContent: isMe ? 'flex-end' : 'flex-start',
                  marginBottom: 8
                }}
              >
                <div
                  style={{
                    background: isMe ? '#4f46e5' : '#e5e7eb',
                    color: isMe ? 'white' : 'black',
                    padding: '8px 12px',
                    borderRadius: 12,
                    maxWidth: '60%'
                  }}
                >
                  {!isMe && (
                    <div style={{ fontSize: 12, fontWeight: 600 }}>
                      {msg.sender?.first_name} {msg.sender?.last_name}
                    </div>
                  )}
                  <div>{msg.content}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <input
          style={{ flex: 1, padding: 8 }}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  )
}