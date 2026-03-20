import { useState, useMemo, useCallback, useRef } from 'react'
import { useAuth } from '../../hooks/use-auth'

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
  { rxId: 'RJ-882190', patient: 'Karima Alaoui',    med: 'Amoxicillin',  dose: '500mg • TID • 7 Days',  date: '24/09/2024', status: 'ACTIVE'  },
  { rxId: 'BJ-90201',  patient: 'Fatima Zahrae',    med: 'Metformin',    dose: '1000mg • BID • 30 Days', date: '23/09/2024', status: 'ACTIVE'  },
  { rxId: 'LM-448100', patient: 'Hassan Benali',    med: 'Lisinopril',   dose: '10mg • 1×D • 90 Days',  date: '15/09/2024', status: 'PENDING' },
  { rxId: 'AA-10233',  patient: 'Rachid Tazi',      med: 'Diazepam',     dose: '5mg • PRN • 5 Days',     date: '14/09/2024', status: 'EXPIRED' },
  { rxId: 'XF-778BT',  patient: 'Nadia Chaoui',     med: 'Ibuprofen',    dose: '400mg • BID • 5 Days',   date: '08/09/2024', status: 'ACTIVE'  },
]
const TOTAL_RECORDS = 142

const STATUS_CFG = {
  ACTIVE:  { color: TEAL,      label: 'ACTIVE',  action: 'REPRINT', hoverBg: TEAL_DARK  },
  PENDING: { color: '#F0A500', label: 'PENDING', action: 'EDIT',    hoverBg: '#D4900A'  },
  EXPIRED: { color: '#E53E3E', label: 'EXPIRED', action: 'CLOSE',   hoverBg: '#C03030'  },
}

const NAV = [
  { key: 'dashboard',     label: 'Dashboard',        icon: 'dashboard'     },
  { key: 'prescriptions', label: 'My Prescriptions', icon: 'description'   },
  { key: 'new-rx',        label: 'New Prescription', icon: 'add_circle'    },
  { key: 'patients',      label: 'Patient Lookup',   icon: 'person_search' },
]

// ─── Main component ──────────────────────────────────────────────────────────
export default function DoctorPortal() {
  const { logout }                    = useAuth()
  const [activeNav, setActiveNav]     = useState('dashboard')
  const [currentPage, setCurrentPage] = useState(1)
  const [form, setForm]               = useState({ cnie: '', diagnosis: '', medication: '', dosage: '', duration: '' })
  const [submitting, setSubmitting]   = useState(false)
  const [success, setSuccess]         = useState(false)

  const leftRef      = useRef(null)
  const rightInnerRef = useRef(null)
  const cnieRef      = useRef(null)

  const handleNav = useCallback((key) => {
    setActiveNav(key)
    if (key === 'dashboard') {
      if (leftRef.current)       leftRef.current.scrollTop = 0
      if (rightInnerRef.current) rightInnerRef.current.scrollTop = 0
    } else if (key === 'prescriptions') {
      if (rightInnerRef.current) rightInnerRef.current.scrollTop = 0
    } else if (key === 'new-rx' || key === 'patients') {
      if (leftRef.current) leftRef.current.scrollTop = 0
      setTimeout(() => { if (cnieRef.current) cnieRef.current.focus() }, 50)
    }
  }, [])

  const totalPages = Math.ceil(TOTAL_RECORDS / 5)

  const pages = useMemo(() => {
    const start = Math.max(1, currentPage - 1)
    const end   = Math.min(totalPages, currentPage + 1)
    const arr = []
    for (let i = start; i <= end; i++) arr.push(i)
    return arr
  }, [currentPage, totalPages])

  const setField = useCallback((k, v) => {
    setForm(f => ({ ...f, [k]: v }))
    setSuccess(false)
  }, [])

  const resetForm = useCallback(() => {
    setForm({ cnie: '', diagnosis: '', medication: '', dosage: '', duration: '' })
    setSuccess(false)
  }, [])

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    if (!form.cnie || !form.medication || !form.dosage || !form.duration) return
    setSubmitting(true)
    await new Promise(r => setTimeout(r, 800))
    setSubmitting(false)
    setSuccess(true)
    setForm({ cnie: '', diagnosis: '', medication: '', dosage: '', duration: '' })
  }, [form])

  return (
    /* Full-screen takeover so the portal owns the entire viewport */
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
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: 240 }}>
          <div style={{ width: 30, height: 30, backgroundColor: TEAL, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ color: WHITE, fontSize: 16 }}>health_and_safety</span>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, lineHeight: 1.1 }}>MedAxis</div>
            <div style={{ fontSize: 9, fontWeight: 600, color: TEAL, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Infrastructure Portal</div>
          </div>
        </div>

        {/* Portal label */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <span style={{ fontSize: 14, color: MUTED, fontFamily: "'Space Grotesk', sans-serif" }}>Doctor Portal</span>
        </div>

        {/* Right icons */}
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
          {/* Brand */}
          <div style={{ padding: '14px 16px 12px', borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: TEXT }}>MedAxis Admin</div>
            <div style={{ fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>Infrastructure Portal</div>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: '8px 0' }}>
            {NAV.map(item => {
              const active = activeNav === item.key
              return (
                <button key={item.key} onClick={() => handleNav(item.key)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 16px',
                  background: active ? TEAL_BG : 'transparent',
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

          {/* Bottom actions */}
          <div style={{ padding: '12px 12px 16px', borderTop: `1px solid ${BORDER}` }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <button style={{
                background: 'none', border: 'none', textAlign: 'left',
                padding: '6px 4px', fontSize: 12, color: MUTED,
                cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif",
              }}>Help Center</button>
              <button onClick={logout} style={{
                background: 'none', border: 'none', textAlign: 'left',
                padding: '6px 4px', fontSize: 12, color: MUTED,
                cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif",
              }}>Logout</button>
            </div>
          </div>
        </aside>

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Page header */}
          <div style={{
            padding: '16px 28px 14px', flexShrink: 0,
            backgroundColor: WHITE, borderBottom: `1px solid ${BORDER}`,
          }}>
            <h1 style={{ fontSize: 17, fontWeight: 800, color: TEXT, textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
              Doctor Workspace
            </h1>
            <p style={{ fontSize: 11.5, color: MUTED, marginTop: 3, fontWeight: 500 }}>
              Regulatory Authority Portal &bull; Medical Staff ID:{' '}
              <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>MAR-8829</span>
            </p>
          </div>

          {/* Split panel area */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

            {/* Split: form (38%) + table (62%) */}
            <div style={{ display: 'flex', gap: 20, flex: 1, overflow: 'hidden', padding: '20px 28px', minHeight: 0 }}>

              {/* ── LEFT: New Prescription form ──────────────────────────── */}
              <div ref={leftRef} style={{ width: '38%', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>

                <section style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden' }}>
                  {/* Section header */}
                  <div style={{ padding: '13px 20px 11px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: TEAL }}>receipt_long</span>
                    <h2 style={{ fontSize: 11, fontWeight: 800, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.09em', margin: 0 }}>
                      New Prescription
                    </h2>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSubmit} style={{ padding: '18px 20px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

                    {success && (
                      <div style={{ backgroundColor: TEAL_BG, border: `1px solid ${TEAL}`, borderRadius: 4, padding: '8px 12px', fontSize: 12, color: TEAL, fontWeight: 600 }}>
                        Prescription authorized successfully.
                      </div>
                    )}

                    {/* Patient CNIE */}
                    <Field label="Patient CNIE">
                      <Input id="cnie-input" inputRef={cnieRef} value={form.cnie} onChange={v => setField('cnie', v)} placeholder="e.g. AB123456" />
                    </Field>

                    {/* Primary Diagnosis */}
                    <Field label="Primary Diagnosis">
                      <Input value={form.diagnosis} onChange={v => setField('diagnosis', v)} placeholder="Enter clinical ICD-10 code or text" />
                    </Field>

                    {/* Medication */}
                    <Field label="Medication / Treatment">
                      <div style={{ position: 'relative' }}>
                        <Input value={form.medication} onChange={v => setField('medication', v)} placeholder="Search national drug registry..." padLeft={34} />
                        <span className="material-symbols-outlined" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: '#9CA3AF', pointerEvents: 'none' }}>search</span>
                      </div>
                    </Field>

                    {/* Dosage + Duration row */}
                    <div style={{ display: 'flex', gap: 10 }}>
                      <Field label="Dosage" style={{ flex: 1 }}>
                        <Input value={form.dosage} onChange={v => setField('dosage', v)} placeholder="e.g. 500mg BID" />
                      </Field>
                      <Field label="Duration (Days)" style={{ flex: 1 }}>
                        <Input type="number" value={form.duration} onChange={v => setField('duration', v)} placeholder="e.g. 7" />
                      </Field>
                    </div>

                    {/* Action row */}
                    <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                      <button type="submit" disabled={submitting} style={{
                        flex: 1, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        backgroundColor: submitting ? '#5AADAD' : TEAL, color: WHITE,
                        border: 'none', borderRadius: 5, fontSize: 11.5, fontWeight: 700,
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        textTransform: 'uppercase', letterSpacing: '0.07em',
                        fontFamily: "'Space Grotesk', sans-serif",
                        transition: 'background-color 0.15s ease',
                      }}
                        onMouseEnter={e => { if (!submitting) e.currentTarget.style.backgroundColor = TEAL_DARK }}
                        onMouseLeave={e => { if (!submitting) e.currentTarget.style.backgroundColor = TEAL }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>verified_user</span>
                        {submitting ? 'Authorizing…' : 'Authorize & Print'}
                      </button>
                      <button type="button" onClick={resetForm} style={{
                        width: 44, flexShrink: 0, backgroundColor: WHITE, color: MUTED,
                        border: `1px solid ${BORDER}`, borderRadius: 5, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 18,
                      }}>✕</button>
                    </div>
                  </form>
                </section>

                {/* Stats cards */}
                <div style={{ display: 'flex', gap: 12 }}>
                  <StatCard label="Total Today"      value="24"  color={TEAL}      />
                  <StatCard label="Restricted Drugs" value="03"  color="#E53E3E"   />
                </div>
              </div>

              {/* ── RIGHT: Prescription History ───────────────────────────── */}
              <section style={{
                flex: 1, backgroundColor: WHITE, border: `1px solid ${BORDER}`,
                borderRadius: 8, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0,
              }}>
                {/* Table header */}
                <div style={{ padding: '13px 20px 11px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: MUTED }}>history</span>
                    <h2 style={{ fontSize: 11, fontWeight: 800, color: TEXT, textTransform: 'uppercase', letterSpacing: '0.09em', margin: 0 }}>Prescription History</h2>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['filter_list', 'file_download'].map(icon => (
                      <button key={icon} style={{ ...iconBtn, width: 30, height: 30, border: `1px solid ${BORDER}`, borderRadius: 4 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16, color: MUTED }}>{icon}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Table */}
                <div ref={rightInnerRef} style={{ flex: 1, overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, tableLayout: 'fixed' }}>
                    <colgroup>
                      <col style={{ width: '26%' }} />
                      <col style={{ width: '26%' }} />
                      <col style={{ width: '14%' }} />
                      <col style={{ width: '14%' }} />
                      <col style={{ width: '20%' }} />
                    </colgroup>
                    <thead>
                      <tr style={{ backgroundColor: '#F9FAFB', borderBottom: `1px solid ${BORDER}` }}>
                        {['ID / CNIE', 'MEDICATION', 'DATE', 'STATUS', 'ACTIONS'].map(col => (
                          <th key={col} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: MUTED, letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {PRESCRIPTIONS.map((rx, i) => {
                        const cfg = STATUS_CFG[rx.status] || {}
                        return (
                          <tr key={rx.rxId}
                            style={{ backgroundColor: i % 2 === 0 ? WHITE : '#FAFAFA', borderBottom: `1px solid #F3F4F6`, transition: 'background-color 0.1s' }}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F0FAF9')}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = i % 2 === 0 ? WHITE : '#FAFAFA')}
                          >
                            {/* ID + patient */}
                            <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: TEAL, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.02em' }}>{rx.rxId}</div>
                              <div style={{ fontSize: 11, color: MUTED, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rx.patient}</div>
                            </td>
                            {/* Medication */}
                            <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: TEXT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rx.med}</div>
                              <div style={{ fontSize: 10.5, color: MUTED, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rx.dose}</div>
                            </td>
                            {/* Date */}
                            <td style={{ padding: '12px 14px', verticalAlign: 'middle', fontSize: 11, color: MUTED, whiteSpace: 'nowrap' }}>{rx.date}</td>
                            {/* Status dot */}
                            <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: cfg.color, flexShrink: 0 }} />
                                <span style={{ fontSize: 10, fontWeight: 700, color: cfg.color, letterSpacing: '0.05em' }}>{cfg.label}</span>
                              </div>
                            </td>
                            {/* Action */}
                            <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                              <ActionButton label={cfg.action} color={cfg.color} hoverBg={cfg.hoverBg} />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div style={{ padding: '10px 16px', borderTop: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FAFAFA', flexShrink: 0 }}>
                  <span style={{ fontSize: 11, color: MUTED }}>Showing 5 of {TOTAL_RECORDS} records</span>
                  <div style={{ display: 'flex', gap: 3 }}>
                    <PageBtn disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>chevron_left</span>
                    </PageBtn>
                    {pages.map(pg => (
                      <PageBtn key={pg} active={pg === currentPage} onClick={() => setCurrentPage(pg)}>{pg}</PageBtn>
                    ))}
                    <PageBtn disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>chevron_right</span>
                    </PageBtn>
                  </div>
                </div>
              </section>
            </div>
          </div>

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
                Connected to National Pharmacy Grid &bull; Last synchronized: 2 mins ago
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

function Input({ value, onChange, placeholder, type = 'text', padLeft, id, inputRef }) {
  return (
    <input
      id={id}
      ref={inputRef}
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%', height: 44,
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
    <div style={{
      flex: 1, backgroundColor: WHITE, border: `1px solid ${BORDER}`,
      borderRadius: 8, padding: '12px 16px',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
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
