'use client'
/**
 * ExponentsPolynomialsTeenLesson (15–16, "Field Lab" / Commission) — the
 * worked-example walkthrough for the Exponents & Polynomials commission.
 *
 * EXTENDS multiplication into algebra: the exponent laws (product / quotient /
 * power), the zero & negative-exponent meanings + scientific notation, and then
 * polynomial add/subtract and binomial multiplication (FOIL) shown as an AREA
 * MODEL. Built on TeenLessonShell: a few narrated "watch" steps, then a quick
 * check. Exports the round generator + a Watch helper so the practice chapter
 * and its re-teach reuse them. Mirrors the IntegersTeenLesson pattern, in the
 * 15–16 (dark) Field Lab chrome.
 */
import React, { useEffect, useRef } from 'react'
import { speak, speakSeq } from '@/lib/useMiloSpeaker'
import type { LessonStep } from '@/components/lessons/_kit'
import type { AgeBand, Choice } from '@/components/teen/types'
import TeenLessonShell from '@/components/teen/TeenLessonShell'
import ChoiceGrid from '@/components/teen/ChoiceGrid'
import { pow } from '@/components/lessons/ExponentsRootsTeenLesson'

const BAND: AgeBand = '15-16'

// ── shared helpers (reused by the practice chapter) ────────────────────────
const rint = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))
const shuffle = <T,>(a: T[]): T[] => [...a].sort(() => Math.random() - 0.5)
const sup = (n: number) => pow('', n) // superscript-only string, e.g. "²" via pow('',2)

/** Pretty signed coefficient inside a sum, e.g. " + 5x", " − 3x". */
const term = (coef: number, varStr: string): string => {
  if (coef === 0) return ''
  const sign = coef < 0 ? ' − ' : ' + '
  const mag = Math.abs(coef)
  const c = mag === 1 && varStr ? '' : String(mag)
  return `${sign}${c}${varStr}`
}
/** Build "ax² + bx + c" from coefficients, trimming zero terms (leading sign cleaned). */
function poly(a: number, b: number, c: number): string {
  let s = ''
  if (a !== 0) s += `${a === 1 ? '' : a === -1 ? '−' : a}x${sup(2)}`
  s += term(b, 'x')
  s += term(c, '')
  s = s.replace(/^ \+ /, '').replace(/^ − /, '−')
  return s.trim() || '0'
}

const toChoice = (v: string): Choice => ({ value: v, label: v })

/** A binomial factor "(x + p)" with a real minus for negatives. */
const binom = (p: number) => `(x${p < 0 ? ` − ${Math.abs(p)}` : ` + ${p}`})`

/** Build 4 distinct choices: the answer + up to 3 distinct distractors (in order), shuffled. */
function buildChoices(answer: string, distractors: string[]): Choice[] {
  const seen = new Set<string>([answer])
  const out: string[] = [answer]
  for (const d of distractors) {
    if (out.length >= 4) break
    if (!seen.has(d)) { seen.add(d); out.push(d) }
  }
  return shuffle(out).map(toChoice)
}

export interface Round {
  promptText: string
  say: string
  choices: Choice[]
  answer: string
  explain: string                                  // re-teach line
  /** When present, the practice frame renders an area model (FOIL). */
  area?: { aTerms: [string, string]; bTerms: [string, string]; cells: [string, string, string, string] }
}

// ── L1: exponent laws (positive exponents) ─────────────────────────────────
function makeLawRound(): Round {
  const base = ['x', 'y', 'a', 'n'][rint(0, 3)]
  const kind = rint(0, 2)
  if (kind === 0) {
    // product rule: x^m · x^n = x^(m+n)
    const m = rint(2, 5), n = rint(2, 5)
    const ans = `${base}${sup(m + n)}`
    const distract = [`${base}${sup(m * n)}`, `${base}${sup(Math.abs(m - n) || 1)}`, `${base}${sup(2)}${base}${sup(m + n)}`]
    return {
      promptText: `Simplify  ${base}${sup(m)} · ${base}${sup(n)}`,
      say: `Simplify ${base} to the ${m}, times ${base} to the ${n}.`,
      choices: buildChoices(ans, distract),
      answer: ans,
      explain: `Same base multiplied — ADD the exponents: ${m} + ${n} = ${m + n}, so ${base} to the ${m + n}.`,
    }
  }
  if (kind === 1) {
    // quotient rule: x^m / x^n = x^(m-n)
    let m = rint(4, 8), n = rint(2, m - 1)
    if (n >= m) n = m - 1
    const ans = `${base}${sup(m - n)}`
    const distract = [`${base}${sup(m + n)}`, `${base}${sup(Math.round(m / n))}`, `${base}${sup(m * n)}`]
    return {
      promptText: `Simplify  ${base}${sup(m)} ÷ ${base}${sup(n)}`,
      say: `Simplify ${base} to the ${m}, divided by ${base} to the ${n}.`,
      choices: buildChoices(ans, distract),
      answer: ans,
      explain: `Same base divided — SUBTRACT the exponents: ${m} − ${n} = ${m - n}, so ${base} to the ${m - n}.`,
    }
  }
  // power rule: (x^m)^n = x^(mn)
  const m = rint(2, 4), n = rint(2, 4)
  const ans = `${base}${sup(m * n)}`
  const distract = [`${base}${sup(m + n)}`, `${base}${sup(m)}${base}${sup(n)}`, `${base}${sup(Math.pow(m, n) % 9 + 2)}`]
  return {
    promptText: `Simplify  (${base}${sup(m)})${sup(n)}`,
    say: `Simplify ${base} to the ${m}, all raised to the ${n}.`,
    choices: buildChoices(ans, distract),
    answer: ans,
    explain: `Power of a power — MULTIPLY the exponents: ${m} × ${n} = ${m * n}, so ${base} to the ${m * n}.`,
  }
}

// ── L2: zero / negative exponents + scientific notation ────────────────────
function makeNegSciRound(): Round {
  const kind = rint(0, 2)
  if (kind === 0) {
    // zero exponent
    const base = ['x', 'y', 'a', '7', '12'][rint(0, 4)]
    const ans = '1'
    return {
      promptText: `Evaluate  ${base}${sup(0)}`,
      say: `What is ${base} to the power zero?`,
      choices: shuffle(['1', '0', base, `${base}${sup(1)}`]).map(toChoice),
      answer: ans,
      explain: `Any non-zero base to the power 0 is 1 — the exponents cancel, leaving 1.`,
    }
  }
  if (kind === 1) {
    // negative exponent → reciprocal form
    const base = ['x', 'y', '2', '3'][rint(0, 3)]
    const n = rint(2, 4)
    const ans = `1/${base}${sup(n)}`
    const distract = [`−${base}${sup(n)}`, `${base}${sup(n)}`, `1/${base}${sup(n + 1)}`]
    return {
      promptText: `Rewrite with a positive exponent:  ${base}${sup(-n)}`,
      say: `Rewrite ${base} to the negative ${n} with a positive exponent.`,
      choices: buildChoices(ans, distract),
      answer: ans,
      explain: `A negative exponent means reciprocal: ${base} to the negative ${n} = 1 over ${base} to the ${n}.`,
    }
  }
  // scientific notation of a plain number
  const lead = rint(1, 9)
  const dec = rint(1, 9)
  const zeros = rint(2, 5)
  const plain = `${lead}${dec}${'0'.repeat(zeros - 1)}0`
  const exp = zeros + 1
  const ans = `${lead}.${dec} × 10${sup(exp)}`
  const distract = [
    `${lead}.${dec} × 10${sup(exp - 1)}`,
    `${lead}.${dec} × 10${sup(exp + 1)}`,
    `${lead}${dec} × 10${sup(exp - 1)}`,
  ]
  return {
    promptText: `Write in scientific notation:  ${Number(plain).toLocaleString('en-US')}`,
    say: `Write ${Number(plain).toLocaleString('en-US')} in scientific notation.`,
    choices: buildChoices(ans, distract),
    answer: ans,
    explain: `Move the point to just after the first digit: ${lead}.${dec}. It moved ${exp} places, so × 10 to the ${exp}.`,
  }
}

// ── L3: polynomial add/subtract + binomial multiply (FOIL, area model) ─────
function makePolyRound(): Round {
  const kind = rint(0, 2)
  if (kind === 0) {
    // add two trinomials
    const a1 = rint(1, 4), b1 = rint(-5, 5), c1 = rint(-6, 6)
    const a2 = rint(1, 4), b2 = rint(-5, 5), c2 = rint(-6, 6)
    const ans = poly(a1 + a2, b1 + b2, c1 + c2)
    const distract = [
      poly(a1 + a2, b1 - b2, c1 + c2),
      poly(a1 * a2, b1 + b2, c1 + c2),
      poly(a1 + a2, b1 + b2, c1 - c2),
    ]
    return {
      promptText: `Add:  (${poly(a1, b1, c1)}) + (${poly(a2, b2, c2)})`,
      say: `Add the two polynomials.`,
      choices: buildChoices(ans, distract),
      answer: ans,
      explain: `Combine LIKE terms: x-squared with x-squared, x with x, constants with constants.`,
    }
  }
  if (kind === 1) {
    // subtract two trinomials (distribute the minus)
    const a1 = rint(2, 6), b1 = rint(-4, 6), c1 = rint(-6, 8)
    const a2 = rint(1, 3), b2 = rint(-4, 6), c2 = rint(-6, 8)
    const ans = poly(a1 - a2, b1 - b2, c1 - c2)
    const distract = [
      poly(a1 - a2, b1 + b2, c1 + c2),   // forgot to distribute the minus
      poly(a1 + a2, b1 + b2, c1 + c2),
      poly(a1 - a2, b1 - b2, c1 + c2),
    ]
    return {
      promptText: `Subtract:  (${poly(a1, b1, c1)}) − (${poly(a2, b2, c2)})`,
      say: `Subtract the second polynomial from the first.`,
      choices: buildChoices(ans, distract),
      answer: ans,
      explain: `Distribute the minus to EVERY term in the second bracket, then combine like terms.`,
    }
  }
  // multiply two binomials (x + p)(x + q) — FOIL via area model
  let p = rint(-5, 6), q = rint(-5, 6)
  if (p === 0) p = 2
  if (q === 0) q = 3
  const b = p + q, c = p * q
  const ans = poly(1, b, c)
  const distract = [
    poly(1, p * q, p + q),        // swapped sum/product
    poly(1, b, -c),
    poly(1, p - q, c),
  ]
  return {
    promptText: `Multiply:  ${binom(p)}${binom(q)}`,
    say: `Multiply the two binomials.`,
    choices: buildChoices(ans, distract),
    answer: ans,
    explain: `Area model: x·x = x², the outer + inner give ${b >= 0 ? '+' : ''}${b}x, and the corner is ${c}.`,
    area: {
      aTerms: ['x', p < 0 ? `−${Math.abs(p)}` : `+${p}`],
      bTerms: ['x', q < 0 ? `−${Math.abs(q)}` : `+${q}`],
      // Cell order matches AreaModel's (0,0)(0,1)(1,0)(1,1) sweep:
      // x·x, x·q (top-right), p·x (bottom-left), p·q.
      cells: [`x${sup(2)}`, `${q < 0 ? '−' : ''}${Math.abs(q)}x`, `${p < 0 ? '−' : ''}${Math.abs(p)}x`, `${c < 0 ? '−' : ''}${Math.abs(c)}`],
    },
  }
}

/** Difficulty-aware round generator: L1 exponent laws · L2 zero/neg/sci · L3 polynomials/FOIL. */
export function makeRound(d: 1 | 2 | 3): Round {
  if (d === 1) return makeLawRound()
  if (d === 2) return makeNegSciRound()
  return makePolyRound()
}

// ── AreaModel: the 2×2 box visual for (x+p)(x+q) — grounds FOIL ─────────────
export function AreaModel({ area, small }: { area: NonNullable<Round['area']>; small?: boolean }) {
  const W = small ? 220 : 260
  const cellsAt = [
    { r: 0, c: 0 }, { r: 0, c: 1 }, { r: 1, c: 0 }, { r: 1, c: 1 },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      {/* top labels */}
      <div style={{ display: 'grid', gridTemplateColumns: `36px ${(W - 36) / 2}px ${(W - 36) / 2}px`, width: W }}>
        <div />
        {area.bTerms.map((t, i) => (
          <div key={i} style={{ textAlign: 'center', fontFamily: 'var(--font-numeric)', fontSize: 15, fontWeight: 600, color: 'var(--accent)', paddingBottom: 4 }}>{t}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `36px 1fr 1fr`, width: W, gap: 0 }}>
        {/* row labels + cells, interleaved */}
        {[0, 1].map((r) => (
          <React.Fragment key={r}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-numeric)', fontSize: 15, fontWeight: 600, color: 'var(--accent)' }}>{area.aTerms[r]}</div>
            {[0, 1].map((c) => {
              const idx = cellsAt.findIndex((p) => p.r === r && p.c === c)
              return (
                <div key={c} style={{
                  border: '1px solid var(--outline)',
                  background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
                  height: (W - 36) / 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-numeric)', fontSize: 17, fontWeight: 600, color: 'var(--ink)',
                }}>
                  {area.cells[idx]}
                </div>
              )
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

// ── Watch: a narrated worked example (reused for the re-teach panel) ────────
export function ExponentsPolynomialsWatch({
  lines, area, onDone,
}: {
  lines: string[]; area?: Round['area']; onDone: () => void
}) {
  const doneRef = useRef(onDone)
  doneRef.current = onDone
  useEffect(() => {
    const cancel = speakSeq(lines, { onDone: () => window.setTimeout(() => doneRef.current(), 1200) })
    return cancel
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, width: '100%' }}>
      {area && <AreaModel area={area} />}
      <p style={{ margin: 0, maxWidth: 520, textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 15, lineHeight: 1.5, color: 'var(--ink-soft)' }}>
        {lines[lines.length - 1]}
      </p>
    </div>
  )
}

// ── A one-question check inside the lesson (retry allowed, no penalty) ──────
function ExpAsk({ prompt, say, choices, answer, area, onDone }: {
  prompt: string; say: string; choices: Choice[]; answer: string; area?: Round['area']; onDone: () => void
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
      <p style={{ margin: 0, fontFamily: 'var(--font-numeric)', fontSize: 20, fontWeight: 600, color: 'var(--ink)' }}>{prompt}</p>
      {area && <AreaModel area={area} small />}
      <div style={{ width: '100%', maxWidth: 400 }}>
        <ChoiceGrid band={BAND} choices={choices} selected={selected} status={status} correctValue={answer} onPick={pick} columns={2} />
      </div>
    </div>
  )
}

interface Props { band?: AgeBand; childName: string; onLessonComplete: () => void }

export default function ExponentsPolynomialsTeenLesson({ childName, onLessonComplete }: Props) {
  // Freeze the FOIL example so it doesn't re-randomize on re-render.
  const checkArea: NonNullable<Round['area']> = {
    aTerms: ['x', '+2'],
    bTerms: ['x', '+3'],
    cells: [`x${sup(2)}`, '3x', '2x', '6'],
  }
  const steps: LessonStep[] = [
    {
      bubble: 'Exponents are a shorthand for repeated multiplying. The laws keep it tidy.', mood: 'happy',
      render: (d) => (
        <ExponentsPolynomialsWatch
          lines={[
            `Multiply same-base powers and you ADD the exponents.`,
            `x to the 2, times x to the 3, is x to the 5 — because that is x multiplied five times.`,
          ]}
          onDone={d}
        />
      ),
    },
    {
      bubble: 'Dividing subtracts; a power of a power multiplies.', mood: 'thinking',
      render: (d) => (
        <ExponentsPolynomialsWatch
          lines={[
            `Divide same-base powers and you SUBTRACT: x to the 6 over x to the 2 is x to the 4.`,
            `Raise a power to a power and you MULTIPLY: x squared, cubed, is x to the 6.`,
          ]}
          onDone={d}
        />
      ),
    },
    {
      bubble: 'Zero and negative exponents have meanings too.', mood: 'thinking',
      render: (d) => (
        <ExponentsPolynomialsWatch
          lines={[
            `Any base to the power zero is 1.`,
            `A negative exponent means reciprocal: x to the negative 2 is 1 over x squared.`,
          ]}
          onDone={d}
        />
      ),
    },
    {
      bubble: 'Multiplying two binomials? Build a little area box.', mood: 'happy',
      render: (d) => (
        <ExponentsPolynomialsWatch
          area={checkArea}
          lines={[
            `For x plus 2, times x plus 3, fill each cell of a 2 by 2 box.`,
            `Add the cells: x squared, plus 3x plus 2x, plus 6 — that is x squared plus 5x plus 6.`,
          ]}
          onDone={d}
        />
      ),
    },
    {
      bubble: 'Your turn.', mood: 'thinking',
      render: (d) => (
        <ExpAsk
          prompt={`Simplify  x${sup(3)} · x${sup(4)}`}
          say="Simplify x to the 3, times x to the 4."
          choices={[
            { value: `x${sup(7)}`, label: `x${sup(7)}` },
            { value: `x${sup(12)}`, label: `x${sup(12)}` },
            { value: `x${sup(1)}`, label: `x${sup(1)}` },
            { value: `2x${sup(7)}`, label: `2x${sup(7)}` },
          ]}
          answer={`x${sup(7)}`}
          onDone={d}
        />
      ),
    },
  ]
  return (
    <TeenLessonShell
      band={BAND}
      childName={childName}
      chapterTitle="Exponents & Polynomials"
      steps={steps}
      finalSpeech={`Solid, ${childName}. You can wield the exponent laws and multiply polynomials with an area box. Let’s ship the commission.`}
      onLessonComplete={onLessonComplete}
    />
  )
}
