import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { getUsersCollection, getLoadsCollection, getBidsCollection, getMessagesCollection } from '../lib/mongodb';
import { ObjectId } from 'mongodb';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userType?: string;
}

export function setupSocketHandlers(io: Server) {
  console.log(' Socket.IO handlers configured');

  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      
      // Find user in database using MongoDB
      const usersCollection = getUsersCollection();
      const user = await usersCollection.findOne(
        { _id: new ObjectId(decoded.id) },
        { projection: { _id: 1, email: 1, userType: 1, status: 1 } }
      );

      if (!user || user.status !== 'ACTIVE') {
        return next(new Error('Authentication error: User not found or inactive'));
      }

      socket.userId = user._id.toString();
      socket.userType = user.userType;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`🔌 User ${socket.userId} connected`);

    // Join user to their personal room (format: user:{userId})
    socket.join(`user:${socket.userId}`);
    console.log(` User ${socket.userId} joined personal room: user:${socket.userId}`);

    // Join load-specific rooms based on user type
    socket.on('join_load', async (loadId: string) => {
      try {
        const loadsCollection = getLoadsCollection();
        const load = await loadsCollection.findOne({ _id: new ObjectId(loadId) });

        if (!load) {
          socket.emit('error', { message: 'Load not found' });
          return;
        }

        // Check if user has access to this load
        let hasAccess = false;
        if (socket.userType === 'ADMIN') {
          hasAccess = true;
        } else if (socket.userType === 'CLIENT' && load.clientId === socket.userId) {
          hasAccess = true;
        } else if (socket.userType === 'TRANSPORTER' && load.assignedTransporterId === socket.userId) {
          hasAccess = true;
        }

        // If transporter, also check if they have bid on this load
        if (!hasAccess && socket.userType === 'TRANSPORTER') {
          const bidsCollection = getBidsCollection();
          const hasBid = await bidsCollection.findOne({
            loadId: loadId,
            transporterId: socket.userId
          });
          hasAccess = !!hasBid;
        }

        if (hasAccess) {
          socket.join(`load:${loadId}`);
          console.log(` User ${socket.userId} joined load room: load:${loadId}`);
          socket.emit('joined_load', { loadId, message: 'Successfully joined load room' });
        } else {
          socket.emit('error', { message: 'Access denied to this load' });
        }
      } catch (error) {
        socket.emit('error', { message: 'Failed to join load room' });
      }
    });

    // Leave load room
    socket.on('leave_load', (loadId: string) => {
      socket.leave(`load:${loadId}`);
      console.log(` User ${socket.userId} left load room: load:${loadId}`);
      socket.emit('left_load', { loadId, message: 'Left load room' });
    });

    // Handle real-time bid updates
    socket.on('bid_placed', async (data: { loadId: string, bidData: any }) => {
      try {
        const loadsCollection = getLoadsCollection();
        const load = await loadsCollection.findOne({ _id: new ObjectId(data.loadId) });

        if (!load) {
          socket.emit('error', { message: 'Load not found' });
          return;
        }

        // Notify load owner (client) about new bid
        if (load.clientId && load.clientId !== socket.userId) {
          io.to(`user:${load.clientId}`).emit('new_bid', {
            loadId: data.loadId,
            bid: data.bidData,
            transporterId: socket.userId
          });
          console.log(` Sent new_bid notification to user:${load.clientId}`);
        }

        // Notify all transporters in the load room
        socket.to(`load:${data.loadId}`).emit('bid_placed', {
          loadId: data.loadId,
          bid: data.bidData,
          transporterId: socket.userId
        });
        console.log(` Sent bid_placed notification to load:${data.loadId}`);
      } catch (error) {
        socket.emit('error', { message: 'Failed to process bid update' });
      }
    });

    // Handle bid acceptance/rejection
    socket.on('bid_status_changed', async (data: { loadId: string, bidId: string, status: string }) => {
      try {
        const loadsCollection = getLoadsCollection();
        const bidsCollection = getBidsCollection();
        
        const [load, bid] = await Promise.all([
          loadsCollection.findOne({ _id: new ObjectId(data.loadId) }),
          bidsCollection.findOne({ _id: new ObjectId(data.bidId) })
        ]);

        if (!load || !bid) {
          socket.emit('error', { message: 'Load or bid not found' });
          return;
        }

        // Notify the transporter about bid status change
        if (bid.transporterId && bid.transporterId !== socket.userId) {
          io.to(`user:${bid.transporterId}`).emit('bid_status_changed', {
            loadId: data.loadId,
            bidId: data.bidId,
            status: data.status,
            loadTitle: load.title
          });
          console.log(` Sent bid_status_changed to user:${bid.transporterId}`);
        }

        // Notify all users in the load room
        io.to(`load:${data.loadId}`).emit('bid_status_changed', {
          loadId: data.loadId,
          bidId: data.bidId,
          status: data.status,
          changedBy: socket.userId
        });
        console.log(` Sent bid_status_changed to load:${data.loadId}`);
      } catch (error) {
        socket.emit('error', { message: 'Failed to process bid status change' });
      }
    });

    // Handle real-time messaging
    socket.on('send_message', async (data: { receiverId: string, content: string, loadId?: string, type?: string }) => {
      try {
        const usersCollection = getUsersCollection();
        const messagesCollection = getMessagesCollection();
        
        console.log(` Message send attempt from user:${socket.userId} to user:${data.receiverId}`);
        
        // Validate receiver exists and is active
        const receiver = await usersCollection.findOne(
          { _id: new ObjectId(data.receiverId) },
          { projection: { _id: 1, email: 1, companyName: 1, status: 1 } }
        );

        if (!receiver) {
          socket.emit('error', { message: 'Receiver not found' });
          console.error( `Receiver not found: ${data.receiverId}`);
          return;
        }

        if (receiver.status !== 'ACTIVE') {
          socket.emit('error', { message: 'Receiver is not active' });
          console.error(`❌ Receiver not active: ${data.receiverId}`);
          return;
        }

        // Get sender info
        const sender = await usersCollection.findOne(
          { _id: new ObjectId(socket.userId!) },
          { projection: { _id: 1, email: 1, companyName: 1, userType: 1 } }
        );

        // Get load info if provided
        let load = null;
        if (data.loadId) {
          const loadsCollection = getLoadsCollection();
          load = await loadsCollection.findOne(
            { _id: new ObjectId(data.loadId) },
            { projection: { _id: 1, title: 1, clientId: 1, assignedTransporterId: 1 } }
          );
        }

        // Create message in database
        const newMessage = await messagesCollection.insertOne({
          senderId: socket.userId,
          receiverId: data.receiverId,
          content: data.content,
          messageType: data.type || 'TEXT',
          loadId: data.loadId || null,
          isRead: false,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        const messageData = {
          id: newMessage.insertedId.toString(),
          senderId: socket.userId,
          receiverId: data.receiverId,
          content: data.content,
          message: data.content, // For frontend compatibility
          messageType: data.type || 'TEXT',
          loadId: data.loadId || null,
          isRead: false,
          createdAt: new Date(),
          sender: {
            id: sender?._id.toString(),
            companyName: sender?.companyName,
            email: sender?.email,
            userType: sender?.userType
          },
          receiver: {
            id: receiver._id.toString(),
            companyName: receiver.companyName,
            email: receiver.email
          },
          load: load ? {
            id: load._id.toString(),
            title: load.title
          } : null
        };

        // Send to receiver (targeted notification)
        io.to(`user:${data.receiverId}`).emit('message-received', messageData);
        console.log(`✅ Sent message-received to user:${data.receiverId}`);

        // Send confirmation to sender (delivery acknowledgment)
        socket.emit('message-sent', messageData);
        console.log(`✅ Sent message-sent acknowledgment to user:${socket.userId}`);

        // If load-related, also broadcast to load room (optional)
        if (data.loadId) {
          io.to(`load:${data.loadId}`).emit('load-message-update', {
            loadId: data.loadId,
            messageId: messageData.id,
            senderId: socket.userId
          });
          console.log(`✅ Sent load-message-update to load:${data.loadId}`);
        }
      } catch (error) {
        console.error('❌ Failed to send message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle load status updates
    socket.on('load_status_changed', async (data: { loadId: string, status: string }) => {
      try {
        const loadsCollection = getLoadsCollection();
        const load = await loadsCollection.findOne({ _id: new ObjectId(data.loadId) });

        if (!load) {
          socket.emit('error', { message: 'Load not found' });
          return;
        }

        // Notify all users in the load room
        io.to(`load:${data.loadId}`).emit('load_status_changed', {
          loadId: data.loadId,
          status: data.status,
          changedBy: socket.userId,
          loadTitle: load.title
        });
        console.log(`📤 Sent load_status_changed to load:${data.loadId}`);

        // Notify specific users based on load status
        if (load.clientId && load.clientId !== socket.userId) {
          io.to(`user:${load.clientId}`).emit('load_status_changed', {
            loadId: data.loadId,
            status: data.status,
            changedBy: socket.userId,
            loadTitle: load.title
          });
          console.log(`📤 Sent load_status_changed to user:${load.clientId}`);
        }

        if (load.assignedTransporterId && load.assignedTransporterId !== socket.userId) {
          io.to(`user:${load.assignedTransporterId}`).emit('load_status_changed', {
            loadId: data.loadId,
            status: data.status,
            changedBy: socket.userId,
            loadTitle: load.title
          });
          console.log(`📤 Sent load_status_changed to user:${load.assignedTransporterId}`);
        }
      } catch (error) {
        console.error('❌ Failed to process load status change:', error);
        socket.emit('error', { message: 'Failed to process load status change' });
      }
    });

    // Handle user disconnect
    socket.on('disconnect', () => {
      console.log(`🔌 User ${socket.userId} disconnected`);
    });
  });
}