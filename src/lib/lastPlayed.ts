'use client'
/**
 * "Continue where you left off" — cross-device.
 *
 * The chapter the learner last played is cached per-device in localStorage with
 * a timestamp, and reconciled against the server on menu load. The server side
 * needs no extra column: `learner_progress.last_played_at` is updated on every
 * completed session, so the most-recently-played chapter is just the progress
 * row with the newest `last_played_at`. We adopt whichever side is newer, so the
 * resume target follows the learner from phone to tablet without losing a more
 * recent open on the current device.
 */

import type { ChapterType } from './supabase/types'

interface LastPlayed { chapter: ChapterType; at: number }

const key = (learnerId: string) => `milo-last-played-${learnerId}`

export function getLastPlayed(learnerId: string): LastPlayed | null {
  try {
    const raw = localStorage.getItem(key(learnerId))
    if (!raw) return null
    // Legacy format was a bare chapter string with no timestamp.
    if (raw[0] !== '{') return { chapter: raw as ChapterType, at: 0 }
    const parsed = JSON.parse(raw)
    if (!parsed?.chapter) return null
    return { chapter: parsed.chapter as ChapterType, at: Number(parsed.at) || 0 }
  } catch { return null }
}

export function setLastPlayed(learnerId: string, chapter: ChapterType, at: number = Date.now()) {
  try {
    localStorage.setItem(key(learnerId), JSON.stringify({ chapter, at }))
  } catch {}
}

/**
 * Merge the server's most-recently-played chapter (from learner_progress) with
 * the local cache, keeping whichever is newer. Persists the winner locally and
 * returns it, so the next device starts already in sync.
 */
export function reconcileLastPlayed(
  learnerId: string,
  serverChapter: ChapterType | undefined,
  serverAtISO: string | null | undefined,
): ChapterType | null {
  const local = getLastPlayed(learnerId)
  if (!serverChapter) return local?.chapter ?? null

  const serverAt = serverAtISO ? new Date(serverAtISO).getTime() : 0
  // Server wins when it's strictly newer than the local open (or nothing local).
  if (!local || serverAt > local.at) {
    setLastPlayed(learnerId, serverChapter, serverAt || Date.now())
    return serverChapter
  }
  return local.chapter
}
