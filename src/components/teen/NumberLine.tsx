'use client'

import type { AgeBand, AnswerStatus } from '@/components/teen/types'

export interface NumberLineProps {
  band: AgeBand
  min: number
  max: number
  step?: number // default 1
  mode: 'read' | 'select'
  marked?: number[] // points drawn (read mode)
  value?: number | null // current selection (select mode)
  status?: AnswerStatus
  onSelect?: (n: number) => void
}

/**
 * Two-sided integer / rational number line (SVG).
 *
 *  - mode "read"   → draws the `marked[]` points on the line (no interaction).
 *  - mode "select" → every tick is a tap target; tapping calls `onSelect(n)`.
 *
 * Math-without-fear feedback (select mode): the selected value highlights in
 * `--accent`; once graded it reads `--garden-green` when correct or
 * `--note-amber` when the pick is gently reframed (never red / X / "fail").
 *
 * All numbers render in `--font-numeric` (IBM Plex Mono). Theme variables come
 * from the ancestor `data-band` scope — this component only reads CSS vars and
 * never sets `data-band` itself.
 */
export default function NumberLine({
  band,
  min,
  max,
  step = 1,
  mode,
  marked = [],
  value = null,
  status = 'idle',
  onSelect,
}: NumberLineProps) {
  // Guard against a degenerate range/step.
  const lo = Math.min(min, max)
  const hi = Math.max(min, max)
  const safeStep = step > 0 ? step : 1

  // Build ticks inclusively; round to absorb float drift (rational steps).
  const ticks: number[] = []
  const count = Math.round((hi - lo) / safeStep)
  for (let i = 0; i <= count; i++) {
    const raw = lo + i * safeStep
    // Snap to step grid so labels read cleanly (e.g. 0.30000000004 → 0.3).
    ticks.push(Math.round(raw / safeStep) * safeStep)
  }

  // SVG viewBox geometry — fixed coordinate space, scales to its container.
  const VW = 720
  const VH = 132
  const padX = 36
  const axisY = 64
  const span = hi - lo || 1
  const xOf = (n: number) => padX + ((n - lo) / span) * (VW - padX * 2)

  // Tidy a number for its label: trim trailing zeros without forcing decimals.
  const fmt = (n: number) => {
    const r = Math.round(n * 1e6) / 1e6
    return Number.isInteger(r) ? String(r) : String(r)
  }

  const interactive = mode === 'select'
  const graded = interactive && value != null && status !== 'idle'

  // Colour of the active/selected marker, driven by grade state.
  const selectColor =
    status === 'correct'
      ? 'var(--garden-green)'
      : status === 'wrong'
        ? 'var(--note-amber)'
        : 'var(--accent)'

  // In read mode the drawn points always read as quiet correct-reveals.
  const isMarked = (n: number) =>
    marked.some((m) => Math.abs(m - n) < safeStep / 2)

  return (
    <div
      data-band-context={band}
      style={{ width: '100%', fontFamily: 'var(--font-numeric)' }}
    >
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .milo-nl-tick, .milo-nl-marker { transition: none !important; }
        }
      `}</style>
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        width="100%"
        role={interactive ? 'group' : 'img'}
        aria-label={
          interactive
            ? `Number line from ${fmt(lo)} to ${fmt(hi)}; tap a value`
            : `Number line from ${fmt(lo)} to ${fmt(hi)}`
        }
        style={{ display: 'block', overflow: 'visible', userSelect: 'none' }}
      >
        {/* Two-sided arrowheads marking the line continues both ways. */}
        <defs>
          <marker
            id="milo-nl-arrow-l"
            markerWidth="10"
            markerHeight="10"
            refX="6"
            refY="5"
            orient="auto-start-reverse"
          >
            <path d="M6,1 L1,5 L6,9" fill="none" stroke="var(--ink-muted)" strokeWidth="1.25" />
          </marker>
          <marker
            id="milo-nl-arrow-r"
            markerWidth="10"
            markerHeight="10"
            refX="4"
            refY="5"
            orient="auto"
          >
            <path d="M4,1 L9,5 L4,9" fill="none" stroke="var(--ink-muted)" strokeWidth="1.25" />
          </marker>
        </defs>

        {/* The axis. */}
        <line
          x1={padX - 18}
          y1={axisY}
          x2={VW - padX + 18}
          y2={axisY}
          stroke="var(--ink-soft)"
          strokeWidth="1.5"
          markerStart="url(#milo-nl-arrow-l)"
          markerEnd="url(#milo-nl-arrow-r)"
        />

        {/* Origin (0) drawn slightly heavier when it sits inside the range. */}
        {lo <= 0 && hi >= 0 && (
          <line
            x1={xOf(0)}
            y1={axisY - 12}
            x2={xOf(0)}
            y2={axisY + 12}
            stroke="var(--ink-muted)"
            strokeWidth="1.5"
          />
        )}

        {ticks.map((n) => {
          const x = xOf(n)
          const selected = interactive && value != null && Math.abs(value - n) < safeStep / 2
          const drawn = !interactive && isMarked(n)

          const tickColor = selected
            ? selectColor
            : drawn
              ? 'var(--garden-green)'
              : 'var(--ink-soft)'

          return (
            <g key={fmt(n)}>
              {/* Tick mark. */}
              <line
                className="milo-nl-tick"
                x1={x}
                y1={axisY - 8}
                x2={x}
                y2={axisY + 8}
                stroke={tickColor}
                strokeWidth={selected || drawn ? 2 : 1}
                style={{
                  transition: 'stroke 200ms var(--ease-smooth)',
                }}
              />

              {/* Marker dot for a selected (select) or drawn (read) value. */}
              {(selected || drawn) && (
                <circle
                  className="milo-nl-marker"
                  cx={x}
                  cy={axisY}
                  r={selected ? 7 : 6}
                  fill={selected ? selectColor : 'var(--garden-green)'}
                  stroke="var(--paper)"
                  strokeWidth="1.5"
                  style={{ transition: 'fill 200ms var(--ease-smooth)' }}
                />
              )}

              {/* Mono label below the axis. */}
              <text
                x={x}
                y={axisY + 28}
                textAnchor="middle"
                fontFamily="var(--font-numeric)"
                fontSize="13"
                fontWeight={selected || drawn ? 600 : 400}
                fill={
                  selected
                    ? selectColor
                    : drawn
                      ? 'var(--garden-green)'
                      : 'var(--ink-muted)'
                }
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {fmt(n)}
              </text>

              {/* Invisible, generous tap target (select mode only). */}
              {interactive && (
                <rect
                  x={x - (VW - padX * 2) / Math.max(1, ticks.length) / 2}
                  y={axisY - 26}
                  width={(VW - padX * 2) / Math.max(1, ticks.length)}
                  height={52}
                  fill="transparent"
                  style={{ cursor: graded ? 'default' : 'pointer' }}
                  role="button"
                  aria-label={`Select ${fmt(n)}`}
                  aria-pressed={selected}
                  onClick={() => {
                    if (!graded) onSelect?.(n)
                  }}
                />
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
