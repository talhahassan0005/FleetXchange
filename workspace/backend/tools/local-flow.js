/*
 Simple local API flow test without login: generate JWTs using backend secret,
 then call endpoints: assign load -> upload file -> create POD -> approve ->
 submit transporter invoice -> approve -> generate client invoice (0%) -> pay ->
 mark payment IN_PROGRESS and COMPLETED. Prints PASS/FAIL.
*/
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const BASE = process.argv[2] || 'http://localhost:5000/api';
const MONGO = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'fleetxchange';
const JWT_SECRET = process.env.JWT_SECRET || 'fleetxchange-super-secret-jwt-key-production-2025';

const emails = {
  admin: 'mrtiger@fleetxchange.africa',
  client: 'client1@example.com',
  transporter: 'transporter1@example.com',
};

function log(step, status, extra) {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${icon} ${step}: ${status}${extra ? ' - ' + extra : ''}`);
}

async function tokenForUserId(userId) {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '1h' });
}

async function main() {
  console.log('=== LOCAL SIMPLE FLOW (no login) ===');
  console.log('API:', BASE);
  const client = new MongoClient(MONGO);
  await client.connect();
  const db = client.db(DB_NAME);
  const users = db.collection('User');
  const loadsCol = db.collection('Load');

  // Get users
  const admin = await users.findOne({ email: emails.admin });
  const cl = await users.findOne({ email: emails.client });
  const tr = await users.findOne({ email: emails.transporter });
  if (!admin || !cl || !tr) {
    log('Seed check', 'FAIL', 'missing users');
    return;
  }
  const tokens = {
    admin: await tokenForUserId(admin._id.toString()),
    client: await tokenForUserId(cl._id.toString()),
    transporter: await tokenForUserId(tr._id.toString()),
  };
  log('JWT tokens', 'PASS');

  // Ensure there is an ACTIVE load for the client, else create one quickly in DB
  let load = await loadsCol.findOne({ clientId: cl._id.toString(), status: 'ACTIVE', deletedAt: { $exists: false } });
  if (!load) {
    const now = new Date();
    const later = new Date(now.getTime() + 24*60*60*1000);
    const loadData = {
      title: 'Local Test Load',
      description: 'Auto-created for local test',
      cargoType: 'General',
      weight: 100,
      pickupLocation: 'A',
      deliveryLocation: 'B',
      pickupDate: now.toISOString(),
      deliveryDate: later.toISOString(),
      budgetMin: 100,
      budgetMax: 200,
      currency: 'USD',
      status: 'ACTIVE',
      clientId: cl._id.toString(),
      assignedTransporterId: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const ins = await loadsCol.insertOne(loadData);
    load = { ...loadData, _id: ins.insertedId };
    log('Create ACTIVE load', 'PASS', ins.insertedId.toString());
  } else {
    log('Reuse ACTIVE load', 'PASS', load._id.toString());
  }

  const loadId = load._id.toString();

  // Assign to transporter using API (admin)
  try {
    await axios.put(`${BASE}/loads/${loadId}`, { assignedTransporterId: tr._id.toString(), status: 'ASSIGNED' }, { headers: { Authorization: `Bearer ${tokens.admin}` } });
    log('Assign load to transporter', 'PASS');
  } catch (e) {
    return log('Assign load to transporter', 'FAIL', e.response?.status||e.message);
  }

  // Upload single file (transporter)
  let uploaded;
  try {
    const fpath = path.join(__dirname, 'pod-test.txt');
    fs.writeFileSync(fpath, 'pod-data');
    const form = new FormData();
    form.append('file', fs.createReadStream(fpath));
    form.append('documentType', 'POD');
    const res = await axios.post(`${BASE}/upload/single`, form, { headers: { ...form.getHeaders(), Authorization: `Bearer ${tokens.transporter}` } });
    uploaded = res.data?.file;
    log('Upload file', 'PASS');
  } catch (e) {
    return log('Upload file', 'FAIL', e.response?.status||e.message);
  }

  // Create POD
  let podId;
  try {
    const { data } = await axios.post(`${BASE}/pods`, { loadId, fileUrl: uploaded.fileUrl, fileName: uploaded.fileName }, { headers: { Authorization: `Bearer ${tokens.transporter}` } });
    podId = data.pod?.id || data.id;
    log('Create POD', 'PASS', podId || 'ok');
  } catch (e) {
    return log('Create POD', 'FAIL', e.response?.status||e.message);
  }

  // Approve POD (admin)
  try {
    await axios.put(`${BASE}/pods/${podId}/status`, { status: 'APPROVED' }, { headers: { Authorization: `Bearer ${tokens.admin}` } });
    log('Approve POD', 'PASS');
  } catch (e) {
    return log('Approve POD', 'FAIL', e.response?.status||e.message);
  }

  // Submit transporter invoice (requires approved POD)
  let invId;
  try {
    const { data } = await axios.post(`${BASE}/invoices/transporter`, { loadId, amount: 1000, currency: 'USD', podId }, { headers: { Authorization: `Bearer ${tokens.transporter}` } });
    invId = data.invoice?.id || data.id;
    log('Submit transporter invoice', 'PASS', invId || 'ok');
  } catch (e) {
    return log('Submit transporter invoice', 'FAIL', e.response?.status||e.message);
  }

  // Approve transporter invoice (admin)
  try {
    await axios.put(`${BASE}/invoices/${invId}/status`, { status: 'APPROVED' }, { headers: { Authorization: `Bearer ${tokens.admin}` } });
    log('Approve transporter invoice', 'PASS');
  } catch (e) {
    return log('Approve transporter invoice', 'FAIL', e.response?.status||e.message);
  }

  // Generate client invoice (0% commission)
  try {
    await axios.post(`${BASE}/invoices/admin/generate-client-invoice`, { loadId, commissionPercent: 0 }, { headers: { Authorization: `Bearer ${tokens.admin}` } });
    log('Generate client invoice (0%)', 'PASS');
  } catch (e) {
    return log('Generate client invoice (0%)', 'FAIL', e.response?.status||e.message);
  }

  // Client pays invoice
  try {
    const invs = await axios.get(`${BASE}/invoices/load/${loadId}`, { headers: { Authorization: `Bearer ${tokens.admin}` } });
    const clientInvoice = (invs.data?.invoices || []).find(i => i.role === 'CLIENT');
    if (clientInvoice) {
      await axios.post(`${BASE}/payments/pay`, { invoiceId: clientInvoice.id, amount: clientInvoice.amount, method: 'OFFLINE' }, { headers: { Authorization: `Bearer ${tokens.client}` } });
      log('Client pay invoice', 'PASS');
    } else {
      log('Client pay invoice', 'PASS', 'no client invoice found');
    }
  } catch (e) {
    return log('Client pay invoice', 'FAIL', e.response?.status||e.message);
  }

  // Admin marks payment in progress and completed
  try {
    const pay = await axios.get(`${BASE}/payments/load/${loadId}`, { headers: { Authorization: `Bearer ${tokens.admin}` } });
    const payments = pay.data?.payments || [];
    if (payments[0]) {
      await axios.put(`${BASE}/payments/${payments[0].id}/status`, { status: 'IN_PROGRESS' }, { headers: { Authorization: `Bearer ${tokens.admin}` } });
      await axios.put(`${BASE}/payments/${payments[0].id}/status`, { status: 'COMPLETED' }, { headers: { Authorization: `Bearer ${tokens.admin}` } });
      log('Payment status updates', 'PASS');
    } else {
      log('Payment status updates', 'PASS', 'no payments available');
    }
  } catch (e) {
    return log('Payment status updates', 'FAIL', e.response?.status||e.message);
  }

  console.log('=== DONE ===');
  await client.close();
}

main().catch(err => { console.error(err); process.exit(1); });


