'use client'
/**
 * LineExplorer — an interactive concept "simulation" for the Field Lab (teen).
 *
 * The learner drags the slope (m) and intercept (b) sliders and watches the line,
 * the equation y = mx + b, and the rise/run all update live (PhET / Desmos style).
 * Slider-driven (not free-drag) so it's touch-friendly, accessible, and testable.
 * Mature Field Lab look — an instrument, not a cartoon. Reads theme from the
 * ancestor data-band scope; colours/fonts via CSS variables only.
 */
import { useEffect, useRef, useState } from 'react'
import type { AgeBand } from '@/components/teen/types'
import CoordGrid from '@/components/teen/CoordGrid'

export interface LineExplorerProps {
  band: AgeBand
  /** Called once on mount so a host (lesson/explore step) can unlock "Continue". */
  onReady?: () => void
}

const RANGE = 8 // grid spans -8..8

function eq(m: number, b: number): string {
  // m === 0 → a horizontal line; the x-term vanishes (avoid the ugly "0x").
  if (m === 0) return `y = ${b < 0 ? '−' : ''}${Math.abs(b)}`
  const mPart = m === 1 ? 'x' : m === -1 ? '−x' : `${m < 0 ? '−' : ''}${Math.abs(m)}x`
  if (b === 0) return `y = ${mPart}`
  return `y = ${mPart} ${b < 0 ? '−' : '+'} ${Math.abs(b)}`
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
        {value < 0 ? `−${Math.abs(value)}` : value}
      </span>
    </label>
  )
}

export default function LineExplorer({ band, onReady }: LineExplorerProps) {
  const [m, setM] = useState(2)
  const [b, setB] = useState(1)
  const readyRef = useRef(onReady)
  readyRef.current = onReady
  useEffect(() => { readyRef.current?.() }, [])

  const riseText = m === 0
    ? 'flat — y never changes'
    : `for every 1 step right, the line goes ${m > 0 ? 'up' : 'down'} ${Math.abs(m)}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%', maxWidth: 380 }}>
      <div style={{ width: '100%' }}>
        <CoordGrid
          band={band}
          xRange={[-RANGE, RANGE]}
          yRange={[-RANGE, RANGE]}
          mode="read"
          lines={[{ kind: 'line', m, b }]}
          points={[{ x: 0, y: b }]}
        />
      </div>

      {/* Live equation readout */}
      <div style={{
        fontFamily: 'var(--font-numeric)', fontSize: 26, fontWeight: 600, color: 'var(--accent)',
        letterSpacing: '0.01em', minHeight: 34,
      }}>
        {eq(m, b)}
      </div>

      {/* Sliders */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
        <Slider label="slope (m)" value={m} min={-4} max={4} onChange={setM} />
        <Slider label="intercept (b)" value={b} min={-6} max={6} onChange={setB} />
      </div>

      {/* Plain-language read-out of what changed */}
      <p style={{ margin: 0, textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.5, color: 'var(--ink-soft)' }}>
        <strong style={{ color: 'var(--ink)' }}>Slope {m < 0 ? `−${Math.abs(m)}` : m}:</strong> {riseText}.<br />
        <strong style={{ color: 'var(--ink)' }}>Intercept {b < 0 ? `−${Math.abs(b)}` : b}:</strong> the line crosses the y-axis there.
      </p>
    </div>
  )
}
