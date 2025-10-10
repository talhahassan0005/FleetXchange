import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  try {
    // Create admin users
    const adminPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'FleetX2025!', 12);

    const admin1 = await prisma.user.upsert({
      where: { email: 'mrtiger@fleetxchange.africa' },
      update: {},
      create: {
        email: 'mrtiger@fleetxchange.africa',
        password: adminPassword,
        userType: 'ADMIN',
        status: 'ACTIVE',
        companyName: 'FleetXchange Africa',
        contactPerson: 'Mr. Tiger',
        phone: '+27-11-123-4567',
        address: 'FleetXchange HQ, Johannesburg, South Africa',
        businessRegistration: 'REG001',
        taxId: 'TAX001'
      }
    });

    const admin2 = await prisma.user.upsert({
      where: { email: 'tshepiso@fleetxchange.africa' },
      update: {},
      create: {
        email: 'tshepiso@fleetxchange.africa',
        password: adminPassword,
        userType: 'ADMIN',
        status: 'ACTIVE',
        companyName: 'FleetXchange Africa',
        contactPerson: 'Tshepiso',
        phone: '+27-11-123-4568',
        address: 'FleetXchange HQ, Johannesburg, South Africa',
        businessRegistration: 'REG002',
        taxId: 'TAX002'
      }
    });

    console.log('✅ Admin users created:', {
      admin1: { id: admin1.id, email: admin1.email },
      admin2: { id: admin2.id, email: admin2.email }
    });

    // Create sample client users
    const clientPassword = await bcrypt.hash('Client123!', 12);

    const client1 = await prisma.user.upsert({
      where: { email: 'client1@example.com' },
      update: {},
      create: {
        email: 'client1@example.com',
        password: clientPassword,
        userType: 'CLIENT',
        status: 'ACTIVE',
        companyName: 'ABC Logistics Ltd',
        contactPerson: 'John Smith',
        phone: '+27-11-234-5678',
        address: '123 Business St, Cape Town, South Africa',
        businessRegistration: 'REG003',
        taxId: 'TAX003'
      }
    });

    const client2 = await prisma.user.upsert({
      where: { email: 'client2@example.com' },
      update: {},
      create: {
        email: 'client2@example.com',
        password: clientPassword,
        userType: 'CLIENT',
        status: 'ACTIVE',
        companyName: 'XYZ Trading Co',
        contactPerson: 'Sarah Johnson',
        phone: '+27-11-345-6789',
        address: '456 Trade Ave, Durban, South Africa',
        businessRegistration: 'REG004',
        taxId: 'TAX004'
      }
    });

    console.log('✅ Client users created:', {
      client1: { id: client1.id, email: client1.email },
      client2: { id: client2.id, email: client2.email }
    });

    // Create sample transporter users
    const transporterPassword = await bcrypt.hash('Transport123!', 12);

    const transporter1 = await prisma.user.upsert({
      where: { email: 'transporter1@example.com' },
      update: {},
      create: {
        email: 'transporter1@example.com',
        password: transporterPassword,
        userType: 'TRANSPORTER',
        status: 'ACTIVE',
        companyName: 'FastMove Transport',
        contactPerson: 'Mike Wilson',
        phone: '+27-11-456-7890',
        address: '789 Transport Rd, Johannesburg, South Africa',
        businessRegistration: 'REG005',
        taxId: 'TAX005'
      }
    });

    const transporter2 = await prisma.user.upsert({
      where: { email: 'transporter2@example.com' },
      update: {},
      create: {
        email: 'transporter2@example.com',
        password: transporterPassword,
        userType: 'TRANSPORTER',
        status: 'ACTIVE',
        companyName: 'QuickHaul Services',
        contactPerson: 'Lisa Brown',
        phone: '+27-11-567-8901',
        address: '321 Freight St, Pretoria, South Africa',
        businessRegistration: 'REG006',
        taxId: 'TAX006'
      }
    });

    console.log('✅ Transporter users created:', {
      transporter1: { id: transporter1.id, email: transporter1.email },
      transporter2: { id: transporter2.id, email: transporter2.email }
    });

    // Create sample loads
    const load1 = await prisma.load.create({
      data: {
        title: 'Electronics Shipment - Cape Town to Johannesburg',
        description: 'Urgent delivery of electronic components for manufacturing',
        cargoType: 'Electronics',
        weight: 500.5,
        pickupLocation: 'Cape Town, Western Cape',
        deliveryLocation: 'Johannesburg, Gauteng',
        pickupDate: new Date('2024-02-01T08:00:00Z'),
        deliveryDate: new Date('2024-02-03T17:00:00Z'),
        budgetMin: 5000,
        budgetMax: 8000,
        clientId: client1.id
      }
    });

    const load2 = await prisma.load.create({
      data: {
        title: 'Food Products - Durban to Cape Town',
        description: 'Temperature-controlled delivery of fresh produce',
        cargoType: 'Food & Beverages',
        weight: 1200.0,
        pickupLocation: 'Durban, KwaZulu-Natal',
        deliveryLocation: 'Cape Town, Western Cape',
        pickupDate: new Date('2024-02-05T06:00:00Z'),
        deliveryDate: new Date('2024-02-07T14:00:00Z'),
        budgetMin: 8000,
        budgetMax: 12000,
        clientId: client2.id
      }
    });

    console.log('✅ Sample loads created:', {
      load1: { id: load1.id, title: load1.title },
      load2: { id: load2.id, title: load2.title }
    });

    // Create sample bids
    const bid1 = await prisma.bid.create({
      data: {
        amount: 6500,
        pickupDate: new Date('2024-02-01T08:00:00Z'),
        deliveryDate: new Date('2024-02-03T16:00:00Z'),
        comments: 'We have experience with electronics transport and can guarantee safe delivery',
        loadId: load1.id,
        transporterId: transporter1.id
      }
    });

    const bid2 = await prisma.bid.create({
      data: {
        amount: 7200,
        pickupDate: new Date('2024-02-01T09:00:00Z'),
        deliveryDate: new Date('2024-02-03T15:00:00Z'),
        comments: 'Premium service with real-time tracking',
        loadId: load1.id,
        transporterId: transporter2.id
      }
    });

    const bid3 = await prisma.bid.create({
      data: {
        amount: 10500,
        pickupDate: new Date('2024-02-05T06:00:00Z'),
        deliveryDate: new Date('2024-02-07T12:00:00Z'),
        comments: 'Refrigerated truck available for temperature-controlled transport',
        loadId: load2.id,
        transporterId: transporter1.id
      }
    });

    console.log('✅ Sample bids created:', {
      bid1: { id: bid1.id, amount: bid1.amount },
      bid2: { id: bid2.id, amount: bid2.amount },
      bid3: { id: bid3.id, amount: bid3.amount }
    });

    // Create sample messages
    const message1 = await prisma.message.create({
      data: {
        message: 'Hello! I have a question about the electronics shipment.',
        messageType: 'GENERAL',
        senderId: transporter1.id,
        receiverId: client1.id,
        loadId: load1.id
      }
    });

    const message2 = await prisma.message.create({
      data: {
        message: 'Hi! Please let me know if you need any additional information about the delivery.',
        messageType: 'GENERAL',
        senderId: client1.id,
        receiverId: transporter1.id,
        loadId: load1.id
      }
    });

    console.log('✅ Sample messages created:', {
      message1: { id: message1.id },
      message2: { id: message2.id }
    });

    // Create system log entry
    await prisma.systemLog.create({
      data: {
        action: 'DATABASE_SEEDED',
        details: {
          timestamp: new Date().toISOString(),
          usersCreated: 6,
          loadsCreated: 2,
          bidsCreated: 3,
          messagesCreated: 2
        }
      }
    });

    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📋 Test Accounts Created:');
    console.log('👑 Admin Accounts:');
    console.log('   Email: mrtiger@fleetxchange.africa | Password: FleetX2025!');
    console.log('   Email: tshepiso@fleetxchange.africa | Password: FleetX2025!');
    console.log('\n👤 Client Accounts:');
    console.log('   Email: client1@example.com | Password: Client123!');
    console.log('   Email: client2@example.com | Password: Client123!');
    console.log('\n🚛 Transporter Accounts:');
    console.log('   Email: transporter1@example.com | Password: Transport123!');
    console.log('   Email: transporter2@example.com | Password: Transport123!');

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });