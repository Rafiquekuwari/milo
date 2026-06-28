'use client'
/**
 * FractionBarsExplorer — an interactive concept "simulation" for the Field Lab (teen).
 *
 * The learner sets the numerator/denominator of TWO fractions with sliders and
 * watches an area model build live: a unit square split n1/d1 horizontally and
 * n2/d2 vertically. The overlap (the doubly-shaded cells) IS the product, and the
 * live readout shows (n1/d1) × (n2/d2) = product (simplified). Slider-driven (not
 * free-drag) so it's touch-friendly, accessible, and testable. Mature Field Lab
 * look — an instrument, not a cartoon. Reads theme from the ancestor data-band
 * scope; colours/fonts via CSS variables only.
 */
import { useEffect, useRef, useState } from 'react'
import type { AgeBand } from '@/components/teen/types'

export interface FractionBarsExplorerProps {
  band: AgeBand
  /** Called once on mount so a host (lesson/explore step) can unlock "Continue". */
  onReady?: () => void
}

const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b))
function reduce(n: number, d: number): { n: number; d: number } {
  const g = gcd(n, d) || 1
  return { n: n / g, d: d / g }
}

function Slider({ label, value, min, max, onChange }: {
  label: string; value: number; min: number; max: number; onChange: (n: number) => void
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', fontFamily: 'var(--font-body)' }}>
      <span style={{ width: 96, fontSize: 14, color: 'var(--ink-soft)' }}>{label}</span>
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
      <span style={{ width: 28, textAlign: 'right', fontFamily: 'var(--font-numeric)', fontVariantNumeric: 'tabular-nums', fontSize: 16, fontWeight: 600, color: 'var(--accent)' }}>
        {value}
      </span>
    </label>
  )
}

const SVG = 240
const PAD = 1 // hairline inset so outer border isn't clipped

export default function FractionBarsExplorer({ band, onReady }: FractionBarsExplorerProps) {
  void band
  const [d1, setD1] = useState(2) // first fraction denominator (columns)
  const [n1, setN1] = useState(1)
  const [d2, setD2] = useState(3) // second fraction denominator (rows)
  const [n2, setN2] = useState(2)

  const readyRef = useRef(onReady)
  readyRef.current = onReady
  useEffect(() => { readyRef.current?.() }, [])

  // Keep each numerator within 1..denominator as the denominator changes.
  function setDen1(d: number) { setD1(d); if (n1 > d) setN1(d) }
  function setDen2(d: number) { setD2(d); if (n2 > d) setN2(d) }

  const prodN = n1 * n2
  const prodD = d1 * d2
  const r = reduce(prodN, prodD)

  // Geometry: columns = d1 (vertical splits), rows = d2 (horizontal splits).
  const inner = SVG - PAD * 2
  const colW = inner / d1
  const rowH = inner / d2

  const cells: React.ReactNode[] = []
  for (let c = 0; c < d1; c++) {
    for (let row = 0; row < d2; row++) {
      const inN1 = c < n1
      const inN2 = row < n2
      const overlap = inN1 && inN2
      // Base: unshaded. First fraction's columns get a soft vertical tint;
      // second fraction's rows get a soft horizontal tint; the overlap is solid.
      let fill = 'transparent'
      let opacity = 1
      if (overlap) { fill = 'var(--accent)'; opacity = 1 }
      else if (inN1) { fill = 'var(--accent)'; opacity = 0.22 }
      else if (inN2) { fill = 'var(--accent)'; opacity = 0.22 }
      cells.push(
        <rect
          key={`${c}-${row}`}
          x={PAD + c * colW}
          y={PAD + row * rowH}
          width={colW}
          height={rowH}
          fill={fill}
          fillOpacity={opacity}
          style={{ transition: 'fill-opacity 180ms var(--ease-smooth)' }}
        />,
      )
    }
  }

  // Grid lines.
  const lines: React.ReactNode[] = []
  for (let c = 1; c < d1; c++) {
    lines.push(<line key={`v${c}`} x1={PAD + c * colW} y1={PAD} x2={PAD + c * colW} y2={SVG - PAD} stroke="var(--outline)" strokeWidth={1} />)
  }
  for (let row = 1; row < d2; row++) {
    lines.push(<line key={`h${row}`} x1={PAD} y1={PAD + row * rowH} x2={SVG - PAD} y2={PAD + row * rowH} stroke="var(--outline)" strokeWidth={1} />)
  }

  const simplifiedNote = (r.n !== prodN || r.d !== prodD)
    ? <> It reduces to <strong style={{ color: 'var(--ink)', fontFamily: 'var(--font-numeric)' }}>{r.n}/{r.d}</strong>.</>
    : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%', maxWidth: 380 }}>
      {/* Area model */}
      <svg
        viewBox={`0 0 ${SVG} ${SVG}`}
        width="100%"
        style={{ maxWidth: 240, aspectRatio: '1 / 1', display: 'block' }}
        role="img"
        aria-label={`Area model: ${n1} of ${d1} columns by ${n2} of ${d2} rows; overlap is ${prodN} of ${prodD} cells`}
      >
        {cells}
        {lines}
        <rect x={PAD} y={PAD} width={inner} height={inner} fill="none" stroke="var(--ink-soft)" strokeWidth={1.5} />
      </svg>

      {/* Live equation readout */}
      <div style={{
        fontFamily: 'var(--font-numeric)', fontSize: 24, fontWeight: 600, color: 'var(--accent)',
        letterSpacing: '0.01em', minHeight: 32, fontVariantNumeric: 'tabular-nums',
      }}>
        {n1}/{d1} × {n2}/{d2} = {r.n}/{r.d}
      </div>

      {/* Sliders */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
        <Slider label="first numerator" value={n1} min={1} max={d1} onChange={setN1} />
        <Slider label="first denom." value={d1} min={2} max={6} onChange={setDen1} />
        <div style={{ height: 1, background: 'var(--outline)', margin: '2px 0' }} />
        <Slider label="second numerator" value={n2} min={1} max={d2} onChange={setN2} />
        <Slider label="second denom." value={d2} min={2} max={6} onChange={setDen2} />
      </div>

      {/* Plain-language read-out of what's shown */}
      <p style={{ margin: 0, textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.5, color: 'var(--ink-soft)' }}>
        The square is cut into <strong style={{ color: 'var(--ink)', fontFamily: 'var(--font-numeric)' }}>{prodD}</strong> equal cells.
        The deep-shaded overlap covers <strong style={{ color: 'var(--ink)', fontFamily: 'var(--font-numeric)' }}>{prodN}</strong> of them —
        that&rsquo;s <strong style={{ color: 'var(--ink)', fontFamily: 'var(--font-numeric)' }}>{prodN}/{prodD}</strong>.{simplifiedNote}
      </p>
    </div>
  )
}
