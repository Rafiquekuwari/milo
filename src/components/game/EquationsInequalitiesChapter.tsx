'use client'
/**
 * EquationsInequalitiesChapter (12–14, "Field Lab").
 *
 * Portal pattern (like the 3–5 story chapters + IntegersChapter): renders full-screen
 * over the game stage, sets data-band="12-14" to scope the teen theme, and calls
 * finishAndSync itself. Flow:
 *   intro (CaseCard) → lesson (EquationsInequalitiesTeenLesson) → practice → done (MasteryState)
 * Uses the SAME engine as every chapter: useAdaptive (L1/L2/L3), explanation →
 * practice → adaptive re-explanation. No visible difficulty tier (locked rule).
 *
 * Mixed inputs per the curriculum ramp: NumericEntry for "solve for x" rounds,
 * ChoiceGrid for the inequality "pick the matching line" rounds.
 */
import { createPortal } from 'react-dom'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useChapterSync } from '@/lib/supabase/useChapterSync'
import { useAdaptive } from '@/lib/adaptive'
import { makeDistinct } from '@/lib/questionVariety'
import { speak, speakAfterCurrent, unlockSpeech, stopSpeech } from '@/lib/useMiloSpeaker'
import type { AgeBand } from '@/components/teen/types'
import CaseCard from '@/components/teen/CaseCard'
import TeenTopbar from '@/components/teen/TeenTopbar'
import ChoiceGrid from '@/components/teen/ChoiceGrid'
import NumberLine from '@/components/teen/NumberLine'
import NumericEntry, { numericEqual } from '@/components/teen/NumericEntry'
import StreakMarker from '@/components/teen/StreakMarker'
import MiloMark from '@/components/teen/MiloMark'
import MasteryState from '@/components/teen/MasteryState'
import ExploreStep from '@/components/teen/ExploreStep'
import BalanceExplorer from '@/components/teen/sims/BalanceExplorer'
import EquationsInequalitiesTeenLesson, {
  makeRound, EquationWatch, fmtInt, spoken, type Round,
} from '@/components/lessons/EquationsInequalitiesTeenLesson'

const BAND: AgeBand = '12-14'
const TOTAL_ROUNDS = 8
const FEEDBACK_MS = 1600

type Props = { onComplete: (correct: number, wrong: number) => void; childName: string }

// ── The chapter "world": intro → lesson → practice → done ──────────────────
function EquationsWorld({
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
            title="Find the Missing Amount"
            why="A delivery van can carry 600 kg. Crates weigh the same; you load some, plus a 90 kg toolbox. How many crates fit? That hidden number is x — and an equation finds it."
            question="How do you undo operations to solve for x, and keep an inequality true when you flip the sign?"
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
        title="Balance the scale"
        intro="Slide x until the beam sits level — the value that makes 2x + 3 weigh exactly 11 is the solution."
        onContinue={() => setPhase('lesson')}
      >
        <BalanceExplorer band={BAND} />
      </ExploreStep>
    )
  }

  if (phase === 'lesson') {
    return <EquationsInequalitiesTeenLesson band={BAND} childName={childName} onLessonComplete={() => setPhase('practice')} />
  }

  if (phase === 'done') {
    return (
      <Centered>
        <MasteryState
          band={BAND}
          conceptsConfirmed={[
            'Solving one-step equations',
            'Solving two-step equations',
            'Equations with variables on both sides',
            'Solving inequalities (incl. sign flip)',
          ]}
          nextPointer="Next: the coordinate plane."
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
      onDone={(c, w, mastered) => { onFinish(c, w, mastered); setPhase('done') }}
    />
  )
}

function EquationsPractice({
  childName, onDone, onExit,
}: {
  childName: string; onDone: (c: number, w: number, mastered?: boolean) => void; onExit: () => void
}) {
  const ada = useAdaptive('equationsInequalities')
  const seen = useRef<Set<string>>(new Set())   // question signatures asked this session
  const [roundIdx, setRoundIdx] = useState(0)
  const [round, setRound] = useState<Round>(() => makeDistinct(() => makeRound(1), seen.current))
  const [selected, setSelected] = useState<string | number | null>(null)
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle')
  const [correct, setCorrect] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [wrongRun, setWrongRun] = useState(0)
  const [reteach, setReteach] = useState<Round | null>(null)
  const greeted = useRef(false)

  // Load a fresh, non-repeating round whenever the index (or difficulty) changes.
  useEffect(() => {
    const r = makeDistinct(() => makeRound(ada.difficulty), seen.current)
    setRound(r); setSelected(null); setStatus('idle')
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

  // shared grading tail (numeric + choice converge here)
  function grade(ok: boolean, sel: string | number) {
    setSelected(sel); setStatus(ok ? 'correct' : 'wrong')
    const res = ada.record(ok)
    const run = ok ? 0 : wrongRun + 1
    setWrongRun(run)
    if (ok) { setCorrect((c) => c + 1); speak(`Correct. ${ada.praise}`) }
    else { setWrong((w) => w + 1); speak(`${answerSpeech(round)} ${ada.encouragement}`) }
    window.setTimeout(() => advance(ok, run, round, res.mastered), FEEDBACK_MS)
  }

  // ChoiceGrid path (inequality rounds)
  function pickChoice(v: string | number) {
    if (selected !== null) return
    grade(v === round.answer, v)
  }

  // NumericEntry path (solve-for-x rounds)
  function submitNumeric(value: number) {
    if (status !== 'idle') return
    grade(numericEqual(value, round.answer), value)
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
        <TeenTopbar band={BAND} title="Equations & Inequalities" roundIdx={roundIdx} totalRounds={TOTAL_ROUNDS} onBack={() => { stopSpeech(); onExit() }} />
      </div>

      <main style={{ flex: 1, width: '100%', maxWidth: 560, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '12px 18px 28px', boxSizing: 'border-box' }}>
        <div style={{ alignSelf: 'flex-end' }}><StreakMarker band={BAND} count={ada.streak} /></div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%' }}>
          <MiloMark band={BAND} mood={status === 'idle' ? 'thinking' : 'speaking'} size={36} />
          <div style={{ flex: 1, background: 'var(--paper)', border: '1px solid var(--outline)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 14, color: 'var(--ink-soft)' }}>
              {round.kind === 'numeric' ? 'Solve for x.' : 'Solve, then pick the line for x.'}
            </span>
            <span style={{ fontFamily: 'var(--font-numeric)', fontWeight: 700, fontSize: 22, color: 'var(--ink)', letterSpacing: '0.01em' }}>
              {round.promptText}
            </span>
          </div>
        </div>

        {round.kind === 'choice' && round.line && (
          <NumberLine band={BAND} min={round.line.min} max={round.line.max} mode="read" marked={status === 'idle' ? [] : round.line.marked} />
        )}

        {round.kind === 'numeric' ? (
          <NumericEntry
            key={roundIdx}
            band={BAND}
            onSubmit={submitNumeric}
            status={status}
            placeholder="x"
          />
        ) : (
          <div style={{ width: '100%', maxWidth: 420 }}>
            <ChoiceGrid
              band={BAND}
              choices={round.choices ?? []}
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

/** Spoken reveal of the answer on a miss (no red, just the worked value). */
function answerSpeech(r: Round): string {
  if (r.kind === 'numeric') return `x equals ${spoken(r.answer)}.`
  const ans = (r.choices ?? []).find((c) => c.value === r.answer)
  return ans ? `The answer is ${ans.label.replace('−', 'negative ')}.` : `The answer is x ${spoken(r.answer)}.`
}

// Adaptive re-explanation: shown after a few misses in a row. Re-works the
// concept, then continues (no penalty, no red).
function ReteachPanel({ round, onContinue }: { round: Round; onContinue: () => void }) {
  const [ready, setReady] = useState(false)
  if (typeof document === 'undefined') return null
  const head = round.kind === 'numeric'
    ? `x = ${fmtInt(round.answer)}`
    : round.promptText
  return createPortal(
    <div data-band={BAND} role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 950, background: 'color-mix(in srgb, var(--ink) 30%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--paper)', border: '1px solid var(--outline)', borderRadius: 16, padding: '22px 22px 20px', maxWidth: 520, width: '100%', boxShadow: '0 6px 28px color-mix(in srgb, var(--ink) 18%, transparent)' }}>
        <p style={{ margin: '0 0 14px', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>Let’s look at this one together.</p>
        <EquationWatch lines={[head, round.explain]} line={round.line} onDone={() => setReady(true)} />
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
export default function EquationsInequalitiesChapter(_props: Props) {
  const router = useRouter()
  const { finishAndSync } = useChapterSync()
  const [body, setBody] = useState<HTMLElement | null>(null)
  const [runKey, setRunKey] = useState(0)
  const doneRef = useRef(false)
  useEffect(() => { setBody(document.body); return () => stopSpeech() }, [])

  const finish = useCallback((c: number, w: number, mastered?: boolean) => {
    if (doneRef.current) return
    doneRef.current = true
    finishAndSync('equationsInequalities', c, w, 'practice', mastered)
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
