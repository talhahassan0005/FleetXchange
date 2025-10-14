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
        
        // Use create instead of upsert to avoid transactions
        const newUser = await prisma.user.create({
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

async function runAllTests() {
  console.log('🚀 Starting FleetXchange Authentication Tests...\n');
  
  const results = {
    database: false,
    server: false,
    adminAuth: false,
    clientAuth: false,
    transporterAuth: false
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
