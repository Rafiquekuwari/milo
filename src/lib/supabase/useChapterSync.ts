'use client'
/**
 * useChapterSync
 * Wraps finishChapter — updates local store instantly,
 * syncs to Supabase in background, queues if offline.
 */

import { useCallback } from 'react'
import { ChapterType } from './types'
import { useMiloStore } from '../store'
import { getActiveLearner } from './useLearnerSession'
import { syncSession } from './queries'
import { enqueueSession, flushQueue } from '../useOfflineSync'


function randomId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

function calcStars(correct: number, wrong: number): number {
  const total = correct + wrong
  if (total === 0) return 1
  const pct = correct / total
  return pct >= 0.85 ? 3 : pct >= 0.6 ? 2 : 1
}
function calcXP(stars: number, correct: number): number { return stars * 50 + correct * 10 }
function calcCoins(stars: number): number { return stars * 5 }

export function useChapterSync() {
  const finishChapter = useMiloStore(s => s.finishChapter)

  const finishAndSync = useCallback(async (
    chapter: ChapterType,
    correct: number,
    wrong:   number,
    phase:   'lesson' | 'practice' = 'practice'
  ) => {
    // 1. Update local store immediately — no delay for the child
    finishChapter(chapter, correct, wrong)

    // 2. Build payload
    const learner = getActiveLearner()
    if (!learner) return

    const stars       = calcStars(correct, wrong)
    const xpEarned    = calcXP(stars, correct)
    const coinsEarned = calcCoins(stars)

    const payload = {
      learnerId:    learner.id,
      chapter,
      phase,
      correctCount: correct,
      wrongCount:   wrong,
      starsEarned:  stars,
      xpEarned,
      coinsEarned,
      clientId:     randomId(),
      completedAt:  new Date().toISOString(),
    }

    // 3. Try to sync — queue if offline or failed
    if (!navigator.onLine) {
      enqueueSession(payload)
      return
    }

    const ok = await syncSession(payload)
    if (!ok) {
      enqueueSession(payload)
    }
  }, [finishChapter])

  const flushOfflineQueue = useCallback(async () => {
    await flushQueue()
  }, [])

  return { finishAndSync, flushQueue: flushOfflineQueue }
}