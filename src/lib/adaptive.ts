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

export function useAdaptive(chapter: ChapterType): AdaptiveState {
  const [difficulty,  setDifficulty]  = useState<Difficulty>(1)
  const [streak,      setStreak]      = useState(0)
  const [wrongStreak, setWrongStreak] = useState(0)
  const [correct,     setCorrect]     = useState(0)
  const [wrong,       setWrong]       = useState(0)
  const [praise,      setPraise]      = useState(pick(PRAISE[0]))
  const [encourage,   setEncourage]   = useState(pick(ENCOURAGEMENT[0]))
  const [isOnFire,    setIsOnFire]    = useState(false)
  const [shouldHint,  setShouldHint]  = useState(false)

  const record = useCallback((isCorrect: boolean) => {
    setCorrect(c => {
      const newCorrect = isCorrect ? c + 1 : c
      const newWrong   = isCorrect ? wrong : wrong + 1
      const newStreak  = isCorrect ? streak + 1 : 0
      const newWS      = isCorrect ? 0 : wrongStreak + 1
      const total      = newCorrect + newWrong

      // Difficulty
      const newDiff = calcDifficulty(difficulty, newStreak, newCorrect, total, newWS)
      setDifficulty(newDiff)

      // Streak
      setStreak(newStreak)
      setWrongStreak(newWS)
      if (!isCorrect) setWrong(w => w + 1)

      // On fire
      const fire = newStreak >= 3
      setIsOnFire(fire)

      // Hint
      setShouldHint(newWS >= 2 || (newDiff === 1 && total >= 2 && newCorrect / total < 0.5))

      // Praise / encouragement
      const lvl = Math.min(newDiff - 1, 2)
      if (isCorrect) {
        setPraise(fire ? pick(ON_FIRE) : pick(PRAISE[lvl]))
      } else {
        setEncourage(pick(ENCOURAGEMENT[lvl]))
      }

      return newCorrect
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty, streak, wrongStreak, wrong])

  const difficultyLabel =
    difficulty === 1 ? 'Starter ⭐' :
    difficulty === 2 ? 'Getting there ⭐⭐' :
    'Champion ⭐⭐⭐'

  return {
    difficulty,
    streak,
    sessionCorrect: correct,
    sessionWrong:   wrong,
    shouldHint,
    isOnFire,
    praise,
    encouragement: encourage,
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