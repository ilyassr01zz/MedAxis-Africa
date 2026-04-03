import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../hooks/use-auth'

const TEAL   = '#0D7C7C'
const BORDER = '#E5E7EB'
const BG     = '#F5F7F5'
const TEXT   = '#1A1A2E'
const MUTED  = '#6B7280'

const ROLES = [
  { id: 'DOCTOR',     label: 'I am a Doctor',     icon: 'stethoscope' },
  { id: 'PHARMACIST', label: 'I am a Pharmacist',  icon: 'medication'  },
  { id: 'PATIENT',    label: 'I am a Patient',     icon: 'person'      },
  { id: 'REGULATOR',  label: 'I am a Regulator',   icon: 'gavel'       },
]

export default function LoginPage() {
  const [selectedRole, setSelectedRole] = useState('DOCTOR')
  const [username, setUsername]         = useState('')
  const [password, setPassword]         = useState('')
  const [roleError, setRoleError]       = useState('')
  const [esignetError, setEsignetError] = useState('')
  const { login, loginDirect, loading, error } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const callbackHandled = useRef(false)

  // Handle eSignet callback
  useEffect(() => {
    // Guard: only run once
    if (callbackHandled.current) return

    const code = searchParams.get('code');
    const state = searchParams.get('state');
    if (code && state) {
      callbackHandled.current = true
      handleEsignetCallback(code, state);
      return;
    }

    // Initialize eSignet button
    const timer = setTimeout(() => {
      if (window.SignInWithEsignetButton) {
        window.SignInWithEsignetButton.init({
          oidcConfig: {
            authorizeUri: "http://localhost:3007/authorize",
            redirect_uri: "http://localhost:5173/login",
            client_id: "medaxis-client",
            scope: "openid profile",
            nonce: Math.random().toString(36).substring(2),
            state: Math.random().toString(36).substring(2),
            acrValues: "mosip:idp:acr:static-code",
            display: "page",
            prompt: "login",
            maxAge: 21097600
          },
          buttonConfig: {
            shape: "soft_edges",
            labelText: "Sign in with Digital ID",
            background: "#0D7C7C",
            textColor: "#FFFFFF",
            borderColor: "#0D7C7C",
            font: "Space Grotesk",
            width: "100%"
          },
          signInElement: document.getElementById("esignet-btn")
        });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [])

  const handleEsignetCallback = async (code, state) => {
    try {
      setEsignetError('')
      const apiUrl = import.meta.env.VITE_API_URL
      const response = await fetch(`${apiUrl}/auth/esignet/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, state })
      })

      const data = await response.json()
      if (data.success && data.data.token) {
        // Build user object from eSignet response
        const user = {
          id: data.data.id || `esignet-${Date.now()}`,
          first_name: data.data.first_name || 'eSignet User',
          name: data.data.first_name || 'eSignet User',
          role: data.data.role || 'PATIENT'
        }

        // Store token in AuthContext using loginDirect (same way as regular login)
        loginDirect(data.data.token, user)
      } else {
        setEsignetError(data.error || 'eSignet authentication failed')
      }
    } catch (err) {
      console.error('eSignet callback error:', err)
      setEsignetError('Failed to process eSignet response')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setRoleError('')
    await login(username, password, selectedRole)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: BG, fontFamily: "'Space Grotesk', sans-serif" }}>

      {/* ── Top navbar ──────────────────────────────────────────────── */}
      <header style={{
        height: 56,
        padding: '0 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        borderBottom: `1px solid ${BORDER}`,
        flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32,
            backgroundColor: TEAL,
            borderRadius: 4,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: 18, lineHeight: 1 }}>
              health_and_safety
            </span>
          </div>
          <span style={{ fontWeight: 700, fontSize: 18, color: TEAL, letterSpacing: '-0.02em' }}>MedAxis</span>
        </div>

        {/* Country labels */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: 11, fontWeight: 600, color: MUTED, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          <span>Kingdom of Morocco</span>
          <span style={{ width: 1, height: 14, backgroundColor: BORDER }} />
          <span>Ministry of Health</span>
        </div>
      </header>

      {/* ── Main ────────────────────────────────────────────────────── */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
        <div style={{ width: '100%', maxWidth: 520 }}>

          {/* Card */}
          <div style={{
            backgroundColor: '#fff',
            border: `1px solid ${BORDER}`,
            borderRadius: 2,
            padding: '48px 40px',
          }}>

            {/* Heading */}
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <h1 style={{ fontSize: 28, fontWeight: 700, color: TEXT, letterSpacing: '-0.02em', marginBottom: 6 }}>
                System Authentication
              </h1>
              <p style={{ fontSize: 13, color: MUTED }}>
                Secure access to National Health Infrastructure
              </p>
            </div>

            {/* Role selector */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                Select Professional Role
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {ROLES.map((role) => {
                  const active = selectedRole === role.id
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => { setSelectedRole(role.id); setRoleError('') }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        minHeight: 56,
                        padding: '0 14px',
                        border: active ? `2px solid ${TEAL}` : `1px solid ${BORDER}`,
                        backgroundColor: active ? '#EBF5F5' : '#fff',
                        borderRadius: 2,
                        cursor: 'pointer',
                        fontSize: 14,
                        fontWeight: active ? 600 : 500,
                        color: active ? TEAL : MUTED,
                        fontFamily: "'Space Grotesk', sans-serif",
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 20, color: active ? TEAL : '#9CA3AF' }}>
                        {role.icon}
                      </span>
                      {role.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              {/* Username / CNIE */}
              <div style={{ marginBottom: 20 }}>
                <label htmlFor="cnie" style={{ display: 'block', fontSize: 11, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                  Username / CNIE
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="cnie"
                    type="text"
                    value={username}
                    onChange={(e) => { setUsername(e.target.value); setRoleError('') }}
                    placeholder="Enter ID number"
                    style={{
                      width: '100%',
                      height: 48,
                      padding: '0 44px 0 14px',
                      border: `1px solid ${BORDER}`,
                      borderRadius: 2,
                      fontSize: 14,
                      color: TEXT,
                      backgroundColor: '#fff',
                      outline: 'none',
                      fontFamily: "'Space Grotesk', sans-serif",
                      boxSizing: 'border-box',
                      transition: 'border-color 0.15s ease',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = TEAL)}
                    onBlur={(e)  => (e.target.style.borderColor = BORDER)}
                  />
                  <span className="material-symbols-outlined" style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    fontSize: 20, color: '#D1D5DB', pointerEvents: 'none',
                  }}>badge</span>
                </div>
              </div>

              {/* Password */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label htmlFor="password" style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Password
                  </label>
                  <a href="#" style={{ fontSize: 12, fontWeight: 600, color: TEAL, textDecoration: 'none' }}
                    onMouseEnter={(e) => (e.target.style.textDecoration = 'underline')}
                    onMouseLeave={(e) => (e.target.style.textDecoration = 'none')}>
                    Forgot access?
                  </a>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setRoleError('') }}
                    placeholder="••••••••"
                    style={{
                      width: '100%',
                      height: 48,
                      padding: '0 44px 0 14px',
                      border: `1px solid ${BORDER}`,
                      borderRadius: 2,
                      fontSize: 14,
                      color: TEXT,
                      backgroundColor: '#fff',
                      outline: 'none',
                      fontFamily: "'Space Grotesk', sans-serif",
                      boxSizing: 'border-box',
                      transition: 'border-color 0.15s ease',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = TEAL)}
                    onBlur={(e)  => (e.target.style.borderColor = BORDER)}
                  />
                  <span className="material-symbols-outlined" style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    fontSize: 20, color: '#D1D5DB', pointerEvents: 'none',
                  }}>lock</span>
                </div>
              </div>

              {/* Auth error (wrong credentials) */}
              {error && (
                <p style={{ fontSize: 13, color: '#E53E3E', textAlign: 'center', marginBottom: 12 }}>{error}</p>
              )}

              {/* Sign in button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  height: 52,
                  backgroundColor: loading ? '#6B7280' : TEAL,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 2,
                  fontSize: 13,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily: "'Space Grotesk', sans-serif",
                  transition: 'opacity 0.15s ease',
                }}
                onMouseEnter={(e) => { if (!loading) e.target.style.opacity = '0.88' }}
                onMouseLeave={(e) => { e.target.style.opacity = '1' }}
              >
                {loading ? 'Authenticating…' : 'Sign In to MedAxis'}
              </button>
            </form>

            {/* Role mismatch error */}
            {roleError && (
              <p style={{ fontSize: 13, color: '#E53E3E', textAlign: 'center', marginTop: 12, marginBottom: 0 }}>
                {roleError}
              </p>
            )}

            {/* OR divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '24px 0' }}>
              <div style={{ flex: 1, height: 1, backgroundColor: '#D1D5DB' }} />
              <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                OR
              </span>
              <div style={{ flex: 1, height: 1, backgroundColor: '#D1D5DB' }} />
            </div>

            {/* eSignet error */}
            {esignetError && (
              <p style={{ fontSize: 13, color: '#E53E3E', textAlign: 'center', marginBottom: 12 }}>
                {esignetError}
              </p>
            )}

            {/* eSignet button container */}
            <div id="esignet-btn" style={{ marginBottom: 20 }} />

            {/* Encrypted session */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: TEAL, flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                End-to-End Encrypted Session
              </span>
            </div>
          </div>

          {/* Compliance notice — outside the card */}
          <p style={{ textAlign: 'center', fontSize: 10, color: '#9CA3AF', lineHeight: 1.7, marginTop: 24, padding: '0 16px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
            Warning: This is a restricted government system. Unauthorized access attempts are logged and reported.
            By logging in, you agree to the regulatory data processing protocols of the Ministry of Health.
          </p>
        </div>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer style={{
        padding: '12px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        borderTop: `1px solid ${BORDER}`,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <span style={{ fontSize: 11, color: MUTED }}>Version 2.4.0-Clinical</span>
          <span style={{ fontSize: 11, color: MUTED }}>Security Audit: PASS</span>
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          {['Privacy Policy', 'System Status', 'Support Portal'].map((label) => (
            <a key={label} href="#" style={{ fontSize: 11, color: MUTED, textDecoration: 'none' }}
              onMouseEnter={(e) => (e.target.style.color = TEAL)}
              onMouseLeave={(e) => (e.target.style.color = MUTED)}>
              {label}
            </a>
          ))}
        </div>
      </footer>
    </div>
  )
}
