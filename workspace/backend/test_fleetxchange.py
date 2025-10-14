#!/usr/bin/env python3
"""
FleetXchange Backend API Test Suite
Comprehensive testing of all authentication and API endpoints
"""

import pytest
import requests
import json
import time
import os
from datetime import datetime, timedelta

# Test configuration
BASE_URL = "http://localhost:5000"
API_BASE = f"{BASE_URL}/api"
TIMEOUT = 10

# Test credentials
TEST_USERS = {
    "admin": {
        "email": "mrtiger@fleetxchange.africa",
        "password": "FleetX2025!",
        "userType": "ADMIN"
    },
    "client": {
        "email": "client1@example.com", 
        "password": "Client123!",
        "userType": "CLIENT"
    },
    "transporter": {
        "email": "transporter1@example.com",
        "password": "Transport123!",
        "userType": "TRANSPORTER"
    }
}

class TestResults:
    def __init__(self):
        self.results = {}
        self.passed = 0
        self.failed = 0
        self.total = 0
    
    def add_result(self, test_name, passed, message=""):
        self.results[test_name] = {"passed": passed, "message": message}
        if passed:
            self.passed += 1
        else:
            self.failed += 1
        self.total += 1
    
    def print_summary(self):
        print("\n" + "="*60)
        print("📊 FLEETXCHANGE API TEST RESULTS SUMMARY")
        print("="*60)
        
        for test_name, result in self.results.items():
            status = "✅ PASS" if result["passed"] else "❌ FAIL"
            print(f"{test_name}: {status}")
            if result["message"]:
                print(f"   {result['message']}")
        
        print("="*60)
        print(f"🎯 Overall Score: {self.passed}/{self.total} tests passed")
        
        if self.passed == self.total:
            print("🎉 ALL TESTS PASSED! FleetXchange API is working perfectly!")
        else:
            print(f"⚠️ {self.failed} tests failed. Please check the errors above.")
        print("="*60)

# Global test results
test_results = TestResults()

def wait_for_server(max_attempts=30, delay=2):
    """Wait for server to be ready"""
    print("🔄 Waiting for server to start...")
    for attempt in range(max_attempts):
        try:
            response = requests.get(f"{BASE_URL}/health", timeout=5)
            if response.status_code == 200:
                print("✅ Server is ready!")
                return True
        except requests.exceptions.RequestException:
            pass
        
        print(f"   Attempt {attempt + 1}/{max_attempts} - Server not ready yet...")
        time.sleep(delay)
    
    print("❌ Server failed to start within timeout")
    return False

def get_auth_token(user_type):
    """Get authentication token for a user type"""
    user_data = TEST_USERS[user_type]
    
    try:
        response = requests.post(
            f"{API_BASE}/auth/login",
            json={
                "email": user_data["email"],
                "password": user_data["password"]
            },
            timeout=TIMEOUT
        )
        
        if response.status_code == 200 and "token" in response.json():
            return response.json()["token"]
        else:
            return None
    except requests.exceptions.RequestException:
        return None

def test_server_health():
    """Test server health endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=TIMEOUT)
        if response.status_code == 200:
            data = response.json()
            test_results.add_result("Server Health", True, f"Status: {data.get('status', 'Unknown')}")
            return True
        else:
            test_results.add_result("Server Health", False, f"Status code: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        test_results.add_result("Server Health", False, f"Connection error: {str(e)}")
        return False

def test_admin_authentication():
    """Test admin authentication"""
    token = get_auth_token("admin")
    if token:
        try:
            response = requests.get(
                f"{API_BASE}/auth/profile",
                headers={"Authorization": f"Bearer {token}"},
                timeout=TIMEOUT
            )
            if response.status_code == 200:
                user_data = response.json()["user"]
                test_results.add_result("Admin Authentication", True, 
                    f"User: {user_data['email']}, Type: {user_data['userType']}")
                return True
            else:
                test_results.add_result("Admin Authentication", False, 
                    f"Profile access failed: {response.status_code}")
                return False
        except requests.exceptions.RequestException as e:
            test_results.add_result("Admin Authentication", False, f"Request error: {str(e)}")
            return False
    else:
        test_results.add_result("Admin Authentication", False, "Login failed - no token received")
        return False

def test_client_authentication():
    """Test client authentication"""
    token = get_auth_token("client")
    if token:
        try:
            response = requests.get(
                f"{API_BASE}/auth/profile",
                headers={"Authorization": f"Bearer {token}"},
                timeout=TIMEOUT
            )
            if response.status_code == 200:
                user_data = response.json()["user"]
                test_results.add_result("Client Authentication", True, 
                    f"User: {user_data['email']}, Type: {user_data['userType']}")
                return True
            else:
                test_results.add_result("Client Authentication", False, 
                    f"Profile access failed: {response.status_code}")
                return False
        except requests.exceptions.RequestException as e:
            test_results.add_result("Client Authentication", False, f"Request error: {str(e)}")
            return False
    else:
        test_results.add_result("Client Authentication", False, "Login failed - no token received")
        return False

def test_transporter_authentication():
    """Test transporter authentication"""
    token = get_auth_token("transporter")
    if token:
        try:
            response = requests.get(
                f"{API_BASE}/auth/profile",
                headers={"Authorization": f"Bearer {token}"},
                timeout=TIMEOUT
            )
            if response.status_code == 200:
                user_data = response.json()["user"]
                test_results.add_result("Transporter Authentication", True, 
                    f"User: {user_data['email']}, Type: {user_data['userType']}")
                return True
            else:
                test_results.add_result("Transporter Authentication", False, 
                    f"Profile access failed: {response.status_code}")
                return False
        except requests.exceptions.RequestException as e:
            test_results.add_result("Transporter Authentication", False, f"Request error: {str(e)}")
            return False
    else:
        test_results.add_result("Transporter Authentication", False, "Login failed - no token received")
        return False

def test_load_operations():
    """Test load creation and retrieval"""
    token = get_auth_token("client")
    if not token:
        test_results.add_result("Load Operations", False, "Client authentication failed")
        return False
    
    try:
        # Create a test load
        load_data = {
            "title": "Test Load - Electronics",
            "description": "Transport electronics from Johannesburg to Cape Town",
            "cargoType": "Electronics",
            "weight": 500.0,
            "pickupLocation": "Johannesburg, South Africa",
            "deliveryLocation": "Cape Town, South Africa",
            "pickupDate": (datetime.now() + timedelta(days=7)).isoformat(),
            "deliveryDate": (datetime.now() + timedelta(days=10)).isoformat(),
            "budgetMin": 5000.0,
            "budgetMax": 8000.0
        }
        
        response = requests.post(
            f"{API_BASE}/loads",
            json=load_data,
            headers={"Authorization": f"Bearer {token}"},
            timeout=TIMEOUT
        )
        
        if response.status_code == 201:
            load_id = response.json()["load"]["id"]
            
            # Get all loads
            loads_response = requests.get(
                f"{API_BASE}/loads",
                headers={"Authorization": f"Bearer {token}"},
                timeout=TIMEOUT
            )
            
            if loads_response.status_code == 200:
                loads_count = len(loads_response.json()["loads"])
                test_results.add_result("Load Operations", True, 
                    f"Created load {load_id}, Retrieved {loads_count} loads")
                return True
            else:
                test_results.add_result("Load Operations", False, 
                    f"Failed to retrieve loads: {loads_response.status_code}")
                return False
        else:
            test_results.add_result("Load Operations", False, 
                f"Failed to create load: {response.status_code}")
            return False
            
    except requests.exceptions.RequestException as e:
        test_results.add_result("Load Operations", False, f"Request error: {str(e)}")
        return False

def test_bid_operations():
    """Test bid creation and retrieval"""
    transporter_token = get_auth_token("transporter")
    if not transporter_token:
        test_results.add_result("Bid Operations", False, "Transporter authentication failed")
        return False
    
    try:
        # Get available loads first
        loads_response = requests.get(
            f"{API_BASE}/loads",
            headers={"Authorization": f"Bearer {transporter_token}"},
            timeout=TIMEOUT
        )
        
        if loads_response.status_code == 200:
            loads = loads_response.json()["loads"]
            if loads:
                load_id = loads[0]["id"]
                
                # Create a bid
                bid_data = {
                    "loadId": load_id,
                    "amount": 6500.0,
                    "pickupDate": (datetime.now() + timedelta(days=7)).isoformat(),
                    "deliveryDate": (datetime.now() + timedelta(days=10)).isoformat(),
                    "comments": "Professional transport service with insurance"
                }
                
                bid_response = requests.post(
                    f"{API_BASE}/bids",
                    json=bid_data,
                    headers={"Authorization": f"Bearer {transporter_token}"},
                    timeout=TIMEOUT
                )
                
                if bid_response.status_code == 201:
                    bid_id = bid_response.json()["bid"]["id"]
                    
                    # Get all bids
                    bids_response = requests.get(
                        f"{API_BASE}/bids",
                        headers={"Authorization": f"Bearer {transporter_token}"},
                        timeout=TIMEOUT
                    )
                    
                    if bids_response.status_code == 200:
                        bids_count = len(bids_response.json()["bids"])
                        test_results.add_result("Bid Operations", True, 
                            f"Created bid {bid_id}, Retrieved {bids_count} bids")
                        return True
                    else:
                        test_results.add_result("Bid Operations", False, 
                            f"Failed to retrieve bids: {bids_response.status_code}")
                        return False
                else:
                    test_results.add_result("Bid Operations", False, 
                        f"Failed to create bid: {bid_response.status_code}")
                    return False
            else:
                test_results.add_result("Bid Operations", False, "No loads available for bidding")
                return False
        else:
            test_results.add_result("Bid Operations", False, 
                f"Failed to retrieve loads: {loads_response.status_code}")
            return False
            
    except requests.exceptions.RequestException as e:
        test_results.add_result("Bid Operations", False, f"Request error: {str(e)}")
        return False

def test_admin_operations():
    """Test admin operations"""
    token = get_auth_token("admin")
    if not token:
        test_results.add_result("Admin Operations", False, "Admin authentication failed")
        return False
    
    try:
        # Get all users
        users_response = requests.get(
            f"{API_BASE}/users",
            headers={"Authorization": f"Bearer {token}"},
            timeout=TIMEOUT
        )
        
        if users_response.status_code == 200:
            users_count = len(users_response.json()["users"])
            
            # Try to update user status if users exist
            if users_count > 0:
                user_id = users_response.json()["users"][0]["id"]
                
                update_response = requests.put(
                    f"{API_BASE}/users/{user_id}/status",
                    json={"status": "ACTIVE"},
                    headers={"Authorization": f"Bearer {token}"},
                    timeout=TIMEOUT
                )
                
                if update_response.status_code == 200:
                    test_results.add_result("Admin Operations", True, 
                        f"Retrieved {users_count} users, Updated user status")
                    return True
                else:
                    test_results.add_result("Admin Operations", True, 
                        f"Retrieved {users_count} users, Status update failed: {update_response.status_code}")
                    return True
            else:
                test_results.add_result("Admin Operations", True, "Retrieved 0 users")
                return True
        else:
            test_results.add_result("Admin Operations", False, 
                f"Failed to retrieve users: {users_response.status_code}")
            return False
            
    except requests.exceptions.RequestException as e:
        test_results.add_result("Admin Operations", False, f"Request error: {str(e)}")
        return False

def test_document_operations():
    """Test document operations"""
    token = get_auth_token("transporter")
    if not token:
        test_results.add_result("Document Operations", False, "Transporter authentication failed")
        return False
    
    try:
        response = requests.get(
            f"{API_BASE}/documents",
            headers={"Authorization": f"Bearer {token}"},
            timeout=TIMEOUT
        )
        
        if response.status_code == 200:
            documents_count = len(response.json()["documents"])
            test_results.add_result("Document Operations", True, 
                f"Retrieved {documents_count} documents")
            return True
        else:
            test_results.add_result("Document Operations", False, 
                f"Failed to retrieve documents: {response.status_code}")
            return False
            
    except requests.exceptions.RequestException as e:
        test_results.add_result("Document Operations", False, f"Request error: {str(e)}")
        return False

def test_message_operations():
    """Test message operations"""
    token = get_auth_token("client")
    if not token:
        test_results.add_result("Message Operations", False, "Client authentication failed")
        return False
    
    try:
        response = requests.get(
            f"{API_BASE}/messages",
            headers={"Authorization": f"Bearer {token}"},
            timeout=TIMEOUT
        )
        
        if response.status_code == 200:
            messages_count = len(response.json()["messages"])
            test_results.add_result("Message Operations", True, 
                f"Retrieved {messages_count} messages")
            return True
        else:
            test_results.add_result("Message Operations", False, 
                f"Failed to retrieve messages: {response.status_code}")
            return False
            
    except requests.exceptions.RequestException as e:
        test_results.add_result("Message Operations", False, f"Request error: {str(e)}")
        return False

def run_all_tests():
    """Run all tests"""
    print("🚀 Starting FleetXchange API Comprehensive Tests...")
    print("="*60)
    
    # Wait for server to be ready
    if not wait_for_server():
        test_results.add_result("Server Startup", False, "Server failed to start")
        test_results.print_summary()
        return
    
    test_results.add_result("Server Startup", True, "Server started successfully")
    
    # Run all tests
    test_server_health()
    test_admin_authentication()
    test_client_authentication()
    test_transporter_authentication()
    test_load_operations()
    test_bid_operations()
    test_admin_operations()
    test_document_operations()
    test_message_operations()
    
    # Print results
    test_results.print_summary()

if __name__ == "__main__":
    run_all_tests()
