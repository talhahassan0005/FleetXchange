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
import { 
  Plus, Package, MessageSquare, LogOut, DollarSign, FileText, BarChart3,
  TrendingUp, Activity, Clock, CheckCircle, Eye, MapPin, Calendar, Download
} from 'lucide-react';
import { authService, User, Load, Bid, Message } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import DocumentUpload from '@/components/DocumentUpload';
import FormsDownload from '@/components/FormsDownload';

export default function ClientPortal() {
  const [user, setUser] = useState<User | null>(null);
  const [loads, setLoads] = useState<Load[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
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
    budgetMax: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    if (currentUser) {
      setLoads(authService.getUserLoads(currentUser.id));
      setBids(authService.getAllBids());
      setMessages(authService.getUserMessages(currentUser.id));
    }
  }, []);

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const handleCreateLoad = () => {
    if (!user) return;
    
    const load = authService.createLoad({
      clientId: user.id,
      title: newLoad.title,
      description: newLoad.description,
      cargoType: newLoad.cargoType,
      weight: parseFloat(newLoad.weight),
      pickupLocation: newLoad.pickupLocation,
      deliveryLocation: newLoad.deliveryLocation,
      pickupDate: newLoad.pickupDate,
      deliveryDate: newLoad.deliveryDate,
      budgetMin: parseInt(newLoad.budgetMin),
      budgetMax: parseInt(newLoad.budgetMax),
      status: 'active'
    });

    setLoads([...loads, load]);
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
      budgetMax: ''
    });
  };

  const handleAcceptBid = (bidId: string) => {
    authService.acceptBid(bidId);
    setBids(authService.getAllBids());
    if (user) {
      setLoads(authService.getUserLoads(user.id));
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

  // Sample data for charts
  const loadStatsData = [
    { month: 'Jan', posted: 8, completed: 6, revenue: 15000 },
    { month: 'Feb', posted: 12, completed: 9, revenue: 22000 },
    { month: 'Mar', posted: 10, completed: 8, revenue: 18000 },
    { month: 'Apr', posted: 15, completed: 12, revenue: 28000 },
    { month: 'May', posted: 18, completed: 14, revenue: 32000 },
    { month: 'Jun', posted: 22, completed: 18, revenue: 38000 }
  ];

  const cargoTypeData = [
    { name: 'Electronics', value: 35, color: '#0A1C3F' },
    { name: 'Machinery', value: 25, color: '#33A852' },
    { name: 'Consumer Goods', value: 20, color: '#6E6E6E' },
    { name: 'Raw Materials', value: 20, color: '#1E40AF' }
  ];

  const navigationItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'loads', label: 'My Loads', icon: Package },
    { id: 'bids', label: 'Bid Management', icon: DollarSign },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'forms', label: 'Forms', icon: Download },
    { id: 'messages', label: 'Messages', icon: MessageSquare }
  ];

  if (!user) return null;

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
                  onClick={() => setActiveTab(item.id)}
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
            {/* Stats Cards - EXACT MATCH TO ADMIN PORTAL */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="text-white" style={{ background: 'linear-gradient(135deg, #0A1C3F 0%, #33A852 100%)' }}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Loads</CardTitle>
                  <Package className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loads.filter(l => l.status === 'active').length}
                  </div>
                  <p className="text-xs opacity-80">
                    +12% from last month
                  </p>
                </CardContent>
              </Card>

              <Card className="text-white" style={{ background: 'linear-gradient(135deg, #33A852 0%, #0A1C3F 100%)' }}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Bids</CardTitle>
                  <DollarSign className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {bids.filter(b => loads.some(l => l.id === b.loadId)).length}
                  </div>
                  <p className="text-xs opacity-80">
                    +8% from last month
                  </p>
                </CardContent>
              </Card>

              <Card className="text-white" style={{ backgroundColor: '#6E6E6E' }}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completed</CardTitle>
                  <CheckCircle className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loads.filter(l => l.status === 'completed').length}
                  </div>
                  <p className="text-xs opacity-80">
                    +15% from last month
                  </p>
                </CardContent>
              </Card>

              <Card className="text-white" style={{ background: 'linear-gradient(135deg, #0A1C3F 0%, #6E6E6E 100%)' }}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                  <DollarSign className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$38.2K</div>
                  <p className="text-xs opacity-80">
                    +22% from last month
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
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      className="text-white"
                      style={{ backgroundColor: '#33A852' }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Post New Load
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle style={{ color: '#0A1C3F' }}>Post New Load</DialogTitle>
                      <DialogDescription>
                        Create a new shipping load for transporters to bid on
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4 py-4">
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
                        <Label htmlFor="budgetMin">Min Budget ($)</Label>
                        <Input
                          id="budgetMin"
                          type="number"
                          value={newLoad.budgetMin}
                          onChange={(e) => setNewLoad({...newLoad, budgetMin: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="budgetMax">Max Budget ($)</Label>
                        <Input
                          id="budgetMax"
                          type="number"
                          value={newLoad.budgetMax}
                          onChange={(e) => setNewLoad({...newLoad, budgetMax: e.target.value})}
                        />
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
                    >
                      Post Load
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
                            ${load.budgetMin.toLocaleString()} - ${load.budgetMax.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4" />
                          </Button>
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
                            {bid.status === 'active' && (
                              <Button
                                size="sm"
                                onClick={() => handleAcceptBid(bid.id)}
                                className="text-white"
                                style={{ backgroundColor: '#33A852' }}
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Accept Bid
                              </Button>
                            )}
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
              <CardDescription>Communication with transporters</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4" style={{ color: '#6E6E6E' }} />
                    <p style={{ color: '#6E6E6E' }}>No messages yet</p>
                    <p className="text-sm" style={{ color: '#6E6E6E' }}>Messages will appear here when you communicate with transporters</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div key={message.id} className="border rounded-lg p-4 hover:bg-purple-50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium" style={{ color: '#0A1C3F' }}>Load #{message.loadId?.slice(-4) || 'System'}</span>
                        <span className="text-sm" style={{ color: '#6E6E6E' }}>
                          {new Date(message.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p style={{ color: '#6E6E6E' }}>{message.message}</p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}