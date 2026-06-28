'use client'

import { useCallback, useMemo } from 'react'
import type { AgeBand, AnswerStatus, Pt } from '@/components/teen/types'

/** A straight line rendered across the visible x-range: y = mx + b. */
export interface CoordLine {
  kind: 'line'
  m: number
  b: number
}

/** An arbitrary curve, sampled across the visible x-range and drawn as a polyline. */
export interface CoordCurve {
  kind: 'curve'
  fn: (x: number) => number
}

export interface CoordGridProps {
  band: AgeBand
  xRange: [number, number]
  yRange: [number, number]
  step?: number // grid spacing, default 1
  mode: 'plot' | 'read' // plot: learner taps a lattice point; read: identify a shown point
  points?: Pt[] // pre-plotted points (read mode / context)
  lines?: CoordLine[]
  curves?: CoordCurve[]
  value?: Pt | null // learner's plotted point (plot mode)
  highlight?: Pt | null // feature to tap (vertex / intercept / intersection)
  status?: AnswerStatus
  variant?: 'xy' | 'complex' | 'unit-circle' // relabels axes; default 'xy'
  onPlot?: (p: Pt) => void
}

/**
 * The keystone interactive coordinate grid (SVG).
 *
 *  - mode "plot" → the learner taps a lattice point; it snaps to the nearest
 *    lattice intersection and calls `onPlot({x,y})`. There is NO focus-tap on
 *    empty space (taps always resolve to a lattice point) and NO draggable
 *    curve — lines / curves are rendered by the app and identified by tap.
 *  - mode "read" → pre-plotted `points[]` / `lines[]` / `curves[]` are shown;
 *    the learner taps the lattice point nearest a feature (`highlight`) to
 *    identify it. The tapped point is reported through `onPlot` as well.
 *
 * `variant` relabels axes: 'xy' (x / y), 'complex' (Re / Im), 'unit-circle'
 * (draws the unit circle + cardinal angle marks).
 *
 * Math-without-fear feedback: the active / plotted point reads `--accent`;
 * once graded it is `--garden-green` (correct) or `--note-amber` (a gentle
 * reframe — never red / X / "fail").
 *
 * All numbers render in `--font-numeric`. Theme variables come from the
 * ancestor `data-band` scope — this component only reads CSS vars and never
 * sets `data-band` itself. Curve sampling is memoized for performance.
 */
export default function CoordGrid({
  band,
  xRange,
  yRange,
  step = 1,
  mode,
  points = [],
  lines = [],
  curves = [],
  value = null,
  highlight = null,
  status = 'idle',
  variant = 'xy',
  onPlot,
}: CoordGridProps) {
  // Normalise the visible range + spacing (guard degenerate inputs).
  const xLo = Math.min(xRange[0], xRange[1])
  const xHi = Math.max(xRange[0], xRange[1])
  const yLo = Math.min(yRange[0], yRange[1])
  const yHi = Math.max(yRange[0], yRange[1])
  const safeStep = step > 0 ? step : 1

  // --- SVG coordinate space -------------------------------------------------
  const VW = 480
  const VH = 480
  const pad = 28
  const plotW = VW - pad * 2
  const plotH = VH - pad * 2
  const xSpan = xHi - xLo || 1
  const ySpan = yHi - yLo || 1

  // World → screen. Y is flipped (SVG y grows downward).
  const sx = useCallback(
    (x: number) => pad + ((x - xLo) / xSpan) * plotW,
    [pad, xLo, xSpan, plotW],
  )
  const sy = useCallback(
    (y: number) => pad + (1 - (y - yLo) / ySpan) * plotH,
    [pad, yLo, ySpan, plotH],
  )

  // Lattice tick values along each axis (inclusive, snapped to absorb float drift).
  const xTicks = useMemo(() => {
    const out: number[] = []
    const n = Math.round((xHi - xLo) / safeStep)
    for (let i = 0; i <= n; i++) {
      const raw = xLo + i * safeStep
      out.push(Math.round(raw / safeStep) * safeStep)
    }
    return out
  }, [xLo, xHi, safeStep])

  const yTicks = useMemo(() => {
    const out: number[] = []
    const n = Math.round((yHi - yLo) / safeStep)
    for (let i = 0; i <= n; i++) {
      const raw = yLo + i * safeStep
      out.push(Math.round(raw / safeStep) * safeStep)
    }
    return out
  }, [yLo, yHi, safeStep])

  // Tidy a number for a label (trim float drift, no forced decimals).
  const fmt = (n: number) => {
    const r = Math.round(n * 1e6) / 1e6
    return String(r === 0 ? 0 : r) // collapse -0 → 0
  }

  // --- Lattice snapping -----------------------------------------------------
  // Convert a screen tap to the nearest lattice point, clamped into range.
  const snapFromScreen = useCallback(
    (px: number, py: number): Pt => {
      const wx = xLo + ((px - pad) / plotW) * xSpan
      const wy = yLo + (1 - (py - pad) / plotH) * ySpan
      const sxv = Math.round(wx / safeStep) * safeStep
      const syv = Math.round(wy / safeStep) * safeStep
      const cx = Math.min(xHi, Math.max(xLo, sxv))
      const cy = Math.min(yHi, Math.max(yLo, syv))
      // Re-snap after clamp + collapse -0.
      return {
        x: Math.round(cx / safeStep) * safeStep + 0,
        y: Math.round(cy / safeStep) * safeStep + 0,
      }
    },
    [xLo, xHi, yLo, yHi, pad, plotW, plotH, xSpan, ySpan, safeStep],
  )

  const interactive = mode === 'plot' || mode === 'read'
  const graded = value != null && status !== 'idle'

  const handleSvgClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!onPlot || graded) return
      const svg = e.currentTarget
      const rect = svg.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      // Map the DOM click into the viewBox coordinate space.
      const px = ((e.clientX - rect.left) / rect.width) * VW
      const py = ((e.clientY - rect.top) / rect.height) * VH
      onPlot(snapFromScreen(px, py))
    },
    [onPlot, graded, snapFromScreen],
  )

  // --- Curve sampling (memoized) -------------------------------------------
  // Sample each curve across the x-range; drop non-finite / out-of-band points
  // so the polyline never wanders off into NaN-land.
  const SAMPLES = 160
  const curvePaths = useMemo(() => {
    return curves.map((c) => {
      let d = ''
      let open = false
      for (let i = 0; i <= SAMPLES; i++) {
        const x = xLo + (i / SAMPLES) * (xHi - xLo)
        const y = c.fn(x)
        if (!Number.isFinite(y) || y < yLo - ySpan || y > yHi + ySpan) {
          open = false // break the polyline across discontinuities / off-screen runs
          continue
        }
        const cmd = open ? 'L' : 'M'
        d += `${cmd}${sx(x).toFixed(2)},${sy(y).toFixed(2)} `
        open = true
      }
      return d.trim()
    })
  }, [curves, xLo, xHi, yLo, yHi, ySpan, sx, sy])

  // Lines: clip y = mx + b to the visible y-range so endpoints stay on-canvas.
  const linePaths = useMemo(() => {
    return lines.map((ln) => {
      let x0 = xLo
      let x1 = xHi
      let y0 = ln.m * x0 + ln.b
      let y1 = ln.m * x1 + ln.b
      // Clip each endpoint to the y window (keeps steep slopes inside the box).
      const clip = (x: number, y: number): [number, number] => {
        if (y < yLo && ln.m !== 0) return [(yLo - ln.b) / ln.m, yLo]
        if (y > yHi && ln.m !== 0) return [(yHi - ln.b) / ln.m, yHi]
        return [x, y]
      }
      ;[x0, y0] = clip(x0, y0)
      ;[x1, y1] = clip(x1, y1)
      return { x1: sx(x0), y1: sy(y0), x2: sx(x1), y2: sy(y1) }
    })
  }, [lines, xLo, xHi, yLo, yHi, sx, sy])

  // Active point colour follows the grade state.
  const activeColor =
    status === 'correct'
      ? 'var(--garden-green)'
      : status === 'wrong'
        ? 'var(--note-amber)'
        : 'var(--accent)'

  // Axis labels per variant.
  const xAxisLabel = variant === 'complex' ? 'Re' : 'x'
  const yAxisLabel = variant === 'complex' ? 'Im' : 'y'
  const isUnitCircle = variant === 'unit-circle'

  // Unit-circle cardinal marks (only the ones inside the visible range).
  const cardinalAngles = [0, 90, 180, 270]

  const hasOriginX = xLo <= 0 && xHi >= 0
  const hasOriginY = yLo <= 0 && yHi >= 0
  const originX = hasOriginX ? sx(0) : pad
  const originY = hasOriginY ? sy(0) : VH - pad

  const ptLabel = (p: Pt) =>
    variant === 'complex'
      ? `${fmt(p.x)}${p.y < 0 ? ' − ' : ' + '}${fmt(Math.abs(p.y))}i`
      : `(${fmt(p.x)}, ${fmt(p.y)})`

  return (
    <div
      data-band-context={band}
      style={{ width: '100%', maxWidth: VW, fontFamily: 'var(--font-numeric)' }}
    >
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .milo-cg-pt, .milo-cg-hl { transition: none !important; }
        }
        .milo-cg-pt { transition: fill 200ms var(--ease-smooth), r 200ms var(--ease-smooth); }
        .milo-cg-hl { transition: opacity 200ms var(--ease-smooth); }
      `}</style>
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        width="100%"
        role={interactive ? 'group' : 'img'}
        aria-label={
          mode === 'plot'
            ? `Coordinate grid, ${variant}; tap a lattice point to plot`
            : `Coordinate grid, ${variant}; tap the highlighted feature`
        }
        onClick={interactive ? handleSvgClick : undefined}
        style={{
          display: 'block',
          overflow: 'visible',
          userSelect: 'none',
          cursor: interactive && !graded ? 'crosshair' : 'default',
          touchAction: 'manipulation',
        }}
      >
        {/* ---- Hairline grid ---- */}
        <g>
          {xTicks.map((x) => (
            <line
              key={`gx-${x}`}
              x1={sx(x)}
              y1={pad}
              x2={sx(x)}
              y2={VH - pad}
              stroke="var(--outline)"
              strokeWidth={x === 0 ? 0 : 1}
              opacity={0.18}
            />
          ))}
          {yTicks.map((y) => (
            <line
              key={`gy-${y}`}
              x1={pad}
              y1={sy(y)}
              x2={VW - pad}
              y2={sy(y)}
              stroke="var(--outline)"
              strokeWidth={y === 0 ? 0 : 1}
              opacity={0.18}
            />
          ))}
        </g>

        {/* ---- Axes ---- */}
        <line
          x1={pad}
          y1={originY}
          x2={VW - pad}
          y2={originY}
          stroke="var(--ink-soft)"
          strokeWidth="1.5"
        />
        <line
          x1={originX}
          y1={pad}
          x2={originX}
          y2={VH - pad}
          stroke="var(--ink-soft)"
          strokeWidth="1.5"
        />
        {/* Axis names. */}
        <text
          x={VW - pad + 2}
          y={originY - 6}
          textAnchor="end"
          fontFamily="var(--font-numeric)"
          fontSize="13"
          fontWeight={600}
          fill="var(--ink-soft)"
        >
          {xAxisLabel}
        </text>
        <text
          x={originX + 6}
          y={pad + 2}
          textAnchor="start"
          fontFamily="var(--font-numeric)"
          fontSize="13"
          fontWeight={600}
          fill="var(--ink-soft)"
        >
          {yAxisLabel}
        </text>

        {/* ---- Axis tick labels (skip 0 on each to avoid overlap) ---- */}
        {hasOriginY &&
          xTicks.map((x) =>
            x === 0 ? null : (
              <text
                key={`lx-${x}`}
                x={sx(x)}
                y={originY + 16}
                textAnchor="middle"
                fontFamily="var(--font-numeric)"
                fontSize="11"
                fill="var(--ink-muted)"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {fmt(x)}
              </text>
            ),
          )}
        {hasOriginX &&
          yTicks.map((y) =>
            y === 0 ? null : (
              <text
                key={`ly-${y}`}
                x={originX - 6}
                y={sy(y) + 4}
                textAnchor="end"
                fontFamily="var(--font-numeric)"
                fontSize="11"
                fill="var(--ink-muted)"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {fmt(y)}
              </text>
            ),
          )}
        {/* Origin label. */}
        {hasOriginX && hasOriginY && (
          <text
            x={originX - 6}
            y={originY + 16}
            textAnchor="end"
            fontFamily="var(--font-numeric)"
            fontSize="11"
            fill="var(--ink-muted)"
          >
            0
          </text>
        )}

        {/* ---- Unit circle overlay ---- */}
        {isUnitCircle && hasOriginX && hasOriginY && (
          <g>
            <circle
              cx={sx(0)}
              cy={sy(0)}
              r={Math.abs(sx(1) - sx(0))}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="1.5"
              opacity={0.7}
            />
            {cardinalAngles.map((deg) => {
              const rad = (deg * Math.PI) / 180
              const ux = Math.cos(rad)
              const uy = Math.sin(rad)
              return (
                <line
                  key={`ang-${deg}`}
                  x1={sx(0)}
                  y1={sy(0)}
                  x2={sx(ux)}
                  y2={sy(uy)}
                  stroke="var(--accent)"
                  strokeWidth="1"
                  opacity={0.4}
                />
              )
            })}
          </g>
        )}

        {/* ---- Rendered lines (y = mx + b), clipped ---- */}
        {linePaths.map((lp, i) => (
          <line
            key={`line-${i}`}
            x1={lp.x1}
            y1={lp.y1}
            x2={lp.x2}
            y2={lp.y2}
            stroke="var(--ink-soft)"
            strokeWidth="2"
            opacity={0.85}
          />
        ))}

        {/* ---- Rendered curves (sampled polylines) ---- */}
        {curvePaths.map((d, i) =>
          d ? (
            <path
              key={`curve-${i}`}
              d={d}
              fill="none"
              stroke="var(--ink-soft)"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity={0.85}
            />
          ) : null,
        )}

        {/* ---- Pre-plotted context points (read mode / context) ---- */}
        {points.map((p, i) => (
          <g key={`pt-${i}`}>
            <circle
              cx={sx(p.x)}
              cy={sy(p.y)}
              r={5}
              fill="var(--ink-soft)"
              stroke="var(--paper)"
              strokeWidth="1.5"
            />
          </g>
        ))}

        {/* ---- Highlight target (the feature to tap, read mode) ---- */}
        {highlight != null && (
          <circle
            className="milo-cg-hl"
            cx={sx(highlight.x)}
            cy={sy(highlight.y)}
            r={10}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1.5"
            strokeDasharray="3 3"
            opacity={0.8}
          />
        )}

        {/* ---- The learner's plotted / tapped point ---- */}
        {value != null && (
          <g>
            <circle
              className="milo-cg-pt"
              cx={sx(value.x)}
              cy={sy(value.y)}
              r={graded ? 7 : 6}
              fill={activeColor}
              stroke="var(--paper)"
              strokeWidth="2"
            />
            <text
              x={sx(value.x) + 10}
              y={sy(value.y) - 8}
              textAnchor="start"
              fontFamily="var(--font-numeric)"
              fontSize="12"
              fontWeight={600}
              fill={activeColor}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {ptLabel(value)}
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}
