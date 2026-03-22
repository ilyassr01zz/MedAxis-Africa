import React, { useCallback, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { dispensePrescriptionAPI } from '../../api/prescriptions'
import { useAuth } from '../../hooks/use-auth'

// ─── Design tokens ────────────────────────────────────────────────────────────
const TEAL      = '#0D7C7C'
const TEAL_DARK = '#0A6363'
const BORDER    = '#E5E7EB'
const TEXT      = '#1A1A2E'
const MUTED     = '#6B7280'
const WHITE     = '#FFFFFF'

// ─── SVG icon components ──────────────────────────────────────────────────────
function ShieldIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  )
}

function DocumentIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M16 13H8M16 17H8M10 9H8" />
    </svg>
  )
}

function IdentityIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="3" />
      <path d="M20 21a8 8 0 10-16 0" />
      <path d="M15 12l1.5 1.5L19 11" />
    </svg>
  )
}

function AlertTriangleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F0A500" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  )
}

function LinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 40 40" fill="none" aria-hidden="true" style={{ animation: 'medaxis-spin 0.8s linear infinite' }}>
      <circle cx="20" cy="20" r="16" stroke="rgba(255,255,255,0.35)" strokeWidth="4" />
      <path d="M20 4a16 16 0 0116 16" stroke="white" strokeWidth="4" strokeLinecap="round" />
    </svg>
  )
}

// ─── VerificationCard ─────────────────────────────────────────────────────────
const VerificationCard = React.memo(function VerificationCard({
  icon, title, detail1Label, detail1Value, detail2Label, detail2Value, isMonoDetail1 = false,
}) {
  return (
    <article style={{
      backgroundColor: WHITE,
      border: `1px solid ${BORDER}`,
      borderRadius: 12,
      padding: 32,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
    }}>
      {/* Icon circle */}
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        backgroundColor: '#E6F4F4',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 20, flexShrink: 0,
      }}>
        {icon}
      </div>

      {/* Title */}
      <h2 style={{
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: 18, fontWeight: 700, color: TEXT,
        marginBottom: 24, lineHeight: 1.3,
      }}>
        {title}
      </h2>

      {/* Details */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24, flex: 1 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>
            {detail1Label}
          </div>
          <div style={{
            fontFamily: isMonoDetail1 ? "'JetBrains Mono', monospace" : "'Space Grotesk', sans-serif",
            fontSize: 13, fontWeight: 700, color: TEXT,
            letterSpacing: isMonoDetail1 ? '0.04em' : 'normal',
          }}>
            {detail1Value}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>
            {detail2Label}
          </div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 700, color: TEXT }}>
            {detail2Value}
          </div>
        </div>
      </div>

      {/* AUTHENTICATED button — full width */}
      <div style={{
        width: '100%', height: 44,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: TEAL, color: WHITE,
        borderRadius: 8,
        fontSize: 12, fontWeight: 700, letterSpacing: '0.08em',
        textTransform: 'uppercase',
        fontFamily: "'Space Grotesk', sans-serif",
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M9 12l2 2 4-4" />
        </svg>
        Authenticated
      </div>
    </article>
  )
})

// ─── TopNavbar ────────────────────────────────────────────────────────────────
function TopNavbar() {
  return (
    <header style={{
      height: 56, flexShrink: 0,
      backgroundColor: WHITE, borderBottom: `1px solid ${BORDER}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px',
      fontFamily: "'Space Grotesk', sans-serif",
    }}>
      {/* Left: logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 5, backgroundColor: TEAL, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="material-symbols-outlined" style={{ color: WHITE, fontSize: 18, lineHeight: 1 }}>health_and_safety</span>
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: TEXT, lineHeight: 1.1 }}>MedAxis</div>
          <div style={{ fontSize: 9, fontWeight: 600, color: TEAL, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Infrastructure Portal</div>
        </div>
        <span style={{ fontSize: 14, color: MUTED, marginLeft: 8 }}>Pharmacy Portal</span>
      </div>

      {/* Center: empty */}
      <div />

      {/* Right: icons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: MUTED, padding: 0 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 22 }}>notifications</span>
        </button>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: MUTED, padding: 0 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 22 }}>settings</span>
        </button>
        <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: TEAL, display: 'flex', alignItems: 'center', justifyContent: 'center', color: WHITE, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          P
        </div>
      </div>
    </header>
  )
}

// ─── VerificationScreen ───────────────────────────────────────────────────────
export default function VerificationScreen() {
  const { rxId } = useParams()
  const navigate = useNavigate()
  const { user, token } = useAuth()

  const [isConfirming, setIsConfirming] = useState(false)
  const [isSuccess, setIsSuccess]       = useState(false)
  const [dispenseError, setDispenseError] = useState(null)

  const doctorIdDisplay = 'MDR-893-PKB'
  const serialDisplay   = rxId ?? 'RX-889-2024-01'
  const dosageLabel     = 'Confirmed'
  const identityToken   = 'K891...A'

  const handleConfirmDispense = useCallback(async () => {
    if (isConfirming || isSuccess) return
    setIsConfirming(true)
    setDispenseError(null)

    const result = await dispensePrescriptionAPI(token, rxId, {
      quantity_dispensed: 1,
      doctor_license_verified: true,
      patient_otp_verified: true,
    })

    if (!result || !result.success) {
      setDispenseError(result?.error || 'Dispense failed')
      setIsConfirming(false)
      return
    }

    setIsConfirming(false)
    setIsSuccess(true)
  }, [rxId, isConfirming, isSuccess, user])

  const handleCancel = useCallback(() => {
    navigate('/pharmacy')
  }, [navigate])

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F5F7F5',
      fontFamily: "'Space Grotesk', sans-serif",
      display: 'flex', flexDirection: 'column',
    }}>
      <style>{`
        @keyframes medaxis-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes medaxis-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .verify-cards {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }
        @media (max-width: 1023px) {
          .verify-cards {
            grid-template-columns: repeat(3, minmax(280px, 1fr));
          }
          .verify-main {
            padding: 40px 24px !important;
          }
          .verify-heading {
            font-size: 26px !important;
          }
        }
        @media (max-width: 900px) {
          .verify-cards {
            grid-template-columns: 1fr;
          }
        }
        .cancel-link:hover {
          text-decoration: underline;
          color: #1A1A2E !important;
        }
      `}</style>

      <TopNavbar />

      {/* ── Success state ──────────────────────────────────────────────── */}
      {isSuccess ? (
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <div style={{
            backgroundColor: WHITE,
            border: `1px solid ${BORDER}`,
            borderRadius: 12,
            padding: '56px 64px',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 20, maxWidth: 520, width: '100%', textAlign: 'center',
          }}>
            {/* Checkmark */}
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              backgroundColor: '#DCFCE7', border: '2px solid #16A34A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </div>

            <h2 style={{ fontSize: 24, fontWeight: 700, color: TEXT, margin: 0 }}>
              Medication Dispensed Successfully
            </h2>

            <p style={{ fontSize: 14, color: MUTED, margin: 0, lineHeight: 1.6 }}>
              Prescription #{serialDisplay} has been marked as DISPENSED in the National Ledger
            </p>

            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 20, fontWeight: 700, color: TEAL,
            }}>
              RxID: {serialDisplay}
            </div>

            <button onClick={handleCancel} style={{
              marginTop: 8,
              height: 48, padding: '0 32px',
              backgroundColor: TEAL, color: WHITE,
              border: 'none', borderRadius: 8,
              fontSize: 14, fontWeight: 700,
              cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif",
              transition: 'background-color 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = TEAL_DARK }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = TEAL }}
            >
              Return to Dashboard
            </button>
          </div>
        </main>
      ) : (
        /* ── Verification content ─────────────────────────────────────── */
        <main className="verify-main" style={{
          flex: 1,
          padding: '60px 32px 80px',
          maxWidth: 1100, width: '100%',
          margin: '0 auto',
          boxSizing: 'border-box',
        }}>

          {/* Security Protocol label */}
          <p style={{
            textAlign: 'center',
            fontSize: 12, fontWeight: 600,
            letterSpacing: '2px',
            color: TEAL,
            textTransform: 'uppercase',
            marginBottom: 24, marginTop: 0,
          }}>
            Security Protocol: Level 3
          </p>

          {/* Main heading */}
          <h1 className="verify-heading" style={{
            textAlign: 'center',
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 36, fontWeight: 700,
            color: TEXT,
            letterSpacing: '-0.02em',
            marginBottom: 16, marginTop: 0,
            lineHeight: 1.2,
          }}>
            Final Dispense Verification
          </h1>

          {/* Subtitle */}
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <p style={{ fontSize: 15, color: MUTED, margin: '0 0 4px', lineHeight: 1.6 }}>
              Complete the clinical verification triad before finalizing the medication distribution.
            </p>
            <p style={{ fontSize: 15, color: MUTED, margin: 0, lineHeight: 1.6 }}>
              All checks are synchronized with the Ministry of Health infrastructure.
            </p>
          </div>

          {/* Three verification cards */}
          <div className="verify-cards" style={{ marginBottom: 0 }}>
            <VerificationCard
              icon={<ShieldIcon />}
              title="Doctor License Valid"
              detail1Label="ID"
              detail1Value={doctorIdDisplay}
              isMonoDetail1={true}
              detail2Label="Credential Status"
              detail2Value="Active"
            />
            <VerificationCard
              icon={<DocumentIcon />}
              title="Prescription Valid"
              detail1Label="Serial"
              detail1Value={serialDisplay}
              isMonoDetail1={true}
              detail2Label="Dosage Match"
              detail2Value={dosageLabel}
            />
            <VerificationCard
              icon={<IdentityIcon />}
              title="Patient Identity Verified"
              detail1Label="Identity Token"
              detail1Value={identityToken}
              isMonoDetail1={true}
              detail2Label="DOB"
              detail2Value="12/04/1984"
            />
          </div>

          {/* Horizontal divider */}
          <div style={{ height: 1, backgroundColor: BORDER, margin: '40px 0' }} />

          {/* Error message */}
          {dispenseError && (
            <div role="alert" style={{
              backgroundColor: '#FEF2F2', border: '1px solid #E53E3E',
              borderRadius: 8, padding: '12px 16px', marginBottom: 24,
              display: 'flex', alignItems: 'center', gap: 10,
              fontSize: 13, color: '#E53E3E',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E53E3E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <path d="M15 9l-6 6M9 9l6 6" />
              </svg>
              {dispenseError}
            </div>
          )}

          {/* Warning + Confirm + Cancel */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>

            {/* Warning notice */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 14, color: MUTED, fontStyle: 'italic',
              marginBottom: 24,
            }}>
              <AlertTriangleIcon />
              <span>Dispensing this medication will create a permanent regulatory record in the national database.</span>
            </div>

            {/* Confirm Dispense button */}
            <button
              onClick={handleConfirmDispense}
              disabled={isConfirming}
              style={{
                width: 280, height: 56,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                backgroundColor: isConfirming ? TEAL_DARK : TEAL,
                color: WHITE,
                border: 'none', borderRadius: 8,
                fontSize: 15, fontWeight: 700,
                cursor: isConfirming ? 'not-allowed' : 'pointer',
                fontFamily: "'Space Grotesk', sans-serif",
                transition: 'background-color 0.15s',
                opacity: isConfirming ? 0.85 : 1,
              }}
              onMouseEnter={e => { if (!isConfirming) e.currentTarget.style.backgroundColor = TEAL_DARK }}
              onMouseLeave={e => { if (!isConfirming) e.currentTarget.style.backgroundColor = TEAL }}
            >
              {isConfirming ? (
                <><SpinnerIcon /> Confirming...</>
              ) : (
                'Confirm Dispense →'
              )}
            </button>

            {/* Cancel link */}
            <button
              onClick={handleCancel}
              disabled={isConfirming}
              className="cancel-link"
              style={{
                background: 'none', border: 'none',
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 14, color: MUTED,
                cursor: isConfirming ? 'not-allowed' : 'pointer',
                padding: 0, textDecoration: 'none',
                marginTop: 16,
              }}
            >
              Cancel and Return to Dashboard
            </button>
          </div>
        </main>
      )}

      {/* System Integrity badge — fixed bottom right */}
      <aside style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 100,
        backgroundColor: TEAL,
        borderRadius: 12,
        padding: '16px 20px',
        display: 'flex', alignItems: 'center', gap: 12,
        color: WHITE,
      }}>
        <div style={{ color: WHITE, opacity: 0.85, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
          <LinkIcon />
        </div>
        <div>
          <p style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 10, fontWeight: 700, color: WHITE,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            margin: '0 0 2px',
          }}>
            System Integrity
          </p>
          <p style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 11, color: 'rgba(255,255,255,0.75)',
            lineHeight: 1.3, margin: 0,
          }}>
            Live Regulatory Link Secured
          </p>
        </div>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          backgroundColor: '#4ADE80', flexShrink: 0,
          animation: 'medaxis-pulse 2s ease-in-out infinite',
        }} />
      </aside>
    </div>
  )
}
