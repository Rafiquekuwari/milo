'use client'

/**
 * StudioSkyline — 15-16 ambient meta-reward.
 *
 * An isometric studio skyline drawn in pure SVG. Each shipped commission (a
 * mastered 15-16 chapter) adds one building block to the city; the city grows
 * quietly as the learner ships work. No counters with stars/coins, no confetti,
 * no bounce — calm, dark-studio palette read entirely from the ancestor
 * `data-band` scope (we only consume CSS variables).
 *
 * Theme: blocks render in --bg-2 faces with --outline hairlines; the most
 * recently shipped block is tinted with --accent; unfilled plots are faint
 * dashed footprints in --ink-muted. Numbers (the shipped count) use
 * --font-numeric.
 */

export interface StudioSkylineProps {
  /** number of mastered 15-16 chapters (buildings shown) */
  shipped: number
  /** optional cap on plots; faint footprints are drawn for the remainder */
  max?: number
}

// Isometric projection: a tile footprint maps a (col,row) plot to a 2D anchor.
const TILE_W = 56 // half-width of a tile diamond
const TILE_H = 28 // half-height of a tile diamond
const COLS = 4 // plots per row in the grid

// Deterministic per-plot building height (calm, varied but stable).
function heightFor(index: number): number {
  // a small repeating profile so the skyline reads as intentional, not random
  const profile = [54, 88, 36, 110, 72, 44, 96, 62]
  return profile[index % profile.length]
}

export default function StudioSkyline({ shipped, max }: StudioSkylineProps) {
  const built = Math.max(0, Math.floor(shipped))
  const cap = max != null ? Math.max(built, Math.floor(max)) : built
  // total plots to lay out: at least one row, enough to show every plot + a little room
  const totalPlots = Math.max(cap, built, COLS)
  const rows = Math.ceil(totalPlots / COLS)

  // Lay plots back-to-front (far rows first) so nearer blocks overlap correctly.
  type Plot = { index: number; col: number; row: number }
  const plots: Plot[] = []
  for (let i = 0; i < totalPlots; i++) {
    plots.push({ index: i, col: i % COLS, row: Math.floor(i / COLS) })
  }
  plots.sort((a, b) => a.row - b.row || a.col - b.col)

  // Project a plot's ground-center to canvas coords.
  const project = (col: number, row: number) => {
    const x = (col - row) * TILE_W
    const y = (col + row) * TILE_H
    return { x, y }
  }

  // Compute the bounds so the viewBox frames the whole city with margin.
  const tallest = Math.max(...plots.map((p) => heightFor(p.index)), 0)
  const xs: number[] = []
  const ys: number[] = []
  for (const p of plots) {
    const { x, y } = project(p.col, p.row)
    xs.push(x - TILE_W, x + TILE_W)
    ys.push(y - heightFor(p.index) - TILE_H, y + TILE_H)
  }
  const margin = 24
  const minX = Math.min(...xs) - margin
  const maxX = Math.max(...xs) + margin
  const minY = Math.min(...ys) - margin
  const maxY = Math.max(...ys) + margin
  const vbW = maxX - minX
  const vbH = maxY - minY

  const headline =
    built === 0
      ? 'No commissions shipped yet'
      : `${built}${cap > built ? ` / ${cap}` : ''} shipped`

  return (
    <section
      aria-label={`Studio skyline: ${built} commission${built === 1 ? '' : 's'} shipped${
        max != null ? ` of ${cap}` : ''
      }`}
      style={{
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        padding: '1.25rem',
        border: '1px solid var(--outline)',
        borderRadius: '12px',
        background: 'var(--bg-1)',
        color: 'var(--ink)',
        fontFamily: 'var(--font-body)',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: '0.75rem',
        }}
      >
        <h3
          style={{
            margin: 0,
            fontFamily: 'var(--font-body)',
            fontSize: '0.875rem',
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: 'var(--ink-soft)',
          }}
        >
          Studio
        </h3>
        <span
          aria-hidden="true"
          style={{
            fontFamily: 'var(--font-numeric)',
            fontVariantNumeric: 'tabular-nums',
            fontSize: '0.8125rem',
            color: 'var(--ink-muted)',
            whiteSpace: 'nowrap',
          }}
        >
          {headline}
        </span>
      </header>

      <svg
        viewBox={`${minX} ${minY} ${vbW} ${vbH}`}
        role="img"
        aria-hidden="true"
        preserveAspectRatio="xMidYMax meet"
        style={{ display: 'block', width: '100%', height: 'auto', overflow: 'visible' }}
      >
        {plots.map((p) => {
          const isBuilt = p.index < built
          const isNewest = isBuilt && p.index === built - 1
          const { x, y } = project(p.col, p.row)
          if (!isBuilt) {
            return <Footprint key={p.index} cx={x} cy={y} />
          }
          return (
            <Building
              key={p.index}
              cx={x}
              cy={y}
              height={heightFor(p.index)}
              newest={isNewest}
              tallest={tallest}
            />
          )
        })}
      </svg>
    </section>
  )
}

/** A faint dashed isometric tile — an empty plot awaiting a future commission. */
function Footprint({ cx, cy }: { cx: number; cy: number }) {
  const top = `${cx},${cy - TILE_H} ${cx + TILE_W},${cy} ${cx},${cy + TILE_H} ${cx - TILE_W},${cy}`
  return (
    <polygon
      points={top}
      fill="none"
      stroke="var(--ink-muted)"
      strokeWidth={1}
      strokeDasharray="3 4"
      opacity={0.5}
    />
  )
}

/**
 * One isometric block: a top diamond + left and right faces. Built blocks read
 * in --bg-2 with --outline hairlines; the newest gets an --accent-tinted top so
 * the just-shipped commission is gently legible without any celebration.
 */
function Building({
  cx,
  cy,
  height,
  newest,
  tallest,
}: {
  cx: number
  cy: number
  height: number
  newest: boolean
  tallest: number
}) {
  // Top diamond, raised by `height`.
  const tY = cy - height
  const top = `${cx},${tY - TILE_H} ${cx + TILE_W},${tY} ${cx},${tY + TILE_H} ${cx - TILE_W},${tY}`
  // Left face (front-left wall): from top-left edge down to ground.
  const left = `${cx - TILE_W},${tY} ${cx},${tY + TILE_H} ${cx},${cy + TILE_H} ${cx - TILE_W},${cy}`
  // Right face (front-right wall).
  const right = `${cx + TILE_W},${tY} ${cx},${tY + TILE_H} ${cx},${cy + TILE_H} ${cx + TILE_W},${cy}`

  const topFill = newest ? 'var(--accent)' : 'var(--bg-2)'
  // Faces stay neutral; we lean on hairlines + opacity for the two-tone read.
  const leftOpacity = 0.92
  const rightOpacity = 0.78

  // A couple of quiet "window" ticks scaled to a tall-ish block — pure structure,
  // no glow. Skip on short blocks to keep them clean.
  const showWindow = height > tallest * 0.5

  return (
    <g
      style={{
        transition: 'opacity 240ms var(--ease-smooth)',
      }}
    >
      {/* right face */}
      <polygon
        points={right}
        fill="var(--bg-2)"
        stroke="var(--outline)"
        strokeWidth={1}
        strokeLinejoin="round"
        opacity={rightOpacity}
      />
      {/* left face */}
      <polygon
        points={left}
        fill="var(--bg-2)"
        stroke="var(--outline)"
        strokeWidth={1}
        strokeLinejoin="round"
        opacity={leftOpacity}
      />
      {/* top */}
      <polygon
        points={top}
        fill={topFill}
        stroke="var(--outline)"
        strokeWidth={1}
        strokeLinejoin="round"
        opacity={newest ? 0.85 : 1}
      />
      {showWindow && (
        <>
          <line
            x1={cx - TILE_W * 0.5}
            y1={tY + TILE_H * 0.5 + 14}
            x2={cx - TILE_W * 0.5}
            y2={cy - height * 0.4}
            stroke="var(--outline)"
            strokeWidth={1}
            opacity={0.6}
          />
          <line
            x1={cx + TILE_W * 0.5}
            y1={tY + TILE_H * 0.5 + 14}
            x2={cx + TILE_W * 0.5}
            y2={cy - height * 0.4}
            stroke="var(--outline)"
            strokeWidth={1}
            opacity={0.45}
          />
        </>
      )}
    </g>
  )
}
