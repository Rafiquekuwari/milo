'use client'
/**
 * AreaFactorExplorer — an interactive concept "simulation" for the Field Lab (teen).
 *
 * An area / box model for (x + a)(x + b). The learner drags the a and b sliders and
 * watches a rectangle of width (x + a) and height (x + b) split into its four pieces —
 * x², ax, bx, ab — while the expanded form x² + (a+b)x + ab and the factored form
 * (x + a)(x + b) update live. Seeing factoring AS un-tiling a rectangle is the whole
 * idea: the middle coefficient is a+b, the constant is a·b.
 *
 * Slider-driven (not free-drag) so it's touch-friendly, accessible, and testable.
 * Mature Field Lab look — an instrument, not a cartoon. Reads theme from the ancestor
 * data-band scope; colours/fonts via CSS variables only.
 */
import { useEffect, useRef, useState } from 'react'
import type { AgeBand } from '@/components/teen/types'

export interface AreaFactorExplorerProps {
  band: AgeBand
  /** Called once on mount so a host (lesson/explore step) can unlock "Continue". */
  onReady?: () => void
}

const X_UNITS = 3 // the "x" side is drawn as 3 grid units for legibility

/** Plain integer with a true minus glyph for negatives. */
function num(n: number): string {
  return n < 0 ? `−${Math.abs(n)}` : String(n)
}

/** A "kx" strip label: 0 → "0", 1 → "x", −1 → "−x", else "kx" (true minus). */
function strip(k: number): string {
  if (k === 0) return '0'
  if (k === 1) return 'x'
  if (k === -1) return '−x'
  return `${num(k)}x`
}

/** Pretty signed term, e.g. (x + 2) or (x − 3). */
function bin(a: number): string {
  if (a === 0) return 'x'
  return `x ${a < 0 ? '−' : '+'} ${Math.abs(a)}`
}

/** Expanded x² + (a+b)x + ab as a string. */
function expanded(a: number, b: number): string {
  const mid = a + b
  const cst = a * b
  const midPart = mid === 0 ? '' : ` ${mid < 0 ? '−' : '+'} ${Math.abs(mid)}x`
  const cstPart = cst === 0 ? '' : ` ${cst < 0 ? '−' : '+'} ${Math.abs(cst)}`
  return `x²${midPart}${cstPart}`
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
        {value < 0 ? `−${Math.abs(value)}` : value}
      </span>
    </label>
  )
}

export default function AreaFactorExplorer({ band, onReady }: AreaFactorExplorerProps) {
  void band // theme comes from the ancestor data-band scope
  const [a, setA] = useState(2)
  const [b, setB] = useState(3)
  const readyRef = useRef(onReady)
  readyRef.current = onReady
  useEffect(() => { readyRef.current?.() }, [])

  // ── SVG geometry. Keep a,b drawn as positive widths for the box (label can be neg). ──
  const aW = Math.max(Math.abs(a), 0.6) // never collapse a strip to nothing
  const bW = Math.max(Math.abs(b), 0.6)
  const unit = 26 // px per grid unit
  const pad = 14
  const xPx = X_UNITS * unit
  const aPx = aW * unit
  const bPx = bW * unit
  const totalW = xPx + aPx
  const totalH = xPx + bPx
  const svgW = totalW + pad * 2
  const svgH = totalH + pad * 2

  // four tile rects: x² (top-left), ax (top-right), bx (bottom-left), ab (bottom-right)
  const tiles = [
    { x: pad, y: pad, w: xPx, h: xPx, fill: 'var(--accent)', op: 0.20, label: 'x²' },
    { x: pad + xPx, y: pad, w: aPx, h: xPx, fill: 'var(--accent)', op: 0.38, label: strip(a) },
    { x: pad, y: pad + xPx, w: xPx, h: bPx, fill: 'var(--accent)', op: 0.38, label: strip(b) },
    { x: pad + xPx, y: pad + xPx, w: aPx, h: bPx, fill: 'var(--accent)', op: 0.55, label: num(a * b) },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%', maxWidth: 380 }}>
      {/* The box model */}
      <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          width="100%"
          style={{ maxWidth: 300, height: 'auto', fontFamily: 'var(--font-numeric)' }}
          role="img"
          aria-label={`Rectangle for (${bin(a)})(${bin(b)})`}
        >
          {/* side-length brackets */}
          <text x={pad + xPx / 2} y={pad - 4} textAnchor="middle" fontSize={11} fill="var(--ink-muted)">x</text>
          <text x={pad + xPx + aPx / 2} y={pad - 4} textAnchor="middle" fontSize={11} fill="var(--ink-muted)">{num(a)}</text>
          <text x={pad - 4} y={pad + xPx / 2} textAnchor="end" dominantBaseline="middle" fontSize={11} fill="var(--ink-muted)">x</text>
          <text x={pad - 4} y={pad + xPx + bPx / 2} textAnchor="end" dominantBaseline="middle" fontSize={11} fill="var(--ink-muted)">{num(b)}</text>

          {tiles.map((t, i) => (
            <g key={i}>
              <rect x={t.x} y={t.y} width={t.w} height={t.h} fill={t.fill} fillOpacity={t.op} stroke="var(--outline)" strokeWidth={1} />
              <text
                x={t.x + t.w / 2}
                y={t.y + t.h / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={t.w < 28 || t.h < 28 ? 9 : 12}
                fontWeight={600}
                fill="var(--ink)"
              >
                {t.label}
              </text>
            </g>
          ))}

          {/* outer outline */}
          <rect x={pad} y={pad} width={totalW} height={totalH} fill="none" stroke="var(--ink-soft)" strokeWidth={1.5} />
        </svg>
      </div>

      {/* Live readouts */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <div style={{ fontFamily: 'var(--font-numeric)', fontSize: 22, fontWeight: 600, color: 'var(--accent)', letterSpacing: '0.01em', minHeight: 30 }}>
          ({bin(a)})({bin(b)})
        </div>
        <div style={{ fontFamily: 'var(--font-numeric)', fontSize: 18, fontWeight: 600, color: 'var(--ink-soft)', minHeight: 24 }}>
          = {expanded(a, b)}
        </div>
      </div>

      {/* Sliders */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
        <Slider label="a" value={a} min={-5} max={5} onChange={setA} />
        <Slider label="b" value={b} min={-5} max={5} onChange={setB} />
      </div>

      {/* Plain-language read-out of what the pieces mean */}
      <p style={{ margin: 0, textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.5, color: 'var(--ink-soft)' }}>
        <strong style={{ color: 'var(--ink)' }}>Middle term {num(a + b)}:</strong> it&apos;s a + b, the two strips.<br />
        <strong style={{ color: 'var(--ink)' }}>Constant {num(a * b)}:</strong> it&apos;s a × b, the corner.
      </p>
    </div>
  )
}
