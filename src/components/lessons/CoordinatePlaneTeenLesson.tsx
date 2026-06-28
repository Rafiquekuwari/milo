'use client'
/**
 * CoordinatePlaneTeenLesson (12–14, "Field Lab") — the worked-example walkthrough
 * for "Mapping the Field" (the coordinate-plane investigation). Built on
 * TeenLessonShell: a few "watch" steps narrated over a CoordGrid, then a quick
 * check. Exports the round generator + CoordWatch so the practice chapter and
 * its re-teach reuse them. Mirrors IntegersTeenLesson, in teen chrome.
 *
 * Difficulty ramp (from docs/curriculum-12-18.md, id "coordinatePlane"):
 *   L1 — identify a plotted point & name its quadrant (read mode / MCQ)
 *   L2 — plot a given ordered pair by tapping (plot mode)
 *   L3 — distance on a shared axis + reflection across an axis (numeric + plot)
 */
import React, { useEffect, useRef } from 'react'
import { speak, speakSeq } from '@/lib/useMiloSpeaker'
import type { LessonStep } from '@/components/lessons/_kit'
import type { AgeBand, Choice, Pt } from '@/components/teen/types'
import TeenLessonShell from '@/components/teen/TeenLessonShell'
import CoordGrid from '@/components/teen/CoordGrid'
import ChoiceGrid from '@/components/teen/ChoiceGrid'

const BAND: AgeBand = '12-14'

// ── shared helpers (reused by the practice chapter) ────────────────────────
const rint = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))
/** A non-zero integer in [lo,hi] (so points land cleanly in a quadrant). */
const rnz = (lo: number, hi: number) => {
  let v = rint(lo, hi)
  let guard = 0
  while (v === 0 && guard++ < 50) v = rint(lo, hi)
  return v
}
const shuffle = <T,>(a: T[]): T[] => [...a].sort(() => Math.random() - 0.5)
export const fmtPt = (p: Pt) => `(${p.x}, ${p.y})`
export const spokenPt = (p: Pt) =>
  `${p.x < 0 ? `negative ${Math.abs(p.x)}` : p.x}, ${p.y < 0 ? `negative ${Math.abs(p.y)}` : p.y}`

/** Quadrant name for a point with non-zero coords. */
export function quadrantOf(p: Pt): string {
  if (p.x === 0 || p.y === 0) return 'On an axis'
  if (p.x > 0 && p.y > 0) return 'Quadrant I'
  if (p.x < 0 && p.y > 0) return 'Quadrant II'
  if (p.x < 0 && p.y < 0) return 'Quadrant III'
  return 'Quadrant IV'
}

const QUADS = ['Quadrant I', 'Quadrant II', 'Quadrant III', 'Quadrant IV']

const ptsEqual = (a: Pt | null | undefined, b: Pt | null | undefined) =>
  !!a && !!b && a.x === b.x && a.y === b.y

// ── Round shape ────────────────────────────────────────────────────────────
// A round is either a tap-the-grid task ('plot'/'read') or an MCQ (quadrant /
// numeric distance). The practice chapter renders the right surface off `kind`.
export type RoundKind = 'read' | 'plot' | 'quadrant' | 'distance' | 'reflect'

export interface Round {
  kind: RoundKind
  promptText: string
  say: string
  explain: string // re-teach line
  // grid context
  range: number // grid spans [-range, range] both axes
  target: Pt // the point in play (the answer for read/plot/reflect)
  points?: Pt[] // pre-plotted context points (read mode)
  highlight?: Pt | null // the feature to tap (read mode)
  // MCQ context (quadrant / distance)
  choices?: Choice[]
  answer?: string | number // MCQ answer (quadrant string OR numeric distance)
}

/** Difficulty-aware round generator. L1 read/quadrant · L2 plot · L3 distance/reflect. */
export function makeRound(d: 1 | 2 | 3): Round {
  if (d === 1) {
    const range = 6
    const p: Pt = { x: rnz(-range, range), y: rnz(-range, range) }
    // Alternate: name the point that's shown, OR name its quadrant.
    if (Math.random() < 0.5) {
      // identify the plotted point (tap it on the grid)
      return {
        kind: 'read',
        promptText: 'Tap the point that has been marked.',
        say: `Find and tap the marked point at ${spokenPt(p)}.`,
        explain: `The marked point is ${fmtPt(p)} — go ${Math.abs(p.x)} ${p.x < 0 ? 'left' : 'right'}, then ${Math.abs(p.y)} ${p.y < 0 ? 'down' : 'up'}.`,
        range,
        target: p,
        highlight: p,
      }
    }
    // name the quadrant of the plotted point
    const ans = quadrantOf(p)
    return {
      kind: 'quadrant',
      promptText: `Which quadrant holds the point ${fmtPt(p)}?`,
      say: `Which quadrant holds the point ${spokenPt(p)}?`,
      explain: `${fmtPt(p)} has ${p.x > 0 ? 'a positive x' : 'a negative x'} and ${p.y > 0 ? 'a positive y' : 'a negative y'}, so it sits in ${ans}.`,
      range,
      target: p,
      points: [p],
      choices: QUADS.map((q) => ({ value: q, label: q })),
      answer: ans,
    }
  }

  if (d === 2) {
    // plot a given ordered pair by tapping
    const range = 6
    const p: Pt = { x: rnz(-range, range), y: rnz(-range, range) }
    return {
      kind: 'plot',
      promptText: `Plot the point ${fmtPt(p)}.`,
      say: `Plot the point ${spokenPt(p)}. Read the x first, then the y.`,
      explain: `From the origin, move ${Math.abs(p.x)} ${p.x < 0 ? 'left' : 'right'} along x, then ${Math.abs(p.y)} ${p.y < 0 ? 'down' : 'up'} along y — that lands on ${fmtPt(p)}.`,
      range,
      target: p,
    }
  }

  // d === 3 — distance on a shared axis OR reflect across an axis
  const range = 7
  if (Math.random() < 0.5) {
    // distance between two points that share an axis (same x or same y)
    const shareX = Math.random() < 0.5
    if (shareX) {
      const x = rint(-4, 4)
      let y1 = rint(-range, range)
      let y2 = rint(-range, range)
      let guard = 0
      while (y1 === y2 && guard++ < 50) y2 = rint(-range, range)
      const a: Pt = { x, y: y1 }
      const b: Pt = { x, y: y2 }
      const dist = Math.abs(y1 - y2)
      return {
        kind: 'distance',
        promptText: `How far apart are ${fmtPt(a)} and ${fmtPt(b)}?`,
        say: `These two points share the same x. How far apart are they?`,
        explain: `They share x = ${x}, so the distance is just the gap in y: |${y1} − (${y2})| = ${dist}.`,
        range,
        target: a,
        points: [a, b],
        choices: distanceChoices(dist),
        answer: dist,
      }
    }
    const y = rint(-4, 4)
    let x1 = rint(-range, range)
    let x2 = rint(-range, range)
    let guard = 0
    while (x1 === x2 && guard++ < 50) x2 = rint(-range, range)
    const a: Pt = { x: x1, y }
    const b: Pt = { x: x2, y }
    const dist = Math.abs(x1 - x2)
    return {
      kind: 'distance',
      promptText: `How far apart are ${fmtPt(a)} and ${fmtPt(b)}?`,
      say: `These two points share the same y. How far apart are they?`,
      explain: `They share y = ${y}, so the distance is just the gap in x: |${x1} − (${x2})| = ${dist}.`,
      range,
      target: a,
      points: [a, b],
      choices: distanceChoices(dist),
      answer: dist,
    }
  }

  // reflect a point across an axis (plot the image)
  const overX = Math.random() < 0.5 // true → reflect across the x-axis
  const src: Pt = { x: rnz(-range, range), y: rnz(-range, range) }
  const image: Pt = overX ? { x: src.x, y: -src.y } : { x: -src.x, y: src.y }
  return {
    kind: 'reflect',
    promptText: `Plot the reflection of ${fmtPt(src)} across the ${overX ? 'x-axis' : 'y-axis'}.`,
    say: `Reflect ${spokenPt(src)} across the ${overX ? 'x' : 'y'} axis, then plot its image.`,
    explain: overX
      ? `Reflecting across the x-axis flips the sign of y: ${fmtPt(src)} → ${fmtPt(image)}.`
      : `Reflecting across the y-axis flips the sign of x: ${fmtPt(src)} → ${fmtPt(image)}.`,
    range,
    target: image,
    points: [src],
    answer: fmtPt(image),
  }
}

/** Numeric distance distractors: off-by-one + the "added instead of subtracted" error. */
function distanceChoices(dist: number): Choice[] {
  const set = new Set<number>([dist])
  const cands = [dist + 1, dist - 1, dist + 2, Math.max(0, dist - 2)]
  for (const c of cands) {
    if (set.size >= 4) break
    if (c >= 0) set.add(c)
  }
  let guard = 0
  while (set.size < 4 && guard++ < 50) set.add(dist + rint(1, 5))
  return shuffle([...set]).map((v) => ({ value: v, label: String(v) }))
}

// ── CoordWatch: a narrated coordinate-grid worked example (reused for re-teach) ──
export function CoordWatch({
  lines,
  range,
  points = [],
  highlight = null,
  value = null,
  onDone,
}: {
  lines: string[]
  range: number
  points?: Pt[]
  highlight?: Pt | null
  value?: Pt | null
  onDone: () => void
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
        points={points}
        highlight={highlight}
        value={value}
        status={value ? 'correct' : 'idle'}
      />
      <p style={{ margin: 0, maxWidth: 520, textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 15, lineHeight: 1.5, color: 'var(--ink-soft)' }}>
        {lines[lines.length - 1]}
      </p>
    </div>
  )
}

// A one-question check inside the lesson (retry allowed, no penalty).
function QuadrantAsk({
  prompt,
  say,
  point,
  range,
  answer,
  onDone,
}: {
  prompt: string
  say: string
  point: Pt
  range: number
  answer: string
  onDone: () => void
}) {
  const [selected, setSelected] = React.useState<string | number | null>(null)
  const [status, setStatus] = React.useState<'idle' | 'correct' | 'wrong'>('idle')
  const spokenRef = useRef(false)
  useEffect(() => {
    if (!spokenRef.current) {
      spokenRef.current = true
      speak(say)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  function pick(v: string | number) {
    if (status === 'correct') return
    setSelected(v)
    if (v === answer) {
      setStatus('correct')
      speak('Yes — that’s the quadrant.')
      window.setTimeout(onDone, 1400)
    } else {
      setStatus('wrong')
      speak('Not quite — check the signs of x and y.')
      window.setTimeout(() => {
        setSelected(null)
        setStatus('idle')
      }, 1200)
    }
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%' }}>
      <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>{prompt}</p>
      <CoordGrid band={BAND} xRange={[-range, range]} yRange={[-range, range]} mode="read" points={[point]} />
      <div style={{ width: '100%', maxWidth: 360 }}>
        <ChoiceGrid band={BAND} choices={QUADS.map((q) => ({ value: q, label: q }))} selected={selected} status={status} correctValue={answer} onPick={pick} columns={2} />
      </div>
    </div>
  )
}

interface Props { band?: AgeBand; childName: string; onLessonComplete: () => void }

export default function CoordinatePlaneTeenLesson({ childName, onLessonComplete }: Props) {
  const steps: LessonStep[] = [
    {
      bubble: 'Every point on the map has an address: (x, y). Watch.',
      mood: 'happy',
      render: (d) => (
        <CoordWatch
          lines={[
            'The two axes cross at the origin, zero zero.',
            'A point’s address is its x first — left or right — then its y — up or down.',
          ]}
          range={6}
          highlight={{ x: 4, y: 3 }}
          points={[{ x: 4, y: 3 }]}
          onDone={d}
        />
      ),
    },
    {
      bubble: 'The signs tell you the quadrant.',
      mood: 'happy',
      render: (d) => (
        <CoordWatch
          lines={[
            'This point is negative three, two. x is negative, y is positive.',
            'Negative x with positive y lands you in Quadrant Two, the top-left.',
          ]}
          range={6}
          points={[{ x: -3, y: 2 }]}
          highlight={{ x: -3, y: 2 }}
          onDone={d}
        />
      ),
    },
    {
      bubble: 'Reflect across an axis: flip one sign.',
      mood: 'thinking',
      render: (d) => (
        <CoordWatch
          lines={[
            'Start at two, three. Reflect it across the x-axis.',
            'Across the x-axis the y flips sign: two, three becomes two, negative three.',
          ]}
          range={6}
          points={[{ x: 2, y: 3 }]}
          value={{ x: 2, y: -3 }}
          onDone={d}
        />
      ),
    },
    {
      bubble: 'Your turn.',
      mood: 'thinking',
      render: (d) => (
        <QuadrantAsk
          prompt="Which quadrant holds (−4, −2)?"
          say="Which quadrant holds the point negative four, negative two?"
          point={{ x: -4, y: -2 }}
          range={6}
          answer="Quadrant III"
          onDone={d}
        />
      ),
    },
  ]
  return (
    <TeenLessonShell
      band={BAND}
      childName={childName}
      chapterTitle="The Coordinate Plane"
      steps={steps}
      finalSpeech={`Nice work, ${childName}. You can read a point, name its quadrant, plot a pair, and reflect across an axis. Let’s map the field.`}
      onLessonComplete={onLessonComplete}
    />
  )
}

export { ptsEqual }
