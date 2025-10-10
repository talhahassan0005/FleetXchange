import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Truck, Package, MessageSquare, LogOut, DollarSign } from 'lucide-react';
import { authService, User, Load, Bid, Message } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';
import DocumentUpload from '@/components/DocumentUpload';

export default function ClientPortal() {
  const [user, setUser] = useState<User | null>(null);
  const [loads, setLoads] = useState<Load[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
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

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Client Portal</h1>
                <p className="text-sm text-gray-600">{user.profile.companyName}</p>
              </div>
            </div>
            <Button onClick={handleLogout} variant="outline">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Loads</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loads.filter(l => l.status === 'active').length}
              </div>
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
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{messages.length}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="loads" className="space-y-4">
          <TabsList>
            <TabsTrigger value="loads">My Loads</TabsTrigger>
            <TabsTrigger value="bids">Bid Management</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
          </TabsList>

          <TabsContent value="loads">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Load Management</CardTitle>
                    <CardDescription>Create and manage your shipping loads</CardDescription>
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loads.map((load) => (
                      <TableRow key={load.id}>
                        <TableCell>{load.title}</TableCell>
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
          </TabsContent>

          <TabsContent value="bids">
            <Card>
              <CardHeader>
                <CardTitle>Bid Management</CardTitle>
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
                        <TableRow key={bid.id}>
                          <TableCell>{load?.title}</TableCell>
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
          </TabsContent>

          <TabsContent value="documents">
            <DocumentUpload />
          </TabsContent>

          <TabsContent value="messages">
            <Card>
              <CardHeader>
                <CardTitle>Messages</CardTitle>
                <CardDescription>Communication with transporters</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {messages.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No messages yet</p>
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
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}