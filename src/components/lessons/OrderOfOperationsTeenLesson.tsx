'use client'
/**
 * OrderOfOperationsTeenLesson (12–14, "Field Lab") — worked-example walkthrough
 * for the Order of Operations investigation. Built on TeenLessonShell: a few
 * narrated "watch" steps that work an expression one operation at a time, then a
 * quick check ("which step happens first?"). Exports the round generator + the
 * OrderWatch narrated helper so the practice chapter and its re-teach reuse them.
 * Mirrors the IntegersTeenLesson pattern, in teen chrome.
 *
 * Difficulty ramp (curriculum id "orderOfOperations"):
 *   L1 two-op expressions (× / before + −)
 *   L2 brackets + one exponent
 *   L3 full order with brackets, exponents, and negatives
 */
import React, { useEffect, useRef } from 'react'
import { speak, speakSteps } from '@/lib/useMiloSpeaker'
import type { LessonStep } from '@/components/lessons/_kit'
import type { AgeBand, Choice } from '@/components/teen/types'
import TeenLessonShell from '@/components/teen/TeenLessonShell'
import ChoiceGrid from '@/components/teen/ChoiceGrid'

const BAND: AgeBand = '12-14'

// ── shared helpers (reused by the practice chapter) ────────────────────────
const rint = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))
/** Pretty integer: a real minus sign for negatives. */
export const fmtInt = (n: number) => (n < 0 ? `−${Math.abs(n)}` : String(n))
/** Spoken integer: "negative four". */
export const spoken = (n: number) => (n < 0 ? `negative ${Math.abs(n)}` : `${n}`)
const toChoice = (v: number): Choice => ({ value: v, label: fmtInt(v) })
const shuffle = <T,>(a: T[]): T[] => [...a].sort(() => Math.random() - 0.5)

function choicesFrom(answer: number, distractors: number[]): Choice[] {
  const set = new Set<number>([answer])
  for (const v of distractors) { if (set.size >= 4) break; if (Number.isFinite(v) && v !== answer) set.add(v) }
  let guard = 0
  while (set.size < 4 && guard++ < 50) { const c = answer + rint(-4, 5); if (c !== answer) set.add(c) }
  return shuffle([...set]).map(toChoice)
}

// ── Round model ────────────────────────────────────────────────────────────
// Two shapes share one type:
//  • kind:'numeric' → evaluate the expression (NumericEntry)
//  • kind:'choice'  → "which step happens first?" (ChoiceGrid over operation labels)
export interface Round {
  kind: 'numeric' | 'choice'
  expr: string          // the expression shown (with real minus signs / × ÷)
  promptText: string
  say: string
  answer: number
  // choice-mode only:
  choices?: Choice[]    // operation-step options (value = index, label = the step)
  explain: string       // re-teach line (worked, one step at a time → result)
  steps: string[]       // ordered worked-solution lines for OrderWatch
}

// ── L1: two-operation expressions (× or ÷ mixed with + or −) ────────────────
function roundL1(): Round {
  const a = rint(2, 9)
  const b = rint(2, 9)
  const c = rint(2, 9)
  // a + b × c   or   a × b − c   etc. — exactly one ×/÷ and one +/−.
  const mulFirst = Math.random() < 0.5
  if (mulFirst) {
    // a + b × c   — always addition here so L1 never goes below zero
    // (a − b × c would be ~always negative; negatives are reserved for L3).
    const expr = `${a} + ${b} × ${c}`
    const prod = b * c
    const answer = a + prod
    return {
      kind: 'numeric', expr,
      promptText: `Evaluate:  ${expr}`,
      say: `Evaluate ${a} plus ${b} times ${c}.`,
      answer,
      explain: `Multiply first: ${b} × ${c} = ${prod}. Then ${a} + ${prod} = ${fmtInt(answer)}.`,
      steps: [
        `Multiplication comes before adding or subtracting.`,
        `First do ${b} × ${c} = ${prod}.`,
        `Now ${a} + ${prod} = ${fmtInt(answer)}.`,
      ],
    }
  }
  // a × b + c   (or a × b − c, but only subtract when it stays ≥ 0)
  const prod = a * b
  const plus = prod - c < 0 ? true : Math.random() < 0.5
  const expr = `${a} × ${b} ${plus ? '+' : '−'} ${c}`
  const answer = plus ? prod + c : prod - c
  return {
    kind: 'numeric', expr,
    promptText: `Evaluate:  ${expr}`,
    say: `Evaluate ${a} times ${b} ${plus ? 'plus' : 'minus'} ${c}.`,
    answer,
    explain: `Multiply first: ${a} × ${b} = ${prod}. Then ${prod} ${plus ? '+' : '−'} ${c} = ${fmtInt(answer)}.`,
    steps: [
      `Multiplication comes before adding or subtracting.`,
      `First do ${a} × ${b} = ${prod}.`,
      `Now ${prod} ${plus ? '+' : '−'} ${c} = ${fmtInt(answer)}.`,
    ],
  }
}

// ── L2: brackets + one exponent ─────────────────────────────────────────────
function roundL2(): Round {
  if (Math.random() < 0.5) {
    // brackets: a × (b + c)   — and ask "which step first?" half the time
    const a = rint(2, 6)
    const b = rint(2, 8)
    const c = rint(2, 8)
    const expr = `${a} × (${b} + ${c})`
    const inner = b + c
    const answer = a * inner
    const askFirst = Math.random() < 0.5
    if (askFirst) {
      const opts = [`${b} + ${c}`, `${a} × ${b}`, `${a} × ${c}`]
      const choices: Choice[] = shuffle(opts.map((t, i) => ({ value: t, label: t })))
      return {
        kind: 'choice', expr,
        promptText: `Which step happens first in  ${expr} ?`,
        say: `In ${a} times, open bracket, ${b} plus ${c}, close bracket — which step happens first?`,
        answer: `${b} + ${c}` as unknown as number,
        choices,
        explain: `Brackets come first, so ${b} + ${c} = ${inner}, then ${a} × ${inner} = ${answer}.`,
        steps: [
          `Brackets are always done first.`,
          `Do ${b} + ${c} = ${inner}.`,
          `Then ${a} × ${inner} = ${answer}.`,
        ],
      }
    }
    return {
      kind: 'numeric', expr,
      promptText: `Evaluate:  ${expr}`,
      say: `Evaluate ${a} times, open bracket, ${b} plus ${c}, close bracket.`,
      answer,
      explain: `Brackets first: ${b} + ${c} = ${inner}. Then ${a} × ${inner} = ${answer}.`,
      steps: [
        `Brackets are done first.`,
        `Inside: ${b} + ${c} = ${inner}.`,
        `Then ${a} × ${inner} = ${answer}.`,
      ],
    }
  }
  // exponent: a + b²   (or b² − a, but only subtract when it stays ≥ 0)
  const base = rint(2, 6)
  const a = rint(1, 9)
  const sq = base * base
  const plus = sq - a < 0 ? true : Math.random() < 0.5
  const expr = plus ? `${a} + ${base}²` : `${base}² − ${a}`
  const answer = plus ? a + sq : sq - a
  return {
    kind: 'numeric', expr,
    promptText: `Evaluate:  ${expr}`,
    say: plus ? `Evaluate ${a} plus ${base} squared.` : `Evaluate ${base} squared minus ${a}.`,
    answer,
    explain: `Powers before + and −: ${base}² = ${sq}. Then ${plus ? `${a} + ${sq}` : `${sq} − ${a}`} = ${answer}.`,
    steps: [
      `Exponents come before adding or subtracting.`,
      `First ${base}² = ${base} × ${base} = ${sq}.`,
      `Then ${plus ? `${a} + ${sq}` : `${sq} − ${a}`} = ${answer}.`,
    ],
  }
}

// ── L3: full order — brackets, exponents, negatives ─────────────────────────
function roundL3(): Round {
  const variant = rint(0, 2)
  if (variant === 0) {
    // (a − b)² + c   — brackets, then exponent, then add
    const a = rint(5, 9)
    const b = rint(1, a - 1)
    const c = rint(2, 9)
    const diff = a - b
    const sq = diff * diff
    const answer = sq + c
    const expr = `(${a} − ${b})² + ${c}`
    return {
      kind: 'numeric', expr,
      promptText: `Evaluate:  ${expr}`,
      say: `Evaluate, open bracket ${a} minus ${b} close bracket, squared, plus ${c}.`,
      answer,
      explain: `Brackets: ${a} − ${b} = ${diff}. Square it: ${diff}² = ${sq}. Then + ${c} = ${answer}.`,
      steps: [
        `Brackets first, then the exponent, then add.`,
        `Inside: ${a} − ${b} = ${diff}.`,
        `Square it: ${diff}² = ${sq}.`,
        `Then ${sq} + ${c} = ${answer}.`,
      ],
    }
  }
  if (variant === 1) {
    // a − b × c  giving a negative result (negatives in the answer)
    const b = rint(3, 6)
    const c = rint(3, 6)
    const prod = b * c
    const a = rint(1, prod - 1)
    const answer = a - prod   // negative
    const expr = `${a} − ${b} × ${c}`
    return {
      kind: 'numeric', expr,
      promptText: `Evaluate:  ${expr}`,
      say: `Evaluate ${a} minus ${b} times ${c}.`,
      answer,
      explain: `Multiply first: ${b} × ${c} = ${prod}. Then ${a} − ${prod} = ${fmtInt(answer)} — it goes below zero.`,
      steps: [
        `Multiply before subtracting.`,
        `${b} × ${c} = ${prod}.`,
        `Then ${a} − ${prod} = ${fmtInt(answer)}.`,
      ],
    }
  }
  // 2 × (a + b) − c²  — full chain; ask "which first?"
  const a = rint(2, 6)
  const b = rint(2, 6)
  const base = rint(2, 4)
  const k = rint(2, 4)
  const inner = a + b
  const sq = base * base
  const answer = k * inner - sq
  const expr = `${k} × (${a} + ${b}) − ${base}²`
  const opts = [`${a} + ${b}`, `${k} × ${a}`, `${base}²`]
  const choices: Choice[] = shuffle(opts.map((t) => ({ value: t, label: t })))
  return {
    kind: 'choice', expr,
    promptText: `Which step happens first in  ${expr} ?`,
    say: `In ${k} times, open bracket ${a} plus ${b} close bracket, minus ${base} squared — which step happens first?`,
    answer: `${a} + ${b}` as unknown as number,
    choices,
    explain: `Brackets first: ${a} + ${b} = ${inner}. Then ${base}² = ${sq}. Then ${k} × ${inner} − ${sq} = ${answer}.`,
    steps: [
      `Brackets come before everything else.`,
      `Do ${a} + ${b} = ${inner}.`,
      `Then the power ${base}² = ${sq}.`,
      `Finally ${k} × ${inner} − ${sq} = ${answer}.`,
    ],
  }
}

/** Difficulty-aware round generator. */
export function makeRound(d: 1 | 2 | 3): Round {
  if (d === 1) return roundL1()
  if (d === 2) return roundL2()
  return roundL3()
}

// ── OrderWatch: a narrated worked example (reused for re-teach) ──────────────
// Shows the expression, then peels one operation at a time as Milo narrates.
export function OrderWatch({
  expr, steps, onDone,
}: {
  expr: string; steps: string[]; onDone: () => void
}) {
  const doneRef = useRef(onDone)
  doneRef.current = onDone
  const [shown, setShown] = React.useState(0)
  useEffect(() => {
    const cancel = speakSteps(steps, {
      onStep: (i) => setShown(i + 1),
      onDone: () => window.setTimeout(() => doneRef.current(), 1200),
    })
    return cancel
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, width: '100%' }}>
      <div style={{ fontFamily: 'var(--font-numeric)', fontSize: 30, fontWeight: 700, color: 'var(--ink)', letterSpacing: '0.02em' }}>
        {expr}
      </div>
      <ol style={{ margin: 0, padding: 0, listStyle: 'none', width: '100%', maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {steps.map((line, i) => (
          <li
            key={i}
            style={{
              opacity: i < shown ? 1 : 0.18,
              transition: 'opacity 240ms var(--ease-smooth)',
              fontFamily: 'var(--font-body)', fontSize: 15, lineHeight: 1.5,
              color: i === shown - 1 ? 'var(--ink)' : 'var(--ink-soft)',
              textAlign: 'center', fontWeight: i === shown - 1 ? 600 : 400,
            }}
          >
            {line}
          </li>
        ))}
      </ol>
    </div>
  )
}

// A one-question check inside the lesson (retry allowed, no penalty).
// "Which step happens first?" — the heart of the chapter.
function OrderAsk({ expr, prompt, say, choices, answer, onDone }: {
  expr: string; prompt: string; say: string; choices: Choice[]; answer: string | number; onDone: () => void
}) {
  const [selected, setSelected] = React.useState<string | number | null>(null)
  const [status, setStatus] = React.useState<'idle' | 'correct' | 'wrong'>('idle')
  const spokenRef = useRef(false)
  useEffect(() => { if (!spokenRef.current) { spokenRef.current = true; speak(say) } }, []) // eslint-disable-line
  function pick(v: string | number) {
    if (status === 'correct') return
    setSelected(v)
    if (v === answer) { setStatus('correct'); speak('Yes — that one comes first.'); window.setTimeout(onDone, 1400) }
    else { setStatus('wrong'); speak('Not quite — take another look.'); window.setTimeout(() => { setSelected(null); setStatus('idle') }, 1200) }
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%' }}>
      <div style={{ fontFamily: 'var(--font-numeric)', fontSize: 26, fontWeight: 700, color: 'var(--ink)' }}>{expr}</div>
      <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 17, fontWeight: 600, color: 'var(--ink)' }}>{prompt}</p>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <ChoiceGrid band={BAND} choices={choices} selected={selected} status={status} correctValue={answer} onPick={pick} columns={1} mono />
      </div>
    </div>
  )
}

interface Props { band?: AgeBand; childName: string; onLessonComplete: () => void }

export default function OrderOfOperationsTeenLesson({ childName, onLessonComplete }: Props) {
  const steps: LessonStep[] = [
    {
      bubble: 'One expression, one right answer — if we agree on the order. Watch.', mood: 'happy',
      render: (d) => (
        <OrderWatch
          expr="3 + 4 × 5"
          steps={[
            'Add and multiply pull in different directions, so we need a rule.',
            'Multiplication comes before adding: 4 × 5 = 20.',
            'Then 3 + 20 = 23. (Left to right would wrongly give 35.)',
          ]}
          onDone={d}
        />
      ),
    },
    {
      bubble: 'Brackets jump the queue. Watch.', mood: 'happy',
      render: (d) => (
        <OrderWatch
          expr="2 × (6 + 1)"
          steps={[
            'Anything inside brackets is done first.',
            'Inside: 6 + 1 = 7.',
            'Then 2 × 7 = 14.',
          ]}
          onDone={d}
        />
      ),
    },
    {
      bubble: 'The full order: brackets, exponents, then × ÷, then + −.', mood: 'thinking',
      render: (d) => (
        <OrderWatch
          expr="(5 − 2)² + 4"
          steps={[
            'Brackets first, then exponents, then × ÷, then + −.',
            'Brackets: 5 − 2 = 3.',
            'Exponent: 3² = 9.',
            'Then 9 + 4 = 13.',
          ]}
          onDone={d}
        />
      ),
    },
    {
      bubble: 'Your turn — which step happens first?', mood: 'thinking',
      render: (d) => (
        <OrderAsk
          expr="10 − 2 × 3"
          prompt="Which step happens first?"
          say="In 10 minus 2 times 3, which step happens first?"
          choices={[
            { value: '2 × 3', label: '2 × 3' },
            { value: '10 − 2', label: '10 − 2' },
          ]}
          answer={'2 × 3'}
          onDone={d}
        />
      ),
    },
  ]
  return (
    <TeenLessonShell
      band={BAND}
      childName={childName}
      chapterTitle="Order of Operations"
      steps={steps}
      finalSpeech={`Nice work, ${childName}. Brackets, exponents, then times and divide, then add and subtract. Let’s put it to work.`}
      onLessonComplete={onLessonComplete}
    />
  )
}
