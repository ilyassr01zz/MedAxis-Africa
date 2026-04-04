# MedAxis Africa — Frontend

React 19 + Vite 8 frontend for the MedAxis national prescription trust infrastructure.

## Quick Start

```bash
npm install
npm run dev
```

Runs at **http://localhost:5173** (backend must be running on port 3001)

## Environment Variables

Create a `.env` file in this directory:

```env
VITE_API_URL=http://localhost:3001/api
VITE_APP_NAME=MedAxis
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with HMR |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Vitest tests |

## Structure

```
src/
├── portals/
│   ├── login/              # Login page — eSignet OIDC + demo credentials form
│   ├── doctor/             # Doctor workspace — prescriptions, patient search
│   ├── pharmacy/           # Pharmacy portal — patient lookup, dispense flow
│   │   └── verification-screen.jsx  # Three-check verification + dispense confirm
│   ├── patient/            # Patient portal — prescription history, insurance claim
│   └── regulator/          # Regulator dashboard — 4 view files
│       ├── regulator-dashboard.jsx          # Shell + dashboard + disputes
│       ├── regulator-prescriptions-view.jsx # Paginated prescription registry
│       ├── regulator-statistics-view.jsx    # SVG charts analytics
│       └── doctor-licenses-view.jsx         # License management + approve/revoke
├── components/
│   ├── layout.jsx           # Shared sidebar shell layout
│   ├── protected-route.jsx  # Role-based route guard
│   └── toast.jsx            # Notification toast component
├── api/                     # Axios clients — auth, patients, prescriptions, pharmacy, regulator
├── hooks/
│   └── use-auth.jsx         # AuthContext — JWT stored in memory only
└── utils/
    └── hash.utils.js        # SHA-256 CNIE hashing (never store raw CNIE)
```

## Design Rules

- All styling via inline `style={{}}` objects — no Tailwind utility classes in portal JSX
- Font: Space Grotesk everywhere (locked — never Inter, Roboto, or system fonts)
- Primary color: `#0D7C7C` teal
- No drop shadows (`boxShadow` is forbidden), no gradients
- Government healthcare aesthetic — borders not shadows, status dots not badges

See the root `CLAUDE.md` for the full design system and architectural constraints.
