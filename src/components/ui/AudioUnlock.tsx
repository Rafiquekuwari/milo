'use client'

/**
 * AudioUnlock — invisible component that handles Chrome autoplay policy
 *
 * New approach: we no longer need a visible unlock banner.
 * The "Listen to Milo..." button in ChapterLesson serves as the
 * natural gesture that unlocks audio (via replayLast()).
 *
 * This component is now a no-op stub kept for import compatibility.
 * Safe to remove from layouts if desired.
 */

export default function AudioUnlock() {
  return null
}