import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, DollarSign, ArrowLeft, CheckCircle, XCircle, Eye, TrendingUp, 
  AlertTriangle, Package, Calendar, User as UserIcon 
} from 'lucide-react';
import { authService, User } from '@/lib/auth';
import { api, Load } from '@/lib/api';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

export default function LoadFinancialsPage() {
  const { loadId } = useParams<{ loadId: string }>();
  const [user, setUser] = useState<User | null>(authService.getCurrentUser());
  const [load, setLoad] = useState<Load | null>(null);
  const [pods, setPods] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [commissionPercent, setCommissionPercent] = useState('10');
  const navigate = useNavigate();

  const isAdmin = user?.userType === 'admin';
  const isClient = user?.userType === 'client';
  const isTransporter = user?.userType === 'transporter';

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (loadId) {
      loadFinancialData();
    }
  }, [user, loadId, navigate]);

  const loadFinancialData = async () => {
    if (!loadId) return;
    setLoading(true);
    try {
      const [loadResp, podsResp, invResp, payResp] = await Promise.all([
        api.loads.getById(loadId),
        api.pods.getByLoad(loadId),
        api.invoices.getByLoad(loadId),
        api.payments.getByLoad(loadId).catch(() => ({ payments: [] }))
      ]);
      
      setLoad(loadResp.load || loadResp);
      setPods(podsResp.pods || podsResp || []);
      setInvoices(invResp.invoices || invResp || []);
      setPayments(payResp.payments || []);
    } catch (err) {
      console.error('Failed to load financial data:', err);
      toast.error('Failed to load financial data');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateClientInvoice = async () => {
    if (!loadId) return;
    try {
      await api.invoices.generateClientInvoice({
        loadId,
        commissionPercent: parseFloat(commissionPercent),
        notes: `Commission: ${commissionPercent}%`
      });
      toast.success('Client invoice generated successfully');
      await loadFinancialData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to generate client invoice');
    }
  };

  const handleInvoiceApproval = async (invoiceId: string, approve: boolean) => {
    try {
      if (isAdmin) {
        await api.invoices.updateStatus(invoiceId, approve ? 'APPROVED' : 'REJECTED');
      } else if (isClient) {
        await api.invoices.clientReview(invoiceId, approve);
      }
      toast.success(`Invoice ${approve ? 'approved' : 'rejected'} successfully`);
      await loadFinancialData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update invoice');
    }
  };

  const handlePODApproval = async (podId: string, approve: boolean) => {
    try {
      if (isAdmin) {
        await api.pods.updateStatus(podId, approve ? 'APPROVED' : 'REJECTED');
      } else if (isClient) {
        await api.pods.clientReview(podId, approve);
      }
      toast.success(`POD ${approve ? 'approved' : 'rejected'} successfully`);
      await loadFinancialData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update POD');
    }
  };

  const getStatusBadge = (status: string) => {
    const upperStatus = status?.toUpperCase() || 'PENDING';
    const statusMap: Record<string, { color: string; label: string }> = {
      APPROVED: { color: 'bg-green-100 text-green-800', label: '✅ Approved' },
      CLIENT_APPROVED: { color: 'bg-green-100 text-green-800', label: '✅ Client Approved' },
      REJECTED: { color: 'bg-red-100 text-red-800', label: '❌ Rejected' },
      CLIENT_REJECTED: { color: 'bg-red-100 text-red-800', label: '❌ Client Rejected' },
      PENDING_APPROVAL: { color: 'bg-yellow-100 text-yellow-800', label: '⏳ Pending' },
      PENDING_REVIEW: { color: 'bg-yellow-100 text-yellow-800', label: '⏳ Pending Review' },
      PENDING_PAYMENT: { color: 'bg-blue-100 text-blue-800', label: '💳 Pending Payment' },
      PAID: { color: 'bg-purple-100 text-purple-800', label: '💰 Paid' },
    };
    const { color, label } = statusMap[upperStatus] || { color: 'bg-gray-100 text-gray-800', label: status };
    return <Badge className={color}>{label}</Badge>;
  };

  const calculateFinancialSummary = () => {
    const transporterInvoices = invoices.filter(inv => inv.role === 'TRANSPORTER');
    const clientInvoices = invoices.filter(inv => inv.role === 'CLIENT');
    const approvedTransporterInvoices = transporterInvoices.filter(inv => inv.status === 'APPROVED');
    
    const transporterTotal = transporterInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const approvedTransporterTotal = approvedTransporterInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const clientTotal = clientInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const commission = clientTotal - approvedTransporterTotal;
    
    const paidPayments = payments.filter(p => p.status === 'COMPLETED' || p.status === 'PAID');
    const totalPaid = paidPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    
    return {
      transporterTotal,
      approvedTransporterTotal,
      clientTotal,
      commission,
      totalPaid,
      pendingAmount: clientTotal - totalPaid
    };
  };

  const summary = calculateFinancialSummary();
  const approvedPOD = pods.find(p => p.status === 'APPROVED');

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading financial data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <header className="bg-white shadow-lg border-b-2" style={{ borderColor: '#0A1C3F' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: '#0A1C3F' }}>
                Load Financial Management
              </h1>
              {load && (
                <p className="text-sm text-gray-600">
                  {load.title} - {load.pickupLocation} → {load.deliveryLocation}
                </p>
              )}
            </div>
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Financial Summary Card */}
        <Card className="border-2" style={{ borderColor: '#0A1C3F' }}>
          <CardHeader className="bg-gradient-to-r from-blue-50 to-green-50">
            <CardTitle className="flex items-center" style={{ color: '#0A1C3F' }}>
              <TrendingUp className="mr-2 h-5 w-5" /> Financial Summary
            </CardTitle>
            <CardDescription>Complete financial overview for this load</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Transporter Invoice Total</div>
                <div className="text-2xl font-bold text-blue-600">
                  ${summary.transporterTotal.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Approved: ${summary.approvedTransporterTotal.toLocaleString()}
                </div>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Client Invoice Total</div>
                <div className="text-2xl font-bold text-green-600">
                  ${summary.clientTotal.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Commission: ${summary.commission.toLocaleString()}
                </div>
              </div>
              
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Payment Status</div>
                <div className="text-2xl font-bold text-purple-600">
                  ${summary.totalPaid.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Pending: ${summary.pendingAmount.toLocaleString()}
                </div>
                <Progress 
                  value={summary.clientTotal > 0 ? (summary.totalPaid / summary.clientTotal) * 100 : 0} 
                  className="mt-2" 
                />
              </div>
            </div>

            {load && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Budget Range:</span>
                    <div className="font-semibold">${load.budgetMin?.toLocaleString()} - ${load.budgetMax?.toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <div className="font-semibold">{load.status}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Weight:</span>
                    <div className="font-semibold">{load.weight} tons</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Cargo Type:</span>
                    <div className="font-semibold">{load.cargoType}</div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* PODs Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center" style={{ color: '#0A1C3F' }}>
              <FileText className="mr-2 h-5 w-5" /> Proof of Delivery (PODs)
            </CardTitle>
            <CardDescription>
              {approvedPOD ? '✅ POD approved - Invoice submission enabled' : '⏳ Waiting for POD approval'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pods.length === 0 ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>No PODs uploaded yet for this load.</AlertDescription>
              </Alert>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File</TableHead>
                    <TableHead>Uploaded By</TableHead>
                    <TableHead>Upload Date</TableHead>
                    <TableHead>Status</TableHead>
                    {(isAdmin || isClient) && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pods.map((pod: any) => (
                    <TableRow key={pod.id}>
                      <TableCell>
                        <a href={pod.fileUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center">
                          <Eye className="h-4 w-4 mr-1" />
                          {pod.fileName || 'View POD'}
                        </a>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <UserIcon className="h-4 w-4 mr-1 text-gray-500" />
                          Transporter
                        </div>
                      </TableCell>
                      <TableCell>{pod.uploadedAt ? new Date(pod.uploadedAt).toLocaleString() : '—'}</TableCell>
                      <TableCell>{getStatusBadge(pod.status || 'PENDING')}</TableCell>
                      {(isAdmin || isClient) && (
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={() => handlePODApproval(pod.id, true)}
                              className="text-white"
                              style={{ backgroundColor: '#33A852' }}
                              disabled={pod.status === 'APPROVED'}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handlePODApproval(pod.id, false)}
                              variant="destructive"
                              disabled={pod.status === 'REJECTED'}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Transporter Invoices */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center" style={{ color: '#0A1C3F' }}>
              <DollarSign className="mr-2 h-5 w-5" /> Transporter Invoices
            </CardTitle>
            <CardDescription>Invoices submitted by transporter</CardDescription>
          </CardHeader>
          <CardContent>
            {invoices.filter(inv => inv.role === 'TRANSPORTER').length === 0 ? (
              <Alert>
                <AlertDescription>No transporter invoices submitted yet.</AlertDescription>
              </Alert>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice ID</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Status</TableHead>
                    {(isAdmin || isClient) && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.filter(inv => inv.role === 'TRANSPORTER').map((invoice: any) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-mono text-sm">{invoice.id.slice(-8)}</TableCell>
                      <TableCell className="font-semibold text-green-600">
                        ${Number(invoice.amount).toLocaleString()}
                      </TableCell>
                      <TableCell>{invoice.createdAt ? new Date(invoice.createdAt).toLocaleString() : '—'}</TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      {(isAdmin || isClient) && (
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={() => handleInvoiceApproval(invoice.id, true)}
                              className="text-white"
                              style={{ backgroundColor: '#33A852' }}
                              disabled={invoice.status === 'APPROVED'}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleInvoiceApproval(invoice.id, false)}
                              variant="destructive"
                              disabled={invoice.status === 'REJECTED'}
                            >
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Client Invoice Generation (Admin Only) */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center" style={{ color: '#0A1C3F' }}>
                <Package className="mr-2 h-5 w-5" /> Generate Client Invoice
              </CardTitle>
              <CardDescription>Create invoice for client with commission</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-end space-x-4">
                  <div className="flex-1">
                    <Label htmlFor="commission">Commission Percentage</Label>
                    <Input
                      id="commission"
                      type="number"
                      value={commissionPercent}
                      onChange={(e) => setCommissionPercent(e.target.value)}
                      placeholder="10"
                      min="0"
                      max="100"
                    />
                  </div>
                  <Button
                    onClick={handleGenerateClientInvoice}
                    className="text-white"
                    style={{ backgroundColor: '#0A1C3F' }}
                    disabled={summary.approvedTransporterTotal === 0}
                  >
                    Generate Client Invoice
                  </Button>
                </div>
                {summary.approvedTransporterTotal === 0 && (
                  <div className="text-sm text-orange-600">
                    ⚠️ Approve transporter invoice first before generating client invoice
                  </div>
                )}
              </div>

              {/* Client Invoices List */}
              {invoices.filter(inv => inv.role === 'CLIENT').length > 0 && (
                <div className="mt-6">
                  <h4 className="font-medium mb-3">Generated Client Invoices</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice ID</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Commission</TableHead>
                        <TableHead>Generated</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.filter(inv => inv.role === 'CLIENT').map((invoice: any) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-mono text-sm">{invoice.id.slice(-8)}</TableCell>
                          <TableCell className="font-semibold text-blue-600">
                            ${Number(invoice.amount).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-purple-600">
                            ${Number(invoice.commissionAmount || 0).toLocaleString()} ({invoice.commissionPercent || 0}%)
                          </TableCell>
                          <TableCell>{invoice.createdAt ? new Date(invoice.createdAt).toLocaleString() : '—'}</TableCell>
                          <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Payment Tracking */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center" style={{ color: '#0A1C3F' }}>
              <Calendar className="mr-2 h-5 w-5" /> Payment Tracking
            </CardTitle>
            <CardDescription>Track payments from client → admin → transporter</CardDescription>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <Alert>
                <AlertDescription>No payments recorded yet for this load.</AlertDescription>
              </Alert>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment ID</TableHead>
                    <TableHead>From → To</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment: any) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono text-sm">{payment.id.slice(-8)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">Client → Admin</div>
                          {payment.type === 'TRANSPORTER_PAYOUT' && (
                            <div className="text-gray-500">Admin → Transporter</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">${Number(payment.amount).toLocaleString()}</TableCell>
                      <TableCell>{payment.createdAt ? new Date(payment.createdAt).toLocaleString() : '—'}</TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
