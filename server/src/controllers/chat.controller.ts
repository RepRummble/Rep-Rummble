import { Request, Response } from 'express'
import mongoose from 'mongoose'
import { v4 as uuidv4 } from 'uuid'
import { SupportConversation } from '../models/SupportConversation.model'
import { SupportMessage } from '../models/SupportMessage.model'
import { generateSupportResponse } from '../services/support-ai.service'
import { planOf } from '../middleware/plan.middleware'

interface AuthRequest extends Request {
  user?: { id: string; email?: string; displayName?: string }
}

/**
 * @route   POST /api/chat/start
 * @desc    Start a new support conversation
 * @access  Public (optional auth)
 */
export const startConversation = async (req: AuthRequest, res: Response) => {
  try {
    const { platform, userName, userEmail } = req.body

    if (!platform || !['web', 'ios', 'android'].includes(platform)) {
      return res.status(400).json({
        success: false,
        message: 'Valid platform is required (web, ios, android)'
      })
    }

    const sessionId = uuidv4()
    const premium = req.user?.id ? (await planOf(req.user.id)) === 'premium' : false   // priority support is a Premium promise

    const conversation = await SupportConversation.create({
      userId: mongoose.isValidObjectId(req.user?.id) ? req.user?.id : undefined,
      userEmail: userEmail || req.user?.email,
      userName: userName || req.user?.displayName || 'Guest',
      sessionId,
      platform,
      premium,
      status: 'active',
      aiContext: {
        messageCount: 0,
        failedAttempts: 0,
        topics: [],
        sentiment: 'neutral'
      }
    })

    // Create welcome message from AI
    const welcomeMessage = await SupportMessage.create({
      conversationId: conversation._id,
      senderType: 'ai',
      senderName: 'Reprummble Assistant',
      content: `Hi${userName ? ` ${userName}` : ''}! Welcome to Reprummble support. I'm here to help you with any questions about the app. What can I assist you with today?`,
      contentType: 'text',
      aiConfidence: 1.0,
      quickReplies: [
        { text: 'How do I log meals?', payload: 'meal_logging' },
        { text: 'Subscription plans', payload: 'subscription' },
        { text: 'Technical issue', payload: 'technical' }
      ]
    })

    return res.status(201).json({
      success: true,
      data: {
        conversation,
        sessionId,
        welcomeMessage
      }
    })
  } catch (error: any) {
    console.error('Start conversation error:', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to start conversation'
    })
  }
}

/**
 * @route   GET /api/chat/conversation/:id
 * @desc    Get a conversation with its messages
 * @access  Public (with sessionId) or Private
 */
export const getConversation = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { sessionId } = req.query

    const conversation = await SupportConversation.findById(id)

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      })
    }

    // Verify access (either owner or matching sessionId)
    if (
      conversation.userId?.toString() !== req.user?.id &&
      conversation.sessionId !== sessionId
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      })
    }

    const messages = await SupportMessage.find({ conversationId: id })
      .sort({ createdAt: 1 })

    return res.status(200).json({
      success: true,
      data: {
        conversation,
        messages
      }
    })
  } catch (error: any) {
    console.error('Get conversation error:', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get conversation'
    })
  }
}

/**
 * @route   GET /api/chat/history
 * @desc    Get user's conversation history
 * @access  Private
 */
export const getChatHistory = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      })
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(50, parseInt(req.query.limit as string) || 10)
    const skip = (page - 1) * limit

    // Signed-in people have a Supabase id that is not an ObjectId, so their conversations are found by their email instead.
    const owner = mongoose.isValidObjectId(req.user.id) ? { userId: req.user.id } : { userEmail: req.user.email ?? '__none__' }
    const conversations = await SupportConversation.find(owner)
      .sort({ lastActivityAt: -1 })
      .skip(skip)
      .limit(limit)

    const total = await SupportConversation.countDocuments(owner)

    return res.status(200).json({
      success: true,
      data: {
        conversations,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    })
  } catch (error: any) {
    console.error('Get chat history error:', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get chat history'
    })
  }
}

/**
 * @route   POST /api/chat/message
 * @desc    Send a message (REST fallback for non-WebSocket)
 * @access  Public (with sessionId) or Private
 */
export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { conversationId, content, sessionId } = req.body

    if (!conversationId || !content) {
      return res.status(400).json({
        success: false,
        message: 'Conversation ID and content are required'
      })
    }

    const conversation = await SupportConversation.findById(conversationId)

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      })
    }

    // Verify access
    if (
      conversation.userId?.toString() !== req.user?.id &&
      conversation.sessionId !== sessionId
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      })
    }

    // Save user message
    const userMessage = await SupportMessage.create({
      conversationId,
      senderType: 'user',
      senderName: conversation.userName || 'User',
      content,
      contentType: 'text'
    })

    // Update conversation
    conversation.lastActivityAt = new Date()
    conversation.aiContext.messageCount += 1
    await conversation.save()

    // If conversation is with AI, generate response
    let aiMessage = null
    if (conversation.status === 'active') {
      const history = await SupportMessage.find({ conversationId })
        .sort({ createdAt: 1 })
        .limit(20)

      const aiResponse = await generateSupportResponse(
        content,
        history.map(m => ({ role: m.senderType, content: m.content })),
        { name: conversation.userName, email: conversation.userEmail }
      )

      // Check for escalation
      if (aiResponse.shouldEscalate) {
        conversation.status = 'waiting_agent'
        conversation.escalatedFromAI = true
        conversation.escalationReason = aiResponse.escalationReason
        conversation.escalationTimestamp = new Date()
        conversation.priority = (aiResponse.priority || 'medium') as 'low' | 'medium' | 'high' | 'urgent'
        await conversation.save()
      }

      aiMessage = await SupportMessage.create({
        conversationId,
        senderType: 'ai',
        senderName: 'Reprummble Assistant',
        content: aiResponse.response,
        contentType: 'text',
        aiConfidence: aiResponse.confidence,
        aiSuggestedEscalation: aiResponse.shouldEscalate,
        quickReplies: aiResponse.suggestedQuickReplies?.map(text => ({
          text,
          payload: text
        }))
      })

      // Update AI context
      if (aiResponse.confidence < 0.5) {
        conversation.aiContext.failedAttempts += 1
      }
      conversation.aiContext.sentiment = aiResponse.sentiment
      await conversation.save()
    }

    return res.status(200).json({
      success: true,
      data: {
        userMessage,
        aiMessage,
        conversation
      }
    })
  } catch (error: any) {
    console.error('Send message error:', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to send message'
    })
  }
}

/**
 * @route   POST /api/chat/rate/:conversationId
 * @desc    Submit satisfaction rating for a conversation
 * @access  Public (with sessionId) or Private
 */
export const rateConversation = async (req: AuthRequest, res: Response) => {
  try {
    const { conversationId } = req.params
    const { rating, comment, sessionId } = req.body

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      })
    }

    const conversation = await SupportConversation.findById(conversationId)

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      })
    }

    // Verify access
    if (
      conversation.userId?.toString() !== req.user?.id &&
      conversation.sessionId !== sessionId
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      })
    }

    conversation.satisfactionRating = rating
    if (comment) {
      conversation.feedbackComment = comment
    }
    await conversation.save()

    return res.status(200).json({
      success: true,
      message: 'Thank you for your feedback!'
    })
  } catch (error: any) {
    console.error('Rate conversation error:', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to submit rating'
    })
  }
}

/**
 * @route   POST /api/chat/close/:conversationId
 * @desc    Close a conversation
 * @access  Public (with sessionId) or Private
 */
export const closeConversation = async (req: AuthRequest, res: Response) => {
  try {
    const { conversationId } = req.params
    const { sessionId } = req.body

    const conversation = await SupportConversation.findById(conversationId)

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      })
    }

    // Verify access
    if (
      conversation.userId?.toString() !== req.user?.id &&
      conversation.sessionId !== sessionId
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      })
    }

    conversation.status = 'closed'
    conversation.closedAt = new Date()
    await conversation.save()

    return res.status(200).json({
      success: true,
      message: 'Conversation closed'
    })
  } catch (error: any) {
    console.error('Close conversation error:', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to close conversation'
    })
  }
}
