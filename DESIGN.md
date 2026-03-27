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
Text muted:          #9CA3AF
Accent teal button:  #0D7C7C
Border:              #E5E7EB
Border light:        #F3F4F6
Active teal bg:      #E6F3F3 (icon containers, active nav hover)
Active teal bg 2:    #F0FAFA (card hover, active nav background)
Status active:       #0D7C7C (teal dot)
Status dispensed:    #16A34A (green dot)
Status pending:      #F0A500 (orange dot)
Status expired:      #9CA3AF (grey dot)
Status cancelled:    #E53E3E (red dot)
Status disputed:     #F59E0B (amber dot)
Status flagged:      #E53E3E (red dot)
Status suspended:    #F59E0B (amber dot)
Footer/status bar:   #0D7C7C (dark teal)
Error:               #E53E3E
Warning:             #F59E0B

## Typography
Primary font: Space Grotesk (Google Fonts)
Monospace: JetBrains Mono (for RxIDs, prescription codes, license numbers, numeric KPIs)
No Inter. No Roboto. No Arial. No system fonts.

Implementation: all fontFamily declarations are inline style props.
Never use Tailwind font classes. Every text element must declare fontFamily explicitly.

## Layout Pattern (All Portals)
- Left sidebar: white background, teal active state (bg #F0FAFA + left border 2px solid #0D7C7C), icon + label
- Top navbar: white with MedAxis logo left, portal label center, icons right
- Main content: light grey-green background (#F5F7F5)
- Cards: white background, subtle border (1px solid #E5E7EB), no drop shadow ever
- Bottom status bar: dark teal (#0D7C7C) for system status

## Global UI Rules
- No drop shadows — borders only (boxShadow is forbidden)
- Status = colored dots (7px circle, borderRadius 50%, not badges or pills)
- Buttons = solid teal (#0D7C7C) white text, no gradients
- Primary button hover = slightly darker teal (#0A6363)
- Input fields = white background, grey border (#E5E7EB), teal on focus (#0D7C7C)
- Tables = white background, grey header row (#F9FAFB), row borders (#F3F4F6)
- Pagination = numbered with prev/next arrows, active page teal background
- No stock illustrations
- No emoji in UI
- No gradient buttons
- All styles via inline style={{}} — never Tailwind utility classes in portal JSX

## Styling Implementation
All portal components use React inline styles exclusively.
Tailwind CSS is installed (v4) but only used for base resets in index.css.
Never write className="..." with Tailwind utilities in portal JSX files.
Reason: full control over exact design values, no class conflicts.

## Reference Mockups
All mockups in /docs/designs/ — match these exactly:
- login.png — System Authentication screen
- doctor-portal.png — Doctor Workspace
- pharmacy-lookup.png — Pharmacy Portal with CNIE lookup
- verification-screen_png.png — Final Dispense Verification
- patient-portal.png — Prescription History (patient view)
- regulator-dashboard.png — Regulatory Dashboard

---

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

The regulator portal is a full-screen takeover (position: fixed, inset: 0)
that renders one of 5 views based on sidebar navigation.

**Sidebar nav items** (top to bottom):
- Dashboard (default)
- Prescriptions
- Statistics
- Disputes (shows unreviewed count badge when > 0)
- Doctor Licenses

Active nav item style: backgroundColor #F0FAFA, borderLeft 3px solid #0D7C7C, text/icon #0D7C7C.

**View 1 — Dashboard (default)**
- Three stat cards at top (1/3 grid each, height 160px, borderBottom 3px solid #0D7C7C):
  - Card 1: Total Prescriptions — onClick navigates to Prescriptions view
  - Card 2: Registered Doctors — onClick navigates to Doctor Licenses view
  - Card 3: Active Pharmacies — onClick opens pharmacists modal
  - All cards: cursor pointer, hover background #F0FAFA (no shadow, no border change)
  - Values come from GET /api/regulator/stats (real database counts)
- Alert banner: shown when disputed > 0, red background, click to go to Disputes
- Filter bar (white card):
  - Region dropdown: All Morocco / Casablanca-Settat / Rabat-Salé-Kénitra / Marrakech-Safi / Fès-Meknès / Tanger-Tétouan
  - Status dropdown: All Records / Active / Dispensed / Expired / Cancelled / Disputed
  - Date range: From input[type=date] + To input[type=date]
  - Filters pass as query params to /api/regulator/stats — all counts update live
  - No search bar in the filter card (removed)
- Prescription table: shows prescriptionRows (from stats.prescriptions or MOCK_PRESCRIPTIONS)
  Columns: Prescription ID | Practitioner | Facility | Region | Status | Issuance Date | Action
- Bottom charts (2-column grid):
  - Left: "Prescription Density by Region" — CSS horizontal bar chart
    Selected region bar = full #0D7C7C opacity, others dimmed to 0.4 opacity
    "Top Activity" pill updates to show selected region
  - Right: "Verification Latency" — static system metric widget (not data-driven)

**View 2 — Prescriptions (RegulatorPrescriptionsView)**
Title: "Prescriptions" / subtitle: "National Prescription Registry"
- Search input (300ms debounce) + Region dropdown + Status dropdown
- Table: RxID | Doctor | Patient Token | Medication | Date | Region | Status
- Status dots: ACTIVE=teal, DISPENSED=green, EXPIRED=grey, CANCELLED=red, DISPUTED=amber
- Pagination: 10 rows/page, "Showing X–Y of Z prescriptions"
- Data from GET /api/regulator/prescriptions with query params

**View 3 — Statistics (RegulatorStatisticsView)**
Title: "Statistics" / subtitle: "Healthcare Analytics Overview"
- Two SVG charts side by side (NO Recharts — pure inline SVG):
  - Left: Line chart "Prescriptions Over Time" (Jan–Dec, hardcoded monthly data)
    SVG polyline stroke #0D7C7C, shaded area fill #0D7C7C opacity 0.08
    Gridlines, axis labels, highlight dots at first/last/max points
  - Right: Donut chart "License Status Breakdown"
    Uses stroke-dasharray/dashoffset technique on SVG circles (r=50, strokeWidth=20)
    Active=#0D7C7C, Expired=#9CA3AF, Suspended=#F59E0B
    Center text shows total doctor count
    Legend below: dot + label + count for each status
- Summary bar: 4 quick stats (Active / Dispensed / Expired / Disputed prescriptions)
  Values from stats prop (real database data)

**View 4 — Disputes (inline in regulator-dashboard.jsx)**
Title: "Patient Disputes" / subtitle shows pending count
- List of disputed prescriptions (accordion expand/collapse)
- Expanded: prescription details + doctor info + timeline
- "Mark as Reviewed" button → PATCH /api/regulator/disputes/:rx_id/review
- Optimistic update: row dims and shows "Reviewed" state immediately
- Unreviewed disputes: red left border. Reviewed: grey left border + 0.7 opacity

**View 5 — Doctor Licenses (DoctorLicensesView)**
Title: "Doctor Licenses" / subtitle: "Licensed Medical Practitioners Registry"
- Search (300ms debounce) + Region dropdown + License Status dropdown (All/Active/Suspended/Expired)
- Summary: "Showing X of Y doctors"
- Table: Doctor Name | License No. | Specialty | Region | Status | Registered | Actions
  - License No.: JetBrains Mono, teal color
  - Status: colored dot — ACTIVE=teal, SUSPENDED=amber, EXPIRED=grey
  - Actions column: Approve button + Revoke button
    - Approve disabled when already ACTIVE
    - Revoke disabled when SUSPENDED or EXPIRED
    - Click Approve → PATCH /api/regulator/doctors/:id/approve → optimistic update + AuditLog + success toast
    - Click Revoke → PATCH /api/regulator/doctors/:id/revoke → optimistic update + AuditLog + success toast
- Pagination: 10 rows/page
- Toast: bottom-right fixed, teal border=success / red border=error, 3s auto-dismiss

**Pharmacists Modal (triggered by Card 3 on Dashboard)**
- Centered overlay (rgba(0,0,0,0.3) background)
- White card, 580px wide, max-height 70vh, scrollable
- No drop shadow — border 1px solid #E5E7EB only
- Table: Name | License No. | Facility | Region | Status
- Close: × button top-right OR click overlay background
- Footer: "X pharmacist(s) registered on the network"
- Data from GET /api/regulator/pharmacists

---

## Chart Rules
- No Recharts, no chart library of any kind — use inline SVG only
- SVG viewBox and dimensions always declared
- Colors strictly from palette above
- No drop shadows on charts
- Fonts in SVG text elements: Space Grotesk (axes/labels) or JetBrains Mono (numeric values)
- Line charts: stroke #0D7C7C, strokeWidth 2, shaded area fill opacity 0.08
- Donut charts: stroke-dasharray technique, not arc path math
- Bar charts: CSS div bars (height/backgroundColor), not SVG

## Toast / Notification Rules
- Two systems exist in the regulator dashboard:
  1. Legacy useToast() → single centered dark toast (used for generic messages)
  2. actionToast state → bottom-right fixed toast with teal (success) or red (error) left border
- Toast shows for 3 seconds then auto-dismisses
- No new npm packages for toasts — built with useState + useEffect
- Bottom-right position: position fixed, bottom 24, right 24, zIndex 9999
