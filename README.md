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
- Leakage of controlled substances into illicit markets

## The Solution

MedAxis creates a tamper-proof national prescription ledger. It does **not** replace hospital EMR systems or store clinical records. It stores only prescription metadata, cryptographically linked to verified Digital IDs.

**Why fraud is structurally impossible:**
1. Only licensed, verified doctors can issue prescriptions
2. Every prescription is cryptographically signed and linked to a patient CNIE hash
3. Pharmacists verify doctor license, prescription validity, and patient identity before dispensing
4. Every dispensing event is logged and immutable

---

## Features

| # | Feature | Status |
|---|---------|--------|
| 1 | Doctor authenticates via MOSIP eSignet | ✅ |
| 2 | Doctor issues prescription linked to patient CNIE | ✅ |
| 3 | Pharmacist authenticates via MOSIP eSignet | ✅ |
| 4 | Pharmacist looks up patient by CNIE | ✅ |
| 5 | Three-check verification: Doctor VC + Prescription validity + Patient OTP | ✅ |
| 6 | Pharmacist confirms dispensing — prescription marked DISPENSED permanently | ✅ |
| 7 | Patient portal: prescription history + dispute + inji web wallet | ✅ |
| 8 | Regulator dashboard: national stats, audit trail, license management | ✅ |

---

## Prerequisites

Install all of the following before proceeding:

- **Node.js v20+** — [nodejs.org](https://nodejs.org) (npm v9+ is bundled)
- **Git** — [git-scm.com](https://git-scm.com)
- **Docker Desktop** — [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop) — required for the MOSIP stack
- **A GitHub account** — required to host the DID document on GitHub Pages

> **Windows users:** Use PowerShell or Git Bash for all commands. Run Docker Desktop as Administrator if you encounter permission errors.

> **Linux users:** All commands work natively in terminal. Use `sudo` before docker commands if you encounter permission errors, or add your user to the docker group: `sudo usermod -aG docker $USER`

---

## Architecture Overview

The full MedAxis stack consists of two independent parts that run simultaneously.

| Service | Port | Purpose |
|---------|------|---------|
| MedAxis Frontend | 5173 | React UI — Doctor, Pharmacist, Patient, Regulator portals |
| MedAxis Backend | 3005 | Node.js API + SQLite prescription ledger |
| eSignet | 8088 | MOSIP OpenID Connect authentication server |
| eSignet UI | 3007 | eSignet login page (rendered inside MedAxis login) |
| Mock Identity System | 8082 | Mock citizen identity registry (DOCTOR001, PHARM001, etc.) |
| Inji Certify | 8090 | Verifiable Credential issuer for doctor license VCs |
| Inji Certify Nginx | 8091 | Reverse proxy for Inji Certify |
| Mimoto | 8099 | VC wallet orchestrator |
| Inji Web | 3004 | Web-based VC wallet for downloading prescription VCs |
| Inji Verify | 3000 | VC verifier used by the pharmacy portal |

---

## Part 1 — MOSIP Stack Setup

> **Start here if running for the first time.** If you have already completed this setup, skip to [Daily Restart Procedure](#daily-restart-procedure).

### 1.1b Clone MOSIP repositories

Clone these 4 repositories **in the same parent folder** :

```bash
# MedAxis Repo setup:
git clone https://github.com/ilyassr01zz/MedAxis_Africa-did-hackathon.git
cd ..
```

```bash
# eSignet — MOSIP OpenID Connect server
git clone https://github.com/mosip/esignet.git
cd esignet && git checkout release-1.5.x && cd ..

# Inji Certify — Verifiable Credential issuer
git clone https://github.com/mosip/inji-certify.git
cd inji-certify && git checkout 0.10.0 && cd ..

# Inji Verify — VC verifier
git clone https://github.com/mosip/inji-verify.git
cd inji-verify && cd ..
```

> After cloning, you must replace several config files with the MedAxis-customized versions from the `mosip-config/` folder in this repository. See Step 1.1b below.

Your folder structure should now look like:

```
parent-folder/               ← stay here and continue instructions
├── MedAxis_Africa-did-hackathon/ 
├── esignet/
├── inji-certify/
└── inji-verify/
```

---

### 1.1 Apply MedAxis configuration to MOSIP repos

This repository includes pre-configured MOSIP files in the `mosip-config/` folder. Copy them into the cloned MOSIP repositories:

```bash
# Copy Inji Certify config files
cp -r MedAxis_Africa-did-hackathon/mosip-config/inji-certify/docker-compose/docker-compose-injistack/docker-compose.yaml \
  inji-certify/docker-compose/docker-compose-injistack/

cp -r MedAxis_Africa-did-hackathon/mosip-config/inji-certify/docker-compose/docker-compose-injistack/certify_init.sql \
  inji-certify/docker-compose/docker-compose-injistack/

cp -r MedAxis_Africa-did-hackathon/mosip-config/inji-certify/docker-compose/docker-compose-injistack/config/certify-csvdp-prescription.properties \
  inji-certify/docker-compose/docker-compose-injistack/config/

cp -r MedAxis_Africa-did-hackathon/mosip-config/inji-certify/docker-compose/docker-compose-injistack/config/prescription_data.csv \
  inji-certify/docker-compose/docker-compose-injistack/config/

cp -r MedAxis_Africa-did-hackathon/mosip-config/inji-certify/docker-compose/docker-compose-injistack/config/mimoto-issuers-config.json \
  inji-certify/docker-compose/docker-compose-injistack/config/

# Copy eSignet config (port changed from 3000 to 3007)
cp -r MedAxis_Africa-did-hackathon/mosip-config/esignet/docker-compose/docker-compose.yml \
  esignet/docker-compose/
```

What these files contain:
- `docker-compose.yaml` — sets `active_profile_env=default,csvdp-prescription`
- `certify_init.sql` — adds `PrescriptionCredential` config to the DB
- `certify-csvdp-prescription.properties` — CSV plugin config for prescription data
- `prescription_data.csv` — demo prescription data linked to UIN `5860356276`
- `mimoto-issuers-config.json` — adds MedAxis Hospital as an issuer in Inji Web
- `docker-compose.yml` (eSignet) — changes UI port from 3000 to 3007

---

### 1.2 Set up GitHub Pages for the DID document

The DID document is a public JSON file that Inji Certify uses to publish its cryptographic keys. It must be hosted on a publicly accessible URL.

1. Go to [github.com/new](https://github.com/new) and create a **public** repository named `medaxis-did`
2. Clone it locally: `git clone https://github.com/<your-username>/medaxis-did.git   ← in parent-folder `   
3. Inside the repo, create the folder structure and a placeholder file:
   ```bash
   cd medaxis-did
   mkdir certify
   echo "{}" > certify/did.json
   git add .
   git commit -m "init"
   git push
   ```
4. Go to the repository **Settings → Pages** → set Source to **Deploy from a branch**, branch **main**, folder **/ (root)** → click **Save**
5. Wait 2 minutes. Your DID base URL will be: `https://<your-username>.github.io/medaxis-did/certify`

> You will fill in the real DID content in Step 1.7 after Inji Certify starts.

> ⚠️ The DID URL is currently configured as `did:web:ilyassr01zz.github.io:medaxis-did:certify` throughout the MOSIP config files. If you use a different GitHub username, update this value in:
> - `inji-certify/docker-compose/docker-compose-injistack/config/certify-csvdp-prescription.properties` → `mosip.certify.data-provider-plugin.did-url`
> - `inji-certify/docker-compose/docker-compose-injistack/certify_init.sql` → `did_url` field in the INSERT statement

---

### 1.3 Start eSignet

> If you completed Step 1.1b, the eSignet `docker-compose.yml` has already been replaced with the MedAxis version that maps the UI to port 3007. No manual edits are needed.

```bash
cd esignet/docker-compose
```

Start the stack:

```bash
docker-compose up -d
```

Wait 2 minutes for all containers to initialize.

✅ **Verify:** Open [http://localhost:8088/v1/esignet/swagger-ui.html](http://localhost:8088/v1/esignet/swagger-ui.html) — you should see the eSignet Swagger UI.

---

### 1.4 Register MedAxis as an OIDC client with eSignet

Run the following from inside the `MedAxis_Africa-did-hackathon/backend` folder.

**Step A — Generate an RSA keypair:**

```bash
node -e "
const crypto = require('crypto');
const fs = require('fs');
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});
fs.writeFileSync('esignet_private.pem', privateKey);
fs.writeFileSync('esignet_public.pem', publicKey);
console.log('Keys generated.');
"
```

**Step B — Export the public key in JWK format:**

```bash
node -e "
const crypto = require('crypto');
const fs = require('fs');
const pubPem = fs.readFileSync('esignet_public.pem', 'utf8');
const pubKey = crypto.createPublicKey(pubPem);
const jwk = pubKey.export({ format: 'jwk' });
console.log(JSON.stringify(jwk, null, 2));
"
```

Copy the `n` value from the output (a long base64 string).

**Step C — Register the client (PowerShell):**

Replace `YOUR_N_VALUE` with the `n` value you copied:

```powershell
$time = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
$body = "{`"requestTime`":`"$time`",`"request`":{`"clientId`":`"medaxis-client`",`"clientName`":`"MedAxis Africa`",`"relyingPartyId`":`"medaxis-client`",`"logoUri`":`"http://localhost:5173`",`"redirectUris`":[`"http://localhost:5173/login`"],`"userClaims`":[`"name`",`"phone_number`"],`"authContextRefs`":[`"mosip:idp:acr:static-code`"],`"publicKey`":{`"kty`":`"RSA`",`"n`":`"YOUR_N_VALUE`",`"e`":`"AQAB`"},`"grantTypes`":[`"authorization_code`"],`"clientAuthMethods`":[`"private_key_jwt`"]}}"
Invoke-RestMethod -Uri "http://localhost:8088/v1/esignet/client-mgmt/oidc-client" -Method POST -Body $body -ContentType "application/json"
```

✅ **Expected response:** `clientId: medaxis-client`, `status: ACTIVE`

**Linux / macOS alternative:**

Replace `YOUR_N_VALUE` with the `n` value you copied:

```bash
TIME=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
N_VALUE="YOUR_N_VALUE"

curl -X POST http://localhost:8088/v1/esignet/client-mgmt/oidc-client \
  -H "Content-Type: application/json" \
  -d "{\"requestTime\":\"$TIME\",\"request\":{\"clientId\":\"medaxis-client\",\"clientName\":\"MedAxis Africa\",\"relyingPartyId\":\"medaxis-client\",\"logoUri\":\"http://localhost:5173\",\"redirectUris\":[\"http://localhost:5173/login\"],\"userClaims\":[\"name\",\"phone_number\"],\"authContextRefs\":[\"mosip:idp:acr:static-code\"],\"publicKey\":{\"kty\":\"RSA\",\"n\":\"$N_VALUE\",\"e\":\"AQAB\"},\"grantTypes\":[\"authorization_code\"],\"clientAuthMethods\":[\"private_key_jwt\"]}}"
```

> The generated `esignet_private.pem` file must be placed at `backend/esignet_private.pem`. The backend reads it to sign client assertion JWTs during the OIDC token exchange.

---

### 1.5 Create mock identities in eSignet (now go to /MedAxis_Africa-did-hackathon folder)


Insert the four demo identities into the mock identity database (git bash):

> **Linux users:** Use single slash paths in `docker exec` commands. If you see path errors, replace `//home/mosip/...` with `/home/mosip/...`.

```bash
docker exec docker-compose-database-1 psql -U postgres -d mosip_mockidentitysystem -c "
INSERT INTO mockidentitysystem.mock_identity (individual_id, identity_json) VALUES
('DOCTOR001', '{\"individualId\":\"DOCTOR001\",\"pin\":\"111111\",\"email\":\"doctor@medaxis.ma\",\"phone\":\"+212612345678\",\"fullName\":[{\"language\":\"eng\",\"value\":\"Dr Ahmed MedAxis\"}],\"givenName\":[{\"language\":\"eng\",\"value\":\"Ahmed\"}],\"familyName\":[{\"language\":\"eng\",\"value\":\"MedAxis\"}],\"middleName\":[{\"language\":\"eng\",\"value\":\"Dr\"}],\"gender\":[{\"language\":\"eng\",\"value\":\"Male\"}],\"dateOfBirth\":\"1990/10/22\",\"streetAddress\":[{\"language\":\"eng\",\"value\":\"123 Medical St\"}],\"locality\":[{\"language\":\"eng\",\"value\":\"Casablanca\"}],\"region\":[{\"language\":\"eng\",\"value\":\"Casablanca\"}],\"postalCode\":\"20000\",\"country\":[{\"language\":\"eng\",\"value\":\"MA\"}],\"locale\":\"eng\",\"preferredLang\":\"eng\",\"password\":\"Doctor@123\",\"encodedPhoto\":\"\"}'),
('PHARM001', '{\"individualId\":\"PHARM001\",\"pin\":\"111111\",\"email\":\"pharm@medaxis.ma\",\"phone\":\"+212612345679\",\"fullName\":[{\"language\":\"eng\",\"value\":\"Youssef MedAxis\"}],\"givenName\":[{\"language\":\"eng\",\"value\":\"Youssef\"}],\"familyName\":[{\"language\":\"eng\",\"value\":\"MedAxis\"}],\"middleName\":[{\"language\":\"eng\",\"value\":\"Mr\"}],\"gender\":[{\"language\":\"eng\",\"value\":\"Male\"}],\"dateOfBirth\":\"1985/05/15\",\"streetAddress\":[{\"language\":\"eng\",\"value\":\"456 Pharmacy St\"}],\"locality\":[{\"language\":\"eng\",\"value\":\"Casablanca\"}],\"region\":[{\"language\":\"eng\",\"value\":\"Casablanca\"}],\"postalCode\":\"20000\",\"country\":[{\"language\":\"eng\",\"value\":\"MA\"}],\"locale\":\"eng\",\"preferredLang\":\"eng\",\"password\":\"Pharm@123\",\"encodedPhoto\":\"\"}'),
('PATIENT001', '{\"individualId\":\"PATIENT001\",\"pin\":\"111111\",\"email\":\"patient@medaxis.ma\",\"phone\":\"+212612345680\",\"fullName\":[{\"language\":\"eng\",\"value\":\"Karima Patient\"}],\"givenName\":[{\"language\":\"eng\",\"value\":\"Karima\"}],\"familyName\":[{\"language\":\"eng\",\"value\":\"Patient\"}],\"middleName\":[{\"language\":\"eng\",\"value\":\"Ms\"}],\"gender\":[{\"language\":\"eng\",\"value\":\"Female\"}],\"dateOfBirth\":\"1995/03/20\",\"streetAddress\":[{\"language\":\"eng\",\"value\":\"789 Patient St\"}],\"locality\":[{\"language\":\"eng\",\"value\":\"Casablanca\"}],\"region\":[{\"language\":\"eng\",\"value\":\"Casablanca\"}],\"postalCode\":\"20000\",\"country\":[{\"language\":\"eng\",\"value\":\"MA\"}],\"locale\":\"eng\",\"preferredLang\":\"eng\",\"password\":\"Patient@123\",\"encodedPhoto\":\"\"}'),
('REGULATOR001', '{\"individualId\":\"REGULATOR001\",\"pin\":\"111111\",\"email\":\"regulator@medaxis.ma\",\"phone\":\"+212612345681\",\"fullName\":[{\"language\":\"eng\",\"value\":\"Fatima MedAxis\"}],\"givenName\":[{\"language\":\"eng\",\"value\":\"Fatima\"}],\"familyName\":[{\"language\":\"eng\",\"value\":\"MedAxis\"}],\"middleName\":[{\"language\":\"eng\",\"value\":\"Ms\"}],\"gender\":[{\"language\":\"eng\",\"value\":\"Female\"}],\"dateOfBirth\":\"1975/08/10\",\"streetAddress\":[{\"language\":\"eng\",\"value\":\"1 Ministry St\"}],\"locality\":[{\"language\":\"eng\",\"value\":\"Rabat\"}],\"region\":[{\"language\":\"eng\",\"value\":\"Rabat\"}],\"postalCode\":\"10000\",\"country\":[{\"language\":\"eng\",\"value\":\"MA\"}],\"locale\":\"eng\",\"preferredLang\":\"eng\",\"password\":\"Regulator@123\",\"encodedPhoto\":\"\"}')
ON CONFLICT (individual_id) DO NOTHING;
"
```

✅ **Verify:** The command should return `INSERT 0 4` (or `INSERT 0 0` if already inserted).

---

### 1.6 Start Inji Certify

**Before starting, ensure the keystore file is properly set up (git bash):**
```bash
cd inji-certify/docker-compose/docker-compose-injistack/certs

# Download the PKCS12 keystore file
curl -L -o oidckeystore.p12.zip "https://github.com/mosip/documentation/raw/inji/docs/.gitbook/assets/oidckeystore.p12.zip"

# Remove any existing directory with the same name
rm -rf oidckeystore.p12

# Extract the keystore file
unzip oidckeystore.p12.zip

# When prompted to replace files, type 'A' and press Enter twice
# Clean up unnecessary files
rm oidckeystore.p12.zip
rm -rf __MACOSX

# Verify the file exists (should be ~4KB)
ls -lh oidckeystore.p12
```

**Now start the Inji Certify stack:**
```bash
cd ../
docker network create mosip_network 2>/dev/null || true
docker-compose up -d
```

Wait **3 minutes** for all services to be ready (Certify, Mimoto, Inji Web, database).

**Verify all containers are running:**
```bash
docker ps
```

You should see these containers running:
- `docker-compose-injistack-database-1`
- `docker-compose-injistack-certify-1`
- `mimoto-service`
- `docker-compose-injistack-certify-nginx-1`
- `inji-web`

✅ **Verify Certify is responding:**

Open your browser and navigate to [http://localhost:8090/v1/certify/issuance/.well-known/openid-credential-issuer](http://localhost:8090/v1/certify/issuance/.well-known/openid-credential-issuer) — you should see a JSON response with issuer metadata.

**Troubleshooting: If `mimoto-service` is not running:**

If the container exits with a keystore error, check the logs:
```bash
docker logs mimoto-service | tail -20
```

**Common error:** `java.io.FileNotFoundException: /home/mosip/certs/oidckeystore.p12 (Is a directory)`

**Fix:** Delete the directory and re-download the keystore:
```bash
cd inji-certify/docker-compose/docker-compose-injistack/certs
rm -rf oidckeystore.p12
curl -L -o oidckeystore.p12.zip "https://github.com/mosip/documentation/raw/inji/docs/.gitbook/assets/oidckeystore.p12.zip"
unzip oidckeystore.p12.zip
rm oidckeystore.p12.zip
rm -rf __MACOSX

cd ../
docker-compose down
sleep 5
docker-compose up -d
```

The keystore password is: **`xy4gh6swa2i`** (configured automatically in docker-compose.yaml).

---

### 1.7 Update the GitHub Pages DID document

> ⚠️ **This step is required every time Inji Certify restarts.** Inji Certify generates new keys on each startup. If the DID document on GitHub Pages is stale, VC signature verification will fail.

Fetch the current DID document from Inji Certify:

```bash
curl http://localhost:8090/v1/certify/issuance/.well-known/did.json
```

Copy the entire JSON output. Then:

1. Open your `medaxis-did` repository (cloned in Step 1.2)
2. Replace the contents of `certify/did.json` with the copied JSON
3. Commit and push:
   ```bash
   cd medaxis-did
   git add certify/did.json
   git commit -m "update DID document"
   git push
   ```
4. Wait **2 minutes** for GitHub Pages to redeploy

✅ **Verify:** Open `https://<your-username>.github.io/medaxis-did/certify/did.json` in a browser — it should return the full DID JSON (not `{}`).

> ⚠️ The DID URL is currently configured as `did:web:ilyassr01zz.github.io:medaxis-did:certify` throughout the MOSIP config files. If you use a different GitHub username, update this value in:
> - `inji-certify/docker-compose/docker-compose-injistack/config/certify-csvdp-prescription.properties` → `mosip.certify.data-provider-plugin.did-url`
> - `inji-certify/docker-compose/docker-compose-injistack/certify_init.sql` → `did_url` field in the INSERT statement

---

### 1.8 Fix credential context ordering in the database (first time only)

> ⚠️ This one-time fix ensures the VC fields render correctly. Without it, downloaded VCs show `${fieldName}` placeholders instead of real data.

```bash
docker exec docker-compose-injistack-database-1 psql -U postgres -d inji_certify -c "UPDATE certify.credential_config SET context = 'https://ilyassr01zz.github.io/medaxis-did/contexts/prescription.json,https://w3id.org/security/suites/ed25519-2020/v1,https://www.w3.org/2018/credentials/v1' WHERE credential_config_key_id = 'PrescriptionCredential';"
```

✅ **Expected:** `UPDATE 1`

> ⚠️ Replace `ilyassr01zz` with your own GitHub username in this command if you are hosting the DID document under a different account.

---

### 1.9 Start Inji Verify

```bash
cd inji-verify/docker-compose
docker-compose up -d
```

✅ **Verify:** Open [http://localhost:3000](http://localhost:3000) — the Inji Verify UI should load.

---

## Part 2 — MedAxis Application Setup

### 2.1 Clone this repository

```bash
cd MedAxis_Africa-did-hackathon

```

---

### 2.2 Backend setup

```bash
cd backend
npm install
```

Run database migrations and seed demo data:

```bash
npm run setup
npm audit fix
```

```bash
npx prisma generate
```

> This runs `prisma migrate dev` then seeds the database with demo accounts and a sample prescription.

Start the backend:

```bash
npm run dev
```

✅ **Verify:** Open [http://localhost:3005/api/health](http://localhost:3005/api/health) — you should see `{ "status": "ok" }`.

---

### 2.3 Frontend setup

Open a new terminal:

```bash
cd frontend
npm install
```
if npm install gave an error because of React conflict, run:

```bash
npm install --legacy-peer-deps
```


Create a `.env` file inside `frontend/`:

```env
VITE_API_URL=http://localhost:3005/api
VITE_APP_NAME=MedAxis
```

Start the frontend:

```bash
npm run dev
```

✅ **Verify:** Open [http://localhost:5173](http://localhost:5173) — the MedAxis login page should load.

---

## Part 3 — Running MedAxis with Docker (Recommended)

Instead of running the backend and frontend manually with `npm`, you can use Docker Compose to start the entire MedAxis application with a single command.

> ⚠️ This only dockerizes the MedAxis app (frontend + backend). The MOSIP stack (eSignet, Inji Certify, Inji Verify) must still be started separately as described in Part 1.

### Prerequisites

Docker Desktop must be running.

### Start MedAxis with Docker

From the root of the MedAxis_Africa-did-hackathon repository:

```bash
docker-compose up --build
```

This will:
1. Build the backend Docker image (Node.js 20)
2. Build the frontend Docker image (React + Vite)
3. Run database migrations automatically
4. Seed demo accounts
5. Start both services

✅ Frontend: [http://localhost:5173](http://localhost:5173)
✅ Backend: [http://localhost:3005](http://localhost:3005)

### Stop MedAxis Docker

```bash
docker-compose down
```

### Environment variables with Docker

The `docker-compose.yml` at the root of the repo includes all required environment variables. If you need to override any value, create a `.env` file at the root:

```env
JWT_SECRET=your-custom-secret
ESIGNET_BASE_URL=http://localhost:8088
```

---

## Project Structure

```
MedAxis_Africa-did-hackathon/
├── frontend/                    # React 19 + Vite frontend
│   ├── src/
│   │   ├── portals/
│   │   │   ├── login/           # Login — eSignet OIDC + demo credentials form
│   │   │   ├── doctor/          # Doctor workspace — issue prescriptions
│   │   │   ├── pharmacy/        # Pharmacy portal — lookup, dispense, verify
│   │   │   │   └── verification-screen.jsx
│   │   │   ├── patient/         # Patient portal — history, dispute, claim
│   │   │   └── regulator/       # National audit dashboard (4 view files)
│   │   ├── components/          # Layout, ProtectedRoute, Toast
│   │   ├── api/                 # Axios clients per domain
│   │   ├── hooks/               # useAuth context (JWT in memory)
│   │   └── utils/               # CNIE SHA-256 hashing
│   └── public/
├── backend/                     # Node.js + Express API
│   ├── src/
│   │   ├── routes/              # Auth, prescriptions, pharmacy, regulator
│   │   ├── controllers/         # Business logic per route group
│   │   ├── middleware/          # JWT auth, RBAC, audit logging, error handling
│   │   ├── services/            # eSignet + Inji Certify integrations
│   │   └── utils/               # Prisma client, hashing, response helpers
│   └── prisma/
│       ├── schema.prisma        # Full data model
│       ├── seed.js              # Demo account seeder
│       └── medaxis.db           # SQLite database
├── mosip-config/                ← Pre-configured MOSIP files (copy to MOSIP repos)
│   ├── inji-certify/            ← Modified Inji Certify config
│   │   └── docker-compose/
│   │       └── docker-compose-injistack/
│   │           ├── docker-compose.yaml
│   │           ├── certify_init.sql
│   │           └── config/
│   │               ├── certify-csvdp-prescription.properties
│   │               ├── prescription_data.csv
│   │               └── mimoto-issuers-config.json
│   └── esignet/                 ← Modified eSignet config (port 3007)
│       └── docker-compose/
│           └── docker-compose.yml
├── docs/
│   └── designs/                 # UI mockups for all portals
├── docker-compose.yml           # Docker Compose for MedAxis app
└── README.md
```

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

## Demo Credentials

### MedAxis Portal Login

After running `npm run setup` in the backend, these accounts are ready:

| Role | CNIE (Username) | Password | Portal |
|------|----------------|----------|--------|
| Doctor | `DOCTOR001` | `DOCTOR` | `/doctor` |
| Pharmacist | `PHARM001` | `PHARMACIST` | `/pharmacy` |
| Patient | `PATIENT001` | `PATIENT` | `/patient` |
| Regulator | `REGULATOR001` | `REGULATOR` | `/regulator` |

> **Note:** The traditional login accepts any password — only the CNIE username matters for role-based authentication. The passwords above are the seeded defaults.

**Demo prescription:** `RX-DEMO-0001` — Amoxicillin 500mg, status ACTIVE, linked to `PATIENT001`

### eSignet Digital ID Login (Sign in with Digital ID button)

| Role | UIN | PIN |
|------|-----|-----|
| Doctor | `DOCTOR001` | `111111` |
| Pharmacist | `PHARM001` | `111111` |
| Patient | `PATIENT001` | `111111` |
| Regulator | `REGULATOR001` | `111111` |

### Prescription VC Download (Inji Web — http://localhost:3004)

- Issuer: **MedAxis Hospital**
- Patient UIN: `5860356276`
- OTP: `111111`

---

## Demo Flow (6 Steps)

1. **Sign in as Doctor** (`DOCTOR001 / DOCTOR`) → issue a new prescription for patient CNIE `PATIENT001`
2. **Sign in as Pharmacist** (`PHARM001 / PHARMACIST`) → Patient Lookup → enter `PATIENT001` → see active prescription
3. **Verification screen** shows three checks animating green: Doctor VC valid ✓ / Prescription valid ✓ / Patient OTP confirmed ✓
4. **Confirm Dispense** → prescription becomes `DISPENSED`, permanently locked — cannot be reused
5. **Sign in as Patient** (`PATIENT001 / PATIENT`) → view prescription history marked DISPENSED
6. **Sign in as Regulator** (`REGULATOR001 / REGULATOR`) → national audit trail, doctor license registry, statistics

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

```

---

## eSignet Sub to CNIE Mapping

eSignet returns pairwise `sub` claims — opaque identifiers that are unique to each eSignet instance and keypair. The MedAxis backend maps these to user accounts in `backend/src/controllers/auth.controller.js`.

> ⚠️ The `sub` values currently hardcoded in the source code are specific to the original developer's eSignet instance. When you run a fresh eSignet with newly generated keys, you **will** get authentication errors on first login via the Digital ID button. This is normal and expected.

To fix this for your instance:

1. Start all services and open [http://localhost:5173](http://localhost:5173)
2. Click **Sign in with Digital ID**
3. Authenticate with UIN and PIN (e.g. `DOCTOR001` / `111111`)
4. You will see an error on the frontend — this is expected
5. In your backend console output, find the line:
   ```
   UNMAPPED SUB - add to SUB_TO_CNIE: <long-value> name: <name>
   ```
6. Copy the `sub` value
7. Open `backend/src/controllers/auth.controller.js`
8. Find the `SUB_TO_CNIE` object at the top of the `esignetCallback` function
9. Add this line: `'<your-sub-value>': 'DOCTOR001'`
10. Save — the backend will auto-restart (nodemon)
11. Try logging in again — it should work now
12. Repeat for all 4 roles: `PHARM001`, `PATIENT001`, `REGULATOR001`

---

## Daily Restart Procedure

> All commands below work on both Windows (Git Bash) and Linux/macOS terminal.

Every time you restart your machine, start services in this exact order:

1. **Start Docker Desktop** — wait until the engine shows "Running"
2. **Start eSignet:**
   ```bash
   cd esignet/docker-compose && docker-compose up -d
   ```
3. **Start Inji Certify:**
   ```bash
   cd inji-certify/docker-compose/docker-compose-injistack && docker-compose up -d
   ```
4. **Wait 3 minutes** for all containers to be healthy
5. **Update GitHub Pages DID** — fetch and push the new DID document (Step 1.7) — **required every restart**
6. **Start Inji Verify:**
   ```bash
   cd inji-verify/docker-compose && docker-compose up -d
   ```
7. **Start MedAxis backend:**
   ```bash
   cd MedAxis_Africa-did-hackathon/backend && npm run dev
   ```
8. **Start MedAxis frontend:**
   ```bash
   cd MedAxis_Africa-did-hackathon/frontend && npm run dev
   ```

---

## Common Issues and Fixes

### Backend not starting — port 3005 already in use

```bash
# Windows
netstat -ano | findstr :3005
taskkill /PID <pid> /F

# Linux/macOS
lsof -i :3005
kill -9 <pid>
```

### Login fails with correct credentials

Re-run the seed:

```bash
cd backend
npm run seed
```

### Doctor cannot create prescription — Prisma error

```bash
cd backend
npx prisma generate
npx prisma migrate dev
npm run seed
```

### Inji Certify crashes on startup — Root Key not available

> ⚠️ This deletes Certify's PKCS12 keys. You must update GitHub Pages DID (Step 1.7) after this.

```bash
cd inji-certify/docker-compose/docker-compose-injistack
rm -rf data/CERTIFY_PKCS12/*
docker-compose up -d
```

Then repeat Step 1.7.

### VC download fails — signature verification failed

The DID document on GitHub Pages is stale. Repeat Step 1.7.

### VC shows `${fieldName}` instead of real data

The credential config context order is wrong. Repeat Step 1.8.

### eSignet returns "requested scope not supported"

This is expected if you attempt to use the `prescription_vc_ldp` scope directly. MedAxis uses `mock_identity_vc_ldp`. No action needed.

### Docker containers not found by name

Container names vary by Docker Compose version. List your actual container names with:

```bash
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

Replace container names in `docker exec` commands accordingly.

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
