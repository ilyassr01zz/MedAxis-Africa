import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { login as loginRequest } from '../api/auth'

// ---------------------------------------------------------------------------
// Role → portal route mapping
// ---------------------------------------------------------------------------
const ROLE_ROUTES = {
  DOCTOR: '/doctor',
  PHARMACIST: '/pharmacy',
  PATIENT: '/patient',
  REGULATOR: '/regulator',
  ADMIN: '/admin',
  INSURER: '/insurer',
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const AuthContext = createContext(null)

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function AuthProvider({ children }) {
  // Token is held exclusively in React state — never written to localStorage.
  const [token, setToken] = useState(null)
  const [user, setUser] = useState(null)   // { id, name, role }
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const navigate = useNavigate()

  // -------------------------------------------------------------------------
  // login
  // -------------------------------------------------------------------------
  const login = useCallback(
    async (username, password, role) => {
      setLoading(true)
      setError(null)

      try {
        const result = await loginRequest(username, password, role)

        if (!result.success) {
          throw new Error(result.error || 'Authentication failed')
        }

        const { token: jwt, user: userData } = result.data

        setToken(jwt)
        setUser(userData)

        // Redirect to the portal that matches the authenticated role.
        const destination = ROLE_ROUTES[userData.role] ?? '/'
        navigate(destination, { replace: true })

        return { success: true }
      } catch (err) {
        const message =
          err?.response?.data?.error ?? err.message ?? 'Login failed'
        setError(message)
        return { success: false, error: message }
      } finally {
        setLoading(false)
      }
    },
    [navigate],
  )

  // -------------------------------------------------------------------------
  // loginDirect — for OAuth/eSignet flows that already have token + user
  // -------------------------------------------------------------------------
  const loginDirect = useCallback(
    (token, user) => {
      setToken(token)
      setUser(user)
      const destination = ROLE_ROUTES[user.role] ?? '/'
      navigate(destination, { replace: true })
    },
    [navigate],
  )

  // -------------------------------------------------------------------------
  // logout
  // -------------------------------------------------------------------------
  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
    setError(null)
    navigate('/', { replace: true })
  }, [navigate])

  // -------------------------------------------------------------------------
  // Derived state
  // -------------------------------------------------------------------------
  const isAuthenticated = token !== null && user !== null

  // Memoize the context value so consumers only re-render when state changes.
  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      error,
      isAuthenticated,
      login,
      loginDirect,
      logout,
    }),
    [user, token, loading, error, isAuthenticated, login, loginDirect, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useAuth() {
  const context = useContext(AuthContext)

  if (context === null) {
    throw new Error('useAuth must be used inside an AuthProvider')
  }

  return context
}
