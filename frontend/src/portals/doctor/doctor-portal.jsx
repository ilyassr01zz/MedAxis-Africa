import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useAuth } from '../../hooks/use-auth'
import { getMyPrescriptionsAPI, createPrescriptionAPI, getDoctorStatsAPI, getRecentActivityAPI } from '../../api/prescriptions'
import { searchPatientAPI } from '../../api/patients'
import { hashCNIE } from '../../utils/hash.utils'

// ─── Design tokens ───────────────────────────────────────────────────────────
const TEAL      = '#0D7C7C'
const TEAL_DARK = '#0A6363'
const TEAL_BG   = '#E6F3F3'
const BORDER    = '#E5E7EB'
const TEXT      = '#1A1A2E'
const MUTED     = '#6B7280'
const BG_PAGE   = '#F5F7F5'
const WHITE     = '#FFFFFF'

// ─── Mock data ───────────────────────────────────────────────────────────────
const PRESCRIPTIONS = [
  { rxId: 'RJ-882190', patient: 'Karima Alaoui',  med: 'Amoxicillin', dose: '500mg • TID',  date: '24/09/2024', expiry: '01/10/2024', status: 'ACTIVE'  },
  { rxId: 'BJ-90201',  patient: 'Fatima Zahrae',  med: 'Metformin',   dose: '1000mg • BID', date: '23/09/2024', expiry: '22/10/2024', status: 'ACTIVE'  },
  { rxId: 'LM-448100', patient: 'Hassan Benali',  med: 'Lisinopril',  dose: '10mg • 1×D',  date: '15/09/2024', expiry: '13/12/2024', status: 'PENDING' },
  { rxId: 'AA-10233',  patient: 'Rachid Tazi',    med: 'Diazepam',    dose: '5mg • PRN',   date: '14/09/2024', expiry: '19/09/2024', status: 'EXPIRED' },
  { rxId: 'XF-778BT',  patient: 'Nadia Chaoui',   med: 'Ibuprofen',   dose: '400mg • BID', date: '08/09/2024', expiry: '13/09/2024', status: 'ACTIVE'  },
]
const TOTAL_RECORDS = 142

const STATUS_CFG = {
  ACTIVE:  { color: TEAL,      label: 'ACTIVE',  action: 'REPRINT', hoverBg: TEAL_DARK },
  PENDING: { color: '#F0A500', label: 'PENDING', action: 'EDIT',    hoverBg: '#D4900A' },
  EXPIRED: { color: '#E53E3E', label: 'EXPIRED', action: 'CLOSE',   hoverBg: '#C03030' },
}

const MOCK_PATIENT = { token: 'PAT-**-8821', firstName: 'Ahmed', activePrescriptions: 2, lastDate: '24/09/2024' }

const ACTIVITY = [
  { dot: TEAL,      action: 'Prescription #RJ-882190 dispensed',            sub: 'Karima Alaoui • Pharmacie Atlas, Casablanca',    time: '2 hours ago'       },
  { dot: MUTED,     action: 'New prescription issued',                       sub: 'Fatima Zahrae • Amoxicillin 500mg',               time: '3 hours ago'       },
  { dot: '#F0A500', action: 'Prescription #LM-448100 flagged by pharmacist', sub: 'Hassan Benali • Awaiting review',                 time: '5 hours ago'       },
  { dot: MUTED,     action: 'New prescription issued',                       sub: 'Rachid Tazi • Diazepam 5mg',                     time: 'Yesterday, 14:30'  },
  { dot: TEAL,      action: 'Prescription #XF-778BT dispensed',              sub: 'Nadia Chaoui • Pharmacie Centrale, Rabat',        time: 'Yesterday, 11:15'  },
]

function formatTimeAgo(dateString) {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  return 'Yesterday'
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

const NAV = [
  { key: 'dashboard',     label: 'Dashboard',        icon: 'dashboard'     },
  { key: 'prescriptions', label: 'My Prescriptions', icon: 'description'   },
  { key: 'new-rx',        label: 'New Prescription', icon: 'add_circle'    },
  { key: 'patients',      label: 'Patient Lookup',   icon: 'person_search' },
]

// ─── Main component ──────────────────────────────────────────────────────────
export default function DoctorPortal() {
  const { logout, token, user } = useAuth()

  const [activeView, setActiveView]           = useState('dashboard')
  const [currentPage, setCurrentPage]         = useState(1)
  const [form, setForm]                       = useState({ cnie: '', diagnosis: '', medication: '', dosage: '', duration: '' })
  const [submitting, setSubmitting]           = useState(false)
  const [successRxId, setSuccessRxId]         = useState(null)
  const [successExpiry, setSuccessExpiry]     = useState(null)
  const [dashSuccess, setDashSuccess]         = useState(false)
  const [patientQuery, setPatientQuery]       = useState('')
  const [patientSearched, setPatientSearched] = useState(false)
  const [patientResult, setPatientResult]     = useState(null)
  const [patientError, setPatientError]       = useState('')
  const [searchLoading, setSearchLoading]     = useState(false)
  const [formError, setFormError]             = useState('')
  const [prescriptions, setPrescriptions]     = useState(PRESCRIPTIONS)
  const [syncMinutes, setSyncMinutes]         = useState(2)
  const [doctorStats, setDoctorStats]         = useState({ issuedToday: 0, pendingPickup: 0, issuedThisMonth: 0 })
  const [recentActivity, setRecentActivity]   = useState([])
  const [filter, setFilter]                   = useState({ status: 'ALL', dateFrom: '', dateTo: '', search: '' })
  const [totalCount, setTotalCount]           = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setSyncMinutes(prev => prev + 1), 60000)
    return () => clearInterval(interval)
  }, [])

  // Load doctor stats and recent activity when dashboard is active
  useEffect(() => {
    if (activeView === 'dashboard' && token) {
      const loadDashboard = async () => {
        try {
          const statsResult = await getDoctorStatsAPI(token)
          if (statsResult.success) setDoctorStats(statsResult.data)
        } catch (err) {
          console.error('Failed to load stats:', err)
        }
        try {
          const activityResult = await getRecentActivityAPI(token)
          if (activityResult.success) setRecentActivity(activityResult.data.activities)
        } catch (err) {
          console.error('Failed to load activity:', err)
        }
      }
      loadDashboard()
    }
  }, [activeView, token])

  // Load prescriptions whenever filter or token changes (debounced 300ms)
  useEffect(() => {
    if (!token) return
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams()
        if (filter.status !== 'ALL') params.append('status', filter.status)
        if (filter.dateFrom) params.append('dateFrom', filter.dateFrom)
        if (filter.dateTo) params.append('dateTo', filter.dateTo)
        if (filter.search) params.append('search', filter.search)
        const result = await getMyPrescriptionsAPI(token, params.toString())
        if (result.success) {
          const mapped = (result.data.prescriptions || []).map(rx => ({
            rxId:    rx.rxId || rx.rx_id,
            patient: rx.patientFirstName || rx.patientToken || 'Patient',
            med:     rx.drugName || rx.drug_name || rx.medication || '',
            dose:    rx.dosage || '',
            date:    rx.issuedAt ? new Date(rx.issuedAt).toLocaleDateString('en-GB') : '',
            expiry:  rx.expiresAt ? new Date(rx.expiresAt).toLocaleDateString('en-GB') : '',
            status:  rx.status || 'ACTIVE',
          }))
          setPrescriptions(mapped)
          setTotalCount(result.data.total || 0)
        }
      } catch (err) {
        console.error('Failed to reload prescriptions:', err)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [filter, token])

  const leftRef       = useRef(null)
  const rightInnerRef = useRef(null)
  const cnieRef       = useRef(null)
  const lookupRef     = useRef(null)

  const totalPages = Math.max(1, Math.ceil(totalCount / 5))
  const pages = useMemo(() => {
    const start = Math.max(1, currentPage - 1)
    const end   = Math.min(totalPages, currentPage + 1)
    const arr = []
    for (let i = start; i <= end; i++) arr.push(i)
    return arr
  }, [currentPage, totalPages])

  const goTo = useCallback((view) => {
    setActiveView(view)
    if (view === 'new-rx') {
      setSuccessRxId(null)
      setTimeout(() => { if (cnieRef.current) cnieRef.current.focus() }, 50)
    } else if (view === 'patients') {
      setTimeout(() => { if (lookupRef.current) lookupRef.current.focus() }, 50)
    } else if (view === 'dashboard') {
      setTimeout(() => {
        if (leftRef.current) leftRef.current.scrollTop = 0
        if (rightInnerRef.current) rightInnerRef.current.scrollTop = 0
      }, 0)
    }
  }, [])

  const setField = useCallback((k, v) => {
    setForm(f => ({ ...f, [k]: v }))
    setDashSuccess(false)
  }, [])

  const resetForm = useCallback(() => {
    setForm({ cnie: '', diagnosis: '', medication: '', dosage: '', duration: '' })
    setSuccessRxId(null)
    setSuccessExpiry(null)
    setDashSuccess(false)
  }, [])

  // Shared prescription creation logic
  const submitPrescription = useCallback(async () => {
    if (!form.cnie || !form.medication || !form.dosage || !form.duration) return null
    setSubmitting(true)
    setFormError('')
    try {
      const cnie_hash = await hashCNIE(form.cnie)
      const result = await createPrescriptionAPI(token, {
        patient_cnie_hash: cnie_hash,
        drug_code: form.medication,
        drug_name: form.medication,
        dosage: form.dosage,
        frequency: 'As prescribed',
        duration_days: parseInt(form.duration, 10),
      })
      if (result.success) {
        // Reload prescriptions list using current filter
        try {
          const params = new URLSearchParams()
          if (filter.status !== 'ALL') params.append('status', filter.status)
          if (filter.dateFrom) params.append('dateFrom', filter.dateFrom)
          if (filter.dateTo) params.append('dateTo', filter.dateTo)
          if (filter.search) params.append('search', filter.search)
          const updated = await getMyPrescriptionsAPI(token, params.toString())
          if (updated.success) {
            const mapped = (updated.data.prescriptions || []).map(rx => ({
              rxId:    rx.rxId || rx.rx_id,
              patient: rx.patientFirstName || rx.patientToken || 'Patient',
              med:     rx.drugName || rx.drug_name || rx.medication || '',
              dose:    rx.dosage || '',
              date:    rx.issuedAt ? new Date(rx.issuedAt).toLocaleDateString('en-GB') : '',
              expiry:  rx.expiresAt ? new Date(rx.expiresAt).toLocaleDateString('en-GB') : '',
              status:  rx.status || 'ACTIVE',
            }))
            setPrescriptions(mapped)
            setTotalCount(updated.data.total || 0)
          }
        } catch (_) { /* keep existing list */ }
        // Refresh dashboard stats and activity so counts are up to date
        try {
          const updatedStats = await getDoctorStatsAPI(token)
          if (updatedStats.success) setDoctorStats(updatedStats.data)
        } catch (_) { /* non-critical */ }
        try {
          const updatedActivity = await getRecentActivityAPI(token)
          if (updatedActivity.success) setRecentActivity(updatedActivity.data.activities)
        } catch (_) { /* non-critical */ }
        return result.data.rxId || result.data.rx_id || ('RJ-' + Math.floor(100000 + Math.random() * 900000))
      }
    } catch (err) {
      setFormError(err.response?.data?.error || err.message || 'Failed to create prescription')
    } finally {
      setSubmitting(false)
    }
    return null
  }, [form, token, filter])

  // Dashboard split-view submit → mini success banner
  const handleDashSubmit = useCallback(async (e) => {
    e.preventDefault()
    const rxId = await submitPrescription()
    if (rxId) {
      setDashSuccess(true)
      setForm({ cnie: '', diagnosis: '', medication: '', dosage: '', duration: '' })
      setTimeout(() => setDashSuccess(false), 3000)
    }
  }, [submitPrescription])

  // Full-width new-rx submit → success card
  const handleNewRxSubmit = useCallback(async (e) => {
    e.preventDefault()
    const days = parseInt(form.duration, 10) || 0
    const rxId = await submitPrescription()
    if (rxId) {
      const expiry = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
      setSuccessExpiry(expiry.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }))
      setSuccessRxId(rxId)
      setForm({ cnie: '', diagnosis: '', medication: '', dosage: '', duration: '' })
    }
  }, [submitPrescription, form.duration])

  const handlePatientSearch = useCallback(async () => {
    if (!patientQuery.trim()) return
    setSearchLoading(true)
    setPatientError('')
    try {
      const result = await searchPatientAPI(token, patientQuery)
      if (result.success) {
        setPatientResult(result.data)
        setPatientSearched(true)
      }
    } catch (err) {
      setPatientError(err.response?.data?.error || 'Patient not found')
      setPatientSearched(true)
    } finally {
      setSearchLoading(false)
    }
  }, [patientQuery, token])

  const issueForPatient = useCallback(() => {
    setForm(f => ({ ...f, cnie: patientQuery }))
    setSuccessRxId(null)
    setActiveView('new-rx')
    setTimeout(() => { if (cnieRef.current) cnieRef.current.focus() }, 50)
  }, [patientQuery])

  // ─── Back button ─────────────────────────────────────────────────────────
  const backBtn = (
    <button onClick={() => goTo('dashboard')} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: 'none', border: 'none', cursor: 'pointer',
      color: MUTED, fontSize: 12, fontWeight: 600,
      fontFamily: "'Space Grotesk', sans-serif",
      padding: '0 0 20px 0', letterSpacing: '0.02em',
    }}
      onMouseEnter={e => { e.currentTarget.style.color = TEAL }}
      onMouseLeave={e => { e.currentTarget.style.color = MUTED }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 16, lineHeight: 1 }}>arrow_back</span>
      Back to Dashboard
    </button>
  )

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', flexDirection: 'column',
      fontFamily: "'Space Grotesk', sans-serif",
      backgroundColor: BG_PAGE,
    }}>

      {/* ── Top navbar ─────────────────────────────────────────────────────── */}
      <header style={{
        height: 52, flexShrink: 0,
        backgroundColor: WHITE, borderBottom: `1px solid ${BORDER}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: 240 }}>
          <div style={{ width: 30, height: 30, backgroundColor: TEAL, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ color: WHITE, fontSize: 16 }}>health_and_safety</span>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, lineHeight: 1.1 }}>MedAxis</div>
            <div style={{ fontSize: 9, fontWeight: 600, color: TEAL, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Infrastructure Portal</div>
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <span style={{ fontSize: 14, color: MUTED, fontFamily: "'Space Grotesk', sans-serif" }}>Doctor Portal</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button style={iconBtn}><span className="material-symbols-outlined" style={{ fontSize: 20, color: MUTED }}>notifications</span></button>
          <button style={iconBtn}><span className="material-symbols-outlined" style={{ fontSize: 20, color: MUTED }}>settings</span></button>
          <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: TEAL, display: 'flex', alignItems: 'center', justifyContent: 'center', color: WHITE, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>D</div>
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <aside style={{
          width: 240, flexShrink: 0,
          backgroundColor: WHITE, borderRight: `1px solid ${BORDER}`,
          display: 'flex', flexDirection: 'column',
          overflowY: 'auto',
        }}>
          <div style={{ padding: '14px 16px 12px', borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: TEXT }}>MedAxis Admin</div>
            <div style={{ fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>Infrastructure Portal</div>
          </div>
          <nav style={{ flex: 1, padding: '8px 0' }}>
            {NAV.map(item => {
              const active = activeView === item.key
              return (
                <button key={item.key} onClick={() => goTo(item.key)} style={{
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
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: active ? TEAL : '#9CA3AF', lineHeight: 1 }}>{item.icon}</span>
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

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Page header */}
          <div style={{ padding: '16px 28px 14px', flexShrink: 0, backgroundColor: WHITE, borderBottom: `1px solid ${BORDER}` }}>
            <h1 style={{ fontSize: 17, fontWeight: 800, color: TEXT, textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Doctor Workspace</h1>
            <p style={{ fontSize: 11.5, color: MUTED, marginTop: 3, fontWeight: 500 }}>
              Regulatory Authority Portal &bull; Medical Staff ID:{' '}
              <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>MAR-8829</span>
            </p>
          </div>

          {/* ══ VIEW: Dashboard — summary screen ═════════════════════════════ */}
          {activeView === 'dashboard' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>

              {/* Section 1 — Greeting */}
              <div style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 24, fontWeight: 700, color: TEXT, margin: '0 0 4px', letterSpacing: '-0.02em' }}>
                  {getGreeting()}, Dr. Ahmed
                </h2>
                <div style={{ fontSize: 13, color: MUTED, marginBottom: 2 }}>{getFormattedDate()}</div>
                <div style={{ fontSize: 13, color: MUTED }}>
                  Medical Staff ID:{' '}
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", color: TEXT }}>MAR-8829</span>
                </div>
              </div>

              {/* Section 2 — Three real stat cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, maxWidth: 900, margin: '0 auto 32px' }}>
                {/* Card 1 — Issued Today */}
                <div
                  onClick={() => {
                    const today = new Date().toISOString().split('T')[0]
                    setFilter({ status: 'ALL', dateFrom: today, dateTo: today, search: '' })
                    setActiveView('prescriptions')
                  }}
                  style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 28, boxSizing: 'border-box', cursor: 'pointer', transition: 'border-color 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = TEAL }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER }}
                >
                  <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>ISSUED TODAY</div>
                  <div style={{ fontSize: 40, fontWeight: 700, color: TEXT, lineHeight: 1, marginBottom: 8 }}>{doctorStats.issuedToday}</div>
                  <div style={{ fontSize: 13, color: MUTED }}>Prescriptions created today</div>
                </div>
                {/* Card 2 — Pending Pickup */}
                <div
                  onClick={() => {
                    setFilter({ status: 'ACTIVE', dateFrom: '', dateTo: '', search: '' })
                    setActiveView('prescriptions')
                  }}
                  style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 28, boxSizing: 'border-box', cursor: 'pointer', transition: 'border-color 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = TEAL }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER }}
                >
                  <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>PENDING PICKUP</div>
                  <div style={{ fontSize: 40, fontWeight: 700, color: TEAL, lineHeight: 1, marginBottom: 8 }}>{doctorStats.pendingPickup}</div>
                  <div style={{ fontSize: 13, color: MUTED }}>Issued but not yet dispensed</div>
                </div>
                {/* Card 3 — Issued This Month */}
                <div
                  onClick={() => {
                    const now = new Date()
                    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
                    const today = now.toISOString().split('T')[0]
                    setFilter({ status: 'ALL', dateFrom: firstDay, dateTo: today, search: '' })
                    setActiveView('prescriptions')
                  }}
                  style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 28, boxSizing: 'border-box', cursor: 'pointer', transition: 'border-color 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = TEAL }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER }}
                >
                  <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>ISSUED THIS MONTH</div>
                  <div style={{ fontSize: 40, fontWeight: 700, color: TEXT, lineHeight: 1, marginBottom: 8 }}>{doctorStats.issuedThisMonth}</div>
                  <div style={{ fontSize: 13, color: MUTED }}>Total prescriptions this month</div>
                </div>
              </div>

              {/* Section 3 — Recent Activity */}
              <div style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: TEXT }}>Recent Activity</span>
                  <span style={{ fontSize: 12, color: MUTED }}>Last 24 hours</span>
                </div>
                <div style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden' }}>
                  {recentActivity.length === 0 ? (
                    <div style={{ padding: '32px', textAlign: 'center', color: MUTED }}>
                      <p style={{ fontSize: '15px', fontWeight: '500', margin: 0 }}>No prescriptions issued in the last 24 hours</p>
                      <p style={{ fontSize: '13px', marginTop: '4px', marginBottom: 0 }}>Prescriptions you issue today will appear here</p>
                    </div>
                  ) : (
                    recentActivity.map((activity, index) => (
                      <div key={activity.id} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '16px',
                        borderBottom: index < recentActivity.length - 1 ? '1px solid #F3F4F6' : 'none',
                        height: '52px',
                        boxSizing: 'border-box',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '8px', height: '8px', borderRadius: '50%',
                            backgroundColor: activity.dot_color, flexShrink: 0
                          }} />
                          <div>
                            <span style={{ fontSize: '14px', color: TEXT, fontWeight: '500' }}>
                              {activity.description}
                            </span>
                            <span style={{ fontSize: '13px', color: MUTED, marginLeft: '8px' }}>
                              {activity.detail}
                            </span>
                          </div>
                        </div>
                        <span style={{ fontSize: '12px', color: '#9CA3AF', whiteSpace: 'nowrap', marginLeft: '16px' }}>
                          {formatTimeAgo(activity.time)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Section 4 — Registry Status */}
              <div style={{
                backgroundColor: '#F0FAFA', border: `1px solid ${TEAL}`, borderRadius: 8,
                padding: '0 16px', height: 52,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#4ADE80', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: TEAL }}>National Prescription Ledger: SYNCED</span>
                </div>
                <span style={{ fontSize: 12, color: MUTED }}>
                  Last sync: {syncMinutes} min{syncMinutes === 1 ? '' : 's'} ago
                </span>
              </div>

            </div>
          )}

          {/* ══ VIEW: My Prescriptions — full width ══════════════════════════ */}
          {activeView === 'prescriptions' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px' }}>
              {backBtn}

              {/* FIX 5 — Active filter indicator */}
              {(filter.status !== 'ALL' || filter.dateFrom || filter.search) && (
                <div style={{
                  background: '#F0FAFA',
                  border: `1px solid ${TEAL}`,
                  borderRadius: '6px',
                  padding: '8px 16px',
                  marginBottom: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span style={{ fontSize: '13px', color: TEAL }}>
                    {filter.status === 'ACTIVE' && !filter.dateFrom && '● Showing: Pending pickup prescriptions'}
                    {filter.dateFrom && filter.dateFrom === filter.dateTo && '● Showing: Prescriptions issued today'}
                    {filter.dateFrom && filter.dateFrom !== filter.dateTo && '● Showing: Prescriptions this month'}
                    {filter.search && `● Searching: "${filter.search}"`}
                    {filter.status !== 'ALL' && filter.status !== 'ACTIVE' && `● Filtered by status: ${filter.status}`}
                  </span>
                  <button
                    onClick={() => setFilter({ status: 'ALL', dateFrom: '', dateTo: '', search: '' })}
                    style={{ background: 'none', border: 'none', color: TEAL, cursor: 'pointer', fontSize: '13px', textDecoration: 'underline', fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    Clear filter
                  </button>
                </div>
              )}

              {/* FIX 2 — Working filter bar */}
              <div style={{
                backgroundColor: WHITE,
                border: `1px solid ${BORDER}`,
                borderRadius: 8,
                padding: '12px 16px',
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                flexWrap: 'wrap',
              }}>
                <input
                  type="text"
                  value={filter.search}
                  onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
                  placeholder="Search medication or RxID..."
                  style={{
                    width: 240, height: 40,
                    border: `1px solid ${BORDER}`, borderRadius: 6,
                    padding: '0 12px', fontSize: 13,
                    fontFamily: "'Space Grotesk', sans-serif",
                    color: TEXT, outline: 'none', boxSizing: 'border-box',
                  }}
                />
                <select
                  value={filter.status}
                  onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
                  style={{
                    width: 160, height: 40,
                    border: `1px solid ${BORDER}`, borderRadius: 6,
                    padding: '0 10px', fontSize: 13,
                    fontFamily: "'Space Grotesk', sans-serif",
                    color: TEXT, outline: 'none',
                    backgroundColor: WHITE, cursor: 'pointer', boxSizing: 'border-box',
                  }}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="DISPENSED">Dispensed</option>
                  <option value="EXPIRED">Expired</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
                <input
                  type="date"
                  value={filter.dateFrom}
                  onChange={e => setFilter(f => ({ ...f, dateFrom: e.target.value }))}
                  style={{
                    width: 140, height: 40,
                    border: `1px solid ${BORDER}`, borderRadius: 6,
                    padding: '0 10px', fontSize: 13,
                    fontFamily: "'Space Grotesk', sans-serif",
                    color: TEXT, outline: 'none', boxSizing: 'border-box',
                  }}
                />
                <input
                  type="date"
                  value={filter.dateTo}
                  onChange={e => setFilter(f => ({ ...f, dateTo: e.target.value }))}
                  style={{
                    width: 140, height: 40,
                    border: `1px solid ${BORDER}`, borderRadius: 6,
                    padding: '0 10px', fontSize: 13,
                    fontFamily: "'Space Grotesk', sans-serif",
                    color: TEXT, outline: 'none', boxSizing: 'border-box',
                  }}
                />
                {(filter.status !== 'ALL' || filter.dateFrom || filter.dateTo || filter.search) && (
                  <button
                    onClick={() => setFilter({ status: 'ALL', dateFrom: '', dateTo: '', search: '' })}
                    style={{
                      height: 40, padding: '0 16px',
                      background: 'none', border: `1px solid ${BORDER}`,
                      borderRadius: 6, fontSize: 13, fontWeight: 600, color: MUTED,
                      cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif",
                    }}
                  >
                    Clear Filters
                  </button>
                )}
              </div>

              <section style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px 12px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: MUTED }}>description</span>
                  <h2 style={{ fontSize: 13, fontWeight: 800, color: TEXT, textTransform: 'uppercase', letterSpacing: '0.09em', margin: '0 0 0 10px' }}>My Prescription History</h2>
                  <span style={{ fontSize: 11, color: MUTED, backgroundColor: '#F3F4F6', borderRadius: 4, padding: '2px 8px', fontWeight: 600, marginLeft: 10 }}>{totalCount} results</span>
                </div>
                <RxTable expanded prescriptions={prescriptions} />
                <RxPagination currentPage={currentPage} totalPages={totalPages} pages={pages} onPageChange={setCurrentPage} total={totalCount} showing={prescriptions.length} />
              </section>
            </div>
          )}

          {/* ══ VIEW: New Prescription — full width ══════════════════════════ */}
          {activeView === 'new-rx' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px' }}>
              {backBtn}
              <div style={{ maxWidth: 640, margin: '0 auto' }}>
                {successRxId ? (
                  /* Success card */
                  <div style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '48px 40px', textAlign: 'center' }}>
                    <div style={{
                      width: 64, height: 64, borderRadius: '50%',
                      backgroundColor: '#DCFCE7', border: '2px solid #16A34A',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto 20px',
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#16A34A' }}>check_circle</span>
                    </div>
                    <h2 style={{ fontSize: 22, fontWeight: 700, color: TEXT, margin: '0 0 12px', letterSpacing: '-0.01em' }}>Prescription Authorized</h2>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700, color: TEAL, marginBottom: 20 }}>
                      RxID: {successRxId}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginBottom: 20 }}>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: 10, fontWeight: 600, color: MUTED, letterSpacing: '0.07em', textTransform: 'uppercase', margin: '0 0 4px 0' }}>ISSUE DATE</p>
                        <p style={{ fontSize: 14, fontWeight: 600, color: TEXT, margin: 0 }}>
                          {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <div style={{ width: 1, backgroundColor: BORDER }} />
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: 10, fontWeight: 600, color: MUTED, letterSpacing: '0.07em', textTransform: 'uppercase', margin: '0 0 4px 0' }}>EXPIRY DATE</p>
                        <p style={{ fontSize: 14, fontWeight: 600, color: TEXT, margin: 0 }}>
                          {successExpiry || '—'}
                        </p>
                      </div>
                    </div>
                    <p style={{ fontSize: 13, color: MUTED, marginBottom: 32, lineHeight: 1.6 }}>
                      Prescription has been stored in the National Prescription Ledger
                    </p>
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                      <button onClick={resetForm} style={{
                        height: 44, padding: '0 24px',
                        backgroundColor: TEAL, color: WHITE,
                        border: 'none', borderRadius: 5, fontSize: 13, fontWeight: 700,
                        cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif",
                        transition: 'background-color 0.15s',
                      }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = TEAL_DARK }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = TEAL }}
                      >Issue Another Prescription</button>
                      <button onClick={() => goTo('prescriptions')} style={{
                        height: 44, padding: '0 24px',
                        backgroundColor: WHITE, color: TEAL,
                        border: `1px solid ${TEAL}`, borderRadius: 5, fontSize: 13, fontWeight: 700,
                        cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif",
                      }}>View Prescription History</button>
                    </div>
                  </div>
                ) : (
                  /* Full-width form */
                  <section style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8 }}>
                    <div style={{ padding: '16px 24px 14px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18, color: TEAL }}>receipt_long</span>
                      <h2 style={{ fontSize: 13, fontWeight: 800, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.09em', margin: 0 }}>New Prescription</h2>
                    </div>
                    <form onSubmit={handleNewRxSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <Field label="Patient CNIE">
                        <Input id="cnie-input" inputRef={cnieRef} height={52} value={form.cnie} onChange={v => setField('cnie', v)} placeholder="e.g. AB123456" />
                      </Field>
                      <Field label="Primary Diagnosis">
                        <Input height={52} value={form.diagnosis} onChange={v => setField('diagnosis', v)} placeholder="Enter clinical ICD-10 code or text" />
                      </Field>
                      <Field label="Medication / Treatment">
                        <div style={{ position: 'relative' }}>
                          <Input height={52} value={form.medication} onChange={v => setField('medication', v)} placeholder="Search national drug registry..." padLeft={44} />
                          <span className="material-symbols-outlined" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: '#9CA3AF', pointerEvents: 'none' }}>search</span>
                        </div>
                      </Field>
                      <Field label="Dosage">
                        <Input height={52} value={form.dosage} onChange={v => setField('dosage', v)} placeholder="e.g. 500mg BID" />
                      </Field>
                      <Field label="Duration (Days)">
                        <Input height={52} type="number" value={form.duration} onChange={v => setField('duration', v)} placeholder="e.g. 7" />
                      </Field>
                      <button type="submit" disabled={submitting} style={{
                        width: '100%', height: 56,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                        backgroundColor: submitting ? '#5AADAD' : TEAL, color: WHITE,
                        border: 'none', borderRadius: 5, fontSize: 13, fontWeight: 700,
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        textTransform: 'uppercase', letterSpacing: '0.08em',
                        fontFamily: "'Space Grotesk', sans-serif",
                        marginTop: 4,
                        transition: 'background-color 0.15s ease',
                      }}
                        onMouseEnter={e => { if (!submitting) e.currentTarget.style.backgroundColor = TEAL_DARK }}
                        onMouseLeave={e => { if (!submitting) e.currentTarget.style.backgroundColor = TEAL }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>shield</span>
                        {submitting ? 'Authorizing…' : 'Authorize & Print'}
                      </button>
                      {formError && (
                        <p style={{ fontSize: 13, color: '#E53E3E', margin: 0, textAlign: 'center' }}>{formError}</p>
                      )}
                    </form>
                  </section>
                )}
              </div>
            </div>
          )}

          {/* ══ VIEW: Patient Lookup — full width ════════════════════════════ */}
          {activeView === 'patients' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px' }}>
              {backBtn}
              <div style={{ maxWidth: 720, margin: '0 auto' }}>
                <div style={{ marginBottom: 24 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 700, color: TEXT, margin: '0 0 6px', letterSpacing: '-0.01em' }}>Patient Lookup</h2>
                  <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>Search for a patient by their national CNIE number</p>
                </div>

                {/* Search bar */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                  <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <span style={{ position: 'absolute', left: 16, pointerEvents: 'none', display: 'flex', alignItems: 'center', color: '#9CA3AF' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 22 }}>badge</span>
                    </span>
                    <input
                      ref={lookupRef}
                      type="text"
                      value={patientQuery}
                      onChange={e => { setPatientQuery(e.target.value); setPatientSearched(false) }}
                      onKeyDown={e => { if (e.key === 'Enter') handlePatientSearch() }}
                      placeholder="Enter patient CNIE number e.g. AB123456"
                      style={{
                        width: '100%', height: 56,
                        paddingLeft: 52, paddingRight: 14,
                        border: `1px solid ${BORDER}`, borderRadius: 4,
                        fontSize: 15, color: TEXT, backgroundColor: WHITE,
                        fontFamily: "'Space Grotesk', sans-serif",
                        outline: 'none', boxSizing: 'border-box',
                        transition: 'border-color 0.15s',
                      }}
                      onFocus={e => (e.target.style.borderColor = TEAL)}
                      onBlur={e => (e.target.style.borderColor = BORDER)}
                    />
                  </div>
                  <button onClick={handlePatientSearch} style={{
                    height: 56, padding: '0 28px',
                    backgroundColor: TEAL, color: WHITE,
                    border: 'none', borderRadius: 4,
                    fontSize: 12, fontWeight: 700, letterSpacing: '0.08em',
                    cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif",
                    flexShrink: 0, whiteSpace: 'nowrap',
                    transition: 'background-color 0.15s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = TEAL_DARK }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = TEAL }}
                  >SEARCH</button>
                </div>

                {/* Result */}
                {patientSearched && (
                  <div style={{ backgroundColor: WHITE, border: `1px solid ${patientError ? '#E53E3E' : BORDER}`, borderRadius: 8, padding: '20px 24px' }}>
                    {patientError ? (
                      <p style={{ fontSize: 13, color: '#E53E3E', margin: 0 }}>{patientError}</p>
                    ) : (
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                          <div style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: TEAL_BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 22, color: TEAL }}>person</span>
                          </div>
                          <div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: TEXT }}>{patientResult?.firstName || MOCK_PATIENT.firstName}</div>
                            <div style={{ fontSize: 12, color: MUTED, fontFamily: "'JetBrains Mono', monospace" }}>{patientResult?.token || MOCK_PATIENT.token}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 32 }}>
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>Patient ID</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: TEAL }}>{patientResult?.patientId || 'Verified'}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>Insurance</div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>{patientResult?.insuranceId || 'On file'}</div>
                          </div>
                        </div>
                      </div>
                      <button onClick={issueForPatient} style={{
                        height: 44, padding: '0 20px', flexShrink: 0,
                        backgroundColor: TEAL, color: WHITE,
                        border: 'none', borderRadius: 5, fontSize: 12, fontWeight: 700,
                        cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif",
                        whiteSpace: 'nowrap', transition: 'background-color 0.15s',
                      }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = TEAL_DARK }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = TEAL }}
                      >Issue Prescription for this Patient</button>
                    </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Registry Sync Active bar ──────────────────────────────────── */}
          <footer style={{
            backgroundColor: TEAL, flexShrink: 0,
            padding: '9px 24px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#4ADE80', flexShrink: 0 }} />
              <span className="material-symbols-outlined" style={{ fontSize: 15, color: WHITE }}>sync</span>
              <span style={{ fontSize: 11.5, fontWeight: 800, color: WHITE, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Registry Sync Active</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.72)' }}>
                Connected to National Pharmacy Grid &bull; Last synchronized: {syncMinutes} min{syncMinutes === 1 ? '' : 's'} ago
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Regulatory Zone</div>
                <div style={{ fontSize: 11.5, color: WHITE, fontWeight: 600, marginTop: 1 }}>Casablanca-Settat</div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Daily Limit Status</div>
                <div style={{ fontSize: 11.5, color: WHITE, fontWeight: 600, marginTop: 1 }}>14% Utilized</div>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function RxTable({ compact, expanded, prescriptions: rows }) {
  const data = rows || PRESCRIPTIONS
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, tableLayout: compact ? 'fixed' : 'auto' }}>
      {compact && (
        <colgroup>
          <col style={{ width: '26%' }} />
          <col style={{ width: '26%' }} />
          <col style={{ width: '14%' }} />
          <col style={{ width: '14%' }} />
          <col style={{ width: '20%' }} />
        </colgroup>
      )}
      <thead>
        <tr style={{ backgroundColor: '#F9FAFB', borderBottom: `1px solid ${BORDER}` }}>
          {(expanded
            ? ['ID / CNIE', 'MEDICATION', 'DOSAGE', 'DATE', 'EXPIRY', 'STATUS', 'ACTIONS']
            : ['ID / CNIE', 'MEDICATION', 'DATE', 'STATUS', 'ACTIONS']
          ).map(col => (
            <th key={col} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: MUTED, letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{col}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((rx, i) => {
          const cfg = STATUS_CFG[rx.status] || {}
          return (
            <tr key={rx.rxId}
              style={{ backgroundColor: i % 2 === 0 ? WHITE : '#FAFAFA', borderBottom: `1px solid #F3F4F6`, transition: 'background-color 0.1s' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F0FAF9')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = i % 2 === 0 ? WHITE : '#FAFAFA')}
            >
              <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: TEAL, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.02em' }}>{rx.rxId}</div>
                <div style={{ fontSize: 11, color: MUTED, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rx.patient}</div>
              </td>
              <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: TEXT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rx.med}</div>
                {compact && <div style={{ fontSize: 10.5, color: MUTED, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rx.dose}</div>}
              </td>
              {expanded && <td style={{ padding: '12px 14px', verticalAlign: 'middle', fontSize: 11, color: MUTED, whiteSpace: 'nowrap' }}>{rx.dose}</td>}
              <td style={{ padding: '12px 14px', verticalAlign: 'middle', fontSize: 11, color: MUTED, whiteSpace: 'nowrap' }}>{rx.date}</td>
              {expanded && <td style={{ padding: '12px 14px', verticalAlign: 'middle', fontSize: 11, color: MUTED, whiteSpace: 'nowrap' }}>{rx.expiry}</td>}
              <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: cfg.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: cfg.color, letterSpacing: '0.05em' }}>{cfg.label}</span>
                </div>
              </td>
              <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                <ActionButton label={cfg.action} color={cfg.color} hoverBg={cfg.hoverBg} />
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function RxPagination({ currentPage, totalPages, pages, onPageChange, total, showing }) {
  return (
    <div style={{ padding: '10px 16px', borderTop: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FAFAFA', flexShrink: 0 }}>
      <span style={{ fontSize: 11, color: MUTED }}>Showing {showing ?? 0} of {total} records</span>
      <div style={{ display: 'flex', gap: 3 }}>
        <PageBtn disabled={currentPage === 1} onClick={() => onPageChange(p => Math.max(1, p - 1))}>
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>chevron_left</span>
        </PageBtn>
        {pages.map(pg => (
          <PageBtn key={pg} active={pg === currentPage} onClick={() => onPageChange(pg)}>{pg}</PageBtn>
        ))}
        <PageBtn disabled={currentPage === totalPages} onClick={() => onPageChange(p => Math.min(totalPages, p + 1))}>
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>chevron_right</span>
        </PageBtn>
      </div>
    </div>
  )
}

function Field({ label, children, style }) {
  return (
    <div style={style}>
      <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = 'text', padLeft, id, inputRef, height = 44 }) {
  return (
    <input
      id={id}
      ref={inputRef}
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%', height,
        padding: `0 12px 0 ${padLeft || 12}px`,
        border: `1px solid ${BORDER}`, borderRadius: 4,
        backgroundColor: WHITE, color: TEXT, fontSize: 13,
        fontFamily: "'Space Grotesk', sans-serif",
        outline: 'none', boxSizing: 'border-box',
        transition: 'border-color 0.15s ease',
      }}
      onFocus={e => (e.target.style.borderColor = TEAL)}
      onBlur={e  => (e.target.style.borderColor = BORDER)}
    />
  )
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ flex: 1, backgroundColor: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 26, fontWeight: 700, color, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: 1.4 }}>{label}</span>
    </div>
  )
}

function ActionButton({ label, color, hoverBg }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '4px 9px', fontSize: 9.5, fontWeight: 700,
        letterSpacing: '0.07em', textTransform: 'uppercase',
        color: hovered ? WHITE : color,
        backgroundColor: hovered ? hoverBg : 'transparent',
        border: `1px solid ${color}`,
        borderRadius: 3, cursor: 'pointer',
        fontFamily: "'Space Grotesk', sans-serif",
        transition: 'all 0.12s ease', whiteSpace: 'nowrap',
      }}
    >{label}</button>
  )
}

function PageBtn({ children, active, disabled, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        minWidth: 28, height: 28, padding: '0 5px',
        border: `1px solid ${active ? TEAL : (hovered ? TEAL : BORDER)}`,
        borderRadius: 4,
        backgroundColor: active ? TEAL : WHITE,
        color: active ? WHITE : (hovered ? TEAL : MUTED),
        fontSize: 11.5, fontWeight: active ? 700 : 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Space Grotesk', sans-serif",
        transition: 'all 0.1s ease',
      }}
    >{children}</button>
  )
}

// ─── Tiny style constants ────────────────────────────────────────────────────
const iconBtn = {
  background: 'none', border: 'none',
  cursor: 'pointer', padding: 4,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
