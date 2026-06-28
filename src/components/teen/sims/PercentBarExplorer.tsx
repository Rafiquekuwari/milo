'use client'
/**
 * PercentBarExplorer — an interactive concept "simulation" for the Field Lab (teen).
 *
 * The learner drags a percent slider (0..100) and a total slider (10..200) and
 * watches a horizontal bar fill to that percent of the total, with the value
 * (p% of T) computed live (PhET / Desmos style). Slider-driven (not free-drag)
 * so it's touch-friendly, accessible, and testable. Mature Field Lab look — an
 * instrument, not a cartoon. Reads theme from the ancestor data-band scope;
 * colours/fonts via CSS variables only.
 */
import { useEffect, useRef, useState } from 'react'
import type { AgeBand } from '@/components/teen/types'

export interface PercentBarExplorerProps {
  band: AgeBand
  /** Called once on mount so a host (lesson/explore step) can unlock "Continue". */
  onReady?: () => void
}

const tidy = (n: number) => Math.round(n * 100) / 100

function Slider({ label, value, min, max, step, suffix, onChange }: {
  label: string; value: number; min: number; max: number; step: number; suffix?: string; onChange: (n: number) => void
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', fontFamily: 'var(--font-body)' }}>
      <span style={{ width: 64, fontSize: 14, color: 'var(--ink-soft)' }}>{label}</span>
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
      <span style={{ width: 52, textAlign: 'right', fontFamily: 'var(--font-numeric)', fontVariantNumeric: 'tabular-nums', fontSize: 16, fontWeight: 600, color: 'var(--accent)' }}>
        {value}{suffix ?? ''}
      </span>
    </label>
  )
}

export default function PercentBarExplorer({ band, onReady }: PercentBarExplorerProps) {
  const [percent, setPercent] = useState(40)
  const [total, setTotal] = useState(80)
  const readyRef = useRef(onReady)
  readyRef.current = onReady
  useEffect(() => { readyRef.current?.() }, [])

  const value = tidy((percent / 100) * total)

  // Bar geometry (inline SVG): a track from x=8..292 (width 284), height 34.
  const TRACK_X = 8
  const TRACK_W = 284
  const fillW = (percent / 100) * TRACK_W
  void band

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%', maxWidth: 380 }}>
      {/* The filling bar */}
      <svg viewBox="0 0 300 60" style={{ width: '100%', maxWidth: 320 }} role="img" aria-label={`Bar filled to ${percent} percent`}>
        {/* Track */}
        <rect
          x={TRACK_X} y={13} width={TRACK_W} height={34} rx={8}
          fill="var(--bg-2)" stroke="var(--outline)" strokeWidth={1}
        />
        {/* Fill */}
        <rect
          x={TRACK_X} y={13} width={fillW} height={34} rx={8}
          fill="var(--accent)"
          style={{ transition: 'width 120ms ease-out' }}
        />
        {/* Midline tick for orientation */}
        <line
          x1={TRACK_X + TRACK_W / 2} y1={9} x2={TRACK_X + TRACK_W / 2} y2={51}
          stroke="var(--outline)" strokeWidth={1} strokeDasharray="2 3"
        />
      </svg>

      {/* Live readout: p% of T = value */}
      <div style={{
        fontFamily: 'var(--font-numeric)', fontSize: 24, fontWeight: 600, color: 'var(--accent)',
        letterSpacing: '0.01em', minHeight: 32, fontVariantNumeric: 'tabular-nums',
      }}>
        {percent}% of {total} = {value}
      </div>

      {/* Sliders */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
        <Slider label="percent" value={percent} min={0} max={100} step={1} suffix="%" onChange={setPercent} />
        <Slider label="total" value={total} min={10} max={200} step={10} onChange={setTotal} />
      </div>

      {/* Plain-language read-out of what's happening */}
      <p style={{ margin: 0, textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.5, color: 'var(--ink-soft)' }}>
        <strong style={{ color: 'var(--ink)' }}>{percent}%</strong> means {percent} out of every 100.
        Take that share of <strong style={{ color: 'var(--ink)' }}>{total}</strong> and you get{' '}
        <strong style={{ color: 'var(--ink)' }}>{value}</strong> — the shaded part of the bar.
      </p>
    </div>
  )
}
