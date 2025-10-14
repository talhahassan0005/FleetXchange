const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

async function createTestUser() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    console.log('🔍 Creating test user...');
    
    const db = client.db('fleetxchange');
    const usersCollection = db.collection('User');
    
    // Hash password
    const hashedPassword = await bcrypt.hash('test123', 12);
    
    const testUser = {
      email: 'test@test.com',
      password: hashedPassword,
      userType: 'CLIENT',
      status: 'ACTIVE',
      companyName: 'Test Company',
      contactPerson: 'Test Person',
      phone: '1234567890',
      address: 'Test Address',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email: 'test@test.com' });
    if (existingUser) {
      console.log('❌ User already exists');
      return;
    }
    
    const result = await usersCollection.insertOne(testUser);
    console.log('✅ Test user created successfully!');
    console.log('📧 Email: test@test.com');
    console.log('🔑 Password: test123');
    console.log('🆔 User ID:', result.insertedId);
    
  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
  } finally {
    await client.close();
  }
}

createTestUser();
