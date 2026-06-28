'use client'
/**
 * SignedNumberFluencyTeenLesson (15–16, "Design Studio") — worked-example
 * walkthrough for the Signed Numbers & Real-Number Fluency commission. Built on
 * TeenLessonShell: a few narrated "watch" steps (number-line jumps + a worked
 * order-of-operations chain), then a quick check. Exports the round generator +
 * SignedWatch so the practice chapter and its re-teach reuse them. Mirrors the
 * IntegersTeenLesson pattern, in 15-16 studio chrome.
 *
 * Ramp (curriculum id `signedNumberFluency`):
 *   L1 — add/subtract signed integers & order signed values
 *   L2 — multiply/divide signed & a multi-step (two-operation) signed expression
 *   L3 — classify rational vs irrational; order of operations with negatives & exponents
 */
import React, { useEffect, useRef } from 'react'
import { speak, speakSeq } from '@/lib/useMiloSpeaker'
import type { LessonStep } from '@/components/lessons/_kit'
import type { AgeBand, Choice } from '@/components/teen/types'
import TeenLessonShell from '@/components/teen/TeenLessonShell'
import NumberLine from '@/components/teen/NumberLine'
import ChoiceGrid from '@/components/teen/ChoiceGrid'

const BAND: AgeBand = '15-16'

// ── shared helpers (reused by the practice chapter) ────────────────────────
const rint = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))
/** Pretty integer: a real minus sign for negatives. */
export const fmtInt = (n: number) => (n < 0 ? `−${Math.abs(n)}` : String(n))
/** Spoken integer: "negative four". */
export const spoken = (n: number) => (n < 0 ? `negative ${Math.abs(n)}` : `${n}`)
const toChoice = (v: number): Choice => ({ value: v, label: fmtInt(v) })
const shuffle = <T,>(a: T[]): T[] => [...a].sort(() => Math.random() - 0.5)

/** "a + b" / "a − |b|" so a signed expression reads cleanly. */
function sumExpr(a: number, b: number): string {
  return `${fmtInt(a)} ${b < 0 ? '−' : '+'} ${Math.abs(b)}`
}

function choicesFrom(answer: number, distractors: number[]): Choice[] {
  const set = new Set<number>([answer])
  for (const v of distractors) { if (set.size >= 4) break; if (Number.isFinite(v)) set.add(v) }
  let guard = 0
  while (set.size < 3 && guard++ < 50) set.add(answer + rint(-3, 3))
  return shuffle([...set]).map(toChoice)
}

export interface Round {
  promptText: string
  say: string
  choices: Choice[]
  answer: string | number
  /** answer rendered for the spoken/feedback reveal */
  answerSpoken: string
  line?: { min: number; max: number; marked: number[] }
  explain: string   // re-teach line
}

/**
 * Difficulty-aware round generator.
 *  L1 — add/subtract signed integers, and order signed values.
 *  L2 — multiply/divide signed, and a two-step signed expression.
 *  L3 — classify rational/irrational, and order of operations with negatives & exponents.
 */
export function makeRound(d: 1 | 2 | 3): Round {
  if (d === 1) {
    if (Math.random() < 0.5) {
      // signed add/subtract on the line
      const a = rint(-6, 6)
      const b = rint(-6, 6)
      const ans = a + b
      return {
        promptText: `${sumExpr(a, b)} = ?`,
        say: `What is ${spoken(a)} plus ${spoken(b)}?`,
        choices: choicesFrom(ans, [a - b, ans + 1, ans - 1, -ans]),
        answer: ans,
        answerSpoken: spoken(ans),
        line: { min: -12, max: 12, marked: [a, ans] },
        explain: `Start at ${fmtInt(a)} and jump ${Math.abs(b)} to the ${b < 0 ? 'left' : 'right'}: you land on ${fmtInt(ans)}.`,
      }
    }
    // order signed values — pick the largest
    const three = shuffle([rint(-9, -1), rint(-4, 4), rint(1, 9)])
    const ans = Math.max(...three)
    return {
      promptText: `Which is greatest:  ${three.map(fmtInt).join(',  ')} ?`,
      say: `Which is greatest: ${three.map(spoken).join(', ')}?`,
      choices: shuffle(three).map(toChoice),
      answer: ans,
      answerSpoken: spoken(ans),
      explain: `${fmtInt(ans)} sits furthest to the right on the line, so it is the greatest.`,
    }
  }

  if (d === 2) {
    if (Math.random() < 0.5) {
      // multiply / divide signed
      if (Math.random() < 0.5) {
        const a = rint(-9, 9) || 3
        const b = rint(-9, 9) || -4
        const ans = a * b
        return {
          promptText: `(${fmtInt(a)}) × (${fmtInt(b)}) = ?`,
          say: `What is ${spoken(a)} times ${spoken(b)}?`,
          choices: choicesFrom(ans, [-ans, ans + a, ans - b, ans + 2]),
          answer: ans,
          answerSpoken: spoken(ans),
          explain: `Same signs give a positive, different signs a negative. Here ${fmtInt(a)} × ${fmtInt(b)} = ${fmtInt(ans)}.`,
        }
      }
      const b = (rint(1, 6)) * (Math.random() < 0.5 ? 1 : -1)
      const q = rint(-6, 6) || 2
      const a = b * q          // ensures clean division
      return {
        promptText: `(${fmtInt(a)}) ÷ (${fmtInt(b)}) = ?`,
        say: `What is ${spoken(a)} divided by ${spoken(b)}?`,
        choices: choicesFrom(q, [-q, q + 1, q - 1, q + 2]),
        answer: q,
        answerSpoken: spoken(q),
        explain: `Different signs give a negative, same signs a positive. ${fmtInt(a)} ÷ ${fmtInt(b)} = ${fmtInt(q)}.`,
      }
    }
    // two-step signed expression: a + b × c  (multiply first)
    const a = rint(-6, 6)
    const b = rint(-5, 5) || 2
    const c = rint(-4, 4) || -3
    const ans = a + b * c
    return {
      promptText: `${fmtInt(a)} + (${fmtInt(b)}) × (${fmtInt(c)}) = ?`,
      say: `What is ${spoken(a)} plus ${spoken(b)} times ${spoken(c)}?`,
      choices: choicesFrom(ans, [(a + b) * c, ans + 2, ans - 2, ans + 1]),
      answer: ans,
      answerSpoken: spoken(ans),
      explain: `Multiply first: ${fmtInt(b)} × ${fmtInt(c)} = ${fmtInt(b * c)}. Then ${fmtInt(a)} + ${fmtInt(b * c)} = ${fmtInt(ans)}.`,
    }
  }

  // d === 3
  if (Math.random() < 0.5) {
    // classify rational vs irrational
    const rationals = ['7', '−4', '0.25', '3/8', '√16', '−2.5', '√49']
    const irrationals = ['√2', '√5', 'π', '√10', '√3', '√7']
    const askIrrational = Math.random() < 0.5
    const pool = askIrrational ? irrationals : rationals
    const correct = pool[rint(0, pool.length - 1)]
    const wrongPool = askIrrational ? rationals : irrationals
    const distract = shuffle(wrongPool).slice(0, 3)
    const choices: Choice[] = shuffle([correct, ...distract]).map((s) => ({ value: s, label: s }))
    return {
      promptText: askIrrational
        ? 'Which one is irrational?'
        : 'Which one is rational?',
      say: askIrrational
        ? 'Which of these numbers is irrational?'
        : 'Which of these numbers is rational?',
      choices,
      answer: correct,
      answerSpoken: correct === 'π' ? 'pi' : correct.replace('√', 'root '),
      explain: askIrrational
        ? `${correct} cannot be written as a fraction — its decimal never repeats — so it is irrational.`
        : `${correct} can be written as a fraction (or terminates / repeats), so it is rational.`,
    }
  }
  // order of operations with negatives & exponents:  a + b × (−c)^2   OR   −c^2 + a
  if (Math.random() < 0.5) {
    const c = rint(2, 5)
    const a = rint(-8, 8)
    const ans = a - c * c          // −c² means take c², then negate
    return {
      promptText: `${fmtInt(a)} − ${c}² = ?`,
      say: `What is ${spoken(a)} minus ${c} squared?`,
      choices: choicesFrom(ans, [a - (-c) * (-c) + 2, a + c * c, ans + 1, ans - 2]),
      answer: ans,
      answerSpoken: spoken(ans),
      explain: `Exponent first: ${c}² = ${c * c}. Then ${fmtInt(a)} − ${c * c} = ${fmtInt(ans)}.`,
    }
  }
  const b = rint(2, 5)
  const k = rint(-4, 4) || 2
  const ans = k * (b * b)
  return {
    promptText: `(${fmtInt(k)}) × ${b}² = ?`,
    say: `What is ${spoken(k)} times ${b} squared?`,
    choices: choicesFrom(ans, [k * b * 2, -ans, ans + b, ans - b]),
    answer: ans,
    answerSpoken: spoken(ans),
    explain: `Exponent first: ${b}² = ${b * b}. Then ${fmtInt(k)} × ${b * b} = ${fmtInt(ans)}.`,
  }
}

// ── SignedWatch: a narrated number-line worked example (reused for re-teach) ──
export function SignedWatch({
  lines, min, max, marked, onDone,
}: {
  lines: string[]; min: number; max: number; marked: number[]; onDone: () => void
}) {
  const doneRef = useRef(onDone)
  doneRef.current = onDone
  useEffect(() => {
    const cancel = speakSeq(lines, { onDone: () => window.setTimeout(() => doneRef.current(), 1200) })
    return cancel
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, width: '100%' }}>
      <NumberLine band={BAND} min={min} max={max} mode="read" marked={marked} />
      <p style={{ margin: 0, maxWidth: 520, textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 15, lineHeight: 1.5, color: 'var(--ink-soft)' }}>
        {lines[lines.length - 1]}
      </p>
    </div>
  )
}

// A narrated "chain" worked example with no number line (for order-of-ops steps).
export function ChainWatch({ lines, chain, onDone }: { lines: string[]; chain: string; onDone: () => void }) {
  const doneRef = useRef(onDone)
  doneRef.current = onDone
  useEffect(() => {
    const cancel = speakSeq(lines, { onDone: () => window.setTimeout(() => doneRef.current(), 1200) })
    return cancel
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, width: '100%' }}>
      <div style={{ fontFamily: 'var(--font-numeric)', fontSize: 24, fontWeight: 600, color: 'var(--accent)', letterSpacing: '0.01em', textAlign: 'center', lineHeight: 1.5 }}>
        {chain}
      </div>
      <p style={{ margin: 0, maxWidth: 520, textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 15, lineHeight: 1.5, color: 'var(--ink-soft)' }}>
        {lines[lines.length - 1]}
      </p>
    </div>
  )
}

// A one-question check inside the lesson (retry allowed, no penalty).
function SignedAsk({ prompt, say, choices, answer, onDone }: {
  prompt: string; say: string; choices: Choice[]; answer: string | number; onDone: () => void
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
      <div style={{ width: '100%', maxWidth: 360 }}>
        <ChoiceGrid band={BAND} choices={choices} selected={selected} status={status} correctValue={answer} onPick={pick} columns={choices.length === 4 ? 2 : choices.length} />
      </div>
    </div>
  )
}

interface Props { band?: AgeBand; childName: string; onLessonComplete: () => void }

export default function SignedNumberFluencyTeenLesson({ childName, onLessonComplete }: Props) {
  const steps: LessonStep[] = [
    {
      bubble: 'Adding a negative is a jump left. Watch.', mood: 'happy',
      render: (d) => (
        <SignedWatch
          lines={[
            'Start at 3 on the line.',
            'Adding negative 5 means jump 5 steps left. You land on negative 2.',
          ]}
          min={-8} max={8} marked={[3, -2]} onDone={d}
        />
      ),
    },
    {
      bubble: 'Signs decide multiplication. Watch.', mood: 'thinking',
      render: (d) => (
        <ChainWatch
          lines={[
            'Multiply negative 4 by negative 3.',
            'Same signs give a positive, so negative 4 times negative 3 is positive 12.',
          ]}
          chain="(−4) × (−3) = +12"
          onDone={d}
        />
      ),
    },
    {
      bubble: 'Order of operations, with the sign. Watch.', mood: 'thinking',
      render: (d) => (
        <ChainWatch
          lines={[
            'Take 2 minus 3 squared.',
            'Do the exponent first: 3 squared is 9. Then 2 minus 9 is negative 7.',
          ]}
          chain="2 − 3²  =  2 − 9  =  −7"
          onDone={d}
        />
      ),
    },
    {
      bubble: 'Rational or not? Watch.', mood: 'happy',
      render: (d) => (
        <ChainWatch
          lines={[
            'A rational number can be written as a fraction. Root 2 cannot — its decimal never repeats.',
            'So root 2 is irrational, while three-quarters and root 16 are rational.',
          ]}
          chain="√2  →  irrational      √16 = 4  →  rational"
          onDone={d}
        />
      ),
    },
    {
      bubble: 'Your turn.', mood: 'thinking',
      render: (d) => (
        <SignedAsk
          prompt="−6 + 4 = ?"
          say="What is negative six plus four?"
          choices={[toChoice(-2), toChoice(2), toChoice(-10), toChoice(10)]}
          answer={-2}
          onDone={d}
        />
      ),
    },
  ]
  return (
    <TeenLessonShell
      band={BAND}
      childName={childName}
      chapterTitle="Signed Numbers & Real-Number Fluency"
      steps={steps}
      finalSpeech={`Solid, ${childName}. You can add, multiply, and order signed numbers — and tell rational from irrational. Let’s run the numbers.`}
      onLessonComplete={onLessonComplete}
    />
  )
}
