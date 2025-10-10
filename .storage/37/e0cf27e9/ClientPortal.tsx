import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Truck, Package, MessageSquare, LogOut, DollarSign, FileText, Bell, Settings } from 'lucide-react';
import { authService, User, Load, Bid, Message } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';
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
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  const navigationItems = [
    { id: 'overview', label: 'Overview', icon: Package },
    { id: 'loads', label: 'My Loads', icon: Truck },
    { id: 'bids', label: 'Bid Management', icon: DollarSign },
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
                <Package className="h-8 w-8 text-blue-600 mr-3" />
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
                          ? 'bg-blue-100 text-blue-700'
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
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Client Dashboard</h2>
              <p className="text-gray-600">Manage your loads and track shipments</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Loads</CardTitle>
                  <Truck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loads.filter(l => l.status === 'active').length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Available for bidding
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Bids</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {bids.filter(b => loads.some(l => l.id === b.loadId)).length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Received on your loads
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Assigned Loads</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loads.filter(l => l.status === 'assigned').length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Currently in transit
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
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Load Management</h2>
                <p className="text-gray-600">Create and manage your shipping loads</p>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
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
                  <Button onClick={handleCreateLoad} className="w-full">
                    Post Load
                  </Button>
                </DialogContent>
              </Dialog>
            </div>
            
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Bids Received</TableHead>
                      <TableHead>Budget Range</TableHead>
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
                        <TableCell>{getLoadBids(load.id).length}</TableCell>
                        <TableCell>
                          ${load.budgetMin.toLocaleString()} - ${load.budgetMax.toLocaleString()}
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
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Bid Management</h2>
              <p className="text-gray-600">Review and accept bids from transporters</p>
            </div>
            
            <Card>
              <CardContent className="p-0">
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
                          <TableCell>${bid.amount.toLocaleString()}</TableCell>
                          <TableCell>{bid.pickupDate}</TableCell>
                          <TableCell>{getStatusBadge(bid.status)}</TableCell>
                          <TableCell>
                            {bid.status === 'active' && (
                              <Button
                                size="sm"
                                onClick={() => handleAcceptBid(bid.id)}
                              >
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
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Document Management</h2>
              <p className="text-gray-600">Upload and manage your business documents</p>
            </div>
            <DocumentUpload />
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Messages</h2>
              <p className="text-gray-600">Communication with transporters</p>
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