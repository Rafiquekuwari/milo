'use client'
/**
 * ShapeHouseChapter — "Chapter 6" as the Shape Town story mode.
 *
 * Same shape as NumberDoorsChapter / MatchingQuantitiesChapter: keep the story portal
 * mounted and render the celebration over it (no cut to a blank screen). The pedagogy
 * lives in the shape-recognition walk (see story/ShapeTown.tsx). Reuses skill `shapes`.
 */
import { createPortal } from 'react-dom'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import ShapeTown from '@/components/story/ShapeTown'
import { useChapterSync } from '@/lib/supabase/useChapterSync'
import CelebrationModal from '@/components/ui/CelebrationModal'

export default function ShapeHouseChapter(_props: { onComplete: (correct: number, wrong: number) => void; childName: string }) {
  const router = useRouter()
  const { finishAndSync } = useChapterSync()
  const [body, setBody] = useState<HTMLElement | null>(null)
  const [runKey, setRunKey] = useState(0)        // bump to replay the chapter
  const doneRef = useRef(false)
  useEffect(() => { setBody(document.body) }, [])

  const finish = useCallback((correct: number, wrong: number) => {
    if (doneRef.current) return
    doneRef.current = true
    finishAndSync('shapes', correct, wrong, 'practice')   // XP/coins/stars + store.celebration
  }, [finishAndSync])

  const restart = useCallback(() => { doneRef.current = false; setRunKey(k => k + 1) }, [])

  if (!body) return null
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 900, background: '#dff0e4' }}>
      <ShapeTown key={runKey} onFinish={finish} onExit={() => router.push('/menu')} />
      <CelebrationModal onExit={() => router.push('/menu')} onPlayAgain={restart} />
    </div>,
    body,
  )
}
