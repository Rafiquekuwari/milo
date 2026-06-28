'use client'
/**
 * RatioProportionTeenLesson (12–14, "Field Lab") — worked-example walkthrough for
 * the Ratios, Rates & Proportions investigation. Built on TeenLessonShell: a few
 * narrated "watch" steps, then a quick check. Exports the round generator + the
 * RatioWatch helper so the practice chapter and its re-teach reuse them. Mirrors
 * IntegersTeenLesson exactly, in teen chrome.
 *
 * Difficulty ramp (curriculum row "ratioProportion"):
 *   L1 — write / simplify a ratio + equivalent ratios
 *   L2 — unit rate / best buy
 *   L3 — solve a proportion for the unknown + word problems
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
const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b))
const shuffle = <T,>(a: T[]): T[] => [...a].sort(() => Math.random() - 0.5)
/** Round to 2 dp for clean money/rate display. */
const money = (n: number) => `$${n.toFixed(2)}`
const toChoice = (v: number | string, label?: string): Choice => ({ value: v, label: label ?? String(v) })

function distinct(count: number, gen: () => number, seed: number[] = []): number[] {
  const s = new Set<number>(seed)
  let guard = 0
  while (s.size < count && guard++ < 200) s.add(gen())
  return [...s]
}

export interface Round {
  kind: 'numeric' | 'choice'
  promptText: string
  say: string
  answer: number              // numeric answer (NaN for string-label choice rounds)
  answerValue?: string | number // the correct choice value (for kind==='choice')
  suffix?: string             // NumericEntry suffix, e.g. "$"
  choices?: Choice[]          // for kind==='choice'
  columns?: number
  explain: string             // re-teach line
}

/**
 * Difficulty-aware round generator.
 *   d=1 simplify a ratio / fill the equivalent ratio
 *   d=2 unit rate (numeric) or best buy (choice)
 *   d=3 solve a proportion for x (numeric) or a proportion word problem (numeric)
 */
export function makeRound(d: 1 | 2 | 3): Round {
  if (d === 1) {
    if (Math.random() < 0.5) {
      // Simplify a ratio: choose the simplest equivalent form (MCQ).
      const k = rint(2, 6)
      const a0 = rint(1, 6)
      let b0 = rint(1, 6)
      while (b0 === a0) b0 = rint(1, 6)
      const g = gcd(a0, b0)
      const sa = a0 / g, sb = b0 / g            // already simplest base
      const A = sa * k, B = sb * k              // the given (unsimplified) ratio
      const ansLabel = `${sa}:${sb}`
      const distract = [
        `${A}:${B}`,                            // not simplified (the given)
        `${sb}:${sa}`,                          // flipped
        `${sa + 1}:${sb + 1}`,                  // added instead of divided
      ]
      // ensure the correct option is present, then fill to 4 unique labels
      const uniq = Array.from(new Set([ansLabel, ...distract]))
      const opts = shuffle(uniq).slice(0, 4)
      if (!opts.includes(ansLabel)) opts[0] = ansLabel
      const choices: Choice[] = shuffle(opts).map((s) => toChoice(s))
      return {
        kind: 'choice',
        promptText: `Simplify the ratio ${A} : ${B}.`,
        say: `Simplify the ratio ${A} to ${B}.`,
        answer: NaN,
        answerValue: ansLabel,
        choices,
        columns: 2,
        explain: `Divide both parts by ${g}: ${A}÷${g} = ${sa} and ${B}÷${g} = ${sb}, so ${A}:${B} = ${sa}:${sb}.`,
      }
    }
    // Fill the equivalent ratio:  a : b  =  (a·k) : ?   (numeric)
    const a = rint(1, 6)
    const b = rint(1, 6)
    const k = rint(2, 5)
    const ans = b * k
    return {
      kind: 'numeric',
      promptText: `${a} : ${b}  =  ${a * k} : ?`,
      say: `${a} to ${b} equals ${a * k} to what?`,
      answer: ans,
      explain: `Each part is multiplied by ${k}: ${a}×${k} = ${a * k}, so ${b}×${k} = ${ans}.`,
    }
  }

  if (d === 2) {
    if (Math.random() < 0.5) {
      // Unit rate (numeric): total over quantity, chosen to divide cleanly.
      const per = rint(2, 9)               // unit rate (whole)
      const qty = rint(3, 8)
      const total = per * qty
      const noun = pickNoun()
      return {
        kind: 'numeric',
        promptText: `${qty} ${noun.plural} cost ${money(total)}. What is the cost of 1 ${noun.singular}?`,
        say: `${qty} ${noun.plural} cost ${total} dollars. What is the cost of one ${noun.singular}?`,
        answer: per,
        suffix: '$',
        explain: `Unit rate = total ÷ quantity = ${total} ÷ ${qty} = ${per}. Each ${noun.singular} costs ${money(per)}.`,
      }
    }
    // Best buy (choice): two packs, pick the cheaper unit price.
    const unitA = rint(2, 6)
    let unitB = rint(2, 6)
    while (unitB === unitA) unitB = rint(2, 6)
    const qA = rint(2, 6), qB = rint(2, 6)
    const totalA = unitA * qA, totalB = unitB * qB
    const cheaper = unitA < unitB ? 'A' : 'B'
    const choices: Choice[] = [
      toChoice('A', `${qA} for ${money(totalA)}`),
      toChoice('B', `${qB} for ${money(totalB)}`),
    ]
    return {
      kind: 'choice',
      promptText: 'Which pack is the better buy (lower price each)?',
      say: `Which is the better buy: ${qA} for ${totalA} dollars, or ${qB} for ${totalB} dollars?`,
      answer: NaN,
      answerValue: cheaper,
      choices,
      columns: 1,
      explain: `Compare unit prices: A is ${money(unitA)} each, B is ${money(unitB)} each. Pack ${cheaper} is cheaper per item.`,
    }
  }

  // d === 3 — solve a proportion for x, or a proportion word problem (numeric).
  if (Math.random() < 0.5) {
    // a/b = x/c  with clean integer x.
    const a = rint(2, 6)
    const b = rint(2, 6)
    const k = rint(2, 5)
    const c = b * k
    const x = a * k
    return {
      kind: 'numeric',
      promptText: `Solve for x:   ${a} / ${b}  =  x / ${c}`,
      say: `Solve the proportion: ${a} over ${b} equals x over ${c}.`,
      answer: x,
      explain: `${c} is ${b} × ${k}, so multiply the top the same way: x = ${a} × ${k} = ${x}.`,
    }
  }
  // Word problem proportion: scale a known rate.
  const ratePer = rint(2, 6)          // items per unit
  const baseUnits = rint(2, 4)
  const base = ratePer * baseUnits    // known: base items in baseUnits
  const k = rint(2, 4)
  const targetUnits = baseUnits * k
  const ans = base * k
  const ctx = pickRateContext()
  return {
    kind: 'numeric',
    promptText: ctx.prompt(base, baseUnits, targetUnits),
    say: ctx.say(base, baseUnits, targetUnits),
    answer: ans,
    explain: `${targetUnits} is ${baseUnits} × ${k}, so the amount scales by ${k} too: ${base} × ${k} = ${ans}.`,
  }
}

// flavour pools
function pickNoun() {
  const nouns = [
    { singular: 'apple', plural: 'apples' },
    { singular: 'notebook', plural: 'notebooks' },
    { singular: 'pen', plural: 'pens' },
    { singular: 'muffin', plural: 'muffins' },
  ]
  return nouns[rint(0, nouns.length - 1)]
}
function pickRateContext() {
  const pool = [
    {
      prompt: (b: number, bu: number, tu: number) =>
        `A printer makes ${b} pages in ${bu} minutes. At the same rate, how many pages in ${tu} minutes?`,
      say: (b: number, bu: number, tu: number) =>
        `A printer makes ${b} pages in ${bu} minutes. At the same rate, how many pages in ${tu} minutes?`,
    },
    {
      prompt: (b: number, bu: number, tu: number) =>
        `A recipe uses ${b} cups of flour for ${bu} loaves. How many cups for ${tu} loaves?`,
      say: (b: number, bu: number, tu: number) =>
        `A recipe uses ${b} cups of flour for ${bu} loaves. How many cups for ${tu} loaves?`,
    },
  ]
  return pool[rint(0, pool.length - 1)]
}

// ── RatioWatch: a narrated worked example (reused for re-teach) ─────────────
export function RatioWatch({
  lines, big, onDone,
}: {
  lines: string[]; big?: string; onDone: () => void
}) {
  const doneRef = useRef(onDone)
  doneRef.current = onDone
  useEffect(() => {
    const cancel = speakSeq(lines, { onDone: () => window.setTimeout(() => doneRef.current(), 1200) })
    return cancel
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, width: '100%' }}>
      {big && (
        <div style={{ fontFamily: 'var(--font-numeric)', fontSize: 30, fontWeight: 700, color: 'var(--ink)', letterSpacing: '0.04em' }}>
          {big}
        </div>
      )}
      <p style={{ margin: 0, maxWidth: 520, textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 15, lineHeight: 1.5, color: 'var(--ink-soft)' }}>
        {lines[lines.length - 1]}
      </p>
    </div>
  )
}

// A one-question check inside the lesson (retry allowed, no penalty).
function RatioAsk({ prompt, say, choices, answerValue, onDone }: {
  prompt: string; say: string; choices: Choice[]; answerValue: string | number; onDone: () => void
}) {
  const [selected, setSelected] = React.useState<string | number | null>(null)
  const [status, setStatus] = React.useState<'idle' | 'correct' | 'wrong'>('idle')
  const spokenRef = useRef(false)
  useEffect(() => { if (!spokenRef.current) { spokenRef.current = true; speak(say) } }, []) // eslint-disable-line
  function pick(v: string | number) {
    if (status === 'correct') return
    setSelected(v)
    if (v === answerValue) { setStatus('correct'); speak('Yes — that’s it.'); window.setTimeout(onDone, 1400) }
    else { setStatus('wrong'); speak('Not quite — take another look.'); window.setTimeout(() => { setSelected(null); setStatus('idle') }, 1200) }
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%' }}>
      <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>{prompt}</p>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <ChoiceGrid band={BAND} choices={choices} selected={selected} status={status} correctValue={answerValue} onPick={pick} columns={choices.length} />
      </div>
    </div>
  )
}

interface Props { band?: AgeBand; childName: string; onLessonComplete: () => void }

export default function RatioProportionTeenLesson({ childName, onLessonComplete }: Props) {
  const steps: LessonStep[] = [
    {
      bubble: 'A ratio compares two amounts. Watch.', mood: 'happy',
      render: (d) => (
        <RatioWatch
          big="6 : 8  =  3 : 4"
          lines={[
            'Six to eight compares six of one thing to eight of another.',
            'Divide both parts by their common factor, two, to get the simplest form: three to four.',
          ]}
          onDone={d}
        />
      ),
    },
    {
      bubble: 'Equivalent ratios scale both parts the same. Watch.', mood: 'happy',
      render: (d) => (
        <RatioWatch
          big="2 : 5  =  6 : 15"
          lines={[
            'Multiply both parts of two to five by three.',
            'Two times three is six, five times three is fifteen — so two to five equals six to fifteen.',
          ]}
          onDone={d}
        />
      ),
    },
    {
      bubble: 'A unit rate is the cost — or amount — for one. Watch.', mood: 'thinking',
      render: (d) => (
        <RatioWatch
          big="$12 ÷ 4 = $3"
          lines={[
            'Four notebooks cost twelve dollars.',
            'Divide twelve by four to get the cost of one: three dollars each. That is the unit rate.',
          ]}
          onDone={d}
        />
      ),
    },
    {
      bubble: 'To solve a proportion, scale by the same factor. Watch.', mood: 'thinking',
      render: (d) => (
        <RatioWatch
          big="3 / 4 = x / 12  →  x = 9"
          lines={[
            'Twelve is four times three, so multiply the top the same way.',
            'Three times three is nine, so x equals nine.',
          ]}
          onDone={d}
        />
      ),
    },
    {
      bubble: 'Your turn.', mood: 'thinking',
      render: (d) => (
        <RatioAsk
          prompt="Which is the simplest form of 4 : 6?"
          say="Which is the simplest form of four to six?"
          choices={[toChoice('2:3'), toChoice('4:6'), toChoice('3:2'), toChoice('1:2')]}
          answerValue="2:3"
          onDone={d}
        />
      ),
    },
  ]
  return (
    <TeenLessonShell
      band={BAND}
      childName={childName}
      chapterTitle="Ratios, Rates & Proportions"
      steps={steps}
      finalSpeech={`Nice work, ${childName}. You can simplify ratios, find unit rates, and solve proportions. Let’s investigate.`}
      onLessonComplete={onLessonComplete}
    />
  )
}
