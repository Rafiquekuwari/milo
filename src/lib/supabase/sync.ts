'use client'
/**
 * useSessionSync — call after every chapter completion
 *
 * Tries to sync to Supabase immediately.
 * If offline: queues locally in localStorage, retries on reconnect.
 * Deduplication via client_id (uuid) prevents double-saves.
 */

import { useCallback, useEffect } from 'react'
import { syncSession, queueOfflineSession, flushOfflineQueue } from './queries'
import type { SessionPayload } from './queries'

const QUEUE_KEY = 'milo_offline_queue'

function getLocalQueue(): SessionPayload[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]')
  } catch { return [] }
}

function addToLocalQueue(payload: SessionPayload) {
  const q = getLocalQueue()
  q.push(payload)
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q))
}

function clearLocalQueue() {
  localStorage.removeItem(QUEUE_KEY)
}

async function flushLocalQueue(learnerId: string) {
  const q = getLocalQueue()
  if (q.length === 0) return

  const remaining: SessionPayload[] = []
  for (const payload of q) {
    if (payload.learnerId !== learnerId) {
      remaining.push(payload)
      continue
    }
    if (await syncSession(payload) === 'retry') remaining.push(payload)
  }

  if (remaining.length === 0) {
    clearLocalQueue()
  } else {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining))
  }

  // Also flush any server-side queue
  await flushOfflineQueue(learnerId)
}

export function useSessionSync(learnerId: string | null) {
  // Flush queued sessions when coming back online
  useEffect(() => {
    if (!learnerId) return

    async function onOnline() {
      await flushLocalQueue(learnerId!)
    }

    window.addEventListener('online', onOnline)

    // Also try on mount (in case we're online after being offline)
    if (navigator.onLine) onOnline()

    return () => window.removeEventListener('online', onOnline)
  }, [learnerId])

  const submitSession = useCallback(async (
    payload: Omit<SessionPayload, 'learnerId'>
  ) => {
    if (!learnerId) return

    const full: SessionPayload = { ...payload, learnerId }

    if (!navigator.onLine) {
      // Offline — queue locally
      addToLocalQueue(full)
      await queueOfflineSession(full).catch(() => {}) // best-effort server queue
      return
    }

    // Online but sync failed transiently — queue locally for retry. A 'drop'
    // (permanent rejection) is discarded rather than queued.
    if (await syncSession(full) === 'retry') {
      addToLocalQueue(full)
    }
  }, [learnerId])

  return { submitSession }
}
