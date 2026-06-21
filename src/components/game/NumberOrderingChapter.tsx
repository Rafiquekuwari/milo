'use client'
/**
 * NumberOrderingChapter — "Chapter 2" as the landscape stepping-path story mode.
 *
 * Same shape as CountingStoryChapter: keep the journey portal mounted and render the
 * celebration over it (no cut to a blank screen). The pedagogy lives in the top-down
 * RiverCrossing experience (see story/RiverCrossing.tsx).
 */
import { createPortal } from 'react-dom'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import RiverCrossing from '@/components/story/RiverCrossing'
import { useChapterSync } from '@/lib/supabase/useChapterSync'
import CelebrationModal from '@/components/ui/CelebrationModal'

export default function NumberOrderingChapter(_props: { onComplete: (correct: number, wrong: number) => void; childName: string }) {
  const router = useRouter()
  const { finishAndSync } = useChapterSync()
  const [body, setBody] = useState<HTMLElement | null>(null)
  const [runKey, setRunKey] = useState(0)        // bump to replay the chapter
  const doneRef = useRef(false)
  useEffect(() => { setBody(document.body) }, [])

  const finish = useCallback((correct: number, wrong: number) => {
    if (doneRef.current) return
    doneRef.current = true
    finishAndSync('numberOrdering', correct, wrong, 'practice')   // XP/coins/stars + store.celebration
  }, [finishAndSync])

  const restart = useCallback(() => { doneRef.current = false; setRunKey(k => k + 1) }, [])

  if (!body) return null
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 900, background: '#bfe6f7' }}>
      <RiverCrossing key={runKey} onFinish={finish} onExit={() => router.push('/menu')} />
      <CelebrationModal onExit={() => router.push('/menu')} onPlayAgain={restart} />
    </div>,
    body,
  )
}
