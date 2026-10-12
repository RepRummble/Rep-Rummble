import React, { useState, useRef, useEffect, useCallback } from 'react'
import './ChatWidget.css'

const API_BASE = import.meta.env.VITE_API_URL || ''

interface Message {
  id: string
  role: 'user' | 'assistant'
  text: string
  quickReplies?: string[]
  ts: number
  streaming?: boolean
  error?: boolean
}

const WELCOME: Message = {
  id: 'welcome',
  role: 'assistant',
  text: "Hey! 👋 I'm **Rumi**, Reprummble's assistant. Ask me anything about training, nutrition, recovery, or our plans.\n\nWhat can I help you with today?",
  quickReplies: ['Pricing & plans', 'Build me a workout', 'How much protein do I need?', 'Connect my Apple Watch'],
  ts: Date.now(),
}

function renderText(text: string) {
  // Bold **text** and newlines
  return text.split('\n').map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g)
    return (
      <React.Fragment key={i}>
        {parts.map((p, j) =>
          p.startsWith('**') && p.endsWith('**')
            ? <strong key={j}>{p.slice(2, -2)}</strong>
            : p
        )}
        {i < text.split('\n').length - 1 && <br />}
      </React.Fragment>
    )
  })
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([WELCOME])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [unread, setUnread] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (isOpen) {
      setUnread(0)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const abortRef = useRef<AbortController | null>(null)
  useEffect(() => () => abortRef.current?.abort(), [])

  const updateMessage = (id: string, patch: (m: Message) => Partial<Message>) =>
    setMessages(prev => prev.map(m => (m.id === id ? { ...m, ...patch(m) } : m)))

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', text: trimmed, ts: Date.now() }
    const replyId = `a-${Date.now()}`
    const history = messages
      .filter(m => m.id !== 'welcome' && !m.error && m.text)
      .map(m => ({ role: m.role, content: m.text }))

    setMessages(prev => [...prev, userMsg, { id: replyId, role: 'assistant', text: '', ts: Date.now(), streaming: true }])
    setInput('')
    setLoading(true)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch(`${API_BASE}/api/chat/ai/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify({ message: trimmed, history }),
        signal: controller.signal,
      })

      if (res.status === 429) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.message || 'You are sending messages too quickly. Please wait a few minutes.')
      }
      if (!res.ok || !res.body) throw new Error('connect')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let finished = false
      while (!finished) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const events = buffer.split('\n\n')
        buffer = events.pop() ?? ''
        for (const evt of events) {
          const line = evt.split('\n').find(l => l.startsWith('data: '))
          if (!line) continue
          const data = JSON.parse(line.slice(6)) as { type: string; text?: string; quickReplies?: string[] }
          if (data.type === 'delta' && data.text) {
            updateMessage(replyId, m => ({ text: m.text + data.text }))
          } else if (data.type === 'done') {
            updateMessage(replyId, () => ({ quickReplies: data.quickReplies ?? [], streaming: false }))
            finished = true
          } else if (data.type === 'error') {
            throw new Error('connect')
          }
        }
      }
      updateMessage(replyId, () => ({ streaming: false }))
      if (!isOpen) setUnread(u => u + 1)
    } catch (err) {
      if (controller.signal.aborted) return
      const msg = err instanceof Error && err.message !== 'connect'
        ? err.message
        : "Sorry, I couldn't connect right now. Please try again or email **support@reprummble.com** — we respond within 24 hours."
      updateMessage(replyId, m => ({
        text: m.text ? `${m.text}\n\n(Connection lost — please ask again.)` : msg,
        quickReplies: ['Try again', 'Email support'],
        streaming: false,
        error: !m.text,
      }))
    } finally {
      setLoading(false)
    }
  }, [messages, loading, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleQuickReply = (text: string) => {
    if (text === 'Email support') {
      window.location.href = 'mailto:support@reprummble.com'
      return
    }
    if (text === 'Try again') {
      const lastUser = [...messages].reverse().find(m => m.role === 'user')
      if (lastUser) sendMessage(lastUser.text)
      return
    }
    sendMessage(text)
  }

  const lastMsg = messages[messages.length - 1]
  const showQuickReplies = lastMsg?.role === 'assistant' && lastMsg.quickReplies?.length

  return (
    <div className="chat-widget">
      {/* Chat window */}
      {isOpen && (
        <div className="chat-window">
          {/* Header */}
          <div className="chat-header">
            <div className="chat-header-info">
              <div className="chat-avatar">✨</div>
              <div>
                <div className="chat-header-title">Reprummble Support</div>
                <div className="chat-status">
                  <span className="chat-status-dot" style={{ backgroundColor: '#22d3bb' }} />
                  Rumi · AI Assistant
                </div>
              </div>
            </div>
            <button className="chat-close-btn" onClick={() => setIsOpen(false)} aria-label="Close chat">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="chat-messages" aria-live="polite">
            {messages.map(msg => (
              <div key={msg.id} className={`chat-message ${msg.role === 'user' ? 'user' : 'other'}`}>
                {msg.role === 'assistant' && (
                  <div className="chat-message-avatar ai">✨</div>
                )}
                <div className={`chat-bubble ${msg.role === 'user' ? 'user' : 'other'}`}>
                  {msg.role === 'assistant' && (
                    <div className="chat-sender-name">Rumi</div>
                  )}
                  {msg.streaming && !msg.text ? (
                    <div className="chat-typing-dots" aria-label="Rumi is typing">
                      <span /><span /><span />
                    </div>
                  ) : (
                    <div className="chat-message-text">
                      {renderText(msg.text)}
                      {msg.streaming && <span className="chat-caret" aria-hidden="true" />}
                    </div>
                  )}
                </div>
              </div>
            ))}

            <div ref={bottomRef} />
          </div>

          {/* Quick replies */}
          {showQuickReplies && !loading && (
            <div className="chat-quick-replies">
              {lastMsg.quickReplies!.map((r, i) => (
                <button key={i} className="chat-quick-reply" onClick={() => handleQuickReply(r)}>
                  {r}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form className="chat-input-area" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              type="text"
              className="chat-input"
              placeholder="Ask me anything..."
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              className="chat-send-btn"
              disabled={!input.trim() || loading}
              aria-label="Send"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </form>
        </div>
      )}

      {/* FAB */}
      <button className="chat-fab" onClick={() => setIsOpen(o => !o)} aria-label="Open support chat">
        {isOpen ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            {unread > 0 && <span className="chat-unread-badge">{unread}</span>}
          </>
        )}
      </button>
    </div>
  )
}
