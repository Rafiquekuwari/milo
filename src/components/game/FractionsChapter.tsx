'use client'
/**
 * FractionsChapter (6–8) — halves, thirds, quarters. Two question types:
 *   • name: a bar split into D equal parts (1 shaded) → pick the fraction
 *   • group: a fraction OF a group → a number (half of 6 = 3)
 * Adaptive: L1 name (halves/quarters) → L2 + thirds + half-of-group →
 * L3 + thirds/quarters of bigger groups. 10 rounds, after-3-wrong re-teach.
 */
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useMiloSpeaker, afterSpeech, speakAfterCurrent, speakAt } from '@/lib/useMiloSpeaker'
import { useAdaptive } from '@/lib/adaptive'
import { DifficultyBadge } from '../ui/DifficultyBadge'
import { useChapterPhase } from '@/lib/useChapterPhase'
import SpeakingLock from '@/components/ui/SpeakingLock'
import GameTopbar from '../ui/GameTopbar'
import { CSS as KIT_CSS } from '../lessons/_kit'
import FractionsLesson, {
  DENS, fracWord, Frac, FractionBar, GroupScene, FractionWatch, FractionAsk, GroupWatch, GroupAsk, buildFracNumChoices,
} from '../lessons/FractionsLesson'

interface Props { onComplete: (c: number, w: number) => void; childName: string }

const TOTAL_ROUNDS = 10
const rint = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))
const pick = <T,>(a: T[]) => a[rint(0, a.length - 1)]
const EMOJIS = ['🍎', '🍪', '⭐', '🎈', '🌸', '🐟']

type FType = 'name' | 'group'
interface Round { type: FType; den: number; total: number; emoji: string; answer: number; choices: number[]; say: string }

function makeRound(d: 1 | 2 | 3): Round {
  const type: FType = d === 1 ? 'name' : pick<FType>(d === 2 ? ['name', 'group'] : ['name', 'group', 'group'])
  if (type === 'name') {
    const den = d === 1 ? pick([2, 4]) : pick(DENS)
    return { type, den, total: 0, emoji: '', answer: den, choices: DENS, say: 'What fraction is shaded?' }
  }
  const den = d === 2 ? 2 : pick(DENS)
  const per = d === 2 ? rint(2, 4) : rint(2, 5)
  const total = per * den
  return { type, den, total, emoji: pick(EMOJIS), answer: per, choices: buildFracNumChoices(per), say: `What is one ${fracWord(den)} of ${total}?` }
}

type ReMed = { phase: 'reteach' | 'check'; round: Round } | null

export default function FractionsChapter({ onComplete, childName }: Props) {
  const { phase, startPractice } = useChapterPhase()
  const { speak } = useMiloSpeaker()
  const ada = useAdaptive('fractions')
  const [roundIdx, setRoundIdx] = useState(0)
  const [round, setRound] = useState<Round>(() => makeRound(1))
  const [selected, setSelected] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [correct, setCorrect] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [wrongRun, setWrongRun] = useState(0)
  const [reMed, setReMed] = useState<ReMed>(null)
  const answerRef = useRef<HTMLElement | null>(null)

  function loadRound(idx: number) {
    const r = makeRound(ada.difficulty)
    setRound(r); setSelected(null); setFeedback(null)
    speakAfterCurrent(idx === 0 ? `Hi ${childName}! ${r.say}` : r.say)
  }

  useEffect(() => { if (phase === 'practice') loadRound(roundIdx) }, [roundIdx, ada.difficulty, phase]) // eslint-disable-line

  function handleAnswer(choice: number) {
    if (selected !== null) return
    const ok = choice === round.answer
    setSelected(choice); setFeedback(ok ? 'correct' : 'wrong')
    ada.record(ok)
    const newRun = ok ? 0 : wrongRun + 1
    setWrongRun(newRun)
    const ansSpoken = round.type === 'name' ? `one ${fracWord(round.answer)}` : `${round.answer}`
    if (ok) { setCorrect(c => c + 1); speakAt(`Yes! ${ansSpoken}! ${ada.praise}`, answerRef.current) }
    else { setWrong(w => w + 1); speakAt(`It's ${ansSpoken}. ${ada.encouragement}`, answerRef.current) }
    afterSpeech(() => {
      setFeedback(null)
      if (!ok && newRun >= 3) { setReMed({ phase: 'reteach', round }); return }
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

  if (phase === 'lesson') return <FractionsLesson childName={childName} onLessonComplete={startPractice} />

  const ansLabel = round.type === 'name' ? `one ${fracWord(round.answer)}` : `${round.answer}`
  const bubbleText = selected !== null
    ? feedback === 'correct' ? '🎉 Correct!' : `It's ${ansLabel} — now you know.`
    : round.type === 'name' ? 'What fraction is shaded?' : `One ${fracWord(round.den)} of ${round.total}?`

  return (
    <div style={S.page}>
      <SpeakingLock />
      <GameTopbar chapterName="Fractions" roundIdx={roundIdx} totalRounds={TOTAL_ROUNDS} />
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 8, background: 'rgba(0,0,0,0.08)', zIndex: 5 }}>
        <div style={{ height: '100%', width: `${(roundIdx / TOTAL_ROUNDS) * 100}%`, background: 'var(--garden-green)', borderRadius: '0 4px 4px 0', transition: 'width 0.4s ease' }} />
      </div>
      <div style={S.topRow}>
        <DifficultyBadge difficulty={ada.difficulty} isOnFire={ada.isOnFire} />
        {ada.shouldHint && <span style={S.hintTag}>💡 Count the equal parts!</span>}
      </div>
      <div style={S.miloRow}>
        <img src="/assets/characters/milo-happy.png" alt="Milo" style={S.milo}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        <div className="milo-bubble" style={{ flex: 1, fontSize: 21 }}>{bubbleText}</div>
      </div>

      <div style={S.sceneBox}>
        {round.type === 'name'
          ? <FractionBar parts={round.den} shaded={1} />
          : <GroupScene total={round.total} den={round.den} emoji={round.emoji} />}
      </div>

      <button onClick={() => speak(round.say)} style={S.replayWrap}><span style={S.replay}>🔊 Say it again</span></button>

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
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transform: ((selected !== null && isOk) || isSel) ? 'scale(1.1) translateY(-4px)' : 'scale(1)',
                transition: 'transform 160ms cubic-bezier(.34,1.56,.64,1),background 160ms ease',
              }}>{round.type === 'name' ? <Frac n={1} d={ch} size={24} /> : ch}</button>
          )
        })}
      </div>

      {feedback && <div style={{ ...S.flash, background: feedback === 'correct' ? 'var(--garden-green)' : 'var(--milo-orange)' }}>
        {feedback === 'correct' ? '✅ Yes!' : `It's ${ansLabel} — now you know! 🙂`}
      </div>}
      <p style={S.roundLabel}>Round {Math.min(roundIdx + 1, TOTAL_ROUNDS)} of {TOTAL_ROUNDS}</p>

      {reMed?.phase === 'reteach' && (
        <ReMedOverlay>
          {reMed.round.type === 'name'
            ? <FractionWatch den={reMed.round.den} intro={`Let's look at one ${fracWord(reMed.round.den)}.`} outro="Now you try!" onDone={() => setReMed({ ...reMed, phase: 'check' })} />
            : <GroupWatch total={reMed.round.total} den={reMed.round.den} emoji={reMed.round.emoji || '🍪'} onDone={() => setReMed({ ...reMed, phase: 'check' })} />}
        </ReMedOverlay>
      )}
      {reMed?.phase === 'check' && (
        <ReMedOverlay>
          {reMed.round.type === 'name'
            ? <FractionAsk den={reMed.round.den} intro="Now you try! What fraction is shaded?" outro={`Yes! One ${fracWord(reMed.round.den)}!`} onDone={finishReMed} />
            : <GroupAsk total={reMed.round.total} den={reMed.round.den} emoji={reMed.round.emoji || '🍪'} choices={reMed.round.choices} intro={`Now you try! One ${fracWord(reMed.round.den)} of ${reMed.round.total}?`} outro={`Yes! ${reMed.round.answer}!`} onDone={finishReMed} />}
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
      <div style={{ background: 'var(--paper)', border: '4px solid var(--outline)', borderRadius: 24, padding: '22px 16px 26px', maxWidth: 480, width: '100%', boxShadow: '0 8px 0 rgba(61,37,22,.2)', maxHeight: '94vh', overflowY: 'auto' }}>
        {children}
      </div>
    </div>,
    document.body,
  )
}

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '72px 24px 32px', gap: 16, position: 'relative', background: 'linear-gradient(180deg,var(--apple-red-soft) 0%,var(--bg-page) 55%)' },
  topRow: { display: 'flex', gap: 10, alignItems: 'center' },
  hintTag: { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--apple-red-deep)', background: 'var(--apple-red-soft)', border: '2px solid var(--apple-red)', borderRadius: 999, padding: '3px 12px' },
  miloRow: { display: 'flex', alignItems: 'flex-end', gap: 16, width: '100%', maxWidth: 540 },
  milo: { width: 88, height: 88, objectFit: 'contain', flexShrink: 0, filter: 'drop-shadow(0 4px 10px rgba(61,37,22,.15))' },
  sceneBox: { display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.65)', border: '4px solid var(--outline)', borderRadius: 24, padding: '18px 20px', boxShadow: '0 6px 0 rgba(61,37,22,.08)', maxWidth: 620, width: '100%', minHeight: 110 },
  replayWrap: { background: 'none', border: 'none', padding: 0, cursor: 'pointer' },
  replay: { display: 'inline-block', background: 'var(--paper)', border: '3px solid var(--outline)', borderRadius: 999, padding: '8px 18px', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: 'var(--ink)', boxShadow: '0 3px 0 rgba(61,37,22,.12)' },
  choicesRow: { display: 'flex', gap: 18, justifyContent: 'center', flexWrap: 'wrap', animation: 'slide-up 300ms ease both' },
  flash: { position: 'fixed', top: '38%', left: '50%', transform: 'translate(-50%,-50%)', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 38, padding: '18px 44px', borderRadius: 28, border: '4px solid var(--outline)', boxShadow: '0 8px 0 rgba(61,37,22,.2)', zIndex: 50, textAlign: 'center', animation: 'modal-in 280ms cubic-bezier(.34,1.56,.64,1) both' },
  roundLabel: { fontFamily: 'var(--font-body)', fontSize: 'var(--t-label)', color: 'var(--ink-muted)', margin: 0 },
}
