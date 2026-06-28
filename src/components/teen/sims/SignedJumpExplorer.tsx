'use client'
/**
 * SignedJumpExplorer — an interactive concept "simulation" for the Field Lab (teen).
 *
 * The learner sets a (start) and b (jump) with two sliders and watches a number
 * line: a marker at the start, an arrow jumping right (for +b) or left (for −b),
 * and the landing point at a + b. The sum equation and a plain-language sentence
 * about the direction of the jump update live (PhET / Desmos style).
 * Slider-driven (not free-drag) so it's touch-friendly, accessible, and testable.
 * Mature Field Lab look — an instrument, not a cartoon. Reads theme from the
 * ancestor data-band scope; colours/fonts via CSS variables only.
 */
import { useEffect, useRef, useState } from 'react'
import type { AgeBand } from '@/components/teen/types'
import NumberLine from '@/components/teen/NumberLine'

export interface SignedJumpExplorerProps {
  band: AgeBand
  /** Called once on mount so a host (lesson/explore step) can unlock "Continue". */
  onReady?: () => void
}

// Number-line domain (the drawn axis + the arrow's coordinate space).
const MIN = -9
const MAX = 9
// Per-slider ranges chosen so the worst-case sum (a + b) always lands inside
// [MIN, MAX] — the marker, arrow, and equation stay on-line at every extreme.
const A_MIN = -4
const A_MAX = 4
const B_MIN = -5
const B_MAX = 5

/** Signed number → display string with a real minus glyph. */
function sgn(n: number): string {
  return n < 0 ? `−${Math.abs(n)}` : `${n}`
}

/** "a + b" or "a − |b|" so the expression reads like a sum. */
function expr(a: number, b: number): string {
  return `${sgn(a)} ${b < 0 ? '−' : '+'} ${Math.abs(b)}`
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
      <span style={{ width: 40, textAlign: 'right', fontFamily: 'var(--font-numeric)', fontVariantNumeric: 'tabular-nums', fontSize: 16, fontWeight: 600, color: 'var(--accent)' }}>
        {sgn(value)}
      </span>
    </label>
  )
}

/**
 * The jump arrow — an inline SVG strip whose x-scale matches the NumberLine
 * below it (same MIN..MAX domain, same horizontal padding), so the arrow lands
 * exactly above the start/end ticks.
 */
function JumpArrow({ a, b }: { a: number; b: number }) {
  const VW = 720
  const VH = 44
  const padX = 36
  const xOf = (n: number) => padX + ((n - MIN) / (MAX - MIN)) * (VW - 2 * padX)
  const x0 = xOf(a)
  const x1 = xOf(a + b)
  const baseY = VH - 6
  const arcTop = 8
  const right = b > 0
  const flat = b === 0
  // A shallow arc from start to landing, apex midway.
  const xMid = (x0 + x1) / 2
  const d = `M ${x0} ${baseY} Q ${xMid} ${arcTop} ${x1} ${baseY}`
  const head = 7
  // Arrowhead orientation follows the travel direction.
  const tip = flat
    ? null
    : right
      ? `${x1} ${baseY} ${x1 - head} ${baseY - head} ${x1 - head} ${baseY + head}`
      : `${x1} ${baseY} ${x1 + head} ${baseY - head} ${x1 + head} ${baseY + head}`

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" role="img" aria-label="jump arrow" style={{ display: 'block' }}>
      {flat ? (
        <circle cx={x0} cy={baseY} r={4} fill="var(--ink-muted)" />
      ) : (
        <>
          <path d={d} fill="none" stroke="var(--accent)" strokeWidth={2.5} strokeLinecap="round" />
          {tip && <polygon points={tip} fill="var(--accent)" />}
        </>
      )}
    </svg>
  )
}

export default function SignedJumpExplorer({ band, onReady }: SignedJumpExplorerProps) {
  const [a, setA] = useState(3)
  const [b, setB] = useState(-5)
  const readyRef = useRef(onReady)
  readyRef.current = onReady
  useEffect(() => { readyRef.current?.() }, [])

  const sum = a + b
  const dir = b === 0
    ? 'no jump — you stay put'
    : `jump ${Math.abs(b)} ${b > 0 ? 'right' : 'left'} (because ${b > 0 ? 'adding a positive' : 'adding a negative'})`

  // Keep marked points clean even when start and landing coincide.
  const marked = a === sum ? [a] : [a, sum]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%', maxWidth: 420 }}>
      <div style={{ width: '100%' }}>
        <JumpArrow a={a} b={b} />
        <NumberLine band={band} min={MIN} max={MAX} mode="read" marked={marked} />
      </div>

      {/* Live sum readout */}
      <div style={{
        fontFamily: 'var(--font-numeric)', fontSize: 26, fontWeight: 600, color: 'var(--accent)',
        letterSpacing: '0.01em', minHeight: 34,
      }}>
        {expr(a, b)} = {sgn(sum)}
      </div>

      {/* Sliders */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
        <Slider label="start (a)" value={a} min={A_MIN} max={A_MAX} onChange={setA} />
        <Slider label="jump (b)" value={b} min={B_MIN} max={B_MAX} onChange={setB} />
      </div>

      {/* Plain-language read-out of what changed */}
      <p style={{ margin: 0, textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.5, color: 'var(--ink-soft)' }}>
        Start at <strong style={{ color: 'var(--ink)' }}>{sgn(a)}</strong>, then {dir}.<br />
        You land on <strong style={{ color: 'var(--ink)' }}>{sgn(sum)}</strong>.
      </p>
    </div>
  )
}
