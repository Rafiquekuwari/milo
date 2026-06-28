'use client'
/**
 * SlopeLinearGraphsTeenLesson (15–16, "Field Lab" / Commission) — the worked-
 * example walkthrough for Slope & Linear Graphs. Built on TeenLessonShell (the
 * teen LessonScaffold): a few narrated "watch" steps over a coordinate grid,
 * then a quick check. Exports the round generator + GraphWatch so the practice
 * chapter and its re-teach reuse them. Mirrors the IntegersTeenLesson pattern,
 * in 15–16 chrome (dark skin via data-band on the ancestor portal).
 *
 * Curriculum ramp (id "slopeLinearGraphs"):
 *   L1 — read slope & intercept from a graph
 *   L2 — slope from two points · identify the y = mx + b graph
 *   L3 — write a line's equation (from graph / point+slope / two points), incl. standard form
 *
 * Answer surfaces: CoordGrid (read a feature by tapping a lattice point) and
 * ChoiceGrid (numbers / equations / standard-form — irrational-free, MCQ only).
 */
import React, { useEffect, useRef } from 'react'
import { speak, speakSeq } from '@/lib/useMiloSpeaker'
import type { LessonStep } from '@/components/lessons/_kit'
import type { AgeBand, Choice, Pt } from '@/components/teen/types'
import TeenLessonShell from '@/components/teen/TeenLessonShell'
import CoordGrid from '@/components/teen/CoordGrid'
import ChoiceGrid from '@/components/teen/ChoiceGrid'

const BAND: AgeBand = '15-16'

// ── shared helpers (reused by the practice chapter) ────────────────────────
const rint = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))
/** Pretty integer: a real minus sign for negatives. */
export const fmtInt = (n: number) => (n < 0 ? `−${Math.abs(n)}` : String(n))
/** Spoken integer: "negative four". */
export const spoken = (n: number) => (n < 0 ? `negative ${Math.abs(n)}` : `${n}`)
const shuffle = <T,>(a: T[]): T[] => [...a].sort(() => Math.random() - 0.5)

/** y = mx + b as a tidy string (m integer here). */
export function eqStr(m: number, b: number): string {
  // m === 0 → horizontal line; the x-term vanishes (never render "0x").
  if (m === 0) return `y = ${fmtInt(b)}`
  const mPart = m === 1 ? 'x' : m === -1 ? '−x' : `${fmtInt(m)}x`
  if (b === 0) return `y = ${mPart}`
  return `y = ${mPart} ${b < 0 ? '−' : '+'} ${Math.abs(b)}`
}

/** Standard form Ax + By = C with A > 0 (m integer here → A = −m, B = 1, C = b). */
export function standardStr(m: number, b: number): string {
  // y = mx + b  →  −mx + y = b ; normalise so the leading coeff is positive.
  let A = -m
  let B = 1
  let C = b
  if (A < 0 || (A === 0 && B < 0)) { A = -A; B = -B; C = -C }
  const aPart = A === 0 ? '' : `${A === 1 ? '' : A === -1 ? '−' : fmtInt(A)}x`
  const bCoeff = B
  const bPart = bCoeff === 0 ? '' : `${bCoeff > 0 && aPart ? ' + ' : bCoeff < 0 ? ' − ' : ''}${Math.abs(bCoeff) === 1 ? '' : Math.abs(bCoeff)}y`
  return `${aPart}${bPart} = ${fmtInt(C)}`
}

const toNumChoice = (v: number): Choice => ({ value: v, label: fmtInt(v) })
const toStrChoice = (s: string): Choice => ({ value: s, label: s })

function choicesFromNums(answer: number, distractors: number[]): Choice[] {
  const set = new Set<number>([answer])
  for (const v of distractors) { if (set.size >= 4) break; if (Number.isFinite(v)) set.add(v) }
  let guard = 0
  while (set.size < 4 && guard++ < 50) set.add(answer + rint(-3, 3))
  return shuffle([...set]).map(toNumChoice)
}

function choicesFromStrs(answer: string, distractors: string[]): Choice[] {
  const set = new Set<string>([answer])
  for (const v of distractors) { if (set.size >= 4) break; if (v) set.add(v) }
  return shuffle([...set]).map(toStrChoice)
}

// ── Round type ──────────────────────────────────────────────────────────────
// `kind` decides which answer surface the practice frame renders:
//   'grid'   → CoordGrid read mode (tap the lattice point that answers)
//   'choice' → ChoiceGrid (numbers or equation strings)
export interface Round {
  kind: 'grid' | 'choice'
  promptText: string
  say: string
  answer: number | string
  // CoordGrid context (shown for both kinds when present).
  grid?: {
    range: number
    lines?: { m: number; b: number }[]
    points?: Pt[]
    highlight?: Pt | null
    /** the lattice point that is the correct tap (grid kind) */
    target?: Pt
  }
  choices?: Choice[]
  explain: string // re-teach line
}

/** A small line that fits inside a ±range box (no clipped intercept off-screen). */
function fitLine(range: number): { m: number; b: number } {
  let m = rint(-3, 3)
  if (m === 0) m = 1
  // keep b modest so the y-intercept is visible
  const b = rint(-(range - 2), range - 2)
  return { m, b }
}

/** Difficulty-aware round generator. */
export function makeRound(d: 1 | 2 | 3): Round {
  const range = 8

  // ── L1: read slope OR intercept from a shown graph ──
  if (d === 1) {
    const { m, b } = fitLine(range)
    if (Math.random() < 0.5) {
      // Read the y-intercept by TAPPING it on the grid.
      return {
        kind: 'grid',
        promptText: 'Tap the point where the line crosses the y-axis.',
        say: 'Tap the point where this line crosses the y-axis — that is the y-intercept.',
        answer: `${0},${b}`,
        grid: { range, lines: [{ m, b }], target: { x: 0, y: b } },
        explain: `The line crosses the y-axis at (0, ${fmtInt(b)}) — that is the intercept.`,
      }
    }
    // Read the slope as a value (choices).
    const ans = m
    return {
      kind: 'choice',
      promptText: 'What is the slope of this line?',
      say: 'What is the slope of this line? Count the rise over the run.',
      answer: ans,
      grid: { range, lines: [{ m, b }], points: [{ x: 0, y: b }] },
      choices: choicesFromNums(ans, [-m, m + 1, m - 1, b]),
      explain: `From (0, ${fmtInt(b)}), going one step right the line moves ${m > 0 ? 'up' : 'down'} ${Math.abs(m)} — so the slope is ${fmtInt(m)}.`,
    }
  }

  // ── L2: slope from two points · identify the matching graph ──
  if (d === 2) {
    if (Math.random() < 0.5) {
      // Slope from two given points.
      let x1 = rint(-5, 5), x2 = rint(-5, 5)
      let guard = 0
      while (x1 === x2 && guard++ < 30) x2 = rint(-5, 5)
      const m = rint(-3, 3) || 1
      const y1 = m * x1 + rint(-3, 3)
      const y2 = m * (x2 - x1) + y1 // forces integer slope m between the pts
      const ans = (y2 - y1) / (x2 - x1)
      return {
        kind: 'choice',
        promptText: `Two points lie on a line: (${fmtInt(x1)}, ${fmtInt(y1)}) and (${fmtInt(x2)}, ${fmtInt(y2)}). What is the slope?`,
        say: `A line passes through (${spoken(x1)}, ${spoken(y1)}) and (${spoken(x2)}, ${spoken(y2)}). What is its slope?`,
        answer: ans,
        choices: choicesFromNums(ans, [-ans, ans + 1, ans - 1, ans + 2]),
        explain: `Slope is rise over run: (${fmtInt(y2)} − ${fmtInt(y1)}) ÷ (${fmtInt(x2)} − ${fmtInt(x1)}) = ${fmtInt(ans)}.`,
      }
    }
    // Identify which equation matches the shown graph.
    const { m, b } = fitLine(range)
    const right = eqStr(m, b)
    const wrongs = [eqStr(-m, b), eqStr(m, -b || b + 1), eqStr(m + (m >= 0 ? 1 : -1), b)]
    return {
      kind: 'choice',
      promptText: 'Which equation matches this line?',
      say: 'Which equation matches the line shown? Check the slope and the intercept.',
      answer: right,
      grid: { range, lines: [{ m, b }], points: [{ x: 0, y: b }] },
      choices: choicesFromStrs(right, wrongs),
      explain: `The line crosses at (0, ${fmtInt(b)}) and rises ${fmtInt(m)} per step, so it is ${right}.`,
    }
  }

  // ── L3: write the equation (slope-intercept) or standard form ──
  if (Math.random() < 0.5) {
    // From a graph → slope-intercept equation.
    const { m, b } = fitLine(range)
    const right = eqStr(m, b)
    const wrongs = [eqStr(b, m), eqStr(-m, b), eqStr(m, b + (b >= 0 ? 1 : -1))]
    return {
      kind: 'choice',
      promptText: 'Write the equation of this line in y = mx + b form.',
      say: 'Write this line in slope-intercept form. What is m, and what is b?',
      answer: right,
      grid: { range, lines: [{ m, b }], points: [{ x: 0, y: b }] },
      choices: choicesFromStrs(right, wrongs),
      explain: `Slope ${fmtInt(m)}, intercept ${fmtInt(b)}, so ${right}.`,
    }
  }
  // From point + slope → standard form Ax + By = C.
  const m = rint(-3, 3) || 2
  const b = rint(-4, 4)
  const px = rint(-3, 3)
  const py = m * px + b
  const right = standardStr(m, b)
  const wrongs = [standardStr(-m, b), standardStr(m, -b || b + 1), eqStr(m, b)]
  return {
    kind: 'choice',
    promptText: `A line has slope ${fmtInt(m)} and passes through (${fmtInt(px)}, ${fmtInt(py)}). Which is its equation in standard form?`,
    say: `A line has slope ${spoken(m)} through the point (${spoken(px)}, ${spoken(py)}). Which is its standard-form equation?`,
    answer: right,
    choices: choicesFromStrs(right, wrongs),
    explain: `Start from y = ${fmtInt(m)}x ${b < 0 ? '−' : '+'} ${Math.abs(b)}, then move the x term across: ${right}.`,
  }
}

// ── GraphWatch: a narrated coordinate-grid worked example (reused for re-teach) ──
export function GraphWatch({
  lines, range, points, marked, narrate, onDone,
}: {
  lines?: { m: number; b: number }[]
  range: number
  points?: Pt[]
  marked: string[]
  narrate?: string[]
  onDone: () => void
}) {
  const doneRef = useRef(onDone)
  doneRef.current = onDone
  useEffect(() => {
    const cancel = speakSeq(narrate ?? marked, { onDone: () => window.setTimeout(() => doneRef.current(), 1200) })
    return cancel
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, width: '100%' }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <CoordGrid
          band={BAND}
          xRange={[-range, range]}
          yRange={[-range, range]}
          mode="read"
          lines={lines?.map((l) => ({ kind: 'line' as const, m: l.m, b: l.b }))}
          points={points}
        />
      </div>
      <p style={{ margin: 0, maxWidth: 520, textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 15, lineHeight: 1.5, color: 'var(--ink-soft)' }}>
        {marked[marked.length - 1]}
      </p>
    </div>
  )
}

// A one-question check inside the lesson (retry allowed, no penalty).
function GraphAsk({ prompt, say, choices, answer, onDone }: {
  prompt: string; say: string; choices: Choice[]; answer: string | number; onDone: () => void
}) {
  const [selected, setSelected] = React.useState<string | number | null>(null)
  const [status, setStatus] = React.useState<'idle' | 'correct' | 'wrong'>('idle')
  const spokenRef = useRef(false)
  useEffect(() => { if (!spokenRef.current) { spokenRef.current = true; speak(say) } }, []) // eslint-disable-line
  function pick(v: string | number) {
    if (status === 'correct') return
    setSelected(v)
    if (v === answer) { setStatus('correct'); speak('Exactly — that matches.'); window.setTimeout(onDone, 1400) }
    else { setStatus('wrong'); speak('Not quite — check the slope and the intercept again.'); window.setTimeout(() => { setSelected(null); setStatus('idle') }, 1300) }
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%' }}>
      <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>{prompt}</p>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <ChoiceGrid band={BAND} choices={choices} selected={selected} status={status} correctValue={answer} onPick={pick} columns={2} />
      </div>
    </div>
  )
}

interface Props { band?: AgeBand; childName: string; onLessonComplete: () => void }

export default function SlopeLinearGraphsTeenLesson({ childName, onLessonComplete }: Props) {
  const steps: LessonStep[] = [
    {
      bubble: 'A straight line is two facts: where it starts, and how steep it is. Watch.', mood: 'happy',
      render: (d) => (
        <GraphWatch
          range={8}
          lines={[{ m: 2, b: 1 }]}
          points={[{ x: 0, y: 1 }]}
          marked={[
            'The line crosses the y-axis at (0, 1) — that is b, the y-intercept.',
            'From there, every one step right it climbs two up — that climb is m, the slope.',
          ]}
          onDone={d}
        />
      ),
    },
    {
      bubble: 'Slope is rise over run — pick any two points. Watch.', mood: 'thinking',
      render: (d) => (
        <GraphWatch
          range={8}
          lines={[{ m: 2, b: 1 }]}
          points={[{ x: 0, y: 1 }, { x: 2, y: 5 }]}
          marked={[
            'From (0, 1) to (2, 5), y rises four while x runs two.',
            'Rise over run is four over two, which is two — so the slope is two.',
          ]}
          onDone={d}
        />
      ),
    },
    {
      bubble: 'Put them together: y = mx + b. Watch.', mood: 'happy',
      render: (d) => (
        <GraphWatch
          range={8}
          lines={[{ m: -1, b: 3 }]}
          points={[{ x: 0, y: 3 }]}
          marked={[
            'This line crosses at (0, 3), so b is three.',
            'It drops one for every step right, so m is negative one — the equation is y = −x + 3.',
          ]}
          onDone={d}
        />
      ),
    },
    {
      bubble: 'Your turn.', mood: 'thinking',
      render: (d) => (
        <GraphAsk
          prompt="A line crosses at (0, 2) and rises 3 each step. Which equation is it?"
          say="A line crosses the y-axis at (0, 2) and rises three for every step right. Which equation is it?"
          choices={[
            { value: 'y = 3x + 2', label: 'y = 3x + 2' },
            { value: 'y = 2x + 3', label: 'y = 2x + 3' },
            { value: 'y = 3x − 2', label: 'y = 3x − 2' },
            { value: 'y = −3x + 2', label: 'y = −3x + 2' },
          ]}
          answer="y = 3x + 2"
          onDone={d}
        />
      ),
    },
  ]
  return (
    <TeenLessonShell
      band={BAND}
      childName={childName}
      chapterTitle="Slope & Linear Graphs"
      steps={steps}
      finalSpeech={`Good work, ${childName}. You can read slope and intercept off a graph and write the line's equation. Time to ship the commission.`}
      onLessonComplete={onLessonComplete}
    />
  )
}
