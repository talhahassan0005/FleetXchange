import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, Package, MessageSquare, LogOut, DollarSign, FileText, BarChart3,
  TrendingUp, Activity, Clock, CheckCircle, Eye, MapPin, Calendar, Download,
  MessageCircle, Edit, Trash2, X
} from 'lucide-react';
import { authService, User } from '@/lib/auth';
import { api, User as ApiUser, Load, Bid, Message } from '@/lib/api';
import { websocketService } from '@/lib/websocket';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import DocumentUpload from '@/components/DocumentUpload';
import FormsDownload from '@/components/FormsDownload';
import ChatInterface from '@/components/ChatInterface';
import LoadFinancials from '@/components/LoadFinancials';

interface ClientPortalProps {
  user: User;
  onLogout: () => void;
}

export default function ClientPortal({ user: propUser, onLogout }: ClientPortalProps) {
  const [user, setUser] = useState<User | null>(propUser);

  // Convert auth service user to API user format
  const convertToApiUser = (authUser: User): ApiUser => {
    return {
      id: authUser.id,
      email: authUser.email,
      userType: authUser.userType.toUpperCase() as 'ADMIN' | 'CLIENT' | 'TRANSPORTER',
      status: authUser.status.toUpperCase() as 'ACTIVE' | 'PENDING' | 'REJECTED' | 'SUSPENDED',
      companyName: authUser.profile.companyName,
      contactPerson: authUser.profile.contactPerson,
      phone: authUser.profile.phone,
      address: authUser.profile.address,
      businessRegistration: authUser.profile.businessRegistration,
      taxId: authUser.profile.taxId,
      createdAt: authUser.createdAt,
      lastLogin: authUser.lastLogin
    };
  };
  const [loads, setLoads] = useState<Load[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState(() => {
    // Initialize activeTab from localStorage or default to 'overview'
    const savedTab = localStorage.getItem('clientPortalActiveTab');
    return savedTab || 'overview';
  });
  const [loadsPage, setLoadsPage] = useState(1);
  const [bidsPage, setBidsPage] = useState(1);
  const [hasMoreLoads, setHasMoreLoads] = useState(true);
  const [hasMoreBids, setHasMoreBids] = useState(true);
  const [newLoad, setNewLoad] = useState({
    title: '',
    description: '',
    cargoType: '',
    weight: '',
    pickupLocation: '',
    deliveryLocation: '',
    pickupDate: '',
    deliveryDate: '',
    budgetMin: '',
    budgetMax: '',
    currency: 'USD'
  });
  const [editingLoadId, setEditingLoadId] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // For load creation/update
  const [selectedTransporter, setSelectedTransporter] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    console.log('ClientPortal useEffect running...');
    console.log('Prop user:', propUser);
    if (propUser) {
      console.log('User from props found, loading data...');
      // Reset chat state on page load/refresh
      setSelectedTransporter(null);
      // Start loading data immediately, don't wait
      loadData(propUser);
    } else {
      console.log('No user from props, setting loading to false');
      setIsLoading(false);
    }
  }, [propUser]);

  // WebSocket real-time updates
  useEffect(() => {
    if (!user) return;

    // Connect to WebSocket
    websocketService.connect();

    // Listen for new bids
    const handleNewBid = (data: any) => {
      console.log('🔔 [CLIENT] New bid received via WebSocket:', data);
      // Refresh bids to show the new bid
      api.bids.getAll({ page: 1, limit: 20 }).then(bidsData => {
        console.log('✅ [CLIENT] Bids refreshed after new bid');
        setBids(bidsData.bids || []);
      }).catch(error => {
        console.error('❌ [CLIENT] Failed to refresh bids after new bid:', error);
      });
    };

    // Listen for bid status changes
    const handleBidStatusChanged = (data: any) => {
      console.log('🔔 Bid status changed:', data);
      // Refresh bids to show updated status
      api.bids.getAll({ page: 1, limit: 20 }).then(bidsData => {
        setBids(bidsData.bids || []);
      }).catch(error => {
        console.error('Failed to refresh bids after status change:', error);
      });
    };

    // Listen for document uploads
    const handleDocumentUploaded = (data: any) => {
      console.log('🔔 [CLIENT] Document uploaded via WebSocket:', data);
      // Signal DocumentUpload component to refresh (non-invasive)
      try {
        window.dispatchEvent(new CustomEvent('documents:refresh'));
        console.log('✅ [CLIENT] Dispatched documents:refresh event');
      } catch (err) {
        console.error('❌ [CLIENT] Failed to dispatch documents:refresh event', err);
      }
    };

    // Listen for document verification updates
    const handleDocumentVerified = (data: any) => {
      console.log('🔔 [CLIENT] Document verified via WebSocket:', data);
      // Signal DocumentUpload component to refresh (non-invasive)
      try {
        window.dispatchEvent(new CustomEvent('documents:refresh'));
        console.log('✅ Dispatched documents:refresh event after verification');
      } catch (err) {
        console.error('Failed to dispatch documents:refresh event after verification:', err);
      }
    };

    // Incoming new message handler
    const handleNewMessage = (data: any) => {
      console.log('🔔 [CLIENT] New message via WebSocket:', data);
      if (data && data.receiverId === user?.id) {
        setUnreadCount(prev => (prev || 0) + 1);
      }
      // Refresh conversations to include the new message
      refreshUnreadCountAndConversations();
    };

    const handleMessageSent = (data: any) => {
      console.log('🔔 [CLIENT] Message sent confirmation via WebSocket:', data);
      // Refresh conversations so sent message appears immediately
      refreshUnreadCountAndConversations();
    };

    // Register event listeners - using new event names
    websocketService.on('new_bid', handleNewBid);
    websocketService.on('bid_status_changed', handleBidStatusChanged);
    websocketService.on('document_uploaded', handleDocumentUploaded);
    websocketService.on('document_verified', handleDocumentVerified);
    websocketService.on('message-received', handleNewMessage); // Updated event name
    websocketService.on('message-sent', handleMessageSent); // Updated event name

    // Cleanup function
    return () => {
      websocketService.off('new_bid', handleNewBid);
      websocketService.off('bid_status_changed', handleBidStatusChanged);
      websocketService.off('document_uploaded', handleDocumentUploaded);
      websocketService.off('document_verified', handleDocumentVerified);
      websocketService.off('message-received', handleNewMessage);
      websocketService.off('message-sent', handleMessageSent);
    };
  }, [user]);

  // Auto-refresh DISABLED - WebSocket handles real-time updates
  // Only refresh unread count occasionally (less intrusive)
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(async () => {
      try {
        // Only refresh unread count, not all data
        const unreadResponse = await api.messages.getUnreadCount();
        setUnreadCount(unreadResponse.unreadCount || 0);
        
        // Removed: No automatic refresh of loads, bids, messages
        // WebSocket handles real-time updates instead
        
        
      } catch (error) {
        console.error('Failed to refresh unread count:', error);
      }
    }, 60000); // Changed from 30 to 60 seconds, only for unread count

    return () => clearInterval(interval);
  }, [user]);

  const loadData = async (userData?: any) => {
    const currentUser = userData || user;
    if (!currentUser) {
      console.log('No current user found');
      return;
    }
    
    console.log('Loading data for user:', currentUser.email);
    
    try {
      // Always show loading on initial data load
      setIsLoading(true);
      
      // Load ALL data in parallel for faster loading (like AdminPortal)
      console.log('Loading all client data in parallel...');
      const [loadsResponse, unreadResponse, bidsResponse, messagesResponse, docsResponse] = await Promise.all([
        api.loads.getAll({ clientId: currentUser.id, page: 1, limit: 10 }),
        api.messages.getUnreadCount(),
        api.bids.getAll({ page: 1, limit: 20 }),
        api.messages.getAll({ page: 1, limit: 50 }),
        api.documents.getByUser(currentUser.id, { page: 1, limit: 50 }).catch(err => {
          console.error('Failed to check document verification status:', err);
          return [];
        })
      ]);
      
      console.log('All client data loaded successfully');
      
      // Set loads immediately with pagination info
      setLoads(loadsResponse.loads || []);
      setLoadsPage(1);
      setHasMoreLoads(loadsResponse.pagination?.page < loadsResponse.pagination?.pages);
      setUnreadCount(unreadResponse.unreadCount || 0);

      // Check document verification status for posting loads
      const docs = Array.isArray(docsResponse) ? docsResponse : [];
      const approved = docs.some((d: any) => d.verificationStatus === 'APPROVED');
      setIsVerified(approved);
      console.log('Document verification status for user:', approved);
      
      console.log('Secondary data loaded');
      
      // Set bids with pagination info
      setBids(bidsResponse.bids || []);
      setBidsPage(1);
      setHasMoreBids(bidsResponse.pagination?.page < bidsResponse.pagination?.pages);
      
      // Set messages and conversations
      const userMessages = messagesResponse.messages || [];
      setMessages(userMessages);
      
      // Group messages by conversation (transporter only - single conversation per transporter)
      const conversationMap = new Map();
      userMessages.forEach(message => {
        // Use only transporter ID as key for single conversation per transporter (ignore loadId)
        const transporterId = message.senderId === currentUser.id ? message.receiverId : message.senderId;
        const transporterName = message.senderId === currentUser.id ? message.receiver?.companyName : message.sender?.companyName;
        
        if (!conversationMap.has(transporterId)) {
          conversationMap.set(transporterId, {
            transporterId: transporterId,
            transporterName: transporterName,
            lastMessage: message.message,
            lastMessageTime: message.createdAt,
            unreadCount: 0,
            messages: []
          });
        }
        const conversation = conversationMap.get(transporterId);
        conversation.messages.push(message);
        if (message.receiverId === currentUser.id && !message.isRead) {
          conversation.unreadCount++;
        }
        // Update last message if this is newer
        if (new Date(message.createdAt) > new Date(conversation.lastMessageTime)) {
          conversation.lastMessage = message.message;
          conversation.lastMessageTime = message.createdAt;
        }
      });
      
      // Convert to array and sort by last message time
      const conversationsArray = Array.from(conversationMap.values())
        .sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
      setConversations(conversationsArray);
      
      console.log('✅ All data loaded successfully with lazy loading');
    } catch (error) {
      console.error('Failed to load data:', error);
      alert('Failed to load data. Please refresh the page.');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to refresh unread count and conversations
  const refreshUnreadCountAndConversations = async () => {
    if (!user) return;
    
    try {
      const unreadResponse = await api.messages.getUnreadCount();
      setUnreadCount(unreadResponse.unreadCount || 0);
      
      // Update conversations unread count
      const messagesData = await api.messages.getAll();
      const userMessages = messagesData.messages || [];
      
      // Group messages by conversation - CLIENT should only see TRANSPORTERS
      const conversationMap = new Map();
      userMessages.forEach(message => {
        // Determine the other user (not current user)
        const otherUserId = message.senderId === user.id ? message.receiverId : message.senderId;
        const otherUser = message.senderId === user.id ? message.receiver : message.sender;
        const otherUserName = otherUser?.companyName || 'Unknown';
        const otherUserType = otherUser?.userType;
        
        // CLIENT (logged in user) should only see TRANSPORTER conversations
        // Skip if other user is not a TRANSPORTER
        if (user.userType === 'CLIENT' && otherUserType !== 'TRANSPORTER') {
          return; // Skip this message
        }
        
        // Use otherUserId as unique key to prevent duplicates
        if (!conversationMap.has(otherUserId)) {
          conversationMap.set(otherUserId, {
            transporterId: otherUserId, // Keep this name for backward compatibility
            transporterName: otherUserName, // Keep this name for backward compatibility
            otherUserId: otherUserId,
            otherUserName: otherUserName,
            otherUserType: otherUserType,
            lastMessage: message.message || message.content || '',
            lastMessageTime: message.createdAt,
            unreadCount: 0,
            messages: []
          });
        }
        const conversation = conversationMap.get(otherUserId);
        conversation.messages.push(message);
        if (message.receiverId === user.id && !message.isRead) {
          conversation.unreadCount++;
        }
        // Update last message if this is newer
        if (new Date(message.createdAt) > new Date(conversation.lastMessageTime)) {
          conversation.lastMessage = message.message || message.content || '';
          conversation.lastMessageTime = message.createdAt;
        }
      });
      
      // Convert to array and sort by last message time
      const conversationsArray = Array.from(conversationMap.values())
        .sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
      setConversations(conversationsArray);
    } catch (error) {
      console.error('Failed to refresh unread count:', error);
    }
  };

  const handleLogout = () => {
    // Clear localStorage on logout
    localStorage.removeItem('clientPortalActiveTab');
    authService.logout();
    onLogout();
  };

  const handleCreateLoad = async () => {
    if (!user) return;
    if (isSubmitting) return; // Prevent double submission
    
    if (!isVerified) {
      alert('Your account is under verification. You cannot post loads until your documents are approved.');
      return;
    }
    
    console.log('=== LOAD CREATION START ===');
    console.log('User:', user.email);
    console.log('Load data:', newLoad);
    console.log('Current editingLoadId:', editingLoadId);
    console.log('Is Edit Mode:', !!editingLoadId);
    
    // Frontend validation
    if (!newLoad.title.trim()) {
      alert('Please enter a title for the load.');
      return;
    }
    
    if (!newLoad.description.trim()) {
      alert('Please enter a description for the load.');
      return;
    }
    
    if (!newLoad.cargoType.trim()) {
      alert('Please select a cargo type.');
      return;
    }
    
    if (!newLoad.weight || parseFloat(newLoad.weight) <= 0) {
      alert('Please enter a valid weight (greater than 0).');
      return;
    }
    
    if (!newLoad.pickupLocation.trim()) {
      alert('Please enter a pickup location.');
      return;
    }
    
    if (!newLoad.deliveryLocation.trim()) {
      alert('Please enter a delivery location.');
      return;
    }
    
    if (!newLoad.pickupDate) {
      alert('Please select a pickup date.');
      return;
    }
    
    if (!newLoad.deliveryDate) {
      alert('Please select a delivery date.');
      return;
    }
    
    const pickupDate = new Date(newLoad.pickupDate);
    const deliveryDate = new Date(newLoad.deliveryDate);
    
    if (deliveryDate <= pickupDate) {
      alert('Delivery date must be after pickup date.');
      return;
    }
    
    if (!newLoad.budgetMin || parseFloat(newLoad.budgetMin) <= 0) {
      alert('Please enter a valid minimum budget (greater than 0).');
      return;
    }
    
    if (!newLoad.budgetMax || parseFloat(newLoad.budgetMax) <= 0) {
      alert('Please enter a valid maximum budget (greater than 0).');
      return;
    }
    
    const budgetMin = parseFloat(newLoad.budgetMin);
    const budgetMax = parseFloat(newLoad.budgetMax);
    
    if (budgetMax < budgetMin) {
      alert('Maximum budget must be greater than or equal to minimum budget.');
      return;
    }
    
    try {
      setIsSubmitting(true); // Show loading state
      
      const loadPayload = {
        title: newLoad.title.trim(),
        description: newLoad.description.trim(),
        cargoType: newLoad.cargoType.trim(),
        weight: parseFloat(newLoad.weight),
        pickupLocation: newLoad.pickupLocation.trim(),
        deliveryLocation: newLoad.deliveryLocation.trim(),
        pickupDate: pickupDate.toISOString(),
        deliveryDate: deliveryDate.toISOString(),
        budgetMin: budgetMin,
        budgetMax: budgetMax,
        currency: newLoad.currency
      };

      console.log('=== LOAD CREATION START ===');
      console.log('User:', user?.email);
      console.log('Load data:', loadPayload);
      console.log('Editing Load ID:', editingLoadId);
      console.log('Is Edit Mode:', !!editingLoadId);
      console.log('Sending load data to API...');
      
      let response;
      if (editingLoadId) {
        // Update existing load
        console.log('API Request: PUT /loads/' + editingLoadId);
        response = await api.loads.update(editingLoadId, loadPayload);
        console.log('✅ Load updated successfully:', response);
      } else {
        // Create new load
        console.log('API Request: POST /loads');
        response = await api.loads.create(loadPayload);
        console.log('✅ Load created successfully:', response);
      }
      
      // Show success message IMMEDIATELY before any data refresh
      const successMessage = editingLoadId ? 'Load updated successfully!' : 'Load created successfully!';
      console.log('Showing success message:', successMessage);
      alert(successMessage);
      
      // Reset form and close dialog IMMEDIATELY for instant UX
      setNewLoad({
        title: '',
        description: '',
        cargoType: '',
        weight: '',
        pickupLocation: '',
        deliveryLocation: '',
        pickupDate: '',
        deliveryDate: '',
        budgetMin: '',
        budgetMax: '',
        currency: 'USD'
      });
      setEditingLoadId(null);
      setIsEditDialogOpen(false);
      setIsCreateDialogOpen(false);
      
      // Refresh data in background (non-blocking)
      console.log('Refreshing loads data in background...');
      loadData(user).then(() => {
        console.log('✅ Data refreshed successfully');
      }).catch(err => {
        console.error('Failed to refresh data:', err);
      });
      
      console.log('=== LOAD CREATION COMPLETE ===');
    } catch (error: any) {
      console.error('Failed to create/update load:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url,
        method: error.config?.method
      });
      
      // Check if it's a timeout error
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        // If timeout, refresh data anyway as the load might have been created on server
        console.log('Request timed out, refreshing data to check if load was created...');
        await loadData(user);
        alert('Request timed out, but please check if your load was created successfully.');
      } else {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to create load. Please try again.';
        alert(`Error: ${errorMessage}`);
      }
    } finally {
      setIsSubmitting(false); // Hide loading state
    }
  };

  const handleAcceptBid = async (bidId: string) => {
    try {
      // Accept the bid via API
      await api.bids.accept(bidId);
      
      // Refresh data to get updated bid status and load assignment
      await loadData(user);
      
      alert('Bid accepted successfully!');
    } catch (error: any) {
      console.error('Failed to accept bid:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to accept bid. Please try again.';
      alert(errorMessage);
    }
  };

  const handleRejectBid = async (bidId: string) => {
    try {
      // Reject the bid via API
      await api.bids.reject(bidId);
      
      // Refresh data to get updated bid status
      await loadData(user);
      
      alert('Bid rejected successfully!');
    } catch (error: any) {
      console.error('Failed to reject bid:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to reject bid. Please try again.';
      alert(errorMessage);
    }
  };

  const handleEditLoad = (load: any) => {
    console.log('=== EDIT LOAD START ===');
    console.log('Load to edit:', load);
    console.log('Load ID:', load.id);
    
    // Set the load data to the form for editing
    setNewLoad({
      title: load.title,
      description: load.description,
      cargoType: load.cargoType,
      weight: load.weight.toString(),
      pickupLocation: load.pickupLocation,
      deliveryLocation: load.deliveryLocation,
      pickupDate: load.pickupDate.split('T')[0], // Convert ISO date to YYYY-MM-DD format
      deliveryDate: load.deliveryDate.split('T')[0],
      budgetMin: load.budgetMin.toString(),
      budgetMax: load.budgetMax.toString(),
      currency: load.currency || 'USD'
    });
    
    console.log('Setting editingLoadId to:', load.id);
    setEditingLoadId(load.id);
    setIsEditDialogOpen(true);
    console.log('=== EDIT LOAD COMPLETE ===');
  };

  const handleDeleteLoad = async (loadId: string) => {
    if (confirm('Are you sure you want to delete this load? This action cannot be undone.')) {
      try {
        // Delete the load via API
        await api.loads.delete(loadId);
        
        // Refresh data to get updated loads list
        await loadData(user);
        
        alert('Load deleted successfully!');
      } catch (error: any) {
        console.error('Failed to delete load:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to delete load. Please try again.';
        alert(errorMessage);
      }
    }
  };

  const getLoadBids = (loadId: string) => {
    return bids.filter(bid => bid.loadId === loadId);
  };

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
      active: "default",
      assigned: "secondary",
      completed: "outline"
    };
    const colors: { [key: string]: string } = {
      active: "bg-green-100 text-green-800",
      assigned: "bg-blue-100 text-blue-800",
      completed: "bg-purple-100 text-purple-800"
    };
    return (
      <Badge variant={variants[status] || "outline"} className={colors[status] || ""}>
        {status}
      </Badge>
    );
  };

  // Dynamic stats calculation
  const calculateStats = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Calculate dynamic stats
    const totalLoads = loads.length;
    const activeLoads = loads.filter(load => load.status === 'ACTIVE').length;
    const completedLoads = loads.filter(load => load.status === 'COMPLETED').length;
    
    const totalBids = bids.length;
    const bidsThisWeek = bids.filter(bid => {
      const bidDate = new Date(bid.createdAt);
      return bidDate >= weekAgo;
    }).length;

    const totalSpent = loads.reduce((sum, load) => {
      const loadBids = bids.filter(bid => bid.loadId === load.id);
      if (loadBids.length > 0) {
        const acceptedBid = loadBids.find(bid => bid.status === 'WON');
        return sum + (acceptedBid?.amount || 0);
      }
      return sum;
    }, 0);

    const avgBidAmount = totalBids > 0 ? Math.round(totalSpent / totalBids) : 0;

    return {
      totalLoads,
      activeLoads,
      completedLoads,
      totalBids,
      bidsThisWeek,
      totalSpent,
      avgBidAmount
    };
  };

  const stats = calculateStats();

  // Generate dynamic load stats data for charts
  const generateLoadStatsData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    
    return months.slice(Math.max(0, currentMonth - 5), currentMonth + 1).map((month, index) => {
      const monthIndex = months.indexOf(month);
      const monthLoads = loads.filter(load => {
        const loadDate = new Date(load.createdAt);
        return loadDate.getMonth() === monthIndex;
      });
      
      const monthCompleted = monthLoads.filter(load => load.status === 'COMPLETED');
      const monthRevenue = monthCompleted.reduce((sum, load) => {
        const loadBids = bids.filter(bid => bid.loadId === load.id);
        const acceptedBid = loadBids.find(bid => bid.status === 'WON');
        return sum + (acceptedBid?.amount || 0);
      }, 0);
      
      return {
        month,
        posted: monthLoads.length,
        completed: monthCompleted.length,
        revenue: monthRevenue
      };
    });
  };

  const loadStatsData = generateLoadStatsData();

  // Generate dynamic cargo type data
  const generateCargoTypeData = () => {
    const cargoTypes: { [key: string]: number } = {};
    
    loads.forEach(load => {
      const cargoType = load.cargoType || 'Other';
      cargoTypes[cargoType] = (cargoTypes[cargoType] || 0) + 1;
    });

    const colors = ['#0A1C3F', '#33A852', '#6E6E6E', '#1E40AF', '#DC2626', '#7C3AED'];
    
    return Object.entries(cargoTypes).map(([name, value], index) => ({
      name,
      value,
      color: colors[index % colors.length]
    }));
  };

  const cargoTypeData = generateCargoTypeData();

  const navigationItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'loads', label: 'My Loads', icon: Package },
    { id: 'bids', label: 'Bid Management', icon: DollarSign },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'forms', label: 'Forms', icon: Download },
    { id: 'messages', label: 'Messages', icon: MessageSquare, badge: unreadCount > 0 ? unreadCount : undefined },
    { id: 'review', label: 'Review PODs/Invoices', icon: FileText }
  ];

  if (!propUser) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header with Top Navigation - EXACT MATCH TO ADMIN PORTAL */}
      <header className="bg-white shadow-lg border-b-2" style={{ borderColor: '#0A1C3F' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="mr-4">
                <img 
                  src="/assets/fleetxchange-logo.png" 
                  alt="FleetXchange Logo" 
                  className="h-12 w-auto"
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: '#0A1C3F' }}>
                  FleetXchange Client
                </h1>
                <p className="text-sm" style={{ color: '#6E6E6E' }}>Client Management Portal</p>
              </div>
            </div>
            <Button 
              onClick={handleLogout} 
              variant="outline" 
              className="border-2 transition-colors"
              style={{ borderColor: '#0A1C3F', color: '#0A1C3F' }}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
          
          {/* Top Navigation - EXACT MATCH TO ADMIN PORTAL */}
          <nav className="flex space-x-8 -mb-px overflow-x-auto">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === 'review') {
                      navigate('/client/review');
                    } else {
                      setActiveTab(item.id);
                      localStorage.setItem('clientPortalActiveTab', item.id);
                    }
                  }}
                  className={`flex items-center px-1 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === item.id
                      ? 'text-white'
                      : 'border-transparent hover:border-gray-300'
                  }`}
                  style={{ 
                    borderBottomColor: activeTab === item.id ? '#0A1C3F' : 'transparent',
                    color: activeTab === item.id ? '#0A1C3F' : '#6E6E6E'
                  }}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {item.label}
                  {item.badge && (
                    <Badge variant="destructive" className="ml-2 text-xs">
                      {item.badge}
                    </Badge>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600">Loading client data...</p>
            </div>
          </div>
        ) : (
          <>
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards - Dynamic Data */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="text-white" style={{ background: 'linear-gradient(135deg, #0A1C3F 0%, #33A852 100%)' }}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Loads</CardTitle>
                  <Package className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.activeLoads}</div>
                  <p className="text-xs opacity-80">
                    {stats.totalLoads > 0 ? Math.round((stats.activeLoads / stats.totalLoads) * 100) : 0}% of total loads
                  </p>
                </CardContent>
              </Card>

              <Card className="text-white" style={{ background: 'linear-gradient(135deg, #33A852 0%, #0A1C3F 100%)' }}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Bids</CardTitle>
                  <DollarSign className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalBids}</div>
                  <p className="text-xs opacity-80">
                    {stats.bidsThisWeek} bids this week
                  </p>
                </CardContent>
              </Card>

              <Card className="text-white" style={{ backgroundColor: '#6E6E6E' }}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completed</CardTitle>
                  <CheckCircle className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.completedLoads}</div>
                  <p className="text-xs opacity-80">
                    {stats.totalLoads > 0 ? Math.round((stats.completedLoads / stats.totalLoads) * 100) : 0}% completion rate
                  </p>
                </CardContent>
              </Card>

              <Card className="text-white" style={{ background: 'linear-gradient(135deg, #0A1C3F 0%, #6E6E6E 100%)' }}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                  <DollarSign className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${(stats.totalSpent / 1000).toFixed(1)}K</div>
                  <p className="text-xs opacity-80">
                    Avg: ${stats.avgBidAmount.toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts - EXACT MATCH TO ADMIN PORTAL */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center" style={{ color: '#0A1C3F' }}>
                    <TrendingUp className="mr-2 h-5 w-5" />
                    Load Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={loadStatsData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="posted" stroke="#0A1C3F" strokeWidth={2} name="Posted" />
                      <Line type="monotone" dataKey="completed" stroke="#33A852" strokeWidth={2} name="Completed" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center" style={{ color: '#0A1C3F' }}>
                    <Activity className="mr-2 h-5 w-5" />
                    Cargo Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={cargoTypeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {cargoTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Revenue Chart - EXACT MATCH TO ADMIN PORTAL */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center" style={{ color: '#0A1C3F' }}>
                  <DollarSign className="mr-2 h-5 w-5" />
                  Spending Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={loadStatsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="revenue" fill="#33A852" name="Spending ($)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'loads' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center" style={{ color: '#0A1C3F' }}>
                <Package className="mr-2 h-5 w-5" />
                Load Management
              </CardTitle>
              <CardDescription>Create and manage your shipping loads</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                {/* Create Load Dialog */}
                {isVerified ? (
                  <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        className="text-white"
                        style={{ backgroundColor: '#33A852' }}
                        onClick={() => {
                          setEditingLoadId(null);
                          setNewLoad({
                            title: '',
                            description: '',
                            cargoType: '',
                            weight: '',
                            pickupLocation: '',
                            deliveryLocation: '',
                            pickupDate: '',
                            deliveryDate: '',
                            budgetMin: '',
                            budgetMax: '',
                            currency: 'USD'
                          });
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Post New Load
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle style={{ color: '#0A1C3F' }}>
                          Post New Load
                        </DialogTitle>
                        <DialogDescription>
                          Create a new shipping load for transporters to bid on
                        </DialogDescription>
                      </DialogHeader>
                      <div id="load-form" className="grid grid-cols-2 gap-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="title">Load Title</Label>
                          <Input
                            id="title"
                            value={newLoad.title}
                            onChange={(e) => setNewLoad({...newLoad, title: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cargoType">Cargo Type</Label>
                          <Input
                            id="cargoType"
                            value={newLoad.cargoType}
                            onChange={(e) => setNewLoad({...newLoad, cargoType: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="weight">Weight (tons)</Label>
                          <Input
                            id="weight"
                            type="number"
                            value={newLoad.weight}
                            onChange={(e) => setNewLoad({...newLoad, weight: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="pickupLocation">Pickup Location</Label>
                          <Input
                            id="pickupLocation"
                            value={newLoad.pickupLocation}
                            onChange={(e) => setNewLoad({...newLoad, pickupLocation: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="deliveryLocation">Delivery Location</Label>
                          <Input
                            id="deliveryLocation"
                            value={newLoad.deliveryLocation}
                            onChange={(e) => setNewLoad({...newLoad, deliveryLocation: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="pickupDate">Pickup Date</Label>
                          <Input
                            id="pickupDate"
                            type="date"
                            value={newLoad.pickupDate}
                            onChange={(e) => setNewLoad({...newLoad, pickupDate: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="deliveryDate">Delivery Date</Label>
                          <Input
                            id="deliveryDate"
                            type="date"
                            value={newLoad.deliveryDate}
                            onChange={(e) => setNewLoad({...newLoad, deliveryDate: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="budgetMin">Min Budget</Label>
                          <Input
                            id="budgetMin"
                            type="number"
                            value={newLoad.budgetMin}
                            onChange={(e) => setNewLoad({...newLoad, budgetMin: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="budgetMax">Max Budget</Label>
                          <Input
                            id="budgetMax"
                            type="number"
                            value={newLoad.budgetMax}
                            onChange={(e) => setNewLoad({...newLoad, budgetMax: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="currency">Currency</Label>
                          <Select value={newLoad.currency} onValueChange={(value) => setNewLoad({...newLoad, currency: value})}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select currency" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="USD">USD - US Dollar</SelectItem>
                              <SelectItem value="EUR">EUR - Euro</SelectItem>
                              <SelectItem value="GBP">GBP - British Pound</SelectItem>
                              <SelectItem value="ZAR">ZAR - South African Rand</SelectItem>
                              <SelectItem value="NGN">NGN - Nigerian Naira</SelectItem>
                              <SelectItem value="KES">KES - Kenyan Shilling</SelectItem>
                              <SelectItem value="EGP">EGP - Egyptian Pound</SelectItem>
                              <SelectItem value="GHS">GHS - Ghanaian Cedi</SelectItem>
                              <SelectItem value="TZS">TZS - Tanzanian Shilling</SelectItem>
                              <SelectItem value="UGX">UGX - Ugandan Shilling</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-2 space-y-2">
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            value={newLoad.description}
                            onChange={(e) => setNewLoad({...newLoad, description: e.target.value})}
                          />
                        </div>
                      </div>
                      <Button 
                        onClick={handleCreateLoad} 
                        className="w-full text-white"
                        style={{ backgroundColor: '#33A852' }}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <span className="animate-spin mr-2">⏳</span>
                            Posting Load...
                          </>
                        ) : (
                          'Post Load'
                        )}
                      </Button>
                    </DialogContent>
                  </Dialog>
                ) : (
                  <div style={{ display: 'inline-block' }}>
                    <Button 
                      className="text-white opacity-80 cursor-not-allowed"
                      style={{ backgroundColor: '#9CA3AF' }}
                      onClick={() => alert('Your account is under verification. You will be able to post loads once your documents are approved.')}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Post New Load
                    </Button>
                  </div>
                )}

                {/* Edit Load Dialog */}
                <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
                  console.log('Edit dialog onOpenChange:', open);
                  setIsEditDialogOpen(open);
                  if (!open) {
                    console.log('Dialog closed, resetting editingLoadId and form');
                    setEditingLoadId(null);
                    setNewLoad({
                      title: '',
                      description: '',
                      cargoType: '',
                      weight: '',
                      pickupLocation: '',
                      deliveryLocation: '',
                      pickupDate: '',
                      deliveryDate: '',
                      budgetMin: '',
                      budgetMax: '',
                      currency: 'USD'
                    });
                  }
                }}>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle style={{ color: '#0A1C3F' }}>
                        Edit Load
                      </DialogTitle>
                      <DialogDescription>
                        Update the shipping load details
                      </DialogDescription>
                    </DialogHeader>
                    <div id="edit-load-form" className="grid grid-cols-2 gap-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-title">Load Title</Label>
                        <Input
                          id="edit-title"
                          value={newLoad.title}
                          onChange={(e) => setNewLoad({...newLoad, title: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-cargoType">Cargo Type</Label>
                        <Select value={newLoad.cargoType} onValueChange={(value) => setNewLoad({...newLoad, cargoType: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select cargo type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="General">General</SelectItem>
                            <SelectItem value="Fragile">Fragile</SelectItem>
                            <SelectItem value="Hazardous">Hazardous</SelectItem>
                            <SelectItem value="Temperature Controlled">Temperature Controlled</SelectItem>
                            <SelectItem value="Oversized">Oversized</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-weight">Weight (kg)</Label>
                        <Input
                          id="edit-weight"
                          type="number"
                          value={newLoad.weight}
                          onChange={(e) => setNewLoad({...newLoad, weight: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-pickupLocation">Pickup Location</Label>
                        <Input
                          id="edit-pickupLocation"
                          value={newLoad.pickupLocation}
                          onChange={(e) => setNewLoad({...newLoad, pickupLocation: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-deliveryLocation">Delivery Location</Label>
                        <Input
                          id="edit-deliveryLocation"
                          value={newLoad.deliveryLocation}
                          onChange={(e) => setNewLoad({...newLoad, deliveryLocation: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-pickupDate">Pickup Date</Label>
                        <Input
                          id="edit-pickupDate"
                          type="date"
                          value={newLoad.pickupDate}
                          onChange={(e) => setNewLoad({...newLoad, pickupDate: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-deliveryDate">Delivery Date</Label>
                        <Input
                          id="edit-deliveryDate"
                          type="date"
                          value={newLoad.deliveryDate}
                          onChange={(e) => setNewLoad({...newLoad, deliveryDate: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-budgetMin">Min Budget</Label>
                        <Input
                          id="edit-budgetMin"
                          type="number"
                          value={newLoad.budgetMin}
                          onChange={(e) => setNewLoad({...newLoad, budgetMin: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-budgetMax">Max Budget</Label>
                        <Input
                          id="edit-budgetMax"
                          type="number"
                          value={newLoad.budgetMax}
                          onChange={(e) => setNewLoad({...newLoad, budgetMax: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-currency">Currency</Label>
                        <Select value={newLoad.currency} onValueChange={(value) => setNewLoad({...newLoad, currency: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD - US Dollar</SelectItem>
                            <SelectItem value="EUR">EUR - Euro</SelectItem>
                            <SelectItem value="GBP">GBP - British Pound</SelectItem>
                            <SelectItem value="ZAR">ZAR - South African Rand</SelectItem>
                            <SelectItem value="NGN">NGN - Nigerian Naira</SelectItem>
                            <SelectItem value="KES">KES - Kenyan Shilling</SelectItem>
                            <SelectItem value="EGP">EGP - Egyptian Pound</SelectItem>
                            <SelectItem value="GHS">GHS - Ghanaian Cedi</SelectItem>
                            <SelectItem value="TZS">TZS - Tanzanian Shilling</SelectItem>
                            <SelectItem value="UGX">UGX - Ugandan Shilling</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2 space-y-2">
                        <Label htmlFor="edit-description">Description</Label>
                        <Textarea
                          id="edit-description"
                          value={newLoad.description}
                          onChange={(e) => setNewLoad({...newLoad, description: e.target.value})}
                          rows={3}
                        />
                      </div>
                    </div>
                    <Button 
                      onClick={handleCreateLoad} 
                      className="w-full text-white"
                      style={{ backgroundColor: '#33A852' }}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <span className="animate-spin mr-2">⏳</span>
                          Updating Load...
                        </>
                      ) : (
                        'Update Load'
                      )}
                    </Button>
                  </DialogContent>
                </Dialog>
              </div>
              
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Bids Received</TableHead>
                      <TableHead>Budget Range</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loads.map((load) => (
                      <TableRow key={load.id}>
                        <TableCell className="font-medium">{load.title}</TableCell>
                        <TableCell>
                          {load.pickupLocation} → {load.deliveryLocation}
                        </TableCell>
                        <TableCell>{getStatusBadge(load.status)}</TableCell>
                        <TableCell>
                          <span className="font-medium">{getLoadBids(load.id).length}</span>
                        </TableCell>
                        <TableCell>
                          <span style={{ color: '#33A852' }} className="font-medium">
                            {load.currency || 'USD'} {load.budgetMin.toLocaleString()} - {load.currency || 'USD'} {load.budgetMax.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                          <Dialog>
                            <DialogTrigger asChild>
                                <Button size="sm" variant="outline" title="View Details">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Load Details</DialogTitle>
                                <DialogDescription>
                                  View detailed information about this load
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label>Title</Label>
                                    <p className="text-sm font-medium">{load.title}</p>
                                  </div>
                                  <div>
                                    <Label>Status</Label>
                                    {getStatusBadge(load.status)}
                                  </div>
                                  <div>
                                    <Label>Pickup Location</Label>
                                    <p className="text-sm">{load.pickupLocation}</p>
                                  </div>
                                  <div>
                                    <Label>Delivery Location</Label>
                                    <p className="text-sm">{load.deliveryLocation}</p>
                                  </div>
                                  <div>
                                    <Label>Cargo Type</Label>
                                    <p className="text-sm">{load.cargoType}</p>
                                  </div>
                                  <div>
                                    <Label>Weight</Label>
                                    <p className="text-sm">{load.weight} tons</p>
                                  </div>
                                  <div>
                                    <Label>Pickup Date</Label>
                                    <p className="text-sm">{new Date(load.pickupDate).toLocaleDateString()}</p>
                                  </div>
                                  <div>
                                    <Label>Delivery Date</Label>
                                    <p className="text-sm">{new Date(load.deliveryDate).toLocaleDateString()}</p>
                                  </div>
                                  <div>
                                    <Label>Budget Range</Label>
                                    <p className="text-sm font-medium" style={{ color: '#33A852' }}>
                                      {load.currency || 'USD'} {load.budgetMin.toLocaleString()} - {load.currency || 'USD'} {load.budgetMax.toLocaleString()}
                                    </p>
                                  </div>
                                  <div>
                                    <Label>Bids Received</Label>
                                    <p className="text-sm font-medium">{getLoadBids(load.id).length}</p>
                                  </div>
                                </div>
                                <div>
                                  <Label>Description</Label>
                                  <p className="text-sm">{load.description}</p>
                                </div>
                                {getLoadBids(load.id).length > 0 && (
                                  <div>
                                    <Label>Bids</Label>
                                    <div className="space-y-2">
                                      {getLoadBids(load.id).map((bid) => (
                                        <div key={bid.id} className="flex items-center justify-between p-2 border rounded-md">
                                          <div>
                                            <p className="text-sm font-medium">USD {bid.amount.toLocaleString()}</p>
                                            <p className="text-xs text-gray-500">Bid ID: {bid.id}</p>
                                          </div>
                                          {getStatusBadge(bid.status)}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="mt-4">
                                <LoadFinancials loadId={load.id} currentUserId={user!.id} currentUserType={(user!.userType as string).toUpperCase() as 'ADMIN' | 'CLIENT' | 'TRANSPORTER'} />
                              </div>
                            </DialogContent>
                          </Dialog>
                          
                          {/* Bid & POD/Invoice Management */}
                          {getLoadBids(load.id).length > 0 && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="outline" title="Manage Bids" style={{ backgroundColor: '#33A852', color: 'white' }}>
                                  <DollarSign className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Bid Management - {load.title}</DialogTitle>
                                  <DialogDescription>
                                    Review and manage bids for this load
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  {getLoadBids(load.id).map((bid) => (
                                    <div key={bid.id} className="border rounded-lg p-4">
                                      <div className="flex justify-between items-start mb-3">
                                        <div>
                                          <h4 className="font-semibold">Bid #{bid.id}</h4>
                                          <p className="text-sm text-gray-600">Transporter: {bid.transporter?.companyName || 'Unknown'}</p>
                                        </div>
                                        <div className="text-right">
                                          <p className="text-lg font-bold" style={{ color: '#33A852' }}>
                                            ${bid.amount.toLocaleString()}
                                          </p>
                                          {getStatusBadge(bid.status)}
                                        </div>
                                      </div>
                                      {/* Transporter PODs for this load */}
                                      <div className="mb-3">
                                        <h5 className="font-medium">Proof of Delivery</h5>
                                        <div className="text-sm text-gray-600">Uploaded PODs from transporter will appear below when available.</div>
                                        <div id={`client-pods-${load.id}`}></div>
                                      </div>

                                      <div className="grid grid-cols-2 gap-4 mb-3">
                                        <div>
                                          <Label className="text-xs text-gray-500">Proposed Pickup</Label>
                                          <p className="text-sm">{new Date(bid.pickupDate).toLocaleDateString()}</p>
                                        </div>
                                        <div>
                                          <Label className="text-xs text-gray-500">Proposed Delivery</Label>
                                          <p className="text-sm">{new Date(bid.deliveryDate).toLocaleDateString()}</p>
                                        </div>
                                      </div>
                                      
                                      {bid.comments && (
                                        <div className="mb-3">
                                          <Label className="text-xs text-gray-500">Comments</Label>
                                          <p className="text-sm bg-gray-50 p-2 rounded">{bid.comments}</p>
                                        </div>
                                      )}
                                      
                                      <div className="flex space-x-2">
                                        <Button 
                                          size="sm" 
                                          style={{ backgroundColor: '#33A852', color: 'white' }}
                                          onClick={() => handleAcceptBid(bid.id)}
                                          disabled={bid.status === 'WON' || bid.status === 'LOST'}
                                        >
                                          Accept Bid
                                        </Button>
                                        <Button 
                                          size="sm" 
                                          variant="outline"
                                          onClick={() => handleRejectBid(bid.id)}
                                          disabled={bid.status === 'WON' || bid.status === 'LOST'}
                                        >
                                          Reject Bid
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                          
                          {/* Edit Load Button */}
                          <Button 
                            size="sm" 
                            variant="outline" 
                            title="Edit Load"
                            onClick={() => handleEditLoad(load)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          
                          {/* Delete Load Button */}
                          <Button 
                            size="sm" 
                            variant="outline" 
                            title="Delete Load"
                            style={{ color: 'red' }}
                            onClick={() => handleDeleteLoad(load.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'bids' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center" style={{ color: '#0A1C3F' }}>
                <DollarSign className="mr-2 h-5 w-5" />
                Bid Management
              </CardTitle>
              <CardDescription>Review and accept bids from transporters</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Load</TableHead>
                      <TableHead>Transporter</TableHead>
                      <TableHead>Bid Amount</TableHead>
                      <TableHead>Pickup Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bids.filter(bid => loads.some(load => load.id === bid.loadId)).map((bid) => {
                      const load = loads.find(l => l.id === bid.loadId);
                      return (
                        <TableRow key={bid.id}>
                          <TableCell className="font-medium">{load?.title}</TableCell>
                          <TableCell>Transporter #{bid.transporterId.slice(-4)}</TableCell>
                          <TableCell>
                            <span className="font-medium" style={{ color: '#33A852' }}>
                              ${bid.amount.toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell>{bid.pickupDate}</TableCell>
                          <TableCell>{getStatusBadge(bid.status)}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                onClick={() => handleAcceptBid(bid.id)}
                                className="text-white"
                                style={{ backgroundColor: '#33A852' }}
                                disabled={bid.status === 'WON' || bid.status === 'LOST'}
                                title="Accept Bid"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRejectBid(bid.id)}
                                disabled={bid.status === 'WON' || bid.status === 'LOST'}
                                title="Reject Bid"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  // Navigate to messages tab and open specific transporter chat
                                  setActiveTab('messages');
                                  // Set the selected transporter for chat with loadId
                                  if (bid.transporter) {
                                    setSelectedTransporter({
                                      ...bid.transporter,
                                      loadId: bid.loadId
                                    });
                                  }
                                }}
                                title="Message Transporter"
                              >
                                <MessageCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'documents' && <DocumentUpload />}

        {activeTab === 'forms' && <FormsDownload />}

        {activeTab === 'messages' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center" style={{ color: '#0A1C3F' }}>
                <MessageSquare className="mr-2 h-5 w-5" />
                Messages
              </CardTitle>
              <CardDescription>
                {selectedTransporter 
                  ? `Chat with ${selectedTransporter.companyName || selectedTransporter.email}`
                  : 'Communication with transporters'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedTransporter ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium" style={{ color: '#0A1C3F' }}>
                        Chat with {selectedTransporter.companyName || selectedTransporter.email}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedTransporter(null)}
                    >
                      Back to Messages
                    </Button>
                  </div>
                  {(() => {
                    const selectedLoad = loads.find(l => l.id === selectedTransporter.loadId);
                    // Even if load not found, show chat interface
                    // The ChatInterface can work with or without load details
                    return (
                      <ChatInterface
                        loadId={selectedTransporter.loadId || ''}
                        load={selectedLoad || null}
                        currentUser={convertToApiUser(user)}
                        onBack={() => setSelectedTransporter(null)}
                        bids={bids}
                        onMessageSent={refreshUnreadCountAndConversations}
                        onMessageRead={refreshUnreadCountAndConversations}
                      />
                    );
                  })()}
                </div>
              ) : (
              <div className="space-y-4">
                {conversations.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4" style={{ color: '#6E6E6E' }} />
                    <p style={{ color: '#6E6E6E' }}>No conversations yet</p>
                    <p className="text-sm" style={{ color: '#6E6E6E' }}>Conversations will appear here when you communicate with transporters</p>
                  </div>
                ) : (
                  conversations.map((conversation) => (
                    <div 
                      key={conversation.transporterId} 
                      className="border rounded-lg p-4 hover:bg-purple-50 transition-colors cursor-pointer"
                      onClick={() => {
                        // Find the load associated with this conversation
                        const conversationMessages = messages.filter(msg => 
                          msg.senderId === conversation.transporterId || msg.receiverId === conversation.transporterId
                        );
                        const loadId = conversationMessages.length > 0 ? conversationMessages[0].loadId : null;
                        
                        if (loadId) {
                          // Find the transporter info and set up chat in the same page
                          const transporterInfo = {
                            transporterId: conversation.transporterId,
                            companyName: conversation.transporterName,
                            loadId: loadId
                          };
                          setSelectedTransporter(transporterInfo);
                        } else {
                          alert('Unable to find load information for this conversation');
                        }
                      }}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium" style={{ color: '#0A1C3F' }}>
                            {conversation.transporterName}
                          </span>
                          <span className="text-sm" style={{ color: '#6E6E6E' }}>
                            - Transporter
                          </span>
                          {conversation.unreadCount > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {conversation.unreadCount}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm" style={{ color: '#6E6E6E' }}>
                            {new Date(conversation.lastMessageTime).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <p style={{ color: '#6E6E6E' }} className="truncate">
                        {conversation.lastMessage}
                      </p>
                    </div>
                  ))
                )}
              </div>
              )}
            </CardContent>
          </Card>
        )}
        </>
        )}
      </main>
    </div>
  );
}