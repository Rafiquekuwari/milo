'use client'
/**
 * NumberLineExplorer — an interactive concept "simulation" for the Field Lab (teen).
 *
 * The learner drags ONE slider to set a point value on the number line (−10..10)
 * and watches its distance from zero (absolute value) and its opposite (−v) update
 * live. Slider-driven (not free-drag) so it's touch-friendly, accessible, and
 * testable. Mature Field Lab look — an instrument, not a cartoon. Reads theme from
 * the ancestor data-band scope; colours/fonts via CSS variables only.
 */
import { useEffect, useRef, useState } from 'react'
import type { AgeBand } from '@/components/teen/types'
import NumberLine from '@/components/teen/NumberLine'

export interface NumberLineExplorerProps {
  band: AgeBand
  /** Called once on mount so a host (lesson/explore step) can unlock "Continue". */
  onReady?: () => void
}

const RANGE = 10 // line spans -10..10

// Format an integer with a true minus glyph for negatives.
function fmt(n: number): string {
  return n < 0 ? `−${Math.abs(n)}` : String(n)
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
        {fmt(value)}
      </span>
    </label>
  )
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: 120 }}>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-numeric)', fontVariantNumeric: 'tabular-nums', fontSize: 26, fontWeight: 600, color: 'var(--accent)' }}>{value}</span>
    </div>
  )
}

export default function NumberLineExplorer({ band, onReady }: NumberLineExplorerProps) {
  const [v, setV] = useState(6)
  const readyRef = useRef(onReady)
  readyRef.current = onReady
  useEffect(() => { readyRef.current?.() }, [])

  const opp = -v
  const dist = Math.abs(v)
  // Both the point and its opposite are drawn (0 marked when v is 0).
  const marked = v === 0 ? [0] : [v, opp]

  const distText = v === 0
    ? 'sits right on zero, so its distance from 0 is 0'
    : `is ${dist} ${dist === 1 ? 'step' : 'steps'} from 0 — that distance is its absolute value`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%', maxWidth: 420 }}>
      <div style={{ width: '100%' }}>
        <NumberLine band={band} min={-RANGE} max={RANGE} mode="read" marked={marked} />
      </div>

      {/* Live readouts */}
      <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 20, width: '100%' }}>
        <Readout label="value" value={fmt(v)} />
        <Readout label="|v|  distance" value={String(dist)} />
        <Readout label="opposite  −v" value={fmt(opp)} />
      </div>

      {/* Slider */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
        <Slider label="point (v)" value={v} min={-RANGE} max={RANGE} onChange={setV} />
      </div>

      {/* Plain-language read-out of what's shown */}
      <p style={{ margin: 0, textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.5, color: 'var(--ink-soft)' }}>
        <strong style={{ color: 'var(--ink)' }}>{fmt(v)}</strong> {distText}.<br />
        Its <strong style={{ color: 'var(--ink)' }}>opposite</strong> is <strong style={{ color: 'var(--ink)' }}>{fmt(opp)}</strong> — the same distance from 0, on the other side.
      </p>
    </div>
  )
}
