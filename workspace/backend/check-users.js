const { MongoClient } = require('mongodb');

async function checkUsers() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    console.log('🔍 Checking users in MongoDB...');
    
    const db = client.db('fleetxchange');
    const usersCollection = db.collection('User');
    
    const users = await usersCollection.find({}, {
      projection: {
        _id: 1,
        email: 1,
        userType: 1,
        status: 1,
        companyName: 1
      }
    }).toArray();
    
    console.log(`📊 Found ${users.length} users in database:`);
    
    if (users.length === 0) {
      console.log('❌ No users found! Database might be empty.');
    } else {
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email} (${user.userType}) - ${user.status}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking users:', error.message);
  } finally {
    await client.close();
  }
}

checkUsers();
