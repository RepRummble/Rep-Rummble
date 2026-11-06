import { Request, Response } from 'express'
import { SupportConversation } from '../models/SupportConversation.model'
import { SupportMessage } from '../models/SupportMessage.model'
import { SupportAgent, ISupportAgent } from '../models/SupportAgent.model'
import { generateHandoffSummary } from '../services/support-ai.service'

interface AgentRequest extends Request {
  user?: { id: string; email?: string }
  agent?: ISupportAgent
}

/**
 * @route   GET /api/agent/dashboard
 * @desc    Get agent dashboard statistics
 * @access  Agent only
 */
export const getDashboard = async (req: AgentRequest, res: Response) => {
  try {
    const agentId = req.agent?._id

    // Get queue count
    const queueCount = await SupportConversation.countDocuments({
      status: 'waiting_agent'
    })

    // Get agent's active chats
    const activeChats = await SupportConversation.countDocuments({
      assignedAgentId: agentId,
      status: 'with_agent'
    })

    // Get today's resolved count
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const resolvedToday = await SupportConversation.countDocuments({
      assignedAgentId: agentId,
      status: 'resolved',
      closedAt: { $gte: todayStart }
    })

    // Get average rating
    const ratingStats = await SupportConversation.aggregate([
      {
        $match: {
          assignedAgentId: agentId,
          satisfactionRating: { $exists: true }
        }
      },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$satisfactionRating' },
          totalRatings: { $sum: 1 }
        }
      }
    ])

    return res.status(200).json({
      success: true,
      data: {
        queueCount,
        activeChats,
        resolvedToday,
        maxChats: req.agent?.maxConcurrentChats || 5,
        averageRating: ratingStats[0]?.avgRating || 0,
        totalRatings: ratingStats[0]?.totalRatings || 0,
        status: req.agent?.status || 'offline'
      }
    })
  } catch (error: any) {
    console.error('Dashboard error:', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get dashboard'
    })
  }
}

/**
 * @route   GET /api/agent/queue
 * @desc    Get conversations waiting for an agent
 * @access  Agent only
 */
export const getQueue = async (_req: AgentRequest, res: Response) => {
  try {
    const conversations = await SupportConversation.find({
      status: 'waiting_agent'
    })
      .sort({ priority: -1, createdAt: 1 })
      .limit(50)

    // Get last message for each conversation
    const conversationsWithLastMessage = await Promise.all(
      conversations.map(async (conv) => {
        const lastMessage = await SupportMessage.findOne({
          conversationId: conv._id,
          senderType: 'user'
        }).sort({ createdAt: -1 })

        return {
          ...conv.toObject(),
          lastMessage: lastMessage?.content || 'No message'
        }
      })
    )

    return res.status(200).json({
      success: true,
      data: conversationsWithLastMessage
    })
  } catch (error: any) {
    console.error('Get queue error:', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get queue'
    })
  }
}

/**
 * @route   GET /api/agent/active
 * @desc    Get agent's active conversations
 * @access  Agent only
 */
export const getActiveChats = async (req: AgentRequest, res: Response) => {
  try {
    const conversations = await SupportConversation.find({
      assignedAgentId: req.agent?._id,
      status: 'with_agent'
    }).sort({ lastActivityAt: -1 })

    return res.status(200).json({
      success: true,
      data: conversations
    })
  } catch (error: any) {
    console.error('Get active chats error:', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get active chats'
    })
  }
}

/**
 * @route   POST /api/agent/claim/:conversationId
 * @desc    Claim a conversation from the queue
 * @access  Agent only
 */
export const claimConversation = async (req: AgentRequest, res: Response) => {
  try {
    const conversationId = String(req.params.conversationId)
    const agent = req.agent

    if (!agent) {
      return res.status(403).json({
        success: false,
        message: 'Agent not found'
      })
    }

    // Check if agent can take more chats
    if (agent.currentChatCount >= agent.maxConcurrentChats) {
      return res.status(400).json({
        success: false,
        message: 'Maximum concurrent chats reached'
      })
    }

    // Try to claim the conversation (atomic update)
    const conversation = await SupportConversation.findOneAndUpdate(
      {
        _id: conversationId,
        status: 'waiting_agent'
      },
      {
        status: 'with_agent',
        assignedAgentId: agent._id,
        assignedAt: new Date()
      },
      { new: true }
    )

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found or already claimed'
      })
    }

    // Update agent chat count
    await SupportAgent.findByIdAndUpdate(agent._id, {
      $inc: { currentChatCount: 1 }
    })

    // Get conversation history
    const messages = await SupportMessage.find({ conversationId })
      .sort({ createdAt: 1 })

    // Generate handoff summary
    const summary = await generateHandoffSummary(
      messages.map(m => ({ role: m.senderType, content: m.content }))
    )

    return res.status(200).json({
      success: true,
      data: {
        conversation,
        messages,
        summary
      }
    })
  } catch (error: any) {
    console.error('Claim conversation error:', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to claim conversation'
    })
  }
}

/**
 * @route   POST /api/agent/transfer/:conversationId
 * @desc    Transfer conversation to another agent or back to queue
 * @access  Agent only
 */
export const transferConversation = async (req: AgentRequest, res: Response) => {
  try {
    const conversationId = String(req.params.conversationId)
    const { targetAgentId, reason } = req.body
    const currentAgent = req.agent

    const conversation = await SupportConversation.findById(conversationId)

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      })
    }

    if (conversation.assignedAgentId?.toString() !== currentAgent?._id?.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this conversation'
      })
    }

    // Decrement current agent's chat count
    await SupportAgent.findByIdAndUpdate(currentAgent?._id, {
      $inc: { currentChatCount: -1 }
    })

    if (targetAgentId) {
      // Transfer to specific agent
      const targetAgent = await SupportAgent.findById(targetAgentId)

      if (!targetAgent || targetAgent.currentChatCount >= targetAgent.maxConcurrentChats) {
        return res.status(400).json({
          success: false,
          message: 'Target agent unavailable'
        })
      }

      conversation.assignedAgentId = targetAgentId
      conversation.assignedAt = new Date()
      await conversation.save()

      await SupportAgent.findByIdAndUpdate(targetAgentId, {
        $inc: { currentChatCount: 1 }
      })

      // Add system message
      await SupportMessage.create({
        conversationId,
        senderType: 'system',
        content: `Conversation transferred to ${targetAgent.displayName}${reason ? `: ${reason}` : ''}`,
        contentType: 'text'
      })
    } else {
      // Return to queue
      conversation.status = 'waiting_agent'
      conversation.assignedAgentId = undefined
      conversation.assignedAt = undefined
      await conversation.save()

      await SupportMessage.create({
        conversationId,
        senderType: 'system',
        content: 'You have been placed back in queue. An agent will be with you shortly.',
        contentType: 'text'
      })
    }

    return res.status(200).json({
      success: true,
      message: targetAgentId ? 'Conversation transferred' : 'Conversation returned to queue'
    })
  } catch (error: any) {
    console.error('Transfer conversation error:', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to transfer conversation'
    })
  }
}

/**
 * @route   PUT /api/agent/status
 * @desc    Update agent availability status
 * @access  Agent only
 */
export const updateStatus = async (req: AgentRequest, res: Response) => {
  try {
    const { status, isAvailable } = req.body

    const validStatuses = ['online', 'away', 'busy', 'offline']
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      })
    }

    const update: any = { lastActiveAt: new Date() }
    if (status) update.status = status
    if (typeof isAvailable === 'boolean') update.isAvailable = isAvailable

    const agent = await SupportAgent.findByIdAndUpdate(
      req.agent?._id,
      update,
      { new: true }
    )

    return res.status(200).json({
      success: true,
      data: agent
    })
  } catch (error: any) {
    console.error('Update status error:', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update status'
    })
  }
}

/**
 * @route   GET /api/agent/analytics
 * @desc    Get agent performance analytics
 * @access  Agent only
 */
export const getAnalytics = async (req: AgentRequest, res: Response) => {
  try {
    const agentId = req.agent?._id
    const { period = '7d' } = req.query

    // Calculate date range
    const now = new Date()
    let startDate: Date

    switch (period) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    }

    // Get conversations in period
    const conversations = await SupportConversation.find({
      assignedAgentId: agentId,
      assignedAt: { $gte: startDate }
    })

    const resolved = conversations.filter(c => c.status === 'resolved').length
    const ratings = conversations
      .filter(c => c.satisfactionRating)
      .map(c => c.satisfactionRating as number)

    const avgRating = ratings.length > 0
      ? ratings.reduce((a, b) => a + b, 0) / ratings.length
      : 0

    // Calculate average response time (from assignment to first agent message)
    const responseTimes: number[] = []
    for (const conv of conversations) {
      const firstAgentMessage = await SupportMessage.findOne({
        conversationId: conv._id,
        senderType: 'agent'
      }).sort({ createdAt: 1 })

      if (firstAgentMessage && conv.assignedAt) {
        const responseTime = firstAgentMessage.createdAt.getTime() - conv.assignedAt.getTime()
        responseTimes.push(responseTime / 1000) // Convert to seconds
      }
    }

    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0

    return res.status(200).json({
      success: true,
      data: {
        period,
        totalConversations: conversations.length,
        resolvedConversations: resolved,
        resolutionRate: conversations.length > 0 ? (resolved / conversations.length) * 100 : 0,
        averageRating: Math.round(avgRating * 10) / 10,
        totalRatings: ratings.length,
        averageResponseTime: Math.round(avgResponseTime), // seconds
        ratingDistribution: {
          5: ratings.filter(r => r === 5).length,
          4: ratings.filter(r => r === 4).length,
          3: ratings.filter(r => r === 3).length,
          2: ratings.filter(r => r === 2).length,
          1: ratings.filter(r => r === 1).length
        }
      }
    })
  } catch (error: any) {
    console.error('Get analytics error:', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get analytics'
    })
  }
}

/**
 * @route   GET /api/agent/conversation/:id
 * @desc    Get a specific conversation with messages (for agent view)
 * @access  Agent only
 */
export const getAgentConversation = async (req: AgentRequest, res: Response) => {
  try {
    const { id } = req.params

    const conversation = await SupportConversation.findById(id)

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
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
    console.error('Get agent conversation error:', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get conversation'
    })
  }
}
