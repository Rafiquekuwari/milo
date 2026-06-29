'use client'
/**
 * ArithmeticChapter (6–8) — two-digit add/subtract to 100. One parameterized
 * component; AdditionTo100Chapter and SubtractionTo100Chapter are thin wrappers.
 * Adaptive ranges, 10 rounds, after-3-wrong re-teach (watch it worked, then a check).
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
import ArithmeticLesson, { BlockMath, EquationWatch, EquationAsk, buildArithChoices, applyOp, type Op } from '../lessons/ArithmeticLesson'
import type { ChapterType } from '@/lib/store'

interface Props { onComplete: (c: number, w: number, mastered?: boolean) => void; childName: string }
interface GenProps extends Props { op: Op; chapterId: ChapterType; title: string }

const TOTAL_ROUNDS = 10
const rint = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))

interface Round { a: number; b: number; answer: number; choices: number[] }

function makeRound(op: Op, d: 1 | 2 | 3): Round {
  let a: number, b: number
  if (op === '+') {
    if (d === 1) { a = rint(10, 19); b = rint(1, 9) }
    else if (d === 2) { a = rint(20, 49); b = rint(10, Math.min(40, 99 - 49)) }
    else { a = rint(40, 80); b = rint(10, 99 - a) }
  } else {
    if (d === 1) { a = rint(11, 20); b = rint(1, 9) }
    else if (d === 2) { a = rint(20, 60); b = rint(10, a - 5) }
    else { a = rint(50, 99); b = rint(15, a - 10) }
  }
  const answer = applyOp(op, a, b)
  return { a, b, answer, choices: buildArithChoices(answer, op, a, b) }
}

type ReMed = { phase: 'reteach' | 'check'; round: Round } | null

function ArithmeticChapter({ op, chapterId, title, onComplete, childName }: GenProps) {
  const { phase, startPractice } = useChapterPhase()
  const { speak } = useMiloSpeaker()
  const ada = useAdaptive(chapterId)
  const seen = useRef<Set<string>>(new Set())   // question signatures asked this session
  const [roundIdx, setRoundIdx] = useState(0)
  const [round, setRound] = useState<Round>(() => makeDistinct(() => makeRound(op, 1), seen.current, r => `${r.a},${r.b}`))
  const [selected, setSelected] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [correct, setCorrect] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [wrongRun, setWrongRun] = useState(0)
  const [reMed, setReMed] = useState<ReMed>(null)
  const answerRef = useRef<HTMLElement | null>(null)

  const sayRound = (r: Round) => `${numberToWords(r.a)} ${op === '+' ? 'plus' : 'minus'} ${numberToWords(r.b)}. What is the answer?`

  function loadRound(idx: number) {
    const r = makeDistinct(() => makeRound(op, ada.difficulty), seen.current, r => `${r.a},${r.b}`)
    setRound(r); setSelected(null); setFeedback(null)
    speakAfterCurrent(idx === 0 ? `Hi ${childName}! ${sayRound(r)}` : sayRound(r))
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

  if (phase === 'lesson') return <ArithmeticLesson op={op} childName={childName} onLessonComplete={startPractice} />

  const bubbleText = selected !== null
    ? feedback === 'correct' ? `🎉 ${round.answer}!` : `It's ${round.answer} — now you know.`
    : 'What is the answer?'

  return (
    <div style={S.page}>
      <SpeakingLock />
      <GameTopbar chapterName={title} roundIdx={roundIdx} totalRounds={TOTAL_ROUNDS} />
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 8, background: 'rgba(0,0,0,0.08)', zIndex: 5 }}>
        <div style={{ height: '100%', width: `${(roundIdx / TOTAL_ROUNDS) * 100}%`, background: 'var(--garden-green)', borderRadius: '0 4px 4px 0', transition: 'width 0.4s ease' }} />
      </div>
      <div style={S.topRow}>
        <DifficultyBadge difficulty={ada.difficulty} isOnFire={ada.isOnFire} />
        {ada.shouldHint && <span style={S.hintTag}>💡 Tens first, then ones!</span>}
      </div>
      <div style={S.miloRow}>
        <img src="/assets/characters/milo-happy.png" alt="Milo" style={S.milo}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        <div className="milo-bubble" style={{ flex: 1, fontSize: 22 }}>{bubbleText}</div>
      </div>

      <div style={S.sceneBox}><BlockMath a={round.a} op={op} b={round.b} answer={round.answer} showAnswer={selected != null} /></div>

      <button onClick={() => speak(sayRound(round))} style={S.replayWrap}><span style={S.replay}>🔊 Say it again</span></button>

      <div style={S.choicesRow}>
        {round.choices.map(ch => {
          const isSel = selected === ch, isOk = ch === round.answer
          return (
            <button key={ch} disabled={selected !== null} onClick={() => handleAnswer(ch)}
              ref={isOk ? (el) => { answerRef.current = el } : undefined} style={{
                width: 92, height: 92,
                background: (selected !== null && isOk) ? 'var(--garden-green-soft)' : 'var(--paper)',
                border: `4px solid ${(selected !== null && isOk) ? 'var(--garden-green)' : isSel ? 'var(--ink-muted)' : 'var(--outline)'}`,
                borderRadius: 24, boxShadow: `0 6px 0 ${(selected !== null && isOk) ? 'var(--garden-green-deep)' : '#c8ac79'}`,
                fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 40, color: 'var(--ink)',
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
          <EquationWatch op={op} a={reMed.round.a} b={reMed.round.b} onDone={() => setReMed({ ...reMed, phase: 'check' })} />
        </ReMedOverlay>
      )}
      {reMed?.phase === 'check' && (
        <ReMedOverlay>
          <EquationAsk op={op} a={reMed.round.a} b={reMed.round.b} choices={reMed.round.choices}
            intro="Now you try! What is the answer?" outro={`Yes! ${reMed.round.answer}!`} onDone={finishReMed} />
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
      <div style={{ background: 'var(--paper)', border: '4px solid var(--outline)', borderRadius: 24, padding: '22px 16px 26px', maxWidth: 460, width: '100%', boxShadow: '0 8px 0 rgba(61,37,22,.2)', maxHeight: '94vh', overflowY: 'auto' }}>
        {children}
      </div>
    </div>,
    document.body,
  )
}

export function AdditionTo100Chapter(p: Props) {
  return <ArithmeticChapter {...p} op="+" chapterId="additionTo100" title="Add to 100" />
}
export function SubtractionTo100Chapter(p: Props) {
  return <ArithmeticChapter {...p} op="-" chapterId="subtractionTo100" title="Subtract to 100" />
}

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '72px 24px 32px', gap: 16, position: 'relative', background: 'linear-gradient(180deg,var(--garden-green-soft) 0%,var(--bg-page) 55%)' },
  topRow: { display: 'flex', gap: 10, alignItems: 'center' },
  hintTag: { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--garden-green-deep)', background: 'var(--garden-green-soft)', border: '2px solid var(--garden-green)', borderRadius: 999, padding: '3px 12px' },
  miloRow: { display: 'flex', alignItems: 'flex-end', gap: 16, width: '100%', maxWidth: 540 },
  milo: { width: 88, height: 88, objectFit: 'contain', flexShrink: 0, filter: 'drop-shadow(0 4px 10px rgba(61,37,22,.15))' },
  sceneBox: { display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.65)', border: '4px solid var(--outline)', borderRadius: 24, padding: '22px 24px', boxShadow: '0 6px 0 rgba(61,37,22,.08)', minHeight: 96 },
  replayWrap: { background: 'none', border: 'none', padding: 0, cursor: 'pointer' },
  replay: { display: 'inline-block', background: 'var(--paper)', border: '3px solid var(--outline)', borderRadius: 999, padding: '8px 18px', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: 'var(--ink)', boxShadow: '0 3px 0 rgba(61,37,22,.12)' },
  choicesRow: { display: 'flex', gap: 18, justifyContent: 'center', flexWrap: 'wrap', animation: 'slide-up 300ms ease both' },
  flash: { position: 'fixed', top: '38%', left: '50%', transform: 'translate(-50%,-50%)', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 38, padding: '18px 44px', borderRadius: 28, border: '4px solid var(--outline)', boxShadow: '0 8px 0 rgba(61,37,22,.2)', zIndex: 50, textAlign: 'center', animation: 'modal-in 280ms cubic-bezier(.34,1.56,.64,1) both' },
  roundLabel: { fontFamily: 'var(--font-body)', fontSize: 'var(--t-label)', color: 'var(--ink-muted)', margin: 0 },
}
