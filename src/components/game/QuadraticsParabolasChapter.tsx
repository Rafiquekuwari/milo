'use client'
/**
 * QuadraticsParabolasChapter (15–16, "Studio / commission") — teen chapter.
 *
 * Portal pattern (like the 3–5 story chapters): renders full-screen over the
 * game stage so it bypasses the kids' zoom/celebration, sets data-band="15-16"
 * to scope the teen theme (dark skin), and calls finishAndSync itself. Flow:
 *   intro (CaseCard) → explore (ParabolaExplorer) → lesson → practice → done
 * Uses the SAME engine as every chapter: useAdaptive (L1/L2/L3), explanation →
 * practice → adaptive re-explanation. No visible difficulty tier (locked rule).
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
import ParabolaExplorer from '@/components/teen/sims/ParabolaExplorer'
import QuadraticsParabolasTeenLesson, {
  makeRound, ParabolaWatch, type Round, type ParabolaSpec,
} from '@/components/lessons/QuadraticsParabolasTeenLesson'

const BAND: AgeBand = '15-16'
const GRID = 10
const TOTAL_ROUNDS = 8
const FEEDBACK_MS = 1600

type Props = { onComplete: (correct: number, wrong: number) => void; childName: string }

// ── The chapter "world": intro → explore → lesson → practice → done ─────────
function QuadraticsWorld({
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
            title="The Perfect Arc"
            why="A water-jet fountain, a thrown ball, a profit-vs-price curve — each traces a parabola. The vertex is the peak; the roots are where it lands."
            question="How do you read a parabola's vertex and roots, and solve a quadratic for them?"
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
        title="Shape the parabola"
        intro="Drag a, b and c and watch the vertex, the roots, and the discriminant move together — get a feel for how the equation controls the curve, then continue."
        onContinue={() => setPhase('lesson')}
      >
        <ParabolaExplorer band={BAND} />
      </ExploreStep>
    )
  }

  if (phase === 'lesson') {
    return <QuadraticsParabolasTeenLesson band={BAND} childName={childName} onLessonComplete={() => setPhase('practice')} />
  }

  if (phase === 'done') {
    return (
      <Centered>
        <MasteryState
          band={BAND}
          conceptsConfirmed={[
            'Vertex, axis & roots from a parabola',
            'Solving by factoring & square roots',
            'The quadratic formula',
            'The discriminant & number of roots',
          ]}
          nextPointer="Next: geometry — mensuration & transformations."
          onPlayAgain={onReplay}
          onExit={onExit}
        />
      </Centered>
    )
  }

  return (
    <QuadraticsPractice
      childName={childName}
      onExit={onExit}
      onDone={(c, w) => { onFinish(c, w); setPhase('done') }}
    />
  )
}

function QuadraticsPractice({
  childName, onDone, onExit,
}: {
  childName: string; onDone: (c: number, w: number) => void; onExit: () => void
}) {
  const ada = useAdaptive('quadraticsParabolas')
  const [roundIdx, setRoundIdx] = useState(0)
  const [round, setRound] = useState<Round>(() => makeRound(1))
  const [selected, setSelected] = useState<string | number | null>(null)
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle')
  const [correct, setCorrect] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [wrongRun, setWrongRun] = useState(0)
  const [reteach, setReteach] = useState<Round | null>(null)
  const greeted = useRef(false)

  // Load a fresh round whenever the index (or difficulty) changes.
  useEffect(() => {
    const r = makeRound(ada.difficulty)
    setRound(r); setSelected(null); setStatus('idle')
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

  function pick(v: string | number) {
    if (selected !== null) return
    const ok = v === round.answer
    setSelected(v); setStatus(ok ? 'correct' : 'wrong')
    ada.record(ok)
    const run = ok ? 0 : wrongRun + 1
    setWrongRun(run)
    if (ok) { setCorrect((c) => c + 1); speak(`Correct. ${ada.praise}`) }
    else { setWrong((w) => w + 1); speak(`The answer is ${typeof round.answer === 'number' ? spokenNum(round.answer) : round.answer}. ${ada.encouragement}`) }
    window.setTimeout(() => advance(ok, run, round), FEEDBACK_MS)
  }

  function finishReteach() {
    setReteach(null); setWrongRun(0)
    const next = roundIdx + 1
    if (next >= TOTAL_ROUNDS) onDone(correct, wrong)
    else setRoundIdx(next)
  }

  return (
    <div className="milo-lesson" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--bg-page)', color: 'var(--ink)', fontFamily: 'var(--font-body)' }}>
      <div style={{ width: '100%', maxWidth: 640 }}>
        <TeenTopbar band={BAND} title="Quadratics & Parabolas" roundIdx={roundIdx} totalRounds={TOTAL_ROUNDS} onBack={() => { stopSpeech(); onExit() }} />
      </div>

      <main style={{ flex: 1, width: '100%', maxWidth: 560, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '12px 18px 28px', boxSizing: 'border-box' }}>
        <div style={{ alignSelf: 'flex-end' }}><StreakMarker band={BAND} count={ada.streak} /></div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%' }}>
          <MiloMark band={BAND} mood={status === 'idle' ? 'thinking' : 'speaking'} size={36} />
          <div style={{ flex: 1, background: 'var(--paper)', border: '1px solid var(--outline)', borderRadius: 12, padding: '10px 14px', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 16, color: 'var(--ink)' }}>
            {round.promptText}
          </div>
        </div>

        {round.parabola && (
          <div style={{ width: '100%', maxWidth: 340 }}>
            <CoordGrid
              band={BAND}
              xRange={[-GRID, GRID]}
              yRange={[-GRID, GRID]}
              mode="read"
              curves={[{ kind: 'curve', fn: (x) => round.parabola!.a * x * x + round.parabola!.b * x + round.parabola!.c }]}
              points={specPoints(round.parabola)}
              highlight={vertexInGrid(round.parabola)}
            />
          </div>
        )}

        <div style={{ width: '100%', maxWidth: 420 }}>
          <ChoiceGrid
            band={BAND}
            choices={round.choices}
            selected={selected}
            status={status}
            correctValue={round.answer}
            onPick={pick}
            columns={round.choices.length <= 2 ? round.choices.length : 1}
          />
        </div>

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

// ── helpers for rendering the parabola context ──────────────────────────────
function specPoints(spec: ParabolaSpec): Pt[] {
  const out: Pt[] = []
  if (spec.vertex) out.push(spec.vertex)
  if (spec.roots) out.push(...spec.roots)
  return out.filter((p) => Math.abs(p.x) <= GRID && Math.abs(p.y) <= GRID)
}
function vertexInGrid(spec: ParabolaSpec): Pt | null {
  if (!spec.vertex) return null
  return Math.abs(spec.vertex.x) <= GRID && Math.abs(spec.vertex.y) <= GRID ? spec.vertex : null
}
function spokenNum(n: number) { return n < 0 ? `negative ${Math.abs(n)}` : `${n}` }

// Adaptive re-explanation: shown after a few misses in a row. Re-works the
// concept over a parabola, then continues (no penalty, no red).
function ReteachPanel({ round, onContinue }: { round: Round; onContinue: () => void }) {
  const [ready, setReady] = useState(false)
  if (typeof document === 'undefined') return null
  // Fall back to a friendly reference parabola (y = x² − 4) when the round has none.
  const spec: ParabolaSpec = round.parabola ?? { a: 1, b: 0, c: -4, vertex: { x: 0, y: -4 }, roots: [{ x: -2, y: 0 }, { x: 2, y: 0 }] }
  return createPortal(
    <div data-band={BAND} role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 950, background: 'color-mix(in srgb, var(--ink) 30%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--paper)', border: '1px solid var(--outline)', borderRadius: 16, padding: '22px 22px 20px', maxWidth: 520, width: '100%', boxShadow: '0 6px 28px color-mix(in srgb, var(--ink) 18%, transparent)' }}>
        <p style={{ margin: '0 0 14px', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>Let’s look at this one together.</p>
        <ParabolaWatch lines={[round.explain]} spec={spec} onDone={() => setReady(true)} />
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
export default function QuadraticsParabolasChapter(_props: Props) {
  const router = useRouter()
  const { finishAndSync } = useChapterSync()
  const [body, setBody] = useState<HTMLElement | null>(null)
  const [runKey, setRunKey] = useState(0)
  const doneRef = useRef(false)
  useEffect(() => { setBody(document.body); return () => stopSpeech() }, [])

  const finish = useCallback((c: number, w: number) => {
    if (doneRef.current) return
    doneRef.current = true
    finishAndSync('quadraticsParabolas', c, w, 'practice')
  }, [finishAndSync])

  const replay = useCallback(() => { doneRef.current = false; setRunKey((k) => k + 1) }, [])

  if (!body) return null
  return createPortal(
    <div data-band={BAND} style={{ position: 'fixed', inset: 0, zIndex: 900, overflowY: 'auto', background: 'var(--bg-page)', color: 'var(--ink)' }}>
      <QuadraticsWorld
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
