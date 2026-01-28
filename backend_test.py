#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class ZoneBiteAPITester:
    def __init__(self, base_url="https://meal-subscribe-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.admin_user = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        
        # Test data storage
        self.test_zone_id = None
        self.test_restaurant_id = None
        self.test_menu_item_id = None
        self.test_delivery_boy_id = None
        self.test_order_id = None

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
            self.failed_tests.append(f"{name}: {details}")

    def make_request(self, method, endpoint, data=None, auth_required=True):
        """Make HTTP request with proper headers"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if auth_required and self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
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
        
        # Test admin registration
        admin_data = {
            "email": "admin@zonebite.com",
            "password": "admin123",
            "name": "Admin User",
            "phone": "+1234567890",
            "role": "admin"
        }
        
        response, error = self.make_request('POST', 'auth/register', admin_data, auth_required=False)
        if response and response.status_code in [200, 201]:
            data = response.json()
            self.token = data.get('access_token')
            self.admin_user = data.get('user')
            self.log_test("Admin registration", True)
        elif response and response.status_code == 400:
            # User might already exist, try login
            self.log_test("Admin registration (user exists)", True, "User already exists, will try login")
        else:
            self.log_test("Admin registration", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test admin login
        login_data = {
            "email": "admin@zonebite.com",
            "password": "admin123"
        }
        
        response, error = self.make_request('POST', 'auth/login', login_data, auth_required=False)
        if response and response.status_code == 200:
            data = response.json()
            self.token = data.get('access_token')
            self.admin_user = data.get('user')
            self.log_test("Admin login", True)
        else:
            self.log_test("Admin login", False, f"Status: {response.status_code if response else 'No response'}")
            return False
        
        # Test get current user
        response, error = self.make_request('GET', 'auth/me')
        if response and response.status_code == 200:
            self.log_test("Get current user (/api/auth/me)", True)
        else:
            self.log_test("Get current user (/api/auth/me)", False, f"Status: {response.status_code if response else 'No response'}")
        
        return self.token is not None

    def test_delivery_zones(self):
        """Test delivery zones CRUD operations"""
        print("\n🔍 Testing Delivery Zones...")
        
        # Test create zone
        zone_data = {
            "name": "Test Zone",
            "description": "Test delivery zone",
            "polygon": [[-74.0, 40.7], [-74.0, 40.8], [-73.9, 40.8], [-73.9, 40.7], [-74.0, 40.7]],
            "is_active": True,
            "delivery_fee": 5.99
        }
        
        response, error = self.make_request('POST', 'zones', zone_data)
        if response and response.status_code in [200, 201]:
            data = response.json()
            self.test_zone_id = data.get('id')
            self.log_test("Create delivery zone", True)
        else:
            self.log_test("Create delivery zone", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test get zones
        response, error = self.make_request('GET', 'zones', auth_required=False)
        if response and response.status_code == 200:
            self.log_test("Get delivery zones", True)
        else:
            self.log_test("Get delivery zones", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test update zone
        if self.test_zone_id:
            update_data = {
                "name": "Updated Test Zone",
                "description": "Updated description",
                "polygon": [[-74.0, 40.7], [-74.0, 40.8], [-73.9, 40.8], [-73.9, 40.7], [-74.0, 40.7]],
                "is_active": True,
                "delivery_fee": 7.99
            }
            response, error = self.make_request('PUT', f'zones/{self.test_zone_id}', update_data)
            if response and response.status_code == 200:
                self.log_test("Update delivery zone", True)
            else:
                self.log_test("Update delivery zone", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test check delivery location
        location_data = [-74.0, 40.75]
        response, error = self.make_request('POST', 'zones/check-delivery', location_data, auth_required=False)
        if response and response.status_code == 200:
            self.log_test("Check delivery location", True)
        else:
            self.log_test("Check delivery location", False, f"Status: {response.status_code if response else 'No response'}")

    def test_restaurants(self):
        """Test restaurants CRUD operations"""
        print("\n🔍 Testing Restaurants...")
        
        # Test create restaurant
        restaurant_data = {
            "name": "Test Restaurant",
            "description": "A test restaurant",
            "address": "123 Test Street, Test City",
            "phone": "+1234567890",
            "image_url": "https://example.com/image.jpg",
            "cuisine_type": "Italian",
            "is_active": True,
            "rating": 4.5,
            "location": [-74.0, 40.75]
        }
        
        response, error = self.make_request('POST', 'restaurants', restaurant_data)
        if response and response.status_code in [200, 201]:
            data = response.json()
            self.test_restaurant_id = data.get('id')
            self.log_test("Create restaurant", True)
        else:
            self.log_test("Create restaurant", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test get restaurants
        response, error = self.make_request('GET', 'restaurants', auth_required=False)
        if response and response.status_code == 200:
            self.log_test("Get restaurants", True)
        else:
            self.log_test("Get restaurants", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test get single restaurant
        if self.test_restaurant_id:
            response, error = self.make_request('GET', f'restaurants/{self.test_restaurant_id}', auth_required=False)
            if response and response.status_code == 200:
                self.log_test("Get single restaurant", True)
            else:
                self.log_test("Get single restaurant", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test update restaurant
        if self.test_restaurant_id:
            update_data = {
                "name": "Updated Test Restaurant",
                "description": "Updated description",
                "address": "456 Updated Street, Test City",
                "phone": "+1234567891",
                "image_url": "https://example.com/updated.jpg",
                "cuisine_type": "Mexican",
                "is_active": True,
                "rating": 4.8,
                "location": [-74.1, 40.76]
            }
            response, error = self.make_request('PUT', f'restaurants/{self.test_restaurant_id}', update_data)
            if response and response.status_code == 200:
                self.log_test("Update restaurant", True)
            else:
                self.log_test("Update restaurant", False, f"Status: {response.status_code if response else 'No response'}")

    def test_menu_items(self):
        """Test menu items CRUD operations"""
        print("\n🔍 Testing Menu Items...")
        
        if not self.test_restaurant_id:
            self.log_test("Menu items test", False, "No restaurant ID available")
            return
        
        # Test create menu item
        menu_item_data = {
            "restaurant_id": self.test_restaurant_id,
            "name": "Test Pizza",
            "description": "Delicious test pizza",
            "price": 15.99,
            "category": "Main Course",
            "image_url": "https://example.com/pizza.jpg",
            "is_available": True
        }
        
        response, error = self.make_request('POST', 'menu-items', menu_item_data)
        if response and response.status_code in [200, 201]:
            data = response.json()
            self.test_menu_item_id = data.get('id')
            self.log_test("Create menu item", True)
        else:
            self.log_test("Create menu item", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test get menu items
        response, error = self.make_request('GET', 'menu-items', auth_required=False)
        if response and response.status_code == 200:
            self.log_test("Get menu items", True)
        else:
            self.log_test("Get menu items", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test get menu items by restaurant
        response, error = self.make_request('GET', f'menu-items?restaurant_id={self.test_restaurant_id}', auth_required=False)
        if response and response.status_code == 200:
            self.log_test("Get menu items by restaurant", True)
        else:
            self.log_test("Get menu items by restaurant", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test update menu item
        if self.test_menu_item_id:
            update_data = {
                "restaurant_id": self.test_restaurant_id,
                "name": "Updated Test Pizza",
                "description": "Updated delicious pizza",
                "price": 17.99,
                "category": "Specials",
                "image_url": "https://example.com/updated-pizza.jpg",
                "is_available": False
            }
            response, error = self.make_request('PUT', f'menu-items/{self.test_menu_item_id}', update_data)
            if response and response.status_code == 200:
                self.log_test("Update menu item", True)
            else:
                self.log_test("Update menu item", False, f"Status: {response.status_code if response else 'No response'}")

    def test_delivery_boys(self):
        """Test delivery boys CRUD operations"""
        print("\n🔍 Testing Delivery Boys...")
        
        # Test create delivery boy
        delivery_boy_data = {
            "email": "testboy@zonebite.com",
            "name": "Test Delivery Boy",
            "phone": "+1234567892",
            "password": "testpass123",
            "vehicle_type": "Motorcycle",
            "vehicle_number": "TEST-123"
        }
        
        response, error = self.make_request('POST', 'delivery-boys', delivery_boy_data)
        if response and response.status_code in [200, 201]:
            data = response.json()
            self.test_delivery_boy_id = data.get('id')
            self.log_test("Create delivery boy", True)
        else:
            self.log_test("Create delivery boy", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test get delivery boys
        response, error = self.make_request('GET', 'delivery-boys', auth_required=False)
        if response and response.status_code == 200:
            self.log_test("Get delivery boys", True)
        else:
            self.log_test("Get delivery boys", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test update availability
        if self.test_delivery_boy_id:
            response, error = self.make_request('PUT', f'delivery-boys/{self.test_delivery_boy_id}/availability?is_available=false', {})
            if response and response.status_code == 200:
                self.log_test("Update delivery boy availability", True)
            else:
                self.log_test("Update delivery boy availability", False, f"Status: {response.status_code if response else 'No response'}")

    def test_orders(self):
        """Test orders operations"""
        print("\n🔍 Testing Orders...")
        
        # First create a customer for the order
        customer_data = {
            "email": "testcustomer@zonebite.com",
            "password": "testpass123",
            "name": "Test Customer",
            "phone": "+1234567893",
            "role": "customer"
        }
        
        response, error = self.make_request('POST', 'auth/register', customer_data, auth_required=False)
        customer_id = None
        if response and response.status_code in [200, 201]:
            data = response.json()
            customer_id = data.get('user', {}).get('id')
            self.log_test("Create test customer", True)
        else:
            self.log_test("Create test customer", False, f"Status: {response.status_code if response else 'No response'}")
        
        if not customer_id or not self.test_restaurant_id or not self.test_menu_item_id:
            self.log_test("Orders test", False, "Missing required IDs for order creation")
            return
        
        # Test create order
        order_data = {
            "customer_id": customer_id,
            "restaurant_id": self.test_restaurant_id,
            "items": [
                {
                    "menu_item_id": self.test_menu_item_id,
                    "name": "Test Pizza",
                    "quantity": 2,
                    "price": 15.99
                }
            ],
            "delivery_address": "789 Test Avenue, Test City",
            "delivery_location": [-74.0, 40.75],
            "notes": "Test order notes"
        }
        
        response, error = self.make_request('POST', 'orders', order_data, auth_required=False)
        if response and response.status_code in [200, 201]:
            data = response.json()
            self.test_order_id = data.get('id')
            self.log_test("Create order", True)
        else:
            self.log_test("Create order", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test get orders
        response, error = self.make_request('GET', 'orders')
        if response and response.status_code == 200:
            self.log_test("Get orders", True)
        else:
            self.log_test("Get orders", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test get single order
        if self.test_order_id:
            response, error = self.make_request('GET', f'orders/{self.test_order_id}', auth_required=False)
            if response and response.status_code == 200:
                self.log_test("Get single order", True)
            else:
                self.log_test("Get single order", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test update order status
        if self.test_order_id:
            status_data = {"status": "confirmed"}
            response, error = self.make_request('PUT', f'orders/{self.test_order_id}/status', status_data)
            if response and response.status_code == 200:
                self.log_test("Update order status", True)
            else:
                self.log_test("Update order status", False, f"Status: {response.status_code if response else 'No response'}")

    def test_customers(self):
        """Test customers endpoint"""
        print("\n🔍 Testing Customers...")
        
        response, error = self.make_request('GET', 'customers')
        if response and response.status_code == 200:
            self.log_test("Get customers", True)
        else:
            self.log_test("Get customers", False, f"Status: {response.status_code if response else 'No response'}")

    def test_dashboard(self):
        """Test dashboard endpoints"""
        print("\n🔍 Testing Dashboard...")
        
        # Test dashboard stats
        response, error = self.make_request('GET', 'dashboard/stats')
        if response and response.status_code == 200:
            self.log_test("Get dashboard stats", True)
        else:
            self.log_test("Get dashboard stats", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test recent orders
        response, error = self.make_request('GET', 'dashboard/recent-orders')
        if response and response.status_code == 200:
            self.log_test("Get recent orders", True)
        else:
            self.log_test("Get recent orders", False, f"Status: {response.status_code if response else 'No response'}")

    def cleanup_test_data(self):
        """Clean up test data"""
        print("\n🧹 Cleaning up test data...")
        
        # Delete test menu item
        if self.test_menu_item_id:
            response, error = self.make_request('DELETE', f'menu-items/{self.test_menu_item_id}')
            if response and response.status_code == 200:
                self.log_test("Delete test menu item", True)
            else:
                self.log_test("Delete test menu item", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Delete test restaurant
        if self.test_restaurant_id:
            response, error = self.make_request('DELETE', f'restaurants/{self.test_restaurant_id}')
            if response and response.status_code == 200:
                self.log_test("Delete test restaurant", True)
            else:
                self.log_test("Delete test restaurant", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Delete test delivery boy
        if self.test_delivery_boy_id:
            response, error = self.make_request('DELETE', f'delivery-boys/{self.test_delivery_boy_id}')
            if response and response.status_code == 200:
                self.log_test("Delete test delivery boy", True)
            else:
                self.log_test("Delete test delivery boy", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Delete test zone
        if self.test_zone_id:
            response, error = self.make_request('DELETE', f'zones/{self.test_zone_id}')
            if response and response.status_code == 200:
                self.log_test("Delete test zone", True)
            else:
                self.log_test("Delete test zone", False, f"Status: {response.status_code if response else 'No response'}")

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting ZoneBite API Tests...")
        print(f"Testing API at: {self.api_url}")
        
        # Test health endpoints first
        self.test_health_endpoints()
        
        # Test authentication
        if not self.test_auth_endpoints():
            print("❌ Authentication failed - stopping tests")
            return False
        
        # Test all CRUD operations
        self.test_delivery_zones()
        self.test_restaurants()
        self.test_menu_items()
        self.test_delivery_boys()
        self.test_orders()
        self.test_customers()
        self.test_dashboard()
        
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
        
        return self.tests_passed == self.tests_run

def main():
    tester = ZoneBiteAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())