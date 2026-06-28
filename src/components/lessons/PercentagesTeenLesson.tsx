'use client'
/**
 * PercentagesTeenLesson (12–14, "Field Lab") — the worked-example walkthrough for
 * the Percentages investigation. Built on TeenLessonShell: a few narrated "watch"
 * steps that work a percent example, then a quick check. Exports the round
 * generator + PercentWatch so the practice chapter and its re-teach reuse them.
 * Mirrors the IntegersTeenLesson pattern, in teen chrome.
 *
 * Difficulty ramp (curriculum id "percentages"):
 *   L1 percent ↔ fraction ↔ decimal & benchmarks (MCQ)
 *   L2 percent of a quantity / find the percent (numeric)
 *   L3 increase / decrease + reverse via scaffolded division (numeric)
 */
import React, { useEffect, useRef } from 'react'
import { speak, speakSeq } from '@/lib/useMiloSpeaker'
import type { LessonStep } from '@/components/lessons/_kit'
import type { AgeBand, Choice } from '@/components/teen/types'
import TeenLessonShell from '@/components/teen/TeenLessonShell'
import ChoiceGrid from '@/components/teen/ChoiceGrid'

const BAND: AgeBand = '12-14'

// ── shared helpers (reused by the practice chapter) ────────────────────────
const rint = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]
const shuffle = <T,>(a: T[]): T[] => [...a].sort(() => Math.random() - 0.5)

/** Round a value to at most 2 decimals, dropping trailing zeros. */
export const tidy = (n: number) => Math.round(n * 100) / 100
const fmtNum = (n: number) => {
  const t = tidy(n)
  return Number.isInteger(t) ? String(t) : String(t)
}
const fmtMoney = (n: number) => `$${tidy(n).toFixed(tidy(n) % 1 === 0 ? 0 : 2)}`

// gcd for reducing a fraction shown in choices
const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
function reduce(num: number, den: number): [number, number] {
  const g = gcd(Math.abs(num), Math.abs(den)) || 1
  return [num / g, den / g]
}

const toChoice = (v: number, label?: string): Choice => ({ value: v, label: label ?? fmtNum(v) })

// Benchmark table: percent → [fraction text, decimal]
const BENCH: { pct: number; frac: string; dec: number }[] = [
  { pct: 10, frac: '1/10', dec: 0.1 },
  { pct: 20, frac: '1/5', dec: 0.2 },
  { pct: 25, frac: '1/4', dec: 0.25 },
  { pct: 50, frac: '1/2', dec: 0.5 },
  { pct: 75, frac: '3/4', dec: 0.75 },
  { pct: 100, frac: '1/1', dec: 1 },
]

// answer mode tells the practice screen which input primitive to render
export type RoundMode = 'choice' | 'numeric'

export interface Round {
  mode: RoundMode
  promptText: string
  say: string
  answer: number
  suffix?: string          // numeric suffix, e.g. "%"
  choices: Choice[]        // populated for mode === 'choice'
  explain: string          // re-teach line(s) joined into one prompt
  watch: string[]          // narrated re-teach steps
}

/** Difficulty-aware round generator. */
export function makeRound(d: 1 | 2 | 3): Round {
  if (d === 1) return makeConvert()
  if (d === 2) return makePercentOf()
  return makeChange()
}

// ── L1: percent ↔ fraction ↔ decimal & benchmarks ─────────────────────────
function makeConvert(): Round {
  const roll = Math.random()
  if (roll < 0.4) {
    // percent → decimal
    const b = pick(BENCH.filter((x) => x.pct !== 100))
    const ans = b.dec
    const distractors = [b.pct, b.dec * 10, b.dec / 10]
    const choices = shuffle([
      toChoice(ans, fmtNum(ans)),
      toChoice(b.pct, fmtNum(b.pct)),
      toChoice(b.dec * 10, fmtNum(b.dec * 10)),
      toChoice(b.dec / 10, fmtNum(b.dec / 10)),
    ].filter((c, i, arr) => arr.findIndex((o) => o.value === c.value) === i).slice(0, 4))
    void distractors
    return {
      mode: 'choice',
      promptText: `Write ${b.pct}% as a decimal.`,
      say: `Write ${b.pct} percent as a decimal.`,
      answer: ans,
      choices,
      explain: `Percent means "out of 100", so ${b.pct}% = ${b.pct} ÷ 100 = ${fmtNum(ans)}.`,
      watch: [`Percent means out of one hundred.`, `So ${b.pct} percent equals ${b.pct} divided by one hundred, which is ${fmtNum(ans)}.`],
    }
  }
  if (roll < 0.7) {
    // percent → fraction (reduced)
    const b = pick(BENCH.filter((x) => x.pct !== 100))
    const [n, dd] = reduce(b.pct, 100)
    const ansLabel = `${n}/${dd}`
    // we grade by the percent value (unique), choices show fractions
    const wrongFracs = [`${b.pct}/10`, `${b.pct}/1000`, `1/${b.pct}`]
    const choices = shuffle([
      { value: b.pct, label: ansLabel },
      { value: -1, label: wrongFracs[0] },
      { value: -2, label: wrongFracs[1] },
      { value: -3, label: wrongFracs[2] },
    ])
    return {
      mode: 'choice',
      promptText: `Write ${b.pct}% as a fraction in lowest terms.`,
      say: `Write ${b.pct} percent as a fraction in lowest terms.`,
      answer: b.pct,
      choices,
      explain: `${b.pct}% = ${b.pct}/100, and ${b.pct}/100 reduces to ${ansLabel}.`,
      watch: [`${b.pct} percent is ${b.pct} over one hundred.`, `Reduce ${b.pct} over one hundred to get ${n} over ${dd}.`],
    }
  }
  // decimal → percent
  const b = pick(BENCH.filter((x) => x.pct !== 100))
  const ans = b.pct
  const choices = shuffle([
    toChoice(ans, `${ans}%`),
    toChoice(b.dec, `${fmtNum(b.dec)}%`),
    toChoice(ans * 10, `${ans * 10}%`),
    toChoice(ans / 10, `${fmtNum(ans / 10)}%`),
  ].filter((c, i, arr) => arr.findIndex((o) => o.value === c.value) === i).slice(0, 4))
  return {
    mode: 'choice',
    promptText: `Write ${fmtNum(b.dec)} as a percent.`,
    say: `Write ${fmtNum(b.dec)} as a percent.`,
    answer: ans,
    choices,
    explain: `To turn a decimal into a percent, multiply by 100: ${fmtNum(b.dec)} × 100 = ${ans}%.`,
    watch: [`To go from a decimal to a percent, multiply by one hundred.`, `${fmtNum(b.dec)} times one hundred is ${ans} percent.`],
  }
}

// ── L2: percent of a quantity / find the percent ───────────────────────────
function makePercentOf(): Round {
  if (Math.random() < 0.6) {
    // percent of a quantity → numeric
    const pct = pick([10, 20, 25, 50, 75])
    const base = pick([40, 60, 80, 120, 200, 240])
    const ans = (pct / 100) * base
    return {
      mode: 'numeric',
      promptText: `What is ${pct}% of ${base}?`,
      say: `What is ${pct} percent of ${base}?`,
      answer: tidy(ans),
      choices: [],
      explain: `${pct}% of ${base} = ${pct}/100 × ${base} = ${fmtNum(ans)}.`,
      watch: [`Turn ${pct} percent into the decimal ${fmtNum(pct / 100)}.`, `Then multiply: ${fmtNum(pct / 100)} times ${base} equals ${fmtNum(ans)}.`],
    }
  }
  // find the percent → numeric (answer is a %)
  const pct = pick([10, 20, 25, 50, 75])
  const base = pick([20, 40, 60, 80, 200])
  const part = (pct / 100) * base
  return {
    mode: 'numeric',
    promptText: `${fmtNum(part)} is what percent of ${base}?`,
    say: `${fmtNum(part)} is what percent of ${base}?`,
    answer: pct,
    suffix: '%',
    choices: [],
    explain: `Divide the part by the whole, then × 100: ${fmtNum(part)} ÷ ${base} = ${fmtNum(part / base)}, so ${pct}%.`,
    watch: [`Divide the part by the whole: ${fmtNum(part)} divided by ${base} is ${fmtNum(part / base)}.`, `Multiply by one hundred to get ${pct} percent.`],
  }
}

// ── L3: increase / decrease + reverse ──────────────────────────────────────
function makeChange(): Round {
  const roll = Math.random()
  if (roll < 0.4) {
    // increase
    const pct = pick([10, 20, 25, 50])
    const base = pick([40, 60, 80, 120, 200])
    const ans = base * (1 + pct / 100)
    return {
      mode: 'numeric',
      promptText: `A $${base} item goes up ${pct}%. What is the new price?`,
      say: `An item costing ${base} dollars goes up ${pct} percent. What is the new price?`,
      answer: tidy(ans),
      suffix: '',
      choices: [],
      explain: `Add the increase: ${base} + ${pct}% of ${base} = ${base} + ${fmtNum((pct / 100) * base)} = ${fmtMoney(ans)}.`,
      watch: [`${pct} percent of ${base} is ${fmtNum((pct / 100) * base)}.`, `Add it on: ${base} plus ${fmtNum((pct / 100) * base)} equals ${fmtNum(ans)}.`],
    }
  }
  if (roll < 0.75) {
    // decrease
    const pct = pick([10, 20, 25, 50])
    const base = pick([40, 60, 80, 120, 200])
    const ans = base * (1 - pct / 100)
    return {
      mode: 'numeric',
      promptText: `A $${base} item is ${pct}% off. What is the sale price?`,
      say: `An item costing ${base} dollars is ${pct} percent off. What is the sale price?`,
      answer: tidy(ans),
      suffix: '',
      choices: [],
      explain: `Take off the discount: ${base} − ${pct}% of ${base} = ${base} − ${fmtNum((pct / 100) * base)} = ${fmtMoney(ans)}.`,
      watch: [`${pct} percent of ${base} is ${fmtNum((pct / 100) * base)}.`, `Subtract it: ${base} minus ${fmtNum((pct / 100) * base)} equals ${fmtNum(ans)}.`],
    }
  }
  // reverse: scaffolded division (find the original before a known % change)
  const pct = pick([20, 25, 50])
  const orig = pick([40, 60, 80, 120, 200])
  const after = orig * (1 + pct / 100)
  const factor = 1 + pct / 100
  return {
    mode: 'numeric',
    promptText: `After a ${pct}% increase, the price is $${fmtNum(after)}. What was the original price?`,
    say: `After a ${pct} percent increase, the price is ${fmtNum(after)} dollars. What was the original price?`,
    answer: tidy(orig),
    suffix: '',
    choices: [],
    explain: `A ${pct}% increase means the new price is ${fmtNum(factor)} × the original, so divide back: ${fmtNum(after)} ÷ ${fmtNum(factor)} = ${fmtMoney(orig)}.`,
    watch: [`A ${pct} percent increase multiplies the original by ${fmtNum(factor)}.`, `So divide back: ${fmtNum(after)} divided by ${fmtNum(factor)} equals ${fmtNum(orig)}.`],
  }
}

// ── PercentWatch: a narrated worked example (reused for re-teach) ───────────
export function PercentWatch({ lines, onDone }: { lines: string[]; onDone: () => void }) {
  const doneRef = useRef(onDone)
  doneRef.current = onDone
  useEffect(() => {
    const cancel = speakSeq(lines, { onDone: () => window.setTimeout(() => doneRef.current(), 1200) })
    return cancel
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: '100%' }}>
      {lines.map((l, i) => (
        <p
          key={i}
          style={{
            margin: 0, maxWidth: 520, textAlign: 'center',
            fontFamily: 'var(--font-body)', fontSize: i === lines.length - 1 ? 16 : 15,
            fontWeight: i === lines.length - 1 ? 700 : 500,
            lineHeight: 1.5, color: i === lines.length - 1 ? 'var(--ink)' : 'var(--ink-soft)',
          }}
        >
          {l}
        </p>
      ))}
    </div>
  )
}

// A one-question check inside the lesson (retry allowed, no penalty).
function PercentAsk({ prompt, say, choices, answer, onDone }: {
  prompt: string; say: string; choices: Choice[]; answer: number; onDone: () => void
}) {
  const [selected, setSelected] = React.useState<string | number | null>(null)
  const [status, setStatus] = React.useState<'idle' | 'correct' | 'wrong'>('idle')
  const spokenRef = useRef(false)
  useEffect(() => { if (!spokenRef.current) { spokenRef.current = true; speak(say) } }, []) // eslint-disable-line
  function choose(v: string | number) {
    if (status === 'correct') return
    setSelected(v)
    if (v === answer) { setStatus('correct'); speak('Yes — that’s it.'); window.setTimeout(onDone, 1400) }
    else { setStatus('wrong'); speak('Not quite — take another look.'); window.setTimeout(() => { setSelected(null); setStatus('idle') }, 1200) }
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%' }}>
      <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>{prompt}</p>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <ChoiceGrid band={BAND} choices={choices} selected={selected} status={status} correctValue={answer} onPick={choose} columns={2} />
      </div>
    </div>
  )
}

interface Props { band?: AgeBand; childName: string; onLessonComplete: () => void }

export default function PercentagesTeenLesson({ childName, onLessonComplete }: Props) {
  const steps: LessonStep[] = [
    {
      bubble: 'Percent just means “out of 100”. Watch.', mood: 'happy',
      render: (d) => (
        <PercentWatch
          lines={[
            'A percent is a number out of one hundred.',
            'So 25 percent means 25 out of 100 — that is the fraction 1 over 4, or the decimal 0.25.',
          ]}
          onDone={d}
        />
      ),
    },
    {
      bubble: 'To take a percent OF something, multiply.', mood: 'happy',
      render: (d) => (
        <PercentWatch
          lines={[
            'To find 20 percent of 80, first write 20 percent as the decimal 0.2.',
            'Then multiply: 0.2 times 80 equals 16.',
          ]}
          onDone={d}
        />
      ),
    },
    {
      bubble: 'A discount? Find the part, then subtract.', mood: 'thinking',
      render: (d) => (
        <PercentWatch
          lines={[
            'A $50 jacket is 10 percent off. Ten percent of 50 is 5.',
            'Subtract the discount: 50 minus 5 is 45. The sale price is $45.',
          ]}
          onDone={d}
        />
      ),
    },
    {
      bubble: 'Your turn.', mood: 'thinking',
      render: (d) => (
        <PercentAsk
          prompt="What is 50% of 60?"
          say="What is 50 percent of 60?"
          choices={[toChoice(30), toChoice(120), toChoice(10), toChoice(50)]}
          answer={30}
          onDone={d}
        />
      ),
    },
  ]
  return (
    <TeenLessonShell
      band={BAND}
      childName={childName}
      chapterTitle="Percentages"
      steps={steps}
      finalSpeech={`Nice work, ${childName}. You can convert percents, take a percent of a quantity, and handle increases and discounts. Let’s investigate.`}
      onLessonComplete={onLessonComplete}
    />
  )
}
