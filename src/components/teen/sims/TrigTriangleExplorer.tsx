'use client'
/**
 * TrigTriangleExplorer — an interactive concept "simulation" for the Field Lab (teen).
 *
 * The learner drags ONE acute angle of a right triangle and watches the triangle,
 * the labelled opposite / adjacent / hypotenuse sides (relative to that angle), and
 * the three ratios sin = opp/hyp, cos = adj/hyp, tan = opp/adj all update live —
 * SOH-CAH-TOA made tangible (PhET / Desmos style). Slider-driven (not free-drag) so
 * it's touch-friendly, accessible, and testable. Mature Field Lab look — an
 * instrument, not a cartoon. Reads theme from the ancestor data-band scope;
 * colours/fonts via CSS variables only (no literal hex/rgba).
 */
import { useEffect, useRef, useState } from 'react'
import type { AgeBand } from '@/components/teen/types'

export interface TrigTriangleExplorerProps {
  band: AgeBand
  /** Called once on mount so a host (lesson/explore step) can unlock "Continue". */
  onReady?: () => void
}

// SVG canvas. θ sits at the bottom-left vertex; the right angle at the bottom-right.
const VB_W = 320
const VB_H = 240
const OX = 56          // θ-vertex x (bottom-left)
const OY = 192         // baseline y (both bottom vertices share this y)
// Fix the HYPOTENUSE at a constant pixel length so the triangle always fits the
// canvas at every angle (a fixed adjacent run would send the apex far off-screen
// past ~42°). The leg pixel lengths are then HYP·cos and HYP·sin — purely the
// drawn figure; the live ratios are computed from the true angle, not these.
const HYP = 168        // hypotenuse length in px (apex stays inside the viewBox)

function Slider({ label, value, min, max, suffix, onChange }: {
  label: string; value: number; min: number; max: number; suffix?: string; onChange: (n: number) => void
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', fontFamily: 'var(--font-body)' }}>
      <span style={{ width: 70, fontSize: 14, color: 'var(--ink-soft)' }}>{label}</span>
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
      <span style={{ width: 48, textAlign: 'right', fontFamily: 'var(--font-numeric)', fontVariantNumeric: 'tabular-nums', fontSize: 16, fontWeight: 600, color: 'var(--accent)' }}>
        {value}{suffix ?? ''}
      </span>
    </label>
  )
}

function Ratio({ name, formula, value }: { name: string; formula: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flex: 1 }}>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--ink-muted)' }}>{name}</span>
      <span style={{ fontFamily: 'var(--font-numeric)', fontSize: 13, color: 'var(--ink-soft)' }}>{formula}</span>
      <span style={{ fontFamily: 'var(--font-numeric)', fontVariantNumeric: 'tabular-nums', fontSize: 20, fontWeight: 600, color: 'var(--accent)' }}>{value}</span>
    </div>
  )
}

export default function TrigTriangleExplorer({ band, onReady }: TrigTriangleExplorerProps) {
  void band // theme comes from the ancestor data-band scope
  const [deg, setDeg] = useState(37)
  const readyRef = useRef(onReady)
  readyRef.current = onReady
  useEffect(() => { readyRef.current?.() }, [])

  const rad = (deg * Math.PI) / 180
  const sin = Math.sin(rad)
  const cos = Math.cos(rad)
  const tan = Math.tan(rad)
  // Scale BOTH legs off a fixed hypotenuse so the apex stays on-canvas at any angle:
  //   adjacent (run) = HYP·cos, opposite (rise) = HYP·sin.
  const run = HYP * cos
  const rise = HYP * sin
  // θ-vertex = (OX,OY); right-angle corner = (apexX,OY); apex (top of opposite) = (apexX,apexY).
  const apexX = OX + run
  const apexY = OY - rise
  const f2 = (n: number) => n.toFixed(2)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%', maxWidth: 380 }}>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        role="img"
        aria-label={`Right triangle with acute angle ${deg} degrees`}
        style={{ display: 'block', width: '100%', height: 'auto', border: '1px solid var(--outline)', borderRadius: 8, background: 'var(--paper)' }}
      >
        {/* The triangle: θ at bottom-left (OX,OY); right angle at bottom-right (apexX,OY); apex up. */}
        <polygon
          points={`${OX},${OY} ${apexX},${OY} ${apexX},${apexY}`}
          fill="var(--bg-1)"
          stroke="var(--ink-soft)"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />

        {/* Right-angle marker at the bottom-right corner. */}
        <path
          d={`M ${apexX - 14} ${OY} L ${apexX - 14} ${OY - 14} L ${apexX} ${OY - 14}`}
          fill="none"
          stroke="var(--ink-muted)"
          strokeWidth={1}
        />

        {/* The acute angle θ arc at the bottom-left vertex. Radius is kept inside the
            adjacent run (which shrinks as θ grows) so it never crosses the figure. */}
        {(() => {
          const ar = Math.max(14, Math.min(26, run - 6))
          return (
            <path
              d={`M ${OX + ar} ${OY} A ${ar} ${ar} 0 0 0 ${OX + ar * cos} ${OY - ar * sin}`}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={2}
            />
          )
        })()}
        <text x={OX + 12} y={OY - 8} style={{ fontFamily: 'var(--font-numeric)', fontSize: 13, fill: 'var(--accent)', fontWeight: 600 }}>θ</text>

        {/* Hypotenuse (θ → apex) emphasised. */}
        <line x1={OX} y1={OY} x2={apexX} y2={apexY} stroke="var(--accent)" strokeWidth={2.5} />

        {/* Side labels, relative to θ. */}
        <text x={(OX + apexX) / 2} y={OY + 20} textAnchor="middle" style={{ fontFamily: 'var(--font-body)', fontSize: 12, fill: 'var(--ink-soft)' }}>adjacent</text>
        <text x={apexX + 8} y={(OY + apexY) / 2} textAnchor="start" style={{ fontFamily: 'var(--font-body)', fontSize: 12, fill: 'var(--ink-soft)' }}>opposite</text>
        <text x={(OX + apexX) / 2 - 6} y={(OY + apexY) / 2 - 8} textAnchor="end" style={{ fontFamily: 'var(--font-body)', fontSize: 12, fill: 'var(--accent)', fontWeight: 600 }}>hypotenuse</text>
      </svg>

      {/* Live ratios readout */}
      <div style={{ display: 'flex', width: '100%', gap: 8, padding: '4px 0' }}>
        <Ratio name="sin θ" formula="opp / hyp" value={f2(sin)} />
        <Ratio name="cos θ" formula="adj / hyp" value={f2(cos)} />
        <Ratio name="tan θ" formula="opp / adj" value={tan > 99 ? '—' : f2(tan)} />
      </div>

      {/* Slider */}
      <div style={{ width: '100%' }}>
        <Slider label="angle θ" value={deg} min={10} max={80} suffix="°" onChange={setDeg} />
      </div>

      {/* Plain-language read-out of what changed */}
      <p style={{ margin: 0, textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.5, color: 'var(--ink-soft)' }}>
        Tilt θ toward 80° and the <strong style={{ color: 'var(--ink)' }}>opposite</strong> side grows — so
        {' '}<strong style={{ color: 'var(--ink)' }}>sin θ</strong> and <strong style={{ color: 'var(--ink)' }}>tan θ</strong> climb,
        while <strong style={{ color: 'var(--ink)' }}>cos θ</strong> shrinks. The ratios depend only on the angle.
      </p>
    </div>
  )
}
