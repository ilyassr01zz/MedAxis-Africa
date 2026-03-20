# MedAxis Africa — Tech Rules

## Stack (Never Change This)
Frontend:  React + Vite
Backend:   Node.js + Express
ORM:       Prisma
Database:  SQLite (file: ./prisma/medaxis.db)
Styling:   Tailwind CSS (custom config only — no default colors)
HTTP:      Axios (frontend) + fetch (backend integrations)
Auth:      JWT (jsonwebtoken library)
Password:  bcrypt
Env:       dotenv

## Package Versions (Do Not Upgrade Without Asking)
React: 18+
Vite: 5+
Express: 4+
Prisma: 5+
Node: 20+

## File Structure Rules
frontend/
  src/
    portals/        ← one folder per actor portal
    components/     ← shared components only
    api/            ← all axios calls here, never inline
    hooks/          ← custom React hooks
    styles/         ← global styles
    utils/          ← helper functions

backend/
  src/
    routes/         ← one file per resource
    controllers/    ← business logic
    middleware/     ← auth, RBAC, logging
    services/       ← MOSIP integrations
    utils/          ← helpers
  prisma/
    schema.prisma
    seed.js

## Naming Conventions
Files: kebab-case (prescription-form.jsx)
Components: PascalCase (PrescriptionForm)
Functions: camelCase (createPrescription)
Constants: SCREAMING_SNAKE_CASE (MAX_EXPIRY_DAYS)
Database: snake_case (doctor_id, created_at)
API routes: kebab-case (/api/prescriptions/:rx_id)

## API Rules
- All routes prefixed with /api/
- All responses: { success: boolean, data: {}, error: string }
- All errors return proper HTTP status codes
- Every route must check JWT and role before executing
- Audit log entry created for every state-changing API call

## RBAC Roles
DOCTOR, PHARMACIST, PATIENT, REGULATOR, INSURER, ADMIN
Unauthorized access → HTTP 403
Unauthenticated → HTTP 401

## What Claude Must NEVER Do
- Never use localStorage for JWT (use httpOnly cookies or memory)
- Never return full patient PII from any endpoint
- Never skip audit logging on state-changing operations
- Never use white backgrounds in UI
- Never use Inter font
- Never use default Tailwind colors
- Never invent features not in PRD.md
- Never switch libraries without being asked
- Never skip input validation
- Never expose raw CNIE numbers in API responses
- Never store passwords in plain text

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

## MOSIP Integration Strategy
Week 1-2: Mock eSignet — hardcoded JWT returned on login
Week 3: Real eSignet sandbox via Docker
Inji Verify SDK: installed as npm package in frontend only
Inji Certify: HTTP calls from backend services folder

## Git Rules
- Commit after every working feature
- Branch naming: feature/doctor-portal, feature/pharmacy-dispensing
- Never commit .env files
- Never commit node_modules