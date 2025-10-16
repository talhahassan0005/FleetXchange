/*
 End-to-end verification script (read-only; no DB teardown)
 Prints PASS/FAIL for key flows using the deployed backend.
*/

const axios = require('axios');

const BASE_URL = process.env.BACKEND_URL || 'https://fleetxchange-backend-talha-4a549723eacf.herokuapp.com/api';

const creds = {
  admin: { email: 'mrtiger@fleetxchange.africa', password: 'FleetX2025!' },
  client: { email: 'client1@example.com', password: 'Client123!' },
  transporter: { email: 'transporter1@example.com', password: 'Transport123!' },
};

function log(title, status, extra) {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${icon} ${title}: ${status}${extra ? ' - ' + extra : ''}`);
}

async function login({ email, password }) {
  const { data } = await axios.post(`${BASE_URL}/auth/login`, { email, password });
  return data;
}

async function run() {
  console.log('=== E2E VERIFY START ===');
  console.log(`Backend: ${BASE_URL}`);

  // A) Logins
  let tokens = {};
  try {
    const a = await login(creds.admin); tokens.admin = a.token; log('Admin login', 'PASS');
  } catch (e) { log('Admin login', 'FAIL', e.response?.status || e.message); }
  try {
    const c = await login(creds.client); tokens.client = c.token; log('Client login', 'PASS');
  } catch (e) { log('Client login', 'FAIL', e.response?.status || e.message); }
  try {
    const t = await login(creds.transporter); tokens.transporter = t.token; log('Transporter login', 'PASS');
  } catch (e) { log('Transporter login', 'FAIL', e.response?.status || e.message); }

  // B) No reload on transporter login (backend proxy test only)
  // We can only verify backend auth continuity. Fetch profile immediately after login.
  try {
    const prof = await axios.get(`${BASE_URL}/auth/profile`, { headers: { Authorization: `Bearer ${tokens.transporter}` } });
    log('Transporter profile after login', 'PASS', prof.data?.user?.email || 'ok');
  } catch (e) {
    log('Transporter profile after login', 'FAIL', e.response?.status || e.message);
  }

  // C) Client messages include load-linked chats
  try {
    const msgs = await axios.get(`${BASE_URL}/messages`, { headers: { Authorization: `Bearer ${tokens.client}` }, params: { page: 1, limit: 200 } });
    const messages = msgs.data?.messages || [];
    const withLoad = messages.filter(m => !!m.loadId);
    log('Client messages fetched', 'PASS', `total=${messages.length}, withLoad=${withLoad.length}`);
  } catch (e) {
    log('Client messages fetched', 'FAIL', e.response?.status || e.message);
  }

  // D) Documents endpoint 403/401 when unauthorized (page should not break)
  try {
    await axios.get(`${BASE_URL}/documents`);
    log('Documents endpoint (no auth)', 'FAIL', 'expected 401/403');
  } catch (e) {
    const code = e.response?.status;
    if (code === 401 || code === 403) log('Documents endpoint (no auth)', 'PASS', `status=${code}`);
    else log('Documents endpoint (no auth)', 'FAIL', `status=${code}`);
  }

  // E) POD/Invoice/Payments smoke (best-effort)
  // Try to list loads and pick one assigned to transporter to check linked data endpoints respond
  try {
    const loadsResp = await axios.get(`${BASE_URL}/loads`, { headers: { Authorization: `Bearer ${tokens.transporter}` }, params: { page: 1, limit: 5 } });
    const loads = loadsResp.data?.loads || [];
    const anyLoadId = loads[0]?.id;
    if (!anyLoadId) {
      log('Loads for transporter', 'FAIL', 'no loads found');
    } else {
      log('Loads for transporter', 'PASS', `found=${loads.length}`);
      // PODs
      try {
        const pods = await axios.get(`${BASE_URL}/pods/load/${anyLoadId}`, { headers: { Authorization: `Bearer ${tokens.admin}` } });
        log('Admin list PODs by load', 'PASS', `count=${(pods.data?.pods || pods.data || []).length}`);
      } catch (e) {
        log('Admin list PODs by load', 'FAIL', e.response?.status || e.message);
      }
      // Invoices
      try {
        const inv = await axios.get(`${BASE_URL}/invoices/load/${anyLoadId}`, { headers: { Authorization: `Bearer ${tokens.admin}` } });
        log('Admin list invoices by load', 'PASS', `count=${(inv.data?.invoices || inv.data || []).length}`);
      } catch (e) {
        log('Admin list invoices by load', 'FAIL', e.response?.status || e.message);
      }
      // Payments
      try {
        const pay = await axios.get(`${BASE_URL}/payments/load/${anyLoadId}`, { headers: { Authorization: `Bearer ${tokens.admin}` } });
        log('Admin list payments by load', 'PASS', `count=${(pay.data?.payments || pay.data || []).length}`);
      } catch (e) {
        log('Admin list payments by load', 'FAIL', e.response?.status || e.message);
      }
    }
  } catch (e) {
    log('Loads for transporter', 'FAIL', e.response?.status || e.message);
  }

  console.log('=== E2E VERIFY END ===');
}

run().catch(err => {
  console.error('E2E script error:', err);
  process.exit(1);
});


