const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

async function setupMongoDB() {
  console.log('🔧 Setting up MongoDB for FleetXchange...');
  
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    // Check if replica set is configured
    const admin = client.db().admin();
    try {
      const status = await admin.command({ replSetGetStatus: 1 });
      console.log('✅ MongoDB replica set is already configured');
    } catch (error) {
      console.log('⚠️  MongoDB replica set not configured');
      console.log('Please run: mongosh --eval "rs.initiate({_id: \'rs0\', members: [{_id: 0, host: \'localhost:27017\'}]})"');
    }
    
    const db = client.db('fleetxchange');
    const usersCollection = db.collection('User');
    
    // Clear existing users
    await usersCollection.deleteMany({});
    console.log('🗑️  Cleared existing users');
    
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
    
    // Verify users
    const userCount = await usersCollection.countDocuments();
    console.log(`📊 Total users in database: ${userCount}`);
    
    console.log('\n🎉 MongoDB setup complete!');
    console.log('\n📋 Test Accounts:');
    console.log('👑 Admin: mrtiger@fleetxchange.africa | Password: FleetX2025!');
    console.log('👤 Client: client1@example.com | Password: Client123!');
    console.log('🚛 Transporter: transporter1@example.com | Password: Transport123!');
    
  } catch (error) {
    console.error('❌ Error setting up MongoDB:', error.message);
    console.log('\n💡 Make sure MongoDB is running on localhost:27017');
  } finally {
    await client.close();
  }
}

setupMongoDB();
