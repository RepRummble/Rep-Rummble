import React, { useState, useRef, useEffect, useCallback } from 'react'
import { OPEN_CHAT_EVENT } from './openChat'
import './ChatWidget.css'
import './ChatSpaceship.css'

/** A little rocket for the launch button and the send button. */
const Rocket = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 2c3.2 2.4 5 5.6 5 9.4 0 1.6-.4 3.1-1.1 4.6H8.1C7.4 14.5 7 13 7 11.4 7 7.6 8.8 4.4 12 2z" />
    <circle cx="12" cy="9.5" r="1.7" />
    <path d="M8.1 16c-1.7.6-2.8 2-3.1 4 1.6-.3 3-1 3.9-2.2M15.9 16c1.7.6 2.8 2 3.1 4-1.6-.3-3-1-3.9-2.2M10.5 18.5 12 22l1.5-3.5" />
  </svg>
)

/** Rumi: a round-helmet pilot with a glowing visor. */
const Pilot = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <circle cx="16" cy="16" r="14" fill="#0b1226" stroke="url(#rm-rim)" strokeWidth="1.6" />
    <rect x="7.5" y="10.5" width="17" height="11" rx="5.5" fill="#05070d" stroke="#ff7a1a" strokeWidth="1.2" />
    <circle cx="12.5" cy="16" r="1.7" fill="#ff7a1a" /><circle cx="19.5" cy="16" r="1.7" fill="#ff7a1a" />
    <path d="M16 3.5V7" stroke="#ff4d4d" strokeWidth="1.6" strokeLinecap="round" /><circle cx="16" cy="3" r="1.4" fill="#ff4d4d" />
    <defs><linearGradient id="rm-rim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ff4d4d" /><stop offset="1" stopColor="#4da3ff" /></linearGradient></defs>
  </svg>
)

const API_BASE = import.meta.env.VITE_API_URL || ''
const TEASER_KEY = 'rr-chat-teaser-seen'

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
  text: "Hey, commander! 🚀 I'm **Rumi**, your co-pilot at Reprummble. Ask me anything about training, nutrition, recovery, or our plans.\n\nWhere shall we fly today?",
  quickReplies: ['Pricing & plans', 'Which workout should I start with?', 'Does it sync across devices?', 'Talk to a person'],
  ts: Date.now(),
}

// Site paths ("reprummble.com/pricing") and email addresses become links.
const LINK_RE = /((?:https?:\/\/)?(?:www\.)?reprummble\.com(?:\/[\w\-/]*)?|[\w.+-]+@[\w-]+\.[a-z]{2,})/gi

function linkify(text: string) {
  return text.split(LINK_RE).map((part, k) => {
    if (k % 2 === 0) return part
    const clean = part.replace(/[./-]+$/, '')
    const trailing = part.slice(clean.length)
    const href = clean.includes('@')
      ? `mailto:${clean}`
      : clean.replace(/^(?:https?:\/\/)?(?:www\.)?reprummble\.com/i, '') || '/'
    return <React.Fragment key={k}><a href={href} className="chat-link">{clean}</a>{trailing}</React.Fragment>
  })
}

function renderText(text: string) {
  // Bold **text**, links, and newlines
  return text.split('\n').map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g)
    return (
      <React.Fragment key={i}>
        {parts.map((p, j) =>
          p.startsWith('**') && p.endsWith('**')
            ? <strong key={j}>{linkify(p.slice(2, -2))}</strong>
            : <React.Fragment key={j}>{linkify(p)}</React.Fragment>
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

  // Let buttons elsewhere on the site open the chat (and optionally ask a question).
  const sendRef = useRef(sendMessage)
  sendRef.current = sendMessage
  useEffect(() => {
    const onOpen = (e: Event) => {
      const message = (e as CustomEvent<{ message?: string }>).detail?.message
      setIsOpen(true)
      setTeaser(false)
      if (message) sendRef.current(message)
    }
    window.addEventListener(OPEN_CHAT_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_CHAT_EVENT, onOpen)
  }, [])

  // A one-time nudge beside the button so visitors know they can ask questions.
  const [teaser, setTeaser] = useState(false)
  useEffect(() => {
    let seen = false
    try { seen = sessionStorage.getItem(TEASER_KEY) === '1' } catch { /* storage blocked */ }
    if (seen) return
    const t = window.setTimeout(() => setTeaser(true), 4000)
    return () => window.clearTimeout(t)
  }, [])
  useEffect(() => {
    if (!teaser && !isOpen) return
    try { sessionStorage.setItem(TEASER_KEY, '1') } catch { /* storage blocked */ }
  }, [teaser, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleQuickReply = (text: string) => {
    if (text === 'Email support' || text === 'Talk to a person' || text === 'Contact support') {
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
        <div className="chat-window ship">
          <i className="ship-stars" aria-hidden="true" />
          {/* Header */}
          <div className="chat-header">
            <div className="chat-header-info">
              <div className="chat-avatar ship-porthole"><Pilot size={34} /></div>
              <div>
                <div className="chat-header-title">Reprummble Support</div>
                <div className="chat-status">
                  <span className="chat-status-dot" />
                  Rumi · AI Assistant
                </div>
              </div>
            </div>
            <div className="ship-signal" aria-label="Comms link stable" title="Comms link stable"><i /><i /><i /><i /></div>
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
                  <div className="chat-message-avatar ai"><Pilot size={30} /></div>
                )}
                <div className={`chat-bubble ${msg.role === 'user' ? 'user' : 'other'}`}>
                  {msg.role === 'assistant' && (
                    <div className="chat-sender-name">Rumi</div>
                  )}
                  {msg.streaming && !msg.text ? (
                    <div className="chat-typing-dots" aria-label="Rumi is typing">
                      <span /><span /><span /><em>transmitting</em>
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
              placeholder="Transmit a message…"
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
              <Rocket size={18} />
            </button>
          </form>
        </div>
      )}

      {teaser && !isOpen && (
        <div className="chat-teaser" role="status">
          <button type="button" className="chat-teaser-body" onClick={() => { setTeaser(false); setIsOpen(true) }}>
            <strong>Mission control online 🚀</strong>
            <span>Questions? Ask Rumi. Plans, workouts, getting started — I reply instantly.</span>
          </button>
          <button type="button" className="chat-teaser-close" onClick={() => setTeaser(false)} aria-label="Dismiss">×</button>
        </div>
      )}

      {/* FAB */}
      <button className="chat-fab ship-fab" onClick={() => { setTeaser(false); setIsOpen(o => !o) }} aria-label={isOpen ? 'Close support chat' : 'Open support chat'}>
        {isOpen ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <>
            <span className="ship-orbit" aria-hidden="true"><i /></span>
            <Rocket size={26} />
            {unread > 0 && <span className="chat-unread-badge">{unread}</span>}
          </>
        )}
      </button>
    </div>
  )
}
