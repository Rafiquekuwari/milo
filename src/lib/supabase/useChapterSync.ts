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

export function useChapterSync() {
  const finishChapter = useMiloStore(s => s.finishChapter)

  const finishAndSync = useCallback(async (
    chapter: ChapterType,
    correct: number,
    wrong:   number,
    phase:   'lesson' | 'practice' = 'practice',
    mastered = false,
  ) => {
    // 1. Update local store immediately — no delay for the child.
    //    Reuse the score it just computed instead of recomputing the formula.
    //    `mastered` (early finish at the top tier) forces the full 3 stars.
    const { stars, xp: xpEarned, coins: coinsEarned } = finishChapter(chapter, correct, wrong, mastered)

    // 2. Build payload
    const learner = getActiveLearner()
    if (!learner) return

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

    const outcome = await syncSession(payload)
    // Only queue for retry on a transient failure. A 'drop' (learner gone / not
    // owned) can never succeed, so queueing it would just loop forever.
    if (outcome === 'retry') {
      enqueueSession(payload)
    }
  }, [finishChapter])

  const flushOfflineQueue = useCallback(async () => {
    await flushQueue()
  }, [])

  return { finishAndSync, flushQueue: flushOfflineQueue }
}