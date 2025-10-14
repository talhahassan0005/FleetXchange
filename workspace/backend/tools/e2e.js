const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const API = `http://localhost:${process.env.PORT || 5000}`;

const waitFor = async (ms) => new Promise(r => setTimeout(r, ms));

async function waitForHealthy(retries = 20) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await axios.get(`${API}/health`, { timeout: 2000 });
      if (res.status === 200) return true;
    } catch (err) {
      // ignore
    }
    await waitFor(1000);
  }
  throw new Error('Server did not become healthy in time');
}

(async () => {
  console.log('Starting E2E tests against', API);
  try {
    await waitForHealthy();
    console.log('Health check OK');

    // Use admin credentials from env if available
    const adminEmail = process.env.ADMIN_EMAIL || 'mrtiger@fleetxchange.africa';
    const adminPassword = process.env.ADMIN_PASSWORD || 'FleetX2025!';

    console.log('Trying admin login...');
    try {
      const loginRes = await axios.post(`${API}/api/auth/login`, { email: adminEmail, password: adminPassword });
      console.log('Admin login OK');
      const adminToken = loginRes.data.token;
      // Get profile
      const profile = await axios.get(`${API}/api/auth/profile`, { headers: { Authorization: `Bearer ${adminToken}` } });
      console.log('Admin profile OK:', profile.data.user.email);
    } catch (err) {
      console.warn('Admin login failed (expected if admin not present):', err.response && err.response.data || err.message);
    }

    // Create a temporary user via register
    const random = Math.random().toString(36).slice(2, 8);
    const email = `e2e_${random}@example.com`;
    const password = 'E2ePass123!';

    console.log('Registering test user', email);
    const regRes = await axios.post(`${API}/api/auth/register`, {
      email,
      password,
      userType: 'CLIENT',
      companyName: 'E2E Corp',
      contactPerson: 'Tester',
      phone: '000',
      address: 'Nowhere'
    });
    console.log('Register response status:', regRes.status);

    // Activate user directly in DB using Prisma
    console.log('Activating test user in DB');
    const u = await prisma.user.findUnique({ where: { email } });
    if (!u) throw new Error('User not found in DB after register');
    await prisma.user.update({ where: { id: u.id }, data: { status: 'ACTIVE' } });
    console.log('User activated');

    // Login with test user
    console.log('Logging in as test user');
    const login = await axios.post(`${API}/api/auth/login`, { email, password });
    console.log('Login status:', login.status);
    const token = login.data.token;

    // Profile
    const profileRes = await axios.get(`${API}/api/auth/profile`, { headers: { Authorization: `Bearer ${token}` } });
    console.log('Profile OK for', profileRes.data.user.email);

    // Refresh token
    const refreshRes = await axios.post(`${API}/api/auth/refresh`, {}, { headers: { Authorization: `Bearer ${token}` } });
    console.log('Refresh OK, new token length:', (refreshRes.data.token || '').length);

    // Change password
    const newPassword = 'E2ePass321!';
    const changeRes = await axios.put(`${API}/api/auth/change-password`, { currentPassword: password, newPassword }, { headers: { Authorization: `Bearer ${token}` } });
    console.log('Change-password response:', changeRes.data.message || changeRes.status);

    // revert password back
    // login with new password
    const login2 = await axios.post(`${API}/api/auth/login`, { email, password: newPassword });
    const token2 = login2.data.token;
    await axios.put(`${API}/api/auth/change-password`, { currentPassword: newPassword, newPassword: password }, { headers: { Authorization: `Bearer ${token2}` } });
    console.log('Password reverted');

    console.log('E2E tests finished successfully');
    process.exit(0);
  } catch (err) {
    console.error('E2E script failed:', err.response && err.response.data ? err.response.data : err.message);
    process.exit(1);
  }
})();
