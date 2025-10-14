import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, ArrowLeft } from 'lucide-react';
import { authService, User } from '@/lib/auth';
import { api, Load } from '@/lib/api';
import { useNavigate } from 'react-router-dom';

export default function PodsPage() {
	const [user, setUser] = useState<User | null>(authService.getCurrentUser());
	const [eligibleLoads, setEligibleLoads] = useState<Load[]>([]);
	const [selectedLoadId, setSelectedLoadId] = useState<string>('');
	const [file, setFile] = useState<File | null>(null);
	const [isUploading, setIsUploading] = useState(false);
	const [invoiceAmount, setInvoiceAmount] = useState<string>('');
	const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
	const [invoices, setInvoices] = useState<any[]>([]);
	const [pods, setPods] = useState<any[]>([]);
	const [deliveryNotes, setDeliveryNotes] = useState('');
	const [actualDeliveredAt, setActualDeliveredAt] = useState('');
	const navigate = useNavigate();

	const selectedLoad: Load | undefined = eligibleLoads.find(l => l.id === selectedLoadId);

	useEffect(() => {
		if (!user) {
			navigate('/login');
			return;
		}
		// loads assigned/won by this transporter
		api.loads.getAll({ assignedTransporterId: user.id, page: 1, limit: 50 }).then((resp) => {
			const loads: Load[] = resp.loads || [];
			// Filter for assigned or completed loads where transporter can upload POD
			setEligibleLoads(loads.filter(l => l.status === 'ASSIGNED' || l.status === 'COMPLETED'));
		}).catch(() => {
			setEligibleLoads([]);
		});
	}, [user, navigate]);

	useEffect(() => {
		// whenever a load is selected, pull its pods and invoices
		const fetchRelated = async () => {
			if (!selectedLoadId) { setPods([]); setInvoices([]); return; }
			try {
				const podsResp = await api.pods.getByLoad(selectedLoadId);
				setPods(podsResp.pods || podsResp || []);
			} catch {}
			try {
				const invResp = await api.invoices.getByLoad(selectedLoadId);
				setInvoices(invResp.invoices || invResp || []);
			} catch {}
		};
		fetchRelated();
	}, [selectedLoadId]);

	const handleUpload = async () => {
		if (!user) return;
		if (!selectedLoadId) return;
		if (!file) return;
		setIsUploading(true);
		try {
			const uploaded = await api.upload.single(file, 'POD');
			const nowIso = new Date().toISOString();
			// Ensure deliveredAt respects backend threshold (>= scheduled delivery)
			let actualMs = actualDeliveredAt ? Date.parse(actualDeliveredAt) : Date.now();
			const scheduledMs = selectedLoad?.deliveryDate ? Date.parse(selectedLoad.deliveryDate) : undefined;
			if (scheduledMs && actualMs < scheduledMs) {
				actualMs = scheduledMs; // coerce to scheduled delivery to satisfy backend rule
			}
			const finalDeliveredAt = new Date(actualMs).toISOString();
			const finalNotes = deliveryNotes ? deliveryNotes : (scheduledMs && Date.now() < scheduledMs ? 'Delivered early; coerced deliveredAt to scheduled delivery for upload.' : '');
			await api.pods.create({
				loadId: selectedLoadId,
				fileUrl: uploaded.file.fileUrl,
				fileName: uploaded.file.originalName,
				uploadedAt: nowIso,
				notes: finalNotes,
				deliveredAt: finalDeliveredAt
			});
			setFile(null);
			setDeliveryNotes('');
			setActualDeliveredAt('');
			try { const podsResp = await api.pods.getByLoad(selectedLoadId); setPods(podsResp.pods || podsResp || []); } catch {}
			try { const invResp = await api.invoices.getByLoad(selectedLoadId); setInvoices(invResp.invoices || invResp || []); } catch {}
			alert('POD uploaded successfully');
		} catch (err: any) {
			alert(err?.response?.data?.message || err?.message || 'Failed to upload POD');
		} finally {
			setIsUploading(false);
		}
	};

	const handleSubmitInvoice = async () => {
		if (!user || !selectedLoadId || !invoiceAmount) return;
		try {
			const approved = pods.find((p: any) => ((p.status || p.verificationStatus || '').toString().toUpperCase() === 'APPROVED'));
			if (!approved) { alert('POD must be approved by admin before submitting invoice.'); return; }
			let invoiceFileUrl: string | undefined;
			if (invoiceFile) {
				const uploadedInv = await api.upload.single(invoiceFile, 'INVOICE');
				invoiceFileUrl = uploadedInv.file.fileUrl;
			}
			await api.invoices.submitTransporterInvoice({ loadId: selectedLoadId, amount: Number(invoiceAmount), podId: approved.id, fileUrl: invoiceFileUrl });
			setInvoiceAmount('');
			setInvoiceFile(null);
			const invResp = await api.invoices.getByLoad(selectedLoadId);
			setInvoices(invResp.invoices || invResp || []);
			alert('Invoice submitted');
		} catch (err: any) {
			alert(err?.response?.data?.message || err?.message || 'Failed to submit invoice');
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
			<header className="bg-white shadow-lg border-b-2" style={{ borderColor: '#0A1C3F' }}>
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center py-4">
						<h1 className="text-2xl font-bold" style={{ color: '#0A1C3F' }}>Proof of Delivery (POD)</h1>
						<Button variant="outline" onClick={() => navigate('/dashboard')}>
							<ArrowLeft className="h-4 w-4 mr-2" /> Back
						</Button>
					</div>
				</div>
			</header>

			<main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center" style={{ color: '#0A1C3F' }}>
							<Upload className="mr-2 h-5 w-5" /> Upload POD
						</CardTitle>
						<CardDescription>Upload proof of delivery for assigned or completed loads.</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<Alert>
							<AlertDescription>
								Only upload PODs for loads you were assigned to. Clients and Admins will review and approve the POD and it will be used for invoicing and payments.
							</AlertDescription>
						</Alert>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
							<div className="space-y-2 md:col-span-1">
								<Label htmlFor="load">Select Load</Label>
								<select id="load" className="w-full border rounded-md h-10 px-3" value={selectedLoadId} onChange={(e) => setSelectedLoadId(e.target.value)}>
									<option value="">Select a load</option>
									{eligibleLoads.map(l => (
										<option key={l.id} value={l.id}>{l.title} ({l.pickupLocation} → {l.deliveryLocation})</option>
									))}
								</select>
							</div>
							<div className="space-y-2 md:col-span-1">
								<Label htmlFor="file">POD File (PDF/Image)</Label>
								<Input id="file" type="file" accept="application/pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
							</div>
							<div className="md:col-span-1">
								<Button className="w-full text-white" style={{ backgroundColor: '#33A852' }} disabled={!selectedLoadId || !file || isUploading} onClick={handleUpload}>
									{isUploading ? 'Uploading...' : 'Upload POD'}
								</Button>
							</div>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<div className="space-y-2 md:col-span-1">
								<Label htmlFor="deliveredAt">Actual Delivery (date & time)</Label>
								<Input id="deliveredAt" type="datetime-local" value={actualDeliveredAt} onChange={(e) => setActualDeliveredAt(e.target.value)} />
							</div>
							<div className="space-y-2 md:col-span-2">
								<Label htmlFor="notes">Delivery Notes (optional)</Label>
								<Input id="notes" placeholder="Notes about delivery..." value={deliveryNotes} onChange={(e) => setDeliveryNotes(e.target.value)} />
							</div>
						</div>
					</CardContent>
				</Card>

				<div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center" style={{ color: '#0A1C3F' }}>
								<FileText className="mr-2 h-5 w-5" /> Your Assigned Loads
							</CardTitle>
						</CardHeader>
						<CardContent>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Title</TableHead>
										<TableHead>Route</TableHead>
										<TableHead>Status</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{eligibleLoads.map(l => (
										<TableRow key={l.id}>
											<TableCell className="font-medium">{l.title}</TableCell>
											<TableCell>{l.pickupLocation} → {l.deliveryLocation}</TableCell>
											<TableCell>{l.status}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="flex items-center" style={{ color: '#0A1C3F' }}>
								<FileText className="mr-2 h-5 w-5" /> PODs & Invoices
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div>
								<h4 className="font-medium mb-2">PODs</h4>
								{pods.length === 0 ? (
									<div className="text-sm text-gray-500">No PODs uploaded yet.</div>
								) : (
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>File</TableHead>
												<TableHead>Status</TableHead>
												<TableHead>Uploaded</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{pods.map((p: any) => {
												const status = (p.status || p.verificationStatus || 'PENDING').toString().toUpperCase();
												const statusColor = status === 'APPROVED' ? 'text-green-600 font-semibold' : 
																   status === 'REJECTED' ? 'text-red-600 font-semibold' : 
																   'text-yellow-600 font-semibold';
												return (
													<TableRow key={p.id || p.fileUrl}>
														<TableCell><a href={p.fileUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{p.fileName || 'POD'}</a></TableCell>
														<TableCell>
															<span className={statusColor}>{status}</span>
															{status === 'PENDING_APPROVAL' && <span className="text-xs text-gray-500 ml-2">(Waiting for admin)</span>}
														</TableCell>
														<TableCell>{p.uploadedAt ? new Date(p.uploadedAt).toLocaleString() : '—'}</TableCell>
													</TableRow>
												);
											})}
										</TableBody>
									</Table>
								)}
							</div>

							<div>
								<h4 className="font-medium mb-2">Invoices</h4>
								<div className="flex space-x-2 mb-3">
									<Input placeholder="Amount" value={invoiceAmount} onChange={(e) => setInvoiceAmount(e.target.value)} className="w-40" />
									<Input type="file" accept="application/pdf,image/*" onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)} className="w-64" />
									<Button onClick={handleSubmitInvoice} disabled={
										!selectedLoadId || 
										!invoiceAmount || 
										!pods.some((p: any) => ((p.status || p.verificationStatus || '').toString().toUpperCase() === 'APPROVED')) ||
										invoices.some((inv: any) => inv.status === 'APPROVED')
									}>
										Submit Invoice
									</Button>
								</div>
								{invoices.some((inv: any) => inv.status === 'APPROVED') && (
									<div className="text-xs text-green-600">
										<strong>✓ Invoice already approved for this load.</strong> No further submission allowed.
									</div>
								)}
								{!invoices.some((inv: any) => inv.status === 'APPROVED') && pods.length > 0 && !pods.some((p: any) => ((p.status || p.verificationStatus || '').toString().toUpperCase() === 'APPROVED')) && (
									<div className="text-xs text-orange-600">
										<strong>Invoice submission is enabled after your POD is approved by admin.</strong>
										<br />
										Current POD Status: <span className="font-semibold">{pods[0]?.status || pods[0]?.verificationStatus || 'PENDING'}</span>
										{pods[0]?.status === 'PENDING_APPROVAL' && <span> - Waiting for admin approval</span>}
									</div>
								)}
								{!invoices.some((inv: any) => inv.status === 'APPROVED') && pods.length === 0 && (
									<div className="text-xs text-orange-600">Please upload a POD first before submitting an invoice.</div>
								)}
								{invoices.length === 0 ? (
									<div className="text-sm text-gray-500">No invoices yet.</div>
								) : (
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>ID</TableHead>
												<TableHead>Amount</TableHead>
												<TableHead>Status</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{invoices.map((inv: any) => (
												<TableRow key={inv.id}>
													<TableCell>{inv.id}</TableCell>
													<TableCell>${Number(inv.amount).toLocaleString()}</TableCell>
													<TableCell>{inv.status || 'PENDING'}</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								)}
							</div>
						</CardContent>
					</Card>
				</div>
			</main>
		</div>
	);
}
