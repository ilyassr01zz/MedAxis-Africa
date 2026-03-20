# MedAxis Africa — Product Requirements Document

## Problem
In Morocco and across Africa, paper-based prescriptions enable:
- Forgery and reuse of prescriptions
- Pharmacists cannot verify doctor licensing instantly
- Duplicate dispensing (pharmacy hopping)
- No national audit trail for regulators
- Patients pay full price upfront, wait weeks for insurance reimbursement
- Drug abuse and leakage of controlled substances

## Solution
MedAxis is a national prescription trust infrastructure anchored in 
National Digital ID (CNIE in Morocco, MOSIP in other African countries).

It does NOT replace hospital systems.
It does NOT centralize medical records.
It creates a secure national prescription trust layer.

## Core Value Proposition
Prescription fraud is structurally impossible because:
1. Only verified licensed doctors can issue prescriptions
2. Every prescription is cryptographically signed and linked to patient Digital ID
3. Pharmacists verify doctor license, prescription validity, and patient identity 
   before dispensing
4. Every dispensing event is logged and immutable
5. Insurance claims are automatically validated against the ledger

## Users and Their Goals

### Doctor
- Authenticate via CNIE (eSignet)
- Search patient by national ID
- Issue digital prescription (drug code, dosage, frequency, duration)
- View and cancel own prescriptions

### Pharmacist  
- Authenticate via CNIE (eSignet)
- Enter patient CNIE to retrieve active prescriptions
- See three verification checks automatically
- Confirm dispensing, record quantity
- Flag suspicious prescriptions

### Patient
- View read-only prescription history
- Receive SMS on dispensing
- Report unauthorized prescriptions
- Submit insurance claim via Ma MGPAP

### Regulator (Ministry of Health)
- Real-time national dashboard
- Audit trail by RxID
- Manage doctor licenses (activate/suspend/revoke)
- Register pharmacies

### Insurer (Ma MGPAP)
- Validate claims against ledger
- Query dispensing history
- Monthly reports

### Admin
- Manage user accounts and roles
- System configuration
- Full audit log access

## Core User Flow (The Demo)
1. Doctor authenticates → fills prescription form → system stores RxID 
   linked to patient CNIE
2. Patient walks to pharmacy with only their CNIE card
3. Pharmacist enters patient CNIE → system retrieves active prescriptions
4. System auto-verifies: doctor VC valid + prescription not expired/dispensed + 
   patient OTP confirmed
5. Three green checkmarks → pharmacist confirms dispensing
6. Prescription status → DISPENSED, cannot be reused
7. Patient receives SMS notification
8. Patient submits claim via Ma MGPAP → Ma MGPAP validates against MedAxis ledger

## Prescription Metadata Stored (Nothing More)
- RxID (UUID)
- Doctor ID (hashed)
- Patient token (hashed CNIE)
- ICD-10 drug code
- Dosage, frequency, duration
- Timestamp, expiry date
- Status: ACTIVE / DISPENSED / PARTIALLY_DISPENSED / 
  EXPIRED / CANCELLED / FLAGGED / DISPUTED

## What We Do NOT Build (Scope Boundaries)
- No clinical notes or diagnosis storage
- No biometric storage
- No replacement of hospital EMR systems
- No direct Ma MGPAP integration in prototype (simulated)
- No real SMS in prototype (logged to console)
- No real eSignet in prototype week 1 (mocked JWT)