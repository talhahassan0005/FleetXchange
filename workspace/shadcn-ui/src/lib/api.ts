// FleetXchange API Client
import axios, { AxiosInstance, AxiosResponse } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Increased from 10s to 30s for load creation
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
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error) => {
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
  currency: string;
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
  message: string; // Changed from content to message to match backend
  messageType: 'TEXT' | 'BID_NOTIFICATION' | 'STATUS_UPDATE' | 'GENERAL' | 'SYSTEM'; // Changed from type to messageType
  isRead: boolean;
  loadId?: string;
  createdAt: string;
  sender?: {
    id: string;
    companyName: string;
    contactPerson: string;
  };
  receiver?: {
    id: string;
    companyName: string;
    contactPerson: string;
  };
  load?: {
    id: string;
    title: string;
    client?: {
      id: string;
      companyName: string;
    };
    transporter?: {
      id: string;
      companyName: string;
    };
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
    // register is defined below with a typed signature
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
    },
    verifyEmail: async (token: string) => {
      const response = await apiClient.post('/auth/verify-email', { token });
      return response.data;
    },
    resendVerification: async (email: string) => {
      const response = await apiClient.post('/auth/resend-verification', { email });
      return response.data;
    },
    register: async (userData: {
      email: string;
      password: string;
      userType: 'CLIENT' | 'TRANSPORTER';
      companyName: string;
      contactPerson: string;
      phone?: string;
      address?: string;
      businessRegistration?: string;
      taxId?: string;
    }) => {
      const response = await apiClient.post('/auth/register', userData);
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
    getByLoad: async (loadId: string) => {
      const response = await apiClient.get(`/bids?loadId=${loadId}`);
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
    reject: async (id: string) => {
      const response = await apiClient.put(`/bids/${id}/reject`);
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
    getByUser: async (userId: string, params?: any) => {
      const response = await apiClient.get(`/documents/user/${userId}`, { params });
      return response.data.documents;
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
    getByLoad: async (loadId: string) => {
      const response = await apiClient.get(`/messages/load/${loadId}`);
      return response.data;
    },
    create: async (messageData: any) => {
      const response = await apiClient.post('/messages', messageData);
      return response.data;
    },
    markAsRead: async (id: string) => {
      const response = await apiClient.put(`/messages/${id}/read`);
      return response.data;
    },
    getUnreadCount: async () => {
      const response = await apiClient.get('/messages/unread/count');
      return response.data;
    },
    getConversation: async (userId: string, params?: any) => {
      const response = await apiClient.get(`/messages/conversation/${userId}`, { params });
      return response.data;
    },
    delete: async (id: string) => {
      const response = await apiClient.delete(`/messages/${id}`);
      return response.data;
    },
    deleteConversation: async (otherUserId: string) => {
      const response = await apiClient.delete(`/messages/conversation/${otherUserId}`);
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

  // PODs / Proof of Delivery
  pods: {
    create: async (podData: any) => {
      const response = await apiClient.post('/pods', podData);
      return response.data;
    },
    getByLoad: async (loadId: string) => {
      const response = await apiClient.get(`/pods/load/${loadId}`);
      return response.data;
    },
    updateStatus: async (podId: string, status: string) => {
      const response = await apiClient.put(`/pods/${podId}/status`, { status });
      return response.data;
    },
    clientReview: async (podId: string, approve: boolean) => {
      const response = await apiClient.put(`/pods/${podId}/client-review`, { approve });
      return response.data;
    },
    getAll: async (params?: any) => {
      const response = await apiClient.get('/pods', { params });
      return response.data;
    }
  },

  // Invoices
  invoices: {
    submitTransporterInvoice: async (invoiceData: any) => {
      const response = await apiClient.post('/invoices/transporter', invoiceData);
      return response.data;
    },
    generateClientInvoice: async (data: any) => {
      const response = await apiClient.post('/invoices/admin/generate-client-invoice', data);
      return response.data;
    },
    updateStatus: async (invoiceId: string, status: string) => {
      const response = await apiClient.put(`/invoices/${invoiceId}/status`, { status });
      return response.data;
    },
    clientReview: async (invoiceId: string, approve: boolean) => {
      const response = await apiClient.put(`/invoices/${invoiceId}/client-review`, { approve });
      return response.data;
    },
    getByLoad: async (loadId: string) => {
      const response = await apiClient.get(`/invoices/load/${loadId}`);
      return response.data;
    }
  },

  // Payments
  payments: {
    initiatePayment: async (paymentData: any) => {
      const response = await apiClient.post('/payments/pay', paymentData);
      return response.data;
    },
    updateStatus: async (paymentId: string, status: string) => {
      const response = await apiClient.put(`/payments/${paymentId}/status`, { status });
      return response.data;
    },
    getByLoad: async (loadId: string) => {
      const response = await apiClient.get(`/payments/load/${loadId}`);
      return response.data;
    }
  },

  // Health check
  health: async () => {
    const response = await apiClient.get('/health', {
      baseURL: 'http://localhost:5000'
    });
    return response.data;
  }
};

export default api;