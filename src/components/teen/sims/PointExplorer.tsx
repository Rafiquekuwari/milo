'use client'
/**
 * PointExplorer — an interactive concept "simulation" for the Field Lab (teen).
 *
 * The learner drags the x and y sliders and watches a single point move on the
 * coordinate plane, with the ordered pair and the quadrant (or axis) it sits in
 * updating live. Slider-driven (not free-drag) so it's touch-friendly,
 * accessible, and testable. Mature Field Lab look — an instrument, not a
 * cartoon. Reads theme from the ancestor data-band scope; colours/fonts via CSS
 * variables only.
 */
import { useEffect, useRef, useState } from 'react'
import type { AgeBand, Pt } from '@/components/teen/types'
import CoordGrid from '@/components/teen/CoordGrid'

export interface PointExplorerProps {
  band: AgeBand
  /** Called once on mount so a host (lesson/explore step) can unlock "Continue". */
  onReady?: () => void
}

const RANGE = 6 // grid spans -6..6

const neg = (n: number) => (n < 0 ? `−${Math.abs(n)}` : `${n}`)

/** Where the point sits: a quadrant, an axis, or the origin. */
function locationOf(p: Pt): string {
  if (p.x === 0 && p.y === 0) return 'the origin'
  if (p.y === 0) return 'the x-axis'
  if (p.x === 0) return 'the y-axis'
  if (p.x > 0 && p.y > 0) return 'Quadrant I'
  if (p.x < 0 && p.y > 0) return 'Quadrant II'
  if (p.x < 0 && p.y < 0) return 'Quadrant III'
  return 'Quadrant IV'
}

/** One plain-language line describing how to reach the point from the origin. */
function pathOf(p: Pt): string {
  if (p.x === 0 && p.y === 0) return 'it sits right on the origin where the axes cross'
  const xPart = p.x === 0 ? '' : `${Math.abs(p.x)} ${p.x < 0 ? 'left' : 'right'}`
  const yPart = p.y === 0 ? '' : `${Math.abs(p.y)} ${p.y < 0 ? 'down' : 'up'}`
  if (!xPart) return `from the origin, go ${yPart}`
  if (!yPart) return `from the origin, go ${xPart}`
  return `from the origin, go ${xPart}, then ${yPart}`
}

function Slider({ label, value, min, max, onChange }: {
  label: string; value: number; min: number; max: number; onChange: (n: number) => void
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', fontFamily: 'var(--font-body)' }}>
      <span style={{ width: 64, fontSize: 14, color: 'var(--ink-soft)' }}>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ flex: 1, accentColor: 'var(--accent)', cursor: 'pointer' }}
        aria-label={label}
      />
      <span style={{ width: 40, textAlign: 'right', fontFamily: 'var(--font-numeric)', fontVariantNumeric: 'tabular-nums', fontSize: 16, fontWeight: 600, color: 'var(--accent)' }}>
        {neg(value)}
      </span>
    </label>
  )
}

export default function PointExplorer({ band, onReady }: PointExplorerProps) {
  const [x, setX] = useState(3)
  const [y, setY] = useState(2)
  const readyRef = useRef(onReady)
  readyRef.current = onReady
  useEffect(() => { readyRef.current?.() }, [])

  const point: Pt = { x, y }
  const where = locationOf(point)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%', maxWidth: 380 }}>
      <div style={{ width: '100%' }}>
        <CoordGrid
          band={band}
          xRange={[-RANGE, RANGE]}
          yRange={[-RANGE, RANGE]}
          mode="read"
          points={[point]}
        />
      </div>

      {/* Live coordinate readout */}
      <div style={{
        fontFamily: 'var(--font-numeric)', fontSize: 26, fontWeight: 600, color: 'var(--accent)',
        letterSpacing: '0.01em', minHeight: 34,
      }}>
        ({neg(x)}, {neg(y)})
      </div>

      {/* Sliders */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
        <Slider label="x" value={x} min={-RANGE} max={RANGE} onChange={setX} />
        <Slider label="y" value={y} min={-RANGE} max={RANGE} onChange={setY} />
      </div>

      {/* Plain-language read-out of where the point is */}
      <p style={{ margin: 0, textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.5, color: 'var(--ink-soft)' }}>
        <strong style={{ color: 'var(--ink)' }}>({neg(x)}, {neg(y)})</strong> is in <strong style={{ color: 'var(--ink)' }}>{where}</strong>.<br />
        The x comes first, then the y — {pathOf(point)}.
      </p>
    </div>
  )
}
