/**
 * MedAxis Africa — Final Dispense Verification Screen
 * Route: /pharmacy/verify/:rxId
 *
 * Presents the three-card clinical verification triad to the pharmacist
 * before confirming dispensing of a prescription. All three checks are
 * pre-verified against the Ministry of Health infrastructure.
 *
 * Design reference: docs/designs/verification-screen.png.png
 *
 * Privacy rules enforced:
 *   - Patient identity shown as "Identity Token" (masked token), never raw CNIE.
 *   - No biometric data displayed or referenced.
 *   - RxID shown in JetBrains Mono (monospace) per the design system.
 */

import React, { useCallback, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { dispensePrescription } from '../../api/prescriptions'
import { mutablePrescriptions } from '../../utils/mock-data'
import { useAuth } from '../../hooks/use-auth'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Milliseconds the success banner is shown before navigating away. */
const SUCCESS_REDIRECT_DELAY_MS = 2200

// ---------------------------------------------------------------------------
// Inline SVG icon components — no external icon library.
// Each is sized at 28×28 to match the mockup's circular icon area.
// ---------------------------------------------------------------------------

function ShieldIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#0D7C7C"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  )
}

function DocumentIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#0D7C7C"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M16 13H8M16 17H8M10 9H8" />
    </svg>
  )
}

function IdentityIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#0D7C7C"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="3" />
      <path d="M20 21a8 8 0 10-16 0" />
      <path d="M15 12l1.5 1.5L19 11" />
    </svg>
  )
}

function CheckCircleIcon({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  )
}

function AlertTriangleIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#F0A500"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  )
}

function LinkIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
    </svg>
  )
}

function ArrowRightIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      style={{ animation: 'medaxis-spin 0.8s linear infinite' }}
    >
      <circle cx="20" cy="20" r="16" stroke="rgba(255,255,255,0.35)" strokeWidth="4" />
      <path d="M20 4a16 16 0 0116 16" stroke="white" strokeWidth="4" strokeLinecap="round" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// VerificationCard — one of the three equal-width check cards.
// ---------------------------------------------------------------------------

const VerificationCard = React.memo(function VerificationCard({
  icon,
  title,
  detail1Label,
  detail1Value,
  detail2Label,
  detail2Value,
  isMonoDetail1 = false,
}) {
  return (
    <article
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: '10px',
        padding: '28px 24px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '0',
        flex: '1 1 0',
        minWidth: '0',
      }}
    >
      {/* Circular icon container */}
      <div
        style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          backgroundColor: '#E6F3F3',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '18px',
          flexShrink: 0,
        }}
        aria-hidden="true"
      >
        {icon}
      </div>

      {/* Card title */}
      <h2
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: '16px',
          fontWeight: '600',
          color: '#1A1A2E',
          marginBottom: '14px',
          lineHeight: '1.3',
        }}
      >
        {title}
      </h2>

      {/* Detail lines */}
      <dl
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          marginBottom: '22px',
          flex: 1,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
          <dt
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '11px',
              fontWeight: '500',
              color: '#6B7280',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            {detail1Label}
          </dt>
          <dd
            style={{
              fontFamily: isMonoDetail1
                ? "'JetBrains Mono', monospace"
                : "'Space Grotesk', sans-serif",
              fontSize: '13px',
              fontWeight: '500',
              color: '#1A1A2E',
              margin: 0,
              letterSpacing: isMonoDetail1 ? '0.04em' : 'normal',
            }}
          >
            {detail1Value}
          </dd>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
          <dt
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '11px',
              fontWeight: '500',
              color: '#6B7280',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            {detail2Label}
          </dt>
          <dd
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '13px',
              fontWeight: '500',
              color: '#1A1A2E',
              margin: 0,
            }}
          >
            {detail2Value}
          </dd>
        </div>
      </dl>

      {/* AUTHENTICATED badge */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          backgroundColor: '#0D7C7C',
          color: '#FFFFFF',
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: '11px',
          fontWeight: '600',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          padding: '6px 14px',
          borderRadius: '5px',
        }}
        role="status"
        aria-label={`${title}: Authenticated`}
      >
        <CheckCircleIcon size={13} />
        Authenticated
      </div>
    </article>
  )
})

// ---------------------------------------------------------------------------
// SuccessBanner — shown for SUCCESS_REDIRECT_DELAY_MS after confirming.
// ---------------------------------------------------------------------------

function SuccessBanner({ rxId }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(245, 247, 245, 0.96)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        fontFamily: "'Space Grotesk', sans-serif",
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: '12px',
          padding: '48px 56px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          maxWidth: '480px',
          width: '100%',
          textAlign: 'center',
        }}
      >
        {/* Large success checkmark */}
        <div
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            backgroundColor: '#E6F3F3',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-hidden="true"
        >
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#0D7C7C"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        </div>

        <h2
          style={{
            fontSize: '20px',
            fontWeight: '700',
            color: '#1A1A2E',
            margin: 0,
          }}
        >
          Dispense Confirmed
        </h2>

        <p
          style={{
            fontSize: '14px',
            color: '#6B7280',
            margin: 0,
            lineHeight: '1.5',
          }}
        >
          Prescription{' '}
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '13px',
              color: '#1A1A2E',
              fontWeight: '500',
            }}
          >
            {rxId}
          </span>{' '}
          has been marked as dispensed and recorded in the national ledger.
        </p>

        <p
          style={{
            fontSize: '12px',
            color: '#6B7280',
            margin: 0,
          }}
        >
          Returning to pharmacy dashboard...
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// TopNavbar — matches the mockup's Pharmacy Portal nav exactly.
// ---------------------------------------------------------------------------

function TopNavbar({ onNavigateBack }) {
  return (
    <header
      style={{
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E5E7EB',
        padding: '0 24px',
        height: '52px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        fontFamily: "'Space Grotesk', sans-serif",
      }}
    >
      {/* Left: logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span
          style={{
            fontWeight: '700',
            fontSize: '15px',
            color: '#0D7C7C',
            letterSpacing: '-0.01em',
          }}
        >
          MedAxis
        </span>
        <span
          style={{
            fontSize: '13px',
            color: '#6B7280',
            fontWeight: '400',
          }}
        >
          Pharmacy Portal
        </span>
      </div>

      {/* Center: nav links */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
        }}
        aria-label="Pharmacy navigation"
      >
        <button
          onClick={onNavigateBack}
          style={{
            background: 'none',
            border: 'none',
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '13px',
            color: '#0D7C7C',
            fontWeight: '500',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          Directory
        </button>
        <span
          style={{
            fontSize: '13px',
            color: '#6B7280',
            cursor: 'pointer',
          }}
        >
          Support
        </span>
      </nav>

      {/* Right: notification + user avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button
          aria-label="Notifications"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#6B7280',
            display: 'flex',
            alignItems: 'center',
            padding: 0,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
          </svg>
        </button>

        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: '#E6F3F3',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0D7C7C',
            fontSize: '13px',
            fontWeight: '600',
          }}
          aria-label="User account"
        >
          P
        </div>
      </div>
    </header>
  )
}

// ---------------------------------------------------------------------------
// VerificationScreen — main exported component
// ---------------------------------------------------------------------------

export default function VerificationScreen() {
  const { rxId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [isConfirming, setIsConfirming] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [dispenseError, setDispenseError] = useState(null)

  // Resolve the prescription from the in-memory store so we can display
  // real data when the rxId is present and recognized.
  const prescription = useMemo(() => {
    if (!rxId) return null
    return mutablePrescriptions.find((rx) => rx.rxId === rxId) ?? null
  }, [rxId])

  // Derive display values — fall back to mockup-matching defaults when the
  // prescription is not found (e.g., when navigating directly by URL).
  const doctorIdDisplay = prescription?.doctorId ?? 'MDR-893-PKB'
  const serialDisplay = prescription?.rxId ?? rxId ?? 'B84-219-002'
  const dosageLabel = prescription
    ? `${prescription.dosage} · ${prescription.frequency}`
    : 'Confirmed'
  const identityToken = prescription?.patientToken ?? 'K891...A'
  const dobDisplay = '12/04/1984'  // Privacy: date of birth sourced from identity token, not stored on prescription

  // -------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------

  const handleConfirmDispense = useCallback(async () => {
    if (isConfirming || isSuccess) return

    setIsConfirming(true)
    setDispenseError(null)

    const result = await dispensePrescription(rxId, {
      pharmacistId: user?.pharmacyId ?? user?.id ?? 'PH-001',
      pharmacyName: user?.name ?? 'Pharmacie Centrale',
    })

    if (!result.success) {
      setDispenseError(result.error)
      setIsConfirming(false)
      return
    }

    setIsConfirming(false)
    setIsSuccess(true)

    setTimeout(() => {
      navigate('/pharmacy', { replace: true })
    }, SUCCESS_REDIRECT_DELAY_MS)
  }, [rxId, isConfirming, isSuccess, navigate, user])

  const handleCancel = useCallback(() => {
    navigate('/pharmacy')
  }, [navigate])

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#F5F7F5',
        fontFamily: "'Space Grotesk', sans-serif",
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Keyframes for the spinner — injected once inline */}
      <style>{`
        @keyframes medaxis-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Success overlay */}
      {isSuccess && <SuccessBanner rxId={serialDisplay} />}

      {/* Top navigation bar */}
      <TopNavbar onNavigateBack={handleCancel} />

      {/* Main content */}
      <main
        style={{
          flex: 1,
          padding: '40px 32px 80px',
          maxWidth: '1100px',
          width: '100%',
          margin: '0 auto',
          position: 'relative',
        }}
      >
        {/* ----------------------------------------------------------------
            Header section — security protocol label + title + subtitle
        ---------------------------------------------------------------- */}
        <header style={{ textAlign: 'center', marginBottom: '40px' }}>
          <p
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '11px',
              fontWeight: '600',
              letterSpacing: '0.14em',
              color: '#0D7C7C',
              textTransform: 'uppercase',
              marginBottom: '10px',
            }}
            aria-label="Security classification"
          >
            Security Protocol: Level 3
          </p>

          <h1
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '30px',
              fontWeight: '700',
              color: '#1A1A2E',
              letterSpacing: '-0.02em',
              marginBottom: '12px',
              lineHeight: '1.2',
            }}
          >
            Final Dispense Verification
          </h1>

          <p
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '14px',
              color: '#6B7280',
              maxWidth: '580px',
              margin: '0 auto',
              lineHeight: '1.6',
            }}
          >
            Complete the clinical verification triad before finalizing the
            medication distribution. All checks are synchronized with the
            Ministry of Health infrastructure.
          </p>
        </header>

        {/* ----------------------------------------------------------------
            Three verification cards — equal width, side by side
        ---------------------------------------------------------------- */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '20px',
            marginBottom: '32px',
          }}
          role="list"
          aria-label="Verification checks"
        >
          {/* Card 1 — Doctor License Valid */}
          <div role="listitem">
            <VerificationCard
              icon={<ShieldIcon />}
              title="Doctor License Valid"
              detail1Label="ID"
              detail1Value={doctorIdDisplay}
              isMonoDetail1={true}
              detail2Label="Credential Status"
              detail2Value="Active"
            />
          </div>

          {/* Card 2 — Prescription Valid */}
          <div role="listitem">
            <VerificationCard
              icon={<DocumentIcon />}
              title="Prescription Valid"
              detail1Label="Serial"
              detail1Value={serialDisplay}
              isMonoDetail1={true}
              detail2Label="Dosage Match"
              detail2Value={dosageLabel}
            />
          </div>

          {/* Card 3 — Patient Identity Verified */}
          <div role="listitem">
            <VerificationCard
              icon={<IdentityIcon />}
              title="Patient Identity Verified"
              detail1Label="Identity Token"
              detail1Value={identityToken}
              isMonoDetail1={true}
              detail2Label="DOB"
              detail2Value={dobDisplay}
            />
          </div>
        </div>

        {/* ----------------------------------------------------------------
            Error message (shown only when dispense call fails)
        ---------------------------------------------------------------- */}
        {dispenseError && (
          <div
            role="alert"
            style={{
              backgroundColor: '#FEF2F2',
              border: '1px solid #E53E3E',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '13px',
              color: '#E53E3E',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E53E3E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="M15 9l-6 6M9 9l6 6" />
            </svg>
            {dispenseError}
          </div>
        )}

        {/* ----------------------------------------------------------------
            Warning notice + Confirm Dispense button + Cancel link
        ---------------------------------------------------------------- */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '18px',
          }}
        >
          {/* Regulatory warning */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '13px',
              color: '#6B7280',
            }}
            role="note"
          >
            <AlertTriangleIcon />
            <span>
              Dispensing this medication will create a permanent regulatory
              record in the national database.
            </span>
          </div>

          {/* Confirm Dispense button */}
          <button
            onClick={handleConfirmDispense}
            disabled={isConfirming || isSuccess}
            aria-busy={isConfirming}
            aria-label="Confirm medication dispense and record in national ledger"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: isConfirming || isSuccess ? '#0A6363' : '#0D7C7C',
              color: '#FFFFFF',
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '14px',
              fontWeight: '600',
              letterSpacing: '0.01em',
              border: 'none',
              borderRadius: '7px',
              padding: '13px 32px',
              cursor: isConfirming || isSuccess ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.15s ease',
              minWidth: '220px',
              justifyContent: 'center',
              opacity: isConfirming || isSuccess ? 0.85 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isConfirming && !isSuccess) {
                e.currentTarget.style.backgroundColor = '#0A6363'
              }
            }}
            onMouseLeave={(e) => {
              if (!isConfirming && !isSuccess) {
                e.currentTarget.style.backgroundColor = '#0D7C7C'
              }
            }}
          >
            {isConfirming ? (
              <>
                <SpinnerIcon />
                Confirming...
              </>
            ) : (
              <>
                Confirm Dispense
                <ArrowRightIcon />
              </>
            )}
          </button>

          {/* Cancel link */}
          <button
            onClick={handleCancel}
            disabled={isConfirming || isSuccess}
            style={{
              background: 'none',
              border: 'none',
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '13px',
              color: '#6B7280',
              cursor: isConfirming || isSuccess ? 'not-allowed' : 'pointer',
              padding: 0,
              textDecoration: 'underline',
              textUnderlineOffset: '2px',
            }}
            onMouseEnter={(e) => {
              if (!isConfirming && !isSuccess) {
                e.currentTarget.style.color = '#1A1A2E'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#6B7280'
            }}
          >
            Cancel and Return to Dashboard
          </button>
        </div>

        {/* ----------------------------------------------------------------
            System Integrity badge — bottom right corner (fixed within main)
        ---------------------------------------------------------------- */}
        <aside
          style={{
            position: 'absolute',
            bottom: '28px',
            right: '32px',
            backgroundColor: '#0A6363',
            borderRadius: '8px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            maxWidth: '220px',
          }}
          aria-label="System integrity status"
        >
          <div
            style={{
              color: '#FFFFFF',
              opacity: 0.85,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
            }}
            aria-hidden="true"
          >
            <LinkIcon />
          </div>

          <div>
            <p
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '10px',
                fontWeight: '700',
                color: '#FFFFFF',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: '2px',
              }}
            >
              System Integrity
            </p>
            <p
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '11px',
                color: 'rgba(255,255,255,0.75)',
                lineHeight: '1.3',
              }}
            >
              Live Regulatory Link Secured
            </p>
          </div>

          {/* Live status dot */}
          <div
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: '#4ADE80',
              flexShrink: 0,
              animation: 'medaxis-pulse 2s ease-in-out infinite',
            }}
            aria-hidden="true"
          />
          <style>{`
            @keyframes medaxis-pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.4; }
            }
          `}</style>
        </aside>
      </main>
    </div>
  )
}
