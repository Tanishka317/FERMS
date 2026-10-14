# FERMS Backend API — Fire Emergency Response Management System

Production-grade REST API backend for the **FERMS** platform built with Node.js, Express, Prisma ORM, and JWT authentication.

---

## 🏛️ Architecture Overview

```text
React Frontend (Vite)
      │
      │ HTTP / REST API (Bearer JWT)
      ▼
Express.js Backend (port 5000)
      │
      ├── Authentication & Authorization (JWT + RBAC Middleware)
      ├── Security (Helmet, CORS, Rate Limiting)
      ├── Validation (Zod Schemas)
      │
      ├── Routes & Controllers
      │     ├── /api/auth          (Login, Demo-Login, Current User)
      │     ├── /api/incidents     (CRUD, 8-Stage Lifecycle, Verification, Dispatch)
      │     ├── /api/units         (Fleet Status, Telemetry, Availability)
      │     ├── /api/stations      (Station Infrastructure)
      │     ├── /api/users         (User Directory & Administration)
      │     ├── /api/notifications (Role-Scoped Alerts & Read State)
      │     ├── /api/tracking      (Live Incident & Fleet GPS Feeds)
      │     └── /api/analytics     (KPIs, Aggregations, CSV & PDF Exports)
      │
      └── Prisma ORM Client
            │
            ▼
      Relational Database (SQLite dev.db / PostgreSQL)
            ├── User
            ├── FireStation
            ├── FireUnit
            ├── Incident
            ├── IncidentActivity (Audit Log)
            ├── Dispatch (Transaction History)
            └── Notification
```

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

```env
PORT=5000
NODE_ENV=development
DATABASE_URL="file:./dev.db"
JWT_SECRET="ferms-super-secure-production-jwt-secret-key-2026"
JWT_EXPIRES_IN="24h"
FRONTEND_URL="http://localhost:5173"
```

> **PostgreSQL Configuration**: To switch to PostgreSQL in production, set:
> ```env
> DATABASE_URL="postgresql://postgres:password@localhost:5432/ferms_db?schema=public"
> ```
> and update `provider = "postgresql"` in `prisma/schema.prisma`.

### 3. Generate Prisma Client & Migrate Database
```bash
npx prisma generate
npx prisma db push
```

### 4. Seed Initial Production / Demo Records
```bash
npm run seed
```

### 5. Start the Server
```bash
# Production mode
npm start

# Development mode with hot watch
npm run dev
```

---

## 🔐 Demo Credentials (Development & Review)

| Role | Email | Password | Permissions |
|---|---|---|---|
| **Administrator** | `admin@ferms.gov.in` | `admin123` | Full system access, User admin, Stations, All Incidents |
| **Dispatcher** | `dispatcher@ferms.gov.in` | `dispatch123` | Triage, Verify, Dispatch units, Live tracking, Incidents |
| **Field Officer** | `officer@ferms.gov.in` | `officer123` | Field missions, Status updates, Location updates |
| **Citizen** | `citizen@example.com` | `citizen123` | Incident reporting, Track own reports |
| **Analyst** | `analyst@ferms.gov.in` | `analyst123` | Analytics dashboard, Reports, CSV/PDF exports |

---

## 📡 API Reference Documentation

### Authentication (`/api/auth`)
| Method | Endpoint | Auth | Allowed Roles | Description |
|---|---|---|---|---|
| `POST` | `/api/auth/login` | None | Public | Login with email and password, returns JWT token |
| `POST` | `/api/auth/demo-login` | None | Public | Instant prototype login by selecting role |
| `GET` | `/api/auth/me` | Bearer JWT | All | Get current authenticated user profile |
| `POST` | `/api/auth/logout` | Bearer JWT | All | Invalidate session |

### Incidents (`/api/incidents`)
| Method | Endpoint | Auth | Allowed Roles | Description |
|---|---|---|---|---|
| `GET` | `/api/incidents` | Bearer JWT | All | List incidents with filters (`status`, `severity`, `type`, `search`, `myReports`) |
| `GET` | `/api/incidents/stats` | Bearer JWT | All | Dashboard KPI metrics (active, critical, today) |
| `GET` | `/api/incidents/:id` | Bearer JWT | All | Get single incident with activity logs & assigned units |
| `POST` | `/api/incidents` | Bearer JWT | All | Create new fire incident report (auto INC-YYYY-XXXX) |
| `PATCH` | `/api/incidents/:id` | Bearer JWT | Admin, Dispatcher, Officer | Update incident details |
| `PATCH` | `/api/incidents/:id/status`| Bearer JWT | Admin, Dispatcher, Officer | Transition incident status along strict workflow |
| `POST` | `/api/incidents/:id/verify` | Bearer JWT | Admin, Dispatcher | Verify incident in triage queue |
| `POST` | `/api/incidents/:id/dispatch`| Bearer JWT | Admin, Dispatcher | Assign and dispatch units atomically via transaction |

#### Incident Lifecycle Enforcement:
```text
Reported → Verified → Dispatched → En Route → On-Site → Contained → Resolved → Archived
```
*Invalid status jumps (e.g. `Reported → Resolved`) are rejected with `400 Bad Request`.*

### Fire Units (`/api/units`)
| Method | Endpoint | Auth | Allowed Roles | Description |
|---|---|---|---|---|
| `GET` | `/api/units` | Bearer JWT | All | List fire units with filters (`status`, `stationId`, `type`) |
| `GET` | `/api/units/available` | Bearer JWT | All | List currently available units |
| `GET` | `/api/units/stats` | Bearer JWT | All | Fleet status counts (available, dispatched, maintenance) |
| `GET` | `/api/units/:id` | Bearer JWT | All | Get unit details, crew, and dispatch history |
| `PATCH`| `/api/units/:id/status` | Bearer JWT | Admin, Dispatcher, Officer | Update unit status |
| `PATCH`| `/api/units/:id/location` | Bearer JWT | Admin, Dispatcher, Officer | Update unit GPS coordinates |

### Fire Stations (`/api/stations`)
| Method | Endpoint | Auth | Allowed Roles | Description |
|---|---|---|---|---|
| `GET` | `/api/stations` | Bearer JWT | All | List all fire stations with live available unit counts |
| `GET` | `/api/stations/:id` | Bearer JWT | All | Get station details and housed fleet |
| `POST` | `/api/stations` | Bearer JWT | Administrator | Create a new fire station |
| `PATCH`| `/api/stations/:id` | Bearer JWT | Administrator | Update station information |
| `DELETE`|`/api/stations/:id` | Bearer JWT | Administrator | Delete station |

### Users (`/api/users`)
| Method | Endpoint | Auth | Allowed Roles | Description |
|---|---|---|---|---|
| `GET` | `/api/users` | Bearer JWT | Admin, Dispatcher, Analyst | List system users |
| `GET` | `/api/users/:id` | Bearer JWT | Admin, Dispatcher, Analyst | Get user profile |
| `POST` | `/api/users` | Bearer JWT | Administrator | Create new system user |
| `PATCH`| `/api/users/:id` | Bearer JWT | Administrator | Update user details |
| `PATCH`| `/api/users/:id/deactivate`| Bearer JWT | Administrator | Deactivate user account |

### Notifications (`/api/notifications`)
| Method | Endpoint | Auth | Allowed Roles | Description |
|---|---|---|---|---|
| `GET` | `/api/notifications` | Bearer JWT | All | List notifications scoped to caller's role |
| `GET` | `/api/notifications/unread-count`| Bearer JWT | All | Get unread notification badge count |
| `PATCH`| `/api/notifications/:id/read` | Bearer JWT | All | Mark notification as read |
| `POST` | `/api/notifications/mark-all-read`| Bearer JWT | All | Mark all notifications as read |
| `POST` | `/api/notifications` | Bearer JWT | Admin, Dispatcher | Broadcast system notification |

### Analytics & Reports (`/api/analytics`)
| Method | Endpoint | Auth | Allowed Roles | Description |
|---|---|---|---|---|
| `GET` | `/api/analytics` | Bearer JWT | All | Complete aggregated analytics dataset |
| `GET` | `/api/analytics/summary` | Bearer JWT | All | KPI metric summary card values |
| `GET` | `/api/analytics/incidents-per-day` | Bearer JWT | All | Daily incident counts |
| `GET` | `/api/analytics/by-severity` | Bearer JWT | All | Incident severity distribution |
| `GET` | `/api/analytics/by-region` | Bearer JWT | All | Regional incident distribution |
| `GET` | `/api/analytics/response-time` | Bearer JWT | All | Regional response time averages |
| `GET` | `/api/analytics/unit-utilization` | Bearer JWT | All | Fleet unit utilization percentages |
| `GET` | `/api/analytics/resolution-time` | Bearer JWT | All | Average resolution times by incident type |
| `GET` | `/api/analytics/monthly-trend` | Bearer JWT | All | Monthly historical trend |
| `GET` | `/api/analytics/export?format=csv` | Bearer JWT | All | Download live incident data as CSV |
| `GET` | `/api/analytics/export?format=pdf` | Bearer JWT | All | Download official report document as PDF |

### Live Tracking (`/api/tracking`)
| Method | Endpoint | Auth | Allowed Roles | Description |
|---|---|---|---|---|
| `GET` | `/api/tracking/incidents` | Bearer JWT | All | Active incidents with coordinates |
| `GET` | `/api/tracking/units` | Bearer JWT | All | Active unit fleet locations and status |
| `PATCH`| `/api/tracking/units/:id/location` | Bearer JWT | Admin, Dispatcher, Officer | Update unit GPS coordinates |

---

## 🧪 Testing

Run automated tests:
```bash
# Run backend API integration tests (23 tests)
npm test
```
