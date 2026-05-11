# HospitalOS — Backend API

REST API for a full stack hospital operations platform. Built with Node.js, Express, and TypeScript. Features JWT authentication with role-based access control, PostgreSQL database, real-time WebSocket notifications, and Cloudflare R2 file storage. Deployed on Railway.

**Live API:** https://hospital-ops-backend-production.up.railway.app

**Frontend Repo:** https://github.com/DimePrangija/Hospital-Ops-Frontend

---

## Features

- **JWT Authentication** with bcrypt password hashing and role-based middleware (admin, doctor, billing)
- **Patient Registry** — full CRUD with PostgreSQL, searchable by name and medical record number
- **Claims Management** — role-filtered at the SQL level, with approve, deny, and appeal endpoints
- **Document Uploads** — Multer handles file intake, Cloudflare R2 handles cloud storage
- **Real-Time Notifications** — WebSocket server maps user IDs to open connections and pushes live events on claim status changes
- **Persistent Notifications** — all notifications written to PostgreSQL with read/unread tracking

---

## Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express |
| Language | TypeScript |
| Database | PostgreSQL (Railway) |
| Auth | JWT + bcrypt |
| File Storage | Cloudflare R2 (S3-compatible) |
| Real-time | ws (WebSocket library) |
| Deployment | Railway |

---

## API Reference

### Auth
```
POST   /api/auth/register     Create a new user account
POST   /api/auth/login        Login and receive a JWT token
GET    /api/auth/me           Get the current authenticated user
```

### Patients
```
GET    /api/patients          List all patients (optional ?search=)
GET    /api/patients/:id      Get a patient with their claims and documents
POST   /api/patients          Create a patient (admin, doctor only)
PATCH  /api/patients/:id      Update a patient (admin only)
DELETE /api/patients/:id      Delete a patient (admin only)
```

### Claims
```
GET    /api/claims            List claims (role-filtered, optional ?status=)
GET    /api/claims/:id        Get a single claim
POST   /api/claims            Submit a claim (admin, billing only)
PATCH  /api/claims/:id/approve   Approve a claim (admin, billing only)
PATCH  /api/claims/:id/deny      Deny a claim (admin, billing only)
PATCH  /api/claims/:id/appeal    Flag for appeal (all roles)
```

### Documents
```
GET    /api/documents/:patientId    List documents for a patient
POST   /api/documents/upload        Upload a document (multipart/form-data)
```

### Notifications
```
GET    /api/notifications            Get all notifications for current user
PATCH  /api/notifications/:id/read   Mark a notification as read
PATCH  /api/notifications/read-all   Mark all notifications as read
```

### WebSocket
```
WS     /?token=JWT    Connect with JWT in query string
```

---

## Database Schema

```
users
  id, email, password_hash, name, role, created_at

patients
  id, name, date_of_birth, email, phone, address,
  insurance_provider, insurance_id, medical_record_number,
  created_by → users.id, created_at

claims
  id, patient_id → patients.id, submitted_by → users.id,
  diagnosis_code, description, amount, status, created_at, updated_at

documents
  id, patient_id → patients.id, uploaded_by → users.id,
  file_name, file_url, file_type, doc_type, created_at

notifications
  id, user_id → users.id, message, type, read, metadata, created_at
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A PostgreSQL database (Railway recommended)
- A Cloudflare R2 bucket for file storage

### Installation

```bash
git clone https://github.com/DimePrangija/Hospital-Ops-Backend.git
cd Hospital-Ops-Backend
npm install
```

### Environment Variables

Create a `.env` file in the root:

```env
PORT=3001
DATABASE_URL=postgresql://user:password@host:5432/dbname
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:3000

R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=your_bucket_name
R2_PUBLIC_URL=https://your-bucket.r2.dev
```

### Run Migration

```bash
npm run migrate
```

### Run Locally

```bash
npm run dev
```

Server runs on [http://localhost:3001](http://localhost:3001)

### Build for Production

```bash
npm run build
npm start
```

---

## Project Structure

```
src/
├── db/
│   ├── client.ts              ← PostgreSQL connection pool
│   ├── migrate.ts             ← Migration runner
│   └── migrations/
│       └── 001_init.sql       ← All table definitions
├── middleware/
│   ├── auth.ts                ← JWT verification
│   └── role.ts                ← Role-based access control
├── routes/
│   ├── auth.ts
│   ├── patients.ts
│   ├── claims.ts
│   ├── documents.ts
│   └── notifications.ts
├── services/
│   ├── r2.ts                  ← Cloudflare R2 upload helper
│   └── websocket.ts           ← WebSocket connection manager
├── types/
│   └── index.ts               ← Shared TypeScript types
└── index.ts                   ← Express app + WebSocket server
```

---

## Role Permissions

| Action | Admin | Doctor | Billing |
|---|---|---|---|
| Register / Login | ✅ | ✅ | ✅ |
| View patients | ✅ | ✅ | ✅ |
| Create patients | ✅ | ✅ | ❌ |
| Delete patients | ✅ | ❌ | ❌ |
| View all claims | ✅ | ❌ | ✅ |
| View own patients' claims | ✅ | ✅ | ✅ |
| Submit claims | ✅ | ❌ | ✅ |
| Approve / Deny claims | ✅ | ❌ | ✅ |
| Appeal claims | ✅ | ✅ | ✅ |
| Upload documents | ✅ | ✅ | ✅ |

---

## Deployment

Deployed on Railway alongside a PostgreSQL database instance. Environment variables are set in the Railway dashboard under the Variables tab.

For the `DATABASE_URL` in production, use the internal Railway URL (`postgres.railway.internal`) so the two services communicate privately within Railway's network.

---

## Related

- [Frontend Repo](https://github.com/DimePrangija/Hospital-Ops-Frontend) — Next.js + Tailwind CSS + Vercel
