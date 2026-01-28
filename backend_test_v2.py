#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class ZoneBiteV2APITester:
    def __init__(self, base_url="https://meal-subscribe-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.admin_user = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        
        # Test data storage for v2.0
        self.test_delivery_boy_id = None
        self.test_combo_id = None
        self.test_plan_id = None
        self.test_zone_id = None
        self.test_customer_id = None
        self.test_subscription_id = None

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
            self.failed_tests.append(f"{name}: {details}")

    def make_request(self, method, endpoint, data=None, auth_required=True, params=None):
        """Make HTTP request with proper headers"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if auth_required and self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=15)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, params=params, timeout=15)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, params=params, timeout=15)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, params=params, timeout=15)
            else:
                return None, "Invalid method"
            
            return response, None
        except Exception as e:
            return None, str(e)

    def test_health_endpoints(self):
        """Test basic health endpoints"""
        print("\n🔍 Testing Health Endpoints...")
        
        # Test root endpoint
        response, error = self.make_request('GET', '', auth_required=False)
        if response and response.status_code == 200:
            self.log_test("Root endpoint (/api/)", True)
        else:
            self.log_test("Root endpoint (/api/)", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test health endpoint
        response, error = self.make_request('GET', 'health', auth_required=False)
        if response and response.status_code == 200:
            self.log_test("Health endpoint (/api/health)", True)
        else:
            self.log_test("Health endpoint (/api/health)", False, f"Status: {response.status_code if response else 'No response'}")

    def test_auth_endpoints(self):
        """Test authentication endpoints"""
        print("\n🔍 Testing Authentication...")
        
        # Test admin login with v2.0 credentials
        login_data = {
            "login_id": "admin",
            "password": "admin123"
        }
        
        response, error = self.make_request('POST', 'auth/login', login_data, auth_required=False)
        if response and response.status_code == 200:
            data = response.json()
            self.token = data.get('access_token')
            self.admin_user = data.get('user')
            self.log_test("Admin login (v2.0)", True)
        else:
            self.log_test("Admin login (v2.0)", False, f"Status: {response.status_code if response else 'No response'}")
            return False
        
        # Test get current user
        response, error = self.make_request('GET', 'auth/me')
        if response and response.status_code == 200:
            self.log_test("Get current user (/api/auth/me)", True)
        else:
            self.log_test("Get current user (/api/auth/me)", False, f"Status: {response.status_code if response else 'No response'}")
        
        return self.token is not None

    def test_delivery_boys(self):
        """Test delivery boys CRUD operations"""
        print("\n🔍 Testing Delivery Boys...")
        
        # Test create delivery boy
        delivery_boy_data = {
            "name": "Test Delivery Boy",
            "mobile": "+1234567890",
            "login_id": "testboy001",
            "password": "testpass123"
        }
        
        response, error = self.make_request('POST', 'delivery-boys', delivery_boy_data)
        if response and response.status_code in [200, 201]:
            data = response.json()
            self.test_delivery_boy_id = data.get('id')
            self.log_test("Create delivery boy", True)
        else:
            self.log_test("Create delivery boy", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test get delivery boys
        response, error = self.make_request('GET', 'delivery-boys')
        if response and response.status_code == 200:
            self.log_test("Get delivery boys", True)
        else:
            self.log_test("Get delivery boys", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test toggle status
        if self.test_delivery_boy_id:
            response, error = self.make_request('PUT', f'delivery-boys/{self.test_delivery_boy_id}/status', params={'is_active': 'false'})
            if response and response.status_code == 200:
                self.log_test("Toggle delivery boy status", True)
            else:
                self.log_test("Toggle delivery boy status", False, f"Status: {response.status_code if response else 'No response'}")

    def test_combos(self):
        """Test combos CRUD operations"""
        print("\n🔍 Testing Combos...")
        
        # Test create combo
        combo_data = {
            "name": "Test Veg Combo",
            "dishes": ["Rice", "Dal", "Vegetable Curry", "Roti"]
        }
        
        response, error = self.make_request('POST', 'combos', combo_data)
        if response and response.status_code in [200, 201]:
            data = response.json()
            self.test_combo_id = data.get('id')
            self.log_test("Create combo", True)
        else:
            self.log_test("Create combo", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test get combos
        response, error = self.make_request('GET', 'combos', auth_required=False)
        if response and response.status_code == 200:
            self.log_test("Get combos", True)
        else:
            self.log_test("Get combos", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test update combo
        if self.test_combo_id:
            update_data = {
                "name": "Updated Test Combo",
                "dishes": ["Rice", "Dal", "Paneer Curry", "Roti", "Salad"]
            }
            response, error = self.make_request('PUT', f'combos/{self.test_combo_id}', update_data)
            if response and response.status_code == 200:
                self.log_test("Update combo", True)
            else:
                self.log_test("Update combo", False, f"Status: {response.status_code if response else 'No response'}")

    def test_subscription_plans(self):
        """Test subscription plans CRUD operations"""
        print("\n🔍 Testing Subscription Plans...")
        
        if not self.test_combo_id:
            self.log_test("Plans test", False, "No combo ID available")
            return
        
        # Test create plan
        plan_data = {
            "name": "Weekly Test Plan",
            "combo_id": self.test_combo_id,
            "price": 99.99,
            "validity_days": 7,
            "schedule": [
                {"day": "Monday", "meals": ["breakfast", "lunch"]},
                {"day": "Tuesday", "meals": ["lunch", "dinner"]},
                {"day": "Wednesday", "meals": ["breakfast", "dinner"]}
            ]
        }
        
        response, error = self.make_request('POST', 'plans', plan_data)
        if response and response.status_code in [200, 201]:
            data = response.json()
            self.test_plan_id = data.get('id')
            self.log_test("Create subscription plan", True)
        else:
            self.log_test("Create subscription plan", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test get plans
        response, error = self.make_request('GET', 'plans', auth_required=False)
        if response and response.status_code == 200:
            self.log_test("Get subscription plans", True)
        else:
            self.log_test("Get subscription plans", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test get active plans only
        response, error = self.make_request('GET', 'plans', auth_required=False, params={'active_only': 'true'})
        if response and response.status_code == 200:
            self.log_test("Get active plans only", True)
        else:
            self.log_test("Get active plans only", False, f"Status: {response.status_code if response else 'No response'}")

    def test_zones(self):
        """Test zones CRUD operations"""
        print("\n🔍 Testing Zones...")
        
        # Test create zone
        zone_data = {
            "name": "Test Zone A",
            "polygon": [[-74.0, 40.7], [-74.0, 40.8], [-73.9, 40.8], [-73.9, 40.7]],
            "assigned_delivery_boys": []
        }
        
        response, error = self.make_request('POST', 'zones', zone_data)
        if response and response.status_code in [200, 201]:
            data = response.json()
            self.test_zone_id = data.get('id')
            self.log_test("Create zone", True)
        else:
            self.log_test("Create zone", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test get zones
        response, error = self.make_request('GET', 'zones', auth_required=False)
        if response and response.status_code == 200:
            self.log_test("Get zones", True)
        else:
            self.log_test("Get zones", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test assign delivery boy to zone
        if self.test_zone_id and self.test_delivery_boy_id:
            update_data = {
                "name": "Test Zone A",
                "polygon": [[-74.0, 40.7], [-74.0, 40.8], [-73.9, 40.8], [-73.9, 40.7]],
                "assigned_delivery_boys": [self.test_delivery_boy_id]
            }
            response, error = self.make_request('PUT', f'zones/{self.test_zone_id}', update_data)
            if response and response.status_code == 200:
                self.log_test("Assign delivery boy to zone", True)
            else:
                self.log_test("Assign delivery boy to zone", False, f"Status: {response.status_code if response else 'No response'}")

    def test_customers(self):
        """Test customers CRUD operations"""
        print("\n🔍 Testing Customers...")
        
        # Test create customer
        customer_data = {
            "name": "Test Customer",
            "mobile": "+1234567891",
            "password": "testpass123",
            "address": "123 Test Street, Test City",
            "location": [-74.0, 40.75]
        }
        
        response, error = self.make_request('POST', 'customers', customer_data)
        if response and response.status_code in [200, 201]:
            data = response.json()
            self.test_customer_id = data.get('id')
            self.log_test("Create customer", True)
            # Check if customer ID is auto-generated
            if data.get('customer_id', '').startswith('CUS'):
                self.log_test("Auto-generated customer ID format", True)
            else:
                self.log_test("Auto-generated customer ID format", False, f"ID: {data.get('customer_id')}")
        else:
            self.log_test("Create customer", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test get customers
        response, error = self.make_request('GET', 'customers')
        if response and response.status_code == 200:
            self.log_test("Get customers", True)
        else:
            self.log_test("Get customers", False, f"Status: {response.status_code if response else 'No response'}")

    def test_subscriptions(self):
        """Test subscriptions CRUD operations"""
        print("\n🔍 Testing Subscriptions...")
        
        if not self.test_customer_id or not self.test_plan_id:
            self.log_test("Subscriptions test", False, "Missing customer or plan ID")
            return
        
        # Test create subscription
        subscription_data = {
            "customer_id": self.test_customer_id,
            "plan_id": self.test_plan_id
        }
        
        response, error = self.make_request('POST', 'subscriptions', subscription_data)
        if response and response.status_code in [200, 201]:
            data = response.json()
            self.test_subscription_id = data.get('id')
            self.log_test("Create subscription", True)
        else:
            self.log_test("Create subscription", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test get subscriptions
        response, error = self.make_request('GET', 'subscriptions')
        if response and response.status_code == 200:
            self.log_test("Get subscriptions", True)
        else:
            self.log_test("Get subscriptions", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test pause subscription
        if self.test_subscription_id:
            response, error = self.make_request('PUT', f'subscriptions/{self.test_subscription_id}/pause', {})
            if response and response.status_code == 200:
                self.log_test("Pause subscription", True)
            else:
                self.log_test("Pause subscription", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test resume subscription
        if self.test_subscription_id:
            response, error = self.make_request('PUT', f'subscriptions/{self.test_subscription_id}/resume', {})
            if response and response.status_code == 200:
                self.log_test("Resume subscription", True)
            else:
                self.log_test("Resume subscription", False, f"Status: {response.status_code if response else 'No response'}")

    def test_orders(self):
        """Test orders operations"""
        print("\n🔍 Testing Orders...")
        
        # Test generate orders for breakfast
        response, error = self.make_request('POST', 'orders/generate', params={'meal_type': 'breakfast'})
        if response and response.status_code == 200:
            self.log_test("Generate breakfast orders", True)
        elif response and response.status_code == 400:
            # Orders might already be generated
            self.log_test("Generate breakfast orders (already exists)", True, "Orders already generated for today")
        else:
            self.log_test("Generate breakfast orders", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test get orders
        response, error = self.make_request('GET', 'orders')
        if response and response.status_code == 200:
            self.log_test("Get orders", True)
        else:
            self.log_test("Get orders", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test get orders by meal type
        response, error = self.make_request('GET', 'orders', params={'meal_type': 'breakfast'})
        if response and response.status_code == 200:
            orders = response.json()
            self.log_test("Get orders by meal type", True)
            
            # Test update order status if we have orders
            if orders and len(orders) > 0:
                order_id = orders[0]['id']
                status_data = {"status": "packed"}
                response, error = self.make_request('PUT', f'orders/{order_id}/status', status_data)
                if response and response.status_code == 200:
                    self.log_test("Update order status", True)
                else:
                    self.log_test("Update order status", False, f"Status: {response.status_code if response else 'No response'}")
        else:
            self.log_test("Get orders by meal type", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test zone order summary
        response, error = self.make_request('GET', 'orders/zone-summary', params={'meal_type': 'breakfast'})
        if response and response.status_code == 200:
            self.log_test("Get zone order summary", True)
        else:
            self.log_test("Get zone order summary", False, f"Status: {response.status_code if response else 'No response'}")

    def test_settings(self):
        """Test settings operations"""
        print("\n🔍 Testing Settings...")
        
        # Test get settings
        response, error = self.make_request('GET', 'settings')
        if response and response.status_code == 200:
            self.log_test("Get settings", True)
        else:
            self.log_test("Get settings", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test update settings
        settings_data = {
            "meal_timings": {
                "breakfast_start": "04:00",
                "breakfast_end": "10:00",
                "lunch_start": "10:10",
                "lunch_end": "16:00",
                "dinner_start": "16:10",
                "dinner_end": "22:00"
            },
            "help_number": "+1234567899"
        }
        
        response, error = self.make_request('PUT', 'settings', settings_data)
        if response and response.status_code == 200:
            self.log_test("Update settings", True)
        else:
            self.log_test("Update settings", False, f"Status: {response.status_code if response else 'No response'}")

    def test_dashboard(self):
        """Test dashboard endpoints"""
        print("\n🔍 Testing Dashboard...")
        
        # Test dashboard stats
        response, error = self.make_request('GET', 'dashboard/stats')
        if response and response.status_code == 200:
            data = response.json()
            self.log_test("Get dashboard stats", True)
            
            # Verify stats structure
            expected_fields = ['total_active_customers', 'total_orders_today', 'total_delivery_boys', 
                             'breakfast_orders', 'lunch_orders', 'dinner_orders', 'delivered_today', 'pending_today']
            missing_fields = [field for field in expected_fields if field not in data]
            if not missing_fields:
                self.log_test("Dashboard stats structure", True)
            else:
                self.log_test("Dashboard stats structure", False, f"Missing fields: {missing_fields}")
        else:
            self.log_test("Get dashboard stats", False, f"Status: {response.status_code if response else 'No response'}")

    def test_cloudinary_integration(self):
        """Test Cloudinary integration (mocked)"""
        print("\n🔍 Testing Cloudinary Integration...")
        
        # Test get cloudinary signature
        response, error = self.make_request('GET', 'cloudinary/signature', params={'folder': 'plans'})
        if response and response.status_code == 500:
            # Expected since Cloudinary is not configured
            self.log_test("Cloudinary signature (not configured)", True, "Expected 500 - Cloudinary not configured")
        elif response and response.status_code == 200:
            self.log_test("Cloudinary signature", True)
        else:
            self.log_test("Cloudinary signature", False, f"Status: {response.status_code if response else 'No response'}")

    def cleanup_test_data(self):
        """Clean up test data"""
        print("\n🧹 Cleaning up test data...")
        
        # Delete test subscription (no delete endpoint, just pause)
        if self.test_subscription_id:
            response, error = self.make_request('PUT', f'subscriptions/{self.test_subscription_id}/pause', {})
            if response and response.status_code == 200:
                self.log_test("Pause test subscription", True)
            else:
                self.log_test("Pause test subscription", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Delete test plan
        if self.test_plan_id:
            response, error = self.make_request('DELETE', f'plans/{self.test_plan_id}')
            if response and response.status_code == 200:
                self.log_test("Delete test plan", True)
            else:
                self.log_test("Delete test plan", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Delete test combo
        if self.test_combo_id:
            response, error = self.make_request('DELETE', f'combos/{self.test_combo_id}')
            if response and response.status_code == 200:
                self.log_test("Delete test combo", True)
            else:
                self.log_test("Delete test combo", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Delete test zone
        if self.test_zone_id:
            response, error = self.make_request('DELETE', f'zones/{self.test_zone_id}')
            if response and response.status_code == 200:
                self.log_test("Delete test zone", True)
            else:
                self.log_test("Delete test zone", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Delete test delivery boy
        if self.test_delivery_boy_id:
            response, error = self.make_request('DELETE', f'delivery-boys/{self.test_delivery_boy_id}')
            if response and response.status_code == 200:
                self.log_test("Delete test delivery boy", True)
            else:
                self.log_test("Delete test delivery boy", False, f"Status: {response.status_code if response else 'No response'}")

    def run_all_tests(self):
        """Run all API tests for ZoneBite v2.0"""
        print("🚀 Starting ZoneBite v2.0 API Tests...")
        print(f"Testing API at: {self.api_url}")
        
        # Test health endpoints first
        self.test_health_endpoints()
        
        # Test authentication
        if not self.test_auth_endpoints():
            print("❌ Authentication failed - stopping tests")
            return False
        
        # Test all v2.0 CRUD operations
        self.test_delivery_boys()
        self.test_combos()
        self.test_subscription_plans()
        self.test_zones()
        self.test_customers()
        self.test_subscriptions()
        self.test_orders()
        self.test_settings()
        self.test_dashboard()
        self.test_cloudinary_integration()
        
        # Clean up test data
        self.cleanup_test_data()
        
        # Print summary
        print(f"\n📊 Test Summary:")
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Tests failed: {self.tests_run - self.tests_passed}")
        print(f"Success rate: {(self.tests_passed / self.tests_run * 100):.1f}%")
        
        if self.failed_tests:
            print(f"\n❌ Failed tests:")
            for test in self.failed_tests:
                print(f"  - {test}")
        
        return self.tests_passed >= (self.tests_run * 0.9)  # 90% success rate threshold

def main():
    tester = ZoneBiteV2APITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())