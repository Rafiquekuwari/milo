'use client'
/**
 * RoundingChapter (9–11) — round to the nearest 10/100, and estimate sums.
 * Adaptive: L1 nearest-10, L2 adds nearest-100, L3 adds estimation. 10 rounds,
 * after-3-wrong re-teach (round it on the line / estimate, then check).
 * See docs/curriculum-9-11.md.
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
import { CSS as KIT_CSS } from '../lessons/_kit'
import RoundingLesson, { roundTo, RoundLine, RoundWatch, RoundPick, EstimateWatch, EstimatePick } from '../lessons/RoundingLesson'

interface Props { onComplete: (c: number, w: number, mastered?: boolean) => void; childName: string }

const TOTAL_ROUNDS = 10
const rint = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]
const shuffle = <T,>(a: T[]) => a.slice().sort(() => Math.random() - 0.5)

type QType = 'round10' | 'round100' | 'estimate'
interface Round { type: QType; n?: number; m?: number; a?: number; b?: number; question: string; say: string; answer: number; choices: number[] }

function stepChoices(answer: number, m: number): number[] {
  const opts = new Set<number>([answer])
  for (const v of [answer - m, answer + m, answer + 2 * m, answer - 2 * m]) { if (opts.size >= 3) break; if (v >= 0) opts.add(v) }
  return shuffle([...opts])
}
function makeRound(d: 1 | 2 | 3): Round {
  const pool: QType[] = d === 1 ? ['round10'] : d === 2 ? ['round10', 'round100', 'round10'] : ['round100', 'estimate', 'round10']
  const t = pick(pool)
  if (t === 'round10') {
    const n = rint(11, d === 1 ? 99 : 199)
    const answer = roundTo(n, 10)
    return { type: t, n, m: 10, question: `Round ${n} to the nearest 10`, say: `Round ${n} to the nearest ten.`, answer, choices: stepChoices(answer, 10) }
  }
  if (t === 'round100') {
    const n = rint(150, 990)
    const answer = roundTo(n, 100)
    return { type: t, n, m: 100, question: `Round ${n} to the nearest 100`, say: `Round ${n} to the nearest hundred.`, answer, choices: stepChoices(answer, 100) }
  }
  const a = rint(11, 89), b = rint(11, 89)
  const answer = roundTo(a, 10) + roundTo(b, 10)
  return { type: t, a, b, question: `About how much is ${a} + ${b}?`, say: `About how much is ${a} plus ${b}? Round each first.`, answer, choices: stepChoices(answer, 10) }
}

type ReMed = { phase: 'reteach' | 'check'; round: Round } | null

export default function RoundingChapter({ onComplete, childName }: Props) {
  const { phase, startPractice } = useChapterPhase()
  const { speak } = useMiloSpeaker()
  const ada = useAdaptive('rounding')
  const seen = useRef<Set<string>>(new Set())   // question signatures asked this session
  const [roundIdx, setRoundIdx] = useState(0)
  const [round, setRound] = useState<Round>(() => makeDistinct(() => makeRound(1), seen.current, r => r.question))
  const [selected, setSelected] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [correct, setCorrect] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [wrongRun, setWrongRun] = useState(0)
  const [reMed, setReMed] = useState<ReMed>(null)
  const answerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (phase !== 'practice') return
    const r = makeDistinct(() => makeRound(ada.difficulty), seen.current, r => r.question)
    setRound(r); setSelected(null); setFeedback(null)
    speakAfterCurrent(roundIdx === 0 ? `Hi ${childName}! ${r.say}` : r.say)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIdx, phase])

  if (phase === 'lesson') return <RoundingLesson childName={childName} onLessonComplete={startPractice} />

  function handleAnswer(choice: number) {
    if (selected !== null) return
    const ok = choice === round.answer
    setSelected(choice); setFeedback(ok ? 'correct' : 'wrong')
    const res = ada.record(ok)
    const newRun = ok ? 0 : wrongRun + 1
    setWrongRun(newRun)
    if (ok) { setCorrect(c => c + 1); speakAt(`Yes! ${ada.praise}`, answerRef.current) }
    else { setWrong(w => w + 1); speakAt(`${round.type === 'estimate' ? 'About' : 'It rounds to'} ${round.answer}. ${ada.encouragement}`, answerRef.current) }
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

  const bubbleText = selected !== null
    ? feedback === 'correct' ? '🎉 Correct!' : `It's ${round.type === 'estimate' ? 'about ' : ''}${round.answer} — now you know.`
    : round.question

  return (
    <div style={S.page}>
      <SpeakingLock />
      <GameTopbar chapterName="Rounding" roundIdx={roundIdx} totalRounds={TOTAL_ROUNDS} />
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 8, background: 'rgba(0,0,0,0.08)', zIndex: 5 }}>
        <div style={{ height: '100%', width: `${(roundIdx / TOTAL_ROUNDS) * 100}%`, background: 'var(--garden-green)', borderRadius: '0 4px 4px 0', transition: 'width 0.4s ease' }} />
      </div>
      <div style={S.topRow}>
        <DifficultyBadge difficulty={ada.difficulty} isOnFire={ada.isOnFire} />
        {ada.shouldHint && <span style={S.hintTag}>💡 Which is nearer?</span>}
      </div>
      <div style={S.miloRow}>
        <img src="/assets/characters/milo-happy.png" alt="Milo" style={S.milo}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        <div className="milo-bubble" style={{ flex: 1, fontSize: 22 }}>{bubbleText}</div>
      </div>

      <div style={S.visual}>
        {round.type === 'estimate'
          ? <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 40, color: 'var(--ink)' }}>{round.a} + {round.b}</div>
          : <RoundLine value={round.n!} m={round.m!} stage={2} />}
      </div>

      <button onClick={() => speak(round.say)} style={S.replayWrap}>
        <span style={S.replay}>🔊 Say it again</span>
      </button>

      <div style={S.choicesRow}>
        {round.choices.map(ch => {
          const isSel = selected === ch, isOk = ch === round.answer
          return (
            <button key={ch} disabled={selected !== null} onClick={() => handleAnswer(ch)}
              ref={isOk ? (el) => { answerRef.current = el } : undefined} style={{
                minWidth: 96, height: 92, padding: '0 12px',
                background: (selected !== null && isOk) ? 'var(--garden-green-soft)' : 'var(--paper)',
                border: `4px solid ${(selected !== null && isOk) ? 'var(--garden-green)' : isSel ? 'var(--ink-muted)' : 'var(--outline)'}`,
                borderRadius: 24, boxShadow: `0 6px 0 ${(selected !== null && isOk) ? 'var(--garden-green-deep)' : '#c8ac79'}`,
                fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 36, color: 'var(--ink)',
                cursor: selected !== null ? 'default' : 'pointer',
                transform: ((selected !== null && isOk) || isSel) ? 'scale(1.08) translateY(-4px)' : 'scale(1)',
                transition: 'transform 160ms cubic-bezier(.34,1.56,.64,1),background 160ms ease',
              }}>{round.type === 'estimate' ? `~${ch}` : ch}</button>
          )
        })}
      </div>

      {feedback && <div style={{ ...S.flash, background: feedback === 'correct' ? 'var(--garden-green)' : 'var(--milo-orange)' }}>
        {feedback === 'correct' ? '✅ Yes!' : `It's ${round.type === 'estimate' ? '≈ ' : ''}${round.answer} — now you know! 🙂`}
      </div>}
      <p style={S.roundLabel}>Round {Math.min(roundIdx + 1, TOTAL_ROUNDS)} of {TOTAL_ROUNDS}</p>

      {reMed?.phase === 'reteach' && (
        <ReMedOverlay>
          {reMed.round.type === 'estimate'
            ? <EstimateWatch a={reMed.round.a!} b={reMed.round.b!} intro={`Let's estimate ${reMed.round.a} plus ${reMed.round.b} by rounding each.`} outro="Now you try!" onDone={() => setReMed({ ...reMed, phase: 'check' })} />
            : <RoundWatch value={reMed.round.n!} m={reMed.round.m!} intro={`Let's round ${reMed.round.n} on the line together.`} outro="Now you try!" onDone={() => setReMed({ ...reMed, phase: 'check' })} />}
        </ReMedOverlay>
      )}
      {reMed?.phase === 'check' && (
        <ReMedOverlay>
          {reMed.round.type === 'estimate'
            ? <EstimatePick a={reMed.round.a!} b={reMed.round.b!} choices={reMed.round.choices} intro="Now you estimate!" outro={`Yes! About ${reMed.round.answer}!`} onDone={finishReMed} />
            : <RoundPick value={reMed.round.n!} m={reMed.round.m!} choices={reMed.round.choices} intro="Now you round it!" outro={`Yes! ${reMed.round.answer}!`} onDone={finishReMed} />}
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
      <div style={{ background: 'var(--paper)', border: '4px solid var(--outline)', borderRadius: 24, padding: '22px 14px 26px', maxWidth: 480, width: '100%', boxShadow: '0 8px 0 rgba(61,37,22,.2)', maxHeight: '94vh', overflowY: 'auto' }}>
        {children}
      </div>
    </div>,
    document.body,
  )
}

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '72px 24px 32px', gap: 16, position: 'relative', background: 'linear-gradient(180deg,var(--sky-blue-soft) 0%,var(--bg-page) 55%)' },
  topRow: { display: 'flex', gap: 10, alignItems: 'center' },
  hintTag: { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--sky-blue-deep)', background: 'var(--sky-blue-soft)', border: '2px solid var(--sky-blue)', borderRadius: 999, padding: '3px 12px' },
  miloRow: { display: 'flex', alignItems: 'flex-end', gap: 16, width: '100%', maxWidth: 540 },
  milo: { width: 92, height: 92, objectFit: 'contain', flexShrink: 0, filter: 'drop-shadow(0 4px 10px rgba(61,37,22,.15))' },
  visual: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,.65)', border: '4px solid var(--outline)', borderRadius: 24, padding: '12px 18px', boxShadow: '0 6px 0 rgba(61,37,22,.08)', minHeight: 120, justifyContent: 'center', maxWidth: '100%', overflowX: 'auto' },
  replayWrap: { background: 'none', border: 'none', padding: 0, cursor: 'pointer' },
  replay: { display: 'inline-block', background: 'var(--paper)', border: '3px solid var(--outline)', borderRadius: 999, padding: '8px 18px', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: 'var(--ink)', boxShadow: '0 3px 0 rgba(61,37,22,.12)' },
  choicesRow: { display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', animation: 'slide-up 300ms ease both' },
  flash: { position: 'fixed', top: '38%', left: '50%', transform: 'translate(-50%,-50%)', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 38, padding: '18px 44px', borderRadius: 28, border: '4px solid var(--outline)', boxShadow: '0 8px 0 rgba(61,37,22,.2)', zIndex: 50, textAlign: 'center', animation: 'modal-in 280ms cubic-bezier(.34,1.56,.64,1) both' },
  roundLabel: { fontFamily: 'var(--font-body)', fontSize: 'var(--t-label)', color: 'var(--ink-muted)', margin: 0 },
}
