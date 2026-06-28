'use client'
/**
 * GeometryTransformationsChapter (15–16, "Field Lab" / Commission) — Geometry:
 * Mensuration & Transformations.
 *
 * Portal pattern (like the slope/integers chapters): renders full-screen over the
 * game stage so it bypasses the kids' zoom/celebration, sets data-band="15-16" to
 * scope the teen DARK theme, and calls finishAndSync itself. Flow:
 *   intro (CaseCard) → explore (TransformExplorer sim) → lesson → practice → done (MasteryState)
 * Same engine as every chapter: useAdaptive (L1/L2/L3) drives the round, ada.record
 * per answer, re-explanation ReteachPanel after 3 misses, MasteryState completion,
 * StreakMarker, math-without-fear (no timer/red/X, amber-not-red, hidden tier),
 * feedback paced by a ~1600ms timer (not afterSpeech).
 */
import { createPortal } from 'react-dom'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useChapterSync } from '@/lib/supabase/useChapterSync'
import { useAdaptive } from '@/lib/adaptive'
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
import TransformExplorer from '@/components/teen/sims/TransformExplorer'
import GeometryTransformationsTeenLesson, {
  makeRound, TransformWatch, type Round,
} from '@/components/lessons/GeometryTransformationsTeenLesson'

const BAND: AgeBand = '15-16'
const TOTAL_ROUNDS = 8
const FEEDBACK_MS = 1600

type Props = { onComplete: (correct: number, wrong: number) => void; childName: string }

// Encode a grid tap as the canonical "x,y" answer string.
const ptKey = (p: Pt) => `${p.x},${p.y}`

// ── The chapter "world": intro → explore → lesson → practice → done ─────────
function GeometryTransformationsWorld({
  childName, onFinish, onExit, onReplay,
}: {
  childName: string; onFinish: (c: number, w: number) => void; onExit: () => void; onReplay: () => void
}) {
  const [phase, setPhase] = useState<'intro' | 'explore' | 'lesson' | 'practice' | 'done'>('intro')

  if (phase === 'intro') {
    return (
      <Centered>
        <div style={{ width: '100%', maxWidth: 520 }}>
          <CaseCard
            band={BAND}
            title="The Logo Animation"
            why="A motion designer needs a logo that slides, flips, and scales cleanly — and a packaging team needs the exact paint, metal, and fill for round tanks and cans. Both come down to measuring shapes and moving points by an exact rule."
            question="How do you measure circles and solids, and translate, reflect, and scale a shape on the grid?"
            startLabel="Open the commission"
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
        title="Move, flip, and scale a shape"
        intro="Slide the translate and scale controls and pick a reflect axis — watch the image triangle and its transformation rule update together, then continue."
        onContinue={() => setPhase('lesson')}
      >
        <TransformExplorer band={BAND} />
      </ExploreStep>
    )
  }

  if (phase === 'lesson') {
    return <GeometryTransformationsTeenLesson band={BAND} childName={childName} onLessonComplete={() => setPhase('practice')} />
  }

  if (phase === 'done') {
    return (
      <Centered>
        <MasteryState
          band={BAND}
          conceptsConfirmed={[
            'Circumference, area, arc & sector',
            'Surface area & volume of solids',
            'Translate, reflect & dilate on the grid',
            'Identify the rule & find the midpoint',
          ]}
          nextPointer="Next: triangles, proof & right-triangle trig."
          onPlayAgain={onReplay}
          onExit={onExit}
        />
      </Centered>
    )
  }

  return (
    <GeometryTransformationsPractice
      childName={childName}
      onExit={onExit}
      onDone={(c, w) => { onFinish(c, w); setPhase('done') }}
    />
  )
}

function GeometryTransformationsPractice({
  childName, onDone, onExit,
}: {
  childName: string; onDone: (c: number, w: number) => void; onExit: () => void
}) {
  const ada = useAdaptive('geometryTransformations')
  const [roundIdx, setRoundIdx] = useState(0)
  const [round, setRound] = useState<Round>(() => makeRound(1))
  const [selected, setSelected] = useState<string | number | null>(null)
  const [plotted, setPlotted] = useState<Pt | null>(null)
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle')
  const [correct, setCorrect] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [wrongRun, setWrongRun] = useState(0)
  const [reteach, setReteach] = useState<Round | null>(null)
  const greeted = useRef(false)

  // Load a fresh round whenever the index (or difficulty) changes.
  useEffect(() => {
    const r = makeRound(ada.difficulty)
    setRound(r); setSelected(null); setPlotted(null); setStatus('idle')
    const lead = greeted.current ? '' : `Hi ${childName}. `
    greeted.current = true
    speakAfterCurrent(`${lead}${r.say}`)
  }, [roundIdx, ada.difficulty]) // eslint-disable-line react-hooks/exhaustive-deps

  function advance(ok: boolean, run: number, r: Round) {
    if (!ok && run >= 3) { setReteach(r); return }
    const next = roundIdx + 1
    if (next >= TOTAL_ROUNDS) onDone(ok ? correct + 1 : correct, ok ? wrong : wrong + 1)
    else setRoundIdx(next)
  }

  function grade(answerKey: string | number, r: Round) {
    if (status !== 'idle') return
    const ok = answerKey === r.answer
    setStatus(ok ? 'correct' : 'wrong')
    ada.record(ok)
    const run = ok ? 0 : wrongRun + 1
    setWrongRun(run)
    if (ok) { setCorrect((c) => c + 1); speak(`Correct. ${ada.praise}`) }
    else { setWrong((w) => w + 1); speak(`${r.explain} ${ada.encouragement}`) }
    window.setTimeout(() => advance(ok, run, r), FEEDBACK_MS)
  }

  function pickChoice(v: string | number) {
    if (status !== 'idle') return
    setSelected(v)
    grade(v, round)
  }

  function plot(p: Pt) {
    if (status !== 'idle') return
    setPlotted(p)
    grade(ptKey(p), round)
  }

  function finishReteach() {
    const r = reteach!
    setReteach(null); setWrongRun(0)
    const next = roundIdx + 1
    if (next >= TOTAL_ROUNDS) onDone(correct, wrong)
    else setRoundIdx(next)
    void r
  }

  const g = round.grid

  return (
    <div className="milo-lesson" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--bg-page)', color: 'var(--ink)', fontFamily: 'var(--font-body)' }}>
      <div style={{ width: '100%', maxWidth: 640 }}>
        <TeenTopbar band={BAND} title="Mensuration & Transformations" roundIdx={roundIdx} totalRounds={TOTAL_ROUNDS} onBack={() => { stopSpeech(); onExit() }} />
      </div>

      <main style={{ flex: 1, width: '100%', maxWidth: 560, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, padding: '12px 18px 28px', boxSizing: 'border-box' }}>
        <div style={{ alignSelf: 'flex-end' }}><StreakMarker band={BAND} count={ada.streak} /></div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%' }}>
          <MiloMark band={BAND} mood={status === 'idle' ? 'thinking' : 'speaking'} size={36} />
          <div style={{ flex: 1, background: 'var(--paper)', border: '1px solid var(--outline)', borderRadius: 12, padding: '10px 14px', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 16, color: 'var(--ink)' }}>
            {round.promptText}
          </div>
        </div>

        {round.kind === 'grid' && g && (
          <div style={{ width: '100%', maxWidth: 360 }}>
            <CoordGrid
              band={BAND}
              xRange={[-g.range, g.range]}
              yRange={[-g.range, g.range]}
              mode="read"
              points={g.points}
              highlight={status === 'idle' ? (g.target ?? null) : null}
              value={plotted}
              status={status}
              onPlot={plot}
            />
          </div>
        )}

        {round.kind === 'choice' && round.choices && (
          <div style={{ width: '100%', maxWidth: 400 }}>
            <ChoiceGrid
              band={BAND}
              choices={round.choices}
              selected={selected}
              status={status}
              correctValue={round.answer}
              onPick={pickChoice}
              columns={2}
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
// concept (on the grid for transformations, narrated for mensuration), then
// continues (no penalty, no red).
function ReteachPanel({ round, onContinue }: { round: Round; onContinue: () => void }) {
  const [ready, setReady] = useState(false)
  if (typeof document === 'undefined') return null
  const range = round.kind === 'grid' ? (round.grid?.range ?? 8) : undefined
  const points = round.kind === 'grid' ? round.grid?.points : undefined
  return createPortal(
    <div data-band={BAND} role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 950, background: 'color-mix(in srgb, var(--ink) 30%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--paper)', border: '1px solid var(--outline)', borderRadius: 16, padding: '22px 22px 20px', maxWidth: 520, width: '100%', boxShadow: '0 6px 28px color-mix(in srgb, var(--ink) 18%, transparent)' }}>
        <p style={{ margin: '0 0 14px', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>Let&rsquo;s look at this one together.</p>
        <TransformWatch
          lines={[round.explain]}
          range={range}
          points={points}
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
export default function GeometryTransformationsChapter(_props: Props) {
  const router = useRouter()
  const { finishAndSync } = useChapterSync()
  const [body, setBody] = useState<HTMLElement | null>(null)
  const [runKey, setRunKey] = useState(0)
  const doneRef = useRef(false)
  useEffect(() => { setBody(document.body); return () => stopSpeech() }, [])

  const finish = useCallback((c: number, w: number) => {
    if (doneRef.current) return
    doneRef.current = true
    finishAndSync('geometryTransformations', c, w, 'practice')
  }, [finishAndSync])

  const replay = useCallback(() => { doneRef.current = false; setRunKey((k) => k + 1) }, [])

  if (!body) return null
  return createPortal(
    <div data-band={BAND} style={{ position: 'fixed', inset: 0, zIndex: 900, overflowY: 'auto', background: 'var(--bg-page)', color: 'var(--ink)' }}>
      <GeometryTransformationsWorld
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
