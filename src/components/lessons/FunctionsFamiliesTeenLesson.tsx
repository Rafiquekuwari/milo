'use client'
/**
 * FunctionsFamiliesTeenLesson (15–16, "studio") — the worked-example walkthrough
 * for "Functions: Notation, Linear & Exponential". Built on TeenLessonShell: a few
 * narrated worked steps, then a quick check. Exports the round generator + a
 * FunctionWatch helper so the practice chapter and its re-teach reuse them.
 * Mirrors IntegersTeenLesson in 15–16 chrome.
 *
 * Curriculum ramp (id "functionsFamilies"):
 *   L1 — is-it-a-function & evaluate f(x)
 *   L2 — domain / range / intercepts from a graph or table
 *   L3 — linear vs exponential (y = a·bˣ), growth/decay, continue geometric sequences
 *
 * Answers are MCQ (ChoiceGrid): function-family work involves curves, classes, and
 * sequence terms — discrete labelled choices, never free-text symbolic parsing.
 */
import React, { useEffect, useRef } from 'react'
import { speak, speakSeq } from '@/lib/useMiloSpeaker'
import type { LessonStep } from '@/components/lessons/_kit'
import type { AgeBand, Choice, Pt } from '@/components/teen/types'
import TeenLessonShell from '@/components/teen/TeenLessonShell'
import ChoiceGrid from '@/components/teen/ChoiceGrid'
import CoordGrid, { type CoordLine, type CoordCurve } from '@/components/teen/CoordGrid'

const BAND: AgeBand = '15-16'

// ── shared helpers ─────────────────────────────────────────────────────────
const rint = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]
const shuffle = <T,>(a: T[]): T[] => [...a].sort(() => Math.random() - 0.5)
const toChoice = (v: string | number): Choice => ({ value: v, label: String(v) })

function strChoices(answer: string, distractors: string[]): Choice[] {
  const set = new Set<string>([answer])
  for (const d of distractors) { if (set.size >= 4) break; set.add(d) }
  return shuffle([...set]).map(toChoice)
}

function numChoices(answer: number, distractors: number[]): Choice[] {
  const set = new Set<number>([answer])
  for (const d of distractors) { if (set.size >= 4) break; if (Number.isFinite(d)) set.add(d) }
  let guard = 0
  while (set.size < 3 && guard++ < 50) set.add(answer + rint(-3, 3))
  return shuffle([...set]).map(toChoice)
}

// What kind of visual the round needs (so practice can render it generically).
export interface RoundGraph {
  xRange: [number, number]
  yRange: [number, number]
  step?: number
  lines?: CoordLine[]
  curves?: CoordCurve[]
  points?: Pt[]
}

export interface Round {
  promptText: string
  say: string
  choices: Choice[]
  answer: string | number
  graph?: RoundGraph
  explain: string   // re-teach line (spoken)
}

/** Difficulty-aware round generator. */
export function makeRound(d: 1 | 2 | 3): Round {
  // ── L1: is-it-a-function & evaluate f(x) ─────────────────────────────────
  if (d === 1) {
    if (Math.random() < 0.5) {
      // Evaluate a linear function f(x) = m·x + c at a given input.
      const m = rint(2, 5)
      const c = rint(-4, 4)
      const x = rint(-3, 4)
      const ans = m * x + c
      const cs = c < 0 ? `− ${Math.abs(c)}` : `+ ${c}`
      return {
        promptText: `f(x) = ${m}x ${cs}.  What is f(${x})?`,
        say: `If f of x equals ${m} x ${c < 0 ? 'minus' : 'plus'} ${Math.abs(c)}, what is f of ${x}?`,
        choices: numChoices(ans, [m * x - c, m + x + c, ans + m, ans - 1]),
        answer: ans,
        explain: `Substitute x = ${x}: ${m}·(${x}) ${c < 0 ? '−' : '+'} ${Math.abs(c)} = ${ans}.`,
      }
    }
    // Is it a function? (each input has exactly one output)
    const isFn = Math.random() < 0.5
    const a = rint(1, 4), b = rint(5, 8)
    const set = isFn
      ? `{(1, ${a}), (2, ${b}), (3, ${a + 2})}`
      : `{(1, ${a}), (1, ${b}), (2, ${a + 1})}`   // input 1 repeats → not a function
    const ans = isFn ? 'Function' : 'Not a function'
    return {
      promptText: `Is this set a function?\n${set}`,
      say: 'Is this set of pairs a function? Each input may map to only one output.',
      choices: [toChoice('Function'), toChoice('Not a function')],
      answer: ans,
      explain: isFn
        ? 'Every input appears once, so each input has exactly one output — it is a function.'
        : 'The input 1 maps to two different outputs, so it is not a function.',
    }
  }

  // ── L2: domain / range / intercepts from a graph ─────────────────────────
  if (d === 2) {
    const kind = pick(['yintercept', 'xintercept', 'fofx'] as const)
    const m = pick([1, 2, -1, -2])
    const yint = rint(-3, 3)
    const line: CoordLine = { kind: 'line', m, b: yint }
    const graph: RoundGraph = { xRange: [-6, 6], yRange: [-6, 6], lines: [line] }

    if (kind === 'yintercept') {
      return {
        promptText: 'Read the graph. What is the y-intercept?',
        say: 'Look at the line. What is its y-intercept — where it crosses the y-axis?',
        choices: numChoices(yint, [yint + 1, yint - 1, -yint, yint + 2]),
        answer: yint,
        graph,
        explain: `The line crosses the y-axis at y = ${yint}, so the y-intercept is ${yint}.`,
      }
    }
    if (kind === 'xintercept') {
      // x-intercept where y = 0  →  x = -b/m ; keep it a whole number.
      const slope = pick([1, -1])
      const xint = rint(-3, 3)
      const bb = -slope * xint
      return {
        promptText: 'Read the graph. What is the x-intercept?',
        say: 'Look at the line. What is its x-intercept — where it crosses the x-axis?',
        choices: numChoices(xint, [xint + 1, xint - 1, bb, -xint]),
        answer: xint,
        graph: { xRange: [-6, 6], yRange: [-6, 6], lines: [{ kind: 'line', m: slope, b: bb }] },
        explain: `Set y = 0: the line meets the x-axis at x = ${xint}.`,
      }
    }
    // read f(x) off the line at an integer input. Keep |xq| = 1 so the answer
    // (≤ |m|·1 + |yint| = 5) always lands inside the [-6, 6] grid and is readable
    // off the drawn line — no point lands off-canvas.
    const xq = pick([1, -1])
    const ans = m * xq + yint
    return {
      promptText: `Use the graph: what is f(${xq})?`,
      say: `Use the line. What is f of ${xq} — the y-value when x is ${xq}?`,
      choices: numChoices(ans, [ans + 1, ans - 1, m * xq - yint, -ans]),
      answer: ans,
      graph,
      explain: `At x = ${xq} the line is at y = ${ans}, so f(${xq}) = ${ans}.`,
    }
  }

  // ── L3: linear vs exponential, growth/decay, geometric sequences ─────────
  const mode = pick(['classify', 'growthdecay', 'sequence'] as const)

  if (mode === 'classify') {
    // Show a line and a curve; ask which is exponential (the curved one).
    const a = pick([2, 3])
    const linM = pick([1, 2])
    const graph: RoundGraph = {
      xRange: [0, 6], yRange: [0, 16], step: 2,
      lines: [{ kind: 'line', m: linM, b: 0 }],
      curves: [{ kind: 'curve', fn: (x: number) => Math.pow(a, x) }],
    }
    return {
      promptText: 'One graph grows by ADDING each step, one by MULTIPLYING. Which equation is exponential?',
      say: 'One model adds the same amount each step, the other multiplies. Which equation is the exponential one?',
      choices: strChoices(`y = ${a}ˣ`, [`y = ${linM}x`, `y = ${linM}x + ${a}`, `y = x + ${a}`]),
      answer: `y = ${a}ˣ`,
      graph,
      explain: `Multiplying by a fixed base each step is exponential: y = ${a}ˣ. The straight line y = ${linM}x is linear.`,
    }
  }

  if (mode === 'growthdecay') {
    const grow = Math.random() < 0.5
    const base = grow ? pick([2, 3]) : null
    const baseStr = grow ? `${base}` : '0.5'   // y = a·bˣ ; b>1 grows, 0<b<1 decays
    const ans = grow ? 'Growth' : 'Decay'
    return {
      promptText: `In y = 100·(${baseStr})ˣ, is this growth or decay?`,
      say: `In the model y equals 100 times ${grow ? base : 'one half'} to the x, is this exponential growth or decay?`,
      choices: [toChoice('Growth'), toChoice('Decay')],
      answer: ans,
      explain: grow
        ? `The base ${base} is greater than 1, so the amount multiplies up each step — growth.`
        : 'The base 0.5 is between 0 and 1, so each step halves the amount — decay.',
    }
  }

  // continue a geometric sequence (multiply by a constant ratio)
  const start = pick([1, 2, 3])
  const r = pick([2, 3])
  const seq = [start, start * r, start * r * r]
  const ans = start * r * r * r
  return {
    promptText: `Continue the pattern: ${seq.join(', ')}, ___`,
    say: `Continue this geometric sequence: ${seq.join(', ')}. What comes next?`,
    // ans = seq[2]·r. Distractors: the "add the last gap" error (seq[2] + the
    // arithmetic difference) plus near-misses. Avoid seq[2]*2, which equals ans
    // whenever r === 2.
    choices: numChoices(ans, [seq[2] + (seq[2] - seq[1]), ans + r, ans - r, seq[2] + r]),
    answer: ans,
    explain: `Each term multiplies by ${r}, so the next term is ${seq[2]} × ${r} = ${ans}.`,
  }
}

// ── FunctionWatch: a narrated worked example, optionally over a graph ───────
export function FunctionWatch({
  lines, graph, onDone,
}: {
  lines: string[]; graph?: RoundGraph; onDone: () => void
}) {
  const doneRef = useRef(onDone)
  doneRef.current = onDone
  useEffect(() => {
    const cancel = speakSeq(lines, { onDone: () => window.setTimeout(() => doneRef.current(), 1200) })
    return cancel
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, width: '100%' }}>
      {graph && (
        <div style={{ width: '100%', maxWidth: 360 }}>
          <CoordGrid
            band={BAND}
            xRange={graph.xRange}
            yRange={graph.yRange}
            step={graph.step}
            mode="read"
            lines={graph.lines}
            curves={graph.curves}
            points={graph.points}
          />
        </div>
      )}
      <p style={{ margin: 0, maxWidth: 520, textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 15, lineHeight: 1.5, color: 'var(--ink-soft)' }}>
        {lines[lines.length - 1]}
      </p>
    </div>
  )
}

// A one-question check inside the lesson (retry allowed, no penalty).
function FunctionAsk({ prompt, say, choices, answer, onDone }: {
  prompt: string; say: string; choices: Choice[]; answer: string | number; onDone: () => void
}) {
  const [selected, setSelected] = React.useState<string | number | null>(null)
  const [status, setStatus] = React.useState<'idle' | 'correct' | 'wrong'>('idle')
  const spokenRef = useRef(false)
  useEffect(() => { if (!spokenRef.current) { spokenRef.current = true; speak(say) } }, []) // eslint-disable-line
  function choose(v: string | number) {
    if (status === 'correct') return
    setSelected(v)
    if (v === answer) { setStatus('correct'); speak('Yes — that’s it.'); window.setTimeout(onDone, 1400) }
    else { setStatus('wrong'); speak('Not quite — take another look.'); window.setTimeout(() => { setSelected(null); setStatus('idle') }, 1200) }
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%' }}>
      <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 18, fontWeight: 600, color: 'var(--ink)', textAlign: 'center' }}>{prompt}</p>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <ChoiceGrid band={BAND} choices={choices} selected={selected} status={status} correctValue={answer} onPick={choose} columns={2} />
      </div>
    </div>
  )
}

interface Props { band?: AgeBand; childName: string; onLessonComplete: () => void }

export default function FunctionsFamiliesTeenLesson({ childName, onLessonComplete }: Props) {
  // Freeze the randomized check so the lesson is stable across re-renders.
  const check = React.useMemo(() => {
    const a = 3
    return {
      prompt: 'Which equation is exponential?',
      say: 'Which of these is an exponential function — one that multiplies by a fixed base each step?',
      choices: strChoices(`y = ${a}ˣ`, ['y = 2x', 'y = 2x + 3', 'y = x + 3']),
      answer: `y = ${a}ˣ`,
    }
  }, [])

  const steps: LessonStep[] = [
    {
      bubble: 'A function gives each input exactly one output. Watch.', mood: 'happy',
      render: (done) => (
        <FunctionWatch
          lines={[
            'A function is a rule: put in an x, get exactly one y back.',
            'We write it f of x. So f of x equals 2x plus 1 means: double the input, then add one.',
          ]}
          onDone={done}
        />
      ),
    },
    {
      bubble: 'Evaluate by substituting. Watch.', mood: 'thinking',
      render: (done) => (
        <FunctionWatch
          lines={[
            'To find f of 3, put 3 in place of x.',
            'f of x equals 2x plus 1, so f of 3 equals 2 times 3 plus 1, which is 7.',
          ]}
          onDone={done}
        />
      ),
    },
    {
      bubble: 'Read features straight off a graph. Watch.', mood: 'happy',
      render: (done) => (
        <FunctionWatch
          lines={[
            'The y-intercept is where the line crosses the y-axis.',
            'This line crosses at y equals 2, so its y-intercept is 2.',
          ]}
          graph={{ xRange: [-6, 6], yRange: [-6, 6], lines: [{ kind: 'line', m: 1, b: 2 }] }}
          onDone={done}
        />
      ),
    },
    {
      bubble: 'Two families: linear adds, exponential multiplies. Watch.', mood: 'thinking',
      render: (done) => (
        <FunctionWatch
          lines={[
            'A linear function adds the same amount each step — a straight line.',
            'An exponential function multiplies by a fixed base each step — it bends upward and overtakes the line.',
          ]}
          graph={{
            xRange: [0, 6], yRange: [0, 16], step: 2,
            lines: [{ kind: 'line', m: 2, b: 0 }],
            curves: [{ kind: 'curve', fn: (x: number) => Math.pow(2, x) }],
          }}
          onDone={done}
        />
      ),
    },
    {
      bubble: 'Your turn.', mood: 'thinking',
      render: (done) => (
        <FunctionAsk prompt={check.prompt} say={check.say} choices={check.choices} answer={check.answer} onDone={done} />
      ),
    },
  ]

  return (
    <TeenLessonShell
      band={BAND}
      childName={childName}
      chapterTitle="Functions: Linear & Exponential"
      steps={steps}
      finalSpeech={`Nice work, ${childName}. You can spot a function, evaluate it, read it off a graph, and tell linear from exponential. Let’s ship the model.`}
      onLessonComplete={onLessonComplete}
    />
  )
}
