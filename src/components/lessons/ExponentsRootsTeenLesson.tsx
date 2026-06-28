'use client'
/**
 * ExponentsRootsTeenLesson (12–14, "Field Lab") — the worked-example walkthrough
 * for the Exponents, Square Roots & Scientific Notation investigation. Built on
 * TeenLessonShell: a few narrated "watch" steps, then a quick check. Exports the
 * round generator + PowerWatch (reused by the practice chapter's re-teach).
 * Mirrors the Integers template, in teen chrome.
 *
 * Difficulty ramp (curriculum row "exponentsRoots"):
 *   L1 evaluate powers & perfect-square roots
 *   L2 exponent laws (product/quotient/power), zero exponent, scientific notation
 *   L3 estimate non-perfect roots, rational vs irrational, negative exponent meaning
 */
import React, { useEffect, useRef } from 'react'
import { speak, speakSeq } from '@/lib/useMiloSpeaker'
import type { LessonStep } from '@/components/lessons/_kit'
import type { AgeBand, Choice } from '@/components/teen/types'
import TeenLessonShell from '@/components/teen/TeenLessonShell'
import ChoiceGrid from '@/components/teen/ChoiceGrid'

const BAND: AgeBand = '12-14'

// ── shared helpers ──────────────────────────────────────────────────────────
const rint = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))
const shuffle = <T,>(a: T[]): T[] => [...a].sort(() => Math.random() - 0.5)
const PERFECT = [1, 4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144]
const SUP: Record<string, string> = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' }
/** Pretty power "3^4" as "3⁴". */
export const pow = (base: number | string, exp: number) => `${base}${String(exp).split('').map((c) => SUP[c] ?? c).join('')}`
const toStr = (v: number | string): Choice => ({ value: String(v), label: String(v) })

function mcq(answer: number | string, distractors: (number | string)[]): Choice[] {
  const set = new Set<string>([String(answer)])
  for (const d of distractors) { if (set.size >= 4) break; set.add(String(d)) }
  return shuffle([...set]).map((v) => ({ value: v, label: v }))
}

export type RoundMode = 'numeric' | 'choice'

export interface Round {
  promptText: string
  say: string
  mode: RoundMode
  /** present for numeric rounds */
  answerNum?: number
  suffix?: string
  /** present for choice rounds */
  choices?: Choice[]
  answerStr?: string
  explain: string   // re-teach line(s), joined for the watch panel
  watch: string[]   // narrated re-teach steps
}

// ── Difficulty-aware round generator ────────────────────────────────────────
/** L1 powers & perfect roots · L2 laws/zero-exp/sci-notation · L3 estimate roots, rational?, neg exp. */
export function makeRound(d: 1 | 2 | 3): Round {
  if (d === 1) {
    if (Math.random() < 0.5) {
      // Evaluate a small power (numeric entry).
      const base = rint(2, 9)
      const exp = rint(2, 3)
      const ans = base ** exp
      return {
        promptText: `Evaluate ${pow(base, exp)}.`,
        say: `Evaluate ${base} to the power of ${exp}.`,
        mode: 'numeric',
        answerNum: ans,
        explain: `${pow(base, exp)} means ${Array(exp).fill(base).join(' × ')} = ${ans}.`,
        watch: [`${pow(base, exp)} means multiply ${base} by itself ${exp} times.`, `${Array(exp).fill(base).join(' times ')} equals ${ans}.`],
      }
    }
    // Perfect-square root (numeric entry).
    const root = rint(2, 12)
    const sq = root * root
    return {
      promptText: `What is √${sq}?`,
      say: `What is the square root of ${sq}?`,
      mode: 'numeric',
      answerNum: root,
      explain: `√${sq} asks "what times itself is ${sq}?" — ${root} × ${root} = ${sq}, so √${sq} = ${root}.`,
      watch: [`A square root asks: what number times itself gives ${sq}?`, `${root} times ${root} is ${sq}, so the square root of ${sq} is ${root}.`],
    }
  }

  if (d === 2) {
    const pick = Math.random()
    if (pick < 0.34) {
      // Exponent law: product or quotient (choice — answer in exponent form).
      const base = rint(2, 6)
      if (Math.random() < 0.5) {
        const a = rint(2, 5), b = rint(2, 5)
        const ans = pow(base, a + b)
        return {
          promptText: `Simplify ${pow(base, a)} × ${pow(base, b)}.`,
          say: `Simplify ${base} to the ${a}, times ${base} to the ${b}.`,
          mode: 'choice',
          choices: mcq(ans, [pow(base, a * b), pow(base * base, a + b), pow(base, Math.abs(a - b))]),
          answerStr: ans,
          explain: `Same base, multiplying → ADD the exponents: ${a} + ${b} = ${a + b}, so ${pow(base, a + b)}.`,
          watch: [`When you multiply powers with the same base, you add the exponents.`, `${a} plus ${b} is ${a + b}, so the answer is ${base} to the ${a + b}.`],
        }
      }
      const big = rint(5, 8), small = rint(1, 4)
      const ans = pow(base, big - small)
      return {
        promptText: `Simplify ${pow(base, big)} ÷ ${pow(base, small)}.`,
        say: `Simplify ${base} to the ${big}, divided by ${base} to the ${small}.`,
        mode: 'choice',
        choices: mcq(ans, [pow(base, big * small), pow(base, big + small), pow(base, small - big)]),
        answerStr: ans,
        explain: `Same base, dividing → SUBTRACT the exponents: ${big} − ${small} = ${big - small}, so ${pow(base, big - small)}.`,
        watch: [`When you divide powers with the same base, you subtract the exponents.`, `${big} minus ${small} is ${big - small}, so the answer is ${base} to the ${big - small}.`],
      }
    }
    if (pick < 0.5) {
      // Zero exponent (numeric).
      const base = rint(2, 12)
      return {
        promptText: `What is ${pow(base, 0)}?`,
        say: `What is ${base} to the power of zero?`,
        mode: 'numeric',
        answerNum: 1,
        explain: `Any non-zero number to the power 0 is 1, so ${pow(base, 0)} = 1.`,
        watch: [`Any non-zero number raised to the power zero equals one.`, `So ${base} to the zero is just one.`],
      }
    }
    if (pick < 0.75) {
      // Scientific notation: write a number in sci-notation (choice).
      const coeff = rint(1, 9)
      const exp = rint(3, 6)
      const num = coeff * 10 ** exp
      const ans = `${coeff} × 10${SUP[String(exp)]}`
      return {
        promptText: `Write ${num.toLocaleString('en-US')} in scientific notation.`,
        say: `Write ${num.toLocaleString('en-US')} in scientific notation.`,
        mode: 'choice',
        choices: mcq(ans, [`${coeff} × 10${SUP[String(exp + 1)]}`, `${coeff} × 10${SUP[String(exp - 1)]}`, `${coeff * 10} × 10${SUP[String(exp - 1)]}`]),
        answerStr: ans,
        explain: `Move the decimal so one digit is in front: ${coeff} × 10${SUP[String(exp)]} (the decimal moved ${exp} places).`,
        watch: [`In scientific notation the first part is between one and ten.`, `${num.toLocaleString('en-US')} is ${coeff} times ten to the ${exp}.`],
      }
    }
    // Scientific notation → standard form (numeric).
    const coeff = rint(2, 9)
    const exp = rint(2, 4)
    const num = coeff * 10 ** exp
    return {
      promptText: `Write ${coeff} × 10${SUP[String(exp)]} as a normal number.`,
      say: `Write ${coeff} times ten to the ${exp} as a normal number.`,
      mode: 'numeric',
      answerNum: num,
      explain: `Move the decimal ${exp} places right: ${coeff} × 10${SUP[String(exp)]} = ${num.toLocaleString('en-US')}.`,
      watch: [`Ten to the ${exp} means ${exp} zeros after the one.`, `${coeff} times that is ${num.toLocaleString('en-US')}.`],
    }
  }

  // d === 3
  const pick = Math.random()
  if (pick < 0.34) {
    // Estimate a non-perfect root: which two integers is it between? (choice)
    let n = rint(2, 99)
    while (PERFECT.includes(n)) n = rint(2, 99)
    const lo = Math.floor(Math.sqrt(n))
    const hi = lo + 1
    const ans = `${lo} and ${hi}`
    return {
      promptText: `√${n} is between which two whole numbers?`,
      say: `The square root of ${n} is between which two whole numbers?`,
      mode: 'choice',
      choices: mcq(ans, [`${lo - 1} and ${lo}`, `${hi} and ${hi + 1}`, `${lo} and ${hi + 1}`]),
      answerStr: ans,
      explain: `${lo}² = ${lo * lo} and ${hi}² = ${hi * hi}, and ${n} is between them, so √${n} is between ${lo} and ${hi}.`,
      watch: [`${lo} squared is ${lo * lo} and ${hi} squared is ${hi * hi}.`, `${n} falls between those, so its root is between ${lo} and ${hi}.`],
    }
  }
  if (pick < 0.67) {
    // Rational vs irrational (choice).
    const irrational = Math.random() < 0.5
    let n: number
    if (irrational) { n = rint(2, 50); while (PERFECT.includes(n)) n = rint(2, 50) }
    else { n = PERFECT[rint(1, 8)] }
    const ans = irrational ? 'Irrational' : 'Rational'
    const reason = irrational
      ? `${n} is not a perfect square, so √${n} cannot be written as a fraction — it is irrational.`
      : `${n} = ${Math.round(Math.sqrt(n))}², so √${n} = ${Math.round(Math.sqrt(n))}, a whole number — rational.`
    return {
      promptText: `Is √${n} rational or irrational?`,
      say: `Is the square root of ${n} rational or irrational?`,
      mode: 'choice',
      choices: shuffle([toStr('Rational'), toStr('Irrational')]),
      answerStr: ans,
      explain: reason,
      watch: irrational
        ? [`${n} is not a perfect square.`, `Its root never ends or repeats, so it is irrational.`]
        : [`${n} is a perfect square: ${Math.round(Math.sqrt(n))} times ${Math.round(Math.sqrt(n))}.`, `Its root is a whole number, so it is rational.`],
    }
  }
  // Negative exponent meaning (choice — answer as a fraction string).
  const base = rint(2, 5)
  const exp = rint(1, 3)
  const denom = base ** exp
  const ans = `1/${denom}`
  return {
    promptText: `What is ${pow(base, -exp)}?`,
    say: `What is ${base} to the power of negative ${exp}?`,
    mode: 'choice',
    choices: mcq(ans, [`−${denom}`, `1/${base * exp}`, `${denom}`]),
    answerStr: ans,
    explain: `A negative exponent means reciprocal: ${pow(base, -exp)} = 1 ÷ ${pow(base, exp)} = 1/${denom}.`,
    watch: [`A negative exponent flips the power into a fraction.`, `${base} to the negative ${exp} is one over ${base} to the ${exp}, which is one over ${denom}.`],
  }
}

// ── PowerWatch: a narrated worked example (reused for re-teach) ──────────────
export function PowerWatch({ lines, onDone }: { lines: string[]; onDone: () => void }) {
  const doneRef = useRef(onDone)
  doneRef.current = onDone
  useEffect(() => {
    const cancel = speakSeq(lines, { onDone: () => window.setTimeout(() => doneRef.current(), 1200) })
    return cancel
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: '100%' }}>
      {lines.map((ln, i) => (
        <p key={i} style={{ margin: 0, maxWidth: 520, textAlign: 'center', fontFamily: i === 0 ? 'var(--font-body)' : 'var(--font-numeric)', fontSize: i === 0 ? 16 : 18, fontWeight: i === 0 ? 600 : 700, lineHeight: 1.5, color: i === lines.length - 1 ? 'var(--ink)' : 'var(--ink-soft)' }}>
          {ln}
        </p>
      ))}
    </div>
  )
}

// A one-question check inside the lesson (retry allowed, no penalty).
function PowerAsk({ prompt, say, choices, answer, onDone }: {
  prompt: string; say: string; choices: Choice[]; answer: string; onDone: () => void
}) {
  const [selected, setSelected] = React.useState<string | number | null>(null)
  const [status, setStatus] = React.useState<'idle' | 'correct' | 'wrong'>('idle')
  const spokenRef = useRef(false)
  useEffect(() => { if (!spokenRef.current) { spokenRef.current = true; speak(say) } }, []) // eslint-disable-line
  function pick(v: string | number) {
    if (status === 'correct') return
    setSelected(v)
    if (String(v) === answer) { setStatus('correct'); speak('Yes — that’s it.'); window.setTimeout(onDone, 1400) }
    else { setStatus('wrong'); speak('Not quite — take another look.'); window.setTimeout(() => { setSelected(null); setStatus('idle') }, 1200) }
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%' }}>
      <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>{prompt}</p>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <ChoiceGrid band={BAND} choices={choices} selected={selected} status={status} correctValue={answer} onPick={pick} columns={choices.length} />
      </div>
    </div>
  )
}

interface Props { band?: AgeBand; childName: string; onLessonComplete: () => void }

export default function ExponentsRootsTeenLesson({ childName, onLessonComplete }: Props) {
  const steps: LessonStep[] = [
    {
      bubble: 'A power is repeated multiplication. Watch.', mood: 'happy',
      render: (d) => (
        <PowerWatch
          lines={['2⁴ means multiply 2 by itself four times.', '2 × 2 × 2 × 2 = 16']}
          onDone={d}
        />
      ),
    },
    {
      bubble: 'A square root undoes a square.', mood: 'happy',
      render: (d) => (
        <PowerWatch
          lines={['√49 asks: what number times itself is 49?', '7 × 7 = 49, so √49 = 7']}
          onDone={d}
        />
      ),
    },
    {
      bubble: 'Same base? Add when you multiply.', mood: 'thinking',
      render: (d) => (
        <PowerWatch
          lines={['3² × 3³ keeps the base and adds the exponents.', '2 + 3 = 5, so 3² × 3³ = 3⁵']}
          onDone={d}
        />
      ),
    },
    {
      bubble: 'Big numbers fold into scientific notation.', mood: 'thinking',
      render: (d) => (
        <PowerWatch
          lines={['Move the decimal so one digit sits in front.', '52,000 = 5.2 × 10⁴']}
          onDone={d}
        />
      ),
    },
    {
      bubble: 'Your turn.', mood: 'thinking',
      render: (d) => (
        <PowerAsk
          prompt="Simplify 5² × 5³."
          say="Simplify 5 squared times 5 cubed."
          choices={[toStr('5⁵'), toStr('5⁶'), toStr('25⁵')]}
          answer="5⁵"
          onDone={d}
        />
      ),
    },
  ]
  return (
    <TeenLessonShell
      band={BAND}
      childName={childName}
      chapterTitle="Exponents, Roots & Scientific Notation"
      steps={steps}
      finalSpeech={`Nice work, ${childName}. You can evaluate powers, take roots, and shrink huge numbers with scientific notation. Let’s investigate.`}
      onLessonComplete={onLessonComplete}
    />
  )
}
