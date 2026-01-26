# ZoneBite - Food Delivery Admin Dashboard PRD

## Original Problem Statement
Build a food delivery app with Google Maps integration for Geo-fencing for zones to deliver with Admin login to web and delivery boy, user login to mobile app.

## User Decisions
- **Authentication**: JWT-based custom auth
- **Maps**: Mock implementation (Google Maps API ready when key provided)
- **Payments**: Cash on delivery (Stripe can be added later)
- **Platform**: Admin web dashboard (mobile apps via Mobile Agent)

## Architecture

### Tech Stack
- **Frontend**: React 19 + Tailwind CSS + shadcn/ui
- **Backend**: FastAPI (Python)
- **Database**: MongoDB with 2dsphere indexes for geo-spatial queries
- **Authentication**: JWT tokens (24hr expiry)

### API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Register new user |
| `/api/auth/login` | POST | Login and get JWT token |
| `/api/auth/me` | GET | Get current user |
| `/api/zones` | GET/POST | List/create delivery zones |
| `/api/zones/{id}` | PUT/DELETE | Update/delete zone |
| `/api/zones/check-delivery` | POST | Check if location is deliverable |
| `/api/restaurants` | GET/POST | List/create restaurants |
| `/api/restaurants/{id}` | GET/PUT/DELETE | Restaurant CRUD |
| `/api/menu-items` | GET/POST | List/create menu items |
| `/api/menu-items/{id}` | PUT/DELETE | Menu item CRUD |
| `/api/orders` | GET/POST | List/create orders |
| `/api/orders/{id}/status` | PUT | Update order status |
| `/api/delivery-boys` | GET/POST | List/create delivery boys |
| `/api/delivery-boys/{id}/availability` | PUT | Toggle availability |
| `/api/customers` | GET | List customers |
| `/api/dashboard/stats` | GET | Dashboard statistics |
| `/api/dashboard/recent-orders` | GET | Recent orders |

## User Personas

### Admin
- Restaurant chain owners/managers
- Operations managers
- Manages all aspects: zones, restaurants, orders, delivery personnel

### Delivery Boy (Future Mobile App)
- Accepts/rejects delivery assignments
- Updates delivery status
- Views assigned orders

### Customer (Future Mobile App)
- Browses restaurants and menus
- Places orders
- Tracks delivery status

## Core Requirements (Static)
1. ✅ Admin authentication (JWT)
2. ✅ Delivery zone management with geo-fencing
3. ✅ Restaurant management
4. ✅ Menu item management
5. ✅ Order management with status tracking
6. ✅ Delivery boy management
7. ✅ Customer management
8. ✅ Dashboard with real-time stats

## What's Been Implemented (v1.0 - January 2026)

### Backend
- Complete REST API with FastAPI
- JWT authentication with bcrypt password hashing
- MongoDB models with geo-spatial indexes
- CRUD operations for all entities
- Order status workflow (pending → confirmed → preparing → out_for_delivery → delivered)
- Dashboard statistics aggregation

### Frontend Pages
1. **Login/Register** - JWT auth with form validation
2. **Dashboard** - Bento grid with stats, recent orders
3. **Delivery Zones** - Mock map with polygon drawing, zone CRUD
4. **Restaurants** - Restaurant cards with CRUD operations
5. **Menu Items** - Menu management with category filtering
6. **Orders** - Order list with status updates, delivery boy assignment
7. **Delivery Boys** - Personnel management, availability toggle
8. **Customers** - Customer list with search

### Design System
- Dark theme (#09090B background)
- Electric Orange (#FF4F00) primary color
- Volt Blue (#007AFF) accent for logistics
- Barlow Condensed + JetBrains Mono + Inter fonts
- Glassmorphism sidebar
- Status badges with color coding

## Prioritized Backlog

### P0 - Critical (For Production)
- [ ] Google Maps API integration (requires API key)
- [ ] Real-time order notifications
- [ ] Order payment processing

### P1 - High Priority
- [ ] Push notifications for delivery updates
- [ ] Delivery boy location tracking
- [ ] Order assignment algorithm
- [ ] Restaurant operating hours

### P2 - Medium Priority
- [ ] Customer reviews and ratings
- [ ] Promo codes and discounts
- [ ] Analytics dashboard
- [ ] Multi-language support

### P3 - Nice to Have
- [ ] AI-powered delivery time estimation
- [ ] Route optimization
- [ ] Customer loyalty program

## Next Tasks
1. Get Google Maps API key from user for real map integration
2. Build mobile apps using Mobile Agent for User and Delivery Boy
3. Add Stripe payment integration
4. Implement real-time order tracking with WebSockets

## Test Credentials
- **Admin Email**: admin@zonebite.com
- **Admin Password**: admin123
