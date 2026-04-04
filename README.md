# MedAxis Africa

**National Prescription Trust Infrastructure — powered by MOSIP Digital ID**

MedAxis eliminates prescription fraud in Morocco and across Africa by anchoring every prescription to a cryptographically verified Digital ID. Doctors, pharmacists, patients, and regulators interact through a unified national ledger — making forgery, duplicate dispensing, and drug abuse structurally impossible.

> Submitted to the **Upanzi Africa Digital ID Hackathon 2026**
> Al Akhawayn University, Ifrane, Morocco — Semi-Finalist (top 24 of 900+ teams)

---

## The Problem

Morocco's paper-based prescription system enables:
- Prescription forgery and reuse across multiple pharmacies
- No real-time doctor license verification at the point of dispensing
- Duplicate dispensing ("pharmacy hopping") for controlled substances
- No national audit trail for regulators
- Insurance reimbursement delays of weeks
- Leakage of controlled substances into illicit markets

## The Solution

MedAxis creates a tamper-proof national prescription ledger. It does **not** replace hospital EMR systems or store clinical records. It stores only prescription metadata, cryptographically linked to verified Digital IDs.

**Why fraud is structurally impossible:**
1. Only licensed, verified doctors can issue prescriptions
2. Every prescription is cryptographically signed and linked to a patient CNIE hash
3. Pharmacists verify doctor license, prescription validity, and patient identity before dispensing
4. Every dispensing event is logged and immutable
5. Insurance claims are automatically validated against the ledger

---

## Features

| # | Feature | Status |
|---|---------|--------|
| 1 | Doctor authenticates via MOSIP eSignet | ✅ |
| 2 | Doctor issues prescription linked to patient CNIE | ✅ |
| 3 | Pharmacist authenticates via MOSIP eSignet | ✅ |
| 4 | Pharmacist looks up patient by CNIE | ✅ |
| 5 | Three-check verification: Licensed Doctor verification + Prescription validity + Patient verification | ✅ |
| 6 | Pharmacist confirms dispensing — prescription marked DISPENSED permanently | ✅ |
| 7 | Patient portal: prescription history + dispute + access to Inji wallet | ✅ |
| 8 | Regulator dashboard: national stats, audit trail, license management | ✅ |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite 8 |
| Backend | Node.js 20 + Express 5 |
| Database | SQLite via Prisma 7 + better-sqlite3 |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Identity | MOSIP eSignet (OIDC) + Inji Verify SDK |

---

## Project Structure

```
medaxis-africa/
├── frontend/                    # React 19 + Vite frontend
│   ├── src/
│   │   ├── portals/
│   │   │   ├── login/           # Login — eSignet OIDC + demo credentials
│   │   │   ├── doctor/          # Doctor workspace
│   │   │   ├── pharmacy/        # Pharmacy dispensing portal + verification screen
│   │   │   ├── patient/         # Patient prescription history
│   │   │   └── regulator/       # National audit dashboard (4 view files)
│   │   ├── components/          # Layout, ProtectedRoute, Toast
│   │   ├── api/                 # Axios API clients per domain
│   │   ├── hooks/               # useAuth context (JWT in memory)
│   │   └── utils/               # CNIE SHA-256 hashing
│   └── public/
├── backend/                     # Node.js + Express API
│   ├── src/
│   │   ├── routes/              # Auth, prescriptions, pharmacy, regulator, insurance
│   │   ├── controllers/         # Business logic per route group
│   │   ├── middleware/          # JWT auth, RBAC, audit logging, error handling
│   │   ├── services/            # eSignet + Inji Certify integrations
│   │   └── utils/               # Prisma client, hashing, response helpers
│   └── prisma/
│       ├── schema.prisma        # Full data model
│       ├── seed.js              # Demo account seeder
│       └── medaxis.db           # SQLite database
├── docs/
│   └── designs/                 # UI mockups for all portals
├── CLAUDE.md                    # Developer reference
└── README.md
```

---

## Prerequisites

- **Node.js** v20 or later — [nodejs.org](https://nodejs.org)
- **npm** v9 or later (bundled with Node.js)
- **Git**

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/ilyassr01zz/MedAxis-Africa.git
cd MedAxis-Africa
```

---

### 2. Backend setup

```bash
cd backend
npm install
```

Create a `.env` file inside `backend/`:

```env
PORT=3005
DATABASE_URL=file:./prisma/medaxis.db
JWT_SECRET=medaxis-dev-secret-change-in-production
JWT_EXPIRES_IN=8h
ESIGNET_BASE_URL=http://localhost:8088
NODE_ENV=development
```

Run database migrations and seed demo data:

```bash
npm run setup
```

> This runs `prisma migrate dev` then seeds the database with demo accounts and a sample prescription.

Start the backend dev server:

```bash
npm run dev
```

Backend is now running at **http://localhost:3005**

---

### 3. Frontend setup

Open a new terminal tab/window:

```bash
cd frontend
npm install
```

Create a `.env` file inside `frontend/`:

```env
VITE_API_URL=http://localhost:3001/api
VITE_APP_NAME=MedAxis
```

Start the frontend dev server:

```bash
npm run dev
```

Frontend is now running at **http://localhost:5173**

Open your browser at [http://localhost:5173](http://localhost:5173)

---

### 4. (Optional) MOSIP eSignet mock server

For the **Sign in with Digital ID** button to appear on the login page, the MOSIP eSignet mock server must be running on port `3007`. Without it, the standard username/password login works fully for all demo roles.

---

## Demo Credentials

After running `npm run setup` in the backend, these accounts are ready:

| Role | CNIE (Username) | Password | Portal |
|------|----------------|----------|--------|
| Doctor | `DOCTOR001` | `password123` | `/doctor` |
| Pharmacist | `PHARM001` | `password123` | `/pharmacy` |
| Patient | `PATIENT001` | `password123` | `/patient` |
| Regulator | `REGULATOR001` | `password123` | `/regulator` |

**Demo prescription:** `RX-DEMO-0001` — Amoxicillin 500mg, status ACTIVE, linked to Patient `PATIENT001`

---

## Demo Flow (3 Minutes)

1. **Sign in as Doctor** (`DOCTOR001 / password123`) → issue a new prescription for patient CNIE `PATIENT001`
2. **Sign in as Pharmacist** (`PHARM001 / password123`) → Patient Lookup → enter `PATIENT001` → see active prescription
3. **Verification screen** shows three checks: Doctor VC valid ✓ / Prescription valid ✓ / Patient OTP confirmed ✓
4. **Confirm Dispense** → prescription becomes `DISPENSED`, permanently locked
5. **Sign in as Regulator** (`REGULATOR001 / password123`) → view national audit trail, doctor license registry, statistics

---

## Portals

| Portal | Route | Role Required |
|--------|-------|--------------|
| Login | `/` | Public |
| Doctor Workspace | `/doctor` | DOCTOR |
| Pharmacy Workspace | `/pharmacy` | PHARMACIST |
| Verification Screen | `/pharmacy/verify/:rxId` | PHARMACIST |
| Patient Portal | `/patient` | PATIENT |
| Regulator Dashboard | `/regulator` | REGULATOR |

---

## API Overview

All endpoints prefixed `/api/`. All responses: `{ success, data, error }`.

```
POST   /api/auth/login
POST   /api/auth/esignet/callback
GET    /api/auth/me
POST   /api/auth/send-otp
POST   /api/auth/verify-otp

GET    /api/patients/search?cnie=xxx

POST   /api/prescriptions
GET    /api/prescriptions/my
GET    /api/prescriptions/by-patient/:cnie_hash
PATCH  /api/prescriptions/:rx_id/cancel
POST   /api/prescriptions/:rx_id/dispense
POST   /api/prescriptions/:rx_id/dispute
GET    /api/prescriptions/patient-view

GET    /api/regulator/stats
GET    /api/regulator/prescriptions
GET    /api/regulator/doctors
PATCH  /api/regulator/doctors/:doctor_id/approve
PATCH  /api/regulator/doctors/:doctor_id/revoke
GET    /api/regulator/disputes
PATCH  /api/regulator/disputes/:rx_id/review

POST   /api/insurance/claims
GET    /api/insurance/claims
```

---

## Privacy by Design

- Raw CNIE numbers are **never stored** — only SHA-256 hashes
- Raw phone numbers are **never stored** — only hashes
- No biometric data is stored anywhere
- No clinical notes or diagnoses are stored
- JWT tokens live in memory only — never in `localStorage`
- Every state-changing API call writes an immutable entry to the `AuditLog` table
- RBAC enforced at every endpoint; unauthorized access returns HTTP 403 with no data leak

---

## Team

**Al Akhawayn University, Ifrane, Morocco**

- Ilyass Lhafi — i.lhafi@aui.ma
- Lina Lassri — l.lassri@aui.ma
- Youssef Assemlali — y.assemlali@aui.ma
- Salma Essagar — s.essagar@aui.ma

*Academic Patron: Houda Chakiri*

---

## Hackathon

| | |
|-|-|
| Competition | Upanzi Africa Digital ID Hackathon 2026 |
| University | Al Akhawayn University, Ifrane, Morocco |
| Pitch deadline | April 5, 2026 — AUI Demo Day |
| Continental finals | ID4Africa 2026, Côte d'Ivoire, May 12–15, 2026 |
