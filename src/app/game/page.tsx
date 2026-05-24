'use client'
export const dynamic = 'force-static'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useMiloStore } from '@/lib/store'

import { getActiveLearner } from '@/lib/supabase/useLearnerSession'
import CountingChapter from '@/components/game/CountingChapter'
import NumberOrderingChapter from '@/components/game/NumberOrderingChapter'
import NumberDoorsChapter from '@/components/game/NumberDoorsChapter'
import MatchingQuantitiesChapter from '@/components/game/MatchingQuantitiesChapter'
import NumberComparisonChapter from '@/components/game/NumberComparisonChapter'
import ShapeHouseChapter from '@/components/game/ShapeHouseChapter'
import ColorGardenChapter from '@/components/game/ColorGardenChapter'
import PatternsChapter from '@/components/game/PatternsChapter'
import AdditionChapter from '@/components/game/AdditionChapter'
import SubtractionChapter from '@/components/game/SubtractionChapter'
import MeasurementChapter from '@/components/game/MeasurementChapter'
import CelebrationModal from '@/components/ui/CelebrationModal'
import { useChapterSync } from '@/lib/supabase/useChapterSync'

export default function GamePage() {
  const router         = useRouter()
  const profile        = useMiloStore(s => s.profile)
  const currentChapter = useMiloStore(s => s.currentChapter)
  const celebration    = useMiloStore(s => s.celebration)
  const { finishAndSync, flushQueue } = useChapterSync()

  const [playingChapter,  setPlayingChapter]  = useState(currentChapter)
  const [chapterDone,    setChapterDone]    = useState(false)
  const [ready,          setReady]          = useState(false)
  const [childName,      setChildName]      = useState(profile.childName)

  useEffect(() => {
    const learner = getActiveLearner()
    if (learner) {
      setChildName(learner.display_name)
      // Save last played chapter for resume flow
      if (currentChapter) {
        try { localStorage.setItem(`milo-last-played-${learner.id}`, currentChapter) } catch {}
      }
    }
    if (navigator.onLine) flushQueue()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (currentChapter) {
      setPlayingChapter(currentChapter)
      setChapterDone(false)
      setReady(true)
      return
    }

    if (!celebration) {
      router.replace('/menu')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentChapter])

  async function handleComplete(correct: number, wrong: number) {
    if (!playingChapter) return
    setChapterDone(true)
    // Works offline — queues to localStorage if no network
    await finishAndSync(playingChapter, correct, wrong, 'practice')
  }

  if (!ready && !playingChapter) return null

  const props = { onComplete: handleComplete, childName: childName || profile.childName }

  return (
    <div className="kit-screen" style={{ background: 'var(--bg-page)' }}>
      {/* GameTopbar is rendered inside each chapter component */}


      {!chapterDone && playingChapter && (
        <>
          {playingChapter === 'counting'            && <CountingChapter {...props} />}
          {playingChapter === 'numberOrdering'      && <NumberOrderingChapter {...props} />}
          {playingChapter === 'numberRecognition'   && <NumberDoorsChapter {...props} />}
          {playingChapter === 'matchingQuantities'  && <MatchingQuantitiesChapter {...props} />}
          {playingChapter === 'numberComparison'    && <NumberComparisonChapter {...props} />}
          {playingChapter === 'shapes'              && <ShapeHouseChapter {...props} />}
          {playingChapter === 'colors'              && <ColorGardenChapter {...props} />}
          {playingChapter === 'patterns'            && <PatternsChapter {...props} />}
          {playingChapter === 'addition'            && <AdditionChapter {...props} />}
          {playingChapter === 'subtraction'         && <SubtractionChapter {...props} />}
          {playingChapter === 'measurement'         && <MeasurementChapter {...props} />}
        </>
      )}
      <CelebrationModal />
    </div>
  )
}