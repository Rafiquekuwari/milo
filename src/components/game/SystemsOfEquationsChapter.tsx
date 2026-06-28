'use client'
/**
 * SystemsOfEquationsChapter (15-16, "Field Lab", dark skin).
 *
 * Portal pattern (like every teen chapter): renders full-screen over the game
 * stage, sets data-band="15-16" to scope the teen theme, and calls finishAndSync
 * itself. Flow:
 *   intro (CaseCard) → explore (SystemExplorer) → lesson (SystemsOfEquationsTeenLesson)
 *   → practice (useAdaptive loop) → done (MasteryState)
 * Uses the SAME engine as every chapter: useAdaptive (L1/L2/L3), explanation →
 * practice → adaptive re-explanation (ReteachPanel). No visible difficulty tier,
 * no timer, no red/X — feedback is paced by a ~1600ms timer (locked rules).
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
import SystemExplorer from '@/components/teen/sims/SystemExplorer'
import SystemsOfEquationsTeenLesson, {
  makeRound, SystemWatch, fmtInt, spoken, type Round,
} from '@/components/lessons/SystemsOfEquationsTeenLesson'

const BAND: AgeBand = '15-16'
const TOTAL_ROUNDS = 8
const FEEDBACK_MS = 1600
const GRID = 8

type Props = { onComplete: (correct: number, wrong: number) => void; childName: string }

const ptStr = (p: Pt) => `(${fmtInt(p.x)}, ${fmtInt(p.y)})`
const ptSame = (a: Pt | null, b: Pt | null) => !!a && !!b && a.x === b.x && a.y === b.y

// ── The chapter "world": intro → explore → lesson → practice → done ─────────
function SystemsWorld({
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
            title="The Crossover Plan"
            why="Two phone plans, two pricing models, two budgets — the smart choice is wherever the two costs cross. Systems find that break-even point exactly."
            question="How do you find the one (x, y) that satisfies two equations at once?"
            startLabel="Take the commission"
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
        title="Find where two lines meet"
        intro="Slide the slopes and intercept and watch the crossing point move — that meeting point is the solution of the system. Make the lines parallel and see what happens."
        onContinue={() => setPhase('lesson')}
      >
        <SystemExplorer band={BAND} />
      </ExploreStep>
    )
  }

  if (phase === 'lesson') {
    return <SystemsOfEquationsTeenLesson band={BAND} childName={childName} onLessonComplete={() => setPhase('practice')} />
  }

  if (phase === 'done') {
    return (
      <Centered>
        <MasteryState
          band={BAND}
          conceptsConfirmed={[
            'Solution = where the lines meet',
            'Solving by substitution',
            'Solving by elimination',
            'One / none / infinite solutions',
          ]}
          nextPointer="Next: exponents & polynomials."
          onPlayAgain={onReplay}
          onExit={onExit}
        />
      </Centered>
    )
  }

  return (
    <SystemsPractice
      childName={childName}
      onExit={onExit}
      onDone={(c, w) => { onFinish(c, w); setPhase('done') }}
    />
  )
}

function SystemsPractice({
  childName, onDone, onExit,
}: {
  childName: string; onDone: (c: number, w: number) => void; onExit: () => void
}) {
  const ada = useAdaptive('systemsOfEquations')
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

  function grade(ok: boolean) {
    setStatus(ok ? 'correct' : 'wrong')
    ada.record(ok)
    const run = ok ? 0 : wrongRun + 1
    setWrongRun(run)
    if (ok) { setCorrect((c) => c + 1); speak(`Correct. ${ada.praise}`) }
    else {
      setWrong((w) => w + 1)
      const reveal = revealText(round)
      speak(`${reveal} ${ada.encouragement}`)
    }
    window.setTimeout(() => advance(ok, run, round), FEEDBACK_MS)
  }

  function pickChoice(v: string | number) {
    if (status !== 'idle' || selected !== null) return
    setSelected(v)
    grade(v === round.answer)
  }

  function plotPoint(p: Pt) {
    if (status !== 'idle' || plotted !== null) return
    setPlotted(p)
    grade(ptSame(p, round.point ?? null))
  }

  function finishReteach() {
    setReteach(null); setWrongRun(0)
    const next = roundIdx + 1
    if (next >= TOTAL_ROUNDS) onDone(correct, wrong)
    else setRoundIdx(next)
  }

  const linesForGrid = round.linesShown.map((l) => ({ kind: 'line' as const, m: l.m, b: l.b }))

  return (
    <div className="milo-lesson" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--bg-page)', color: 'var(--ink)', fontFamily: 'var(--font-body)' }}>
      <div style={{ width: '100%', maxWidth: 640 }}>
        <TeenTopbar band={BAND} title="Systems of Equations" roundIdx={roundIdx} totalRounds={TOTAL_ROUNDS} onBack={() => { stopSpeech(); onExit() }} />
      </div>

      <main style={{ flex: 1, width: '100%', maxWidth: 560, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '12px 18px 28px', boxSizing: 'border-box' }}>
        <div style={{ alignSelf: 'flex-end' }}><StreakMarker band={BAND} count={ada.streak} /></div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%' }}>
          <MiloMark band={BAND} mood={status === 'idle' ? 'thinking' : 'speaking'} size={36} />
          <div style={{ flex: 1, background: 'var(--paper)', border: '1px solid var(--outline)', borderRadius: 12, padding: '10px 14px', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 16, color: 'var(--ink)' }}>
            {round.promptText}
          </div>
        </div>

        {/* The system rendered as context (and the answer surface for graph rounds). */}
        {round.linesShown.length > 0 && (
          <div style={{ width: '100%', maxWidth: 380 }}>
            <CoordGrid
              band={BAND}
              xRange={[-GRID, GRID]}
              yRange={[-GRID, GRID]}
              mode={round.kind === 'graph' ? 'plot' : 'read'}
              lines={linesForGrid}
              value={round.kind === 'graph' ? plotted : null}
              status={round.kind === 'graph' ? status : 'idle'}
              highlight={round.kind === 'graph' && status !== 'idle' ? (round.point ?? null) : null}
              onPlot={round.kind === 'graph' ? plotPoint : undefined}
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
              columns={round.cols ?? (round.choices.length === 4 ? 2 : 1)}
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

/** Spoken/printed reveal of the correct answer on a miss (no red, just the answer). */
function revealText(r: Round): string {
  if (r.kind === 'graph' && r.point) return `The lines meet at ${ptStr(r.point)}.`
  if (r.solution) return `The solution is ${ptStr(r.solution)}.`
  if (typeof r.answer === 'number') return `The answer is ${spoken(r.answer)}.`
  return `The answer is ${r.answer}.`
}

// Adaptive re-explanation: shown after a few misses in a row. Re-works the
// concept on the coordinate grid, then continues (no penalty, no red).
function ReteachPanel({ round, onContinue }: { round: Round; onContinue: () => void }) {
  const [ready, setReady] = useState(false)
  if (typeof document === 'undefined') return null
  const point = round.point ?? round.solution ?? null
  const marked = round.linesShown.length > 0 ? round.linesShown : [{ m: 1, b: -1 }, { m: -1, b: 3 }]
  return createPortal(
    <div data-band={BAND} role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 950, background: 'color-mix(in srgb, var(--ink) 30%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--paper)', border: '1px solid var(--outline)', borderRadius: 16, padding: '22px 22px 20px', maxWidth: 520, width: '100%', boxShadow: '0 6px 28px color-mix(in srgb, var(--ink) 18%, transparent)' }}>
        <p style={{ margin: '0 0 14px', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>Let’s look at this one together.</p>
        <SystemWatch lines={[round.explain]} marked={marked} point={point} range={GRID} onDone={() => setReady(true)} />
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
export default function SystemsOfEquationsChapter(_props: Props) {
  const router = useRouter()
  const { finishAndSync } = useChapterSync()
  const [body, setBody] = useState<HTMLElement | null>(null)
  const [runKey, setRunKey] = useState(0)
  const doneRef = useRef(false)
  useEffect(() => { setBody(document.body); return () => stopSpeech() }, [])

  const finish = useCallback((c: number, w: number) => {
    if (doneRef.current) return
    doneRef.current = true
    // The chapter id is added to ChapterType during integration.
    finishAndSync('systemsOfEquations', c, w, 'practice')
  }, [finishAndSync])

  const replay = useCallback(() => { doneRef.current = false; setRunKey((k) => k + 1) }, [])

  if (!body) return null
  return createPortal(
    <div data-band={BAND} style={{ position: 'fixed', inset: 0, zIndex: 900, overflowY: 'auto', background: 'var(--bg-page)', color: 'var(--ink)' }}>
      <SystemsWorld
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
