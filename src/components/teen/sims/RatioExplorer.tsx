'use client'
/**
 * RatioExplorer — an interactive concept "simulation" for the Field Lab (teen).
 *
 * The learner sets a base ratio a:b and a scale factor k, then watches two rows
 * of dots grow to a·k and b·k while the equation a:b = (a·k):(b·k) updates live —
 * the equivalence stays true no matter how far you scale. Slider-driven (not
 * free-drag) so it's touch-friendly, accessible, and testable. Mature Field Lab
 * look — an instrument, not a cartoon. Colours/fonts via CSS variables only.
 */
import { useEffect, useRef, useState } from 'react'
import type { AgeBand } from '@/components/teen/types'

export interface RatioExplorerProps {
  band: AgeBand
  /** Called once on mount so a host (lesson/explore step) can unlock "Continue". */
  onReady?: () => void
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

/** A single row of `count` dots laid out left-to-right inside the SVG. */
function DotRow({ count, y, fill }: { count: number; y: number; fill: string }) {
  const R = 9
  const GAP = 24
  const X0 = 14
  return (
    <g>
      {Array.from({ length: count }, (_, i) => (
        <circle key={i} cx={X0 + R + i * GAP} cy={y} r={R} fill={fill} />
      ))}
    </g>
  )
}

const VB_W = 760 // wide enough for the max 6·5 = 30 dots at 24px pitch

export default function RatioExplorer({ band, onReady }: RatioExplorerProps) {
  void band // theme comes from the ancestor data-band scope
  const [a, setA] = useState(2)
  const [b, setB] = useState(3)
  const [k, setK] = useState(2)
  const readyRef = useRef(onReady)
  readyRef.current = onReady
  useEffect(() => { readyRef.current?.() }, [])

  const aS = a * k
  const bS = b * k

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%', maxWidth: 380 }}>
      {/* Live visual: two rows of dots, base sizes a·k and b·k */}
      <div style={{ width: '100%', border: '1px solid var(--outline)', borderRadius: 12, background: 'var(--bg-2)', padding: '12px 4px', boxSizing: 'border-box' }}>
        <svg viewBox={`0 0 ${VB_W} 120`} width="100%" role="img" aria-label={`Top row ${aS} dots, bottom row ${bS} dots`}>
          <text x={14} y={26} fontFamily="var(--font-numeric)" fontSize={18} fontWeight={600} fill="var(--ink-soft)">{aS}</text>
          <DotRow count={aS} y={44} fill="var(--accent)" />
          <text x={14} y={86} fontFamily="var(--font-numeric)" fontSize={18} fontWeight={600} fill="var(--ink-soft)">{bS}</text>
          <DotRow count={bS} y={100} fill="var(--ink-soft)" />
        </svg>
      </div>

      {/* Live equation readout — equivalence stays true */}
      <div style={{
        fontFamily: 'var(--font-numeric)', fontSize: 24, fontWeight: 600, color: 'var(--accent)',
        letterSpacing: '0.01em', minHeight: 32, textAlign: 'center',
      }}>
        {a}:{b} = {aS}:{bS}
      </div>

      {/* Sliders */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
        <Slider label="first term (a)" value={a} min={1} max={6} onChange={setA} />
        <Slider label="second term (b)" value={b} min={1} max={6} onChange={setB} />
        <Slider label="scale factor (k)" value={k} min={1} max={5} onChange={setK} />
      </div>

      {/* Plain-language read-out */}
      <p style={{ margin: 0, textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.5, color: 'var(--ink-soft)' }}>
        Scaling <strong style={{ color: 'var(--ink)' }}>{a}:{b}</strong> by <strong style={{ color: 'var(--ink)' }}>{k}</strong> gives{' '}
        <strong style={{ color: 'var(--ink)' }}>{aS}:{bS}</strong> — both terms grow by the same factor, so it&rsquo;s the same ratio.
      </p>
    </div>
  )
}
