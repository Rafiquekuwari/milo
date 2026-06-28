'use client'
/**
 * ExpressionEvaluator — an interactive concept "simulation" for the Field Lab (teen).
 *
 * A fixed expression (3x + 2). The learner drags x (−5..5) and watches the
 * substitution resolve live: 3·x + 2 → 3·(value) + 2 → value. The same x is
 * plotted on a CoordGrid against the line y = 3x + 2 so the abstract rule and
 * its graph move together (PhET / Desmos style). Slider-driven (not free-drag)
 * so it's touch-friendly, accessible, and testable. Mature Field Lab look — an
 * instrument, not a cartoon. Colours/fonts via CSS variables only.
 */
import { useEffect, useRef, useState } from 'react'
import type { AgeBand } from '@/components/teen/types'
import CoordGrid from '@/components/teen/CoordGrid'

export interface ExpressionEvaluatorProps {
  band: AgeBand
  /** Called once on mount so a host (lesson/explore step) can unlock "Continue". */
  onReady?: () => void
}

// Fixed expression: a·x + b  (3x + 2)
const A = 3
const B = 2
const RANGE = 8 // grid spans -8..8
// Keep x within a range where the plotted point (x, A·x+B) stays on the visible
// grid: A·X_MAX + B ≤ RANGE and A·X_MIN + B ≥ -RANGE → x ∈ [-2, 2] for 3x+2.
const X_MIN = -2
const X_MAX = 2

/** Pretty signed integer with a real minus sign. */
const fmt = (n: number) => (n < 0 ? `−${Math.abs(n)}` : String(n))
/** Parenthesised value for the substitution step: 3·(−4). */
const paren = (n: number) => (n < 0 ? `(−${Math.abs(n)})` : String(n))

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
        {fmt(value)}
      </span>
    </label>
  )
}

export default function ExpressionEvaluator({ band, onReady }: ExpressionEvaluatorProps) {
  const [x, setX] = useState(1)
  const readyRef = useRef(onReady)
  readyRef.current = onReady
  useEffect(() => { readyRef.current?.() }, [])

  const value = A * x + B

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%', maxWidth: 380 }}>
      <div style={{ width: '100%' }}>
        <CoordGrid
          band={band}
          xRange={[-RANGE, RANGE]}
          yRange={[-RANGE, RANGE]}
          mode="read"
          lines={[{ kind: 'line', m: A, b: B }]}
          points={[{ x, y: value }]}
          highlight={{ x, y: value }}
        />
      </div>

      {/* The fixed expression */}
      <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
        the expression
      </div>
      <div style={{ fontFamily: 'var(--font-numeric)', fontSize: 22, fontWeight: 600, color: 'var(--ink)', marginTop: -8 }}>
        {A}x {B < 0 ? '−' : '+'} {Math.abs(B)}
      </div>

      {/* Live substitution readout: 3·x + 2 = 3·(value) + 2 = result */}
      <div style={{
        fontFamily: 'var(--font-numeric)', fontVariantNumeric: 'tabular-nums',
        fontSize: 24, fontWeight: 600, color: 'var(--accent)',
        letterSpacing: '0.01em', minHeight: 34, textAlign: 'center', lineHeight: 1.4,
      }}>
        {A}·{paren(x)} {B < 0 ? '−' : '+'} {Math.abs(B)} = {fmt(value)}
      </div>

      {/* The slider */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
        <Slider label="x" value={x} min={X_MIN} max={X_MAX} onChange={setX} />
      </div>

      {/* Plain-language read-out of what's happening */}
      <p style={{ margin: 0, textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.5, color: 'var(--ink-soft)' }}>
        Set <strong style={{ color: 'var(--ink)' }}>x = {fmt(x)}</strong>, and the
        expression is worth <strong style={{ color: 'var(--ink)' }}>{fmt(value)}</strong>.
        That pair <span style={{ fontFamily: 'var(--font-numeric)' }}>({fmt(x)}, {fmt(value)})</span> is
        the point on the line.
      </p>
    </div>
  )
}
