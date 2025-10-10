import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Plus, Package, MessageSquare, LogOut, DollarSign, FileText, BarChart3, 
  TrendingUp, Activity, Clock, CheckCircle, AlertCircle, Eye, MapPin
} from 'lucide-react';
import { authService, User, Load, Bid, Message } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import DocumentUpload from '@/components/DocumentUpload';

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
    { month: 'Jan', posted: 12, completed: 8, revenue: 24000 },
    { month: 'Feb', posted: 15, completed: 12, revenue: 36000 },
    { month: 'Mar', posted: 18, completed: 14, revenue: 42000 },
    { month: 'Apr', posted: 22, completed: 18, revenue: 54000 },
    { month: 'May', posted: 25, completed: 20, revenue: 60000 },
    { month: 'Jun', posted: 28, completed: 24, revenue: 72000 }
  ];

  const cargoTypeData = [
    { name: 'Electronics', value: 35, color: '#3B82F6' },
    { name: 'Machinery', value: 25, color: '#10B981' },
    { name: 'Textiles', value: 20, color: '#F59E0B' },
    { name: 'Food Products', value: 15, color: '#EF4444' },
    { name: 'Others', value: 5, color: '#8B5CF6' }
  ];

  const navigationItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'loads', label: 'My Loads', icon: Package },
    { id: 'bids', label: 'Bid Management', icon: DollarSign },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'messages', label: 'Messages', icon: MessageSquare }
  ];

  if (!user) return null;

  const activeLoads = loads.filter(l => l.status === 'active').length;
  const assignedLoads = loads.filter(l => l.status === 'assigned').length;
  const completedLoads = loads.filter(l => l.status === 'completed').length;
  const totalBids = bids.filter(b => loads.some(l => l.id === b.loadId)).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header with Top Navigation */}
      <header className="bg-white shadow-lg border-b border-blue-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg mr-3">
                <Package className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Client Portal
                </h1>
                <p className="text-sm text-gray-600">{user.profile.companyName}</p>
              </div>
            </div>
            <Button onClick={handleLogout} variant="outline" className="hover:bg-blue-50 hover:border-blue-200">
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
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
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
              <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Loads</CardTitle>
                  <Package className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{activeLoads}</div>
                  <p className="text-xs text-blue-100">
                    Currently posted
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Bids</CardTitle>
                  <DollarSign className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalBids}</div>
                  <p className="text-xs text-green-100">
                    Received bids
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Assigned Loads</CardTitle>
                  <CheckCircle className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{assignedLoads}</div>
                  <p className="text-xs text-purple-100">
                    In progress
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Messages</CardTitle>
                  <MessageSquare className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{messages.length}</div>
                  <p className="text-xs text-orange-100">
                    Unread messages
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="mr-2 h-5 w-5 text-blue-600" />
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
                      <Line type="monotone" dataKey="posted" stroke="#3B82F6" strokeWidth={2} name="Posted" />
                      <Line type="monotone" dataKey="completed" stroke="#10B981" strokeWidth={2} name="Completed" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Activity className="mr-2 h-5 w-5 text-green-600" />
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

            {/* Revenue Chart */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="mr-2 h-5 w-5 text-purple-600" />
                  Revenue Analytics
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
                    <Bar dataKey="revenue" fill="#8B5CF6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="p-3 bg-blue-500 rounded-full w-fit mx-auto mb-4">
                    <Plus className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-blue-800 mb-2">Post New Load</h3>
                  <p className="text-sm text-blue-600 mb-4">Create a new shipping request</p>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="bg-blue-600 hover:bg-blue-700">Get Started</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Post New Load</DialogTitle>
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
                      <Button onClick={handleCreateLoad} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600">
                        Post Load
                      </Button>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="p-3 bg-green-500 rounded-full w-fit mx-auto mb-4">
                    <Eye className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-green-800 mb-2">Review Bids</h3>
                  <p className="text-sm text-green-600 mb-4">Check incoming bids on your loads</p>
                  <Button 
                    onClick={() => setActiveTab('bids')}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    View Bids
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="p-3 bg-purple-500 rounded-full w-fit mx-auto mb-4">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-purple-800 mb-2">Upload Documents</h3>
                  <p className="text-sm text-purple-600 mb-4">Complete your verification</p>
                  <Button 
                    onClick={() => setActiveTab('documents')}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    Manage Docs
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'loads' && (
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center">
                    <Package className="mr-2 h-5 w-5 text-blue-600" />
                    Load Management
                  </CardTitle>
                  <CardDescription>Create and manage your shipping loads</CardDescription>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-blue-600 to-indigo-600">
                      <Plus className="h-4 w-4 mr-2" />
                      Post New Load
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Post New Load</DialogTitle>
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
                    <Button onClick={handleCreateLoad} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600">
                      Post Load
                    </Button>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Bids Received</TableHead>
                    <TableHead>Budget Range</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loads.map((load) => (
                    <TableRow key={load.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">{load.title}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 text-gray-400 mr-1" />
                          {load.pickupLocation} → {load.deliveryLocation}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(load.status)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          {getLoadBids(load.id).length} bids
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-green-600">
                          ${load.budgetMin.toLocaleString()} - ${load.budgetMax.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {new Date(load.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {activeTab === 'bids' && (
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="mr-2 h-5 w-5 text-green-600" />
                Bid Management
              </CardTitle>
              <CardDescription>Review and accept bids from transporters</CardDescription>
            </CardHeader>
            <CardContent>
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
                      <TableRow key={bid.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{load?.title}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-green-600 rounded-full flex items-center justify-center text-white text-sm font-medium mr-2">
                              T
                            </div>
                            Transporter #{bid.transporterId.slice(-4)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-green-600">
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
                              className="bg-gradient-to-r from-green-600 to-green-700"
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
            </CardContent>
          </Card>
        )}

        {activeTab === 'documents' && <DocumentUpload />}

        {activeTab === 'messages' && (
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="mr-2 h-5 w-5 text-purple-600" />
                Messages
              </CardTitle>
              <CardDescription>Communication with transporters</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No messages yet</p>
                    <p className="text-sm text-gray-400">Messages will appear here when transporters contact you</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <Card key={message.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium mr-3">
                              M
                            </div>
                            <span className="font-medium">Load #{message.loadId.slice(-4)}</span>
                          </div>
                          <span className="text-sm text-gray-500">
                            {new Date(message.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-gray-700 ml-11">{message.message}</p>
                      </CardContent>
                    </Card>
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