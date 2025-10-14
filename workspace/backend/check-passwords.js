const { MongoClient } = require('mongodb');

async function checkPasswords() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    console.log('🔍 Checking user passwords in MongoDB...');
    
    const db = client.db('fleetxchange');
    const usersCollection = db.collection('User');
    
    const users = await usersCollection.find({}, {
      projection: {
        _id: 1,
        email: 1,
        userType: 1,
        status: 1,
        companyName: 1,
        password: 1
      }
    }).toArray();
    
    console.log(`📊 Found ${users.length} users:`);
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.userType}) - ${user.status}`);
      console.log(`   Password hash: ${user.password ? user.password.substring(0, 20) + '...' : 'No password'}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking passwords:', error.message);
  } finally {
    await client.close();
  }
}

checkPasswords();
