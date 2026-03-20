import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/use-auth'

/**
 * ProtectedRoute
 *
 * Guards a portal route by checking two conditions:
 *   1. The visitor is authenticated (valid token + user in memory).
 *   2. The authenticated user's role is listed in `allowedRoles`.
 *
 * If either check fails the visitor is silently redirected to / (the Login
 * page). No error message is shown — security by obscurity is appropriate
 * here because revealing "wrong role" vs "not authenticated" leaks information.
 *
 * Usage (in App.jsx):
 *   <Route element={<ProtectedRoute allowedRoles={['DOCTOR']} />}>
 *     <Route path="/doctor" element={<DoctorPortal />} />
 *   </Route>
 *
 * The component renders <Outlet /> when both checks pass, which allows it to
 * wrap any number of nested routes without extra wrapper divs.
 *
 * Props:
 *   allowedRoles  string[]  Roles permitted to access the wrapped route(s).
 *   children      ReactNode Optional — renders children directly when Outlet
 *                           is not used (e.g. wrapping a single element route).
 */
export default function ProtectedRoute({ allowedRoles = [], children }) {
  const { isAuthenticated, user } = useAuth()

  // Not authenticated at all → back to login.
  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  // Authenticated but role is not in the allowed list → back to login.
  // This prevents a doctor navigating manually to /pharmacy, for example.
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  // Both checks passed — render the protected content.
  return children ?? <Outlet />
}
