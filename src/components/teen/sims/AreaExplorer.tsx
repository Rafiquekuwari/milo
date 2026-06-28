'use client'
/**
 * AreaExplorer — an interactive concept "simulation" for the Field Lab (teen).
 *
 * The learner drags the base (b) and height (h) sliders and watches a rectangle
 * and a triangle resize live, with the two area formulas — rectangle b×h and
 * triangle ½×b×h — recomputing in real time (PhET / Desmos style). Slider-driven
 * (not free-drag) so it's touch-friendly, accessible, and testable. Mature Field
 * Lab look — an instrument, not a cartoon. Reads theme from the ancestor
 * data-band scope; colours/fonts via CSS variables only.
 */
import { useEffect, useRef, useState } from 'react'
import type { AgeBand } from '@/components/teen/types'

export interface AreaExplorerProps {
  band: AgeBand
  /** Called once on mount so a host (lesson/explore step) can unlock "Continue". */
  onReady?: () => void
}

const MIN = 1
const MAX = 10

// Inline-SVG drawing space. Both shapes share a baseline; a unit-cell maps each
// slider step to a fixed pixel size so the figures grow proportionally on screen.
const VB_W = 320
const VB_H = 240
const PAD_L = 40
const PAD_B = 40
const CELL = 18 // px per unit (10 units → 180px, fits inside the box)

function Slider({ label, value, onChange }: {
  label: string; value: number; onChange: (n: number) => void
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', fontFamily: 'var(--font-body)' }}>
      <span style={{ width: 70, fontSize: 14, color: 'var(--ink-soft)' }}>{label}</span>
      <input
        type="range"
        min={MIN}
        max={MAX}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ flex: 1, accentColor: 'var(--accent)', cursor: 'pointer' }}
        aria-label={label}
      />
      <span style={{ width: 32, textAlign: 'right', fontFamily: 'var(--font-numeric)', fontVariantNumeric: 'tabular-nums', fontSize: 16, fontWeight: 600, color: 'var(--accent)' }}>
        {value}
      </span>
    </label>
  )
}

// Render a half-integer area cleanly (e.g. 22.5 → "22½", 24 → "24").
function halfArea(n: number): string {
  const whole = Math.floor(n)
  const isHalf = n - whole === 0.5
  if (isHalf) return whole === 0 ? '½' : `${whole}½`
  return String(n)
}

export default function AreaExplorer({ band, onReady }: AreaExplorerProps) {
  void band
  const [b, setB] = useState(6)
  const [h, setH] = useState(4)
  const readyRef = useRef(onReady)
  readyRef.current = onReady
  useEffect(() => { readyRef.current?.() }, [])

  const rectArea = b * h
  const triArea = (b * h) / 2

  // Pixel geometry: baseline at the bottom, shapes grow up-and-right from the
  // bottom-left anchor. The rectangle is drawn behind a half-shading; the
  // triangle (same base & height) is overlaid so the ½ relationship is visible.
  const baseY = VB_H - PAD_B
  const x0 = PAD_L
  const wPx = b * CELL
  const hPx = h * CELL
  const topY = baseY - hPx
  const rightX = x0 + wPx
  // Triangle: same base, apex above the left end (a right-triangle so it tiles
  // the rectangle into two equal halves).
  const triPts = `${x0},${baseY} ${rightX},${baseY} ${x0},${topY}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%', maxWidth: 380 }}>
      {/* Live resizing figure */}
      <div style={{ width: '100%', maxWidth: 340 }}>
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          role="img"
          aria-label={`Rectangle and triangle with base ${b} and height ${h}`}
          style={{
            display: 'block',
            width: '100%',
            height: 'auto',
            border: '1px solid var(--outline)',
            borderRadius: 8,
            background: 'var(--paper)',
          }}
        >
          {/* Rectangle outline (the full b×h area) */}
          <rect
            x={x0}
            y={topY}
            width={wPx}
            height={hPx}
            fill="var(--bg-1)"
            stroke="var(--ink-soft)"
            strokeWidth={1}
          />
          {/* Triangle (½ of the same rectangle), accent-tinted */}
          <polygon
            points={triPts}
            fill="color-mix(in srgb, var(--accent) 18%, transparent)"
            stroke="var(--accent)"
            strokeWidth={2}
            strokeLinejoin="round"
          />

          {/* base measure */}
          <line x1={x0} y1={baseY} x2={rightX} y2={baseY} stroke="var(--ink-soft)" strokeWidth={1} />
          <text
            x={(x0 + rightX) / 2}
            y={baseY + 22}
            textAnchor="middle"
            style={{ fontFamily: 'var(--font-numeric)', fontSize: 14, fill: 'var(--ink-soft)' }}
          >
            b = {b}
          </text>

          {/* height measure */}
          <line x1={x0} y1={baseY} x2={x0} y2={topY} stroke="var(--ink-soft)" strokeWidth={1} />
          <text
            x={x0 - 12}
            y={(baseY + topY) / 2}
            textAnchor="end"
            dominantBaseline="middle"
            style={{ fontFamily: 'var(--font-numeric)', fontSize: 14, fill: 'var(--ink-soft)' }}
          >
            h = {h}
          </text>
        </svg>
      </div>

      {/* Live formula readouts */}
      <div style={{ display: 'flex', gap: 12, width: '100%' }}>
        <div style={{ flex: 1, border: '1px solid var(--outline)', borderRadius: 10, padding: '10px 12px', background: 'var(--bg-2)' }}>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--ink-muted)', marginBottom: 4 }}>Rectangle</div>
          <div style={{ fontFamily: 'var(--font-numeric)', fontVariantNumeric: 'tabular-nums', fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>
            {b} × {h} = <span style={{ color: 'var(--accent)' }}>{rectArea}</span>
          </div>
        </div>
        <div style={{ flex: 1, border: '1px solid var(--outline)', borderRadius: 10, padding: '10px 12px', background: 'var(--bg-2)' }}>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--ink-muted)', marginBottom: 4 }}>Triangle</div>
          <div style={{ fontFamily: 'var(--font-numeric)', fontVariantNumeric: 'tabular-nums', fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>
            ½ × {b} × {h} = <span style={{ color: 'var(--accent)' }}>{halfArea(triArea)}</span>
          </div>
        </div>
      </div>

      {/* Sliders */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
        <Slider label="base (b)" value={b} onChange={setB} />
        <Slider label="height (h)" value={h} onChange={setH} />
      </div>

      {/* Plain-language read-out of what changed */}
      <p style={{ margin: 0, textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.5, color: 'var(--ink-soft)' }}>
        The rectangle covers <strong style={{ color: 'var(--ink)' }}>{rectArea}</strong> unit squares.
        The triangle is exactly <strong style={{ color: 'var(--ink)' }}>half</strong> of it —{' '}
        <strong style={{ color: 'var(--ink)' }}>{halfArea(triArea)}</strong> — because it&apos;s one of the two equal pieces the diagonal makes.
      </p>
    </div>
  )
}
