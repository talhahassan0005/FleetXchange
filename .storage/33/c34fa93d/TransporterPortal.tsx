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
import { Search, Truck, DollarSign, MessageSquare, LogOut, Package } from 'lucide-react';
import { authService, User, Load, Bid, Message } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';
import DocumentUpload from '@/components/DocumentUpload';

export default function TransporterPortal() {
  const [user, setUser] = useState<User | null>(null);
  const [loads, setLoads] = useState<Load[]>([]);
  const [myBids, setMyBids] = useState<Bid[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
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

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Truck className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Transporter Portal</h1>
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
              <CardTitle className="text-sm font-medium">Available Loads</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loads.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Bids</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{myBids.length}</div>
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
            <TabsTrigger value="loads">Available Loads</TabsTrigger>
            <TabsTrigger value="bids">My Bids</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
          </TabsList>

          <TabsContent value="loads">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Available Loads</CardTitle>
                    <CardDescription>Browse and bid on available shipping loads</CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Search className="h-4 w-4 text-gray-400" />
                    <Input placeholder="Search loads..." className="w-64" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
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
          </TabsContent>

          <TabsContent value="bids">
            <Card>
              <CardHeader>
                <CardTitle>My Bids</CardTitle>
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
                        <TableRow key={bid.id}>
                          <TableCell>{load?.title || `Load #${bid.loadId.slice(-4)}`}</TableCell>
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
          </TabsContent>

          <TabsContent value="documents">
            <DocumentUpload />
          </TabsContent>

          <TabsContent value="messages">
            <Card>
              <CardHeader>
                <CardTitle>Messages</CardTitle>
                <CardDescription>Communication with clients</CardDescription>
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