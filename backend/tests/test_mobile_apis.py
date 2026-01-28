"""
Backend API Tests for EATWEL Mobile App APIs
Tests Customer App, Delivery Boy App, and Zone APIs
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from review request
ADMIN_CREDENTIALS = {"login_id": "admin", "password": "admin123"}
DELIVERY_BOY_CREDENTIALS = {"login_id": "driver1", "password": "driver123"}
CUSTOMER_CREDENTIALS = {"customer_id": "CUS0002", "password": "test123"}
TEST_ZONE_POLYGON = [[77.58, 12.97], [77.62, 12.97], [77.62, 12.93], [77.58, 12.93]]
INSIDE_ZONE_LOCATION = [77.60, 12.95]
OUTSIDE_ZONE_LOCATION = [77.50, 12.90]


class TestHealthCheck:
    """Health check tests - run first"""
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ API root: {data['message']}")
    
    def test_health_endpoint(self):
        """Test health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✓ Health check passed")


class TestAdminAuth:
    """Admin authentication tests"""
    
    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=ADMIN_CREDENTIALS
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["role"] == "admin"
        print(f"✓ Admin login successful: {data['user']['login_id']}")
        return data["access_token"]
    
    def test_admin_login_invalid_credentials(self):
        """Test admin login with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"login_id": "wrong", "password": "wrong"}
        )
        assert response.status_code == 401
        print("✓ Admin login correctly rejects invalid credentials")


class TestDeliveryBoyAuth:
    """Delivery Boy authentication tests"""
    
    def test_delivery_boy_login_success(self):
        """Test delivery boy login with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/delivery-boy/login",
            json=DELIVERY_BOY_CREDENTIALS
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "delivery_boy" in data
        assert data["delivery_boy"]["login_id"] == "driver1"
        print(f"✓ Delivery boy login successful: {data['delivery_boy']['name']}")
        return data["access_token"]
    
    def test_delivery_boy_login_invalid_credentials(self):
        """Test delivery boy login with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/delivery-boy/login",
            json={"login_id": "wrong", "password": "wrong"}
        )
        assert response.status_code == 401
        print("✓ Delivery boy login correctly rejects invalid credentials")


class TestCustomerAuth:
    """Customer authentication tests"""
    
    def test_customer_login_success(self):
        """Test customer login with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/customer/login",
            json=CUSTOMER_CREDENTIALS
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "customer" in data
        assert data["customer"]["customer_id"] == "CUS0002"
        print(f"✓ Customer login successful: {data['customer']['name']}")
        return data["access_token"]
    
    def test_customer_login_invalid_credentials(self):
        """Test customer login with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/customer/login",
            json={"customer_id": "WRONG", "password": "wrong"}
        )
        assert response.status_code == 401
        print("✓ Customer login correctly rejects invalid credentials")


class TestCustomerRegistration:
    """Customer registration tests"""
    
    def test_customer_registration_success(self):
        """Test customer self-registration"""
        import uuid
        unique_mobile = f"99{uuid.uuid4().hex[:8]}"
        
        response = requests.post(
            f"{BASE_URL}/api/customer/register",
            json={
                "name": "TEST_New Customer",
                "mobile": unique_mobile,
                "password": "testpass123"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "customer" in data
        assert data["customer"]["name"] == "TEST_New Customer"
        assert data["customer"]["customer_id"].startswith("CUS")
        print(f"✓ Customer registration successful: {data['customer']['customer_id']}")
        return data
    
    def test_customer_registration_duplicate_mobile(self):
        """Test registration with duplicate mobile number"""
        # First, get an existing customer's mobile
        admin_token = get_admin_token()
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        customers_response = requests.get(f"{BASE_URL}/api/customers", headers=headers)
        if customers_response.status_code == 200 and customers_response.json():
            existing_mobile = customers_response.json()[0]["mobile"]
            
            response = requests.post(
                f"{BASE_URL}/api/customer/register",
                json={
                    "name": "Duplicate Test",
                    "mobile": existing_mobile,
                    "password": "testpass123"
                }
            )
            assert response.status_code == 400
            print("✓ Registration correctly rejects duplicate mobile")
        else:
            pytest.skip("No existing customers to test duplicate mobile")


class TestZoneCheckAPI:
    """Zone check (geo-fencing) API tests"""
    
    def test_check_zone_inside(self):
        """Test zone check for location inside delivery zone"""
        response = requests.post(
            f"{BASE_URL}/api/customer/check-zone",
            params={"location": INSIDE_ZONE_LOCATION}
        )
        assert response.status_code == 200
        data = response.json()
        assert "available" in data
        # Location may or may not be in a zone depending on setup
        print(f"✓ Zone check (inside): available={data['available']}, message={data['message']}")
    
    def test_check_zone_outside(self):
        """Test zone check for location outside delivery zone"""
        response = requests.post(
            f"{BASE_URL}/api/customer/check-zone",
            params={"location": OUTSIDE_ZONE_LOCATION}
        )
        assert response.status_code == 200
        data = response.json()
        assert "available" in data
        assert "message" in data
        print(f"✓ Zone check (outside): available={data['available']}, message={data['message']}")


class TestCustomerLocationUpdate:
    """Customer location update API tests"""
    
    def test_update_location_authenticated(self):
        """Test location update with authenticated customer"""
        # Login as customer first
        login_response = requests.post(
            f"{BASE_URL}/api/customer/login",
            json=CUSTOMER_CREDENTIALS
        )
        
        if login_response.status_code != 200:
            pytest.skip("Customer login failed - cannot test location update")
        
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.put(
            f"{BASE_URL}/api/customer/location",
            json={
                "location": INSIDE_ZONE_LOCATION,
                "address": "Test Address, Downtown"
            },
            headers=headers
        )
        
        # May return 200 (success) or 400 (outside zone)
        assert response.status_code in [200, 400]
        data = response.json()
        
        if response.status_code == 200:
            assert "location" in data
            print(f"✓ Location update successful: zone={data.get('zone_name')}")
        else:
            print(f"✓ Location update rejected (outside zone): {data.get('detail')}")
    
    def test_update_location_unauthenticated(self):
        """Test location update without authentication"""
        response = requests.put(
            f"{BASE_URL}/api/customer/location",
            json={
                "location": INSIDE_ZONE_LOCATION,
                "address": "Test Address"
            }
        )
        assert response.status_code in [401, 403]
        print("✓ Location update correctly requires authentication")


class TestGetAllZones:
    """Get all zones API tests"""
    
    def test_get_all_zones(self):
        """Test getting all delivery zones"""
        response = requests.get(f"{BASE_URL}/api/customer/zones")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        if data:
            zone = data[0]
            assert "id" in zone
            assert "name" in zone
            assert "polygon" in zone
            print(f"✓ Get zones successful: {len(data)} zones found")
            for z in data:
                print(f"  - {z['name']}: {len(z.get('polygon', []))} polygon points")
        else:
            print("✓ Get zones successful: No zones configured yet")


class TestDeliveryBoyOrders:
    """Delivery Boy orders API tests"""
    
    def test_get_delivery_boy_orders(self):
        """Test getting orders for delivery boy"""
        # Login as delivery boy
        login_response = requests.post(
            f"{BASE_URL}/api/delivery-boy/login",
            json=DELIVERY_BOY_CREDENTIALS
        )
        
        if login_response.status_code != 200:
            pytest.skip("Delivery boy login failed")
        
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/delivery-boy/orders",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        if data:
            order = data[0]
            assert "id" in order
            assert "customer_name" in order
            assert "status" in order
            assert "meal_type" in order
            print(f"✓ Get delivery boy orders: {len(data)} orders found")
        else:
            print("✓ Get delivery boy orders: No orders assigned")
    
    def test_get_delivery_boy_orders_filtered(self):
        """Test getting orders with meal_type filter"""
        login_response = requests.post(
            f"{BASE_URL}/api/delivery-boy/login",
            json=DELIVERY_BOY_CREDENTIALS
        )
        
        if login_response.status_code != 200:
            pytest.skip("Delivery boy login failed")
        
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        for meal_type in ["breakfast", "lunch", "dinner"]:
            response = requests.get(
                f"{BASE_URL}/api/delivery-boy/orders",
                params={"meal_type": meal_type},
                headers=headers
            )
            assert response.status_code == 200
            print(f"✓ Get orders filtered by {meal_type}: {len(response.json())} orders")


class TestDeliveryBoyRouteData:
    """Delivery Boy route data API tests"""
    
    def test_get_route_data(self):
        """Test getting route data for an order"""
        # Login as delivery boy
        login_response = requests.post(
            f"{BASE_URL}/api/delivery-boy/login",
            json=DELIVERY_BOY_CREDENTIALS
        )
        
        if login_response.status_code != 200:
            pytest.skip("Delivery boy login failed")
        
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get orders first
        orders_response = requests.get(
            f"{BASE_URL}/api/delivery-boy/orders",
            headers=headers
        )
        
        if orders_response.status_code != 200 or not orders_response.json():
            pytest.skip("No orders available to test route data")
        
        order_id = orders_response.json()[0]["id"]
        current_location = [77.58, 12.97]  # Delivery boy's current location
        
        response = requests.get(
            f"{BASE_URL}/api/delivery-boy/orders/{order_id}/route",
            params={"current_location": current_location},
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "order_id" in data
        assert "customer_location" in data
        assert "distance_km" in data
        assert "eta_minutes" in data
        print(f"✓ Route data: distance={data['distance_km']}km, ETA={data['eta_minutes']}min")


class TestDeliveryBoyNextOrder:
    """Delivery Boy next order API tests"""
    
    def test_get_next_nearest_order(self):
        """Test getting next nearest order"""
        # Login as delivery boy
        login_response = requests.post(
            f"{BASE_URL}/api/delivery-boy/login",
            json=DELIVERY_BOY_CREDENTIALS
        )
        
        if login_response.status_code != 200:
            pytest.skip("Delivery boy login failed")
        
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        current_location = [77.58, 12.97]
        
        response = requests.get(
            f"{BASE_URL}/api/delivery-boy/next-order",
            params={"current_location": current_location},
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        if data.get("order"):
            assert "id" in data["order"]
            assert "distance_km" in data
            print(f"✓ Next order: {data['order']['customer_name']}, distance={data['distance_km']}km")
        else:
            print(f"✓ Next order: {data.get('message', 'No pending orders')}")


class TestOrderStatusUpdate:
    """Order status update API tests"""
    
    def test_update_order_status_out_for_delivery(self):
        """Test updating order status to out_for_delivery"""
        # Login as delivery boy
        login_response = requests.post(
            f"{BASE_URL}/api/delivery-boy/login",
            json=DELIVERY_BOY_CREDENTIALS
        )
        
        if login_response.status_code != 200:
            pytest.skip("Delivery boy login failed")
        
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get pending orders
        orders_response = requests.get(
            f"{BASE_URL}/api/delivery-boy/orders",
            params={"status": "pending"},
            headers=headers
        )
        
        if orders_response.status_code != 200:
            pytest.skip("Failed to get orders")
        
        orders = orders_response.json()
        pending_orders = [o for o in orders if o["status"] in ["pending", "packed"]]
        
        if not pending_orders:
            pytest.skip("No pending orders to update")
        
        order_id = pending_orders[0]["id"]
        
        response = requests.put(
            f"{BASE_URL}/api/delivery-boy/orders/{order_id}/status",
            params={"status": "out_for_delivery"},
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "out_for_delivery"
        print(f"✓ Order {order_id} marked as out_for_delivery")
    
    def test_update_order_status_delivered(self):
        """Test updating order status to delivered"""
        # Login as delivery boy
        login_response = requests.post(
            f"{BASE_URL}/api/delivery-boy/login",
            json=DELIVERY_BOY_CREDENTIALS
        )
        
        if login_response.status_code != 200:
            pytest.skip("Delivery boy login failed")
        
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get out_for_delivery orders
        orders_response = requests.get(
            f"{BASE_URL}/api/delivery-boy/orders",
            params={"status": "out_for_delivery"},
            headers=headers
        )
        
        if orders_response.status_code != 200:
            pytest.skip("Failed to get orders")
        
        orders = orders_response.json()
        ofd_orders = [o for o in orders if o["status"] == "out_for_delivery"]
        
        if not ofd_orders:
            pytest.skip("No out_for_delivery orders to mark as delivered")
        
        order_id = ofd_orders[0]["id"]
        
        response = requests.put(
            f"{BASE_URL}/api/delivery-boy/orders/{order_id}/status",
            params={"status": "delivered"},
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "delivered"
        print(f"✓ Order {order_id} marked as delivered")


class TestDeliveryBoyOrderSummary:
    """Delivery Boy order summary API tests"""
    
    def test_get_order_summary(self):
        """Test getting order summary for delivery boy"""
        # Login as delivery boy
        login_response = requests.post(
            f"{BASE_URL}/api/delivery-boy/login",
            json=DELIVERY_BOY_CREDENTIALS
        )
        
        if login_response.status_code != 200:
            pytest.skip("Delivery boy login failed")
        
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/delivery-boy/orders/summary",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "breakfast" in data
        assert "lunch" in data
        assert "dinner" in data
        
        for meal in ["breakfast", "lunch", "dinner"]:
            assert "total" in data[meal]
            assert "pending" in data[meal]
            assert "delivered" in data[meal]
        
        print(f"✓ Order summary: breakfast={data['breakfast']['total']}, lunch={data['lunch']['total']}, dinner={data['dinner']['total']}")


# Helper function to get admin token
def get_admin_token():
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json=ADMIN_CREDENTIALS
    )
    if response.status_code == 200:
        return response.json()["access_token"]
    return None


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
