# EATWEL - Subscription Meal Delivery PRD

## Original Problem Statement
Build a subscription-based food delivery application for a single restaurant/cloud kitchen with:
- Admin Web Panel ✅
- Customer Mobile App (Android/iOS) - Backend APIs ready, Mobile Agent required for native apps
- Delivery Boy Mobile App - Backend APIs ready, Mobile Agent required for native apps

## User Decisions
- **Payment**: Skip for now (manual activation)
- **Image Storage**: Cloudinary (configured)
- **Mobile Apps**: Backend APIs prepared for Mobile Agent
- **Maps**: Backend provides coordinates, distance, ETA - Google Maps API key pending from user
- **Order Generation**: Automatic scheduler at IST times (3:00 AM, 9:10 AM, 5:00 PM)
- **Zones**: Polygon-based (admin draws boundaries on map)

## Architecture

### Tech Stack
- **Frontend**: React 19 + Tailwind CSS + shadcn/ui
- **Backend**: FastAPI (Python) + APScheduler
- **Database**: MongoDB
- **Authentication**: JWT (ID + Password)
- **Scheduler**: APScheduler for automatic order generation

### User Roles
1. **Admin** - Restaurant owner, full access
2. **Delivery Boy** - View/update assigned orders
3. **Customer** - Mobile app users (self-registration)

## API Endpoints

### Admin APIs
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | Admin/Delivery Boy login |
| `/api/delivery-boys` | GET/POST | Manage delivery personnel |
| `/api/delivery-boys/{id}/status` | PUT | Activate/deactivate |
| `/api/delivery-boys/{id}/zones` | PUT | Assign zones |
| `/api/combos` | GET/POST/PUT/DELETE | Meal combos CRUD |
| `/api/plans` | GET/POST/PUT/DELETE | Subscription plans CRUD |
| `/api/zones` | GET/POST/PUT/DELETE | Delivery zones CRUD |
| `/api/customers` | GET/POST | Customer management |
| `/api/subscriptions` | GET/POST | Subscription management |
| `/api/orders` | GET | List orders by meal/status/zone |
| `/api/orders/generate` | POST | Manual order generation |
| `/api/orders/{id}/status` | PUT | Update order status |
| `/api/banners` | GET/POST/PUT/DELETE | Promotional banners |
| `/api/settings` | GET/PUT | App settings |
| `/api/dashboard/stats` | GET | Dashboard statistics |

### Customer Mobile App APIs ✅ (NEW)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/customer/register` | POST | Customer self-registration |
| `/api/customer/login` | POST | Customer login (CUS ID + Password) |
| `/api/customer/profile` | GET/PUT | Customer profile management |
| `/api/customer/location` | PUT | Update delivery location (drag & drop pin) |
| `/api/customer/check-zone` | POST | Check if location is within delivery zone |
| `/api/customer/zones` | GET | Get all delivery zones with polygons |
| `/api/customer/orders` | GET | Customer's order history |
| `/api/customer/plans` | GET | Available subscription plans |
| `/api/customer/settings` | GET | App settings (help number) |

### Delivery Boy Mobile App APIs ✅ (NEW)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/delivery-boy/login` | POST | Delivery boy login |
| `/api/delivery-boy/profile` | GET | Delivery boy profile |
| `/api/delivery-boy/orders` | GET | Orders for assigned zones (with customer location) |
| `/api/delivery-boy/orders/summary` | GET | Order count summary by meal type |
| `/api/delivery-boy/orders/{id}/status` | PUT | Update order status (out_for_delivery/delivered) |
| `/api/delivery-boy/orders/{id}/route` | GET | Route data with distance & ETA |
| `/api/delivery-boy/next-order` | GET | Next nearest pending order suggestion |
| `/api/delivery-boy/location` | PUT | Update delivery boy's current location |
| `/api/delivery-boy/settings` | GET | App settings (help number) |

## Core Features Implemented

### Admin Panel (v2.0) ✅
1. Delivery Boy Management
2. Combo Management
3. Subscription Plan Management
4. Zone Management (polygon-based)
5. Order Generation Engine (manual + automatic)
6. Dashboard with statistics
7. Order Management
8. Customer Management
9. Subscription Management
10. Settings (meal timings, help number)
11. Banner Management

### Mobile App Backend APIs (v2.1) ✅ (NEW)
1. **Customer App APIs**
   - Self-registration with auto-generated CUS ID
   - Login with customer ID + password
   - Location picker with drag & drop pin
   - Zone availability check (geo-fencing)
   - Profile management

2. **Delivery Boy App APIs**
   - Login with assigned zones
   - View orders with customer location
   - Update order status (Out for Delivery → Delivered)
   - Route data with distance (km) and ETA (minutes)
   - Next nearest order suggestion
   - Real-time location update

3. **Automatic Order Generation** ✅ (NEW)
   - Scheduled using APScheduler (AsyncIOScheduler)
   - Breakfast: 3:00 AM IST
   - Lunch: 9:10 AM IST
   - Dinner: 5:00 PM IST
   - Orders generated based on active subscriptions and meal schedules

4. **Geo-Fencing** ✅ (NEW)
   - Point-in-polygon algorithm for zone detection
   - Haversine formula for distance calculation
   - ETA estimation based on average city speed (20 km/h)

## What's MOCKED
- **Payment Gateway** - Razorpay test API integrated (manual activation still available)

## What's INTEGRATED ✅
- **Google Maps API** - Real map with polygon drawing for zone management
  - Maps JavaScript API
  - Geocoding API
  - Directions API
- **Cloudinary** - Image upload for Banners and Plans
  - Cloud Name: dbatnucbe
  - Signed uploads with backend signature
- **Razorpay** - Test API integrated

## Test Credentials
- **Admin Login ID**: admin
- **Admin Password**: admin123
- **Delivery Boy Login ID**: driver1
- **Delivery Boy Password**: driver123
- **Customer ID**: CUS0002
- **Customer Password**: test123

## Test Data
- **Zone**: Downtown Zone with polygon [[77.58, 12.97], [77.62, 12.97], [77.62, 12.93], [77.58, 12.93]]
- **Inside Zone Location**: [77.60, 12.95]
- **Outside Zone Location**: [77.50, 12.90]

## Prioritized Backlog

### P0 - Ready for Mobile Agent
- [ ] Customer Native Mobile App (iOS/Android)
- [ ] Delivery Boy Native Mobile App (iOS/Android)

### P1 - High Priority
- [ ] Google Maps API integration (user needs to provide key)
- [ ] Payment gateway (Stripe) integration

### P2 - Medium Priority
- [ ] Push notifications
- [ ] Real-time order tracking
- [ ] Payment history
- [ ] Analytics dashboard

## Next Tasks
1. **Native Mobile Apps** - Use Mobile Agent for Customer and Delivery Boy apps
2. **Google Maps API Key** - User to provide for real map functionality
3. **Payment Integration** - Integrate Stripe for subscription payments

## Completed Work (January 28, 2026)
- ✅ Verified existing Delivery Boy APIs
- ✅ Implemented Automatic Order Generation Engine (APScheduler)
- ✅ Added Customer App APIs (registration, login, location, zone check)
- ✅ Enhanced Delivery Boy APIs (route data, next order, location update)
- ✅ Implemented geo-fencing with point-in-polygon algorithm
- ✅ Added distance/ETA calculation using Haversine formula
- ✅ Fixed APScheduler async job execution
- ✅ All APIs tested with 100% pass rate

## Completed Work (January 31, 2026)
- ✅ Fixed Cloudinary image upload bug in Banners.jsx and Plans.jsx
  - Changed from base64 data URLs to proper Cloudinary uploads
  - Uses fetch API instead of axios to avoid CORS issues with Authorization header
  - Images now saved as Cloudinary URLs (https://res.cloudinary.com/dbatnucbe/...)
- ✅ Updated Cloudinary cloud name to correct value (dbatnucbe)
- ✅ Frontend testing passed 100%
