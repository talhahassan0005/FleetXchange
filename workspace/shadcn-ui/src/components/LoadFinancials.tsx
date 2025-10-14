import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { websocketService } from '@/lib/websocket';

interface Props {
  loadId: string;
  currentUserId: string;
  currentUserType: 'ADMIN' | 'CLIENT' | 'TRANSPORTER';
}

export default function LoadFinancials({ loadId, currentUserId, currentUserType }: Props) {
  const [pods, setPods] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [commissionPercent, setCommissionPercent] = useState('10');

  const loadAll = async () => {
    try {
      const [podsResp, invoicesResp, paymentsResp] = await Promise.all([
        api.pods.getByLoad(loadId),
        api.invoices.getByLoad(loadId),
        api.payments.getByLoad(loadId)
      ]);
      setPods(podsResp.pods || podsResp);
      setInvoices(invoicesResp.invoices || invoicesResp);
      setPayments(paymentsResp.payments || paymentsResp);
    } catch (err) {
      console.error('Failed to load financials:', err);
      toast.error('Failed to load financials');
    }
  };

  useEffect(() => { loadAll(); }, [loadId]);

  useEffect(() => {
    websocketService.connect();

    const refresh = () => loadAll();
    websocketService.on('invoice_created', refresh);
    websocketService.on('invoice_submitted', refresh);
    websocketService.on('invoice_status_updated', refresh);
    websocketService.on('client_invoice_created', refresh);
    websocketService.on('payment_created', refresh);
    websocketService.on('payment_status_updated', refresh);

    return () => {
      websocketService.off('invoice_created', refresh);
      websocketService.off('invoice_submitted', refresh);
      websocketService.off('invoice_status_updated', refresh);
      websocketService.off('client_invoice_created', refresh);
      websocketService.off('payment_created', refresh);
      websocketService.off('payment_status_updated', refresh);
    };
  }, [loadId]);

  const handleUploadPOD = async () => {
    if (!selectedFile) { toast.error('Select a file'); return; }
    setUploading(true);
    try {
      const upload = await api.upload.single(selectedFile, 'POD');
      const fileUrl = upload.file.fileUrl;
      const pod = await api.pods.create({ loadId, fileUrl, fileName: upload.file.originalName });
      toast.success('POD uploaded');
      setSelectedFile(null);
      await loadAll();
    } catch (err) {
      console.error('POD upload failed:', err);
      toast.error('POD upload failed');
    } finally { setUploading(false); }
  };

  const handleSubmitInvoice = async () => {
    if (!invoiceAmount || isNaN(Number(invoiceAmount))) { toast.error('Enter a valid amount'); return; }
    try {
      const resp = await api.invoices.submitTransporterInvoice({ loadId, amount: Number(invoiceAmount) });
      toast.success('Invoice submitted');
      setInvoiceAmount('');
      await loadAll();
    } catch (err) {
      console.error('Failed to submit invoice:', err);
      toast.error('Failed to submit invoice');
    }
  };

  const handleGenerateClientInvoice = async () => {
    if (!commissionPercent || isNaN(Number(commissionPercent))) { toast.error('Enter valid commission percent'); return; }
    try {
      const resp = await api.invoices.generateClientInvoice({ loadId, commissionPercent: Number(commissionPercent) });
      toast.success('Client invoice generated');
      await loadAll();
    } catch (err) {
      console.error('Failed to generate client invoice:', err);
      toast.error('Failed to generate client invoice');
    }
  };

  const handleInitiatePayment = async (invoiceId: string) => {
    try {
      const invoice = invoices.find(i => i.id === invoiceId);
      const resp = await api.payments.initiatePayment({ invoiceId, amount: invoice.amount });
      toast.success('Payment initiated');
      await loadAll();
    } catch (err) {
      console.error('Failed to initiate payment:', err);
      toast.error('Failed to initiate payment');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-semibold">Proof of Delivery (POD)</h4>
        <div className="flex items-center space-x-2">
          <input type="file" onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)} />
          <Button onClick={handleUploadPOD} disabled={!selectedFile || uploading}>{uploading ? 'Uploading...' : 'Upload POD'}</Button>
        </div>

        <div className="mt-2">
          {pods.length === 0 ? <div className="text-sm text-gray-500">No PODs uploaded yet.</div> : (
            <ul className="list-disc pl-5">
              {pods.map(p => <li key={p.id}><a href={p.fileUrl} target="_blank" rel="noreferrer">{p.fileName}</a> — uploaded: {new Date(p.uploadedAt).toLocaleString()}</li>)}
            </ul>
          )}
        </div>
      </div>

      <div>
        <h4 className="font-semibold">Invoices</h4>
        {currentUserType === 'TRANSPORTER' && (
          <div className="flex items-center space-x-2">
            <Input placeholder="Amount" value={invoiceAmount} onChange={(e) => setInvoiceAmount(e.target.value)} />
            <Button onClick={handleSubmitInvoice}>Submit Invoice</Button>
          </div>
        )}

        <div className="mt-2">
          {invoices.length === 0 ? <div className="text-sm text-gray-500">No invoices yet.</div> : (
            <ul className="list-disc pl-5">
              {invoices.map(inv => (
                <li key={inv.id} className="mb-1">
                  <div className="flex items-center justify-between">
                    <div><strong>{inv.role}</strong> — {inv.amount} {inv.currency || 'USD'} — {inv.status}</div>
                    {currentUserType === 'ADMIN' && inv.role === 'TRANSPORTER' && (
                      <div className="space-x-2">
                        <Button size="sm" onClick={async () => {
                          try { await api.invoices.updateStatus(inv.id, 'APPROVED'); toast.success('Invoice approved'); await loadAll(); }
                          catch (err) { console.error(err); toast.error('Failed to approve'); }
                        }}>Approve</Button>
                        <Button size="sm" onClick={async () => {
                          try { await api.invoices.updateStatus(inv.id, 'REJECTED'); toast.success('Invoice rejected'); await loadAll(); }
                          catch (err) { console.error(err); toast.error('Failed to reject'); }
                        }}>Reject</Button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {currentUserType === 'ADMIN' && (
          <div className="mt-3">
            <Label>Commission %</Label>
            <div className="flex items-center space-x-2">
              <Input value={commissionPercent} onChange={(e) => setCommissionPercent(e.target.value)} />
              <Button onClick={handleGenerateClientInvoice}>Generate Client Invoice</Button>
            </div>
          </div>
        )}
      </div>

      <div>
        <h4 className="font-semibold">Payments</h4>
        <div>
          {payments.length === 0 ? <div className="text-sm text-gray-500">No payments yet.</div> : (
            <ul className="list-disc pl-5">
              {payments.map(p => (
                <li key={p.id} className="mb-1">
                  <div className="flex items-center justify-between">
                    <div>{p.amount} — {p.status} — payer: {p.payerId}</div>
                    {currentUserType === 'ADMIN' && (
                      <div className="space-x-2">
                        {p.status !== 'IN_PROGRESS' && <Button size="sm" onClick={async () => { try { await api.payments.updateStatus(p.id, 'IN_PROGRESS'); toast.success('Payment set to In Progress'); await loadAll(); } catch (err) { console.error(err); toast.error('Failed'); } }}>Mark In Progress</Button>}
                        {p.status !== 'COMPLETED' && <Button size="sm" onClick={async () => { try { await api.payments.updateStatus(p.id, 'COMPLETED'); toast.success('Payment completed'); await loadAll(); } catch (err) { console.error(err); toast.error('Failed'); } }}>Mark Completed</Button>}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {currentUserType === 'CLIENT' && invoices.some(i => i.role === 'CLIENT' && i.status === 'PENDING_PAYMENT') && (
          <div className="mt-2">
            <Button onClick={() => handleInitiatePayment(invoices.find(i => i.role === 'CLIENT' && i.status === 'PENDING_PAYMENT').id)}>Pay Client Invoice</Button>
          </div>
        )}
      </div>
    </div>
  );
}
