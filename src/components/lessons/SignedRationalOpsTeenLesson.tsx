'use client'
/**
 * SignedRationalOpsTeenLesson (12–14, "Field Lab") — worked-example walkthrough
 * for Operations with Signed Rational Numbers. Built on TeenLessonShell: a few
 * narrated "watch" steps (sign rules over a number line / mono expressions) plus
 * a quick check. Exports makeRound + SignedWatch so the practice chapter and its
 * re-teach reuse them. Mirrors IntegersTeenLesson in teen chrome.
 *
 * Difficulty ramp (curriculum-12-18.md, id "signedRationalOps"):
 *   L1 → add/subtract integers crossing zero
 *   L2 → multiply/divide with sign rules, subtract a negative
 *   L3 → signed fractions & decimals, short chains
 */
import React, { useEffect, useRef } from 'react'
import { speak, speakSeq } from '@/lib/useMiloSpeaker'
import type { LessonStep } from '@/components/lessons/_kit'
import type { AgeBand, Choice } from '@/components/teen/types'
import TeenLessonShell from '@/components/teen/TeenLessonShell'
import NumberLine from '@/components/teen/NumberLine'
import ChoiceGrid from '@/components/teen/ChoiceGrid'

const BAND: AgeBand = '12-14'

// ── shared helpers (reused by the practice chapter) ────────────────────────
const rint = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))
/** Pretty signed number: a real minus sign for negatives. */
export const fmtNum = (n: number) => {
  const r = Math.round(n * 100) / 100
  return r < 0 ? `−${Math.abs(r)}` : String(r)
}
/** Spoken signed number: "negative four point five". */
export const spoken = (n: number) => (n < 0 ? `negative ${Math.abs(n)}` : `${n}`)
const toChoice = (v: number): Choice => ({ value: v, label: fmtNum(v) })
const shuffle = <T,>(a: T[]): T[] => [...a].sort(() => Math.random() - 0.5)
/** Round to 2dp to keep decimal arithmetic exact for grading. */
const r2 = (n: number) => Math.round(n * 100) / 100

/** Build up to 4 mathematically-distinct choices around an answer. */
function choicesFrom(answer: number, distractors: number[]): Choice[] {
  const set = new Map<number, number>() // key→value (dedupe by 2dp key)
  const add = (v: number) => { const k = r2(v); if (Number.isFinite(k)) set.set(k, k) }
  add(answer)
  for (const d of distractors) { if (set.size >= 4) break; add(d) }
  let guard = 0
  while (set.size < 3 && guard++ < 50) add(answer + rint(-3, 3))
  return shuffle([...set.values()]).map(toChoice)
}

export interface Round {
  promptText: string
  say: string
  answer: number
  kind: 'numeric' | 'mcq'   // numeric → NumericEntry; mcq → ChoiceGrid
  choices?: Choice[]        // present when kind === 'mcq'
  suffix?: string           // NumericEntry suffix (rarely used here)
  line?: { min: number; max: number; marked: number[] }
  explain: string           // re-teach line (spoken + shown)
}

/** Difficulty-aware round generator. L1 cross-zero +/− · L2 sign rules & subtract-a-negative · L3 signed fractions/decimals + chains. */
export function makeRound(d: 1 | 2 | 3): Round {
  if (d === 1) {
    // Add / subtract integers crossing zero. MCQ with a supporting number line.
    if (Math.random() < 0.5) {
      // a + (−b) or (−a) + b — a sum that crosses zero
      const a = rint(2, 8)
      const b = rint(2, 8)
      const neg = Math.random() < 0.5
      const x = neg ? -a : a
      const y = neg ? b : -b
      const ans = x + y
      const expr = `${fmtNum(x)} + (${fmtNum(y)})`
      return {
        kind: 'mcq',
        promptText: `${expr} = ?`,
        say: `What is ${spoken(x)} plus ${spoken(y)}?`,
        answer: ans,
        choices: choicesFrom(ans, [x - y, -ans, ans + 1, ans - 1]),
        line: { min: -10, max: 10, marked: [x, ans] },
        explain: `Start at ${fmtNum(x)} and move ${y < 0 ? `${Math.abs(y)} left` : `${y} right`}: you land on ${fmtNum(ans)}.`,
      }
    }
    // a − b where the result goes below zero
    const a = rint(0, 6)
    const b = rint(a + 1, a + 9)
    const ans = a - b
    return {
      kind: 'mcq',
      promptText: `${a} − ${b} = ?`,
      say: `What is ${a} minus ${b}?`,
      answer: ans,
      choices: choicesFrom(ans, [b - a, -ans, ans - 1, ans + 1]),
      line: { min: -10, max: 10, marked: [a, ans] },
      explain: `From ${a}, step ${b} to the left and you cross zero to ${fmtNum(ans)}.`,
    }
  }

  if (d === 2) {
    const pick = Math.random()
    if (pick < 0.4) {
      // Subtract a negative → add. MCQ, number-line support.
      const a = rint(-6, 6)
      const b = rint(1, 8)
      const ans = a - -b // a − (−b) = a + b
      return {
        kind: 'mcq',
        promptText: `${fmtNum(a)} − (${fmtNum(-b)}) = ?`,
        say: `What is ${spoken(a)} minus ${spoken(-b)}?`,
        answer: ans,
        choices: choicesFrom(ans, [a - b, -ans, b - a, ans + 1]),
        line: { min: -12, max: 12, marked: [a, ans] },
        explain: `Subtracting a negative adds: ${fmtNum(a)} − (${fmtNum(-b)}) = ${fmtNum(a)} + ${b} = ${fmtNum(ans)}.`,
      }
    }
    if (pick < 0.7) {
      // Multiply with sign rules. NumericEntry.
      const a = rint(2, 9) * (Math.random() < 0.5 ? -1 : 1)
      const b = rint(2, 9) * (Math.random() < 0.5 ? -1 : 1)
      const ans = a * b
      const sameSign = a < 0 === b < 0
      return {
        kind: 'numeric',
        promptText: `${fmtNum(a)} × ${fmtNum(b)} = ?`,
        say: `What is ${spoken(a)} times ${spoken(b)}?`,
        answer: ans,
        explain: sameSign
          ? `Same signs make a positive: ${Math.abs(a)} × ${Math.abs(b)} = ${ans}.`
          : `Different signs make a negative: −(${Math.abs(a)} × ${Math.abs(b)}) = ${fmtNum(ans)}.`,
      }
    }
    // Divide with sign rules. NumericEntry, clean quotient.
    const ans0 = rint(2, 9) * (Math.random() < 0.5 ? -1 : 1)
    const b = rint(2, 9) * (Math.random() < 0.5 ? -1 : 1)
    const a = ans0 * b
    const ans = a / b
    const sameSign = a < 0 === b < 0
    return {
      kind: 'numeric',
      promptText: `${fmtNum(a)} ÷ ${fmtNum(b)} = ?`,
      say: `What is ${spoken(a)} divided by ${spoken(b)}?`,
      answer: ans,
      explain: sameSign
        ? `Same signs make a positive quotient: ${Math.abs(a)} ÷ ${Math.abs(b)} = ${Math.abs(ans)}.`
        : `Different signs make a negative quotient: −(${Math.abs(a)} ÷ ${Math.abs(b)}) = ${fmtNum(ans)}.`,
    }
  }

  // d === 3 — signed fractions & decimals, short chains.
  const pick = Math.random()
  if (pick < 0.4) {
    // Signed decimal add/subtract. NumericEntry (tolerance grading).
    const a = r2(rint(-50, 50) / 10) // one-decimal value in [-5, 5]
    const b = r2(rint(-50, 50) / 10)
    const sub = Math.random() < 0.5
    const ans = r2(sub ? a - b : a + b)
    const expr = sub ? `${fmtNum(a)} − (${fmtNum(b)})` : `${fmtNum(a)} + (${fmtNum(b)})`
    return {
      kind: 'numeric',
      promptText: `${expr} = ?`,
      say: `What is ${spoken(a)} ${sub ? 'minus' : 'plus'} ${spoken(b)}?`,
      answer: ans,
      explain: sub
        ? `Subtracting ${fmtNum(b)} flips it: ${fmtNum(a)} + ${fmtNum(-b)} = ${fmtNum(ans)}.`
        : `Combine on the line: ${fmtNum(a)} + ${fmtNum(b)} = ${fmtNum(ans)}.`,
    }
  }
  if (pick < 0.7) {
    // Signed fraction with a like denominator → answer as a decimal. NumericEntry.
    const den = [2, 4, 5, 10][rint(0, 3)]
    const an = rint(-9, 9)
    const bn = rint(-9, 9)
    const sumN = an + bn
    const ans = r2(sumN / den)
    return {
      kind: 'numeric',
      promptText: `${fmtNum(an)}/${den} + (${fmtNum(bn)}/${den}) = ?  (as a decimal)`,
      say: `Add ${spoken(an)} over ${den} and ${spoken(bn)} over ${den}. Give a decimal.`,
      answer: ans,
      explain: `Same denominator: ${fmtNum(an)} + ${fmtNum(bn)} = ${fmtNum(sumN)}, so ${fmtNum(sumN)}/${den} = ${fmtNum(ans)}.`,
    }
  }
  // Short signed chain (three terms). MCQ to keep it tap-fast.
  const t1 = rint(-7, 7)
  const t2 = rint(-7, 7)
  const t3 = rint(-7, 7)
  const ans = t1 + t2 - t3
  return {
    kind: 'mcq',
    promptText: `${fmtNum(t1)} + (${fmtNum(t2)}) − (${fmtNum(t3)}) = ?`,
    say: `What is ${spoken(t1)} plus ${spoken(t2)} minus ${spoken(t3)}?`,
    answer: ans,
    choices: choicesFrom(ans, [t1 + t2 + t3, t1 - t2 - t3, ans + 2, ans - 1]),
    explain: `Left to right: ${fmtNum(t1)} + ${fmtNum(t2)} = ${fmtNum(t1 + t2)}, then − (${fmtNum(t3)}) = ${fmtNum(ans)}.`,
  }
}

// ── SignedWatch: a narrated worked example (reused for re-teach) ────────────
// Shows a number line when a range is given, else the worked expression in mono.
export function SignedWatch({
  lines, min, max, marked, expr, onDone,
}: {
  lines: string[]; min?: number; max?: number; marked?: number[]; expr?: string; onDone: () => void
}) {
  const doneRef = useRef(onDone)
  doneRef.current = onDone
  useEffect(() => {
    const cancel = speakSeq(lines, { onDone: () => window.setTimeout(() => doneRef.current(), 1200) })
    return cancel
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const hasLine = typeof min === 'number' && typeof max === 'number'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, width: '100%' }}>
      {hasLine
        ? <NumberLine band={BAND} min={min!} max={max!} mode="read" marked={marked ?? []} />
        : expr
          ? <div style={{ fontFamily: 'var(--font-numeric)', fontSize: 26, fontWeight: 700, color: 'var(--ink)', letterSpacing: 0.5 }}>{expr}</div>
          : null}
      <p style={{ margin: 0, maxWidth: 520, textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 15, lineHeight: 1.5, color: 'var(--ink-soft)' }}>
        {lines[lines.length - 1]}
      </p>
    </div>
  )
}

// A one-question check inside the lesson (retry allowed, no penalty).
function SignedAsk({ prompt, say, choices, answer, onDone }: {
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
      <p style={{ margin: 0, fontFamily: 'var(--font-numeric)', fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>{prompt}</p>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <ChoiceGrid band={BAND} choices={choices} selected={selected} status={status} correctValue={answer} onPick={pick} columns={choices.length === 4 ? 2 : choices.length} />
      </div>
    </div>
  )
}

interface Props { band?: AgeBand; childName: string; onLessonComplete: () => void }

export default function SignedRationalOpsTeenLesson({ childName, onLessonComplete }: Props) {
  const steps: LessonStep[] = [
    {
      bubble: 'Adding a negative means moving left. Watch.', mood: 'happy',
      render: (d) => (
        <SignedWatch
          lines={['Start at three.', 'Add negative five — move five steps left, crossing zero.', 'Three plus negative five lands on negative two.']}
          min={-7} max={7} marked={[3, -2]} onDone={d}
        />
      ),
    },
    {
      bubble: 'Subtracting a negative adds. Watch.', mood: 'happy',
      render: (d) => (
        <SignedWatch
          lines={['Two minus negative four.', 'Subtracting a negative turns it into adding.', 'So two minus negative four is two plus four, which is six.']}
          expr="2 − (−4) = 2 + 4 = 6" onDone={d}
        />
      ),
    },
    {
      bubble: 'Signs that match make a positive; signs that differ make a negative.', mood: 'thinking',
      render: (d) => (
        <SignedWatch
          lines={['Multiply negative three by four.', 'Different signs, so the product is negative.', 'Negative three times four is negative twelve.']}
          expr="(−3) × 4 = −12" onDone={d}
        />
      ),
    },
    {
      bubble: 'Your turn.', mood: 'thinking',
      render: (d) => (
        <SignedAsk
          prompt="−6 + (−3) = ?"
          say="What is negative six plus negative three?"
          choices={[toChoice(-9), toChoice(-3), toChoice(3), toChoice(9)]}
          answer={-9}
          onDone={d}
        />
      ),
    },
  ]
  return (
    <TeenLessonShell
      band={BAND}
      childName={childName}
      chapterTitle="Operations with Signed Numbers"
      steps={steps}
      finalSpeech={`Nice work, ${childName}. You can add, subtract, multiply, and divide with signs. Let’s run the numbers.`}
      onLessonComplete={onLessonComplete}
    />
  )
}
