// FleetXchange Authentication Service - FIXED VERSION
export interface User {
  id: string;
  email: string;
  password: string;
  userType: 'admin' | 'client' | 'transporter';
  companyName: string;
  isApproved: boolean;
  createdAt: string;
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
  senderId: string;
  receiverId: string;
  loadId?: string;
  message: string;
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
  adminNotes?: string;
}

class AuthService {
  private users: User[] = [];
  private loads: Load[] = [];
  private bids: Bid[] = [];
  private messages: Message[] = [];
  private documents: Document[] = [];
  private currentUser: User | null = null;

  constructor() {
    this.initializeAdminAccounts();
  }

  private initializeAdminAccounts() {
    // Always ensure admin accounts exist
    const adminAccounts: User[] = [
      {
        id: 'admin-001',
        email: 'mrtiger@fleetxchange.africa',
        password: 'FleetX2025!',
        userType: 'admin',
        companyName: 'FleetXchange Admin',
        isApproved: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'admin-002',
        email: 'tshepiso@fleetxchange.africa',
        password: 'FleetX2025!',
        userType: 'admin',
        companyName: 'FleetXchange Admin',
        isApproved: true,
        createdAt: new Date().toISOString()
      }
    ];

    // Load existing users from localStorage
    try {
      const storedUsers = localStorage.getItem('fleetxchange_users');
      if (storedUsers) {
        this.users = JSON.parse(storedUsers);
      }
    } catch (error) {
      console.error('Error loading users from localStorage:', error);
      this.users = [];
    }

    // Add admin accounts if they don't exist
    adminAccounts.forEach(admin => {
      const existingAdmin = this.users.find(u => u.email === admin.email);
      if (!existingAdmin) {
        this.users.push(admin);
      } else {
        // Update existing admin to ensure correct password
        existingAdmin.password = admin.password;
        existingAdmin.isApproved = true;
        existingAdmin.userType = 'admin';
      }
    });

    // Load other data
    try {
      this.loads = JSON.parse(localStorage.getItem('fleetxchange_loads') || '[]');
      this.bids = JSON.parse(localStorage.getItem('fleetxchange_bids') || '[]');
      this.messages = JSON.parse(localStorage.getItem('fleetxchange_messages') || '[]');
      this.documents = JSON.parse(localStorage.getItem('fleetxchange_documents') || '[]');
    } catch (error) {
      console.error('Error loading data from localStorage:', error);
    }

    // Save updated data
    this.saveToStorage();

    console.log('Admin accounts initialized:', this.users.filter(u => u.userType === 'admin').map(u => ({ 
      email: u.email, 
      password: u.password,
      type: u.userType, 
      approved: u.isApproved 
    })));
  }

  private saveToStorage() {
    try {
      localStorage.setItem('fleetxchange_users', JSON.stringify(this.users));
      localStorage.setItem('fleetxchange_loads', JSON.stringify(this.loads));
      localStorage.setItem('fleetxchange_bids', JSON.stringify(this.bids));
      localStorage.setItem('fleetxchange_messages', JSON.stringify(this.messages));
      localStorage.setItem('fleetxchange_documents', JSON.stringify(this.documents));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }

  async login(email: string, password: string): Promise<User | null> {
    console.log('=== LOGIN ATTEMPT ===');
    console.log('Email:', email);
    console.log('Password:', password);
    
    // Ensure admin accounts are initialized
    this.initializeAdminAccounts();
    
    console.log('Available users:', this.users.map(u => ({ 
      email: u.email, 
      password: u.password, 
      type: u.userType, 
      approved: u.isApproved 
    })));

    // Find user with exact email and password match
    const user = this.users.find(u => {
      const emailMatch = u.email.toLowerCase() === email.toLowerCase();
      const passwordMatch = u.password === password;
      console.log(`Checking user ${u.email}: emailMatch=${emailMatch}, passwordMatch=${passwordMatch}`);
      return emailMatch && passwordMatch;
    });

    console.log('Found user:', user);

    if (!user) {
      console.log('❌ User not found or password mismatch');
      return null;
    }

    if (!user.isApproved) {
      console.log('❌ User not approved');
      return null;
    }

    this.currentUser = user;
    console.log('✅ Login successful for:', user.email, 'Type:', user.userType);
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

  approveUser(userId: string): boolean {
    const userIndex = this.users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      this.users[userIndex].isApproved = true;
      this.saveToStorage();
      return true;
    }
    return false;
  }

  rejectUser(userId: string): boolean {
    const userIndex = this.users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      this.users[userIndex].isApproved = false;
      this.saveToStorage();
      return true;
    }
    return false;
  }

  createLoad(loadData: Omit<Load, 'id' | 'createdAt'>): Load {
    const load: Load = {
      ...loadData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    this.loads.push(load);
    this.saveToStorage();
    return load;
  }

  getAllLoads(): Load[] {
    return this.loads;
  }

  getUserLoads(userId: string): Load[] {
    return this.loads.filter(load => load.clientId === userId);
  }

  createBid(bidData: Omit<Bid, 'id' | 'createdAt'>): Bid {
    const bid: Bid = {
      ...bidData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    this.bids.push(bid);
    this.saveToStorage();
    return bid;
  }

  getAllBids(): Bid[] {
    return this.bids;
  }

  getUserBids(userId: string): Bid[] {
    return this.bids.filter(bid => bid.transporterId === userId);
  }

  acceptBid(bidId: string): boolean {
    const bidIndex = this.bids.findIndex(b => b.id === bidId);
    if (bidIndex !== -1) {
      const bid = this.bids[bidIndex];
      
      // Mark this bid as won
      this.bids[bidIndex].status = 'won';
      
      // Mark other bids for the same load as lost
      this.bids.forEach((b, index) => {
        if (b.loadId === bid.loadId && b.id !== bidId) {
          this.bids[index].status = 'lost';
        }
      });

      // Update load status to assigned
      const loadIndex = this.loads.findIndex(l => l.id === bid.loadId);
      if (loadIndex !== -1) {
        this.loads[loadIndex].status = 'assigned';
      }

      this.saveToStorage();
      return true;
    }
    return false;
  }

  createMessage(messageData: Omit<Message, 'id' | 'createdAt'>): Message {
    const message: Message = {
      ...messageData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    this.messages.push(message);
    this.saveToStorage();
    return message;
  }

  getUserMessages(userId: string): Message[] {
    return this.messages.filter(msg => 
      msg.senderId === userId || msg.receiverId === userId
    );
  }

  uploadDocument(docData: Omit<Document, 'id' | 'uploadedAt' | 'verificationStatus'>): Document {
    const document: Document = {
      ...docData,
      id: Date.now().toString(),
      verificationStatus: 'pending',
      uploadedAt: new Date().toISOString()
    };
    this.documents.push(document);
    this.saveToStorage();
    return document;
  }

  getUserDocuments(userId: string): Document[] {
    return this.documents.filter(doc => doc.userId === userId);
  }

  getAllDocuments(): Document[] {
    return this.documents;
  }

  updateDocumentStatus(docId: string, status: Document['verificationStatus'], adminNotes?: string): boolean {
    const docIndex = this.documents.findIndex(d => d.id === docId);
    if (docIndex !== -1) {
      this.documents[docIndex].verificationStatus = status;
      if (adminNotes) {
        this.documents[docIndex].adminNotes = adminNotes;
      }
      this.saveToStorage();
      return true;
    }
    return false;
  }

  // Clear localStorage and reinitialize (for debugging)
  resetData() {
    localStorage.removeItem('fleetxchange_users');
    localStorage.removeItem('fleetxchange_loads');
    localStorage.removeItem('fleetxchange_bids');
    localStorage.removeItem('fleetxchange_messages');
    localStorage.removeItem('fleetxchange_documents');
    this.initializeAdminAccounts();
  }
}

export const authService = new AuthService();