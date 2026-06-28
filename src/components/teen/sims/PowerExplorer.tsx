'use client'
/**
 * PowerExplorer — an interactive concept "simulation" for the Field Lab (teen),
 * for the Exponents, Square Roots & Scientific Notation investigation.
 *
 * The learner drags a base slider (1..6) and an exponent slider (0..5) and
 * watches the repeated-multiplication expansion (e.g. 3 × 3 × 3), the value, and
 * a live readout base^exp = value all update together. For exponent 2 a small
 * base × base square grid appears, grounding "squared" visually. Slider-driven
 * (not free-drag) so it's touch-friendly, accessible, and testable. Mature Field
 * Lab look — an instrument, not a cartoon. Colours/fonts via CSS variables only.
 */
import { useEffect, useRef, useState } from 'react'
import type { AgeBand } from '@/components/teen/types'
import { pow } from '@/components/lessons/ExponentsRootsTeenLesson'

export interface PowerExplorerProps {
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
      <span style={{ width: 32, textAlign: 'right', fontFamily: 'var(--font-numeric)', fontVariantNumeric: 'tabular-nums', fontSize: 16, fontWeight: 600, color: 'var(--accent)' }}>
        {value}
      </span>
    </label>
  )
}

/** A base × base square of unit cells — the visual meaning of "squared". */
function SquareGrid({ n }: { n: number }) {
  const SIZE = 168
  const gap = 3
  const cell = (SIZE - gap * (n - 1)) / n
  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} role="img" aria-label={`${n} by ${n} square of ${n * n} cells`}>
      {Array.from({ length: n }).map((_, r) =>
        Array.from({ length: n }).map((_, c) => (
          <rect
            key={`${r}-${c}`}
            x={c * (cell + gap)}
            y={r * (cell + gap)}
            width={cell}
            height={cell}
            rx={2}
            fill="color-mix(in srgb, var(--accent) 22%, transparent)"
            stroke="var(--accent)"
            strokeWidth={1}
          />
        )),
      )}
    </svg>
  )
}

export default function PowerExplorer({ band, onReady }: PowerExplorerProps) {
  void band
  const [base, setBase] = useState(3)
  const [exp, setExp] = useState(3)
  const readyRef = useRef(onReady)
  readyRef.current = onReady
  useEffect(() => { readyRef.current?.() }, [])

  const value = Math.pow(base, exp)
  const factors = Array.from({ length: exp }, () => base)
  const expansion = exp === 0 ? '1' : factors.join(' × ')

  const sentence = exp === 0
    ? `Any base raised to the power 0 is 1 — there are no factors to multiply, so we start from 1.`
    : exp === 1
      ? `${base} to the power 1 is just ${base} itself — one single factor.`
      : `${pow(base, exp)} means ${base} multiplied by itself ${exp} times, which gives ${value}.`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, width: '100%', maxWidth: 380 }}>
      {/* Repeated-multiplication expansion */}
      <div style={{
        minHeight: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-numeric)', fontVariantNumeric: 'tabular-nums',
        fontSize: 24, fontWeight: 600, color: 'var(--ink)', letterSpacing: '0.01em',
        textAlign: 'center', flexWrap: 'wrap',
      }}>
        {expansion}
      </div>

      {/* Optional square grid for the "squared" case */}
      {exp === 2 && base >= 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          <SquareGrid n={base} />
        </div>
      )}

      {/* Live equation readout: base^exp = value */}
      <div style={{
        fontFamily: 'var(--font-numeric)', fontVariantNumeric: 'tabular-nums',
        fontSize: 30, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.01em',
        minHeight: 38, textAlign: 'center',
      }}>
        {pow(base, exp)} = {value}
      </div>

      {/* Sliders */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
        <Slider label="base" value={base} min={1} max={6} onChange={setBase} />
        <Slider label="exponent" value={exp} min={0} max={5} onChange={setExp} />
      </div>

      {/* Plain-language read-out of what changed */}
      <p style={{ margin: 0, textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.5, color: 'var(--ink-soft)' }}>
        {sentence}
      </p>
    </div>
  )
}
