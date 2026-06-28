'use client'
/**
 * FactoringPolynomialsTeenLesson (15-16, "Field Lab") — the worked-example
 * walkthrough for the Factoring investigation. Built on TeenLessonShell: a few
 * "watch" steps that narrate a factorisation over an equation panel, then a quick
 * check. Exports the round generator + FactorWatch so the practice chapter and its
 * re-teach reuse them. Mirrors IntegersTeenLesson, in 15-16 chrome.
 *
 * Curriculum ramp (id "factoringPolynomials"):
 *   L1 — factor out the GCF.
 *   L2 — x² + bx + c trinomials & difference of squares.
 *   L3 — ax² + bx + c (a > 1) & the zero-product property.
 * Answers are factored forms (or solution sets), so we use ChoiceGrid (MCQ) — never
 * a free-text symbolic parser.
 */
import React, { useEffect, useMemo, useRef } from 'react'
import { speak, speakSeq } from '@/lib/useMiloSpeaker'
import type { LessonStep } from '@/components/lessons/_kit'
import type { AgeBand, Choice } from '@/components/teen/types'
import TeenLessonShell from '@/components/teen/TeenLessonShell'
import ChoiceGrid from '@/components/teen/ChoiceGrid'

const BAND: AgeBand = '15-16'

// ── shared helpers ─────────────────────────────────────────────────────────
const rint = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))
const shuffle = <T,>(a: T[]): T[] => [...a].sort(() => Math.random() - 0.5)
const toChoice = (s: string): Choice => ({ value: s, label: s })

/** Pretty signed monomial term inside parentheses, e.g. "x + 2", "x − 3". */
const signed = (n: number) => (n < 0 ? `− ${Math.abs(n)}` : `+ ${n}`)
/** "x + a" style binomial (coeff 1 on x). */
const binom = (a: number) => `(x ${signed(a)})`
/** "(kx + a)" style binomial with leading coefficient. */
const binomK = (k: number, a: number) => `(${k}x ${signed(a)})`

function uniqueChoices(answer: string, distractors: string[]): Choice[] {
  const set = new Set<string>([answer])
  for (const d of distractors) { if (set.size >= 4) break; if (d && d !== answer) set.add(d) }
  return shuffle([...set]).map(toChoice)
}

export interface Round {
  promptText: string
  say: string
  choices: Choice[]
  answer: string
  panel: string      // the expression being factored (mono panel above choices)
  explain: string    // re-teach line
}

// ── L1: factor out the GCF (a·x + a·y) → a(x + y) ──────────────────────────
function gcfRound(): Round {
  const g = rint(2, 6)
  const p = rint(2, 6)
  const q = rint(2, 7)
  const expr = `${g * p}x + ${g * q}`
  const answer = `${g}(${p}x + ${q})`
  const distractors = [
    `${g}(${p}x + ${q * 2})`,
    `${g * p}(x + ${q})`,
    `${p}(${g}x + ${g * q})`,
  ]
  return {
    promptText: 'Factor out the greatest common factor.',
    say: `Factor ${g * p} x plus ${g * q}.`,
    panel: expr,
    choices: uniqueChoices(answer, distractors),
    answer,
    explain: `Both ${g * p} and ${g * q} share ${g}. Pull it out: ${answer}.`,
  }
}

// ── L2a: x² + bx + c trinomial → (x+r)(x+s), r+s=b, r·s=c ───────────────────
function trinomRound(): Round {
  const r = rint(1, 6)
  const s = rint(1, 6)
  const b = r + s
  const c = r * s
  const expr = `x² + ${b}x + ${c}`
  const answer = `${binom(r)}${binom(s)}`
  const distractors = [
    `${binom(r + 1)}${binom(s)}`,
    `${binom(-r)}${binom(-s)}`,
    `${binom(b)}${binom(c)}`,
  ]
  return {
    promptText: 'Factor the trinomial.',
    say: `Factor x squared plus ${b} x plus ${c}.`,
    panel: expr,
    choices: uniqueChoices(answer, distractors),
    answer,
    explain: `Find two numbers that multiply to ${c} and add to ${b}: ${r} and ${s}. So ${answer}.`,
  }
}

// ── L2b: difference of squares a² − b² → (a−b)(a+b) ─────────────────────────
function diffSqRound(): Round {
  const n = rint(2, 9)
  const sq = n * n
  const expr = `x² − ${sq}`
  const answer = `(x − ${n})(x + ${n})`
  const distractors = [
    `(x − ${n})(x − ${n})`,
    `(x + ${n})(x + ${n})`,
    `(x − ${sq})(x + 1)`,
  ]
  return {
    promptText: 'Factor the difference of squares.',
    say: `Factor x squared minus ${sq}.`,
    panel: expr,
    choices: uniqueChoices(answer, distractors),
    answer,
    explain: `${sq} is ${n} squared, so x² − ${sq} = ${answer}.`,
  }
}

// ── L3a: ax² + bx + c (a > 1) → (kx + r)(x + s) ────────────────────────────
function leadingRound(): Round {
  const k = rint(2, 3)
  const r = rint(1, 4)
  const s = rint(1, 4)
  // (kx + r)(x + s) = kx² + (ks + r)x + rs
  const a = k
  const b = k * s + r
  const c = r * s
  const expr = `${a}x² + ${b}x + ${c}`
  const answer = `${binomK(k, r)}${binom(s)}`
  const distractors = [
    `${binomK(k, s)}${binom(r)}`,
    `${binomK(k, r + 1)}${binom(s)}`,
    `${binom(r)}${binom(s)}`,
  ]
  return {
    promptText: 'Factor the trinomial.',
    say: `Factor ${a} x squared plus ${b} x plus ${c}.`,
    panel: expr,
    choices: uniqueChoices(answer, distractors),
    answer,
    explain: `Split the ${b}x so the parts multiply to ${a}×${c}=${a * c}: this gives ${answer}.`,
  }
}

// ── L3b: zero-product property — solutions of (x−r)(x−s)=0 ──────────────────
function zeroProductRound(): Round {
  const r = rint(1, 6)
  let s = rint(1, 6)
  let guard = 0
  while (s === r && guard++ < 20) s = rint(1, 6)
  const expr = `(x − ${r})(x − ${s}) = 0`
  const lo = Math.min(r, s)
  const hi = Math.max(r, s)
  const answer = `x = ${lo} or x = ${hi}`
  const distractors = [
    `x = ${-lo} or x = ${-hi}`,
    `x = ${lo} or x = ${-hi}`,
    `x = ${r * s}`,
  ]
  return {
    promptText: 'Use the zero-product property to solve.',
    say: `Solve x minus ${r}, times x minus ${s}, equals zero.`,
    panel: expr,
    choices: uniqueChoices(answer, distractors),
    answer,
    explain: `A product is zero when a factor is zero: x − ${r} = 0 or x − ${s} = 0, so ${answer}.`,
  }
}

/** Difficulty-aware round generator: L1 GCF · L2 trinomial/diff-of-squares · L3 leading-coeff/zero-product. */
export function makeRound(d: 1 | 2 | 3): Round {
  if (d === 1) return gcfRound()
  if (d === 2) return Math.random() < 0.5 ? trinomRound() : diffSqRound()
  return Math.random() < 0.5 ? leadingRound() : zeroProductRound()
}

// ── FactorWatch: a narrated worked example over an equation panel (reused for re-teach) ──
export function FactorWatch({
  lines, panel, onDone,
}: {
  lines: string[]; panel: string; onDone: () => void
}) {
  const doneRef = useRef(onDone)
  doneRef.current = onDone
  useEffect(() => {
    const cancel = speakSeq(lines, { onDone: () => window.setTimeout(() => doneRef.current(), 1200) })
    return cancel
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, width: '100%' }}>
      <div style={{
        fontFamily: 'var(--font-numeric)', fontSize: 24, fontWeight: 600, color: 'var(--accent)',
        background: 'var(--paper)', border: '1px solid var(--outline)', borderRadius: 12,
        padding: '14px 22px', letterSpacing: '0.01em', textAlign: 'center',
      }}>
        {panel}
      </div>
      <p style={{ margin: 0, maxWidth: 520, textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 15, lineHeight: 1.5, color: 'var(--ink-soft)' }}>
        {lines[lines.length - 1]}
      </p>
    </div>
  )
}

// A one-question check inside the lesson (retry allowed, no penalty).
function FactorAsk({ prompt, say, panel, choices, answer, onDone }: {
  prompt: string; say: string; panel: string; choices: Choice[]; answer: string; onDone: () => void
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
      <div style={{
        fontFamily: 'var(--font-numeric)', fontSize: 22, fontWeight: 600, color: 'var(--accent)',
        background: 'var(--paper)', border: '1px solid var(--outline)', borderRadius: 12, padding: '10px 18px',
      }}>
        {panel}
      </div>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <ChoiceGrid band={BAND} choices={choices} selected={selected} status={status} correctValue={answer} onPick={pick} columns={2} />
      </div>
    </div>
  )
}

interface Props { band?: AgeBand; childName: string; onLessonComplete: () => void }

export default function FactoringPolynomialsTeenLesson({ childName, onLessonComplete }: Props) {
  // Memoize so the final "your turn" choices are shuffled once (a fresh shuffle on
  // every re-render would reorder the options mid-question).
  const steps: LessonStep[] = useMemo(() => [
    {
      bubble: 'Factoring is un-multiplying. Start with what they share.', mood: 'happy',
      render: (d) => (
        <FactorWatch
          panel="6x + 9"
          lines={[
            'Both terms share a common factor.',
            'Six and nine are both divisible by three. Pull the three out: three times, x plus three.',
          ]}
          onDone={d}
        />
      ),
    },
    {
      bubble: 'For x² + bx + c, find two numbers.', mood: 'happy',
      render: (d) => (
        <FactorWatch
          panel="x² + 5x + 6"
          lines={[
            'We need two numbers that multiply to six and add to five.',
            'Two and three work. So it factors as x plus two, times x plus three.',
          ]}
          onDone={d}
        />
      ),
    },
    {
      bubble: 'A difference of squares splits two ways.', mood: 'thinking',
      render: (d) => (
        <FactorWatch
          panel="x² − 16"
          lines={[
            'Sixteen is four squared, and there is no middle term.',
            'So x squared minus sixteen is x minus four, times x plus four.',
          ]}
          onDone={d}
        />
      ),
    },
    {
      bubble: 'Once factored, set each piece to zero.', mood: 'thinking',
      render: (d) => (
        <FactorWatch
          panel="(x − 2)(x + 5) = 0"
          lines={[
            'A product equals zero only when one of the factors is zero.',
            'So x equals two, or x equals negative five — those are the solutions.',
          ]}
          onDone={d}
        />
      ),
    },
    {
      bubble: 'Your turn.', mood: 'thinking',
      render: (d) => (
        <FactorAsk
          prompt="Factor this trinomial."
          say="Factor x squared plus 7 x plus 12."
          panel="x² + 7x + 12"
          choices={shuffle([
            toChoice('(x + 3)(x + 4)'),
            toChoice('(x + 2)(x + 6)'),
            toChoice('(x + 1)(x + 12)'),
            toChoice('(x − 3)(x − 4)'),
          ])}
          answer="(x + 3)(x + 4)"
          onDone={d}
        />
      ),
    },
  ], [])
  return (
    <TeenLessonShell
      band={BAND}
      childName={childName}
      chapterTitle="Factoring Polynomials"
      steps={steps}
      finalSpeech={`Nice work, ${childName}. You can pull out a common factor, factor a trinomial, spot a difference of squares, and solve with the zero-product rule. Let’s investigate.`}
      onLessonComplete={onLessonComplete}
    />
  )
}
