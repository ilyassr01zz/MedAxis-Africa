import { useState, useMemo, useCallback, memo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/use-auth'
import Toast, { useToast } from '../../components/toast'

// ---------------------------------------------------------------------------
// Mock data — exact values from mockup spec
// ---------------------------------------------------------------------------
const MOCK_PRESCRIPTIONS = [
  {
    rxId: 'RX-889-2024-01',
    doctorName: 'Dr. Yassine Alaoui',
    doctorSpecialty: 'Cardiology',
    doctorLocation: 'Rabat Gen.',
    dateIssued: 'Oct 24, 2023',
    timeIssued: '09:45',
    status: 'VALID',
  },
  {
    rxId: 'RX-889-2024-02',
    doctorName: 'Dr. Fatima Zahra',
    doctorSpecialty: 'Pediatrics',
    doctorLocation: 'Casablanca Med',
    dateIssued: 'Oct 23, 2023',
    timeIssued: '14:20',
    status: 'PENDING',
  },
  {
    rxId: 'RX-889-2024-03',
    doctorName: 'Dr. Ahmed Mansour',
    doctorSpecialty: 'General Medicine',
    doctorLocation: 'Tangier',
    dateIssued: 'Oct 22, 2023',
    timeIssued: '11:10',
    status: 'VALID',
  },
  {
    rxId: 'RX-889-2024-04',
    doctorName: 'Dr. Leila Benjelloun',
    doctorSpecialty: 'Dermatology',
    doctorLocation: 'Marrakesh',
    dateIssued: 'Oct 20, 2023',
    timeIssued: '16:55',
    status: 'EXPIRED',
  },
]

const TOTAL_RECORDS = 124
const ROWS_PER_PAGE = 4

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------
const STATUS_CONFIG = {
  VALID:     { dotColor: '#16A34A', label: 'VALID' },
  PENDING:   { dotColor: '#F0A500', label: 'PENDING' },
  EXPIRED:   { dotColor: '#E53E3E', label: 'EXPIRED' },
  DISPENSED: { dotColor: '#6B7280', label: 'DISPENSED' },
}

// ---------------------------------------------------------------------------
// Sidebar nav items
// ---------------------------------------------------------------------------
const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard',       icon: 'dashboard'     },
  { key: 'queue',     label: 'Active Queue',    icon: 'queue'         },
  { key: 'lookup',    label: 'Patient Lookup',  icon: 'person_search' },
  { key: 'history',   label: 'Dispense History',icon: 'history'       },
]

// ---------------------------------------------------------------------------
// Small reusable components
// ---------------------------------------------------------------------------

function StatusDot({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.VALID
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <span style={{
        display: 'inline-block', width: '7px', height: '7px',
        borderRadius: '50%', backgroundColor: cfg.dotColor, flexShrink: 0,
      }} />
      <span style={{
        fontSize: '11px', fontWeight: 700, color: cfg.dotColor,
        letterSpacing: '0.05em', fontFamily: "'Space Grotesk', sans-serif",
      }}>
        {cfg.label}
      </span>
    </span>
  )
}

function GhostBtn({ onClick, children, height = 36 }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        height, padding: '0 12px',
        backgroundColor: '#FFFFFF',
        border: `1px solid ${hov ? '#0D7C7C' : '#E5E7EB'}`,
        borderRadius: '4px',
        fontSize: '11px', fontWeight: 700,
        color: hov ? '#0D7C7C' : '#6B7280',
        cursor: 'pointer',
        fontFamily: "'Space Grotesk', sans-serif",
        letterSpacing: '0.05em',
        transition: 'border-color 0.15s, color 0.15s',
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {children}
    </button>
  )
}

function PageBtn({ page, current, onClick }) {
  const active = page === current
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={() => onClick(page)}
      style={{
        width: 30, height: 30,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `1px solid ${active ? '#0D7C7C' : hov ? '#0D7C7C' : '#E5E7EB'}`,
        borderRadius: '4px',
        backgroundColor: active ? '#0D7C7C' : '#FFFFFF',
        color: active ? '#FFFFFF' : hov ? '#0D7C7C' : '#6B7280',
        fontSize: '12px', fontWeight: 700, cursor: 'pointer',
        fontFamily: "'Space Grotesk', sans-serif",
        transition: 'all 0.15s',
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {page}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Prescription table row — 72px tall
// ---------------------------------------------------------------------------
const PrescriptionRow = memo(function PrescriptionRow({ rx, onDispense }) {
  const canDispense = rx.status === 'VALID'
  const isPending   = rx.status === 'PENDING'
  const isExpired   = rx.status === 'EXPIRED'

  return (
    <tr style={{ borderBottom: '1px solid #F3F4F6', height: '72px' }}>
      {/* Prescription ID */}
      <td style={{ padding: '0 16px', verticalAlign: 'middle' }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '12px', fontWeight: 600,
          color: '#0D7C7C', letterSpacing: '0.03em',
        }}>
          #{rx.rxId}
        </span>
      </td>

      {/* Doctor name + specialty */}
      <td style={{ padding: '0 16px', verticalAlign: 'middle' }}>
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '8px',
        }}>
          <div style={{
            width: '3px', alignSelf: 'stretch', flexShrink: 0,
            backgroundColor: rx.status === 'VALID' ? '#0D7C7C'
              : rx.status === 'PENDING' ? '#F0A500'
              : '#E5E7EB',
            borderRadius: '2px',
            minHeight: '32px',
          }} />
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#1A1A2E', fontFamily: "'Space Grotesk', sans-serif" }}>
              {rx.doctorName}
            </div>
            <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px', fontFamily: "'Inter', sans-serif" }}>
              {rx.doctorSpecialty}&nbsp;&bull;&nbsp;{rx.doctorLocation}
            </div>
          </div>
        </div>
      </td>

      {/* Date issued */}
      <td style={{ padding: '0 16px', verticalAlign: 'middle' }}>
        <div style={{ fontSize: '13px', color: '#1A1A2E', fontFamily: "'Inter', sans-serif" }}>
          {rx.dateIssued}
        </div>
        <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px', fontFamily: "'Inter', sans-serif" }}>
          {rx.timeIssued}
        </div>
      </td>

      {/* Status */}
      <td style={{ padding: '0 16px', verticalAlign: 'middle' }}>
        <StatusDot status={rx.status} />
      </td>

      {/* Actions */}
      <td style={{ padding: '0 16px', verticalAlign: 'middle' }}>
        {canDispense && (
          <button
            onClick={() => onDispense(rx.rxId)}
            style={{
              background: 'none', border: 'none', padding: 0,
              fontSize: '11px', fontWeight: 700,
              color: '#0D7C7C', cursor: 'pointer',
              fontFamily: "'Space Grotesk', sans-serif",
              letterSpacing: '0.04em', whiteSpace: 'nowrap',
              textDecoration: 'underline', textDecorationColor: 'transparent',
              transition: 'text-decoration-color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.textDecorationColor = '#0D7C7C' }}
            onMouseLeave={e => { e.currentTarget.style.textDecorationColor = 'transparent' }}
          >
            DISPENSE MEDICATION
          </button>
        )}
        {isPending && (
          <button
            style={{
              backgroundColor: '#FFFFFF', color: '#F0A500',
              border: '1px solid #F0A500', borderRadius: '4px',
              padding: '5px 10px', fontSize: '11px', fontWeight: 700,
              letterSpacing: '0.04em', cursor: 'pointer',
              fontFamily: "'Space Grotesk', sans-serif", whiteSpace: 'nowrap',
              transition: 'background-color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#FFFBF0' }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#FFFFFF' }}
          >
            VERIFY INSURANCE
          </button>
        )}
        {isExpired && (
          <span style={{ fontSize: '11px', color: '#9CA3AF', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '0.04em' }}>
            ARCHIVED
          </span>
        )}
      </td>
    </tr>
  )
})

// ---------------------------------------------------------------------------
// Main PharmacyPortal — full-screen takeover, own sidebar + topbar
// ---------------------------------------------------------------------------
export default function PharmacyPortal() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { visible: toastVisible, showToast } = useToast()

  const [activeNav, setActiveNav]     = useState('dashboard')
  const [cnieValue, setCnieValue]     = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const mainRef      = useRef(null)
  const queueRef     = useRef(null)
  const cnieInputRef = useRef(null)

  const handleNav = useCallback((key) => {
    setActiveNav(key)
    if (key === 'dashboard') {
      if (mainRef.current) mainRef.current.scrollTop = 0
    } else if (key === 'queue') {
      if (queueRef.current) queueRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else if (key === 'lookup') {
      setTimeout(() => { if (cnieInputRef.current) cnieInputRef.current.focus() }, 50)
    } else if (key === 'history') {
      showToast()
    }
  }, [showToast])

  const handleFetchRecords = useCallback(() => {
    if (cnieValue.trim()) setCurrentPage(1)
  }, [cnieValue])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') handleFetchRecords()
  }, [handleFetchRecords])

  const handleDispense = useCallback((rxId) => {
    navigate(`/pharmacy/verify/${rxId}`)
  }, [navigate])

  const visiblePrescriptions = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE
    return MOCK_PRESCRIPTIONS.slice(start, start + ROWS_PER_PAGE)
  }, [currentPage])

  const totalPages = Math.ceil(TOTAL_RECORDS / ROWS_PER_PAGE)
  const rangeStart = (currentPage - 1) * ROWS_PER_PAGE + 1
  const rangeEnd   = Math.min(currentPage * ROWS_PER_PAGE, TOTAL_RECORDS)

  return (
    /* ── Full-screen takeover — escapes Layout wrapper ── */
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', flexDirection: 'column',
      backgroundColor: '#F5F7F5',
      fontFamily: "'Space Grotesk', sans-serif",
      overflow: 'hidden',
    }}>

      {/* ══ Top navbar ══════════════════════════════════════════════════════ */}
      <header style={{
        height: '56px', flexShrink: 0,
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E5E7EB',
        display: 'flex', alignItems: 'center',
        padding: '0 24px',
        zIndex: 10,
      }}>
        {/* Logo area — same width as sidebar */}
        <div style={{ width: 240, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 4,
            backgroundColor: '#0D7C7C',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: 16, lineHeight: 1 }}>
              health_and_safety
            </span>
          </div>
          <span style={{ fontWeight: 700, fontSize: 16, color: '#0D7C7C', letterSpacing: '-0.02em' }}>
            MedAxis
          </span>
        </div>

        {/* Portal label */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <span style={{ fontSize: '14px', color: '#6B7280', fontFamily: "'Space Grotesk', sans-serif" }}>Pharmacy Portal</span>
        </div>

        {/* Right icons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#6B7280' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>notifications</span>
          </button>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#6B7280' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>settings</span>
          </button>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            backgroundColor: '#0D7C7C',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>
            P
          </div>
        </div>
      </header>

      {/* ══ Body: sidebar + main ════════════════════════════════════════════ */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── Sidebar ────────────────────────────────────────────────────── */}
        <aside style={{
          width: 240, flexShrink: 0,
          backgroundColor: '#FFFFFF',
          borderRight: '1px solid #E5E7EB',
          display: 'flex', flexDirection: 'column',
          overflowY: 'auto',
        }}>
          {/* Brand */}
          <div style={{ padding: '20px 20px 16px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#1A1A2E', letterSpacing: '-0.01em' }}>
              MedAxis Admin
            </div>
            <div style={{
              fontSize: '9px', fontWeight: 700, color: '#6B7280',
              letterSpacing: '0.09em', textTransform: 'uppercase', marginTop: '2px',
            }}>
              Infrastructure Portal
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: '1px', backgroundColor: '#E5E7EB', margin: '0 16px' }} />

          {/* Nav items */}
          <nav style={{ padding: '8px 0', flex: 1 }}>
            {NAV_ITEMS.map(item => {
              const active = activeNav === item.key
              return (
                <button
                  key={item.key}
                  onClick={() => handleNav(item.key)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px 20px',
                    borderLeft: active ? '3px solid #0D7C7C' : '3px solid transparent',
                    border: 'none',
                    backgroundColor: active ? '#E6F3F3' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s',
                    fontFamily: "'Space Grotesk', sans-serif",
                    textAlign: 'left',
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.backgroundColor = '#F9FAFB' }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.backgroundColor = 'transparent' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: active ? '#0D7C7C' : '#6B7280', lineHeight: 1 }}>
                    {item.icon}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: active ? 700 : 500, color: active ? '#0D7C7C' : '#374151' }}>
                    {item.label}
                  </span>
                </button>
              )
            })}
          </nav>

          {/* Divider */}
          <div style={{ height: '1px', backgroundColor: '#E5E7EB', margin: '0 16px' }} />

          {/* Bottom actions */}
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <button style={{
                background: 'none', border: 'none', textAlign: 'left',
                padding: '6px 4px', fontSize: '12px', color: '#6B7280',
                cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif",
              }}>Help Center</button>
              <button onClick={logout} style={{
                background: 'none', border: 'none', textAlign: 'left',
                padding: '6px 4px', fontSize: '12px', color: '#6B7280',
                cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif",
              }}>Logout</button>
            </div>
          </div>
        </aside>

        {/* ── Main content ────────────────────────────────────────────────── */}
        <main ref={mainRef} style={{
          flex: 1, overflowY: 'auto',
          padding: '32px',
          display: 'flex', flexDirection: 'column', gap: '24px',
        }}>

          {/* ── Page header ── */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          }}>
            <div>
              <h1 style={{
                fontSize: '28px', fontWeight: 700,
                color: '#1A1A2E', margin: '0 0 6px 0', lineHeight: 1.2,
                letterSpacing: '-0.02em',
              }}>
                Pharmacy Portal
              </h1>
              <p style={{ fontSize: '14px', color: '#6B7280', margin: 0, fontFamily: "'Inter', sans-serif" }}>
                Manage national prescriptions and verify patient identity.
              </p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{
                fontSize: '10px', fontWeight: 700, color: '#9CA3AF',
                letterSpacing: '0.09em', textTransform: 'uppercase',
              }}>
                Portal Instance
              </div>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '14px', fontWeight: 700, color: '#0D7C7C',
                marginTop: '4px', letterSpacing: '0.03em',
              }}>
                PHARM-CAS-0924
              </div>
            </div>
          </div>

          {/* ── Patient CNIE card ── */}
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB', borderRadius: '8px',
            padding: '24px',
          }}>
            <label htmlFor="cnie-input" style={{
              display: 'block',
              fontSize: '10px', fontWeight: 700,
              color: '#9CA3AF', letterSpacing: '0.09em',
              textTransform: 'uppercase', marginBottom: '10px',
            }}>
              Patient CNIE (National Identity Card)
            </label>

            {/* Input + button row */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'stretch' }}>
              {/* Input — 85% */}
              <div style={{ flex: '0 0 85%', position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={{
                  position: 'absolute', left: '16px', pointerEvents: 'none',
                  display: 'flex', alignItems: 'center', color: '#9CA3AF',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>badge</span>
                </span>
                <input
                  id="cnie-input"
                  ref={cnieInputRef}
                  type="text"
                  value={cnieValue}
                  onChange={e => setCnieValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g. BE 892031"
                  autoComplete="off"
                  style={{
                    width: '100%', height: '56px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E7EB', borderRadius: '4px',
                    paddingLeft: '48px', paddingRight: '14px',
                    fontSize: '16px', color: '#1A1A2E',
                    fontFamily: "'Space Grotesk', sans-serif",
                    outline: 'none', transition: 'border-color 0.15s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={e  => { e.currentTarget.style.borderColor = '#0D7C7C' }}
                  onBlur={e   => { e.currentTarget.style.borderColor = '#E5E7EB' }}
                />
              </div>

              {/* FETCH RECORDS button — 15% */}
              <button
                onClick={handleFetchRecords}
                style={{
                  flex: '0 0 calc(15% - 12px)',
                  height: '56px',
                  backgroundColor: '#0D7C7C',
                  color: '#FFFFFF', border: 'none', borderRadius: '4px',
                  fontSize: '12px', fontWeight: 700, letterSpacing: '0.07em',
                  cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif",
                  whiteSpace: 'nowrap', transition: 'background-color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#0A6363' }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#0D7C7C' }}
              >
                FETCH RECORDS
              </button>
            </div>

            {/* Status sub-row */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '16px', marginTop: '10px',
            }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#6B7280', fontFamily: "'Inter', sans-serif" }}>
                <span style={{
                  display: 'inline-block', width: '7px', height: '7px',
                  borderRadius: '50%', backgroundColor: '#16A34A', flexShrink: 0,
                }} />
                Moroccan Health Network Active
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#9CA3AF', fontFamily: "'Inter', sans-serif" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14, lineHeight: 1 }}>schedule</span>
                Recent query: BK 9920
              </span>
            </div>
          </div>

          {/* ── Active Prescription Queue table card ── */}
          <div ref={queueRef} style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB', borderRadius: '8px',
            overflow: 'hidden',
          }}>
            {/* Table header toolbar */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px', borderBottom: '1px solid #E5E7EB',
            }}>
              <h2 style={{
                fontSize: '15px', fontWeight: 700,
                color: '#1A1A2E', margin: 0,
              }}>
                Active Prescription Queue
              </h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <GhostBtn height={36}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>filter_list</span>
                  FILTER
                </GhostBtn>
                <GhostBtn height={36}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>download</span>
                  EXPORT
                </GhostBtn>
              </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }} aria-label="Active prescription queue">
                <colgroup>
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '28%' }} />
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '22%' }} />
                </colgroup>
                <thead>
                  <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                    {['PRESCRIPTION ID', 'DOCTOR NAME', 'DATE ISSUED', 'STATUS', 'ACTIONS'].map(col => (
                      <th key={col} scope="col" style={{
                        padding: '10px 16px', textAlign: 'left',
                        fontSize: '10px', fontWeight: 700,
                        color: '#6B7280', letterSpacing: '0.07em', textTransform: 'uppercase',
                      }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visiblePrescriptions.map(rx => (
                    <PrescriptionRow key={rx.rxId} rx={rx} onDispense={handleDispense} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 20px', borderTop: '1px solid #E5E7EB',
            }}>
              <span style={{ fontSize: '12px', color: '#6B7280', fontFamily: "'Inter', sans-serif" }}>
                Showing {rangeStart} to {rangeEnd} of {TOTAL_RECORDS} records
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{
                    width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '1px solid #E5E7EB', borderRadius: '4px', backgroundColor: '#FFFFFF',
                    color: currentPage === 1 ? '#D1D5DB' : '#6B7280',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={e => { if (currentPage !== 1) e.currentTarget.style.borderColor = '#0D7C7C' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_left</span>
                </button>
                {[1, 2, 3].map(p => (
                  <PageBtn key={p} page={p} current={currentPage} onClick={setCurrentPage} />
                ))}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '1px solid #E5E7EB', borderRadius: '4px', backgroundColor: '#FFFFFF',
                    color: currentPage === totalPages ? '#D1D5DB' : '#6B7280',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={e => { if (currentPage !== totalPages) e.currentTarget.style.borderColor = '#0D7C7C' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_right</span>
                </button>
              </div>
            </div>
          </div>

          {/* ── Four stat cards ── */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px',
          }}>
            {/* Card 1 — Today's Dispenses */}
            <div style={{
              backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB',
              borderRadius: '8px', padding: '20px', height: '100px',
              boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.09em', textTransform: 'uppercase' }}>
                Today's Dispenses
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                <span style={{ fontSize: '32px', fontWeight: 700, color: '#1A1A2E', lineHeight: 1 }}>42</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#0D7C7C' }}>↗ +12%</span>
              </div>
            </div>

            {/* Card 2 — Stock Alerts */}
            <div style={{
              backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB',
              borderRadius: '8px', padding: '20px', height: '100px',
              boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.09em', textTransform: 'uppercase' }}>
                Stock Alerts
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                <span style={{ fontSize: '32px', fontWeight: 700, color: '#F0A500', lineHeight: 1 }}>03</span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#F0A500', letterSpacing: '0.04em' }}>⚠ REORDER SOON</span>
              </div>
            </div>

            {/* Card 3 — Average Wait */}
            <div style={{
              backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB',
              borderRadius: '8px', padding: '20px', height: '100px',
              boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.09em', textTransform: 'uppercase' }}>
                Average Wait
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                <span style={{ fontSize: '32px', fontWeight: 700, color: '#1A1A2E', lineHeight: 1 }}>8m</span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', letterSpacing: '0.06em' }}>OPTIMAL</span>
              </div>
            </div>

            {/* Card 4 — Network Status (solid teal) */}
            <div style={{
              backgroundColor: '#0D7C7C', border: '1px solid #0D7C7C',
              borderRadius: '8px', padding: '20px', height: '100px',
              boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.65)', letterSpacing: '0.09em', textTransform: 'uppercase' }}>
                  Network Status
                </div>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'rgba(255,255,255,0.65)' }}>language</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  display: 'inline-block', width: '8px', height: '8px',
                  borderRadius: '50%', backgroundColor: '#5FFFD1', flexShrink: 0,
                }} />
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF', letterSpacing: '0.04em' }}>
                  OPERATIONAL
                </span>
              </div>
            </div>
          </div>

        </main>
      </div>

      <Toast visible={toastVisible} />
    </div>
  )
}
