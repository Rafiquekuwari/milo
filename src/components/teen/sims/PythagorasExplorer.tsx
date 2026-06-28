'use client'
/**
 * PythagorasExplorer — an interactive concept "simulation" for the Field Lab (teen).
 *
 * The learner drags the two leg sliders (a, b ∈ 1..10) and watches a right triangle
 * with a literal square drawn on each side. The areas a² and b² combine into c², and
 * the hypotenuse c = √(a²+b²) updates live. Slider-driven (not free-drag) so it's
 * touch-friendly, accessible, and testable. Mature Field Lab look — an instrument,
 * not a cartoon. Reads theme from the ancestor data-band scope; colours/fonts via
 * CSS variables only. Mirrors LineExplorer.
 */
import { useEffect, useRef, useState } from 'react'
import type { AgeBand } from '@/components/teen/types'

export interface PythagorasExplorerProps {
  band: AgeBand
  /** Called once on mount so a host (lesson/explore step) can unlock "Continue". */
  onReady?: () => void
}

const VB = 320          // square viewBox
const PERFECT = new Set([0, 1, 4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144, 169, 196, 225])

/** Pretty c: an exact integer when c² is a perfect square, else a 2-dp decimal. */
function fmtC(c2: number): string {
  if (PERFECT.has(c2)) return String(Math.round(Math.sqrt(c2)))
  return Math.sqrt(c2).toFixed(2)
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
      <span style={{ width: 36, textAlign: 'right', fontFamily: 'var(--font-numeric)', fontVariantNumeric: 'tabular-nums', fontSize: 16, fontWeight: 600, color: 'var(--accent)' }}>
        {value}
      </span>
    </label>
  )
}

export default function PythagorasExplorer({ band, onReady }: PythagorasExplorerProps) {
  void band // theme comes from the ancestor data-band scope
  const [a, setA] = useState(3)
  const [b, setB] = useState(4)
  const readyRef = useRef(onReady)
  readyRef.current = onReady
  useEffect(() => { readyRef.current?.() }, [])

  const a2 = a * a
  const b2 = b * b
  const c2 = a2 + b2
  const cText = fmtC(c2)

  // ── Layout: a right angle at the corner C, leg b horizontal, leg a vertical.
  // Scale so the largest leg + its square fit the viewBox with margins.
  const maxLeg = Math.max(a, b)
  const u = 110 / Math.max(maxLeg, 1)        // px per unit (square on the larger leg ≤ ~110px tall)
  const cornerX = 132
  const cornerY = 150
  const Bx = cornerX + b * u                  // far end of horizontal leg b
  const Ay = cornerY - a * u                  // far end of vertical leg a

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%', maxWidth: 380 }}>
      <div style={{ width: '100%', border: '1px solid var(--outline)', borderRadius: 8, background: 'var(--paper)' }}>
        <svg viewBox={`0 0 ${VB} ${VB}`} role="img" aria-label="right triangle with a square on each side" style={{ display: 'block', width: '100%', height: 'auto' }}>
          {/* square on leg b (below, going down) */}
          <rect x={cornerX} y={cornerY} width={b * u} height={b * u}
            fill="color-mix(in srgb, var(--accent) 14%, transparent)" stroke="var(--accent)" strokeWidth={1} />
          <text x={cornerX + (b * u) / 2} y={cornerY + (b * u) / 2 + 4} textAnchor="middle"
            style={{ fontFamily: 'var(--font-numeric)', fontSize: 13, fill: 'var(--ink-soft)' }}>b² = {b2}</text>

          {/* square on leg a (to the left, going left) */}
          <rect x={cornerX - a * u} y={Ay} width={a * u} height={a * u}
            fill="color-mix(in srgb, var(--accent) 24%, transparent)" stroke="var(--accent)" strokeWidth={1} />
          <text x={cornerX - (a * u) / 2} y={Ay + (a * u) / 2 + 4} textAnchor="middle"
            style={{ fontFamily: 'var(--font-numeric)', fontSize: 13, fill: 'var(--ink-soft)' }}>a² = {a2}</text>

          {/* the right triangle: corner (cornerX,cornerY), B (right), A (up) */}
          <polygon points={`${cornerX},${cornerY} ${Bx},${cornerY} ${cornerX},${Ay}`}
            fill="var(--bg-1)" stroke="var(--ink-soft)" strokeWidth={2} strokeLinejoin="round" />

          {/* right-angle marker at the corner */}
          <path d={`M ${cornerX + 12} ${cornerY} L ${cornerX + 12} ${cornerY - 12} L ${cornerX} ${cornerY - 12}`}
            fill="none" stroke="var(--ink-muted)" strokeWidth={1} />

          {/* hypotenuse highlighted */}
          <line x1={Bx} y1={cornerY} x2={cornerX} y2={Ay} stroke="var(--accent)" strokeWidth={2.5} />

          {/* edge labels */}
          <text x={(cornerX + Bx) / 2} y={cornerY - 8} textAnchor="middle"
            style={{ fontFamily: 'var(--font-numeric)', fontSize: 14, fill: 'var(--ink)' }}>b = {b}</text>
          <text x={cornerX + 8} y={(cornerY + Ay) / 2} textAnchor="start"
            style={{ fontFamily: 'var(--font-numeric)', fontSize: 14, fill: 'var(--ink)' }}>a = {a}</text>
          <text x={(Bx + cornerX) / 2 + 8} y={(cornerY + Ay) / 2 - 6} textAnchor="start"
            style={{ fontFamily: 'var(--font-numeric)', fontSize: 14, fontWeight: 600, fill: 'var(--accent)' }}>c = {cText}</text>
        </svg>
      </div>

      {/* Live readout: a² + b² = c² */}
      <div style={{ fontFamily: 'var(--font-numeric)', fontSize: 22, fontWeight: 600, color: 'var(--accent)', letterSpacing: '0.01em', minHeight: 30, textAlign: 'center' }}>
        {a2} + {b2} = {c2}
        <span style={{ color: 'var(--ink-muted)' }}>{'  '}→{'  '}</span>
        c = {cText}
      </div>

      {/* Sliders */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
        <Slider label="leg a" value={a} min={1} max={10} onChange={setA} />
        <Slider label="leg b" value={b} min={1} max={10} onChange={setB} />
      </div>

      {/* Plain-language read-out */}
      <p style={{ margin: 0, textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.5, color: 'var(--ink-soft)' }}>
        The two small squares (areas <strong style={{ color: 'var(--ink)' }}>{a2}</strong> and <strong style={{ color: 'var(--ink)' }}>{b2}</strong>) always add up to the square on the slanted side — so{' '}
        <strong style={{ color: 'var(--ink)' }}>c² = {c2}</strong>, which makes <strong style={{ color: 'var(--ink)' }}>c = {cText}</strong>.
      </p>
    </div>
  )
}
