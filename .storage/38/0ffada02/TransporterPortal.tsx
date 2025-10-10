import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, Truck, DollarSign, MessageSquare, LogOut, Package, FileText, Bell, Settings } from 'lucide-react';
import { authService, User, Load, Bid, Message } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';
import DocumentUpload from '@/components/DocumentUpload';

export default function TransporterPortal() {
  const [user, setUser] = useState<User | null>(null);
  const [loads, setLoads] = useState<Load[]>([]);
  const [myBids, setMyBids] = useState<Bid[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedLoad, setSelectedLoad] = useState<Load | null>(null);
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
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  const hasUserBid = (loadId: string) => {
    return myBids.some(bid => bid.loadId === loadId);
  };

  const navigationItems = [
    { id: 'overview', label: 'Overview', icon: Truck },
    { id: 'loads', label: 'Available Loads', icon: Package },
    { id: 'bids', label: 'My Bids', icon: DollarSign },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'messages', label: 'Messages', icon: MessageSquare }
  ];

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-8">
              <div className="flex items-center">
                <Truck className="h-8 w-8 text-green-600 mr-3" />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">FleetXchange</h1>
                  <p className="text-sm text-gray-600">{user.profile.companyName}</p>
                </div>
              </div>
              
              {/* Top Navigation */}
              <nav className="flex space-x-1">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === item.id
                          ? 'bg-green-100 text-green-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm">
                <Bell className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
              <Button onClick={handleLogout} variant="outline" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 py-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Transporter Dashboard</h2>
              <p className="text-gray-600">Find loads and manage your transportation business</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Available Loads</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{loads.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Ready for bidding
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">My Bids</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{myBids.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Total submitted
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Won Bids</CardTitle>
                  <Truck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {myBids.filter(b => b.status === 'won').length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Active contracts
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Messages</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{messages.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Unread communications
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'loads' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Available Loads</h2>
                <p className="text-gray-600">Browse and bid on available shipping loads</p>
              </div>
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-gray-400" />
                <Input placeholder="Search loads..." className="w-64" />
              </div>
            </div>
            
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Cargo Type</TableHead>
                      <TableHead>Weight</TableHead>
                      <TableHead>Budget Range</TableHead>
                      <TableHead>Pickup Date</TableHead>
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
                        <TableCell>{load.cargoType}</TableCell>
                        <TableCell>{load.weight} tons</TableCell>
                        <TableCell>
                          ${load.budgetMin.toLocaleString()} - ${load.budgetMax.toLocaleString()}
                        </TableCell>
                        <TableCell>{load.pickupDate}</TableCell>
                        <TableCell>
                          {hasUserBid(load.id) ? (
                            <Badge variant="secondary">Bid Placed</Badge>
                          ) : (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  size="sm"
                                  onClick={() => setSelectedLoad(load)}
                                >
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
                                <Button onClick={handlePlaceBid} className="w-full">
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
          </div>
        )}

        {activeTab === 'bids' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">My Bids</h2>
              <p className="text-gray-600">Track your submitted bids and their status</p>
            </div>
            
            <Card>
              <CardContent className="p-0">
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
                        <TableRow key={bid.id}>
                          <TableCell className="font-medium">{load?.title || `Load #${bid.loadId.slice(-4)}`}</TableCell>
                          <TableCell>${bid.amount.toLocaleString()}</TableCell>
                          <TableCell>{bid.pickupDate}</TableCell>
                          <TableCell>{bid.deliveryDate}</TableCell>
                          <TableCell>{getStatusBadge(bid.status)}</TableCell>
                          <TableCell>
                            {new Date(bid.createdAt).toLocaleDateString()}
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

        {activeTab === 'documents' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Document Management</h2>
              <p className="text-gray-600">Upload and manage your transportation documents</p>
            </div>
            <DocumentUpload />
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Messages</h2>
              <p className="text-gray-600">Communication with clients</p>
            </div>
            
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No messages yet</p>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div key={message.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium">Load #{message.loadId.slice(-4)}</span>
                          <span className="text-sm text-gray-500">
                            {new Date(message.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-gray-700">{message.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}