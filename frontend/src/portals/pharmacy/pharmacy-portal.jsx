import { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/use-auth'
import Toast, { useToast } from '../../components/toast'

// ─── Design tokens ────────────────────────────────────────────────────────────
const TEAL      = '#0D7C7C'
const TEAL_DARK = '#0A6363'
const BORDER    = '#E5E7EB'
const TEXT      = '#1A1A2E'
const MUTED     = '#6B7280'
const BG_PAGE   = '#F5F7F5'
const WHITE     = '#FFFFFF'
const ORANGE    = '#F0A500'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function getFormattedDate() {
  const d = new Date()
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

// ─── Mock data ────────────────────────────────────────────────────────────────
const ACTIVITY = [
  { dot: TEAL,   action: 'Prescription #RX-889-2024-01 dispensed',  sub: 'Patient: Ahmed B. • Amoxicillin 500mg',                time: '1 hour ago'       },
  { dot: ORANGE, action: 'Identity verification failed',             sub: 'Patient: Unknown • OTP expired after 3 attempts',       time: '2 hours ago'      },
  { dot: TEAL,   action: 'Prescription #RX-889-2024-03 dispensed',  sub: 'Patient: Fatima Z. • Metformin 1000mg',                 time: '3 hours ago'      },
  { dot: MUTED,  action: 'Prescription #RX-889-2024-02 flagged',    sub: 'Suspicious quantity requested • Sent to regulator',     time: '5 hours ago'      },
  { dot: TEAL,   action: 'Prescription #RX-889-2024-05 dispensed',  sub: 'Patient: Hassan B. • Lisinopril 10mg',                  time: 'Yesterday, 16:45' },
]

const PATIENT_PRESCRIPTIONS = [
  { rxId: 'RX-889-2024-01', doctor: 'Dr. Yassine Alaoui',   specialty: 'Cardiology',       med: 'Amoxicillin 500mg', issued: 'Oct 24, 2023', expiry: 'Nov 03, 2023', status: 'VALID'   },
  { rxId: 'RX-889-2024-02', doctor: 'Dr. Fatima Zahra',     specialty: 'Pediatrics',       med: 'Metformin 1000mg',  issued: 'Oct 23, 2023', expiry: 'Nov 22, 2023', status: 'PENDING' },
  { rxId: 'RX-889-2024-03', doctor: 'Dr. Ahmed Mansour',    specialty: 'General Medicine', med: 'Lisinopril 10mg',   issued: 'Oct 22, 2023', expiry: 'Nov 21, 2023', status: 'VALID'   },
  { rxId: 'RX-889-2024-04', doctor: 'Dr. Leila Benjelloun', specialty: 'Dermatology',      med: 'Ibuprofen 400mg',   issued: 'Oct 20, 2023', expiry: 'Oct 25, 2023', status: 'EXPIRED' },
]

const QUEUE_ROWS = [
  { rxId: 'RX-889-2024-01', token: 'PAT-**-8821', doctor: 'Dr. Yassine Alaoui',   issued: 'Oct 24, 2023', status: 'VALID'   },
  { rxId: 'RX-889-2024-02', token: 'PAT-**-3312', doctor: 'Dr. Fatima Zahra',     issued: 'Oct 23, 2023', status: 'PENDING' },
  { rxId: 'RX-889-2024-03', token: 'PAT-**-7740', doctor: 'Dr. Ahmed Mansour',    issued: 'Oct 22, 2023', status: 'VALID'   },
  { rxId: 'RX-901-2024-07', token: 'PAT-**-5591', doctor: 'Dr. Leila Benjelloun', issued: 'Oct 21, 2023', status: 'VALID'   },
  { rxId: 'RX-901-2024-08', token: 'PAT-**-2204', doctor: 'Dr. Karim Idrissi',    issued: 'Oct 21, 2023', status: 'PENDING' },
  { rxId: 'RX-901-2024-09', token: 'PAT-**-9937', doctor: 'Dr. Sara El Amrani',   issued: 'Oct 20, 2023', status: 'VALID'   },
]

const HISTORY_ROWS = [
  { rxId: 'RX-889-2024-01', token: 'PAT-**-8821', med: 'Amoxicillin 500mg',  qty: '21 tablets',  pharmacist: 'Y. Assemlali', datetime: 'Oct 24, 2023 09:45' },
  { rxId: 'RX-889-2024-03', token: 'PAT-**-7740', med: 'Lisinopril 10mg',    qty: '30 tablets',  pharmacist: 'Y. Assemlali', datetime: 'Oct 22, 2023 11:10' },
  { rxId: 'RX-889-2024-05', token: 'PAT-**-4418', med: 'Metformin 1000mg',   qty: '60 tablets',  pharmacist: 'Y. Assemlali', datetime: 'Oct 21, 2023 14:22' },
  { rxId: 'RX-901-2024-02', token: 'PAT-**-6623', med: 'Ibuprofen 400mg',    qty: '14 tablets',  pharmacist: 'Y. Assemlali', datetime: 'Oct 20, 2023 09:05' },
  { rxId: 'RX-901-2024-04', token: 'PAT-**-1199', med: 'Amoxicillin 250mg',  qty: '14 capsules', pharmacist: 'Y. Assemlali', datetime: 'Oct 19, 2023 16:40' },
  { rxId: 'RX-880-2024-11', token: 'PAT-**-3302', med: 'Paracetamol 500mg',  qty: '20 tablets',  pharmacist: 'Y. Assemlali', datetime: 'Oct 18, 2023 10:15' },
  { rxId: 'RX-880-2024-12', token: 'PAT-**-7781', med: 'Cetirizine 10mg',    qty: '10 tablets',  pharmacist: 'Y. Assemlali', datetime: 'Oct 17, 2023 13:30' },
  { rxId: 'RX-880-2024-14', token: 'PAT-**-8844', med: 'Omeprazole 20mg',    qty: '28 capsules', pharmacist: 'Y. Assemlali', datetime: 'Oct 16, 2023 08:55' },
]

const STATUS_CONFIG = {
  VALID:     { color: '#16A34A', label: 'VALID'      },
  PENDING:   { color: ORANGE,    label: 'PENDING'    },
  EXPIRED:   { color: '#E53E3E', label: 'EXPIRED'    },
  DISPENSED: { color: '#16A34A', label: 'DISPENSED'  },
}

const NAV_ITEMS = [
  { key: 'dashboard',       label: 'Dashboard',        icon: 'dashboard'     },
  { key: 'active-queue',    label: 'Active Queue',     icon: 'queue'         },
  { key: 'patient-lookup',  label: 'Patient Lookup',   icon: 'person_search' },
  { key: 'dispense-history',label: 'Dispense History', icon: 'history'       },
]

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatusDot({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.VALID
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: cfg.color, flexShrink: 0, display: 'inline-block' }} />
      <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color, letterSpacing: '0.05em', fontFamily: "'Space Grotesk', sans-serif" }}>
        {cfg.label}
      </span>
    </span>
  )
}

function GhostBtn({ onClick, children, height = 36 }) {
  const [hov, setHov] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      height, padding: '0 14px',
      backgroundColor: WHITE,
      border: `1px solid ${hov ? TEAL : BORDER}`,
      borderRadius: 4,
      fontSize: 11, fontWeight: 700,
      color: hov ? TEAL : MUTED,
      cursor: 'pointer',
      fontFamily: "'Space Grotesk', sans-serif",
      letterSpacing: '0.05em',
      transition: 'border-color 0.15s, color 0.15s',
    }}>
      {children}
    </button>
  )
}

function PageBtn({ page, current, onClick }) {
  const active = page === current
  const [hov, setHov] = useState(false)
  return (
    <button onClick={() => onClick(page)} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{
      width: 30, height: 30,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: `1px solid ${active ? TEAL : hov ? TEAL : BORDER}`,
      borderRadius: 4,
      backgroundColor: active ? TEAL : WHITE,
      color: active ? WHITE : hov ? TEAL : MUTED,
      fontSize: 12, fontWeight: 700, cursor: 'pointer',
      fontFamily: "'Space Grotesk', sans-serif",
      transition: 'all 0.15s',
    }}>
      {page}
    </button>
  )
}

function TableHeader({ columns }) {
  return (
    <thead>
      <tr style={{ backgroundColor: '#F9FAFB', borderBottom: `1px solid ${BORDER}` }}>
        {columns.map(col => (
          <th key={col} style={{
            padding: '10px 16px', textAlign: 'left',
            fontSize: 10, fontWeight: 700,
            color: MUTED, letterSpacing: '0.07em', textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}>
            {col}
          </th>
        ))}
      </tr>
    </thead>
  )
}

function Pagination({ current, total, onPrev, onNext, label }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 20px', borderTop: `1px solid ${BORDER}`, backgroundColor: '#FAFAFA',
    }}>
      <span style={{ fontSize: 12, color: MUTED }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button onClick={onPrev} disabled={current === 1} style={{
          width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `1px solid ${BORDER}`, borderRadius: 4, backgroundColor: WHITE,
          color: current === 1 ? '#D1D5DB' : MUTED,
          cursor: current === 1 ? 'not-allowed' : 'pointer',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_left</span>
        </button>
        {[1, 2, 3].map(p => <PageBtn key={p} page={p} current={current} onClick={() => {}} />)}
        <button onClick={onNext} disabled={current === total} style={{
          width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `1px solid ${BORDER}`, borderRadius: 4, backgroundColor: WHITE,
          color: current === total ? '#D1D5DB' : MUTED,
          cursor: current === total ? 'not-allowed' : 'pointer',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_right</span>
        </button>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function PharmacyPortal() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { visible: toastVisible, showToast } = useToast()

  const [activeView, setActiveView]         = useState('dashboard')
  const [cnieValue, setCnieValue]           = useState('')
  const [recordsFetched, setRecordsFetched] = useState(false)
  const [queuePage, setQueuePage]           = useState(1)
  const [historyPage, setHistoryPage]       = useState(1)

  const cnieInputRef = useRef(null)

  const handleNav = useCallback((key) => {
    if (key === 'dispense-history') {
      showToast()
      return
    }
    setActiveView(key)
    if (key === 'patient-lookup') {
      setTimeout(() => { if (cnieInputRef.current) cnieInputRef.current.focus() }, 50)
    }
  }, [showToast])

  const handleFetchRecords = useCallback(() => {
    if (cnieValue.trim()) setRecordsFetched(true)
  }, [cnieValue])

  const handleDispense = useCallback((rxId) => {
    navigate(`/pharmacy/verify/${rxId}`)
  }, [navigate])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', flexDirection: 'column',
      backgroundColor: BG_PAGE,
      fontFamily: "'Space Grotesk', sans-serif",
      overflow: 'hidden',
    }}>

      {/* ── Top navbar ───────────────────────────────────────────────────── */}
      <header style={{
        height: 52, flexShrink: 0,
        backgroundColor: WHITE, borderBottom: `1px solid ${BORDER}`,
        display: 'flex', alignItems: 'center',
        padding: '0 20px', zIndex: 10,
      }}>
        <div style={{ width: 240, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 4, backgroundColor: TEAL, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ color: WHITE, fontSize: 16, lineHeight: 1 }}>health_and_safety</span>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, lineHeight: 1.1 }}>MedAxis</div>
            <div style={{ fontSize: 9, fontWeight: 600, color: TEAL, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Infrastructure Portal</div>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <span style={{ fontSize: 14, color: MUTED }}>Pharmacy Portal</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: MUTED }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>notifications</span>
          </button>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: MUTED }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>settings</span>
          </button>
          <div style={{ width: 30, height: 30, borderRadius: '50%', backgroundColor: TEAL, display: 'flex', alignItems: 'center', justifyContent: 'center', color: WHITE, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>P</div>
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── Sidebar ──────────────────────────────────────────────────── */}
        <aside style={{
          width: 240, flexShrink: 0,
          backgroundColor: WHITE, borderRight: `1px solid ${BORDER}`,
          display: 'flex', flexDirection: 'column',
          overflowY: 'auto',
        }}>
          <div style={{ padding: '14px 16px 12px', borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: TEXT }}>MedAxis Admin</div>
            <div style={{ fontSize: 9, fontWeight: 600, color: MUTED, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 2 }}>Infrastructure Portal</div>
          </div>
          <nav style={{ flex: 1, padding: '8px 0' }}>
            {NAV_ITEMS.map(item => {
              const active = activeView === item.key
              return (
                <button key={item.key} onClick={() => handleNav(item.key)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 16px',
                  background: active ? '#F0FAFA' : 'transparent',
                  border: 'none',
                  borderLeft: `3px solid ${active ? TEAL : 'transparent'}`,
                  color: active ? TEAL : MUTED,
                  fontSize: 13.5, fontWeight: active ? 600 : 500,
                  cursor: 'pointer', textAlign: 'left',
                  fontFamily: "'Space Grotesk', sans-serif",
                  transition: 'all 0.12s ease',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: active ? TEAL : '#9CA3AF', lineHeight: 1 }}>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              )
            })}
          </nav>
          <div style={{ padding: '12px 12px 16px', borderTop: `1px solid ${BORDER}` }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <button style={{ background: 'none', border: 'none', textAlign: 'left', padding: '6px 4px', fontSize: 12, color: MUTED, cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif" }}>Help Center</button>
              <button onClick={logout} style={{ background: 'none', border: 'none', textAlign: 'left', padding: '6px 4px', fontSize: 12, color: MUTED, cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif" }}>Logout</button>
            </div>
          </div>
        </aside>

        {/* ── Main content ─────────────────────────────────────────────── */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Page header */}
          <div style={{ padding: '16px 28px 14px', flexShrink: 0, backgroundColor: WHITE, borderBottom: `1px solid ${BORDER}` }}>
            <h1 style={{ fontSize: 17, fontWeight: 800, color: TEXT, textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Pharmacy Workspace</h1>
            <p style={{ fontSize: 11.5, color: MUTED, marginTop: 3, fontWeight: 500 }}>
              Regulatory Authority Portal &bull; Portal Instance:{' '}
              <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>PHARM-CAS-0924</span>
            </p>
          </div>

          {/* ══ VIEW: Dashboard ════════════════════════════════════════════ */}
          {activeView === 'dashboard' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>

              {/* Section 1 — Greeting */}
              <div style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 24, fontWeight: 700, color: TEXT, margin: '0 0 4px', letterSpacing: '-0.02em' }}>
                  {getGreeting()}, Pharmacist Youssef
                </h2>
                <div style={{ fontSize: 13, color: MUTED, marginBottom: 2 }}>{getFormattedDate()}</div>
                <div style={{ fontSize: 13, color: MUTED }}>
                  Portal Instance:{' '}
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", color: TEXT }}>PHARM-CAS-0924</span>
                </div>
              </div>

              {/* Section 2 — Four stat cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 24, marginBottom: 32 }}>
                {/* Card 1 — Dispenses Today */}
                <div style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 20, height: 120, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: TEAL }}>medication</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Dispenses Today</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 36, fontWeight: 700, color: TEXT, lineHeight: 1, fontFamily: "'JetBrains Mono', monospace" }}>42</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: TEAL, marginTop: 4 }}>↗ +12% from yesterday</div>
                  </div>
                </div>
                {/* Card 2 — Pending Verifications */}
                <div style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 20, height: 120, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: ORANGE }}>warning</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Pending Verifications</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 36, fontWeight: 700, color: ORANGE, lineHeight: 1, fontFamily: "'JetBrains Mono', monospace" }}>07</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: ORANGE, marginTop: 4 }}>⚠ Requires attention</div>
                  </div>
                </div>
                {/* Card 3 — Stock Alerts */}
                <div style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 20, height: 120, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: ORANGE }}>inventory_2</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Stock Alerts</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 36, fontWeight: 700, color: ORANGE, lineHeight: 1, fontFamily: "'JetBrains Mono', monospace" }}>03</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: ORANGE, marginTop: 4 }}>⚠ REORDER SOON</div>
                  </div>
                </div>
                {/* Card 4 — Network Status (solid teal) */}
                <div style={{ backgroundColor: TEAL, border: `1px solid ${TEAL}`, borderRadius: 8, padding: 20, height: 120, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Network Status</span>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'rgba(255,255,255,0.7)' }}>language</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#4ADE80', flexShrink: 0 }} />
                    <span style={{ fontSize: 20, fontWeight: 700, color: WHITE, letterSpacing: '0.04em' }}>OPERATIONAL</span>
                  </div>
                </div>
              </div>

              {/* Section 3 — Recent Activity */}
              <div style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: TEXT }}>Recent Activity</span>
                  <span style={{ fontSize: 12, color: MUTED }}>Last 24 hours</span>
                </div>
                <div style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden' }}>
                  {ACTIVITY.map((item, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0 16px', height: 52,
                      borderBottom: i < ACTIVITY.length - 1 ? '1px solid #F3F4F6' : 'none',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: item.dot, flexShrink: 0 }} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.action}</div>
                          <div style={{ fontSize: 11, color: MUTED, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.sub}</div>
                        </div>
                      </div>
                      <span style={{ fontSize: 11, color: MUTED, flexShrink: 0, marginLeft: 16 }}>{item.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 4 — Quick Action Card */}
              <div style={{
                backgroundColor: '#F0FAFA', border: `1px solid ${TEAL}`, borderRadius: 8,
                padding: '0 20px', height: 72,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: TEAL }}>Ready to serve a patient?</div>
                  <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>Enter patient CNIE to retrieve prescriptions →</div>
                </div>
                <button onClick={() => handleNav('patient-lookup')} style={{
                  height: 40, padding: '0 20px',
                  backgroundColor: TEAL, color: WHITE,
                  border: 'none', borderRadius: 4,
                  fontSize: 12, fontWeight: 700, letterSpacing: '0.07em',
                  cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif",
                  whiteSpace: 'nowrap', transition: 'background-color 0.15s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = TEAL_DARK }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = TEAL }}
                >
                  LOOKUP PATIENT
                </button>
              </div>

            </div>
          )}

          {/* ══ VIEW: Patient Lookup ═══════════════════════════════════════ */}
          {activeView === 'patient-lookup' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>

              {/* Header */}
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: 24, fontWeight: 700, color: TEXT, margin: '0 0 6px', letterSpacing: '-0.01em' }}>Patient Lookup</h2>
                <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>Enter patient CNIE to retrieve active prescriptions</p>
              </div>

              {/* CNIE Input Card */}
              <div style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 24, marginBottom: 24 }}>
                <label htmlFor="cnie-lookup" style={{
                  display: 'block', fontSize: 10, fontWeight: 700,
                  color: MUTED, letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 10,
                }}>
                  Patient CNIE (National Identity Card)
                </label>

                <div style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
                  <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <span style={{ position: 'absolute', left: 16, pointerEvents: 'none', display: 'flex', alignItems: 'center', color: '#9CA3AF' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 20 }}>badge</span>
                    </span>
                    <input
                      id="cnie-lookup"
                      ref={cnieInputRef}
                      type="text"
                      value={cnieValue}
                      onChange={e => { setCnieValue(e.target.value); setRecordsFetched(false) }}
                      onKeyDown={e => { if (e.key === 'Enter') handleFetchRecords() }}
                      placeholder="e.g. BE 892031"
                      autoComplete="off"
                      style={{
                        width: '100%', height: 56,
                        backgroundColor: WHITE,
                        border: `1px solid ${BORDER}`, borderRadius: 4,
                        paddingLeft: 48, paddingRight: 14,
                        fontSize: 16, color: TEXT,
                        fontFamily: "'Space Grotesk', sans-serif",
                        outline: 'none', transition: 'border-color 0.15s',
                        boxSizing: 'border-box',
                      }}
                      onFocus={e => { e.currentTarget.style.borderColor = TEAL }}
                      onBlur={e  => { e.currentTarget.style.borderColor = BORDER }}
                    />
                  </div>
                  <button onClick={handleFetchRecords} style={{
                    width: 180, height: 56, flexShrink: 0,
                    backgroundColor: TEAL, color: WHITE,
                    border: 'none', borderRadius: 4,
                    fontSize: 12, fontWeight: 700, letterSpacing: '0.07em',
                    cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif",
                    transition: 'background-color 0.15s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = TEAL_DARK }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = TEAL }}
                  >
                    FETCH RECORDS
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 10 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: MUTED }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#16A34A', display: 'inline-block' }} />
                    Moroccan Health Network Active
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#9CA3AF' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14, lineHeight: 1 }}>schedule</span>
                    Recent query: BK 9920
                  </span>
                </div>
              </div>

              {/* Results — shown after FETCH */}
              {recordsFetched && (
                <>
                  {/* Patient Identity Card */}
                  <div style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '16px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: '#E6F3F3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 22, color: TEAL }}>person</span>
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: TEAL, marginBottom: 3 }}>Patient Identified</div>
                        <div style={{ fontSize: 12, color: MUTED, fontFamily: "'JetBrains Mono', monospace" }}>Identity token: PAT-**-8821</div>
                        <div style={{ fontSize: 12, color: MUTED }}>First name: Ahmed</div>
                      </div>
                    </div>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      backgroundColor: '#DCFCE7', border: '1px solid #16A34A',
                      borderRadius: 4, padding: '5px 12px',
                      fontSize: 11, fontWeight: 700, color: '#16A34A', letterSpacing: '0.05em',
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14, lineHeight: 1 }}>check_circle</span>
                      IDENTITY CONFIRMED
                    </div>
                  </div>

                  {/* Active Prescriptions Table */}
                  <div style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 20px 12px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>Active Prescriptions</span>
                      <span style={{ backgroundColor: '#E6F3F3', color: TEAL, fontSize: 11, fontWeight: 700, borderRadius: 4, padding: '2px 8px' }}>4 found</span>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <TableHeader columns={['PRESCRIPTION ID', 'DOCTOR NAME', 'MEDICATION', 'DATE ISSUED', 'EXPIRY', 'STATUS', 'ACTIONS']} />
                        <tbody>
                          {PATIENT_PRESCRIPTIONS.map((rx, i) => (
                            <tr key={rx.rxId} style={{ borderBottom: '1px solid #F3F4F6', height: 72, backgroundColor: i % 2 === 0 ? WHITE : '#FAFAFA' }}>
                              <td style={{ padding: '0 16px', verticalAlign: 'middle' }}>
                                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, color: TEAL }}>#{rx.rxId}</span>
                              </td>
                              <td style={{ padding: '0 16px', verticalAlign: 'middle' }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{rx.doctor}</div>
                                <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{rx.specialty}</div>
                              </td>
                              <td style={{ padding: '0 16px', verticalAlign: 'middle', fontSize: 13, color: TEXT, whiteSpace: 'nowrap' }}>{rx.med}</td>
                              <td style={{ padding: '0 16px', verticalAlign: 'middle', fontSize: 12, color: MUTED, whiteSpace: 'nowrap' }}>{rx.issued}</td>
                              <td style={{ padding: '0 16px', verticalAlign: 'middle', fontSize: 12, color: MUTED, whiteSpace: 'nowrap' }}>{rx.expiry}</td>
                              <td style={{ padding: '0 16px', verticalAlign: 'middle' }}>
                                <StatusDot status={rx.status} />
                              </td>
                              <td style={{ padding: '0 16px', verticalAlign: 'middle' }}>
                                {rx.status === 'VALID' && (
                                  <button onClick={() => handleDispense(rx.rxId)} style={{
                                    height: 34, padding: '0 14px',
                                    backgroundColor: TEAL, color: WHITE,
                                    border: 'none', borderRadius: 4,
                                    fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
                                    cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif",
                                    whiteSpace: 'nowrap', transition: 'background-color 0.15s',
                                  }}
                                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = TEAL_DARK }}
                                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = TEAL }}
                                  >
                                    DISPENSE
                                  </button>
                                )}
                                {rx.status === 'PENDING' && (
                                  <button style={{
                                    height: 34, padding: '0 12px',
                                    backgroundColor: WHITE, color: ORANGE,
                                    border: `1px solid ${ORANGE}`, borderRadius: 4,
                                    fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
                                    cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif",
                                    whiteSpace: 'nowrap',
                                  }}>
                                    VERIFY INSURANCE
                                  </button>
                                )}
                                {rx.status === 'EXPIRED' && (
                                  <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, letterSpacing: '0.05em' }}>ARCHIVED</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div style={{ padding: '10px 20px', borderTop: `1px solid ${BORDER}`, backgroundColor: '#FAFAFA' }}>
                      <span style={{ fontSize: 12, color: MUTED }}>Showing 4 active prescriptions for this patient</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ══ VIEW: Active Queue ═════════════════════════════════════════ */}
          {activeView === 'active-queue' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>

              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
                <div>
                  <h2 style={{ fontSize: 24, fontWeight: 700, color: TEXT, margin: '0 0 6px', letterSpacing: '-0.01em' }}>Active Prescription Queue</h2>
                  <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>All pending prescriptions requiring dispensing</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <GhostBtn>
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>filter_list</span>
                    FILTER
                  </GhostBtn>
                  <GhostBtn>
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>download</span>
                    EXPORT
                  </GhostBtn>
                </div>
              </div>

              <div style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <TableHeader columns={['PRESCRIPTION ID', 'PATIENT TOKEN', 'DOCTOR NAME', 'DATE ISSUED', 'STATUS', 'ACTIONS']} />
                    <tbody>
                      {QUEUE_ROWS.map((row, i) => (
                        <tr key={row.rxId} style={{ borderBottom: '1px solid #F3F4F6', height: 64, backgroundColor: i % 2 === 0 ? WHITE : '#FAFAFA' }}>
                          <td style={{ padding: '0 16px', verticalAlign: 'middle' }}>
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, color: TEAL }}>#{row.rxId}</span>
                          </td>
                          <td style={{ padding: '0 16px', verticalAlign: 'middle' }}>
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: MUTED }}>{row.token}</span>
                          </td>
                          <td style={{ padding: '0 16px', verticalAlign: 'middle', fontSize: 13, fontWeight: 500, color: TEXT }}>{row.doctor}</td>
                          <td style={{ padding: '0 16px', verticalAlign: 'middle', fontSize: 12, color: MUTED, whiteSpace: 'nowrap' }}>{row.issued}</td>
                          <td style={{ padding: '0 16px', verticalAlign: 'middle' }}>
                            <StatusDot status={row.status} />
                          </td>
                          <td style={{ padding: '0 16px', verticalAlign: 'middle' }}>
                            {row.status === 'VALID' ? (
                              <button onClick={() => handleDispense(row.rxId)} style={{
                                height: 32, padding: '0 14px',
                                backgroundColor: TEAL, color: WHITE,
                                border: 'none', borderRadius: 4,
                                fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
                                cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif",
                                transition: 'background-color 0.15s',
                              }}
                                onMouseEnter={e => { e.currentTarget.style.backgroundColor = TEAL_DARK }}
                                onMouseLeave={e => { e.currentTarget.style.backgroundColor = TEAL }}
                              >
                                DISPENSE
                              </button>
                            ) : (
                              <button style={{
                                height: 32, padding: '0 12px',
                                backgroundColor: WHITE, color: ORANGE,
                                border: `1px solid ${ORANGE}`, borderRadius: 4,
                                fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
                                cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif",
                              }}>
                                VERIFY
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  current={queuePage}
                  total={31}
                  onPrev={() => setQueuePage(p => Math.max(1, p - 1))}
                  onNext={() => setQueuePage(p => Math.min(31, p + 1))}
                  label="Showing 1 to 6 of 124 records"
                />
              </div>
            </div>
          )}

          {/* ══ VIEW: Dispense History ═════════════════════════════════════ */}
          {activeView === 'dispense-history' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>

              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
                <div>
                  <h2 style={{ fontSize: 24, fontWeight: 700, color: TEXT, margin: '0 0 6px', letterSpacing: '-0.01em' }}>Dispensing History</h2>
                  <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>Complete record of all dispensing events at this pharmacy</p>
                </div>
                <GhostBtn>
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>download</span>
                  EXPORT CSV
                </GhostBtn>
              </div>

              <div style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <TableHeader columns={['RxID', 'PATIENT TOKEN', 'MEDICATION', 'QUANTITY', 'PHARMACIST', 'DATE & TIME', 'STATUS']} />
                    <tbody>
                      {HISTORY_ROWS.map((row, i) => (
                        <tr key={row.rxId} style={{ borderBottom: '1px solid #F3F4F6', height: 64, backgroundColor: i % 2 === 0 ? WHITE : '#FAFAFA' }}>
                          <td style={{ padding: '0 16px', verticalAlign: 'middle' }}>
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, color: TEAL }}>#{row.rxId}</span>
                          </td>
                          <td style={{ padding: '0 16px', verticalAlign: 'middle' }}>
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: MUTED }}>{row.token}</span>
                          </td>
                          <td style={{ padding: '0 16px', verticalAlign: 'middle', fontSize: 13, fontWeight: 500, color: TEXT }}>{row.med}</td>
                          <td style={{ padding: '0 16px', verticalAlign: 'middle', fontSize: 12, color: MUTED }}>{row.qty}</td>
                          <td style={{ padding: '0 16px', verticalAlign: 'middle', fontSize: 12, color: MUTED }}>{row.pharmacist}</td>
                          <td style={{ padding: '0 16px', verticalAlign: 'middle', fontSize: 12, color: MUTED, whiteSpace: 'nowrap' }}>{row.datetime}</td>
                          <td style={{ padding: '0 16px', verticalAlign: 'middle' }}>
                            <StatusDot status="DISPENSED" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  current={historyPage}
                  total={161}
                  onPrev={() => setHistoryPage(p => Math.max(1, p - 1))}
                  onNext={() => setHistoryPage(p => Math.min(161, p + 1))}
                  label="Showing 1 to 8 of 1,284 records"
                />
              </div>
            </div>
          )}

        </main>
      </div>

      <Toast visible={toastVisible} />
    </div>
  )
}
