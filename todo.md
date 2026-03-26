# MedAxis Africa — Todo

## Priority: Build in This Exact Order:

### PHASE 1 — Foundation (Days 1-3)
- [ ] Initialize React Vite frontend in /frontend
- [ ] Initialize Node.js Express backend in /backend  
- [ ] Set up Prisma with SQLite
- [ ] Create all database models from ERD
- [ ] Run prisma migrate dev
- [ ] Create seed.js with mock doctors, patients, pharmacists
- [ ] Deploy backend skeleton to Railway
- [ ] Verify health check endpoint works: GET /api/health

### PHASE 2 — Authentication (Days 3-5)
- [ ] Create mock eSignet login endpoint: POST /api/auth/login
  Returns hardcoded JWT with role and actor_id
- [ ] Create JWT middleware that checks every protected route
- [ ] Create RBAC middleware that checks role per endpoint
- [ ] Create login page (shared design, role selector for demo)
- [ ] After login, redirect to correct portal based on role
- [ ] Store JWT in memory (not localStorage)

### PHASE 3 — Doctor Portal (Days 5-7)
- [ ] Patient search: GET /api/patients/search?cnie=xxx
  Returns: patient token + first name only
- [ ] Prescription form component
- [ ] Create prescription: POST /api/prescriptions
  Body: patient_token, drug_code, dosage, frequency, duration_days
  Returns: RxID (UUID), expiry_date, confirmation
- [ ] View prescription history: GET /api/prescriptions/my
  Filterable by status, date, drug code
- [ ] Cancel prescription: PATCH /api/prescriptions/:rx_id/cancel
  Only if DISPENSED=false and not expired

### PHASE 4 — Pharmacy Portal (Days 7-10)
- [ ] Patient CNIE lookup: GET /api/prescriptions/by-patient/:cnie_hash
  Returns: all active prescriptions with doctor name, drug, dates
- [ ] Doctor VC verification (mock): returns true if doctor is ACTIVE
- [ ] Patient OTP: POST /api/auth/send-otp + POST /api/auth/verify-otp
  OTP valid 5 minutes, 3 attempts max
- [ ] Three-check verification screen component
  Must show: Doctor VC Valid / Prescription Valid / Patient Verified
  All three green → Confirm Dispense button activates
- [ ] Dispense: POST /api/prescriptions/:rx_id/dispense
  Body: quantity_dispensed
  Updates status to DISPENSED or PARTIALLY_DISPENSED
  Creates DispensingEvent record
  Logs to AuditLog

### PHASE 5 — Patient Portal (Days 10-12)
- [ ] Prescription history: GET /api/prescriptions/patient-view
  Read-only. Shows: drug name, doctor name, date, status
- [ ] Report unauthorized: POST /api/prescriptions/:rx_id/dispute
  Creates DISPUTED record

### PHASE 6 — Polish and Demo Prep (Days 13-17)
- [ ] Regulator dashboard: basic stats cards + prescription table
- [ ] Make UI match DESIGN.md exactly
- [ ] Record demo video (backup for live demo)
- [ ] Test full 6-step flow end to end
- [ ] Fix all bugs

### STRETCH GOALS (Only if Phase 1-5 complete)
- [ ] Real eSignet integration
- [ ] Inji Verify SDK in pharmacy portal
- [ ] SMS notifications (console.log for prototype)
- [ ] Insurance portal
- [ ] Admin panel

## Demo Script (Practice This)
1. Open Doctor Portal → log in as Dr. Ahmed
2. Search patient by CNIE → see patient name
3. Fill prescription form → submit → show RxID confirmation
4. Open Pharmacy Portal → log in as Pharmacist
5. Enter patient CNIE → see prescription from Dr. Ahmed
6. Show three checks turning green one by one
7. Click Confirm Dispense → show success
8. Open Patient Portal → patient sees prescription marked DISPENSED
9. Show audit log entry was created