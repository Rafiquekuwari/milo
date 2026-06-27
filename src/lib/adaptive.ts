/**
 * Milo Adaptive Learning Engine
 * ─────────────────────────────────────────────────────────────
 * Tracks per-chapter performance in real-time and adjusts:
 *   - Difficulty level (1 easy → 2 medium → 3 hard)
 *   - Which question types to serve more/less of
 *   - Encouragement tone in Milo's speech
 *   - Pacing (how many hints to give)
 *
 * Usage inside a chapter:
 *   const ada = useAdaptive('counting')
 *   ada.record(true)          // after a correct answer
 *   ada.record(false)         // after a wrong answer
 *   ada.difficulty            // 1 | 2 | 3
 *   ada.shouldHint            // true → show extra visual hint
 *   ada.praise                // dynamic praise string
 *   ada.encouragement         // dynamic encouragement string
 * ─────────────────────────────────────────────────────────────
 */

import { useRef, useState, useCallback } from 'react'
import { type ChapterType } from './store'

// ─── Types ────────────────────────────────────────────────────

export type Difficulty = 1 | 2 | 3

export interface AdaptiveState {
  difficulty:     Difficulty
  streak:         number      // consecutive correct answers
  sessionCorrect: number
  sessionWrong:   number
  shouldHint:     boolean     // true when child is struggling
  isOnFire:       boolean     // 3+ correct in a row
  praise:         string
  encouragement:  string
  record:         (correct: boolean) => void
  difficultyLabel: string
}

// ─── Praise / encouragement pools ────────────────────────────

const PRAISE = [
  ['Good job!', 'Nice!', 'You got it!', 'Correct!'],                           // level 1 — calm
  ['Great work!', 'Brilliant!', 'Well done!', 'That\'s right!'],               // level 2 — warm
  ['Amazing!', 'You\'re on fire! 🔥', 'Superstar! ⭐', 'Incredible! 🎉'],     // level 3 — excited
]

const ENCOURAGEMENT = [
  ['Good try!', 'Nearly there!', 'Let\'s look again…', 'Almost!'],
  ['Not quite — but you\'re getting it!', 'Keep going!', 'Try again — you can do it!'],
  ['Oops! No worries — let\'s try another!', 'Keep practising!', 'Don\'t give up!'],
]

const ON_FIRE = [
  'Wow, you\'re on a roll! 🔥',
  'Three in a row! Amazing! ⭐',
  'You\'re unstoppable! 🚀',
  'Milo is so proud of you! 🦊',
]

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ─── Difficulty rules ─────────────────────────────────────────
//
//  Promote:   3 correct in a row  AND  accuracy ≥ 80%
//  Demote:    2 wrong in a row    OR   accuracy < 40% after ≥ 4 questions
//  Hint:      2+ wrong in a row   OR   difficulty == 1 AND accuracy < 50%

function calcDifficulty(
  current: Difficulty,
  streak: number,
  correct: number,
  total: number,
  wrongStreak: number,
): Difficulty {
  const accuracy = total > 0 ? correct / total : 1

  // Promote
  if (streak >= 3 && accuracy >= 0.8 && current < 3) {
    return (current + 1) as Difficulty
  }
  // Demote
  if ((wrongStreak >= 2 || (total >= 4 && accuracy < 0.4)) && current > 1) {
    return (current - 1) as Difficulty
  }
  return current
}

// ─── Hook ────────────────────────────────────────────────────

interface AdaptiveSnapshot {
  difficulty:    Difficulty
  streak:        number
  wrongStreak:   number
  correct:       number
  wrong:         number
  isOnFire:      boolean
  shouldHint:    boolean
  praise:        string
  encouragement: string
}

export function useAdaptive(chapter: ChapterType): AdaptiveState {
  // All mutable counters live in ONE snapshot object that is mirrored in a ref.
  // The ref is the synchronous source of truth: when several record() calls land
  // in the same render tick (rapid taps), each one reads the previous call's
  // result from ref.current instead of a stale render closure. The old code read
  // streak/wrongStreak/difficulty from the closure and wrote them with plain
  // setters, so a fast second tap recomputed from stale values and could corrupt
  // promote/demote. Driving everything off the ref removes that hazard.
  const [snapshot, setSnapshot] = useState<AdaptiveSnapshot>(() => ({
    difficulty:    1,
    streak:        0,
    wrongStreak:   0,
    correct:       0,
    wrong:         0,
    isOnFire:      false,
    shouldHint:    false,
    praise:        pick(PRAISE[0]),
    encouragement: pick(ENCOURAGEMENT[0]),
  }))
  const ref = useRef(snapshot)

  const record = useCallback((isCorrect: boolean) => {
    const s = ref.current
    const newCorrect = isCorrect ? s.correct + 1 : s.correct
    const newWrong   = isCorrect ? s.wrong       : s.wrong + 1
    const newStreak  = isCorrect ? s.streak + 1  : 0
    const newWS      = isCorrect ? 0             : s.wrongStreak + 1
    const total      = newCorrect + newWrong
    const newDiff    = calcDifficulty(s.difficulty, newStreak, newCorrect, total, newWS)
    const fire       = newStreak >= 3
    const lvl        = Math.min(newDiff - 1, 2)

    const next: AdaptiveSnapshot = {
      difficulty:    newDiff,
      streak:        newStreak,
      wrongStreak:   newWS,
      correct:       newCorrect,
      wrong:         newWrong,
      isOnFire:      fire,
      shouldHint:    newWS >= 2 || (newDiff === 1 && total >= 2 && newCorrect / total < 0.5),
      praise:        isCorrect ? (fire ? pick(ON_FIRE) : pick(PRAISE[lvl])) : s.praise,
      encouragement: isCorrect ? s.encouragement : pick(ENCOURAGEMENT[lvl]),
    }
    ref.current = next   // synchronous — the next tap this tick reads the new values
    setSnapshot(next)    // re-render with the new values
  }, [])

  const difficultyLabel =
    snapshot.difficulty === 1 ? 'Starter ⭐' :
    snapshot.difficulty === 2 ? 'Getting there ⭐⭐' :
    'Champion ⭐⭐⭐'

  return {
    difficulty:     snapshot.difficulty,
    streak:         snapshot.streak,
    sessionCorrect: snapshot.correct,
    sessionWrong:   snapshot.wrong,
    shouldHint:     snapshot.shouldHint,
    isOnFire:       snapshot.isOnFire,
    praise:         snapshot.praise,
    encouragement:  snapshot.encouragement,
    record,
    difficultyLabel,
  }
}

// ─── Difficulty-aware number generators ───────────────────────
// These are the shared building blocks chapters call to get
// appropriate numbers for the current difficulty.

export function countTarget(difficulty: Difficulty): number {
  if (difficulty === 1) return Math.floor(Math.random() * 3) + 1   // 1–3
  if (difficulty === 2) return Math.floor(Math.random() * 4) + 3   // 3–6
  return Math.floor(Math.random() * 5) + 5                          // 5–9
}

export function patternUnitLen(difficulty: Difficulty): number {
  // Patterns: how many distinct items in the repeating unit. A demotion makes
  // the unit shorter again (ABCD → ABC → AB), i.e. genuinely easier.
  if (difficulty === 1) return 2   // AB
  if (difficulty === 2) return 3   // ABC
  return 4                          // ABCD
}

export function matchTarget(difficulty: Difficulty): number {
  // Apple Basket: how many to put in the basket. Tiers step down clearly so a
  // demotion really does hand the child smaller numbers again.
  if (difficulty === 1) return Math.floor(Math.random() * 3) + 1   // 1–3
  if (difficulty === 2) return Math.floor(Math.random() * 4) + 3   // 3–6
  return Math.floor(Math.random() * 5) + 6                          // 6–10
}

export function addPair(difficulty: Difficulty): [number, number] {
  if (difficulty === 1) {
    const a = Math.floor(Math.random() * 3) + 1  // 1–3
    const b = Math.floor(Math.random() * 3) + 1  // 1–3 → sum ≤ 6
    return [a, b]
  }
  if (difficulty === 2) {
    const a = Math.floor(Math.random() * 4) + 2  // 2–5
    const b = Math.floor(Math.random() * 4) + 2  // 2–5 → sum ≤ 10
    return [a, b]
  }
  const a = Math.floor(Math.random() * 5) + 4   // 4–8
  const b = Math.floor(Math.random() * 5) + 2   // 2–6 → sum ≤ 14
  return [a, b]
}

export function subPair(difficulty: Difficulty): [number, number] {
  if (difficulty === 1) {
    const total = Math.floor(Math.random() * 3) + 3   // 3–5
    const take  = Math.floor(Math.random() * 2) + 1   // 1–2
    return [total, take]
  }
  if (difficulty === 2) {
    const total = Math.floor(Math.random() * 4) + 5   // 5–8
    const take  = Math.floor(Math.random() * 3) + 2   // 2–4
    return [total, take]
  }
  const total = Math.floor(Math.random() * 4) + 7     // 7–10
  const take  = Math.floor(Math.random() * 4) + 3     // 3–6
  return [total, take]
}

export function seqStart(difficulty: Difficulty): number {
  if (difficulty === 1) return Math.floor(Math.random() * 3) + 1   // start 1–3
  if (difficulty === 2) return Math.floor(Math.random() * 5) + 3   // start 3–7
  return Math.floor(Math.random() * 8) + 1                          // start 1–8
}

export function seqLength(difficulty: Difficulty): number {
  if (difficulty === 1) return 3   // show 3 items
  if (difficulty === 2) return 4   // show 4 items
  return 5                          // show 5 items
}