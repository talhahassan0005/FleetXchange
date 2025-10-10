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
  Search, Truck, DollarSign, MessageSquare, LogOut, Package, FileText, BarChart3,
  TrendingUp, Activity, Trophy, MapPin, Calendar, Clock, CheckCircle, Star
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
    { month: 'Jan', bids: 15, won: 8, earnings: 12000 },
    { month: 'Feb', bids: 22, won: 12, earnings: 18500 },
    { month: 'Mar', bids: 18, won: 10, earnings: 15200 },
    { month: 'Apr', bids: 28, won: 16, earnings: 24000 },
    { month: 'May', bids: 32, won: 18, earnings: 28000 },
    { month: 'Jun', bids: 35, won: 22, earnings: 32500 }
  ];

  const loadTypeData = [
    { name: 'Electronics', value: 40, color: '#0A1C3F' },
    { name: 'Machinery', value: 30, color: '#33A852' },
    { name: 'Consumer Goods', value: 20, color: '#6E6E6E' },
    { name: 'Raw Materials', value: 10, color: '#1E40AF' }
  ];

  const navigationItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'loads', label: 'Available Loads', icon: Package },
    { id: 'bids', label: 'My Bids', icon: DollarSign },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'messages', label: 'Messages', icon: MessageSquare }
  ];

  if (!user) return null;

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
                <p className="text-sm" style={{ color: '#6E6E6E' }}>{user.profile.companyName}</p>
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
                  <CardTitle className="text-sm font-medium">Available Loads</CardTitle>
                  <Package className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{loads.length}</div>
                  <p className="text-xs opacity-80">
                    +5 new today
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
                    +3 this week
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
                    {myBids.filter(b => b.status === 'won').length}
                  </div>
                  <p className="text-xs opacity-80">
                    85% success rate
                  </p>
                </CardContent>
              </Card>

              <Card className="text-white" style={{ background: 'linear-gradient(135deg, #0A1C3F 0%, #6E6E6E 100%)' }}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                  <DollarSign className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$32.5K</div>
                  <p className="text-xs opacity-80">
                    +18% from last month
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
                          ${load.budgetMin.toLocaleString()} - ${load.budgetMax.toLocaleString()}
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
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Bid Placed
                          </Badge>
                        ) : (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                size="sm"
                                onClick={() => setSelectedLoad(load)}
                                className="text-white"
                                style={{ backgroundColor: '#33A852' }}
                              >
                                Place Bid
                              </Button>
                            </DialogTrigger>
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
                                    <p><strong>Route:</strong> {load.pickupLocation} → {load.deliveryLocation}</p>
                                    <p><strong>Cargo:</strong> {load.cargoType} ({load.weight} tons)</p>
                                    <p><strong>Budget:</strong> ${load.budgetMin.toLocaleString()} - ${load.budgetMax.toLocaleString()}</p>
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
                              <Button 
                                onClick={handlePlaceBid} 
                                className="w-full text-white"
                                style={{ backgroundColor: '#33A852' }}
                              >
                                Submit Bid
                              </Button>
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
                    <TableHead>Timeline</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myBids.map((bid) => {
                    const load = loads.find(l => l.id === bid.loadId) || 
                                 authService.getAllLoads().find(l => l.id === bid.loadId);
                    return (
                      <TableRow key={bid.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{load?.title || `Load #${bid.loadId.slice(-4)}`}</div>
                            {load && (
                              <div className="text-sm" style={{ color: '#6E6E6E' }}>
                                {load.pickupLocation} → {load.deliveryLocation}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium" style={{ color: '#33A852' }}>
                            ${bid.amount.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{bid.pickupDate}</div>
                            <div style={{ color: '#6E6E6E' }}>→ {bid.deliveryDate}</div>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(bid.status)}</TableCell>
                        <TableCell>
                          <div className="text-sm" style={{ color: '#6E6E6E' }}>
                            {new Date(bid.createdAt).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline">
                            View Details
                          </Button>
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
              <CardDescription>Communication with clients</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4" style={{ color: '#6E6E6E' }} />
                    <p style={{ color: '#6E6E6E' }}>No messages yet</p>
                    <p className="text-sm" style={{ color: '#6E6E6E' }}>Messages will appear here when you communicate with clients</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div key={message.id} className="border rounded-lg p-4 hover:bg-purple-50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium" style={{ color: '#0A1C3F' }}>Load #{message.loadId.slice(-4)}</span>
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