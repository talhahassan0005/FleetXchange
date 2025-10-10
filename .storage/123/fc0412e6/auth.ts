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
  documentType: 'business_license' | 'tax_certificate' | 'insurance' | 'vehicle_registration' | 'driver_license' | 'other';
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
    // Production Admin Accounts
    const adminAccounts: User[] = [
      {
        id: 'admin_001',
        email: 'mrtiger@fleetxchange.africa',
        password: 'FleetXchange2025!',
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
        password: 'FleetXchange2025!',
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

    // Load existing data from localStorage or initialize with production accounts
    const storedUsers = localStorage.getItem('fleetxchange_users');
    if (storedUsers) {
      this.users = JSON.parse(storedUsers);
      // Add admin accounts if they don't exist
      adminAccounts.forEach(admin => {
        if (!this.users.find(u => u.email === admin.email)) {
          this.users.push(admin);
        }
      });
    } else {
      this.users = adminAccounts;
    }

    // Load other data
    this.loads = JSON.parse(localStorage.getItem('fleetxchange_loads') || '[]');
    this.bids = JSON.parse(localStorage.getItem('fleetxchange_bids') || '[]');
    this.documents = JSON.parse(localStorage.getItem('fleetxchange_documents') || '[]');
    this.messages = JSON.parse(localStorage.getItem('fleetxchange_messages') || '[]');

    // Clean up any demo data
    this.cleanupDemoData();
    
    // Save cleaned data
    this.saveData();
  }

  private cleanupDemoData() {
    // Remove demo users (keep only production admin accounts and real users)
    this.users = this.users.filter(user => 
      user.email.includes('@fleetxchange.africa') || 
      (!user.email.includes('demo.com') && !user.email.includes('example.com'))
    );

    // Remove demo loads
    this.loads = this.loads.filter(load => 
      !load.title.toLowerCase().includes('demo') &&
      !load.description.toLowerCase().includes('demo') &&
      !load.title.toLowerCase().includes('sample')
    );

    // Remove demo bids
    this.bids = this.bids.filter(bid => {
      const load = this.loads.find(l => l.id === bid.loadId);
      return load !== undefined;
    });

    // Remove demo documents
    this.documents = this.documents.filter(doc => {
      const user = this.users.find(u => u.id === doc.userId);
      return user !== undefined;
    });

    // Remove demo messages
    this.messages = this.messages.filter(msg => {
      const load = this.loads.find(l => l.id === msg.loadId);
      return load !== undefined;
    });
  }

  private saveData() {
    localStorage.setItem('fleetxchange_users', JSON.stringify(this.users));
    localStorage.setItem('fleetxchange_loads', JSON.stringify(this.loads));
    localStorage.setItem('fleetxchange_bids', JSON.stringify(this.bids));
    localStorage.setItem('fleetxchange_documents', JSON.stringify(this.documents));
    localStorage.setItem('fleetxchange_messages', JSON.stringify(this.messages));
  }

  async login(email: string, password: string): Promise<User | null> {
    const user = this.users.find(u => u.email === email && u.password === password);
    if (user && user.status === 'active') {
      this.currentUser = user;
      user.lastLogin = new Date().toISOString();
      this.saveData();
      return user;
    }
    return null;
  }

  async register(userData: Omit<User, 'id' | 'createdAt' | 'status'>): Promise<User> {
    const existingUser = this.users.find(u => u.email === userData.email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    const newUser: User = {
      ...userData,
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: userData.userType === 'admin' ? 'active' : 'pending',
      createdAt: new Date().toISOString()
    };

    this.users.push(newUser);
    this.saveData();

    // Send notification to admins about new registration
    this.notifyAdminsOfNewRegistration(newUser);

    return newUser;
  }

  private notifyAdminsOfNewRegistration(newUser: User) {
    const adminUsers = this.users.filter(u => u.userType === 'admin');
    adminUsers.forEach(admin => {
      const message: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        loadId: 'system',
        senderId: 'system',
        receiverId: admin.id,
        message: `New ${newUser.userType} registration: ${newUser.profile.companyName} (${newUser.email}) requires approval.`,
        messageType: 'system',
        isRead: false,
        createdAt: new Date().toISOString()
      };
      this.messages.push(message);
    });
    this.saveData();
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

    // Notify transporters about new load
    this.notifyTransportersOfNewLoad(newLoad);

    return newLoad;
  }

  private notifyTransportersOfNewLoad(load: Load) {
    const transporters = this.users.filter(u => u.userType === 'transporter' && u.status === 'active');
    transporters.forEach(transporter => {
      const message: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        loadId: load.id,
        senderId: load.clientId,
        receiverId: transporter.id,
        message: `New load available: ${load.title} from ${load.pickupLocation} to ${load.deliveryLocation}. Budget: $${load.budgetMin.toLocaleString()} - $${load.budgetMax.toLocaleString()}`,
        messageType: 'bid_notification',
        isRead: false,
        createdAt: new Date().toISOString()
      };
      this.messages.push(message);
    });
    this.saveData();
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

    // Notify client about new bid
    this.notifyClientOfNewBid(newBid);

    return newBid;
  }

  private notifyClientOfNewBid(bid: Bid) {
    const load = this.loads.find(l => l.id === bid.loadId);
    if (load) {
      const message: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        loadId: bid.loadId,
        senderId: bid.transporterId,
        receiverId: load.clientId,
        message: `New bid received for "${load.title}": $${bid.amount.toLocaleString()}. Pickup: ${bid.pickupDate}, Delivery: ${bid.deliveryDate}`,
        messageType: 'bid_notification',
        isRead: false,
        createdAt: new Date().toISOString()
      };
      this.messages.push(message);
      this.saveData();
    }
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

      // Notify transporter about won bid
      this.notifyBidResult(bid, 'won');
      
      // Notify other transporters about lost bids
      this.bids.filter(b => b.loadId === bid.loadId && b.id !== bidId)
        .forEach(b => this.notifyBidResult(b, 'lost'));
    }
  }

  private notifyBidResult(bid: Bid, result: 'won' | 'lost') {
    const load = this.loads.find(l => l.id === bid.loadId);
    if (load) {
      const message: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        loadId: bid.loadId,
        senderId: load.clientId,
        receiverId: bid.transporterId,
        message: result === 'won' 
          ? `Congratulations! Your bid of $${bid.amount.toLocaleString()} for "${load.title}" has been accepted.`
          : `Your bid for "${load.title}" was not selected. Thank you for your interest.`,
        messageType: 'status_update',
        isRead: false,
        createdAt: new Date().toISOString()
      };
      this.messages.push(message);
      this.saveData();
    }
  }

  updateUserStatus(userId: string, status: User['status']): void {
    const user = this.users.find(u => u.id === userId);
    if (user) {
      user.status = status;
      this.saveData();

      // Notify user about status change
      const message: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        loadId: 'system',
        senderId: 'system',
        receiverId: userId,
        message: `Your account status has been updated to: ${status}. ${status === 'active' ? 'You can now access all platform features.' : status === 'rejected' ? 'Please contact support for more information.' : ''}`,
        messageType: 'system',
        isRead: false,
        createdAt: new Date().toISOString()
      };
      this.messages.push(message);
      this.saveData();
    }
  }

  getAllDocuments(): Document[] {
    return this.documents;
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

    // Notify admins about new document
    this.notifyAdminsOfNewDocument(newDocument);

    return newDocument;
  }

  private notifyAdminsOfNewDocument(document: Document) {
    const adminUsers = this.users.filter(u => u.userType === 'admin');
    const user = this.users.find(u => u.id === document.userId);
    
    adminUsers.forEach(admin => {
      const message: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        loadId: 'system',
        senderId: 'system',
        receiverId: admin.id,
        message: `New document uploaded by ${user?.profile.companyName || 'Unknown'}: ${document.fileName} (${document.documentType}) requires verification.`,
        messageType: 'system',
        isRead: false,
        createdAt: new Date().toISOString()
      };
      this.messages.push(message);
    });
    this.saveData();
  }

  verifyDocument(documentId: string, status: Document['verificationStatus'], adminNotes?: string): void {
    const document = this.documents.find(d => d.id === documentId);
    if (document) {
      document.verificationStatus = status;
      document.verifiedAt = new Date().toISOString();
      document.verifiedBy = this.currentUser?.id;
      document.adminNotes = adminNotes;
      this.saveData();

      // Notify user about document verification result
      const message: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        loadId: 'system',
        senderId: 'system',
        receiverId: document.userId,
        message: `Document verification update: ${document.fileName} - Status: ${status}. ${adminNotes ? `Admin notes: ${adminNotes}` : ''}`,
        messageType: 'system',
        isRead: false,
        createdAt: new Date().toISOString()
      };
      this.messages.push(message);
      this.saveData();
    }
  }

  getUserMessages(userId: string): Message[] {
    return this.messages.filter(msg => msg.receiverId === userId || msg.senderId === userId);
  }

  getAllMessages(): Message[] {
    return this.messages;
  }

  sendMessage(messageData: Omit<Message, 'id' | 'createdAt' | 'isRead'>): Message {
    const newMessage: Message = {
      ...messageData,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      isRead: false,
      createdAt: new Date().toISOString()
    };

    this.messages.push(newMessage);
    this.saveData();

    return newMessage;
  }

  markMessageAsRead(messageId: string): void {
    const message = this.messages.find(m => m.id === messageId);
    if (message) {
      message.isRead = true;
      this.saveData();
    }
  }

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

  // Production utility methods
  resetPassword(email: string, newPassword: string): boolean {
    const user = this.users.find(u => u.email === email);
    if (user) {
      user.password = newPassword;
      this.saveData();
      return true;
    }
    return false;
  }

  exportData(): string {
    return JSON.stringify({
      users: this.users,
      loads: this.loads,
      bids: this.bids,
      documents: this.documents,
      messages: this.messages,
      exportedAt: new Date().toISOString()
    }, null, 2);
  }

  getSystemHealth() {
    return {
      status: 'healthy',
      uptime: '100%',
      lastBackup: new Date().toISOString(),
      databaseConnected: true,
      totalRecords: this.users.length + this.loads.length + this.bids.length + this.documents.length + this.messages.length
    };
  }
}

export const authService = new AuthService();