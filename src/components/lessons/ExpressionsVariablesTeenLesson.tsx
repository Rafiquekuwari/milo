'use client'
/**
 * ExpressionsVariablesTeenLesson (15–16, "Design Studio") — the worked-example
 * walkthrough for the Expressions & Variables commission. Built on
 * TeenLessonShell: a few narrated "watch" steps that build a symbolic expression
 * one move at a time, then a quick check. Exports the round generator +
 * ExprWatch so the practice chapter and its re-teach reuse them. Mirrors
 * IntegersTeenLesson, in 15–16 studio chrome (dark band).
 *
 * Skill ramp (id "expressionsVariables", per docs/curriculum-12-18.md):
 *   L1 — evaluate a one-step expression at a value · match a phrase ↔ expression
 *   L2 — combine like terms · distribute a(b + c)
 *   L3 — multi-term with distribution, negatives, nested grouping
 *
 * Symbolic answers are strings → graded by string equality via ChoiceGrid
 * (never a free-text parser). Numeric answers are stored as numbers.
 */
import React, { useEffect, useRef } from 'react'
import { speak, speakSeq } from '@/lib/useMiloSpeaker'
import type { LessonStep } from '@/components/lessons/_kit'
import type { AgeBand, Choice } from '@/components/teen/types'
import TeenLessonShell from '@/components/teen/TeenLessonShell'
import ChoiceGrid from '@/components/teen/ChoiceGrid'

const BAND: AgeBand = '15-16'

// ── shared helpers (reused by the practice chapter) ────────────────────────
const rint = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))
/** Non-zero pick in [lo, hi]. */
const rnz = (lo: number, hi: number) => { let n = rint(lo, hi); while (n === 0) n = rint(lo, hi); return n }
const shuffle = <T,>(a: T[]): T[] => [...a].sort(() => Math.random() - 0.5)

/** A coefficient term like 3x, x, −x, −4x (coefficient 1/−1 hide the digit). */
function term(coef: number, v = 'x'): string {
  if (coef === 0) return '0'
  if (coef === 1) return v
  if (coef === -1) return `−${v}`
  return coef < 0 ? `−${Math.abs(coef)}${v}` : `${coef}${v}`
}
/** Join a variable term and a constant into "ax + b" / "ax − b" / "ax". */
function linear(coef: number, c: number, v = 'x'): string {
  const t = term(coef, v)
  if (c === 0) return t === '0' ? '0' : t
  if (t === '0') return c < 0 ? `−${Math.abs(c)}` : `${c}`
  return c < 0 ? `${t} − ${Math.abs(c)}` : `${t} + ${c}`
}
/** Signed-number spoken form: "negative four". */
const spoken = (n: number) => (n < 0 ? `negative ${Math.abs(n)}` : `${n}`)

const toChoice = (s: string): Choice => ({ value: s, label: s })

/** Build a 4-option ChoiceGrid from a correct string + plausible wrong strings. */
function choices(answer: string, distractors: string[]): Choice[] {
  const set: string[] = [answer]
  for (const d of distractors) {
    if (set.length >= 4) break
    if (d && d !== answer && !set.includes(d)) set.push(d)
  }
  return shuffle(set).map(toChoice)
}

export interface Round {
  promptText: string
  say: string
  choices: Choice[]
  answer: string | number
  explain: string   // re-teach line
}

/** Difficulty-aware round generator: L1 evaluate/match · L2 like-terms/distribute · L3 multi-term. */
export function makeRound(d: 1 | 2 | 3): Round {
  if (d === 1) {
    if (Math.random() < 0.5) {
      // Evaluate a one-step expression at a value: a·x + b  at  x = v
      const a = rint(2, 5)
      const b = rnz(-6, 8)
      const v = rint(-4, 5)
      const ans = a * v + b
      const wrong1 = a * v - b
      const wrong2 = a + v + b
      const wrong3 = ans + (Math.random() < 0.5 ? a : -a)
      return {
        promptText: `Evaluate ${linear(a, b)} when x = ${v < 0 ? `(${spoken(v).replace('negative ', '−')})` : v}.`,
        say: `Evaluate ${a}x ${b < 0 ? 'minus' : 'plus'} ${Math.abs(b)} when x is ${spoken(v)}.`,
        choices: choices(String(ans), [String(wrong1), String(wrong2), String(wrong3)]),
        answer: String(ans),
        explain: `Substitute x = ${v}: ${a}·(${v}) ${b < 0 ? '−' : '+'} ${Math.abs(b)} = ${a * v} ${b < 0 ? '−' : '+'} ${Math.abs(b)} = ${ans}.`,
      }
    }
    // Match a phrase ↔ expression
    const a = rint(2, 6)
    const b = rint(2, 9)
    const ans = `${a}x + ${b}`
    return {
      promptText: `Which expression means: "${b} more than ${a} times a number"?`,
      say: `Which expression means ${b} more than ${a} times a number?`,
      choices: choices(ans, [`${a}x − ${b}`, `${a + b}x`, `${b}x + ${a}`]),
      answer: ans,
      explain: `"${a} times a number" is ${a}x; "${b} more than" adds ${b}: ${a}x + ${b}.`,
    }
  }

  if (d === 2) {
    if (Math.random() < 0.5) {
      // Combine like terms: a·x + c + b·x + e
      const a = rint(2, 6)
      const b = rint(1, 5)
      const c = rnz(-7, 9)
      const e = rnz(-7, 9)
      const coef = a + b
      const con = c + e
      const ans = linear(coef, con)
      return {
        promptText: `Simplify: ${a}x ${c < 0 ? '−' : '+'} ${Math.abs(c)} + ${b}x ${e < 0 ? '−' : '+'} ${Math.abs(e)}`,
        say: `Combine like terms: ${a}x ${c < 0 ? 'minus' : 'plus'} ${Math.abs(c)} plus ${b}x ${e < 0 ? 'minus' : 'plus'} ${Math.abs(e)}.`,
        choices: choices(ans, [linear(a * b, con), linear(coef, c * e), linear(coef + 1, con)]),
        answer: ans,
        explain: `Add the x-terms: ${a}x + ${b}x = ${coef}x. Add the constants: ${c} + ${e} = ${con}. So ${ans}.`,
      }
    }
    // Distribute a(x + c)
    const a = rint(2, 6)
    const c = rnz(-6, 7)
    const ans = linear(a, a * c)
    return {
      promptText: `Expand: ${a}(x ${c < 0 ? '−' : '+'} ${Math.abs(c)})`,
      say: `Expand ${a} times the quantity x ${c < 0 ? 'minus' : 'plus'} ${Math.abs(c)}.`,
      choices: choices(ans, [linear(a, c), `${a}x ${c < 0 ? '−' : '+'} ${Math.abs(c)}`, linear(a, -a * c)]),
      answer: ans,
      explain: `Multiply ${a} into both terms: ${a}·x = ${a}x and ${a}·(${c}) = ${a * c}. So ${ans}.`,
    }
  }

  // d === 3 — multi-term with distribution, negatives, nested grouping
  if (Math.random() < 0.5) {
    // a(x + p) + b·x + q  → distribute then combine
    const a = rint(2, 5)
    const p = rnz(-5, 6)
    const b = rnz(-5, 6)
    const q = rnz(-7, 8)
    const coef = a + b
    const con = a * p + q
    const ans = linear(coef, con)
    return {
      promptText: `Simplify: ${a}(x ${p < 0 ? '−' : '+'} ${Math.abs(p)}) ${b < 0 ? '−' : '+'} ${Math.abs(b)}x ${q < 0 ? '−' : '+'} ${Math.abs(q)}`,
      say: `Simplify ${a} times x ${p < 0 ? 'minus' : 'plus'} ${Math.abs(p)}, ${b < 0 ? 'minus' : 'plus'} ${Math.abs(b)}x ${q < 0 ? 'minus' : 'plus'} ${Math.abs(q)}.`,
      choices: choices(ans, [linear(coef, a * p - q), linear(a + Math.abs(b), con), linear(coef, p + q)]),
      answer: ans,
      explain: `Distribute: ${a}x ${a * p < 0 ? '−' : '+'} ${Math.abs(a * p)}. Now combine x-terms: ${a}x ${b < 0 ? '−' : '+'} ${Math.abs(b)}x = ${coef}x, and constants ${a * p} + ${q} = ${con}. So ${ans}.`,
    }
  }
  // Nested / distributing a negative: m − a(x + p)
  const m = rnz(-4, 9)
  const a = rint(2, 5)
  const p = rnz(-5, 6)
  const coef = -a
  const con = m - a * p
  const ans = linear(coef, con)
  return {
    promptText: `Simplify: ${m < 0 ? `−${Math.abs(m)}` : m} − ${a}(x ${p < 0 ? '−' : '+'} ${Math.abs(p)})`,
    say: `Simplify ${spoken(m)} minus ${a} times x ${p < 0 ? 'minus' : 'plus'} ${Math.abs(p)}.`,
    choices: choices(ans, [linear(coef, m + a * p), linear(a, con), linear(coef, m - p)]),
    answer: ans,
    explain: `Distribute the −${a}: −${a}x ${(-a * p) < 0 ? '−' : '+'} ${Math.abs(a * p)}... carefully, −${a}·(${p}) = ${-a * p}. Then ${m} + ${-a * p} = ${con}. So ${ans}.`,
  }
}

// ── ExprWatch: a narrated worked example (reused for re-teach) ──────────────
// Shows the expression being transformed step-by-step; the LAST line is the
// printed takeaway. Pure text/CSS (no grid) — expressions are symbolic.
export function ExprWatch({
  lines, display, result, onDone,
}: {
  lines: string[]; display: string; result: string; onDone: () => void
}) {
  const doneRef = useRef(onDone)
  doneRef.current = onDone
  useEffect(() => {
    const cancel = speakSeq(lines, { onDone: () => window.setTimeout(() => doneRef.current(), 1200) })
    return cancel
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%' }}>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        padding: '18px 24px', borderRadius: 14, border: '1px solid var(--outline)',
        background: 'var(--bg-1)', minWidth: 220,
      }}>
        <span style={{ fontFamily: 'var(--font-numeric)', fontSize: 22, fontWeight: 600, color: 'var(--ink-soft)', letterSpacing: '0.02em' }}>
          {display}
        </span>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 18, color: 'var(--ink-muted)' }}>=</span>
        <span style={{ fontFamily: 'var(--font-numeric)', fontSize: 26, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.02em' }}>
          {result}
        </span>
      </div>
      <p style={{ margin: 0, maxWidth: 520, textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 15, lineHeight: 1.5, color: 'var(--ink-soft)' }}>
        {lines[lines.length - 1]}
      </p>
    </div>
  )
}

// A one-question check inside the lesson (retry allowed, no penalty).
function ExprAsk({ prompt, say, choices: opts, answer, onDone }: {
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
        <ChoiceGrid band={BAND} choices={opts} selected={selected} status={status} correctValue={answer} onPick={pick} columns={2} />
      </div>
    </div>
  )
}

interface Props { band?: AgeBand; childName: string; onLessonComplete: () => void }

export default function ExpressionsVariablesTeenLesson({ childName, onLessonComplete }: Props) {
  const steps: LessonStep[] = [
    {
      bubble: 'A variable is a placeholder. Drop in a value and the expression resolves. Watch.', mood: 'happy',
      render: (d) => (
        <ExprWatch
          lines={[
            'Take the expression 2x plus 5.',
            'When x equals 4, substitute: 2 times 4 is 8, plus 5 is 13.',
            'Substitute x = 4: 2(4) + 5 = 13.',
          ]}
          display="2x + 5,  x = 4"
          result="13"
          onDone={d}
        />
      ),
    },
    {
      bubble: 'Like terms share the same variable — you can add their coefficients.', mood: 'happy',
      render: (d) => (
        <ExprWatch
          lines={[
            'Look at 3x plus 4 plus 2x.',
            'The x-terms are like terms: 3x plus 2x is 5x. The 4 stands alone.',
            'Combine like terms: 3x + 2x = 5x, so 5x + 4.',
          ]}
          display="3x + 4 + 2x"
          result="5x + 4"
          onDone={d}
        />
      ),
    },
    {
      bubble: 'Distributing multiplies the outside number into every term inside.', mood: 'thinking',
      render: (d) => (
        <ExprWatch
          lines={[
            'Expand 3 times the quantity x plus 2.',
            'Multiply 3 into both terms: 3 times x is 3x, 3 times 2 is 6.',
            'Distribute: 3(x + 2) = 3x + 6.',
          ]}
          display="3(x + 2)"
          result="3x + 6"
          onDone={d}
        />
      ),
    },
    {
      bubble: 'Your turn.', mood: 'thinking',
      render: (d) => (
        <ExprAsk
          prompt="Simplify: 4x + 1 + 2x"
          say="Simplify: 4x plus 1 plus 2x."
          choices={[toChoice('6x + 1'), toChoice('7x'), toChoice('6x + 3'), toChoice('8x + 1')]}
          answer="6x + 1"
          onDone={d}
        />
      ),
    },
  ]
  return (
    <TeenLessonShell
      band={BAND}
      childName={childName}
      chapterTitle="Expressions & Variables"
      steps={steps}
      finalSpeech={`Good, ${childName}. You can evaluate, combine like terms, and distribute. Let’s put it to work.`}
      onLessonComplete={onLessonComplete}
    />
  )
}
