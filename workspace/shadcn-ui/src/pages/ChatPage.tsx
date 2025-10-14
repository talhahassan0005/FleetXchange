import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Send } from 'lucide-react';
import { authService, User } from '@/lib/auth';
import { api } from '@/lib/api';

interface Message {
  id: string;
  message: string;
  messageType: string;
  isRead: boolean;
  createdAt: string;
  sender: {
    id: string;
    companyName: string;
    contactPerson: string;
    userType: string;
  };
  receiver: {
    id: string;
    companyName: string;
    contactPerson: string;
    userType: string;
  };
}

interface Load {
  id: string;
  title: string;
  clientId: string;
  assignedTransporterId?: string;
}

const ChatPage: React.FC = () => {
  const { loadId } = useParams<{ loadId: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [load, setLoad] = useState<Load | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get current user
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    
    if (loadId && currentUser) {
      loadChatData();
    } else if (!currentUser) {
      // If no user, redirect to login
      window.location.href = '/login';
    }
  }, [loadId]);

  const loadChatData = async () => {
    try {
      setLoading(true);
      
      // Load messages for this load
      const messagesResponse = await api.messages.getByLoad(loadId!);
      setMessages(messagesResponse.messages || []);
      
      // Get load details
      const loadResponse = await api.loads.getById(loadId!);
      setLoad(loadResponse.load);
      
    } catch (error) {
      console.error('Failed to load chat data:', error);
      alert('Failed to load chat data');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending || !user || !load) return;

    try {
      setSending(true);
      
      // Determine receiver based on user type and load assignment
      let receiverId: string;
      
      if (user.userType === 'TRANSPORTER') {
        // Transporter sending to client
        receiverId = load.clientId;
      } else if (user.userType === 'CLIENT') {
        // Client sending to transporter
        if (load.assignedTransporterId) {
          receiverId = load.assignedTransporterId;
        } else {
          // Find transporter who bid on this load
          const bidsResponse = await api.bids.getByLoad(loadId!);
          const bidTransporter = bidsResponse.bids.find((bid: any) => bid.loadId === loadId);
          if (bidTransporter) {
            receiverId = bidTransporter.transporterId;
          } else {
            throw new Error('No transporter found for this load');
          }
        }
      } else {
        throw new Error('Invalid user type');
      }
      
      const messageData = {
        loadId: loadId!,
        receiverId,
        content: newMessage.trim(),
        type: 'TEXT' as const
      };

      await api.messages.create(messageData);
      setNewMessage('');
      
      // Reload messages
      await loadChatData();
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message. Please try again.');
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading chat...</p>
        </div>
      </div>
    );
  }

  if (!load) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Load Not Found</h1>
          <p className="text-gray-600 mb-4">The requested load could not be found.</p>
          <Button onClick={() => window.close()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Close Window
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4">
        {/* Header */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg" style={{ color: '#0A1C3F' }}>
                  Chat - {load.title}
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Load ID: {load.id}
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.close()}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Close
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Messages */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.sender.id === user?.id ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.sender.id === user?.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-900'
                      }`}
                    >
                      <div className="text-sm font-medium mb-1">
                        {message.sender.companyName}
                      </div>
                      <div className="text-sm">{message.content}</div>
                      <div className="text-xs opacity-75 mt-1">
                        {new Date(message.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Message Input */}
        <Card>
          <CardContent className="p-4">
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
                disabled={sending || !newMessage.trim()}
                size="sm"
                style={{ backgroundColor: '#33A852' }}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChatPage;
