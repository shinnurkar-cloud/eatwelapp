# ZoneBite v2.0 - Subscription Meal Delivery PRD

## Original Problem Statement
Build a subscription-based food delivery application for a single restaurant/cloud kitchen with:
- Admin Web Panel
- Customer Mobile App (Android/iOS) - deferred to Mobile Agent
- Delivery Boy Mobile App - deferred to Mobile Agent

## User Decisions
- **Payment**: Skip for now (manual activation)
- **Image Storage**: Cloudinary (requires API keys)
- **Mobile Apps**: Focus on Admin Panel now, use Mobile Agent later
- **Maps**: Mock implementation for now
- **Order Generation**: Both auto + manual

## Architecture

### Tech Stack
- **Frontend**: React 19 + Tailwind CSS + shadcn/ui
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Authentication**: JWT (ID + Password)

### User Roles
1. **Admin** - Restaurant owner, full access
2. **Delivery Boy** - View/update assigned orders
3. **Customer** - (Mobile app - future)

### API Endpoints
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
| `/api/subscriptions/{id}/pause` | PUT | Pause subscription |
| `/api/subscriptions/{id}/resume` | PUT | Resume subscription |
| `/api/orders` | GET | List orders by meal/status/zone |
| `/api/orders/generate` | POST | Generate orders for meal type |
| `/api/orders/{id}/status` | PUT | Update order status |
| `/api/orders/zone-summary` | GET | Zone-wise order summary |
| `/api/settings` | GET/PUT | App settings |
| `/api/dashboard/stats` | GET | Dashboard statistics |

## Core Features Implemented (v2.0 - January 2026)

### 1. Delivery Boy Management ✅
- Add with Name, Mobile, Login ID, Password
- Activate/Deactivate toggle
- Assign to multiple zones
- View assigned zones

### 2. Combo Management ✅
- Create combos with multiple dishes
- Edit/Delete combos
- Used in subscription plans

### 3. Subscription Plan Management ✅
- Plan Name, Combo selection, Price, Validity (7/15/30 days)
- Image upload (local preview - Cloudinary requires keys)
- Day-wise meal scheduling (Mon-Sun × Breakfast/Lunch/Dinner)

### 4. Zone Management ✅
- Mock map for drawing zones (polygons)
- Zone naming (Zone A, Zone B, etc.)
- Assign delivery boys to zones
- Geo-spatial queries for customer zone assignment

### 5. Order Generation Engine ✅
- Configurable meal timings (Settings)
- Manual generation buttons (Dashboard)
- Auto-generation logic based on:
  - Active subscriptions
  - Non-paused subscriptions
  - Matching day + meal type
- Generates orders once per meal cycle
- Zone-wise order summary

### 6. Dashboard ✅
- Active Subscribers count
- Today's Orders count
- Delivery Boys count
- Delivered vs Pending
- Order generation buttons (Breakfast/Lunch/Dinner)
- Delivery Status progress bar
- Meal Breakdown stats

### 7. Order Management ✅
- View by meal type tabs (Breakfast/Lunch/Dinner)
- Filter by Zone, Status
- Zone-wise combo summary
- Status workflow: Pending → Packed → Out for Delivery → Delivered
- Assign delivery boy

### 8. Customer Management ✅
- Add with Name, Mobile, Password, Address
- Auto-generated Customer ID (CUS0001, CUS0002...)
- Zone auto-assignment based on location
- Search functionality

### 9. Subscription Management ✅
- Activate subscription (manual - payment skipped)
- View active/paused/expired counts
- Pause/Resume functionality
- Start/End date display

### 10. Settings ✅
- Meal Timings configuration
  - Breakfast: 3:00 AM - 9:00 AM
  - Lunch: 9:10 AM - 3:00 PM  
  - Dinner: 3:10 PM - 9:00 PM
- Help Number visible to customers

## What's MOCKED
- **Google Maps API** - Uses canvas-based polygon drawing
- **Cloudinary** - Uses local image preview (no API keys)
- **Payment Gateway** - Manual subscription activation

## Test Credentials
- **Admin Login ID**: admin
- **Admin Password**: admin123

## Prioritized Backlog

### P0 - For Production
- [ ] Google Maps API integration (requires key)
- [ ] Cloudinary API keys for image storage
- [ ] Payment gateway (Stripe/Razorpay)
- [ ] Customer Mobile App (Mobile Agent)
- [ ] Delivery Boy Mobile App (Mobile Agent)

### P1 - High Priority
- [ ] Automatic order generation (cron scheduler)
- [ ] Push notifications
- [ ] Real-time order tracking
- [ ] Payment history

### P2 - Medium Priority
- [ ] Customer app features (plan selection, pause/resume)
- [ ] Delivery boy app features (order view, status update)
- [ ] Route optimization
- [ ] Analytics dashboard

## Next Tasks
1. **Customer Mobile App** - Use Mobile Agent for native Android/iOS
2. **Delivery Boy Mobile App** - Use Mobile Agent for native Android/iOS
3. **Payment Integration** - Integrate Stripe/Razorpay when ready
4. **Google Maps** - Add API key for real geo-fencing
5. **Cloudinary** - Add API keys for image uploads
