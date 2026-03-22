import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './hooks/use-auth'
import ProtectedRoute from './components/protected-route'
import Layout from './components/layout'

// ---------------------------------------------------------------------------
// Lazy-loaded portals — each portal is a separate code-split chunk.
// Routes are defined by actor role; import paths match the folder convention.
// ---------------------------------------------------------------------------
const LoginPage = lazy(() => import('./portals/login/login.jsx'))
const DoctorPortal = lazy(() => import('./portals/doctor/doctor-portal.jsx'))
const PharmacyPortal = lazy(() => import('./portals/pharmacy/pharmacy-portal.jsx'))
const VerificationScreen = lazy(() => import('./portals/pharmacy/verification-screen.jsx'))
const PatientPortal = lazy(() => import('./portals/patient/patient-portal.jsx'))
const RegulatorDashboard = lazy(() => import('./portals/regulator/regulator-dashboard.jsx'))

// ---------------------------------------------------------------------------
// Suspense fallback — minimal centered spinner using MedAxis teal.
// Matches the government-health aesthetic: no text, no illustration, no logo.
// ---------------------------------------------------------------------------
function PortalLoader() {
  return (
    <div
      role="status"
      aria-label="Loading portal"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        width: '100vw',
        backgroundColor: '#F5F7F5',
      }}
    >
      <svg
        width="40"
        height="40"
        viewBox="0 0 40 40"
        fill="none"
        aria-hidden="true"
        style={{ animation: 'spin 0.9s linear infinite' }}
      >
        <circle
          cx="20"
          cy="20"
          r="16"
          stroke="#E5E7EB"
          strokeWidth="4"
        />
        <path
          d="M20 4a16 16 0 0 1 16 16"
          stroke="#0D7C7C"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
      {/* Keyframes injected inline to avoid an extra CSS file dependency */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
export default function App() {
  return (
    /*
     * AuthProvider must sit inside BrowserRouter (which is mounted in
     * main.jsx) so that useNavigate is available to the login/logout
     * handlers inside use-auth.jsx.
     */
    <AuthProvider>
      <Suspense fallback={<PortalLoader />}>
        <Routes>
          {/* ----------------------------------------------------------------
              Public route — accessible to everyone
          ---------------------------------------------------------------- */}
          <Route path="/" element={<LoginPage />} />

          {/* ----------------------------------------------------------------
              Doctor portal — role: DOCTOR (with sidebar layout)
          ---------------------------------------------------------------- */}
          <Route element={<ProtectedRoute allowedRoles={['DOCTOR']} />}>
            <Route element={<Layout />}>
              <Route path="/doctor" element={<DoctorPortal />} />
            </Route>
          </Route>

          {/* ----------------------------------------------------------------
              Pharmacy portal — role: PHARMACIST (with sidebar layout)
              /pharmacy              → prescription queue + CNIE lookup
              /pharmacy/verify/:rxId → three-card dispense verification
          ---------------------------------------------------------------- */}
          <Route element={<ProtectedRoute allowedRoles={['PHARMACIST']} />}>
            <Route element={<Layout />}>
              <Route path="/pharmacy" element={<PharmacyPortal />} />
            </Route>
            <Route path="/pharmacy/verify/:rxId" element={<VerificationScreen />} />
          </Route>

          {/* ----------------------------------------------------------------
              Patient portal — role: PATIENT (layout with no sidebar)
          ---------------------------------------------------------------- */}
          <Route element={<ProtectedRoute allowedRoles={['PATIENT']} />}>
            <Route element={<Layout />}>
              <Route path="/patient" element={<PatientPortal />} />
            </Route>
          </Route>

          {/* ----------------------------------------------------------------
              Regulator dashboard — role: REGULATOR (with sidebar layout)
          ---------------------------------------------------------------- */}
          <Route element={<ProtectedRoute allowedRoles={['REGULATOR']} />}>
            <Route element={<Layout />}>
              <Route path="/regulator" element={<RegulatorDashboard />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </AuthProvider>
  )
}
