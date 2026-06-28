'use client'
/**
 * LinearEquationsInequalitiesChapter (15–16, "Commission" / studio analyst) —
 * Algebra I chapter #3: Linear Equations & Inequalities.
 *
 * Portal pattern (mirrors IntegersChapter): renders full-screen over the game
 * stage so it bypasses the kids' zoom/celebration, sets data-band="15-16" to
 * scope the dark teen theme, and calls finishAndSync itself. Flow:
 *   intro (CaseCard) → explore (BalanceExplorer) → lesson → practice → done
 * Uses the SAME engine as every chapter: useAdaptive (L1/L2/L3), explanation →
 * practice → adaptive re-explanation (ReteachPanel after 3 misses). No visible
 * difficulty tier, no timer, no red/X — math-without-fear (locked rules).
 *
 * Answer surfaces per the curriculum ramp:
 *   L1 (one/two-step)                 → NumericEntry
 *   L2 (distribute / vars both sides) → StepSelect ("pick the next correct step")
 *   L3 (inequalities + |x|=a)         → StepSelect / NumericEntry / ChoiceGrid,
 *       with the inequality solution shown on a NumberLine.
 */
import { createPortal } from 'react-dom'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useChapterSync } from '@/lib/supabase/useChapterSync'
import { useAdaptive } from '@/lib/adaptive'
import { speak, speakAfterCurrent, unlockSpeech, stopSpeech } from '@/lib/useMiloSpeaker'
import type { AgeBand } from '@/components/teen/types'
import CaseCard from '@/components/teen/CaseCard'
import TeenTopbar from '@/components/teen/TeenTopbar'
import ChoiceGrid from '@/components/teen/ChoiceGrid'
import StepSelect from '@/components/teen/StepSelect'
import NumericEntry, { numericEqual } from '@/components/teen/NumericEntry'
import NumberLine from '@/components/teen/NumberLine'
import StreakMarker from '@/components/teen/StreakMarker'
import MiloMark from '@/components/teen/MiloMark'
import MasteryState from '@/components/teen/MasteryState'
import ExploreStep from '@/components/teen/ExploreStep'
import BalanceExplorer from '@/components/teen/sims/BalanceExplorer'
import LinearEquationsInequalitiesTeenLesson, {
  makeRound, EquationWatch, fmtInt, type Round,
} from '@/components/lessons/LinearEquationsInequalitiesTeenLesson'

const BAND: AgeBand = '15-16'
const TOTAL_ROUNDS = 8
const FEEDBACK_MS = 1600

type Props = { onComplete: (correct: number, wrong: number) => void; childName: string }

// ── The chapter "world": intro → explore → lesson → practice → done ─────────
function EquationsWorld({
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
            title="The Break-Even Point"
            why="A pop-up booth costs $90 to set up and earns $6 a sale. Find the exact sale where it stops losing money — that's an equation."
            question="How do you isolate the unknown, even with brackets, variables on both sides, or an inequality?"
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
        title="Balance the scale"
        intro="Slide x until the beam sits level. Whatever keeps both pans equal is the solution — that's all solving an equation is."
        onContinue={() => setPhase('lesson')}
      >
        <BalanceExplorer band={BAND} />
      </ExploreStep>
    )
  }

  if (phase === 'lesson') {
    return <LinearEquationsInequalitiesTeenLesson band={BAND} childName={childName} onLessonComplete={() => setPhase('practice')} />
  }

  if (phase === 'done') {
    return (
      <Centered>
        <MasteryState
          band={BAND}
          conceptsConfirmed={[
            'Solving one- & two-step equations',
            'Distributing through brackets',
            'Variables on both sides',
            'Inequalities & the sign-flip rule',
          ]}
          nextPointer="Next: slope & linear graphs."
          onPlayAgain={onReplay}
          onExit={onExit}
        />
      </Centered>
    )
  }

  return (
    <EquationsPractice
      childName={childName}
      onExit={onExit}
      onDone={(c, w) => { onFinish(c, w); setPhase('done') }}
    />
  )
}

function EquationsPractice({
  childName, onDone, onExit,
}: {
  childName: string; onDone: (c: number, w: number) => void; onExit: () => void
}) {
  const ada = useAdaptive('linearEquationsInequalities')
  const [roundIdx, setRoundIdx] = useState(0)
  const [round, setRound] = useState<Round>(() => makeRound(1))
  // selected: for ChoiceGrid/numeric this is the value; for StepSelect it's the picked index.
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

  // Shared grading: `picked` is the chosen value/index, `ok` is correctness.
  function grade(picked: string | number, ok: boolean) {
    if (status !== 'idle') return
    setSelected(picked); setStatus(ok ? 'correct' : 'wrong')
    ada.record(ok)
    const run = ok ? 0 : wrongRun + 1
    setWrongRun(run)
    if (ok) { setCorrect((c) => c + 1); speak(`Correct. ${ada.praise}`) }
    else { setWrong((w) => w + 1); speak(`${round.answerSpeech} ${ada.encouragement}`) }
    window.setTimeout(() => advance(ok, run, round), FEEDBACK_MS)
  }

  // NumericEntry: parent owns correctness via numericEqual.
  function submitNumeric(value: number) {
    grade(value, numericEqual(value, round.answer))
  }
  // ChoiceGrid (absChoice): answer is the correct choice value.
  function pickChoice(v: string | number) {
    grade(v, v === round.choices[round.answer]?.value)
  }
  // StepSelect: answer is the correct option index.
  function pickStep(i: number) {
    grade(i, i === round.answer)
  }

  function finishReteach() {
    setReteach(null); setWrongRun(0)
    const next = roundIdx + 1
    if (next >= TOTAL_ROUNDS) onDone(correct, wrong)
    else setRoundIdx(next)
  }

  // Build the answer surface for the current round.
  let surface: React.ReactNode = null
  if (round.kind === 'numeric') {
    surface = (
      <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
        <NumericEntry band={BAND} status={status} onSubmit={(v) => submitNumeric(v)} placeholder="x" />
      </div>
    )
  } else if (round.kind === 'step') {
    surface = (
      <div style={{ width: '100%', maxWidth: 440 }}>
        <StepSelect band={BAND} shown={round.shown ?? []} options={round.options ?? []} status={status} onPick={pickStep} />
      </div>
    )
  } else {
    surface = (
      <div style={{ width: '100%', maxWidth: 420 }}>
        <ChoiceGrid
          band={BAND}
          choices={round.choices}
          selected={selected}
          status={status}
          correctValue={round.choices[round.answer]?.value}
          onPick={pickChoice}
          columns={round.choices.length === 4 ? 2 : round.choices.length}
        />
      </div>
    )
  }

  return (
    <div className="milo-lesson" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--bg-page)', color: 'var(--ink)', fontFamily: 'var(--font-body)' }}>
      <div style={{ width: '100%', maxWidth: 640 }}>
        <TeenTopbar band={BAND} title="Equations & Inequalities" roundIdx={roundIdx} totalRounds={TOTAL_ROUNDS} onBack={() => { stopSpeech(); onExit() }} />
      </div>

      <main style={{ flex: 1, width: '100%', maxWidth: 560, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '12px 18px 28px', boxSizing: 'border-box' }}>
        <div style={{ alignSelf: 'flex-end' }}><StreakMarker band={BAND} count={ada.streak} /></div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%' }}>
          <MiloMark band={BAND} mood={status === 'idle' ? 'thinking' : 'speaking'} size={36} />
          <div style={{ flex: 1, background: 'var(--paper)', border: '1px solid var(--outline)', borderRadius: 12, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)' }}>
              {round.kind === 'step' ? 'Pick the next correct step.' : round.kind === 'absChoice' ? 'Which is the solution set?' : 'Solve for x.'}
            </span>
            <span style={{ fontFamily: 'var(--font-numeric)', fontVariantNumeric: 'tabular-nums', fontSize: 22, fontWeight: 700, color: 'var(--ink)' }}>
              {round.promptText}
            </span>
          </div>
        </div>

        {/* Inequality solution shown on the line (read mode) once graded. */}
        {round.line && status !== 'idle' && (
          <NumberLine band={BAND} min={round.line.min} max={round.line.max} mode="read" marked={round.line.marked} />
        )}

        {surface}

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
// concept as a step ladder, then continues (no penalty, no red).
function ReteachPanel({ round, onContinue }: { round: Round; onContinue: () => void }) {
  const [ready, setReady] = useState(false)
  if (typeof document === 'undefined') return null
  // Build a short step ladder from the round's own explanation + final answer line.
  const ladder = [round.promptText, round.kind === 'numeric' ? `x = ${fmtInt(round.answer)}` : '✓']
  return createPortal(
    <div data-band={BAND} role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 950, background: 'color-mix(in srgb, var(--ink) 30%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--paper)', border: '1px solid var(--outline)', borderRadius: 16, padding: '22px 22px 20px', maxWidth: 520, width: '100%', boxShadow: '0 6px 28px color-mix(in srgb, var(--ink) 18%, transparent)' }}>
        <p style={{ margin: '0 0 14px', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>Let&rsquo;s work this one together.</p>
        <EquationWatch lines={[round.explain]} steps={ladder} onDone={() => setReady(true)} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
          <button type="button" disabled={!ready} onClick={onContinue} style={{ padding: '10px 20px', borderRadius: 10, background: ready ? 'var(--accent)' : 'var(--bg-2)', border: `1px solid ${ready ? 'var(--accent)' : 'var(--outline)'}`, color: ready ? 'var(--fg-on-color)' : 'var(--ink-muted)', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 15, cursor: ready ? 'pointer' : 'default' }}>
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
export default function LinearEquationsInequalitiesChapter(_props: Props) {
  const router = useRouter()
  const { finishAndSync } = useChapterSync()
  const [body, setBody] = useState<HTMLElement | null>(null)
  const [runKey, setRunKey] = useState(0)
  const doneRef = useRef(false)
  useEffect(() => { setBody(document.body); return () => stopSpeech() }, [])

  const finish = useCallback((c: number, w: number) => {
    if (doneRef.current) return
    doneRef.current = true
    // id is added to ChapterType during integration; ignore any type error on the literal.
    finishAndSync('linearEquationsInequalities', c, w, 'practice')
  }, [finishAndSync])

  const replay = useCallback(() => { doneRef.current = false; setRunKey((k) => k + 1) }, [])

  if (!body) return null
  return createPortal(
    <div data-band={BAND} style={{ position: 'fixed', inset: 0, zIndex: 900, overflowY: 'auto', background: 'var(--bg-page)', color: 'var(--ink)' }}>
      <EquationsWorld
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
