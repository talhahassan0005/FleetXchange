import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Search, Truck, DollarSign, MessageSquare, LogOut, Package, FileText, BarChart3,
  TrendingUp, Activity, Award, Clock, MapPin, Calendar, Weight, CheckCircle
} from 'lucide-react';
import { authService, User, Load, Bid, Message } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import DocumentUpload from '@/components/DocumentUpload';

export default function TransporterPortal() {
  const [user, setUser] = useState<User | null>(null);
  const [loads, setLoads] = useState<Load[]>([]);
  const [myBids, setMyBids] = useState<Bid[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedLoad, setSelectedLoad] = useState<Load | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [bidForm, setBidForm] = useState({
    amount: '',
    pickupDate: '',
    deliveryDate: '',
    comments: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    if (currentUser) {
      setLoads(authService.getAllLoads().filter(load => load.status === 'active'));
      setMyBids(authService.getUserBids(currentUser.id));
      setMessages(authService.getUserMessages(currentUser.id));
    }
  }, []);

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const handlePlaceBid = () => {
    if (!user || !selectedLoad) return;

    const bid = authService.createBid({
      loadId: selectedLoad.id,
      transporterId: user.id,
      amount: parseInt(bidForm.amount),
      pickupDate: bidForm.pickupDate,
      deliveryDate: bidForm.deliveryDate,
      comments: bidForm.comments,
      status: 'active'
    });

    setMyBids([...myBids, bid]);
    setBidForm({
      amount: '',
      pickupDate: '',
      deliveryDate: '',
      comments: ''
    });
    setSelectedLoad(null);
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
    load.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    load.cargoType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    load.pickupLocation.toLowerCase().includes(searchTerm.toLowerCase()) ||
    load.deliveryLocation.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sample data for charts
  const biddingStatsData = [
    { month: 'Jan', bids: 15, won: 8, earnings: 32000 },
    { month: 'Feb', bids: 18, won: 12, earnings: 45000 },
    { month: 'Mar', bids: 22, won: 14, earnings: 52000 },
    { month: 'Apr', bids: 25, won: 16, earnings: 58000 },
    { month: 'May', bids: 28, won: 18, earnings: 64000 },
    { month: 'Jun', bids: 32, won: 22, earnings: 78000 }
  ];

  const routeData = [
    { route: 'LA-NYC', loads: 25, color: '#3B82F6' },
    { route: 'Chicago-Miami', loads: 18, color: '#10B981' },
    { route: 'Dallas-Seattle', loads: 15, color: '#F59E0B' },
    { route: 'Boston-Denver', loads: 12, color: '#EF4444' },
    { route: 'Others', loads: 30, color: '#8B5CF6' }
  ];

  const navigationItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'loads', label: 'Available Loads', icon: Package },
    { id: 'bids', label: 'My Bids', icon: DollarSign },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'messages', label: 'Messages', icon: MessageSquare }
  ];

  if (!user) return null;

  const availableLoads = loads.length;
  const totalBids = myBids.length;
  const wonBids = myBids.filter(b => b.status === 'won').length;
  const activeBids = myBids.filter(b => b.status === 'active').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      {/* Header with Top Navigation */}
      <header className="bg-white shadow-lg border-b border-green-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg mr-3">
                <Truck className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  Transporter Portal
                </h1>
                <p className="text-sm text-gray-600">{user.profile.companyName}</p>
              </div>
            </div>
            <Button onClick={handleLogout} variant="outline" className="hover:bg-green-50 hover:border-green-200">
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
                      ? 'border-green-500 text-green-600'
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
              <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Available Loads</CardTitle>
                  <Package className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{availableLoads}</div>
                  <p className="text-xs text-green-100">
                    Ready to bid
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">My Bids</CardTitle>
                  <DollarSign className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalBids}</div>
                  <p className="text-xs text-blue-100">
                    Total submitted
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Won Bids</CardTitle>
                  <Award className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{wonBids}</div>
                  <p className="text-xs text-purple-100">
                    Success rate: {totalBids > 0 ? Math.round((wonBids / totalBids) * 100) : 0}%
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Earnings</CardTitle>
                  <TrendingUp className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$78K</div>
                  <p className="text-xs text-orange-100">
                    This month
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="mr-2 h-5 w-5 text-green-600" />
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
                      <Line type="monotone" dataKey="bids" stroke="#3B82F6" strokeWidth={2} name="Bids Placed" />
                      <Line type="monotone" dataKey="won" stroke="#10B981" strokeWidth={2} name="Bids Won" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Activity className="mr-2 h-5 w-5 text-blue-600" />
                    Popular Routes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={routeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="loads"
                      >
                        {routeData.map((entry, index) => (
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
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="mr-2 h-5 w-5 text-purple-600" />
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
                    <Bar dataKey="earnings" fill="#8B5CF6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="p-3 bg-green-500 rounded-full w-fit mx-auto mb-4">
                    <Search className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-green-800 mb-2">Browse Loads</h3>
                  <p className="text-sm text-green-600 mb-4">Find new shipping opportunities</p>
                  <Button 
                    onClick={() => setActiveTab('loads')}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    View Loads
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="p-3 bg-blue-500 rounded-full w-fit mx-auto mb-4">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-blue-800 mb-2">Track Bids</h3>
                  <p className="text-sm text-blue-600 mb-4">Monitor your bid status</p>
                  <Button 
                    onClick={() => setActiveTab('bids')}
                    className="bg-blue-600 hover:bg-blue-700"
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
                    <Package className="mr-2 h-5 w-5 text-green-600" />
                    Available Loads
                  </CardTitle>
                  <CardDescription>Browse and bid on available shipping loads</CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Search className="h-4 w-4 text-gray-400" />
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
              <div className="grid gap-4">
                {filteredLoads.map((load) => (
                  <Card key={load.id} className="hover:shadow-md transition-shadow border-l-4 border-l-green-500">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-semibold text-gray-900">{load.title}</h3>
                            <div className="flex items-center space-x-2">
                              <Badge className="bg-green-100 text-green-800">{load.cargoType}</Badge>
                              {hasUserBid(load.id) && (
                                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                  Bid Placed
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div className="flex items-center text-sm text-gray-600">
                              <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                              <div>
                                <p className="font-medium">Route</p>
                                <p>{load.pickupLocation} → {load.deliveryLocation}</p>
                              </div>
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <Weight className="h-4 w-4 mr-1 text-gray-400" />
                              <div>
                                <p className="font-medium">Weight</p>
                                <p>{load.weight} tons</p>
                              </div>
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                              <div>
                                <p className="font-medium">Pickup</p>
                                <p>{load.pickupDate}</p>
                              </div>
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <DollarSign className="h-4 w-4 mr-1 text-gray-400" />
                              <div>
                                <p className="font-medium">Budget</p>
                                <p className="font-semibold text-green-600">
                                  ${load.budgetMin.toLocaleString()} - ${load.budgetMax.toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          <p className="text-gray-600 text-sm mb-4">{load.description}</p>
                        </div>
                      </div>
                      
                      <div className="flex justify-end">
                        {hasUserBid(load.id) ? (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Bid Submitted
                          </Badge>
                        ) : (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                onClick={() => setSelectedLoad(load)}
                                className="bg-gradient-to-r from-green-600 to-emerald-600"
                              >
                                <DollarSign className="mr-2 h-4 w-4" />
                                Place Bid
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Place Bid</DialogTitle>
                                <DialogDescription>
                                  Submit your bid for: {load.title}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="p-4 bg-gray-50 rounded-lg">
                                  <h4 className="font-medium mb-2">Load Details</h4>
                                  <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>Route: {load.pickupLocation} → {load.deliveryLocation}</div>
                                    <div>Weight: {load.weight} tons</div>
                                    <div>Pickup: {load.pickupDate}</div>
                                    <div>Budget: ${load.budgetMin.toLocaleString()} - ${load.budgetMax.toLocaleString()}</div>
                                  </div>
                                </div>
                                
                                <div className="space-y-2">
                                  <Label htmlFor="amount">Bid Amount ($)</Label>
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
                                    onChange={(e) => setBidForm({...bidForm, pickupDate: e.target.value})}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="deliveryDate">Proposed Delivery Date</Label>
                                  <Input
                                    id="deliveryDate"
                                    type="date"
                                    value={bidForm.deliveryDate}
                                    onChange={(e) => setBidForm({...bidForm, deliveryDate: e.target.value})}
                                  />
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
                              <Button onClick={handlePlaceBid} className="w-full bg-gradient-to-r from-green-600 to-emerald-600">
                                Submit Bid
                              </Button>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'bids' && (
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="mr-2 h-5 w-5 text-blue-600" />
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
                    <TableHead>Pickup Date</TableHead>
                    <TableHead>Delivery Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myBids.map((bid) => {
                    const load = loads.find(l => l.id === bid.loadId) || 
                                 authService.getAllLoads().find(l => l.id === bid.loadId);
                    return (
                      <TableRow key={bid.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div>
                            <div className="font-medium">{load?.title || `Load #${bid.loadId.slice(-4)}`}</div>
                            {load && (
                              <div className="text-sm text-gray-500 flex items-center">
                                <MapPin className="h-3 w-3 mr-1" />
                                {load.pickupLocation} → {load.deliveryLocation}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-green-600">
                            ${bid.amount.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell>{bid.pickupDate}</TableCell>
                        <TableCell>{bid.deliveryDate}</TableCell>
                        <TableCell>{getStatusBadge(bid.status)}</TableCell>
                        <TableCell className="text-gray-500">
                          {new Date(bid.createdAt).toLocaleDateString()}
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
              <CardDescription>Communication with clients</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No messages yet</p>
                    <p className="text-sm text-gray-400">Messages will appear here when clients contact you</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <Card key={message.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-green-600 rounded-full flex items-center justify-center text-white text-sm font-medium mr-3">
                              C
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