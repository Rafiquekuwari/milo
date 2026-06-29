'use client'
/**
 * CoordinatePlaneChapter (12–14, "Field Lab") — "Mapping the Field".
 *
 * Portal pattern (like IntegersChapter): renders full-screen over the game
 * stage so it bypasses the kids' zoom/celebration, sets data-band="12-14" to
 * scope the teen theme, and calls finishAndSync itself. Flow:
 *   intro (CaseCard) → lesson (CoordinatePlaneTeenLesson) → practice → done
 * Uses the SAME engine as every chapter: useAdaptive (L1/L2/L3). This ships the
 * CoordGrid MVP in practice: read a marked point, plot a given pair, name a
 * quadrant, measure a distance on a shared axis, and reflect across an axis.
 * No visible difficulty tier (locked rule).
 */
import { createPortal } from 'react-dom'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useChapterSync } from '@/lib/supabase/useChapterSync'
import { useAdaptive } from '@/lib/adaptive'
import { makeDistinct } from '@/lib/questionVariety'
import { speak, speakAfterCurrent, unlockSpeech, stopSpeech } from '@/lib/useMiloSpeaker'
import type { AgeBand, Pt } from '@/components/teen/types'
import CaseCard from '@/components/teen/CaseCard'
import TeenTopbar from '@/components/teen/TeenTopbar'
import ChoiceGrid from '@/components/teen/ChoiceGrid'
import CoordGrid from '@/components/teen/CoordGrid'
import StreakMarker from '@/components/teen/StreakMarker'
import MiloMark from '@/components/teen/MiloMark'
import MasteryState from '@/components/teen/MasteryState'
import ExploreStep from '@/components/teen/ExploreStep'
import PointExplorer from '@/components/teen/sims/PointExplorer'
import CoordinatePlaneTeenLesson, {
  makeRound,
  CoordWatch,
  fmtPt,
  ptsEqual,
  type Round,
} from '@/components/lessons/CoordinatePlaneTeenLesson'

const BAND: AgeBand = '12-14'
const TOTAL_ROUNDS = 8
const FEEDBACK_MS = 1600

type Props = { onComplete: (correct: number, wrong: number) => void; childName: string }

const usesGrid = (k: Round['kind']) => k === 'read' || k === 'plot' || k === 'reflect'

// ── The chapter "world": intro → lesson → practice → done ──────────────────
function CoordinatePlaneWorld({
  childName, onFinish, onExit, onReplay,
}: {
  childName: string; onFinish: (c: number, w: number, mastered?: boolean) => void; onExit: () => void; onReplay: () => void
}) {
  const [phase, setPhase] = useState<'intro' | 'explore' | 'lesson' | 'practice' | 'done'>('intro')

  if (phase === 'intro') {
    return (
      <Centered>
        <div style={{ width: '100%', maxWidth: 520 }}>
          <CaseCard
            band={BAND}
            title="Mapping the Field"
            why="Map pins, game grids, GPS and screen pixels all use an (x, y) address — one ordered pair pins down any spot."
            question="How do you read, plot, and measure points on the coordinate plane?"
            startLabel="Start the investigation"
            onStart={() => { unlockSpeech(); setPhase('explore') }}
          />
        </div>
      </Centered>
    )
  }

  if (phase === 'explore') {
    return (
      <ExploreStep
        band={BAND}
        title="Move the point"
        intro="Slide x and y to move one point around the plane, and watch its ordered pair and quadrant update together. Get a feel for it, then continue."
        onContinue={() => setPhase('lesson')}
      >
        <PointExplorer band={BAND} />
      </ExploreStep>
    )
  }

  if (phase === 'lesson') {
    return <CoordinatePlaneTeenLesson band={BAND} childName={childName} onLessonComplete={() => setPhase('practice')} />
  }

  if (phase === 'done') {
    return (
      <Centered>
        <MasteryState
          band={BAND}
          conceptsConfirmed={['Reading ordered pairs', 'Naming quadrants', 'Plotting points', 'Distance & reflection']}
          nextPointer="Next: linear relationships & functions."
          onPlayAgain={onReplay}
          onExit={onExit}
        />
      </Centered>
    )
  }

  return (
    <CoordinatePlanePractice
      childName={childName}
      onExit={onExit}
      onDone={(c, w, mastered) => { onFinish(c, w, mastered); setPhase('done') }}
    />
  )
}

function CoordinatePlanePractice({
  childName, onDone, onExit,
}: {
  childName: string; onDone: (c: number, w: number, mastered?: boolean) => void; onExit: () => void
}) {
  const ada = useAdaptive('coordinatePlane')
  const seen = useRef<Set<string>>(new Set())   // question signatures asked this session
  const [roundIdx, setRoundIdx] = useState(0)
  const [round, setRound] = useState<Round>(() => makeDistinct(() => makeRound(1), seen.current))
  const [plotted, setPlotted] = useState<Pt | null>(null)
  const [selected, setSelected] = useState<string | number | null>(null)
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle')
  const [correct, setCorrect] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [wrongRun, setWrongRun] = useState(0)
  const [reteach, setReteach] = useState<Round | null>(null)
  const greeted = useRef(false)

  // Load a fresh round whenever the index (or difficulty) changes.
  useEffect(() => {
    const r = makeDistinct(() => makeRound(ada.difficulty), seen.current)
    setRound(r); setPlotted(null); setSelected(null); setStatus('idle')
    const lead = greeted.current ? '' : `Hi ${childName}. `
    greeted.current = true
    speakAfterCurrent(`${lead}${r.say}`)
  }, [roundIdx, ada.difficulty]) // eslint-disable-line react-hooks/exhaustive-deps

  function advance(ok: boolean, run: number, r: Round, mastered: boolean) {
    if (!ok && run >= 3) { setReteach(r); return }
    // Demonstrated mastery → finish early with full stars, skip the repetitive tail.
    if (mastered) { onDone(ok ? correct + 1 : correct, ok ? wrong : wrong + 1, true); return }
    const next = roundIdx + 1
    if (next >= TOTAL_ROUNDS) onDone(ok ? correct + 1 : correct, ok ? wrong : wrong + 1)
    else setRoundIdx(next)
  }

  // Shared grading tail (used by both the grid-tap path and the MCQ path).
  function grade(ok: boolean, revealSay: string) {
    setStatus(ok ? 'correct' : 'wrong')
    const res = ada.record(ok)
    const run = ok ? 0 : wrongRun + 1
    setWrongRun(run)
    if (ok) { setCorrect((c) => c + 1); speak(`Correct. ${ada.praise}`) }
    else { setWrong((w) => w + 1); speak(`${revealSay} ${ada.encouragement}`) }
    window.setTimeout(() => advance(ok, run, round, res.mastered), FEEDBACK_MS)
  }

  // Grid tap (read / plot / reflect): the answer is round.target.
  function onPlot(p: Pt) {
    if (status !== 'idle') return
    setPlotted(p)
    const ok = ptsEqual(p, round.target)
    grade(ok, `The point is ${fmtPt(round.target)}.`)
  }

  // MCQ pick (quadrant / distance): the answer is round.answer.
  function pick(v: string | number) {
    if (status !== 'idle') return
    setSelected(v)
    const ok = v === round.answer
    grade(ok, `The answer is ${round.answer}.`)
  }

  function finishReteach() {
    setReteach(null); setWrongRun(0)
    const next = roundIdx + 1
    if (next >= TOTAL_ROUNDS) onDone(correct, wrong)
    else setRoundIdx(next)
  }

  const gridRound = usesGrid(round.kind)

  return (
    <div className="milo-lesson" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--bg-page)', color: 'var(--ink)', fontFamily: 'var(--font-body)' }}>
      <div style={{ width: '100%', maxWidth: 640 }}>
        <TeenTopbar band={BAND} title="The Coordinate Plane" roundIdx={roundIdx} totalRounds={TOTAL_ROUNDS} onBack={() => { stopSpeech(); onExit() }} />
      </div>

      <main style={{ flex: 1, width: '100%', maxWidth: 560, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, padding: '12px 18px 28px', boxSizing: 'border-box' }}>
        <div style={{ alignSelf: 'flex-end' }}><StreakMarker band={BAND} count={ada.streak} /></div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%' }}>
          <MiloMark band={BAND} mood={status === 'idle' ? 'thinking' : 'speaking'} size={36} />
          <div style={{ flex: 1, background: 'var(--paper)', border: '1px solid var(--outline)', borderRadius: 12, padding: '10px 14px', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 16, color: 'var(--ink)' }}>
            {round.promptText}
          </div>
        </div>

        <CoordGrid
          band={BAND}
          xRange={[-round.range, round.range]}
          yRange={[-round.range, round.range]}
          mode={round.kind === 'plot' || round.kind === 'reflect' ? 'plot' : 'read'}
          points={round.points}
          highlight={round.kind === 'read' ? round.highlight ?? null : null}
          value={gridRound ? plotted : null}
          status={gridRound ? status : 'idle'}
          onPlot={gridRound ? onPlot : undefined}
        />

        {!gridRound && round.choices && (
          <div style={{ width: '100%', maxWidth: 380 }}>
            <ChoiceGrid
              band={BAND}
              choices={round.choices}
              selected={selected}
              status={status}
              correctValue={round.answer}
              onPick={pick}
              columns={round.kind === 'quadrant' ? 2 : round.choices.length}
            />
          </div>
        )}

        <button
          type="button"
          onClick={() => speak(round.say)}
          style={{ background: 'transparent', border: '1px solid var(--outline)', borderRadius: 8, color: 'var(--ink-soft)', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13, padding: '6px 12px', cursor: 'pointer' }}
        >
          ◑ Say it again
        </button>
      </main>

      {reteach && <ReteachPanel round={reteach} onContinue={finishReteach} />}
    </div>
  )
}

// Adaptive re-explanation: shown after a few misses in a row. Re-works the
// concept on a coordinate grid, then continues (no penalty, no red).
function ReteachPanel({ round, onContinue }: { round: Round; onContinue: () => void }) {
  const [ready, setReady] = useState(false)
  if (typeof document === 'undefined') return null
  // Reuse the round's own context so the re-teach mirrors what was asked.
  const ctxPoints = round.points ?? []
  const watchPoints = round.kind === 'reflect' ? ctxPoints : [...ctxPoints, round.target]
  return createPortal(
    <div data-band={BAND} role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 950, background: 'color-mix(in srgb, var(--ink) 30%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--paper)', border: '1px solid var(--outline)', borderRadius: 16, padding: '22px 22px 20px', maxWidth: 520, width: '100%', boxShadow: '0 6px 28px color-mix(in srgb, var(--ink) 18%, transparent)' }}>
        <p style={{ margin: '0 0 14px', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>Let’s look at this one together.</p>
        <CoordWatch
          lines={[round.explain]}
          range={round.range}
          points={round.kind === 'reflect' ? ctxPoints : watchPoints}
          highlight={round.kind === 'reflect' ? null : round.target}
          value={round.kind === 'reflect' ? round.target : null}
          onDone={() => setReady(true)}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
          <button type="button" disabled={!ready} onClick={onContinue} style={{ padding: '10px 20px', borderRadius: 10, background: ready ? 'var(--accent)' : 'var(--bg-2)', border: `1px solid ${ready ? 'var(--accent)' : 'var(--outline)'}`, color: ready ? 'var(--paper)' : 'var(--ink-muted)', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 15, cursor: ready ? 'pointer' : 'default' }}>
            Continue
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="milo-lesson" style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 18px', background: 'var(--bg-page)', color: 'var(--ink)', fontFamily: 'var(--font-body)', boxSizing: 'border-box' }}>
      {children}
    </div>
  )
}

// ── Portal wrapper (the dispatched chapter component) ───────────────────────
export default function CoordinatePlaneChapter(_props: Props) {
  const router = useRouter()
  const { finishAndSync } = useChapterSync()
  const [body, setBody] = useState<HTMLElement | null>(null)
  const [runKey, setRunKey] = useState(0)
  const doneRef = useRef(false)
  useEffect(() => { setBody(document.body); return () => stopSpeech() }, [])

  const finish = useCallback((c: number, w: number, mastered?: boolean) => {
    if (doneRef.current) return
    doneRef.current = true
    finishAndSync('coordinatePlane', c, w, 'practice', mastered)
  }, [finishAndSync])

  const replay = useCallback(() => { doneRef.current = false; setRunKey((k) => k + 1) }, [])

  if (!body) return null
  return createPortal(
    <div data-band={BAND} style={{ position: 'fixed', inset: 0, zIndex: 900, overflowY: 'auto', background: 'var(--bg-page)', color: 'var(--ink)' }}>
      <CoordinatePlaneWorld
        key={runKey}
        childName={_props.childName}
        onFinish={finish}
        onExit={() => { stopSpeech(); router.push('/menu') }}
        onReplay={replay}
      />
    </div>,
    body,
  )
}
