'use client'
export const dynamic = 'force-static'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
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
import MiloPointer from '@/components/ui/MiloPointer'
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

  // ── Fit-to-screen: scale the chapter as large as possible while still fitting
  // the viewport, so it's BIG but never scrolls. Recomputes on resize / content
  // change. MAX caps how large; it shrinks below 1 only on very short screens.
  const fitRef = useRef<HTMLDivElement>(null)
  const zoomRef = useRef(1)
  const [zoom, setZoom] = useState(1)
  // The chapter's themed background, painted across the whole stage so the colour
  // fills the screen even when the (centred) content is narrower/shorter than it.
  const [stageBg, setStageBg] = useState<{ backgroundColor: string; backgroundImage: string }>({ backgroundColor: 'var(--bg-page)', backgroundImage: 'none' })
  useEffect(() => {
    const MIN = 0.5, PAD = 0.985
    function measure() {
      const wrap = fitRef.current
      const content = wrap?.firstElementChild as HTMLElement | null
      if (!wrap || !content) return
      // Lessons are full-height (nav pinned top, canvas centred, ScaleToFill grows
      // the content) — they aren't zoom-scaled. Only practice chapters are scaled.
      if (content.classList.contains('milo-lesson')) {
        if (zoomRef.current !== 1) { zoomRef.current = 1; setZoom(1) }
        const csL = getComputedStyle(content)
        if (csL.backgroundColor !== stageBg.backgroundColor || csL.backgroundImage !== stageBg.backgroundImage) {
          setStageBg({ backgroundColor: csL.backgroundColor, backgroundImage: csL.backgroundImage })
        }
        return
      }
      const MAX = 1.45
      // Rendered size (includes the current zoom). The relative step converges to
      // "fit the viewport" in one tick regardless of how zoom affects measurement.
      const r = content.getBoundingClientRect()
      if (!r.height || !r.width) return
      const cur = zoomRef.current || 1
      const factor = Math.min((window.innerWidth * PAD) / r.width, (window.innerHeight * PAD) / r.height)
      const next = Math.max(MIN, Math.min(MAX, cur * factor))
      if (Math.abs(next - cur) > 0.01) { zoomRef.current = next; setZoom(next) }
      // Mirror the chapter's background onto the full-screen stage.
      const cs = getComputedStyle(content)
      if (cs.backgroundColor !== stageBg.backgroundColor || cs.backgroundImage !== stageBg.backgroundImage) {
        setStageBg({ backgroundColor: cs.backgroundColor, backgroundImage: cs.backgroundImage })
      }
    }
    measure()
    const id = window.setInterval(measure, 150)   // re-reads firstElementChild → handles round/phase swaps
    window.addEventListener('resize', measure)
    return () => { window.clearInterval(id); window.removeEventListener('resize', measure) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    <>
    {/* Full-screen stage: holds the background and clips so nothing scrolls. The
        chapter is centred-at-top and scaled by the fit controller. */}
    <div className="kit-screen" style={{ backgroundColor: stageBg.backgroundColor, backgroundImage: stageBg.backgroundImage, position: 'fixed', inset: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div ref={fitRef} className="game-zoom" style={{ width: 'min(100vw, 680px)', ['--game-zoom' as any]: zoom } as React.CSSProperties}>
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
      </div>
    </div>
    {/* Modal + pointer live OUTSIDE the zoom wrapper so they stay full-screen and
        their fixed coords aren't double-scaled. */}
    <CelebrationModal />
    <MiloPointer />
    </>
  )
}