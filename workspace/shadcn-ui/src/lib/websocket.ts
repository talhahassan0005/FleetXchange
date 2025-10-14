import { io, Socket } from 'socket.io-client';
import { authService } from './auth';

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect() {
    const token = authService.getToken();
    if (!token) {
      console.warn('No auth token found, skipping WebSocket connection');
      return;
    }

    try {
      const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
      this.socket = io(socketUrl, {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling']
      });

      this.socket.on('connect', () => {
        console.log('🔌 WebSocket connected successfully');
        console.log('🔌 Socket ID:', this.socket?.id);
        this.reconnectAttempts = 0;
      });

      this.socket.on('disconnect', (reason) => {
        console.log('🔌 WebSocket disconnected:', reason);
        this.handleReconnect();
      });

      this.socket.on('connect_error', (error) => {
        console.error('🔌 WebSocket connection error:', error);
        this.handleReconnect();
      });

    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('❌ Max reconnection attempts reached');
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('🔌 WebSocket disconnected');
    }
  }

  // Event listeners
  on(event: string, callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string, callback?: (data: any) => void) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  // Emit events
  emit(event: string, data?: any) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  // Join load room
  joinLoad(loadId: string) {
    this.emit('join_load', loadId);
  }

  // Leave load room
  leaveLoad(loadId: string) {
    this.emit('leave_load', loadId);
  }

  // Send message
  sendMessage(receiverId: string, content: string, loadId?: string) {
    this.emit('send_message', { receiverId, content, loadId });
  }

  // Check if connected
  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const websocketService = new WebSocketService();
