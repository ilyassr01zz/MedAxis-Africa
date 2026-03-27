// MedAxis Africa — Doctor Licenses View
// Lets regulators browse, approve, and revoke doctor licenses.
// All inline styles. Space Grotesk throughout. JetBrains Mono for license numbers.
// No boxShadow anywhere. No Tailwind. No gradient buttons.

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { getDoctorList, approveDoctorAPI, revokeDoctorAPI } from '../../api/regulator'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const LIMIT = 10

const REGIONS = [
  'All Morocco',
  'Casablanca-Settat',
  'Rabat-Salé-Kénitra',
  'Marrakech-Safi',
  'Fès-Meknès',
  'Tanger-Tétouan',
]

const LICENSE_STATUSES = ['All', 'Active', 'Suspended', 'Expired']

const LICENSE_STATUS_STYLES = {
  ACTIVE:    { dot: '#0D7C7C', text: '#0D7C7C', label: 'Active' },
  SUSPENDED: { dot: '#F59E0B', text: '#F59E0B', label: 'Suspended' },
  EXPIRED:   { dot: '#9CA3AF', text: '#6B7280', label: 'Expired' },
}

const TABLE_COLUMNS = [
  'Doctor Name',
  'License No.',
  'Specialty',
  'Region',
  'Status',
  'Registered',
  'Actions',
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDate(raw) {
  if (!raw) return '—'
  try {
    return new Date(raw).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

function getLicenseStatusStyle(status) {
  if (!status) return { dot: '#9CA3AF', text: '#6B7280', label: '—' }
  const key = status.toUpperCase()
  return (
    LICENSE_STATUS_STYLES[key] || {
      dot: '#9CA3AF',
      text: '#6B7280',
      label: status.charAt(0).toUpperCase() + status.slice(1).toLowerCase(),
    }
  )
}

function buildPageNumbers(current, total) {
  const delta = 2
  const range = []
  const rangeWithDots = []
  let l

  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
      range.push(i)
    }
  }

  for (let i = 0; i < range.length; i++) {
    if (l) {
      if (range[i] - l === 2) {
        rangeWithDots.push(l + 1)
      } else if (range[i] - l > 2) {
        rangeWithDots.push('...')
      }
    }
    rangeWithDots.push(range[i])
    l = range[i]
  }

  return rangeWithDots
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function LicenseStatusCell({ status }) {
  const style = getLicenseStatusStyle(status)
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontFamily: "'Space Grotesk', sans-serif",
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          backgroundColor: style.dot,
          flexShrink: 0,
          display: 'inline-block',
        }}
      />
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: style.text,
          fontFamily: "'Space Grotesk', sans-serif",
        }}
      >
        {style.label}
      </span>
    </span>
  )
}

function FilterSelect({ value, onChange, options }) {
  const [focused, setFocused] = useState(false)
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        height: 40,
        border: `1px solid ${focused ? '#0D7C7C' : '#E5E7EB'}`,
        borderRadius: 4,
        fontSize: 13,
        fontFamily: "'Space Grotesk', sans-serif",
        outline: 'none',
        padding: '0 10px',
        cursor: 'pointer',
        backgroundColor: '#FFFFFF',
        color: '#374151',
        transition: 'border-color 0.15s',
      }}
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  )
}

function PaginationButton({ children, active, disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        minWidth: 28,
        height: 28,
        padding: '0 6px',
        borderRadius: 4,
        fontSize: 12,
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: active ? 700 : 400,
        cursor: disabled ? 'not-allowed' : 'pointer',
        border: active ? '1px solid #0D7C7C' : '1px solid #E5E7EB',
        backgroundColor: active ? '#0D7C7C' : '#FFFFFF',
        color: disabled ? '#D1D5DB' : active ? '#FFFFFF' : '#6B7280',
        lineHeight: '26px',
        textAlign: 'center',
        transition: 'background-color 0.15s, color 0.15s',
      }}
    >
      {children}
    </button>
  )
}

// ---------------------------------------------------------------------------
// ActionButtons — Approve and Revoke per row
// ---------------------------------------------------------------------------
function ActionButtons({ doctor, onApprove, onRevoke }) {
  const status = doctor.license_status ? doctor.license_status.toUpperCase() : ''

  const isApproveDisabled = status === 'ACTIVE'
  const isRevokeDisabled  = status === 'SUSPENDED' || status === 'EXPIRED'

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button
        onClick={() => !isApproveDisabled && onApprove(doctor)}
        disabled={isApproveDisabled}
        style={{
          fontSize: 11,
          fontWeight: 700,
          fontFamily: "'Space Grotesk', sans-serif",
          padding: '5px 12px',
          borderRadius: 4,
          cursor: isApproveDisabled ? 'not-allowed' : 'pointer',
          border: isApproveDisabled ? '1px solid #E5E7EB' : '1px solid #0D7C7C',
          backgroundColor: isApproveDisabled ? '#F3F4F6' : 'transparent',
          color: isApproveDisabled ? '#9CA3AF' : '#0D7C7C',
          transition: 'opacity 0.15s',
          whiteSpace: 'nowrap',
        }}
      >
        Approve
      </button>

      <button
        onClick={() => !isRevokeDisabled && onRevoke(doctor)}
        disabled={isRevokeDisabled}
        style={{
          fontSize: 11,
          fontWeight: 700,
          fontFamily: "'Space Grotesk', sans-serif",
          padding: '5px 12px',
          borderRadius: 4,
          cursor: isRevokeDisabled ? 'not-allowed' : 'pointer',
          border: isRevokeDisabled ? '1px solid #E5E7EB' : '1px solid #E53E3E',
          backgroundColor: isRevokeDisabled ? '#F3F4F6' : 'transparent',
          color: isRevokeDisabled ? '#9CA3AF' : '#E53E3E',
          transition: 'opacity 0.15s',
          whiteSpace: 'nowrap',
        }}
      >
        Revoke
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function DoctorLicensesView({ token, onSuccess, onError }) {
  const [doctors, setDoctors]             = useState([])
  const [total, setTotal]                 = useState(0)
  const [loading, setLoading]             = useState(false)
  const [page, setPage]                   = useState(1)
  const [searchInput, setSearchInput]     = useState('')
  const [search, setSearch]               = useState('')
  const [region, setRegion]               = useState('All Morocco')
  const [licenseStatus, setLicenseStatus] = useState('All')
  const [searchFocused, setSearchFocused] = useState(false)

  const debounceRef = useRef(null)

  // Debounce: commit search after 300 ms idle.
  const handleSearchInput = useCallback((value) => {
    setSearchInput(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSearch(value)
      setPage(1)
    }, 300)
  }, [])

  // Reset page when dropdown filters change.
  const handleRegionChange = useCallback((val) => {
    setRegion(val)
    setPage(1)
  }, [])

  const handleLicenseStatusChange = useCallback((val) => {
    setLicenseStatus(val)
    setPage(1)
  }, [])

  // ---------------------------------------------------------------------------
  // Data fetch
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      setLoading(true)
      try {
        const result = await getDoctorList(
          { region, license_status: licenseStatus, search, page, limit: LIMIT },
          token,
        )
        if (!cancelled && result.success) {
          setDoctors(result.data.doctors)
          setTotal(result.data.total)
        }
      } catch {
        if (!cancelled) {
          setDoctors([])
          setTotal(0)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()

    return () => {
      cancelled = true
    }
  }, [page, search, region, licenseStatus, token])

  // Cleanup debounce timer on unmount.
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Approve / Revoke handlers with optimistic update + rollback
  // ---------------------------------------------------------------------------
  const handleApprove = useCallback(
    async (doctor) => {
      // Snapshot previous state for rollback.
      const previousDoctors = doctors

      // Optimistic update.
      setDoctors((prev) =>
        prev.map((d) =>
          d.id === doctor.id ? { ...d, license_status: 'ACTIVE' } : d,
        ),
      )

      try {
        const result = await approveDoctorAPI(doctor.id, token)
        if (result.success) {
          onSuccess && onSuccess('License approved')
        } else {
          throw new Error(result.error || 'Approve failed')
        }
      } catch {
        // Rollback on failure.
        setDoctors(previousDoctors)
        onError && onError('Action failed. Please try again.')
      }
    },
    [doctors, token, onSuccess, onError],
  )

  const handleRevoke = useCallback(
    async (doctor) => {
      const previousDoctors = doctors

      setDoctors((prev) =>
        prev.map((d) =>
          d.id === doctor.id ? { ...d, license_status: 'SUSPENDED' } : d,
        ),
      )

      try {
        const result = await revokeDoctorAPI(doctor.id, token)
        if (result.success) {
          onSuccess && onSuccess('License revoked')
        } else {
          throw new Error(result.error || 'Revoke failed')
        }
      } catch {
        setDoctors(previousDoctors)
        onError && onError('Action failed. Please try again.')
      }
    },
    [doctors, token, onSuccess, onError],
  )

  // ---------------------------------------------------------------------------
  // Pagination derived values
  // ---------------------------------------------------------------------------
  const totalPages  = useMemo(() => Math.max(1, Math.ceil(total / LIMIT)), [total])
  const pageNumbers = useMemo(() => buildPageNumbers(page, totalPages), [page, totalPages])

  const rangeStart = total === 0 ? 0 : (page - 1) * LIMIT + 1
  const rangeEnd   = Math.min(page * LIMIT, total)

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div
      style={{
        padding: 32,
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        fontFamily: "'Space Grotesk', sans-serif",
      }}
    >
      {/* ------------------------------------------------------------------ */}
      {/* Page header                                                         */}
      {/* ------------------------------------------------------------------ */}
      <div>
        <h1
          style={{
            margin: 0,
            fontSize: 28,
            fontWeight: 700,
            color: '#1A1A2E',
            letterSpacing: '-0.02em',
            fontFamily: "'Space Grotesk', sans-serif",
          }}
        >
          Doctor Licenses
        </h1>
        <p
          style={{
            margin: '4px 0 0 0',
            fontSize: 14,
            color: '#6B7280',
            fontFamily: "'Space Grotesk', sans-serif",
          }}
        >
          Licensed Medical Practitioners Registry
        </p>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Summary bar                                                         */}
      {/* ------------------------------------------------------------------ */}
      <p
        style={{
          margin: 0,
          marginBottom: 16,
          fontSize: 13,
          color: '#6B7280',
          fontFamily: "'Space Grotesk', sans-serif",
        }}
      >
        {total === 0
          ? 'No doctors found'
          : `Showing ${rangeEnd} of ${total} doctors`}
      </p>

      {/* ------------------------------------------------------------------ */}
      {/* Filters row                                                         */}
      {/* ------------------------------------------------------------------ */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 16,
        }}
      >
        {/* Search */}
        <input
          type="text"
          value={searchInput}
          onChange={(e) => handleSearchInput(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          placeholder="Search by name or license number..."
          style={{
            width: 280,
            height: 40,
            border: `1px solid ${searchFocused ? '#0D7C7C' : '#E5E7EB'}`,
            borderRadius: 4,
            fontSize: 13,
            fontFamily: "'Space Grotesk', sans-serif",
            outline: 'none',
            padding: '0 12px',
            backgroundColor: '#FFFFFF',
            color: '#1A1A2E',
            boxSizing: 'border-box',
            transition: 'border-color 0.15s',
          }}
        />

        {/* Region selector */}
        <FilterSelect
          value={region}
          onChange={handleRegionChange}
          options={REGIONS}
        />

        {/* License status selector */}
        <FilterSelect
          value={licenseStatus}
          onChange={handleLicenseStatusChange}
          options={LICENSE_STATUSES}
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Table card                                                          */}
      {/* ------------------------------------------------------------------ */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontFamily: "'Space Grotesk', sans-serif",
          }}
        >
          {/* Header */}
          <thead>
            <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
              {TABLE_COLUMNS.map((col) => (
                <th
                  key={col}
                  style={{
                    padding: '10px 16px',
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#9CA3AF',
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                    textAlign: 'left',
                    whiteSpace: 'nowrap',
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={TABLE_COLUMNS.length}
                  style={{
                    textAlign: 'center',
                    padding: 48,
                    fontSize: 13,
                    color: '#6B7280',
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}
                >
                  Loading...
                </td>
              </tr>
            ) : doctors.length === 0 ? (
              <tr>
                <td
                  colSpan={TABLE_COLUMNS.length}
                  style={{
                    textAlign: 'center',
                    padding: 48,
                    fontSize: 13,
                    color: '#6B7280',
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}
                >
                  No doctors match your search criteria
                </td>
              </tr>
            ) : (
              doctors.map((doctor, idx) => (
                <DoctorRow
                  key={doctor.id || idx}
                  doctor={doctor}
                  idx={idx}
                  onApprove={handleApprove}
                  onRevoke={handleRevoke}
                />
              ))
            )}
          </tbody>
        </table>

        {/* Pagination footer */}
        <div
          style={{
            borderTop: '1px solid #E5E7EB',
            backgroundColor: '#FAFAFA',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          {/* Range label */}
          <span
            style={{
              fontSize: 12,
              color: '#6B7280',
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            {total === 0
              ? 'No doctors'
              : `Showing ${rangeStart}–${rangeEnd} of ${total} doctors`}
          </span>

          {/* Page buttons */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <PaginationButton
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </PaginationButton>

              {pageNumbers.map((num, i) =>
                num === '...' ? (
                  <span
                    key={`ellipsis-${i}`}
                    style={{
                      minWidth: 28,
                      height: 28,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      color: '#9CA3AF',
                      fontFamily: "'Space Grotesk', sans-serif",
                    }}
                  >
                    ...
                  </span>
                ) : (
                  <PaginationButton
                    key={num}
                    active={num === page}
                    onClick={() => setPage(num)}
                  >
                    {num}
                  </PaginationButton>
                ),
              )}

              <PaginationButton
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </PaginationButton>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// DoctorRow — memoized to avoid re-rendering the whole list on every state
// change that doesn't affect this row's data.
// ---------------------------------------------------------------------------
const DoctorRow = React.memo(function DoctorRow({ doctor, idx, onApprove, onRevoke }) {
  const [hovered, setHovered] = useState(false)

  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        height: 64,
        borderBottom: '1px solid #F3F4F6',
        backgroundColor: hovered ? '#F9FAFB' : '#FFFFFF',
        transition: 'background-color 0.1s',
      }}
    >
      {/* Doctor Name */}
      <td
        style={{
          padding: '0 16px',
          verticalAlign: 'middle',
          fontSize: 13,
          fontWeight: 600,
          color: '#1A1A2E',
          fontFamily: "'Space Grotesk', sans-serif",
          whiteSpace: 'nowrap',
        }}
      >
        {doctor.name || doctor.full_name || '—'}
      </td>

      {/* License No. */}
      <td
        style={{
          padding: '0 16px',
          verticalAlign: 'middle',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          fontWeight: 600,
          color: '#0D7C7C',
          whiteSpace: 'nowrap',
        }}
      >
        {doctor.license_number || doctor.license_no || '—'}
      </td>

      {/* Specialty */}
      <td
        style={{
          padding: '0 16px',
          verticalAlign: 'middle',
          fontSize: 12,
          color: '#6B7280',
          fontFamily: "'Space Grotesk', sans-serif",
        }}
      >
        {doctor.specialty || '—'}
      </td>

      {/* Region */}
      <td
        style={{
          padding: '0 16px',
          verticalAlign: 'middle',
          fontSize: 12,
          color: '#374151',
          fontFamily: "'Space Grotesk', sans-serif",
        }}
      >
        {doctor.region || '—'}
      </td>

      {/* Status */}
      <td
        style={{
          padding: '0 16px',
          verticalAlign: 'middle',
        }}
      >
        <LicenseStatusCell status={doctor.license_status} />
      </td>

      {/* Registered */}
      <td
        style={{
          padding: '0 16px',
          verticalAlign: 'middle',
          fontSize: 12,
          color: '#6B7280',
          fontFamily: "'Space Grotesk', sans-serif",
          whiteSpace: 'nowrap',
        }}
      >
        {formatDate(doctor.created_at || doctor.registered_at)}
      </td>

      {/* Actions */}
      <td
        style={{
          padding: '0 16px',
          verticalAlign: 'middle',
        }}
      >
        <ActionButtons doctor={doctor} onApprove={onApprove} onRevoke={onRevoke} />
      </td>
    </tr>
  )
})

