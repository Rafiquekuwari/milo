'use client'
/**
 * GeometryTransformationsTeenLesson (15–16, "Field Lab" / Commission) — the
 * worked-example walkthrough for Geometry: Mensuration & Transformations. Built
 * on TeenLessonShell (the teen LessonScaffold): a few narrated "watch" steps,
 * then a quick check. Exports the round generator + TransformWatch so the
 * practice chapter and its re-teach reuse them. Mirrors the
 * SlopeLinearGraphsTeenLesson pattern, in 15–16 chrome (dark skin via data-band
 * on the ancestor portal).
 *
 * Curriculum ramp (id "geometryTransformations"):
 *   L1 — circle circumference / area, arc & sector
 *   L2 — surface area / volume of prisms, cylinders, cones, spheres
 *   L3 — translate / reflect / rotate / dilate on the grid + identify the rule, midpoint
 *
 * Answer surfaces: ChoiceGrid (π-/irrational mensuration values → MCQ, never
 * free-text) and CoordGrid read mode (tap the image vertex of a transformation).
 * Numbers in --font-numeric; wrong is amber, never red.
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
/** Spoken signed integer: "negative four". */
export const spoken = (n: number) => (n < 0 ? `negative ${Math.abs(n)}` : `${n}`)
const shuffle = <T,>(a: T[]): T[] => [...a].sort(() => Math.random() - 0.5)

/** A value as a multiple of π, e.g. 10π. Keeps mensuration answers exact (no rounding). */
export const piStr = (k: number) => `${k}π`
const toStrChoice = (s: string): Choice => ({ value: s, label: s })
const toNumChoice = (v: number): Choice => ({ value: v, label: fmtInt(v) })

function choicesFromStrs(answer: string, distractors: string[]): Choice[] {
  const set = new Set<string>([answer])
  for (const v of distractors) { if (set.size >= 4) break; if (v && v !== answer) set.add(v) }
  return shuffle([...set]).map(toStrChoice)
}

/**
 * Build 4 distinct π-multiple choices from integer coefficients. Dedupes the
 * given distractor coefficients and ALWAYS backfills to 4 (perturbing the
 * answer coefficient by ±) so a collision never leaves fewer than four choices.
 */
function choicesFromPi(answerK: number, distractorKs: number[]): Choice[] {
  const set = new Set<number>([answerK])
  for (const k of distractorKs) { if (set.size >= 4) break; if (k > 0 && k !== answerK) set.add(k) }
  let delta = 1
  let guard = 0
  while (set.size < 4 && guard++ < 50) {
    const cand = answerK + delta
    if (cand > 0) set.add(cand)
    delta = delta > 0 ? -delta : -delta + 1 // 1, -1, 2, -2, 3, ...
  }
  return shuffle([...set]).map((k) => toStrChoice(piStr(k)))
}

function choicesFromNums(answer: number, distractors: number[]): Choice[] {
  const set = new Set<number>([answer])
  for (const v of distractors) { if (set.size >= 4) break; if (Number.isFinite(v) && v !== answer) set.add(v) }
  let guard = 0
  while (set.size < 4 && guard++ < 50) set.add(answer + rint(-4, 4))
  return shuffle([...set]).map(toNumChoice)
}

// Transformation application (image of a single point).
export type Axis = 'x' | 'y'
function translatePt(p: Pt, dx: number, dy: number): Pt { return { x: p.x + dx, y: p.y + dy } }
function reflectPt(p: Pt, axis: Axis): Pt {
  return axis === 'x' ? { x: p.x, y: -p.y } : { x: -p.x, y: p.y }
}
function dilatePt(p: Pt, k: number): Pt { return { x: p.x * k, y: p.y * k } }

// ── Round type ──────────────────────────────────────────────────────────────
// `kind` decides which answer surface the practice frame renders:
//   'choice' → ChoiceGrid (mensuration values, rule labels)
//   'grid'   → CoordGrid read mode (tap the image vertex / midpoint)
export interface Round {
  kind: 'grid' | 'choice'
  promptText: string
  say: string
  answer: number | string
  // CoordGrid context (transformation rounds).
  grid?: {
    range: number
    points?: Pt[]      // pre-image vertices shown as context
    target?: Pt        // the correct lattice point to tap
  }
  choices?: Choice[]
  explain: string // re-teach line
}

/** Difficulty-aware round generator. */
export function makeRound(d: 1 | 2 | 3): Round {
  // ── L1: circle circumference / area, arc & sector (exact, as multiples of π) ──
  if (d === 1) {
    const r = rint(2, 9)
    const pick = Math.random()
    if (pick < 0.4) {
      // Circumference C = 2πr.
      const k = 2 * r
      return {
        kind: 'choice',
        promptText: `A circle has radius ${r}. What is its circumference?`,
        say: `A circle has radius ${r}. What is its circumference? Use C equals two pi r.`,
        answer: piStr(k),
        choices: choicesFromPi(k, [r, r * r, k + 2]),
        explain: `Circumference is 2πr = 2 × π × ${r} = ${piStr(k)}.`,
      }
    }
    if (pick < 0.8) {
      // Area A = πr².
      const k = r * r
      return {
        kind: 'choice',
        promptText: `A circle has radius ${r}. What is its area?`,
        say: `A circle has radius ${r}. What is its area? Use A equals pi r squared.`,
        answer: piStr(k),
        choices: choicesFromPi(k, [2 * r, k - r, k + r]),
        explain: `Area is πr² = π × ${r}² = ${piStr(k)}.`,
      }
    }
    // Sector area = (θ/360)·πr². Pick θ and a radius so k = (θ/360)·r² is a
    // whole number: 180° → r even (½r²); 90° → r even (¼r² with r=2m); 120° → r
    // a multiple of 3 (⅓r²).
    const [deg, sr] = ([
      [180, 2 * rint(1, 4)],
      [90, 2 * rint(1, 4)],
      [120, 3 * rint(1, 3)],
    ] as [number, number][])[rint(0, 2)]
    const k = (deg * sr * sr) / 360 // integer by construction (avoids 1/3 float error)
    return {
      kind: 'choice',
      promptText: `A ${deg}° sector is cut from a circle of radius ${sr}. What is the sector's area?`,
      say: `A ${deg} degree sector is cut from a circle of radius ${sr}. What is its area?`,
      answer: piStr(k),
      choices: choicesFromPi(k, [sr * sr, k * 2, 2 * sr]),
      explain: `A ${deg}° sector is ${deg}/360 of the circle: (${deg}/360) × π × ${sr}² = ${piStr(k)}.`,
    }
  }

  // ── L2: surface area / volume of prisms, cylinders, cones, spheres ──
  if (d === 2) {
    const which = rint(0, 3)
    if (which === 0) {
      // Rectangular prism volume = l·w·h.
      const l = rint(2, 6), w = rint(2, 6), h = rint(2, 6)
      const v = l * w * h
      return {
        kind: 'choice',
        promptText: `A box measures ${l} × ${w} × ${h}. What is its volume?`,
        say: `A box measures ${l} by ${w} by ${h}. What is its volume?`,
        answer: v,
        choices: choicesFromNums(v, [l + w + h, 2 * (l * w + l * h + w * h), l * w * h + l]),
        explain: `Volume of a box is length × width × height = ${l} × ${w} × ${h} = ${v}.`,
      }
    }
    if (which === 1) {
      // Cylinder volume = πr²h.
      const r = rint(2, 5), h = rint(2, 6)
      const k = r * r * h
      return {
        kind: 'choice',
        promptText: `A cylinder has radius ${r} and height ${h}. What is its volume?`,
        say: `A cylinder has radius ${r} and height ${h}. What is its volume? Use pi r squared h.`,
        answer: piStr(k),
        choices: choicesFromPi(k, [r * r, 2 * r * h, r * h]),
        explain: `Cylinder volume is πr²h = π × ${r}² × ${h} = ${piStr(k)}.`,
      }
    }
    if (which === 2) {
      // Cone volume = (1/3)πr²h, choose r,h so it is a clean multiple of π.
      const r = rint(2, 6)
      const h = 3 * rint(1, 3) // multiple of 3 so /3 is integer
      const k = (r * r * h) / 3
      return {
        kind: 'choice',
        promptText: `A cone has radius ${r} and height ${h}. What is its volume?`,
        say: `A cone has radius ${r} and height ${h}. What is its volume? Use one third pi r squared h.`,
        answer: piStr(k),
        // r·r·h is the un-thirded cylinder volume (the classic ×3 slip); r·r and
        // r·r·h/2 round it out. choicesFromPi dedupes + backfills to 4.
        choices: choicesFromPi(k, [r * r * h, r * r, Math.round((r * r * h) / 2)]),
        explain: `Cone volume is ⅓πr²h = (1/3) × π × ${r}² × ${h} = ${piStr(k)}.`,
      }
    }
    // Sphere volume = (4/3)πr³, choose r a multiple of 3 so it is clean.
    const r = 3 * rint(1, 2)
    const k = (4 * r * r * r) / 3
    return {
      kind: 'choice',
      promptText: `A sphere has radius ${r}. What is its volume?`,
      say: `A sphere has radius ${r}. What is its volume? Use four thirds pi r cubed.`,
      answer: piStr(k),
      // r³ (forgot the 4/3) and 4r³ (forgot the /3) are the common slips;
      // choicesFromPi dedupes any overlap with k and backfills to 4.
      choices: choicesFromPi(k, [r * r * r, 4 * r * r * r, 4 * r * r]),
      explain: `Sphere volume is ⁴⁄₃πr³ = (4/3) × π × ${r}³ = ${piStr(k)}.`,
    }
  }

  // ── L3: transformations on the grid + identify the rule, midpoint ──
  const which = rint(0, 3)

  if (which === 0) {
    // Tap the image of a vertex after a translation.
    const range = 8
    const src: Pt = { x: rint(-4, 1), y: rint(-4, 1) }
    const dx = rint(1, 4), dy = rint(1, 4)
    const img = translatePt(src, dx, dy)
    return {
      kind: 'grid',
      promptText: `Translate the point (${fmtInt(src.x)}, ${fmtInt(src.y)}) by (x + ${dx}, y + ${dy}). Tap the image.`,
      say: `Translate the marked point ${dx} right and ${dy} up. Tap where the image lands.`,
      answer: `${img.x},${img.y}`,
      grid: { range, points: [src], target: img },
      explain: `Add ${dx} to x and ${dy} to y: (${fmtInt(src.x + dx)}, ${fmtInt(src.y + dy)}).`,
    }
  }

  if (which === 1) {
    // Tap the image of a vertex after a reflection.
    const range = 8
    const axis: Axis = Math.random() < 0.5 ? 'x' : 'y'
    let src: Pt = { x: rint(-5, 5), y: rint(-5, 5) }
    let guard = 0
    while ((src.x === 0 || src.y === 0) && guard++ < 20) src = { x: rint(-5, 5), y: rint(-5, 5) }
    const img = reflectPt(src, axis)
    return {
      kind: 'grid',
      promptText: `Reflect (${fmtInt(src.x)}, ${fmtInt(src.y)}) across the ${axis}-axis. Tap the image.`,
      say: `Reflect the marked point across the ${axis === 'x' ? 'x' : 'y'} axis. Tap where the image lands.`,
      answer: `${img.x},${img.y}`,
      grid: { range, points: [src], target: img },
      explain: axis === 'x'
        ? `Reflecting across the x-axis flips the sign of y: (${fmtInt(src.x)}, ${fmtInt(img.y)}).`
        : `Reflecting across the y-axis flips the sign of x: (${fmtInt(img.x)}, ${fmtInt(src.y)}).`,
    }
  }

  if (which === 2) {
    // Identify the rule that maps pre-image → image (choice).
    const dx = rint(1, 4), ady = rint(1, 4)
    const ans = `(x + ${dx}, y − ${ady})`
    // Each distractor flips at least one sign relative to the answer, so none can
    // coincide with it even when dx === ady. (−x, −y) is the point-reflection slip.
    const wrongs = [
      `(x − ${dx}, y + ${ady})`,   // both signs flipped (moved the wrong way)
      `(x + ${dx}, y + ${ady})`,   // down read as up (y sign slip)
      `(−x, −y)`,                   // confused with a 180° rotation
    ]
    return {
      kind: 'choice',
      promptText: `A shape moves so every point (x, y) lands at (x + ${dx}, y − ${ady}). Which describes the transformation?`,
      say: `Every point moves ${dx} right and ${ady} down. Which rule describes that translation?`,
      answer: ans,
      choices: choicesFromStrs(ans, wrongs),
      explain: `Right means add to x, down means subtract from y: ${ans}.`,
    }
  }

  // Midpoint of a segment (tap the lattice midpoint).
  const range = 8
  // Force an even sum so the midpoint is a lattice point.
  const a: Pt = { x: rint(-5, 5), y: rint(-5, 5) }
  let b: Pt = { x: rint(-5, 5), y: rint(-5, 5) }
  let guard = 0
  while (((a.x + b.x) % 2 !== 0 || (a.y + b.y) % 2 !== 0 || (a.x === b.x && a.y === b.y)) && guard++ < 60) {
    b = { x: rint(-5, 5), y: rint(-5, 5) }
  }
  const mid: Pt = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
  return {
    kind: 'grid',
    promptText: `Tap the midpoint of the segment from (${fmtInt(a.x)}, ${fmtInt(a.y)}) to (${fmtInt(b.x)}, ${fmtInt(b.y)}).`,
    say: `Find the midpoint of the segment between the two marked points, then tap it.`,
    answer: `${mid.x},${mid.y}`,
    grid: { range, points: [a, b], target: mid },
    explain: `The midpoint averages the coordinates: ((${fmtInt(a.x)} + ${fmtInt(b.x)})/2, (${fmtInt(a.y)} + ${fmtInt(b.y)})/2) = (${fmtInt(mid.x)}, ${fmtInt(mid.y)}).`,
  }
}

// ── TransformWatch: a narrated worked example (reused for re-teach) ──
// Renders a CoordGrid (with optional context points) when `range` is given,
// otherwise just narrates the lines — so it works for both transformation and
// mensuration explanations.
export function TransformWatch({
  lines, range, points, onDone,
}: {
  lines: string[]; range?: number; points?: Pt[]; onDone: () => void
}) {
  const doneRef = useRef(onDone)
  doneRef.current = onDone
  useEffect(() => {
    const cancel = speakSeq(lines, { onDone: () => window.setTimeout(() => doneRef.current(), 1200) })
    return cancel
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, width: '100%' }}>
      {range != null && (
        <div style={{ width: '100%', maxWidth: 360 }}>
          <CoordGrid band={BAND} xRange={[-range, range]} yRange={[-range, range]} mode="read" points={points} />
        </div>
      )}
      <p style={{ margin: 0, maxWidth: 520, textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 15, lineHeight: 1.5, color: 'var(--ink-soft)' }}>
        {lines[lines.length - 1]}
      </p>
    </div>
  )
}

// A one-question check inside the lesson (retry allowed, no penalty).
function TransformAsk({ prompt, say, choices, answer, onDone }: {
  prompt: string; say: string; choices: Choice[]; answer: string | number; onDone: () => void
}) {
  const [selected, setSelected] = React.useState<string | number | null>(null)
  const [status, setStatus] = React.useState<'idle' | 'correct' | 'wrong'>('idle')
  const spokenRef = useRef(false)
  useEffect(() => { if (!spokenRef.current) { spokenRef.current = true; speak(say) } }, []) // eslint-disable-line
  function pick(v: string | number) {
    if (status === 'correct') return
    setSelected(v)
    if (v === answer) { setStatus('correct'); speak('Exactly — that is it.'); window.setTimeout(onDone, 1400) }
    else { setStatus('wrong'); speak('Not quite — take another look at the rule.'); window.setTimeout(() => { setSelected(null); setStatus('idle') }, 1300) }
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

export default function GeometryTransformationsTeenLesson({ childName, onLessonComplete }: Props) {
  const steps: LessonStep[] = [
    {
      bubble: 'Round shapes run on π. Two formulas carry the circle. Watch.', mood: 'happy',
      render: (d) => (
        <TransformWatch
          lines={[
            'A circle of radius r has circumference 2πr — the distance all the way around.',
            'Its area is π r squared. So radius 3 gives circumference 6π and area 9π.',
          ]}
          onDone={d}
        />
      ),
    },
    {
      bubble: 'Solids add a third dimension — fill them up. Watch.', mood: 'thinking',
      render: (d) => (
        <TransformWatch
          lines={[
            'A cylinder is a circle pushed up: volume is the base area π r squared times the height.',
            'A cone is one third of that cylinder, and a sphere is four thirds π r cubed.',
          ]}
          onDone={d}
        />
      ),
    },
    {
      bubble: 'On the grid, a transformation just moves every point by a rule. Watch.', mood: 'happy',
      render: (d) => (
        <TransformWatch
          range={6}
          points={[{ x: 2, y: 1 }]}
          lines={[
            'Translate the point (2, 1) by adding 3 to x and 2 to y.',
            'It lands at (5, 3) — same size, same shape, just slid across.',
          ]}
          onDone={d}
        />
      ),
    },
    {
      bubble: 'Reflecting flips a sign. Watch.', mood: 'thinking',
      render: (d) => (
        <TransformWatch
          range={6}
          points={[{ x: 3, y: 2 }]}
          lines={[
            'Reflect (3, 2) across the x-axis — the x stays, the y flips sign.',
            'So the image is (3, negative 2). Reflecting across the y-axis would flip x instead.',
          ]}
          onDone={d}
        />
      ),
    },
    {
      bubble: 'Your turn.', mood: 'thinking',
      render: (d) => (
        <TransformAsk
          prompt="Reflect the point (4, −1) across the x-axis. Where does it land?"
          say="Reflect the point four, negative one across the x-axis. Where does it land?"
          choices={[
            { value: '(4, 1)', label: '(4, 1)' },
            { value: '(−4, −1)', label: '(−4, −1)' },
            { value: '(−4, 1)', label: '(−4, 1)' },
            { value: '(1, 4)', label: '(1, 4)' },
          ]}
          answer="(4, 1)"
          onDone={d}
        />
      ),
    },
  ]
  return (
    <TeenLessonShell
      band={BAND}
      childName={childName}
      chapterTitle="Mensuration & Transformations"
      steps={steps}
      finalSpeech={`Good work, ${childName}. You can measure circles and solids and move shapes around the grid by a rule. Time to ship the commission.`}
      onLessonComplete={onLessonComplete}
    />
  )
}
