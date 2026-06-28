'use client'
/**
 * LinearRelationshipsTeenLesson (12–14, "Field Lab") — the worked-example
 * walkthrough for the Linear Relationships & Functions investigation. Built on
 * TeenLessonShell: a few narrated "watch" steps over a coordinate grid + a
 * value table, then a quick check. Exports the round generator + LineWatch so
 * the practice chapter and its re-teach reuse them. Mirrors IntegersTeenLesson.
 *
 * Difficulty ramp (curriculum id "linearRelationships"):
 *   L1 — complete a table from a rule (y = mx + b) → NumericEntry.
 *   L2 — slope / rate from a table or two points; recognise y = mx → NumericEntry.
 *   L3 — match an equation to a graphed line → ChoiceGrid; read y = mx + b
 *        features (slope / intercept) from a graph.
 */
import React, { useEffect, useMemo, useRef } from 'react'
import { speak, speakSeq } from '@/lib/useMiloSpeaker'
import type { LessonStep } from '@/components/lessons/_kit'
import type { AgeBand, Choice } from '@/components/teen/types'
import TeenLessonShell from '@/components/teen/TeenLessonShell'
import CoordGrid, { type CoordLine } from '@/components/teen/CoordGrid'
import ChoiceGrid from '@/components/teen/ChoiceGrid'
import NumericEntry, { numericEqual } from '@/components/teen/NumericEntry'

const BAND: AgeBand = '12-14'

// ── shared helpers (reused by the practice chapter) ────────────────────────
const rint = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))
/** Spoken number: a real "negative" word for negatives. */
export const spoken = (n: number) => (n < 0 ? `negative ${Math.abs(n)}` : `${n}`)
/** A signed term like "2x", "−3x", "x". */
const term = (m: number) => (m === 1 ? 'x' : m === -1 ? '−x' : `${m < 0 ? '−' : ''}${Math.abs(m)}x`)
/** y = mx + b as a tidy string. */
export function eqString(m: number, b: number): string {
  const mPart = term(m)
  if (b === 0) return `y = ${mPart}`
  return `y = ${mPart} ${b < 0 ? '−' : '+'} ${Math.abs(b)}`
}
/** Spoken equation: "y equals two x plus three". */
function eqSpoken(m: number, b: number): string {
  const mWord = m === 1 ? 'x' : m === -1 ? 'negative x' : `${spoken(m)} x`
  if (b === 0) return `y equals ${mWord}`
  return `y equals ${mWord} ${b < 0 ? 'minus' : 'plus'} ${Math.abs(b)}`
}
const shuffle = <T,>(a: T[]): T[] => [...a].sort(() => Math.random() - 0.5)

// ── Round model ────────────────────────────────────────────────────────────
// The chapter mixes three answer surfaces, so a Round carries a discriminator
// and the practice screen renders the matching primitive.
export type RoundInput = 'numeric' | 'choice'

export interface Round {
  input: RoundInput
  promptText: string
  say: string
  explain: string                 // re-teach line (also the LineWatch caption)
  /** The line the round is about, rendered on the CoordGrid + re-teach. */
  line: CoordLine
  /** A small value table to display (input "numeric", L1). */
  table?: { xs: number[]; ys: (number | null)[] }
  // numeric answer (table value or slope)
  answerNum?: number
  // choice answer (the matching equation string)
  choices?: Choice[]
  answerChoice?: string | number
}

/** Difficulty-aware round generator: L1 table value · L2 slope/rate · L3 match equation↔line / read graph. */
export function makeRound(d: 1 | 2 | 3): Round {
  if (d === 1) {
    // Complete a table from the rule y = mx + b. Ask for one missing y.
    const m = rint(1, 3)
    const b = rint(-3, 3)
    const xs = [0, 1, 2, 3]
    const ask = rint(1, 3) // never the y-intercept row, so it's a real computation
    const ys = xs.map((x, i) => (i === ask ? null : m * x + b))
    const askX = xs[ask]
    const ans = m * askX + b
    return {
      input: 'numeric',
      promptText: `Rule: ${eqString(m, b)}. Fill the missing value: when x = ${askX}, y = ?`,
      say: `The rule is ${eqSpoken(m, b)}. When x is ${spoken(askX)}, what is y?`,
      explain: `Put x = ${askX} into ${eqString(m, b)}: ${m}·${askX}${b < 0 ? ' − ' + Math.abs(b) : b > 0 ? ' + ' + b : ''} = ${ans}.`,
      line: { kind: 'line', m, b },
      table: { xs, ys },
      answerNum: ans,
    }
  }

  if (d === 2) {
    // Slope (rate of change) from two points. Never 0 (a flat line is a poor slope round).
    const nonZero = [-3, -2, -1, 1, 2, 3]
    const slope = nonZero[rint(0, nonZero.length - 1)]
    const x1 = rint(0, 2)
    const x2 = x1 + rint(1, 3)
    const b = rint(-2, 4)
    const y1 = slope * x1 + b
    const y2 = slope * x2 + b
    return {
      input: 'numeric',
      promptText: `A line passes through (${x1}, ${y1}) and (${x2}, ${y2}). What is its slope?`,
      say: `A line passes through ${x1} comma ${spoken(y1)}, and ${x2} comma ${spoken(y2)}. What is the slope?`,
      explain: `Slope = rise ÷ run = (${y2} − ${y1}) ÷ (${x2} − ${x1}) = ${y2 - y1} ÷ ${x2 - x1} = ${slope}.`,
      line: { kind: 'line', m: slope, b },
      answerNum: slope,
    }
  }

  // d === 3 — match an equation to the graphed line (ChoiceGrid).
  const m = [-2, -1, 1, 2][rint(0, 3)]
  const b = rint(-3, 3)
  const correct = eqString(m, b)
  // Pedagogically meaningful distractors: flipped slope sign, dropped intercept,
  // and swapped m/b — all classic "read the graph" slips.
  const distractors = new Set<string>()
  distractors.add(eqString(-m, b))           // wrong slope sign
  distractors.add(eqString(m, 0))            // forgot the y-intercept
  if (b !== 0) distractors.add(eqString(m, -b)) // wrong intercept sign
  distractors.add(eqString(m + (m > 0 ? 1 : -1), b)) // slightly steeper
  const opts = [correct, ...[...distractors].filter((s) => s !== correct)].slice(0, 4)
  const choices: Choice[] = shuffle(opts).map((s) => ({ value: s, label: s }))
  return {
    input: 'choice',
    promptText: 'Which equation matches the line on the graph?',
    say: 'Which equation matches the line on the graph?',
    explain: `The line crosses y at ${b} and rises ${m} for each step right, so it is ${correct}.`,
    line: { kind: 'line', m, b },
    choices,
    answerChoice: correct,
  }
}

// ── LineWatch: a narrated coordinate-grid worked example (reused for re-teach) ──
export function LineWatch({
  lines, line, table, min, max, onDone,
}: {
  lines: string[]
  line: CoordLine
  table?: { xs: number[]; ys: (number | null)[] }
  min?: number
  max?: number
  onDone: () => void
}) {
  const doneRef = useRef(onDone)
  doneRef.current = onDone
  useEffect(() => {
    const cancel = speakSeq(lines, { onDone: () => window.setTimeout(() => doneRef.current(), 1200) })
    return cancel
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const lo = min ?? -6
  const hi = max ?? 6
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, width: '100%' }}>
      <div style={{ width: '100%', maxWidth: 320 }}>
        <CoordGrid band={BAND} xRange={[lo, hi]} yRange={[lo, hi]} mode="read" lines={[line]} />
      </div>
      {table && <ValueTable xs={table.xs} ys={table.ys} />}
      <p style={{ margin: 0, maxWidth: 520, textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 15, lineHeight: 1.5, color: 'var(--ink-soft)' }}>
        {lines[lines.length - 1]}
      </p>
    </div>
  )
}

/** A compact x/y value table (mono numbers), used by L1 + the lesson. */
export function ValueTable({ xs, ys }: { xs: number[]; ys: (number | null)[] }) {
  const cell: React.CSSProperties = {
    border: '1px solid var(--outline)', padding: '6px 12px', textAlign: 'center',
    fontFamily: 'var(--font-numeric)', fontSize: 15, color: 'var(--ink)',
    fontVariantNumeric: 'tabular-nums', minWidth: 36,
  }
  const head: React.CSSProperties = { ...cell, color: 'var(--ink-soft)', fontWeight: 700, background: 'var(--bg-2)' }
  return (
    <table style={{ borderCollapse: 'collapse', background: 'var(--paper)', borderRadius: 8, overflow: 'hidden' }}>
      <tbody>
        <tr>
          <td style={head}>x</td>
          {xs.map((x, i) => <td key={`x${i}`} style={cell}>{x}</td>)}
        </tr>
        <tr>
          <td style={head}>y</td>
          {ys.map((y, i) => <td key={`y${i}`} style={{ ...cell, color: y === null ? 'var(--accent)' : 'var(--ink)', fontWeight: y === null ? 700 : 500 }}>{y === null ? '?' : y}</td>)}
        </tr>
      </tbody>
    </table>
  )
}

// A one-question check inside the lesson (retry allowed, no penalty).
function SlopeAsk({ prompt, say, line, answer, onDone }: {
  prompt: string; say: string; line: CoordLine; answer: number; onDone: () => void
}) {
  const [status, setStatus] = React.useState<'idle' | 'correct' | 'wrong'>('idle')
  const spokenRef = useRef(false)
  useEffect(() => { if (!spokenRef.current) { spokenRef.current = true; speak(say) } }, []) // eslint-disable-line
  function submit(v: number) {
    if (status === 'correct') return
    if (numericEqual(v, answer)) { setStatus('correct'); speak('Yes — that’s the slope.'); window.setTimeout(onDone, 1400) }
    else { setStatus('wrong'); speak('Not quite — count the rise over the run again.'); window.setTimeout(() => setStatus('idle'), 1200) }
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%' }}>
      <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>{prompt}</p>
      <div style={{ width: '100%', maxWidth: 300 }}>
        <CoordGrid band={BAND} xRange={[-6, 6]} yRange={[-6, 6]} mode="read" lines={[line]} />
      </div>
      <NumericEntry band={BAND} status={status} onSubmit={(v) => submit(v)} placeholder="slope" allowDecimal={false} />
    </div>
  )
}

interface Props { band?: AgeBand; childName: string; onLessonComplete: () => void }

export default function LinearRelationshipsTeenLesson({ childName, onLessonComplete }: Props) {
  // Freeze the per-render randomized example so it doesn't reshuffle on re-render.
  const ex = useMemo(() => {
    const m = 2, b = 1
    return { m, b, xs: [0, 1, 2, 3], ys: [b, m * 1 + b, m * 2 + b, m * 3 + b] }
  }, [])

  const steps: LessonStep[] = [
    {
      bubble: 'A linear rule links x and y in a straight line. Watch.', mood: 'happy',
      render: (d) => (
        <LineWatch
          lines={[
            'A linear relationship pairs every x with one y, and the points fall on a straight line.',
            `Here the rule is ${eqSpoken(ex.m, ex.b)} — for each step right, the line climbs ${ex.m}.`,
          ]}
          line={{ kind: 'line', m: ex.m, b: ex.b }}
          onDone={d}
        />
      ),
    },
    {
      bubble: 'A table just lists points from the rule.', mood: 'happy',
      render: (d) => (
        <LineWatch
          lines={[
            `Build the table from ${eqSpoken(ex.m, ex.b)}.`,
            `When x is 2, y is ${ex.m}·2 plus ${ex.b}, which is ${ex.m * 2 + ex.b}. Each row is one point on the line.`,
          ]}
          line={{ kind: 'line', m: ex.m, b: ex.b }}
          table={{ xs: ex.xs, ys: ex.ys }}
          onDone={d}
        />
      ),
    },
    {
      bubble: 'Slope is rise over run — how fast y changes.', mood: 'thinking',
      render: (d) => (
        <LineWatch
          lines={[
            'Slope measures steepness: how much y changes for each step in x.',
            `From (0, ${ex.b}) to (1, ${ex.m + ex.b}), y rises ${ex.m} while x runs 1, so the slope is ${ex.m}. The number in front of x is the slope.`,
          ]}
          line={{ kind: 'line', m: ex.m, b: ex.b }}
          onDone={d}
        />
      ),
    },
    {
      bubble: 'Your turn — read the slope off the graph.', mood: 'thinking',
      render: (d) => (
        <SlopeAsk
          prompt="What is the slope of this line?"
          say="What is the slope of this line?"
          line={{ kind: 'line', m: 3, b: -2 }}
          answer={3}
          onDone={d}
        />
      ),
    },
  ]

  return (
    <TeenLessonShell
      band={BAND}
      childName={childName}
      chapterTitle="Linear Relationships & Functions"
      steps={steps}
      finalSpeech={`Nice work, ${childName}. You can read tables, find slope, and match a rule to its line. Let’s investigate.`}
      onLessonComplete={onLessonComplete}
    />
  )
}
