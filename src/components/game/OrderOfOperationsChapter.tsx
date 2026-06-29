'use client'
/**
 * OrderOfOperationsChapter (12–14, "Field Lab").
 *
 * Portal pattern (like IntegersChapter): renders full-screen over the game stage,
 * sets data-band="12-14" to scope the teen theme, and calls finishAndSync itself.
 * Flow:  intro (CaseCard) → lesson (OrderOfOperationsTeenLesson) → practice → done (MasteryState)
 * Uses the SAME engine as every chapter: useAdaptive (L1/L2/L3), explanation →
 * practice → adaptive re-explanation. No visible difficulty tier (locked rule).
 *
 * Practice mixes two surfaces per the interaction spec:
 *   • "numeric" rounds  → evaluate the expression with NumericEntry (numericEqual grade)
 *   • "choice" rounds   → "which step happens first?" with ChoiceGrid (operation labels)
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
import NumericEntry, { numericEqual } from '@/components/teen/NumericEntry'
import StreakMarker from '@/components/teen/StreakMarker'
import MiloMark from '@/components/teen/MiloMark'
import MasteryState from '@/components/teen/MasteryState'
import ExploreStep from '@/components/teen/ExploreStep'
import GroupingExplorer from '@/components/teen/sims/GroupingExplorer'
import OrderOfOperationsTeenLesson, { makeRound, OrderWatch, type Round } from '@/components/lessons/OrderOfOperationsTeenLesson'

const BAND: AgeBand = '12-14'
const TOTAL_ROUNDS = 8
const FEEDBACK_MS = 1600

type Props = { onComplete: (correct: number, wrong: number) => void; childName: string }

// ── The chapter "world": intro → lesson → practice → done ──────────────────
function OrderWorld({
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
            title="The Score Formula"
            why="A game ranks players with score = kills × 10 + assists − deaths × 2. Type it left-to-right and the leaderboard lies — the order you compute in changes the answer."
            question="When an expression mixes ×, ÷, +, −, brackets and powers, which operation goes first?"
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
        title="Move the brackets"
        intro="Keep the numbers the same and move the brackets — watch the steps re-derive a different answer, and you'll see why the order matters."
        onContinue={() => setPhase('lesson')}
      >
        <GroupingExplorer band={BAND} />
      </ExploreStep>
    )
  }

  if (phase === 'lesson') {
    return <OrderOfOperationsTeenLesson band={BAND} childName={childName} onLessonComplete={() => setPhase('practice')} />
  }

  if (phase === 'done') {
    return (
      <Centered>
        <MasteryState
          band={BAND}
          conceptsConfirmed={['Multiply/divide before add/subtract', 'Brackets first', 'Exponents before × ÷', 'Full order with negatives']}
          nextPointer="Next: algebraic expressions."
          onPlayAgain={onReplay}
          onExit={onExit}
        />
      </Centered>
    )
  }

  return (
    <OrderPractice
      childName={childName}
      onExit={onExit}
      onDone={(c, w, mastered) => { onFinish(c, w, mastered); setPhase('done') }}
    />
  )
}

function OrderPractice({
  childName, onDone, onExit,
}: {
  childName: string; onDone: (c: number, w: number, mastered?: boolean) => void; onExit: () => void
}) {
  const ada = useAdaptive('orderOfOperations')
  const seen = useRef<Set<string>>(new Set())   // question signatures asked this session
  const [roundIdx, setRoundIdx] = useState(0)
  const [round, setRound] = useState<Round>(() => makeDistinct(() => makeRound(1), seen.current))
  const [selected, setSelected] = useState<string | number | null>(null)
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle')
  const [correct, setCorrect] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [wrongRun, setWrongRun] = useState(0)
  const [reteach, setReteach] = useState<Round | null>(null)
  const locked = useRef(false)        // one answer per round
  const greeted = useRef(false)

  // Load a fresh, non-repeating round whenever the index (or difficulty) changes.
  useEffect(() => {
    const r = makeDistinct(() => makeRound(ada.difficulty), seen.current)
    setRound(r); setSelected(null); setStatus('idle'); locked.current = false
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

  // grade is shared by both surfaces; `value` is what the learner chose/typed.
  function grade(ok: boolean, value: string | number) {
    if (locked.current) return
    locked.current = true
    setSelected(value); setStatus(ok ? 'correct' : 'wrong')
    const res = ada.record(ok)
    const run = ok ? 0 : wrongRun + 1
    setWrongRun(run)
    if (ok) { setCorrect((c) => c + 1); speak(`Correct. ${ada.praise}`) }
    else {
      setWrong((w) => w + 1)
      const revealed = round.kind === 'numeric'
        ? `The answer is ${round.answer < 0 ? `negative ${Math.abs(round.answer)}` : round.answer}.`
        : `The first step is ${String(round.answer)}.`
      speak(`${revealed} ${ada.encouragement}`)
    }
    window.setTimeout(() => advance(ok, run, round, res.mastered), FEEDBACK_MS)
  }

  function pickChoice(v: string | number) {
    grade(v === (round.answer as unknown as string | number), v)
  }
  function submitNumeric(value: number) {
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
        <TeenTopbar band={BAND} title="Order of Operations" roundIdx={roundIdx} totalRounds={TOTAL_ROUNDS} onBack={() => { stopSpeech(); onExit() }} />
      </div>

      <main style={{ flex: 1, width: '100%', maxWidth: 560, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '12px 18px 28px', boxSizing: 'border-box' }}>
        <div style={{ alignSelf: 'flex-end' }}><StreakMarker band={BAND} count={ada.streak} /></div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%' }}>
          <MiloMark band={BAND} mood={status === 'idle' ? 'thinking' : 'speaking'} size={36} />
          <div style={{ flex: 1, background: 'var(--paper)', border: '1px solid var(--outline)', borderRadius: 12, padding: '10px 14px', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 16, color: 'var(--ink)' }}>
            {round.promptText}
          </div>
        </div>

        {/* The expression, large and mono, as the focal object. */}
        <div style={{ fontFamily: 'var(--font-numeric)', fontSize: 32, fontWeight: 700, color: 'var(--ink)', letterSpacing: '0.02em', textAlign: 'center' }}>
          {round.expr}
        </div>

        {round.kind === 'numeric' ? (
          <div style={{ width: '100%', maxWidth: 320 }}>
            <NumericEntry
              key={roundIdx}
              band={BAND}
              onSubmit={(value) => submitNumeric(value)}
              status={status}
              placeholder="answer"
              allowNegative
              allowDecimal={false}
            />
          </div>
        ) : (
          <div style={{ width: '100%', maxWidth: 380 }}>
            <ChoiceGrid
              band={BAND}
              choices={round.choices ?? []}
              selected={selected}
              status={status}
              correctValue={round.answer as unknown as string | number}
              onPick={pickChoice}
              columns={1}
              mono
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
// expression one operation at a time, then continues (no penalty, no red).
function ReteachPanel({ round, onContinue }: { round: Round; onContinue: () => void }) {
  const [ready, setReady] = useState(false)
  if (typeof document === 'undefined') return null
  return createPortal(
    <div data-band={BAND} role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 950, background: 'color-mix(in srgb, var(--ink) 30%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--paper)', border: '1px solid var(--outline)', borderRadius: 16, padding: '22px 22px 20px', maxWidth: 520, width: '100%', boxShadow: '0 6px 28px color-mix(in srgb, var(--ink) 18%, transparent)' }}>
        <p style={{ margin: '0 0 14px', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>Let’s look at this one together.</p>
        <OrderWatch expr={round.expr} steps={round.steps} onDone={() => setReady(true)} />
        <p style={{ margin: '14px 0 0', fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--ink-soft)', textAlign: 'center' }}>{round.explain}</p>
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
export default function OrderOfOperationsChapter(_props: Props) {
  const router = useRouter()
  const { finishAndSync } = useChapterSync()
  const [body, setBody] = useState<HTMLElement | null>(null)
  const [runKey, setRunKey] = useState(0)
  const doneRef = useRef(false)
  useEffect(() => { setBody(document.body); return () => stopSpeech() }, [])

  const finish = useCallback((c: number, w: number, mastered?: boolean) => {
    if (doneRef.current) return
    doneRef.current = true
    finishAndSync('orderOfOperations', c, w, 'practice', mastered)
  }, [finishAndSync])

  const replay = useCallback(() => { doneRef.current = false; setRunKey((k) => k + 1) }, [])

  if (!body) return null
  return createPortal(
    <div data-band={BAND} style={{ position: 'fixed', inset: 0, zIndex: 900, overflowY: 'auto', background: 'var(--bg-page)', color: 'var(--ink)' }}>
      <OrderWorld
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
