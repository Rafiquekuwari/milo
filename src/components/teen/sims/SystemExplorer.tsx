'use client'
/**
 * SystemExplorer — the concept "simulation" for the Systems of Equations Field Lab
 * (15-16, dark skin). The learner drags three sliders — the slope and intercept of
 * line A, and the slope of line B (its intercept is fixed for clarity) — and watches
 * both lines plot on the CoordGrid while the intersection (the solution of the
 * system) is marked and read out live.
 *
 *   • parallel lines (equal slope, different intercept) → "no solution"
 *   • same line is avoided by fixing B's intercept apart from A's only when slopes tie
 *   • otherwise the unique (x, y) where they cross is computed and shown.
 *
 * Slider-driven (touch-friendly, testable), instrument look, CSS variables only.
 * Reads the teen theme from the ancestor data-band scope. Mirrors LineExplorer.
 */
import { useEffect, useRef, useState } from 'react'
import type { AgeBand } from '@/components/teen/types'
import CoordGrid from '@/components/teen/CoordGrid'

export interface SystemExplorerProps {
  band: AgeBand
  /** Called once on mount so a host (lesson / explore step) can unlock "Continue". */
  onReady?: () => void
}

const RANGE = 8 // grid spans -8..8

/** Pretty signed number with a real minus sign. */
const sg = (n: number) => (n < 0 ? `−${Math.abs(n)}` : String(n))

function eq(label: string, m: number, b: number): string {
  const mPart = m === 1 ? 'x' : m === -1 ? '−x' : `${m < 0 ? '−' : ''}${Math.abs(m)}x`
  if (b === 0) return `${label}:  y = ${mPart}`
  return `${label}:  y = ${mPart} ${b < 0 ? '−' : '+'} ${Math.abs(b)}`
}

/** Round to 2 dp, collapse −0. */
const r2 = (n: number) => {
  const v = Math.round(n * 100) / 100
  return v === 0 ? 0 : v
}

function Slider({ label, value, min, max, onChange }: {
  label: string; value: number; min: number; max: number; onChange: (n: number) => void
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', fontFamily: 'var(--font-body)' }}>
      <span style={{ width: 92, fontSize: 14, color: 'var(--ink-soft)' }}>{label}</span>
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
        {sg(value)}
      </span>
    </label>
  )
}

export default function SystemExplorer({ band, onReady }: SystemExplorerProps) {
  // Line A: y = mA x + bA ; Line B: y = mB x + bB (bB fixed for a clean two-knob feel on B).
  const [mA, setMA] = useState(2)
  const [bA, setBA] = useState(-3)
  const [mB, setMB] = useState(-1)
  const bB = 4

  const readyRef = useRef(onReady)
  readyRef.current = onReady
  useEffect(() => { readyRef.current?.() }, [])

  const parallel = mA === mB
  const sameLine = mA === mB && bA === bB
  // Intersection: mA x + bA = mB x + bB → x = (bB − bA)/(mA − mB).
  const xSol = parallel ? null : (bB - bA) / (mA - mB)
  const ySol = xSol == null ? null : mA * xSol + bA
  const integerHit = xSol != null && Number.isInteger(xSol) && Number.isInteger(ySol as number)
  // Only place a marker dot when the crossing lands on a lattice point inside the view.
  const showMark =
    integerHit &&
    (xSol as number) >= -RANGE && (xSol as number) <= RANGE &&
    (ySol as number) >= -RANGE && (ySol as number) <= RANGE

  let readout: React.ReactNode
  if (sameLine) {
    readout = <><strong style={{ color: 'var(--ink)' }}>Same line</strong> — infinitely many solutions.</>
  } else if (parallel) {
    readout = <><strong style={{ color: 'var(--note-amber)' }}>Parallel</strong> — no solution (the lines never meet).</>
  } else {
    readout = <>They cross at <strong style={{ color: 'var(--accent)' }}>({r2(xSol as number)}, {r2(ySol as number)})</strong> — the one (x, y) that solves both.</>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%', maxWidth: 380 }}>
      <div style={{ width: '100%' }}>
        <CoordGrid
          band={band}
          xRange={[-RANGE, RANGE]}
          yRange={[-RANGE, RANGE]}
          mode="read"
          lines={[{ kind: 'line', m: mA, b: bA }, { kind: 'line', m: mB, b: bB }]}
          highlight={showMark ? { x: xSol as number, y: ySol as number } : null}
          points={showMark ? [{ x: xSol as number, y: ySol as number }] : []}
        />
      </div>

      {/* Live equations readout */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontFamily: 'var(--font-numeric)', fontSize: 20, fontWeight: 600, color: 'var(--accent)', letterSpacing: '0.01em', minHeight: 56, textAlign: 'center' }}>
        <div>{eq('A', mA, bA)}</div>
        <div style={{ color: 'var(--ink-soft)' }}>{eq('B', mB, bB)}</div>
      </div>

      {/* Sliders */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
        <Slider label="A: slope" value={mA} min={-4} max={4} onChange={setMA} />
        <Slider label="A: intercept" value={bA} min={-6} max={6} onChange={setBA} />
        <Slider label="B: slope" value={mB} min={-4} max={4} onChange={setMB} />
      </div>

      {/* Plain-language live read-out of the solution. */}
      <p style={{ margin: 0, textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.5, color: 'var(--ink-soft)' }}>
        The <strong style={{ color: 'var(--ink)' }}>solution</strong> of a system is where the lines meet.<br />
        {readout}
      </p>
    </div>
  )
}
