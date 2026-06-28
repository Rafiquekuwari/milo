'use client'
/**
 * IntegersTeenLesson (12–14, "Field Lab") — the worked-example walkthrough for
 * the Integers & the Number Line investigation. Built on TeenLessonShell (the
 * teen equivalent of LessonScaffold): a few "watch" steps narrated over a number
 * line, then a quick check. Exports the round generator + IntegerWatch so the
 * practice chapter and its re-teach reuse them. Mirrors the ArithmeticLesson
 * pattern, in teen chrome.
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
/** Pretty integer: a real minus sign for negatives. */
export const fmtInt = (n: number) => (n < 0 ? `−${Math.abs(n)}` : String(n))
/** Spoken integer: "negative four". */
export const spoken = (n: number) => (n < 0 ? `negative ${Math.abs(n)}` : `${n}`)
const toChoice = (v: number): Choice => ({ value: v, label: fmtInt(v) })
const shuffle = <T,>(a: T[]): T[] => [...a].sort(() => Math.random() - 0.5)

function distinctInts(count: number, lo: number, hi: number, seed?: number[]): number[] {
  const s = new Set<number>(seed ?? [])
  let guard = 0
  while (s.size < count && guard++ < 200) s.add(rint(lo, hi))
  return [...s]
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
  answer: number
  line?: { min: number; max: number; marked: number[] }
  explain: string   // re-teach line
}

/** Difficulty-aware round generator: L1 read-on-line · L2 abs/ordering · L3 distance/arithmetic. */
export function makeRound(d: 1 | 2 | 3): Round {
  if (d === 1) {
    const t = rint(-8, 8)
    return {
      promptText: 'What number is marked on the line?',
      say: 'What number is marked on the line?',
      choices: choicesFrom(t, [t + 1, t - 1, -t, t + 2]),
      answer: t,
      line: { min: -10, max: 10, marked: [t] },
      explain: `The mark sits at ${fmtInt(t)} — count the steps from zero.`,
    }
  }
  if (d === 2) {
    if (Math.random() < 0.5) {
      const n = rint(-9, -1)
      const ans = Math.abs(n)
      return {
        promptText: `What is |${fmtInt(n)}|?`,
        say: `What is the absolute value of ${spoken(n)}?`,
        choices: choicesFrom(ans, [n, ans + 1, ans - 1, ans + 2]),
        answer: ans,
        explain: `Absolute value is distance from zero, so |${fmtInt(n)}| = ${ans}.`,
      }
    }
    const three = distinctInts(3, -9, 9)
    const ans = Math.min(...three)
    return {
      promptText: 'Which is smallest?',
      say: `Which is smallest: ${three.map(spoken).join(', ')}?`,
      choices: shuffle(three).map(toChoice),
      answer: ans,
      explain: `${fmtInt(ans)} is furthest to the left, so it is the smallest.`,
    }
  }
  // d === 3
  if (Math.random() < 0.5) {
    let a = rint(-9, 9)
    let b = rint(-9, 9)
    let guard = 0
    while ((Math.abs(a) === Math.abs(b) || a === b) && guard++ < 50) b = rint(-9, 9)
    const ans = Math.abs(a) > Math.abs(b) ? a : b
    return {
      promptText: 'Which is farther from zero?',
      say: `Which is farther from zero: ${spoken(a)} or ${spoken(b)}?`,
      choices: shuffle([a, b]).map(toChoice),
      answer: ans,
      explain: `${fmtInt(ans)} is ${Math.abs(ans)} steps from zero — farther than ${Math.abs(ans === a ? b : a)}.`,
    }
  }
  const m = rint(-4, 4)
  const k = rint(2, 7)
  const ans = m - k
  return {
    promptText: `What is ${k} less than ${fmtInt(m)}?`,
    say: `What is ${k} less than ${spoken(m)}?`,
    choices: choicesFrom(ans, [m + k, ans + 1, ans - 1, ans + 2]),
    answer: ans,
    explain: `Start at ${fmtInt(m)} and step ${k} to the left: ${fmtInt(ans)}.`,
  }
}

// ── IntegerWatch: a narrated number-line worked example (reused for re-teach) ──
export function IntegerWatch({
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

// A one-question check inside the lesson (retry allowed, no penalty).
function IntegerAsk({ prompt, say, choices, answer, onDone }: {
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
      <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>{prompt}</p>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <ChoiceGrid band={BAND} choices={choices} selected={selected} status={status} onPick={pick} columns={choices.length} />
      </div>
    </div>
  )
}

interface Props { band?: AgeBand; childName: string; onLessonComplete: () => void }

export default function IntegersTeenLesson({ childName, onLessonComplete }: Props) {
  const steps: LessonStep[] = [
    {
      bubble: 'Numbers run both ways from zero. Watch.', mood: 'happy',
      render: (d) => (
        <IntegerWatch
          lines={['Zero sits in the middle of the line.', 'To the right are positive numbers; to the left, negative numbers — below zero.']}
          min={-5} max={5} marked={[-3, 3]} onDone={d}
        />
      ),
    },
    {
      bubble: 'Further right is always greater. Watch.', mood: 'happy',
      render: (d) => (
        <IntegerWatch
          lines={['Compare negative five and negative two.', 'Negative two sits further right, so negative two is greater than negative five.']}
          min={-6} max={2} marked={[-5, -2]} onDone={d}
        />
      ),
    },
    {
      bubble: 'Distance from zero is the absolute value.', mood: 'thinking',
      render: (d) => (
        <IntegerWatch
          lines={['How far is negative four from zero? Four steps.', 'So the absolute value of negative four is four.']}
          min={-6} max={6} marked={[-4, 0]} onDone={d}
        />
      ),
    },
    {
      bubble: 'Your turn.', mood: 'thinking',
      render: (d) => (
        <IntegerAsk
          prompt="Which is greater?"
          say="Which is greater: negative three, or negative seven?"
          choices={[toChoice(-3), toChoice(-7)]}
          answer={-3}
          onDone={d}
        />
      ),
    },
  ]
  return (
    <TeenLessonShell
      band={BAND}
      childName={childName}
      chapterTitle="Integers & the Number Line"
      steps={steps}
      finalSpeech={`Nice work, ${childName}. You can place, compare, and measure integers. Let’s investigate.`}
      onLessonComplete={onLessonComplete}
    />
  )
}
