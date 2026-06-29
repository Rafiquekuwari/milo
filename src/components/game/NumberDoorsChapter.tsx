'use client'
/**
 * NumberDoorsChapter — "Chapter 4" as the Number Doors story mode.
 *
 * Same shape as NumberComparisonChapter (Kitchen): keep the story portal mounted and
 * render the celebration over it (no cut to a blank screen). The pedagogy lives in the
 * delivery experience (see story/NumberDoors.tsx). Reuses skill `numberRecognition`.
 */
import { createPortal } from 'react-dom'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import NumberDoors from '@/components/story/NumberDoors'
import { useChapterSync } from '@/lib/supabase/useChapterSync'
import CelebrationModal from '@/components/ui/CelebrationModal'

export default function NumberDoorsChapter(_props: { onComplete: (correct: number, wrong: number) => void; childName: string }) {
  const router = useRouter()
  const { finishAndSync } = useChapterSync()
  const [body, setBody] = useState<HTMLElement | null>(null)
  const [runKey, setRunKey] = useState(0)        // bump to replay the chapter
  const doneRef = useRef(false)
  useEffect(() => { setBody(document.body) }, [])

  const finish = useCallback((correct: number, wrong: number, mastered?: boolean) => {
    if (doneRef.current) return
    doneRef.current = true
    finishAndSync('numberRecognition', correct, wrong, 'practice', mastered)   // XP/coins/stars + store.celebration
  }, [finishAndSync])

  const restart = useCallback(() => { doneRef.current = false; setRunKey(k => k + 1) }, [])

  if (!body) return null
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 900, background: '#241c39' }}>
      <NumberDoors key={runKey} onFinish={finish} onExit={() => router.push('/menu')} />
      <CelebrationModal onExit={() => router.push('/menu')} onPlayAgain={restart} />
    </div>,
    body,
  )
}
