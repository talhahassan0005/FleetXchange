// FleetXchange Authentication Service - Production Ready
export interface UserProfile {
  companyName: string;
  contactPerson: string;
  phone: string;
  address: string;
  businessRegistration?: string;
  taxId?: string;
}

export interface User {
  id: string;
  email: string;
  password: string;
  userType: 'admin' | 'client' | 'transporter';
  status: 'active' | 'pending' | 'rejected' | 'suspended';
  profile: UserProfile;
  createdAt: string;
  lastLogin?: string;
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
  status: 'active' | 'assigned' | 'completed' | 'cancelled';
  createdAt: string;
  assignedTransporterId?: string;
}

export interface Bid {
  id: string;
  loadId: string;
  transporterId: string;
  amount: number;
  pickupDate: string;
  deliveryDate: string;
  comments: string;
  status: 'active' | 'won' | 'lost' | 'withdrawn';
  createdAt: string;
}

export interface Document {
  id: string;
  userId: string;
  fileName: string;
  fileUrl: string;
  documentType: string;
  verificationStatus: 'pending' | 'approved' | 'rejected' | 'more_info_required';
  uploadedAt: string;
  verifiedAt?: string;
  verifiedBy?: string;
  adminNotes?: string;
}

export interface Message {
  id: string;
  loadId: string;
  senderId: string;
  receiverId: string;
  message: string;
  messageType: 'bid_notification' | 'status_update' | 'general' | 'system';
  isRead: boolean;
  createdAt: string;
}

class AuthService {
  private users: User[] = [];
  private loads: Load[] = [];
  private bids: Bid[] = [];
  private documents: Document[] = [];
  private messages: Message[] = [];
  private currentUser: User | null = null;

  constructor() {
    this.initializeProductionData();
  }

  private initializeProductionData() {
    // ALWAYS ensure admin accounts exist - hardcoded for reliability
    const adminAccounts: User[] = [
      {
        id: 'admin_001',
        email: 'mrtiger@fleetxchange.africa',
        password: 'FleetX2025!',
        userType: 'admin',
        status: 'active',
        profile: {
          companyName: 'FleetXchange Africa',
          contactPerson: 'Mr. Tiger',
          phone: '+27-11-123-4567',
          address: 'FleetXchange HQ, Johannesburg, South Africa'
        },
        createdAt: new Date().toISOString()
      },
      {
        id: 'admin_002',
        email: 'tshepiso@fleetxchange.africa',
        password: 'FleetX2025!',
        userType: 'admin',
        status: 'active',
        profile: {
          companyName: 'FleetXchange Africa',
          contactPerson: 'Tshepiso',
          phone: '+27-11-123-4568',
          address: 'FleetXchange HQ, Johannesburg, South Africa'
        },
        createdAt: new Date().toISOString()
      }
    ];

    // Load existing data from localStorage
    try {
      const storedUsers = localStorage.getItem('fleetxchange_users');
      if (storedUsers) {
        this.users = JSON.parse(storedUsers);
      }
    } catch (error) {
      console.error('Error loading stored users:', error);
      this.users = [];
    }

    // ALWAYS ensure admin accounts are present (overwrite if necessary)
    adminAccounts.forEach(admin => {
      const existingIndex = this.users.findIndex(u => u.email === admin.email);
      if (existingIndex >= 0) {
        // Update existing admin account to ensure correct credentials
        this.users[existingIndex] = admin;
      } else {
        // Add new admin account
        this.users.push(admin);
      }
    });

    // Load other data
    try {
      this.loads = JSON.parse(localStorage.getItem('fleetxchange_loads') || '[]');
      this.bids = JSON.parse(localStorage.getItem('fleetxchange_bids') || '[]');
      this.documents = JSON.parse(localStorage.getItem('fleetxchange_documents') || '[]');
      this.messages = JSON.parse(localStorage.getItem('fleetxchange_messages') || '[]');
    } catch (error) {
      console.error('Error loading data:', error);
      this.loads = [];
      this.bids = [];
      this.documents = [];
      this.messages = [];
    }

    // Save updated data
    this.saveData();
    
    console.log('FleetXchange initialized with admin accounts:', 
      this.users.filter(u => u.userType === 'admin').map(u => ({ 
        email: u.email, 
        password: u.password,
        status: u.status 
      }))
    );
  }

  private saveData() {
    try {
      localStorage.setItem('fleetxchange_users', JSON.stringify(this.users));
      localStorage.setItem('fleetxchange_loads', JSON.stringify(this.loads));
      localStorage.setItem('fleetxchange_bids', JSON.stringify(this.bids));
      localStorage.setItem('fleetxchange_documents', JSON.stringify(this.documents));
      localStorage.setItem('fleetxchange_messages', JSON.stringify(this.messages));
    } catch (error) {
      console.error('Error saving data:', error);
    }
  }

  async login(email: string, password: string): Promise<User | null> {
    console.log('Login attempt for:', email);
    console.log('Available users:', this.users.map(u => ({ 
      email: u.email, 
      userType: u.userType, 
      status: u.status 
    })));

    // Find user with exact match
    const user = this.users.find(u => 
      u.email.toLowerCase() === email.toLowerCase() && 
      u.password === password
    );

    console.log('Found user:', user ? { 
      email: user.email, 
      userType: user.userType, 
      status: user.status 
    } : 'Not found');

    if (!user) {
      console.log('Login failed: User not found or password incorrect');
      return null;
    }

    if (user.status !== 'active') {
      console.log('Login failed: User status is', user.status);
      return null;
    }

    // Login successful
    this.currentUser = user;
    user.lastLogin = new Date().toISOString();
    this.saveData();
    
    console.log('Login successful for:', user.email, 'Type:', user.userType);
    return user;
  }

  logout() {
    this.currentUser = null;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  getAllUsers(): User[] {
    return this.users;
  }

  getUserLoads(userId: string): Load[] {
    return this.loads.filter(load => load.clientId === userId);
  }

  getAllLoads(): Load[] {
    return this.loads;
  }

  createLoad(loadData: Omit<Load, 'id' | 'createdAt' | 'status'>): Load {
    const newLoad: Load = {
      ...loadData,
      id: `load_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    this.loads.push(newLoad);
    this.saveData();
    return newLoad;
  }

  getAllBids(): Bid[] {
    return this.bids;
  }

  getUserBids(userId: string): Bid[] {
    return this.bids.filter(bid => bid.transporterId === userId);
  }

  createBid(bidData: Omit<Bid, 'id' | 'createdAt' | 'status'>): Bid {
    const newBid: Bid = {
      ...bidData,
      id: `bid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    this.bids.push(newBid);
    this.saveData();
    return newBid;
  }

  acceptBid(bidId: string): void {
    const bid = this.bids.find(b => b.id === bidId);
    if (bid) {
      // Mark bid as won
      bid.status = 'won';
      
      // Mark other bids for same load as lost
      this.bids.filter(b => b.loadId === bid.loadId && b.id !== bidId)
        .forEach(b => b.status = 'lost');
      
      // Update load status
      const load = this.loads.find(l => l.id === bid.loadId);
      if (load) {
        load.status = 'assigned';
        load.assignedTransporterId = bid.transporterId;
      }

      this.saveData();
    }
  }

  updateUserStatus(userId: string, status: User['status']): void {
    const user = this.users.find(u => u.id === userId);
    if (user) {
      user.status = status;
      this.saveData();
    }
  }

  getAllDocuments(): Document[] {
    return this.documents;
  }

  getUserDocuments(userId: string): Document[] {
    return this.documents.filter(doc => doc.userId === userId);
  }

  uploadDocument(documentData: Omit<Document, 'id' | 'uploadedAt' | 'verificationStatus'>): Document {
    const newDocument: Document = {
      ...documentData,
      id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      verificationStatus: 'pending',
      uploadedAt: new Date().toISOString()
    };

    this.documents.push(newDocument);
    this.saveData();
    return newDocument;
  }

  verifyDocument(documentId: string, status: Document['verificationStatus'], adminNotes?: string): void {
    const document = this.documents.find(d => d.id === documentId);
    if (document) {
      document.verificationStatus = status;
      document.verifiedAt = new Date().toISOString();
      document.verifiedBy = this.currentUser?.id;
      document.adminNotes = adminNotes;
      this.saveData();
    }
  }

  getUserMessages(userId: string): Message[] {
    return this.messages.filter(msg => msg.receiverId === userId || msg.senderId === userId);
  }

  getAllMessages(): Message[] {
    return this.messages;
  }

  // CRITICAL: Add missing getStatistics method
  getStatistics() {
    const totalUsers = this.users.length;
    const activeUsers = this.users.filter(u => u.status === 'active').length;
    const pendingUsers = this.users.filter(u => u.status === 'pending').length;
    const totalLoads = this.loads.length;
    const activeLoads = this.loads.filter(l => l.status === 'active').length;
    const completedLoads = this.loads.filter(l => l.status === 'completed').length;
    const totalBids = this.bids.length;
    const pendingDocuments = this.documents.filter(d => d.verificationStatus === 'pending').length;
    const unreadMessages = this.messages.filter(m => !m.isRead).length;

    return {
      totalUsers,
      activeUsers,
      pendingUsers,
      totalLoads,
      activeLoads,
      completedLoads,
      totalBids,
      pendingDocuments,
      unreadMessages,
      clientUsers: this.users.filter(u => u.userType === 'client').length,
      transporterUsers: this.users.filter(u => u.userType === 'transporter').length,
      adminUsers: this.users.filter(u => u.userType === 'admin').length
    };
  }

  // Utility method to reset localStorage (for debugging)
  resetData(): void {
    localStorage.clear();
    this.initializeProductionData();
    console.log('Data reset complete. Admin accounts reinitialized.');
  }

  // Debug method to check current state
  debugAuth(): void {
    console.log('=== FleetXchange Auth Debug ===');
    console.log('Total users:', this.users.length);
    console.log('Admin users:', this.users.filter(u => u.userType === 'admin'));
    console.log('Current user:', this.currentUser);
    console.log('localStorage keys:', Object.keys(localStorage).filter(k => k.startsWith('fleetxchange')));
  }
}

export const authService = new AuthService();

// Make debug methods available globally for troubleshooting
(window as any).fleetxchangeDebug = {
  resetData: () => authService.resetData(),
  debugAuth: () => authService.debugAuth(),
  getUsers: () => authService.getAllUsers()
};