#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import axios from 'axios';

const prisma = new PrismaClient();
const API_BASE = 'http://localhost:5000/api';

// Test data
const testUsers = {
  admin: {
    email: 'mrtiger@fleetxchange.africa',
    password: 'FleetX2025!',
    userType: 'ADMIN'
  },
  client: {
    email: 'client1@example.com',
    password: 'Client123!',
    userType: 'CLIENT'
  },
  transporter: {
    email: 'transporter1@example.com',
    password: 'Transport123!',
    userType: 'TRANSPORTER'
  }
};

async function testDatabaseConnection() {
  console.log('🔍 Testing Database Connection...');
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    return true;
  } catch (error) {
    console.log('❌ Database connection failed:', error.message);
    return false;
  }
}

async function createTestUsers() {
  console.log('👥 Creating Test Users...');
  
  for (const [type, user] of Object.entries(testUsers)) {
    try {
      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { email: user.email }
      });

      if (!existingUser) {
        const hashedPassword = await bcrypt.hash(user.password, 12);
        
        await prisma.user.create({
          data: {
            email: user.email,
            password: hashedPassword,
            userType: user.userType,
            status: 'ACTIVE',
            companyName: `${type.toUpperCase()} Company`,
            contactPerson: `${type.toUpperCase()} User`,
            phone: '+27 11 123 4567',
            address: 'South Africa',
            businessRegistration: `${type.toUpperCase()}001`,
            taxId: `TAX${type.toUpperCase()}001`
          }
        });
        console.log(`✅ ${type.toUpperCase()} user created: ${user.email}`);
      } else {
        console.log(`✅ ${type.toUpperCase()} user already exists: ${user.email}`);
      }
    } catch (error) {
      console.log(`❌ Failed to create ${type.toUpperCase()} user:`, error.message);
    }
  }
}

async function testServerHealth() {
  console.log('🏥 Testing Server Health...');
  try {
    const response = await axios.get('http://localhost:5000/health');
    console.log('✅ Server is healthy:', response.data);
    return true;
  } catch (error) {
    console.log('❌ Server health check failed:', error.message);
    return false;
  }
}

async function testAuthentication(userType, userData) {
  console.log(`🔐 Testing ${userType.toUpperCase()} Authentication...`);
  
  try {
    // Test login
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: userData.email,
      password: userData.password
    });

    if (loginResponse.data.token) {
      console.log(`✅ ${userType.toUpperCase()} login successful`);
      
      const token = loginResponse.data.token;
      
      // Test protected route
      try {
        const profileResponse = await axios.get(`${API_BASE}/auth/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`✅ ${userType.toUpperCase()} profile access successful`);
        console.log(`   User: ${profileResponse.data.user.email}`);
        console.log(`   Type: ${profileResponse.data.user.userType}`);
        console.log(`   Status: ${profileResponse.data.user.status}`);
      } catch (profileError) {
        console.log(`❌ ${userType.toUpperCase()} profile access failed:`, profileError.response?.data?.message || profileError.message);
      }
      
      return true;
    } else {
      console.log(`❌ ${userType.toUpperCase()} login failed: No token received`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${userType.toUpperCase()} authentication failed:`, error.response?.data?.message || error.message);
    return false;
  }
}

async function testLoadOperations() {
  console.log('📦 Testing Load Operations...');
  
  try {
    // Login as client
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: testUsers.client.email,
      password: testUsers.client.password
    });
    
    const token = loginResponse.data.token;
    
    // Create a test load
    const loadData = {
      title: 'Test Load - Electronics',
      description: 'Transport electronics from Johannesburg to Cape Town',
      cargoType: 'Electronics',
      weight: 500.0,
      pickupLocation: 'Johannesburg, South Africa',
      deliveryLocation: 'Cape Town, South Africa',
      pickupDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      deliveryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      budgetMin: 5000.0,
      budgetMax: 8000.0
    };
    
    const loadResponse = await axios.post(`${API_BASE}/loads`, loadData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Load created successfully:', loadResponse.data.load.id);
    
    // Get all loads
    const loadsResponse = await axios.get(`${API_BASE}/loads`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(`✅ Retrieved ${loadsResponse.data.loads.length} loads`);
    
    return true;
  } catch (error) {
    console.log('❌ Load operations failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testBidOperations() {
  console.log('💰 Testing Bid Operations...');
  
  try {
    // Login as transporter
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: testUsers.transporter.email,
      password: testUsers.transporter.password
    });
    
    const token = loginResponse.data.token;
    
    // Get available loads first
    const loadsResponse = await axios.get(`${API_BASE}/loads`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (loadsResponse.data.loads.length > 0) {
      const loadId = loadsResponse.data.loads[0].id;
      
      // Create a bid
      const bidData = {
        loadId: loadId,
        amount: 6500.0,
        pickupDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        deliveryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        comments: 'Professional transport service with insurance'
      };
      
      const bidResponse = await axios.post(`${API_BASE}/bids`, bidData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('✅ Bid created successfully:', bidResponse.data.bid.id);
      
      // Get all bids
      const bidsResponse = await axios.get(`${API_BASE}/bids`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log(`✅ Retrieved ${bidsResponse.data.bids.length} bids`);
      
      return true;
    } else {
      console.log('⚠️ No loads available for bidding');
      return false;
    }
  } catch (error) {
    console.log('❌ Bid operations failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testAdminOperations() {
  console.log('👑 Testing Admin Operations...');
  
  try {
    // Login as admin
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: testUsers.admin.email,
      password: testUsers.admin.password
    });
    
    const token = loginResponse.data.token;
    
    // Get all users
    const usersResponse = await axios.get(`${API_BASE}/users`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(`✅ Retrieved ${usersResponse.data.users.length} users`);
    
    // Update user status
    if (usersResponse.data.users.length > 0) {
      const userId = usersResponse.data.users[0].id;
      
      const updateResponse = await axios.put(`${API_BASE}/users/${userId}/status`, {
        status: 'ACTIVE'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('✅ User status updated successfully');
    }
    
    return true;
  } catch (error) {
    console.log('❌ Admin operations failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting FleetXchange Authentication Tests...\n');
  
  const results = {
    database: false,
    server: false,
    adminAuth: false,
    clientAuth: false,
    transporterAuth: false,
    loadOps: false,
    bidOps: false,
    adminOps: false
  };
  
  // Test database connection
  results.database = await testDatabaseConnection();
  
  if (results.database) {
    // Create test users
    await createTestUsers();
    
    // Test server health
    results.server = await testServerHealth();
    
    if (results.server) {
      // Test authentication for all user types
      results.adminAuth = await testAuthentication('admin', testUsers.admin);
      results.clientAuth = await testAuthentication('client', testUsers.client);
      results.transporterAuth = await testAuthentication('transporter', testUsers.transporter);
      
      // Test operations
      results.loadOps = await testLoadOperations();
      results.bidOps = await testBidOperations();
      results.adminOps = await testAdminOperations();
    }
  }
  
  // Print summary
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  console.log(`Database Connection: ${results.database ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Server Health: ${results.server ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Admin Authentication: ${results.adminAuth ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Client Authentication: ${results.clientAuth ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Transporter Authentication: ${results.transporterAuth ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Load Operations: ${results.loadOps ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Bid Operations: ${results.bidOps ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Admin Operations: ${results.adminOps ? '✅ PASS' : '❌ FAIL'}`);
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n🎯 Overall Score: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! FleetXchange authentication system is working perfectly!');
  } else {
    console.log('⚠️ Some tests failed. Please check the errors above.');
  }
  
  await prisma.$disconnect();
}

// Run tests
runAllTests().catch(console.error);
