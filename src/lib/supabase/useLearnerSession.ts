'use client'
/**
 * useLearnerSession
 * 
 * Stores the currently selected learner in sessionStorage.
 * Parent picks a child → stored here → game pages read it.
 * Cleared on sign out.
 */

import { useState, useEffect, useCallback } from 'react'
import type { Learner } from './types'

const KEY = 'milo_active_learner'

export function setActiveLearner(learner: Learner) {
  sessionStorage.setItem(KEY, JSON.stringify(learner))
}

export function getActiveLearner(): Learner | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function clearActiveLearner() {
  sessionStorage.removeItem(KEY)
}

export function useLearnerSession() {
  const [learner, setLearnerState] = useState<Learner | null>(null)

  useEffect(() => {
    setLearnerState(getActiveLearner())
  }, [])

  const selectLearner = useCallback((l: Learner) => {
    setActiveLearner(l)
    setLearnerState(l)
  }, [])

  const clearLearner = useCallback(() => {
    clearActiveLearner()
    setLearnerState(null)
  }, [])

  return { learner, selectLearner, clearLearner }
}
