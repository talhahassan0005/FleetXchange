import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { 
  Users, FileText, Truck, BarChart3, LogOut, Settings, 
  CheckCircle, XCircle, AlertCircle, Download, UserCheck, UserX, 
  UserMinus, Clock, TrendingUp, Activity, DollarSign, Eye
} from 'lucide-react';
import { authService, User as LegacyUser } from '@/lib/auth';
import { api, Document, Load, User } from '@/lib/api';
import { websocketService } from '@/lib/websocket';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

export default function AdminPortal() {
  const [users, setUsers] = useState<User[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loads, setLoads] = useState<Load[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<any>({
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
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  // Admin: per-load linked data management
  const [selectedLoadAdmin, setSelectedLoadAdmin] = useState<Load | null>(null);
  const [selectedLoadPods, setSelectedLoadPods] = useState<any[]>([]);
  const [selectedLoadInvoices, setSelectedLoadInvoices] = useState<any[]>([]);
  const [selectedLoadPayments, setSelectedLoadPayments] = useState<any[]>([]);

  const navigate = useNavigate();

  const refreshSelectedLoadLinkedData = async (loadId: string) => {
    try {
      const [podsResp, invoicesResp, paymentsResp] = await Promise.all([
        api.pods.getByLoad(loadId),
        api.invoices.getByLoad(loadId),
        api.payments.getByLoad(loadId)
      ]);
      setSelectedLoadPods(podsResp.pods || podsResp || []);
      setSelectedLoadInvoices(invoicesResp.invoices || invoicesResp || []);
      setSelectedLoadPayments(paymentsResp.payments || paymentsResp || []);
    } catch (e) {
      console.error('Failed to fetch linked load data', e);
    }
  };

  const handleOpenLoadManage = async (load: Load) => {
    setSelectedLoadAdmin(load);
    await refreshSelectedLoadLinkedData(load.id);
  };

  const handlePodStatus = async (podId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await api.pods.updateStatus(podId, status);
      if (selectedLoadAdmin) await refreshSelectedLoadLinkedData(selectedLoadAdmin.id);
      toast.success(`POD ${status.toLowerCase()} successfully`);
    } catch (e) {
      toast.error('Failed to update POD status');
    }
  };

  const handleInvoiceStatus = async (invoiceId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await api.invoices.updateStatus(invoiceId, status);
      if (selectedLoadAdmin) await refreshSelectedLoadLinkedData(selectedLoadAdmin.id);
      toast.success(`Invoice ${status.toLowerCase()} successfully`);
    } catch (e) {
      toast.error('Failed to update invoice status');
    }
  };

  const handleGenerateClientInvoice = async () => {
    if (!selectedLoadAdmin) return;
    try {
      await api.invoices.generateClientInvoice({ loadId: selectedLoadAdmin.id, commission: 0 });
      await refreshSelectedLoadLinkedData(selectedLoadAdmin.id);
      toast.success('Client invoice generated (commission 0)');
    } catch (e) {
      toast.error('Failed to generate client invoice');
    }
  };

  const handlePaymentUpdate = async (paymentId: string, status: string) => {
    try {
      await api.payments.updateStatus(paymentId, status);
      if (selectedLoadAdmin) await refreshSelectedLoadLinkedData(selectedLoadAdmin.id);
      toast.success('Payment status updated');
    } catch (e) {
      toast.error('Failed to update payment status');
    }
  };

  // Generate dynamic chart data
  const generateMonthlyData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    
    return months.slice(Math.max(0, currentMonth - 5), currentMonth + 1).map((month, index) => {
      const monthIndex = months.indexOf(month);
      const monthUsers = users.filter(user => {
        const userDate = new Date(user.createdAt);
        return userDate.getMonth() === monthIndex;
      });
      
      const monthLoads = loads.filter(load => {
        const loadDate = new Date(load.createdAt);
        return loadDate.getMonth() === monthIndex;
      });
      
      return {
        month,
        users: monthUsers.length,
        loads: monthLoads.length
      };
    });
  };

  const monthlyData = generateMonthlyData();

  const userTypeData = [
    { name: 'Clients', value: stats.clientUsers, color: '#0A1C3F' },
    { name: 'Transporters', value: stats.transporterUsers, color: '#33A852' },
    { name: 'Admins', value: stats.adminUsers, color: '#6E6E6E' }
  ];
  const [verificationNotes, setVerificationNotes] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  // WebSocket real-time updates
  useEffect(() => {
    // Connect to WebSocket
    websocketService.connect();

    // Listen for new bids
    const handleBidCreated = (data: any) => {
      // Refresh loads to show updated bid counts
      api.loads.getAll().then(loadsResponse => {
        setLoads(loadsResponse.loads || []);
      }).catch(error => {
        console.error('Failed to refresh loads:', error);
      });
    };

    // Listen for bid acceptance/rejection
    const handleBidAccepted = (data: any) => {
      // Refresh loads to show updated status
      api.loads.getAll().then(loadsResponse => {
        setLoads(loadsResponse.loads || []);
      }).catch(error => {
        console.error('Failed to refresh loads:', error);
      });
    };

    const handleBidRejected = (data: any) => {
      // Refresh loads to show updated status
      api.loads.getAll().then(loadsResponse => {
        setLoads(loadsResponse.loads || []);
      }).catch(error => {
        console.error('Failed to refresh loads:', error);
      });
    };

    // Listen for document uploads
    const handleDocumentUploaded = (data: any) => {
      // Refresh documents
      api.documents.getAll().then(documentsResponse => {
        setDocuments(documentsResponse.documents || []);
      }).catch(error => {
        console.error('Failed to refresh documents:', error);
      });
    };

    // Listen for document verification updates
    const handleDocumentVerificationUpdated = (data: any) => {
      // Refresh documents
      api.documents.getAll().then(documentsResponse => {
        setDocuments(documentsResponse.documents || []);
      }).catch(error => {
        console.error('Failed to refresh documents:', error);
      });
    };

    // Register event listeners
    websocketService.on('bid_created', handleBidCreated);
    websocketService.on('bid_accepted', handleBidAccepted);
    websocketService.on('bid_rejected', handleBidRejected);
    websocketService.on('document_uploaded', handleDocumentUploaded);
    websocketService.on('document_verification_updated', handleDocumentVerificationUpdated);

    // Cleanup function
    return () => {
      websocketService.off('bid_created', handleBidCreated);
      websocketService.off('bid_accepted', handleBidAccepted);
      websocketService.off('bid_rejected', handleBidRejected);
      websocketService.off('document_uploaded', handleDocumentUploaded);
      websocketService.off('document_verification_updated', handleDocumentVerificationUpdated);
    };
  }, []);

  // Auto-refresh data every 30 seconds (fallback)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        await loadData();
      } catch (error) {
        console.error('Failed to auto-refresh admin data:', error);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      // Load all admin data in parallel for faster loading
      const [usersResponse, documentsResponse, loadsResponse] = await Promise.all([
        api.users.getAll(),
        api.documents.getAll(),
        api.loads.getAll()
      ]);
      
      // Convert API users to keep uppercase format for User interface from api.ts
      const convertedUsers = usersResponse.users.map((apiUser: any) => ({
        id: apiUser.id,
        email: apiUser.email,
        userType: apiUser.userType as 'ADMIN' | 'CLIENT' | 'TRANSPORTER',
        status: apiUser.status as 'ACTIVE' | 'PENDING' | 'REJECTED' | 'SUSPENDED',
        // Add flat fields for direct access
        companyName: apiUser.companyName || '',
        contactPerson: apiUser.contactPerson || '',
        phone: apiUser.phone || '',
        address: apiUser.address || '',
        businessRegistration: apiUser.businessRegistration || '',
        taxId: apiUser.taxId || '',
        profile: {
          companyName: apiUser.companyName || '',
          contactPerson: apiUser.contactPerson || '',
          phone: apiUser.phone || '',
          address: apiUser.address || '',
          businessRegistration: apiUser.businessRegistration || '',
          taxId: apiUser.taxId || ''
        },
        createdAt: apiUser.createdAt,
        lastLogin: apiUser.lastLogin
      }));
      setUsers(convertedUsers);
      
      // Set documents and loads
      setDocuments(documentsResponse.documents);
      setLoads(loadsResponse.loads);
      
      // Calculate dynamic statistics from loaded data
      const statsData = {
        totalUsers: convertedUsers.length,
        activeUsers: convertedUsers.filter(u => u.status === 'ACTIVE').length,
        pendingUsers: convertedUsers.filter(u => u.status === 'PENDING').length,
        totalLoads: loadsResponse.loads.length,
        activeLoads: loadsResponse.loads.filter(l => l.status === 'ACTIVE').length,
        completedLoads: loadsResponse.loads.filter(l => l.status === 'COMPLETED').length,
        totalBids: 0, // Will be calculated from loads
        pendingDocuments: documentsResponse.documents.filter(d => d.verificationStatus === 'PENDING').length,
        unreadMessages: 0, // Will be calculated separately
        clientUsers: convertedUsers.filter(u => u.userType === 'CLIENT').length,
        transporterUsers: convertedUsers.filter(u => u.userType === 'TRANSPORTER').length,
        adminUsers: convertedUsers.filter(u => u.userType === 'ADMIN').length
      };
      setStats(statsData);
      setIsLoading(false);
      
    } catch (error) {
      console.error('Failed to load admin data:', error);
      setIsLoading(false);
      toast.error('Failed to load admin data', {
        description: 'Please refresh the page.',
        duration: 3000,
      });
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const handleUserStatusUpdate = async (userId: string, status: User['status']) => {
    try {
      // Convert status to uppercase for backend API
      const backendStatus = status.toUpperCase() as 'ACTIVE' | 'PENDING' | 'REJECTED' | 'SUSPENDED';
      await api.users.updateStatus(userId, backendStatus);
      await loadData(); // Reload data
      
      // Show success message
      const statusMessages = {
        active: 'User approved successfully!',
        pending: 'User marked as pending!',
        rejected: 'User rejected successfully!',
        suspended: 'User suspended successfully!'
      };
      
      toast.success(statusMessages[status] || 'User status updated successfully!', {
        description: `User status has been changed to ${status}`,
        duration: 4000,
      });
      
    } catch (error) {
      console.error('Failed to update user status:', error);
      toast.error('Failed to update user status', {
        description: 'Please try again or contact support if the issue persists.',
        duration: 5000,
      });
    }
  };

  const handleDocumentVerification = async (docId: string, status: 'approved' | 'rejected' | 'more_info_required') => {
    try {
      // Convert to uppercase for backend API
      const backendStatus = status.toUpperCase().replace('_', '_') as 'APPROVED' | 'REJECTED' | 'MORE_INFO_REQUIRED';
      await api.documents.verify(docId, backendStatus, verificationNotes);
      await loadData(); // Reload data
      setVerificationNotes('');
      setSelectedDocument(null);
      
      // Show success message
      const statusMessages = {
        approved: 'Document approved successfully!',
        rejected: 'Document rejected successfully!',
        more_info_required: 'Document marked for more information!'
      };
      
      toast.success(statusMessages[status] || 'Document verification updated successfully!', {
        description: `Document status has been changed to ${status.replace('_', ' ')}`,
        duration: 4000,
      });
      
    } catch (error) {
      console.error('Failed to verify document:', error);
      toast.error('Failed to verify document', {
        description: 'Please try again or contact support if the issue persists.',
        duration: 5000,
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const normalizedStatus = status.toLowerCase();
    const variants: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
      active: "default",
      pending: "secondary",
      rejected: "destructive",
      suspended: "outline",
      approved: "default",
      more_info_required: "outline"
    };
    const colors: { [key: string]: string } = {
      active: "bg-green-100 text-green-800",
      pending: "bg-yellow-100 text-yellow-800",
      rejected: "bg-red-100 text-red-800",
      suspended: "bg-gray-100 text-gray-800",
      approved: "bg-green-100 text-green-800",
      more_info_required: "bg-orange-100 text-orange-800"
    };
    return (
      <Badge variant={variants[normalizedStatus] || "outline"} className={colors[normalizedStatus] || ""}>
        {normalizedStatus.replace('_', ' ')}
      </Badge>
    );
  };


  const navigationItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'documents', label: 'Document Verification', icon: FileText },
    { id: 'transporter-verification', label: 'Transporter Verification', icon: UserCheck },
    { id: 'loads', label: 'Load Monitoring', icon: Truck },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header with Top Navigation */}
      <header className="bg-white shadow-lg border-b" style={{ borderColor: '#0A1C3F' }}>
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
                  Admin Portal
                </h1>
                <p className="text-sm" style={{ color: '#6E6E6E' }}>System Administration</p>
              </div>
            </div>
            <Button onClick={handleLogout} variant="outline" className="border-red-200 hover:bg-red-50">
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
                  onClick={() => setActiveTab(item.id)}
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
              <p className="text-gray-600">Loading admin data...</p>
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
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalUsers || 0}</div>
                  <p className="text-xs opacity-80">
                    {stats.activeUsers || 0} active users
                  </p>
                </CardContent>
              </Card>

              <Card className="text-white" style={{ background: 'linear-gradient(135deg, #33A852 0%, #0A1C3F 100%)' }}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Loads</CardTitle>
                  <Truck className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.activeLoads || 0}</div>
                  <p className="text-xs opacity-80">
                    {stats.totalLoads > 0 ? Math.round((stats.activeLoads / stats.totalLoads) * 100) : 0}% of total loads
                  </p>
                </CardContent>
              </Card>

              <Card className="text-white" style={{ background: 'linear-gradient(135deg, #6E6E6E 0%, #0A1C3F 100%)' }}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
                  <Clock className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.pendingUsers || 0}</div>
                  <p className="text-xs opacity-80">
                    Requires attention
                  </p>
                </CardContent>
              </Card>

              <Card className="text-white" style={{ background: 'linear-gradient(135deg, #33A852 0%, #6E6E6E 100%)' }}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Documents</CardTitle>
                  <FileText className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.pendingDocuments || 0}</div>
                  <p className="text-xs opacity-80">
                    Pending verification
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
                    Monthly Growth
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="users" stroke="#0A1C3F" strokeWidth={2} />
                      <Line type="monotone" dataKey="loads" stroke="#33A852" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center" style={{ color: '#33A852' }}>
                    <Activity className="mr-2 h-5 w-5" />
                    User Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={userTypeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {userTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Revenue Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center" style={{ color: '#6E6E6E' }}>
                  <DollarSign className="mr-2 h-5 w-5" />
                  Revenue Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="revenue" fill="#33A852" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'users' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center" style={{ color: '#0A1C3F' }}>
                <Users className="mr-2 h-5 w-5" />
                User Management
              </CardTitle>
              <CardDescription>Manage user accounts and permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.email}</div>
                          <div className="text-sm" style={{ color: '#6E6E6E' }}>{user.contactPerson}</div>
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">{user.userType}</TableCell>
                      <TableCell>{user.companyName}</TableCell>
                      <TableCell>{getStatusBadge(user.status)}</TableCell>
                      <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline" onClick={() => setSelectedUser(user)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>User Details</DialogTitle>
                                <DialogDescription>
                                  Manage user account and status
                                </DialogDescription>
                              </DialogHeader>
                              {selectedUser && (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label>Email</Label>
                                      <p className="text-sm">{selectedUser.email}</p>
                                    </div>
                                    <div>
                                      <Label>User Type</Label>
                                      <p className="text-sm capitalize">{selectedUser.userType}</p>
                                    </div>
                                    <div>
                                      <Label>Company</Label>
                                      <p className="text-sm">{selectedUser.companyName}</p>
                                    </div>
                                    <div>
                                      <Label>Contact Person</Label>
                                      <p className="text-sm">{selectedUser.contactPerson}</p>
                                    </div>
                                    <div>
                                      <Label>Phone</Label>
                                      <p className="text-sm">{selectedUser.phone}</p>
                                    </div>
                                    <div>
                                      <Label>Status</Label>
                                      <div className="mt-1">{getStatusBadge(selectedUser.status)}</div>
                                    </div>
                                  </div>
                                  <div>
                                    <Label>Address</Label>
                                    <p className="text-sm">{selectedUser.address}</p>
                                  </div>
                                  
                                  {selectedUser.status !== 'ACTIVE' && (
                                    <div className="flex space-x-2 pt-4">
                                      <Button
                                        size="sm"
                                        onClick={() => handleUserStatusUpdate(selectedUser.id, 'ACTIVE')}
                                        style={{ backgroundColor: '#33A852' }}
                                        className="text-white hover:opacity-90"
                                      >
                                        <UserCheck className="mr-2 h-4 w-4" />
                                        Approve
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => handleUserStatusUpdate(selectedUser.id, 'REJECTED')}
                                      >
                                        <UserX className="mr-2 h-4 w-4" />
                                        Reject
                                      </Button>
                                    </div>
                                  )}
                                  
                                  {selectedUser.status === 'ACTIVE' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleUserStatusUpdate(selectedUser.id, 'SUSPENDED')}
                                    >
                                      <UserMinus className="mr-2 h-4 w-4" />
                                      Suspend
                                    </Button>
                                  )}
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                          
                          {/* Inline Status Actions */}
                          {user.status === 'ACTIVE' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUserStatusUpdate(user.id, 'SUSPENDED')}
                              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                            >
                              <UserMinus className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleUserStatusUpdate(user.id, 'ACTIVE')}
                              style={{ backgroundColor: '#33A852' }}
                              className="text-white hover:opacity-90"
                            >
                              <UserCheck className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {activeTab === 'documents' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center" style={{ color: '#0A1C3F' }}>
                <FileText className="mr-2 h-5 w-5" />
                Document Verification
              </CardTitle>
              <CardDescription>Review and verify uploaded documents</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4" style={{ color: '#6E6E6E' }} />
                          <span className="font-medium">{doc.fileName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {users.find(u => u.id === doc.userId)?.email}
                      </TableCell>
                      <TableCell>{doc.documentType}</TableCell>
                      <TableCell>{getStatusBadge(doc.verificationStatus)}</TableCell>
                      <TableCell>{new Date(doc.uploadedAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              try {
                                // Get the file from backend as blob
                                const fileBlob = await api.upload.downloadFile(doc.fileUrl.split('/').pop() || '');
                                
                                // Create download link
                                const url = URL.createObjectURL(fileBlob);
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = doc.fileName;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                
                                // Clean up the URL
                                URL.revokeObjectURL(url);
                                
                                // Show success message
                                toast.success('Document downloaded successfully', {
                                  description: doc.fileName,
                                  duration: 2000,
                                });
                              } catch (error) {
                                console.error('Failed to download document:', error);
                                toast.error('Failed to download document', {
                                  description: 'Please try again or contact support.',
                                  duration: 5000,
                                });
                              }
                            }}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          
                          {doc.verificationStatus.toLowerCase() === 'pending' && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" onClick={() => setSelectedDocument(doc)} style={{ backgroundColor: '#33A852' }} className="text-white">
                                  Review
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Document Verification</DialogTitle>
                                  <DialogDescription>
                                    Review and verify the document: {doc.fileName}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label htmlFor="notes">Admin Notes</Label>
                                    <Textarea
                                      id="notes"
                                      placeholder="Add verification notes or reasons for rejection..."
                                      value={verificationNotes}
                                      onChange={(e) => setVerificationNotes(e.target.value)}
                                    />
                                  </div>
                                  
                                  <div className="flex space-x-2">
                                    <Button
                                      onClick={() => handleDocumentVerification(doc.id, 'approved')}
                                      style={{ backgroundColor: '#33A852' }}
                                      className="text-white hover:opacity-90"
                                    >
                                      <CheckCircle className="mr-2 h-4 w-4" />
                                      Approve
                                    </Button>
                                    <Button
                                      onClick={() => handleDocumentVerification(doc.id, 'more_info_required')}
                                      variant="outline"
                                    >
                                      <AlertCircle className="mr-2 h-4 w-4" />
                                      Request More Info
                                    </Button>
                                    <Button
                                      onClick={() => handleDocumentVerification(doc.id, 'rejected')}
                                      variant="destructive"
                                    >
                                      <XCircle className="mr-2 h-4 w-4" />
                                      Reject
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {activeTab === 'transporter-verification' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center" style={{ color: '#0A1C3F' }}>
                  <UserCheck className="mr-2 h-5 w-5" />
                  Transporter Verification Dashboard
                </CardTitle>
                <CardDescription>
                  Comprehensive verification process for transporters including document review and status management
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg border">
                    <div className="text-2xl font-bold text-blue-600">
                      {users.filter(u => u.userType === 'TRANSPORTER').length}
                    </div>
                    <div className="text-sm text-gray-600">Total Transporters</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border">
                    <div className="text-2xl font-bold text-green-600">
                      {users.filter(u => u.userType === 'TRANSPORTER' && u.status === 'ACTIVE').length}
                    </div>
                    <div className="text-sm text-gray-600">Verified</div>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg border">
                    <div className="text-2xl font-bold text-yellow-600">
                      {users.filter(u => u.userType === 'TRANSPORTER' && u.status === 'PENDING').length}
                    </div>
                    <div className="text-sm text-gray-600">Pending</div>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg border">
                    <div className="text-2xl font-bold text-red-600">
                      {users.filter(u => u.userType === 'TRANSPORTER' && u.status === 'SUSPENDED').length}
                    </div>
                    <div className="text-sm text-gray-600">Suspended</div>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transporter</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Documents</TableHead>
                      <TableHead>Verification Status</TableHead>
                      <TableHead>Registration Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.filter(u => u.userType === 'TRANSPORTER').map((transporter) => {
                      const transporterDocs = documents.filter(d => d.userId === transporter.id);
                      const approvedDocs = transporterDocs.filter(d => d.verificationStatus === 'APPROVED').length;
                      const totalDocs = transporterDocs.length;
                      
                      return (
                        <TableRow key={transporter.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{transporter.contactPerson}</div>
                              <div className="text-sm text-gray-500">{transporter.email}</div>
                            </div>
                          </TableCell>
                          <TableCell>{transporter.companyName}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{approvedDocs}/{totalDocs} Approved</div>
                              <div className="text-gray-500">{totalDocs} Total</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(transporter.status)}
                          </TableCell>
                          <TableCell>
                            {new Date(transporter.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="outline">
                                    <Eye className="h-4 w-4 mr-1" />
                                    Review
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-4xl">
                                  <DialogHeader>
                                    <DialogTitle>Transporter Verification Review</DialogTitle>
                                    <DialogDescription>
                                      Review documents and verification status for {transporter.companyName}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-6">
                                    {/* Transporter Info */}
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                      <h4 className="font-medium mb-2">Company Information</h4>
                                      <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div><strong>Company:</strong> {transporter.companyName}</div>
                                        <div><strong>Contact:</strong> {transporter.contactPerson}</div>
                                        <div><strong>Email:</strong> {transporter.email}</div>
                                        <div><strong>Phone:</strong> {transporter.phone}</div>
                                        <div><strong>Address:</strong> {transporter.address}</div>
                                        <div><strong>Status:</strong> {transporter.status}</div>
                                      </div>
                                    </div>

                                    {/* Documents Review */}
                                    <div>
                                      <h4 className="font-medium mb-3">Uploaded Documents</h4>
                                      {transporterDocs.length > 0 ? (
                                        <div className="space-y-3">
                                          {transporterDocs.map((doc) => (
                                            <div key={doc.id} className="border rounded-lg p-3">
                                              <div className="flex justify-between items-start">
                                                <div>
                                                  <div className="font-medium">{doc.documentType}</div>
                                                  <div className="text-sm text-gray-500">{doc.fileName}</div>
                                                  <div className="text-xs text-gray-400">
                                                    Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                                                  </div>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                  {getStatusBadge(doc.verificationStatus)}
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => window.open(doc.fileUrl, '_blank')}
                                                  >
                                                    <Eye className="h-4 w-4" />
                                                  </Button>
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="text-gray-500 text-center py-4">
                                          No documents uploaded yet
                                        </div>
                                      )}
                                    </div>

                                    {/* Verification Actions */}
                                    <div className="border-t pt-4">
                                      <h4 className="font-medium mb-3">Verification Actions</h4>
                                      <div className="space-y-3">
                                        <div>
                                          <Label htmlFor="verification-notes">Verification Notes</Label>
                                          <Textarea
                                            id="verification-notes"
                                            placeholder="Add notes about verification decision..."
                                            value={verificationNotes}
                                            onChange={(e) => setVerificationNotes(e.target.value)}
                                          />
                                        </div>
                                        <div className="flex space-x-2">
                                          <Button
                                            onClick={() => handleUserStatusUpdate(transporter.id, 'ACTIVE')}
                                            style={{ backgroundColor: '#33A852' }}
                                            className="text-white hover:opacity-90"
                                          >
                                            <CheckCircle className="h-4 w-4 mr-1" />
                                            Approve Transporter
                                          </Button>
                                          <Button
                                            onClick={() => handleUserStatusUpdate(transporter.id, 'SUSPENDED')}
                                            variant="destructive"
                                          >
                                            <XCircle className="h-4 w-4 mr-1" />
                                            Suspend
                                          </Button>
                                          <Button
                                            onClick={() => handleUserStatusUpdate(transporter.id, 'PENDING')}
                                            variant="outline"
                                          >
                                            <Clock className="h-4 w-4 mr-1" />
                                            Mark Pending
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'loads' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center" style={{ color: '#33A852' }}>
                <Truck className="mr-2 h-5 w-5" />
                Load Monitoring
              </CardTitle>
              <CardDescription>Monitor all active loads and shipments</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Budget Range</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loads.map((load) => (
                    <TableRow key={load.id}>
                      <TableCell className="font-medium">{load.title}</TableCell>
                      <TableCell>
                        {users.find(u => u.id === load.clientId)?.email}
                      </TableCell>
                      <TableCell>
                        {load.pickupLocation} → {load.deliveryLocation}
                      </TableCell>
                      <TableCell>{getStatusBadge(load.status)}</TableCell>
                      <TableCell>
                        ${load.budgetMin.toLocaleString()} - ${load.budgetMax.toLocaleString()}
                      </TableCell>
                      <TableCell>{new Date(load.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" onClick={() => handleOpenLoadManage(load)}>
                              Manage
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl">
                            <DialogHeader>
                              <DialogTitle>Load Details & Linked Records</DialogTitle>
                              <DialogDescription>
                                Review PODs, invoices, and payments for {load.title}
                              </DialogDescription>
                            </DialogHeader>
                            {selectedLoadAdmin && (
                              <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div><strong>Client:</strong> {users.find(u => u.id === selectedLoadAdmin.clientId)?.email}</div>
                                  <div><strong>Budget:</strong> {selectedLoadAdmin.currency || 'USD'} {selectedLoadAdmin.budgetMin.toLocaleString()} - {selectedLoadAdmin.currency || 'USD'} {selectedLoadAdmin.budgetMax.toLocaleString()}</div>
                                  <div><strong>Pickup:</strong> {new Date(selectedLoadAdmin.pickupDate).toLocaleDateString()}</div>
                                  <div><strong>Delivery:</strong> {new Date(selectedLoadAdmin.deliveryDate).toLocaleDateString()}</div>
                                </div>
                                {/* PODs */}
                                <div className="border rounded p-3">
                                  <h4 className="font-medium mb-2">PODs</h4>
                                  {selectedLoadPods.length === 0 ? (
                                    <div className="text-sm text-gray-500">No PODs uploaded yet.</div>
                                  ) : (
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>File</TableHead>
                                          <TableHead>Status</TableHead>
                                          <TableHead>Uploaded</TableHead>
                                          <TableHead>Actions</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {selectedLoadPods.map((p: any) => (
                                          <TableRow key={p.id || p.fileUrl}>
                                            <TableCell><a href={p.fileUrl} target="_blank" rel="noreferrer">{p.fileName || 'POD'}</a></TableCell>
                                            <TableCell>{(p.status || p.verificationStatus || 'PENDING').toString()}</TableCell>
                                            <TableCell>{p.uploadedAt ? new Date(p.uploadedAt).toLocaleString() : '—'}</TableCell>
                                            <TableCell>
                                              <div className="flex space-x-2">
                                                <Button size="sm" onClick={() => handlePodStatus(p.id, 'APPROVED')} style={{ backgroundColor: '#33A852' }} className="text-white">Approve</Button>
                                                <Button size="sm" variant="destructive" onClick={() => handlePodStatus(p.id, 'REJECTED')}>Reject</Button>
                                              </div>
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  )}
                                </div>
                                {/* Invoices */}
                                <div className="border rounded p-3">
                                  <h4 className="font-medium mb-2">Invoices</h4>
                                  {selectedLoadInvoices.length === 0 ? (
                                    <div className="text-sm text-gray-500">No invoices yet.</div>
                                  ) : (
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Type</TableHead>
                                          <TableHead>Amount</TableHead>
                                          <TableHead>Status</TableHead>
                                          <TableHead>Actions</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {selectedLoadInvoices.map((inv: any) => (
                                          <TableRow key={inv.id}>
                                            <TableCell>{(inv.type || inv.invoiceType || 'TRANSPORTER').toString()}</TableCell>
                                            <TableCell>${Number(inv.amount || 0).toLocaleString()}</TableCell>
                                            <TableCell>{(inv.status || 'PENDING').toString()}</TableCell>
                                            <TableCell>
                                              <div className="flex space-x-2">
                                                <Button size="sm" onClick={() => handleInvoiceStatus(inv.id, 'APPROVED')} style={{ backgroundColor: '#33A852' }} className="text-white">Approve</Button>
                                                <Button size="sm" variant="destructive" onClick={() => handleInvoiceStatus(inv.id, 'REJECTED')}>Reject</Button>
                                              </div>
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  )}
                                  <div className="pt-3">
                                    <Button size="sm" onClick={handleGenerateClientInvoice}>Generate Client Invoice (commission 0)</Button>
                                  </div>
                                </div>
                                {/* Payments */}
                                <div className="border rounded p-3">
                                  <h4 className="font-medium mb-2">Payments</h4>
                                  {selectedLoadPayments.length === 0 ? (
                                    <div className="text-sm text-gray-500">No payments recorded yet.</div>
                                  ) : (
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>From → To</TableHead>
                                          <TableHead>Amount</TableHead>
                                          <TableHead>Status</TableHead>
                                          <TableHead>Actions</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {selectedLoadPayments.map((p: any) => (
                                          <TableRow key={p.id}>
                                            <TableCell>{p.from} → {p.to}</TableCell>
                                            <TableCell>${Number(p.amount || 0).toLocaleString()}</TableCell>
                                            <TableCell>{(p.status || 'PENDING').toString()}</TableCell>
                                            <TableCell>
                                              <div className="flex space-x-2">
                                                <Button size="sm" onClick={() => handlePaymentUpdate(p.id, 'IN_PROGRESS')}>Mark In Progress</Button>
                                                <Button size="sm" style={{ backgroundColor: '#33A852' }} className="text-white" onClick={() => handlePaymentUpdate(p.id, 'COMPLETED')}>Mark Completed</Button>
                                              </div>
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  )}
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {activeTab === 'settings' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center" style={{ color: '#6E6E6E' }}>
                <Settings className="mr-2 h-5 w-5" />
                System Settings
              </CardTitle>
              <CardDescription>Configure platform settings and preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    System settings panel is under development. Advanced configuration options will be available soon.
                  </AlertDescription>
                </Alert>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="p-4">
                    <h3 className="font-medium mb-2">Platform Statistics</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Total Users:</span>
                        <span className="font-medium">{stats.totalUsers}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Active Loads:</span>
                        <span className="font-medium">{stats.activeLoads}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Pending Documents:</span>
                        <span className="font-medium">{stats.pendingDocuments}</span>
                      </div>
                    </div>
                  </Card>
                  
                  <Card className="p-4">
                    <h3 className="font-medium mb-2">System Health</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Server Status:</span>
                        <Badge style={{ backgroundColor: '#33A852', color: 'white' }}>Online</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Database:</span>
                        <Badge style={{ backgroundColor: '#33A852', color: 'white' }}>Connected</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Last Backup:</span>
                        <span className="font-medium">2 hours ago</span>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Manage Load Dialog */}
        {selectedLoadAdmin && (
          <Dialog open={!!selectedLoadAdmin} onOpenChange={setSelectedLoadAdmin}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Manage Load: {selectedLoadAdmin.title}</DialogTitle>
                <DialogDescription>
                  View and manage documents, invoices, and payments for this load.
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Load Details */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Load Details</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><strong>Title:</strong> {selectedLoadAdmin.title}</div>
                    <div><strong>Client:</strong> {users.find(u => u.id === selectedLoadAdmin.clientId)?.email}</div>
                    <div><strong>Route:</strong> {selectedLoadAdmin.pickupLocation} → {selectedLoadAdmin.deliveryLocation}</div>
                    <div><strong>Status:</strong> {getStatusBadge(selectedLoadAdmin.status)}</div>
                    <div><strong>Budget:</strong> ${selectedLoadAdmin.budgetMin.toLocaleString()} - ${selectedLoadAdmin.budgetMax.toLocaleString()}</div>
                    <div><strong>Created:</strong> {new Date(selectedLoadAdmin.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>

                {/* Documents */}
                <div>
                  <h4 className="font-medium mb-3">Uploaded Documents</h4>
                  {selectedLoadPods.length > 0 ? (
                    <div className="space-y-3">
                      {selectedLoadPods.map((pod) => (
                        <div key={pod.id} className="border rounded-lg p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium">{pod.documentType}</div>
                              <div className="text-sm text-gray-500">{pod.fileName}</div>
                              <div className="text-xs text-gray-400">
                                Uploaded: {new Date(pod.uploadedAt).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {getStatusBadge(pod.verificationStatus)}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(pod.fileUrl, '_blank')}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {pod.verificationStatus.toLowerCase() === 'pending' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handlePodStatus(pod.id, 'APPROVED')}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              )}
                              {pod.verificationStatus.toLowerCase() === 'approved' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handlePodStatus(pod.id, 'REJECTED')}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-500 text-center py-4">
                      No documents uploaded yet for this load.
                    </div>
                  )}
                </div>

                {/* Invoices */}
                <div>
                  <h4 className="font-medium mb-3">Invoices</h4>
                  {selectedLoadInvoices.length > 0 ? (
                    <div className="space-y-3">
                      {selectedLoadInvoices.map((invoice) => (
                        <div key={invoice.id} className="border rounded-lg p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium">{invoice.invoiceType}</div>
                              <div className="text-sm text-gray-500">{invoice.invoiceNumber}</div>
                              <div className="text-xs text-gray-400">
                                Date: {new Date(invoice.date).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {getStatusBadge(invoice.verificationStatus)}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(invoice.fileUrl, '_blank')}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {invoice.verificationStatus.toLowerCase() === 'pending' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleInvoiceStatus(invoice.id, 'APPROVED')}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              )}
                              {invoice.verificationStatus.toLowerCase() === 'approved' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleInvoiceStatus(invoice.id, 'REJECTED')}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-500 text-center py-4">
                      No invoices generated for this load.
                    </div>
                  )}
                </div>

                {/* Payments */}
                <div>
                  <h4 className="font-medium mb-3">Payments</h4>
                  {selectedLoadPayments.length > 0 ? (
                    <div className="space-y-3">
                      {selectedLoadPayments.map((payment) => (
                        <div key={payment.id} className="border rounded-lg p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium">{payment.paymentType}</div>
                              <div className="text-sm text-gray-500">Amount: ${payment.amount.toLocaleString()}</div>
                              <div className="text-xs text-gray-400">
                                Date: {new Date(payment.date).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {getStatusBadge(payment.verificationStatus)}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handlePaymentUpdate(payment.id, 'APPROVED')}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              {payment.verificationStatus.toLowerCase() === 'approved' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handlePaymentUpdate(payment.id, 'REJECTED')}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-500 text-center py-4">
                      No payments recorded for this load.
                    </div>
                  )}
                </div>

                {/* Generate Client Invoice */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Generate Client Invoice</h4>
                  <Button
                    onClick={handleGenerateClientInvoice}
                    style={{ backgroundColor: '#33A852' }}
                    className="text-white hover:opacity-90"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Client Invoice (Commission 0)
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
        </>
        )}
      </main>
    </div>
  );
}