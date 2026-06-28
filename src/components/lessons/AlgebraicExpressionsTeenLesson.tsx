'use client'
/**
 * AlgebraicExpressionsTeenLesson (12–14, "Field Lab") — the worked-example
 * walkthrough for the Algebraic Expressions investigation. Built on
 * TeenLessonShell: a few narrated "watch" steps, then a quick check. Exports the
 * round generator + ExprWatch so the practice chapter and its re-teach reuse
 * them. Mirrors the IntegersTeenLesson pattern, in teen chrome.
 *
 * Difficulty ramp (curriculum #8):
 *   L1 write & evaluate at a value · L2 combine like terms & distribute ·
 *   L3 multi-variable simplify / evaluate.
 */
import React, { useEffect, useRef } from 'react'
import { speak, speakSeq } from '@/lib/useMiloSpeaker'
import type { LessonStep } from '@/components/lessons/_kit'
import type { AgeBand, Choice } from '@/components/teen/types'
import TeenLessonShell from '@/components/teen/TeenLessonShell'
import ChoiceGrid from '@/components/teen/ChoiceGrid'
import NumericEntry, { numericEqual } from '@/components/teen/NumericEntry'

const BAND: AgeBand = '12-14'

// ── shared helpers (reused by the practice chapter) ────────────────────────
const rint = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))
const nz = (lo: number, hi: number) => { let v = rint(lo, hi); if (v === 0) v = hi; return v }
const shuffle = <T,>(a: T[]): T[] => [...a].sort(() => Math.random() - 0.5)

/** Pretty signed integer with a real minus sign. */
export const fmtInt = (n: number) => (n < 0 ? `−${Math.abs(n)}` : String(n))
/** Spoken integer: "negative four". */
const spoken = (n: number) => (n < 0 ? `negative ${Math.abs(n)}` : `${n}`)

/** Render a coefficient before a variable: 1x → "x", −1x → "−x", 0 → "". */
function coefTerm(c: number, v: string): string {
  if (c === 0) return ''
  if (c === 1) return v
  if (c === -1) return `−${v}`
  return `${fmtInt(c)}${v}`
}

/** Build "a·v + b" style expression text (handles signs/units cleanly). */
function linear(a: number, v: string, b: number): string {
  const lead = coefTerm(a, v)
  if (b === 0) return lead || '0'
  if (!lead) return fmtInt(b)
  return `${lead} ${b < 0 ? '−' : '+'} ${Math.abs(b)}`
}

const toExprChoice = (s: string): Choice => ({ value: s, label: s })

/**
 * Build a deduped 4-option choice set: the answer plus distinct distractors.
 * Distractors that collide with the answer (or each other) are dropped, then the
 * set is padded with `fallback` strings so the grid never shrinks below 4.
 */
function exprChoices(answer: string, distractors: string[], fallback: string[]): Choice[] {
  const seen = new Set<string>([answer])
  const out: string[] = [answer]
  for (const s of [...distractors, ...fallback]) {
    if (out.length >= 4) break
    if (!seen.has(s)) { seen.add(s); out.push(s) }
  }
  return shuffle(out).map(toExprChoice)
}

export type Mode = 'numeric' | 'choice'

export interface Round {
  mode: Mode
  promptText: string
  say: string
  // numeric rounds:
  answer: number
  suffix?: string
  // choice rounds:
  choices?: Choice[]
  choiceAnswer?: string
  explain: string   // re-teach line
}

/**
 * Difficulty-aware round generator.
 *   d=1 → evaluate a written expression at a value (NumericEntry)
 *   d=2 → combine like terms OR distribute, pick the equivalent (ChoiceGrid)
 *   d=3 → multi-variable: simplify (ChoiceGrid) OR evaluate at x,y (NumericEntry)
 */
export function makeRound(d: 1 | 2 | 3): Round {
  if (d === 1) {
    // Evaluate a·x + b at x = v.
    const a = nz(2, 6)
    const b = nz(-6, 8)
    const v = rint(2, 7)
    const ans = a * v + b
    const expr = linear(a, 'x', b)
    return {
      mode: 'numeric',
      promptText: `Evaluate ${expr} when x = ${v}.`,
      say: `Evaluate ${a} x ${b < 0 ? 'minus' : 'plus'} ${Math.abs(b)} when x is ${v}.`,
      answer: ans,
      explain: `Put ${v} in for x: ${a}×${v} ${b < 0 ? '−' : '+'} ${Math.abs(b)} = ${ans}.`,
    }
  }

  if (d === 2) {
    if (Math.random() < 0.5) {
      // Combine like terms: a·x + b + c·x + e  →  (a+c)x + (b+e)
      const a = nz(2, 6), c = nz(2, 6)
      const b = nz(-5, 7), e = nz(-5, 7)
      const sa = a + c, sb = b + e
      const ans = linear(sa, 'x', sb)
      const prompt = `Combine like terms: ${coefTerm(a, 'x')} ${b < 0 ? '−' : '+'} ${Math.abs(b)} + ${coefTerm(c, 'x')} ${e < 0 ? '−' : '+'} ${Math.abs(e)}.`
      const distractors = [
        linear(a + c, 'x', b * e),          // multiplied the constants
        linear(a * c, 'x', sb),             // multiplied the coefficients
        linear(sa, 'x', sb + 1),            // arithmetic slip (off by one)
      ]
      const choices = exprChoices(ans, distractors, [
        linear(sa, 'x', sb - 1), linear(sa + 1, 'x', sb), linear(sa - 1, 'x', sb),
      ])
      return {
        mode: 'choice',
        promptText: prompt,
        say: `Combine the like terms. Add the x terms, then add the numbers.`,
        answer: NaN,
        choices,
        choiceAnswer: ans,
        explain: `Add the x's: ${a}+${c} = ${sa}x. Add the numbers: ${fmtInt(b)} ${e < 0 ? '−' : '+'} ${Math.abs(e)} = ${fmtInt(sb)}. So ${ans}.`,
      }
    }
    // Distribute: k(x + m)  →  kx + km
    const k = nz(2, 5)
    const m = nz(-6, 8)
    const ans = linear(k, 'x', k * m)
    const prompt = `Expand ${k}(x ${m < 0 ? '−' : '+'} ${Math.abs(m)}).`
    const distractors = [
      linear(k, 'x', m),              // forgot to distribute to the constant
      linear(k, 'x', k + m),          // added instead of multiplied
      linear(k, 'x', k * m + (k * m < 0 ? -1 : 1)), // arithmetic slip
    ]
    const choices = exprChoices(ans, distractors, [
      linear(k, 'x', k * m + 2), linear(k + 1, 'x', k * m), linear(k, 'x', k * m - 2),
    ])
    return {
      mode: 'choice',
      promptText: prompt,
      say: `Expand ${k} times the bracket. Multiply ${k} by x, and ${k} by ${spoken(m)}.`,
      answer: NaN,
      choices,
      choiceAnswer: ans,
      explain: `Multiply both inside the bracket by ${k}: ${k}×x = ${k}x, ${k}×${fmtInt(m)} = ${fmtInt(k * m)}. So ${ans}.`,
    }
  }

  // d === 3
  if (Math.random() < 0.5) {
    // Multi-variable simplify: a·x + b·y + c·x + e·y  →  (a+c)x + (b+e)y
    const a = nz(2, 5), c = nz(2, 5), b = nz(2, 5), e = nz(2, 5)
    const sx = a + c, sy = b + e
    const ans = `${coefTerm(sx, 'x')} + ${coefTerm(sy, 'y')}`
    const prompt = `Simplify ${coefTerm(a, 'x')} + ${coefTerm(b, 'y')} + ${coefTerm(c, 'x')} + ${coefTerm(e, 'y')}.`
    const distractors = [
      `${coefTerm(sx + sy, 'x')}`,                       // merged unlike terms
      `${coefTerm(a + b, 'x')} + ${coefTerm(c + e, 'y')}`, // grouped wrong terms
      `${coefTerm(sy, 'x')} + ${coefTerm(sx, 'y')}`,      // swapped totals
    ]
    const choices = exprChoices(ans, distractors, [
      `${coefTerm(sx + 1, 'x')} + ${coefTerm(sy, 'y')}`,
      `${coefTerm(sx, 'x')} + ${coefTerm(sy + 1, 'y')}`,
      `${coefTerm(sx, 'x')} + ${coefTerm(sy - 1, 'y')}`,
    ])
    return {
      mode: 'choice',
      promptText: prompt,
      say: `Simplify. The x terms only combine with x terms, and y with y.`,
      answer: NaN,
      choices,
      choiceAnswer: ans,
      explain: `x's: ${a}+${c} = ${sx}x. y's: ${b}+${e} = ${sy}y. They don't mix, so ${ans}.`,
    }
  }
  // Evaluate a·x + b·y at x, y
  const a = nz(2, 5), b = nz(2, 5)
  const x = rint(2, 6), y = rint(2, 6)
  const ans = a * x + b * y
  const expr = `${coefTerm(a, 'x')} + ${coefTerm(b, 'y')}`
  return {
    mode: 'numeric',
    promptText: `Evaluate ${expr} when x = ${x} and y = ${y}.`,
    say: `Evaluate ${a} x plus ${b} y when x is ${x} and y is ${y}.`,
    answer: ans,
    explain: `Substitute: ${a}×${x} + ${b}×${y} = ${a * x} + ${b * y} = ${ans}.`,
  }
}

// ── ExprWatch: a narrated worked example (reused for re-teach) ──────────────
export function ExprWatch({
  lines, headline, onDone,
}: {
  lines: string[]; headline?: string; onDone: () => void
}) {
  const doneRef = useRef(onDone)
  doneRef.current = onDone
  useEffect(() => {
    const cancel = speakSeq(lines, { onDone: () => window.setTimeout(() => doneRef.current(), 1200) })
    return cancel
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, width: '100%' }}>
      {headline && (
        <p style={{ margin: 0, fontFamily: 'var(--font-numeric)', fontSize: 24, fontWeight: 700, color: 'var(--ink)', letterSpacing: '0.01em' }}>
          {headline}
        </p>
      )}
      <p style={{ margin: 0, maxWidth: 520, textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 15, lineHeight: 1.5, color: 'var(--ink-soft)' }}>
        {lines[lines.length - 1]}
      </p>
    </div>
  )
}

// A one-question check inside the lesson (retry allowed, no penalty).
function ExprAsk({ prompt, say, choices, answer, onDone }: {
  prompt: string; say: string; choices: Choice[]; answer: string; onDone: () => void
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
      <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>{prompt}</p>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <ChoiceGrid band={BAND} choices={choices} selected={selected} status={status} correctValue={answer} onPick={pick} columns={2} />
      </div>
    </div>
  )
}

// A numeric check (substitute & evaluate).
function ExprEvalAsk({ prompt, say, answer, onDone }: {
  prompt: string; say: string; answer: number; onDone: () => void
}) {
  const [status, setStatus] = React.useState<'idle' | 'correct' | 'wrong'>('idle')
  const spokenRef = useRef(false)
  useEffect(() => { if (!spokenRef.current) { spokenRef.current = true; speak(say) } }, []) // eslint-disable-line
  function submit(v: number) {
    if (status === 'correct') return
    if (numericEqual(v, answer)) { setStatus('correct'); speak('Yes — that’s it.'); window.setTimeout(onDone, 1400) }
    else { setStatus('wrong'); speak('Not quite — try the substitution again.'); window.setTimeout(() => setStatus('idle'), 1200) }
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%' }}>
      <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>{prompt}</p>
      <NumericEntry band={BAND} onSubmit={submit} status={status} />
    </div>
  )
}

interface Props { band?: AgeBand; childName: string; onLessonComplete: () => void }

export default function AlgebraicExpressionsTeenLesson({ childName, onLessonComplete }: Props) {
  const steps: LessonStep[] = [
    {
      bubble: 'A variable is a number we don’t know yet. Watch.', mood: 'happy',
      render: (d) => (
        <ExprWatch
          headline="3x + 5"
          lines={[
            'A letter like x just stands for some number.',
            'In three x plus five, the three x means three times x — and the five is a plain number.',
          ]}
          onDone={d}
        />
      ),
    },
    {
      bubble: 'To evaluate, swap the letter for its value.', mood: 'happy',
      render: (d) => (
        <ExprWatch
          headline="3·(4) + 5 = 17"
          lines={[
            'Evaluate three x plus five when x is four.',
            'Put four in for x: three times four is twelve, plus five is seventeen.',
          ]}
          onDone={d}
        />
      ),
    },
    {
      bubble: 'Like terms share the same letter — combine them.', mood: 'thinking',
      render: (d) => (
        <ExprWatch
          headline="2x + 3x = 5x"
          lines={[
            'Two x and three x are like terms — both have x.',
            'Add the counts: two plus three is five, so two x plus three x is five x.',
          ]}
          onDone={d}
        />
      ),
    },
    {
      bubble: 'Your turn — evaluate this one.', mood: 'thinking',
      render: (d) => (
        <ExprEvalAsk
          prompt="Evaluate 2x + 1 when x = 5."
          say="Evaluate two x plus one when x is five."
          answer={11}
          onDone={d}
        />
      ),
    },
  ]
  return (
    <TeenLessonShell
      band={BAND}
      childName={childName}
      chapterTitle="Algebraic Expressions"
      steps={steps}
      finalSpeech={`Nice work, ${childName}. You can write, evaluate, and simplify expressions. Let’s investigate.`}
      onLessonComplete={onLessonComplete}
    />
  )
}
