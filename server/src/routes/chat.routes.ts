import { Router, Request, Response } from 'express'
import {
  startConversation,
  getConversation,
  getChatHistory,
  sendMessage,
  rateConversation,
  closeConversation
} from '../controllers/chat.controller'
import { protect, optionalAuth } from '../middleware/auth.middleware'
import {
  generateAIChatResponse,
  streamAIChatResponse,
  ChatHistoryMessage,
  MAX_MESSAGE_CHARS,
} from '../services/support-ai.service'
import { chatLimiter } from '../middleware/rateLimit.middleware'

const router = Router()

function parseChatBody(body: unknown): { message: string; history: ChatHistoryMessage[] } | null {
  const { message, history } = (body ?? {}) as { message?: unknown; history?: unknown }
  if (typeof message !== 'string' || !message.trim()) return null
  const cleanHistory = Array.isArray(history)
    ? history
        .filter((m): m is ChatHistoryMessage =>
          !!m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
        .slice(-12)
    : []
  return { message: message.trim().slice(0, MAX_MESSAGE_CHARS), history: cleanHistory }
}

router.post('/ai', chatLimiter, async (req: Request, res: Response) => {
  const parsed = parseChatBody(req.body)
  if (!parsed) return res.status(400).json({ success: false, message: 'message is required' })
  try {
    const result = await generateAIChatResponse(parsed.message, parsed.history)
    return res.json({ success: true, data: result })
  } catch (err) {
    console.error('Chat AI error:', err)
    return res.status(500).json({ success: false, message: 'AI service error' })
  }
})

// Server-Sent Events: the reply arrives word by word as the model generates it.
router.post('/ai/stream', chatLimiter, async (req: Request, res: Response) => {
  const parsed = parseChatBody(req.body)
  if (!parsed) return res.status(400).json({ success: false, message: 'message is required' })

  res.status(200)
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  let closed = false
  res.on('close', () => { closed = true })
  // compression() buffers output; flush so each chunk reaches the browser immediately.
  const send = (payload: object) => {
    if (closed) return
    res.write(`data: ${JSON.stringify(payload)}\n\n`)
    ;(res as Response & { flush?: () => void }).flush?.()
  }

  try {
    const result = await streamAIChatResponse(
      parsed.message,
      parsed.history,
      (text) => send({ type: 'delta', text }),
      () => closed
    )
    send({ type: 'done', quickReplies: result.quickReplies, fallback: !!result.fallback })
  } catch (err) {
    console.error('Chat stream error:', err)
    send({ type: 'error' })
  } finally {
    if (!closed) res.end()
  }
})

// Legacy routes kept for compatibility
router.post('/start', optionalAuth, startConversation)
router.get('/conversation/:id', optionalAuth, getConversation)
router.post('/message', optionalAuth, sendMessage)
router.post('/rate/:conversationId', optionalAuth, rateConversation)
router.post('/close/:conversationId', optionalAuth, closeConversation)
router.get('/history', protect, getChatHistory)

export default router
