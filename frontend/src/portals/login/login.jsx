import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../hooks/use-auth'

const TEAL   = '#12A5A5'
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
          LEFT PANEL (38% width, solid teal background)
          ════════════════════════════════════════════════════════════ */}
      <div className="login-left-panel" style={{
        width: '42%',
        backgroundColor: TEAL,
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        minHeight: '100vh',
        boxSizing: 'border-box',
      }}>
        {/* Single centered group */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', maxWidth: 360 }}>

          {/* Logo */}
          <img src="/MedAxis-logo.png" alt="MedAxis" style={{
            width: '320px',
            height: '320px',
            objectFit: 'contain',
          }} />

          {/* Subtitle */}
          <p style={{
            color: 'rgba(255,255,255,0.8)',
            fontSize: '15px',
            margin: '8px 0 0 0',
            fontFamily: "'Space Grotesk', sans-serif",
          }}>
            National Prescription Trust Infrastructure
          </p>

          {/* Divider */}
          <div style={{
            width: '60%',
            height: 1,
            backgroundColor: 'rgba(255,255,255,0.2)',
            margin: '24px 0',
          }} />

          {/* Tagline */}
          <p style={{
            fontSize: 26,
            fontWeight: 700,
            color: '#fff',
            margin: 0,
            fontFamily: "'Space Grotesk', sans-serif",
          }}>
            Secure. Verified. Trusted.
          </p>

          {/* Description */}
          <p style={{
            fontSize: 15,
            color: '#fff',
            opacity: 0.75,
            margin: '12px 0 0 0',
            fontFamily: "'Space Grotesk', sans-serif",
            lineHeight: 1.8,
          }}>
            Morocco's digital prescription system powered by MOSIP Digital ID — connecting doctors, pharmacists, and patients through cryptographic identity verification.
          </p>

          {/* Trust badges */}
          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
            {[
              'Powered by MOSIP eSignet',
              'W3C Verifiable Credentials',
              'End-to-End Encrypted'
            ].map((badge) => (
              <div key={badge} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                fontSize: 15,
                color: '#fff',
                opacity: 0.9,
                fontFamily: "'Space Grotesk', sans-serif",
              }}>
                <span style={{ fontSize: 16 }}>✓</span>
                {badge}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{
            marginTop: 32,
            fontSize: 13,
            color: '#fff',
            opacity: 0.5,
            fontFamily: "'Space Grotesk', sans-serif",
            letterSpacing: '0.02em',
          }}>
            Kingdom of Morocco · Ministry of Health
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          RIGHT PANEL (62% width, light background)
          ════════════════════════════════════════════════════════════ */}
      <div className="login-right-panel" style={{
        width: '58%',
        backgroundColor: BG,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '48px',
        minHeight: '100vh',
        overflowY: 'auto',
        boxSizing: 'border-box',
      }}>

        {/* Content wrapper — max width centered */}
        <div style={{ maxWidth: 560, width: '100%' }}>

          {/* System header */}
          <div style={{ marginBottom: 48 }}>
            <h1 style={{
              fontSize: 32,
              fontWeight: 700,
              color: TEXT,
              margin: '0 0 12px',
              letterSpacing: '-0.02em',
              fontFamily: "'Space Grotesk', sans-serif",
            }}>
              System Authentication
            </h1>
            <p style={{
              fontSize: 16,
              color: MUTED,
              margin: 0,
              fontFamily: "'Space Grotesk', sans-serif",
            }}>
              Secure access to National Health Infrastructure
            </p>
          </div>

          {/* PRIMARY AUTH SECTION — eSignet */}
          <div style={{ marginBottom: 40 }}>
            <label style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 600,
              color: TEAL,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
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
                fontSize: 15,
                color: MUTED,
                margin: '0 0 16px',
                lineHeight: 1.5,
                fontFamily: "'Space Grotesk', sans-serif",
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
              fontSize: 13,
              color: '#9CA3AF',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              whiteSpace: 'nowrap',
              fontFamily: "'Space Grotesk', sans-serif",
            }}>
              or continue with
            </span>
            <div style={{ flex: 1, height: 1, backgroundColor: BORDER }} />
          </div>

          {/* SECONDARY AUTH SECTION — Traditional login */}
          <div>
            <label style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 600,
              color: '#9CA3AF',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: 12,
              fontFamily: "'Space Grotesk', sans-serif",
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
                        padding: '16px',
                        border: active ? `1px solid ${TEAL}` : `1px solid ${BORDER}`,
                        backgroundColor: active ? '#F0FAFA' : '#fff',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontSize: 15,
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
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Username / CNIE */}
              <div>
                <label htmlFor="cnie" style={{ display: 'block', fontSize: 13, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, fontFamily: "'Space Grotesk', sans-serif" }}>
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
                      height: 52,
                      padding: '0 14px',
                      border: `1px solid ${BORDER}`,
                      borderRadius: 4,
                      fontSize: 16,
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
                <label htmlFor="password" style={{ display: 'block', fontSize: 13, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, fontFamily: "'Space Grotesk', sans-serif" }}>
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
                      height: 52,
                      padding: '0 14px',
                      border: `1px solid ${BORDER}`,
                      borderRadius: 4,
                      fontSize: 16,
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
                  height: 52,
                  backgroundColor: loading ? '#6B7280' : TEAL,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  fontSize: 16,
                  fontWeight: 600,
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
            marginTop: 32,
            fontSize: 13,
            fontWeight: 600,
            color: MUTED,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontFamily: "'Space Grotesk', sans-serif",
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: TEAL, flexShrink: 0 }} />
            End-to-End Encrypted Session
          </div>
        </div>
      </div>
    </div>
  )
}
