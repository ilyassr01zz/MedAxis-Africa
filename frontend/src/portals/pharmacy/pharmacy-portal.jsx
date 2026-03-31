import { useState, useCallback, useRef, useEffect, Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/use-auth'
import { getByPatientCNIEAPI } from '../../api/prescriptions'
import {
  getDashboardKPIsAPI,
  getDashboardActivityAPI,
  getActiveQueueAPI,
  getDispensingHistoryAPI,
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
const GREEN     = '#16A34A'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function relativeTime(isoString) {
  if (!isoString) return ''
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days !== 1 ? 's' : ''} ago`
}

function formatDateTime(isoString) {
  if (!isoString) return ''
  const d = new Date(isoString)
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const pad = n => String(n).padStart(2, '0')
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatDate(isoString) {
  if (!isoString) return ''
  const d = new Date(isoString)
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function getFormattedDate() {
  const d = new Date()
  const days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December']
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

function parseMedications(rx) {
  if (rx.medications_json) {
    try {
      const meds = JSON.parse(rx.medications_json)
      if (Array.isArray(meds) && meds.length > 0) return meds
    } catch {}
  }
  return [{
    name:      rx.drug_name,
    dosage:    rx.dosage,
    frequency: rx.frequency,
    duration:  rx.duration_days ? `${rx.duration_days} days` : 'As prescribed',
  }]
}

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  ACTIVE:              { color: GREEN,  label: 'ACTIVE'    },
  VALID:               { color: GREEN,  label: 'ACTIVE'    },
  PENDING:             { color: ORANGE, label: 'PENDING'   },
  PARTIAL:             { color: ORANGE, label: 'PARTIAL'   },
  PARTIALLY_DISPENSED: { color: ORANGE, label: 'PARTIAL'   },
  FLAGGED:             { color: RED,    label: 'FLAGGED'   },
  EXPIRED:             { color: RED,    label: 'EXPIRED'   },
  DISPENSED:           { color: MUTED,  label: 'DISPENSED' },
  CANCELLED:           { color: MUTED,  label: 'CANCELLED' },
}

const NAV_ITEMS = [
  { key: 'dashboard',        label: 'Dashboard',       icon: 'dashboard'     },
  { key: 'active-queue',     label: 'Active Queue',    icon: 'queue'         },
  { key: 'patient-lookup',   label: 'Patient Lookup',  icon: 'person_search' },
  { key: 'dispense-history', label: 'Dispense History',icon: 'history'       },
]

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatusDot({ status }) {
  const cfg = STATUS_CONFIG[status] || { color: MUTED, label: status || '—' }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: cfg.color, flexShrink: 0, display: 'inline-block' }} />
      <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color, letterSpacing: '0.05em', fontFamily: "'Space Grotesk', sans-serif" }}>
        {cfg.label}
      </span>
    </span>
  )
}

function GhostBtn({ onClick, children, height = 36, disabled = false }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        height, padding: '0 14px',
        backgroundColor: WHITE,
        border: `1px solid ${hov && !disabled ? TEAL : BORDER}`,
        borderRadius: 4,
        fontSize: 11, fontWeight: 700,
        color: hov && !disabled ? TEAL : MUTED,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: "'Space Grotesk', sans-serif",
        letterSpacing: '0.05em',
        transition: 'border-color 0.15s, color 0.15s',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
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

function KpiCard({ icon, iconColor, label, value, subLabel, loading, onClick, flagged }) {
  const [hov, setHov] = useState(false)
  const clickable = !!onClick
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => clickable && setHov(true)}
      onMouseLeave={() => clickable && setHov(false)}
      style={{
        backgroundColor: WHITE,
        border: `1px solid ${hov ? TEAL : BORDER}`,
        borderRadius: 8, padding: 20, height: 120,
        boxSizing: 'border-box', display: 'flex',
        flexDirection: 'column', justifyContent: 'space-between',
        cursor: clickable ? 'pointer' : 'default',
        transition: 'border-color 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 18, color: iconColor }}>{icon}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
      </div>
      <div>
        <div style={{ fontSize: 36, fontWeight: 700, color: flagged ? ORANGE : iconColor, lineHeight: 1, fontFamily: "'JetBrains Mono', monospace" }}>
          {loading ? '—' : value}
        </div>
        <div style={{ fontSize: 9, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>
          {subLabel}
        </div>
      </div>
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function EventModal({ event, onClose }) {
  if (!event) return null
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      backgroundColor: 'rgba(0,0,0,0.35)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        backgroundColor: WHITE,
        border: `1px solid ${BORDER}`,
        borderRadius: 8,
        width: 480, maxWidth: '90vw',
        padding: 28,
        fontFamily: "'Space Grotesk', sans-serif",
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>Dispensing Event</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTED, display: 'flex' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { label: 'Event ID',        value: event.eventId,                 mono: true  },
            { label: 'Dispensed At',    value: formatDateTime(event.dispensedAt) },
            { label: 'Prescription ID', value: event.prescriptionId,          mono: true  },
            { label: 'Medication',      value: event.snapshotMedicationName              },
            { label: 'Doctor',          value: event.snapshotDoctorIdentifier            },
            { label: 'Pharmacist',      value: event.snapshotPharmacistLabel             },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 130, flexShrink: 0, fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.07em', paddingTop: 2 }}>
                {row.label}
              </div>
              <div style={{
                fontSize: 13, color: TEXT, fontWeight: 500,
                fontFamily: row.mono ? "'JetBrains Mono', monospace" : "'Space Grotesk', sans-serif",
                color: row.mono ? TEAL : TEXT,
              }}>
                {row.value || '—'}
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
          <GhostBtn onClick={onClose}>Close</GhostBtn>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function PharmacyPortal() {
  const navigate = useNavigate()
  const { logout, token, user } = useAuth()

  // ── Navigation
  const [activeView, setActiveView] = useState('dashboard')

  // ── Dashboard
  const [dashKPIs,     setDashKPIs]     = useState({ dispensesToday: null, activeQueueCount: null, flaggedAlerts: null, patientsServed: null })
  const [dashActivity, setDashActivity] = useState([])
  const [dashLoading,  setDashLoading]  = useState(false)
  const [dashError,    setDashError]    = useState('')

  // ── Patient Lookup
  const [cnieValue,           setCnieValue]           = useState('')
  const [recordsFetched,      setRecordsFetched]      = useState(false)
  const [fetchLoading,        setFetchLoading]        = useState(false)
  const [fetchError,          setFetchError]          = useState('')
  const [patientPrescriptions,setPatientPrescriptions]= useState([])
  const [patientToken,        setPatientToken]        = useState(null)
  const [lookupExpandedRxIds, setLookupExpandedRxIds] = useState(new Set())

  // ── Active Queue
  const [queueEntries,    setQueueEntries]    = useState([])
  const [queueTotal,      setQueueTotal]      = useState(0)
  const [queueLoading,    setQueueLoading]    = useState(false)
  const [queueError,      setQueueError]      = useState('')
  const [queueExpandedIds,setQueueExpandedIds]= useState(new Set())

  // ── Dispense History
  const [historyEvents,     setHistoryEvents]     = useState([])
  const [historyPagination, setHistoryPagination] = useState(null)
  const [historyLoading,    setHistoryLoading]    = useState(false)
  const [historyError,      setHistoryError]      = useState('')
  const [historyTimeRange,  setHistoryTimeRange]  = useState('LAST_7_DAYS')
  const [historyStartDate,  setHistoryStartDate]  = useState('')
  const [historyEndDate,    setHistoryEndDate]    = useState('')
  const [historyMedQuery,   setHistoryMedQuery]   = useState('')
  const [historyPage,       setHistoryPage]       = useState(1)
  const [historyModalEvent, setHistoryModalEvent] = useState(null)

  const cnieInputRef = useRef(null)

  // ── Dashboard fetch ────────────────────────────────────────────────────────
  useEffect(() => {
    if (activeView !== 'dashboard' || !token) return
    let cancelled = false
    setDashLoading(true)
    setDashError('')
    Promise.all([
      getDashboardKPIsAPI(token),
      getDashboardActivityAPI(token, 24),
    ])
      .then(([kpiRes, actRes]) => {
        if (cancelled) return
        const k = kpiRes?.data || {}
        setDashKPIs({
          dispensesToday:   k.dispensesToday   ?? 0,
          activeQueueCount: k.activeQueueCount ?? 0,
          flaggedAlerts:    k.flaggedAlerts    ?? 0,
          patientsServed:   k.patientsServed   ?? 0,
        })
        setDashActivity(actRes?.data?.events ?? [])
      })
      .catch(() => { if (!cancelled) setDashError('Failed to load dashboard data') })
      .finally(() => { if (!cancelled) setDashLoading(false) })
    return () => { cancelled = true }
  }, [activeView, token])

  // ── Active Queue fetch ─────────────────────────────────────────────────────
  useEffect(() => {
    if (activeView !== 'active-queue' || !token) return
    let cancelled = false
    setQueueLoading(true)
    setQueueError('')
    getActiveQueueAPI(token)
      .then(res => {
        if (cancelled) return
        setQueueEntries(res?.data?.entries ?? [])
        setQueueTotal(res?.data?.total ?? 0)
      })
      .catch(() => { if (!cancelled) setQueueError('Failed to load active queue') })
      .finally(() => { if (!cancelled) setQueueLoading(false) })
    return () => { cancelled = true }
  }, [activeView, token])

  // ── History fetch ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (activeView !== 'dispense-history' || !token) return
    let cancelled = false
    setHistoryLoading(true)
    setHistoryError('')
    getDispensingHistoryAPI(token, {
      timeRange:       historyTimeRange,
      startDate:       historyStartDate,
      endDate:         historyEndDate,
      medicationQuery: historyMedQuery,
      page:            historyPage,
      pageSize:        50,
    })
      .then(res => {
        if (cancelled) return
        setHistoryEvents(res?.data?.events ?? [])
        setHistoryPagination(res?.data?.pagination ?? null)
      })
      .catch(() => { if (!cancelled) setHistoryError('Failed to load dispensing history') })
      .finally(() => { if (!cancelled) setHistoryLoading(false) })
    return () => { cancelled = true }
  }, [activeView, token, historyTimeRange, historyStartDate, historyEndDate, historyMedQuery, historyPage])

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleNav = useCallback((key) => {
    setActiveView(key)
    if (key === 'patient-lookup') {
      setTimeout(() => { if (cnieInputRef.current) cnieInputRef.current.focus() }, 50)
    }
  }, [])

  const handleFetchRecords = useCallback(async () => {
    if (!cnieValue.trim()) return
    setFetchLoading(true)
    setFetchError('')
    setLookupExpandedRxIds(new Set())
    try {
      const cnie_hash = await hashCNIE(cnieValue)
      const result = await getByPatientCNIEAPI(token, cnie_hash)
      if (result.success && Array.isArray(result.data?.prescriptions)) {
        setPatientPrescriptions(result.data.prescriptions)
        setPatientToken(result.data.patient_token || null)
        setRecordsFetched(true)
      } else if (result.success) {
        setPatientPrescriptions([])
        setPatientToken(result.data?.patient_token || null)
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

  const handleResetLookup = useCallback(() => {
    setCnieValue('')
    setPatientPrescriptions([])
    setPatientToken(null)
    setFetchError('')
    setRecordsFetched(false)
    setLookupExpandedRxIds(new Set())
  }, [])

  const toggleLookupExpand = useCallback((rxId) => {
    setLookupExpandedRxIds(prev => {
      const next = new Set(prev)
      if (next.has(rxId)) next.delete(rxId)
      else next.add(rxId)
      return next
    })
  }, [])

  const toggleQueueExpand = useCallback((rxId) => {
    setQueueExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(rxId)) next.delete(rxId)
      else next.add(rxId)
      return next
    })
  }, [])

  const handleDispense = useCallback((rxId) => {
    navigate(`/pharmacy/verify/${rxId}`)
  }, [navigate])

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', flexDirection: 'column',
      backgroundColor: BG_PAGE,
      fontFamily: "'Space Grotesk', sans-serif",
      overflow: 'hidden',
    }}>

      {/* ── Top navbar ────────────────────────────────────────────────────── */}
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
            <div style={{ fontSize: 9, fontWeight: 600, color: TEAL, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Pharmacy Portal</div>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <span style={{ fontSize: 14, color: MUTED }}>Pharmacy Workspace</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', backgroundColor: TEAL, display: 'flex', alignItems: 'center', justifyContent: 'center', color: WHITE, fontSize: 13, fontWeight: 700 }}>
            {user?.first_name?.[0]?.toUpperCase() || 'P'}
          </div>
          <button onClick={logout} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: MUTED, fontFamily: "'Space Grotesk', sans-serif" }}>
            Logout
          </button>
        </div>
      </header>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <aside style={{
          width: 240, flexShrink: 0,
          backgroundColor: WHITE, borderRight: `1px solid ${BORDER}`,
          display: 'flex', flexDirection: 'column',
          overflowY: 'auto',
        }}>
          <div style={{ padding: '14px 16px 12px', borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: TEXT }}>
              {user?.first_name ? `Pharmacist ${user.first_name}` : 'Pharmacist'}
            </div>
            <div style={{ fontSize: 9, fontWeight: 600, color: MUTED, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 2 }}>
              Pharmacy Workspace
            </div>
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
        </aside>

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Page header */}
          <div style={{ padding: '16px 28px 14px', flexShrink: 0, backgroundColor: WHITE, borderBottom: `1px solid ${BORDER}` }}>
            <h1 style={{ fontSize: 17, fontWeight: 800, color: TEXT, textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
              Pharmacy Workspace
            </h1>
            <p style={{ fontSize: 11.5, color: MUTED, marginTop: 3, fontWeight: 500, margin: '3px 0 0' }}>
              Pharmacy Workspace &bull; Portal Instance:{' '}
              <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>PHARM-CAS-0924</span>
            </p>
          </div>

          {/* ══ VIEW: Dashboard ══════════════════════════════════════════════ */}
          {activeView === 'dashboard' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>

              {/* Greeting */}
              <div style={{ marginBottom: 28 }}>
                <h2 style={{ fontSize: 24, fontWeight: 700, color: TEXT, margin: '0 0 4px', letterSpacing: '-0.02em' }}>
                  {getGreeting()}, {user?.first_name ? `Pharmacist ${user.first_name}` : 'Pharmacist'}
                </h2>
                <div style={{ fontSize: 13, color: MUTED }}>{getFormattedDate()}</div>
              </div>

              {dashError && !dashLoading && (
                <div style={{ fontSize: 12, color: RED, marginBottom: 16 }}>{dashError}</div>
              )}

              {/* 3 KPI Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 28 }}>
                <KpiCard
                  icon="medication"
                  iconColor={TEXT}
                  label="Dispenses Today"
                  value={String(dashKPIs.dispensesToday ?? 0).padStart(2, '0')}
                  subLabel="Medication items"
                  loading={dashLoading}
                  onClick={() => setActiveView('dispense-history')}
                />
                <KpiCard
                  icon="queue"
                  iconColor={TEAL}
                  label="Active Queue"
                  value={String(dashKPIs.activeQueueCount ?? 0).padStart(2, '0')}
                  subLabel="Prescriptions pending"
                  loading={dashLoading}
                  onClick={() => setActiveView('active-queue')}
                />
                <KpiCard
                  icon="flag"
                  iconColor={dashKPIs.flaggedAlerts > 0 ? ORANGE : TEAL}
                  label="Flagged Alerts"
                  value={String(dashKPIs.flaggedAlerts ?? 0).padStart(2, '0')}
                  subLabel="Requires review"
                  loading={dashLoading}
                  flagged={dashKPIs.flaggedAlerts > 0}
                />
              </div>

              {/* Today's Summary Strip */}
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
                    {dashLoading ? '—' : (dashKPIs.patientsServed ?? 0)}
                  </div>
                  <div style={{ fontSize: 9, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.07em' }}>PATIENTS SERVED</div>
                </div>
                <div style={{ width: 1, height: 32, backgroundColor: BORDER, marginLeft: 28, marginRight: 28 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: TEXT, fontFamily: "'JetBrains Mono', monospace" }}>
                    {dashLoading ? '—' : (dashKPIs.dispensesToday ?? 0)}
                  </div>
                  <div style={{ fontSize: 9, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.07em' }}>DISPENSES TODAY</div>
                </div>
              </div>

              {/* Recent Activity */}
              <div style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: `1px solid ${BORDER}` }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>Recent Activity</span>
                  <span style={{ fontSize: 11, color: MUTED, marginLeft: 8 }}>Last 24 hours</span>
                </div>
                {dashLoading && (
                  <div style={{ padding: '24px 20px', fontSize: 13, color: MUTED }}>Loading activity...</div>
                )}
                {!dashLoading && dashError && (
                  <div style={{ padding: '24px 20px', fontSize: 13, color: RED }}>Could not load activity</div>
                )}
                {!dashLoading && !dashError && dashActivity.length === 0 && (
                  <div style={{ padding: '24px 20px', fontSize: 13, color: MUTED }}>No activity in the last 24 hours</div>
                )}
                {!dashLoading && !dashError && dashActivity.map((evt, i) => {
                  const isLast = i === dashActivity.length - 1
                  const clickable = evt.prescriptionActive === true
                  return (
                    <ActivityRow
                      key={`${evt.prescriptionId}-${i}`}
                      event={evt}
                      isLast={isLast}
                      clickable={clickable}
                      onClick={clickable ? () => setActiveView('active-queue') : undefined}
                    />
                  )
                })}
              </div>

            </div>
          )}

          {/* ══ VIEW: Active Queue ═══════════════════════════════════════════ */}
          {activeView === 'active-queue' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>

              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: 24, fontWeight: 700, color: TEXT, margin: '0 0 6px', letterSpacing: '-0.01em' }}>Active Queue</h2>
                <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>Prescriptions pending dispensing</p>
              </div>

              {queueError && (
                <div style={{ fontSize: 12, color: RED, marginBottom: 16 }}>{queueError}</div>
              )}

              <div style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden' }}>
                {queueLoading && (
                  <div style={{ padding: '32px 24px', fontSize: 13, color: MUTED }}>Loading active queue...</div>
                )}
                {!queueLoading && queueEntries.length === 0 && !queueError && (
                  <div style={{ padding: '32px 24px', textAlign: 'center' }}>
                    <div style={{ fontSize: 13, color: MUTED, marginBottom: 12 }}>
                      No active prescriptions in the queue. Use Patient Lookup to find a patient.
                    </div>
                    <GhostBtn onClick={() => setActiveView('patient-lookup')}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>person_search</span>
                      Patient Lookup
                    </GhostBtn>
                  </div>
                )}
                {!queueLoading && queueEntries.length > 0 && (
                  <>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <TableHeader columns={['PRESCRIPTION ID', 'PATIENT TOKEN', 'DOCTOR NAME', 'MEDICATION', 'DATE ISSUED', 'STATUS', 'ACTIONS']} />
                        <tbody>
                          {queueEntries.map((entry, i) => {
                            const expanded = queueExpandedIds.has(entry.prescriptionId)
                            const hasPending = entry.medications?.some(m => m.status !== 'DISPENSED')
                            return (
                              <Fragment key={entry.prescriptionId}>
                                <tr
                                  style={{
                                    borderBottom: expanded ? 'none' : `1px solid #F3F4F6`,
                                    height: 64,
                                    backgroundColor: i % 2 === 0 ? WHITE : '#FAFAFA',
                                  }}
                                >
                                  <td style={{ padding: '0 16px', verticalAlign: 'middle' }}>
                                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, color: TEAL }}>
                                      {entry.prescriptionId}
                                    </span>
                                  </td>
                                  <td style={{ padding: '0 16px', verticalAlign: 'middle' }}>
                                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: MUTED }}>
                                      {entry.patientToken}
                                    </span>
                                  </td>
                                  <td style={{ padding: '0 16px', verticalAlign: 'middle', fontSize: 13, fontWeight: 500, color: TEXT }}>
                                    {entry.doctorName}
                                  </td>
                                  <td style={{ padding: '0 16px', verticalAlign: 'middle' }}>
                                    <div style={{ fontSize: 13, color: TEXT }}>{entry.medications?.[0]?.drugName || entry.medicationSummary}</div>
                                    {entry.medications?.length > 1 && (
                                      <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>+{entry.medications.length - 1} more</div>
                                    )}
                                  </td>
                                  <td style={{ padding: '0 16px', verticalAlign: 'middle', fontSize: 12, color: MUTED, whiteSpace: 'nowrap' }}>
                                    {formatDate(entry.dateIssued)}
                                  </td>
                                  <td style={{ padding: '0 16px', verticalAlign: 'middle' }}>
                                    <StatusDot status={entry.status} />
                                  </td>
                                  <td style={{ padding: '0 16px', verticalAlign: 'middle' }}>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                      {hasPending && (
                                        <button
                                          onClick={e => { e.stopPropagation(); handleDispense(entry.prescriptionId) }}
                                          style={{
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
                                      )}
                                      <button
                                        onClick={e => { e.stopPropagation(); toggleQueueExpand(entry.prescriptionId) }}
                                        style={{
                                          height: 32, padding: '0 12px',
                                          backgroundColor: WHITE, color: MUTED,
                                          border: `1px solid ${BORDER}`, borderRadius: 4,
                                          fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
                                          cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif",
                                        }}
                                      >
                                        {expanded ? 'HIDE' : 'VIEW'}
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                                {expanded && (
                                  <tr style={{ borderBottom: `1px solid #F3F4F6` }}>
                                    <td colSpan={7} style={{ padding: '0 16px 16px' }}>
                                      <MedicationCards medications={entry.medications} />
                                    </td>
                                  </tr>
                                )}
                              </Fragment>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div style={{ padding: '12px 20px', borderTop: `1px solid ${BORDER}`, backgroundColor: '#FAFAFA' }}>
                      <span style={{ fontSize: 12, color: MUTED }}>
                        {queueTotal} active prescription{queueTotal !== 1 ? 's' : ''} in queue
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ══ VIEW: Patient Lookup ══════════════════════════════════════════ */}
          {activeView === 'patient-lookup' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>

              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: 24, fontWeight: 700, color: TEXT, margin: '0 0 6px', letterSpacing: '-0.01em' }}>Patient Lookup</h2>
                <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>Enter patient CNIE to retrieve active prescriptions</p>
              </div>

              {/* CNIE Input */}
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
                  <button
                    onClick={handleFetchRecords}
                    disabled={fetchLoading}
                    style={{
                      width: 180, height: 56, flexShrink: 0,
                      backgroundColor: fetchLoading ? '#5AADAD' : TEAL, color: WHITE,
                      border: 'none', borderRadius: 4,
                      fontSize: 12, fontWeight: 700, letterSpacing: '0.07em',
                      cursor: fetchLoading ? 'not-allowed' : 'pointer',
                      fontFamily: "'Space Grotesk', sans-serif",
                      transition: 'background-color 0.15s',
                    }}
                    onMouseEnter={e => { if (!fetchLoading) e.currentTarget.style.backgroundColor = TEAL_DARK }}
                    onMouseLeave={e => { if (!fetchLoading) e.currentTarget.style.backgroundColor = fetchLoading ? '#5AADAD' : TEAL }}
                  >
                    {fetchLoading ? 'FETCHING...' : 'FETCH RECORDS'}
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: GREEN, display: 'inline-block' }} />
                  <span style={{ fontSize: 12, color: MUTED }}>Moroccan Health Network Active</span>
                </div>
              </div>

              {/* Error */}
              {fetchError && (
                <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #E53E3E', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
                  <p style={{ fontSize: 13, color: RED, margin: 0 }}>{fetchError}</p>
                </div>
              )}

              {/* Results */}
              {recordsFetched && (
                <>
                  {/* Patient Token Card */}
                  <div style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '16px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: '#E6F3F3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 22, color: TEAL }}>person</span>
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: TEAL, marginBottom: 3 }}>Patient Identified</div>
                        <div style={{ fontSize: 12, color: MUTED, fontFamily: "'JetBrains Mono', monospace" }}>
                          Patient Token: {patientToken || 'PAT-****-XXXX'}
                        </div>
                      </div>
                    </div>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      backgroundColor: '#DCFCE7', border: '1px solid #16A34A',
                      borderRadius: 4, padding: '5px 12px',
                      fontSize: 11, fontWeight: 700, color: GREEN, letterSpacing: '0.05em',
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14, lineHeight: 1 }}>check_circle</span>
                      IDENTITY CONFIRMED
                    </div>
                  </div>

                  {/* Zero results */}
                  {patientPrescriptions.length === 0 && (
                    <div style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '32px 24px', textAlign: 'center', marginBottom: 16 }}>
                      <div style={{ fontSize: 13, color: MUTED, marginBottom: 16 }}>
                        No active prescriptions found for this patient.
                      </div>
                      <GhostBtn onClick={handleResetLookup}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>person_search</span>
                        Look up another patient
                      </GhostBtn>
                    </div>
                  )}

                  {/* Prescriptions table with accordion */}
                  {patientPrescriptions.length > 0 && (
                    <div style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
                      <div style={{ padding: '14px 20px 12px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>Prescriptions</span>
                        <span style={{ backgroundColor: '#E6F3F3', color: TEAL, fontSize: 11, fontWeight: 700, borderRadius: 4, padding: '2px 8px' }}>
                          {patientPrescriptions.length} found
                        </span>
                      </div>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <TableHeader columns={['PRESCRIPTION ID', 'DOCTOR', 'MEDICATION', 'DATE ISSUED', 'EXPIRY', 'STATUS', 'ACTIONS']} />
                          <tbody>
                            {patientPrescriptions.map((rx, i) => {
                              const rxId     = rx.rx_id || rx.id
                              const expanded = lookupExpandedRxIds.has(rxId)
                              const meds     = parseMedications(rx)
                              const firstMed = meds[0]?.name || rx.drug_name || '—'
                              const docName  = rx.doctor?.user?.first_name ? `Dr. ${rx.doctor.user.first_name}` : 'Unknown Doctor'
                              const spec     = rx.doctor?.specialty || ''
                              const rxStatus = rx.status === 'ACTIVE' ? 'ACTIVE'
                                            : rx.status === 'PARTIALLY_DISPENSED' ? 'PARTIALLY_DISPENSED'
                                            : rx.status
                              const issuedStr = rx.created_at ? formatDate(rx.created_at) : '—'
                              const expiryStr = rx.expiry_date ? formatDate(rx.expiry_date) : '—'
                              const canDispense = rx.status === 'ACTIVE' || rx.status === 'PARTIALLY_DISPENSED'

                              return (
                                <Fragment key={rxId}>
                                  <tr
                                    onClick={() => toggleLookupExpand(rxId)}
                                    style={{
                                      borderBottom: expanded ? 'none' : `1px solid #F3F4F6`,
                                      height: 72,
                                      backgroundColor: i % 2 === 0 ? WHITE : '#FAFAFA',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <td style={{ padding: '0 16px', verticalAlign: 'middle' }}>
                                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, color: TEAL }}>{rxId}</span>
                                    </td>
                                    <td style={{ padding: '0 16px', verticalAlign: 'middle' }}>
                                      <div style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{docName}</div>
                                      {spec && <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{spec}</div>}
                                    </td>
                                    <td style={{ padding: '0 16px', verticalAlign: 'middle' }}>
                                      <div style={{ fontSize: 13, color: TEXT }}>{firstMed}</div>
                                      {meds.length > 1 && (
                                        <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>+{meds.length - 1} more</div>
                                      )}
                                    </td>
                                    <td style={{ padding: '0 16px', verticalAlign: 'middle', fontSize: 12, color: MUTED, whiteSpace: 'nowrap' }}>{issuedStr}</td>
                                    <td style={{ padding: '0 16px', verticalAlign: 'middle', fontSize: 12, color: MUTED, whiteSpace: 'nowrap' }}>{expiryStr}</td>
                                    <td style={{ padding: '0 16px', verticalAlign: 'middle' }}>
                                      <StatusDot status={rxStatus} />
                                    </td>
                                    <td style={{ padding: '0 16px', verticalAlign: 'middle' }}>
                                      {canDispense && (
                                        <button
                                          onClick={e => { e.stopPropagation(); handleDispense(rxId) }}
                                          style={{
                                            height: 34, padding: '0 14px',
                                            backgroundColor: TEAL, color: WHITE,
                                            border: 'none', borderRadius: 4,
                                            fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
                                            cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif",
                                            whiteSpace: 'nowrap',
                                          }}
                                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = TEAL_DARK }}
                                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = TEAL }}
                                        >
                                          DISPENSE
                                        </button>
                                      )}
                                      {!canDispense && (
                                        <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, letterSpacing: '0.05em' }}>ARCHIVED</span>
                                      )}
                                    </td>
                                  </tr>
                                  {expanded && (
                                    <tr style={{ borderBottom: `1px solid #F3F4F6`, backgroundColor: i % 2 === 0 ? WHITE : '#FAFAFA' }}>
                                      <td colSpan={7} style={{ padding: '0 16px 16px' }}>
                                        <LookupMedicationExpansion meds={meds} rx={rx} rxId={rxId} />
                                      </td>
                                    </tr>
                                  )}
                                </Fragment>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div style={{ padding: '10px 20px', borderTop: `1px solid ${BORDER}`, backgroundColor: '#FAFAFA' }}>
                        <span style={{ fontSize: 12, color: MUTED }}>
                          {patientPrescriptions.length} prescription{patientPrescriptions.length !== 1 ? 's' : ''} for this patient
                        </span>
                      </div>
                    </div>
                  )}

                  <GhostBtn onClick={handleResetLookup}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>person_search</span>
                    Look up another patient
                  </GhostBtn>
                </>
              )}
            </div>
          )}

          {/* ══ VIEW: Dispense History ════════════════════════════════════════ */}
          {activeView === 'dispense-history' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>

              <div style={{ marginBottom: 20 }}>
                <h2 style={{ fontSize: 24, fontWeight: 700, color: TEXT, margin: '0 0 4px', letterSpacing: '-0.01em' }}>Dispense History</h2>
                <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>Immutable dispensing audit log</p>
              </div>

              {/* Filter bar */}
              <div style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '14px 20px', marginBottom: 20, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>

                {/* Time range selector */}
                <div style={{ display: 'flex', gap: 0 }}>
                  {['TODAY', 'LAST_7_DAYS', 'CUSTOM'].map((range, idx) => {
                    const labels = { TODAY: 'Today', LAST_7_DAYS: 'Last 7 Days', CUSTOM: 'Custom' }
                    const active = historyTimeRange === range
                    return (
                      <button
                        key={range}
                        onClick={() => { setHistoryTimeRange(range); setHistoryPage(1) }}
                        style={{
                          height: 34, padding: '0 16px',
                          backgroundColor: active ? TEAL : WHITE,
                          color: active ? WHITE : MUTED,
                          border: `1px solid ${active ? TEAL : BORDER}`,
                          borderRadius: idx === 0 ? '4px 0 0 4px' : idx === 2 ? '0 4px 4px 0' : 0,
                          borderLeft: idx > 0 ? 'none' : undefined,
                          fontSize: 12, fontWeight: 600,
                          cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif",
                          transition: 'all 0.12s',
                        }}
                      >
                        {labels[range]}
                      </button>
                    )
                  })}
                </div>

                {/* Custom date inputs */}
                {historyTimeRange === 'CUSTOM' && (
                  <>
                    <input
                      type="date"
                      value={historyStartDate}
                      onChange={e => { setHistoryStartDate(e.target.value); setHistoryPage(1) }}
                      style={{
                        height: 34, padding: '0 10px',
                        border: `1px solid ${BORDER}`, borderRadius: 4,
                        fontSize: 12, color: TEXT, fontFamily: "'Space Grotesk', sans-serif",
                        outline: 'none',
                      }}
                    />
                    <span style={{ fontSize: 12, color: MUTED }}>to</span>
                    <input
                      type="date"
                      value={historyEndDate}
                      onChange={e => { setHistoryEndDate(e.target.value); setHistoryPage(1) }}
                      style={{
                        height: 34, padding: '0 10px',
                        border: `1px solid ${BORDER}`, borderRadius: 4,
                        fontSize: 12, color: TEXT, fontFamily: "'Space Grotesk', sans-serif",
                        outline: 'none',
                      }}
                    />
                  </>
                )}

                {/* Medication search */}
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: 10, pointerEvents: 'none', color: '#9CA3AF', display: 'flex' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>search</span>
                  </span>
                  <input
                    type="text"
                    value={historyMedQuery}
                    onChange={e => { setHistoryMedQuery(e.target.value); setHistoryPage(1) }}
                    placeholder="Search medication..."
                    style={{
                      height: 34, padding: '0 10px 0 32px',
                      border: `1px solid ${BORDER}`, borderRadius: 4,
                      fontSize: 12, color: TEXT, fontFamily: "'Space Grotesk', sans-serif",
                      outline: 'none', width: 200,
                    }}
                  />
                </div>
              </div>

              {historyError && (
                <div style={{ fontSize: 12, color: RED, marginBottom: 16 }}>{historyError}</div>
              )}

              {/* Table */}
              <div style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden' }}>
                {historyLoading && (
                  <div style={{ padding: '32px 24px', fontSize: 13, color: MUTED }}>Loading dispensing history...</div>
                )}
                {!historyLoading && historyEvents.length === 0 && !historyError && (
                  <div style={{ padding: '32px 24px', textAlign: 'center', fontSize: 13, color: MUTED }}>
                    No dispensing events found for the selected period.
                  </div>
                )}
                {!historyLoading && historyEvents.length > 0 && (
                  <>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <TableHeader columns={['DISPENSED AT', 'PRESCRIPTION ID', 'MEDICATION', 'DOCTOR', 'PHARMACIST']} />
                        <tbody>
                          {historyEvents.map((evt, i) => (
                            <tr key={evt.eventId} style={{ borderBottom: `1px solid #F3F4F6`, height: 60, backgroundColor: i % 2 === 0 ? WHITE : '#FAFAFA' }}>
                              <td style={{ padding: '0 16px', verticalAlign: 'middle', fontSize: 12, color: MUTED, whiteSpace: 'nowrap' }}>
                                {formatDateTime(evt.dispensedAt)}
                              </td>
                              <td style={{ padding: '0 16px', verticalAlign: 'middle' }}>
                                <button
                                  onClick={() => setHistoryModalEvent(evt)}
                                  style={{
                                    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                                    fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, color: TEAL,
                                    textDecoration: 'underline', textUnderlineOffset: 2,
                                  }}
                                >
                                  {evt.prescriptionId}
                                </button>
                              </td>
                              <td style={{ padding: '0 16px', verticalAlign: 'middle', fontSize: 13, color: TEXT }}>
                                {evt.snapshotMedicationName}
                              </td>
                              <td style={{ padding: '0 16px', verticalAlign: 'middle', fontSize: 12, color: MUTED }}>
                                {evt.snapshotDoctorIdentifier}
                              </td>
                              <td style={{ padding: '0 16px', verticalAlign: 'middle', fontSize: 12, color: MUTED }}>
                                {evt.snapshotPharmacistLabel}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {historyPagination && (
                      <div style={{ padding: '12px 20px', borderTop: `1px solid ${BORDER}`, backgroundColor: '#FAFAFA', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12, color: MUTED }}>
                          Showing {((historyPagination.page - 1) * historyPagination.pageSize) + 1}–{Math.min(historyPagination.page * historyPagination.pageSize, historyPagination.total)} of {historyPagination.total} events
                        </span>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <GhostBtn
                            height={30}
                            disabled={historyPage <= 1}
                            onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                          >
                            ← Prev
                          </GhostBtn>
                          <GhostBtn
                            height={30}
                            disabled={historyPage >= historyPagination.totalPages}
                            onClick={() => setHistoryPage(p => Math.min(historyPagination.totalPages, p + 1))}
                          >
                            Next →
                          </GhostBtn>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Dispensing event modal */}
      {historyModalEvent && (
        <EventModal event={historyModalEvent} onClose={() => setHistoryModalEvent(null)} />
      )}

    </div>
  )
}

// ─── Medication cards for Active Queue expand ─────────────────────────────────
function MedicationCards({ medications }) {
  if (!medications || medications.length === 0) return null
  return (
    <div style={{ paddingTop: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 10 }}>
        MEDICATIONS ({medications.length})
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {medications.map((m, i) => (
          <div key={i} style={{
            backgroundColor: WHITE, border: `1px solid ${BORDER}`,
            borderRadius: 6, padding: 16, minWidth: 180,
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 8 }}>{m.drugName}</div>
            {[
              ['DOSAGE',     m.dosage   ],
              ['FREQUENCY',  m.frequency],
              ['DURATION',   m.duration ],
            ].map(([label, val]) => val && (
              <div key={label} style={{ fontSize: 11, color: MUTED, marginBottom: 3 }}>
                <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 9 }}>{label}</span>
                <span style={{ marginLeft: 6, color: TEXT }}>{val}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Lookup medication expansion (with summary row) ───────────────────────────
function LookupMedicationExpansion({ meds, rx, rxId }) {
  return (
    <div style={{ paddingTop: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 10 }}>
        MEDICATIONS ({meds.length})
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        {meds.map((m, i) => (
          <div key={i} style={{
            backgroundColor: WHITE, border: `1px solid ${BORDER}`,
            borderRadius: 6, padding: 16, minWidth: 180,
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 8 }}>{m.name || m.drugName || rx.drug_name}</div>
            {[
              ['DOSAGE',    m.dosage    || rx.dosage   ],
              ['FREQUENCY', m.frequency || rx.frequency],
              ['DURATION',  m.duration  || (rx.duration_days ? `${rx.duration_days} days` : '')],
            ].map(([label, val]) => val && (
              <div key={label} style={{ fontSize: 11, color: MUTED, marginBottom: 3 }}>
                <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 9 }}>{label}</span>
                <span style={{ marginLeft: 6, color: TEXT }}>{val}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 24, fontSize: 11, color: MUTED }}>
        <span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", color: TEAL, fontWeight: 600 }}>{rxId}</span>
        </span>
        {rx.created_at && <span>ISSUED {formatDate(rx.created_at)}</span>}
        {rx.expiry_date && <span>EXPIRES {formatDate(rx.expiry_date)}</span>}
        {rx.status && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: STATUS_CONFIG[rx.status]?.color || MUTED, display: 'inline-block' }} />
            {rx.status}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Activity row for dashboard ───────────────────────────────────────────────
function ActivityRow({ event, isLast, clickable, onClick }) {
  const [hov, setHov] = useState(false)
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
      <div style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: TEAL, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: TEXT }}>
          {event.pharmacistLabel} dispensed {event.medicationName}
        </div>
        {event.prescriptionId && (
          <div style={{ fontSize: 11, color: MUTED, marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
            {event.prescriptionId}
          </div>
        )}
      </div>
      <div style={{ fontSize: 11, color: MUTED, whiteSpace: 'nowrap', flexShrink: 0 }}>
        {relativeTime(event.occurredAt)}
      </div>
    </div>
  )
}
