import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ArrowLeft, Send, MessageCircle, User } from 'lucide-react';
import { api } from '../lib/api';
import { User as UserType, Message, Load, Bid } from '../lib/api';
import { websocketService } from '../lib/websocket';

interface ChatInterfaceProps {
  loadId: string;
  load: Load | null; // allow null when opening from conversation list
  currentUser: UserType;
  onBack: () => void;
  bids: Bid[];
  onMessageSent?: () => void;
  onMessageRead?: () => void;
}

export default function ChatInterface({ loadId, load, currentUser, onBack, bids, onMessageSent, onMessageRead }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [optimisticMessages, setOptimisticMessages] = useState<string[]>([]); // Track optimistic message IDs

  console.log('ChatInterface rendered with:', {
    loadId,
    load: load?.title,
    currentUser: currentUser?.userType,
    bidsCount: bids?.length
  });

  useEffect(() => {
    loadMessages();

    // Set up real-time message listeners
    const handleMessageReceived = (data: any) => {
      console.log('💬 [ChatInterface] Received message-received event:', data);
      
      // Only add if it's for this load/thread
      if (data.loadId === loadId) {
        const normalizedMessage = {
          ...data,
          message: data.message || data.content || '',
          id: data.id
        };
        
        setMessages(prev => {
          // Avoid duplicates
          if (prev.some(m => m.id === normalizedMessage.id)) {
            return prev;
          }
          return [...prev, normalizedMessage];
        });

        // Auto-mark as read if user is receiver and on this screen
        if (data.receiverId === currentUser.id && !data.isRead) {
          api.messages.markAsRead(data.id).catch(err => 
            console.error('Failed to mark message as read:', err)
          );
          
          // Notify parent to refresh unread count
          if (onMessageRead) {
            onMessageRead();
          }
        }
      }
    };

    const handleMessageSent = (data: any) => {
      console.log('✅ [ChatInterface] Received message-sent acknowledgment:', data);
      
      // Remove from optimistic messages
      setOptimisticMessages(prev => prev.filter(id => id !== data.id));
      
      // Update message in list (replace optimistic with confirmed)
      if (data.loadId === loadId) {
        const normalizedMessage = {
          ...data,
          message: data.message || data.content || '',
          id: data.id
        };
        
        setMessages(prev => {
          // Check if already exists
          const exists = prev.some(m => m.id === normalizedMessage.id);
          if (exists) {
            return prev.map(m => m.id === normalizedMessage.id ? normalizedMessage : m);
          }
          return [...prev, normalizedMessage];
        });
      }
    };

    websocketService.on('message-received', handleMessageReceived);
    websocketService.on('message-sent', handleMessageSent);

    // Join load room for thread-wide updates
    websocketService.joinLoad(loadId);

    return () => {
      websocketService.off('message-received', handleMessageReceived);
      websocketService.off('message-sent', handleMessageSent);
      websocketService.leaveLoad(loadId);
    };
  }, [loadId, currentUser.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    try {
      setLoading(true);
      const response = await api.messages.getByLoad(loadId);
      const messages = response.messages || [];
      // Normalize message payloads: backend uses `content`, frontend expects `message`
      const normalized = messages.map((m: any) => ({
        ...m,
        message: m.message || m.content || m.text || ''
      }));
      console.log('ChatInterface loaded messages:', normalized);
      setMessages(normalized);
      
      // Mark unread messages as read
      const unreadMessages = messages.filter(msg => 
        msg.receiverId === currentUser.id && !msg.isRead
      );
      
      if (unreadMessages.length > 0) {
        console.log(`Marking ${unreadMessages.length} messages as read`);
        // Mark each unread message as read
        for (const message of unreadMessages) {
          try {
            await api.messages.markAsRead(message.id);
          } catch (error) {
            console.error('Failed to mark message as read:', error);
          }
        }
        
        // Notify parent component to refresh unread count
        if (onMessageRead) {
          onMessageRead();
        }
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
  setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    const messageContent = newMessage.trim();
    const tempId = `temp-${Date.now()}-${Math.random()}`;

    try {
      setSending(true);
      
      console.log('ChatInterface Debug:', {
        currentUser: currentUser?.userType,
        load: load,
        loadId: loadId,
        bids: bids.length
      });
      
      // Determine receiver based on user type and load assignment
      let receiverId: string;
      
      if (currentUser.userType === 'TRANSPORTER') {
        // Transporter sending to client requires load context for clientId
        if (load && load.clientId) {
          receiverId = load.clientId;
        } else {
          throw new Error('Missing load context. Open chat from a specific load.');
        }
      } else if (currentUser.userType === 'CLIENT') {
        // Client sending to transporter - check assignedTransporterId first, then bids
        if (load && load.assignedTransporterId) {
          receiverId = load.assignedTransporterId;
        } else {
          // If no transporter assigned, find the transporter who bid on this load
          const bidTransporter = bids.find(bid => bid.loadId === loadId);
          if (bidTransporter) {
            receiverId = bidTransporter.transporterId;
          } else {
            throw new Error('No transporter found for this load. Please wait for a bid.');
          }
        }
      } else {
        throw new Error('Invalid user type');
      }
      
      console.log('Message receiverId:', receiverId);
      
      // Optimistic UI update - add message immediately
      const optimisticMessage: any = {
        id: tempId,
        senderId: currentUser.id,
        receiverId,
        content: messageContent,
        message: messageContent,
        messageType: 'TEXT',
        loadId,
        isRead: false,
        createdAt: new Date().toISOString(),
        sender: {
          id: currentUser.id,
          companyName: currentUser.companyName,
          email: currentUser.email
        }
      };

      setMessages(prev => [...prev, optimisticMessage]);
      setOptimisticMessages(prev => [...prev, tempId]);
      setNewMessage(''); // Clear input immediately for better UX
      
      const messageData = {
        loadId,
        receiverId,
        content: messageContent,
        type: 'TEXT' as const
      };

      console.log('Sending message data:', messageData);
      const response = await api.messages.create(messageData);
      console.log('✅ Message sent successfully:', response);
      
      // Replace optimistic message with real one
      setMessages(prev => prev.map(m => 
        m.id === tempId ? { ...response.data, message: response.data.content || response.data.message } : m
      ));
      setOptimisticMessages(prev => prev.filter(id => id !== tempId));
      
      // Notify parent component to refresh unread count
      if (onMessageSent) {
        onMessageSent();
      }
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setOptimisticMessages(prev => prev.filter(id => id !== tempId));
      
      // Restore message text
      setNewMessage(messageContent);
      
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      alert(`Failed to send message: ${error.response?.data?.message || error.message}. Please try again.`);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const getOtherUser = () => {
    if (!load) return undefined as any;
    if (currentUser.userType === 'TRANSPORTER') {
      return (load as any).client;
    } else {
      // Use assignedTransporter from API type
      return (load as any).assignedTransporter;
    }
  };

  const otherUser = getOtherUser();

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="p-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center space-x-2">
              <MessageCircle className="h-5 w-5 text-blue-600" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Chat with {otherUser?.companyName || 'Client'}
                </h2>
                <p className="text-sm text-gray-500">
                  Load: {load ? load.title : loadId}
                </p>
              </div>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            {load?.status || 'ACTIVE'}
          </Badge>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <MessageCircle className="h-8 w-8 mb-2" />
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isOwn = message.senderId === currentUser.id;
            const showDate = index === 0 || 
              formatDate(message.createdAt) !== formatDate(messages[index - 1].createdAt);

            return (
              <div key={message.id}>
                {showDate && (
                  <div className="flex justify-center my-4">
                    <Badge variant="secondary" className="text-xs">
                      {formatDate(message.createdAt)}
                    </Badge>
                  </div>
                )}
                
                <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    isOwn 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white border border-gray-200 text-gray-900'
                  }`}>
                    <div className="flex items-start space-x-2">
                      {!isOwn && (
                        <div className="flex-shrink-0">
                          <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                            <User className="h-3 w-3 text-gray-600" />
                          </div>
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-sm">{message.message}</p>
                        <p className={`text-xs mt-1 ${
                          isOwn ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {formatTime(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex space-x-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={sending}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sending}
            className="px-4"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

