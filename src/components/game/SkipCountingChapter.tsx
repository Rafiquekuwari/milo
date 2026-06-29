'use client'
/**
 * SkipCountingChapter (6–8) — count by 2s, 5s, 10s. Shows a sequence with one
 * blank; the child taps the missing number ("what comes next?" or "what's
 * missing?"). Adaptive, 10 rounds, after-3-wrong re-teach (watch the count, then
 * try again).
 */
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useMiloSpeaker, afterSpeech, speakAfterCurrent, speakAt } from '@/lib/useMiloSpeaker'
import { useAdaptive } from '@/lib/adaptive'
import { makeDistinct } from '@/lib/questionVariety'
import { DifficultyBadge } from '../ui/DifficultyBadge'
import { useChapterPhase } from '@/lib/useChapterPhase'
import SpeakingLock from '@/components/ui/SpeakingLock'
import GameTopbar from '../ui/GameTopbar'
import { numberToWords, CSS as KIT_CSS } from '../lessons/_kit'
import SkipCountingLesson, { SeqRow, SkipWatch, SkipPick, buildSkipChoices } from '../lessons/SkipCountingLesson'

interface Props { onComplete: (c: number, w: number, mastered?: boolean) => void; childName: string }

const TOTAL_ROUNDS = 10
const rint = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))
const coin = () => Math.random() < 0.5

interface Round { step: number; seq: number[]; blankIndex: number; answer: number; choices: number[]; isNext: boolean; say: string }

function makeRound(d: 1 | 2 | 3): Round {
  const steps = d === 1 ? [2, 10] : [2, 5, 10]
  const step = steps[rint(0, steps.length - 1)]
  const terms = d === 1 ? 4 : 5
  // Higher difficulty sometimes starts past the first multiple (e.g. 6, 8, 10, …).
  const startMult = d === 3 && coin() ? rint(2, 4) : 1
  const seq = Array.from({ length: terms }, (_, k) => (startMult + k) * step)
  const isNext = d === 1 ? true : coin()
  const blankIndex = isNext ? terms - 1 : rint(1, terms - 2)
  const answer = seq[blankIndex]
  return {
    step, seq, blankIndex, answer, choices: buildSkipChoices(answer, step), isNext,
    say: `Count by ${step}s. ${isNext ? 'What comes next?' : 'What number is missing?'}`,
  }
}

type ReMed = { phase: 'reteach' | 'check'; round: Round } | null

export default function SkipCountingChapter({ onComplete, childName }: Props) {
  const { phase, startPractice } = useChapterPhase()
  const { speak } = useMiloSpeaker()
  const ada = useAdaptive('skipCounting')
  const seen = useRef<Set<string>>(new Set())   // question signatures asked this session
  const [roundIdx, setRoundIdx] = useState(0)
  const [round, setRound] = useState<Round>(() => makeDistinct(() => makeRound(1), seen.current))
  const [selected, setSelected] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [correct, setCorrect] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [wrongRun, setWrongRun] = useState(0)
  const [reMed, setReMed] = useState<ReMed>(null)
  const answerRef = useRef<HTMLElement | null>(null)

  function loadRound(idx: number) {
    const r = makeDistinct(() => makeRound(ada.difficulty), seen.current)
    setRound(r); setSelected(null); setFeedback(null)
    speakAfterCurrent(idx === 0 ? `Hi ${childName}! ${r.say}` : r.say)
  }

  useEffect(() => { if (phase === 'practice') loadRound(roundIdx) }, [roundIdx, ada.difficulty, phase]) // eslint-disable-line

  function handleAnswer(choice: number) {
    if (selected !== null) return
    const ok = choice === round.answer
    setSelected(choice); setFeedback(ok ? 'correct' : 'wrong')
    const res = ada.record(ok)
    const newRun = ok ? 0 : wrongRun + 1
    setWrongRun(newRun)
    if (ok) { setCorrect(c => c + 1); speakAt(`Yes! ${numberToWords(round.answer)}! ${ada.praise}`, answerRef.current) }
    else { setWrong(w => w + 1); speakAt(`It's ${numberToWords(round.answer)}. ${ada.encouragement}`, answerRef.current) }
    afterSpeech(() => {
      setFeedback(null)
      if (!ok && newRun >= 3) { setReMed({ phase: 'reteach', round }); return }
      // Demonstrated mastery → finish early with full stars, skip the repetitive tail.
      if (res.mastered) { onComplete(ok ? correct + 1 : correct, ok ? wrong : wrong + 1, true); return }
      const next = roundIdx + 1
      if (next >= TOTAL_ROUNDS) onComplete(ok ? correct + 1 : correct, ok ? wrong : wrong + 1)
      else window.setTimeout(() => setRoundIdx(next), 300)
    })
  }

  function finishReMed() {
    setReMed(null); setWrongRun(0)
    if (roundIdx + 1 >= TOTAL_ROUNDS) onComplete(correct, wrong)
    else setRoundIdx(roundIdx + 1)
  }

  if (phase === 'lesson') return <SkipCountingLesson childName={childName} onLessonComplete={startPractice} />

  const bubbleText = selected !== null
    ? feedback === 'correct' ? `🎉 ${round.answer}!` : `It's ${round.answer} — now you know.`
    : round.isNext ? 'What comes next?' : 'What is missing?'

  return (
    <div style={S.page}>
      <SpeakingLock />
      <GameTopbar chapterName="Skip Counting" roundIdx={roundIdx} totalRounds={TOTAL_ROUNDS} />
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 8, background: 'rgba(0,0,0,0.08)', zIndex: 5 }}>
        <div style={{ height: '100%', width: `${(roundIdx / TOTAL_ROUNDS) * 100}%`, background: 'var(--garden-green)', borderRadius: '0 4px 4px 0', transition: 'width 0.4s ease' }} />
      </div>
      <div style={S.topRow}>
        <DifficultyBadge difficulty={ada.difficulty} isOnFire={ada.isOnFire} />
        {ada.shouldHint && <span style={S.hintTag}>💡 Count by {round.step}s!</span>}
      </div>
      <div style={S.miloRow}>
        <img src="/assets/characters/milo-happy.png" alt="Milo" style={S.milo}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        <div className="milo-bubble" style={{ flex: 1, fontSize: 22 }}>{bubbleText}</div>
      </div>

      <div style={S.label}>Counting by {round.step}s</div>
      <div style={S.scene}>
        <SeqRow items={round.seq.map((v, i) => ({
          label: i === round.blankIndex ? (selected != null ? String(round.answer) : '?') : String(v),
          tone: i === round.blankIndex ? 'blank' : 'on',
        }))} />
      </div>

      <button onClick={() => speak(round.say)} style={S.replayWrap}><span style={S.replay}>🔊 Say it again</span></button>

      <div style={S.choicesRow}>
        {round.choices.map(ch => {
          const isSel = selected === ch, isOk = ch === round.answer
          return (
            <button key={ch} disabled={selected !== null} onClick={() => handleAnswer(ch)}
              ref={isOk ? (el) => { answerRef.current = el } : undefined} style={{
                width: 96, height: 96,
                background: (selected !== null && isOk) ? 'var(--garden-green-soft)' : 'var(--paper)',
                border: `4px solid ${(selected !== null && isOk) ? 'var(--garden-green)' : isSel ? 'var(--ink-muted)' : 'var(--outline)'}`,
                borderRadius: 24, boxShadow: `0 6px 0 ${(selected !== null && isOk) ? 'var(--garden-green-deep)' : '#c8ac79'}`,
                fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 42, color: 'var(--ink)',
                cursor: selected !== null ? 'default' : 'pointer',
                transform: ((selected !== null && isOk) || isSel) ? 'scale(1.1) translateY(-4px)' : 'scale(1)',
                transition: 'transform 160ms cubic-bezier(.34,1.56,.64,1),background 160ms ease',
              }}>{ch}</button>
          )
        })}
      </div>

      {feedback && <div style={{ ...S.flash, background: feedback === 'correct' ? 'var(--garden-green)' : 'var(--milo-orange)' }}>
        {feedback === 'correct' ? `✅ ${round.answer}!` : `It's ${round.answer} — now you know! 🙂`}
      </div>}
      <p style={S.roundLabel}>Round {Math.min(roundIdx + 1, TOTAL_ROUNDS)} of {TOTAL_ROUNDS}</p>

      {reMed?.phase === 'reteach' && (
        <ReMedOverlay>
          <SkipWatch step={reMed.round.step} terms={5}
            intro={`Let's count by ${reMed.round.step}s together.`} outro="Now you try!"
            onDone={() => setReMed({ ...reMed, phase: 'check' })} />
        </ReMedOverlay>
      )}
      {reMed?.phase === 'check' && (
        <ReMedOverlay>
          <SkipPick seq={reMed.round.seq} blankIndex={reMed.round.blankIndex} step={reMed.round.step}
            intro={`Now you try! Count by ${reMed.round.step}s.`}
            outro={`Yes! ${numberToWords(reMed.round.answer)}!`}
            onDone={finishReMed} />
        </ReMedOverlay>
      )}
    </div>
  )
}

function ReMedOverlay({ children }: { children: React.ReactNode }) {
  if (typeof document === 'undefined') return null
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(61,37,22,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <style>{KIT_CSS}</style>
      <div style={{ background: 'var(--paper)', border: '4px solid var(--outline)', borderRadius: 24, padding: '22px 14px 26px', maxWidth: 520, width: '100%', boxShadow: '0 8px 0 rgba(61,37,22,.2)', maxHeight: '94vh', overflowY: 'auto' }}>
        {children}
      </div>
    </div>,
    document.body,
  )
}

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '72px 24px 32px', gap: 16, position: 'relative', background: 'linear-gradient(180deg,var(--garden-green-soft) 0%,var(--bg-page) 55%)' },
  topRow: { display: 'flex', gap: 10, alignItems: 'center' },
  hintTag: { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--garden-green-deep)', background: 'var(--garden-green-soft)', border: '2px solid var(--garden-green)', borderRadius: 999, padding: '3px 12px' },
  miloRow: { display: 'flex', alignItems: 'flex-end', gap: 16, width: '100%', maxWidth: 540 },
  milo: { width: 92, height: 92, objectFit: 'contain', flexShrink: 0, filter: 'drop-shadow(0 4px 10px rgba(61,37,22,.15))' },
  label: { fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: 'var(--ink-soft)' },
  scene: { display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.65)', border: '4px solid var(--outline)', borderRadius: 24, padding: '18px 20px', boxShadow: '0 6px 0 rgba(61,37,22,.08)', maxWidth: 620, width: '100%' },
  replayWrap: { background: 'none', border: 'none', padding: 0, cursor: 'pointer' },
  replay: { display: 'inline-block', background: 'var(--paper)', border: '3px solid var(--outline)', borderRadius: 999, padding: '8px 18px', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: 'var(--ink)', boxShadow: '0 3px 0 rgba(61,37,22,.12)' },
  choicesRow: { display: 'flex', gap: 18, justifyContent: 'center', flexWrap: 'wrap', animation: 'slide-up 300ms ease both' },
  flash: { position: 'fixed', top: '38%', left: '50%', transform: 'translate(-50%,-50%)', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 38, padding: '18px 44px', borderRadius: 28, border: '4px solid var(--outline)', boxShadow: '0 8px 0 rgba(61,37,22,.2)', zIndex: 50, textAlign: 'center', animation: 'modal-in 280ms cubic-bezier(.34,1.56,.64,1) both' },
  roundLabel: { fontFamily: 'var(--font-body)', fontSize: 'var(--t-label)', color: 'var(--ink-muted)', margin: 0 },
}
