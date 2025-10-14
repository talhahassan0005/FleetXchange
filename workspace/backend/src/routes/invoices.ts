import express from 'express';
import { body, validationResult } from 'express-validator';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { AuthRequest, requireTransporterOrAdmin, requireAdmin } from '../middleware/auth';
import { getInvoicesCollection, getLoadsCollection, getPODCollection, getUsersCollection } from '../lib/mongodb';
import { ObjectId } from 'mongodb';
import { io } from '../server';

const router = express.Router();

// Transporter submits invoice linked to a load (and optionally POD)
router.post('/transporter', requireTransporterOrAdmin, [
  body('loadId').notEmpty().withMessage('Load ID is required'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be positive')
], asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed', details: errors.array() });

  const { loadId, amount, currency = 'USD', podId, notes } = req.body;

  const loadsCollection = getLoadsCollection();
  const load = await loadsCollection.findOne({ _id: new ObjectId(loadId) });
  if (!load) throw createError('Load not found', 404);

  // Only assigned transporter can submit invoice
  if (req.user!.userType !== 'ADMIN' && load.assignedTransporterId !== req.user!.id) {
    throw createError('Access denied', 403);
  }

  // If transporter is submitting, require a POD and ensure it is approved by admin
  if (req.user!.userType === 'TRANSPORTER') {
    if (!podId) {
      throw createError('POD ID is required to submit transporter invoice', 400);
    }
    const podCollection = getPODCollection();
    const pod = await podCollection.findOne({ _id: new ObjectId(podId) });
    if (!pod) throw createError('POD not found', 404);
    if (pod.status !== 'APPROVED') {
      throw createError('POD must be approved by admin before submitting invoice', 400);
    }
  }

  const invoicesCollection = getInvoicesCollection();
  const invoice = await invoicesCollection.insertOne({
    loadId,
    podId: podId || null,
    submittedBy: req.user!.id,
    role: 'TRANSPORTER',
    amount: parseFloat(amount),
    currency,
    status: 'PENDING_REVIEW',
    notes: notes || '',
    createdAt: new Date(),
    updatedAt: new Date()
  });

  const invoiceRecord = { id: invoice.insertedId.toString(), loadId, podId: podId || null, submittedBy: req.user!.id, amount: parseFloat(amount), currency, status: 'PENDING_REVIEW' };

  // Emit realtime event
  try {
    io.to(`user_${load.clientId}`).emit('invoice_submitted', { invoice: invoiceRecord });
    io.to(`user_${req.user!.id}`).emit('invoice_submitted_success', { invoice: invoiceRecord });
    io.emit('invoice_created', { invoice: invoiceRecord });
  // Check for existing invoice for this load by transporter
  const existingInvoice = await invoicesCollection.findOne({ loadId, role: 'TRANSPORTER' });
  if (existingInvoice) {
    if (existingInvoice.status === 'APPROVED') {
      throw createError('Invoice for this load is already approved and cannot be resubmitted.', 400);
    }
    if (existingInvoice.status !== 'REJECTED') {
      throw createError('Invoice for this load is already submitted and pending review. Please wait for approval or rejection.', 400);
    }
    // If status is REJECTED, allow resubmission
  }
  } catch (err) { console.error('Failed to emit invoice events', err); }

  return res.status(201).json({ message: 'Invoice submitted successfully', invoice: invoiceRecord });
}));

// Admin generates client invoice with commission
router.post('/admin/generate-client-invoice', requireAdmin, [
  body('loadId').notEmpty().withMessage('Load ID is required'),
  body('commissionPercent').isFloat({ min: 0, max: 100 }).withMessage('Commission percent must be 0-100')
], asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed', details: errors.array() });

  const { loadId, commissionPercent = 10, notes } = req.body;
  const invoicesCollection = getInvoicesCollection();
  const loadsCollection = getLoadsCollection();

  const load = await loadsCollection.findOne({ _id: new ObjectId(loadId) });
  if (!load) throw createError('Load not found', 404);

  // Calculate total from transporter invoice(s)
  const transporterInvoices = await invoicesCollection.find({ loadId, role: 'TRANSPORTER' }).toArray();
  const totalTransporterAmount = transporterInvoices.reduce((s: number, inv: any) => s + (inv.amount || 0), 0);

  const commission = (commissionPercent / 100) * totalTransporterAmount;
  const clientAmount = totalTransporterAmount + commission;

  const clientInvoice = await invoicesCollection.insertOne({
    loadId,
    role: 'CLIENT',
    generatedBy: req.user!.id,
    amount: clientAmount,
    commissionPercent,
    commissionAmount: commission,
    currency: transporterInvoices[0]?.currency || 'USD',
    status: 'PENDING_PAYMENT',
    notes: notes || '',
    createdAt: new Date(),
    updatedAt: new Date()
  });

  const record = { id: clientInvoice.insertedId.toString(), loadId, amount: clientAmount, commissionPercent, commissionAmount: commission, status: 'PENDING_PAYMENT' };

  try {
    io.to(`user_${load.clientId}`).emit('client_invoice_generated', { invoice: record });
    io.emit('client_invoice_created', { invoice: record });
  } catch (err) { console.error('Failed to emit client invoice events', err); }

  return res.status(201).json({ message: 'Client invoice generated', invoice: record });
}));

// Get invoices by load
router.get('/load/:loadId', asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { loadId } = req.params;
  const invoicesCollection = getInvoicesCollection();
  const invoices = await invoicesCollection.find({ loadId }).sort({ createdAt: -1 }).toArray();
  invoices.forEach(i => { i.id = i._id.toString(); delete (i as any)._id; });
  return res.json({ invoices });
}));

// Update invoice status (Admin)
// When admin approves, it syncs to all parties
router.put('/:id/status', requireAdmin, asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { id } = req.params;
  const { status } = req.body;

  const allowed = ['PENDING_REVIEW', 'APPROVED', 'REJECTED', 'PENDING_PAYMENT', 'PAID'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const invoicesCollection = getInvoicesCollection();
  const existing = await invoicesCollection.findOne({ _id: new ObjectId(id) });
  if (!existing) throw createError('Invoice not found', 404);

  const updateData: any = { 
    status, 
    updatedAt: new Date(),
    adminApprovedBy: req.user!.id,
    adminApprovedAt: new Date()
  };

  // If admin approves, also mark as client approved (unified approval)
  if (status === 'APPROVED') {
    updateData.clientApprovalStatus = 'CLIENT_APPROVED';
    updateData.clientReviewedAt = new Date();
  }

  await invoicesCollection.updateOne({ _id: new ObjectId(id) }, { $set: updateData });
  const updated = await invoicesCollection.findOne({ _id: new ObjectId(id) });
  if (updated) { updated.id = updated._id.toString(); delete (updated as any)._id; }

  // Notify ALL parties (admin, client, transporter)
  try {
    const loadsCollection = getLoadsCollection();
    const load = await loadsCollection.findOne({ _id: new ObjectId(existing.loadId) });
    
    // Notify transporter who submitted
    io.to(`user_${existing.submittedBy}`).emit('invoice_status_updated', { invoice: updated, approvedBy: 'admin' });
    
    // Notify client
    if (load && load.clientId) {
      io.to(`user_${load.clientId}`).emit('invoice_status_updated', { invoice: updated, approvedBy: 'admin' });
    }
    
    // Notify all admins
    io.emit('invoice_updated', { invoice: updated, approvedBy: 'admin' });
    
    console.log(`✅ Invoice ${id} status updated to ${status} by admin - notified all parties`);
  } catch (err) { console.error('Failed to emit invoice_status_updated', err); }

  return res.json({ message: 'Invoice status updated and synced to all parties', invoice: updated });
}));

// Client approves/rejects invoice
// When client approves, it syncs to all parties (admin, transporter)
router.put('/:id/client-review', asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { id } = req.params;
  const { approve } = req.body; // boolean

  const invoicesCollection = getInvoicesCollection();
  const existing = await invoicesCollection.findOne({ _id: new ObjectId(id) });
  if (!existing) throw createError('Invoice not found', 404);

  // Verify client owns the load
  const loadsCollection = getLoadsCollection();
  const load = await loadsCollection.findOne({ _id: new ObjectId(existing.loadId) });
  if (!load) throw createError('Load not found', 404);

  if (req.user!.userType !== 'ADMIN' && load.clientId !== req.user!.id) {
    throw createError('Access denied: not your load', 403);
  }

  const newStatus = approve ? 'APPROVED' : 'REJECTED';
  const updateData: any = { 
    status: newStatus, 
    clientApprovalStatus: approve ? 'CLIENT_APPROVED' : 'CLIENT_REJECTED',
    clientReviewedAt: new Date(), 
    clientApprovedBy: req.user!.id,
    updatedAt: new Date() 
  };

  await invoicesCollection.updateOne({ _id: new ObjectId(id) }, { $set: updateData });
  const updated = await invoicesCollection.findOne({ _id: new ObjectId(id) });
  if (updated) { updated.id = updated._id.toString(); delete (updated as any)._id; }

  // Notify ALL parties (admin, client, transporter)
  try {
    // Notify transporter who submitted
    io.to(`user_${existing.submittedBy}`).emit('invoice_status_updated', { invoice: updated, approvedBy: 'client' });
    
    // Notify client
    if (load.clientId) {
      io.to(`user_${load.clientId}`).emit('invoice_status_updated', { invoice: updated, approvedBy: 'client' });
    }
    
    // Notify all admins
    io.emit('invoice_updated', { invoice: updated, approvedBy: 'client' });
    
    console.log(`✅ Invoice ${id} ${approve ? 'approved' : 'rejected'} by client - notified all parties`);
  } catch (err) { console.error('Failed to emit invoice_client_reviewed', err); }

  return res.json({ message: 'Invoice client review updated and synced to all parties', invoice: updated });
}));

export default router;
