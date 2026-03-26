import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/use-auth'
import Toast, { useToast } from '../../components/toast'
import { getByPatientCNIEAPI } from '../../api/prescriptions'
import {
  getDispensedTodayAPI,
  getPendingVerificationsAPI,
  getStockAlertsAPI,
  getTodaySummaryAPI,
  getRecentPharmacyActivityAPI,
} from '../../api/pharmacy'
import { hashCNIE } from '../../utils/hash.utils'

// ─── Design tokens ────────────────────────────────────────────────────────────
const TEAL      = '#0D7C7C'
const TEAL_DARK = '#0A6363'
const BORDER    = '#E5E7EB'
const TEXT      = '#1A1A2E'
const MUTED     = '#6B7280'
const BG_PAGE   = '#F5F7F5'
const WHITE     = '#FFFFFF'
const ORANGE    = '#F0A500'
const RED       = '#E53E3E'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatActivityTime(isoString) {
  if (!isoString) return ''
  const date = new Date(isoString)
  const now = new Date()
  const pad = n => String(n).padStart(2, '0')
  const timeStr = `${pad(date.getHours())}:${pad(date.getMinutes())}`
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  if (isToday) return timeStr
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  if (isYesterday) return `Yesterday, ${timeStr}`
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[date.getMonth()]} ${date.getDate()}, ${timeStr}`
}

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
// TODO: replace with live data
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
  VALID:              { color: '#16A34A', label: 'VALID'      },
  ACTIVE:             { color: '#16A34A', label: 'VALID'      },
  PENDING:            { color: ORANGE,    label: 'PENDING'    },
  PARTIAL:            { color: ORANGE,    label: 'PARTIAL'    },
  PARTIALLY_DISPENSED:{ color: ORANGE,    label: 'PARTIAL'    },
  EXPIRED:            { color: '#E53E3E', label: 'EXPIRED'    },
  FLAGGED:            { color: '#E53E3E', label: 'FLAGGED'    },
  DISPENSED:          { color: MUTED,     label: 'DISPENSED'  },
  CANCELLED:          { color: MUTED,     label: 'CANCELLED'  },
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

function ClickableStatCard({ icon, iconColor, label, value, subLabel, subColor, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        backgroundColor: WHITE,
        border: `1px solid ${hov ? TEAL : BORDER}`,
        borderRadius: 8, padding: 20, height: 120,
        boxSizing: 'border-box', display: 'flex',
        flexDirection: 'column', justifyContent: 'space-between',
        cursor: 'pointer', transition: 'border-color 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 18, color: iconColor }}>{icon}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
      </div>
      <div>
        <div style={{ fontSize: 36, fontWeight: 700, color: iconColor, lineHeight: 1, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
        <div style={{ fontSize: 9, fontWeight: 600, color: subColor, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>{subLabel}</div>
      </div>
    </div>
  )
}

function ActivityRow({ activity, isLast, onClick }) {
  const [hov, setHov] = useState(false)
  const clickable = !!activity.rx_id
  return (
    <div
      onClick={clickable ? onClick : undefined}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px',
        borderBottom: isLast ? 'none' : `1px solid ${BORDER}`,
        cursor: clickable ? 'pointer' : 'default',
        backgroundColor: clickable && hov ? '#F9FAFB' : WHITE,
        transition: 'background-color 0.12s',
      }}
    >
      <div style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: activity.dot_color, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: TEXT }}>{activity.description}</div>
        {activity.rx_id && (
          <div style={{ fontSize: 11, color: MUTED, marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>{activity.rx_id}</div>
        )}
      </div>
      <div style={{ fontSize: 11, color: MUTED, whiteSpace: 'nowrap', flexShrink: 0 }}>
        {formatActivityTime(activity.time)}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function PharmacyPortal() {
  const navigate = useNavigate()
  const { logout, token, user } = useAuth()
  const { visible: toastVisible, showToast } = useToast()

  const [activeView, setActiveView]               = useState('dashboard')
  const [cnieValue, setCnieValue]                 = useState('')
  const [recordsFetched, setRecordsFetched]       = useState(false)
  const [fetchLoading, setFetchLoading]           = useState(false)
  const [fetchError, setFetchError]               = useState('')
  const [patientPrescriptions, setPatientPrescriptions] = useState(PATIENT_PRESCRIPTIONS)
  const [patientToken, setPatientToken]           = useState('PAT-**-8821')
  const [patientFirstName, setPatientFirstName]   = useState('Ahmed')
  const [queuePage, setQueuePage]                 = useState(1)
  const [historyPage, setHistoryPage]             = useState(1)

  const [dashStats, setDashStats]           = useState({ dispensedToday: null, pendingVerifications: null, stockAlerts: null })
  const [todaySummary, setTodaySummary]     = useState({ patients_served: null, prescriptions_pending: null, otps_pending: null })
  const [recentActivity, setRecentActivity] = useState([])
  const [dashLoading, setDashLoading]       = useState(false)
  const [dashError, setDashError]           = useState('')

  const cnieInputRef = useRef(null)

  useEffect(() => {
    if (activeView !== 'dashboard' || !token) return
    let cancelled = false
    setDashLoading(true)
    setDashError('')
    Promise.all([
      getDispensedTodayAPI(token),
      getPendingVerificationsAPI(token),
      getStockAlertsAPI(token),
      getTodaySummaryAPI(token),
      getRecentPharmacyActivityAPI(token),
    ])
      .then(([dispensed, pending, stock, summary, activity]) => {
        if (cancelled) return
        setDashStats({
          dispensedToday:        dispensed?.data?.total_items ?? 0,
          pendingVerifications:  pending?.data?.count ?? 0,
          stockAlerts:           stock?.data?.alert_count ?? 0,
        })
        setTodaySummary({
          patients_served:       summary?.data?.patients_served ?? 0,
          prescriptions_pending: summary?.data?.prescriptions_pending ?? 0,
          otps_pending:          summary?.data?.otps_pending ?? 0,
        })
        setRecentActivity(activity?.data?.activities ?? [])
      })
      .catch(() => {
        if (!cancelled) setDashError('Failed to load dashboard data')
      })
      .finally(() => {
        if (!cancelled) setDashLoading(false)
      })
    return () => { cancelled = true }
  }, [activeView, token])

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

  const handleFetchRecords = useCallback(async () => {
    if (!cnieValue.trim()) return
    console.log('Fetching records for CNIE:', cnieValue)
    console.log('Token available:', !!token)
    console.log('API URL:', import.meta.env.VITE_API_URL)
    setFetchLoading(true)
    setFetchError('')
    try {
      const cnie_hash = await hashCNIE(cnieValue)
      const result = await getByPatientCNIEAPI(token, cnie_hash)
      console.log('API result:', result)
      if (result.success && Array.isArray(result.data?.prescriptions)) {
        const mapped = result.data.prescriptions.map(rx => ({
          rxId:     rx.rx_id || rx.id,
          doctor:   rx.doctor?.user?.first_name ? `Dr. ${rx.doctor.user.first_name}` : 'Unknown Doctor',
          specialty: rx.doctor?.specialty || '',
          med:      rx.drug_name || '',
          issued:   rx.created_at ? new Date(rx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '',
          expiry:   rx.expiry_date ? new Date(rx.expiry_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '',
          status:   rx.status === 'ACTIVE' ? 'VALID'
                  : rx.status === 'PARTIALLY_DISPENSED' ? 'PARTIAL'
                  : rx.status,
        }))
        setPatientPrescriptions(mapped)
        setPatientToken(result.data.patient_token || 'PAT-**-????')
        setPatientFirstName(result.data.patient_first_name || 'Patient')
        setRecordsFetched(true)
      } else if (result.success) {
        setPatientPrescriptions([])
        setPatientToken(result.data?.patient_token || 'PAT-**-????')
        setPatientFirstName(result.data?.patient_first_name || 'Patient')
        setRecordsFetched(true)
      }
    } catch (err) {
      setFetchError(err.response?.data?.error || err.message || 'Patient not found')
      setPatientPrescriptions([])
      setRecordsFetched(false)
    } finally {
      setFetchLoading(false)
    }
  }, [cnieValue, token])

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
                  {getGreeting()}, {user?.first_name ? `Pharmacist ${user.first_name}` : 'Pharmacist'}
                </h2>
                <div style={{ fontSize: 13, color: MUTED, marginBottom: 2 }}>{getFormattedDate()}</div>
                <div style={{ fontSize: 13, color: MUTED }}>
                  Portal Instance:{' '}
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", color: TEXT }}>PHARM-CAS-0924</span>
                </div>
              </div>

              {/* Error banner */}
              {dashError && !dashLoading && (
                <div style={{ fontSize: 12, color: RED, marginBottom: 16 }}>{dashError}</div>
              )}

              {/* Section 2 — Three stat cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, marginBottom: 28 }}>

                {/* Card A — Dispenses Today */}
                <ClickableStatCard
                  icon="medication"
                  iconColor={TEXT}
                  label="Dispenses Today"
                  value={dashLoading ? '—' : String(dashStats.dispensedToday ?? 0).padStart(2, '0')}
                  subLabel="MEDICATION ITEMS"
                  subColor={MUTED}
                  onClick={() => setActiveView('dispense-history')}
                />

                {/* Card B — Pending Verifications */}
                <ClickableStatCard
                  icon="pending_actions"
                  iconColor={ORANGE}
                  label="Pending Verifications"
                  value={dashLoading ? '—' : String(dashStats.pendingVerifications ?? 0).padStart(2, '0')}
                  subLabel="AWAITING CHECK"
                  subColor={ORANGE}
                  onClick={() => setActiveView('active-queue')}
                />

                {/* Card C — Stock Alerts */}
                <ClickableStatCard
                  icon="inventory_2"
                  iconColor={ORANGE}
                  label="Stock Alerts"
                  value={dashLoading ? '—' : String(dashStats.stockAlerts ?? 0).padStart(2, '0')}
                  subLabel="LOW SUPPLY ITEMS"
                  subColor={ORANGE}
                  onClick={() => setActiveView('stock-alerts')}
                />

              </div>

              {/* Section 3 — Quick Actions Bar */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 28 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginRight: 8 }}>QUICK ACTIONS</span>
                <GhostBtn onClick={() => setActiveView('patient-lookup')}>
                  <span className="material-symbols-outlined" style={{ fontSize: 15, lineHeight: 1 }}>person_search</span>
                  Lookup Patient
                </GhostBtn>
                <GhostBtn onClick={() => setActiveView('active-queue')}>
                  <span className="material-symbols-outlined" style={{ fontSize: 15, lineHeight: 1 }}>queue</span>
                  Active Queue
                </GhostBtn>
                <GhostBtn onClick={() => setActiveView('dispense-history')}>
                  <span className="material-symbols-outlined" style={{ fontSize: 15, lineHeight: 1 }}>history</span>
                  Dispense History
                </GhostBtn>
              </div>

              {/* Section 4 — Today's Activity Summary Strip */}
              <div style={{
                backgroundColor: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8,
                padding: '14px 20px', marginBottom: 28,
                display: 'flex', alignItems: 'center', gap: 0,
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginRight: 28 }}>
                  TODAY'S SUMMARY
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: TEXT, fontFamily: "'JetBrains Mono', monospace" }}>
                    {dashLoading ? '—' : todaySummary.patients_served}
                  </div>
                  <div style={{ fontSize: 9, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.07em' }}>PATIENTS SERVED</div>
                </div>
                <div style={{ width: 1, height: 32, backgroundColor: BORDER, marginLeft: 28, marginRight: 28 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: TEXT, fontFamily: "'JetBrains Mono', monospace" }}>
                    {dashLoading ? '—' : todaySummary.prescriptions_pending}
                  </div>
                  <div style={{ fontSize: 9, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.07em' }}>RX PENDING</div>
                </div>
                <div style={{ width: 1, height: 32, backgroundColor: BORDER, marginLeft: 28, marginRight: 28 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: TEXT, fontFamily: "'JetBrains Mono', monospace" }}>
                    {dashLoading ? '—' : todaySummary.otps_pending}
                  </div>
                  <div style={{ fontSize: 9, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.07em' }}>OTPS PENDING</div>
                </div>
              </div>

              {/* Section 5 — Recent Activity */}
              <div style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: `1px solid ${BORDER}` }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>Recent Activity</span>
                  <GhostBtn height={28} onClick={() => setActiveView('activity-log')}>VIEW ALL</GhostBtn>
                </div>
                {dashLoading && (
                  <div style={{ padding: '24px 20px', fontSize: 13, color: MUTED }}>Loading activity...</div>
                )}
                {!dashLoading && dashError && (
                  <div style={{ padding: '24px 20px', fontSize: 13, color: RED }}>Could not load activity</div>
                )}
                {!dashLoading && !dashError && recentActivity.length === 0 && (
                  <div style={{ padding: '24px 20px', fontSize: 13, color: MUTED }}>No recent activity</div>
                )}
                {!dashLoading && !dashError && recentActivity.map((activity, i) => (
                  <ActivityRow
                    key={activity.id}
                    activity={activity}
                    isLast={i === recentActivity.length - 1}
                    onClick={() => navigate(`/pharmacy/verify/${activity.rx_id}`)}
                  />
                ))}
              </div>

            </div>
          )}

          {/* ══ VIEW: Stock Alerts ════════════════════════════════════════ */}
          {activeView === 'stock-alerts' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>

              <div style={{ marginBottom: 28 }}>
                <h2 style={{ fontSize: 24, fontWeight: 700, color: TEXT, margin: '0 0 6px', letterSpacing: '-0.01em' }}>Stock Alerts</h2>
                <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>High-demand medications from the last 30 days</p>
              </div>

              <div style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: ORANGE }}>inventory_2</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>Stock Alerts</span>
                </div>
                <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>Stock alerts list is not yet available.</p>
              </div>

              <div style={{ marginTop: 16 }}>
                <GhostBtn onClick={() => setActiveView('dashboard')}>← Back to Dashboard</GhostBtn>
              </div>

            </div>
          )}

          {/* ══ VIEW: Activity Log ═════════════════════════════════════════ */}
          {activeView === 'activity-log' && (() => {
            const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000)
            const filteredActivity = recentActivity.filter(a => new Date(a.time) >= last24h)
            return (
              <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>

                <div style={{ marginBottom: 28 }}>
                  <h2 style={{ fontSize: 24, fontWeight: 700, color: TEXT, margin: '0 0 6px', letterSpacing: '-0.01em' }}>Activity Log</h2>
                  <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>Recent pharmacist activity (last 24 hours)</p>
                </div>

                <div style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: `1px solid ${BORDER}` }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>Last 24 Hours</span>
                    <span style={{ fontSize: 12, color: MUTED }}>
                      {filteredActivity.length === 1 ? '1 event' : `${filteredActivity.length} events`}
                    </span>
                  </div>
                  {dashLoading && (
                    <div style={{ padding: '24px 20px', fontSize: 13, color: MUTED }}>Loading activity...</div>
                  )}
                  {!dashLoading && filteredActivity.length === 0 && (
                    <div style={{ padding: '24px 20px', fontSize: 13, color: MUTED }}>No activity in the last 24 hours.</div>
                  )}
                  {!dashLoading && filteredActivity.map((item, i) => (
                    <ActivityRow
                      key={item.id}
                      activity={item}
                      isLast={i === filteredActivity.length - 1}
                      onClick={() => navigate(`/pharmacy/verify/${item.rx_id}`)}
                    />
                  ))}
                </div>

                <div style={{ marginTop: 16 }}>
                  <GhostBtn onClick={() => setActiveView('dashboard')}>← Back to Dashboard</GhostBtn>
                </div>

              </div>
            )
          })()}

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
                  <button onClick={handleFetchRecords} disabled={fetchLoading} style={{
                    width: 180, height: 56, flexShrink: 0,
                    backgroundColor: fetchLoading ? '#5AADAD' : TEAL, color: WHITE,
                    border: 'none', borderRadius: 4,
                    fontSize: 12, fontWeight: 700, letterSpacing: '0.07em',
                    cursor: fetchLoading ? 'not-allowed' : 'pointer', fontFamily: "'Space Grotesk', sans-serif",
                    transition: 'background-color 0.15s',
                  }}
                    onMouseEnter={e => { if (!fetchLoading) e.currentTarget.style.backgroundColor = TEAL_DARK }}
                    onMouseLeave={e => { if (!fetchLoading) e.currentTarget.style.backgroundColor = fetchLoading ? '#5AADAD' : TEAL }}
                  >
                    {fetchLoading ? 'FETCHING...' : 'FETCH RECORDS'}
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

              {/* Error from fetch */}
              {fetchError && (
                <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #E53E3E', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
                  <p style={{ fontSize: 13, color: '#E53E3E', margin: 0 }}>{fetchError}</p>
                </div>
              )}

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
                        <div style={{ fontSize: 12, color: MUTED, fontFamily: "'JetBrains Mono', monospace" }}>Identity token: {patientToken}</div>
                        <div style={{ fontSize: 12, color: MUTED }}>First name: {patientFirstName}</div>
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
                      <span style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>Prescriptions</span>
                      <span style={{ backgroundColor: '#E6F3F3', color: TEAL, fontSize: 11, fontWeight: 700, borderRadius: 4, padding: '2px 8px' }}>{patientPrescriptions.length} found</span>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <TableHeader columns={['PRESCRIPTION ID', 'DOCTOR NAME', 'MEDICATION', 'DATE ISSUED', 'EXPIRY', 'STATUS', 'ACTIONS']} />
                        <tbody>
                          {patientPrescriptions.map((rx, i) => (
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
                                {(rx.status === 'VALID' || rx.status === 'PARTIAL') && (
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
                                {(rx.status === 'DISPENSED' || rx.status === 'CANCELLED' || rx.status === 'EXPIRED' || rx.status === 'FLAGGED') && (
                                  <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, letterSpacing: '0.05em' }}>ARCHIVED</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div style={{ padding: '10px 20px', borderTop: `1px solid ${BORDER}`, backgroundColor: '#FAFAFA' }}>
                      <span style={{ fontSize: 12, color: MUTED }}>Showing {patientPrescriptions.length} prescription{patientPrescriptions.length !== 1 ? 's' : ''} for this patient</span>
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
