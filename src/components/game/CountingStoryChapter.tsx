'use client'
/**
 * CountingStoryChapter — "Chapter 1" as the landscape forest story mode.
 *
 * The whole experience is one continuous scene: the practice finishes, Milo stays
 * standing in the forest, and the celebration appears OVER that same forest (no
 * cut to a blank screen). To do that we keep the forest portal mounted and render
 * the celebration inside it, awarding XP/coins/stars directly (which also sets the
 * store's celebration). We deliberately don't call the game's onComplete — that
 * would unmount the chapter and break the continuity.
 */
import { createPortal } from 'react-dom'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import ForestWalk from '@/components/story/ForestWalk'
import { countingChapter } from '@/components/story/chapters'
import { useChapterSync } from '@/lib/supabase/useChapterSync'
import CelebrationModal from '@/components/ui/CelebrationModal'

export default function CountingStoryChapter(_props: { onComplete: (correct: number, wrong: number) => void; childName: string }) {
  const router = useRouter()
  const { finishAndSync } = useChapterSync()
  const [body, setBody] = useState<HTMLElement | null>(null)
  const [runKey, setRunKey] = useState(0)        // bump to replay the chapter
  const doneRef = useRef(false)
  useEffect(() => { setBody(document.body) }, [])

  const finish = useCallback((correct: number, wrong: number, mastered?: boolean) => {
    if (doneRef.current) return
    doneRef.current = true
    finishAndSync('counting', correct, wrong, 'practice', mastered)   // XP/coins/stars + store.celebration
  }, [finishAndSync])

  const restart = useCallback(() => { doneRef.current = false; setRunKey(k => k + 1) }, [])

  if (!body) return null
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 900, background: '#bfe6f7' }}>
      <ForestWalk key={runKey} chapter={countingChapter} onFinish={finish} onExit={() => router.push('/menu')} />
      {/* Renders inside the same portal so it layers over the forest, not a blank screen. */}
      <CelebrationModal onExit={() => router.push('/menu')} onPlayAgain={restart} />
    </div>,
    body,
  )
}
