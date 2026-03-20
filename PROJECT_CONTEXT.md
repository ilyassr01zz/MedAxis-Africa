# MedAxis Africa — Claude Code Project Instructions

## What This Project Is
MedAxis is a national prescription trust infrastructure for Morocco. 
It anchors every prescription to a verified Digital ID via MOSIP eSignet. 
It is NOT an EMR system. It does NOT store clinical records or biometrics.
It creates a tamper-proof national prescription ledger.

## Read These Files Before Doing Anything
- PRD.md — what we are building and why
- DESIGN.md — how every portal must look
- TECH_RULES.md — what stack to use and what never to do
- todo.md — what to build next

## Team
- Ilyass Lhafi (i.lhafi@aui.ma)
- Lina Lassri (l.lassri@aui.ma)
- Youssef Assemlali (y.assemlali@aui.ma)
- Salma Essagar (s.essagar@aui.ma)
- University: Al Akhawayn University, Ifrane, Morocco
- Hackathon: Upanzi Africa Digital ID Hackathon 2026
- Pitch deadline: April 5, 2026

## Project Structure
medaxis-africa/
  frontend/     ← React Vite app
  backend/      ← Node.js Express API
  docs/         ← diagrams, PDFs, documentation, designs
  CLAUDE.md
  PRD.md
  DESIGN.md
  TECH_RULES.md
  todo.md

## The 6 Core Demo Features (Build ONLY These First)
1. Doctor logs in via eSignet mock → authenticated with role DOCTOR
2. Doctor creates prescription → stored in SQLite linked to patient CNIE hash
3. Pharmacist logs in via eSignet mock → authenticated with role PHARMACIST
4. Pharmacist enters patient CNIE → sees all active prescriptions for that patient
5. System shows three-check verification screen (Doctor VC valid / 
   Prescription valid / Patient OTP verified)
6. Pharmacist confirms dispensing → prescription marked DISPENSED, 
   cannot be reused

## Actors and Portals
- Patient Portal (read-only prescription history, report unauthorized)
- Doctor Portal (issue, view, cancel prescriptions)
- Pharmacy Portal (lookup by CNIE, verify, dispense)
- Regulator Dashboard (national stats, audit trail, license management)
- Admin Panel (user management, system config)
- Insurer Portal (claims validation, monthly reports)

## Identity Stack
- eSignet: OIDC authentication for all actors via CNIE
- Inji Certify: issues doctor license Verifiable Credentials (W3C VC)
- Inji Verify SDK: npm package in React pharmacy portal for VC verification
- Inji Wallet: APK on doctor's phone to store license VC
- For prototype: mock eSignet returns hardcoded JWT, real integration added later

## Privacy Rules (Never Violate These)
- Never store biometric data
- Never store clinical notes or diagnoses
- Never expose full patient PII to pharmacists or insurers
- Only store prescription metadata in the ledger
- Patient identity = hashed CNIE token, never raw CNIE

## Database Models Needed
Doctor, Pharmacist, Patient, Prescription, DispensingEvent, 
LicenseVC, InsuranceClaim, AuditLog, Pharmacy, Admin

## API Base URL
Backend runs on port 3001
Frontend runs on port 5173
API calls use VITE_API_URL from .env file