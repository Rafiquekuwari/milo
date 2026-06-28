'use client'
/**
 * QuadraticsParabolasTeenLesson (15–16, "Studio / commission") — the worked-example
 * walkthrough for the Quadratics & Parabolas commission. Built on TeenLessonShell:
 * a few "watch" steps narrated over a parabola on the coordinate grid, then a quick
 * check. Exports the round generator + ParabolaWatch so the practice chapter and its
 * re-teach reuse them. Mirrors IntegersTeenLesson, in 15–16 chrome (dark skin).
 *
 * Difficulty ramp (curriculum #10 quadraticsParabolas):
 *   L1 — read roots / vertex / axis / root-count from a shown parabola
 *   L2 — solve by factoring (x² + bx + c = 0) and by square roots (x² = k)
 *   L3 — quadratic formula with a radical discriminant (irrational → MCQ) +
 *        match an equation to the right parabola (roots/opening/vertex).
 */
import React, { useEffect, useRef } from 'react'
import { speak, speakSeq } from '@/lib/useMiloSpeaker'
import type { LessonStep } from '@/components/lessons/_kit'
import type { AgeBand, Choice, Pt } from '@/components/teen/types'
import TeenLessonShell from '@/components/teen/TeenLessonShell'
import CoordGrid from '@/components/teen/CoordGrid'
import ChoiceGrid from '@/components/teen/ChoiceGrid'

const BAND: AgeBand = '15-16'
const GRID = 10

// ── number helpers (reused by the practice chapter) ────────────────────────
const rint = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]
const shuffle = <T,>(a: T[]): T[] => [...a].sort(() => Math.random() - 0.5)
/** real minus sign for negatives */
export const minus = (n: number) => (n < 0 ? `−${Math.abs(n)}` : String(n))
/** spoken integer: "negative four" */
export const spoken = (n: number) => (n < 0 ? `negative ${Math.abs(n)}` : `${n}`)

/** Tidy a quadratic y = ax² + bx + c into a label string. */
export function quadStr(a: number, b: number, c: number): string {
  const aPart = a === 1 ? 'x²' : a === -1 ? '−x²' : `${a < 0 ? '−' : ''}${Math.abs(a)}x²`
  let s = aPart
  if (b !== 0) s += ` ${b < 0 ? '−' : '+'} ${Math.abs(b) === 1 ? 'x' : `${Math.abs(b)}x`}`
  if (c !== 0) s += ` ${c < 0 ? '−' : '+'} ${Math.abs(c)}`
  return s
}

const fmt2 = (n: number) => {
  const v = Math.round(n * 100) / 100
  return v === 0 ? '0' : minus(v)
}

// ── Round type ─────────────────────────────────────────────────────────────
/** Optional parabola to render as graph context: y = a x² + b x + c. */
export interface ParabolaSpec { a: number; b: number; c: number; vertex?: Pt; roots?: Pt[] }

export interface Round {
  promptText: string
  say: string
  choices: Choice[]
  answer: string | number
  parabola?: ParabolaSpec
  explain: string // re-teach line
}

const toNumChoice = (v: number): Choice => ({ value: v, label: minus(v) })

function numChoices(answer: number, distractors: number[]): Choice[] {
  const set = new Map<number, true>()
  set.set(answer, true)
  for (const v of distractors) {
    if (set.size >= 4) break
    if (Number.isFinite(v) && !set.has(v)) set.set(v, true)
  }
  let guard = 0
  while (set.size < 3 && guard++ < 60) set.set(answer + rint(-4, 4), true)
  return shuffle([...set.keys()]).map(toNumChoice)
}

function strChoices(answer: string, distractors: string[]): Choice[] {
  const set: string[] = [answer]
  for (const v of distractors) { if (set.length >= 4) break; if (!set.includes(v)) set.push(v) }
  return shuffle(set).map((v) => ({ value: v, label: v }))
}

// ── makeRound: difficulty-aware generator ──────────────────────────────────
export function makeRound(d: 1 | 2 | 3): Round {
  if (d === 1) return makeReadGraph()
  if (d === 2) return makeSolve()
  return makeFormulaOrMatch()
}

/** L1 — read a feature off a shown integer-rooted parabola. */
function makeReadGraph(): Round {
  // y = a (x - r1)(x - r2), integer roots, vertex within the grid.
  const a = pick([1, 1, -1])
  let r1 = rint(-4, 4)
  let r2 = rint(-4, 4)
  let guard = 0
  while (r2 === r1 && guard++ < 20) r2 = rint(-4, 4)
  if (r1 > r2) [r1, r2] = [r2, r1]
  const b = -a * (r1 + r2)
  const c = a * r1 * r2
  const vx = (r1 + r2) / 2
  const vy = a * (vx - r1) * (vx - r2)
  const spec: ParabolaSpec = { a, b, c, vertex: { x: vx, y: vy }, roots: [{ x: r1, y: 0 }, { x: r2, y: 0 }] }

  const kind = pick(['roots', 'axis', 'count', 'vertexY'])
  if (kind === 'roots') {
    return {
      promptText: 'What are the x-intercepts (roots) of this parabola?',
      say: 'Where does this parabola cross the x-axis?',
      choices: strChoices(
        `x = ${minus(r1)}, ${minus(r2)}`,
        [`x = ${minus(r1)}, ${minus(r2 + 1)}`, `x = ${minus(r1 - 1)}, ${minus(r2)}`, `x = ${minus(-r1)}, ${minus(-r2)}`],
      ),
      answer: `x = ${minus(r1)}, ${minus(r2)}`,
      parabola: spec,
      explain: `The curve crosses the x-axis at x = ${minus(r1)} and x = ${minus(r2)} — those are the roots.`,
    }
  }
  if (kind === 'axis') {
    return {
      promptText: 'What is the axis of symmetry (x of the vertex)?',
      say: 'What is the axis of symmetry of this parabola?',
      choices: numChoices(vx, [vx + 1, vx - 1, r1, r2]),
      answer: vx,
      parabola: spec,
      explain: `The axis of symmetry is halfway between the roots: x = (${minus(r1)} + ${minus(r2)}) / 2 = ${minus(vx)}.`,
    }
  }
  if (kind === 'vertexY') {
    return {
      promptText: 'What is the y-value of the vertex (the turning point)?',
      say: 'What is the lowest or highest value this parabola reaches?',
      choices: numChoices(vy, [vy + 1, vy - 1, vy + 2, 0]),
      answer: vy,
      parabola: spec,
      explain: `At x = ${minus(vx)} the curve turns; the vertex y-value is ${minus(vy)}.`,
    }
  }
  // count
  return {
    promptText: 'How many real roots does this parabola have?',
    say: 'How many times does this parabola cross the x-axis?',
    choices: numChoices(2, [0, 1, 3]),
    answer: 2,
    parabola: spec,
    explain: 'It crosses the x-axis twice, so it has 2 real roots.',
  }
}

/** L2 — solve a quadratic by factoring or by square roots. */
function makeSolve(): Round {
  if (Math.random() < 0.5) {
    // factor x² + bx + c = 0 with integer roots r1, r2
    let r1 = rint(-6, 6)
    let r2 = rint(-6, 6)
    let guard = 0
    while ((r2 === r1 || r1 === 0 || r2 === 0) && guard++ < 30) { r1 = rint(-6, 6); r2 = rint(-6, 6) }
    if (r1 > r2) [r1, r2] = [r2, r1]
    const b = -(r1 + r2)
    const c = r1 * r2
    const ans = `x = ${minus(r1)}, ${minus(r2)}`
    return {
      promptText: `Solve by factoring:  x² ${b < 0 ? '−' : '+'} ${Math.abs(b) === 1 ? 'x' : `${Math.abs(b)}x`} ${c < 0 ? '−' : '+'} ${Math.abs(c)} = 0`,
      say: 'Solve this quadratic by factoring.',
      choices: strChoices(ans, [
        `x = ${minus(-r1)}, ${minus(-r2)}`,
        `x = ${minus(r1)}, ${minus(r2 + 1)}`,
        `x = ${minus(r1 + 1)}, ${minus(r2)}`,
      ]),
      answer: ans,
      explain: `Find two numbers that multiply to ${minus(c)} and add to ${minus(b)}: that's ${minus(-r1)} and ${minus(-r2)}, so (x ${(-r1) < 0 ? '−' : '+'} ${Math.abs(r1)})(x ${(-r2) < 0 ? '−' : '+'} ${Math.abs(r2)}) = 0, giving x = ${minus(r1)} and x = ${minus(r2)}.`,
    }
  }
  // square roots: x² = k (perfect square), or (x - h)² = k
  const root = rint(2, 7)
  const k = root * root
  const ans = `x = ±${root}`
  return {
    promptText: `Solve by square roots:  x² = ${k}`,
    say: `Solve x squared equals ${k} by taking square roots.`,
    choices: strChoices(ans, [`x = ${root}`, `x = ±${root + 1}`, `x = ±${k}`]),
    answer: ans,
    explain: `Take the square root of both sides — remember both signs: x = ±√${k} = ±${root}.`,
  }
}

/** L3 — quadratic formula (radical discriminant) or match equation ↔ parabola. */
function makeFormulaOrMatch(): Round {
  if (Math.random() < 0.55) {
    // quadratic formula with a NON-perfect-square discriminant → irrational roots (MCQ)
    // x² + bx + c = 0, a = 1, disc = b² - 4c not a perfect square, > 0.
    let b = 0, c = 0, disc = 0, gg = 0
    do {
      b = rint(-6, 6)
      c = rint(-5, 5)
      disc = b * b - 4 * c
      gg++
    } while ((disc <= 0 || Number.isInteger(Math.sqrt(disc))) && gg < 200)
    const ans = `x = (${minus(-b)} ± √${disc}) / 2`
    return {
      promptText: `Use the quadratic formula:  x² ${b < 0 ? '−' : '+'} ${Math.abs(b)}x ${c < 0 ? '−' : '+'} ${Math.abs(c)} = 0`,
      say: 'Use the quadratic formula. The discriminant is not a perfect square, so the roots are irrational.',
      choices: strChoices(ans, [
        `x = (${minus(b)} ± √${disc}) / 2`,
        `x = (${minus(-b)} ± √${disc + 4}) / 2`,
        `x = (${minus(-b)} ± √${Math.abs(disc - 4)}) / 2`,
      ]),
      answer: ans,
      explain: `With a = 1, b = ${minus(b)}, c = ${minus(c)}: discriminant = b² − 4ac = ${b}² − 4(${minus(c)}) = ${disc}. Then x = (−b ± √(disc)) / 2a = (${minus(-b)} ± √${disc}) / 2.`,
    }
  }
  // match equation → number of real roots from the discriminant sign
  const a = pick([1, -1, 2])
  let b = rint(-6, 6)
  let c = rint(-6, 6)
  const disc = b * b - 4 * a * c
  const count = disc > 0 ? 2 : disc === 0 ? 1 : 0
  const opens = a > 0 ? 'upward' : 'downward'
  const ans = `${count} real root${count === 1 ? '' : 's'}, opens ${opens}`
  const others = [
    `${count === 2 ? 0 : 2} real roots, opens ${opens}`,
    `${count} real root${count === 1 ? '' : 's'}, opens ${a > 0 ? 'downward' : 'upward'}`,
    `1 real root, opens ${a > 0 ? 'downward' : 'upward'}`,
  ].filter((s) => s !== ans)
  return {
    promptText: `For y = ${quadStr(a, b, c)}, describe the parabola:`,
    say: 'Use the discriminant and the sign of a to describe this parabola.',
    choices: strChoices(ans, others),
    answer: ans,
    explain: `Discriminant b² − 4ac = ${disc}, which is ${disc > 0 ? 'positive → 2 roots' : disc === 0 ? 'zero → 1 root' : 'negative → 0 real roots'}. Since a = ${minus(a)} is ${a > 0 ? 'positive' : 'negative'}, it opens ${opens}.`,
  }
}

// ── ParabolaWatch: a narrated worked example over a parabola (reused for re-teach) ──
export function ParabolaWatch({
  lines, spec, onDone,
}: {
  lines: string[]; spec: ParabolaSpec; onDone: () => void
}) {
  const doneRef = useRef(onDone)
  doneRef.current = onDone
  useEffect(() => {
    const cancel = speakSeq(lines, { onDone: () => window.setTimeout(() => doneRef.current(), 1200) })
    return cancel
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const ctx: Pt[] = [
    ...(spec.vertex ? [spec.vertex] : []),
    ...(spec.roots ?? []),
  ].filter((p) => Math.abs(p.x) <= GRID && Math.abs(p.y) <= GRID)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, width: '100%' }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <CoordGrid
          band={BAND}
          xRange={[-GRID, GRID]}
          yRange={[-GRID, GRID]}
          mode="read"
          curves={[{ kind: 'curve', fn: (x) => spec.a * x * x + spec.b * x + spec.c }]}
          points={ctx}
          highlight={spec.vertex && Math.abs(spec.vertex.x) <= GRID && Math.abs(spec.vertex.y) <= GRID ? spec.vertex : null}
        />
      </div>
      <p style={{ margin: 0, maxWidth: 520, textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 15, lineHeight: 1.5, color: 'var(--ink-soft)' }}>
        {lines[lines.length - 1]}
      </p>
    </div>
  )
}

// A one-question check inside the lesson (retry allowed, no penalty).
function ParabolaAsk({ prompt, say, choices, answer, onDone }: {
  prompt: string; say: string; choices: Choice[]; answer: string | number; onDone: () => void
}) {
  const [selected, setSelected] = React.useState<string | number | null>(null)
  const [status, setStatus] = React.useState<'idle' | 'correct' | 'wrong'>('idle')
  const spokenRef = useRef(false)
  useEffect(() => { if (!spokenRef.current) { spokenRef.current = true; speak(say) } }, []) // eslint-disable-line
  function onPick(v: string | number) {
    if (status === 'correct') return
    setSelected(v)
    if (v === answer) { setStatus('correct'); speak('Yes — that’s it.'); window.setTimeout(onDone, 1400) }
    else { setStatus('wrong'); speak('Not quite — take another look.'); window.setTimeout(() => { setSelected(null); setStatus('idle') }, 1200) }
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%' }}>
      <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 18, fontWeight: 600, color: 'var(--ink)', textAlign: 'center' }}>{prompt}</p>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <ChoiceGrid band={BAND} choices={choices} selected={selected} status={status} correctValue={answer} onPick={onPick} columns={choices.length <= 2 ? choices.length : 1} />
      </div>
    </div>
  )
}

interface Props { band?: AgeBand; childName: string; onLessonComplete: () => void }

export default function QuadraticsParabolasTeenLesson({ childName, onLessonComplete }: Props) {
  // Freeze the worked-example parabolas so they don't reshuffle on re-render.
  // Example 1: y = x² − 4 (roots ±2, vertex (0,−4)).
  const ex1: ParabolaSpec = { a: 1, b: 0, c: -4, vertex: { x: 0, y: -4 }, roots: [{ x: -2, y: 0 }, { x: 2, y: 0 }] }
  // Example 2: y = x² − 2x − 3 = (x−3)(x+1), roots −1 & 3, vertex (1,−4).
  const ex2: ParabolaSpec = { a: 1, b: -2, c: -3, vertex: { x: 1, y: -4 }, roots: [{ x: -1, y: 0 }, { x: 3, y: 0 }] }
  // Example 3: y = −x² + 4 (opens down), roots ±2, vertex (0,4).
  const ex3: ParabolaSpec = { a: -1, b: 0, c: 4, vertex: { x: 0, y: 4 }, roots: [{ x: -2, y: 0 }, { x: 2, y: 0 }] }

  const fmtV = fmt2

  const steps: LessonStep[] = [
    {
      bubble: 'A quadratic graphs as a parabola — a U-shaped curve. Watch.', mood: 'happy',
      render: (done) => (
        <ParabolaWatch
          spec={ex1}
          lines={[
            'Here is y equals x squared minus four.',
            'It opens upward because a is positive, and it turns at its lowest point — the vertex, at (0, negative 4).',
          ]}
          onDone={done}
        />
      ),
    },
    {
      bubble: 'Roots are where the curve crosses the x-axis. Watch.', mood: 'happy',
      render: (done) => (
        <ParabolaWatch
          spec={ex2}
          lines={[
            'This is y equals x squared minus two x minus three.',
            'It factors as x minus three, times x plus one, so the roots are x equals three and x equals negative one — exactly where it crosses the x-axis.',
          ]}
          onDone={done}
        />
      ),
    },
    {
      bubble: 'The discriminant tells you how many real roots exist.', mood: 'thinking',
      render: (done) => (
        <ParabolaWatch
          spec={ex3}
          lines={[
            'For a x squared plus b x plus c, the discriminant is b squared minus four a c.',
            'Positive gives two roots, zero gives one, negative gives none. This one opens downward because a is negative.',
          ]}
          onDone={done}
        />
      ),
    },
    {
      bubble: 'Your turn.', mood: 'thinking',
      render: (done) => (
        <ParabolaAsk
          prompt="Solve by factoring:  x² − x − 6 = 0"
          say="Solve x squared minus x minus six equals zero by factoring."
          choices={[
            { value: 'x = −2, 3', label: 'x = −2, 3' },
            { value: 'x = 2, −3', label: 'x = 2, −3' },
            { value: 'x = −2, −3', label: 'x = −2, −3' },
          ]}
          answer="x = −2, 3"
          onDone={done}
        />
      ),
    },
  ]
  void fmtV
  return (
    <TeenLessonShell
      band={BAND}
      childName={childName}
      chapterTitle="Quadratics & Parabolas"
      steps={steps}
      finalSpeech={`Nice work, ${childName}. You can read a parabola, solve by factoring and square roots, and reach for the quadratic formula. Let’s ship this commission.`}
      onLessonComplete={onLessonComplete}
    />
  )
}
