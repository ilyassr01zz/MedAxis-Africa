# MedAxis Africa — CLAUDE.md
# Single source of truth for Claude Code. Read this entire file before doing anything.

---

## What This Project Is

MedAxis is a national prescription trust infrastructure for Morocco and Africa.
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

## The 6 Core Demo Features — ALL BUILT ✓

1. ✓ Doctor logs in via eSignet mock → authenticated with role DOCTOR
2. ✓ Doctor creates prescription → stored in SQLite linked to patient CNIE hash
3. ✓ Pharmacist logs in via eSignet mock → authenticated with role PHARMACIST
4. ✓ Pharmacist enters patient CNIE → sees all active prescriptions for that patient
5. ✓ System shows three-check verification screen (Doctor VC valid / Prescription valid / Patient OTP verified)
6. ✓ Pharmacist confirms dispensing → prescription marked DISPENSED, cannot be reused

All 6 core features are complete. The project is in Phase 6 (Polish & Demo Prep).

---

## What Has Been Built (Complete Inventory as of April 2026)

### Login Page — frontend/src/portals/login/login.jsx
- Two-panel layout: 42% teal left panel (#12A5A5), 58% light right panel
- Left panel: MedAxis logo (260px), subtitle, divider, tagline, description paragraph, three trust badges, footer
- Right panel: eSignet primary auth section (OIDC button, full callback handler), divider, staff/demo username+password form with 2×2 role selector grid
- Real MOSIP eSignet OIDC callback: exchanges code for token, decodes JWT userinfo (base64url), maps pairwise `sub` to CNIE via hardcoded table, calls `loginDirect`
- Mobile responsive: left panel hidden at <768px
- All text Space Grotesk, no Tailwind in JSX

### Doctor Portal — frontend/src/portals/doctor/doctor-portal.jsx
- Full sidebar layout: top logo + "Infrastructure Portal" label, nav items, bottom "Help Center" + "Logout"
- Top header: MedAxis logo block, "Doctor Portal" center label, notifications bell + settings gear + avatar (initial)
- Dashboard view: 4 stats cards (total Rx, patients, dispensed, pending), recent activity feed, prescriptions table with status filters
- New Prescription form: patient CNIE lookup + hash, 30-medication selector with ICD-10 codes, dosage/form/frequency/duration per med, notes field
- My Prescriptions history view with cancel action
- API-connected with graceful mock fallback

### Pharmacy Portal — frontend/src/portals/pharmacy/pharmacy-portal.jsx
- Full sidebar layout: top "MedAxis Admin / PHARMACY PORTAL" label, nav items, bottom "Help Center" + "Logout"
- Top header: MedAxis logo block, "Pharmacy Workspace" center label, notifications bell + settings gear + avatar
- Dashboard view: KPI cards, active queue preview, recent dispensing activity feed
- Patient Lookup view: enter CNIE → see all active prescriptions → navigate to verification screen
- Active Queue view: paginated queue of prescriptions awaiting dispensing
- Dispense History view: full log of all dispensed prescriptions

### Verification Screen — frontend/src/portals/pharmacy/verification-screen.jsx
- Three-card check: Doctor VC Valid / Prescription Valid / Patient OTP Confirmed
- Each card transitions PENDING → VERIFIED with checkbox
- Confirm Dispense button only enables when all three checks pass
- Calls POST /api/prescriptions/:rx_id/dispense on confirm

### Patient Portal — frontend/src/portals/patient/patient-portal.jsx
- Read-only prescription history
- Report unauthorized prescription (POST /api/prescriptions/:rx_id/dispute)
- Submit insurance claim simulation (Ma MGPAP)

### Regulator Dashboard — 4 files, 5 views
- regulator-dashboard.jsx: shell + dashboard view (stats cards → nav, filter bar, region SVG bar chart, verification latency widget) + disputes view (expand/review)
- regulator-prescriptions-view.jsx: paginated prescription registry, search + filters
- regulator-statistics-view.jsx: inline SVG line chart + SVG donut chart (no Recharts)
- doctor-licenses-view.jsx: doctor registry, approve/revoke with AuditLog write

### Backend — fully implemented
- Auth: login, /me, send-otp, verify-otp (5-min TTL, 3-attempt limit), esignet/callback
- Prescriptions: create, list own, by-patient lookup, cancel, dispense, audit trail, dispute, patient-view
- Pharmacy: dashboard KPIs, activity feed, active queue, dispense history
- Regulator: stats with filters, prescriptions registry paginated, doctor registry paginated, approve/revoke/status, pharmacists list, disputes list, review dispute
- Insurance: submit claim, monthly report
- eSignet service: RS256 client assertion JWT, real OIDC token exchange, JWT userinfo decode, sub→CNIE mapping
- Middleware: JWT auth, RBAC per endpoint, immutable AuditLog on every state change, structured error handling

### Security & Privacy
- CNIE stored as SHA-256 hash only — raw CNIE never persisted or returned from API
- Phone stored as hash only
- JWT held in React state (memory) only — never localStorage
- Every state-changing call writes to AuditLog with actor, action, timestamp
- RBAC enforced at route level — 403 with no data leak on unauthorized access

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

- Patient Portal ✓ — read-only prescription history, report unauthorized, submit insurance claim
- Doctor Portal ✓ — authenticate, search patient, issue prescription, view history, cancel
- Pharmacy Portal ✓ — authenticate, lookup by CNIE, three-check verification, dispense
- Regulator Dashboard ✓ — national stats, audit trail, license management, disputes, pharmacists
- Admin Panel — user management, system config, full audit log (stretch)
- Insurer Portal — validate claims, query history, monthly reports (stretch)

---

## Prescription Metadata Stored (Nothing More)

- RxID (UUID)
- Doctor ID (hashed)
- Patient token (hashed CNIE)
- ICD-10 drug code
- Dosage, frequency, duration
- Timestamp, expiry date
- Status: ACTIVE / DISPENSED / PARTIALLY_DISPENSED / EXPIRED / CANCELLED / FLAGGED / DISPUTED
- is_flagged, is_disputed, is_reviewed flags
- medications_json (optional structured list), notes (optional)

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

Frontend:  React 19+ + Vite 8+
Backend:   Node.js 20+ + Express 5+
ORM:       Prisma 7+ (with better-sqlite3 adapter)
Database:  SQLite (file: ./prisma/medaxis.db)
Styling:   Inline styles throughout all portal components (never Tailwind classes in JSX)
           Tailwind CSS installed but used only for global base styles in index.css
HTTP:      Axios (frontend) + fetch (backend integrations)
Auth:      JWT via jsonwebtoken library
Password:  bcryptjs
Env:       dotenv
Charts:    Inline SVG only — Recharts is NOT installed, do not add it

Actual installed versions (do not downgrade):
- react: 19.2.4
- react-router-dom: 7.13.1
- axios: 1.13.6
- tailwindcss: 4.2.2
- lucide-react: 0.577.0
- express: 5.2.1
- prisma: 7.5.0
- better-sqlite3: 12.8.0
- jsonwebtoken: 9.0.3
- bcryptjs: 3.0.3
- uuid: 13.0.0

---

## Project File Structure
```
medaxis-africa/
  .claude/
    agents/
      frontend-expert.md
      backend-developer.md
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
      portals/
        login/
          login.jsx
        doctor/
          doctor-portal.jsx
        pharmacy/
          pharmacy-portal.jsx
          verification-screen.jsx
        patient/
          patient-portal.jsx
        regulator/
          regulator-dashboard.jsx       ← main shell + dashboard view + disputes
          regulator-prescriptions-view.jsx  ← full prescriptions registry view
          regulator-statistics-view.jsx     ← SVG charts analytics view
          doctor-licenses-view.jsx          ← license management + approve/revoke
      components/
        layout.jsx
        protected-route.jsx
        toast.jsx
      api/
        auth.js
        patients.js
        prescriptions.js
        pharmacy.js
        regulator.js
      hooks/
        use-auth.jsx
      utils/
        hash.utils.js
        mock-data.js
      styles/
        index.css
  backend/
    src/
      routes/
        auth.routes.js
        prescriptions.routes.js
        patients.routes.js
        pharmacy.routes.js
        regulator.routes.js
        insurance.routes.js
      controllers/
        auth.controller.js
        prescriptions.controller.js
        patients.controller.js
        pharmacy.controller.js
        regulator.controller.js
        insurance.controller.js
      middleware/
        auth.middleware.js
        rbac.middleware.js
        audit.middleware.js
        error.middleware.js
      services/
        esignet.service.js
        inji.service.js
      utils/
        hash.utils.js
        prisma.js
        response.utils.js
    prisma/
      schema.prisma
      seed.js
      medaxis.db
  CLAUDE.md
  DESIGN.md
  todo.md
```

---

## Database Models

User, Doctor, Pharmacist, Patient, Regulator, Pharmacy,
Prescription, DispensingEvent, LicenseVC, InsuranceClaim,
AuditLog, DoctorStatusChange, OTPSession

Privacy rules for database:
- Store CNIE_hash not raw CNIE
- Store phone_hash not raw phone number
- Never store biometrics
- Never store clinical notes or diagnoses

Key schema notes:
- Doctor.status field values: ACTIVE / SUSPENDED / EXPIRED / REVOKED
- Prescription.status values: ACTIVE / DISPENSED / PARTIALLY_DISPENSED / EXPIRED / CANCELLED / FLAGGED / DISPUTED
- Prescription has is_flagged, is_disputed, is_reviewed boolean fields
- DoctorStatusChange tracks every license status transition with reason + changed_by

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

## API Endpoints — Complete List

### Auth
- POST /api/auth/login — mock eSignet login, returns JWT with role
- GET /api/auth/me — current user profile
- POST /api/auth/send-otp — send OTP to patient phone
- POST /api/auth/verify-otp — verify OTP (5 min TTL, 3 attempts max)

### Patients
- GET /api/patients/search?cnie=xxx — returns patient token + first name only

### Prescriptions
- POST /api/prescriptions — create prescription (DOCTOR only)
- GET /api/prescriptions/my — doctor's own history (DOCTOR only)
- GET /api/prescriptions/by-patient/:cnie_hash — pharmacy lookup (PHARMACIST only)
- PATCH /api/prescriptions/:rx_id/cancel — cancel prescription (DOCTOR only)
- POST /api/prescriptions/:rx_id/dispense — dispense medication (PHARMACIST only)
- GET /api/prescriptions/:rx_id/audit — full audit trail
- POST /api/prescriptions/:rx_id/dispute — patient reports unauthorized (PATIENT only)
- GET /api/prescriptions/patient-view — patient's own history (PATIENT only)

### Regulator
- GET /api/regulator/stats?region=X&status=Y&dateFrom=Z&dateTo=W — national stats with filter support
- GET /api/regulator/prescriptions?region=X&status=Y&search=Z&page=N&limit=10 — paginated registry
- GET /api/regulator/doctors?region=X&license_status=Y&search=Z&page=N&limit=10 — doctor registry
- PATCH /api/regulator/doctors/:doctor_id/approve — set license_status=ACTIVE + AuditLog
- PATCH /api/regulator/doctors/:doctor_id/revoke — set license_status=SUSPENDED + AuditLog
- PATCH /api/regulator/doctors/:doctor_id/status — generic status update (legacy)
- GET /api/regulator/pharmacists — all pharmacists list
- GET /api/regulator/disputes — all disputed prescriptions
- PATCH /api/regulator/disputes/:rx_id/review — mark dispute reviewed

### Insurance
- POST /api/insurance/claims — submit claim
- GET /api/insurance/claims — monthly report

---

## RBAC Roles

DOCTOR, PHARMACIST, PATIENT, REGULATOR, INSURER, ADMIN

Each endpoint has an explicit allowed roles list.
Unauthorized access returns HTTP 403 with no data leak.
Role assignment happens at account creation.

Regulator endpoints accept: REGULATOR, ADMIN
Doctor approve/revoke: REGULATOR, ADMIN
Doctor status (legacy): REGULATOR only

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

## Seed / Demo Credentials

Seeded in backend/prisma/seed.js. Run: npm run seed

  Doctor:     CNIE=DOCTOR001, role=DOCTOR, name=Dr. Ahmed
              License: MED-MAR-8829, Specialty: General Medicine
              Region: Casablanca-Settat, Facility: Clinique Internationale
  Pharmacist: CNIE=PHARM001, role=PHARMACIST, name=Youssef
              Pharmacy: Pharmacie Atlas, Casablanca-Settat
  Patient:    CNIE=PATIENT001, role=PATIENT, name=Karima
  Regulator:  CNIE=REGULATOR001, role=REGULATOR, name=Fatima

Demo prescription: RX-DEMO-0001 (Amoxicillin 500mg, ACTIVE, expires 30 days from seed date)

---

## Identity Stack (MOSIP)

- eSignet: OIDC authentication for all actors via CNIE — backend integration
- Inji Certify: issues doctor license Verifiable Credentials (W3C VC) — backend HTTP calls
- Inji Verify SDK: npm package in React pharmacy portal ONLY — frontend only
- Inji Wallet: APK on doctor's phone to store license VC — no custom code needed

MOSIP integration strategy:
- Week 1-2: Mock eSignet — hardcoded JWT returned on login ← CURRENT STATE
- Week 3: Real eSignet sandbox via Docker Compose
- Inji Verify SDK: installed as npm package in frontend pharmacy portal
- Inji Certify: HTTP calls from backend/src/services/ folder

---

## Regulator Dashboard — 5 Views (all built)

The regulator portal is a single-page shell (regulator-dashboard.jsx) that
renders one of 5 views based on `activeNav` state. Views are separate files:

1. dashboard (default) — stats cards (clickable) + filter bar + prescription table + charts
   - Card 1 (Total Prescriptions) → clicks to Prescriptions view
   - Card 2 (Registered Doctors) → clicks to Doctor Licenses view
   - Card 3 (Active Pharmacies) → opens pharmacists modal
   - Filter bar: Region dropdown + Status dropdown + From/To date range
   - Region bar chart highlights selected region, dims others
   - Verification Latency widget (static system metric)
2. table — RegulatorPrescriptionsView: paginated prescription registry with search + filters
3. stats — RegulatorStatisticsView: SVG line chart + SVG donut chart (no Recharts)
4. disputes — inline disputes view with expand/review workflow (already working)
5. licenses — DoctorLicensesView: doctor registry + approve/revoke with AuditLog

Sidebar nav items: Dashboard | Prescriptions | Statistics | Disputes | Doctor Licenses
System Logs was removed — it had no purpose.

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
- Never use Inter, Roboto, Arial or system fonts — Space Grotesk only
- Never use default Tailwind color palette
- Never use Tailwind utility classes in portal JSX — inline styles only
- Never invent features not listed in this file
- Never switch libraries without being explicitly asked
- Never install Recharts or any chart library — use inline SVG
- Never skip input validation on any endpoint
- Never expose raw CNIE numbers in API responses
- Never store passwords in plain text
- Never add drop shadows to UI components (boxShadow: forbidden)
- Never use gradient buttons
- Never use white backgrounds with blue buttons (not a SaaS app)
- Never commit .env files
- Never commit node_modules
- Never touch Doctor Portal, Pharmacy Portal, Patient Portal, or Login
  when working on the Regulator Dashboard — they are complete and working

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
- Font: Space Grotesk — LOCKED (every element, inline fontFamily always)
- Monospace: JetBrains Mono — for RxIDs, license numbers, prescription codes only
- Government healthcare aesthetic — Ministry of Health / WHO feel
- Borders not shadows (border: '1px solid #E5E7EB' — never boxShadow)
- Status dots not badges (7px circle, no pill shapes)
- No gradients, no illustrations, no generic SaaS patterns
- All styling via inline style={{}} objects — never Tailwind classes in portals
