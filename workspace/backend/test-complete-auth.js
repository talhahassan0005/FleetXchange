#!/usr/bin/env node

import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

// Test credentials
const testUsers = {
  admin: {
    email: 'mrtiger@fleetxchange.africa',
    password: 'FleetX2025!',
    userType: 'ADMIN',
    companyName: 'FleetXchange Admin',
    contactPerson: 'Mr. Tiger',
    phone: '+27 11 123 4567',
    address: 'South Africa',
    businessRegistration: 'ADMIN001',
    taxId: 'TAXADMIN001'
  },
  client: {
    email: 'client1@example.com',
    password: 'Client123!',
    userType: 'CLIENT',
    companyName: 'Client Company',
    contactPerson: 'Client User',
    phone: '+27 11 123 4567',
    address: 'South Africa',
    businessRegistration: 'CLIENT001',
    taxId: 'TAXCLIENT001'
  },
  transporter: {
    email: 'transporter1@example.com',
    password: 'Transport123!',
    userType: 'TRANSPORTER',
    companyName: 'Transporter Company',
    contactPerson: 'Transporter User',
    phone: '+27 11 123 4567',
    address: 'South Africa',
    businessRegistration: 'TRANSPORT001',
    taxId: 'TAXTRANSPORT001'
  }
};

async function registerUser(userType, userData) {
  console.log(`👤 Registering ${userType.toUpperCase()} User...`);
  
  try {
    const response = await axios.post(`${API_BASE}/auth/register`, userData, { timeout: 5000 });

    if (response.status === 201) {
      console.log(`✅ ${userType.toUpperCase()} Registration SUCCESS!`);
      console.log(`   Email: ${userData.email}`);
      console.log(`   User Type: ${userData.userType}`);
      return true;
    } else {
      console.log(`❌ ${userType.toUpperCase()} Registration FAILED: ${response.status}`);
      return false;
    }
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.message?.includes('already exists')) {
      console.log(`✅ ${userType.toUpperCase()} User already exists: ${userData.email}`);
      return true;
    } else {
      console.log(`❌ ${userType.toUpperCase()} Registration FAILED: ${error.response?.data?.message || error.message}`);
      return false;
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

async function runCompleteTests() {
  console.log('🚀 Starting FleetXchange Complete Authentication Tests...\n');
  
  // Test server health
  const serverHealthy = await testServerHealth();
  console.log('');
  
  if (!serverHealthy) {
    console.log('❌ Server is not running. Please start the server first.');
    return;
  }
  
  // Register all users
  console.log('👥 Registering Test Users:');
  console.log('=' * 50);
  
  const registrationResults = {
    admin: false,
    client: false,
    transporter: false
  };
  
  registrationResults.admin = await registerUser('admin', testUsers.admin);
  console.log('');
  
  registrationResults.client = await registerUser('client', testUsers.client);
  console.log('');
  
  registrationResults.transporter = await registerUser('transporter', testUsers.transporter);
  console.log('');
  
  // Test all user logins
  console.log('🔐 Testing All User Logins:');
  console.log('=' * 50);
  
  const loginResults = {
    admin: false,
    client: false,
    transporter: false
  };
  
  loginResults.admin = await testLogin('admin', testUsers.admin);
  console.log('');
  
  loginResults.client = await testLogin('client', testUsers.client);
  console.log('');
  
  loginResults.transporter = await testLogin('transporter', testUsers.transporter);
  console.log('');
  
  // Print summary
  console.log('📊 Complete Test Results Summary:');
  console.log('=' * 50);
  console.log('Registration Results:');
  console.log(`Admin Registration: ${registrationResults.admin ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Client Registration: ${registrationResults.client ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Transporter Registration: ${registrationResults.transporter ? '✅ PASS' : '❌ FAIL'}`);
  console.log('');
  console.log('Login Results:');
  console.log(`Admin Login: ${loginResults.admin ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Client Login: ${loginResults.client ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Transporter Login: ${loginResults.transporter ? '✅ PASS' : '❌ FAIL'}`);
  
  const passedRegistrations = Object.values(registrationResults).filter(Boolean).length;
  const passedLogins = Object.values(loginResults).filter(Boolean).length;
  const totalTests = Object.keys(registrationResults).length * 2;
  
  console.log(`\n🎯 Overall Score: ${passedRegistrations + passedLogins}/${totalTests} tests passed`);
  
  if (passedRegistrations === 3 && passedLogins === 3) {
    console.log('🎉 ALL TESTS PASSED! FleetXchange authentication system is working perfectly!');
    console.log('✅ Admin, Client, and Transporter authentication all working!');
  } else {
    console.log('⚠️ Some tests failed. Please check the errors above.');
  }
}

// Run tests
runCompleteTests().catch(console.error);

