'use client'
/**
 * GrowthExplorer — a concept "simulation" for the Field Lab (15–16, "studio").
 *
 * The learner drags a single rate slider and watches two functions race on one
 * CoordGrid: a LINEAR model y = a·x (steady, constant step) and an EXPONENTIAL
 * model y = bˣ (compounding). A live read-out names the crossover — the x where
 * the exponential curve overtakes the line — so the big idea (exponential always
 * wins eventually) is something you *see*, not just hear. Slider-driven (not
 * free-drag) so it's touch-friendly and testable. Mature studio look; colours and
 * fonts via CSS variables only (theme comes from the ancestor data-band scope).
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import type { AgeBand } from '@/components/teen/types'
import CoordGrid from '@/components/teen/CoordGrid'

export interface GrowthExplorerProps {
  band: AgeBand
  /** Called once on mount so a host (explore step) can unlock "Continue". */
  onReady?: () => void
}

const X_MAX = 8
const Y_MAX = 16

/** First whole-number x in [1, X_MAX] where bˣ ≥ a·x. */
function crossover(a: number, b: number): number | null {
  for (let x = 1; x <= X_MAX; x++) {
    if (Math.pow(b, x) >= a * x) return x
  }
  return null
}

function Slider({ label, value, min, max, step, suffix, onChange }: {
  label: string; value: number; min: number; max: number; step: number; suffix?: string; onChange: (n: number) => void
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', fontFamily: 'var(--font-body)' }}>
      <span style={{ width: 96, fontSize: 14, color: 'var(--ink-soft)' }}>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ flex: 1, accentColor: 'var(--accent)', cursor: 'pointer' }}
        aria-label={label}
      />
      <span style={{ width: 48, textAlign: 'right', fontFamily: 'var(--font-numeric)', fontVariantNumeric: 'tabular-nums', fontSize: 16, fontWeight: 600, color: 'var(--accent)' }}>
        {value}{suffix ?? ''}
      </span>
    </label>
  )
}

export default function GrowthExplorer({ band, onReady }: GrowthExplorerProps) {
  // a = linear rate (per step), b = exponential base (per step).
  const [a, setA] = useState(2)
  const [b, setB] = useState(2)
  const readyRef = useRef(onReady)
  readyRef.current = onReady
  useEffect(() => { readyRef.current?.() }, [])

  const linear = useMemo(() => ({ kind: 'line' as const, m: a, b: 0 }), [a])
  const expo = useMemo(() => ({ kind: 'curve' as const, fn: (x: number) => Math.pow(b, x) }), [b])

  const cross = crossover(a, b)
  const overtakes = cross !== null
    ? `The curve y = ${b}ˣ overtakes the line y = ${a}x at about x = ${cross}.`
    : `Within this window the line y = ${a}x is still ahead — but keep going and the curve always wins.`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%', maxWidth: 400 }}>
      <div style={{ width: '100%' }}>
        <CoordGrid
          band={band}
          xRange={[0, X_MAX]}
          yRange={[0, Y_MAX]}
          step={2}
          mode="read"
          lines={[linear]}
          curves={[expo]}
        />
      </div>

      {/* Live readout of the two models */}
      <div style={{ display: 'flex', gap: 18, fontFamily: 'var(--font-numeric)', fontSize: 22, fontWeight: 600, minHeight: 30 }}>
        <span style={{ color: 'var(--ink-soft)' }}>y = {a}x</span>
        <span style={{ color: 'var(--accent)' }}>y = {b}ˣ</span>
      </div>

      {/* Sliders */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
        <Slider label="linear rate a" value={a} min={1} max={6} step={1} onChange={setA} />
        <Slider label="exp. base b" value={b} min={2} max={4} step={1} onChange={setB} />
      </div>

      {/* Plain-language read-out of the crossover */}
      <p style={{ margin: 0, textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.5, color: 'var(--ink-soft)' }}>
        <strong style={{ color: 'var(--ink)' }}>Linear</strong> adds {a} every step — a straight line.{' '}
        <strong style={{ color: 'var(--ink)' }}>Exponential</strong> multiplies by {b} every step — it bends upward.<br />
        {overtakes}
      </p>
    </div>
  )
}
