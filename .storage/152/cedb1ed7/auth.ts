// FleetXchange Authentication Service - Production Ready with Enhanced Debugging
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
    console.log('🚀 AuthService constructor called');
    this.initializeProductionData();
  }

  private initializeProductionData() {
    console.log('🔧 Initializing production data...');
    
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

    console.log('👥 Admin accounts to create:', adminAccounts.map(a => ({ email: a.email, password: a.password })));

    // Load existing data from localStorage
    try {
      const storedUsers = localStorage.getItem('fleetxchange_users');
      if (storedUsers) {
        this.users = JSON.parse(storedUsers);
        console.log('📂 Loaded existing users from localStorage:', this.users.length);
      } else {
        console.log('📂 No existing users in localStorage');
        this.users = [];
      }
    } catch (error) {
      console.error('❌ Error loading stored users:', error);
      this.users = [];
    }

    // ALWAYS ensure admin accounts are present (overwrite if necessary)
    adminAccounts.forEach(admin => {
      const existingIndex = this.users.findIndex(u => u.email === admin.email);
      if (existingIndex >= 0) {
        console.log(`🔄 Updating existing admin account: ${admin.email}`);
        this.users[existingIndex] = admin;
      } else {
        console.log(`➕ Adding new admin account: ${admin.email}`);
        this.users.push(admin);
      }
    });

    // Load other data
    try {
      this.loads = JSON.parse(localStorage.getItem('fleetxchange_loads') || '[]');
      this.bids = JSON.parse(localStorage.getItem('fleetxchange_bids') || '[]');
      this.documents = JSON.parse(localStorage.getItem('fleetxchange_documents') || '[]');
      this.messages = JSON.parse(localStorage.getItem('fleetxchange_messages') || '[]');
      console.log('📊 Loaded data - Loads:', this.loads.length, 'Bids:', this.bids.length, 'Documents:', this.documents.length, 'Messages:', this.messages.length);
    } catch (error) {
      console.error('❌ Error loading data:', error);
      this.loads = [];
      this.bids = [];
      this.documents = [];
      this.messages = [];
    }

    // Save updated data
    this.saveData();
    
    const finalAdminUsers = this.users.filter(u => u.userType === 'admin');
    console.log('✅ FleetXchange initialized with admin accounts:', finalAdminUsers.map(u => ({ 
      email: u.email, 
      password: u.password,
      status: u.status,
      id: u.id
    })));
    console.log('📈 Total users in system:', this.users.length);
  }

  private saveData() {
    try {
      localStorage.setItem('fleetxchange_users', JSON.stringify(this.users));
      localStorage.setItem('fleetxchange_loads', JSON.stringify(this.loads));
      localStorage.setItem('fleetxchange_bids', JSON.stringify(this.bids));
      localStorage.setItem('fleetxchange_documents', JSON.stringify(this.documents));
      localStorage.setItem('fleetxchange_messages', JSON.stringify(this.messages));
      console.log('💾 Data saved to localStorage successfully');
    } catch (error) {
      console.error('❌ Error saving data:', error);
    }
  }

  async login(email: string, password: string): Promise<User | null> {
    console.log('🔐 === LOGIN ATTEMPT START ===');
    console.log('📧 Input email:', `"${email}"`);
    console.log('🔑 Input password:', `"${password}"`);
    console.log('📊 Total users in system:', this.users.length);
    
    // Log all available users for debugging
    console.log('👥 Available users:');
    this.users.forEach((u, index) => {
      console.log(`  ${index + 1}. Email: "${u.email}" | Password: "${u.password}" | Type: ${u.userType} | Status: ${u.status}`);
    });

    // Trim inputs
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    console.log('✂️ Trimmed email:', `"${trimmedEmail}"`);
    console.log('✂️ Trimmed password:', `"${trimmedPassword}"`);

    // Find user with exact match
    console.log('🔍 Searching for matching user...');
    const user = this.users.find(u => {
      const emailMatch = u.email.toLowerCase() === trimmedEmail.toLowerCase();
      const passwordMatch = u.password === trimmedPassword;
      console.log(`  Checking user: ${u.email}`);
      console.log(`    Email match: ${emailMatch} (${u.email.toLowerCase()} === ${trimmedEmail.toLowerCase()})`);
      console.log(`    Password match: ${passwordMatch} (${u.password} === ${trimmedPassword})`);
      return emailMatch && passwordMatch;
    });

    if (user) {
      console.log('✅ User found:', {
        id: user.id,
        email: user.email,
        userType: user.userType,
        status: user.status
      });
    } else {
      console.log('❌ No matching user found');
      console.log('🔍 Detailed search results:');
      this.users.forEach(u => {
        console.log(`  User: ${u.email}`);
        console.log(`    Email match: ${u.email.toLowerCase() === trimmedEmail.toLowerCase()}`);
        console.log(`    Password match: ${u.password === trimmedPassword}`);
      });
      return null;
    }

    // Check user status
    if (user.status !== 'active') {
      console.log('❌ Login failed: User status is not active:', user.status);
      return null;
    }

    // Login successful
    console.log('🎉 Login successful!');
    this.currentUser = user;
    user.lastLogin = new Date().toISOString();
    this.saveData();
    
    console.log('✅ Current user set:', {
      id: this.currentUser.id,
      email: this.currentUser.email,
      userType: this.currentUser.userType
    });
    console.log('🔐 === LOGIN ATTEMPT END ===');
    
    return user;
  }

  logout() {
    console.log('👋 User logged out');
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

  // CRITICAL: getStatistics method for admin dashboard
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

    const stats = {
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

    console.log('📊 Statistics generated:', stats);
    return stats;
  }

  // Utility method to reset localStorage (for debugging)
  resetData(): void {
    console.log('🔄 Resetting all data...');
    localStorage.clear();
    this.initializeProductionData();
    console.log('✅ Data reset complete. Admin accounts reinitialized.');
  }

  // Debug method to check current state
  debugAuth(): void {
    console.log('🐛 === FleetXchange Auth Debug ===');
    console.log('📊 Total users:', this.users.length);
    console.log('👑 Admin users:', this.users.filter(u => u.userType === 'admin'));
    console.log('👤 Current user:', this.currentUser);
    console.log('💾 localStorage keys:', Object.keys(localStorage).filter(k => k.startsWith('fleetxchange')));
    console.log('🔍 All users detailed:');
    this.users.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.email} (${user.userType}) - Status: ${user.status}`);
    });
  }
}

export const authService = new AuthService();

// Make debug methods available globally for troubleshooting
(window as any).fleetxchangeDebug = {
  resetData: () => authService.resetData(),
  debugAuth: () => authService.debugAuth(),
  getUsers: () => authService.getAllUsers(),
  testLogin: (email: string, password: string) => authService.login(email, password)
};

console.log('🎯 FleetXchange AuthService loaded and ready!');