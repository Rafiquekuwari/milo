/**
 * useChapterPhase — tracks lesson vs practice phase
 * Returns 'lesson' or 'practice'.
 * Chapters just switch on this to render ChapterLesson or their game UI.
 */
import { useState } from 'react'
export type Phase = 'lesson' | 'practice'
export function useChapterPhase(): { phase: Phase; startPractice: () => void } {
  const [phase, setPhase] = useState<Phase>('lesson')
  return { phase, startPractice: () => setPhase('practice') }
}