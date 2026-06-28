'use client'
/**
 * BalanceExplorer — an interactive concept "simulation" for the Field Lab (teen),
 * for Equations & Inequalities.
 *
 * The learner drags a slider for x and watches a balance beam tilt. The left pan
 * holds 2x + 3, the right pan holds 11; the beam tips toward the heavier side and
 * sits level only at the solution (x = 4). When balanced, both sides are
 * highlighted. Slider-driven (not free-drag) so it's touch-friendly, accessible,
 * and testable. Mature Field Lab look — an instrument, not a cartoon. Reads theme
 * from the ancestor data-band scope; colours/fonts via CSS variables only.
 */
import { useEffect, useRef, useState } from 'react'
import type { AgeBand } from '@/components/teen/types'

export interface BalanceExplorerProps {
  band: AgeBand
  /** Called once on mount so a host (lesson/explore step) can unlock "Continue". */
  onReady?: () => void
}

// The fixed equation under investigation:  A·x + B = C   (solution x = 4).
const A = 2
const B = 3
const C = 11
const SOLUTION = (C - B) / A // 4

const X_MIN = 0
const X_MAX = 8

/** Pretty signed integer with a real minus sign. */
const fmt = (n: number) => (n < 0 ? `−${Math.abs(n)}` : String(n))

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

export default function BalanceExplorer({ band, onReady }: BalanceExplorerProps) {
  void band // theme comes from the ancestor data-band scope
  const [x, setX] = useState(1)
  const readyRef = useRef(onReady)
  readyRef.current = onReady
  useEffect(() => { readyRef.current?.() }, [])

  const left = A * x + B
  const right = C
  const diff = left - right
  const balanced = diff === 0

  // Beam tilt: angle in degrees, capped so it stays a calm instrument.
  const MAX_TILT = 9
  const tilt = balanced
    ? 0
    : Math.max(-MAX_TILT, Math.min(MAX_TILT, diff * 1.6))

  // SVG geometry (viewBox 0..320 × 0..200).
  const CX = 160          // pivot x
  const PIVOT_Y = 70      // beam pivot height
  const ARM = 96          // half-beam length
  const RAD = (tilt * Math.PI) / 180
  const dx = Math.cos(RAD) * ARM
  const dy = Math.sin(RAD) * ARM
  const leftEnd = { x: CX - dx, y: PIVOT_Y + dy }
  const rightEnd = { x: CX + dx, y: PIVOT_Y - dy }
  const PAN_DROP = 34
  const leftPan = { x: leftEnd.x, y: leftEnd.y + PAN_DROP }
  const rightPan = { x: rightEnd.x, y: rightEnd.y + PAN_DROP }

  const sideColor = (heavier: boolean) =>
    balanced ? 'var(--garden-green)' : heavier ? 'var(--accent)' : 'var(--ink-muted)'
  const leftColor = sideColor(diff > 0)
  const rightColor = sideColor(diff < 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%', maxWidth: 380 }}>
      {/* The balance beam */}
      <svg
        viewBox="0 0 320 200"
        width="100%"
        role="img"
        aria-label={`Balance beam for ${A}x + ${B} = ${C}. Left side weighs ${left}, right side weighs ${right}. ${balanced ? 'Balanced.' : 'Not balanced.'}`}
        style={{ display: 'block', maxWidth: 320, transition: 'none' }}
      >
        {/* base + stand */}
        <line x1={CX - 36} y1={184} x2={CX + 36} y2={184} stroke="var(--outline)" strokeWidth={3} strokeLinecap="round" />
        <line x1={CX} y1={184} x2={CX} y2={PIVOT_Y} stroke="var(--outline)" strokeWidth={3} strokeLinecap="round" />
        <circle cx={CX} cy={PIVOT_Y} r={4} fill="var(--ink-soft)" />

        {/* the beam (rotates) */}
        <g style={{ transition: 'transform 220ms var(--ease-smooth, ease)' }} transform={`rotate(${tilt} ${CX} ${PIVOT_Y})`}>
          <line x1={CX - ARM} y1={PIVOT_Y} x2={CX + ARM} y2={PIVOT_Y} stroke="var(--ink)" strokeWidth={4} strokeLinecap="round" />
        </g>

        {/* hanger strings */}
        <line x1={leftEnd.x} y1={leftEnd.y} x2={leftPan.x} y2={leftPan.y} stroke="var(--outline)" strokeWidth={1.5} />
        <line x1={rightEnd.x} y1={rightEnd.y} x2={rightPan.x} y2={rightPan.y} stroke="var(--outline)" strokeWidth={1.5} />

        {/* left pan: 2x + 3 */}
        <g style={{ transition: 'transform 220ms var(--ease-smooth, ease)' }} transform={`translate(${leftPan.x} ${leftPan.y})`}>
          <rect x={-34} y={-16} width={68} height={32} rx={8}
            fill="var(--bg-2)" stroke={leftColor} strokeWidth={balanced ? 2.4 : 1.5} />
          <text x={0} y={5} textAnchor="middle"
            fontFamily="var(--font-numeric)" fontSize={15} fontWeight={700} fill="var(--ink)">
            {A}x + {B}
          </text>
        </g>

        {/* right pan: 11 */}
        <g style={{ transition: 'transform 220ms var(--ease-smooth, ease)' }} transform={`translate(${rightPan.x} ${rightPan.y})`}>
          <rect x={-34} y={-16} width={68} height={32} rx={8}
            fill="var(--bg-2)" stroke={rightColor} strokeWidth={balanced ? 2.4 : 1.5} />
          <text x={0} y={5} textAnchor="middle"
            fontFamily="var(--font-numeric)" fontSize={15} fontWeight={700} fill="var(--ink)">
            {C}
          </text>
        </g>
      </svg>

      {/* Live readout: 2x + 3 = 11 → x = ? */}
      <div style={{
        fontFamily: 'var(--font-numeric)', fontSize: 24, fontWeight: 600,
        letterSpacing: '0.01em', minHeight: 32, display: 'flex', alignItems: 'baseline', gap: 8,
        color: balanced ? 'var(--garden-green)' : 'var(--accent)',
      }}>
        <span>{A}x + {B} = {C}</span>
        <span style={{ color: 'var(--ink-muted)' }}>→</span>
        <span>x = {fmt(x)}</span>
      </div>

      {/* The slider */}
      <div style={{ width: '100%' }}>
        <Slider label="x" value={x} min={X_MIN} max={X_MAX} onChange={setX} />
      </div>

      {/* Plain-language read-out */}
      <p style={{ margin: 0, textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.5, color: 'var(--ink-soft)' }}>
        With <strong style={{ color: 'var(--ink)' }}>x = {fmt(x)}</strong>, the left side is{' '}
        <strong style={{ fontFamily: 'var(--font-numeric)', color: 'var(--ink)' }}>{A}·{fmt(x)} + {B} = {fmt(left)}</strong>.
        {' '}
        {balanced ? (
          <>It matches the right side, so the scale is <strong style={{ color: 'var(--garden-green)' }}>balanced</strong> — that&rsquo;s the solution.</>
        ) : (
          <>That&rsquo;s {fmt(left)} versus {fmt(right)}, so the{' '}
            <strong style={{ color: 'var(--ink)' }}>{diff > 0 ? 'left' : 'right'}</strong> side is heavier. Keep adjusting x.</>
        )}
      </p>

      {/* Balanced badge */}
      <div style={{ minHeight: 22 }}>
        {balanced && (
          <span style={{
            fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, letterSpacing: '0.04em',
            color: 'var(--garden-green)', border: '1px solid var(--garden-green)', borderRadius: 999,
            padding: '3px 12px', textTransform: 'uppercase',
          }}>
            Balanced · x = {fmt(SOLUTION)}
          </span>
        )}
      </div>
    </div>
  )
}
