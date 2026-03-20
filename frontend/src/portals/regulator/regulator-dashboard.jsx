import { useState, useMemo, useCallback, useRef } from 'react'
import { useAuth } from '../../hooks/use-auth'
import Toast, { useToast } from '../../components/toast'

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
  PENDING:   { dot: '#F0A500', label: 'Pending',   textColor: '#F0A500' },
  FLAGGED:   { dot: '#E53E3E', label: 'Flagged',   textColor: '#E53E3E' },
  EXPIRED:   { dot: '#9CA3AF', label: 'Expired',   textColor: '#6B7280' },
  DISPENSED: { dot: '#6B7280', label: 'Dispensed', textColor: '#6B7280' },
}

const TOTAL_ENTRIES = 1284902

// ---------------------------------------------------------------------------
// Sidebar nav items — Dashboard is ACTIVE for regulator
// ---------------------------------------------------------------------------
const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard',       icon: 'dashboard'     },
  { key: 'table',     label: 'Prescriptions',   icon: 'description'   },
  { key: 'stats',     label: 'Statistics',      icon: 'bar_chart'     },
  { key: 'licenses',  label: 'Doctor Licenses', icon: 'verified_user' },
  { key: 'logs',      label: 'System Logs',     icon: 'history'       },
]

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
  const { logout } = useAuth()
  const { visible: toastVisible, showToast } = useToast()

  const [activeNav, setActiveNav]       = useState('dashboard')
  const [searchQuery, setSearchQuery]   = useState('')
  const [currentPage]                   = useState(1)

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
  }, [showToast])

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return MOCK_PRESCRIPTIONS
    const q = searchQuery.toLowerCase()
    return MOCK_PRESCRIPTIONS.filter(r =>
      r.id.toLowerCase().includes(q) ||
      r.practitioner.toLowerCase().includes(q) ||
      r.facility.toLowerCase().includes(q) ||
      r.region.toLowerCase().includes(q)
    )
  }, [searchQuery])

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
            {NAV_ITEMS.map(item => {
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
                  <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? '#0D7C7C' : '#374151' }}>
                    {item.label}
                  </span>
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
        <main ref={mainRef} style={{ flex: 1, overflowY: 'auto', padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>

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
                <div style={{ fontSize: 28, fontWeight: 700, color: '#1A1A2E', letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 4 }}>
                  1,284,902
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
                <div style={{ fontSize: 28, fontWeight: 700, color: '#1A1A2E', letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 4 }}>
                  42,150
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
                <div style={{ fontSize: 28, fontWeight: 700, color: '#1A1A2E', letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 4 }}>
                  18,294
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
                      }}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#F0F9F9' }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#FFFFFF' }}
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

        </main>
      </div>

      <Toast visible={toastVisible} />
    </div>
  )
}
