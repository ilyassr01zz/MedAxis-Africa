// MedAxis Africa — Regulator Prescriptions View
// Full data-driven prescription registry for REGULATOR role.

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { getPrescriptionList } from '../../api/regulator'

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

const STATUSES = [
  'All Records',
  'Active',
  'Dispensed',
  'Expired',
  'Cancelled',
  'Disputed',
]

const STATUS_STYLES = {
  ACTIVE:     { dot: '#0D7C7C', text: '#0D7C7C' },
  DISPENSED:  { dot: '#16A34A', text: '#16A34A' },
  EXPIRED:    { dot: '#9CA3AF', text: '#6B7280' },
  CANCELLED:  { dot: '#E53E3E', text: '#E53E3E' },
  DISPUTED:   { dot: '#F59E0B', text: '#F59E0B' },
  FLAGGED:    { dot: '#E53E3E', text: '#E53E3E' },
}

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

function getStatusStyle(status) {
  return STATUS_STYLES[status?.toUpperCase()] || { dot: '#9CA3AF', text: '#6B7280' }
}

function buildPageNumbers(current, total) {
  // Always include 1, last, current ± 2. Fill with ellipsis where needed.
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
function StatusCell({ status }) {
  const style = getStatusStyle(status)
  const label = status ? status.charAt(0) + status.slice(1).toLowerCase() : '—'
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
        {label}
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
        color: '#1A1A2E',
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
        cursor: disabled ? 'not-allowed' : 'pointer',
        border: active ? 'none' : '1px solid #E5E7EB',
        backgroundColor: active ? '#0D7C7C' : '#FFFFFF',
        color: disabled ? '#D1D5DB' : active ? '#FFFFFF' : '#6B7280',
        fontWeight: active ? 700 : 400,
        lineHeight: '28px',
        textAlign: 'center',
        transition: 'background-color 0.15s, color 0.15s',
      }}
    >
      {children}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function RegulatorPrescriptionsView({ token }) {
  const [prescriptions, setPrescriptions] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [region, setRegion] = useState('All Morocco')
  const [status, setStatus] = useState('All Records')
  const [searchInput, setSearchInput] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)

  const debounceRef = useRef(null)

  // Debounce the search input — only commit to `search` after 300ms idle.
  const handleSearchInput = useCallback((value) => {
    setSearchInput(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSearch(value)
      setPage(1)
    }, 300)
  }, [])

  // Reset page to 1 when region or status filter changes.
  const handleRegionChange = useCallback((val) => {
    setRegion(val)
    setPage(1)
  }, [])

  const handleStatusChange = useCallback((val) => {
    setStatus(val)
    setPage(1)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      setLoading(true)
      try {
        const result = await getPrescriptionList(
          { region, status, search, page, limit: LIMIT },
          token,
        )
        if (!cancelled && result.success) {
          setPrescriptions(result.data.prescriptions)
          setTotal(result.data.total)
        }
      } catch {
        if (!cancelled) {
          setPrescriptions([])
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
  }, [page, search, region, status, token])

  // Cleanup debounce on unmount.
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const totalPages = useMemo(() => Math.ceil(total / LIMIT), [total])
  const pageNumbers = useMemo(() => buildPageNumbers(page, totalPages), [page, totalPages])

  const rangeStart = total === 0 ? 0 : (page - 1) * LIMIT + 1
  const rangeEnd = Math.min(page * LIMIT, total)

  // ---------------------------------------------------------------------------
  // Table columns definition
  // ---------------------------------------------------------------------------
  const COLUMNS = ['RxID', 'Doctor', 'Patient Token', 'Medication', 'Date', 'Region', 'Status']

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
        backgroundColor: '#F5F7F5',
        minHeight: '100%',
      }}
    >
      {/* Page header */}
      <div>
        <h1
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 700,
            color: '#1A1A2E',
            fontFamily: "'Space Grotesk', sans-serif",
          }}
        >
          Prescriptions
        </h1>
        <p
          style={{
            margin: '4px 0 0',
            fontSize: 13,
            color: '#6B7280',
            fontFamily: "'Space Grotesk', sans-serif",
          }}
        >
          National Prescription Registry
        </p>
      </div>

      {/* Filter row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        {/* Search input */}
        <input
          type="text"
          value={searchInput}
          onChange={(e) => handleSearchInput(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          placeholder="Search by RxID or doctor name..."
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

        <FilterSelect value={region} onChange={handleRegionChange} options={REGIONS} />
        <FilterSelect value={status} onChange={handleStatusChange} options={STATUSES} />
      </div>

      {/* Table card */}
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
            <tr>
              {COLUMNS.map((col) => (
                <th
                  key={col}
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#9CA3AF',
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                    padding: '10px 16px',
                    backgroundColor: '#F9FAFB',
                    textAlign: 'left',
                    fontFamily: "'Space Grotesk', sans-serif",
                    whiteSpace: 'nowrap',
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
                  colSpan={COLUMNS.length}
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
            ) : prescriptions.length === 0 ? (
              <tr>
                <td
                  colSpan={COLUMNS.length}
                  style={{
                    textAlign: 'center',
                    padding: 48,
                    fontSize: 13,
                    color: '#6B7280',
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}
                >
                  No prescriptions match your criteria
                </td>
              </tr>
            ) : (
              prescriptions.map((rx, idx) => (
                <tr
                  key={rx.rx_id || rx.id || idx}
                  style={{
                    backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                    borderTop: idx === 0 ? 'none' : '1px solid #F3F4F6',
                  }}
                >
                  {/* RxID */}
                  <td
                    style={{
                      padding: '0 16px',
                      height: 56,
                      verticalAlign: 'middle',
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 11,
                      color: '#0D7C7C',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {rx.rx_id || rx.id || '—'}
                  </td>

                  {/* Doctor */}
                  <td
                    style={{
                      padding: '0 16px',
                      height: 56,
                      verticalAlign: 'middle',
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#1A1A2E',
                      fontFamily: "'Space Grotesk', sans-serif",
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {rx.doctor_name || rx.doctor || '—'}
                  </td>

                  {/* Patient Token */}
                  <td
                    style={{
                      padding: '0 16px',
                      height: 56,
                      verticalAlign: 'middle',
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 11,
                      color: '#6B7280',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {rx.patient_token || rx.patient_cnie_hash || '—'}
                  </td>

                  {/* Medication */}
                  <td
                    style={{
                      padding: '0 16px',
                      height: 56,
                      verticalAlign: 'middle',
                      fontSize: 13,
                      color: '#374151',
                      fontFamily: "'Space Grotesk', sans-serif",
                    }}
                  >
                    {rx.medication || rx.drug_code || '—'}
                  </td>

                  {/* Date */}
                  <td
                    style={{
                      padding: '0 16px',
                      height: 56,
                      verticalAlign: 'middle',
                      fontSize: 12,
                      color: '#6B7280',
                      fontFamily: "'Space Grotesk', sans-serif",
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatDate(rx.created_at || rx.date)}
                  </td>

                  {/* Region */}
                  <td
                    style={{
                      padding: '0 16px',
                      height: 56,
                      verticalAlign: 'middle',
                      fontSize: 12,
                      color: '#374151',
                      fontFamily: "'Space Grotesk', sans-serif",
                    }}
                  >
                    {rx.region || '—'}
                  </td>

                  {/* Status */}
                  <td
                    style={{
                      padding: '0 16px',
                      height: 56,
                      verticalAlign: 'middle',
                    }}
                  >
                    <StatusCell status={rx.status} />
                  </td>
                </tr>
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
              ? 'No prescriptions'
              : `Showing ${rangeStart}–${rangeEnd} of ${total} prescriptions`}
          </span>

          {/* Page buttons */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {/* Prev */}
              <PaginationButton
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </PaginationButton>

              {/* Page numbers */}
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

              {/* Next */}
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
