import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { 
  Search, Truck, DollarSign, MessageSquare, LogOut, Package, FileText, BarChart3,
  TrendingUp, Activity, Trophy, MapPin, Calendar, Clock, CheckCircle, Star, Trash2
} from 'lucide-react';
import { authService, User } from '@/lib/auth';
import { api, setAuthToken, User as ApiUser, Load, Bid, Message } from '@/lib/api';
import { websocketService } from '@/lib/websocket';
import { useNavigate, Navigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import DocumentUpload from '@/components/DocumentUpload';
import ChatInterface from '@/components/ChatInterface';
import LoadFinancials from '@/components/LoadFinancials';
import { toast } from 'sonner';

export default function TransporterPortal() {
  const [user, setUser] = useState<User | null>(null);

  // Convert auth service user to API user format
  const convertToApiUser = (authUser: User): ApiUser => {
    return {
      id: authUser.id,
      email: authUser.email,
      userType: (authUser.userType || 'TRANSPORTER').toString().toUpperCase() as 'ADMIN' | 'CLIENT' | 'TRANSPORTER',
      status: (authUser.status || 'ACTIVE').toString().toUpperCase() as 'ACTIVE' | 'PENDING' | 'REJECTED' | 'SUSPENDED',
      companyName: (authUser.profile?.companyName || ''),
      contactPerson: (authUser.profile?.contactPerson || ''),
      phone: (authUser.profile?.phone || ''),
      address: (authUser.profile?.address || ''),
      businessRegistration: authUser.profile?.businessRegistration,
      taxId: authUser.profile?.taxId,
      createdAt: authUser.createdAt,
      lastLogin: authUser.lastLogin
    };
  };
  const [loads, setLoads] = useState<Load[]>([]);
  const [myBids, setMyBids] = useState<Bid[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState(() => {
    // Initialize activeTab from localStorage or default to 'overview'
    const savedTab = localStorage.getItem('transporterPortalActiveTab');
    return savedTab || 'overview';
  });
  const [selectedLoad, setSelectedLoad] = useState<Load | null>(null);
  const [selectedBid, setSelectedBid] = useState<Bid | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [bidLoads, setBidLoads] = useState<{[key: string]: Load}>({});
  const [isLoading, setIsLoading] = useState(false); // Changed from loading to isLoading, false by default
  const [isSubmitting, setIsSubmitting] = useState(false); // For bid placement
  const [isVerified, setIsVerified] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showChat, setShowChat] = useState(false);
  const [chatLoad, setChatLoad] = useState<Load | null>(null);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [bidForm, setBidForm] = useState({
    amount: '',
    pickupDate: '',
    deliveryDate: '',
    comments: ''
  });
  const [bidErrors, setBidErrors] = useState<{ pickupDate?: string; deliveryDate?: string }>({});
  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        // Initialize optimistic verification from stored flag or ACTIVE status
        try {
          const stored = localStorage.getItem('transporter_verified');
          if (stored === 'true' || (currentUser.status && currentUser.status.toLowerCase() === 'active')) {
            setIsVerified(true);
          }
        } catch {}
        // Reset chat state on page load/refresh
        setSelectedClient(null);
        setShowChat(false);
        setChatLoad(null);
        // Start loading data immediately
        await loadData(currentUser);
        return;
      }

      // No cached user — check if token exists and fetch profile
      const token = authService.getToken();
      if (token) {
        try {
          // ensure axios has token header
          setAuthToken(token);
          const resp = await api.auth.getProfile();
          const apiUser: ApiUser = resp.user;
          const legacy = convertToApiUser as any; // noop to satisfy ts if needed
          // convert api user to legacy format used by authService
          const converted: User = {
            id: apiUser.id,
            email: apiUser.email,
            userType: apiUser.userType.toLowerCase() as 'admin' | 'client' | 'transporter',
            status: apiUser.status.toLowerCase() as 'active' | 'pending' | 'rejected' | 'suspended',
            profile: {
              companyName: apiUser.companyName || '',
              contactPerson: apiUser.contactPerson || '',
              phone: apiUser.phone || '',
              address: apiUser.address || '',
              businessRegistration: apiUser.businessRegistration,
              taxId: apiUser.taxId
            },
            createdAt: apiUser.createdAt,
            lastLogin: apiUser.lastLogin
          };

          // store and use
          setUser(converted);
          try { localStorage.setItem('fleetxchange_user', JSON.stringify(converted)); } catch (e) {}
          await loadData(converted);
          return;
        } catch (err) {
          console.error('Failed to restore user from token:', err);
        }
      }

      setIsLoading(false);
    };

    init();
  }, []);

  // WebSocket real-time updates
  useEffect(() => {
    if (!user) return;

    // Connect to WebSocket
    websocketService.connect();

    // Listen for bid status changes (acceptance/rejection)
    const handleBidStatusChanged = (data: any) => {
      console.log('🔔 [TRANSPORTER] Bid status changed via WebSocket:', data);
      // Refresh bids to show updated status
      api.bids.getAll({ page: 1, limit: 30 }).then(bidsData => {
        console.log('✅ [TRANSPORTER] Bids refreshed after status change');
        setMyBids(bidsData.bids.filter(bid => bid.transporterId === user.id));
      }).catch(error => {
        console.error('❌ [TRANSPORTER] Failed to refresh bids after status change:', error);
      });
    };

    // Listen for document uploads
    const handleDocumentUploaded = (data: any) => {
      console.log('🔔 [TRANSPORTER] Document uploaded via WebSocket:', data);
      // Signal DocumentUpload component to refresh (non-invasive)
      try {
        window.dispatchEvent(new CustomEvent('documents:refresh'));
        console.log('✅ [TRANSPORTER] Dispatched documents:refresh event');
      } catch (err) {
        console.error('❌ [TRANSPORTER] Failed to dispatch documents:refresh event', err);
      }
    };

    // Listen for incoming messages
    const handleNewMessage = (data: any) => {
      console.log('🔔 [TRANSPORTER] New message via WebSocket:', data);
      // Increment unread count if message is for current user
      if (data && data.receiverId === user.id) {
        setUnreadCount(prev => (prev || 0) + 1);
      }

      // Optionally refresh conversations list (lightweight)
      refreshUnreadCountAndConversations();
    };

    // Listen for confirmation of sent message to update UI immediately
    const handleMessageSent = (data: any) => {
      console.log('🔔 [TRANSPORTER] Message sent confirmation via WebSocket:', data);
      // Refresh messages in the current chat if applicable
      refreshUnreadCountAndConversations();
    };

    // Listen for document verification updates
    const handleDocumentVerified = (data: any) => {
      console.log('🔔 [TRANSPORTER] Document verified via WebSocket:', data);
      // Signal DocumentUpload component to refresh (non-invasive)
      try {
        window.dispatchEvent(new CustomEvent('documents:refresh'));
        console.log('✅ Dispatched documents:refresh event after verification');
      } catch (err) {
        console.error('Failed to dispatch documents:refresh event after verification:', err);
      }
    };

    // Register event listeners
    websocketService.on('bid_status_changed', handleBidStatusChanged);
    websocketService.on('document_uploaded', handleDocumentUploaded);
    websocketService.on('document_verified', handleDocumentVerified);
  websocketService.on('message-received', handleNewMessage); // Updated event name
  websocketService.on('message-sent', handleMessageSent); // Updated event name

    // Cleanup function
    return () => {
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
        // Only refresh unread count
        const unreadResponse = await api.messages.getUnreadCount();
        setUnreadCount(unreadResponse.unreadCount || 0);
      } catch (error) {
        console.error('Failed to refresh unread count:', error);
      }
    }, 60000); // 60 seconds, only for unread count

    return () => clearInterval(interval);
  }, [user]);

  // Fetch missing loads for bids
  useEffect(() => {
    if (myBids.length === 0) return;
    
    const fetchMissingLoads = async () => {
      const missingLoadIds = myBids
        .filter(bid => !loads.find(l => l.id === bid.loadId) && !bidLoads[bid.loadId])
        .map(bid => bid.loadId);
      
      if (missingLoadIds.length === 0) return;
      
      console.log('Fetching missing loads for bids:', missingLoadIds);
      
      const loadPromises = missingLoadIds.map(async (loadId) => {
        try {
          const loadData = await api.loads.getById(loadId);
          const actualLoad = loadData.load || loadData;
          return { loadId, load: actualLoad };
        } catch (error) {
          console.error(`Failed to fetch load ${loadId}:`, error);
          return null;
        }
      });
      
      const results = await Promise.all(loadPromises);
      const validResults = results.filter(result => result !== null);
      
      if (validResults.length > 0) {
        const newBidLoads = validResults.reduce((acc, { loadId, load }) => {
          acc[loadId] = load;
          return acc;
        }, {} as {[key: string]: Load});
        
        setBidLoads(prev => ({ ...prev, ...newBidLoads }));
      }
    };
    
    fetchMissingLoads();
  }, [myBids, loads, bidLoads]);

  const loadData = async (currentUser: User) => {
    try {
      // Always show loading on initial data load
      setIsLoading(true);
      
      // Load ALL data in parallel for faster loading (like AdminPortal)
      console.log('Loading all transporter data in parallel...');
      const [loadsData, unreadResponse, bidsData, messagesData, docsResponse] = await Promise.all([
        api.loads.getAll({ page: 1, limit: 20 }),
        api.messages.getUnreadCount(),
        api.bids.getAll({ page: 1, limit: 30 }),
        api.messages.getConversation(currentUser.id).catch(err => {
          console.debug('Messages fetch failed (non-blocking):', err?.response?.status || err?.message);
          return { messages: [] };
        }),
        currentUser?.id 
          ? api.documents.getByUser(currentUser.id, { page: 1, limit: 50 }).catch(err => {
              console.error('Failed to check transporter verification:', err);
              return [];
            })
          : Promise.resolve([])
      ]);
      
      console.log('All transporter data loaded successfully');
      
      // Set loads (all loads, not just active ones - needed for chat functionality)
      setLoads(loadsData.loads || []);
      setUnreadCount(unreadResponse.unreadCount || 0);
      
      // Set bids
      setMyBids(bidsData.bids.filter(bid => bid.transporterId === currentUser.id));
      
      // Set messages and conversations
      const userMessages = messagesData.messages || [];
      setMessages(userMessages);

      // Check document verification status for transporter
      if (!currentUser?.id) {
        console.warn('Current user id not available for verification check');
        // do not force false; keep whatever optimistic state we had
      } else {
        const docs = Array.isArray(docsResponse) ? docsResponse : [];
        const approved = docs.some((d: any) => (d.verificationStatus || '').toString().toUpperCase() === 'APPROVED');
        const activeStatus = (currentUser.status || '').toString().toLowerCase() === 'active';
        const verified = approved || activeStatus;
        setIsVerified(verified);
        if (verified) {
          try { localStorage.setItem('transporter_verified', 'true'); } catch {}
        }
        console.log('Transporter verification status:', { approvedDocs: approved, activeStatus, verified });
      }
      
      // Group messages by conversation (client only - single conversation per client)
      // Filter messages where transporter is involved for conversation grouping
      const transporterMessages = userMessages.filter(msg => 
        msg.senderId === currentUser.id || msg.receiverId === currentUser.id
      );
      
      // Group messages by conversation - TRANSPORTER should only see CLIENTS
      const conversationMap = new Map();
      transporterMessages.forEach(message => {
        // Determine the other user (not current user)
        const otherUserId = message.senderId === currentUser.id ? message.receiverId : message.senderId;
        const otherUser = message.senderId === currentUser.id ? message.receiver : message.sender;
        const otherUserName = otherUser?.companyName || 'Unknown';
        const otherUserType = otherUser?.userType;
        
        // TRANSPORTER (logged in user) should only see CLIENT conversations
        // Skip if other user is not a CLIENT
        if (currentUser.userType.toUpperCase() === 'TRANSPORTER' && otherUserType !== 'CLIENT') {
          return; // Skip this message
        }
        
        // Use otherUserId as unique key to prevent duplicates
        if (!conversationMap.has(otherUserId)) {
          conversationMap.set(otherUserId, {
            clientId: otherUserId, // Keep this name for backward compatibility
            clientName: otherUserName, // Keep this name for backward compatibility
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
        if (message.receiverId === currentUser.id && !message.isRead) {
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
      
      console.log('✅ All transporter data loaded successfully with lazy loading');
    } catch (error) {
      console.error('Failed to load transporter data:', error);
      // Fallback to empty arrays
      setLoads([]);
      setMyBids([]);
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    // Clear localStorage on logout
    localStorage.removeItem('transporterPortalActiveTab');
    authService.logout();
    navigate('/login');
  };

  const openChat = async (load: Load) => {
    try {
      // Validate load object
      if (!load || !load.id) {
        toast.error('Invalid load data', {
          description: 'Load information is missing or invalid.',
          duration: 4000,
        });
        return;
      }

      // Open chat directly (same as ClientPortal behavior)
      setChatLoad(load);
      setShowChat(true);
    } catch (error) {
      console.error('Failed to open chat:', error);
      toast.error('Failed to open chat', {
        description: 'Please try again.',
        duration: 4000,
      });
    }
  };

  const closeChat = () => {
    setShowChat(false);
    setChatLoad(null);
  };

  // Helper function to refresh unread count and conversations
  const refreshUnreadCountAndConversations = async () => {
    if (!user) return;
    
    try {
      const unreadResponse = await api.messages.getUnreadCount();
      setUnreadCount(unreadResponse.unreadCount || 0);
      
      // Update conversations unread count
  const messagesData = await api.messages.getConversation(user.id);
      const userMessages = messagesData.messages || [];
      
      const transporterMessages = userMessages.filter(msg => 
        msg.senderId === user.id || msg.receiverId === user.id
      );
      
      // Group messages by conversation - TRANSPORTER should only see CLIENTS
      const conversationMap = new Map();
      transporterMessages.forEach(message => {
        // Determine the other user (not current user)
        const otherUserId = message.senderId === user.id ? message.receiverId : message.senderId;
        const otherUser = message.senderId === user.id ? message.receiver : message.sender;
        const otherUserName = otherUser?.companyName || 'Unknown';
        const otherUserType = otherUser?.userType;
        
        // TRANSPORTER (logged in user) should only see CLIENT conversations
        // Skip if other user is not a CLIENT
        if (user.userType.toUpperCase() === 'TRANSPORTER' && otherUserType !== 'CLIENT') {
          return; // Skip this message
        }
        
        // Use otherUserId as unique key to prevent duplicates
        if (!conversationMap.has(otherUserId)) {
          conversationMap.set(otherUserId, {
            clientId: otherUserId, // Keep this name for backward compatibility
            clientName: otherUserName, // Keep this name for backward compatibility
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
        if (new Date(message.createdAt) > new Date(conversation.lastMessageTime)) {
          conversation.lastMessage = message.message || message.content || '';
          conversation.lastMessageTime = message.createdAt;
        }
      });
      
      const conversationsArray = Array.from(conversationMap.values())
        .sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
      setConversations(conversationsArray);
    } catch (error) {
      console.error('Failed to refresh unread count:', error);
    }
  };

  const handleSubmitBid = async () => {
    if (!selectedLoad || !user || isSubmitting) return;
    
    try {
      setIsSubmitting(true); // Show loading state
      
      // Inline validation for dates
      const newErrors: { pickupDate?: string; deliveryDate?: string } = {};
      const loadPickup = selectedLoad.pickupDate ? new Date(selectedLoad.pickupDate) : undefined;
      const loadDelivery = selectedLoad.deliveryDate ? new Date(selectedLoad.deliveryDate) : undefined;
      const proposedPickup = bidForm.pickupDate ? new Date(bidForm.pickupDate) : undefined;
      const proposedDelivery = bidForm.deliveryDate ? new Date(bidForm.deliveryDate) : undefined;
      if (loadPickup && proposedPickup && proposedPickup < new Date(loadPickup.toDateString())) {
        newErrors.pickupDate = 'Pickup cannot be before load pickup date';
      }
      if (proposedPickup && proposedDelivery && proposedDelivery < proposedPickup) {
        newErrors.deliveryDate = 'Delivery cannot be before proposed pickup';
      }
      if (loadDelivery && proposedDelivery && proposedDelivery > new Date(loadDelivery.toDateString())) {
        newErrors.deliveryDate = 'Delivery cannot be after load delivery date';
      }
      setBidErrors(newErrors);
      if (newErrors.pickupDate || newErrors.deliveryDate) {
        toast.error('Please fix the date validation errors before submitting');
        setIsSubmitting(false);
        return;
      }

      const bidData = {
        loadId: selectedLoad.id,
        transporterId: user.id,
        amount: parseFloat(bidForm.amount),
        pickupDate: new Date(bidForm.pickupDate),
        deliveryDate: new Date(bidForm.deliveryDate),
        comments: bidForm.comments
      };
      
      await api.bids.create(bidData);
      
      // Show success IMMEDIATELY
      alert('Bid submitted successfully!');
      
      // Reset form IMMEDIATELY
      setBidForm({
        amount: '',
        pickupDate: '',
        deliveryDate: '',
        comments: ''
      });
      setSelectedLoad(null);
      
      // Reload data in background (non-blocking)
      loadData(user).then(() => {
        console.log('✅ Bids data refreshed successfully');
      }).catch(err => {
        console.error('Failed to refresh bids:', err);
      });
    } catch (error: any) {
      console.error('Failed to submit bid:', error);
      const errorMessage = error.response?.data?.message || 'Failed to submit bid. Please try again.';
      alert(errorMessage);
    } finally {
      setIsSubmitting(false); // Hide loading state
    }
  };

  const handleSendMessage = async (loadId: string, message: string) => {
    if (!user) return;
    
    try {
      const messageData = {
        loadId,
        senderId: user.id,
        receiverId: selectedLoad?.client?.id || '',
        content: message,
        messageType: 'GENERAL'
      };
      
      await api.messages.create(messageData);
      
      // Reload messages
      await loadData(user);
      
      alert('Message sent successfully!');
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message. Please try again.');
    }
  };

  const handlePlaceBid = async () => {
    if (!user || !selectedLoad || isSubmitting) return;

    try {
      setIsSubmitting(true); // Show loading state
      
      const bidData = {
        loadId: selectedLoad.id,
        transporterId: user.id,
        amount: parseInt(bidForm.amount),
        pickupDate: bidForm.pickupDate,
        deliveryDate: bidForm.deliveryDate,
        comments: bidForm.comments,
        status: 'ACTIVE'
      };

      const response = await api.bids.create(bidData);
      
      // Show success message IMMEDIATELY before any data refresh
      alert('Bid placed successfully!');
      
      // Reset form and close dialog IMMEDIATELY for instant UX
      setBidForm({
        amount: '',
        pickupDate: '',
        deliveryDate: '',
        comments: ''
      });
      setSelectedLoad(null);
      
      // Refresh data in background (non-blocking)
      loadData(user).then(() => {
        console.log('✅ Bids data refreshed successfully');
      }).catch(err => {
        console.error('Failed to refresh bids:', err);
      });
    } catch (error: any) {
      console.error('Failed to place bid:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to place bid. Please try again.';
      alert(`Error: ${errorMessage}`);
    } finally {
      setIsSubmitting(false); // Hide loading state
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
      active: "default",
      won: "secondary",
      lost: "destructive"
    };
    const colors: { [key: string]: string } = {
      active: "bg-blue-100 text-blue-800",
      won: "bg-green-100 text-green-800",
      lost: "bg-red-100 text-red-800"
    };
    return (
      <Badge variant={variants[status] || "outline"} className={colors[status] || ""}>
        {status}
      </Badge>
    );
  };

  const hasUserBid = (loadId: string) => {
    return myBids.some(bid => bid.loadId === loadId);
  };

  const filteredLoads = loads.filter(load => 
    load.status === 'ACTIVE' && (
      load.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      load.cargoType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      load.pickupLocation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      load.deliveryLocation.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Dynamic data calculations
  const calculateStats = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Calculate dynamic stats
    const newLoadsToday = loads.filter(load => {
      const loadDate = new Date(load.createdAt);
      return loadDate >= today;
    }).length;

    const bidsThisWeek = myBids.filter(bid => {
      const bidDate = new Date(bid.createdAt);
      return bidDate >= weekAgo;
    }).length;

    const wonBids = myBids.filter(bid => bid.status === 'WON');
    const successRate = myBids.length > 0 ? Math.round((wonBids.length / myBids.length) * 100) : 0;

    const totalEarnings = wonBids.reduce((sum, bid) => sum + (bid.amount || 0), 0);
    const earningsLastMonth = wonBids.filter(bid => {
      const bidDate = new Date(bid.createdAt);
      return bidDate >= monthAgo;
    }).reduce((sum, bid) => sum + (bid.amount || 0), 0);
    
    const earningsGrowth = earningsLastMonth > 0 ? 
      Math.round(((totalEarnings - earningsLastMonth) / earningsLastMonth) * 100) : 0;

    return {
      newLoadsToday,
      bidsThisWeek,
      successRate,
      totalEarnings,
      earningsGrowth,
      wonBids: wonBids.length
    };
  };

  const stats = calculateStats();

  // Generate dynamic bidding stats data for charts
  const generateBiddingStatsData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    
    return months.slice(Math.max(0, currentMonth - 5), currentMonth + 1).map((month, index) => {
      const monthIndex = months.indexOf(month);
      const monthBids = myBids.filter(bid => {
        const bidDate = new Date(bid.createdAt);
        return bidDate.getMonth() === monthIndex;
      });
      
      const monthWonBids = monthBids.filter(bid => bid.status === 'WON');
      const monthEarnings = monthWonBids.reduce((sum, bid) => sum + (bid.amount || 0), 0);
      
      return {
        month,
        bids: monthBids.length,
        won: monthWonBids.length,
        earnings: monthEarnings
      };
    });
  };

  const biddingStatsData = generateBiddingStatsData();

  // Generate dynamic load type data
  const generateLoadTypeData = () => {
    const loadTypes: { [key: string]: number } = {};
    
    loads.forEach(load => {
      // Extract load type from title or description
      const title = load.title.toLowerCase();
      let type = 'Other';
      
      if (title.includes('electronics') || title.includes('electronic')) {
        type = 'Electronics';
      } else if (title.includes('machinery') || title.includes('machine')) {
        type = 'Machinery';
      } else if (title.includes('consumer') || title.includes('goods')) {
        type = 'Consumer Goods';
      } else if (title.includes('raw') || title.includes('material')) {
        type = 'Raw Materials';
      } else if (title.includes('food') || title.includes('agriculture')) {
        type = 'Food & Agriculture';
      } else if (title.includes('textile') || title.includes('clothing')) {
        type = 'Textiles';
      }
      
      loadTypes[type] = (loadTypes[type] || 0) + 1;
    });

    const colors = ['#0A1C3F', '#33A852', '#6E6E6E', '#1E40AF', '#DC2626', '#7C3AED'];
    
    return Object.entries(loadTypes).map(([name, value], index) => ({
      name,
      value,
      color: colors[index % colors.length]
    }));
  };

  const loadTypeData = generateLoadTypeData();

  const navigationItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'loads', label: 'Available Loads', icon: Package },
    { id: 'bids', label: 'My Bids', icon: DollarSign },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'messages', label: 'Messages', icon: MessageSquare, badge: unreadCount > 0 ? unreadCount : undefined }
  ];

  // Render header and skeleton while loading as in Admin/Client to prevent flicker/redirect loop

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header with Top Navigation */}
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
                  FleetXchange Transporter
                </h1>
                <p className="text-sm" style={{ color: '#6E6E6E' }}>{user?.profile?.companyName || user?.email || 'Transporter'}</p>
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
          
          {/* Top Navigation */}
          <nav className="flex space-x-8 -mb-px">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    localStorage.setItem('transporterPortalActiveTab', item.id);
                  }}
                  className={`flex items-center px-1 py-4 text-sm font-medium border-b-2 transition-colors ${
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
        {/* Show loading screen while data is being fetched */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600">Loading transporter data...</p>
            </div>
          </div>
        ) : (
          <>
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="text-white" style={{ background: 'linear-gradient(135deg, #0A1C3F 0%, #33A852 100%)' }}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Available Loads</CardTitle>
                  <Package className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{loads.length}</div>
                  <p className="text-xs opacity-80">
                    +{stats.newLoadsToday} new today
                  </p>
                </CardContent>
              </Card>

              <Card className="text-white" style={{ background: 'linear-gradient(135deg, #33A852 0%, #0A1C3F 100%)' }}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">My Bids</CardTitle>
                  <DollarSign className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{myBids.length}</div>
                  <p className="text-xs opacity-80">
                    +{stats.bidsThisWeek} this week
                  </p>
                </CardContent>
              </Card>

              <Card className="text-white" style={{ backgroundColor: '#6E6E6E' }}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Won Bids</CardTitle>
                  <Trophy className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.wonBids}
                  </div>
                  <p className="text-xs opacity-80">
                    {stats.successRate}% success rate
                  </p>
                </CardContent>
              </Card>

              <Card className="text-white" style={{ background: 'linear-gradient(135deg, #0A1C3F 0%, #6E6E6E 100%)' }}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                  <DollarSign className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${stats.totalEarnings >= 1000 ? `${(stats.totalEarnings / 1000).toFixed(1)}K` : stats.totalEarnings.toLocaleString()}
                  </div>
                  <p className="text-xs opacity-80">
                    {stats.earningsGrowth > 0 ? '+' : ''}{stats.earningsGrowth}% from last month
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center" style={{ color: '#0A1C3F' }}>
                    <TrendingUp className="mr-2 h-5 w-5" />
                    Bidding Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={biddingStatsData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="bids" stroke="#0A1C3F" strokeWidth={2} name="Bids Placed" />
                      <Line type="monotone" dataKey="won" stroke="#33A852" strokeWidth={2} name="Bids Won" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center" style={{ color: '#0A1C3F' }}>
                    <Activity className="mr-2 h-5 w-5" />
                    Load Type Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={loadTypeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {loadTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Earnings Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center" style={{ color: '#0A1C3F' }}>
                  <DollarSign className="mr-2 h-5 w-5" />
                  Monthly Earnings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={biddingStatsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="earnings" fill="#33A852" name="Earnings ($)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'loads' && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center" style={{ color: '#0A1C3F' }}>
                    <Package className="mr-2 h-5 w-5" />
                    Available Loads
                  </CardTitle>
                  <CardDescription>Browse and bid on available shipping loads</CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Search className="h-4 w-4" style={{ color: '#6E6E6E' }} />
                  <Input 
                    placeholder="Search loads..." 
                    className="w-64" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Load Details</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Cargo Info</TableHead>
                    <TableHead>Budget Range</TableHead>
                    <TableHead>Timeline</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLoads.map((load) => (
                    <TableRow key={load.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium" style={{ color: '#0A1C3F' }}>{load.title}</div>
                          <div className="text-sm" style={{ color: '#6E6E6E' }}>{load.description}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm">
                          <MapPin className="h-4 w-4 mr-1" style={{ color: '#6E6E6E' }} />
                          <div>
                            <div>{load.pickupLocation}</div>
                            <div style={{ color: '#6E6E6E' }}>→ {load.deliveryLocation}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{load.cargoType}</div>
                          <div style={{ color: '#6E6E6E' }}>{load.weight} tons</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span style={{ color: '#33A852' }} className="font-medium">
                          {load.currency || 'USD'} {load.budgetMin.toLocaleString()} - {load.currency || 'USD'} {load.budgetMax.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" style={{ color: '#6E6E6E' }} />
                            {load.pickupDate}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {hasUserBid(load.id) ? (
                          <div className="flex space-x-2">
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Bid Placed
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openChat(load)}
                            >
                              <MessageSquare className="h-4 w-4 mr-1" />
                              Chat
                            </Button>
                          </div>
                        ) : (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                size="sm"
                                onClick={() => setSelectedLoad(load)}
                                className="text-white"
                                style={{ backgroundColor: isVerified ? '#33A852' : '#A0AEC0' }}
                                disabled={!isVerified}
                              >
                                {isVerified ? 'Place Bid' : 'Verification required to bid'}
                              </Button>
                            </DialogTrigger>
                            {!isVerified && (
                              <div className="text-xs text-orange-600 mt-1">You must complete verification before placing bids.</div>
                            )}
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle style={{ color: '#0A1C3F' }}>Place Bid</DialogTitle>
                                <DialogDescription>
                                  Submit your bid for: {load.title}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="p-4 bg-gray-50 rounded-lg border">
                                  <h4 className="font-medium mb-2" style={{ color: '#0A1C3F' }}>Load Details</h4>
                                  <div className="text-sm space-y-1" style={{ color: '#6E6E6E' }}>
                                    <p><strong>Route:</strong> {(load as any)?.pickupLocation || '—'} → {(load as any)?.deliveryLocation || '—'}</p>
                                    <p><strong>Cargo:</strong> {load.cargoType} ({load.weight} tons)</p>
                                    <p><strong>Budget:</strong> {load.currency || 'USD'} {load.budgetMin.toLocaleString()} - {load.currency || 'USD'} {load.budgetMax.toLocaleString()}</p>
                                    <p><strong>Pickup Date:</strong> {load.pickupDate ? new Date(load.pickupDate).toLocaleDateString() : '—'}</p>
                                    <p><strong>Delivery Date:</strong> {load.deliveryDate ? new Date(load.deliveryDate).toLocaleDateString() : '—'}</p>
                                  </div>
                                </div>
                                
                                <div className="space-y-2">
                                  <Label htmlFor="amount">Bid Amount ({load.currency || 'USD'})</Label>
                                  <Input
                                    id="amount"
                                    type="number"
                                    placeholder={`${load.budgetMin} - ${load.budgetMax}`}
                                    value={bidForm.amount}
                                    onChange={(e) => setBidForm({...bidForm, amount: e.target.value})}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="pickupDate">Proposed Pickup Date</Label>
                                  <Input
                                    id="pickupDate"
                                    type="date"
                                    value={bidForm.pickupDate}
                                    onChange={(e) => {
                                      const v = e.target.value;
                                      setBidForm({...bidForm, pickupDate: v});
                                      const loadMin = load.pickupDate ? new Date(load.pickupDate).toISOString().slice(0,10) : '';
                                      setBidErrors(prev => ({
                                        ...prev,
                                        pickupDate: (loadMin && v && v < loadMin) ? 'Pickup cannot be before load pickup date' : undefined,
                                        deliveryDate: (bidForm.deliveryDate && v && bidForm.deliveryDate < v) ? 'Delivery cannot be before proposed pickup' : prev.deliveryDate
                                      }));
                                    }}
                                    min={load.pickupDate ? new Date(load.pickupDate).toISOString().slice(0,10) : undefined}
                                  />
                                  {bidErrors.pickupDate && (
                                    <div className="text-xs text-red-600">{bidErrors.pickupDate}</div>
                                  )}
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="deliveryDate">Proposed Delivery Date</Label>
                                  <Input
                                    id="deliveryDate"
                                    type="date"
                                    value={bidForm.deliveryDate}
                                    onChange={(e) => {
                                      const v = e.target.value;
                                      setBidForm({...bidForm, deliveryDate: v});
                                      const pick = bidForm.pickupDate || (load.pickupDate ? new Date(load.pickupDate).toISOString().slice(0,10) : '');
                                      const max = load.deliveryDate ? new Date(load.deliveryDate).toISOString().slice(0,10) : '';
                                      let msg: string | undefined;
                                      if (pick && v && v < pick) msg = 'Delivery cannot be before proposed pickup';
                                      if (!msg && max && v && v > max) msg = 'Delivery cannot be after load delivery date';
                                      setBidErrors(prev => ({ ...prev, deliveryDate: msg }));
                                    }}
                                    min={bidForm.pickupDate || (load.pickupDate ? new Date(load.pickupDate).toISOString().slice(0,10) : undefined)}
                                    max={load.deliveryDate ? new Date(load.deliveryDate).toISOString().slice(0,10) : undefined}
                                  />
                                  {bidErrors.deliveryDate && (
                                    <div className="text-xs text-red-600">{bidErrors.deliveryDate}</div>
                                  )}
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="comments">Comments</Label>
                                  <Textarea
                                    id="comments"
                                    placeholder="Additional information about your bid..."
                                    value={bidForm.comments}
                                    onChange={(e) => setBidForm({...bidForm, comments: e.target.value})}
                                  />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Alert>
                                  <AlertDescription>
                                    POD upload has moved to a dedicated page. After you win and complete a load, go to the Pods page to upload your proof of delivery.
                                  </AlertDescription>
                                </Alert>

                                <Button 
                                  onClick={handleSubmitBid} 
                                  className="w-full text-white"
                                  style={{ backgroundColor: isVerified ? '#33A852' : '#A0AEC0' }}
                                  disabled={!isVerified || isSubmitting}
                                >
                                  {isSubmitting ? (
                                    <>
                                      <span className="animate-spin mr-2">⏳</span>
                                      Submitting Bid...
                                    </>
                                  ) : (
                                    'Submit Bid'
                                  )}
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {activeTab === 'bids' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center" style={{ color: '#0A1C3F' }}>
                <DollarSign className="mr-2 h-5 w-5" />
                My Bids
              </CardTitle>
              <CardDescription>Track your submitted bids and their status</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Load</TableHead>
                    <TableHead>Bid Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myBids.map((bid) => {
                    const load = (bid?.load as any) || loads.find(l => l.id === bid?.loadId) || (bid?.loadId ? (bidLoads as any)[bid.loadId] : undefined);
                    const fallbackId = typeof bid?.loadId === 'string' ? bid.loadId.slice(-4) : '—';
                    const title = load?.title || `Load #${fallbackId}`;
                    const amount = typeof bid?.amount === 'number' ? bid.amount : 0;
                    const status = (bid?.status || '').toString().toLowerCase();
                    const createdAt = bid?.createdAt ? new Date(bid.createdAt).toLocaleDateString() : '—';

                    return (
                      <TableRow key={bid?.id || `${bid?.loadId || 'unknown'}-${createdAt}`}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{title}</div>
                            {load && (load as any).pickupLocation && (load as any).deliveryLocation && (
                              <div className="text-sm" style={{ color: '#6E6E6E' }}>
                                {(load as any).pickupLocation} → {(load as any).deliveryLocation}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium" style={{ color: '#33A852' }}>
                            ${amount.toLocaleString()}
                          </span>
                        </TableCell>
                        
                        <TableCell>{getStatusBadge(status)}</TableCell>
                        <TableCell>
                          <div className="text-sm" style={{ color: '#6E6E6E' }}>
                            {createdAt}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Dialog>
                              <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                console.log('View Details button clicked:', { load, bidLoadId: bid.loadId });
                                setSelectedBid(bid);
                                    if (!load || !('pickupLocation' in load) || !(load as any).pickupLocation) {
                                      console.log('Fetching load from API for details:', bid.loadId);
                                      try {
                                        const loadData = await api.loads.getById(bid.loadId);
                                        console.log('Fetched load data for details:', loadData);
                                        // Handle nested response structure
                                        const actualLoad = loadData.load || loadData;
                                        console.log('Actual load object for details:', actualLoad);
                                        // Store the load data for the dialog
                                        setSelectedLoad(actualLoad);
                                      } catch (error) {
                                        console.error('Failed to fetch load for details:', error);
                                        toast.error('Failed to load details', {
                                          description: 'Unable to fetch load information.',
                                          duration: 3000,
                                        });
                                      }
                                    } else {
                                      console.log('Using local load for details:', load);
                                      setSelectedLoad(load);
                                    }
                                  }}
                                >
                              View Details
                            </Button>
                              </DialogTrigger>
                            {/* Financials moved to dedicated Pods page */}
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Load Details</DialogTitle>
                                </DialogHeader>
                                {selectedLoad && (
                              <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <label className="text-sm font-medium text-gray-500">Title</label>
                                        <p className="text-lg font-semibold">{selectedLoad.title}</p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium text-gray-500">Cargo Type</label>
                                        <p className="text-lg">{selectedLoad.cargoType}</p>
                                      </div>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium text-gray-500">Description</label>
                                      <p className="text-sm text-gray-700">{selectedLoad.description}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <label className="text-sm font-medium text-gray-500">Pickup Location</label>
                                        <p className="text-sm">{selectedLoad.pickupLocation}</p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium text-gray-500">Delivery Location</label>
                                        <p className="text-sm">{selectedLoad.deliveryLocation}</p>
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <label className="text-sm font-medium text-gray-500">Weight</label>
                                    <p className="text-sm">{selectedLoad.weight != null ? `${selectedLoad.weight} tons` : '—'}</p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium text-gray-500">Budget Range</label>
                                        <p className="text-sm text-green-600 font-medium">
                                          {selectedLoad.currency || 'USD'} {selectedLoad.budgetMin != null ? Number(selectedLoad.budgetMin).toLocaleString() : '-'} - {selectedLoad.currency || 'USD'} {selectedLoad.budgetMax != null ? Number(selectedLoad.budgetMax).toLocaleString() : '-'}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <label className="text-sm font-medium text-gray-500">Pickup Date</label>
                                    <p className="text-sm">{(selectedLoad.pickupDate || selectedBid?.pickupDate) ? new Date((selectedLoad.pickupDate || selectedBid?.pickupDate) as string).toLocaleDateString() : '—'}</p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium text-gray-500">Delivery Date</label>
                                    <p className="text-sm">{(selectedLoad.deliveryDate || selectedBid?.deliveryDate) ? new Date((selectedLoad.deliveryDate || selectedBid?.deliveryDate) as string).toLocaleDateString() : '—'}</p>
                                      </div>
                                    </div>
                                <div>
                                      <label className="text-sm font-medium text-gray-500">Status</label>
                                  <div className="text-sm">
                                    <Badge variant={selectedLoad.status === 'ACTIVE' ? 'default' : 'secondary'}>
                                      {selectedLoad.status}
                                    </Badge>
                                  </div>
                                    </div>
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                console.log('Message button clicked:', { load, bidLoadId: bid.loadId });
                                const ensureLoad = async (): Promise<Load | null> => {
                                  if (load) return load as Load;
                                  try {
                                    const loadData = await api.loads.getById(bid.loadId);
                                    return (loadData.load || loadData) as Load;
                                  } catch (error) {
                                    console.error('Failed to fetch load for messaging:', error);
                                    toast.error('Failed to open messages');
                                    return null;
                                  }
                                };
                                const resolvedLoad = await ensureLoad();
                                if (!resolvedLoad) return;
                                // Navigate to messages tab with selected client
                                setActiveTab('messages');
                                setSelectedClient({
                                  clientId: resolvedLoad.client?.id,
                                  companyName: resolvedLoad.client?.companyName,
                                  loadId: resolvedLoad.id
                                });
                              }}
                              title="Message Client"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => navigate('/pods')}
                              className="text-white"
                              style={{ backgroundColor: '#0A1C3F' }}
                              title="Upload POD"
                            >
                              POD
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {activeTab === 'documents' && <DocumentUpload />}

        {activeTab === 'messages' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center" style={{ color: '#0A1C3F' }}>
                <MessageSquare className="mr-2 h-5 w-5" />
                Messages
              </CardTitle>
              <CardDescription>
                {selectedClient 
                  ? `Chat with ${selectedClient.companyName}`
                  : 'Communication with clients'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedClient ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium" style={{ color: '#0A1C3F' }}>
                        Chat with {selectedClient.companyName}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedClient(null)}
                    >
                      Back to Messages
                    </Button>
                  </div>
                  {(() => {
                    const selectedLoad = loads.find(l => l.id === selectedClient.loadId);
                    if (!selectedLoad) {
                      return <div>Load not found</div>;
                    }
                    return (
                      <ChatInterface
                        loadId={selectedClient.loadId || ''}
                        load={selectedLoad}
                        currentUser={convertToApiUser(user)}
                        onBack={() => setSelectedClient(null)}
                        bids={myBids}
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
                      <p className="text-sm" style={{ color: '#6E6E6E' }}>Conversations will appear here when you communicate with clients</p>
                    </div>
                  ) : (
                    conversations.map((conversation) => (
                      <div 
                        key={conversation.clientId} 
                        className="border rounded-lg p-4 hover:bg-purple-50 transition-colors cursor-pointer"
                        onClick={() => {
                          // Find the load associated with this conversation
                          const conversationMessages = messages.filter(msg => 
                            msg.senderId === conversation.clientId || msg.receiverId === conversation.clientId
                          );
                          const loadId = conversationMessages.length > 0 ? conversationMessages[0].loadId : null;
                          
                          if (loadId) {
                            // Find the client info and set up chat in the same page
                            const clientInfo = {
                              clientId: conversation.clientId,
                              companyName: conversation.clientName,
                              loadId: loadId
                            };
                            setSelectedClient(clientInfo);
                          } else {
                            alert('Unable to find load information for this conversation');
                          }
                        }}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium" style={{ color: '#0A1C3F' }}>
                              {conversation.clientName}
                            </span>
                          <span className="text-sm" style={{ color: '#6E6E6E' }}>
                              - Client
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

      {/* Chat Interface */}
      {showChat && chatLoad && user && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg w-full max-w-4xl h-[80vh] m-4">
            {(() => {
              console.log('Rendering ChatInterface with:', {
                showChat,
                chatLoad: chatLoad?.title,
                user: user?.userType,
                convertedUser: convertToApiUser(user)?.userType
              });
              return null;
            })()}
            <ChatInterface
              loadId={chatLoad.id}
              load={chatLoad}
              currentUser={convertToApiUser(user)}
              onBack={closeChat}
              bids={myBids}
              onMessageRead={refreshUnreadCountAndConversations}
              onMessageSent={refreshUnreadCountAndConversations}
            />
          </div>
        </div>
      )}
    </div>
  );
}