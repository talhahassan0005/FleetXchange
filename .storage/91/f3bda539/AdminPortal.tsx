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
import { 
  Users, FileText, Truck, BarChart3, LogOut, Settings, 
  CheckCircle, XCircle, AlertCircle, Eye, UserCheck, UserX, 
  UserMinus, Clock, TrendingUp, Activity, DollarSign
} from 'lucide-react';
import { authService, User, Document, Load } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

export default function AdminPortal() {
  const [users, setUsers] = useState<User[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loads, setLoads] = useState<Load[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [verificationNotes, setVerificationNotes] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    setUsers(authService.getAllUsers());
    setDocuments(authService.getAllDocuments());
    setLoads(authService.getAllLoads());
  }, []);

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const handleUserStatusUpdate = (userId: string, status: User['status']) => {
    authService.updateUserStatus(userId, status);
    setUsers(authService.getAllUsers());
  };

  const handleDocumentVerification = (docId: string, status: 'approved' | 'rejected' | 'more_info_required') => {
    authService.verifyDocument(docId, status, verificationNotes);
    setDocuments(authService.getAllDocuments());
    setVerificationNotes('');
    setSelectedDocument(null);
  };

  const getStatusBadge = (status: string) => {
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
      <Badge variant={variants[status] || "outline"} className={colors[status] || ""}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const stats = authService.getStatistics();

  // Sample data for charts
  const monthlyData = [
    { month: 'Jan', users: 45, loads: 23, revenue: 12000 },
    { month: 'Feb', users: 52, loads: 31, revenue: 15500 },
    { month: 'Mar', users: 61, loads: 28, revenue: 14200 },
    { month: 'Apr', users: 73, loads: 42, revenue: 21000 },
    { month: 'May', users: 89, loads: 38, revenue: 19000 },
    { month: 'Jun', users: 95, loads: 45, revenue: 22500 }
  ];

  const userTypeData = [
    { name: 'Clients', value: users.filter(u => u.userType === 'client').length, color: '#0A1C3F' },
    { name: 'Transporters', value: users.filter(u => u.userType === 'transporter').length, color: '#33A852' },
    { name: 'Admins', value: users.filter(u => u.userType === 'admin').length, color: '#6E6E6E' }
  ];

  const navigationItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'documents', label: 'Document Verification', icon: FileText },
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
                  <div className="text-2xl font-bold">{stats.totalUsers}</div>
                  <p className="text-xs opacity-80">
                    +12% from last month
                  </p>
                </CardContent>
              </Card>

              <Card className="text-white" style={{ background: 'linear-gradient(135deg, #33A852 0%, #0A1C3F 100%)' }}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Loads</CardTitle>
                  <Truck className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.activeLoads}</div>
                  <p className="text-xs opacity-80">
                    +8% from last month
                  </p>
                </CardContent>
              </Card>

              <Card className="text-white" style={{ background: 'linear-gradient(135deg, #6E6E6E 0%, #0A1C3F 100%)' }}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
                  <Clock className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.pendingUsers}</div>
                  <p className="text-xs opacity-80">
                    Requires attention
                  </p>
                </CardContent>
              </Card>

              <Card className="text-white" style={{ background: 'linear-gradient(135deg, #33A852 0%, #6E6E6E 100%)' }}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                  <DollarSign className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$22.5K</div>
                  <p className="text-xs opacity-80">
                    +15% from last month
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
                          <div className="text-sm" style={{ color: '#6E6E6E' }}>{user.profile.contactPerson}</div>
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">{user.userType}</TableCell>
                      <TableCell>{user.profile.companyName}</TableCell>
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
                                      <p className="text-sm">{selectedUser.profile.companyName}</p>
                                    </div>
                                    <div>
                                      <Label>Contact Person</Label>
                                      <p className="text-sm">{selectedUser.profile.contactPerson}</p>
                                    </div>
                                    <div>
                                      <Label>Phone</Label>
                                      <p className="text-sm">{selectedUser.profile.phone}</p>
                                    </div>
                                    <div>
                                      <Label>Status</Label>
                                      <div className="mt-1">{getStatusBadge(selectedUser.status)}</div>
                                    </div>
                                  </div>
                                  <div>
                                    <Label>Address</Label>
                                    <p className="text-sm">{selectedUser.profile.address}</p>
                                  </div>
                                  
                                  {selectedUser.status !== 'active' && (
                                    <div className="flex space-x-2 pt-4">
                                      <Button
                                        size="sm"
                                        onClick={() => handleUserStatusUpdate(selectedUser.id, 'active')}
                                        style={{ backgroundColor: '#33A852' }}
                                        className="text-white hover:opacity-90"
                                      >
                                        <UserCheck className="mr-2 h-4 w-4" />
                                        Approve
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => handleUserStatusUpdate(selectedUser.id, 'rejected')}
                                      >
                                        <UserX className="mr-2 h-4 w-4" />
                                        Reject
                                      </Button>
                                    </div>
                                  )}
                                  
                                  {selectedUser.status === 'active' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleUserStatusUpdate(selectedUser.id, 'suspended')}
                                    >
                                      <UserMinus className="mr-2 h-4 w-4" />
                                      Suspend
                                    </Button>
                                  )}
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
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
                            onClick={() => window.open(doc.fileUrl, '_blank')}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          {doc.verificationStatus === 'pending' && (
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
      </main>
    </div>
  );
}