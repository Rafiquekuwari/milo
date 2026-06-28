'use client'
/**
 * GeometryMeasurementTeenLesson (12–14, "Field Lab") — the worked-example
 * walkthrough for "Area, Volume & the Pythagorean Theorem" (id geometryMeasurement,
 * EXTEND ← areaPerimeter). Built on TeenLessonShell: a few narrated "watch" steps
 * over labelled FigureDiagrams, then a quick check. Exports the round generator +
 * FigureWatch so the practice chapter and its re-teach reuse them. Mirrors the
 * IntegersTeenLesson pattern, in teen chrome.
 *
 * Difficulty ramp (curriculum-12-18.md, id geometryMeasurement):
 *   L1 — area of triangle & parallelogram, perimeter
 *   L2 — circle area/circumference, prism surface area/volume
 *   L3 — Pythagorean missing side + composite area
 */
import React, { useEffect, useMemo, useRef } from 'react'
import { speak, speakSeq } from '@/lib/useMiloSpeaker'
import type { LessonStep } from '@/components/lessons/_kit'
import type { AgeBand, Choice } from '@/components/teen/types'
import TeenLessonShell from '@/components/teen/TeenLessonShell'
import FigureDiagram, { type FigureKind } from '@/components/teen/FigureDiagram'
import ChoiceGrid from '@/components/teen/ChoiceGrid'
import { numericEqual } from '@/components/teen/NumericEntry'

const BAND: AgeBand = '12-14'
const PI = 3.14

// ── shared helpers (reused by the practice chapter) ────────────────────────
const rint = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))
/** Round to 2 decimals so π-based answers compare cleanly with a small tolerance. */
const round2 = (n: number) => Math.round(n * 100) / 100
const shuffle = <T,>(a: T[]): T[] => [...a].sort(() => Math.random() - 0.5)

/** Build 4 MCQ choices for a formula question (answer + 3 plausible misreads). */
function formulaChoices(answer: string, distractors: string[]): Choice[] {
  const set: string[] = [answer]
  for (const d of distractors) { if (set.length >= 4) break; if (!set.includes(d)) set.push(d) }
  return shuffle(set).map((s) => ({ value: s, label: s }))
}

export type Input = 'numeric' | 'choice'

export interface Round {
  /** which answer surface this round uses */
  input: Input
  /** the figure to show (with its labels) */
  figure: { kind: FigureKind; labels: Record<string, string | number>; highlight?: string }
  promptText: string
  say: string
  /** the correct value (number for numeric rounds, string for choice rounds) */
  answer: number | string
  /** MCQ options (choice rounds only) */
  choices?: Choice[]
  /** unit suffix shown next to NumericEntry (numeric rounds) */
  suffix?: string
  /** re-teach narration line */
  explain: string
}

/** Tolerance grade for a numeric submission (handles the π≈3.14 rounding). */
export function gradeNumeric(submitted: number, answer: number): boolean {
  return numericEqual(submitted, answer, 0.05)
}

/** Difficulty-aware round generator: L1 area/perimeter · L2 circle/prism · L3 Pythagoras/composite. */
export function makeRound(d: 1 | 2 | 3): Round {
  if (d === 1) return makeL1()
  if (d === 2) return makeL2()
  return makeL3()
}

// ── L1: area of triangle & parallelogram, perimeter ────────────────────────
function makeL1(): Round {
  const pick = rint(0, 2)

  if (pick === 0) {
    // Triangle area = ½ · base · height (kept even so the half is clean).
    const base = rint(3, 12)
    const height = 2 * rint(2, 6)
    const ans = (base * height) / 2
    return {
      input: 'numeric',
      figure: { kind: 'triangle', labels: { base: `${base} cm`, height: `${height} cm` }, highlight: 'base' },
      promptText: `Find the area of this triangle (base = ${base} cm, height = ${height} cm).`,
      say: `Find the area of the triangle. Base ${base}, height ${height}. Area is one half base times height.`,
      answer: ans,
      suffix: 'cm²',
      explain: `Area of a triangle is ½ × base × height = ½ × ${base} × ${height} = ${ans} cm².`,
    }
  }

  if (pick === 1) {
    // Parallelogram area = base · height.
    const base = rint(4, 12)
    const height = rint(3, 9)
    const ans = base * height
    return {
      input: 'choice',
      figure: { kind: 'parallelogram', labels: { base: `${base} cm`, height: `${height} cm` } },
      promptText: 'Which expression gives the area of a parallelogram?',
      say: 'Which expression gives the area of a parallelogram?',
      answer: 'base × height',
      choices: formulaChoices('base × height', ['½ × base × height', 'base + height', '2 × (base + height)']),
      explain: `A parallelogram is a slid rectangle: area = base × height = ${base} × ${height} = ${ans} cm².`,
    }
  }

  // Rectangle perimeter = 2(w + h).
  const w = rint(3, 12)
  const h = rint(2, 9)
  const ans = 2 * (w + h)
  return {
    input: 'numeric',
    figure: { kind: 'rectangle', labels: { width: `${w} cm`, side: `${h} cm` } },
    promptText: `Find the perimeter of this rectangle (${w} cm by ${h} cm).`,
    say: `Find the perimeter of the rectangle, ${w} by ${h}. Add all four sides.`,
    answer: ans,
    suffix: 'cm',
    explain: `Perimeter adds every side: 2 × (${w} + ${h}) = ${ans} cm.`,
  }
}

// ── L2: circle area/circumference, prism surface area/volume ────────────────
function makeL2(): Round {
  const pick = rint(0, 3)

  if (pick === 0) {
    // Circle area = π r²  (π ≈ 3.14).
    const r = rint(2, 8)
    const ans = round2(PI * r * r)
    return {
      input: 'numeric',
      figure: { kind: 'circle', labels: { r: `r = ${r} cm` }, highlight: 'r' },
      promptText: `Find the area of this circle (r = ${r} cm). Use π ≈ 3.14.`,
      say: `Find the area of the circle, radius ${r}. Use pi about three point one four. Area is pi times radius squared.`,
      answer: ans,
      suffix: 'cm²',
      explain: `Area of a circle is π r² ≈ 3.14 × ${r}² = ${ans} cm².`,
    }
  }

  if (pick === 1) {
    // Circle circumference = π d  (π ≈ 3.14).
    const r = rint(2, 9)
    const dia = 2 * r
    const ans = round2(PI * dia)
    return {
      input: 'numeric',
      figure: { kind: 'circle', labels: { d: `d = ${dia} cm` }, highlight: 'd' },
      promptText: `Find the circumference of this circle (d = ${dia} cm). Use π ≈ 3.14.`,
      say: `Find the circumference of the circle, diameter ${dia}. Use pi about three point one four. Circumference is pi times diameter.`,
      answer: ans,
      suffix: 'cm',
      explain: `Circumference is π × diameter ≈ 3.14 × ${dia} = ${ans} cm.`,
    }
  }

  if (pick === 2) {
    // Rectangular prism volume = l · w · h.
    const l = rint(2, 8)
    const w = rint(2, 7)
    const hh = rint(2, 6)
    const ans = l * w * hh
    return {
      input: 'numeric',
      figure: { kind: 'prism', labels: { length: `${l} cm`, height: `${hh} cm`, depth: `${w} cm` } },
      promptText: `Find the volume of this box (${l} × ${w} × ${hh} cm).`,
      say: `Find the volume of the box, ${l} by ${w} by ${hh}. Volume is length times width times height.`,
      answer: ans,
      suffix: 'cm³',
      explain: `Volume of a box is length × width × height = ${l} × ${w} × ${hh} = ${ans} cm³.`,
    }
  }

  // Volume formula choice (prism).
  const l = rint(2, 8)
  const w = rint(2, 7)
  const hh = rint(2, 6)
  return {
    input: 'choice',
    figure: { kind: 'prism', labels: { length: `${l} cm`, height: `${hh} cm`, depth: `${w} cm` } },
    promptText: 'Which expression gives the volume of a rectangular box?',
    say: 'Which expression gives the volume of a rectangular box?',
    answer: 'length × width × height',
    choices: formulaChoices('length × width × height', [
      'length + width + height',
      '2 × (length + width + height)',
      'length × width',
    ]),
    explain: `Volume fills the inside: length × width × height = ${l} × ${w} × ${hh} = ${l * w * hh} cm³.`,
  }
}

// ── L3: Pythagorean missing side + composite area ──────────────────────────
// Pythagorean triples so the missing side is a whole number.
const TRIPLES: Array<[number, number, number]> = [
  [3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17], [9, 12, 15], [7, 24, 25],
]

function makeL3(): Round {
  const pick = rint(0, 2)

  if (pick === 0) {
    // Pythagorean: find the hypotenuse from the two legs.
    const [a, b, c] = TRIPLES[rint(0, TRIPLES.length - 1)]
    return {
      input: 'numeric',
      figure: { kind: 'right-triangle', labels: { height: `${a} cm`, base: `${b} cm` }, highlight: 'hypotenuse' },
      promptText: `The legs are ${a} cm and ${b} cm. Find the hypotenuse.`,
      say: `A right triangle has legs ${a} and ${b}. Find the hypotenuse. Use a squared plus b squared equals c squared.`,
      answer: c,
      suffix: 'cm',
      explain: `a² + b² = c²: ${a}² + ${b}² = ${a * a + b * b}, and √${a * a + b * b} = ${c} cm.`,
    }
  }

  if (pick === 1) {
    // Pythagorean: find a missing leg from the hypotenuse and the other leg.
    const [a, b, c] = TRIPLES[rint(0, TRIPLES.length - 1)]
    return {
      input: 'numeric',
      figure: { kind: 'right-triangle', labels: { base: `${b} cm`, hypotenuse: `${c} cm` }, highlight: 'height' },
      promptText: `The hypotenuse is ${c} cm and one leg is ${b} cm. Find the other leg.`,
      say: `A right triangle has hypotenuse ${c} and one leg ${b}. Find the other leg.`,
      answer: a,
      suffix: 'cm',
      explain: `c² − b² = a²: ${c}² − ${b}² = ${c * c - b * b}, and √${c * c - b * b} = ${a} cm.`,
    }
  }

  // Composite area: an L-shape = big rectangle − corner rectangle cut out.
  const W = rint(8, 14)
  const H = rint(6, 10)
  const cw = rint(2, W - 4)
  const ch = rint(2, H - 3)
  const ans = W * H - cw * ch
  return {
    input: 'numeric',
    figure: { kind: 'rectangle', labels: { width: `${W} cm`, side: `${H} cm` } },
    promptText: `An L-shape is a ${W}×${H} cm rectangle with a ${cw}×${ch} cm corner removed. Find its area.`,
    say: `An L-shape is a ${W} by ${H} rectangle with a ${cw} by ${ch} corner cut out. Find the area. Subtract the cut piece from the whole.`,
    answer: ans,
    suffix: 'cm²',
    explain: `Whole minus the cut: (${W} × ${H}) − (${cw} × ${ch}) = ${W * H} − ${cw * ch} = ${ans} cm².`,
  }
}

// ── FigureWatch: a narrated figure worked example (reused for re-teach) ──────
export function FigureWatch({
  lines, kind, labels, highlight, onDone,
}: {
  lines: string[]
  kind: FigureKind
  labels: Record<string, string | number>
  highlight?: string
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
      <FigureDiagram band={BAND} kind={kind} labels={labels} highlight={highlight} />
      <p style={{ margin: 0, maxWidth: 520, textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 15, lineHeight: 1.5, color: 'var(--ink-soft)' }}>
        {lines[lines.length - 1]}
      </p>
    </div>
  )
}

// A one-question check inside the lesson (retry allowed, no penalty).
function FigureAsk({ prompt, say, kind, labels, highlight, choices, answer, onDone }: {
  prompt: string
  say: string
  kind: FigureKind
  labels: Record<string, string | number>
  highlight?: string
  choices: Choice[]
  answer: string | number
  onDone: () => void
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
      <FigureDiagram band={BAND} kind={kind} labels={labels} highlight={highlight} />
      <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 18, fontWeight: 600, color: 'var(--ink)', textAlign: 'center' }}>{prompt}</p>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <ChoiceGrid band={BAND} choices={choices} selected={selected} status={status} correctValue={answer} onPick={pick} columns={2} />
      </div>
    </div>
  )
}

interface Props { band?: AgeBand; childName: string; onLessonComplete: () => void }

export default function GeometryMeasurementTeenLesson({ childName, onLessonComplete }: Props) {
  // Freeze the one randomized check so it doesn't reshuffle on re-render.
  const triCheck = useMemo(() => {
    const base = rint(4, 10)
    const height = 2 * rint(2, 5)
    return { base, height, area: (base * height) / 2 }
  }, [])

  const steps: LessonStep[] = [
    {
      bubble: 'Area counts the squares that fill a shape. Watch.', mood: 'happy',
      render: (d) => (
        <FigureWatch
          lines={[
            'A triangle is half of a rectangle around it.',
            'So its area is one half times base times height — half of base times height.',
          ]}
          kind="triangle" labels={{ base: '8 cm', height: '6 cm' }} highlight="base" onDone={d}
        />
      ),
    },
    {
      bubble: 'A circle uses π — about 3.14. Watch.', mood: 'happy',
      render: (d) => (
        <FigureWatch
          lines={[
            'For a circle, area is pi times the radius squared.',
            'With radius 5, that is about 3.14 times 25, which is 78.5 square centimetres.',
          ]}
          kind="circle" labels={{ r: 'r = 5 cm' }} highlight="r" onDone={d}
        />
      ),
    },
    {
      bubble: 'A box fills space — that’s volume. Watch.', mood: 'thinking',
      render: (d) => (
        <FigureWatch
          lines={[
            'Volume of a box is length times width times height.',
            'Stack the layers: 4 by 3 by 2 fills 24 cubic centimetres.',
          ]}
          kind="prism" labels={{ length: '4 cm', height: '2 cm', depth: '3 cm' }} highlight="length" onDone={d}
        />
      ),
    },
    {
      bubble: 'A right triangle hides a square rule. Watch.', mood: 'thinking',
      render: (d) => (
        <FigureWatch
          lines={[
            'In a right triangle, the legs squared add up to the hypotenuse squared.',
            'Legs 3 and 4: nine plus sixteen is twenty-five, and the square root of 25 is 5.',
          ]}
          kind="right-triangle" labels={{ height: '3 cm', base: '4 cm', hypotenuse: '5 cm' }} highlight="hypotenuse" onDone={d}
        />
      ),
    },
    {
      bubble: 'Your turn.', mood: 'thinking',
      render: (d) => (
        <FigureAsk
          prompt="Which formula gives a triangle’s area?"
          say="Which formula gives the area of a triangle?"
          kind="triangle"
          labels={{ base: `${triCheck.base} cm`, height: `${triCheck.height} cm` }}
          highlight="height"
          choices={[
            { value: '½ × base × height', label: '½ × base × height' },
            { value: 'base × height', label: 'base × height' },
            { value: 'base + height', label: 'base + height' },
            { value: 'π × base × height', label: 'π × base × height' },
          ]}
          answer="½ × base × height"
          onDone={d}
        />
      ),
    },
  ]
  return (
    <TeenLessonShell
      band={BAND}
      childName={childName}
      chapterTitle="Area, Volume & Pythagoras"
      steps={steps}
      finalSpeech={`Nice work, ${childName}. You can measure area, volume, and right-triangle sides. Let’s investigate.`}
      onLessonComplete={onLessonComplete}
    />
  )
}
