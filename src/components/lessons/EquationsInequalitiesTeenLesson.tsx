'use client'
/**
 * EquationsInequalitiesTeenLesson (12–14, "Field Lab") — worked examples for the
 * Equations & Inequalities investigation. Built on TeenLessonShell: a few narrated
 * "watch" steps (balance / inverse-operations / sign-flip) plus a quick check.
 * Exports the round generator + EquationWatch so the practice chapter and its
 * re-teach reuse them. Mirrors IntegersTeenLesson in teen chrome.
 *
 * Difficulty ramp (curriculum id "equationsInequalities"):
 *   L1 one-step equations (all four ops)
 *   L2 two-step equations  +  one-step inequalities (pick the matching line image)
 *   L3 variables on both sides  +  sign-flip inequalities (×/÷ by a negative)
 */
import React, { useEffect, useMemo, useRef } from 'react'
import { speak, speakSeq } from '@/lib/useMiloSpeaker'
import type { LessonStep } from '@/components/lessons/_kit'
import type { AgeBand, Choice } from '@/components/teen/types'
import TeenLessonShell from '@/components/teen/TeenLessonShell'
import NumberLine from '@/components/teen/NumberLine'
import ChoiceGrid from '@/components/teen/ChoiceGrid'

const BAND: AgeBand = '12-14'

// ── shared helpers (reused by the practice chapter) ────────────────────────
const rint = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))
const nz = (lo: number, hi: number) => { let v = rint(lo, hi); while (v === 0) v = rint(lo, hi); return v }
/** Pretty integer: a real minus sign for negatives. */
export const fmtInt = (n: number) => (n < 0 ? `−${Math.abs(n)}` : String(n))
/** Spoken integer: "negative four". */
export const spoken = (n: number) => (n < 0 ? `negative ${Math.abs(n)}` : `${n}`)
const shuffle = <T,>(a: T[]): T[] => [...a].sort(() => Math.random() - 0.5)

/** A signed coefficient term like "3x", "−x", "x". */
function coefTerm(c: number): string {
  if (c === 1) return 'x'
  if (c === -1) return '−x'
  return `${fmtInt(c)}x`
}
/** "+ 5" / "− 3" (a leading-friendly signed addend). */
function addend(n: number): string {
  return n < 0 ? `− ${Math.abs(n)}` : `+ ${n}`
}

const ineqLabel = (op: string, b: number) => `x ${op} ${fmtInt(b)}`

// ── Round model: numeric "solve for x", or MCQ for inequalities ────────────
export interface Round {
  kind: 'numeric' | 'choice'
  promptText: string          // the equation/inequality, rendered in the bubble
  say: string                 // spoken prompt
  answer: number              // for numeric: x; for choice: the boundary value (b) of the answer
  choices?: Choice[]          // choice rounds only (the answer choice's value === answer)
  /** Read-only line shown to support inequality rounds (boundary marked). */
  line?: { min: number; max: number; marked: number[] }
  explain: string             // re-teach line (one sentence)
}

/**
 * Difficulty-aware round generator.
 *   L1: one-step equations (numeric) · L2: two-step equations + one-step
 *   inequalities (MCQ) · L3: variables both sides + sign-flip inequalities.
 */
export function makeRound(d: 1 | 2 | 3): Round {
  if (d === 1) {
    // one-step, all four operations
    const op = rint(0, 3)
    const x = nz(-9, 9)
    if (op === 0) {
      const b = nz(-9, 9)
      return {
        kind: 'numeric',
        promptText: `x ${addend(b)} = ${fmtInt(x + b)}`,
        say: `Solve. x plus ${spoken(b)} equals ${spoken(x + b)}.`,
        answer: x,
        explain: `Subtract ${fmtInt(b)} from both sides: x = ${fmtInt(x + b)} − (${fmtInt(b)}) = ${fmtInt(x)}.`,
      }
    }
    if (op === 1) {
      const b = nz(-9, 9)
      return {
        kind: 'numeric',
        promptText: `x ${addend(-b)} = ${fmtInt(x - b)}`,
        say: `Solve. x minus ${spoken(b)} equals ${spoken(x - b)}.`,
        answer: x,
        explain: `Add ${fmtInt(b)} to both sides: x = ${fmtInt(x - b)} + ${fmtInt(b)} = ${fmtInt(x)}.`,
      }
    }
    if (op === 2) {
      const c = nz(2, 6)
      return {
        kind: 'numeric',
        promptText: `${coefTerm(c)} = ${fmtInt(c * x)}`,
        say: `Solve. ${c} x equals ${spoken(c * x)}.`,
        answer: x,
        explain: `Divide both sides by ${c}: x = ${fmtInt(c * x)} ÷ ${c} = ${fmtInt(x)}.`,
      }
    }
    // op === 3 : x / c = q
    const c = rint(2, 6)
    const xx = nz(-8, 8)
    return {
      kind: 'numeric',
      promptText: `x ÷ ${c} = ${fmtInt(xx)}`,
      say: `Solve. x divided by ${c} equals ${spoken(xx)}.`,
      answer: xx * c,
      explain: `Multiply both sides by ${c}: x = ${fmtInt(xx)} × ${c} = ${fmtInt(xx * c)}.`,
    }
  }

  if (d === 2) {
    if (Math.random() < 0.55) {
      // two-step equation: a*x + b = r
      const x = nz(-8, 8)
      const a = nz(2, 6)
      const b = nz(-9, 9)
      const r = a * x + b
      return {
        kind: 'numeric',
        promptText: `${coefTerm(a)} ${addend(b)} = ${fmtInt(r)}`,
        say: `Solve. ${a} x ${b < 0 ? 'minus ' + Math.abs(b) : 'plus ' + b} equals ${spoken(r)}.`,
        answer: x,
        choices: undefined,
        explain: `Undo + first: ${fmtInt(r)} − (${fmtInt(b)}) = ${fmtInt(r - b)}, then ÷ ${a}: x = ${fmtInt(x)}.`,
      }
    }
    // one-step inequality (no sign flip): x + b > r  or  x + b < r  →  pick the line
    const b = nz(-7, 7)
    const bound = nz(-6, 6)
    const gt = Math.random() < 0.5
    const op = gt ? '>' : '<'
    const choices: Choice[] = shuffle([
      { value: bound, label: ineqLabel(op, bound) },                         // correct
      { value: bound + 100, label: ineqLabel(gt ? '<' : '>', bound) },       // flipped symbol (common error)
      { value: bound + 200, label: ineqLabel(op, bound + b) },               // forgot to undo + b
      { value: bound + 300, label: ineqLabel(gt ? '<' : '>', bound + b) },   // both errors
    ])
    return {
      kind: 'choice',
      promptText: `x ${addend(b)} ${op} ${fmtInt(bound + b)}`,
      say: `Solve the inequality. x ${b < 0 ? 'minus ' + Math.abs(b) : 'plus ' + b} is ${gt ? 'greater' : 'less'} than ${spoken(bound + b)}. Which line shows x?`,
      answer: bound,
      choices,
      line: { min: bound - 4, max: bound + 4, marked: [bound] },
      explain: `${b < 0 ? 'Add ' + Math.abs(b) : 'Subtract ' + b} from both sides — the symbol stays ${op}, so x ${op} ${fmtInt(bound)}.`,
    }
  }

  // d === 3
  if (Math.random() < 0.55) {
    // variables on both sides: a*x + b = c*x + e   (a ≠ c)
    const x = nz(-6, 6)
    let a = nz(2, 6)
    let c = nz(-4, 5)
    while (a === c) c = nz(-4, 5)
    const b = nz(-9, 9)
    const e = (a - c) * x + b   // ensures a*x+b = c*x+e at x
    return {
      kind: 'numeric',
      promptText: `${coefTerm(a)} ${addend(b)} = ${coefTerm(c)} ${addend(e)}`,
      say: `Solve. ${a} x ${b < 0 ? 'minus ' + Math.abs(b) : 'plus ' + b} equals ${c} x ${e < 0 ? 'minus ' + Math.abs(e) : 'plus ' + e}.`,
      answer: x,
      explain: `Move ${coefTerm(c)} left and ${fmtInt(b)} right: ${fmtInt(a - c)}x = ${fmtInt(e - b)}, so x = ${fmtInt(x)}.`,
    }
  }
  // sign-flip inequality: a*x op r with a < 0  →  dividing flips the symbol
  const a = nz(-6, -2)
  const bound = nz(-5, 5)
  const gt = Math.random() < 0.5            // the ORIGINAL symbol
  const op = gt ? '>' : '<'
  const flipped = gt ? '<' : '>'            // correct symbol after ÷ by negative
  const r = a * bound
  const choices: Choice[] = shuffle([
    { value: bound, label: ineqLabel(flipped, bound) },          // correct (symbol flipped)
    { value: bound + 100, label: ineqLabel(op, bound) },         // forgot to flip (common error)
    { value: bound + 200, label: ineqLabel(flipped, -bound) },   // sign error on bound
    { value: bound + 300, label: ineqLabel(op, -bound) },        // both errors
  ])
  return {
    kind: 'choice',
    promptText: `${coefTerm(a)} ${op} ${fmtInt(r)}`,
    say: `Solve. ${a} x is ${gt ? 'greater' : 'less'} than ${spoken(r)}. Careful — you divide by a negative. Which line shows x?`,
    answer: bound,
    choices,
    line: { min: bound - 4, max: bound + 4, marked: [bound] },
    explain: `Divide both sides by ${fmtInt(a)} — dividing by a negative flips the symbol: x ${flipped} ${fmtInt(bound)}.`,
  }
}

// ── EquationWatch: a narrated worked example (reused for re-teach) ──────────
export function EquationWatch({
  lines, line, onDone,
}: {
  lines: string[]; line?: { min: number; max: number; marked: number[] }; onDone: () => void
}) {
  const doneRef = useRef(onDone)
  doneRef.current = onDone
  useEffect(() => {
    const cancel = speakSeq(lines, { onDone: () => window.setTimeout(() => doneRef.current(), 1200) })
    return cancel
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, width: '100%' }}>
      <div style={{ fontFamily: 'var(--font-numeric)', fontSize: 22, fontWeight: 700, color: 'var(--ink)', letterSpacing: '0.01em' }}>
        {lines[0]}
      </div>
      {line && <NumberLine band={BAND} min={line.min} max={line.max} mode="read" marked={line.marked} />}
      <p style={{ margin: 0, maxWidth: 520, textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 15, lineHeight: 1.5, color: 'var(--ink-soft)' }}>
        {lines[lines.length - 1]}
      </p>
    </div>
  )
}

// A one-question check inside the lesson (retry allowed, no penalty).
function EquationAsk({ prompt, say, choices, answer, onDone }: {
  prompt: string; say: string; choices: Choice[]; answer: number; onDone: () => void
}) {
  const [selected, setSelected] = React.useState<string | number | null>(null)
  const [status, setStatus] = React.useState<'idle' | 'correct' | 'wrong'>('idle')
  const spokenRef = useRef(false)
  useEffect(() => { if (!spokenRef.current) { spokenRef.current = true; speak(say) } }, []) // eslint-disable-line
  function pick(v: string | number) {
    if (status === 'correct') return
    setSelected(v)
    if (v === answer) { setStatus('correct'); speak('Yes — that’s it.'); window.setTimeout(onDone, 1400) }
    else { setStatus('wrong'); speak('Not quite — take another look.'); window.setTimeout(() => { setSelected(null); setStatus('idle') }, 1200) }
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%' }}>
      <p style={{ margin: 0, fontFamily: 'var(--font-numeric)', fontSize: 22, fontWeight: 700, color: 'var(--ink)' }}>{prompt}</p>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <ChoiceGrid band={BAND} choices={choices} selected={selected} status={status} correctValue={answer} onPick={pick} columns={2} />
      </div>
    </div>
  )
}

interface Props { band?: AgeBand; childName: string; onLessonComplete: () => void }

export default function EquationsInequalitiesTeenLesson({ childName, onLessonComplete }: Props) {
  // Freeze any example values so steps don't reshuffle on re-render.
  const checkChoices = useMemo<Choice[]>(() => (
    [
      { value: 4, label: 'x = 4' },
      { value: 6, label: 'x = 6' },
      { value: 8, label: 'x = 8' },
      { value: 2, label: 'x = 2' },
    ]
  ), [])

  const steps: LessonStep[] = [
    {
      bubble: 'An equation is a balance. Keep both sides equal.', mood: 'happy',
      render: (d) => (
        <EquationWatch
          lines={[
            'x + 5 = 12',
            'Whatever you do to one side, do to the other. Subtract five from both sides, and x = 7.',
          ]}
          onDone={d}
        />
      ),
    },
    {
      bubble: 'Two steps? Undo the +/− first, then the ×.', mood: 'happy',
      render: (d) => (
        <EquationWatch
          lines={[
            '3x − 2 = 10',
            'Add two to both sides to get 3x = 12, then divide by three. x = 4.',
          ]}
          onDone={d}
        />
      ),
    },
    {
      bubble: 'Inequalities solve the same way — with one trap.', mood: 'thinking',
      render: (d) => (
        <EquationWatch
          lines={[
            '−2x < 6',
            'Divide both sides by negative two — and flip the symbol. So x > negative three.',
          ]}
          line={{ min: -7, max: 1, marked: [-3] }}
          onDone={d}
        />
      ),
    },
    {
      bubble: 'Your turn.', mood: 'thinking',
      render: (d) => (
        <EquationAsk
          prompt="2x + 3 = 11"
          say="Solve. Two x plus three equals eleven. What is x?"
          choices={checkChoices}
          answer={4}
          onDone={d}
        />
      ),
    },
  ]
  return (
    <TeenLessonShell
      band={BAND}
      childName={childName}
      chapterTitle="Equations & Inequalities"
      steps={steps}
      finalSpeech={`Good work, ${childName}. You can balance equations and solve inequalities — even the sign-flip ones. Let’s investigate.`}
      onLessonComplete={onLessonComplete}
    />
  )
}
