export interface User {
  id: string;
  email: string;
  userType: 'admin' | 'client' | 'transporter';
  status: 'pending' | 'active' | 'suspended' | 'rejected';
  profile: {
    firstName?: string;
    lastName?: string;
    companyName?: string;
    phone?: string;
    address?: string;
  };
  createdAt: string;
}

export interface Document {
  id: string;
  userId: string;
  documentType: string;
  fileName: string;
  fileUrl: string;
  verificationStatus: 'pending' | 'approved' | 'rejected';
  uploadedAt: string;
  verifiedAt?: string;
  rejectionReason?: string;
}

export interface Load {
  id: string;
  clientId: string;
  title: string;
  description: string;
  cargoType: string;
  weight: number;
  pickupLocation: string;
  deliveryLocation: string;
  pickupDate: string;
  deliveryDate: string;
  budgetMin: number;
  budgetMax: number;
  status: 'active' | 'bidding_closed' | 'assigned' | 'completed';
  createdAt: string;
}

export interface Bid {
  id: string;
  loadId: string;
  transporterId: string;
  amount: number;
  pickupDate: string;
  deliveryDate: string;
  comments: string;
  status: 'active' | 'won' | 'lost';
  createdAt: string;
}

export interface Message {
  id: string;
  loadId: string;
  senderId: string;
  receiverId: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

class AuthService {
  private readonly STORAGE_KEYS = {
    USER: 'fleetxchange_user',
    USERS: 'fleetxchange_users',
    DOCUMENTS: 'fleetxchange_documents',
    LOADS: 'fleetxchange_loads',
    BIDS: 'fleetxchange_bids',
    MESSAGES: 'fleetxchange_messages'
  };

  constructor() {
    this.initializeDefaultData();
  }

  private initializeDefaultData() {
    // Initialize with default admin user if no users exist
    const users = this.getAllUsers();
    if (users.length === 0) {
      const defaultAdmin: User = {
        id: 'admin-1',
        email: 'admin@fleetxchange.com',
        userType: 'admin',
        status: 'active',
        profile: {
          firstName: 'System',
          lastName: 'Administrator',
          companyName: 'FleetXchange'
        },
        createdAt: new Date().toISOString()
      };
      
      const defaultClient: User = {
        id: 'client-1',
        email: 'client@demo.com',
        userType: 'client',
        status: 'active',
        profile: {
          firstName: 'John',
          lastName: 'Smith',
          companyName: 'ABC Logistics',
          phone: '+1234567890'
        },
        createdAt: new Date().toISOString()
      };

      const defaultTransporter: User = {
        id: 'transporter-1',
        email: 'transporter@demo.com',
        userType: 'transporter',
        status: 'active',
        profile: {
          firstName: 'Mike',
          lastName: 'Johnson',
          companyName: 'Johnson Transport',
          phone: '+1987654321'
        },
        createdAt: new Date().toISOString()
      };

      localStorage.setItem(this.STORAGE_KEYS.USERS, JSON.stringify([defaultAdmin, defaultClient, defaultTransporter]));
      
      // Add sample load
      const sampleLoad: Load = {
        id: 'load-1',
        clientId: 'client-1',
        title: 'Electronics Shipment - LA to NYC',
        description: 'Fragile electronics equipment requiring careful handling',
        cargoType: 'Electronics',
        weight: 5.5,
        pickupLocation: 'Los Angeles, CA',
        deliveryLocation: 'New York, NY',
        pickupDate: '2024-01-20',
        deliveryDate: '2024-01-25',
        budgetMin: 2500,
        budgetMax: 3500,
        status: 'active',
        createdAt: new Date().toISOString()
      };
      
      localStorage.setItem(this.STORAGE_KEYS.LOADS, JSON.stringify([sampleLoad]));
    }
  }

  login(email: string, password: string): Promise<User | null> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const users = this.getAllUsers();
        const user = users.find(u => u.email === email && u.status === 'active');
        
        if (user) {
          localStorage.setItem(this.STORAGE_KEYS.USER, JSON.stringify(user));
          resolve(user);
        } else {
          resolve(null);
        }
      }, 1000); // Simulate API delay
    });
  }

  logout() {
    localStorage.removeItem(this.STORAGE_KEYS.USER);
  }

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem(this.STORAGE_KEYS.USER);
    return userStr ? JSON.parse(userStr) : null;
  }

  getAllUsers(): User[] {
    const usersStr = localStorage.getItem(this.STORAGE_KEYS.USERS);
    return usersStr ? JSON.parse(usersStr) : [];
  }

  updateUserStatus(userId: string, status: User['status'], rejectionReason?: string): void {
    const users = this.getAllUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      users[userIndex].status = status;
      localStorage.setItem(this.STORAGE_KEYS.USERS, JSON.stringify(users));
    }
  }

  registerUser(userData: Omit<User, 'id' | 'createdAt'>): User {
    const users = this.getAllUsers();
    const newUser: User = {
      ...userData,
      id: `${userData.userType}-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    users.push(newUser);
    localStorage.setItem(this.STORAGE_KEYS.USERS, JSON.stringify(users));
    return newUser;
  }

  // Document management
  uploadDocument(document: Omit<Document, 'id' | 'uploadedAt'>): Document {
    const documents = this.getAllDocuments();
    const newDoc: Document = {
      ...document,
      id: `doc-${Date.now()}`,
      uploadedAt: new Date().toISOString()
    };
    documents.push(newDoc);
    localStorage.setItem(this.STORAGE_KEYS.DOCUMENTS, JSON.stringify(documents));
    return newDoc;
  }

  getAllDocuments(): Document[] {
    const docsStr = localStorage.getItem(this.STORAGE_KEYS.DOCUMENTS);
    return docsStr ? JSON.parse(docsStr) : [];
  }

  getUserDocuments(userId: string): Document[] {
    return this.getAllDocuments().filter(doc => doc.userId === userId);
  }

  verifyDocument(docId: string, status: 'approved' | 'rejected', rejectionReason?: string): void {
    const documents = this.getAllDocuments();
    const docIndex = documents.findIndex(d => d.id === docId);
    if (docIndex !== -1) {
      documents[docIndex].verificationStatus = status;
      documents[docIndex].verifiedAt = new Date().toISOString();
      if (rejectionReason) {
        documents[docIndex].rejectionReason = rejectionReason;
      }
      localStorage.setItem(this.STORAGE_KEYS.DOCUMENTS, JSON.stringify(documents));
    }
  }

  // Load management
  createLoad(load: Omit<Load, 'id' | 'createdAt'>): Load {
    const loads = this.getAllLoads();
    const newLoad: Load = {
      ...load,
      id: `load-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    loads.push(newLoad);
    localStorage.setItem(this.STORAGE_KEYS.LOADS, JSON.stringify(loads));
    return newLoad;
  }

  getAllLoads(): Load[] {
    const loadsStr = localStorage.getItem(this.STORAGE_KEYS.LOADS);
    return loadsStr ? JSON.parse(loadsStr) : [];
  }

  getUserLoads(userId: string): Load[] {
    return this.getAllLoads().filter(load => load.clientId === userId);
  }

  // Bid management
  createBid(bid: Omit<Bid, 'id' | 'createdAt'>): Bid {
    const bids = this.getAllBids();
    const newBid: Bid = {
      ...bid,
      id: `bid-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    bids.push(newBid);
    localStorage.setItem(this.STORAGE_KEYS.BIDS, JSON.stringify(bids));
    return newBid;
  }

  getAllBids(): Bid[] {
    const bidsStr = localStorage.getItem(this.STORAGE_KEYS.BIDS);
    return bidsStr ? JSON.parse(bidsStr) : [];
  }

  getLoadBids(loadId: string): Bid[] {
    return this.getAllBids().filter(bid => bid.loadId === loadId);
  }

  getUserBids(userId: string): Bid[] {
    return this.getAllBids().filter(bid => bid.transporterId === userId);
  }

  acceptBid(bidId: string): void {
    const bids = this.getAllBids();
    const bidIndex = bids.findIndex(b => b.id === bidId);
    if (bidIndex !== -1) {
      const winningBid = bids[bidIndex];
      
      // Mark this bid as won
      bids[bidIndex].status = 'won';
      
      // Mark other bids for the same load as lost
      bids.forEach((bid, index) => {
        if (bid.loadId === winningBid.loadId && index !== bidIndex) {
          bids[index].status = 'lost';
        }
      });
      
      // Update load status
      const loads = this.getAllLoads();
      const loadIndex = loads.findIndex(l => l.id === winningBid.loadId);
      if (loadIndex !== -1) {
        loads[loadIndex].status = 'assigned';
        localStorage.setItem(this.STORAGE_KEYS.LOADS, JSON.stringify(loads));
      }
      
      localStorage.setItem(this.STORAGE_KEYS.BIDS, JSON.stringify(bids));
    }
  }

  // Message management
  sendMessage(message: Omit<Message, 'id' | 'createdAt'>): Message {
    const messages = this.getAllMessages();
    const newMessage: Message = {
      ...message,
      id: `msg-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    messages.push(newMessage);
    localStorage.setItem(this.STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
    return newMessage;
  }

  getAllMessages(): Message[] {
    const messagesStr = localStorage.getItem(this.STORAGE_KEYS.MESSAGES);
    return messagesStr ? JSON.parse(messagesStr) : [];
  }

  getLoadMessages(loadId: string): Message[] {
    return this.getAllMessages().filter(msg => msg.loadId === loadId);
  }

  getUserMessages(userId: string): Message[] {
    return this.getAllMessages().filter(msg => 
      msg.senderId === userId || msg.receiverId === userId
    );
  }

  markMessageAsRead(messageId: string): void {
    const messages = this.getAllMessages();
    const msgIndex = messages.findIndex(m => m.id === messageId);
    if (msgIndex !== -1) {
      messages[msgIndex].isRead = true;
      localStorage.setItem(this.STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
    }
  }
}

export const authService = new AuthService();