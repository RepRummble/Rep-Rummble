import { Server as HttpServer } from 'http'
import { Server, Socket } from 'socket.io'
import { SupportConversation } from '../models/SupportConversation.model'
import { SupportMessage } from '../models/SupportMessage.model'
import { SupportAgent } from '../models/SupportAgent.model'
import { generateSupportResponse } from '../services/support-ai.service'

let io: Server | null = null

// Store active socket connections
const userSockets = new Map<string, Socket>() // sessionId -> socket
const agentSockets = new Map<string, Socket>() // agentId -> socket

export function initializeSocket(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:19006',
        'http://localhost:8081',
        'https://reprummble.com',
        'https://www.reprummble.com',
        process.env.WEB_URL || '',
      ].filter(Boolean),
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  })

  // User chat namespace
  const chatNamespace = io.of('/chat')

  chatNamespace.on('connection', (socket: Socket) => {
    console.log('User connected to chat:', socket.id)

    // Join a conversation room
    socket.on('join_conversation', async (data: { sessionId: string, conversationId?: string }) => {
      const { sessionId, conversationId } = data

      userSockets.set(sessionId, socket)

      if (conversationId) {
        socket.join(`conversation:${conversationId}`)
      }

      socket.emit('joined', { sessionId, conversationId })
    })

    // Handle user sending a message
    socket.on('send_message', async (data: {
      conversationId: string
      content: string
      sessionId: string
      userName?: string
      userEmail?: string
    }) => {
      try {
        const { conversationId, content, userName, userEmail } = data

        // Get conversation
        let conversation = await SupportConversation.findById(conversationId)

        if (!conversation) {
          socket.emit('error', { message: 'Conversation not found' })
          return
        }

        // Save user message
        const userMessage = await SupportMessage.create({
          conversationId,
          senderType: 'user',
          senderName: userName || 'User',
          content,
          contentType: 'text'
        })

        // Broadcast to conversation room
        chatNamespace.to(`conversation:${conversationId}`).emit('new_message', {
          message: userMessage
        })

        // Update conversation activity
        conversation.lastActivityAt = new Date()
        conversation.aiContext.messageCount += 1
        await conversation.save()

        // If conversation is with AI, generate response
        if (conversation.status === 'active') {
          // Get conversation history for context
          const history = await SupportMessage.find({ conversationId })
            .sort({ createdAt: 1 })
            .limit(20)

          // Generate AI response
          const aiResponse = await generateSupportResponse(
            content,
            history.map(m => ({ role: m.senderType, content: m.content })),
            { name: userName, email: userEmail }
          )

          // Check if escalation is needed
          if (aiResponse.shouldEscalate) {
            conversation.status = 'waiting_agent'
            conversation.escalatedFromAI = true
            conversation.escalationReason = aiResponse.escalationReason
            conversation.escalationTimestamp = new Date()
            conversation.priority = (aiResponse.priority || 'medium') as 'low' | 'medium' | 'high' | 'urgent'
            await conversation.save()

            // Notify agents about new conversation in queue
            const agentNamespace = io?.of('/agent')
            agentNamespace?.emit('queue_update', {
              action: 'new',
              conversation: conversation
            })

            // Send system message to user
            const systemMessage = await SupportMessage.create({
              conversationId,
              senderType: 'system',
              content: 'Connecting you with a support agent. Please wait...',
              contentType: 'text'
            })

            chatNamespace.to(`conversation:${conversationId}`).emit('new_message', {
              message: systemMessage
            })
          }

          // Save and send AI response
          const aiMessage = await SupportMessage.create({
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

          chatNamespace.to(`conversation:${conversationId}`).emit('new_message', {
            message: aiMessage
          })
        }
        // If with agent, message is already broadcast, agent will respond via their socket
      } catch (error) {
        console.error('Error handling message:', error)
        socket.emit('error', { message: 'Failed to send message' })
      }
    })

    // Typing indicators
    socket.on('typing_start', (data: { conversationId: string, userName: string }) => {
      socket.to(`conversation:${data.conversationId}`).emit('user_typing', {
        userName: data.userName
      })
    })

    socket.on('typing_stop', (data: { conversationId: string }) => {
      socket.to(`conversation:${data.conversationId}`).emit('user_stopped_typing')
    })

    // Leave conversation
    socket.on('leave_conversation', (data: { conversationId: string, sessionId: string }) => {
      socket.leave(`conversation:${data.conversationId}`)
      userSockets.delete(data.sessionId)
    })

    socket.on('disconnect', () => {
      console.log('User disconnected from chat:', socket.id)
      // Clean up socket mapping
      for (const [sessionId, s] of userSockets.entries()) {
        if (s.id === socket.id) {
          userSockets.delete(sessionId)
          break
        }
      }
    })
  })

  // Agent dashboard namespace
  const agentNamespace = io.of('/agent')

  agentNamespace.on('connection', (socket: Socket) => {
    console.log('Agent connected:', socket.id)

    // Agent comes online
    socket.on('agent_join', async (data: { agentId: string }) => {
      const { agentId } = data

      agentSockets.set(agentId, socket)
      socket.join('agents') // Join agents room for broadcast

      // Update agent status
      await SupportAgent.findByIdAndUpdate(agentId, {
        status: 'online',
        isAvailable: true,
        lastActiveAt: new Date()
      })

      // Send current queue
      const queue = await SupportConversation.find({
        status: 'waiting_agent'
      }).sort({ priority: -1, createdAt: 1 })

      socket.emit('queue_list', { conversations: queue })
    })

    // Agent claims a conversation
    socket.on('claim_chat', async (data: { agentId: string, conversationId: string }) => {
      try {
        const { agentId, conversationId } = data

        const conversation = await SupportConversation.findByIdAndUpdate(
          conversationId,
          {
            status: 'with_agent',
            assignedAgentId: agentId,
            assignedAt: new Date()
          },
          { new: true }
        )

        if (!conversation) {
          socket.emit('error', { message: 'Conversation not found' })
          return
        }

        // Update agent chat count
        await SupportAgent.findByIdAndUpdate(agentId, {
          $inc: { currentChatCount: 1 }
        })

        // Join conversation room
        socket.join(`conversation:${conversationId}`)

        // Get agent info
        const agent = await SupportAgent.findById(agentId)

        // Notify user that agent has joined
        const systemMessage = await SupportMessage.create({
          conversationId,
          senderType: 'system',
          content: `You're now connected with ${agent?.displayName || 'a support agent'}. How can they help you today?`,
          contentType: 'text'
        })

        chatNamespace.to(`conversation:${conversationId}`).emit('new_message', {
          message: systemMessage
        })

        chatNamespace.to(`conversation:${conversationId}`).emit('agent_assigned', {
          agentName: agent?.displayName,
          agentId
        })

        // Update queue for all agents
        agentNamespace.emit('queue_update', {
          action: 'claimed',
          conversationId,
          agentId
        })

        socket.emit('chat_claimed', { conversation })
      } catch (error) {
        console.error('Error claiming chat:', error)
        socket.emit('error', { message: 'Failed to claim chat' })
      }
    })

    // Agent sends message
    socket.on('agent_message', async (data: {
      agentId: string
      conversationId: string
      content: string
    }) => {
      try {
        const { agentId, conversationId, content } = data

        const agent = await SupportAgent.findById(agentId)

        const message = await SupportMessage.create({
          conversationId,
          senderType: 'agent',
          senderId: agentId,
          senderName: agent?.displayName || 'Support Agent',
          content,
          contentType: 'text'
        })

        // Update conversation activity
        await SupportConversation.findByIdAndUpdate(conversationId, {
          lastActivityAt: new Date()
        })

        // Broadcast to conversation room (both user and agent see it)
        chatNamespace.to(`conversation:${conversationId}`).emit('new_message', {
          message
        })
        agentNamespace.to(`conversation:${conversationId}`).emit('new_message', {
          message
        })
      } catch (error) {
        console.error('Error sending agent message:', error)
        socket.emit('error', { message: 'Failed to send message' })
      }
    })

    // Agent typing
    socket.on('agent_typing', (data: { conversationId: string, agentName: string }) => {
      chatNamespace.to(`conversation:${data.conversationId}`).emit('agent_typing', {
        agentName: data.agentName
      })
    })

    socket.on('agent_stopped_typing', (data: { conversationId: string }) => {
      chatNamespace.to(`conversation:${data.conversationId}`).emit('agent_stopped_typing')
    })

    // Resolve conversation
    socket.on('resolve_chat', async (data: { agentId: string, conversationId: string }) => {
      try {
        const { agentId, conversationId } = data

        await SupportConversation.findByIdAndUpdate(conversationId, {
          status: 'resolved',
          closedAt: new Date()
        })

        await SupportAgent.findByIdAndUpdate(agentId, {
          $inc: { currentChatCount: -1, totalChatsHandled: 1 }
        })

        const systemMessage = await SupportMessage.create({
          conversationId,
          senderType: 'system',
          content: 'This conversation has been resolved. Thank you for contacting Reprummble support!',
          contentType: 'text'
        })

        chatNamespace.to(`conversation:${conversationId}`).emit('new_message', {
          message: systemMessage
        })

        chatNamespace.to(`conversation:${conversationId}`).emit('conversation_resolved')

        socket.leave(`conversation:${conversationId}`)
        socket.emit('chat_resolved', { conversationId })
      } catch (error) {
        console.error('Error resolving chat:', error)
        socket.emit('error', { message: 'Failed to resolve chat' })
      }
    })

    // Agent goes offline
    socket.on('agent_leave', async (data: { agentId: string }) => {
      agentSockets.delete(data.agentId)

      await SupportAgent.findByIdAndUpdate(data.agentId, {
        status: 'offline',
        isAvailable: false
      })
    })

    socket.on('disconnect', async () => {
      console.log('Agent disconnected:', socket.id)
      // Clean up and set offline
      for (const [agentId, s] of agentSockets.entries()) {
        if (s.id === socket.id) {
          agentSockets.delete(agentId)
          await SupportAgent.findByIdAndUpdate(agentId, {
            status: 'offline',
            isAvailable: false
          })
          break
        }
      }
    })
  })

  console.log('✅ Socket.io initialized')
  return io
}

export function getIO(): Server | null {
  return io
}
