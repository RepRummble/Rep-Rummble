import { useState, useEffect, useCallback } from 'react';
import chatSocket, { ChatMessage, Conversation } from '../services/chatSocket';

const API_URL = import.meta.env.VITE_API_URL || '';

interface UseChatOptions {
  userName?: string;
  userEmail?: string;
  autoConnect?: boolean;
}

export function useChat(options: UseChatOptions = {}) {
  const { userName, userEmail, autoConnect = false } = options;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize chat
  const startChat = useCallback(async () => {
    if (conversation) return; // Already have a conversation

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/chat/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform: 'web',
          userName: userName || 'Guest',
          userEmail,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to start chat');
      }

      const { conversation: newConversation, sessionId, welcomeMessage } = data.data;

      setConversation(newConversation);
      setStatus(newConversation.status);

      if (welcomeMessage) {
        setMessages([welcomeMessage]);
      }

      // Connect socket
      chatSocket.connect();
      chatSocket.joinConversation(sessionId, newConversation._id);

      // Set up socket listeners
      chatSocket.onConnect(() => setIsConnected(true));
      chatSocket.onDisconnect(() => setIsConnected(false));

      chatSocket.onMessage((message) => {
        setMessages((prev) => [...prev, message]);

        // Update status based on system messages
        if (message.senderType === 'system') {
          if (message.content.includes('Connecting you with')) {
            setStatus('waiting_agent');
          } else if (message.content.includes("You're now connected with")) {
            setStatus('with_agent');
          } else if (message.content.includes('resolved')) {
            setStatus('resolved');
          }
        }
      });

      chatSocket.onTyping((data) => {
        setIsTyping(true);
        setTypingUser(data.agentName || data.userName || 'Someone');
      });

      chatSocket.onStopTyping(() => {
        setIsTyping(false);
        setTypingUser(null);
      });

      chatSocket.onAgentAssigned(() => {
        setStatus('with_agent');
      });

      chatSocket.onConversationResolved(() => {
        setStatus('resolved');
      });

      chatSocket.onError((err) => {
        setError(err.message);
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start chat');
      console.error('Error starting chat:', err);
    } finally {
      setIsLoading(false);
    }
  }, [conversation, userName, userEmail]);

  // Send message
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isSending || !conversation) return;

      setIsSending(true);

      // Optimistically add user message
      const tempMessage: ChatMessage = {
        _id: `temp-${Date.now()}`,
        conversationId: conversation._id,
        senderType: 'user',
        senderName: userName || 'You',
        content: content.trim(),
        contentType: 'text',
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempMessage]);

      // Send via socket
      chatSocket.sendMessage(content.trim(), userName, userEmail);

      setIsSending(false);
    },
    [conversation, userName, userEmail, isSending]
  );

  // Close chat
  const closeChat = useCallback(() => {
    chatSocket.disconnect();
    setConversation(null);
    setMessages([]);
    setStatus('');
    setIsConnected(false);
  }, []);

  // Auto-connect if enabled
  useEffect(() => {
    if (autoConnect) {
      startChat();
    }

    return () => {
      // Cleanup on unmount
      chatSocket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoConnect]);

  return {
    messages,
    conversation,
    status,
    isLoading,
    isSending,
    isTyping,
    typingUser,
    isConnected,
    error,
    startChat,
    sendMessage,
    closeChat,
  };
}

export default useChat;
