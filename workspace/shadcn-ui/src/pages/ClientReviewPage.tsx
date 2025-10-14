import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, DollarSign, ArrowLeft, CheckCircle, XCircle, Eye } from 'lucide-react';
import { authService, User } from '@/lib/auth';
import { api, Load } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function ClientReviewPage() {
	const [user, setUser] = useState<User | null>(authService.getCurrentUser());
	const [myLoads, setMyLoads] = useState<Load[]>([]);
	const [selectedLoadId, setSelectedLoadId] = useState<string>('');
	const [pods, setPods] = useState<any[]>([]);
	const [invoices, setInvoices] = useState<any[]>([]);
	const [loading, setLoading] = useState(false);
	const navigate = useNavigate();

	useEffect(() => {
		if (!user) {
			navigate('/login');
			return;
		}
		// Load all client's loads
		api.loads.getAll({ clientId: user.id, page: 1, limit: 100 }).then((resp) => {
			const loads: Load[] = resp.loads || [];
			// Only show assigned/completed loads (where PODs would exist)
			setMyLoads(loads.filter(l => l.status === 'ASSIGNED' || l.status === 'COMPLETED'));
		}).catch(() => {
			setMyLoads([]);
		});
	}, [user, navigate]);

	useEffect(() => {
		// When load is selected, fetch PODs and invoices
		const fetchData = async () => {
			if (!selectedLoadId) {
				setPods([]);
				setInvoices([]);
				return;
			}
			setLoading(true);
			try {
				const [podsResp, invResp] = await Promise.all([
					api.pods.getByLoad(selectedLoadId),
					api.invoices.getByLoad(selectedLoadId)
				]);
				setPods(podsResp.pods || podsResp || []);
				setInvoices(invResp.invoices || invResp || []);
			} catch (err) {
				console.error('Failed to load PODs/Invoices:', err);
			} finally {
				setLoading(false);
			}
		};
		fetchData();
	}, [selectedLoadId]);

	const handlePODReview = async (podId: string, approve: boolean) => {
		if (!user) return;
		try {
			await api.pods.clientReview(podId, approve);
			toast.success(`POD ${approve ? 'approved' : 'rejected'} successfully`);
			// Refresh PODs
			const podsResp = await api.pods.getByLoad(selectedLoadId);
			setPods(podsResp.pods || podsResp || []);
		} catch (err: any) {
			toast.error(err?.response?.data?.message || 'Failed to review POD');
		}
	};

	const handleInvoiceReview = async (invoiceId: string, approve: boolean) => {
		if (!user) return;
		try {
			await api.invoices.clientReview(invoiceId, approve);
			toast.success(`Invoice ${approve ? 'approved' : 'rejected'} successfully`);
			// Refresh invoices
			const invResp = await api.invoices.getByLoad(selectedLoadId);
			setInvoices(invResp.invoices || invResp || []);
		} catch (err: any) {
			toast.error(err?.response?.data?.message || 'Failed to review invoice');
		}
	};

	const getStatusBadge = (status: string) => {
		const upperStatus = status?.toUpperCase() || 'PENDING';
		if (upperStatus === 'APPROVED' || upperStatus === 'CLIENT_APPROVED') {
			return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
		}
		if (upperStatus === 'REJECTED' || upperStatus === 'CLIENT_REJECTED') {
			return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
		}
		if (upperStatus === 'PENDING_REVIEW' || upperStatus === 'PENDING_APPROVAL') {
			return <Badge className="bg-yellow-100 text-yellow-800">Pending Review</Badge>;
		}
		return <Badge variant="outline">{status}</Badge>;
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
			<header className="bg-white shadow-lg border-b-2" style={{ borderColor: '#0A1C3F' }}>
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center py-4">
						<h1 className="text-2xl font-bold" style={{ color: '#0A1C3F' }}>
							Review PODs & Invoices
						</h1>
						<Button variant="outline" onClick={() => navigate('/dashboard')}>
							<ArrowLeft className="h-4 w-4 mr-2" /> Back
						</Button>
					</div>
				</div>
			</header>

			<main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<Alert className="mb-6">
					<AlertDescription>
						Review and approve/reject PODs (Proof of Delivery) and invoices submitted by transporters for your loads.
					</AlertDescription>
				</Alert>

				<Card className="mb-6">
					<CardHeader>
						<CardTitle className="flex items-center" style={{ color: '#0A1C3F' }}>
							<FileText className="mr-2 h-5 w-5" /> Select Load
						</CardTitle>
						<CardDescription>Choose a load to review its PODs and invoices</CardDescription>
					</CardHeader>
					<CardContent>
						<select
							className="w-full border rounded-md h-10 px-3"
							value={selectedLoadId}
							onChange={(e) => setSelectedLoadId(e.target.value)}
						>
							<option value="">Select a load</option>
							{myLoads.map(l => (
								<option key={l.id} value={l.id}>
									{l.title} ({l.pickupLocation} → {l.deliveryLocation}) - {l.status}
								</option>
							))}
						</select>
					</CardContent>
				</Card>

				{selectedLoadId && (
					<div className="grid grid-cols-1 gap-6">
						{/* PODs Section */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center" style={{ color: '#0A1C3F' }}>
									<FileText className="mr-2 h-5 w-5" /> Proof of Delivery (PODs)
								</CardTitle>
								<CardDescription>Review transporter's proof of delivery documents</CardDescription>
							</CardHeader>
							<CardContent>
								{loading ? (
									<div className="text-center py-8">Loading...</div>
								) : pods.length === 0 ? (
									<div className="text-center py-8 text-gray-500">
										No PODs uploaded yet for this load.
									</div>
								) : (
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>File</TableHead>
												<TableHead>Uploaded At</TableHead>
												<TableHead>Admin Status</TableHead>
												<TableHead>Your Review</TableHead>
												<TableHead>Actions</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{pods.map((pod: any) => (
												<TableRow key={pod.id}>
													<TableCell>
														<a
															href={pod.fileUrl}
															target="_blank"
															rel="noreferrer"
															className="text-blue-600 hover:underline flex items-center"
														>
															<Eye className="h-4 w-4 mr-1" />
															{pod.fileName || 'View POD'}
														</a>
													</TableCell>
													<TableCell>
														{pod.uploadedAt
															? new Date(pod.uploadedAt).toLocaleString()
															: '—'}
													</TableCell>
													<TableCell>
														{getStatusBadge(pod.status || 'PENDING')}
													</TableCell>
													<TableCell>
														{pod.clientApprovalStatus
															? getStatusBadge(pod.clientApprovalStatus)
															: <Badge variant="outline">Not Reviewed</Badge>}
													</TableCell>
													<TableCell>
														<div className="flex space-x-2">
															<Button
																size="sm"
																onClick={() => handlePODReview(pod.id, true)}
																className="text-white"
																style={{ backgroundColor: '#33A852' }}
																disabled={pod.clientApprovalStatus === 'CLIENT_APPROVED'}
															>
																<CheckCircle className="h-4 w-4 mr-1" />
																Approve
															</Button>
															<Button
																size="sm"
																onClick={() => handlePODReview(pod.id, false)}
																variant="destructive"
																disabled={pod.clientApprovalStatus === 'CLIENT_REJECTED'}
															>
																<XCircle className="h-4 w-4 mr-1" />
																Reject
															</Button>
														</div>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								)}
							</CardContent>
						</Card>

						{/* Invoices Section */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center" style={{ color: '#0A1C3F' }}>
									<DollarSign className="mr-2 h-5 w-5" /> Invoices
								</CardTitle>
								<CardDescription>Review and approve transporter invoices</CardDescription>
							</CardHeader>
							<CardContent>
								{loading ? (
									<div className="text-center py-8">Loading...</div>
								) : invoices.length === 0 ? (
									<div className="text-center py-8 text-gray-500">
										No invoices submitted yet for this load.
									</div>
								) : (
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Invoice ID</TableHead>
												<TableHead>Amount</TableHead>
												<TableHead>Submitted By</TableHead>
												<TableHead>Status</TableHead>
												<TableHead>Actions</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{invoices.map((invoice: any) => (
												<TableRow key={invoice.id}>
													<TableCell className="font-mono text-sm">
														{invoice.id.slice(-8)}
													</TableCell>
													<TableCell className="font-semibold text-green-600">
														{invoice.currency || 'USD'} {Number(invoice.amount).toLocaleString()}
													</TableCell>
													<TableCell>{invoice.role || 'TRANSPORTER'}</TableCell>
													<TableCell>{getStatusBadge(invoice.status)}</TableCell>
													<TableCell>
														<div className="flex space-x-2">
															<Button
																size="sm"
																onClick={() => handleInvoiceReview(invoice.id, true)}
																className="text-white"
																style={{ backgroundColor: '#33A852' }}
																disabled={invoice.status === 'APPROVED'}
															>
																<CheckCircle className="h-4 w-4 mr-1" />
																Approve
															</Button>
															<Button
																size="sm"
																onClick={() => handleInvoiceReview(invoice.id, false)}
																variant="destructive"
																disabled={invoice.status === 'REJECTED'}
															>
																<XCircle className="h-4 w-4 mr-1" />
																Reject
															</Button>
														</div>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								)}
							</CardContent>
						</Card>
					</div>
				)}
			</main>
		</div>
	);
}
