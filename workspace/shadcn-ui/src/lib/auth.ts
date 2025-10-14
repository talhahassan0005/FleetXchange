// FleetXchange Authentication Service - Backend API Integration
import { api, setAuthToken, User as ApiUser } from './api';

// Legacy interface for backward compatibility
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
  password?: string; // Only used for legacy compatibility
  userType: 'admin' | 'client' | 'transporter';
  status: 'active' | 'pending' | 'rejected' | 'suspended';
  profile: UserProfile;
  createdAt: string;
  lastLogin?: string;
}

// Convert API user to legacy format
const convertApiUserToLegacy = (apiUser: ApiUser): User => {
  return {
    id: apiUser.id,
    email: apiUser.email,
    userType: apiUser.userType.toLowerCase() as 'admin' | 'client' | 'transporter',
    status: apiUser.status.toLowerCase() as 'active' | 'pending' | 'rejected' | 'suspended',
    profile: {
      companyName: apiUser.companyName,
      contactPerson: apiUser.contactPerson,
      phone: apiUser.phone,
      address: apiUser.address,
      businessRegistration: apiUser.businessRegistration,
      taxId: apiUser.taxId
    },
    createdAt: apiUser.createdAt,
    lastLogin: apiUser.lastLogin
  };
};

class AuthService {
  private currentUser: User | null = null;

  constructor() {
    console.log('🚀 AuthService initialized with backend API integration');
    this.initializeFromTokenSync();
  }

  private initializeFromTokenSync() {
    const token = localStorage.getItem('fleetxchange_token');
    const storedUser = localStorage.getItem('fleetxchange_user');
    
    if (token && storedUser) {
      try {
        setAuthToken(token);
        // Use stored user data for immediate availability
        this.currentUser = JSON.parse(storedUser);
        console.log('✅ User restored from localStorage:', this.currentUser.email);
        
        // Verify token in background (non-blocking)
        this.verifyTokenInBackground();
      } catch (error) {
        console.log('❌ Invalid stored data, clearing authentication');
        this.logout();
      }
    } else if (token) {
      // Token exists but no user data, need to fetch profile
      setAuthToken(token);
      console.log('⚠️ Token found but no user data, will fetch profile');
    }
  }

  private async verifyTokenInBackground() {
    try {
      const response = await api.auth.getProfile();
      this.currentUser = convertApiUserToLegacy(response.user);
      // Update stored user data
      localStorage.setItem('fleetxchange_user', JSON.stringify(this.currentUser));
      console.log('✅ Token verified and user data updated');
    } catch (error) {
      console.log('⚠️ Token verification failed, but keeping user logged in');
    }
  }

  async login(email: string, password: string): Promise<User | null> {
    console.log('🔐 === BACKEND LOGIN ATTEMPT START ===');
    console.log('📧 Email:', email);
    console.log('🌐 Using backend API for authentication');
    
    try {
      const response = await api.auth.login(email, password);
      
      if (response.user && response.token) {
        // Set the auth token for future requests
        setAuthToken(response.token);
        
        // Convert API user to legacy format
        this.currentUser = convertApiUserToLegacy(response.user);
        
        // Store user data in localStorage for persistence
        localStorage.setItem('fleetxchange_user', JSON.stringify(this.currentUser));
        
          // Notify other parts of the app that login occurred
          try {
            window.dispatchEvent(new CustomEvent('auth:login', { detail: { user: this.currentUser } }));
          } catch (err) {
            console.warn('Failed to dispatch auth:login event', err);
          }

        console.log('✅ Backend login successful!');
        console.log('👤 User:', {
          id: this.currentUser.id,
          email: this.currentUser.email,
          userType: this.currentUser.userType,
          status: this.currentUser.status
        });
        
        return this.currentUser;
      } else {
        console.log('❌ Backend login failed: Invalid response format');
        return null;
      }
    } catch (error: any) {
      console.error('❌ Backend login error:', error.response?.data || error.message);
      
      // Clear any invalid tokens
      this.logout();
      
      return null;
    }
  }

  logout() {
    console.log('👋 User logged out - clearing backend authentication');
    this.currentUser = null;
    setAuthToken(null);
    localStorage.removeItem('fleetxchange_user');
    try {
      window.dispatchEvent(new CustomEvent('auth:logout'));
    } catch (err) {
      console.warn('Failed to dispatch auth:logout event', err);
    }
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  // Legacy methods for backward compatibility with existing components
  getAllUsers(): User[] {
    console.log('⚠️ getAllUsers() called - this should be replaced with API calls');
    return [];
  }

  getUserLoads(userId: string): any[] {
    console.log('⚠️ getUserLoads() called - this should be replaced with API calls');
    return [];
  }

  getAllLoads(): any[] {
    console.log('⚠️ getAllLoads() called - this should be replaced with API calls');
    return [];
  }

  createLoad(loadData: any): any {
    console.log('⚠️ createLoad() called - this should be replaced with API calls');
    return null;
  }

  getAllBids(): any[] {
    console.log('⚠️ getAllBids() called - this should be replaced with API calls');
    return [];
  }

  getUserBids(userId: string): any[] {
    console.log('⚠️ getUserBids() called - this should be replaced with API calls');
    return [];
  }

  createBid(bidData: any): any {
    console.log('⚠️ createBid() called - this should be replaced with API calls');
    return null;
  }

  acceptBid(bidId: string): void {
    console.log('⚠️ acceptBid() called - this should be replaced with API calls');
  }

  updateUserStatus(userId: string, status: string): void {
    console.log('⚠️ updateUserStatus() called - this should be replaced with API calls');
  }

  getAllDocuments(): any[] {
    console.log('⚠️ getAllDocuments() called - this should be replaced with API calls');
    return [];
  }

  getUserDocuments(userId: string): any[] {
    console.log('⚠️ getUserDocuments() called - this should be replaced with API calls');
    return [];
  }

  uploadDocument(documentData: any): any {
    console.log('⚠️ uploadDocument() called - this should be replaced with API calls');
    return null;
  }

  verifyDocument(documentId: string, status: string, adminNotes?: string): void {
    console.log('⚠️ verifyDocument() called - this should be replaced with API calls');
  }

  getUserMessages(userId: string): any[] {
    console.log('⚠️ getUserMessages() called - this should be replaced with API calls');
    return [];
  }

  getAllMessages(): any[] {
    console.log('⚠️ getAllMessages() called - this should be replaced with API calls');
    return [];
  }

  // CRITICAL: getStatistics method for admin dashboard - now uses backend API
  async getStatistics() {
    try {
      console.log('📊 Fetching statistics from backend API...');
      const response = await api.users.getStats();
      
      const stats = {
        totalUsers: response.stats.totalUsers,
        activeUsers: response.stats.activeUsers,
        pendingUsers: response.stats.pendingUsers,
        totalLoads: 0, // Will be updated when loads API is integrated
        activeLoads: 0,
        completedLoads: 0,
        totalBids: 0,
        pendingDocuments: 0,
        unreadMessages: 0,
        clientUsers: response.stats.clientUsers,
        transporterUsers: response.stats.transporterUsers,
        adminUsers: response.stats.adminUsers
      };

      console.log('✅ Statistics fetched from backend:', stats);
      return stats;
    } catch (error) {
      console.error('❌ Error fetching statistics from backend:', error);
      
      // Fallback to empty stats
      return {
        totalUsers: 0,
        activeUsers: 0,
        pendingUsers: 0,
        totalLoads: 0,
        activeLoads: 0,
        completedLoads: 0,
        totalBids: 0,
        pendingDocuments: 0,
        unreadMessages: 0,
        clientUsers: 0,
        transporterUsers: 0,
        adminUsers: 0
      };
    }
  }

  // Utility method to check backend connection
  async checkBackendConnection(): Promise<boolean> {
    try {
      await api.health();
      console.log('✅ Backend connection successful');
      return true;
    } catch (error) {
      console.error('❌ Backend connection failed:', error);
      return false;
    }
  }

  // Debug method to check current state
  debugAuth(): void {
    console.log('🐛 === FleetXchange Auth Debug (Backend Mode) ===');
    console.log('👤 Current user:', this.currentUser);
    console.log('🔑 Token stored:', !!localStorage.getItem('fleetxchange_token'));
    console.log('🌐 Backend API mode: ENABLED');
    
    if (this.currentUser) {
      console.log('📋 User details:');
      console.log(`  Email: ${this.currentUser.email}`);
      console.log(`  Type: ${this.currentUser.userType}`);
      console.log(`  Status: ${this.currentUser.status}`);
      console.log(`  Company: ${this.currentUser.profile.companyName}`);
    }
  }

  // Method to register new users (for registration form)
  async register(userData: {
    email: string;
    password: string;
    userType: 'CLIENT' | 'TRANSPORTER';
    companyName: string;
    contactPerson: string;
    phone: string;
    address: string;
    businessRegistration?: string;
    taxId?: string;
  }): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      console.log('📝 Registering new user via backend API...');
      const response = await api.auth.register(userData);
      
      if (response.user && response.token) {
        setAuthToken(response.token);
        this.currentUser = convertApiUserToLegacy(response.user);
        
        console.log('✅ Registration successful:', this.currentUser.email);
        return { success: true, user: this.currentUser };
      } else {
        return { success: false, error: 'Invalid response from server' };
      }
    } catch (error: any) {
      console.error('❌ Registration error:', error.response?.data || error.message);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Registration failed' 
      };
    }
  }

  // Method to update user profile
  async updateProfile(profileData: Partial<UserProfile>): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      console.log('📝 Updating user profile via backend API...');
      const response = await api.auth.updateProfile(profileData);
      
      if (response.user) {
        this.currentUser = convertApiUserToLegacy(response.user);
        console.log('✅ Profile updated successfully');
        return { success: true, user: this.currentUser };
      } else {
        return { success: false, error: 'Invalid response from server' };
      }
    } catch (error: any) {
      console.error('❌ Profile update error:', error.response?.data || error.message);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Profile update failed' 
      };
    }
  }

  // Method to change password
  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔑 Changing password via backend API...');
      await api.auth.changePassword(currentPassword, newPassword);
      
      console.log('✅ Password changed successfully');
      return { success: true };
    } catch (error: any) {
      console.error('❌ Password change error:', error.response?.data || error.message);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Password change failed' 
      };
    }
  }

  // Method to get current token
  getToken(): string | null {
    return localStorage.getItem('fleetxchange_token');
  }
}

export const authService = new AuthService();

// Make debug methods available globally for troubleshooting
(window as any).fleetxchangeDebug = {
  debugAuth: () => authService.debugAuth(),
  checkBackend: () => authService.checkBackendConnection(),
  getCurrentUser: () => authService.getCurrentUser(),
  testLogin: (email: string, password: string) => authService.login(email, password)
};

console.log('🎯 FleetXchange AuthService loaded with backend API integration!');
console.log('🔧 Debug commands available: window.fleetxchangeDebug');