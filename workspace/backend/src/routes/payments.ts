import express from 'express';
import { body, validationResult } from 'express-validator';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { AuthRequest, requireAdmin, requireClientOrAdmin } from '../middleware/auth';
import { getPaymentsCollection, getInvoicesCollection, getLoadsCollection } from '../lib/mongodb';
import { ObjectId } from 'mongodb';
import { io } from '../server';

const router = express.Router();

// Client pays client-invoice (initiates payment)
router.post('/pay', requireClientOrAdmin, [
  body('invoiceId').notEmpty().withMessage('invoiceId is required'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be positive')
], asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed', details: errors.array() });

  const { invoiceId, amount, method = 'OFFLINE' } = req.body;
  const invoicesCollection = getInvoicesCollection();
  const invoice = await invoicesCollection.findOne({ _id: new ObjectId(invoiceId) });
  if (!invoice) throw createError('Invoice not found', 404);

  // Only the client can pay their invoice
  if (req.user!.userType !== 'ADMIN' && invoice.role === 'CLIENT' && invoice.loadId && invoice.role && invoice) {
    // Ensure invoice belongs to client's load
    const loadsCollection = getLoadsCollection();
    const load = await loadsCollection.findOne({ _id: new ObjectId(invoice.loadId) });
    if (!load) throw createError('Load not found', 404);
    if (load.clientId !== req.user!.id) throw createError('Access denied', 403);
  }

  const paymentsCollection = getPaymentsCollection();
  const payment = await paymentsCollection.insertOne({
    invoiceId,
    loadId: invoice.loadId,
    payerId: req.user!.id,
    amount: parseFloat(amount),
    method,
    status: 'PENDING',
    createdAt: new Date(),
    updatedAt: new Date()
  });

  const paymentRecord = { id: payment.insertedId.toString(), invoiceId, loadId: invoice.loadId, payerId: req.user!.id, amount: parseFloat(amount), method, status: 'PENDING' };

  try {
    io.to(`user_${invoice.submittedBy || invoice.generatedBy || invoice.loadClientId}`).emit('payment_initiated', { payment: paymentRecord });
    io.emit('payment_created', { payment: paymentRecord });
  } catch (err) { console.error('Failed to emit payment events', err); }

  return res.status(201).json({ message: 'Payment initiated', payment: paymentRecord });
}));

// Admin marks payment progress/complete
router.put('/:id/status', requireAdmin, [
  body('status').isIn(['PENDING', 'IN_PROGRESS', 'COMPLETED']).withMessage('Invalid status')
], asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { id } = req.params;
  const { status } = req.body;
  const paymentsCollection = getPaymentsCollection();
  const payment = await paymentsCollection.findOne({ _id: new ObjectId(id) });
  if (!payment) throw createError('Payment not found', 404);

  await paymentsCollection.updateOne({ _id: new ObjectId(id) }, { $set: { status, updatedAt: new Date() } });

  const updated = await paymentsCollection.findOne({ _id: new ObjectId(id) });
  const paymentRecord = { ...updated, id: updated!._id.toString() };

  try {
    io.emit('payment_status_updated', { payment: paymentRecord });
  } catch (err) { console.error('Failed to emit payment status event', err); }

  return res.json({ message: 'Payment status updated', payment: paymentRecord });
}));

// Get payments by load
router.get('/load/:loadId', asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { loadId } = req.params;
  const paymentsCollection = getPaymentsCollection();
  const payments = await paymentsCollection.find({ loadId }).sort({ createdAt: -1 }).toArray();
  payments.forEach(p => { p.id = p._id.toString(); delete (p as any)._id; });
  return res.json({ payments });
}));

export default router;
