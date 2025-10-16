const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

async function resetTestPasswords() {
	const mongoUri = process.env.MONGODB_URI || process.env.ATLAS_URI || 'mongodb://localhost:27017';
	const client = new MongoClient(mongoUri);

	const usersToReset = [
		{ email: 'mrtiger@fleetxchange.africa', password: 'FleetX2025!', userType: 'ADMIN' },
		{ email: 'client1@example.com', password: 'Client123!', userType: 'CLIENT' },
		{ email: 'transporter1@example.com', password: 'Transport123!', userType: 'TRANSPORTER' },
	];

	try {
		await client.connect();
		const db = client.db('fleetxchange');
    		const users = db.collection('User');

		for (const u of usersToReset) {
			const hashed = await bcrypt.hash(u.password, 12);
			const res = await users.updateOne(
				{ email: u.email },
				{
					$set: {
						password: hashed,
						status: 'ACTIVE',
						userType: u.userType,
						emailVerified: true,
						updatedAt: new Date(),
					},
				},
				{ upsert: false }
			);
			console.log(`Reset ${u.email}: matched=${res.matchedCount}, modified=${res.modifiedCount}`);
		}

    		console.log('✅ Test passwords reset complete');
    		console.log(`DB: ${mongoUri}`);
	} catch (err) {
		console.error('❌ Failed to reset test passwords:', err.message);
		process.exitCode = 1;
	} finally {
		await client.close();
	}
}

resetTestPasswords();


