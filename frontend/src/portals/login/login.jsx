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
    <div style={{ minHeight: '100vh', display: 'flex', backgroundColor: BG, fontFamily: "'Space Grotesk', sans-serif" }}>
      <style>{`
        @media (max-width: 768px) {
          .login-left-panel { display: none !important; }
          .login-right-panel { width: 100% !important; }
        }
      `}</style>

      {/* ════════════════════════════════════════════════════════════
          LEFT PANEL (40% width, teal background)
          ════════════════════════════════════════════════════════════ */}
      <div className="login-left-panel" style={{
        width: '40%',
        backgroundColor: TEAL,
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 40px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Geometric pattern overlay */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,0.08) 35px, rgba(255,255,255,0.08) 70px)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: 360 }}>
          {/* Top section */}
          <img src="/medaxis-logo.png" alt="MedAxis" style={{
            width: 120,
            height: 'auto',
            marginBottom: 20,
            filter: 'brightness(0) invert(1)',
          }} />

          <h1 style={{
            fontSize: 28,
            fontWeight: 700,
            margin: '0 0 8px',
            textAlign: 'center',
          }}>
            MedAxis Africa
          </h1>

          <p style={{
            fontSize: 14,
            opacity: 0.8,
            margin: 0,
            textAlign: 'center',
            lineHeight: 1.4,
          }}>
            National Prescription Trust Infrastructure
          </p>

          {/* Middle section */}
          <div style={{ marginTop: 48, textAlign: 'center' }}>
            <p style={{
              fontSize: 20,
              fontWeight: 700,
              margin: '0 0 16px',
            }}>
              Secure. Verified. Trusted.
            </p>

            <p style={{
              fontSize: 14,
              opacity: 0.75,
              margin: 0,
              lineHeight: 1.6,
              maxWidth: 280,
            }}>
              Morocco's digital prescription system powered by MOSIP Digital ID — connecting doctors, pharmacists, and patients through cryptographic identity verification.
            </p>
          </div>

          {/* Bottom section */}
          <div style={{ marginTop: 48, width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              'Powered by MOSIP eSignet',
              'W3C Verifiable Credentials',
              'End-to-End Encrypted'
            ].map((badge) => (
              <div key={badge} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                opacity: 0.9,
                justifyContent: 'center',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
                {badge}
              </div>
            ))}
          </div>

          {/* Footer text */}
          <div style={{
            marginTop: 64,
            paddingTop: 24,
            borderTop: '1px solid rgba(255,255,255,0.2)',
            fontSize: 12,
            opacity: 0.5,
            textAlign: 'center',
          }}>
            Kingdom of Morocco · Ministry of Health
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          RIGHT PANEL (60% width, light background)
          ════════════════════════════════════════════════════════════ */}
      <div className="login-right-panel" style={{
        width: '60%',
        backgroundColor: BG,
        display: 'flex',
        flexDirection: 'column',
        padding: '48px',
        overflowY: 'auto',
        boxSizing: 'border-box',
      }}>

        {/* System header */}
        <div style={{ marginBottom: 48 }}>
          <h1 style={{
            fontSize: 26,
            fontWeight: 700,
            color: TEXT,
            margin: '0 0 12px',
            letterSpacing: '-0.02em',
          }}>
            System Authentication
          </h1>
          <p style={{
            fontSize: 14,
            color: MUTED,
            margin: 0,
          }}>
            Secure access to National Health Infrastructure
          </p>
        </div>

        {/* PRIMARY AUTH SECTION — eSignet */}
        <div style={{ marginBottom: 40 }}>
          <label style={{
            display: 'block',
            fontSize: 11,
            fontWeight: 600,
            color: TEAL,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 12,
          }}>
            Authenticate with Digital ID
          </label>

          <div style={{
            backgroundColor: '#fff',
            border: `1px solid ${BORDER}`,
            borderRadius: 8,
            padding: 24,
          }}>
            <p style={{
              fontSize: 13,
              color: MUTED,
              margin: '0 0 16px',
              lineHeight: 1.5,
            }}>
              Use your Carte Nationale d'Identité Électronique (CNIE) to authenticate securely via eSignet
            </p>

            {esignetError && (
              <p style={{ fontSize: 13, color: '#E53E3E', marginBottom: 12 }}>
                {esignetError}
              </p>
            )}

            <div id="esignet-btn" style={{ width: '100%' }} />
          </div>
        </div>

        {/* DIVIDER */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          margin: '24px 0 32px',
        }}>
          <div style={{ flex: 1, height: 1, backgroundColor: BORDER }} />
          <span style={{
            fontSize: 12,
            color: '#9CA3AF',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            whiteSpace: 'nowrap',
          }}>
            ou continuer avec
          </span>
          <div style={{ flex: 1, height: 1, backgroundColor: BORDER }} />
        </div>

        {/* SECONDARY AUTH SECTION — Traditional login */}
        <div>
          <label style={{
            display: 'block',
            fontSize: 11,
            fontWeight: 600,
            color: '#9CA3AF',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 12,
          }}>
            Staff / Demo Access
          </label>

          {/* Role selector */}
          <div style={{ marginBottom: 20 }}>
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
                      gap: 8,
                      minHeight: 44,
                      padding: '0 10px',
                      border: active ? `1px solid ${TEAL}` : `1px solid ${BORDER}`,
                      backgroundColor: active ? '#F0FAFA' : '#fff',
                      borderRadius: 4,
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: active ? 600 : 500,
                      color: active ? TEAL : MUTED,
                      fontFamily: "'Space Grotesk', sans-serif",
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: active ? TEAL : '#9CA3AF' }}>
                      {role.icon}
                    </span>
                    {role.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Username / CNIE */}
            <div>
              <label htmlFor="cnie" style={{ display: 'block', fontSize: 11, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
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
                    height: 44,
                    padding: '0 14px',
                    border: `1px solid ${BORDER}`,
                    borderRadius: 4,
                    fontSize: 14,
                    color: TEXT,
                    backgroundColor: '#fff',
                    outline: 'none',
                    fontFamily: "'Space Grotesk', sans-serif",
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s ease',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = TEAL)}
                  onBlur={(e) => (e.target.style.borderColor = BORDER)}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" style={{ display: 'block', fontSize: 11, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setRoleError('') }}
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    height: 44,
                    padding: '0 14px',
                    border: `1px solid ${BORDER}`,
                    borderRadius: 4,
                    fontSize: 14,
                    color: TEXT,
                    backgroundColor: '#fff',
                    outline: 'none',
                    fontFamily: "'Space Grotesk', sans-serif",
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s ease',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = TEAL)}
                  onBlur={(e) => (e.target.style.borderColor = BORDER)}
                />
              </div>
            </div>

            {/* Errors */}
            {error && (
              <p style={{ fontSize: 13, color: '#E53E3E', margin: 0 }}>{error}</p>
            )}
            {roleError && (
              <p style={{ fontSize: 13, color: '#E53E3E', margin: 0 }}>{roleError}</p>
            )}

            {/* Sign in button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                height: 44,
                backgroundColor: loading ? '#6B7280' : TEAL,
                color: '#fff',
                border: 'none',
                borderRadius: 4,
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
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          marginTop: 'auto',
          paddingTop: 32,
          fontSize: 11,
          fontWeight: 600,
          color: MUTED,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: TEAL, flexShrink: 0 }} />
          End-to-End Encrypted Session
        </div>
      </div>
    </div>
  )
}
