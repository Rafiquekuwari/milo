'use client'
/**
 * RationalOpsChapter (12–14, "Field Lab") — "Fraction & Decimal Operations".
 *
 * Same portal pattern as IntegersChapter: renders full-screen over the game
 * stage, sets data-band="12-14", and calls finishAndSync itself. Flow:
 *   intro (CaseCard) → lesson (RationalOpsTeenLesson) → practice → done (MasteryState)
 * One adaptive engine (useAdaptive, L1/L2/L3) — no visible difficulty tier.
 *
 * Rounds come in two kinds (curriculum ramp row 3):
 *   'entry' → FractionEntry, graded with fractionsEqual (any equal form accepted)
 *   'mcq'   → ChoiceGrid of equivalent-form picks, graded with choiceMatchesFraction
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
import StreakMarker from '@/components/teen/StreakMarker'
import MiloMark from '@/components/teen/MiloMark'
import MasteryState from '@/components/teen/MasteryState'
import ExploreStep from '@/components/teen/ExploreStep'
import FractionBarsExplorer from '@/components/teen/sims/FractionBarsExplorer'
import FractionEntry, { fractionsEqual, type FractionValue } from '@/components/teen/FractionEntry'
import RationalOpsTeenLesson, {
  makeRound, FractionWatch, choiceMatchesFraction, type Round,
} from '@/components/lessons/RationalOpsTeenLesson'

const BAND: AgeBand = '12-14'
const TOTAL_ROUNDS = 8
const FEEDBACK_MS = 1600

type Props = { onComplete: (correct: number, wrong: number) => void; childName: string }

// ── The chapter "world": intro → lesson → practice → done ──────────────────
function RationalOpsWorld({
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
            title="Scaling the Recipe"
            why="Recipes, lab mixes and split bills all live in fractions — halve a batch, triple a dose, and you’re multiplying and dividing them."
            question="How do you add, multiply, and divide fractions — and write the answer in any equal form?"
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
        title="Multiply two fractions"
        intro="Set each fraction with the sliders and watch the area model: the deep-shaded overlap is the product. Get a feel for it, then continue."
        onContinue={() => setPhase('lesson')}
      >
        <FractionBarsExplorer band={BAND} />
      </ExploreStep>
    )
  }

  if (phase === 'lesson') {
    return <RationalOpsTeenLesson band={BAND} childName={childName} onLessonComplete={() => setPhase('practice')} />
  }

  if (phase === 'done') {
    return (
      <Centered>
        <MasteryState
          band={BAND}
          conceptsConfirmed={[
            'Add/subtract unlike denominators',
            'Multiply fractions',
            'Divide fractions (invert & multiply)',
            'Equivalent forms',
          ]}
          nextPointer="Next: ratios, rates & proportions."
          onPlayAgain={onReplay}
          onExit={onExit}
        />
      </Centered>
    )
  }

  return (
    <RationalOpsPractice
      childName={childName}
      onExit={onExit}
      onDone={(c, w) => { onFinish(c, w); setPhase('done') }}
    />
  )
}

function RationalOpsPractice({
  childName, onDone, onExit,
}: {
  childName: string; onDone: (c: number, w: number) => void; onExit: () => void
}) {
  const ada = useAdaptive('rationalOps')
  const [roundIdx, setRoundIdx] = useState(0)
  const [round, setRound] = useState<Round>(() => makeRound(1))
  // entry state
  const [entryStatus, setEntryStatus] = useState<'idle' | 'correct' | 'wrong'>('idle')
  // mcq state
  const [selected, setSelected] = useState<string | number | null>(null)
  const [mcqStatus, setMcqStatus] = useState<'idle' | 'correct' | 'wrong'>('idle')

  const [locked, setLocked] = useState(false)
  const [correct, setCorrect] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [wrongRun, setWrongRun] = useState(0)
  const [reteach, setReteach] = useState<Round | null>(null)
  const greeted = useRef(false)

  // Load a fresh round whenever the index (or difficulty) changes.
  useEffect(() => {
    const r = makeRound(ada.difficulty)
    setRound(r)
    setSelected(null); setEntryStatus('idle'); setMcqStatus('idle'); setLocked(false)
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

  // shared grading aftermath for both kinds
  function grade(ok: boolean) {
    setLocked(true)
    ada.record(ok)
    const run = ok ? 0 : wrongRun + 1
    setWrongRun(run)
    if (ok) { setCorrect((c) => c + 1); speak(`Correct. ${ada.praise}`) }
    else { setWrong((w) => w + 1); speak(`It’s ${round.answerLabel}. ${ada.encouragement}`) }
    window.setTimeout(() => advance(ok, run, round), FEEDBACK_MS)
  }

  function submitEntry(v: FractionValue) {
    if (locked) return
    const ok = fractionsEqual(v, round.answer)
    setEntryStatus(ok ? 'correct' : 'wrong')
    grade(ok)
  }

  function pickMcq(v: string | number) {
    if (locked) return
    const ok = choiceMatchesFraction(v, round.answer)
    setSelected(v); setMcqStatus(ok ? 'correct' : 'wrong')
    grade(ok)
  }

  function finishReteach() {
    setReteach(null); setWrongRun(0)
    const next = roundIdx + 1
    if (next >= TOTAL_ROUNDS) onDone(correct, wrong)
    else setRoundIdx(next)
  }

  // for ChoiceGrid's correctValue we need the matching choice's literal value
  const correctChoiceValue = round.kind === 'mcq'
    ? round.choices?.find((c) => choiceMatchesFraction(c.value, round.answer))?.value
    : undefined

  return (
    <div className="milo-lesson" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--bg-page)', color: 'var(--ink)', fontFamily: 'var(--font-body)' }}>
      <div style={{ width: '100%', maxWidth: 640 }}>
        <TeenTopbar band={BAND} title="Fraction & Decimal Operations" roundIdx={roundIdx} totalRounds={TOTAL_ROUNDS} onBack={() => { stopSpeech(); onExit() }} />
      </div>

      <main style={{ flex: 1, width: '100%', maxWidth: 560, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '12px 18px 28px', boxSizing: 'border-box' }}>
        <div style={{ alignSelf: 'flex-end' }}><StreakMarker band={BAND} count={ada.streak} /></div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%' }}>
          <MiloMark band={BAND} mood={locked ? 'speaking' : 'thinking'} size={36} />
          <div style={{ flex: 1, background: 'var(--paper)', border: '1px solid var(--outline)', borderRadius: 12, padding: '10px 14px', fontFamily: 'var(--font-numeric)', fontWeight: 600, fontSize: 18, color: 'var(--ink)' }}>
            {round.promptText}
          </div>
        </div>

        {round.kind === 'entry' ? (
          <div style={{ width: '100%', maxWidth: 380 }}>
            <FractionEntry band={BAND} onSubmit={submitEntry} status={entryStatus} />
          </div>
        ) : (
          <div style={{ width: '100%', maxWidth: 380 }}>
            <ChoiceGrid
              band={BAND}
              choices={round.choices ?? []}
              selected={selected}
              status={mcqStatus}
              correctValue={correctChoiceValue}
              onPick={pickMcq}
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
// concept step by step, then continues (no penalty, no red).
function ReteachPanel({ round, onContinue }: { round: Round; onContinue: () => void }) {
  const [ready, setReady] = useState(false)
  if (typeof document === 'undefined') return null
  return createPortal(
    <div data-band={BAND} role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 950, background: 'color-mix(in srgb, var(--ink) 30%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--paper)', border: '1px solid var(--outline)', borderRadius: 16, padding: '22px 22px 20px', maxWidth: 520, width: '100%', boxShadow: '0 6px 28px color-mix(in srgb, var(--ink) 18%, transparent)' }}>
        <p style={{ margin: '0 0 14px', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>Let’s look at this one together.</p>
        <FractionWatch title={round.promptText} lines={round.explain} onDone={() => setReady(true)} />
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
export default function RationalOpsChapter(_props: Props) {
  const router = useRouter()
  const { finishAndSync } = useChapterSync()
  const [body, setBody] = useState<HTMLElement | null>(null)
  const [runKey, setRunKey] = useState(0)
  const doneRef = useRef(false)
  useEffect(() => { setBody(document.body); return () => stopSpeech() }, [])

  const finish = useCallback((c: number, w: number) => {
    if (doneRef.current) return
    doneRef.current = true
    finishAndSync('rationalOps', c, w, 'practice')
  }, [finishAndSync])

  const replay = useCallback(() => { doneRef.current = false; setRunKey((k) => k + 1) }, [])

  if (!body) return null
  return createPortal(
    <div data-band={BAND} style={{ position: 'fixed', inset: 0, zIndex: 900, overflowY: 'auto', background: 'var(--bg-page)', color: 'var(--ink)' }}>
      <RationalOpsWorld
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
