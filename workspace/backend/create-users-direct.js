const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

async function createUsersDirect() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('fleetxchange');
    const usersCollection = db.collection('User');
    
    // Check if users already exist
    const existingUsers = await usersCollection.countDocuments();
    console.log(`📊 Found ${existingUsers} existing users`);
    
    if (existingUsers > 0) {
      console.log('✅ Users already exist in database');
      const users = await usersCollection.find({}, { projection: { email: 1, userType: 1 } }).toArray();
      users.forEach(user => {
        console.log(`   - ${user.email} (${user.userType})`);
      });
      return;
    }
    
    // Create admin user
    const adminPassword = await bcrypt.hash('FleetX2025!', 12);
    const adminUser = {
      email: 'mrtiger@fleetxchange.africa',
      password: adminPassword,
      userType: 'ADMIN',
      status: 'ACTIVE',
      companyName: 'FleetXchange Admin',
      contactPerson: 'Mr. Tiger',
      phone: '+27 11 123 4567',
      address: 'Johannesburg, South Africa',
      businessRegistration: 'ADMIN001',
      taxId: 'TAX001',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await usersCollection.insertOne(adminUser);
    console.log('✅ Admin user created: mrtiger@fleetxchange.africa');
    
    // Create client user
    const clientPassword = await bcrypt.hash('Client123!', 12);
    const clientUser = {
      email: 'client1@example.com',
      password: clientPassword,
      userType: 'CLIENT',
      status: 'ACTIVE',
      companyName: 'ABC Logistics',
      contactPerson: 'John Smith',
      phone: '+27 11 234 5678',
      address: 'Cape Town, South Africa',
      businessRegistration: 'CLIENT001',
      taxId: 'TAX002',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await usersCollection.insertOne(clientUser);
    console.log('✅ Client user created: client1@example.com');
    
    // Create transporter user
    const transporterPassword = await bcrypt.hash('Transport123!', 12);
    const transporterUser = {
      email: 'transporter1@example.com',
      password: transporterPassword,
      userType: 'TRANSPORTER',
      status: 'ACTIVE',
      companyName: 'Fast Freight Co',
      contactPerson: 'Mike Johnson',
      phone: '+27 11 345 6789',
      address: 'Durban, South Africa',
      businessRegistration: 'TRANS001',
      taxId: 'TAX003',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await usersCollection.insertOne(transporterUser);
    console.log('✅ Transporter user created: transporter1@example.com');
    
    console.log('\n📋 Test Accounts Created:');
    console.log('👑 Admin: mrtiger@fleetxchange.africa | Password: FleetX2025!');
    console.log('👤 Client: client1@example.com | Password: Client123!');
    console.log('🚛 Transporter: transporter1@example.com | Password: Transport123!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

createUsersDirect();
