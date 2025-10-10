import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userType?: string;
}

export const setupSocketHandlers = (io: Server) => {
  // Authentication middleware for Socket.IO
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      
      // Verify user exists and is active
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, email: true, userType: true, status: true }
      });

      if (!user || user.status !== 'ACTIVE') {
        return next(new Error('Invalid token or inactive user'));
      }

      socket.userId = user.id;
      socket.userType = user.userType;
      
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User ${socket.userId} connected via Socket.IO`);

    // Join user to their personal room for direct messages
    socket.join(`user:${socket.userId}`);

    // Join user to their user type room for broadcasts
    socket.join(`userType:${socket.userType}`);

    // Handle joining load-specific rooms
    socket.on('join-load', async (loadId: string) => {
      try {
        // Verify user has access to this load
        const load = await prisma.load.findUnique({
          where: { id: loadId },
          select: { 
            id: true, 
            clientId: true, 
            assignedTransporterId: true, 
            status: true 
          }
        });

        if (!load) {
          socket.emit('error', { message: 'Load not found' });
          return;
        }

        // Check permissions
        const hasAccess = socket.userType === 'ADMIN' ||
                         load.clientId === socket.userId ||
                         load.assignedTransporterId === socket.userId ||
                         (socket.userType === 'TRANSPORTER' && load.status === 'ACTIVE');

        if (!hasAccess) {
          socket.emit('error', { message: 'Access denied to this load' });
          return;
        }

        socket.join(`load:${loadId}`);
        socket.emit('joined-load', { loadId });
        
        console.log(`User ${socket.userId} joined load room: ${loadId}`);
      } catch (error) {
        console.error('Error joining load room:', error);
        socket.emit('error', { message: 'Failed to join load room' });
      }
    });

    // Handle leaving load-specific rooms
    socket.on('leave-load', (loadId: string) => {
      socket.leave(`load:${loadId}`);
      socket.emit('left-load', { loadId });
      console.log(`User ${socket.userId} left load room: ${loadId}`);
    });

    // Handle new bid notifications
    socket.on('new-bid', async (data: { loadId: string; bidData: any }) => {
      try {
        const { loadId, bidData } = data;

        // Verify the load exists and get client info
        const load = await prisma.load.findUnique({
          where: { id: loadId },
          select: { 
            id: true, 
            clientId: true, 
            title: true,
            status: true
          }
        });

        if (!load || load.status !== 'ACTIVE') {
          socket.emit('error', { message: 'Invalid load or load not active' });
          return;
        }

        // Notify the client about the new bid
        io.to(`user:${load.clientId}`).emit('bid-received', {
          loadId,
          loadTitle: load.title,
          bid: bidData,
          timestamp: new Date().toISOString()
        });

        // Notify all users in the load room
        socket.to(`load:${loadId}`).emit('load-bid-update', {
          loadId,
          action: 'new-bid',
          bid: bidData,
          timestamp: new Date().toISOString()
        });

        console.log(`New bid notification sent for load ${loadId}`);
      } catch (error) {
        console.error('Error handling new bid:', error);
        socket.emit('error', { message: 'Failed to process bid notification' });
      }
    });

    // Handle bid acceptance notifications
    socket.on('bid-accepted', async (data: { loadId: string; bidId: string; transporterId: string }) => {
      try {
        const { loadId, bidId, transporterId } = data;

        // Get load and bid details
        const [load, bid] = await Promise.all([
          prisma.load.findUnique({
            where: { id: loadId },
            select: { id: true, title: true, clientId: true }
          }),
          prisma.bid.findUnique({
            where: { id: bidId },
            include: {
              transporter: {
                select: { id: true, companyName: true, contactPerson: true }
              }
            }
          })
        ]);

        if (!load || !bid) {
          socket.emit('error', { message: 'Load or bid not found' });
          return;
        }

        // Notify the winning transporter
        io.to(`user:${transporterId}`).emit('bid-won', {
          loadId,
          loadTitle: load.title,
          bidId,
          amount: bid.amount,
          timestamp: new Date().toISOString()
        });

        // Notify all other bidders that the load has been assigned
        socket.to(`load:${loadId}`).emit('load-assigned', {
          loadId,
          loadTitle: load.title,
          winningBidId: bidId,
          assignedTo: bid.transporter,
          timestamp: new Date().toISOString()
        });

        console.log(`Bid acceptance notification sent for load ${loadId}`);
      } catch (error) {
        console.error('Error handling bid acceptance:', error);
        socket.emit('error', { message: 'Failed to process bid acceptance notification' });
      }
    });

    // Handle load status updates
    socket.on('load-status-update', async (data: { loadId: string; status: string; message?: string }) => {
      try {
        const { loadId, status, message } = data;

        // Get load details
        const load = await prisma.load.findUnique({
          where: { id: loadId },
          select: { 
            id: true, 
            title: true, 
            clientId: true, 
            assignedTransporterId: true 
          }
        });

        if (!load) {
          socket.emit('error', { message: 'Load not found' });
          return;
        }

        // Notify relevant users about status update
        const notification = {
          loadId,
          loadTitle: load.title,
          status,
          message,
          timestamp: new Date().toISOString()
        };

        // Notify client
        io.to(`user:${load.clientId}`).emit('load-status-changed', notification);

        // Notify assigned transporter if exists
        if (load.assignedTransporterId) {
          io.to(`user:${load.assignedTransporterId}`).emit('load-status-changed', notification);
        }

        // Notify all users in the load room
        socket.to(`load:${loadId}`).emit('load-update', notification);

        console.log(`Load status update notification sent for load ${loadId}: ${status}`);
      } catch (error) {
        console.error('Error handling load status update:', error);
        socket.emit('error', { message: 'Failed to process load status update' });
      }
    });

    // Handle real-time messaging
    socket.on('send-message', async (data: { receiverId: string; message: string; loadId?: string }) => {
      try {
        const { receiverId, message, loadId } = data;

        // Verify receiver exists
        const receiver = await prisma.user.findUnique({
          where: { id: receiverId },
          select: { id: true, status: true }
        });

        if (!receiver || receiver.status !== 'ACTIVE') {
          socket.emit('error', { message: 'Receiver not found or inactive' });
          return;
        }

        // Create message in database
        const newMessage = await prisma.message.create({
          data: {
            senderId: socket.userId!,
            receiverId,
            message,
            loadId,
            messageType: 'GENERAL'
          },
          include: {
            sender: {
              select: {
                id: true,
                companyName: true,
                contactPerson: true,
                userType: true
              }
            }
          }
        });

        // Send message to receiver
        io.to(`user:${receiverId}`).emit('message-received', {
          message: newMessage,
          timestamp: new Date().toISOString()
        });

        // Confirm message sent to sender
        socket.emit('message-sent', {
          messageId: newMessage.id,
          timestamp: new Date().toISOString()
        });

        console.log(`Message sent from ${socket.userId} to ${receiverId}`);
      } catch (error) {
        console.error('Error handling message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle document verification notifications (Admin only)
    socket.on('document-verified', async (data: { documentId: string; userId: string; status: string }) => {
      try {
        if (socket.userType !== 'ADMIN') {
          socket.emit('error', { message: 'Admin access required' });
          return;
        }

        const { documentId, userId, status } = data;

        // Notify the document owner
        io.to(`user:${userId}`).emit('document-status-changed', {
          documentId,
          status,
          timestamp: new Date().toISOString()
        });

        console.log(`Document verification notification sent to user ${userId}: ${status}`);
      } catch (error) {
        console.error('Error handling document verification:', error);
        socket.emit('error', { message: 'Failed to process document verification' });
      }
    });

    // Handle user status updates (Admin only)
    socket.on('user-status-update', async (data: { userId: string; status: string }) => {
      try {
        if (socket.userType !== 'ADMIN') {
          socket.emit('error', { message: 'Admin access required' });
          return;
        }

        const { userId, status } = data;

        // Notify the user about status change
        io.to(`user:${userId}`).emit('account-status-changed', {
          status,
          timestamp: new Date().toISOString()
        });

        console.log(`User status update notification sent to user ${userId}: ${status}`);
      } catch (error) {
        console.error('Error handling user status update:', error);
        socket.emit('error', { message: 'Failed to process user status update' });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User ${socket.userId} disconnected from Socket.IO`);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`Socket error for user ${socket.userId}:`, error);
    });
  });

  console.log('✅ Socket.IO handlers configured');
};

// Helper function to broadcast to all admins
export const broadcastToAdmins = (io: Server, event: string, data: any) => {
  io.to('userType:ADMIN').emit(event, data);
};

// Helper function to broadcast to all clients
export const broadcastToClients = (io: Server, event: string, data: any) => {
  io.to('userType:CLIENT').emit(event, data);
};

// Helper function to broadcast to all transporters
export const broadcastToTransporters = (io: Server, event: string, data: any) => {
  io.to('userType:TRANSPORTER').emit(event, data);
};