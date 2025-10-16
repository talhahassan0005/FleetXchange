/*
 Approval Policy E2E (login blocked until admin approves)
 Runs against local backend and prints PASS/FAIL.
*/
const axios = require('axios');

const BASE_URL = process.env.LOCAL_API || 'http://localhost:5000/api';

function log(title, status, extra) {
	const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
	console.log(`${icon} ${title}: ${status}${extra ? ' - ' + extra : ''}`);
}

async function run() {
	console.log('=== APPROVAL POLICY TEST START ===');
	console.log(`API: ${BASE_URL}`);

	const rnd = Math.random().toString(36).slice(2, 8);
	const email = `pending_${rnd}@example.com`;
	const password = 'Pending123!';

	try {
		await axios.post(`${BASE_URL}/auth/register`, {
			email,
			password,
			userType: 'CLIENT',
			companyName: 'Pending Co',
			contactPerson: 'Pending User',
			phone: '000',
			address: 'Nowhere'
		});
		log('Register new CLIENT (PENDING)', 'PASS', email);
	} catch (e) {
		return log('Register new CLIENT (PENDING)', 'FAIL', e.response?.status || e.message);
	}

	// Immediately try to login — expected: 401/403 if policy enforced
	try {
		await axios.post(`${BASE_URL}/auth/login`, { email, password });
		log('Pending cannot login', 'FAIL', 'login succeeded (should be blocked)');
	} catch (e) {
		const code = e.response?.status;
		if (code === 401 || code === 403) {
			log('Pending cannot login', 'PASS', `status=${code}`);
		} else {
			log('Pending cannot login', 'FAIL', code || e.message);
		}
	}

	console.log('=== APPROVAL POLICY TEST END ===');
}

run().catch(err => {
	console.error('Approval policy script error:', err);
	process.exit(1);
});


