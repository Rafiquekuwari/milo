'use client'
/**
 * RadicalsPythagoreanTeenLesson (15–16, "Field Lab") — the worked-example
 * walkthrough for the Radicals & the Pythagorean Theorem commission. Built on
 * TeenLessonShell: a few narrated "watch" steps, then a quick check. Exports the
 * round generator + RadicalWatch so the practice chapter and its re-teach reuse
 * them. Mirrors IntegersTeenLesson, in the 15-16 (dark) band.
 *
 * Answer policy (math-without-fear): clean decimals → NumericEntry (tolerance);
 * irrational / radical-form answers → ChoiceGrid (MCQ). Never free-text symbolic.
 */
import React, { useEffect, useRef } from 'react'
import { speak, speakSeq } from '@/lib/useMiloSpeaker'
import type { LessonStep } from '@/components/lessons/_kit'
import type { AgeBand, Choice } from '@/components/teen/types'
import TeenLessonShell from '@/components/teen/TeenLessonShell'
import ChoiceGrid from '@/components/teen/ChoiceGrid'
import { numericEqual } from '@/components/teen/NumericEntry'

const BAND: AgeBand = '15-16'

// ── shared helpers (reused by the practice chapter) ────────────────────────
const rint = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))
const shuffle = <T,>(a: T[]): T[] => [...a].sort(() => Math.random() - 0.5)
const RAD = '√'

const PERFECT_ROOTS: Array<[number, number]> = [
  [4, 2], [9, 3], [16, 4], [25, 5], [36, 6], [49, 7], [64, 8], [81, 9], [100, 10],
  [121, 11], [144, 12], [169, 13], [196, 14], [225, 15],
]

/** Largest square factor of n (for simplifying √n). */
function simplifyRadical(n: number): { coeff: number; rad: number } {
  let coeff = 1
  let rad = n
  for (let k = 12; k >= 2; k--) {
    const sq = k * k
    if (rad % sq === 0) { coeff *= k; rad = rad / sq }
  }
  return { coeff, rad }
}

/** Pretty radical string, e.g. "2√3", "√5", "6". */
function radStr(coeff: number, rad: number): string {
  if (rad === 1) return String(coeff)
  if (coeff === 1) return `${RAD}${rad}`
  return `${coeff}${RAD}${rad}`
}

const toLabel = (s: string): Choice => ({ value: s, label: s })

function choicesFrom(answer: string, distractors: string[]): Choice[] {
  const set = new Set<string>([answer])
  for (const d of distractors) { if (set.size >= 4) break; if (d && d !== answer) set.add(d) }
  return shuffle([...set]).map(toLabel)
}

// Known Pythagorean triples → integer hypotenuse practice (clean decimals path).
const TRIPLES: Array<[number, number, number]> = [
  [3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17], [9, 12, 15], [7, 24, 25], [20, 21, 29], [9, 40, 41],
]

export interface Round {
  kind: 'choice' | 'numeric'
  promptText: string
  say: string
  /** ChoiceGrid options (kind 'choice'). */
  choices?: Choice[]
  /** The graded answer — a radical-form string (choice) or a number (numeric). */
  answer: string | number
  /** Spoken/written form of the answer for the wrong-reveal. */
  answerSpoken: string
  /** NumericEntry tolerance (kind 'numeric'). */
  tol?: number
  /** Optional unit suffix for NumericEntry. */
  suffix?: string
  explain: string   // re-teach line
}

/** True if `picked` matches the round's answer (handles numeric tolerance). */
export function isCorrect(round: Round, picked: string | number): boolean {
  if (round.kind === 'numeric') {
    return numericEqual(Number(picked), Number(round.answer), round.tol ?? 0.05)
  }
  return picked === round.answer
}

/** Difficulty-aware round generator. L1 perfect roots & estimate · L2 simplify/combine radicals · L3 Pythagoras + grid distance. */
export function makeRound(d: 1 | 2 | 3): Round {
  if (d === 1) {
    if (Math.random() < 0.5) {
      // exact perfect-square root → ChoiceGrid
      const [n, r] = PERFECT_ROOTS[rint(0, PERFECT_ROOTS.length - 1)]
      const ans = String(r)
      return {
        kind: 'choice',
        promptText: `What is ${RAD}${n}?`,
        say: `What is the square root of ${n}?`,
        choices: choicesFrom(ans, [String(r + 1), String(r - 1), String(r + 2)]),
        answer: ans,
        answerSpoken: ans,
        explain: `${r} × ${r} = ${n}, so ${RAD}${n} = ${r}.`,
      }
    }
    // estimate a non-perfect root between two integers → ChoiceGrid (interval)
    const lo = rint(2, 11)
    const hi = lo + 1
    const n = rint(lo * lo + 1, hi * hi - 1)
    const ans = `${lo} and ${hi}`
    return {
      kind: 'choice',
      promptText: `${RAD}${n} is between which two whole numbers?`,
      say: `The square root of ${n} is between which two whole numbers?`,
      choices: choicesFrom(ans, [`${lo - 1} and ${lo}`, `${hi} and ${hi + 1}`, `${lo} and ${hi + 1}`]),
      answer: ans,
      answerSpoken: `${lo} and ${hi}`,
      explain: `${lo}² = ${lo * lo} and ${hi}² = ${hi * hi}, and ${n} sits between them, so ${RAD}${n} is between ${lo} and ${hi}.`,
    }
  }

  if (d === 2) {
    const mode = Math.random()
    if (mode < 0.5) {
      // simplify a radical → ChoiceGrid (radical form)
      const candidates = [8, 12, 18, 20, 24, 27, 32, 45, 48, 50, 72, 75, 98]
      const n = candidates[rint(0, candidates.length - 1)]
      const { coeff, rad } = simplifyRadical(n)
      const ans = radStr(coeff, rad)
      return {
        kind: 'choice',
        promptText: `Simplify ${RAD}${n}`,
        say: `Simplify the square root of ${n}.`,
        choices: choicesFrom(ans, [`${RAD}${n}`, radStr(coeff + 1, rad), radStr(coeff, rad * 2)]),
        answer: ans,
        answerSpoken: ans,
        explain: `${n} = ${coeff * coeff} × ${rad}, and ${RAD}${coeff * coeff} = ${coeff}, so ${RAD}${n} = ${ans}.`,
      }
    }
    // add/subtract LIKE radicals → ChoiceGrid (radical form)
    const rad = [2, 3, 5, 6, 7][rint(0, 4)]
    const p = rint(2, 5)
    const q = rint(1, 4)
    const sum = p + q
    const ans = radStr(sum, rad)
    return {
      kind: 'choice',
      promptText: `${p}${RAD}${rad} + ${q}${RAD}${rad} = ?`,
      say: `What is ${p} root ${rad} plus ${q} root ${rad}?`,
      // distractors: multiplied-instead-of-added (skip if it collides with the sum),
      // added-the-radicands-too, and a wrong radicand. Each keeps a different shape
      // (coefficient vs radicand) so they never collide with the answer or each other.
      choices: choicesFrom(ans, [
        p * q !== sum ? radStr(p * q, rad) : radStr(sum + 2, rad),
        radStr(sum, rad * 2),
        radStr(sum, rad + 1),
      ]),
      answer: ans,
      answerSpoken: `${sum} root ${rad}`,
      explain: `${p}${RAD}${rad} and ${q}${RAD}${rad} are like radicals, so add the numbers in front: ${p} + ${q} = ${sum}, giving ${ans}.`,
    }
  }

  // d === 3 — Pythagoras for a missing side + grid distance (clean integers → NumericEntry)
  if (Math.random() < 0.5) {
    // missing hypotenuse from a triple
    const [a, b, c] = TRIPLES[rint(0, TRIPLES.length - 1)]
    return {
      kind: 'numeric',
      promptText: `A right triangle has legs ${a} and ${b}. How long is the hypotenuse?`,
      say: `A right triangle has legs ${a} and ${b}. How long is the hypotenuse?`,
      answer: c,
      answerSpoken: String(c),
      tol: 0.05,
      explain: `c² = ${a}² + ${b}² = ${a * a} + ${b * b} = ${c * c}, so c = ${RAD}${c * c} = ${c}.`,
    }
  }
  // missing leg from a triple, OR grid distance between two lattice points
  if (Math.random() < 0.5) {
    const [a, b, c] = TRIPLES[rint(0, TRIPLES.length - 1)]
    // give hypotenuse c and one leg b, find the other leg a
    return {
      kind: 'numeric',
      promptText: `A right triangle has hypotenuse ${c} and one leg ${b}. How long is the other leg?`,
      say: `A right triangle has hypotenuse ${c} and one leg ${b}. How long is the other leg?`,
      answer: a,
      answerSpoken: String(a),
      tol: 0.05,
      explain: `a² = c² − b² = ${c}² − ${b}² = ${c * c} − ${b * b} = ${a * a}, so a = ${RAD}${a * a} = ${a}.`,
    }
  }
  // grid distance between two points that forms a triple
  const [dx, dy, dist] = TRIPLES[rint(0, TRIPLES.length - 1)]
  const x1 = rint(-4, 1)
  const y1 = rint(-4, 1)
  const x2 = x1 + dx
  const y2 = y1 + dy
  return {
    kind: 'numeric',
    promptText: `On the grid, how far is (${x1}, ${y1}) from (${x2}, ${y2})?`,
    say: `On the grid, what is the distance from the point ${x1}, ${y1} to the point ${x2}, ${y2}?`,
    answer: dist,
    answerSpoken: String(dist),
    tol: 0.05,
    explain: `The horizontal gap is ${dx} and the vertical gap is ${dy}. Distance = ${RAD}(${dx}² + ${dy}²) = ${RAD}${dx * dx + dy * dy} = ${dist}.`,
  }
}

// ── RadicalWatch: a narrated worked example (reused for re-teach) ────────────
export function RadicalWatch({
  lines, onDone, visual,
}: {
  lines: string[]; onDone: () => void; visual?: React.ReactNode
}) {
  const doneRef = useRef(onDone)
  doneRef.current = onDone
  useEffect(() => {
    const cancel = speakSeq(lines, { onDone: () => window.setTimeout(() => doneRef.current(), 1200) })
    return cancel
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, width: '100%' }}>
      {visual}
      <p style={{ margin: 0, maxWidth: 520, textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 15, lineHeight: 1.5, color: 'var(--ink-soft)' }}>
        {lines[lines.length - 1]}
      </p>
    </div>
  )
}

/** A compact mono "math card" for a worked line (no figure needed). */
function MathCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: 'var(--font-numeric)', fontSize: 24, fontWeight: 600, color: 'var(--accent)',
      letterSpacing: '0.01em', padding: '14px 20px', background: 'var(--bg-1)',
      border: '1px solid var(--outline)', borderRadius: 12, textAlign: 'center',
    }}>
      {children}
    </div>
  )
}

// A one-question check inside the lesson (retry allowed, no penalty).
function RadicalAsk({ prompt, say, choices, answer, onDone }: {
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
        <ChoiceGrid band={BAND} choices={choices} selected={selected} status={status} correctValue={answer} onPick={pick} columns={2} />
      </div>
    </div>
  )
}

interface Props { band?: AgeBand; childName: string; onLessonComplete: () => void }

export default function RadicalsPythagoreanTeenLesson({ childName, onLessonComplete }: Props) {
  const steps: LessonStep[] = [
    {
      bubble: 'A square root undoes a square. Watch.', mood: 'happy',
      render: (d) => (
        <RadicalWatch
          lines={['A square root asks: what number, times itself, gives this?', 'Seven times seven is forty-nine, so the square root of forty-nine is seven.']}
          visual={<MathCard>{'√49 = 7'}</MathCard>}
          onDone={d}
        />
      ),
    },
    {
      bubble: 'Not every root is whole — pull out the perfect square.', mood: 'thinking',
      render: (d) => (
        <RadicalWatch
          lines={['Simplify the square root of twelve.', 'Twelve is four times three, and the root of four is two — so it becomes two root three.']}
          visual={<MathCard>{'√12 = √4·√3 = 2√3'}</MathCard>}
          onDone={d}
        />
      ),
    },
    {
      bubble: 'Now the big one — the Pythagorean theorem.', mood: 'thinking',
      render: (d) => (
        <RadicalWatch
          lines={['In a right triangle, the two legs squared add up to the hypotenuse squared.', 'Legs of three and four: nine plus sixteen is twenty-five, and the root of twenty-five is five. So the hypotenuse is five.']}
          visual={<MathCard>{'3² + 4² = 25 → c = √25 = 5'}</MathCard>}
          onDone={d}
        />
      ),
    },
    {
      bubble: 'Your turn.', mood: 'thinking',
      render: (d) => (
        <RadicalAsk
          prompt="Simplify √18"
          say="Simplify the square root of eighteen."
          choices={[
            { value: '3√2', label: '3√2' },
            { value: '2√3', label: '2√3' },
            { value: '√18', label: '√18' },
            { value: '9√2', label: '9√2' },
          ]}
          answer="3√2"
          onDone={d}
        />
      ),
    },
  ]
  return (
    <TeenLessonShell
      band={BAND}
      childName={childName}
      chapterTitle="Radicals & the Pythagorean Theorem"
      steps={steps}
      finalSpeech={`Nice work, ${childName}. You can take roots, simplify radicals, and find a missing side. Let’s put it to work.`}
      onLessonComplete={onLessonComplete}
    />
  )
}
