const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function createUsers() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Creating test users...');
    
    // Create admin user
    const adminPassword = await bcrypt.hash('FleetX2025!', 12);
    
    try {
      const admin = await prisma.user.create({
        data: {
          email: 'mrtiger@fleetxchange.africa',
          password: adminPassword,
          userType: 'ADMIN',
          status: 'ACTIVE',
          companyName: 'FleetXchange Admin',
          contactPerson: 'Mr. Tiger',
          phone: '+27 11 123 4567',
          address: 'Johannesburg, South Africa',
          businessRegistration: 'ADMIN001',
          taxId: 'TAX001'
        }
      });
      console.log('✅ Admin user created:', admin.email);
    } catch (error) {
      if (error.code === 'P2002') {
        console.log('✅ Admin user already exists');
      } else {
        console.error('❌ Error creating admin:', error.message);
      }
    }
    
    // Create client user
    const clientPassword = await bcrypt.hash('Client123!', 12);
    
    try {
      const client = await prisma.user.create({
        data: {
          email: 'client1@example.com',
          password: clientPassword,
          userType: 'CLIENT',
          status: 'ACTIVE',
          companyName: 'ABC Logistics',
          contactPerson: 'John Smith',
          phone: '+27 11 234 5678',
          address: 'Cape Town, South Africa',
          businessRegistration: 'CLIENT001',
          taxId: 'TAX002'
        }
      });
      console.log('✅ Client user created:', client.email);
    } catch (error) {
      if (error.code === 'P2002') {
        console.log('✅ Client user already exists');
      } else {
        console.error('❌ Error creating client:', error.message);
      }
    }
    
    // Create transporter user
    const transporterPassword = await bcrypt.hash('Transport123!', 12);
    
    try {
      const transporter = await prisma.user.create({
        data: {
          email: 'transporter1@example.com',
          password: transporterPassword,
          userType: 'TRANSPORTER',
          status: 'ACTIVE',
          companyName: 'Fast Freight Co',
          contactPerson: 'Mike Johnson',
          phone: '+27 11 345 6789',
          address: 'Durban, South Africa',
          businessRegistration: 'TRANS001',
          taxId: 'TAX003'
        }
      });
      console.log('✅ Transporter user created:', transporter.email);
    } catch (error) {
      if (error.code === 'P2002') {
        console.log('✅ Transporter user already exists');
      } else {
        console.error('❌ Error creating transporter:', error.message);
      }
    }
    
    console.log('\n📋 Test Accounts:');
    console.log('👑 Admin: mrtiger@fleetxchange.africa | Password: FleetX2025!');
    console.log('👤 Client: client1@example.com | Password: Client123!');
    console.log('🚛 Transporter: transporter1@example.com | Password: Transport123!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createUsers();
