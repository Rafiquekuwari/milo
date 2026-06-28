'use client'
/**
 * LinearEquationsInequalitiesTeenLesson (15–16, "Commission" / studio analyst) —
 * the worked-example walkthrough for the Equations & Inequalities commission.
 *
 * Built on TeenLessonShell: a few narrated "watch" steps that solve an equation
 * one inverse-operation at a time, then a quick check. Exports the difficulty-aware
 * round generator + a Watch helper so the practice chapter and its re-teach reuse
 * them. Mirrors IntegersTeenLesson, in the 15–16 dark "Commission" chrome.
 *
 * Ramp (id "linearEquationsInequalities", per docs/curriculum-12-18.md):
 *   L1 one/two-step  →  L2 multi-step w/ distribution & variables both sides
 *   →  L3 inequalities (sign-flip) + |x| = a.
 *
 * Answer surfaces: NumericEntry for clean numeric solutions; StepSelect ("pick the
 * next correct step") for the equation-step / sign-flip rounds (L2/L3). Irrational
 * answers never arise here, so all coefficients are chosen to give integer solutions.
 */
import React, { useEffect, useMemo, useRef } from 'react'
import { speak, speakSeq } from '@/lib/useMiloSpeaker'
import type { LessonStep } from '@/components/lessons/_kit'
import type { AgeBand, Choice } from '@/components/teen/types'
import TeenLessonShell from '@/components/teen/TeenLessonShell'
import ChoiceGrid from '@/components/teen/ChoiceGrid'

const BAND: AgeBand = '15-16'

// ── shared helpers (reused by the practice chapter) ────────────────────────
const rint = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))
/** Pretty integer with a real minus sign. */
export const fmtInt = (n: number) => (n < 0 ? `−${Math.abs(n)}` : String(n))
/** Spoken integer: "negative four". */
export const spoken = (n: number) => (n < 0 ? `negative ${Math.abs(n)}` : `${n}`)
const shuffle = <T,>(a: T[]): T[] => [...a].sort(() => Math.random() - 0.5)
/** A signed term joined into an expression: "+ 3" or "− 3" (with a leading space). */
const term = (n: number) => (n < 0 ? ` − ${Math.abs(n)}` : ` + ${n}`)
/** Coefficient prefix on x: "2x", "−x", "x". */
const coef = (n: number) => (n === 1 ? 'x' : n === -1 ? '−x' : `${fmtInt(n)}x`)

const toChoice = (v: number): Choice => ({ value: v, label: fmtInt(v) })

function choicesFrom(answer: number, distractors: number[]): Choice[] {
  const set = new Set<number>([answer])
  for (const v of distractors) { if (set.size >= 4) break; if (Number.isFinite(v) && v !== answer) set.add(v) }
  let guard = 0
  while (set.size < 4 && guard++ < 60) {
    const cand = answer + rint(-4, 4)
    if (cand !== answer) set.add(cand)
  }
  return shuffle([...set]).map(toChoice)
}

/** What kind of answer surface a round wants. */
export type RoundKind = 'numeric' | 'step' | 'absChoice'

export interface StepOption { text: string; reason?: string }

export interface Round {
  kind: RoundKind
  promptText: string       // the equation/inequality shown to the learner
  say: string              // spoken prompt
  answer: number           // the numeric solution (for numeric rounds) or correct option index (for step rounds)
  choices: Choice[]        // for absChoice rounds
  // For StepSelect rounds:
  shown?: StepOption[]     // steps already locked in (the original equation)
  options?: StepOption[]   // candidates for the next step; `answer` is the correct index
  // For an inequality round we can show the solution on a number line:
  line?: { min: number; max: number; marked: number[] }
  explain: string          // re-teach line (also the final IntegerWatch caption)
  answerSpeech: string     // what Milo says when revealing the answer
}

// ── L1: one- and two-step linear equations  (ax + b = c) ───────────────────
function makeL1(): Round {
  if (Math.random() < 0.45) {
    // one-step: x + b = c   or   ax = c
    if (Math.random() < 0.5) {
      const x = rint(-6, 9)
      const b = rint(1, 9) * (Math.random() < 0.5 ? 1 : -1)
      const c = x + b
      return {
        kind: 'numeric',
        promptText: `x${term(b)} = ${fmtInt(c)}`,
        say: `Solve for x.  x ${b < 0 ? 'minus' : 'plus'} ${Math.abs(b)} equals ${spoken(c)}.`,
        answer: x,
        choices: [],
        explain: `Undo the ${b < 0 ? 'subtraction' : 'addition'}: x = ${fmtInt(c)} ${b < 0 ? '+' : '−'} ${Math.abs(b)} = ${fmtInt(x)}.`,
        answerSpeech: `x equals ${spoken(x)}.`,
      }
    }
    const a = rint(2, 6) * (Math.random() < 0.3 ? -1 : 1)
    const x = rint(-5, 6)
    const c = a * x
    return {
      kind: 'numeric',
      promptText: `${coef(a)} = ${fmtInt(c)}`,
      say: `Solve for x.  ${spoken(a)} x equals ${spoken(c)}.`,
      answer: x,
      choices: [],
      explain: `Divide both sides by ${fmtInt(a)}: x = ${fmtInt(c)} ÷ ${fmtInt(a)} = ${fmtInt(x)}.`,
      answerSpeech: `x equals ${spoken(x)}.`,
    }
  }
  // two-step: ax + b = c
  const a = rint(2, 5) * (Math.random() < 0.3 ? -1 : 1)
  const x = rint(-4, 6)
  const b = rint(1, 9) * (Math.random() < 0.5 ? 1 : -1)
  const c = a * x + b
  return {
    kind: 'numeric',
    promptText: `${coef(a)}${term(b)} = ${fmtInt(c)}`,
    say: `Solve for x.  ${spoken(a)} x ${b < 0 ? 'minus' : 'plus'} ${Math.abs(b)} equals ${spoken(c)}.`,
    answer: x,
    choices: [],
    explain: `First ${b < 0 ? 'add' : 'subtract'} ${Math.abs(b)}: ${coef(a)} = ${fmtInt(c - b)}. Then divide by ${fmtInt(a)}: x = ${fmtInt(x)}.`,
    answerSpeech: `x equals ${spoken(x)}.`,
  }
}

// ── L2: multi-step — distribution OR variables both sides (StepSelect) ──────
function makeL2(): Round {
  if (Math.random() < 0.5) {
    // Distribution:  a(x + b) = c   → pick the correctly-distributed line.
    const a = rint(2, 5)
    const x = rint(-3, 5)
    const b = rint(1, 6) * (Math.random() < 0.5 ? 1 : -1)
    const c = a * (x + b)
    const correct: StepOption = { text: `${coef(a)}${term(a * b)} = ${fmtInt(c)}`, reason: `Distribute ${fmtInt(a)} across the bracket.` }
    const wrongA: StepOption = { text: `${coef(a)}${term(b)} = ${fmtInt(c)}`, reason: `Multiplied only the first term — ${fmtInt(a)} must hit ${fmtInt(b)} too.` }
    const wrongB: StepOption = { text: `${coef(a)}${term(a * b)} = ${fmtInt(a * c)}`, reason: `Don't multiply the right side — only the bracket is distributed.` }
    const opts = shuffle([correct, wrongA, wrongB])
    return {
      kind: 'step',
      promptText: `${fmtInt(a)}(x${term(b)}) = ${fmtInt(c)}`,
      say: `Distribute first. Pick the correct next line for ${spoken(a)} times the quantity x ${b < 0 ? 'minus' : 'plus'} ${Math.abs(b)} equals ${spoken(c)}.`,
      answer: opts.indexOf(correct),
      choices: [],
      shown: [{ text: `${fmtInt(a)}(x${term(b)}) = ${fmtInt(c)}`, reason: 'Given.' }],
      options: opts,
      explain: `Distribute the ${fmtInt(a)} across both terms: ${coef(a)}${term(a * b)} = ${fmtInt(c)}.`,
      answerSpeech: `Distribute the ${spoken(a)} to both terms inside the bracket.`,
    }
  }
  // Variables both sides:  ax + b = dx + e  → collect to one side.
  const a = rint(3, 6)
  const dd = rint(1, a - 1) // d < a so coefficient stays positive
  const x = rint(-3, 5)
  const e = rint(-8, 8)
  const b = (dd - a) * x + e // ensures ax + b = dx + e at this x
  const collected = `${coef(a - dd)}${term(b - e)} = 0`
  const correct: StepOption = { text: `${coef(a - dd)} = ${fmtInt(e - b)}`, reason: `Subtract ${coef(dd)} from both sides and ${b < e ? 'add' : 'subtract'} the constant.` }
  const wrongA: StepOption = { text: `${coef(a + dd)} = ${fmtInt(e - b)}`, reason: `Added the x-terms — to collect them you subtract ${coef(dd)}.` }
  const wrongB: StepOption = { text: `${coef(a - dd)} = ${fmtInt(e + b)}`, reason: `Sign slip on the constant when moving it across.` }
  const opts = shuffle([correct, wrongA, wrongB])
  void collected
  return {
    kind: 'step',
    promptText: `${coef(a)}${term(b)} = ${coef(dd)}${term(e)}`,
    say: `Variables on both sides. Pick the correct next line for ${spoken(a)} x ${b < 0 ? 'minus' : 'plus'} ${Math.abs(b)} equals ${spoken(dd)} x ${e < 0 ? 'minus' : 'plus'} ${Math.abs(e)}.`,
    answer: opts.indexOf(correct),
    choices: [],
    shown: [{ text: `${coef(a)}${term(b)} = ${coef(dd)}${term(e)}`, reason: 'Given.' }],
    options: opts,
    explain: `Move the x's to one side: subtract ${coef(dd)}, then move the constant: ${coef(a - dd)} = ${fmtInt(e - b)}.`,
    answerSpeech: `Subtract ${coef(dd)} from both sides to gather the x-terms.`,
  }
}

// ── L3: inequalities (sign-flip) + |x| = a ─────────────────────────────────
function makeL3(): Round {
  const roll = Math.random()
  if (roll < 0.45) {
    // Sign-flip inequality: multiply/divide by a negative reverses the sign.
    // Form:  a·x  >  c   with a < 0.  Pick the correct next line.
    const a = -rint(2, 5)
    const x = rint(-4, 5)
    const c = a * x
    // original:  ax > c   →   x < c/a   (flip)
    const correct: StepOption = { text: `x < ${fmtInt(x)}`, reason: 'Divide by a negative — flip the inequality sign.' }
    const wrongA: StepOption = { text: `x > ${fmtInt(x)}`, reason: 'Forgot to flip — dividing by a negative reverses the sign.' }
    const wrongB: StepOption = { text: `x < ${fmtInt(-x)}`, reason: 'Flipped the sign correctly but mis-divided the number.' }
    const opts = shuffle([correct, wrongA, wrongB])
    return {
      kind: 'step',
      promptText: `${coef(a)} > ${fmtInt(c)}`,
      say: `Solve the inequality. ${spoken(a)} x is greater than ${spoken(c)}. Pick the correct next line.`,
      answer: opts.indexOf(correct),
      choices: [],
      shown: [{ text: `${coef(a)} > ${fmtInt(c)}`, reason: 'Given.' }],
      options: opts,
      line: { min: x - 5, max: x + 5, marked: [x] },
      explain: `Divide both sides by ${fmtInt(a)}. Because ${fmtInt(a)} is negative, the sign flips: x < ${fmtInt(x)}.`,
      answerSpeech: `Dividing by a negative flips the sign: x is less than ${spoken(x)}.`,
    }
  }
  if (roll < 0.75) {
    // Two-step inequality ending in a sign-flip on the solution set.
    // c − a·x ≤ d  → solve for x (still an integer).
    const a = rint(2, 4)
    const x = rint(-3, 5)
    const cc = rint(2, 9)
    const d = cc - a * x
    return {
      kind: 'numeric',
      promptText: `${fmtInt(cc)} − ${coef(a)} = ${fmtInt(d)}`,
      say: `Solve for x.  ${spoken(cc)} minus ${spoken(a)} x equals ${spoken(d)}.`,
      answer: x,
      choices: [],
      explain: `Subtract ${cc} from both sides: −${coef(a)} = ${fmtInt(d - cc)}. Divide by −${a}: x = ${fmtInt(x)}.`,
      answerSpeech: `x equals ${spoken(x)}.`,
    }
  }
  // Absolute-value equation: |x + b| = a  → two solutions.
  // We keep it a clean MCQ over the solution set to avoid free-typing a set.
  // The two roots are always distinct because a ≥ 2 (s1 − s2 = 2a ≠ 0), and the
  // distractor dedupe below guarantees no wrong option equals the correct set.
  const a = rint(2, 7)
  const b = rint(-4, 4)
  const s1 = a - b   // from x + b = a
  const s2 = -a - b  // from x + b = −a
  const lo = Math.min(s1, s2)
  const hi = Math.max(s1, s2)
  // Canonical "set" label: always smaller-then-larger so the string is unambiguous.
  const asSet = (p: number, q: number) => `${fmtInt(Math.min(p, q))} or ${fmtInt(Math.max(p, q))}`
  const correctLabel = asSet(lo, hi)
  // Pedagogically-meaningful distractors (each a common sign/case error), then
  // dedupe so no distractor accidentally equals the correct set.
  const candidates = [
    asSet(a + b, -a + b),  // sign error: solved |x| then added b instead of subtracting
    `${fmtInt(s1)} only`,  // forgot the negative case
    `${fmtInt(s2)} only`,  // forgot the positive case
    asSet(a - b, a + b),   // used +a twice (forgot to negate a in the 2nd case)
  ]
  const labels: string[] = [correctLabel]
  for (const c of candidates) {
    if (labels.length >= 4) break
    if (!labels.includes(c)) labels.push(c)
  }
  // Top up (rare) if dedupe left us short, with a safe far-off pair.
  let pad = 1
  while (labels.length < 4) {
    const c = asSet(lo - pad, hi + pad)
    if (!labels.includes(c)) labels.push(c)
    pad++
  }
  const choices: Choice[] = shuffle(labels.map((label, i) => ({ value: i, label })))
  return {
    kind: 'absChoice',
    promptText: `|x${term(b)}| = ${a}`,
    say: `Solve the absolute value equation. The absolute value of x ${b < 0 ? 'minus' : 'plus'} ${Math.abs(b)} equals ${a}.`,
    answer: choices.findIndex((c) => c.label === correctLabel),
    choices,
    explain: `|x${term(b)}| = ${a} means x${term(b)} = ${a} or x${term(b)} = −${a}, giving x = ${fmtInt(s1)} or x = ${fmtInt(s2)}.`,
    answerSpeech: `Two cases: x is ${spoken(s1)} or ${spoken(s2)}.`,
  }
}

/** Difficulty-aware round generator. */
export function makeRound(d: 1 | 2 | 3): Round {
  if (d === 1) return makeL1()
  if (d === 2) return makeL2()
  return makeL3()
}

// ── EquationWatch: a narrated step-ladder worked example (reused for re-teach) ──
export function EquationWatch({
  lines, steps, onDone,
}: {
  lines: string[]; steps: string[]; onDone: () => void
}) {
  const doneRef = useRef(onDone)
  doneRef.current = onDone
  useEffect(() => {
    const cancel = speakSeq(lines, { onDone: () => window.setTimeout(() => doneRef.current(), 1200) })
    return cancel
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, width: '100%' }}>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 320 }}>
        {steps.map((s, i) => (
          <li key={i} style={{
            fontFamily: 'var(--font-numeric)', fontVariantNumeric: 'tabular-nums', fontSize: 18, fontWeight: 600,
            color: i === steps.length - 1 ? 'var(--garden-green)' : 'var(--ink)',
            textAlign: 'center', padding: '8px 12px', border: '1px solid var(--outline)', borderRadius: 8,
            background: i === steps.length - 1 ? 'var(--bg-1)' : 'var(--paper)',
          }}>
            {s}
          </li>
        ))}
      </ol>
      <p style={{ margin: 0, maxWidth: 520, textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 15, lineHeight: 1.5, color: 'var(--ink-soft)' }}>
        {lines[lines.length - 1]}
      </p>
    </div>
  )
}

// A one-question check inside the lesson (retry allowed, no penalty).
function EquationAsk({ prompt, say, choices, answerIdx, onDone }: {
  prompt: string; say: string; choices: Choice[]; answerIdx: number; onDone: () => void
}) {
  const [selected, setSelected] = React.useState<string | number | null>(null)
  const [status, setStatus] = React.useState<'idle' | 'correct' | 'wrong'>('idle')
  const spokenRef = useRef(false)
  useEffect(() => { if (!spokenRef.current) { spokenRef.current = true; speak(say) } }, []) // eslint-disable-line
  const answerValue = choices[answerIdx]?.value
  function pick(v: string | number) {
    if (status === 'correct') return
    setSelected(v)
    if (v === answerValue) { setStatus('correct'); speak('Yes — that holds up.'); window.setTimeout(onDone, 1400) }
    else { setStatus('wrong'); speak('Not quite — take another look.'); window.setTimeout(() => { setSelected(null); setStatus('idle') }, 1200) }
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%' }}>
      <p style={{ margin: 0, fontFamily: 'var(--font-numeric)', fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>{prompt}</p>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <ChoiceGrid band={BAND} choices={choices} selected={selected} status={status} correctValue={answerValue} onPick={pick} columns={choices.length === 4 ? 2 : choices.length} />
      </div>
    </div>
  )
}

interface Props { band?: AgeBand; childName: string; onLessonComplete: () => void }

export default function LinearEquationsInequalitiesTeenLesson({ childName, onLessonComplete }: Props) {
  // Freeze the in-lesson check so it doesn't reshuffle on re-render.
  const checkChoices = useMemo<Choice[]>(
    () => shuffle([toChoice(2), toChoice(-2), toChoice(6), toChoice(8)]),
    [],
  )
  const checkAnswerIdx = checkChoices.findIndex((c) => c.value === 2)

  const steps: LessonStep[] = [
    {
      bubble: 'An equation is a balance. Keep both sides equal as you peel it apart.', mood: 'thinking',
      render: (d) => (
        <EquationWatch
          lines={[
            'Look at three x plus four equals nineteen.',
            'Undo the plus four first: subtract four from both sides, leaving three x equals fifteen.',
            'Then divide both sides by three. So x equals five.',
          ]}
          steps={['3x + 4 = 19', '3x = 15', 'x = 5']}
          onDone={d}
        />
      ),
    },
    {
      bubble: 'When the bracket is in the way, distribute before you isolate.', mood: 'thinking',
      render: (d) => (
        <EquationWatch
          lines={[
            'Two times the quantity x minus three equals eight.',
            'Distribute the two across both terms: two x minus six equals eight.',
            'Add six, then divide by two. So x equals seven.',
          ]}
          steps={['2(x − 3) = 8', '2x − 6 = 8', '2x = 14', 'x = 7']}
          onDone={d}
        />
      ),
    },
    {
      bubble: 'Inequalities work the same way — with one rule. Watch the sign.', mood: 'thinking',
      render: (d) => (
        <EquationWatch
          lines={[
            'Negative two x is greater than six.',
            'Divide both sides by negative two.',
            'Because you divided by a negative, flip the sign: x is less than negative three.',
          ]}
          steps={['−2x > 6', '÷ (−2), flip', 'x < −3']}
          onDone={d}
        />
      ),
    },
    {
      bubble: 'Your turn — solve it in your head.', mood: 'thinking',
      render: (d) => (
        <EquationAsk
          prompt="5x − 6 = 4"
          say="Solve for x. Five x minus six equals four."
          choices={checkChoices}
          answerIdx={checkAnswerIdx}
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
      finalSpeech={`Solid, ${childName}. You can isolate the variable, distribute through brackets, and flip the sign on inequalities. Let's take the commission.`}
      onLessonComplete={onLessonComplete}
    />
  )
}
