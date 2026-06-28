'use client'
/**
 * TransformExplorer — an interactive concept "simulation" for the Field Lab (teen,
 * 15–16, Geometry: Transformations). The learner slides translate (dx, dy), picks
 * a reflect axis, and slides a dilation scale; the image triangle and the live
 * transformation-rule readout update together (Desmos / GeoGebra style).
 *
 * Slider/button driven (not free-drag) so it is touch-friendly, accessible, and
 * deterministic. Mature Field Lab look — an instrument, not a cartoon. Reuses
 * CoordGrid for the grid; the pre-image + image triangles are drawn as inline SVG
 * overlaid in the same viewBox so they share the grid's coordinate mapping.
 * Theme comes from the ancestor data-band scope; colours/fonts via CSS vars only.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import type { AgeBand, Pt } from '@/components/teen/types'
import CoordGrid from '@/components/teen/CoordGrid'

export interface TransformExplorerProps {
  band: AgeBand
  /** Called once on mount so a host (lesson / explore step) can unlock "Continue". */
  onReady?: () => void
}

const RANGE = 8 // grid spans -8..8

// CoordGrid's internal SVG geometry (must match CoordGrid.tsx so our overlay lines up).
const VW = 480
const VH = 480
const PAD = 28
const PLOT = VW - PAD * 2
const SPAN = RANGE * 2

const sx = (x: number) => PAD + ((x - -RANGE) / SPAN) * PLOT
const sy = (y: number) => PAD + (1 - (y - -RANGE) / SPAN) * PLOT

type Axis = 'none' | 'x' | 'y'

// The fixed pre-image triangle.
const BASE: Pt[] = [
  { x: 1, y: 1 },
  { x: 3, y: 1 },
  { x: 1, y: 4 },
]

const fmt = (n: number) => (n < 0 ? `−${Math.abs(n)}` : String(n))

function applyTransform(p: Pt, dx: number, dy: number, axis: Axis, scale: number): Pt {
  let { x, y } = p
  // Dilate from the origin first.
  x *= scale
  y *= scale
  // Reflect across the chosen axis.
  if (axis === 'x') y = -y
  if (axis === 'y') x = -x
  // Translate.
  return { x: x + dx, y: y + dy }
}

function ruleText(dx: number, dy: number, axis: Axis, scale: number): string {
  const parts: string[] = []
  if (scale !== 1) parts.push(`scale ×${scale} from the origin`)
  if (axis === 'x') parts.push('reflect across the x-axis')
  if (axis === 'y') parts.push('reflect across the y-axis')
  if (dx !== 0 || dy !== 0) parts.push(`translate (x ${dx >= 0 ? '+' : '−'} ${Math.abs(dx)}, y ${dy >= 0 ? '+' : '−'} ${Math.abs(dy)})`)
  if (parts.length === 0) return 'no change — image sits on the pre-image'
  return parts.join(', then ')
}

function Slider({ label, value, min, max, onChange }: {
  label: string; value: number; min: number; max: number; onChange: (n: number) => void
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', fontFamily: 'var(--font-body)' }}>
      <span style={{ width: 80, fontSize: 14, color: 'var(--ink-soft)' }}>{label}</span>
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

export default function TransformExplorer({ band, onReady }: TransformExplorerProps) {
  const [dx, setDx] = useState(2)
  const [dy, setDy] = useState(1)
  const [axis, setAxis] = useState<Axis>('none')
  const [scale, setScale] = useState(1)
  const readyRef = useRef(onReady)
  readyRef.current = onReady
  useEffect(() => { readyRef.current?.() }, [])

  const image = useMemo(
    () => BASE.map((p) => applyTransform(p, dx, dy, axis, scale)),
    [dx, dy, axis, scale],
  )

  const basePoly = BASE.map((p) => `${sx(p.x)},${sy(p.y)}`).join(' ')
  const imgPoly = image.map((p) => `${sx(p.x)},${sy(p.y)}`).join(' ')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%', maxWidth: 380 }}>
      <div style={{ position: 'relative', width: '100%' }}>
        <CoordGrid band={band} xRange={[-RANGE, RANGE]} yRange={[-RANGE, RANGE]} mode="read" />
        {/* Overlay the two triangles in the SAME viewBox so they share CoordGrid's mapping. */}
        <svg
          viewBox={`0 0 ${VW} ${VH}`}
          width="100%"
          aria-hidden="true"
          style={{ position: 'absolute', inset: 0, display: 'block', pointerEvents: 'none', overflow: 'visible' }}
        >
          {/* Pre-image (quiet, dashed). */}
          <polygon
            points={basePoly}
            fill="color-mix(in srgb, var(--ink-soft) 12%, transparent)"
            stroke="var(--ink-soft)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            opacity={0.8}
          />
          {/* Image (accent). */}
          <polygon
            points={imgPoly}
            fill="color-mix(in srgb, var(--accent) 18%, transparent)"
            stroke="var(--accent)"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {image.map((p, i) => (
            <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={4} fill="var(--accent)" stroke="var(--paper)" strokeWidth="1.5" />
          ))}
        </svg>
      </div>

      {/* Live rule readout */}
      <div style={{
        fontFamily: 'var(--font-numeric)', fontSize: 18, fontWeight: 600, color: 'var(--accent)',
        textAlign: 'center', lineHeight: 1.4, minHeight: 50,
      }}>
        {ruleText(dx, dy, axis, scale)}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
        <Slider label="translate dx" value={dx} min={-5} max={5} onChange={setDx} />
        <Slider label="translate dy" value={dy} min={-5} max={5} onChange={setDy} />
        <Slider label="scale" value={scale} min={1} max={3} onChange={setScale} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', fontFamily: 'var(--font-body)' }}>
          <span style={{ width: 80, fontSize: 14, color: 'var(--ink-soft)' }}>reflect</span>
          <div style={{ display: 'flex', gap: 8, flex: 1 }}>
            {([['none', 'none'], ['x', 'x-axis'], ['y', 'y-axis']] as [Axis, string][]).map(([a, label]) => {
              const on = axis === a
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAxis(a)}
                  style={{
                    flex: 1, padding: '8px 0', borderRadius: 8,
                    background: on ? 'var(--accent)' : 'transparent',
                    border: `1px solid ${on ? 'var(--accent)' : 'var(--outline)'}`,
                    color: on ? 'var(--fg-on-color)' : 'var(--ink-soft)',
                    fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                  }}
                  aria-pressed={on}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <p style={{ margin: 0, textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.5, color: 'var(--ink-soft)' }}>
        The dashed triangle is the <strong style={{ color: 'var(--ink)' }}>pre-image</strong>; the solid one is the <strong style={{ color: 'var(--ink)' }}>image</strong>. Translate and reflect keep its size; scaling makes it larger.
      </p>
    </div>
  )
}
