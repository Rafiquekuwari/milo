'use client'
export const dynamic = 'force-static'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, Suspense } from 'react'
import nextDynamic from 'next/dynamic'
import { useMiloStore, type ChapterType } from '@/lib/store'

import { getActiveLearner } from '@/lib/supabase/useLearnerSession'
import { setLastPlayed } from '@/lib/lastPlayed'
import CelebrationModal from '@/components/ui/CelebrationModal'
import MiloPointer from '@/components/ui/MiloPointer'
import { useChapterSync } from '@/lib/supabase/useChapterSync'
import { track } from '@/lib/analytics'

// Maps each chapter id to its component. The set of chapters lives in the
// registry (src/lib/chapters.ts); this map only wires ids → components, so a
// new chapter needs one line here. TypeScript's Record enforces completeness.
type ChapterProps = { onComplete: (correct: number, wrong: number) => void; childName: string }
const lazyChapter = (loader: () => Promise<{ default: React.ComponentType<ChapterProps> }>) =>
  nextDynamic(loader, { ssr: false })

const CHAPTER_COMPONENTS: Record<ChapterType, React.ComponentType<ChapterProps>> = {
  counting:           lazyChapter(() => import('@/components/game/CountingStoryChapter')),
  numberOrdering:     lazyChapter(() => import('@/components/game/NumberOrderingChapter')),
  numberRecognition:  lazyChapter(() => import('@/components/game/NumberDoorsChapter')),
  matchingQuantities: lazyChapter(() => import('@/components/game/MatchingQuantitiesChapter')),
  numberComparison:   lazyChapter(() => import('@/components/game/NumberComparisonChapter')),
  shapes:             lazyChapter(() => import('@/components/game/ShapeHouseChapter')),
  colors:             lazyChapter(() => import('@/components/game/ColorGardenChapter')),
  patterns:           lazyChapter(() => import('@/components/game/PatternsChapter')),
  addition:           lazyChapter(() => import('@/components/game/AdditionChapter')),
  subtraction:        lazyChapter(() => import('@/components/game/SubtractionChapter')),
  measurement:        lazyChapter(() => import('@/components/game/MeasurementChapter')),
  numbersTo100:       lazyChapter(() => import('@/components/game/Numbers100Chapter')),
  placeValue:         lazyChapter(() => import('@/components/game/PlaceValueChapter')),
  skipCounting:       lazyChapter(() => import('@/components/game/SkipCountingChapter')),
  storyProblems:      lazyChapter(() => import('@/components/game/StoryProblemsChapter')),
  multiplication:     lazyChapter(() => import('@/components/game/MultiplicationChapter')),
  fractions:          lazyChapter(() => import('@/components/game/FractionsChapter')),
  money:              lazyChapter(() => import('@/components/game/MoneyChapter')),
  time:               lazyChapter(() => import('@/components/game/TimeChapter')),
  compareNumbers:     lazyChapter(() => import('@/components/game/CompareChapter')),
  additionTo100:      lazyChapter(() => import('@/components/game/ArithmeticChapter').then(m => ({ default: m.AdditionTo100Chapter }))),
  subtractionTo100:   lazyChapter(() => import('@/components/game/ArithmeticChapter').then(m => ({ default: m.SubtractionTo100Chapter }))),
  shapes2d3d:         lazyChapter(() => import('@/components/game/Shapes2D3DChapter')),
  // 9–11
  bigNumbers:         lazyChapter(() => import('@/components/game/BigNumbersChapter')),
  rounding:           lazyChapter(() => import('@/components/game/RoundingChapter')),
  timesTables:        lazyChapter(() => import('@/components/game/TimesTablesChapter')),
  division:           lazyChapter(() => import('@/components/game/DivisionChapter')),
  factorsMultiples:   lazyChapter(() => import('@/components/game/FactorsChapter')),
  fractionsCompare:   lazyChapter(() => import('@/components/game/FractionsCompareChapter')),
  decimals:           lazyChapter(() => import('@/components/game/DecimalsChapter')),
  measurementUnits:   lazyChapter(() => import('@/components/game/MeasureUnitsChapter')),
  areaPerimeter:      lazyChapter(() => import('@/components/game/AreaPerimeterChapter')),
  anglesSymmetry:     lazyChapter(() => import('@/components/game/AnglesSymmetryChapter')),
  dataGraphs:         lazyChapter(() => import('@/components/game/DataGraphsChapter')),
  wordProblems:       lazyChapter(() => import('@/components/game/WordProblemsChapter')),
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
  // Guards against a chapter firing onComplete twice (double-tap / re-render):
  // a second call would double-count XP, coins and stars both locally and via
  // sync. Reset when a new chapter opens.
  const completedRef = useRef(false)
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
      completedRef.current = false
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
    if (completedRef.current) return   // ignore a double-fired completion
    completedRef.current = true
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
          return Chapter ? (
            <Suspense fallback={null}>
              <Chapter {...props} />
            </Suspense>
          ) : null
        })()}
      </div>
    </div>
    {/* Modal + pointer live OUTSIDE the zoom wrapper so they stay full-screen and
        their fixed coords aren't double-scaled. The counting story renders its own
        celebration over the forest, so we skip the global one there. */}
    {playingChapter !== 'counting' && <CelebrationModal />}
    <MiloPointer />
    </>
  )
}