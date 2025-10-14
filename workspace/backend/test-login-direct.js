const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

async function testLogin() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('fleetxchange');
    const usersCollection = db.collection('User');
    
    // Test login for client1@example.com
    const email = 'client1@example.com';
    const password = 'Client123!';
    
    console.log(`🔍 Testing login for: ${email}`);
    
    const user = await usersCollection.findOne({ email });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('✅ User found:', {
      email: user.email,
      userType: user.userType,
      status: user.status
    });
    
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (isValidPassword) {
      console.log('✅ Password is correct!');
      console.log('🎉 Login should work!');
    } else {
      console.log('❌ Password is incorrect');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

testLogin();