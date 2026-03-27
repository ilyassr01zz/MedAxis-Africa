# MedAxis Africa — Todo

## Priority: Build in This Exact Order

### PHASE 1 — Foundation ✓ COMPLETE
- [x] Initialize React Vite frontend in /frontend
- [x] Initialize Node.js Express backend in /backend
- [x] Set up Prisma with SQLite
- [x] Create all database models from ERD
- [x] Run prisma migrate dev (2 migrations applied)
- [x] Create seed.js with mock doctors, patients, pharmacists, regulator
- [x] Deploy backend skeleton to Railway
- [x] Verify health check endpoint works: GET /api/health

### PHASE 2 — Authentication ✓ COMPLETE
- [x] Create mock eSignet login endpoint: POST /api/auth/login
  Returns hardcoded JWT with role and actor_id
- [x] Create JWT middleware that checks every protected route
- [x] Create RBAC middleware that checks role per endpoint
- [x] Create login page (shared design, role selector for demo)
- [x] After login, redirect to correct portal based on role
- [x] Store JWT in memory (not localStorage)

### PHASE 3 — Doctor Portal ✓ COMPLETE
- [x] Patient search: GET /api/patients/search?cnie=xxx
  Returns: patient token + first name only
- [x] Prescription form component
- [x] Create prescription: POST /api/prescriptions
  Body: patient_token, drug_code, dosage, frequency, duration_days
  Returns: RxID (UUID), expiry_date, confirmation
- [x] View prescription history: GET /api/prescriptions/my
  Filterable by status, date, drug code
- [x] Cancel prescription: PATCH /api/prescriptions/:rx_id/cancel
  Only if DISPENSED=false and not expired

### PHASE 4 — Pharmacy Portal ✓ COMPLETE
- [x] Patient CNIE lookup: GET /api/prescriptions/by-patient/:cnie_hash
  Returns: all active prescriptions with doctor name, drug, dates
- [x] Doctor VC verification (mock): returns true if doctor is ACTIVE
- [x] Patient OTP: POST /api/auth/send-otp + POST /api/auth/verify-otp
  OTP valid 5 minutes, 3 attempts max
- [x] Three-check verification screen component
  Must show: Doctor VC Valid / Prescription Valid / Patient Verified
  All three green → Confirm Dispense button activates
- [x] Dispense: POST /api/prescriptions/:rx_id/dispense
  Body: quantity_dispensed
  Updates status to DISPENSED or PARTIALLY_DISPENSED
  Creates DispensingEvent record
  Logs to AuditLog

### PHASE 5 — Patient Portal ✓ COMPLETE
- [x] Prescription history: GET /api/prescriptions/patient-view
  Read-only. Shows: drug name, doctor name, date, status
- [x] Report unauthorized: POST /api/prescriptions/:rx_id/dispute
  Creates DISPUTED record

### PHASE 6 — Polish and Demo Prep (IN PROGRESS)
- [x] Regulator dashboard: stats cards + prescription table (complete)
- [x] Regulator dashboard: working Region/Status/Date filters
- [x] Regulator dashboard: stats pull real data from database
- [x] Regulator dashboard: Prescriptions view (paginated, searchable, filterable)
- [x] Regulator dashboard: Statistics view (SVG line chart + SVG donut chart)
- [x] Regulator dashboard: Doctor Licenses view (approve/revoke with AuditLog)
- [x] Regulator dashboard: Disputes view (expand/review workflow)
- [x] Regulator dashboard: clickable stat cards (Prescriptions / Doctor Licenses / Pharmacists modal)
- [x] Backend: GET /api/regulator/doctors with filters + pagination
- [x] Backend: PATCH /api/regulator/doctors/:id/approve and /revoke
- [x] Backend: GET /api/regulator/pharmacists
- [ ] Make all other portals match DESIGN.md exactly (verify against mockups)
- [ ] Record demo video (backup for live demo)
- [ ] Test full 6-step flow end to end
- [ ] Fix all bugs found during end-to-end test

### STRETCH GOALS (Only if Phase 1-6 complete)
- [ ] Real eSignet integration
- [ ] Inji Verify SDK in pharmacy portal
- [ ] SMS notifications (console.log for prototype)
- [ ] Insurance portal
- [ ] Admin panel

---

## Regulator Dashboard — Views Built

The regulator portal has 5 views (sidebar nav):
1. Dashboard — stats cards + filter bar + prescription table + region bar chart + latency widget
2. Prescriptions — full national registry with search, region/status filters, pagination
3. Statistics — SVG line chart (monthly prescriptions) + SVG donut chart (doctor license breakdown)
4. Disputes — dispute review workflow (expand/collapse + mark reviewed)
5. Doctor Licenses — license registry + approve/revoke buttons + AuditLog

"System Logs" was deliberately removed — no purpose for demo.

Stat cards are clickable:
- Total Prescriptions → navigates to Prescriptions view
- Registered Doctors → navigates to Doctor Licenses view
- Active Pharmacies → opens inline pharmacists modal

---

## Demo Script (Practice This)

### Core 6-step flow (required for pitch):
1. Open Doctor Portal → log in as Dr. Ahmed (CNIE=DOCTOR001)
2. Search patient by CNIE → see patient name (Karima)
3. Fill prescription form → submit → show RxID confirmation
4. Open Pharmacy Portal → log in as Pharmacist (CNIE=PHARM001)
5. Enter patient CNIE → see prescription from Dr. Ahmed
6. Show three checks turning green one by one
7. Click Confirm Dispense → show success
8. Open Patient Portal → patient sees prescription marked DISPENSED
9. Show audit log entry was created

### Regulator walkthrough (bonus demo):
10. Open Regulator Dashboard → log in as Fatima (CNIE=REGULATOR001)
11. Show stats cards — real numbers from database
12. Click Total Prescriptions card → Prescriptions view with filters
13. Switch to Statistics → show SVG charts
14. Switch to Disputes → show patient dispute workflow
15. Switch to Doctor Licenses → approve/revoke a doctor license live

---

## Seeded Demo Data

Run: cd backend && npm run seed

Credentials:
- CNIE=DOCTOR001    → role DOCTOR    → Dr. Ahmed (General Medicine, Casablanca-Settat)
- CNIE=PHARM001     → role PHARMACIST → Youssef (Pharmacie Atlas, Casablanca)
- CNIE=PATIENT001   → role PATIENT   → Karima
- CNIE=REGULATOR001 → role REGULATOR → Fatima (National)

Pre-seeded prescription: RX-DEMO-0001 (Amoxicillin 500mg, ACTIVE)
