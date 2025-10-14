import express from 'express';
import { body, validationResult } from 'express-validator';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { AuthRequest, requireTransporterOrAdmin, requireClientOrAdmin, requireAdmin } from '../middleware/auth';
import { getPODCollection, getLoadsCollection, getUsersCollection } from '../lib/mongodb';
import { ObjectId } from 'mongodb';
import { io } from '../server';

const router = express.Router();

// Upload POD record (Transporter)
router.post('/', requireTransporterOrAdmin, [
  body('loadId').notEmpty().withMessage('Load ID is required'),
  body('fileUrl').notEmpty().withMessage('fileUrl is required'),
  body('fileName').notEmpty().withMessage('fileName is required')
], asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Validation failed', details: errors.array() });
    return;
  }

  const { loadId, fileUrl, fileName } = req.body;

  const loadsCollection = getLoadsCollection();
  const load = await loadsCollection.findOne({ _id: new ObjectId(loadId) });
  if (!load) throw createError('Load not found', 404);

  // Permission: transporter must be assigned to the load (or admin)
  if (req.user!.userType !== 'ADMIN' && load.assignedTransporterId !== req.user!.id) {
    throw createError('Access denied', 403);
  }

  // Ensure load is assigned (won) before allowing POD upload
  if (req.user!.userType !== 'ADMIN' && load.status !== 'ASSIGNED') {
    throw createError('POD can only be uploaded for assigned loads', 403);
  }

  // Date check removed - transporters can upload POD at any time after assignment

  const podCollection = getPODCollection();
  const pod = await podCollection.insertOne({
    loadId,
    transporterId: req.user!.id,
    fileUrl,
    fileName,
    uploadedAt: new Date(),
    status: 'PENDING_APPROVAL',
    createdAt: new Date(),
    updatedAt: new Date()
  });

  const podRecord = {
    id: pod.insertedId.toString(),
    loadId,
    transporterId: req.user!.id,
    fileUrl,
    fileName,
    uploadedAt: new Date()
  };

  // Emit real-time event
  try {
    io.to(`user_${load.clientId}`).emit('pod_uploaded', { pod: podRecord });
    io.to(`user_${req.user!.id}`).emit('pod_uploaded_success', { pod: podRecord });
    io.emit('pod_created', { pod: podRecord });
  } catch (err) {
    console.error('Failed to emit pod events', err);
  }

  res.status(201).json({ message: 'POD uploaded successfully', pod: podRecord });
}));

// Get PODs by load
router.get('/load/:loadId', asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { loadId } = req.params;
  const podCollection = getPODCollection();
  const pods = await podCollection.find({ loadId }).sort({ uploadedAt: -1 }).toArray();
  pods.forEach(p => { p.id = p._id.toString(); delete (p as any)._id; });
  res.json({ pods });
}));

// Client approves/rejects POD
// When client approves, it syncs to all parties (admin, transporter)
router.put('/:id/client-review', requireClientOrAdmin, asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { id } = req.params;
  const { approve } = req.body; // boolean

  const podCollection = getPODCollection();
  const existing = await podCollection.findOne({ _id: new ObjectId(id) });
  if (!existing) throw createError('POD not found', 404);

  // Verify client owns the load
  const loadsCollection = getLoadsCollection();
  const load = await loadsCollection.findOne({ _id: new ObjectId(existing.loadId) });
  if (!load) throw createError('Load not found', 404);

  if (req.user!.userType !== 'ADMIN' && load.clientId !== req.user!.id) {
    throw createError('Access denied: not your load', 403);
  }

  const clientStatus = approve ? 'CLIENT_APPROVED' : 'CLIENT_REJECTED';
  
  // Update data with client approval AND sync main status
  const updateData: any = { 
    clientApprovalStatus: clientStatus, 
    clientReviewedAt: new Date(), 
    clientApprovedBy: req.user!.id,
    updatedAt: new Date()
  };

  // If client approves, also update main status to APPROVED (unified approval)
  if (approve) {
    updateData.status = 'APPROVED';
    updateData.reviewedAt = new Date();
  } else {
    updateData.status = 'REJECTED';
  }

  await podCollection.updateOne({ _id: new ObjectId(id) }, { $set: updateData });
  const updated = await podCollection.findOne({ _id: new ObjectId(id) });
  if (updated) { updated.id = updated._id.toString(); delete (updated as any)._id; }

  // Notify ALL parties (admin, client, transporter) with real-time updates
  try {
    // Notify transporter
    io.to(`user_${updated?.transporterId}`).emit('pod_status_updated', { pod: updated, approvedBy: 'client' });
    
    // Notify client
    if (load.clientId) {
      io.to(`user_${load.clientId}`).emit('pod_status_updated', { pod: updated, approvedBy: 'client' });
    }
    
    // Notify all admins
    io.emit('pod_updated', { pod: updated, approvedBy: 'client' });
    
    console.log(`✅ POD ${id} ${approve ? 'approved' : 'rejected'} by client - notified all parties`);
  } catch (err) { console.error('Failed to emit pod_client_reviewed', err); }

  return res.json({ message: 'POD client review updated and synced to all parties', pod: updated });
}));

// Admin updates POD status (new format - accepts status directly)
// When admin approves, it syncs to all parties
router.put('/:id/status', requireAdmin, asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { id } = req.params;
  const { status } = req.body; // 'APPROVED' or 'REJECTED'

  const allowed = ['APPROVED', 'REJECTED', 'PENDING_APPROVAL'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Must be APPROVED, REJECTED, or PENDING_APPROVAL' });
  }

  const podCollection = getPODCollection();
  const existing = await podCollection.findOne({ _id: new ObjectId(id) });
  if (!existing) throw createError('POD not found', 404);

  // Update main status and set adminApprovedBy and adminApprovedAt
  const updateData: any = { 
    status, 
    reviewedAt: new Date(), 
    updatedAt: new Date(),
    adminApprovedBy: req.user!.id,
    adminApprovedAt: new Date()
  };

  // If admin approves, also set client approval status to approved (unified approval)
  if (status === 'APPROVED') {
    updateData.clientApprovalStatus = 'CLIENT_APPROVED';
    updateData.clientReviewedAt = new Date();
  }

  await podCollection.updateOne({ _id: new ObjectId(id) }, { $set: updateData });
  const updated = await podCollection.findOne({ _id: new ObjectId(id) });
  if (updated) { updated.id = updated._id.toString(); delete (updated as any)._id; }

  // Notify ALL parties (admin, client, transporter) with real-time updates
  try {
    const loadsCollection = getLoadsCollection();
    const load = await loadsCollection.findOne({ _id: new ObjectId(updated!.loadId) });
    
    // Notify transporter
    io.to(`user_${updated?.transporterId}`).emit('pod_status_updated', { pod: updated, approvedBy: 'admin' });
    
    // Notify client
    if (load && load.clientId) {
      io.to(`user_${load.clientId}`).emit('pod_status_updated', { pod: updated, approvedBy: 'admin' });
    }
    
    // Notify all admins
    io.emit('pod_updated', { pod: updated, approvedBy: 'admin' });
    
    console.log(`✅ POD ${id} status updated to ${status} by admin - notified all parties`);
  } catch (err) { console.error('Failed to emit pod_status_updated', err); }

  return res.json({ message: 'POD status updated and synced to all parties', pod: updated });
}));

// Admin approves/rejects POD (legacy format - accepts boolean approve)
router.put('/:id/approve', requireAdmin, asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { id } = req.params;
  const { approve } = req.body; // boolean

  const podCollection = getPODCollection();
  const existing = await podCollection.findOne({ _id: new ObjectId(id) });
  if (!existing) throw createError('POD not found', 404);

  const status = approve ? 'APPROVED' : 'REJECTED';
  await podCollection.updateOne({ _id: new ObjectId(id) }, { $set: { status, reviewedAt: new Date(), updatedAt: new Date() } });
  const updated = await podCollection.findOne({ _id: new ObjectId(id) });
  if (updated) { updated.id = updated._id.toString(); delete (updated as any)._id; }

  // Notify parties
  try {
    // find load to get client id
    const loadsCollection = getLoadsCollection();
    const load = await loadsCollection.findOne({ _id: new ObjectId(updated!.loadId) });
    io.to(`user_${updated?.transporterId}`).emit('pod_status_updated', { pod: updated });
    if (load && load.clientId) io.to(`user_${load.clientId}`).emit('pod_status_updated', { pod: updated });
    io.emit('pod_updated', { pod: updated });
  } catch (err) { console.error('Failed to emit pod_status_updated', err); }

  return res.json({ message: 'POD review updated', pod: updated });
}));

export default router;
