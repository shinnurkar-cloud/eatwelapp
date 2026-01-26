from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
from bson import ObjectId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'food-delivery-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Security
security = HTTPBearer()

# Create the main app
app = FastAPI(title="ZoneBite - Food Delivery Admin API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ===================== MODELS =====================

class UserBase(BaseModel):
    email: EmailStr
    name: str
    phone: Optional[str] = None
    role: str = "customer"  # admin, delivery_boy, customer

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: str
    created_at: str
    is_active: bool = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class DeliveryZoneCreate(BaseModel):
    name: str
    description: Optional[str] = None
    polygon: List[List[float]]  # [[lng, lat], [lng, lat], ...]
    is_active: bool = True
    delivery_fee: float = 0.0

class DeliveryZoneResponse(DeliveryZoneCreate):
    id: str
    created_at: str

class RestaurantCreate(BaseModel):
    name: str
    description: Optional[str] = None
    address: str
    phone: str
    image_url: Optional[str] = None
    cuisine_type: Optional[str] = None
    is_active: bool = True
    rating: float = 0.0
    location: Optional[List[float]] = None  # [lng, lat]

class RestaurantResponse(RestaurantCreate):
    id: str
    created_at: str

class MenuItemCreate(BaseModel):
    restaurant_id: str
    name: str
    description: Optional[str] = None
    price: float
    category: str
    image_url: Optional[str] = None
    is_available: bool = True

class MenuItemResponse(MenuItemCreate):
    id: str
    created_at: str

class OrderItemCreate(BaseModel):
    menu_item_id: str
    name: str
    quantity: int
    price: float

class OrderCreate(BaseModel):
    customer_id: str
    restaurant_id: str
    items: List[OrderItemCreate]
    delivery_address: str
    delivery_location: Optional[List[float]] = None  # [lng, lat]
    notes: Optional[str] = None

class OrderResponse(BaseModel):
    id: str
    customer_id: str
    customer_name: Optional[str] = None
    restaurant_id: str
    restaurant_name: Optional[str] = None
    items: List[OrderItemCreate]
    total_amount: float
    delivery_fee: float
    delivery_address: str
    delivery_location: Optional[List[float]] = None
    status: str  # pending, confirmed, preparing, out_for_delivery, delivered, cancelled
    delivery_boy_id: Optional[str] = None
    delivery_boy_name: Optional[str] = None
    notes: Optional[str] = None
    created_at: str
    updated_at: str

class OrderStatusUpdate(BaseModel):
    status: str
    delivery_boy_id: Optional[str] = None

class DeliveryBoyCreate(BaseModel):
    email: EmailStr
    name: str
    phone: str
    password: str
    vehicle_type: Optional[str] = None
    vehicle_number: Optional[str] = None

class DeliveryBoyResponse(BaseModel):
    id: str
    email: str
    name: str
    phone: str
    vehicle_type: Optional[str] = None
    vehicle_number: Optional[str] = None
    is_active: bool = True
    is_available: bool = True
    current_location: Optional[List[float]] = None
    total_deliveries: int = 0
    created_at: str

class DashboardStats(BaseModel):
    total_orders: int
    pending_orders: int
    active_deliveries: int
    total_revenue: float
    total_restaurants: int
    total_delivery_boys: int
    total_customers: int
    total_zones: int

# ===================== HELPERS =====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def require_admin(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

def serialize_doc(doc: dict) -> dict:
    if doc and "_id" in doc:
        del doc["_id"]
    return doc

# ===================== AUTH ROUTES =====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user: UserCreate):
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": user.email,
        "name": user.name,
        "phone": user.phone,
        "role": user.role,
        "password_hash": hash_password(user.password),
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id, user.email, user.role)
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            email=user.email,
            name=user.name,
            phone=user.phone,
            role=user.role,
            created_at=user_doc["created_at"],
            is_active=True
        )
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_token(user["id"], user["email"], user["role"])
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            phone=user.get("phone"),
            role=user["role"],
            created_at=user["created_at"],
            is_active=user.get("is_active", True)
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        name=current_user["name"],
        phone=current_user.get("phone"),
        role=current_user["role"],
        created_at=current_user["created_at"],
        is_active=current_user.get("is_active", True)
    )

# ===================== DELIVERY ZONES ROUTES =====================

@api_router.post("/zones", response_model=DeliveryZoneResponse)
async def create_zone(zone: DeliveryZoneCreate, admin: dict = Depends(require_admin)):
    zone_id = str(uuid.uuid4())
    
    # Close polygon if not closed
    polygon = zone.polygon
    if polygon and polygon[0] != polygon[-1]:
        polygon.append(polygon[0])
    
    zone_doc = {
        "id": zone_id,
        "name": zone.name,
        "description": zone.description,
        "polygon": {
            "type": "Polygon",
            "coordinates": [polygon]
        },
        "is_active": zone.is_active,
        "delivery_fee": zone.delivery_fee,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.delivery_zones.insert_one(zone_doc)
    
    return DeliveryZoneResponse(
        id=zone_id,
        name=zone.name,
        description=zone.description,
        polygon=polygon,
        is_active=zone.is_active,
        delivery_fee=zone.delivery_fee,
        created_at=zone_doc["created_at"]
    )

@api_router.get("/zones", response_model=List[DeliveryZoneResponse])
async def get_zones(active_only: bool = False):
    query = {"is_active": True} if active_only else {}
    zones = await db.delivery_zones.find(query, {"_id": 0}).to_list(100)
    return [
        DeliveryZoneResponse(
            id=z["id"],
            name=z["name"],
            description=z.get("description"),
            polygon=z["polygon"]["coordinates"][0] if "polygon" in z else [],
            is_active=z.get("is_active", True),
            delivery_fee=z.get("delivery_fee", 0),
            created_at=z["created_at"]
        ) for z in zones
    ]

@api_router.put("/zones/{zone_id}", response_model=DeliveryZoneResponse)
async def update_zone(zone_id: str, zone: DeliveryZoneCreate, admin: dict = Depends(require_admin)):
    polygon = zone.polygon
    if polygon and polygon[0] != polygon[-1]:
        polygon.append(polygon[0])
    
    update_doc = {
        "name": zone.name,
        "description": zone.description,
        "polygon": {"type": "Polygon", "coordinates": [polygon]},
        "is_active": zone.is_active,
        "delivery_fee": zone.delivery_fee
    }
    
    result = await db.delivery_zones.find_one_and_update(
        {"id": zone_id},
        {"$set": update_doc},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Zone not found")
    
    return DeliveryZoneResponse(
        id=result["id"],
        name=result["name"],
        description=result.get("description"),
        polygon=result["polygon"]["coordinates"][0],
        is_active=result.get("is_active", True),
        delivery_fee=result.get("delivery_fee", 0),
        created_at=result["created_at"]
    )

@api_router.delete("/zones/{zone_id}")
async def delete_zone(zone_id: str, admin: dict = Depends(require_admin)):
    result = await db.delivery_zones.delete_one({"id": zone_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Zone not found")
    return {"message": "Zone deleted successfully"}

@api_router.post("/zones/check-delivery")
async def check_delivery_location(location: List[float]):
    """Check if a location [lng, lat] is within any delivery zone"""
    zones = await db.delivery_zones.find({
        "is_active": True,
        "polygon": {
            "$geoIntersects": {
                "$geometry": {
                    "type": "Point",
                    "coordinates": location
                }
            }
        }
    }, {"_id": 0}).to_list(100)
    
    return {
        "deliverable": len(zones) > 0,
        "zones": [
            DeliveryZoneResponse(
                id=z["id"],
                name=z["name"],
                description=z.get("description"),
                polygon=z["polygon"]["coordinates"][0],
                is_active=z.get("is_active", True),
                delivery_fee=z.get("delivery_fee", 0),
                created_at=z["created_at"]
            ) for z in zones
        ]
    }

# ===================== RESTAURANTS ROUTES =====================

@api_router.post("/restaurants", response_model=RestaurantResponse)
async def create_restaurant(restaurant: RestaurantCreate, admin: dict = Depends(require_admin)):
    restaurant_id = str(uuid.uuid4())
    restaurant_doc = {
        "id": restaurant_id,
        **restaurant.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    if restaurant.location:
        restaurant_doc["location"] = {"type": "Point", "coordinates": restaurant.location}
    
    await db.restaurants.insert_one(restaurant_doc)
    return RestaurantResponse(id=restaurant_id, **restaurant.model_dump(), created_at=restaurant_doc["created_at"])

@api_router.get("/restaurants", response_model=List[RestaurantResponse])
async def get_restaurants(active_only: bool = False):
    query = {"is_active": True} if active_only else {}
    restaurants = await db.restaurants.find(query, {"_id": 0}).to_list(100)
    return [
        RestaurantResponse(
            id=r["id"],
            name=r["name"],
            description=r.get("description"),
            address=r["address"],
            phone=r["phone"],
            image_url=r.get("image_url"),
            cuisine_type=r.get("cuisine_type"),
            is_active=r.get("is_active", True),
            rating=r.get("rating", 0),
            location=r.get("location", {}).get("coordinates") if isinstance(r.get("location"), dict) else r.get("location"),
            created_at=r["created_at"]
        ) for r in restaurants
    ]

@api_router.get("/restaurants/{restaurant_id}", response_model=RestaurantResponse)
async def get_restaurant(restaurant_id: str):
    restaurant = await db.restaurants.find_one({"id": restaurant_id}, {"_id": 0})
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    return RestaurantResponse(
        id=restaurant["id"],
        name=restaurant["name"],
        description=restaurant.get("description"),
        address=restaurant["address"],
        phone=restaurant["phone"],
        image_url=restaurant.get("image_url"),
        cuisine_type=restaurant.get("cuisine_type"),
        is_active=restaurant.get("is_active", True),
        rating=restaurant.get("rating", 0),
        location=restaurant.get("location", {}).get("coordinates") if isinstance(restaurant.get("location"), dict) else restaurant.get("location"),
        created_at=restaurant["created_at"]
    )

@api_router.put("/restaurants/{restaurant_id}", response_model=RestaurantResponse)
async def update_restaurant(restaurant_id: str, restaurant: RestaurantCreate, admin: dict = Depends(require_admin)):
    update_doc = restaurant.model_dump()
    if restaurant.location:
        update_doc["location"] = {"type": "Point", "coordinates": restaurant.location}
    
    result = await db.restaurants.find_one_and_update(
        {"id": restaurant_id},
        {"$set": update_doc},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    
    return RestaurantResponse(
        id=result["id"],
        name=result["name"],
        description=result.get("description"),
        address=result["address"],
        phone=result["phone"],
        image_url=result.get("image_url"),
        cuisine_type=result.get("cuisine_type"),
        is_active=result.get("is_active", True),
        rating=result.get("rating", 0),
        location=result.get("location", {}).get("coordinates") if isinstance(result.get("location"), dict) else result.get("location"),
        created_at=result["created_at"]
    )

@api_router.delete("/restaurants/{restaurant_id}")
async def delete_restaurant(restaurant_id: str, admin: dict = Depends(require_admin)):
    result = await db.restaurants.delete_one({"id": restaurant_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    return {"message": "Restaurant deleted successfully"}

# ===================== MENU ITEMS ROUTES =====================

@api_router.post("/menu-items", response_model=MenuItemResponse)
async def create_menu_item(item: MenuItemCreate, admin: dict = Depends(require_admin)):
    item_id = str(uuid.uuid4())
    item_doc = {
        "id": item_id,
        **item.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.menu_items.insert_one(item_doc)
    return MenuItemResponse(id=item_id, **item.model_dump(), created_at=item_doc["created_at"])

@api_router.get("/menu-items", response_model=List[MenuItemResponse])
async def get_menu_items(restaurant_id: Optional[str] = None, category: Optional[str] = None):
    query = {}
    if restaurant_id:
        query["restaurant_id"] = restaurant_id
    if category:
        query["category"] = category
    
    items = await db.menu_items.find(query, {"_id": 0}).to_list(500)
    return [MenuItemResponse(**item) for item in items]

@api_router.put("/menu-items/{item_id}", response_model=MenuItemResponse)
async def update_menu_item(item_id: str, item: MenuItemCreate, admin: dict = Depends(require_admin)):
    result = await db.menu_items.find_one_and_update(
        {"id": item_id},
        {"$set": item.model_dump()},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return MenuItemResponse(**serialize_doc(result))

@api_router.delete("/menu-items/{item_id}")
async def delete_menu_item(item_id: str, admin: dict = Depends(require_admin)):
    result = await db.menu_items.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return {"message": "Menu item deleted successfully"}

# ===================== ORDERS ROUTES =====================

@api_router.post("/orders", response_model=OrderResponse)
async def create_order(order: OrderCreate):
    order_id = str(uuid.uuid4())
    
    # Calculate total
    total_amount = sum(item.price * item.quantity for item in order.items)
    
    # Get delivery fee from zone if location provided
    delivery_fee = 0.0
    if order.delivery_location:
        zones = await db.delivery_zones.find({
            "is_active": True,
            "polygon": {
                "$geoIntersects": {
                    "$geometry": {"type": "Point", "coordinates": order.delivery_location}
                }
            }
        }, {"_id": 0}).to_list(1)
        if zones:
            delivery_fee = zones[0].get("delivery_fee", 0)
    
    # Get customer and restaurant names
    customer = await db.users.find_one({"id": order.customer_id}, {"_id": 0})
    restaurant = await db.restaurants.find_one({"id": order.restaurant_id}, {"_id": 0})
    
    now = datetime.now(timezone.utc).isoformat()
    order_doc = {
        "id": order_id,
        "customer_id": order.customer_id,
        "customer_name": customer["name"] if customer else None,
        "restaurant_id": order.restaurant_id,
        "restaurant_name": restaurant["name"] if restaurant else None,
        "items": [item.model_dump() for item in order.items],
        "total_amount": total_amount,
        "delivery_fee": delivery_fee,
        "delivery_address": order.delivery_address,
        "delivery_location": order.delivery_location,
        "status": "pending",
        "delivery_boy_id": None,
        "delivery_boy_name": None,
        "notes": order.notes,
        "created_at": now,
        "updated_at": now
    }
    
    await db.orders.insert_one(order_doc)
    return OrderResponse(**serialize_doc(order_doc))

@api_router.get("/orders", response_model=List[OrderResponse])
async def get_orders(status: Optional[str] = None, limit: int = 50):
    query = {}
    if status:
        query["status"] = status
    
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return [OrderResponse(**order) for order in orders]

@api_router.get("/orders/{order_id}", response_model=OrderResponse)
async def get_order(order_id: str):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return OrderResponse(**order)

@api_router.put("/orders/{order_id}/status", response_model=OrderResponse)
async def update_order_status(order_id: str, update: OrderStatusUpdate, admin: dict = Depends(require_admin)):
    update_doc = {
        "status": update.status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if update.delivery_boy_id:
        delivery_boy = await db.users.find_one({"id": update.delivery_boy_id, "role": "delivery_boy"}, {"_id": 0})
        if delivery_boy:
            update_doc["delivery_boy_id"] = update.delivery_boy_id
            update_doc["delivery_boy_name"] = delivery_boy["name"]
    
    result = await db.orders.find_one_and_update(
        {"id": order_id},
        {"$set": update_doc},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return OrderResponse(**serialize_doc(result))

# ===================== DELIVERY BOYS ROUTES =====================

@api_router.post("/delivery-boys", response_model=DeliveryBoyResponse)
async def create_delivery_boy(boy: DeliveryBoyCreate, admin: dict = Depends(require_admin)):
    existing = await db.users.find_one({"email": boy.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": boy.email,
        "name": boy.name,
        "phone": boy.phone,
        "role": "delivery_boy",
        "password_hash": hash_password(boy.password),
        "vehicle_type": boy.vehicle_type,
        "vehicle_number": boy.vehicle_number,
        "is_active": True,
        "is_available": True,
        "current_location": None,
        "total_deliveries": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    return DeliveryBoyResponse(
        id=user_id,
        email=boy.email,
        name=boy.name,
        phone=boy.phone,
        vehicle_type=boy.vehicle_type,
        vehicle_number=boy.vehicle_number,
        is_active=True,
        is_available=True,
        current_location=None,
        total_deliveries=0,
        created_at=user_doc["created_at"]
    )

@api_router.get("/delivery-boys", response_model=List[DeliveryBoyResponse])
async def get_delivery_boys(available_only: bool = False):
    query = {"role": "delivery_boy"}
    if available_only:
        query["is_available"] = True
    
    boys = await db.users.find(query, {"_id": 0, "password_hash": 0}).to_list(100)
    return [
        DeliveryBoyResponse(
            id=b["id"],
            email=b["email"],
            name=b["name"],
            phone=b["phone"],
            vehicle_type=b.get("vehicle_type"),
            vehicle_number=b.get("vehicle_number"),
            is_active=b.get("is_active", True),
            is_available=b.get("is_available", True),
            current_location=b.get("current_location"),
            total_deliveries=b.get("total_deliveries", 0),
            created_at=b["created_at"]
        ) for b in boys
    ]

@api_router.put("/delivery-boys/{boy_id}/availability")
async def update_delivery_boy_availability(boy_id: str, is_available: bool, admin: dict = Depends(require_admin)):
    result = await db.users.find_one_and_update(
        {"id": boy_id, "role": "delivery_boy"},
        {"$set": {"is_available": is_available}},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Delivery boy not found")
    return {"message": "Availability updated"}

@api_router.delete("/delivery-boys/{boy_id}")
async def delete_delivery_boy(boy_id: str, admin: dict = Depends(require_admin)):
    result = await db.users.delete_one({"id": boy_id, "role": "delivery_boy"})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Delivery boy not found")
    return {"message": "Delivery boy deleted successfully"}

# ===================== CUSTOMERS ROUTES =====================

@api_router.get("/customers", response_model=List[UserResponse])
async def get_customers(admin: dict = Depends(require_admin)):
    customers = await db.users.find({"role": "customer"}, {"_id": 0, "password_hash": 0}).to_list(100)
    return [
        UserResponse(
            id=c["id"],
            email=c["email"],
            name=c["name"],
            phone=c.get("phone"),
            role=c["role"],
            created_at=c["created_at"],
            is_active=c.get("is_active", True)
        ) for c in customers
    ]

# ===================== DASHBOARD ROUTES =====================

@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(admin: dict = Depends(require_admin)):
    total_orders = await db.orders.count_documents({})
    pending_orders = await db.orders.count_documents({"status": "pending"})
    active_deliveries = await db.orders.count_documents({"status": "out_for_delivery"})
    
    # Calculate total revenue
    revenue_pipeline = [
        {"$match": {"status": {"$in": ["delivered", "confirmed", "preparing", "out_for_delivery"]}}},
        {"$group": {"_id": None, "total": {"$sum": {"$add": ["$total_amount", "$delivery_fee"]}}}}
    ]
    revenue_result = await db.orders.aggregate(revenue_pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0
    
    total_restaurants = await db.restaurants.count_documents({})
    total_delivery_boys = await db.users.count_documents({"role": "delivery_boy"})
    total_customers = await db.users.count_documents({"role": "customer"})
    total_zones = await db.delivery_zones.count_documents({})
    
    return DashboardStats(
        total_orders=total_orders,
        pending_orders=pending_orders,
        active_deliveries=active_deliveries,
        total_revenue=total_revenue,
        total_restaurants=total_restaurants,
        total_delivery_boys=total_delivery_boys,
        total_customers=total_customers,
        total_zones=total_zones
    )

@api_router.get("/dashboard/recent-orders", response_model=List[OrderResponse])
async def get_recent_orders(admin: dict = Depends(require_admin)):
    orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(10)
    return [OrderResponse(**order) for order in orders]

# ===================== HEALTH CHECK =====================

@api_router.get("/")
async def root():
    return {"message": "ZoneBite API is running", "version": "1.0.0"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create indexes on startup
@app.on_event("startup")
async def startup_db_indexes():
    try:
        await db.delivery_zones.create_index([("polygon", "2dsphere")])
        await db.restaurants.create_index([("location", "2dsphere")])
        await db.users.create_index("email", unique=True)
        await db.orders.create_index([("created_at", -1)])
        logger.info("Database indexes created successfully")
    except Exception as e:
        logger.warning(f"Index creation warning: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
