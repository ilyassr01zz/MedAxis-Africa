import { useState, useMemo, useCallback, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../../hooks/use-auth'
import { getPatientViewAPI, disputePrescriptionAPI } from '../../api/prescriptions'

// ─── Inline SVG icons ──────────────────────────────────────────────────────────

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <circle cx="7" cy="7" r="4.5" stroke="#9CA3AF" strokeWidth="1.5" />
    <path d="M10.5 10.5L13.5 13.5" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

const FilterIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
    <path d="M2 4h11M4 7.5h7M6.5 11h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

const PdfIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M8 1H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6L8 1Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    <path d="M8 1v5h5" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
  </svg>
)

const HistoryIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3" />
    <path d="M7 4.5V7l2 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const RefillIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M2.5 7A4.5 4.5 0 0 1 11 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <path d="M9 3l2 1.5L9 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M11.5 7A4.5 4.5 0 0 1 3 9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <path d="M5 11l-2-1.5L5 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const UrgentIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M7 2L12.5 11.5H1.5L7 2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    <path d="M7 6v2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <circle cx="7" cy="10" r="0.5" fill="currentColor" />
  </svg>
)

const ChatIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M20 3H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h4l4 4 4-4h4a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1Z" fill="white" fillOpacity="0.95" />
    <circle cx="8.5" cy="10.5" r="1.2" fill="#0D7C7C" />
    <circle cx="12" cy="10.5" r="1.2" fill="#0D7C7C" />
    <circle cx="15.5" cy="10.5" r="1.2" fill="#0D7C7C" />
  </svg>
)

// ─── Status configuration ──────────────────────────────────────────────────────

const STATUS_CONFIG = {
  ACTIVE: {
    label: 'AWAITING PICKUP',
    borderColor: '#0D7C7C',
    dotColor: '#0D7C7C',
    textColor: '#0D7C7C',
    description: 'Ready to be collected at pharmacy',
    buttonColor: '#0D7C7C',
    buttonLabel: 'View PDF',
    ButtonIcon: PdfIcon,
  },
  DISPENSED: {
    label: 'DISPENSED',
    borderColor: '#9CA3AF',
    dotColor: '#9CA3AF',
    textColor: '#6B7280',
    description: 'Medication collected at pharmacy',
    buttonColor: '#6B7280',
    buttonLabel: 'History',
    ButtonIcon: HistoryIcon,
  },
  COMPLETED: {
    label: 'COMPLETED',
    borderColor: '#9CA3AF',
    dotColor: '#9CA3AF',
    textColor: '#6B7280',
    description: 'Medication collected at pharmacy',
    buttonColor: '#6B7280',
    buttonLabel: 'History',
    ButtonIcon: HistoryIcon,
  },
  PARTIALLY_DISPENSED: {
    label: 'PARTIALLY COLLECTED',
    borderColor: '#F0A500',
    dotColor: '#F0A500',
    textColor: '#F0A500',
    description: 'Partial quantity collected',
    buttonColor: '#F0A500',
    buttonLabel: 'Request Refill',
    ButtonIcon: RefillIcon,
  },
  PENDING: {
    label: 'PENDING RENEWAL',
    borderColor: '#F0A500',
    dotColor: '#F0A500',
    textColor: '#F0A500',
    description: 'Awaiting renewal',
    buttonColor: '#F0A500',
    buttonLabel: 'Request Refill',
    ButtonIcon: RefillIcon,
  },
  EXPIRED: {
    label: 'EXPIRED',
    borderColor: '#E53E3E',
    dotColor: '#E53E3E',
    textColor: '#E53E3E',
    description: 'Prescription expired without pickup',
    buttonColor: '#E53E3E',
    buttonLabel: 'Urgent Consult',
    ButtonIcon: UrgentIcon,
  },
  CANCELLED: {
    label: 'CANCELLED',
    borderColor: '#9CA3AF',
    dotColor: '#9CA3AF',
    textColor: '#6B7280',
    description: 'Cancelled by your doctor',
    buttonColor: '#6B7280',
    buttonLabel: 'History',
    ButtonIcon: HistoryIcon,
  },
  DISPUTED: {
    label: 'DISPUTED',
    borderColor: '#E53E3E',
    dotColor: '#E53E3E',
    textColor: '#E53E3E',
    description: 'Reported — under regulatory review',
    buttonColor: '#E53E3E',
    buttonLabel: 'View Details',
    ButtonIcon: UrgentIcon,
  },
  REVIEWED: {
    label: 'REVIEWED',
    borderColor: '#9CA3AF',
    dotColor: '#9CA3AF',
    textColor: '#6B7280',
    description: 'Dispute reviewed by Ministry of Health',
    buttonColor: '#6B7280',
    buttonLabel: 'History',
    ButtonIcon: HistoryIcon,
  },
  FLAGGED: {
    label: 'FLAGGED',
    borderColor: '#E53E3E',
    dotColor: '#E53E3E',
    textColor: '#E53E3E',
    description: 'Flagged for review',
    buttonColor: '#E53E3E',
    buttonLabel: 'View Details',
    ButtonIcon: UrgentIcon,
  },
}

// ─── Mock prescription data ────────────────────────────────────────────────────

const MOCK_PRESCRIPTIONS = [
  {
    id: 'rx-001',
    status: 'ACTIVE',
    drug: 'Amoxicillin 500mg',
    details: '1 capsule three times daily for 7 days',
    prescribedBy: 'Dr. Sarah Mansouri',
    date: 'Oct 14, 2023',
    dateLabel: 'DATE',
  },
  {
    id: 'rx-002',
    status: 'COMPLETED',
    drug: 'Lisinopril 10mg',
    details: 'Daily oral tablet for hypertension',
    prescribedBy: 'Dr. Ahmed Alaoui',
    date: 'Aug 12, 2023',
    dateLabel: 'LAST FILLED',
  },
  {
    id: 'rx-003',
    status: 'PENDING',
    drug: 'Metformin 850mg',
    details: 'Twice daily with meals',
    prescribedBy: 'Dr. Sarah Mansouri',
    date: 'Sep 09, 2023',
    dateLabel: 'LAST FILLED',
  },
  {
    id: 'rx-004',
    status: 'EXPIRED',
    drug: 'Ventolin Inhaler',
    details: 'As needed for shortness of breath',
    prescribedBy: 'General Clinic',
    date: 'Oct 01, 2023',
    dateLabel: 'EXPIRY DATE',
  },
]

const TOTAL_RECORDS = 28
const FILTER_OPTIONS = ['All', 'Active', 'Completed', 'Pending', 'Expired']

// ─── PrescriptionCard ──────────────────────────────────────────────────────────

const PrescriptionCard = ({ prescription, onAction, onReport, onShowVC }) => {
  const config = STATUS_CONFIG[prescription.displayStatus || prescription.status] || STATUS_CONFIG.ACTIVE
  const { ButtonIcon } = config

  return (
    <article
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderLeft: `4px solid ${config.borderColor}`,
        borderRadius: '4px',
        padding: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '24px',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = '#D1D5DB'
        e.currentTarget.style.borderLeftColor = config.borderColor
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = '#E5E7EB'
        e.currentTarget.style.borderLeftColor = config.borderColor
      }}
    >
      {/* Left — status + drug name + description */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '8px' }}>
          <span style={{
            width: '8px', height: '8px', borderRadius: '50%',
            backgroundColor: config.dotColor, flexShrink: 0,
          }} />
          <span style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '11px', fontWeight: 600,
            letterSpacing: '0.08em', color: config.dotColor,
            textTransform: 'uppercase',
          }}>
            {config.label}
          </span>
        </div>

        <h3 style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: '20px', fontWeight: 700,
          color: '#1A1A2E', margin: '0 0 4px 0', lineHeight: 1.3,
        }}>
          {prescription.drug}
        </h3>

        <p style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: '14px', fontWeight: 400,
          color: '#6B7280', margin: 0, lineHeight: 1.5,
        }}>
          {prescription.details}
        </p>
      </div>

      {/* Right — metadata + action button */}
      <div style={{ flexShrink: 0, textAlign: 'right', minWidth: '170px' }}>
        <div style={{ marginBottom: '12px' }}>
          <p style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '10px', fontWeight: 600,
            letterSpacing: '0.07em', color: '#9CA3AF',
            textTransform: 'uppercase', marginBottom: '2px',
          }}>
            PRESCRIBED BY
          </p>
          <p style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '13px', fontWeight: 600,
            color: '#1A1A2E', margin: 0,
          }}>
            {prescription.prescribedBy}
          </p>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <p style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '10px', fontWeight: 600,
            letterSpacing: '0.07em', color: '#9CA3AF',
            textTransform: 'uppercase', marginBottom: '2px',
          }}>
            {prescription.dateLabel}
          </p>
          <p style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '13px', fontWeight: 500,
            color: '#4B5563', margin: 0,
          }}>
            {prescription.date}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            onClick={() => onAction(prescription)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '7px 14px',
              backgroundColor: 'transparent',
              border: `1.5px solid ${config.buttonColor}`,
              borderRadius: '4px',
              color: config.buttonColor,
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '12px', fontWeight: 600,
              cursor: 'pointer', letterSpacing: '0.02em',
              transition: 'background-color 0.15s ease, color 0.15s ease',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = config.buttonColor
              e.currentTarget.style.color = '#FFFFFF'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = config.buttonColor
            }}
          >
            <ButtonIcon />
            {config.buttonLabel}
          </button>

          {prescription.vc_qr_code && (
            <button
              onClick={() => onShowVC(prescription)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '7px 14px',
                backgroundColor: 'transparent',
                border: '1.5px solid #0D7C7C',
                borderRadius: '4px',
                color: '#0D7C7C',
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '12px', fontWeight: 600,
                cursor: 'pointer', letterSpacing: '0.02em',
                transition: 'background-color 0.15s ease, color 0.15s ease',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = '#0D7C7C'
                e.currentTarget.style.color = '#FFFFFF'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.color = '#0D7C7C'
              }}
            >
              QR Code
            </button>
          )}
        </div>

        {['ACTIVE', 'DISPENSED', 'PARTIALLY_DISPENSED'].includes(prescription.status) && !prescription.is_disputed && !prescription.is_reviewed && (
          <button
            onClick={() => onReport(prescription)}
            style={{
              background: 'none',
              border: '1px solid #E53E3E',
              color: '#E53E3E',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              marginTop: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontFamily: "'Space Grotesk', sans-serif"
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#FEF2F2'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            ⚠ Report this prescription
          </button>
        )}
      </div>
    </article>
  )
}

// ─── Main PatientPortal ────────────────────────────────────────────────────────

export default function PatientPortal() {
  const { token, logout } = useAuth()
  const [searchQuery, setSearchQuery]           = useState('')
  const [activeFilter, setActiveFilter]         = useState('All')
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)
  const [visibleCount, setVisibleCount]         = useState(4)
  const [prescriptionList, setPrescriptionList] = useState([])
  const [activeView, setActiveView]             = useState('prescriptions')
  const [disputeModal, setDisputeModal]         = useState({ open: false, prescription: null })
  const [disputeReason, setDisputeReason]       = useState('')
  const [disputeSubmitting, setDisputeSubmitting] = useState(false)
  const [disputeSuccess, setDisputeSuccess]     = useState(false)
  const [disputeError, setDisputeError]         = useState('')
  const [vcModal, setVcModal]                   = useState({ open: false, prescription: null })

  useEffect(() => {
    if (!token) return
    // Debug endpoint — temporary
    axios.get(`${import.meta.env.VITE_API_URL}/patients/debug-patient`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => console.log('DEBUG PATIENT:', JSON.stringify(r.data, null, 2)))
      .catch(e => console.warn('debug-patient failed:', e.message))
  }, [token])

  useEffect(() => {
    if (!token) return
    const loadHistory = async () => {
      console.log('Patient portal loading, token:', !!token)
      try {
        const result = await getPatientViewAPI(token)
        console.log('Patient view result:', result)
        if (result.success && result.data?.prescriptions) {
          const mapped = result.data.prescriptions.map(rx => ({
            id:            rx.rx_id || rx.rxId || rx.id,
            rx_id:         rx.rx_id || rx.rxId || rx.id,
            status:        rx.status || 'ACTIVE',
            is_reviewed:   rx.is_reviewed || false,
            is_disputed:   rx.is_disputed || false,
            displayStatus: rx.is_reviewed ? 'REVIEWED' : (rx.status || 'ACTIVE'),
            drug:          rx.drug_name || rx.drugName || '',
            details:       [rx.dosage, rx.frequency, rx.duration_days ? `${rx.duration_days} days` : null].filter(Boolean).join(' • '),
            prescribedBy:  rx.doctor?.user?.first_name ? `Dr. ${rx.doctor.user.first_name}` : rx.doctorName || 'Unknown Doctor',
            date:          rx.created_at ? new Date(rx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '',
            dateLabel:     rx.status === 'ACTIVE' ? 'DATE ISSUED' : rx.status === 'EXPIRED' ? 'EXPIRY DATE' : 'DATE ISSUED',
          }))
          setPrescriptionList(mapped)
          console.log('Set prescriptions:', mapped.length)
        }
      } catch (err) {
        console.error('Patient portal load error:', err)
      }
    }
    loadHistory()
  }, [token])

  const filteredPrescriptions = useMemo(() => {
    let results = prescriptionList

    if (activeFilter !== 'All') {
      const statusMap = { Active: 'ACTIVE', Completed: 'COMPLETED', Pending: 'PENDING', Expired: 'EXPIRED' }
      results = results.filter(rx => rx.status === statusMap[activeFilter])
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      results = results.filter(
        rx =>
          rx.drug.toLowerCase().includes(q) ||
          rx.prescribedBy.toLowerCase().includes(q) ||
          rx.details.toLowerCase().includes(q)
      )
    }

    return results
  }, [searchQuery, activeFilter, prescriptionList])

  const visiblePrescriptions = filteredPrescriptions.slice(0, visibleCount)
  const hasMore = visibleCount < filteredPrescriptions.length

  const handleAction    = useCallback((rx) => {
    console.log(`[MedAxis] Patient action: ${STATUS_CONFIG[rx.status].buttonLabel} — ${rx.id}`)
  }, [])
  const handleLoadMore  = useCallback(() => setVisibleCount(prev => prev + 4), [])
  const handleFilterSelect = useCallback((option) => {
    setActiveFilter(option)
    setShowFilterDropdown(false)
  }, [])

  const openDisputeModal = (prescription) => {
    setDisputeModal({ open: true, prescription })
    setDisputeReason('')
    setDisputeSuccess(false)
    setDisputeError('')
  }

  const closeDisputeModal = () => {
    setDisputeModal({ open: false, prescription: null })
    setDisputeReason('')
    setDisputeSuccess(false)
    setDisputeError('')
  }

  const openVCModal = (prescription) => {
    setVcModal({ open: true, prescription })
  }

  const closeVCModal = () => {
    setVcModal({ open: false, prescription: null })
  }

  const submitDispute = async () => {
    if (!disputeReason.trim()) {
      setDisputeError('Please provide a brief explanation')
      return
    }
    if (disputeReason.trim().length < 10) {
      setDisputeError('Please provide at least 10 characters')
      return
    }
    setDisputeSubmitting(true)
    setDisputeError('')
    try {
      const result = await disputePrescriptionAPI(token, disputeModal.prescription.rx_id || disputeModal.prescription.rxId, disputeReason)
      if (result.success) {
        setDisputeSuccess(true)
        setPrescriptionList(prev => prev.map(p =>
          (p.rx_id || p.rxId) === (disputeModal.prescription.rx_id || disputeModal.prescription.rxId)
            ? { ...p, status: 'DISPUTED' }
            : p
        ))
        setTimeout(() => closeDisputeModal(), 3000)
      }
    } catch (err) {
      setDisputeError(err.response?.data?.error || 'Failed to submit report')
    } finally {
      setDisputeSubmitting(false)
    }
  }

  return (
    /* Full-screen takeover — escapes the shared Layout wrapper so there is only ONE navbar */
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      backgroundColor: '#F5F7F5',
      fontFamily: "'Space Grotesk', sans-serif",
      overflowY: 'auto',
      display: 'flex', flexDirection: 'column',
    }}>

      {/* ── Single top navbar ─────────────────────────────────────────── */}
      <header style={{
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E5E7EB',
        height: '56px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px',
        flexShrink: 0,
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: 32, height: 32, borderRadius: 4,
            backgroundColor: '#0D7C7C',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: 18, lineHeight: 1 }}>
              health_and_safety
            </span>
          </div>
          <span style={{ fontWeight: 700, fontSize: 18, color: '#0D7C7C', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}>
            MedAxis
          </span>
        </div>

        {/* Centre nav */}
        <nav style={{ display: 'flex', gap: '32px' }}>
          {['Support', 'Directory', 'Emergency'].map(item => (
            <a key={item} href="#" style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '13px', fontWeight: 500,
              color: '#6B7280', textDecoration: 'none',
            }}
              onMouseEnter={e => { e.currentTarget.style.color = '#0D7C7C' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#6B7280' }}
            >
              {item}
            </a>
          ))}
        </nav>

        {/* Right icons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', color: '#6B7280' }} aria-label="Notifications">
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>notifications</span>
          </button>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', color: '#6B7280' }} aria-label="Settings">
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>settings</span>
          </button>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            backgroundColor: '#0D7C7C',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 14, fontWeight: 700,
            fontFamily: "'Space Grotesk', sans-serif",
            cursor: 'pointer',
          }}>
            P
          </div>
          <button
            onClick={logout}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              padding: '6px 12px',
              backgroundColor: 'transparent',
              border: '1.5px solid #0D7C7C',
              borderRadius: '4px',
              color: '#0D7C7C',
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '12px', fontWeight: 600,
              cursor: 'pointer', letterSpacing: '0.02em',
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#F0F9F9' }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
            aria-label="Logout"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>logout</span>
            Logout
          </button>
        </div>
      </header>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <main style={{ maxWidth: '900px', width: '100%', margin: '0 auto', padding: '40px 24px 80px', flex: 1 }}>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #E5E7EB', marginBottom: '36px' }}>
          {[
            { key: 'prescriptions', label: 'My Prescriptions', icon: 'description' },
            { key: 'credentials',   label: 'My Credentials',   icon: 'wallet'       },
          ].map(tab => {
            const active = activeView === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveView(tab.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 20px',
                  background: 'none', border: 'none',
                  borderBottom: active ? '2px solid #0D7C7C' : '2px solid transparent',
                  marginBottom: -1,
                  color: active ? '#0D7C7C' : '#6B7280',
                  fontSize: 14, fontWeight: active ? 600 : 500,
                  fontFamily: "'Space Grotesk', sans-serif",
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{tab.icon}</span>
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* ── CREDENTIALS VIEW ────────────────────────────────────────── */}
        {activeView === 'credentials' && (
          <div>

            {/* Page heading */}
            <div style={{ marginBottom: 32 }}>
              <h1 style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 28, fontWeight: 700,
                color: '#1A1A2E',
                margin: '0 0 8px', letterSpacing: '-0.02em',
              }}>
                My Digital Credentials
              </h1>
              <p style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 15, color: '#6B7280', margin: 0,
              }}>
                Download your signed prescription credentials
              </p>
            </div>

            {/* Main card */}
            <div style={{
              border: '1px solid #E5E7EB',
              borderRadius: 8,
              padding: 32,
              backgroundColor: '#FFFFFF',
              marginBottom: 16,
            }}>
              {/* Shield icon + title */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 36, color: '#0D7C7C', flexShrink: 0 }}>
                  shield
                </span>
                <div>
                  <h2 style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 18, fontWeight: 700, color: '#1A1A2E',
                    margin: '0 0 6px',
                  }}>
                    Prescription Verifiable Credential
                  </h2>
                  <p style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 14, color: '#6B7280', margin: 0, lineHeight: 1.6,
                  }}>
                    Your prescription signed by your doctor, verified by Morocco's Digital ID infrastructure
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: 1, backgroundColor: '#E5E7EB', margin: '0 0 24px' }} />

              {/* HOW IT WORKS */}
              <div style={{ marginBottom: 28 }}>
                <div style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 11, fontWeight: 600, color: '#0D7C7C',
                  textTransform: 'uppercase', letterSpacing: '0.1em',
                  marginBottom: 16,
                }}>
                  How It Works
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {[
                    'Open Inji Wallet in new tab',
                    'Continue as Guest → MedAxis Prescription',
                    'Enter UIN: 5860356276 · OTP: 111111',
                    'Download PDF and show to pharmacist',
                  ].map((step, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%',
                        backgroundColor: '#0D7C7C',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                        fontFamily: "'Space Grotesk', sans-serif",
                        fontSize: 12, fontWeight: 700, color: '#fff',
                      }}>
                        {i + 1}
                      </div>
                      <span style={{
                        fontFamily: "'Space Grotesk', sans-serif",
                        fontSize: 14, color: '#1A1A2E',
                      }}>
                        {step}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Open button */}
              <button
                onClick={() => window.open('http://localhost:3004', '_blank')}
                style={{
                  width: '100%', height: 52,
                  backgroundColor: '#0D7C7C',
                  color: '#fff', border: 'none', borderRadius: 6,
                  fontSize: 16, fontWeight: 600,
                  fontFamily: "'Space Grotesk', sans-serif",
                  cursor: 'pointer',
                  letterSpacing: '0.01em',
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.88' }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
              >
                Open Inji Wallet →
              </button>

              {/* Note */}
              <p style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 13, color: '#9CA3AF',
                textAlign: 'center', margin: '12px 0 0',
              }}>
                Inji Wallet will open in a new tab
              </p>
            </div>

          </div>
        )}

        {/* ── PRESCRIPTIONS VIEW ──────────────────────────────────────── */}
        {activeView === 'prescriptions' && (
          <div>

        {/* Page heading */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '32px', fontWeight: 700,
            color: '#0D7C7C',
            margin: '0 0 8px 0', letterSpacing: '-0.02em',
          }}>
            Prescription History
          </h1>
          <p style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '16px', fontWeight: 400,
            color: '#6B7280', margin: 0,
          }}>
            Your official medical records and medication history.
          </p>
        </div>

        {/* Search + Filter row */}
        <div style={{
          display: 'flex', gap: '16px', alignItems: 'stretch',
          marginBottom: '24px',
        }}>
          {/* Search — 70% */}
          <div style={{ flex: '0 0 70%', position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span style={{
              position: 'absolute', left: '14px', pointerEvents: 'none',
              display: 'flex', alignItems: 'center',
            }}>
              <SearchIcon />
            </span>
            <input
              type="search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search medication or doctor..."
              style={{
                width: '100%', height: '48px',
                padding: '0 14px 0 42px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E7EB', borderRadius: '4px',
                fontFamily: "'Inter', sans-serif",
                fontSize: '14px', color: '#1A1A2E',
                outline: 'none', transition: 'border-color 0.15s',
                boxSizing: 'border-box',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#0D7C7C' }}
              onBlur={e => { e.currentTarget.style.borderColor = '#E5E7EB' }}
            />
          </div>

          {/* Filter — 30% */}
          <div style={{ flex: '0 0 calc(30% - 16px)', position: 'relative' }}>
            <button
              onClick={() => setShowFilterDropdown(prev => !prev)}
              style={{
                width: '100%', height: '48px',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                backgroundColor: '#FFFFFF',
                border: showFilterDropdown ? '1px solid #0D7C7C' : '1px solid #E5E7EB',
                borderRadius: '4px',
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '14px', fontWeight: 500,
                color: showFilterDropdown ? '#0D7C7C' : '#4B5563',
                cursor: 'pointer',
                transition: 'border-color 0.15s, color 0.15s',
                whiteSpace: 'nowrap',
                boxSizing: 'border-box',
              }}
              onMouseEnter={e => {
                if (!showFilterDropdown) {
                  e.currentTarget.style.borderColor = '#0D7C7C'
                  e.currentTarget.style.color = '#0D7C7C'
                }
              }}
              onMouseLeave={e => {
                if (!showFilterDropdown) {
                  e.currentTarget.style.borderColor = '#E5E7EB'
                  e.currentTarget.style.color = '#4B5563'
                }
              }}
            >
              <FilterIcon />
              Filter by Status
              {activeFilter !== 'All' && (
                <span style={{
                  width: '7px', height: '7px', borderRadius: '50%',
                  backgroundColor: '#0D7C7C', display: 'inline-block',
                }} />
              )}
            </button>

            {showFilterDropdown && (
              <ul style={{
                position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB',
                borderRadius: '4px', padding: '4px 0',
                minWidth: '160px', zIndex: 100, listStyle: 'none', margin: 0,
              }}>
                {FILTER_OPTIONS.map(option => (
                  <li key={option}>
                    <button
                      onClick={() => handleFilterSelect(option)}
                      style={{
                        width: '100%', padding: '9px 16px', textAlign: 'left',
                        background: activeFilter === option ? '#F0F9F9' : 'none',
                        border: 'none',
                        fontFamily: "'Space Grotesk', sans-serif",
                        fontSize: '13px',
                        fontWeight: activeFilter === option ? 600 : 400,
                        color: activeFilter === option ? '#0D7C7C' : '#374151',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={e => { if (activeFilter !== option) e.currentTarget.style.backgroundColor = '#F9FAFB' }}
                      onMouseLeave={e => { if (activeFilter !== option) e.currentTarget.style.backgroundColor = 'transparent' }}
                    >
                      {option}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ── Prescription cards ────────────────────────────────────── */}
        {prescriptionList.length === 0 ? (
          <div style={{
            backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB',
            borderRadius: '4px', padding: '48px 24px', textAlign: 'center',
          }}>
            <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '18px', fontWeight: 600, color: '#1A1A2E', margin: '0 0 8px 0' }}>
              No prescriptions yet
            </p>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '14px', color: '#6B7280', margin: 0 }}>
              Prescriptions issued by your doctor will appear here
            </p>
          </div>
        ) : visiblePrescriptions.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {visiblePrescriptions.map(rx => (
              <PrescriptionCard key={rx.id} prescription={rx} onAction={handleAction} onReport={openDisputeModal} onShowVC={openVCModal} />
            ))}
          </div>
        ) : (
          <div style={{
            backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB',
            borderRadius: '4px', padding: '48px 24px', textAlign: 'center',
          }}>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '14px', color: '#6B7280', margin: 0 }}>
              No prescriptions match your search or filter.
            </p>
          </div>
        )}

        {/* ── Load more + record count ──────────────────────────────── */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: '12px', marginTop: '32px',
        }}>
          <button
            onClick={handleLoadMore}
            disabled={!hasMore}
            style={{
              width: '280px', height: '48px',
              backgroundColor: 'transparent',
              border: '1.5px solid #D1D5DB', borderRadius: '4px',
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '13px', fontWeight: 600,
              color: '#374151', cursor: hasMore ? 'pointer' : 'not-allowed',
              opacity: hasMore ? 1 : 0.4,
              transition: 'border-color 0.15s, color 0.15s',
              letterSpacing: '0.01em',
            }}
            onMouseEnter={e => {
              if (hasMore) {
                e.currentTarget.style.borderColor = '#0D7C7C'
                e.currentTarget.style.color = '#0D7C7C'
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#D1D5DB'
              e.currentTarget.style.color = '#374151'
            }}
          >
            Load Older Prescriptions
          </button>

          <p style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '12px', color: '#9CA3AF', margin: 0,
          }}>
            Showing {Math.min(visibleCount, filteredPrescriptions.length)} of{' '}
            {activeFilter === 'All' && !searchQuery.trim() ? TOTAL_RECORDS : filteredPrescriptions.length}{' '}
            records
          </p>
        </div>
          </div>
        )}
      </main>

      {/* ── Dispute modal ────────────────────────────────────────────── */}
      {disputeModal.open && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '12px',
            padding: '32px',
            width: '100%',
            maxWidth: '480px',
            border: '1px solid #E5E7EB'
          }}>
            {disputeSuccess ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>✓</div>
                <h3 style={{ color: '#0D7C7C', fontSize: '20px', fontWeight: '700', marginBottom: '8px', fontFamily: "'Space Grotesk', sans-serif" }}>
                  Report Submitted
                </h3>
                <p style={{ color: '#6B7280', fontSize: '14px', lineHeight: '1.6', fontFamily: "'Space Grotesk', sans-serif" }}>
                  Your report has been sent to the Ministry of Health regulatory team.
                  Prescription #{disputeModal.prescription?.rx_id || disputeModal.prescription?.rxId}
                  is now marked as DISPUTED and under review.
                </p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1A1A2E', marginBottom: '4px', fontFamily: "'Space Grotesk', sans-serif" }}>
                      Report Prescription
                    </h3>
                    <p style={{ fontSize: '13px', color: '#6B7280', fontFamily: "'Space Grotesk', sans-serif" }}>
                      This report will be sent directly to the Ministry of Health
                    </p>
                  </div>
                  <button onClick={closeDisputeModal} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#6B7280', fontSize: '20px', lineHeight: 1, padding: '4px'
                  }}>✕</button>
                </div>

                <div style={{
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  marginBottom: '20px'
                }}>
                  <p style={{ fontSize: '13px', color: '#E53E3E', fontWeight: '600', marginBottom: '4px', fontFamily: "'Space Grotesk', sans-serif" }}>
                    Prescription: #{disputeModal.prescription?.rx_id || disputeModal.prescription?.rxId}
                  </p>
                  <p style={{ fontSize: '13px', color: '#6B7280', fontFamily: "'Space Grotesk', sans-serif" }}>
                    {disputeModal.prescription?.drug} — {disputeModal.prescription?.prescribedBy || 'Unknown Doctor'}
                  </p>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block', fontSize: '11px', fontWeight: '600',
                    color: '#6B7280', letterSpacing: '0.08em', textTransform: 'uppercase',
                    marginBottom: '8px', fontFamily: "'Space Grotesk', sans-serif"
                  }}>
                    Reason for reporting
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                    {[
                      'I never requested this prescription',
                      'I never authorized this dispensing',
                      'This prescription was issued without my consent',
                      'Other'
                    ].map(reason => (
                      <label key={reason} style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        cursor: 'pointer', fontSize: '14px', color: '#1A1A2E',
                        fontFamily: "'Space Grotesk', sans-serif"
                      }}>
                        <input
                          type="radio"
                          name="disputeReason"
                          value={reason}
                          checked={disputeReason.startsWith(reason)}
                          onChange={() => setDisputeReason(reason + '. ')}
                          style={{ accentColor: '#0D7C7C' }}
                        />
                        {reason}
                      </label>
                    ))}
                  </div>
                  <textarea
                    value={disputeReason}
                    onChange={e => setDisputeReason(e.target.value)}
                    placeholder="Add additional details (optional)..."
                    maxLength={200}
                    rows={3}
                    style={{
                      width: '100%',
                      border: '1px solid #E5E7EB',
                      borderRadius: '6px',
                      padding: '10px 12px',
                      fontSize: '14px',
                      color: '#1A1A2E',
                      fontFamily: "'Space Grotesk', sans-serif",
                      resize: 'vertical',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    onFocus={e => e.target.style.borderColor = '#0D7C7C'}
                    onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                  />
                  <p style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px', textAlign: 'right', fontFamily: "'Space Grotesk', sans-serif" }}>
                    {disputeReason.length}/200 characters
                  </p>
                </div>

                {disputeError && (
                  <p style={{ color: '#E53E3E', fontSize: '13px', marginBottom: '16px', fontFamily: "'Space Grotesk', sans-serif" }}>{disputeError}</p>
                )}

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={closeDisputeModal} style={{
                    flex: 1, height: '44px',
                    background: 'none', border: '1px solid #E5E7EB',
                    borderRadius: '8px', cursor: 'pointer',
                    fontSize: '14px', fontWeight: '600', color: '#6B7280',
                    fontFamily: "'Space Grotesk', sans-serif"
                  }}>
                    Cancel
                  </button>
                  <button onClick={submitDispute} disabled={disputeSubmitting} style={{
                    flex: 2, height: '44px',
                    background: disputeSubmitting ? '#9CA3AF' : '#E53E3E',
                    border: 'none', borderRadius: '8px',
                    cursor: disputeSubmitting ? 'not-allowed' : 'pointer',
                    fontSize: '14px', fontWeight: '700', color: '#FFFFFF',
                    fontFamily: "'Space Grotesk', sans-serif"
                  }}>
                    {disputeSubmitting ? 'Submitting...' : 'Submit Report to Ministry of Health'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── VC QR Code Modal ──────────────────────────────────────── */}
      {vcModal.open && vcModal.prescription?.vc_qr_code && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '12px',
            padding: '32px',
            width: '100%',
            maxWidth: '480px',
            border: '1px solid #E5E7EB',
            textAlign: 'center'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div style={{ textAlign: 'left' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1A1A2E', marginBottom: '4px', fontFamily: "'Space Grotesk', sans-serif" }}>
                  Prescription Verifiable Credential
                </h3>
                <p style={{ fontSize: '13px', color: '#6B7280', fontFamily: "'Space Grotesk', sans-serif" }}>
                  Present to your pharmacist
                </p>
              </div>
              <button onClick={closeVCModal} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#6B7280', fontSize: '20px', lineHeight: 1, padding: '4px'
              }}>✕</button>
            </div>

            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
              marginBottom: '24px'
            }}>
              <img
                src={vcModal.prescription.vc_qr_code}
                alt="Prescription VC QR Code"
                style={{ width: 200, height: 200, border: '1px solid #E5E7EB', borderRadius: 8 }}
              />
              <p style={{ fontSize: '13px', color: '#6B7280', fontFamily: "'Space Grotesk', sans-serif", margin: 0 }}>
                Prescription ID: <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#0D7C7C' }}>
                  {vcModal.prescription.rx_id || vcModal.prescription.rxId}
                </span>
              </p>
            </div>

            <div style={{
              background: '#F0FDF4',
              border: '1px solid #16A34A',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '20px',
              fontSize: '13px',
              color: '#15803D',
              fontFamily: "'Space Grotesk', sans-serif"
            }}>
              Present this QR code to your pharmacist for verification
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={closeVCModal} style={{
                flex: 1, height: '44px',
                background: 'none', border: '1px solid #E5E7EB',
                borderRadius: '8px', cursor: 'pointer',
                fontSize: '14px', fontWeight: '600', color: '#6B7280',
                fontFamily: "'Space Grotesk', sans-serif"
              }}>
                Close
              </button>
              <button
                onClick={() => {
                  const link = document.createElement('a')
                  link.href = vcModal.prescription.vc_qr_code
                  link.download = `prescription-${vcModal.prescription.rx_id}-vc.png`
                  document.body.appendChild(link)
                  link.click()
                  document.body.removeChild(link)
                }}
                style={{
                  flex: 1, height: '44px',
                  background: '#0D7C7C', border: 'none', borderRadius: '8px',
                  cursor: 'pointer', fontSize: '14px', fontWeight: '700', color: '#FFFFFF',
                  fontFamily: "'Space Grotesk', sans-serif",
                  transition: 'background-color 0.15s'
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#0A6363' }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#0D7C7C' }}
              >
                Download for Pharmacy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Floating chat button ──────────────────────────────────────── */}
      <button
        style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 200,
          width: '56px', height: '56px', borderRadius: '50%',
          backgroundColor: '#0D7C7C', border: 'none',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background-color 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#0A6363' }}
        onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#0D7C7C' }}
        aria-label="Open patient support chat"
      >
        <ChatIcon />
      </button>

      {/* Click-outside for filter dropdown */}
      {showFilterDropdown && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 99 }}
          onClick={() => setShowFilterDropdown(false)}
          aria-hidden="true"
        />
      )}
    </div>
  )
}
