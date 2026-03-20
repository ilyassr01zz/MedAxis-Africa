# MedAxis Africa — Design Document

## Theme
Light theme. White and light grey-teal backgrounds.
Professional government healthcare aesthetic.
Kingdom of Morocco / Ministry of Health feel.
NOT dark. NOT startup SaaS. NOT generic.

## Color Palette
Primary teal:        #0D7C7C
Background:          #F5F7F5 (light grey-green)
Sidebar background:  #FFFFFF
Card background:     #FFFFFF
Text primary:        #1A1A2E
Text secondary:      #6B7280
Accent teal button:  #0D7C7C
Border:              #E5E7EB
Status active:       #0D7C7C (teal dot)
Status pending:      #F0A500 (orange dot)
Status expired:      #E53E3E (red dot)
Status flagged:      #E53E3E (red dot)
Footer/status bar:   #0D7C7C (dark teal)

## Typography
Primary font: Space Grotesk (Google Fonts)
Monospace: JetBrains Mono (for RxIDs, prescription codes)
No Inter. No system fonts.

## Layout Pattern (All Portals)
- Left sidebar: white background, teal active state, icon + label
- Top navbar: white with MedAxis logo left, icons right
- Main content: light grey-green background (#F5F7F5)
- Cards: white background, subtle border, no drop shadow
- Bottom status bar: dark teal (#0D7C7C) for system status

## Global UI Rules
- No drop shadows — use borders only
- Status = colored dots (not badges)
- Buttons = solid teal (#0D7C7C) white text, no gradients
- Input fields = white background, grey border, teal on focus
- Tables = white background, grey header row, alternating subtle rows
- No stock illustrations
- No emoji in UI
- No gradient buttons
- Pagination = numbered with prev/next arrows

## Reference Mockups
All mockups in /docs/designs/ — match these exactly:
- login.png — System Authentication screen
- doctor-portal.png — Doctor Workspace
- pharmacy-lookup.png — Pharmacy Portal with CNIE lookup
- verification-screen_png.png — Final Dispense Verification
- patient-portal.png — Prescription History (patient view)
- regulator-dashboard.png — Regulatory Dashboard

## Portal-Specific Notes

### Login (login.png)
Role selector grid: Doctor / Pharmacist / Patient / Regulator
Selected role = teal border highlight
"Kingdom of Morocco" + "Ministry of Health" in top right
Warning text at bottom about restricted government system

### Doctor Portal (doctor-portal.png)
Split layout: form left, prescription history table right
Form fields: Patient CNIE, Drug code, Dosage, Duration
Button: "AUTHORIZE & PRINT" with shield icon
Stats bar at bottom: Total Today + Restricted Drugs count
Status bar: "REGISTRY SYNC ACTIVE" in teal

### Pharmacy Portal (pharmacy-lookup.png)
CNIE input at top with "FETCH RECORDS" button
Active Prescription Queue table below
Stats cards at bottom: Today's Dispenses, Stock Alerts, Wait Time, Network Status
Network Status card: dark teal background

### Verification Screen (verification-screen_png.png)
Three equal cards in a row
Each card: icon at top, title, details, AUTHENTICATED button
"Confirm Dispense" large button centered below
"SECURITY PROTOCOL: LEVEL 3" label at top
Note: Replace "Biometric Hash" with "Identity Token" in build

### Patient Portal (patient-portal.png)
Cards layout (not table) — each prescription is a card
Left border color = status indicator (teal/grey/orange/red)
Status label top left of each card
Doctor name + date on right side
No dense tables — simple and readable for non-technical users

### Regulator Dashboard (regulator-dashboard.png)
Three stats cards at top: Total Prescriptions, Registered Doctors, Active Pharmacies
Filter bar below cards
Dense data table with Prescription ID, Practitioner, Facility, Region, Status
Replace stock photo map with simple bar chart