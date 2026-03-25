# MedAxis Africa — CLAUDE.md
# Single source of truth for Claude Code. Read this entire file before doing anything.

---

## What This Project Is

MedAxis is a national prescription trust infrastructure for Morocco and Africa..
It anchors every prescription to a verified Digital ID via MOSIP eSignet.
It is NOT an EMR system. It does NOT store clinical records or biometrics.
It creates a tamper-proof national prescription ledger.

Hackathon: Upanzi Africa Digital ID Hackathon 2026
University: Al Akhawayn University, Ifrane, Morocco
Pitch deadline: April 5, 2026 (demo at AUI)
Continental finals: ID4Africa 2026, Côte d'Ivoire, May 12-15

Team:
- Ilyass Lhafi (i.lhafi@aui.ma)
- Lina Lassri (l.lassri@aui.ma)
- Youssef Assemlali (y.assemlali@aui.ma)
- Salma Essagar (s.essagar@aui.ma)

---

## Problem We Are Solving

In Morocco and across Africa, paper-based prescriptions enable:
- Forgery and reuse of prescriptions
- Pharmacists cannot verify doctor licensing instantly
- Duplicate dispensing (pharmacy hopping)
- No national audit trail for regulators
- Patients pay full price upfront, wait weeks for insurance reimbursement
- Drug abuse and leakage of controlled substances

---

## Solution

MedAxis creates a secure national prescription trust layer.
It does NOT replace hospital systems.
It does NOT centralize medical records.
It does NOT store biometrics or clinical notes.

Prescription fraud is structurally impossible because:
1. Only verified licensed doctors can issue prescriptions
2. Every prescription is cryptographically signed and linked to patient Digital ID
3. Pharmacists verify doctor license, prescription validity, and patient identity before dispensing
4. Every dispensing event is logged and immutable
5. Insurance claims are automatically validated against the ledger

---

## The 6 Core Demo Features — Build ONLY These First

1. Doctor logs in via eSignet mock → authenticated with role DOCTOR
2. Doctor creates prescription → stored in SQLite linked to patient CNIE hash
3. Pharmacist logs in via eSignet mock → authenticated with role PHARMACIST
4. Pharmacist enters patient CNIE → sees all active prescriptions for that patient
5. System shows three-check verification screen (Doctor VC valid / Prescription valid / Patient OTP verified)
6. Pharmacist confirms dispensing → prescription marked DISPENSED, cannot be reused

Everything else is stretch. Do not build beyond these 6 until all 6 work perfectly.

---

## Core User Flow (The Demo Script)

1. Doctor authenticates → fills prescription form → RxID stored linked to patient CNIE
2. Patient walks to pharmacy with only their CNIE card
3. Pharmacist enters patient CNIE → system retrieves active prescriptions
4. System auto-verifies: doctor VC valid + prescription not expired/dispensed + patient OTP confirmed
5. Three green checkmarks → pharmacist confirms dispensing
6. Prescription status → DISPENSED, cannot be reused
7. Patient receives SMS notification (console.log in prototype)
8. Patient submits claim via Ma MGPAP → Ma MGPAP validates against MedAxis ledger

---

## Actors and Portals

- Patient Portal — read-only prescription history, report unauthorized, submit insurance claim
- Doctor Portal — authenticate, search patient, issue prescription, view history, cancel
- Pharmacy Portal — authenticate, lookup by CNIE, three-check verification, dispense
- Regulator Dashboard — national stats, audit trail, license management, register pharmacies
- Admin Panel — user management, system config, full audit log
- Insurer Portal — validate claims, query history, monthly reports

---

## Prescription Metadata Stored (Nothing More)

- RxID (UUID)
- Doctor ID (hashed)
- Patient token (hashed CNIE)
- ICD-10 drug code
- Dosage, frequency, duration
- Timestamp, expiry date
- Status: ACTIVE / DISPENSED / PARTIALLY_DISPENSED / EXPIRED / CANCELLED / FLAGGED / DISPUTED

---

## What We Do NOT Build

- No clinical notes or diagnosis storage
- No biometric storage
- No replacement of hospital EMR systems
- No direct Ma MGPAP integration in prototype (simulated)
- No real SMS in prototype (console.log only)
- No real eSignet in week 1-2 (mocked JWT)
- No features not listed in this file

---

## Tech Stack — LOCKED, Never Change

Frontend:  React 18+ + Vite 5+
Backend:   Node.js 20+ + Express 4+
ORM:       Prisma 5+
Database:  SQLite (file: ./prisma/medaxis.db)
Styling:   Tailwind CSS (custom config only — never default colors)
HTTP:      Axios (frontend) + fetch (backend integrations)
Auth:      JWT via jsonwebtoken library
Password:  bcrypt
Env:       dotenv

---

## Project File Structure
```
medaxis-africa/
  .claude/
    agents/
      frontend-expert.md
      backend-developer.md
      fullstack-developer.md  (removed per optimization)
      security-auditor.md
      code-reviewer.md
  docs/
    designs/
      login.png
      doctor-portal.png
      pharmacy-lookup.png
      verification-screen_png.png
      patient-portal.png
      regulator-dashboard.png
  frontend/
    src/
      portals/        ← one folder per actor portal
      components/     ← shared components only
      api/            ← all axios calls, never inline
      hooks/          ← custom React hooks
      styles/         ← global CSS variables
      utils/          ← helper functions
  backend/
    src/
      routes/         ← one file per resource
      controllers/    ← business logic
      middleware/     ← auth, RBAC, audit logging
      services/       ← MOSIP integrations
      utils/          ← helpers
    prisma/
      schema.prisma
      seed.js
  CLAUDE.md
  DESIGN.md
  todo.md
```

---

## Database Models

Doctor, Pharmacist, Patient, Prescription, DispensingEvent,
LicenseVC, InsuranceClaim, AuditLog, Pharmacy, Admin, Regulator, Insurer

Privacy rules for database:
- Store CNIE_hash not raw CNIE
- Store phone_hash not raw phone number
- Never store biometrics
- Never store clinical notes or diagnoses

---

## API Rules

- Backend runs on port 3001
- Frontend runs on port 5173
- All routes prefixed with /api/
- All responses: { success: boolean, data: {}, error: string }
- All errors return proper HTTP status codes
- Every route checks JWT and role before executing
- Audit log entry created for every state-changing API call
- Unauthorized → HTTP 403
- Unauthenticated → HTTP 401

## API Endpoints

- POST /api/auth/login — mock eSignet login, returns JWT with role
- GET /api/auth/me — current user profile
- GET /api/patients/search?cnie=xxx — returns patient token + first name only
- POST /api/prescriptions — create prescription
- GET /api/prescriptions/my — doctor's own history
- GET /api/prescriptions/by-patient/:cnie_hash — pharmacy lookup
- PATCH /api/prescriptions/:rx_id/cancel — cancel prescription
- POST /api/prescriptions/:rx_id/dispense — dispense medication
- POST /api/auth/send-otp — send OTP to patient phone
- POST /api/auth/verify-otp — verify OTP
- GET /api/regulator/stats — national dashboard stats
- GET /api/prescriptions/:rx_id/audit — full audit trail
- POST /api/insurance/claims — submit claim
- GET /api/insurance/claims — monthly report

---

## RBAC Roles

DOCTOR, PHARMACIST, PATIENT, REGULATOR, INSURER, ADMIN

Each endpoint has an explicit allowed roles list.
Unauthorized access returns HTTP 403 with no data leak.
Role assignment happens at account creation.

---

## Naming Conventions

Files: kebab-case (prescription-form.jsx)
Components: PascalCase (PrescriptionForm)
Functions: camelCase (createPrescription)
Constants: SCREAMING_SNAKE_CASE (MAX_EXPIRY_DAYS)
Database: snake_case (doctor_id, created_at)
API routes: kebab-case (/api/prescriptions/:rx_id)

---

## Environment Variables

Frontend (.env):
  VITE_API_URL=http://localhost:3001/api
  VITE_APP_NAME=MedAxis

Backend (.env):
  PORT=3001
  DATABASE_URL=file:./prisma/medaxis.db
  JWT_SECRET=your-secret-here
  JWT_EXPIRES_IN=8h
  ESIGNET_BASE_URL=http://localhost:8088
  NODE_ENV=development

---

## Identity Stack (MOSIP)

- eSignet: OIDC authentication for all actors via CNIE — backend integration
- Inji Certify: issues doctor license Verifiable Credentials (W3C VC) — backend HTTP calls
- Inji Verify SDK: npm package in React pharmacy portal ONLY — frontend only
- Inji Wallet: APK on doctor's phone to store license VC — no custom code needed

MOSIP integration strategy:
- Week 1-2: Mock eSignet — hardcoded JWT returned on login
- Week 3: Real eSignet sandbox via Docker Compose
- Inji Verify SDK: installed as npm package in frontend pharmacy portal
- Inji Certify: HTTP calls from backend/src/services/ folder

---

## Privacy Rules — Never Violate

- Never store biometric data anywhere
- Never store clinical notes or diagnoses
- Never expose full patient PII to pharmacists or insurers
- Never return raw CNIE numbers from any API endpoint
- Only store prescription metadata in the ledger
- Patient identity = hashed CNIE token always

---

## What Claude Must NEVER Do

- Never use localStorage for JWT — use httpOnly cookies or memory only
- Never return full patient PII from any endpoint
- Never skip audit logging on state-changing operations
- Never use Inter, Roboto, Arial or system fonts
- Never use default Tailwind color palette
- Never invent features not listed in this file
- Never switch libraries without being explicitly asked
- Never skip input validation on any endpoint
- Never expose raw CNIE numbers in API responses
- Never store passwords in plain text
- Never add drop shadows to UI components
- Never use gradient buttons
- Never use white backgrounds with blue buttons (not a SaaS app)
- Never commit .env files
- Never commit node_modules
- Never use white background with generic blue buttons

---

## Git Rules

- Commit after every working feature
- Branch naming: feature/doctor-portal, feature/pharmacy-dispensing
- Never commit .env files
- Never commit node_modules
- Commit messages: clear and descriptive

---

## Design Reference

See DESIGN.md for full design system.
See docs/designs/ for all 6 Stitch mockups.
When building any portal always reference the matching mockup image.

Key design rules:
- Light theme — white and light grey-teal (#F5F7F5) backgrounds
- Primary color: #0D7C7C teal
- Font: Space Grotesk — LOCKED
- Government healthcare aesthetic — Ministry of Health / WHO feel
- Borders not shadows
- Status dots not badges
- No gradients, no illustrations, no generic SaaS patterns