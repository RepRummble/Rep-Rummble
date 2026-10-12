import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../config/api';

const API_URL = API_BASE_URL.replace(/\/api$/, '');

export interface ChatMessage {
  _id: string;
  conversationId: string;
  senderType: 'user' | 'ai' | 'agent' | 'system';
  senderName?: string;
  content: string;
  contentType: 'text' | 'image' | 'file' | 'quick_reply';
  quickReplies?: { text: string; payload: string }[];
  aiConfidence?: number;
  createdAt: string;
}

export interface Conversation {
  _id: string;
  sessionId: string;
  status: 'active' | 'waiting_agent' | 'with_agent' | 'resolved' | 'closed';
  userName?: string;
  userEmail?: string;
}

class ChatSocketService {
  private socket: Socket | null = null;
  private sessionId: string | null = null;
  private conversationId: string | null = null;

  // Event callbacks
  private onMessageCallback: ((message: ChatMessage) => void) | null = null;
  private onTypingCallback: ((data: { userName?: string; agentName?: string }) => void) | null = null;
  private onStopTypingCallback: (() => void) | null = null;
  private onAgentAssignedCallback: ((data: { agentName: string; agentId: string }) => void) | null = null;
  private onConversationResolvedCallback: (() => void) | null = null;
  private onErrorCallback: ((error: { message: string }) => void) | null = null;

  connect() {
    if (this.socket?.connected) return;

    this.socket = io(`${API_URL}/chat`, {
      transports: ['websocket'],
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      console.log('Chat socket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('Chat socket disconnected');
    });

    this.socket.on('new_message', (data: { message: ChatMessage }) => {
      this.onMessageCallback?.(data.message);
    });

    this.socket.on('user_typing', (data: { userName: string }) => {
      this.onTypingCallback?.(data);
    });

    this.socket.on('agent_typing', (data: { agentName: string }) => {
      this.onTypingCallback?.(data);
    });

    this.socket.on('user_stopped_typing', () => {
      this.onStopTypingCallback?.();
    });

    this.socket.on('agent_stopped_typing', () => {
      this.onStopTypingCallback?.();
    });

    this.socket.on('agent_assigned', (data: { agentName: string; agentId: string }) => {
      this.onAgentAssignedCallback?.(data);
    });

    this.socket.on('conversation_resolved', () => {
      this.onConversationResolvedCallback?.();
    });

    this.socket.on('error', (error: { message: string }) => {
      console.error('Socket error:', error);
      this.onErrorCallback?.(error);
    });
  }

  disconnect() {
    if (this.socket) {
      if (this.conversationId && this.sessionId) {
        this.socket.emit('leave_conversation', {
          conversationId: this.conversationId,
          sessionId: this.sessionId,
        });
      }
      this.socket.disconnect();
      this.socket = null;
    }
    this.sessionId = null;
    this.conversationId = null;
  }

  joinConversation(sessionId: string, conversationId: string) {
    this.sessionId = sessionId;
    this.conversationId = conversationId;
    this.socket?.emit('join_conversation', { sessionId, conversationId });
  }

  sendMessage(content: string, userName?: string, userEmail?: string) {
    if (!this.conversationId || !this.sessionId) return;

    this.socket?.emit('send_message', {
      conversationId: this.conversationId,
      content,
      sessionId: this.sessionId,
      userName,
      userEmail,
    });
  }

  startTyping(userName: string) {
    if (!this.conversationId) return;
    this.socket?.emit('typing_start', { conversationId: this.conversationId, userName });
  }

  stopTyping() {
    if (!this.conversationId) return;
    this.socket?.emit('typing_stop', { conversationId: this.conversationId });
  }

  // Event listeners
  onMessage(callback: (message: ChatMessage) => void) {
    this.onMessageCallback = callback;
  }

  onTyping(callback: (data: { userName?: string; agentName?: string }) => void) {
    this.onTypingCallback = callback;
  }

  onStopTyping(callback: () => void) {
    this.onStopTypingCallback = callback;
  }

  onAgentAssigned(callback: (data: { agentName: string; agentId: string }) => void) {
    this.onAgentAssignedCallback = callback;
  }

  onConversationResolved(callback: () => void) {
    this.onConversationResolvedCallback = callback;
  }

  onError(callback: (error: { message: string }) => void) {
    this.onErrorCallback = callback;
  }

  // Getters
  getSessionId() {
    return this.sessionId;
  }

  getConversationId() {
    return this.conversationId;
  }

  isConnected() {
    return this.socket?.connected ?? false;
  }
}

export const chatSocket = new ChatSocketService();
export default chatSocket;
