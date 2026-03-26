import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useAuth } from '../../hooks/use-auth'
import Toast, { useToast } from '../../components/toast'
import { getRegulatorStatsAPI, getDisputesAPI, markDisputeReviewedAPI } from '../../api/regulator'

// ---------------------------------------------------------------------------
// Mock data — exact values from mockup spec
// ---------------------------------------------------------------------------
const MOCK_PRESCRIPTIONS = [
  {
    id: '#PRX-99201-MA',
    practitioner: 'Dr. Amine El Mansouri',
    facility: 'Clinique Internationale, Casa',
    region: 'Casablanca',
    status: 'VALID',
    date: '24 Oct 2023',
    issuedAt: '09:12',
  },
  {
    id: '#PRX-99198-MA',
    practitioner: 'Dr. Sarah Bensaid',
    facility: 'Hospital Mohammed VI',
    region: 'Marrakech',
    status: 'PENDING',
    date: '23 Oct 2023',
    issuedAt: '14:45',
  },
  {
    id: '#PRX-99195-MA',
    practitioner: 'Dr. Omar Khalil',
    facility: 'Private Practice #41',
    region: 'Rabat',
    status: 'FLAGGED',
    date: '23 Oct 2023',
    issuedAt: '11:30',
  },
  {
    id: '#PRX-99192-MA',
    practitioner: 'Dr. Fatima Zahra',
    facility: 'Medina Clinic',
    region: 'Fez',
    status: 'VALID',
    date: '23 Oct 2023',
    issuedAt: '08:05',
  },
  {
    id: '#PRX-99189-MA',
    practitioner: 'Dr. Yassine Alami',
    facility: 'Regional Hospital',
    region: 'Tangier',
    status: 'EXPIRED',
    date: '22 Oct 2023',
    issuedAt: '17:50',
  },
]

const REGION_DATA = [
  { name: 'Casablanca-Settat',    count: '412,300', rawVal: 412300 },
  { name: 'Rabat-Salé-Kénitra',   count: '318,200', rawVal: 318200 },
  { name: 'Marrakech-Safi',       count: '261,400', rawVal: 261400 },
  { name: 'Fès-Meknès',           count: '183,600', rawVal: 183600 },
  { name: 'Tanger-Tétouan',       count: '109,402', rawVal: 109402 },
]
const MAX_REGION = 412300

const LATENCY_BARS = [40, 55, 38, 62, 45, 70, 48, 58, 42, 65, 50, 80]

const STATUS_CONFIG = {
  VALID:     { dot: '#16A34A', label: 'Valid',     textColor: '#16A34A' },
  ACTIVE:    { dot: '#0D7C7C', label: 'Active',    textColor: '#0D7C7C' },
  PENDING:   { dot: '#F0A500', label: 'Pending',   textColor: '#F0A500' },
  FLAGGED:   { dot: '#E53E3E', label: 'Flagged',   textColor: '#E53E3E' },
  DISPUTED:  { dot: '#E53E3E', label: 'Disputed',  textColor: '#E53E3E' },
  EXPIRED:   { dot: '#9CA3AF', label: 'Expired',   textColor: '#6B7280' },
  DISPENSED: { dot: '#6B7280', label: 'Dispensed', textColor: '#6B7280' },
}

const getRowStyle = (status) => {
  if (status === 'DISPUTED') return { background: '#FEF2F2', borderLeft: '3px solid #E53E3E' }
  if (status === 'FLAGGED') return { background: '#FFFBEB', borderLeft: '3px solid #F0A500' }
  return {}
}

const TOTAL_ENTRIES = 1284902

// ---------------------------------------------------------------------------
// Small reusable helpers
// ---------------------------------------------------------------------------

function StatusIndicator({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.EXPIRED
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%',
        backgroundColor: cfg.dot, display: 'inline-block', flexShrink: 0,
      }} />
      <span style={{
        fontSize: '12px', fontWeight: 600, color: cfg.textColor,
        fontFamily: "'Space Grotesk', sans-serif",
      }}>
        {cfg.label}
      </span>
    </span>
  )
}

function PaginationBtn({ children, active, disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        minWidth: 28, height: 28, padding: '0 6px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `1px solid ${active ? '#0D7C7C' : '#E5E7EB'}`,
        borderRadius: 4,
        backgroundColor: active ? '#0D7C7C' : '#FFFFFF',
        color: active ? '#FFFFFF' : disabled ? '#D1D5DB' : '#6B7280',
        fontSize: 12, fontWeight: active ? 700 : 400,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: "'Space Grotesk', sans-serif",
      }}
    >
      {children}
    </button>
  )
}

function FilterChip({ children }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        height: 36, padding: '0 12px',
        backgroundColor: '#FFFFFF',
        border: `1px solid ${hov ? '#0D7C7C' : '#E5E7EB'}`,
        borderRadius: 6,
        fontSize: 12, fontWeight: 500,
        color: hov ? '#0D7C7C' : '#374151',
        cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif",
        transition: 'border-color 0.15s, color 0.15s',
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {children}
    </button>
  )
}

function LatencyStat({ label, value, highlight }) {
  return (
    <div style={{
      backgroundColor: '#F9FAFB', borderRadius: 5,
      padding: '8px 10px', border: '1px solid #F3F4F6',
    }}>
      <div style={{
        fontSize: 10, fontWeight: 700, color: '#9CA3AF',
        textTransform: 'uppercase', letterSpacing: '0.06em',
        fontFamily: "'Space Grotesk', sans-serif", marginBottom: 3,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 14, fontWeight: 700,
        color: highlight ? '#0D7C7C' : '#1A1A2E',
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        {value}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main RegulatorDashboard — full-screen takeover
// ---------------------------------------------------------------------------
export default function RegulatorDashboard() {
  const { logout, token } = useAuth()
  const { visible: toastVisible, showToast } = useToast()

  const [activeNav, setActiveNav]           = useState('dashboard')
  const [searchQuery, setSearchQuery]       = useState('')
  const [currentPage]                       = useState(1)
  const [stats, setStats]                   = useState(null)
  const [disputes, setDisputes]             = useState([])
  const [disputesLoading, setDisputesLoading] = useState(false)
  const [expandedDispute, setExpandedDispute] = useState(null)
  const [reviewedDisputes, setReviewedDisputes] = useState(new Set())

  useEffect(() => {
    if (!token) return
    const refreshStats = async () => {
      try {
        const result = await getRegulatorStatsAPI(token)
        if (result.success) setStats(result.data)
      } catch (err) {
        console.error('Failed to load regulator stats:', err)
      }
    }
    refreshStats()
    const interval = setInterval(refreshStats, 30000)
    return () => clearInterval(interval)
  }, [token])

  useEffect(() => {
    if (activeNav !== 'disputes' || !token) return
    const loadDisputes = async () => {
      setDisputesLoading(true)
      try {
        console.log('Loading disputes, token available:', !!token)
        const result = await getDisputesAPI(token)
        console.log('Disputes API result:', result)
        console.log('Disputes data:', result?.data?.disputes)
        if (result.success) {
          setDisputes(result.data.disputes)
          console.log('Set disputes:', result.data.disputes?.length)
        }
      } catch (err) {
        console.error('Failed to load disputes:', err)
        console.error('Error response:', err.response?.data)
      } finally {
        setDisputesLoading(false)
      }
    }
    loadDisputes()
  }, [activeNav, token])

  const navItems = [
    { key: 'dashboard', label: 'Dashboard',       icon: 'dashboard',     badge: null },
    { key: 'table',     label: 'Prescriptions',   icon: 'description',   badge: null },
    { key: 'stats',     label: 'Statistics',      icon: 'bar_chart',     badge: null },
    { key: 'disputes',  label: 'Disputes',         icon: 'flag',          badge: stats?.disputed > 0 ? stats.disputed : null },
    { key: 'licenses',  label: 'Doctor Licenses', icon: 'verified_user', badge: null },
    { key: 'logs',      label: 'System Logs',     icon: 'history',       badge: null },
  ]

  const mainRef  = useRef(null)
  const tableRef = useRef(null)
  const statsRef = useRef(null)

  const handleNav = useCallback((key) => {
    setActiveNav(key)
    if (key === 'dashboard') {
      if (mainRef.current) mainRef.current.scrollTop = 0
    } else if (key === 'table') {
      if (tableRef.current) tableRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else if (key === 'stats') {
      if (statsRef.current) statsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else if (key === 'licenses' || key === 'logs') {
      showToast()
    }
    // 'disputes' just sets activeNav — the view conditional handles the rest
  }, [showToast])

  const prescriptionRows = stats?.prescriptions
    ? stats.prescriptions.map(rx => ({
        id:          rx.rx_id || rx.rxId || rx.id,
        practitioner: rx.doctorName || rx.doctor?.user?.first_name ? `Dr. ${rx.doctor?.user?.first_name}` : 'Unknown',
        facility:    rx.facility || rx.doctor?.facility || '—',
        region:      rx.region || '—',
        status:      rx.status,
        date:        rx.created_at || rx.issuedAt,
        issuedAt:    rx.created_at ? new Date(rx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '',
      }))
    : MOCK_PRESCRIPTIONS

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return prescriptionRows
    const q = searchQuery.toLowerCase()
    return prescriptionRows.filter(r =>
      (r.id || '').toLowerCase().includes(q) ||
      (r.practitioner || '').toLowerCase().includes(q) ||
      (r.facility || '').toLowerCase().includes(q) ||
      (r.region || '').toLowerCase().includes(q)
    )
  }, [searchQuery, prescriptionRows])

  const handleSearchChange = useCallback(e => setSearchQuery(e.target.value), [])

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
        height: 56, flexShrink: 0,
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E5E7EB',
        display: 'flex', alignItems: 'center',
        padding: '0 24px', gap: 16,
        zIndex: 10,
      }}>
        {/* Logo — aligned with sidebar width */}
        <div style={{ width: 240, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 4,
            backgroundColor: '#0D7C7C',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: 16, lineHeight: 1 }}>health_and_safety</span>
          </div>
          <span style={{ fontWeight: 700, fontSize: 16, color: '#0D7C7C', letterSpacing: '-0.02em' }}>MedAxis</span>
        </div>

        {/* Portal label */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <span style={{ fontSize: 14, color: '#6B7280', fontFamily: "'Space Grotesk', sans-serif" }}>Regulatory Dashboard</span>
        </div>

        {/* Search bar */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <span style={{
            position: 'absolute', left: 10, pointerEvents: 'none',
            display: 'flex', alignItems: 'center', color: '#9CA3AF',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>search</span>
          </span>
          <input
            type="text"
            placeholder="Search infrastructure..."
            style={{
              width: 200, height: 34,
              paddingLeft: 32, paddingRight: 10,
              border: '1px solid #E5E7EB', borderRadius: 4,
              backgroundColor: '#FFFFFF',
              fontSize: 12, color: '#1A1A2E',
              fontFamily: "'Space Grotesk', sans-serif",
              outline: 'none', transition: 'border-color 0.15s',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = '#0D7C7C' }}
            onBlur={e => { e.currentTarget.style.borderColor = '#E5E7EB' }}
          />
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
          }}>R</div>
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
          <div style={{ padding: '20px 20px 16px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A2E', letterSpacing: '-0.01em' }}>
              MedAxis Admin
            </div>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#6B7280', letterSpacing: '0.09em', textTransform: 'uppercase', marginTop: 2 }}>
              Infrastructure Portal
            </div>
          </div>
          <div style={{ height: 1, backgroundColor: '#E5E7EB', margin: '0 16px' }} />

          <nav style={{ padding: '8px 0', flex: 1 }}>
            {navItems.map(item => {
              const active = activeNav === item.key
              return (
                <button key={item.key} onClick={() => handleNav(item.key)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 20px',
                  borderLeft: active ? '3px solid #0D7C7C' : '3px solid transparent',
                  border: 'none',
                  backgroundColor: active ? '#E6F3F3' : 'transparent',
                  cursor: 'pointer', transition: 'background-color 0.15s',
                  fontFamily: "'Space Grotesk', sans-serif", textAlign: 'left',
                }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.backgroundColor = '#F9FAFB' }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.backgroundColor = 'transparent' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18, lineHeight: 1, color: active ? '#0D7C7C' : '#6B7280' }}>
                    {item.icon}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? '#0D7C7C' : '#374151' }}>
                      {item.label}
                    </span>
                    {item.badge && (
                      <span style={{
                        background: '#E5E7EB',
                        color: '#6B7280',
                        borderRadius: '10px',
                        padding: '2px 8px',
                        fontSize: '11px',
                        fontWeight: '700',
                        minWidth: '20px',
                        textAlign: 'center'
                      }}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </nav>

          <div style={{ height: 1, backgroundColor: '#E5E7EB', margin: '0 16px' }} />
          <div style={{ padding: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <button style={{
                background: 'none', border: 'none', textAlign: 'left',
                padding: '6px 4px', fontSize: 12, color: '#6B7280',
                cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif",
              }}>Help Center</button>
              <button onClick={logout} style={{
                background: 'none', border: 'none', textAlign: 'left',
                padding: '6px 4px', fontSize: 12, color: '#6B7280',
                cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif",
              }}>Logout</button>
            </div>
          </div>
        </aside>

        {/* ── Main content ────────────────────────────────────────────────── */}
        <main ref={mainRef} style={{ flex: 1, overflowY: 'auto', padding: activeNav === 'disputes' ? 0 : 32, display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* ── Dashboard view ── */}
          {activeNav !== 'disputes' && <>

          {/* ── Page header ── */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{
                fontSize: 28, fontWeight: 700, color: '#1A1A2E',
                margin: '0 0 6px 0', letterSpacing: '-0.02em', lineHeight: 1.2,
              }}>
                Regulatory Dashboard
              </h1>
              <p style={{ fontSize: 14, color: '#6B7280', margin: 0, fontFamily: "'Inter', sans-serif" }}>
                National Healthcare Infrastructure Monitoring
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button style={{
                display: 'flex', alignItems: 'center', gap: 6,
                height: 40, padding: '0 16px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E7EB', borderRadius: 4,
                fontSize: 12, fontWeight: 700, color: '#374151',
                cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif",
                transition: 'border-color 0.15s, color 0.15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#0D7C7C'; e.currentTarget.style.color = '#0D7C7C' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.color = '#374151' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>download</span>
                Export Report
              </button>
              <button style={{
                display: 'flex', alignItems: 'center', gap: 6,
                height: 40, padding: '0 16px',
                backgroundColor: '#0D7C7C', border: 'none', borderRadius: 4,
                fontSize: 12, fontWeight: 700, color: '#FFFFFF',
                cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif",
                transition: 'background-color 0.15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#0A6363' }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#0D7C7C' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>refresh</span>
                Refresh Data
              </button>
            </div>
          </div>

          {/* ── Disputed alert banner ── */}
          {stats?.disputed > 0 && (
            <div
              onClick={() => setActiveNav('disputes')}
              style={{
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '8px',
                padding: '12px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#FEE2E2'}
              onMouseLeave={e => e.currentTarget.style.background = '#FEF2F2'}
            >
              <span style={{ color: '#E53E3E', fontSize: '20px' }}>⚠</span>
              <div style={{ flex: 1 }}>
                <p style={{ color: '#E53E3E', fontWeight: '700', fontSize: '14px', margin: 0, fontFamily: "'Space Grotesk', sans-serif" }}>
                  {stats.disputed} disputed prescription{stats.disputed > 1 ? 's' : ''} require regulatory review
                </p>
                <p style={{ color: '#6B7280', fontSize: '13px', margin: 0, fontFamily: "'Space Grotesk', sans-serif" }}>
                  Patients have reported these prescriptions as unauthorized — click to review
                </p>
              </div>
              <span style={{ color: '#E53E3E', fontSize: '14px', fontWeight: '600', fontFamily: "'Space Grotesk', sans-serif" }}>Review →</span>
            </div>
          )}

          {/* ── Three stats cards ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            {/* Card 1 */}
            <div style={{
              backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB',
              borderRadius: 8, padding: 20, height: 160, boxSizing: 'border-box',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              borderBottom: '3px solid #0D7C7C',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{
                  width: 36, height: 36, backgroundColor: '#E6F3F3', borderRadius: 6,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0D7C7C',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>description</span>
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 700, color: '#9CA3AF',
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                }}>
                  NATIONAL
                </span>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                  Total Prescriptions
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#1A1A2E', letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 4, fontFamily: "'JetBrains Mono', monospace" }}>
                  {stats ? (stats.total || stats.totalPrescriptions || '—').toLocaleString() : '1,284,902'}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#0D7C7C' }}>↗ 12.4% vs last month</div>
              </div>
            </div>

            {/* Card 2 */}
            <div style={{
              backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB',
              borderRadius: 8, padding: 20, height: 160, boxSizing: 'border-box',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              borderBottom: '3px solid #0D7C7C',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{
                  width: 36, height: 36, backgroundColor: '#E6F3F3', borderRadius: 6,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0D7C7C',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>stethoscope</span>
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 700, color: '#9CA3AF',
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                }}>
                  ACTIVE
                </span>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                  Registered Doctors
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#1A1A2E', letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 4, fontFamily: "'JetBrains Mono', monospace" }}>
                  {stats ? (stats.doctors || stats.registeredDoctors || '—').toLocaleString() : '42,150'}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280' }}>👤 892 new registrations</div>
              </div>
            </div>

            {/* Card 3 */}
            <div style={{
              backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB',
              borderRadius: 8, padding: 20, height: 160, boxSizing: 'border-box',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              borderBottom: '3px solid #0D7C7C',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{
                  width: 36, height: 36, backgroundColor: '#E6F3F3', borderRadius: 6,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0D7C7C',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>local_pharmacy</span>
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 700, color: '#9CA3AF',
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                }}>
                  VERIFIED
                </span>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                  Active Pharmacies
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#1A1A2E', letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 4, fontFamily: "'JetBrains Mono', monospace" }}>
                  {stats ? (stats.pharmacies || stats.activePharmacies || '—').toLocaleString() : '18,294'}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#0D7C7C' }}>✓ 99.8% compliance rate</div>
              </div>
            </div>
          </div>

          {/* ── Filter bar ── */}
          <div style={{
            backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB',
            borderRadius: 8, padding: 16,
          }}>
            {/* Chips row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <span style={{
                fontSize: 11, fontWeight: 700, color: '#6B7280',
                textTransform: 'uppercase', letterSpacing: '0.08em',
                display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>filter_list</span>
                FILTERS:
              </span>
              <FilterChip>
                Region: All Morocco&nbsp;
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>expand_more</span>
              </FilterChip>
              <FilterChip>
                Status: All Records&nbsp;
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>expand_more</span>
              </FilterChip>
              <FilterChip>
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>calendar_month</span>
                Oct 01 – Oct 31, 2023
              </FilterChip>
            </div>

            {/* Search row */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{
                position: 'absolute', left: 12, pointerEvents: 'none',
                display: 'flex', alignItems: 'center', color: '#9CA3AF',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>search</span>
              </span>
              <input
                type="text"
                placeholder="Search by ID or Doctor..."
                value={searchQuery}
                onChange={handleSearchChange}
                style={{
                  width: '100%', height: 40,
                  paddingLeft: 40, paddingRight: 14,
                  border: '1px solid #E5E7EB', borderRadius: 4,
                  fontSize: 13, color: '#1A1A2E',
                  backgroundColor: '#FFFFFF',
                  fontFamily: "'Inter', sans-serif",
                  outline: 'none', transition: 'border-color 0.15s',
                  boxSizing: 'border-box',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = '#0D7C7C' }}
                onBlur={e => { e.currentTarget.style.borderColor = '#E5E7EB' }}
              />
            </div>
          </div>

          {/* ── Data table card ── */}
          <div ref={tableRef} style={{
            backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB',
            borderRadius: 8, overflow: 'hidden',
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }} aria-label="National prescription audit">
                <thead>
                  <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                    {['PRESCRIPTION ID', 'PRACTITIONER', 'FACILITY', 'REGION', 'STATUS', 'ISSUANCE DATE', 'ACTION'].map(col => (
                      <th key={col} scope="col" style={{
                        padding: '10px 16px', textAlign: 'left',
                        fontSize: 10, fontWeight: 700,
                        color: '#6B7280', letterSpacing: '0.07em', textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
                      }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr
                      key={row.id}
                      style={{
                        height: 72,
                        borderBottom: '1px solid #F3F4F6',
                        transition: 'background-color 0.1s',
                        ...getRowStyle(row.status),
                      }}
                      onMouseEnter={e => {
                        const base = getRowStyle(row.status)
                        e.currentTarget.style.backgroundColor = base.background || '#F0F9F9'
                      }}
                      onMouseLeave={e => {
                        const base = getRowStyle(row.status)
                        e.currentTarget.style.backgroundColor = base.background || '#FFFFFF'
                      }}
                    >
                      <td style={{ padding: '0 16px', verticalAlign: 'middle' }}>
                        <span style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 11, fontWeight: 600, color: '#0D7C7C', letterSpacing: '0.02em',
                        }}>
                          {row.id}
                        </span>
                      </td>
                      <td style={{ padding: '0 16px', verticalAlign: 'middle' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E', fontFamily: "'Space Grotesk', sans-serif" }}>
                          {row.practitioner}
                        </span>
                      </td>
                      <td style={{ padding: '0 16px', verticalAlign: 'middle' }}>
                        <span style={{ fontSize: 12, color: '#6B7280', fontFamily: "'Inter', sans-serif" }}>
                          {row.facility}
                        </span>
                      </td>
                      <td style={{ padding: '0 16px', verticalAlign: 'middle' }}>
                        <span style={{ fontSize: 12, color: '#1A1A2E', fontFamily: "'Space Grotesk', sans-serif" }}>
                          {row.region}
                        </span>
                      </td>
                      <td style={{ padding: '0 16px', verticalAlign: 'middle' }}>
                        <StatusIndicator status={row.status} />
                      </td>
                      <td style={{ padding: '0 16px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <div style={{ fontSize: 12, color: '#1A1A2E', fontFamily: "'Inter', sans-serif" }}>{row.date}</div>
                        <div style={{ fontSize: 11, color: '#9CA3AF', fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>{row.issuedAt}</div>
                      </td>
                      <td style={{ padding: '0 16px', verticalAlign: 'middle' }}>
                        {row.status === 'FLAGGED' ? (
                          <button style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            padding: '5px 10px', borderRadius: 4,
                            backgroundColor: '#FEF2F2', border: '1px solid #FECACA',
                            fontSize: 11, fontWeight: 700, color: '#E53E3E',
                            cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif",
                          }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>warning</span>
                            Review
                          </button>
                        ) : (
                          <button style={{
                            display: 'flex', alignItems: 'center',
                            padding: '5px 10px', borderRadius: 4,
                            backgroundColor: 'transparent', border: '1px solid #E5E7EB',
                            fontSize: 11, color: '#6B7280', cursor: 'pointer',
                            fontFamily: "'Space Grotesk', sans-serif",
                            transition: 'border-color 0.15s, color 0.15s',
                          }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#0D7C7C'; e.currentTarget.style.color = '#0D7C7C' }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.color = '#6B7280' }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>visibility</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredRows.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ padding: '32px 16px', textAlign: 'center', fontSize: 13, color: '#6B7280' }}>
                        No records match your search criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 16px', borderTop: '1px solid #E5E7EB', backgroundColor: '#FAFAFA',
            }}>
              <span style={{ fontSize: 12, color: '#6B7280', fontFamily: "'Inter', sans-serif" }}>
                Showing <strong style={{ color: '#1A1A2E' }}>1</strong> to{' '}
                <strong style={{ color: '#1A1A2E' }}>{filteredRows.length}</strong> of{' '}
                <strong style={{ color: '#1A1A2E' }}>{TOTAL_ENTRIES.toLocaleString()}</strong> entries
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <PaginationBtn disabled>
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>chevron_left</span>
                </PaginationBtn>
                {[1, 2, 3, '...', 256986].map((page, i) => (
                  <PaginationBtn key={i} active={page === currentPage}>
                    {page}
                  </PaginationBtn>
                ))}
                <PaginationBtn>
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>chevron_right</span>
                </PaginationBtn>
              </div>
            </div>
          </div>

          {/* ── Bottom two charts side by side ── */}
          <div ref={statsRef} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, paddingBottom: 8 }}>

            {/* LEFT — Prescription Density by Region (CSS bar chart) */}
            <div style={{
              backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB',
              borderRadius: 8, padding: 20,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#0D7C7C' }}>bar_chart</span>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E', margin: 0 }}>
                  Prescription Density by Region
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {REGION_DATA.map((r, i) => {
                  const pct = (r.rawVal / MAX_REGION) * 100
                  return (
                    <div key={r.name}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: '#374151', fontFamily: "'Space Grotesk', sans-serif" }}>
                          {r.name}
                        </span>
                        <span style={{ fontSize: 11, color: '#6B7280', fontFamily: "'JetBrains Mono', monospace" }}>
                          {r.count}
                        </span>
                      </div>
                      <div style={{ height: 24, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{
                          width: `${pct}%`, height: '100%',
                          backgroundColor: i === 0 ? '#0D7C7C' : '#6DB8B8',
                          borderRadius: 4,
                          transition: 'width 0.4s ease',
                        }} />
                      </div>
                    </div>
                  )
                })}
              </div>

              <div style={{
                marginTop: 16, padding: '8px 10px',
                backgroundColor: '#F0F9F9', borderRadius: 5, border: '1px solid #C6E4E4',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#0D7C7C', display: 'inline-block' }} />
                <span style={{ fontSize: 11, color: '#0D7C7C', fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif" }}>
                  Top Activity: Casablanca-Settat
                </span>
              </div>
            </div>

            {/* RIGHT — Verification Latency */}
            <div style={{
              backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB',
              borderRadius: 8, padding: 20,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#0D7C7C' }}>schedule</span>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E', margin: 0 }}>
                    Verification Latency
                  </h3>
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 700, color: '#16A34A',
                  backgroundColor: '#DCFCE7', padding: '2px 8px',
                  borderRadius: 3, letterSpacing: '0.05em', textTransform: 'uppercase',
                }}>
                  LIVE
                </span>
              </div>

              {/* Key metric */}
              <div style={{ marginBottom: 16 }}>
                <div style={{
                  fontSize: 10, fontWeight: 700, color: '#9CA3AF',
                  letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4,
                }}>
                  Average Speed
                </div>
                <div style={{
                  fontSize: 36, fontWeight: 700, color: '#0D7C7C',
                  fontFamily: "'JetBrains Mono', monospace", lineHeight: 1,
                }}>
                  1.4s
                </div>
              </div>

              {/* Mini bar chart */}
              <div style={{
                display: 'flex', alignItems: 'flex-end', gap: 3, height: 48, marginBottom: 16,
              }}>
                {LATENCY_BARS.map((h, i) => (
                  <div key={i} style={{
                    flex: 1, height: `${h}%`,
                    backgroundColor: i === LATENCY_BARS.length - 1 ? '#0D7C7C' : '#A7D4D4',
                    borderRadius: '2px 2px 0 0', minHeight: 4,
                  }} />
                ))}
              </div>

              {/* 2x2 stats grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <LatencyStat label="Active Streams"  value="2,847"  />
                <LatencyStat label="Validation Rate" value="99.90%" highlight />
                <LatencyStat label="P95 Latency"     value="2.1s"   />
                <LatencyStat label="Status"          value="Optimal" highlight />
              </div>
            </div>
          </div>

          </>}

          {/* ── Disputes view ── */}
          {activeNav === 'disputes' && (
            <div style={{ padding: '32px' }}>

              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div>
                  <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1A1A2E', margin: 0, fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}>
                    Patient Disputes
                  </h1>
                  <p style={{ fontSize: '14px', color: '#6B7280', margin: '4px 0 0 0', fontFamily: "'Space Grotesk', sans-serif" }}>
                    Prescriptions reported as unauthorized by patients
                  </p>
                </div>
                <div style={{
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{ color: '#E53E3E', fontSize: '13px', fontWeight: '700', fontFamily: "'Space Grotesk', sans-serif" }}>
                    {disputes.filter(d => !reviewedDisputes.has(d.rx_id)).length} pending review
                  </span>
                </div>
              </div>

              {/* Loading state */}
              {disputesLoading && (
                <div style={{ textAlign: 'center', padding: '48px', color: '#6B7280', fontFamily: "'Space Grotesk', sans-serif" }}>
                  Loading disputes...
                </div>
              )}

              {/* Empty state */}
              {!disputesLoading && disputes.length === 0 && (
                <div style={{
                  background: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  padding: '48px',
                  textAlign: 'center'
                }}>
                  <p style={{ fontSize: '18px', fontWeight: '600', color: '#1A1A2E', margin: '0 0 8px 0', fontFamily: "'Space Grotesk', sans-serif" }}>
                    No disputes reported
                  </p>
                  <p style={{ fontSize: '14px', color: '#6B7280', margin: 0, fontFamily: "'Space Grotesk', sans-serif" }}>
                    Patient dispute reports will appear here
                  </p>
                </div>
              )}

              {/* Disputes list */}
              {!disputesLoading && disputes.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {disputes.map((dispute) => {
                    const isExpanded = expandedDispute === dispute.rx_id
                    const isReviewed = reviewedDisputes.has(dispute.rx_id) || dispute.is_reviewed === true
                    return (
                      <div key={dispute.rx_id} style={{
                        background: '#FFFFFF',
                        border: `1px solid ${isReviewed ? '#E5E7EB' : '#FECACA'}`,
                        borderLeft: `4px solid ${isReviewed ? '#9CA3AF' : '#E53E3E'}`,
                        borderRadius: '8px',
                        overflow: 'hidden',
                        opacity: isReviewed ? 0.7 : 1
                      }}>

                        {/* Row header — always visible */}
                        <div
                          onClick={() => setExpandedDispute(isExpanded ? null : dispute.rx_id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '16px 20px',
                            cursor: 'pointer',
                            gap: '16px'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = '#FAFAFA'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          {/* Status badge */}
                          <span style={{
                            background: isReviewed ? '#F3F4F6' : '#FEF2F2',
                            color: isReviewed ? '#6B7280' : '#E53E3E',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            fontSize: '11px',
                            fontWeight: '700',
                            letterSpacing: '0.05em',
                            whiteSpace: 'nowrap',
                            fontFamily: "'Space Grotesk', sans-serif"
                          }}>
                            {isReviewed ? 'REVIEWED' : 'DISPUTED'}
                          </span>

                          {/* RxID */}
                          <span style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: '13px',
                            color: '#0D7C7C',
                            fontWeight: '600',
                            minWidth: '180px'
                          }}>
                            #{dispute.rx_id}
                          </span>

                          {/* Drug name */}
                          <span style={{ fontSize: '14px', fontWeight: '600', color: '#1A1A2E', flex: 1, fontFamily: "'Space Grotesk', sans-serif" }}>
                            {dispute.drug_name}
                          </span>

                          {/* Doctor */}
                          <span style={{ fontSize: '13px', color: '#6B7280', minWidth: '140px', fontFamily: "'Space Grotesk', sans-serif" }}>
                            {dispute.doctor_name}
                          </span>

                          {/* Patient token */}
                          <span style={{ fontSize: '13px', color: '#6B7280', minWidth: '120px', fontFamily: "'JetBrains Mono', monospace" }}>
                            {dispute.patient_token}
                          </span>

                          {/* Date */}
                          <span style={{ fontSize: '12px', color: '#9CA3AF', minWidth: '100px', fontFamily: "'Space Grotesk', sans-serif" }}>
                            {new Date(dispute.disputed_at).toLocaleDateString('en-GB')}
                          </span>

                          {/* Expand arrow */}
                          <span style={{
                            color: '#6B7280',
                            fontSize: '16px',
                            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s',
                            display: 'inline-block'
                          }}>▼</span>
                        </div>

                        {/* Expanded details */}
                        {isExpanded && (
                          <div style={{
                            borderTop: '1px solid #F3F4F6',
                            padding: '20px 24px',
                            background: '#FAFAFA'
                          }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', marginBottom: '20px' }}>

                              <div>
                                <p style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px 0', fontFamily: "'Space Grotesk', sans-serif" }}>Prescription Details</p>
                                <p style={{ fontSize: '14px', color: '#1A1A2E', fontWeight: '600', margin: '0 0 2px 0', fontFamily: "'Space Grotesk', sans-serif" }}>{dispute.drug_name}</p>
                                <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 2px 0', fontFamily: "'Space Grotesk', sans-serif" }}>{dispute.dosage} • {dispute.frequency}</p>
                                <p style={{ fontSize: '13px', color: '#6B7280', margin: 0, fontFamily: "'Space Grotesk', sans-serif" }}>{dispute.duration_days} days</p>
                              </div>

                              <div>
                                <p style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px 0', fontFamily: "'Space Grotesk', sans-serif" }}>Issued By</p>
                                <p style={{ fontSize: '14px', color: '#1A1A2E', fontWeight: '600', margin: '0 0 2px 0', fontFamily: "'Space Grotesk', sans-serif" }}>{dispute.doctor_name}</p>
                                <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 2px 0', fontFamily: "'Space Grotesk', sans-serif" }}>{dispute.doctor_specialty}</p>
                                <p style={{ fontSize: '13px', color: '#6B7280', margin: 0, fontFamily: "'Space Grotesk', sans-serif" }}>{dispute.doctor_facility}</p>
                              </div>

                              <div>
                                <p style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px 0', fontFamily: "'Space Grotesk', sans-serif" }}>Timeline</p>
                                <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 2px 0', fontFamily: "'Space Grotesk', sans-serif" }}>
                                  Issued: {new Date(dispute.created_at).toLocaleDateString('en-GB')}
                                </p>
                                <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 2px 0', fontFamily: "'Space Grotesk', sans-serif" }}>
                                  Disputed: {new Date(dispute.disputed_at).toLocaleDateString('en-GB')}
                                </p>
                                <p style={{ fontSize: '13px', color: '#6B7280', margin: 0, fontFamily: "'Space Grotesk', sans-serif" }}>
                                  Expires: {new Date(dispute.expiry_date).toLocaleDateString('en-GB')}
                                </p>
                              </div>
                            </div>

                            {/* Action buttons */}
                            <div style={{ display: 'flex', gap: '12px', paddingTop: '16px', borderTop: '1px solid #E5E7EB' }}>
                              {!isReviewed && (
                                <button
                                  onClick={async () => {
                                    try {
                                      const result = await markDisputeReviewedAPI(token, dispute.rx_id)
                                      if (!result.success) {
                                        console.error('Failed to mark reviewed:', result)
                                        return
                                      }
                                      // Optimistic update — mark this dispute as reviewed in local state immediately
                                      setReviewedDisputes(prev => new Set([...prev, dispute.rx_id]))
                                      setDisputes(prev => prev.map(d =>
                                        d.rx_id === dispute.rx_id ? { ...d, is_reviewed: true } : d
                                      ))
                                      // Reload stats so sidebar badge and alert banner update
                                      const updatedStats = await getRegulatorStatsAPI(token)
                                      if (updatedStats.success) setStats(updatedStats.data)
                                    } catch (err) {
                                      console.error('Failed to mark reviewed:', err.response?.data || err.message)
                                    }
                                  }}
                                  style={{
                                    background: '#0D7C7C',
                                    color: '#FFFFFF',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '8px 20px',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    fontFamily: "'Space Grotesk', sans-serif"
                                  }}
                                >
                                  ✓ Mark as Reviewed
                                </button>
                              )}
                              {isReviewed && (
                                <span style={{
                                  fontSize: '13px',
                                  color: '#9CA3AF',
                                  fontStyle: 'italic',
                                  padding: '8px 0',
                                  fontFamily: "'Space Grotesk', sans-serif"
                                }}>
                                  Reviewed by regulatory team
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      <Toast visible={toastVisible} />
    </div>
  )
}
