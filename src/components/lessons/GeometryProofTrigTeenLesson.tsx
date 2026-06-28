'use client'
/**
 * GeometryProofTrigTeenLesson (15–16, "Commission" / studio analyst) —
 * Geometry chapter #12: Triangles, Proof & Right-Triangle Trig.
 *
 * Built on TeenLessonShell: a few narrated "watch" steps that work an angle
 * relationship, a short congruence proof, and a SOH-CAH-TOA computation one line
 * at a time, then a quick check. Exports the difficulty-aware round generator + a
 * Watch helper so the practice chapter and its re-teach reuse them. Mirrors
 * LinearEquationsInequalitiesTeenLesson, in the 15–16 dark "Commission" chrome.
 *
 * Ramp (id "geometryProofTrig", per docs/curriculum-12-18.md):
 *   L1 angle relationships (vertical / supplementary / triangle-angle-sum /
 *      parallel lines + transversal / algebraic angle equations)  → NumericEntry
 *   L2 congruence (SSS/SAS/ASA) & similarity — a 3–4 step proof    → StepSelect
 *   L3 SOH-CAH-TOA missing side, then missing angle via inverse trig
 *      (angle of elevation)                                        → ChoiceGrid
 *
 * Answer surfaces: NumericEntry for clean integer angle values (L1); StepSelect
 * ("pick the next statement + reason") for the proof rounds (L2); ChoiceGrid of
 * rounded results for the trig rounds (L3) — irrational side lengths / inverse-trig
 * angles never go to a free-text parser (math-without-fear answer policy).
 */
import React, { useEffect, useMemo, useRef } from 'react'
import { speak, speakSeq } from '@/lib/useMiloSpeaker'
import type { LessonStep } from '@/components/lessons/_kit'
import type { AgeBand, Choice } from '@/components/teen/types'
import TeenLessonShell from '@/components/teen/TeenLessonShell'
import ChoiceGrid from '@/components/teen/ChoiceGrid'

const BAND: AgeBand = '15-16'

// ── shared helpers (reused by the practice chapter) ────────────────────────
const rint = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))
const shuffle = <T,>(a: T[]): T[] => [...a].sort(() => Math.random() - 0.5)

const toChoice = (v: number, suffix = ''): Choice => ({ value: v, label: `${v}${suffix}` })

// Pythagorean triples → clean integer trig sides for the L3 "missing side" rounds.
const TRIPLES: [number, number, number][] = [
  [3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17], [9, 12, 15], [7, 24, 25],
]

/** What kind of answer surface a round wants. */
export type RoundKind = 'numeric' | 'step' | 'choice'

export interface StepOption { text: string; reason?: string }

export interface Round {
  kind: RoundKind
  topic: string            // short label for the prompt header ("Find the angle." etc.)
  promptText: string       // the figure/equation shown to the learner
  say: string              // spoken prompt
  answer: number           // numeric answer (numeric) OR correct option/choice index (step/choice)
  choices: Choice[]        // for choice rounds
  suffix?: string          // unit appended in NumericEntry ("°", "cm")
  // For StepSelect rounds:
  shown?: StepOption[]     // statements already locked in
  options?: StepOption[]   // candidates for the next statement; `answer` is the correct index
  // Optional figure to render alongside the prompt:
  figure?: { kind: 'right-triangle' | 'triangle'; labels: Record<string, string | number>; highlight?: string }
  explain: string          // re-teach line (also the final Watch caption)
  answerSpeech: string     // what Milo says when revealing the answer
}

// ── L1: angle relationships → solve for the missing angle (NumericEntry) ────
function makeL1(): Round {
  const roll = Math.random()
  if (roll < 0.25) {
    // Vertical angles are equal.
    const a = rint(25, 150)
    return {
      kind: 'numeric',
      topic: 'Find the missing angle.',
      promptText: `Two lines cross. One angle is ${a}°. Its vertical angle is x.`,
      say: `Two lines cross. One angle is ${a} degrees. What is its vertical angle, x?`,
      answer: a,
      choices: [],
      suffix: '°',
      explain: `Vertical angles are equal, so x = ${a}°.`,
      answerSpeech: `Vertical angles are equal, so x equals ${a} degrees.`,
    }
  }
  if (roll < 0.5) {
    // Supplementary angles sum to 180.
    const a = rint(35, 145)
    const x = 180 - a
    return {
      kind: 'numeric',
      topic: 'Find the missing angle.',
      promptText: `Angles ${a}° and x° sit on a straight line.`,
      say: `Two angles, ${a} degrees and x degrees, lie on a straight line. Find x.`,
      answer: x,
      choices: [],
      suffix: '°',
      explain: `Angles on a straight line are supplementary: x = 180° − ${a}° = ${x}°.`,
      answerSpeech: `On a straight line they add to 180, so x equals ${x} degrees.`,
    }
  }
  if (roll < 0.78) {
    // Triangle-angle-sum: two angles given, find the third.
    const a = rint(30, 90)
    let b = rint(30, 90)
    while (a + b >= 165) b = rint(20, 80)
    const x = 180 - a - b
    return {
      kind: 'numeric',
      topic: 'Find the missing angle.',
      promptText: `A triangle has angles ${a}°, ${b}°, and x°.`,
      say: `A triangle has angles ${a} degrees, ${b} degrees, and x degrees. Find x.`,
      answer: x,
      choices: [],
      suffix: '°',
      figure: { kind: 'triangle', labels: {} },
      explain: `The angles of a triangle sum to 180°: x = 180° − ${a}° − ${b}° = ${x}°.`,
      answerSpeech: `The three angles add to 180, so x equals ${x} degrees.`,
    }
  }
  // Algebraic angle equation: two supplementary angles as expressions in x.
  // (3x + 10) + (2x) = 180  →  solve for x, the prompt asks for x (a number).
  const x = rint(10, 30)
  const c = rint(5, 25)
  // (3x + c) + (2x + (180 - 5x - c)) ... keep it concrete: 3x + c and the rest.
  const angle1 = 3 * x + c
  const angle2 = 180 - angle1
  return {
    kind: 'numeric',
    topic: 'Solve for x.',
    promptText: `(3x + ${c})° and ${angle2}° are supplementary.`,
    say: `The angle 3 x plus ${c} degrees and ${angle2} degrees are supplementary. Solve for x.`,
    answer: x,
    choices: [],
    explain: `Supplementary: 3x + ${c} + ${angle2} = 180, so 3x = ${angle1 - c}, and x = ${x}.`,
    answerSpeech: `Setting the sum to 180 gives 3 x equals ${angle1 - c}, so x equals ${x}.`,
  }
}

// ── L2: congruence / similarity — pick the next statement + reason (StepSelect) ──
function makeL2(): Round {
  if (Math.random() < 0.5) {
    // SAS congruence proof: two sides + the included angle.
    const correct: StepOption = { text: '△ABC ≅ △ADC', reason: 'SAS — two sides and the included angle are congruent.' }
    const wrongA: StepOption = { text: '△ABC ≅ △ADC', reason: 'AAA — but AAA only proves similarity, never congruence.' }
    const wrongB: StepOption = { text: '△ABC ≅ △ADC', reason: 'SSA — there is no SSA congruence rule.' }
    const opts = shuffle([correct, wrongA, wrongB])
    return {
      kind: 'step',
      topic: 'Pick the next statement + reason.',
      promptText: 'Given: AB ≅ AD, ∠BAC ≅ ∠DAC, AC is shared.',
      say: 'A B is congruent to A D, the included angles at A are congruent, and A C is shared by both triangles. Pick the statement that finishes the proof.',
      answer: opts.indexOf(correct),
      choices: [],
      shown: [
        { text: 'AB ≅ AD', reason: 'Given.' },
        { text: '∠BAC ≅ ∠DAC', reason: 'Given (included angle).' },
        { text: 'AC ≅ AC', reason: 'Reflexive property — shared side.' },
      ],
      options: opts,
      explain: 'Two pairs of sides and the angle BETWEEN them are congruent → SAS proves △ABC ≅ △ADC.',
      answerSpeech: 'Two sides and the included angle match, so SAS proves the triangles congruent.',
    }
  }
  // ASA congruence proof: two angles + the included side.
  const correct: StepOption = { text: '△PQR ≅ △PSR', reason: 'ASA — two angles and the included side are congruent.' }
  const wrongA: StepOption = { text: '△PQR ≅ △PSR', reason: 'SSA — that is not a valid congruence rule.' }
  const wrongB: StepOption = { text: '△PQR ~ △PSR', reason: 'Similar — but ASA gives congruence, not just similarity.' }
  const opts = shuffle([correct, wrongA, wrongB])
  return {
    kind: 'step',
    topic: 'Pick the next statement + reason.',
    promptText: 'Given: ∠QPR ≅ ∠SPR, ∠QRP ≅ ∠SRP, PR is shared.',
    say: 'The angles at P are congruent, the angles at R are congruent, and the side P R between them is shared. Pick the statement that finishes the proof.',
    answer: opts.indexOf(correct),
    choices: [],
    shown: [
      { text: '∠QPR ≅ ∠SPR', reason: 'Given.' },
      { text: 'PR ≅ PR', reason: 'Reflexive property — included side.' },
      { text: '∠QRP ≅ ∠SRP', reason: 'Given.' },
    ],
    options: opts,
    explain: 'Two pairs of angles with the side BETWEEN them congruent → ASA proves △PQR ≅ △PSR.',
    answerSpeech: 'Two angles and the side between them match, so ASA proves the triangles congruent.',
  }
}

// ── L3: SOH-CAH-TOA missing side, then missing angle via inverse trig (ChoiceGrid) ──
function makeL3(): Round {
  if (Math.random() < 0.5) {
    // Missing SIDE from a Pythagorean-triple right triangle (clean integer).
    const [p, q, h] = TRIPLES[rint(0, TRIPLES.length - 1)]
    // Give the hypotenuse + one leg; ask for the other leg (so SOH/CAH applies cleanly).
    const giveOpp = Math.random() < 0.5
    const known = giveOpp ? p : q   // the leg we reveal
    const want = giveOpp ? q : p    // the leg to find
    const ratioName = giveOpp ? 'cosine' : 'sine'
    // Distractors near the answer, never the same.
    const set = new Set<number>([want])
    while (set.size < 4) { const c = want + rint(-3, 4); if (c > 0 && c !== want) set.add(c) }
    const choices = shuffle([...set]).map((v) => toChoice(v))
    return {
      kind: 'choice',
      topic: 'Find the missing side.',
      promptText: `Right triangle: hypotenuse ${h}, one leg ${known}. Find the other leg.`,
      say: `A right triangle has hypotenuse ${h} and one leg ${known}. Find the length of the other leg.`,
      answer: choices.findIndex((c) => c.value === want),
      choices,
      figure: { kind: 'right-triangle', labels: { hypotenuse: h, base: known, height: '?' }, highlight: 'height' },
      explain: `By the Pythagorean theorem (or ${ratioName}), the other leg = √(${h}² − ${known}²) = ${want}.`,
      answerSpeech: `Using the Pythagorean theorem, the other leg is ${want}.`,
    }
  }
  // Missing ANGLE via inverse trig — angle of elevation (rounded, ChoiceGrid).
  const [opp, adj] = (() => {
    const pick = TRIPLES[rint(0, TRIPLES.length - 1)]
    return [pick[0], pick[1]] as [number, number]
  })()
  const angle = Math.round((Math.atan2(opp, adj) * 180) / Math.PI)
  const set = new Set<number>([angle])
  while (set.size < 4) { const c = angle + rint(-12, 12); if (c > 5 && c < 85 && c !== angle) set.add(c) }
  const choices = shuffle([...set]).map((v) => toChoice(v, '°'))
  return {
    kind: 'choice',
    topic: 'Find the angle of elevation.',
    promptText: `A ramp rises ${opp} m over a ${adj} m run. What is the angle of elevation? (nearest degree)`,
    say: `A ramp rises ${opp} metres over a run of ${adj} metres. To the nearest degree, what is the angle of elevation?`,
    answer: choices.findIndex((c) => c.value === angle),
    choices,
    figure: { kind: 'right-triangle', labels: { base: adj, height: opp, rightAngle: '' }, highlight: 'hypotenuse' },
    explain: `tan θ = opposite / adjacent = ${opp}/${adj}, so θ = arctan(${opp}/${adj}) ≈ ${angle}°.`,
    answerSpeech: `Take the inverse tangent of ${opp} over ${adj}: about ${angle} degrees.`,
  }
}

/** Difficulty-aware round generator. */
export function makeRound(d: 1 | 2 | 3): Round {
  if (d === 1) return makeL1()
  if (d === 2) return makeL2()
  return makeL3()
}

// ── ProofWatch: a narrated step-ladder worked example (reused for re-teach) ──
export function ProofWatch({
  lines, steps, onDone,
}: {
  lines: string[]; steps: string[]; onDone: () => void
}) {
  const doneRef = useRef(onDone)
  doneRef.current = onDone
  useEffect(() => {
    const cancel = speakSeq(lines, { onDone: () => window.setTimeout(() => doneRef.current(), 1200) })
    return cancel
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, width: '100%' }}>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 340 }}>
        {steps.map((s, i) => (
          <li key={i} style={{
            fontFamily: 'var(--font-numeric)', fontVariantNumeric: 'tabular-nums', fontSize: 16, fontWeight: 600,
            color: i === steps.length - 1 ? 'var(--garden-green)' : 'var(--ink)',
            textAlign: 'center', padding: '8px 12px', border: '1px solid var(--outline)', borderRadius: 8,
            background: i === steps.length - 1 ? 'var(--bg-1)' : 'var(--paper)',
          }}>
            {s}
          </li>
        ))}
      </ol>
      <p style={{ margin: 0, maxWidth: 520, textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 15, lineHeight: 1.5, color: 'var(--ink-soft)' }}>
        {lines[lines.length - 1]}
      </p>
    </div>
  )
}

// A one-question check inside the lesson (retry allowed, no penalty).
function ProofAsk({ prompt, say, choices, answerIdx, onDone }: {
  prompt: string; say: string; choices: Choice[]; answerIdx: number; onDone: () => void
}) {
  const [selected, setSelected] = React.useState<string | number | null>(null)
  const [status, setStatus] = React.useState<'idle' | 'correct' | 'wrong'>('idle')
  const spokenRef = useRef(false)
  useEffect(() => { if (!spokenRef.current) { spokenRef.current = true; speak(say) } }, []) // eslint-disable-line
  const answerValue = choices[answerIdx]?.value
  function pick(v: string | number) {
    if (status === 'correct') return
    setSelected(v)
    if (v === answerValue) { setStatus('correct'); speak('Yes — that holds up.'); window.setTimeout(onDone, 1400) }
    else { setStatus('wrong'); speak('Not quite — take another look.'); window.setTimeout(() => { setSelected(null); setStatus('idle') }, 1200) }
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%' }}>
      <p style={{ margin: 0, fontFamily: 'var(--font-numeric)', fontSize: 18, fontWeight: 700, color: 'var(--ink)', textAlign: 'center', maxWidth: 420 }}>{prompt}</p>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <ChoiceGrid band={BAND} choices={choices} selected={selected} status={status} correctValue={answerValue} onPick={pick} columns={choices.length === 4 ? 2 : choices.length} />
      </div>
    </div>
  )
}

interface Props { band?: AgeBand; childName: string; onLessonComplete: () => void }

export default function GeometryProofTrigTeenLesson({ childName, onLessonComplete }: Props) {
  // Freeze the in-lesson check so it doesn't reshuffle on re-render.
  const checkChoices = useMemo<Choice[]>(
    () => shuffle([toChoice(53, '°'), toChoice(37, '°'), toChoice(45, '°'), toChoice(60, '°')]),
    [],
  )
  // 3-4-5 ramp: tan θ = 4/3 → θ ≈ 53° as the elevation; check asks the smaller (opp 3, adj 4 → ~37°).
  const checkAnswerIdx = checkChoices.findIndex((c) => c.value === 37)

  const steps: LessonStep[] = [
    {
      bubble: 'Angles obey rules. Use them to find what you can\'t measure directly.', mood: 'thinking',
      render: (d) => (
        <ProofWatch
          lines={[
            'A triangle has angles seventy and fifty degrees, and an unknown x.',
            'The three angles of any triangle always add to one hundred eighty degrees.',
            'So x equals one hundred eighty minus seventy minus fifty. x is sixty degrees.',
          ]}
          steps={['70° + 50° + x = 180°', 'x = 180° − 120°', 'x = 60°']}
          onDone={d}
        />
      ),
    },
    {
      bubble: 'A proof is a chain — each line earns its place with a reason.', mood: 'thinking',
      render: (d) => (
        <ProofWatch
          lines={[
            'Given A B congruent to A D, the angle at A congruent in both, and A C shared.',
            'A C equals A C by the reflexive property — a shared side.',
            'Two sides and the included angle match, so by S A S the triangles are congruent.',
          ]}
          steps={['AB ≅ AD (given)', '∠BAC ≅ ∠DAC (given)', 'AC ≅ AC (reflexive)', '△ABC ≅ △ADC  (SAS)']}
          onDone={d}
        />
      ),
    },
    {
      bubble: 'SOH-CAH-TOA links an angle to its sides. Watch.', mood: 'thinking',
      render: (d) => (
        <ProofWatch
          lines={[
            'A right triangle has the side opposite the angle equal to three, and the hypotenuse five.',
            'Sine is opposite over hypotenuse — that is three over five, or zero point six.',
            'To recover the angle, take the inverse sine of zero point six: about thirty-seven degrees.',
          ]}
          steps={['sin θ = opp / hyp', 'sin θ = 3 / 5 = 0.6', 'θ = sin⁻¹(0.6) ≈ 37°']}
          onDone={d}
        />
      ),
    },
    {
      bubble: 'Your turn — find the angle of elevation.', mood: 'thinking',
      render: (d) => (
        <ProofAsk
          prompt="A ramp rises 3 m over a 4 m run. Angle of elevation? (nearest degree)"
          say="A ramp rises three metres over a four metre run. To the nearest degree, what is the angle of elevation?"
          choices={checkChoices}
          answerIdx={checkAnswerIdx}
          onDone={d}
        />
      ),
    },
  ]

  return (
    <TeenLessonShell
      band={BAND}
      childName={childName}
      chapterTitle="Triangles, Proof & Trig"
      steps={steps}
      finalSpeech={`Strong finish, ${childName}. You can chase missing angles, justify congruence with a proof, and use SOH-CAH-TOA to find sides and angles. Let's take the commission.`}
      onLessonComplete={onLessonComplete}
    />
  )
}
