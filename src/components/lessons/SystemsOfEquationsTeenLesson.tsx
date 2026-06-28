'use client'
/**
 * SystemsOfEquationsTeenLesson (15-16, "Field Lab", dark skin) — the worked-example
 * walkthrough for the Systems of Equations commission. Built on TeenLessonShell:
 * a few narrated "watch" steps (graph → substitution → elimination) then a quick
 * check. Exports the round generator + a Watch helper so the practice chapter and
 * its re-teach reuse them. Mirrors IntegersTeenLesson, in 15-16 chrome.
 *
 * Difficulty ramp (curriculum id `systemsOfEquations`):
 *   L1 — solve by graphing / find the intersection (tap the meeting point, or read (x,y)).
 *   L2 — substitution: solve the system, pick the value of x.
 *   L3 — elimination, classify one / none / infinite, set up from a word problem.
 *
 * Irrational/structured answers are avoided: every system is built to have clean
 * integer solutions, so answers are points/integers via CoordGrid or ChoiceGrid
 * (never free-text). Randomised lesson examples are frozen with useMemo by the host.
 */
import React, { useEffect, useMemo, useRef } from 'react'
import { speak, speakSeq } from '@/lib/useMiloSpeaker'
import type { LessonStep } from '@/components/lessons/_kit'
import type { AgeBand, Choice, Pt } from '@/components/teen/types'
import TeenLessonShell from '@/components/teen/TeenLessonShell'
import ChoiceGrid from '@/components/teen/ChoiceGrid'
import CoordGrid from '@/components/teen/CoordGrid'

const BAND: AgeBand = '15-16'

// ── shared helpers (reused by the practice chapter) ─────────────────────────
const rint = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))
const rpick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]
const shuffle = <T,>(a: T[]): T[] => [...a].sort(() => Math.random() - 0.5)
/** Pretty integer with a real minus sign. */
export const fmtInt = (n: number) => (n < 0 ? `−${Math.abs(n)}` : String(n))
/** Spoken integer: "negative four". */
export const spoken = (n: number) => (n < 0 ? `negative ${Math.abs(n)}` : `${n}`)
const ptStr = (p: Pt) => `(${fmtInt(p.x)}, ${fmtInt(p.y)})`

/** Format y = mx + b with real minus signs. */
function lineEq(m: number, b: number): string {
  const mPart = m === 1 ? 'x' : m === -1 ? '−x' : `${m < 0 ? '−' : ''}${Math.abs(m)}x`
  if (b === 0) return `y = ${mPart}`
  return `y = ${mPart} ${b < 0 ? '−' : '+'} ${Math.abs(b)}`
}

const GRID = 8 // graph spans -8..8

// ── Round model ─────────────────────────────────────────────────────────────
// Two answer surfaces: a graph (tap the intersection lattice point) or an MCQ.
export interface Round {
  kind: 'graph' | 'choice'
  promptText: string
  say: string
  /** Both lines of the system, rendered as context on every round. */
  linesShown: { m: number; b: number }[]
  // graph rounds:
  point?: Pt              // the intersection the learner must tap
  // choice rounds:
  choices?: Choice[]
  answer?: string | number
  cols?: number           // preferred ChoiceGrid columns (long labels → 1)
  /** The (x,y) solution used by the re-teach to show the crossing. */
  solution?: Pt | null    // null === parallel / no unique solution
  explain: string         // re-teach line
}

function toIntChoice(v: number): Choice { return { value: v, label: fmtInt(v) } }
function toPtChoice(p: Pt): Choice { return { value: ptStr(p), label: ptStr(p) } }

function ptChoices(answer: Pt): Choice[] {
  const set = new Map<string, Pt>()
  set.set(ptStr(answer), answer)
  const cands: Pt[] = [
    { x: answer.y, y: answer.x },        // swapped coords
    { x: answer.x + 1, y: answer.y - 1 },
    { x: answer.x - 1, y: answer.y + 1 },
    { x: -answer.x, y: answer.y },
    { x: answer.x, y: -answer.y },
    { x: answer.x + 2, y: answer.y },
  ]
  for (const c of cands) {
    if (set.size >= 4) break
    set.set(ptStr(c), c)
  }
  return shuffle([...set.values()]).map(toPtChoice)
}

function intChoices(answer: number): Choice[] {
  const set = new Set<number>([answer])
  for (const d of [1, -1, 2, -2, 3]) { if (set.size >= 4) break; set.add(answer + d) }
  return shuffle([...set]).map(toIntChoice)
}

/** Build a 2-line system that crosses at integer point (x0,y0), with distinct slopes. */
function systemThrough(x0: number, y0: number): { lines: { m: number; b: number }[]; sol: Pt } {
  let m1 = rpick([-2, -1, 1, 2])
  let m2 = rpick([-2, -1, 1, 2, 3])
  let guard = 0
  while (m1 === m2 && guard++ < 20) m2 = rpick([-2, -1, 1, 2, 3])
  if (m1 === m2) m2 = m1 + 1
  const b1 = y0 - m1 * x0
  const b2 = y0 - m2 * x0
  return { lines: [{ m: m1, b: b1 }, { m: m2, b: b2 }], sol: { x: x0, y: y0 } }
}

/** Difficulty-aware round generator. */
export function makeRound(d: 1 | 2 | 3): Round {
  // ── L1: solve by graphing / find the intersection ──
  if (d === 1) {
    const x0 = rint(-3, 3)
    const y0 = rint(-3, 3)
    const { lines, sol } = systemThrough(x0, y0)
    if (Math.random() < 0.6) {
      // tap the meeting point on the graph
      return {
        kind: 'graph',
        promptText: 'Tap the point where the two lines meet — that point is the solution.',
        say: 'Tap the point where the two lines meet. That crossing point is the solution of the system.',
        linesShown: lines,
        point: sol,
        solution: sol,
        explain: `The lines cross at ${ptStr(sol)}, so the solution is ${ptStr(sol)}.`,
      }
    }
    // read the solution as an (x,y) pair
    return {
      kind: 'choice',
      promptText: 'The lines cross at one point. What is the solution (x, y)?',
      say: 'The lines cross at one point. What is the solution as an x y pair?',
      linesShown: lines,
      choices: ptChoices(sol),
      answer: ptStr(sol),
      cols: 2,
      solution: sol,
      explain: `Read where they cross: ${ptStr(sol)}.`,
    }
  }

  // ── L2: substitution — solve, then pick the value of x ──
  if (d === 2) {
    const x0 = rint(-4, 4)
    const y0 = rint(-4, 5)
    const { lines, sol } = systemThrough(x0, y0)
    const askX = Math.random() < 0.5
    const ask = askX ? x0 : y0
    const v = askX ? 'x' : 'y'
    return {
      kind: 'choice',
      promptText: `Solve by substitution. Both equations meet at one point — what is ${v}?`,
      say: `Solve this system by substitution. The two lines meet at one point. What is ${v}?`,
      linesShown: lines,
      choices: intChoices(ask),
      answer: ask,
      cols: 2,
      solution: sol,
      explain: `Substitute one equation into the other: the solution is ${ptStr(sol)}, so ${v} = ${fmtInt(ask)}.`,
    }
  }

  // ── L3: elimination · classify one/none/infinite · word-problem setup ──
  const variant = rpick(['classify', 'eliminate', 'word'] as const)

  if (variant === 'classify') {
    const type = rpick(['one', 'none', 'infinite'] as const)
    const m = rpick([-2, -1, 1, 2])
    const b = rint(-3, 3)
    let lines: { m: number; b: number }[]
    let label: string
    let why: string
    if (type === 'one') {
      let m2 = rpick([-2, -1, 1, 2, 3]); if (m2 === m) m2 = m + 1
      lines = [{ m, b }, { m: m2, b: b + rint(1, 3) }]
      label = 'one solution'
      why = 'different slopes, so the lines cross exactly once'
    } else if (type === 'none') {
      lines = [{ m, b }, { m, b: b + rint(2, 4) }]
      label = 'no solution'
      why = 'same slope, different intercept — parallel lines never meet'
    } else {
      lines = [{ m, b }, { m, b }]
      label = 'infinitely many'
      why = 'same slope and same intercept — they are the same line'
    }
    return {
      kind: 'choice',
      promptText: 'How many solutions does this system have?',
      say: 'How many solutions does this system have: one, none, or infinitely many?',
      linesShown: lines,
      choices: shuffle([
        { value: 'one solution', label: 'One' },
        { value: 'no solution', label: 'None' },
        { value: 'infinitely many', label: 'Infinitely many' },
      ]),
      answer: label,
      cols: 1,
      solution: null, // re-teach explains in words
      explain: `These have ${label}: ${why}.`,
    }
  }

  if (variant === 'eliminate') {
    // x + y = s ; x − y = diff  → x = (s+diff)/2, y = (s−diff)/2 (built integer).
    const x0 = rint(-5, 6)
    const y0 = rint(-5, 6)
    const s = x0 + y0
    const diff = x0 - y0
    const askX = Math.random() < 0.5
    const ask = askX ? x0 : y0
    const v = askX ? 'x' : 'y'
    return {
      kind: 'choice',
      promptText: `Eliminate by adding the equations:  x + y = ${fmtInt(s)}  and  x − y = ${fmtInt(diff)}. What is ${v}?`,
      say: `Use elimination. x plus y equals ${spoken(s)}, and x minus y equals ${spoken(diff)}. Add the equations to cancel y. What is ${v}?`,
      linesShown: [{ m: -1, b: s }, { m: 1, b: -diff }],
      choices: intChoices(ask),
      answer: ask,
      cols: 2,
      solution: { x: x0, y: y0 },
      explain: `Add: 2x = ${fmtInt(s + diff)}, so x = ${fmtInt(x0)}; then y = ${fmtInt(y0)}. ${v} = ${fmtInt(ask)}.`,
    }
  }

  // word: two tickets / two items → set up the right system.
  const adult = rint(2, 5)
  const child = rint(1, 3)
  const na = rint(2, 4)
  const nc = rint(2, 5)
  const total = adult * na + child * nc
  const correct = `${adult}a + ${child}c = ${total}`
  const distractors = [
    `${child}a + ${adult}c = ${total}`,
    `${adult}a + ${child}c = ${na + nc}`,
    `a + c = ${total}`,
  ]
  return {
    kind: 'choice',
    promptText: `Tickets cost $${adult} (adult) and $${child} (child). The total is $${total}. Which equation models it?`,
    say: `Adult tickets cost ${adult} dollars and child tickets cost ${child} dollars. The total is ${total} dollars. Which equation models this?`,
    linesShown: [],
    choices: shuffle([
      { value: correct, label: correct },
      ...distractors.map((dd) => ({ value: dd, label: dd })),
    ]),
    answer: correct,
    cols: 1,
    solution: null,
    explain: `Cost per adult times a, plus cost per child times c, equals the total: ${correct}.`,
  }
}

// ── SystemWatch: a narrated graph worked example (reused for re-teach) ───────
export function SystemWatch({
  lines, marked, point, onDone, range = GRID,
}: {
  lines: string[]
  marked: { m: number; b: number }[]
  point?: Pt | null
  onDone: () => void
  range?: number
}) {
  const doneRef = useRef(onDone)
  doneRef.current = onDone
  useEffect(() => {
    const cancel = speakSeq(lines, { onDone: () => window.setTimeout(() => doneRef.current(), 1200) })
    return cancel
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, width: '100%' }}>
      <CoordGrid
        band={BAND}
        xRange={[-range, range]}
        yRange={[-range, range]}
        mode="read"
        lines={marked.map((l) => ({ kind: 'line' as const, m: l.m, b: l.b }))}
        points={point ? [point] : []}
        highlight={point ?? null}
      />
      <p style={{ margin: 0, maxWidth: 520, textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 15, lineHeight: 1.5, color: 'var(--ink-soft)' }}>
        {lines[lines.length - 1]}
      </p>
    </div>
  )
}

// A one-question check inside the lesson (retry allowed, no penalty).
function SystemAsk({ prompt, say, choices, answer, onDone }: {
  prompt: string; say: string; choices: Choice[]; answer: string | number; onDone: () => void
}) {
  const [selected, setSelected] = React.useState<string | number | null>(null)
  const [status, setStatus] = React.useState<'idle' | 'correct' | 'wrong'>('idle')
  const spokenRef = useRef(false)
  useEffect(() => { if (!spokenRef.current) { spokenRef.current = true; speak(say) } }, []) // eslint-disable-line
  function pick(v: string | number) {
    if (status === 'correct') return
    setSelected(v)
    if (v === answer) { setStatus('correct'); speak('Yes — that solves both equations.'); window.setTimeout(onDone, 1400) }
    else { setStatus('wrong'); speak('Not quite — check it in both equations.'); window.setTimeout(() => { setSelected(null); setStatus('idle') }, 1300) }
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%' }}>
      <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>{prompt}</p>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <ChoiceGrid band={BAND} choices={choices} selected={selected} status={status} correctValue={answer} onPick={pick} columns={choices.length === 4 ? 2 : choices.length} />
      </div>
    </div>
  )
}

interface Props { band?: AgeBand; childName: string; onLessonComplete: () => void }

export default function SystemsOfEquationsTeenLesson({ childName, onLessonComplete }: Props) {
  // Freeze the worked-example check so re-renders don't reshuffle it.
  const checkChoices = useMemo<Choice[]>(() => ptChoices({ x: 2, y: 1 }), [])

  const steps: LessonStep[] = [
    {
      bubble: 'A system is two equations at once. The solution is the one (x, y) that fits both. Watch.', mood: 'happy',
      render: (d) => (
        <SystemWatch
          lines={[
            `Here are two lines: ${lineEq(1, -1)} and ${lineEq(-1, 3)}.`,
            'The solution of the system is the single point where they cross.',
            'They meet at (2, 1) — that pair works in both equations.',
          ]}
          marked={[{ m: 1, b: -1 }, { m: -1, b: 3 }]}
          point={{ x: 2, y: 1 }}
          onDone={d}
        />
      ),
    },
    {
      bubble: 'You don’t always need the graph. Substitution finds it with algebra. Watch.', mood: 'thinking',
      render: (d) => (
        <SystemWatch
          lines={[
            'Take y = x − 1 and y = −x + 3.',
            'Substitute: x − 1 = −x + 3, so 2x = 4 and x = 2.',
            'Put x = 2 back in: y = 1. The solution is (2, 1) — the same crossing.',
          ]}
          marked={[{ m: 1, b: -1 }, { m: -1, b: 3 }]}
          point={{ x: 2, y: 1 }}
          onDone={d}
        />
      ),
    },
    {
      bubble: 'Some systems have no solution, some have infinitely many. The slopes tell you.', mood: 'thinking',
      render: (d) => (
        <SystemWatch
          lines={[
            'Parallel lines — same slope, different intercept — never meet.',
            'A system of parallel lines has no solution.',
            'If the two equations are the very same line, every point fits: infinitely many.',
          ]}
          marked={[{ m: 1, b: 2 }, { m: 1, b: -3 }]}
          point={null}
          onDone={d}
        />
      ),
    },
    {
      bubble: 'Your turn.', mood: 'thinking',
      render: (d) => (
        <SystemAsk
          prompt="The lines y = x − 1 and y = −x + 3 meet here. What is the solution (x, y)?"
          say="The lines meet at one point. What is the solution as an x y pair?"
          choices={checkChoices}
          answer={ptStr({ x: 2, y: 1 })}
          onDone={d}
        />
      ),
    },
  ]

  return (
    <TeenLessonShell
      band={BAND}
      childName={childName}
      chapterTitle="Systems of Equations"
      steps={steps}
      finalSpeech={`Nice work, ${childName}. You can find where two lines meet — by graph, by substitution, and by reading the slopes. Let’s take the commission.`}
      onLessonComplete={onLessonComplete}
    />
  )
}
