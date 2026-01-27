from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Query, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone, timedelta, time
import jwt
import bcrypt
import cloudinary
import cloudinary.utils
import cloudinary.uploader
import time as time_module
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'zonebite-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Cloudinary config
cloudinary.config(
    cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME", ""),
    api_key=os.environ.get("CLOUDINARY_API_KEY", ""),
    api_secret=os.environ.get("CLOUDINARY_API_SECRET", ""),
    secure=True
)

# Security
security = HTTPBearer()

# Create the main app
app = FastAPI(title="ZoneBite - Subscription Meal Delivery Admin API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ===================== MODELS =====================

class UserBase(BaseModel):
    name: str
    mobile: str
    role: str = "delivery_boy"  # admin, delivery_boy

class UserCreate(UserBase):
    login_id: str
    password: str

class UserLogin(BaseModel):
    login_id: str
    password: str

class UserResponse(BaseModel):
    id: str
    name: str
    mobile: str
    login_id: str
    role: str
    is_active: bool = True
    assigned_zones: List[str] = []
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Combo Models
class ComboCreate(BaseModel):
    name: str
    dishes: List[str]

class ComboResponse(ComboCreate):
    id: str
    created_at: str

# Subscription Plan Models
class MealSchedule(BaseModel):
    day: str  # Monday, Tuesday, etc.
    meals: List[str]  # breakfast, lunch, dinner

class PlanCreate(BaseModel):
    name: str
    combo_id: str
    price: float
    validity_days: int  # 7, 15, 30
    image_url: Optional[str] = None
    schedule: List[MealSchedule]  # Which days and which meals

class PlanResponse(PlanCreate):
    id: str
    combo_name: Optional[str] = None
    is_active: bool = True
    created_at: str

# Zone Models
class ZoneCreate(BaseModel):
    name: str
    polygon: List[List[float]]  # [[lng, lat], ...]
    assigned_delivery_boys: List[str] = []

class ZoneResponse(ZoneCreate):
    id: str
    is_active: bool = True
    created_at: str

# Customer Models
class CustomerCreate(BaseModel):
    name: str
    mobile: str
    password: str
    address: str
    location: Optional[List[float]] = None  # [lng, lat]

class CustomerResponse(BaseModel):
    id: str
    customer_id: str  # System generated ID like CUS001
    name: str
    mobile: str
    address: str
    zone_id: Optional[str] = None
    zone_name: Optional[str] = None
    is_active: bool = True
    created_at: str

# Subscription Models
class SubscriptionCreate(BaseModel):
    customer_id: str
    plan_id: str

class SubscriptionResponse(BaseModel):
    id: str
    customer_id: str
    customer_name: Optional[str] = None
    plan_id: str
    plan_name: Optional[str] = None
    combo_name: Optional[str] = None
    start_date: str
    end_date: str
    is_active: bool = True
    is_paused: bool = False
    created_at: str

# Order Models
class OrderResponse(BaseModel):
    id: str
    subscription_id: str
    customer_id: str
    customer_name: Optional[str] = None
    customer_address: Optional[str] = None
    customer_mobile: Optional[str] = None
    zone_id: Optional[str] = None
    zone_name: Optional[str] = None
    combo_id: str
    combo_name: Optional[str] = None
    plan_name: Optional[str] = None
    meal_type: str  # breakfast, lunch, dinner
    status: str  # pending, packed, out_for_delivery, delivered
    delivery_boy_id: Optional[str] = None
    delivery_boy_name: Optional[str] = None
    order_date: str
    created_at: str

class OrderStatusUpdate(BaseModel):
    status: str
    delivery_boy_id: Optional[str] = None

# Settings Models
class MealTimings(BaseModel):
    breakfast_start: str = "03:00"
    breakfast_end: str = "09:00"
    lunch_start: str = "09:10"
    lunch_end: str = "15:00"
    dinner_start: str = "15:10"
    dinner_end: str = "21:00"

class SettingsUpdate(BaseModel):
    meal_timings: Optional[MealTimings] = None
    help_number: Optional[str] = None

class SettingsResponse(BaseModel):
    meal_timings: MealTimings
    help_number: str

# Dashboard Models
class DashboardStats(BaseModel):
    total_active_customers: int
    total_orders_today: int
    total_delivery_boys: int
    breakfast_orders: int
    lunch_orders: int
    dinner_orders: int
    delivered_today: int
    pending_today: int

class ZoneOrderSummary(BaseModel):
    zone_id: str
    zone_name: str
    meal_type: str
    combos: List[Dict]  # [{combo_name: str, count: int}]

# ===================== HELPERS =====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, login_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "login_id": login_id,
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

async def generate_customer_id():
    count = await db.customers.count_documents({})
    return f"CUS{str(count + 1).zfill(4)}"

def get_today_date():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")

def get_day_name():
    return datetime.now(timezone.utc).strftime("%A")

# ===================== AUTH ROUTES =====================

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"login_id": credentials.login_id}, {"_id": 0})
    if not user or not verify_password(credentials.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="Account is deactivated")
    
    token = create_token(user["id"], user["login_id"], user["role"])
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            name=user["name"],
            mobile=user["mobile"],
            login_id=user["login_id"],
            role=user["role"],
            is_active=user.get("is_active", True),
            assigned_zones=user.get("assigned_zones", []),
            created_at=user["created_at"]
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        name=current_user["name"],
        mobile=current_user["mobile"],
        login_id=current_user["login_id"],
        role=current_user["role"],
        is_active=current_user.get("is_active", True),
        assigned_zones=current_user.get("assigned_zones", []),
        created_at=current_user["created_at"]
    )

# ===================== DELIVERY BOY MANAGEMENT =====================

@api_router.post("/delivery-boys", response_model=UserResponse)
async def create_delivery_boy(user: UserCreate, admin: dict = Depends(require_admin)):
    existing = await db.users.find_one({"login_id": user.login_id})
    if existing:
        raise HTTPException(status_code=400, detail="Login ID already exists")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "name": user.name,
        "mobile": user.mobile,
        "login_id": user.login_id,
        "password_hash": hash_password(user.password),
        "role": "delivery_boy",
        "is_active": True,
        "assigned_zones": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    return UserResponse(
        id=user_id,
        name=user.name,
        mobile=user.mobile,
        login_id=user.login_id,
        role="delivery_boy",
        is_active=True,
        assigned_zones=[],
        created_at=user_doc["created_at"]
    )

@api_router.get("/delivery-boys", response_model=List[UserResponse])
async def get_delivery_boys(admin: dict = Depends(require_admin)):
    boys = await db.users.find({"role": "delivery_boy"}, {"_id": 0, "password_hash": 0}).to_list(100)
    return [UserResponse(**boy) for boy in boys]

@api_router.put("/delivery-boys/{boy_id}/status")
async def toggle_delivery_boy_status(boy_id: str, is_active: bool, admin: dict = Depends(require_admin)):
    result = await db.users.find_one_and_update(
        {"id": boy_id, "role": "delivery_boy"},
        {"$set": {"is_active": is_active}},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Delivery boy not found")
    return {"message": f"Delivery boy {'activated' if is_active else 'deactivated'}"}

@api_router.put("/delivery-boys/{boy_id}/zones")
async def assign_zones_to_delivery_boy(boy_id: str, zone_ids: List[str], admin: dict = Depends(require_admin)):
    result = await db.users.find_one_and_update(
        {"id": boy_id, "role": "delivery_boy"},
        {"$set": {"assigned_zones": zone_ids}},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Delivery boy not found")
    return {"message": "Zones assigned successfully"}

@api_router.delete("/delivery-boys/{boy_id}")
async def delete_delivery_boy(boy_id: str, admin: dict = Depends(require_admin)):
    result = await db.users.delete_one({"id": boy_id, "role": "delivery_boy"})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Delivery boy not found")
    return {"message": "Delivery boy deleted"}

# ===================== COMBO MANAGEMENT =====================

@api_router.post("/combos", response_model=ComboResponse)
async def create_combo(combo: ComboCreate, admin: dict = Depends(require_admin)):
    combo_id = str(uuid.uuid4())
    combo_doc = {
        "id": combo_id,
        "name": combo.name,
        "dishes": combo.dishes,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.combos.insert_one(combo_doc)
    return ComboResponse(id=combo_id, **combo.model_dump(), created_at=combo_doc["created_at"])

@api_router.get("/combos", response_model=List[ComboResponse])
async def get_combos():
    combos = await db.combos.find({}, {"_id": 0}).to_list(100)
    return [ComboResponse(**combo) for combo in combos]

@api_router.put("/combos/{combo_id}", response_model=ComboResponse)
async def update_combo(combo_id: str, combo: ComboCreate, admin: dict = Depends(require_admin)):
    result = await db.combos.find_one_and_update(
        {"id": combo_id},
        {"$set": {"name": combo.name, "dishes": combo.dishes}},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Combo not found")
    return ComboResponse(**{k: v for k, v in result.items() if k != "_id"})

@api_router.delete("/combos/{combo_id}")
async def delete_combo(combo_id: str, admin: dict = Depends(require_admin)):
    result = await db.combos.delete_one({"id": combo_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Combo not found")
    return {"message": "Combo deleted"}

# ===================== SUBSCRIPTION PLAN MANAGEMENT =====================

@api_router.post("/plans", response_model=PlanResponse)
async def create_plan(plan: PlanCreate, admin: dict = Depends(require_admin)):
    # Verify combo exists
    combo = await db.combos.find_one({"id": plan.combo_id}, {"_id": 0})
    if not combo:
        raise HTTPException(status_code=400, detail="Combo not found")
    
    plan_id = str(uuid.uuid4())
    plan_doc = {
        "id": plan_id,
        "name": plan.name,
        "combo_id": plan.combo_id,
        "price": plan.price,
        "validity_days": plan.validity_days,
        "image_url": plan.image_url,
        "schedule": [s.model_dump() for s in plan.schedule],
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.plans.insert_one(plan_doc)
    
    return PlanResponse(
        id=plan_id,
        name=plan.name,
        combo_id=plan.combo_id,
        combo_name=combo["name"],
        price=plan.price,
        validity_days=plan.validity_days,
        image_url=plan.image_url,
        schedule=plan.schedule,
        is_active=True,
        created_at=plan_doc["created_at"]
    )

@api_router.get("/plans", response_model=List[PlanResponse])
async def get_plans(active_only: bool = False):
    query = {"is_active": True} if active_only else {}
    plans = await db.plans.find(query, {"_id": 0}).to_list(100)
    
    result = []
    for plan in plans:
        combo = await db.combos.find_one({"id": plan["combo_id"]}, {"_id": 0})
        plan["combo_name"] = combo["name"] if combo else None
        plan["schedule"] = [MealSchedule(**s) for s in plan.get("schedule", [])]
        result.append(PlanResponse(**plan))
    
    return result

@api_router.put("/plans/{plan_id}", response_model=PlanResponse)
async def update_plan(plan_id: str, plan: PlanCreate, admin: dict = Depends(require_admin)):
    combo = await db.combos.find_one({"id": plan.combo_id}, {"_id": 0})
    if not combo:
        raise HTTPException(status_code=400, detail="Combo not found")
    
    update_doc = {
        "name": plan.name,
        "combo_id": plan.combo_id,
        "price": plan.price,
        "validity_days": plan.validity_days,
        "image_url": plan.image_url,
        "schedule": [s.model_dump() for s in plan.schedule]
    }
    
    result = await db.plans.find_one_and_update(
        {"id": plan_id},
        {"$set": update_doc},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    result["combo_name"] = combo["name"]
    result["schedule"] = [MealSchedule(**s) for s in result.get("schedule", [])]
    return PlanResponse(**{k: v for k, v in result.items() if k != "_id"})

@api_router.put("/plans/{plan_id}/status")
async def toggle_plan_status(plan_id: str, is_active: bool, admin: dict = Depends(require_admin)):
    result = await db.plans.find_one_and_update(
        {"id": plan_id},
        {"$set": {"is_active": is_active}},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Plan not found")
    return {"message": f"Plan {'activated' if is_active else 'deactivated'}"}

@api_router.delete("/plans/{plan_id}")
async def delete_plan(plan_id: str, admin: dict = Depends(require_admin)):
    result = await db.plans.delete_one({"id": plan_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Plan not found")
    return {"message": "Plan deleted"}

# ===================== ZONE MANAGEMENT =====================

@api_router.post("/zones", response_model=ZoneResponse)
async def create_zone(zone: ZoneCreate, admin: dict = Depends(require_admin)):
    zone_id = str(uuid.uuid4())
    
    polygon = zone.polygon
    if polygon and polygon[0] != polygon[-1]:
        polygon.append(polygon[0])
    
    zone_doc = {
        "id": zone_id,
        "name": zone.name,
        "polygon": {"type": "Polygon", "coordinates": [polygon]},
        "assigned_delivery_boys": zone.assigned_delivery_boys,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.zones.insert_one(zone_doc)
    
    # Update delivery boys with this zone
    if zone.assigned_delivery_boys:
        for boy_id in zone.assigned_delivery_boys:
            await db.users.update_one(
                {"id": boy_id, "role": "delivery_boy"},
                {"$addToSet": {"assigned_zones": zone_id}}
            )
    
    return ZoneResponse(
        id=zone_id,
        name=zone.name,
        polygon=polygon,
        assigned_delivery_boys=zone.assigned_delivery_boys,
        is_active=True,
        created_at=zone_doc["created_at"]
    )

@api_router.get("/zones", response_model=List[ZoneResponse])
async def get_zones():
    zones = await db.zones.find({}, {"_id": 0}).to_list(100)
    return [
        ZoneResponse(
            id=z["id"],
            name=z["name"],
            polygon=z["polygon"]["coordinates"][0] if "polygon" in z else [],
            assigned_delivery_boys=z.get("assigned_delivery_boys", []),
            is_active=z.get("is_active", True),
            created_at=z["created_at"]
        ) for z in zones
    ]

@api_router.put("/zones/{zone_id}", response_model=ZoneResponse)
async def update_zone(zone_id: str, zone: ZoneCreate, admin: dict = Depends(require_admin)):
    polygon = zone.polygon
    if polygon and polygon[0] != polygon[-1]:
        polygon.append(polygon[0])
    
    update_doc = {
        "name": zone.name,
        "polygon": {"type": "Polygon", "coordinates": [polygon]},
        "assigned_delivery_boys": zone.assigned_delivery_boys
    }
    
    result = await db.zones.find_one_and_update(
        {"id": zone_id},
        {"$set": update_doc},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Zone not found")
    
    return ZoneResponse(
        id=result["id"],
        name=result["name"],
        polygon=result["polygon"]["coordinates"][0],
        assigned_delivery_boys=result.get("assigned_delivery_boys", []),
        is_active=result.get("is_active", True),
        created_at=result["created_at"]
    )

@api_router.delete("/zones/{zone_id}")
async def delete_zone(zone_id: str, admin: dict = Depends(require_admin)):
    result = await db.zones.delete_one({"id": zone_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Zone not found")
    return {"message": "Zone deleted"}

# ===================== CUSTOMER MANAGEMENT =====================

@api_router.post("/customers", response_model=CustomerResponse)
async def create_customer(customer: CustomerCreate, admin: dict = Depends(require_admin)):
    customer_uuid = str(uuid.uuid4())
    customer_id = await generate_customer_id()
    
    # Find zone based on location
    zone_id = None
    zone_name = None
    if customer.location:
        zone = await db.zones.find_one({
            "is_active": True,
            "polygon": {
                "$geoIntersects": {
                    "$geometry": {"type": "Point", "coordinates": customer.location}
                }
            }
        }, {"_id": 0})
        if zone:
            zone_id = zone["id"]
            zone_name = zone["name"]
    
    customer_doc = {
        "id": customer_uuid,
        "customer_id": customer_id,
        "name": customer.name,
        "mobile": customer.mobile,
        "password_hash": hash_password(customer.password),
        "address": customer.address,
        "location": customer.location,
        "zone_id": zone_id,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.customers.insert_one(customer_doc)
    
    return CustomerResponse(
        id=customer_uuid,
        customer_id=customer_id,
        name=customer.name,
        mobile=customer.mobile,
        address=customer.address,
        zone_id=zone_id,
        zone_name=zone_name,
        is_active=True,
        created_at=customer_doc["created_at"]
    )

@api_router.get("/customers", response_model=List[CustomerResponse])
async def get_customers(admin: dict = Depends(require_admin)):
    customers = await db.customers.find({}, {"_id": 0, "password_hash": 0}).to_list(500)
    
    result = []
    for c in customers:
        zone_name = None
        if c.get("zone_id"):
            zone = await db.zones.find_one({"id": c["zone_id"]}, {"_id": 0})
            zone_name = zone["name"] if zone else None
        
        result.append(CustomerResponse(
            id=c["id"],
            customer_id=c["customer_id"],
            name=c["name"],
            mobile=c["mobile"],
            address=c["address"],
            zone_id=c.get("zone_id"),
            zone_name=zone_name,
            is_active=c.get("is_active", True),
            created_at=c["created_at"]
        ))
    
    return result

# ===================== SUBSCRIPTION MANAGEMENT =====================

@api_router.post("/subscriptions", response_model=SubscriptionResponse)
async def create_subscription(sub: SubscriptionCreate, admin: dict = Depends(require_admin)):
    # Verify customer and plan exist
    customer = await db.customers.find_one({"id": sub.customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=400, detail="Customer not found")
    
    plan = await db.plans.find_one({"id": sub.plan_id}, {"_id": 0})
    if not plan:
        raise HTTPException(status_code=400, detail="Plan not found")
    
    combo = await db.combos.find_one({"id": plan["combo_id"]}, {"_id": 0})
    
    sub_id = str(uuid.uuid4())
    start_date = datetime.now(timezone.utc)
    end_date = start_date + timedelta(days=plan["validity_days"])
    
    sub_doc = {
        "id": sub_id,
        "customer_id": sub.customer_id,
        "plan_id": sub.plan_id,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "is_active": True,
        "is_paused": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.subscriptions.insert_one(sub_doc)
    
    return SubscriptionResponse(
        id=sub_id,
        customer_id=sub.customer_id,
        customer_name=customer["name"],
        plan_id=sub.plan_id,
        plan_name=plan["name"],
        combo_name=combo["name"] if combo else None,
        start_date=sub_doc["start_date"],
        end_date=sub_doc["end_date"],
        is_active=True,
        is_paused=False,
        created_at=sub_doc["created_at"]
    )

@api_router.get("/subscriptions", response_model=List[SubscriptionResponse])
async def get_subscriptions(active_only: bool = False, admin: dict = Depends(require_admin)):
    query = {"is_active": True} if active_only else {}
    subs = await db.subscriptions.find(query, {"_id": 0}).to_list(500)
    
    result = []
    for s in subs:
        customer = await db.customers.find_one({"id": s["customer_id"]}, {"_id": 0})
        plan = await db.plans.find_one({"id": s["plan_id"]}, {"_id": 0})
        combo = None
        if plan:
            combo = await db.combos.find_one({"id": plan["combo_id"]}, {"_id": 0})
        
        result.append(SubscriptionResponse(
            id=s["id"],
            customer_id=s["customer_id"],
            customer_name=customer["name"] if customer else None,
            plan_id=s["plan_id"],
            plan_name=plan["name"] if plan else None,
            combo_name=combo["name"] if combo else None,
            start_date=s["start_date"],
            end_date=s["end_date"],
            is_active=s.get("is_active", True),
            is_paused=s.get("is_paused", False),
            created_at=s["created_at"]
        ))
    
    return result

@api_router.put("/subscriptions/{sub_id}/pause")
async def pause_subscription(sub_id: str, admin: dict = Depends(require_admin)):
    result = await db.subscriptions.find_one_and_update(
        {"id": sub_id},
        {"$set": {"is_paused": True}},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return {"message": "Subscription paused"}

@api_router.put("/subscriptions/{sub_id}/resume")
async def resume_subscription(sub_id: str, admin: dict = Depends(require_admin)):
    result = await db.subscriptions.find_one_and_update(
        {"id": sub_id},
        {"$set": {"is_paused": False}},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return {"message": "Subscription resumed"}

# ===================== ORDER GENERATION ENGINE =====================

@api_router.post("/orders/generate")
async def generate_orders(meal_type: str = Query(..., enum=["breakfast", "lunch", "dinner"]), admin: dict = Depends(require_admin)):
    """Manually generate orders for a specific meal type"""
    today = get_today_date()
    day_name = get_day_name()
    
    # Check if orders already generated for this meal today
    existing = await db.orders.find_one({
        "order_date": today,
        "meal_type": meal_type
    })
    if existing:
        raise HTTPException(status_code=400, detail=f"{meal_type.capitalize()} orders already generated for today")
    
    # Get active, non-paused subscriptions
    subs = await db.subscriptions.find({
        "is_active": True,
        "is_paused": False,
        "start_date": {"$lte": datetime.now(timezone.utc).isoformat()},
        "end_date": {"$gte": datetime.now(timezone.utc).isoformat()}
    }, {"_id": 0}).to_list(1000)
    
    orders_created = 0
    
    for sub in subs:
        plan = await db.plans.find_one({"id": sub["plan_id"]}, {"_id": 0})
        if not plan:
            continue
        
        # Check if this plan has this meal type on this day
        schedule = plan.get("schedule", [])
        day_schedule = next((s for s in schedule if s["day"] == day_name), None)
        
        if not day_schedule or meal_type not in day_schedule.get("meals", []):
            continue
        
        customer = await db.customers.find_one({"id": sub["customer_id"]}, {"_id": 0})
        if not customer:
            continue
        
        combo = await db.combos.find_one({"id": plan["combo_id"]}, {"_id": 0})
        zone = None
        if customer.get("zone_id"):
            zone = await db.zones.find_one({"id": customer["zone_id"]}, {"_id": 0})
        
        # Get assigned delivery boy for zone
        delivery_boy_id = None
        delivery_boy_name = None
        if zone and zone.get("assigned_delivery_boys"):
            boy = await db.users.find_one({
                "id": {"$in": zone["assigned_delivery_boys"]},
                "is_active": True
            }, {"_id": 0})
            if boy:
                delivery_boy_id = boy["id"]
                delivery_boy_name = boy["name"]
        
        order_doc = {
            "id": str(uuid.uuid4()),
            "subscription_id": sub["id"],
            "customer_id": customer["id"],
            "customer_name": customer["name"],
            "customer_address": customer["address"],
            "customer_mobile": customer["mobile"],
            "zone_id": customer.get("zone_id"),
            "zone_name": zone["name"] if zone else None,
            "combo_id": plan["combo_id"],
            "combo_name": combo["name"] if combo else None,
            "plan_name": plan["name"],
            "meal_type": meal_type,
            "status": "pending",
            "delivery_boy_id": delivery_boy_id,
            "delivery_boy_name": delivery_boy_name,
            "order_date": today,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.orders.insert_one(order_doc)
        orders_created += 1
    
    return {"message": f"Generated {orders_created} {meal_type} orders for {day_name}"}

@api_router.get("/orders", response_model=List[OrderResponse])
async def get_orders(
    meal_type: Optional[str] = None,
    status: Optional[str] = None,
    zone_id: Optional[str] = None,
    date: Optional[str] = None,
    admin: dict = Depends(require_admin)
):
    query = {}
    if meal_type:
        query["meal_type"] = meal_type
    if status:
        query["status"] = status
    if zone_id:
        query["zone_id"] = zone_id
    if date:
        query["order_date"] = date
    else:
        query["order_date"] = get_today_date()
    
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [OrderResponse(**order) for order in orders]

@api_router.put("/orders/{order_id}/status", response_model=OrderResponse)
async def update_order_status(order_id: str, update: OrderStatusUpdate, current_user: dict = Depends(get_current_user)):
    update_doc = {"status": update.status}
    
    if update.delivery_boy_id:
        boy = await db.users.find_one({"id": update.delivery_boy_id}, {"_id": 0})
        if boy:
            update_doc["delivery_boy_id"] = update.delivery_boy_id
            update_doc["delivery_boy_name"] = boy["name"]
    
    result = await db.orders.find_one_and_update(
        {"id": order_id},
        {"$set": update_doc},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return OrderResponse(**{k: v for k, v in result.items() if k != "_id"})

@api_router.get("/orders/zone-summary")
async def get_zone_order_summary(meal_type: str = Query(..., enum=["breakfast", "lunch", "dinner"]), admin: dict = Depends(require_admin)):
    """Get zone-wise order summary for a meal type"""
    today = get_today_date()
    
    pipeline = [
        {"$match": {"order_date": today, "meal_type": meal_type}},
        {"$group": {
            "_id": {"zone_id": "$zone_id", "zone_name": "$zone_name", "combo_name": "$combo_name"},
            "count": {"$sum": 1}
        }},
        {"$group": {
            "_id": {"zone_id": "$_id.zone_id", "zone_name": "$_id.zone_name"},
            "combos": {"$push": {"combo_name": "$_id.combo_name", "count": "$count"}}
        }}
    ]
    
    results = await db.orders.aggregate(pipeline).to_list(100)
    
    return [
        {
            "zone_id": r["_id"]["zone_id"],
            "zone_name": r["_id"]["zone_name"] or "Unassigned",
            "meal_type": meal_type,
            "combos": r["combos"]
        } for r in results
    ]

# ===================== SETTINGS =====================

@api_router.get("/settings", response_model=SettingsResponse)
async def get_settings(admin: dict = Depends(require_admin)):
    settings = await db.settings.find_one({"type": "app_settings"}, {"_id": 0})
    if not settings:
        # Return defaults
        return SettingsResponse(
            meal_timings=MealTimings(),
            help_number=""
        )
    return SettingsResponse(
        meal_timings=MealTimings(**settings.get("meal_timings", {})),
        help_number=settings.get("help_number", "")
    )

@api_router.put("/settings", response_model=SettingsResponse)
async def update_settings(settings: SettingsUpdate, admin: dict = Depends(require_admin)):
    update_doc = {}
    if settings.meal_timings:
        update_doc["meal_timings"] = settings.meal_timings.model_dump()
    if settings.help_number is not None:
        update_doc["help_number"] = settings.help_number
    
    await db.settings.update_one(
        {"type": "app_settings"},
        {"$set": update_doc},
        upsert=True
    )
    
    return await get_settings(admin)

# ===================== DASHBOARD =====================

@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(admin: dict = Depends(require_admin)):
    today = get_today_date()
    
    total_active_customers = await db.subscriptions.count_documents({"is_active": True, "is_paused": False})
    total_orders_today = await db.orders.count_documents({"order_date": today})
    total_delivery_boys = await db.users.count_documents({"role": "delivery_boy", "is_active": True})
    
    breakfast_orders = await db.orders.count_documents({"order_date": today, "meal_type": "breakfast"})
    lunch_orders = await db.orders.count_documents({"order_date": today, "meal_type": "lunch"})
    dinner_orders = await db.orders.count_documents({"order_date": today, "meal_type": "dinner"})
    
    delivered_today = await db.orders.count_documents({"order_date": today, "status": "delivered"})
    pending_today = await db.orders.count_documents({"order_date": today, "status": {"$ne": "delivered"}})
    
    return DashboardStats(
        total_active_customers=total_active_customers,
        total_orders_today=total_orders_today,
        total_delivery_boys=total_delivery_boys,
        breakfast_orders=breakfast_orders,
        lunch_orders=lunch_orders,
        dinner_orders=dinner_orders,
        delivered_today=delivered_today,
        pending_today=pending_today
    )

# ===================== CLOUDINARY UPLOAD =====================

@api_router.get("/cloudinary/signature")
async def get_cloudinary_signature(
    folder: str = "plans",
    admin: dict = Depends(require_admin)
):
    """Generate signed upload params for Cloudinary"""
    if not os.environ.get("CLOUDINARY_API_SECRET"):
        raise HTTPException(status_code=500, detail="Cloudinary not configured")
    
    timestamp = int(time_module.time())
    params = {
        "timestamp": timestamp,
        "folder": folder
    }
    
    signature = cloudinary.utils.api_sign_request(
        params,
        os.environ.get("CLOUDINARY_API_SECRET")
    )
    
    return {
        "signature": signature,
        "timestamp": timestamp,
        "cloud_name": os.environ.get("CLOUDINARY_CLOUD_NAME"),
        "api_key": os.environ.get("CLOUDINARY_API_KEY"),
        "folder": folder
    }

# ===================== HEALTH CHECK =====================

@api_router.get("/")
async def root():
    return {"message": "EATWEL Subscription API is running", "version": "2.1.0"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# ===================== BANNER MANAGEMENT =====================

class BannerCreate(BaseModel):
    title: str
    image_url: str
    link_url: Optional[str] = None
    is_active: bool = True
    order: int = 0

class BannerResponse(BannerCreate):
    id: str
    created_at: str

@api_router.post("/banners", response_model=BannerResponse)
async def create_banner(banner: BannerCreate, admin: dict = Depends(require_admin)):
    banner_id = str(uuid.uuid4())
    banner_doc = {
        "id": banner_id,
        "title": banner.title,
        "image_url": banner.image_url,
        "link_url": banner.link_url,
        "is_active": banner.is_active,
        "order": banner.order,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.banners.insert_one(banner_doc)
    return BannerResponse(**banner.model_dump(), id=banner_id, created_at=banner_doc["created_at"])

@api_router.get("/banners", response_model=List[BannerResponse])
async def get_banners(active_only: bool = False):
    query = {"is_active": True} if active_only else {}
    banners = await db.banners.find(query, {"_id": 0}).sort("order", 1).to_list(50)
    return [BannerResponse(**b) for b in banners]

@api_router.put("/banners/{banner_id}", response_model=BannerResponse)
async def update_banner(banner_id: str, banner: BannerCreate, admin: dict = Depends(require_admin)):
    result = await db.banners.find_one_and_update(
        {"id": banner_id},
        {"$set": banner.model_dump()},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Banner not found")
    return BannerResponse(**{k: v for k, v in result.items() if k != "_id"})

@api_router.delete("/banners/{banner_id}")
async def delete_banner(banner_id: str, admin: dict = Depends(require_admin)):
    result = await db.banners.delete_one({"id": banner_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Banner not found")
    return {"message": "Banner deleted"}

# ===================== CUSTOMER APP APIs =====================

class CustomerLogin(BaseModel):
    customer_id: str
    password: str

class CustomerProfileUpdate(BaseModel):
    name: Optional[str] = None
    mobile: Optional[str] = None
    address: Optional[str] = None

class CustomerProfileResponse(BaseModel):
    id: str
    customer_id: str
    name: str
    mobile: str
    address: str
    zone_id: Optional[str] = None
    zone_name: Optional[str] = None
    is_active: bool
    created_at: str
    active_subscription: Optional[dict] = None

@api_router.post("/customer/login")
async def customer_login(credentials: CustomerLogin):
    """Customer login with Customer ID and Password"""
    customer = await db.customers.find_one({"customer_id": credentials.customer_id}, {"_id": 0})
    if not customer or not verify_password(credentials.password, customer.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid Customer ID or Password")
    
    if not customer.get("is_active", True):
        raise HTTPException(status_code=401, detail="Account is deactivated")
    
    token = create_token(customer["id"], credentials.customer_id, "customer")
    
    # Get zone name
    zone_name = None
    if customer.get("zone_id"):
        zone = await db.zones.find_one({"id": customer["zone_id"]}, {"_id": 0})
        zone_name = zone["name"] if zone else None
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "customer": {
            "id": customer["id"],
            "customer_id": customer["customer_id"],
            "name": customer["name"],
            "mobile": customer["mobile"],
            "address": customer["address"],
            "zone_id": customer.get("zone_id"),
            "zone_name": zone_name,
            "is_active": customer.get("is_active", True),
            "created_at": customer["created_at"]
        }
    }

@api_router.get("/customer/profile", response_model=CustomerProfileResponse)
async def get_customer_profile(current_user: dict = Depends(get_current_user)):
    """Get customer profile with active subscription"""
    if current_user.get("role") not in ["customer", "admin"]:
        # For customers, fetch from customers collection
        pass
    
    customer = await db.customers.find_one({"id": current_user.get("id")}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Get zone name
    zone_name = None
    if customer.get("zone_id"):
        zone = await db.zones.find_one({"id": customer["zone_id"]}, {"_id": 0})
        zone_name = zone["name"] if zone else None
    
    # Get active subscription
    active_sub = await db.subscriptions.find_one({
        "customer_id": customer["id"],
        "is_active": True,
        "end_date": {"$gte": datetime.now(timezone.utc).isoformat()}
    }, {"_id": 0})
    
    subscription_data = None
    if active_sub:
        plan = await db.plans.find_one({"id": active_sub["plan_id"]}, {"_id": 0})
        combo = None
        if plan:
            combo = await db.combos.find_one({"id": plan["combo_id"]}, {"_id": 0})
        
        subscription_data = {
            "id": active_sub["id"],
            "plan_name": plan["name"] if plan else None,
            "combo_name": combo["name"] if combo else None,
            "start_date": active_sub["start_date"],
            "end_date": active_sub["end_date"],
            "is_paused": active_sub.get("is_paused", False)
        }
    
    return CustomerProfileResponse(
        id=customer["id"],
        customer_id=customer["customer_id"],
        name=customer["name"],
        mobile=customer["mobile"],
        address=customer["address"],
        zone_id=customer.get("zone_id"),
        zone_name=zone_name,
        is_active=customer.get("is_active", True),
        created_at=customer["created_at"],
        active_subscription=subscription_data
    )

@api_router.put("/customer/profile", response_model=CustomerProfileResponse)
async def update_customer_profile(update: CustomerProfileUpdate, current_user: dict = Depends(get_current_user)):
    """Update customer profile"""
    update_doc = {}
    if update.name:
        update_doc["name"] = update.name
    if update.mobile:
        update_doc["mobile"] = update.mobile
    if update.address:
        update_doc["address"] = update.address
    
    if not update_doc:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    result = await db.customers.find_one_and_update(
        {"id": current_user.get("id")},
        {"$set": update_doc},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    return await get_customer_profile(current_user)

@api_router.get("/customer/orders")
async def get_customer_orders(current_user: dict = Depends(get_current_user)):
    """Get customer's orders"""
    orders = await db.orders.find(
        {"customer_id": current_user.get("id")},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return orders

@api_router.get("/customer/plans")
async def get_available_plans():
    """Get all available subscription plans for customers"""
    plans = await db.plans.find({"is_active": True}, {"_id": 0}).to_list(100)
    
    result = []
    for plan in plans:
        combo = await db.combos.find_one({"id": plan["combo_id"]}, {"_id": 0})
        plan["combo_name"] = combo["name"] if combo else None
        plan["combo_dishes"] = combo["dishes"] if combo else []
        result.append(plan)
    
    return result

@api_router.get("/customer/settings")
async def get_customer_app_settings():
    """Get app settings for customer (help number)"""
    settings = await db.settings.find_one({"type": "app_settings"}, {"_id": 0})
    return {
        "help_number": settings.get("help_number", "") if settings else ""
    }

# ===================== DELIVERY BOY APP APIs =====================

@api_router.post("/delivery-boy/login")
async def delivery_boy_login(credentials: UserLogin):
    """Delivery Boy login with Login ID and Password"""
    user = await db.users.find_one({"login_id": credentials.login_id, "role": "delivery_boy"}, {"_id": 0})
    if not user or not verify_password(credentials.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid Login ID or Password")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="Account is deactivated")
    
    token = create_token(user["id"], credentials.login_id, "delivery_boy")
    
    # Get assigned zone names
    zone_names = []
    if user.get("assigned_zones"):
        zones = await db.zones.find({"id": {"$in": user["assigned_zones"]}}, {"_id": 0}).to_list(100)
        zone_names = [z["name"] for z in zones]
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "delivery_boy": {
            "id": user["id"],
            "name": user["name"],
            "mobile": user["mobile"],
            "login_id": user["login_id"],
            "is_active": user.get("is_active", True),
            "assigned_zones": user.get("assigned_zones", []),
            "assigned_zone_names": zone_names,
            "created_at": user["created_at"]
        }
    }

@api_router.get("/delivery-boy/profile")
async def get_delivery_boy_profile(current_user: dict = Depends(get_current_user)):
    """Get delivery boy profile"""
    if current_user.get("role") != "delivery_boy":
        raise HTTPException(status_code=403, detail="Delivery boy access only")
    
    # Get assigned zone names
    zone_names = []
    if current_user.get("assigned_zones"):
        zones = await db.zones.find({"id": {"$in": current_user["assigned_zones"]}}, {"_id": 0}).to_list(100)
        zone_names = [z["name"] for z in zones]
    
    return {
        "id": current_user["id"],
        "name": current_user["name"],
        "mobile": current_user["mobile"],
        "login_id": current_user["login_id"],
        "is_active": current_user.get("is_active", True),
        "assigned_zones": current_user.get("assigned_zones", []),
        "assigned_zone_names": zone_names,
        "created_at": current_user["created_at"]
    }

@api_router.get("/delivery-boy/orders")
async def get_delivery_boy_orders(
    meal_type: Optional[str] = Query(None, enum=["breakfast", "lunch", "dinner"]),
    status: Optional[str] = Query(None, enum=["pending", "packed", "out_for_delivery", "delivered"]),
    current_user: dict = Depends(get_current_user)
):
    """Get orders for delivery boy's assigned zones"""
    if current_user.get("role") != "delivery_boy":
        raise HTTPException(status_code=403, detail="Delivery boy access only")
    
    assigned_zones = current_user.get("assigned_zones", [])
    if not assigned_zones:
        return []
    
    # Build query for assigned zones only
    query = {
        "zone_id": {"$in": assigned_zones},
        "order_date": get_today_date()
    }
    
    if meal_type:
        query["meal_type"] = meal_type
    
    if status:
        query["status"] = status
    
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    # Return only necessary fields (no price/combo modification data)
    result = []
    for order in orders:
        result.append({
            "id": order["id"],
            "customer_name": order.get("customer_name"),
            "customer_address": order.get("customer_address"),
            "customer_mobile": order.get("customer_mobile"),
            "zone_name": order.get("zone_name"),
            "combo_name": order.get("combo_name"),
            "meal_type": order.get("meal_type"),
            "status": order.get("status"),
            "order_date": order.get("order_date"),
            "created_at": order.get("created_at")
        })
    
    return result

@api_router.get("/delivery-boy/orders/summary")
async def get_delivery_boy_order_summary(current_user: dict = Depends(get_current_user)):
    """Get order count summary for delivery boy"""
    if current_user.get("role") != "delivery_boy":
        raise HTTPException(status_code=403, detail="Delivery boy access only")
    
    assigned_zones = current_user.get("assigned_zones", [])
    if not assigned_zones:
        return {
            "breakfast": {"total": 0, "pending": 0, "out_for_delivery": 0, "delivered": 0},
            "lunch": {"total": 0, "pending": 0, "out_for_delivery": 0, "delivered": 0},
            "dinner": {"total": 0, "pending": 0, "out_for_delivery": 0, "delivered": 0}
        }
    
    today = get_today_date()
    base_query = {"zone_id": {"$in": assigned_zones}, "order_date": today}
    
    summary = {}
    for meal in ["breakfast", "lunch", "dinner"]:
        meal_query = {**base_query, "meal_type": meal}
        total = await db.orders.count_documents(meal_query)
        pending = await db.orders.count_documents({**meal_query, "status": {"$in": ["pending", "packed"]}})
        out_for_delivery = await db.orders.count_documents({**meal_query, "status": "out_for_delivery"})
        delivered = await db.orders.count_documents({**meal_query, "status": "delivered"})
        
        summary[meal] = {
            "total": total,
            "pending": pending,
            "out_for_delivery": out_for_delivery,
            "delivered": delivered
        }
    
    return summary

@api_router.put("/delivery-boy/orders/{order_id}/status")
async def update_order_status_by_delivery_boy(
    order_id: str,
    status: str = Query(..., enum=["out_for_delivery", "delivered"]),
    current_user: dict = Depends(get_current_user)
):
    """Update order status by delivery boy (only out_for_delivery or delivered)"""
    if current_user.get("role") != "delivery_boy":
        raise HTTPException(status_code=403, detail="Delivery boy access only")
    
    assigned_zones = current_user.get("assigned_zones", [])
    
    # Verify order belongs to delivery boy's assigned zone
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.get("zone_id") not in assigned_zones:
        raise HTTPException(status_code=403, detail="Order not in your assigned zone")
    
    # Update status and assign delivery boy
    update_doc = {
        "status": status,
        "delivery_boy_id": current_user["id"],
        "delivery_boy_name": current_user["name"]
    }
    
    result = await db.orders.find_one_and_update(
        {"id": order_id},
        {"$set": update_doc},
        return_document=True
    )
    
    return {
        "message": f"Order marked as {status.replace('_', ' ')}",
        "order_id": order_id,
        "status": status
    }

@api_router.get("/delivery-boy/settings")
async def get_delivery_boy_app_settings():
    """Get app settings for delivery boy (help number)"""
    settings = await db.settings.find_one({"type": "app_settings"}, {"_id": 0})
    return {
        "help_number": settings.get("help_number", "") if settings else ""
    }

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
        await db.zones.create_index([("polygon", "2dsphere")])
        await db.users.create_index("login_id", unique=True)
        await db.customers.create_index("customer_id", unique=True)
        await db.orders.create_index([("order_date", -1), ("meal_type", 1)])
        
        # Create default admin if not exists
        admin = await db.users.find_one({"login_id": "admin"})
        if not admin:
            admin_doc = {
                "id": str(uuid.uuid4()),
                "name": "Admin",
                "mobile": "0000000000",
                "login_id": "admin",
                "password_hash": hash_password("admin123"),
                "role": "admin",
                "is_active": True,
                "assigned_zones": [],
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.users.insert_one(admin_doc)
            logger.info("Default admin created: admin / admin123")
        
        logger.info("Database indexes created successfully")
    except Exception as e:
        logger.warning(f"Startup warning: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
