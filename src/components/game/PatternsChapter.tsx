'use client'
/**
 * PatternsChapter — "Chapter 8" as the Bead Shop story mode.
 *
 * Same shape as ColorGardenChapter / ShapeHouseChapter: keep the story portal mounted and render
 * the celebration over it (no cut to a blank screen). The pedagogy lives in the pattern walk
 * (see story/BeadShop.tsx). Reuses skill `patterns`.
 */
import { createPortal } from 'react-dom'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import BeadShop from '@/components/story/BeadShop'
import { useChapterSync } from '@/lib/supabase/useChapterSync'
import CelebrationModal from '@/components/ui/CelebrationModal'

export default function PatternsChapter(_props: { onComplete: (correct: number, wrong: number, mastered?: boolean) => void; childName: string }) {
  const router = useRouter()
  const { finishAndSync } = useChapterSync()
  const [body, setBody] = useState<HTMLElement | null>(null)
  const [runKey, setRunKey] = useState(0)        // bump to replay the chapter
  const doneRef = useRef(false)
  useEffect(() => { setBody(document.body) }, [])

  const finish = useCallback((correct: number, wrong: number, mastered?: boolean) => {
    if (doneRef.current) return
    doneRef.current = true
    finishAndSync('patterns', correct, wrong, 'practice', mastered)   // XP/coins/stars + store.celebration
  }, [finishAndSync])

  const restart = useCallback(() => { doneRef.current = false; setRunKey(k => k + 1) }, [])

  if (!body) return null
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 900, background: '#fff3e2' }}>
      <BeadShop key={runKey} onFinish={finish} onExit={() => router.push('/menu')} />
      <CelebrationModal onExit={() => router.push('/menu')} onPlayAgain={restart} />
    </div>,
    body,
  )
}
