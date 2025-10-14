const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

async function testAllLogins() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('fleetxchange');
    const usersCollection = db.collection('User');
    
    const testAccounts = [
      { email: 'client1@example.com', password: 'Client123!', type: 'CLIENT' },
      { email: 'transporter1@example.com', password: 'Transport123!', type: 'TRANSPORTER' },
      { email: 'mrtiger@fleetxchange.africa', password: 'FleetX2025!', type: 'ADMIN' }
    ];
    
    console.log('\n🧪 Testing all login accounts...\n');
    
    for (const account of testAccounts) {
      console.log(`🔍 Testing ${account.type}: ${account.email}`);
      
      const user = await usersCollection.findOne({ email: account.email });
      
      if (!user) {
        console.log(`❌ User not found: ${account.email}`);
        continue;
      }
      
      console.log(`✅ User found: ${user.userType} - ${user.status}`);
      
      const isValidPassword = await bcrypt.compare(account.password, user.password);
      
      if (isValidPassword) {
        console.log(`✅ Password is correct!`);
        console.log(`🎉 ${account.type} login should work!\n`);
      } else {
        console.log(`❌ Password is incorrect\n`);
      }
    }
    
    console.log('📋 Summary:');
    console.log('👑 Admin: mrtiger@fleetxchange.africa | Password: FleetX2025!');
    console.log('👤 Client: client1@example.com | Password: Client123!');
    console.log('🚛 Transporter: transporter1@example.com | Password: Transport123!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

testAllLogins();
