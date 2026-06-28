'use client'

import React from 'react'
import type { AgeBand } from '@/components/teen/types'

/** The geometry templates this diagram can render. */
export type FigureKind =
  | 'triangle'
  | 'right-triangle'
  | 'rectangle'
  | 'parallelogram'
  | 'circle'
  | 'prism'
  | 'cylinder'

export interface FigureDiagramProps {
  band: AgeBand
  kind: FigureKind
  /** Dimension labels keyed by part id (e.g. { base: 8, height: '6 cm', r: 5 }). */
  labels: Record<string, string | number>
  /** Part id to emphasise (matches a labels key or a template part name). */
  highlight?: string
}

// A single rendered part of a template: its outline geometry + where its label sits.
interface Part {
  /** part id — matched against `labels` keys and `highlight`. */
  id: string
  /** SVG element drawing the (hairline) edge/measure for this part. */
  draw: (highlighted: boolean) => React.ReactNode
  /** Where this part's dimension label is anchored, if it has one. */
  label?: { x: number; y: number; anchor: 'start' | 'middle' | 'end' }
}

interface Template {
  /** The base outline (no per-part emphasis). */
  outline: (highlightId?: string) => React.ReactNode
  parts: Part[]
}

const VB_W = 320
const VB_H = 240

const STROKE = 'var(--ink-soft)'
const STROKE_HI = 'var(--accent)'
const MEASURE = 'var(--ink-muted)'

function strokeFor(highlighted: boolean): string {
  return highlighted ? STROKE_HI : STROKE
}

function widthFor(highlighted: boolean): number {
  return highlighted ? 2 : 1
}

// ── Templates ──────────────────────────────────────────────────────────────
// Each is laid out within the 320×240 viewBox with margins so labels never clip.

function triangle(right: boolean): Template {
  // Apex up; right-triangle squares the bottom-left corner.
  const ax = right ? 56 : 130
  const ay = 48
  const bx = 56
  const by = 196
  const cx = 268
  const cy = 196
  const points = `${ax},${ay} ${bx},${by} ${cx},${cy}`

  return {
    outline: () => (
      <polygon
        points={points}
        fill="var(--bg-1)"
        stroke={STROKE}
        strokeWidth={1}
        strokeLinejoin="round"
      />
    ),
    parts: [
      {
        id: 'base',
        draw: (hi) => (
          <line
            x1={bx}
            y1={by}
            x2={cx}
            y2={cy}
            stroke={strokeFor(hi)}
            strokeWidth={widthFor(hi)}
          />
        ),
        label: { x: (bx + cx) / 2, y: by + 22, anchor: 'middle' },
      },
      {
        id: 'height',
        draw: (hi) => (
          <line
            x1={ax}
            y1={ay}
            x2={ax}
            y2={by}
            stroke={strokeFor(hi)}
            strokeWidth={widthFor(hi)}
            strokeDasharray="4 4"
          />
        ),
        label: { x: ax - 12, y: (ay + by) / 2, anchor: 'end' },
      },
      {
        id: 'hypotenuse',
        draw: (hi) => (
          <line
            x1={ax}
            y1={ay}
            x2={cx}
            y2={cy}
            stroke={strokeFor(hi)}
            strokeWidth={widthFor(hi)}
          />
        ),
        label: { x: (ax + cx) / 2 + 10, y: (ay + cy) / 2 - 8, anchor: 'start' },
      },
      ...(right
        ? [
            {
              id: 'rightAngle',
              draw: (hi: boolean) => (
                <path
                  d={`M ${bx + 16} ${by} L ${bx + 16} ${by - 16} L ${bx} ${by - 16}`}
                  fill="none"
                  stroke={strokeFor(hi)}
                  strokeWidth={1}
                />
              ),
            },
          ]
        : []),
    ],
  }
}

function quad(parallelogram: boolean): Template {
  // Rectangle by default; parallelogram shears the top edge.
  const left = 64
  const right = 256
  const top = 56
  const bottom = 184
  const shear = parallelogram ? 40 : 0
  const points = `${left + shear},${top} ${right + shear},${top} ${right},${bottom} ${left},${bottom}`

  return {
    outline: () => (
      <polygon
        points={points}
        fill="var(--bg-1)"
        stroke={STROKE}
        strokeWidth={1}
        strokeLinejoin="round"
      />
    ),
    parts: [
      {
        id: parallelogram ? 'base' : 'width',
        draw: (hi) => (
          <line
            x1={left}
            y1={bottom}
            x2={right}
            y2={bottom}
            stroke={strokeFor(hi)}
            strokeWidth={widthFor(hi)}
          />
        ),
        label: { x: (left + right) / 2, y: bottom + 22, anchor: 'middle' },
      },
      {
        id: 'height',
        draw: (hi) =>
          parallelogram ? (
            <line
              x1={left + shear}
              y1={top}
              x2={left + shear}
              y2={bottom}
              stroke={strokeFor(hi)}
              strokeWidth={widthFor(hi)}
              strokeDasharray="4 4"
            />
          ) : (
            <line
              x1={left}
              y1={top}
              x2={left}
              y2={bottom}
              stroke={strokeFor(hi)}
              strokeWidth={widthFor(hi)}
            />
          ),
        label: parallelogram
          ? { x: left + shear - 12, y: (top + bottom) / 2, anchor: 'end' }
          : { x: left - 12, y: (top + bottom) / 2, anchor: 'end' },
      },
      ...(parallelogram
        ? []
        : [
            {
              id: 'side',
              draw: (hi: boolean) => (
                <line
                  x1={right}
                  y1={top}
                  x2={right}
                  y2={bottom}
                  stroke={strokeFor(hi)}
                  strokeWidth={widthFor(hi)}
                />
              ),
              label: { x: right + 12, y: (top + bottom) / 2, anchor: 'start' as const },
            },
          ]),
    ],
  }
}

function circle(): Template {
  const cx = VB_W / 2
  const cy = VB_H / 2
  const r = 84

  return {
    outline: () => (
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="var(--bg-1)"
        stroke={STROKE}
        strokeWidth={1}
      />
    ),
    parts: [
      {
        id: 'r',
        draw: (hi) => (
          <>
            <line
              x1={cx}
              y1={cy}
              x2={cx + r}
              y2={cy}
              stroke={strokeFor(hi)}
              strokeWidth={widthFor(hi)}
            />
            <circle cx={cx} cy={cy} r={2} fill={MEASURE} />
          </>
        ),
        label: { x: cx + r / 2, y: cy - 8, anchor: 'middle' },
      },
      {
        id: 'd',
        draw: (hi) => (
          <line
            x1={cx - r}
            y1={cy}
            x2={cx + r}
            y2={cy}
            stroke={strokeFor(hi)}
            strokeWidth={widthFor(hi)}
            strokeDasharray="4 4"
          />
        ),
        label: { x: cx, y: cy + 20, anchor: 'middle' },
      },
    ],
  }
}

function prism(): Template {
  // Rectangular prism in cabinet projection.
  const x = 56
  const y = 96
  const w = 150
  const h = 96
  const dx = 52
  const dy = -40

  const front = `${x},${y} ${x + w},${y} ${x + w},${y + h} ${x},${y + h}`

  return {
    outline: () => (
      <>
        {/* back-visible edges */}
        <polyline
          points={`${x},${y} ${x + dx},${y + dy} ${x + w + dx},${y + dy} ${x + w + dx},${y + h + dy} ${x + w},${y + h}`}
          fill="none"
          stroke={STROKE}
          strokeWidth={1}
        />
        <line x1={x + w} y1={y} x2={x + w + dx} y2={y + dy} stroke={STROKE} strokeWidth={1} />
        {/* hidden edge */}
        <polyline
          points={`${x},${y + h} ${x + dx},${y + h + dy} ${x + dx},${y + dy}`}
          fill="none"
          stroke={MEASURE}
          strokeWidth={1}
          strokeDasharray="3 4"
        />
        <line
          x1={x + dx}
          y1={y + h + dy}
          x2={x + w + dx}
          y2={y + h + dy}
          stroke={MEASURE}
          strokeWidth={1}
          strokeDasharray="3 4"
        />
        {/* front face */}
        <polygon
          points={front}
          fill="var(--bg-1)"
          stroke={STROKE}
          strokeWidth={1}
          strokeLinejoin="round"
        />
      </>
    ),
    parts: [
      {
        id: 'length',
        draw: (hi) => (
          <line
            x1={x}
            y1={y + h}
            x2={x + w}
            y2={y + h}
            stroke={strokeFor(hi)}
            strokeWidth={widthFor(hi)}
          />
        ),
        label: { x: x + w / 2, y: y + h + 22, anchor: 'middle' },
      },
      {
        id: 'height',
        draw: (hi) => (
          <line
            x1={x}
            y1={y}
            x2={x}
            y2={y + h}
            stroke={strokeFor(hi)}
            strokeWidth={widthFor(hi)}
          />
        ),
        label: { x: x - 12, y: y + h / 2, anchor: 'end' },
      },
      {
        id: 'depth',
        draw: (hi) => (
          <line
            x1={x + w}
            y1={y}
            x2={x + w + dx}
            y2={y + dy}
            stroke={strokeFor(hi)}
            strokeWidth={widthFor(hi)}
          />
        ),
        label: { x: x + w + dx / 2 + 10, y: y + dy / 2, anchor: 'start' },
      },
    ],
  }
}

function cylinder(): Template {
  const cx = VB_W / 2
  const rx = 64
  const ry = 20
  const top = 56
  const bottom = 184

  return {
    outline: () => (
      <>
        {/* body */}
        <path
          d={`M ${cx - rx} ${top} L ${cx - rx} ${bottom} A ${rx} ${ry} 0 0 0 ${cx + rx} ${bottom} L ${cx + rx} ${top}`}
          fill="var(--bg-1)"
          stroke={STROKE}
          strokeWidth={1}
        />
        {/* hidden back of bottom ellipse */}
        <path
          d={`M ${cx - rx} ${bottom} A ${rx} ${ry} 0 0 1 ${cx + rx} ${bottom}`}
          fill="none"
          stroke={MEASURE}
          strokeWidth={1}
          strokeDasharray="3 4"
        />
        {/* top ellipse */}
        <ellipse
          cx={cx}
          cy={top}
          rx={rx}
          ry={ry}
          fill="var(--bg-2)"
          stroke={STROKE}
          strokeWidth={1}
        />
      </>
    ),
    parts: [
      {
        id: 'r',
        draw: (hi) => (
          <>
            <line
              x1={cx}
              y1={top}
              x2={cx + rx}
              y2={top}
              stroke={strokeFor(hi)}
              strokeWidth={widthFor(hi)}
            />
            <circle cx={cx} cy={top} r={2} fill={MEASURE} />
          </>
        ),
        label: { x: cx + rx / 2, y: top - 8, anchor: 'middle' },
      },
      {
        id: 'height',
        draw: (hi) => (
          <line
            x1={cx - rx}
            y1={top}
            x2={cx - rx}
            y2={bottom}
            stroke={strokeFor(hi)}
            strokeWidth={widthFor(hi)}
          />
        ),
        label: { x: cx - rx - 12, y: (top + bottom) / 2, anchor: 'end' },
      },
    ],
  }
}

function templateFor(kind: FigureKind): Template {
  switch (kind) {
    case 'triangle':
      return triangle(false)
    case 'right-triangle':
      return triangle(true)
    case 'rectangle':
      return quad(false)
    case 'parallelogram':
      return quad(true)
    case 'circle':
      return circle()
    case 'prism':
      return prism()
    case 'cylinder':
      return cylinder()
  }
}

/**
 * FigureDiagram — read-only labelled geometry figure (SVG) from a fixed set of
 * templates. Dimension labels come from `labels` (keyed by part id), and one
 * part may be emphasised via `highlight`. Hairline strokes, mono labels; calm
 * styling driven entirely by theme CSS variables. `band` is accepted for API
 * parity (the surrounding `data-band` scope already tunes the palette).
 */
export default function FigureDiagram({
  band,
  kind,
  labels,
  highlight,
}: FigureDiagramProps): React.ReactElement {
  void band

  const template = templateFor(kind)

  return (
    <figure
      style={{
        margin: 0,
        width: '100%',
        maxWidth: 420,
        fontFamily: 'var(--font-body)',
        color: 'var(--ink)',
      }}
    >
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        role="img"
        aria-label={`${kind.replace('-', ' ')} diagram`}
        style={{
          display: 'block',
          width: '100%',
          height: 'auto',
          border: '1px solid var(--outline)',
          borderRadius: 8,
          background: 'var(--paper)',
        }}
      >
        {template.outline(highlight)}

        {template.parts.map((part) => {
          const highlighted = highlight === part.id
          const value = labels[part.id]
          const hasLabel = part.label && value !== undefined && value !== ''

          return (
            <g key={part.id}>
              {part.draw(highlighted)}
              {hasLabel && part.label ? (
                <text
                  x={part.label.x}
                  y={part.label.y}
                  textAnchor={part.label.anchor}
                  dominantBaseline="middle"
                  style={{
                    fontFamily: 'var(--font-numeric)',
                    fontSize: 14,
                    fill: highlighted ? 'var(--accent)' : 'var(--ink-soft)',
                    fontWeight: highlighted ? 600 : 400,
                  }}
                >
                  {String(value)}
                </text>
              ) : null}
            </g>
          )
        })}
      </svg>
    </figure>
  )
}
