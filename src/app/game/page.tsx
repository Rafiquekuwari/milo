'use client'
export const dynamic = 'force-static'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useMiloStore, type ChapterType } from '@/lib/store'

import { getActiveLearner } from '@/lib/supabase/useLearnerSession'
import { setLastPlayed } from '@/lib/lastPlayed'
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
import Numbers100Chapter from '@/components/game/Numbers100Chapter'
import PlaceValueChapter from '@/components/game/PlaceValueChapter'
import SkipCountingChapter from '@/components/game/SkipCountingChapter'
import StoryProblemsChapter from '@/components/game/StoryProblemsChapter'
import MultiplicationChapter from '@/components/game/MultiplicationChapter'
import FractionsChapter from '@/components/game/FractionsChapter'
import MoneyChapter from '@/components/game/MoneyChapter'
import TimeChapter from '@/components/game/TimeChapter'
import CompareChapter from '@/components/game/CompareChapter'
import { AdditionTo100Chapter, SubtractionTo100Chapter } from '@/components/game/ArithmeticChapter'
import Shapes2D3DChapter from '@/components/game/Shapes2D3DChapter'
import BigNumbersChapter from '@/components/game/BigNumbersChapter'
import RoundingChapter from '@/components/game/RoundingChapter'
import TimesTablesChapter from '@/components/game/TimesTablesChapter'
import DivisionChapter from '@/components/game/DivisionChapter'
import FactorsChapter from '@/components/game/FactorsChapter'
import FractionsCompareChapter from '@/components/game/FractionsCompareChapter'
import DecimalsChapter from '@/components/game/DecimalsChapter'
import MeasureUnitsChapter from '@/components/game/MeasureUnitsChapter'
import AreaPerimeterChapter from '@/components/game/AreaPerimeterChapter'
import AnglesSymmetryChapter from '@/components/game/AnglesSymmetryChapter'
import CelebrationModal from '@/components/ui/CelebrationModal'
import MiloPointer from '@/components/ui/MiloPointer'
import { useChapterSync } from '@/lib/supabase/useChapterSync'
import { track } from '@/lib/analytics'

// Maps each chapter id to its component. The set of chapters lives in the
// registry (src/lib/chapters.ts); this map only wires ids → components, so a
// new chapter needs one line here. TypeScript's Record enforces completeness.
type ChapterProps = { onComplete: (correct: number, wrong: number) => void; childName: string }
const CHAPTER_COMPONENTS: Record<ChapterType, React.ComponentType<ChapterProps>> = {
  counting:           CountingChapter,
  numberOrdering:     NumberOrderingChapter,
  numberRecognition:  NumberDoorsChapter,
  matchingQuantities: MatchingQuantitiesChapter,
  numberComparison:   NumberComparisonChapter,
  shapes:             ShapeHouseChapter,
  colors:             ColorGardenChapter,
  patterns:           PatternsChapter,
  addition:           AdditionChapter,
  subtraction:        SubtractionChapter,
  measurement:        MeasurementChapter,
  numbersTo100:       Numbers100Chapter,
  placeValue:         PlaceValueChapter,
  skipCounting:       SkipCountingChapter,
  storyProblems:      StoryProblemsChapter,
  multiplication:     MultiplicationChapter,
  fractions:          FractionsChapter,
  money:              MoneyChapter,
  time:               TimeChapter,
  compareNumbers:     CompareChapter,
  additionTo100:      AdditionTo100Chapter,
  subtractionTo100:   SubtractionTo100Chapter,
  shapes2d3d:         Shapes2D3DChapter,
  // 9–11
  bigNumbers:         BigNumbersChapter,
  rounding:           RoundingChapter,
  timesTables:        TimesTablesChapter,
  division:           DivisionChapter,
  factorsMultiples:   FactorsChapter,
  fractionsCompare:   FractionsCompareChapter,
  decimals:           DecimalsChapter,
  measurementUnits:   MeasureUnitsChapter,
  areaPerimeter:      AreaPerimeterChapter,
  anglesSymmetry:     AnglesSymmetryChapter,
}

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
      // Save last played chapter for resume flow (timestamped; reconciled with
      // the server on the menu so "Continue" syncs across devices).
      if (currentChapter) setLastPlayed(learner.id, currentChapter)
    }
    if (navigator.onLine) flushQueue()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (currentChapter) {
      setPlayingChapter(currentChapter)
      track('chapter_open', { chapter: currentChapter })
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
    track('practice_complete', { chapter: playingChapter, correct, wrong })
    // Works offline — queues locally (IndexedDB via kv) if no network
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
        {!chapterDone && playingChapter && (() => {
          const Chapter = CHAPTER_COMPONENTS[playingChapter]
          return Chapter ? <Chapter {...props} /> : null
        })()}
      </div>
    </div>
    {/* Modal + pointer live OUTSIDE the zoom wrapper so they stay full-screen and
        their fixed coords aren't double-scaled. */}
    <CelebrationModal />
    <MiloPointer />
    </>
  )
}