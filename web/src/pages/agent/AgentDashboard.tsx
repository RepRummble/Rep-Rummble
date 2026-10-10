import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import './AgentDashboard.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

interface Conversation {
  _id: string;
  userName?: string;
  userEmail?: string;
  status: string;
  priority: string;
  platform: string;
  lastMessage?: string;
  createdAt: string;
}

interface Message {
  _id: string;
  conversationId: string;
  senderType: 'user' | 'ai' | 'agent' | 'system';
  senderName?: string;
  content: string;
  createdAt: string;
}

export default function AgentDashboard() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [queue, setQueue] = useState<Conversation[]>([]);
  const [activeChats, setActiveChats] = useState<Conversation[]>([]);
  const [selectedChat, setSelectedChat] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [agentStatus, setAgentStatus] = useState<'online' | 'away' | 'offline'>('offline');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // For demo purposes, using a mock agent ID
  const agentId = 'demo-agent-001';
  const agentName = 'Support Agent';

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io(`${API_URL}/agent`, {
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      newSocket.emit('agent_join', { agentId });
      setAgentStatus('online');
    });

    newSocket.on('disconnect', () => {
      setAgentStatus('offline');
    });

    newSocket.on('queue_list', (data: { conversations: Conversation[] }) => {
      setQueue(data.conversations);
      setIsLoading(false);
    });

    newSocket.on('queue_update', (data: { action: string; conversation?: Conversation; conversationId?: string }) => {
      if (data.action === 'new' && data.conversation) {
        setQueue((prev) => [...prev, data.conversation!]);
      } else if (data.action === 'claimed' && data.conversationId) {
        setQueue((prev) => prev.filter((c) => c._id !== data.conversationId));
      }
    });

    newSocket.on('new_message', (data: { message: Message }) => {
      if (data.message.conversationId === selectedChat?._id) {
        setMessages((prev) => [...prev, data.message]);
      }
    });

    newSocket.on('error', (err: { message: string }) => {
      setError(err.message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.emit('agent_leave', { agentId });
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleClaimChat = async (conversation: Conversation) => {
    if (!socket) return;

    socket.emit('claim_chat', { agentId, conversationId: conversation._id });

    // Fetch messages for this conversation
    try {
      const response = await fetch(`${API_URL}/api/agent/claim/${conversation._id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // In production, add auth token here
        },
      });

      const data = await response.json();
      if (data.success) {
        setSelectedChat(data.data.conversation);
        setMessages(data.data.messages || []);
        setActiveChats((prev) => [...prev, data.data.conversation]);
        setQueue((prev) => prev.filter((c) => c._id !== conversation._id));
      }
    } catch (err) {
      console.error('Failed to claim chat:', err);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !socket || !selectedChat) return;

    socket.emit('agent_message', {
      agentId,
      conversationId: selectedChat._id,
      content: inputValue.trim(),
    });

    // Optimistically add message
    const newMessage: Message = {
      _id: `temp-${Date.now()}`,
      conversationId: selectedChat._id,
      senderType: 'agent',
      senderName: agentName,
      content: inputValue.trim(),
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newMessage]);
    setInputValue('');
  };

  const handleResolveChat = () => {
    if (!socket || !selectedChat) return;

    socket.emit('resolve_chat', { agentId, conversationId: selectedChat._id });
    setActiveChats((prev) => prev.filter((c) => c._id !== selectedChat._id));
    setSelectedChat(null);
    setMessages([]);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return '#ef4444';
      case 'high':
        return '#f97316';
      case 'medium':
        return '#eab308';
      default:
        return '#6b7280';
    }
  };

  if (isLoading) {
    return (
      <div className="agent-loading">
        <div className="agent-spinner" />
        <p>Connecting to support queue...</p>
      </div>
    );
  }

  return (
    <div className="agent-dashboard">
      {/* Sidebar */}
      <div className="agent-sidebar">
        {/* Status */}
        <div className="agent-status-bar">
          <div className={`agent-status-indicator ${agentStatus}`} />
          <span>Agent Status: {agentStatus}</span>
        </div>

        {/* Queue */}
        <div className="agent-section">
          <h3>Queue ({queue.length})</h3>
          <div className="agent-list">
            {queue.length === 0 ? (
              <div className="agent-empty">No conversations waiting</div>
            ) : (
              queue.map((conv) => (
                <div key={conv._id} className="agent-queue-item">
                  <div className="agent-queue-header">
                    <span className="agent-queue-name">{conv.userName || 'Guest'}</span>
                    <span
                      className="agent-priority-badge"
                      style={{ backgroundColor: getPriorityColor(conv.priority) }}
                    >
                      {conv.priority}
                    </span>
                  </div>
                  <div className="agent-queue-preview">{conv.lastMessage || 'No message'}</div>
                  <div className="agent-queue-meta">
                    <span>{conv.platform}</span>
                    <span>{new Date(conv.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <button className="agent-claim-btn" onClick={() => handleClaimChat(conv)}>
                    Claim
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Active Chats */}
        <div className="agent-section">
          <h3>Active Chats ({activeChats.length})</h3>
          <div className="agent-list">
            {activeChats.map((conv) => (
              <div
                key={conv._id}
                className={`agent-chat-item ${selectedChat?._id === conv._id ? 'active' : ''}`}
                onClick={() => setSelectedChat(conv)}
              >
                <span className="agent-chat-name">{conv.userName || 'Guest'}</span>
                <span className="agent-chat-platform">{conv.platform}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="agent-chat-area">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="agent-chat-header">
              <div>
                <h2>{selectedChat.userName || 'Guest'}</h2>
                <span className="agent-chat-email">{selectedChat.userEmail || 'No email'}</span>
              </div>
              <button className="agent-resolve-btn" onClick={handleResolveChat}>
                Resolve
              </button>
            </div>

            {/* Messages */}
            <div className="agent-messages">
              {messages.map((msg) => (
                <div key={msg._id} className={`agent-message ${msg.senderType}`}>
                  <div className="agent-message-header">
                    <span className="agent-message-sender">{msg.senderName || msg.senderType}</span>
                    <span className="agent-message-time">
                      {new Date(msg.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="agent-message-content">{msg.content}</div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form className="agent-input-area" onSubmit={handleSendMessage}>
              <input
                type="text"
                placeholder="Type a response..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
              <button type="submit" disabled={!inputValue.trim()}>
                Send
              </button>
            </form>
          </>
        ) : (
          <div className="agent-no-chat">
            <h2>Select a conversation</h2>
            <p>Claim a chat from the queue or select an active conversation</p>
          </div>
        )}
      </div>

      {error && (
        <div className="agent-error">
          {error}
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}
    </div>
  );
}
