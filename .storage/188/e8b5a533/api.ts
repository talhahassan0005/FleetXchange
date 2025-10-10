// FleetXchange API Client
import axios, { AxiosInstance, AxiosResponse } from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management
let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('fleetxchange_token', token);
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
    localStorage.removeItem('fleetxchange_token');
  }
};

// Initialize token from localStorage
const storedToken = localStorage.getItem('fleetxchange_token');
if (storedToken) {
  setAuthToken(storedToken);
}

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    console.log(`🌐 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('❌ API Response Error:', error.response?.data || error.message);
    
    // Handle 401 errors (token expired)
    if (error.response?.status === 401) {
      setAuthToken(null);
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

// API Interface Types
export interface User {
  id: string;
  email: string;
  userType: 'ADMIN' | 'CLIENT' | 'TRANSPORTER';
  status: 'ACTIVE' | 'PENDING' | 'REJECTED' | 'SUSPENDED';
  companyName: string;
  contactPerson: string;
  phone: string;
  address: string;
  businessRegistration?: string;
  taxId?: string;
  createdAt: string;
  lastLogin?: string;
}

export interface Load {
  id: string;
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
  status: 'ACTIVE' | 'ASSIGNED' | 'COMPLETED' | 'CANCELLED';
  clientId: string;
  assignedTransporterId?: string;
  createdAt: string;
  client?: {
    id: string;
    companyName: string;
    contactPerson: string;
  };
  assignedTransporter?: {
    id: string;
    companyName: string;
    contactPerson: string;
  };
  _count?: {
    bids: number;
  };
}

export interface Bid {
  id: string;
  loadId: string;
  transporterId: string;
  amount: number;
  pickupDate: string;
  deliveryDate: string;
  comments?: string;
  status: 'ACTIVE' | 'WON' | 'LOST' | 'WITHDRAWN';
  createdAt: string;
  load?: {
    id: string;
    title: string;
    client?: {
      id: string;
      companyName: string;
      contactPerson: string;
    };
  };
  transporter?: {
    id: string;
    companyName: string;
    contactPerson: string;
  };
}

export interface Document {
  id: string;
  userId: string;
  fileName: string;
  fileUrl: string;
  documentType: string;
  verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'MORE_INFO_REQUIRED';
  uploadedAt: string;
  verifiedAt?: string;
  adminNotes?: string;
  user?: {
    id: string;
    companyName: string;
    contactPerson: string;
  };
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  message: string;
  messageType: 'BID_NOTIFICATION' | 'STATUS_UPDATE' | 'GENERAL' | 'SYSTEM';
  isRead: boolean;
  loadId?: string;
  createdAt: string;
  sender?: {
    id: string;
    companyName: string;
    contactPerson: string;
  };
  load?: {
    id: string;
    title: string;
  };
}

// API Methods
export const api = {
  // Authentication
  auth: {
    login: async (email: string, password: string) => {
      const response = await apiClient.post('/auth/login', { email, password });
      return response.data;
    },
    register: async (userData: any) => {
      const response = await apiClient.post('/auth/register', userData);
      return response.data;
    },
    getProfile: async () => {
      const response = await apiClient.get('/auth/profile');
      return response.data;
    },
    updateProfile: async (profileData: any) => {
      const response = await apiClient.put('/auth/profile', profileData);
      return response.data;
    },
    changePassword: async (currentPassword: string, newPassword: string) => {
      const response = await apiClient.put('/auth/change-password', {
        currentPassword,
        newPassword
      });
      return response.data;
    },
    refreshToken: async () => {
      const response = await apiClient.post('/auth/refresh');
      return response.data;
    }
  },

  // Users
  users: {
    getAll: async (params?: any) => {
      const response = await apiClient.get('/users', { params });
      return response.data;
    },
    getById: async (id: string) => {
      const response = await apiClient.get(`/users/${id}`);
      return response.data;
    },
    updateStatus: async (id: string, status: string, reason?: string) => {
      const response = await apiClient.put(`/users/${id}/status`, { status, reason });
      return response.data;
    },
    delete: async (id: string) => {
      const response = await apiClient.delete(`/users/${id}`);
      return response.data;
    },
    getStats: async () => {
      const response = await apiClient.get('/users/stats/overview');
      return response.data;
    }
  },

  // Loads
  loads: {
    getAll: async (params?: any) => {
      const response = await apiClient.get('/loads', { params });
      return response.data;
    },
    getById: async (id: string) => {
      const response = await apiClient.get(`/loads/${id}`);
      return response.data;
    },
    create: async (loadData: any) => {
      const response = await apiClient.post('/loads', loadData);
      return response.data;
    },
    update: async (id: string, loadData: any) => {
      const response = await apiClient.put(`/loads/${id}`, loadData);
      return response.data;
    },
    updateStatus: async (id: string, status: string) => {
      const response = await apiClient.put(`/loads/${id}/status`, { status });
      return response.data;
    },
    delete: async (id: string) => {
      const response = await apiClient.delete(`/loads/${id}`);
      return response.data;
    }
  },

  // Bids
  bids: {
    getAll: async (params?: any) => {
      const response = await apiClient.get('/bids', { params });
      return response.data;
    },
    getById: async (id: string) => {
      const response = await apiClient.get(`/bids/${id}`);
      return response.data;
    },
    create: async (bidData: any) => {
      const response = await apiClient.post('/bids', bidData);
      return response.data;
    },
    update: async (id: string, bidData: any) => {
      const response = await apiClient.put(`/bids/${id}`, bidData);
      return response.data;
    },
    accept: async (id: string) => {
      const response = await apiClient.put(`/bids/${id}/accept`);
      return response.data;
    },
    withdraw: async (id: string) => {
      const response = await apiClient.put(`/bids/${id}/withdraw`);
      return response.data;
    },
    delete: async (id: string) => {
      const response = await apiClient.delete(`/bids/${id}`);
      return response.data;
    }
  },

  // Documents
  documents: {
    getAll: async (params?: any) => {
      const response = await apiClient.get('/documents', { params });
      return response.data;
    },
    getById: async (id: string) => {
      const response = await apiClient.get(`/documents/${id}`);
      return response.data;
    },
    create: async (documentData: any) => {
      const response = await apiClient.post('/documents', documentData);
      return response.data;
    },
    verify: async (id: string, status: string, adminNotes?: string) => {
      const response = await apiClient.put(`/documents/${id}/verify`, { 
        verificationStatus: status, 
        adminNotes 
      });
      return response.data;
    },
    update: async (id: string, documentData: any) => {
      const response = await apiClient.put(`/documents/${id}`, documentData);
      return response.data;
    },
    delete: async (id: string) => {
      const response = await apiClient.delete(`/documents/${id}`);
      return response.data;
    },
    getStats: async () => {
      const response = await apiClient.get('/documents/stats/overview');
      return response.data;
    }
  },

  // Messages
  messages: {
    getAll: async (params?: any) => {
      const response = await apiClient.get('/messages', { params });
      return response.data;
    },
    getById: async (id: string) => {
      const response = await apiClient.get(`/messages/${id}`);
      return response.data;
    },
    send: async (messageData: any) => {
      const response = await apiClient.post('/messages', messageData);
      return response.data;
    },
    markAsRead: async (id: string) => {
      const response = await apiClient.put(`/messages/${id}/read`);
      return response.data;
    },
    getConversation: async (userId: string, params?: any) => {
      const response = await apiClient.get(`/messages/conversation/${userId}`, { params });
      return response.data;
    },
    getUnreadCount: async () => {
      const response = await apiClient.get('/messages/unread/count');
      return response.data;
    },
    delete: async (id: string) => {
      const response = await apiClient.delete(`/messages/${id}`);
      return response.data;
    }
  },

  // File Upload
  upload: {
    single: async (file: File, documentType: string) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', documentType);
      
      const response = await apiClient.post('/upload/single', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    multiple: async (files: File[], documentType: string) => {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      formData.append('documentType', documentType);
      
      const response = await apiClient.post('/upload/multiple', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    getFile: async (filename: string) => {
      const response = await apiClient.get(`/upload/file/${filename}`, {
        responseType: 'blob'
      });
      return response.data;
    },
    downloadFile: async (filename: string) => {
      const response = await apiClient.get(`/upload/download/${filename}`, {
        responseType: 'blob'
      });
      return response.data;
    },
    deleteFile: async (filename: string) => {
      const response = await apiClient.delete(`/upload/file/${filename}`);
      return response.data;
    },
    getFileInfo: async (filename: string) => {
      const response = await apiClient.get(`/upload/info/${filename}`);
      return response.data;
    }
  },

  // Health check
  health: async () => {
    const response = await apiClient.get('/health');
    return response.data;
  }
};

export default api;