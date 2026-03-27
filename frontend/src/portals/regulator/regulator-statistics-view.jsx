// MedAxis Africa — Regulator Statistics View
// Healthcare analytics with SVG line chart and SVG donut chart.
// No Recharts. No external chart libraries. Pure inline SVG.

import { useMemo } from 'react'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const MONTHLY_DATA = [
  { month: 'Jan', value: 82 },
  { month: 'Feb', value: 95 },
  { month: 'Mar', value: 110 },
  { month: 'Apr', value: 103 },
  { month: 'May', value: 128 },
  { month: 'Jun', value: 115 },
  { month: 'Jul', value: 98 },
  { month: 'Aug', value: 87 },
  { month: 'Sep', value: 132 },
  { month: 'Oct', value: 145 },
  { month: 'Nov', value: 138 },
  { month: 'Dec', value: 121 },
]

const TOTAL_2026 = MONTHLY_DATA.reduce((sum, d) => sum + d.value, 0) // 1,354

const SPACE_GROTESK = "'Space Grotesk', sans-serif"
const JETBRAINS_MONO = "'JetBrains Mono', monospace"

// ---------------------------------------------------------------------------
// SVG Line Chart helpers
// ---------------------------------------------------------------------------
const CHART_W = 400
const CHART_H = 160
const MARGIN = { top: 16, right: 16, bottom: 32, left: 32 }
const PLOT_W = CHART_W - MARGIN.left - MARGIN.right
const PLOT_H = CHART_H - MARGIN.top - MARGIN.bottom

function computeLinePoints(data) {
  const values = data.map((d) => d.value)
  const maxVal = Math.max(...values)
  const yMax = maxVal * 1.1

  const points = data.map((d, i) => {
    const x = MARGIN.left + (i / (data.length - 1)) * PLOT_W
    const y = MARGIN.top + PLOT_H - (d.value / yMax) * PLOT_H
    return { x, y, value: d.value, month: d.month }
  })

  return { points, yMax }
}

function pointsToPolyline(points) {
  return points.map((p) => `${p.x},${p.y}`).join(' ')
}

function pointsToAreaPolygon(points) {
  const bottomLeft = `${points[0].x},${MARGIN.top + PLOT_H}`
  const bottomRight = `${points[points.length - 1].x},${MARGIN.top + PLOT_H}`
  const topPath = points.map((p) => `${p.x},${p.y}`).join(' ')
  return `${topPath} ${bottomRight} ${bottomLeft}`
}

// ---------------------------------------------------------------------------
// Donut chart helpers
// ---------------------------------------------------------------------------
const DONUT_R = 50
const DONUT_CX = 80
const DONUT_CY = 80
const CIRCUMFERENCE = 2 * Math.PI * DONUT_R // ≈ 314.159

// ---------------------------------------------------------------------------
// Card wrapper
// ---------------------------------------------------------------------------
function Card({ children, style }) {
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: 8,
        padding: 20,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Chart card header
// ---------------------------------------------------------------------------
function ChartHeader({ icon, title, subtitle }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        marginBottom: 16,
      }}
    >
      <span
        className="material-symbols-outlined"
        style={{
          fontSize: 20,
          color: '#0D7C7C',
          lineHeight: 1,
          userSelect: 'none',
        }}
      >
        {icon}
      </span>
      <div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: '#1A1A2E',
            fontFamily: SPACE_GROTESK,
            lineHeight: 1.2,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 11,
            color: '#9CA3AF',
            fontFamily: SPACE_GROTESK,
            marginTop: 2,
          }}
        >
          {subtitle}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Line Chart component
// ---------------------------------------------------------------------------
function LineChart() {
  const { points, yMax } = useMemo(() => computeLinePoints(MONTHLY_DATA), [])

  const polylinePoints = pointsToPolyline(points)
  const areaPoints = pointsToAreaPolygon(points)

  // Y-axis: 4 gridlines
  const gridCount = 4
  const gridLines = Array.from({ length: gridCount }, (_, i) => {
    const fraction = (i + 1) / gridCount
    const y = MARGIN.top + PLOT_H - fraction * PLOT_H
    const label = Math.round((fraction * yMax) / 10) * 10
    return { y, label }
  })

  // Highlight dots: first point, last point, max value point
  const maxValue = Math.max(...MONTHLY_DATA.map((d) => d.value))
  const highlightIndices = new Set([0, MONTHLY_DATA.length - 1])
  MONTHLY_DATA.forEach((d, i) => {
    if (d.value === maxValue) highlightIndices.add(i)
  })

  return (
    <svg
      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      width="100%"
      height={CHART_H}
      style={{ display: 'block', overflow: 'visible' }}
    >
      {/* Y-axis gridlines */}
      {gridLines.map(({ y, label }, i) => (
        <g key={i}>
          <line
            x1={MARGIN.left}
            y1={y}
            x2={CHART_W - MARGIN.right}
            y2={y}
            stroke="#F3F4F6"
            strokeWidth={1}
          />
          <text
            x={MARGIN.left - 4}
            y={y}
            fontSize={9}
            fill="#9CA3AF"
            textAnchor="end"
            dominantBaseline="middle"
            fontFamily={SPACE_GROTESK}
          >
            {label}
          </text>
        </g>
      ))}

      {/* X-axis baseline */}
      <line
        x1={MARGIN.left}
        y1={MARGIN.top + PLOT_H}
        x2={CHART_W - MARGIN.right}
        y2={MARGIN.top + PLOT_H}
        stroke="#F3F4F6"
        strokeWidth={1}
      />

      {/* Shaded area under line */}
      <polygon
        points={areaPoints}
        fill="#0D7C7C"
        opacity={0.08}
      />

      {/* Line */}
      <polyline
        points={polylinePoints}
        stroke="#0D7C7C"
        strokeWidth={2}
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* X-axis month labels */}
      {points.map((p, i) => (
        <text
          key={i}
          x={p.x}
          y={MARGIN.top + PLOT_H + 14}
          fontSize={9}
          fill="#9CA3AF"
          textAnchor="middle"
          fontFamily={SPACE_GROTESK}
        >
          {MONTHLY_DATA[i].month}
        </text>
      ))}

      {/* Highlighted data point dots */}
      {points.map((p, i) => {
        if (!highlightIndices.has(i)) return null
        return (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={3}
            fill="#FFFFFF"
            stroke="#0D7C7C"
            strokeWidth={2}
          />
        )
      })}
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Donut Chart component
// ---------------------------------------------------------------------------
function DonutChart({ activeCount, expiredCount, suspendedCount, total }) {
  // Compute stroke-dasharray and stroke-dashoffset for each segment.
  // transform="rotate(-90 80 80)" ensures the first segment starts at the top.
  const segments = useMemo(() => {
    const items = [
      { count: activeCount, color: '#0D7C7C', label: 'Active' },
      { count: expiredCount, color: '#9CA3AF', label: 'Expired' },
      { count: suspendedCount, color: '#F59E0B', label: 'Suspended' },
    ]

    let accumulated = 0
    return items.map((item) => {
      const dash = (item.count / total) * CIRCUMFERENCE
      const gap = CIRCUMFERENCE - dash
      // Negative offset rotates the start of this segment forward by the
      // accumulated arc length of all previous segments.
      const offset = -accumulated
      accumulated += dash
      return { ...item, dash, gap, offset }
    })
  }, [activeCount, expiredCount, suspendedCount, total])

  return (
    <div>
      {/* SVG with center label overlay */}
      <div
        style={{
          position: 'relative',
          width: 160,
          height: 160,
          margin: '0 auto',
        }}
      >
        <svg
          viewBox="0 0 160 160"
          width={160}
          height={160}
          style={{ display: 'block' }}
        >
          {/* Background track */}
          <circle
            cx={DONUT_CX}
            cy={DONUT_CY}
            r={DONUT_R}
            fill="none"
            stroke="#F3F4F6"
            strokeWidth={20}
          />

          {/* Segments */}
          {segments.map((seg, i) => (
            <circle
              key={i}
              cx={DONUT_CX}
              cy={DONUT_CY}
              r={DONUT_R}
              fill="none"
              stroke={seg.color}
              strokeWidth={20}
              strokeDasharray={`${seg.dash} ${seg.gap}`}
              strokeDashoffset={seg.offset}
              transform="rotate(-90 80 80)"
              strokeLinecap="butt"
            />
          ))}
        </svg>

        {/* Center text */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: '#1A1A2E',
              fontFamily: JETBRAINS_MONO,
              lineHeight: 1,
            }}
          >
            {total}
          </div>
          <div
            style={{
              fontSize: 10,
              color: '#9CA3AF',
              fontFamily: SPACE_GROTESK,
              marginTop: 3,
              letterSpacing: '0.06em',
            }}
          >
            DOCTORS
          </div>
        </div>
      </div>

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 20,
          marginTop: 16,
          flexWrap: 'wrap',
        }}
      >
        {[
          { color: '#0D7C7C', label: 'Active', count: activeCount },
          { color: '#9CA3AF', label: 'Expired', count: expiredCount },
          { color: '#F59E0B', label: 'Suspended', count: suspendedCount },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: item.color,
                flexShrink: 0,
                display: 'inline-block',
              }}
            />
            <span
              style={{
                fontSize: 12,
                color: '#374151',
                fontFamily: SPACE_GROTESK,
              }}
            >
              {item.label}
            </span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: '#1A1A2E',
                fontFamily: JETBRAINS_MONO,
              }}
            >
              {item.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Summary bar
// ---------------------------------------------------------------------------
function SummaryBar({ stats }) {
  const items = [
    { label: 'Active Prescriptions', value: stats?.active_prescriptions ?? '—' },
    { label: 'Dispensed',            value: stats?.dispensed_prescriptions ?? '—' },
    { label: 'Expired',              value: stats?.expired_prescriptions ?? '—' },
    { label: 'Disputed',             value: stats?.disputed ?? '—' },
  ]

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: 8,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'stretch',
      }}
    >
      {items.map((item, i) => (
        <div
          key={item.label}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            paddingLeft: i === 0 ? 0 : 20,
            paddingRight: i === items.length - 1 ? 0 : 20,
            borderLeft: i === 0 ? 'none' : '1px solid #E5E7EB',
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: '#9CA3AF',
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              fontFamily: SPACE_GROTESK,
            }}
          >
            {item.label}
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: '#1A1A2E',
              fontFamily: JETBRAINS_MONO,
              lineHeight: 1.1,
            }}
          >
            {item.value}
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------
export default function RegulatorStatisticsView({ stats }) {
  const activeCount    = stats?.active_doctors    ?? 1
  const expiredCount   = stats?.expired_doctors   ?? 0
  const suspendedCount = stats?.suspended_doctors ?? 0
  const total          = activeCount + expiredCount + suspendedCount || 1

  return (
    <div
      style={{
        padding: 32,
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        fontFamily: SPACE_GROTESK,
      }}
    >
      {/* Page header */}
      <div>
        <h1
          style={{
            margin: 0,
            fontSize: 28,
            fontWeight: 700,
            color: '#1A1A2E',
            fontFamily: SPACE_GROTESK,
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
          }}
        >
          Statistics
        </h1>
        <p
          style={{
            margin: '4px 0 0',
            fontSize: 14,
            color: '#6B7280',
            fontFamily: SPACE_GROTESK,
          }}
        >
          Healthcare Analytics Overview
        </p>
      </div>

      {/* Two charts side by side */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 24,
        }}
      >
        {/* Chart 1 — Line Chart */}
        <Card>
          <ChartHeader
            icon="show_chart"
            title="Prescriptions Over Time"
            subtitle="Jan – Dec 2026"
          />

          <LineChart />

          <p
            style={{
              margin: '8px 0 0',
              fontSize: 11,
              color: '#6B7280',
              fontWeight: 600,
              fontFamily: SPACE_GROTESK,
            }}
          >
            Total 2026: {TOTAL_2026.toLocaleString()} prescriptions
          </p>
        </Card>

        {/* Chart 2 — Donut Chart */}
        <Card>
          <ChartHeader
            icon="verified_user"
            title="License Status Breakdown"
            subtitle="Doctor license status distribution"
          />

          <DonutChart
            activeCount={activeCount}
            expiredCount={expiredCount}
            suspendedCount={suspendedCount}
            total={total}
          />
        </Card>
      </div>

      {/* Summary bar */}
      <SummaryBar stats={stats} />
    </div>
  )
}
