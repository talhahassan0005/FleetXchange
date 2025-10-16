/*
 Local E2E: Upload POD -> Approve -> Submit transporter invoice -> Approve -> Generate client invoice (0) -> Payments
 Prints PASS/FAIL for each step using local backend URL.
*/
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.argv[2] || process.env.LOCAL_API || 'http://localhost:5000/api';
const creds = {
  admin: [
    { email: 'mrtiger@fleetxchange.africa', password: 'FleetX2025!' },
    { email: 'tshepiso@fleetxchange.africa', password: 'FleetX2025!' },
  ],
  client: [
    { email: 'client1@example.com', password: 'Client123!' },
    { email: 'client2@example.com', password: 'Client123!' },
  ],
  transporter: [
    { email: 'transporter1@example.com', password: 'Transport123!' },
    { email: 'transporter2@example.com', password: 'Transport123!' },
  ],
};

function log(title, status, extra) {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${icon} ${title}: ${status}${extra ? ' - ' + extra : ''}`);
}

async function login({ email, password }) {
  const { data } = await axios.post(`${BASE_URL}/auth/login`, { email, password });
  return data;
}

async function tryLogins(list, label) {
  for (const cred of list) {
    try {
      const data = await login(cred);
      log(`${label} login`, 'PASS', cred.email);
      return data;
    } catch (e) {
      log(`${label} login`, 'FAIL', `${cred.email} ${e.response?.status || e.message}`);
    }
  }
  return null;
}

async function uploadSingle(token, filePath, documentType) {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));
  form.append('documentType', documentType);
  const { data } = await axios.post(`${BASE_URL}/upload/single`, form, {
    headers: { ...form.getHeaders(), Authorization: `Bearer ${token}` },
  });
  return data;
}

async function run() {
  console.log('=== LOCAL E2E START ===');
  console.log(`API: ${BASE_URL}`);

  let tkn = {};
  let users = {};
  let transporterUserId = null;
  const a = await tryLogins(creds.admin, 'Admin'); if (a) { tkn.admin = a.token; users.admin = a.user; }
  const c = await tryLogins(creds.client, 'Client'); if (c) { tkn.client = c.token; users.client = c.user; }
  const t = await tryLogins(creds.transporter, 'Transporter'); if (t) { tkn.transporter = t.token; users.transporter = t.user; transporterUserId = t.user?.id || t.user?._id || null; }

  if (!tkn.transporter || !tkn.admin) {
    console.log('Missing tokens; abort.');
    return;
  }

  // Find an ASSIGNED load for this transporter; if none, assign one as admin
  let loadId;
  try {
    const loadsAssigned = await axios.get(`${BASE_URL}/loads`, { headers: { Authorization: `Bearer ${tkn.transporter}` }, params: { page: 1, limit: 10, assignedTransporterId: transporterUserId } });
    const assigned = loadsAssigned.data?.loads || [];
    if (assigned.length > 0) {
      loadId = assigned[0].id;
      log('Find assigned load', 'PASS', loadId);
    } else {
      // Get an ACTIVE load as admin
      const loadsActive = await axios.get(`${BASE_URL}/loads`, { headers: { Authorization: `Bearer ${tkn.admin}` }, params: { page: 1, limit: 10, status: 'ACTIVE' } });
      const active = loadsActive.data?.loads || [];
      if (!active[0]) return log('Prepare load', 'FAIL', 'no active loads');
      // Assign it to transporter and mark ASSIGNED
      await axios.put(`${BASE_URL}/loads/${active[0].id}`, { assignedTransporterId: transporterUserId, status: 'ASSIGNED' }, { headers: { Authorization: `Bearer ${tkn.admin}` }});
      loadId = active[0].id;
      log('Assign load to transporter', 'PASS', loadId);
    }
  } catch(e){ return log('Find/assign load','FAIL', e.response?.status||e.message); }

  // Upload POD (any date)
  let podId;
  try {
    const sample = path.join(__dirname, 'sample-pod.png');
    fs.writeFileSync(sample, Buffer.from('89504e470d0a1a0a','hex')); // tiny PNG header
    const up = await uploadSingle(tkn.transporter, sample, 'POD');
    const fileUrl = up.file.fileUrl;
    const { data } = await axios.post(`${BASE_URL}/pods`, { loadId, fileUrl, fileName: 'sample-pod.png', uploadedAt: new Date().toISOString() }, { headers: { Authorization: `Bearer ${tkn.transporter}` }});
    podId = data.pod?.id || data.podId || data.id;
    log('Upload POD', 'PASS', podId || 'ok');
  } catch(e){ return log('Upload POD','FAIL', e.response?.status||e.message); }

  // Admin approves POD
  try {
    await axios.put(`${BASE_URL}/pods/${podId}/status`, { status: 'APPROVED' }, { headers: { Authorization: `Bearer ${tkn.admin}` }});
    log('Approve POD', 'PASS');
  } catch(e){ return log('Approve POD','FAIL', e.response?.status||e.message); }

  // Transporter submit invoice
  let invId;
  try {
    const sampleInv = path.join(__dirname, 'sample-invoice.txt');
    fs.writeFileSync(sampleInv, 'invoice');
    const upInv = await uploadSingle(tkn.transporter, sampleInv, 'INVOICE');
    const fileUrl = upInv.file.fileUrl;
    const { data } = await axios.post(`${BASE_URL}/invoices/transporter`, { loadId, amount: 1000, podId, fileUrl }, { headers: { Authorization: `Bearer ${tkn.transporter}` }});
    invId = data.invoice?.id || data.id;
    log('Submit transporter invoice', 'PASS', invId || 'ok');
  } catch(e){ return log('Submit transporter invoice','FAIL', e.response?.status||e.message); }

  // Admin approve transporter invoice
  try {
    await axios.put(`${BASE_URL}/invoices/${invId}/status`, { status: 'APPROVED' }, { headers: { Authorization: `Bearer ${tkn.admin}` }});
    log('Approve transporter invoice', 'PASS');
  } catch(e){ return log('Approve transporter invoice','FAIL', e.response?.status||e.message); }

  // Admin generate client invoice (commission 0)
  try {
    await axios.post(`${BASE_URL}/invoices/admin/generate-client-invoice`, { loadId, commissionPercent: 0 }, { headers: { Authorization: `Bearer ${tkn.admin}` }});
    log('Generate client invoice (0 commission)', 'PASS');
  } catch(e){ return log('Generate client invoice (0 commission)','FAIL', e.response?.status||e.message); }

  // Payments: if no payment, client pays; then admin marks IN_PROGRESS and COMPLETED
  try {
    const invs = await axios.get(`${BASE_URL}/invoices/load/${loadId}`, { headers: { Authorization: `Bearer ${tkn.admin}` }});
    const invoices = invs.data?.invoices || [];
    const clientInvoice = invoices.find(i => i.role === 'CLIENT');
    if (clientInvoice) {
      // Client initiates payment
      await axios.post(`${BASE_URL}/payments/pay`, { invoiceId: clientInvoice.id, amount: clientInvoice.amount, method: 'OFFLINE' }, { headers: { Authorization: `Bearer ${tkn.client}` }});
    }
    const pay = await axios.get(`${BASE_URL}/payments/load/${loadId}`, { headers: { Authorization: `Bearer ${tkn.admin}` }});
    const payments = pay.data?.payments || pay.data || [];
    if (payments[0]) {
      await axios.put(`${BASE_URL}/payments/${payments[0].id}/status`, { status: 'IN_PROGRESS' }, { headers: { Authorization: `Bearer ${tkn.admin}` }});
      await axios.put(`${BASE_URL}/payments/${payments[0].id}/status`, { status: 'COMPLETED' }, { headers: { Authorization: `Bearer ${tkn.admin}` }});
      log('Payments update', 'PASS');
    } else {
      log('Payments update', 'PASS', 'no payments to update');
    }
  } catch(e){ return log('Payments update','FAIL', e.response?.status||e.message); }

  // Validate: New registrations cannot login until admin approval
  try {
    const rnd = Math.random().toString(36).slice(2, 8);
    const newEmail = `pending_${rnd}@example.com`;
    await axios.post(`${BASE_URL}/auth/register`, {
      email: newEmail,
      password: 'Pending123!',
      userType: 'CLIENT',
      companyName: 'Pending Co',
      contactPerson: 'Pending User',
      phone: '000',
      address: 'Nowhere'
    });
    // immediately try login; expected to FAIL if system blocks pending users
    try {
      await axios.post(`${BASE_URL}/auth/login`, { email: newEmail, password: 'Pending123!' });
      log('Pending user cannot login until approved', 'FAIL', 'login succeeded but should be blocked');
    } catch (e) {
      const status = e.response?.status;
      if (status && (status === 401 || status === 403)) {
        log('Pending user cannot login until approved', 'PASS', `status=${status}`);
      } else {
        log('Pending user cannot login until approved', 'FAIL', status || e.message);
      }
    }
  } catch (e) {
    log('Register pending user', 'FAIL', e.response?.status || e.message);
  }

  console.log('=== LOCAL E2E END ===');
}

run().catch(err => {
  console.error('E2E local error:', err);
  process.exit(1);
});


