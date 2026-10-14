# FERMS — Fire Emergency Response Management System

**FERMS** is a full-stack emergency response management platform designed for city emergency operations centers, fire stations, dispatchers, field firefighters, citizens, and data analysts.

---

## 🏛️ System Architecture

```text
React 19 Frontend (Vite)                Node.js + Express REST API
(http://localhost:5173)                 (http://localhost:5000)
┌──────────────────────┐                ┌──────────────────────────────┐
│  • Incident Reports  │                │  • JWT Auth & RBAC           │
│  • Triage & Dispatch │──[REST API]───▶│  • Incident Lifecycle        │
│  • Field Operations  │  (Bearer JWT)  │  • Unit & Dispatch Logic     │
│  • Analytics Charts  │                │  • Live Telemetry Feeds      │
│  • Real-Time Feeds   │                │  • CSV / PDF Report Gen      │
└──────────────────────┘                └──────────────┬───────────────┘
                                                       │
                                                 [Prisma ORM]
                                                       │
                                                       ▼
                                        Relational Database (dev.db / PostgreSQL)
                                        ┌──────────────────────────────┐
                                        │  Users · Stations · Units    │
                                        │  Incidents · Audit Logs      │
                                        │  Dispatches · Notifications  │
                                        └──────────────────────────────┘
```

---

## 🚀 How to Run the Complete System

### 1. Start the Backend API & Database

```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run seed     # Seeds realistic Mumbai emergency stations, units, incidents & users
npm start        # Starts backend API on http://localhost:5000
```

Verify backend health at: `http://localhost:5000/api/health`

### 2. Start the Frontend Application

```bash
# In the root repository directory:
npm install
npm run dev      # Starts Vite React dev server on http://localhost:5173
```

Open `http://localhost:5173` in your browser.

---

## 🔐 Demo Credentials

The database comes pre-seeded with accounts for all five system roles:

| Role | Email | Password | Primary Purpose |
|---|---|---|---|
| **Administrator** | `admin@ferms.gov.in` | `admin123` | Fleet management, stations, user administration |
| **Dispatcher** | `dispatcher@ferms.gov.in` | `dispatch123` | Incident triage, verification, and multi-unit dispatch |
| **Field Officer** | `officer@ferms.gov.in` | `officer123` | Mobile field operations, status progression, navigation |
| **Citizen** | `citizen@example.com` | `citizen123` | Emergency reporting and personal report tracking |
| **Analyst** | `analyst@ferms.gov.in` | `analyst123` | KPIs, regional analytics, CSV & PDF export reports |

*Click any role button on the login screen for instant demo sign-in.*

---

## 🏗️ Project Structure

```text
ferms/
├── backend/                           # Node.js + Express API Backend
│   ├── prisma/
│   │   ├── schema.prisma              # Relational schema (Users, Stations, Units, Incidents, etc.)
│   │   └── seed.js                    # Seeding script with bcrypt hashes
│   ├── src/
│   │   ├── server.js                  # Server entry point
│   │   ├── app.js                     # Express app setup with Helmet, CORS & Rate limiting
│   │   ├── config/                    # Environment & Prisma client instances
│   │   ├── middleware/                # JWT auth, RBAC permissions, error & validation
│   │   ├── controllers/               # Express request/response handlers
│   │   ├── services/                  # Business logic, transactions, and audit logging
│   │   ├── routes/                    # API route definitions
│   │   └── utils/                     # JWT signing, Haversine distance, and ID generator
│   ├── tests/
│   │   └── backend.test.js            # Automated integration tests (23 tests)
│   ├── .env                           # Environment configuration
│   └── package.json
│
├── src/                               # React Frontend
│   ├── services/                      # Service layer calling real REST endpoints
│   │   ├── api.js                     # Centralized API client with JWT injection
│   │   ├── incidentService.js         # Calls /api/incidents
│   │   ├── unitService.js             # Calls /api/units
│   │   ├── userService.js             # Calls /api/users and /api/auth
│   │   ├── stationService.js          # Calls /api/stations
│   │   ├── notificationService.js     # Calls /api/notifications
│   │   └── analyticsService.js        # Calls /api/analytics
│   ├── pages/                         # All 17 role-based pages
│   ├── components/                    # Reusable UI components
│   ├── layouts/                       # Main layout with Sidebar and TopNavbar
│   ├── context/                       # AuthContext and ToastContext
│   ├── routes/                        # ProtectedRoute with RBAC checks
│   └── utils/                         # Date, badge colors, and distance utilities
│
├── test-services.mjs                  # Frontend service integration tests (17 tests)
├── test-e2e.mjs                       # Puppeteer end-to-end browser tests (10 tests)
└── package.json
```

---

## 🧪 Testing Suites

### 1. Backend Integration Tests (23/23 PASS)
Tests authentication, RBAC, strict status transitions, multi-unit atomic dispatching, notifications, CSV/PDF report streams, and GPS telemetry:
```bash
cd backend
npm test
```

### 2. Frontend Service Layer Tests (17/17 PASS)
Tests that all frontend services communicate properly with the backend REST endpoints:
```bash
node test-services.mjs
```

### 3. Headless Chrome End-to-End Tests (10/10 PASS)
Tests complete browser user journeys across all 5 roles:
```bash
node test-e2e.mjs
```

### 4. Production Build Verification
```bash
npm run build
npm run lint
```

---

## 📡 Key REST Endpoints

- `POST /api/auth/login` — Authenticate and receive JWT token
- `POST /api/auth/demo-login` — Demo role authentication
- `GET /api/incidents` — List incidents with filters (`severity`, `status`, `type`, `search`)
- `POST /api/incidents` — Create incident (assigns sequential `INC-YYYY-XXXX` ID)
- `POST /api/incidents/:id/verify` — Dispatcher triage verification
- `POST /api/incidents/:id/dispatch` — Multi-unit atomic dispatch transaction
- `PATCH /api/incidents/:id/status` — Lifecycle transition enforcement:
  `Reported` → `Verified` → `Dispatched` → `En Route` → `On-Site` → `Contained` → `Resolved` → `Archived`
- `GET /api/units/available` — Query units ready for dispatch
- `GET /api/stations` — List fire stations with live unit counts
- `GET /api/notifications` — Role-scoped emergency notifications
- `GET /api/analytics` — Complete aggregations for Recharts visualizations
- `GET /api/analytics/export?format=csv` — Live CSV report download
- `GET /api/analytics/export?format=pdf` — Official PDF report document generation

---

## ⚠️ Prototype Disclaimer

**FERMS is an academic software engineering prototype developed for demonstration.**  
It is NOT connected to actual emergency services. For real emergencies in India, dial **101** (Fire) or **112** (National Emergency Response).
