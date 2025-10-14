#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import axios from 'axios';

const prisma = new PrismaClient();
const API_BASE = 'http://localhost:5000/api';

// Test credentials
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

async function testLogin(userType, userData) {
  console.log(`🔐 Testing ${userType.toUpperCase()} Login...`);
  
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: userData.email,
      password: userData.password
    }, { timeout: 5000 });

    if (response.status === 200 && response.data.token) {
      console.log(`✅ ${userType.toUpperCase()} Login SUCCESS!`);
      console.log(`   Email: ${userData.email}`);
      console.log(`   Token: ${response.data.token.substring(0, 20)}...`);
      
      // Test profile access
      try {
        const profileResponse = await axios.get(`${API_BASE}/auth/profile`, {
          headers: { Authorization: `Bearer ${response.data.token}` },
          timeout: 5000
        });
        
        if (profileResponse.status === 200) {
          const user = profileResponse.data.user;
          console.log(`✅ ${userType.toUpperCase()} Profile Access SUCCESS!`);
          console.log(`   User Type: ${user.userType}`);
          console.log(`   Status: ${user.status}`);
          console.log(`   Company: ${user.companyName}`);
          return true;
        } else {
          console.log(`❌ ${userType.toUpperCase()} Profile Access FAILED: ${profileResponse.status}`);
          return false;
        }
      } catch (profileError) {
        console.log(`❌ ${userType.toUpperCase()} Profile Access FAILED: ${profileError.message}`);
        return false;
      }
    } else {
      console.log(`❌ ${userType.toUpperCase()} Login FAILED: No token received`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${userType.toUpperCase()} Login FAILED: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function testServerHealth() {
  console.log('🏥 Testing Server Health...');
  try {
    const response = await axios.get('http://localhost:5000/health', { timeout: 5000 });
    if (response.status === 200) {
      console.log('✅ Server is healthy!');
      console.log(`   Status: ${response.data.status}`);
      console.log(`   Service: ${response.data.service}`);
      return true;
    } else {
      console.log(`❌ Server health check failed: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Server health check failed: ${error.message}`);
    return false;
  }
}

async function runLoginTests() {
  console.log('🚀 Starting FleetXchange Login Tests...\n');
  
  // Test database connection
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully\n');
  } catch (error) {
    console.log('❌ Database connection failed:', error.message);
    return;
  }
  
  // Create test users
  await createTestUsers();
  console.log('');
  
  // Test server health
  const serverHealthy = await testServerHealth();
  console.log('');
  
  if (!serverHealthy) {
    console.log('❌ Server is not running. Please start the server first.');
    return;
  }
  
  // Test all user logins
  console.log('🔐 Testing All User Logins:');
  console.log('=' * 50);
  
  const results = {
    admin: false,
    client: false,
    transporter: false
  };
  
  results.admin = await testLogin('admin', testUsers.admin);
  console.log('');
  
  results.client = await testLogin('client', testUsers.client);
  console.log('');
  
  results.transporter = await testLogin('transporter', testUsers.transporter);
  console.log('');
  
  // Print summary
  console.log('📊 Login Test Results Summary:');
  console.log('=' * 50);
  console.log(`Admin Login: ${results.admin ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Client Login: ${results.client ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Transporter Login: ${results.transporter ? '✅ PASS' : '❌ FAIL'}`);
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n🎯 Overall Score: ${passedTests}/${totalTests} logins successful`);
  
  if (passedTests === totalTests) {
    console.log('🎉 ALL LOGIN TESTS PASSED! Authentication is working perfectly!');
  } else {
    console.log('⚠️ Some login tests failed. Please check the errors above.');
  }
  
  await prisma.$disconnect();
}

// Run tests
runLoginTests().catch(console.error);

