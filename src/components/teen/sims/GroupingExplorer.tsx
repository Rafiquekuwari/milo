'use client'
/**
 * GroupingExplorer — an interactive concept "simulation" for the Field Lab (teen),
 * for the Order of Operations chapter.
 *
 * A fixed set of numbers (2, 3, 4) joined by + and ×. A toggle moves the brackets:
 *   • none        → 2 + 3 × 4   (multiply first → 14)
 *   • around 2+3  → (2 + 3) × 4 (bracket first  → 20)
 * The learner watches the step-by-step evaluation re-derive a DIFFERENT result,
 * making vivid why order matters. Toggle-driven (not free-drag) so it's
 * touch-friendly and accessible. Mature Field Lab look — an instrument, not a
 * cartoon. Colours/fonts via CSS variables only.
 */
import { useEffect, useRef, useState } from 'react'
import type { AgeBand } from '@/components/teen/types'

export interface GroupingExplorerProps {
  band: AgeBand
  /** Called once on mount so a host (lesson/explore step) can unlock "Continue". */
  onReady?: () => void
}

// The fixed operands of the expression.
const A = 2
const B = 3
const C = 4

type Mode = 'none' | 'group'

interface Eval {
  expr: string          // the expression with brackets in place
  steps: string[]       // ordered worked-solution lines
  result: number
  sentence: string      // plain-language summary
}

const NO_BRACKETS: Eval = {
  expr: `${A} + ${B} × ${C}`,
  steps: [
    `Multiplication comes before adding.`,
    `First do ${B} × ${C} = ${B * C}.`,
    `Then ${A} + ${B * C} = ${A + B * C}.`,
  ],
  result: A + B * C,
  sentence: `With no brackets, × goes first: ${B} × ${C} is grouped, then ${A} is added.`,
}

const WITH_BRACKETS: Eval = {
  expr: `(${A} + ${B}) × ${C}`,
  steps: [
    `Brackets are always done first.`,
    `Inside: ${A} + ${B} = ${A + B}.`,
    `Then ${A + B} × ${C} = ${(A + B) * C}.`,
  ],
  result: (A + B) * C,
  sentence: `Brackets jump the queue: ${A} + ${B} is grouped first, then multiplied by ${C}.`,
}

/** The expression rendered as mono text, highlighting the bracketed part. */
function ExpressionView({ mode }: { mode: Mode }) {
  const numStyle: React.CSSProperties = { color: 'var(--ink)' }
  const opStyle: React.CSSProperties = { color: 'var(--ink-soft)', margin: '0 0.18em' }
  const brk: React.CSSProperties = {
    color: 'var(--accent)',
    fontWeight: 700,
  }
  return (
    <div
      style={{
        fontFamily: 'var(--font-numeric)',
        fontVariantNumeric: 'tabular-nums',
        fontSize: 34,
        fontWeight: 700,
        letterSpacing: '0.02em',
        textAlign: 'center',
        lineHeight: 1.2,
        minHeight: 44,
      }}
      aria-label={mode === 'group' ? WITH_BRACKETS.expr : NO_BRACKETS.expr}
    >
      {mode === 'group' ? (
        <>
          <span style={brk}>(</span>
          <span style={numStyle}>{A}</span>
          <span style={opStyle}>+</span>
          <span style={numStyle}>{B}</span>
          <span style={brk}>)</span>
          <span style={opStyle}>×</span>
          <span style={numStyle}>{C}</span>
        </>
      ) : (
        <>
          <span style={numStyle}>{A}</span>
          <span style={opStyle}>+</span>
          {/* the implicit ×-group, faintly underlined to show what binds first */}
          <span
            style={{
              borderBottom: '2px solid var(--accent)',
              paddingBottom: 2,
              display: 'inline-block',
            }}
          >
            <span style={numStyle}>{B}</span>
            <span style={opStyle}>×</span>
            <span style={numStyle}>{C}</span>
          </span>
        </>
      )}
    </div>
  )
}

function ToggleButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        flex: 1,
        padding: '10px 12px',
        borderRadius: 10,
        border: `1px solid ${active ? 'var(--accent)' : 'var(--outline)'}`,
        background: active ? 'var(--accent)' : 'var(--paper)',
        color: active ? 'var(--fg-on-color)' : 'var(--ink-soft)',
        fontFamily: 'var(--font-numeric)',
        fontVariantNumeric: 'tabular-nums',
        fontSize: 16,
        fontWeight: 700,
        cursor: 'pointer',
        transition: 'background 200ms var(--ease-smooth), color 200ms var(--ease-smooth), border-color 200ms var(--ease-smooth)',
      }}
    >
      {label}
    </button>
  )
}

export default function GroupingExplorer({ band, onReady }: GroupingExplorerProps) {
  void band // theme comes from the ancestor data-band scope
  const [mode, setMode] = useState<Mode>('none')
  const readyRef = useRef(onReady)
  readyRef.current = onReady
  useEffect(() => { readyRef.current?.() }, [])

  const view = mode === 'group' ? WITH_BRACKETS : NO_BRACKETS
  const other = mode === 'group' ? NO_BRACKETS : WITH_BRACKETS
  const changed = view.result !== other.result

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, width: '100%', maxWidth: 400 }}>
      {/* The live expression, brackets in place. */}
      <ExpressionView mode={mode} />

      {/* Bracket-placement control. */}
      <div style={{ display: 'flex', gap: 10, width: '100%' }} role="group" aria-label="Bracket placement">
        <ToggleButton active={mode === 'none'} label="no brackets" onClick={() => setMode('none')} />
        <ToggleButton active={mode === 'group'} label={`( ${A} + ${B} ) ×`} onClick={() => setMode('group')} />
      </div>

      {/* Step-by-step evaluation. */}
      <ol
        style={{
          margin: 0, padding: '14px 16px', listStyle: 'none', width: '100%',
          display: 'flex', flexDirection: 'column', gap: 8,
          background: 'var(--bg-2)', border: '1px solid var(--outline)', borderRadius: 12,
        }}
      >
        {view.steps.map((line, i) => (
          <li
            key={`${mode}-${i}`}
            style={{
              fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.5,
              color: i === view.steps.length - 1 ? 'var(--ink)' : 'var(--ink-soft)',
              fontWeight: i === view.steps.length - 1 ? 600 : 400,
            }}
          >
            {line}
          </li>
        ))}
      </ol>

      {/* Live result readout. */}
      <div
        style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 12,
          fontFamily: 'var(--font-numeric)', fontVariantNumeric: 'tabular-nums',
        }}
      >
        <span style={{ fontSize: 18, color: 'var(--ink-soft)', fontWeight: 600 }}>= </span>
        <span style={{ fontSize: 40, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.01em' }}>
          {view.result}
        </span>
      </div>

      {/* Plain-language sentence. */}
      <p style={{ margin: 0, textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.5, color: 'var(--ink-soft)' }}>
        {view.sentence}{' '}
        {changed && (
          <span>
            <strong style={{ color: 'var(--ink)' }}>Same numbers, different answer</strong> — moving the brackets changed the result from{' '}
            <span style={{ fontFamily: 'var(--font-numeric)', fontVariantNumeric: 'tabular-nums', color: 'var(--ink)', fontWeight: 600 }}>{other.result}</span>{' '}to{' '}
            <span style={{ fontFamily: 'var(--font-numeric)', fontVariantNumeric: 'tabular-nums', color: 'var(--accent)', fontWeight: 600 }}>{view.result}</span>.
          </span>
        )}
      </p>
    </div>
  )
}
