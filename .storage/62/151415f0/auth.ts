// Authentication and user management service
export interface User {
  id: string;
  email: string;
  userType: 'admin' | 'client' | 'transporter';
  status: 'pending' | 'active' | 'rejected';
  profile: {
    companyName: string;
    contactPerson: string;
    phone: string;
    address: string;
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
  status: 'active' | 'assigned' | 'completed';
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
  createdAt: string;
}

// Demo data
const demoUsers: User[] = [
  {
    id: 'admin-1',
    email: 'admin@fleetxchange.com',
    userType: 'admin',
    status: 'active',
    profile: {
      companyName: 'FleetXchange Admin',
      contactPerson: 'System Administrator',
      phone: '+1-555-0100',
      address: '123 Admin St, Tech City, TC 12345'
    },
    createdAt: new Date().toISOString()
  },
  {
    id: 'client-1',
    email: 'client@demo.com',
    userType: 'client',
    status: 'active',
    profile: {
      companyName: 'Demo Logistics Inc',
      contactPerson: 'John Smith',
      phone: '+1-555-0200',
      address: '456 Client Ave, Business City, BC 67890'
    },
    createdAt: new Date().toISOString()
  },
  {
    id: 'transporter-1',
    email: 'transporter@demo.com',
    userType: 'transporter',
    status: 'active',
    profile: {
      companyName: 'Swift Transport Co',
      contactPerson: 'Mike Johnson',
      phone: '+1-555-0300',
      address: '789 Transport Blvd, Freight City, FC 13579'
    },
    createdAt: new Date().toISOString()
  }
];

// In-memory storage
let users: User[] = [...demoUsers];
let documents: Document[] = [];
let loads: Load[] = [];
let bids: Bid[] = [];
let messages: Message[] = [];
let currentUser: User | null = null;

export const authService = {
  // Authentication
  login: async (email: string, password: string): Promise<User | null> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const user = users.find(u => u.email === email && u.status === 'active');
    if (user) {
      currentUser = user;
      if (typeof window !== 'undefined') {
        localStorage.setItem('currentUser', JSON.stringify(user));
      }
      return user;
    }
    return null;
  },

  logout: () => {
    currentUser = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('currentUser');
    }
  },

  getCurrentUser: (): User | null => {
    if (currentUser) return currentUser;
    
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('currentUser');
      if (stored) {
        currentUser = JSON.parse(stored);
        return currentUser;
      }
    }
    return null;
  },

  // User management
  getAllUsers: (): User[] => users,

  updateUserStatus: (userId: string, status: 'active' | 'rejected') => {
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      users[userIndex].status = status;
    }
  },

  // Document management
  uploadDocument: (docData: Omit<Document, 'id' | 'uploadedAt'>): Document => {
    const document: Document = {
      ...docData,
      id: `doc-${Date.now()}`,
      uploadedAt: new Date().toISOString()
    };
    documents.push(document);
    return document;
  },

  getUserDocuments: (userId: string): Document[] => {
    return documents.filter(doc => doc.userId === userId);
  },

  getAllDocuments: (): Document[] => documents,

  verifyDocument: (docId: string, status: 'approved' | 'rejected') => {
    const docIndex = documents.findIndex(d => d.id === docId);
    if (docIndex !== -1) {
      documents[docIndex].verificationStatus = status;
      documents[docIndex].verifiedAt = new Date().toISOString();
    }
  },

  // Load management
  createLoad: (loadData: Omit<Load, 'id' | 'createdAt'>): Load => {
    const load: Load = {
      ...loadData,
      id: `load-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    loads.push(load);
    return load;
  },

  getAllLoads: (): Load[] => loads,

  getUserLoads: (userId: string): Load[] => {
    return loads.filter(load => load.clientId === userId);
  },

  // Bid management
  createBid: (bidData: Omit<Bid, 'id' | 'createdAt'>): Bid => {
    const bid: Bid = {
      ...bidData,
      id: `bid-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    bids.push(bid);
    return bid;
  },

  getAllBids: (): Bid[] => bids,

  getUserBids: (userId: string): Bid[] => {
    return bids.filter(bid => bid.transporterId === userId);
  },

  acceptBid: (bidId: string) => {
    const bidIndex = bids.findIndex(b => b.id === bidId);
    if (bidIndex !== -1) {
      const acceptedBid = bids[bidIndex];
      
      // Mark this bid as won
      bids[bidIndex].status = 'won';
      
      // Mark other bids for the same load as lost
      bids.forEach((bid, index) => {
        if (bid.loadId === acceptedBid.loadId && index !== bidIndex) {
          bid.status = 'lost';
        }
      });
      
      // Update load status to assigned
      const loadIndex = loads.findIndex(l => l.id === acceptedBid.loadId);
      if (loadIndex !== -1) {
        loads[loadIndex].status = 'assigned';
      }
    }
  },

  // Message management
  getUserMessages: (userId: string): Message[] => {
    return messages.filter(msg => msg.senderId === userId || msg.receiverId === userId);
  },

  sendMessage: (messageData: Omit<Message, 'id' | 'createdAt'>): Message => {
    const message: Message = {
      ...messageData,
      id: `msg-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    messages.push(message);
    return message;
  }
};