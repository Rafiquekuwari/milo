'use client'
/**
 * RationalOpsTeenLesson (12–14, "Field Lab") — worked-example walkthrough for
 * "Fraction & Decimal Operations" (id: rationalOps). Mirrors IntegersTeenLesson:
 * a few narrated "watch" steps over a fraction strip + one quick check, then the
 * practice chapter reuses makeRound / FractionWatch / type Round.
 *
 * Difficulty ramp (curriculum-12-18, row 3):
 *   L1 — add/subtract UNLIKE denominators (review): a/b ± c/d
 *   L2 — MULTIPLY fractions (and pick the equivalent simplified form, MCQ)
 *   L3 — DIVIDE fractions (invert & multiply) + a short multi-step chain
 *
 * Answer surfaces: FractionEntry (equivalence-aware, so any equal form is
 * accepted) for compute rounds; ChoiceGrid for "which is the same value" picks.
 */
import React, { useEffect, useRef } from 'react'
import { speak, speakSeq } from '@/lib/useMiloSpeaker'
import type { LessonStep } from '@/components/lessons/_kit'
import type { AgeBand, Choice } from '@/components/teen/types'
import TeenLessonShell from '@/components/teen/TeenLessonShell'
import ChoiceGrid from '@/components/teen/ChoiceGrid'
import FractionEntry, { fractionsEqual, type FractionValue } from '@/components/teen/FractionEntry'

const BAND: AgeBand = '12-14'

// ── shared helpers (reused by the practice chapter) ────────────────────────
const rint = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))
const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b))
const shuffle = <T,>(a: T[]): T[] => [...a].sort(() => Math.random() - 0.5)

/** Reduce a fraction to lowest terms, sign on the numerator. */
function reduce(n: number, d: number): { n: number; d: number } {
  if (d < 0) { n = -n; d = -d }
  const g = gcd(n, d) || 1
  return { n: n / g, d: d / g }
}

/** Pretty fraction for prompts (mono is applied by the bubble/kit). */
export function fmtFrac(n: number, d: number): string {
  const r = reduce(n, d)
  return `${r.n}/${r.d}`
}
/** Spoken fraction: "three quarters" is overkill — say the digits plainly. */
function spokenFrac(n: number, d: number): string {
  const r = reduce(n, d)
  return `${r.n} over ${r.d}`
}

const toFV = (n: number, d: number): FractionValue => {
  const r = reduce(n, d)
  return { num: r.n, den: r.d }
}
const fvChoice = (n: number, d: number): Choice => {
  const r = reduce(n, d)
  return { value: `${r.n}/${r.d}`, label: `${r.n}/${r.d}` }
}

export interface Round {
  /** 'entry' → FractionEntry compute; 'mcq' → ChoiceGrid equivalent-form pick. */
  kind: 'entry' | 'mcq'
  promptText: string
  say: string
  answer: FractionValue          // the canonical (reduced) answer
  answerLabel: string            // "a/b" for spoken feedback + re-teach
  choices?: Choice[]             // mcq only — value/label are the "n/d" string
  explain: string[]              // narrated re-teach lines
}

/** Compare an MCQ choice value ("n/d") against the answer fraction. */
export function choiceMatchesFraction(choiceValue: string | number, answer: FractionValue): boolean {
  const s = String(choiceValue)
  const m = s.match(/^(-?\d+)\/(-?\d+)$/)
  if (!m) return false
  return fractionsEqual({ num: Number(m[1]), den: Number(m[2]) }, answer)
}

// ── Round generator ─────────────────────────────────────────────────────────
/** L1 add/sub unlike denominators · L2 multiply (+ equivalent-form MCQ) · L3 divide / multi-step. */
export function makeRound(d: 1 | 2 | 3): Round {
  if (d === 1) {
    // a/b ± c/d, unlike small denominators. Common denominator = b·d.
    const denPool = [2, 3, 4, 5, 6]
    let b = denPool[rint(0, denPool.length - 1)]
    let d2 = denPool[rint(0, denPool.length - 1)]
    while (d2 === b) d2 = denPool[rint(0, denPool.length - 1)]
    let a = rint(1, b - 1)
    let c = rint(1, d2 - 1)
    const plus = Math.random() < 0.5
    // On subtraction, keep the result strictly positive (negatives are out of scope
    // at this tier, and a − b = 0 is a degenerate question): order the operands so
    // a/b > c/d2, and if they're equal bump the larger fraction's numerator up
    // (it stays a proper fraction since a < b, so a+1 ≤ b−1+1 = b).
    if (!plus) {
      if (a * d2 < c * b) { [a, b, c, d2] = [c, d2, a, b] }
      if (a * d2 === c * b) a = a + 1
    }
    const num = plus ? a * d2 + c * b : a * d2 - c * b
    const den = b * d2
    const ans = reduce(num, den)
    const sign = plus ? '+' : '−'
    return {
      kind: 'entry',
      promptText: `${a}/${b} ${sign} ${c}/${d2} = ?`,
      say: `${spokenFrac(a, b)} ${plus ? 'plus' : 'minus'} ${spokenFrac(c, d2)}. Any equal form is fine.`,
      answer: { num: ans.n, den: ans.d },
      answerLabel: `${ans.n}/${ans.d}`,
      explain: [
        `Make the denominators match: a common one is ${den}.`,
        `${a}/${b} becomes ${a * d2}/${den} and ${c}/${d2} becomes ${c * b}/${den}.`,
        `${plus ? 'Add' : 'Subtract'} the numerators: ${ans.n}/${ans.d}.`,
      ],
    }
  }

  if (d === 2) {
    // Multiply two fractions. Half the time, ask for the equivalent simplified form (MCQ).
    const b = rint(2, 6)
    const d2 = rint(2, 6)
    const a = rint(1, b - 1)
    const c = rint(1, d2 - 1)
    const rawN = a * c
    const rawD = b * d2
    const ans = reduce(rawN, rawD)

    if (Math.random() < 0.5) {
      // MCQ: which is the same value as the (already-multiplied) product?
      const correct = fvChoice(ans.n, ans.d)
      // pedagogical distractors: forgot to reduce, added instead of multiplied, flipped one.
      const distractors = [
        fvChoice(a + c, b + d2),    // added num & den instead of multiplying (classic error)
        fvChoice(a * d2, b * c),    // multiplied across the wrong way (cross)
        fvChoice(a * c + 1, rawD),  // off-by-one on the product numerator
      ]
      const seen = new Set<string>([String(correct.value)])
      const pool: Choice[] = [correct]
      for (const dis of distractors) {
        if (pool.length >= 4) break
        if (!seen.has(String(dis.value))) { seen.add(String(dis.value)); pool.push(dis) }
      }
      let guard = 0
      while (pool.length < 3 && guard++ < 30) {
        const alt = fvChoice(ans.n + rint(1, 2), ans.d + rint(0, 2) || 1)
        if (!seen.has(String(alt.value))) { seen.add(String(alt.value)); pool.push(alt) }
      }
      return {
        kind: 'mcq',
        promptText: `${a}/${b} × ${c}/${d2} — which is the same value?`,
        say: `${spokenFrac(a, b)} times ${spokenFrac(c, d2)}. Which option is the same value?`,
        answer: { num: ans.n, den: ans.d },
        answerLabel: `${ans.n}/${ans.d}`,
        choices: shuffle(pool),
        explain: [
          `To multiply, go straight across: top times top, bottom times bottom.`,
          `${a} times ${c} is ${rawN}, and ${b} times ${d2} is ${rawD}.`,
          `${rawN}/${rawD} reduces to ${ans.n}/${ans.d}.`,
        ],
      }
    }

    return {
      kind: 'entry',
      promptText: `${a}/${b} × ${c}/${d2} = ?`,
      say: `${spokenFrac(a, b)} times ${spokenFrac(c, d2)}. Any equal form is fine.`,
      answer: { num: ans.n, den: ans.d },
      answerLabel: `${ans.n}/${ans.d}`,
      explain: [
        `Multiply straight across — top times top, bottom times bottom.`,
        `${a} times ${c} is ${rawN}, ${b} times ${d2} is ${rawD}.`,
        `That reduces to ${ans.n}/${ans.d}.`,
      ],
    }
  }

  // d === 3 — divide (invert & multiply) OR a two-step chain.
  if (Math.random() < 0.5) {
    const b = rint(2, 6)
    const d2 = rint(2, 6)
    const a = rint(1, b - 1)
    const c = rint(1, d2 - 1)
    // (a/b) ÷ (c/d2) = (a/b) × (d2/c)
    const rawN = a * d2
    const rawD = b * c
    const ans = reduce(rawN, rawD)
    return {
      kind: 'entry',
      promptText: `${a}/${b} ÷ ${c}/${d2} = ?`,
      say: `${spokenFrac(a, b)} divided by ${spokenFrac(c, d2)}. Any equal form is fine.`,
      answer: { num: ans.n, den: ans.d },
      answerLabel: `${ans.n}/${ans.d}`,
      explain: [
        `Dividing by a fraction means multiplying by its flip.`,
        `Flip ${c}/${d2} to ${d2}/${c}, then multiply: ${a}/${b} times ${d2}/${c}.`,
        `That gives ${rawN}/${rawD}, which reduces to ${ans.n}/${ans.d}.`,
      ],
    }
  }

  // two-step: (a/b + c/d) × e/f  with small numbers
  const b = rint(2, 4)
  let d2 = rint(2, 4)
  while (d2 === b) d2 = rint(2, 4)
  const a = rint(1, b - 1)
  const c = rint(1, d2 - 1)
  const sumN = a * d2 + c * b
  const sumD = b * d2
  const e = 1
  const f = rint(2, 4)
  const rawN = sumN * e
  const rawD = sumD * f
  const ans = reduce(rawN, rawD)
  return {
    kind: 'entry',
    promptText: `(${a}/${b} + ${c}/${d2}) × ${e}/${f} = ?`,
    say: `Open brackets first. ${spokenFrac(a, b)} plus ${spokenFrac(c, d2)}, then times ${spokenFrac(e, f)}.`,
    answer: { num: ans.n, den: ans.d },
    answerLabel: `${ans.n}/${ans.d}`,
    explain: [
      `Brackets first: ${a}/${b} + ${c}/${d2} is ${reduce(sumN, sumD).n}/${reduce(sumN, sumD).d}.`,
      `Then multiply by ${e}/${f}, straight across.`,
      `That works out to ${ans.n}/${ans.d}.`,
    ],
  }
}

// ── FractionWatch: a narrated worked example (reused for re-teach) ────────────
export function FractionWatch({
  lines, title, onDone,
}: {
  lines: string[]; title?: string; onDone: () => void
}) {
  const doneRef = useRef(onDone)
  doneRef.current = onDone
  useEffect(() => {
    const cancel = speakSeq(lines, { onDone: () => window.setTimeout(() => doneRef.current(), 1200) })
    return cancel
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: '100%' }}>
      {title && (
        <p style={{ margin: 0, fontFamily: 'var(--font-numeric)', fontSize: 24, fontWeight: 700, color: 'var(--ink)' }}>
          {title}
        </p>
      )}
      <ol style={{ margin: 0, paddingLeft: 22, maxWidth: 520, width: '100%' }}>
        {lines.map((l, i) => (
          <li key={i} style={{ fontFamily: 'var(--font-body)', fontSize: 15, lineHeight: 1.6, color: i === lines.length - 1 ? 'var(--ink)' : 'var(--ink-soft)', fontWeight: i === lines.length - 1 ? 600 : 400 }}>
            {l}
          </li>
        ))}
      </ol>
    </div>
  )
}

// ── A one-question check inside the lesson (retry allowed, no penalty) ────────
function FractionAsk({ prompt, say, answer, answerLabel, onDone }: {
  prompt: string; say: string; answer: FractionValue; answerLabel: string; onDone: () => void
}) {
  const [status, setStatus] = React.useState<'idle' | 'correct' | 'wrong'>('idle')
  const spokenRef = useRef(false)
  useEffect(() => { if (!spokenRef.current) { spokenRef.current = true; speak(say) } }, []) // eslint-disable-line
  function submit(v: FractionValue) {
    if (status === 'correct') return
    if (fractionsEqual(v, answer)) {
      setStatus('correct'); speak('Yes — that’s it.'); window.setTimeout(onDone, 1400)
    } else {
      setStatus('wrong'); speak(`Not quite. Any form equal to ${answerLabel} works.`)
      window.setTimeout(() => setStatus('idle'), 1400)
    }
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%' }}>
      <p style={{ margin: 0, fontFamily: 'var(--font-numeric)', fontSize: 20, fontWeight: 600, color: 'var(--ink)' }}>{prompt}</p>
      <FractionEntry band={BAND} onSubmit={submit} status={status} />
    </div>
  )
}

interface Props { band?: AgeBand; childName: string; onLessonComplete: () => void }

export default function RationalOpsTeenLesson({ childName, onLessonComplete }: Props) {
  const steps: LessonStep[] = [
    {
      bubble: 'To add fractions, the pieces must be the same size. Watch.', mood: 'happy',
      render: (done) => (
        <FractionWatch
          title="1/2 + 1/3"
          lines={[
            'Halves and thirds are different-sized pieces, so first make a common denominator: sixths.',
            'One half is three sixths; one third is two sixths.',
            'Now add the numerators: 3/6 + 2/6 = 5/6.',
          ]}
          onDone={done}
        />
      ),
    },
    {
      bubble: 'Multiplying is simpler — straight across. Watch.', mood: 'happy',
      render: (done) => (
        <FractionWatch
          title="2/3 × 3/4"
          lines={[
            'No common denominator needed — multiply top times top and bottom times bottom.',
            '2 times 3 is 6, and 3 times 4 is 12, so we get 6/12.',
            'Reduce: 6/12 is the same value as 1/2.',
          ]}
          onDone={done}
        />
      ),
    },
    {
      bubble: 'Dividing? Flip the second one, then multiply. Watch.', mood: 'thinking',
      render: (done) => (
        <FractionWatch
          title="1/2 ÷ 3/4"
          lines={[
            'Dividing by a fraction is the same as multiplying by its reciprocal — its flip.',
            'Flip 3/4 to 4/3, then multiply: 1/2 × 4/3.',
            'Straight across gives 4/6, which reduces to 2/3.',
          ]}
          onDone={done}
        />
      ),
    },
    {
      bubble: 'Your turn — any equal form is fine.', mood: 'thinking',
      render: (done) => (
        <FractionAsk
          prompt="1/4 + 1/2 = ?"
          say="One quarter plus one half. Type any form that equals it."
          answer={{ num: 3, den: 4 }}
          answerLabel="3/4"
          onDone={done}
        />
      ),
    },
  ]
  return (
    <TeenLessonShell
      band={BAND}
      childName={childName}
      chapterTitle="Fraction & Decimal Operations"
      steps={steps}
      finalSpeech={`Nice work, ${childName}. Add, multiply, and divide fractions — and any equal form counts. Let’s run the recipes.`}
      onLessonComplete={onLessonComplete}
    />
  )
}
