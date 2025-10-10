// Authentication and user management service
export interface User {
  id: string;
  email: string;
  userType: 'admin' | 'client' | 'transporter';
  status: 'pending' | 'active' | 'rejected' | 'suspended';
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
  verificationStatus: 'pending' | 'approved' | 'rejected' | 'more_info_required';
  uploadedAt: string;
  verifiedAt?: string;
  rejectionReason?: string;
  adminNotes?: string;
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

// Required document types for each user type
export const REQUIRED_DOCUMENTS = {
  transporter: [
    'Company Registration Certificate',
    'Shareholders Certificate or extract',
    'Directors IDS',
    'Bank Confirmation Letter',
    'Application Letter to work with FleetXchange',
    'VAT Certificate',
    'Relevant Import Documents',
    'Tax Clearance',
    'Signed KYC FORM'
  ],
  client: [
    'Company Registration Certificate',
    'Shareholders Certificate or extract',
    'Directors IDS',
    'Bank Confirmation Letter',
    'Application Letter to work with FleetXchange',
    'VAT Certificate',
    'Relevant Import Documents',
    'Tax Clearance',
    'Signed KYC FORM'
  ]
};

class AuthService {
  private users: User[] = [
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
        address: '789 Transport Blvd, Freight City, FC 54321'
      },
      createdAt: new Date().toISOString()
    }
  ];

  private documents: Document[] = [];
  private loads: Load[] = [];
  private bids: Bid[] = [];
  private messages: Message[] = [];
  private currentUser: User | null = null;

  async login(email: string, password: string): Promise<User | null> {
    // Simple demo authentication - any password works
    const user = this.users.find(u => u.email === email && u.status === 'active');
    if (user) {
      this.currentUser = user;
      if (typeof window !== 'undefined') {
        localStorage.setItem('currentUser', JSON.stringify(user));
      }
      return user;
    }
    return null;
  }

  logout(): void {
    this.currentUser = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('currentUser');
    }
  }

  getCurrentUser(): User | null {
    if (this.currentUser) return this.currentUser;
    
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('currentUser');
      if (stored) {
        this.currentUser = JSON.parse(stored);
        return this.currentUser;
      }
    }
    return null;
  }

  registerUser(userData: Omit<User, 'id' | 'createdAt'>): User {
    const newUser: User = {
      ...userData,
      id: `${userData.userType}-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    this.users.push(newUser);
    return newUser;
  }

  getAllUsers(): User[] {
    return this.users;
  }

  updateUserStatus(userId: string, status: User['status'], reason?: string): void {
    const user = this.users.find(u => u.id === userId);
    if (user) {
      user.status = status;
    }
  }

  getAllDocuments(): Document[] {
    return this.documents;
  }

  getUserDocuments(userId: string): Document[] {
    return this.documents.filter(doc => doc.userId === userId);
  }

  uploadDocument(doc: Omit<Document, 'id' | 'uploadedAt'>): Document {
    const document: Document = {
      ...doc,
      id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      uploadedAt: new Date().toISOString()
    };
    this.documents.push(document);
    return document;
  }

  verifyDocument(docId: string, status: 'approved' | 'rejected' | 'more_info_required', notes?: string): void {
    const doc = this.documents.find(d => d.id === docId);
    if (doc) {
      doc.verificationStatus = status;
      doc.verifiedAt = new Date().toISOString();
      if (notes) {
        doc.adminNotes = notes;
      }
    }
  }

  getAllLoads(): Load[] {
    return this.loads;
  }

  getUserLoads(userId: string): Load[] {
    return this.loads.filter(load => load.clientId === userId);
  }

  createLoad(load: Omit<Load, 'id' | 'createdAt'>): Load {
    const newLoad: Load = {
      ...load,
      id: `load-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString()
    };
    this.loads.push(newLoad);
    return newLoad;
  }

  getAllBids(): Bid[] {
    return this.bids;
  }

  getUserBids(userId: string): Bid[] {
    return this.bids.filter(bid => bid.transporterId === userId);
  }

  createBid(bid: Omit<Bid, 'id' | 'createdAt'>): Bid {
    const newBid: Bid = {
      ...bid,
      id: `bid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString()
    };
    this.bids.push(newBid);
    return newBid;
  }

  acceptBid(bidId: string): void {
    const bid = this.bids.find(b => b.id === bidId);
    if (bid) {
      // Mark this bid as won
      bid.status = 'won';
      
      // Mark other bids for the same load as lost
      this.bids.forEach(b => {
        if (b.loadId === bid.loadId && b.id !== bidId) {
          b.status = 'lost';
        }
      });
      
      // Update load status to assigned
      const load = this.loads.find(l => l.id === bid.loadId);
      if (load) {
        load.status = 'assigned';
      }
    }
  }

  getUserMessages(userId: string): Message[] {
    return this.messages.filter(msg => 
      msg.senderId === userId || msg.receiverId === userId
    );
  }

  sendMessage(message: Omit<Message, 'id' | 'createdAt'>): Message {
    const newMessage: Message = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString()
    };
    this.messages.push(newMessage);
    return newMessage;
  }

  // Statistics for dashboard
  getStatistics() {
    return {
      totalUsers: this.users.length,
      activeUsers: this.users.filter(u => u.status === 'active').length,
      pendingUsers: this.users.filter(u => u.status === 'pending').length,
      totalLoads: this.loads.length,
      activeLoads: this.loads.filter(l => l.status === 'active').length,
      completedLoads: this.loads.filter(l => l.status === 'completed').length,
      totalBids: this.bids.length,
      wonBids: this.bids.filter(b => b.status === 'won').length,
      pendingDocuments: this.documents.filter(d => d.verificationStatus === 'pending').length,
      approvedDocuments: this.documents.filter(d => d.verificationStatus === 'approved').length
    };
  }
}

export const authService = new AuthService();