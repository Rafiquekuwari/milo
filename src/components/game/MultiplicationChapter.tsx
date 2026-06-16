'use client'
/**
 * MultiplicationChapter (6–8) — intro multiplication as equal groups / arrays /
 * the × sign. Adaptive: L1 small groups with pictures, L2 up to 5×5 (groups &
 * arrays), L3 up to 10× shown symbolically. 10 rounds, after-3-wrong re-teach
 * (watch the groups counted out, then a check).
 */
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useMiloSpeaker, afterSpeech, speakAfterCurrent, speakAt } from '@/lib/useMiloSpeaker'
import { useAdaptive } from '@/lib/adaptive'
import { DifficultyBadge } from '../ui/DifficultyBadge'
import { useChapterPhase } from '@/lib/useChapterPhase'
import SpeakingLock from '@/components/ui/SpeakingLock'
import GameTopbar from '../ui/GameTopbar'
import { numberToWords, CSS as KIT_CSS } from '../lessons/_kit'
import MultiplicationLesson, {
  GroupsScene, ArrayScene, GroupsWatch, MultAsk, buildMultChoices, type MultMode,
} from '../lessons/MultiplicationLesson'

interface Props { onComplete: (c: number, w: number) => void; childName: string }

const TOTAL_ROUNDS = 10
const rint = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))
const pick = <T,>(a: T[]) => a[rint(0, a.length - 1)]
const EMOJIS = ['🍎', '🍪', '⭐', '🎈', '🌸', '🐟', '🦋', '✨']

interface Round { mode: MultMode; g: number; per: number; emoji: string; answer: number; choices: number[]; say: string }

function makeRound(d: 1 | 2 | 3): Round {
  let g: number, per: number, mode: MultMode
  if (d === 1) { g = rint(2, 3); per = rint(2, 3); mode = 'groups' }
  else if (d === 2) { g = rint(2, 5); per = rint(2, 5); mode = pick<MultMode>(['groups', 'array']) }
  else { g = rint(2, 10); per = rint(2, 10); mode = pick<MultMode>(['symbol', 'symbol', 'array']) }
  const answer = g * per
  const say = mode === 'symbol'
    ? `${numberToWords(g)} times ${numberToWords(per)}. How many altogether?`
    : `${numberToWords(g)} groups of ${numberToWords(per)}. How many altogether?`
  return { mode, g, per, emoji: pick(EMOJIS), answer, choices: buildMultChoices(answer, g, per), say }
}

type ReMed = { phase: 'reteach' | 'check'; round: Round } | null

export default function MultiplicationChapter({ onComplete, childName }: Props) {
  const { phase, startPractice } = useChapterPhase()
  const { speak } = useMiloSpeaker()
  const ada = useAdaptive('multiplication')
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
    if (ok) { setCorrect(c => c + 1); speakAt(`Yes! ${round.g} times ${round.per} is ${round.answer}! ${ada.praise}`, answerRef.current) }
    else { setWrong(w => w + 1); speakAt(`${round.g} times ${round.per} is ${round.answer}. ${ada.encouragement}`, answerRef.current) }
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

  if (phase === 'lesson') return <MultiplicationLesson childName={childName} onLessonComplete={startPractice} />

  const bubbleText = selected !== null
    ? feedback === 'correct' ? `🎉 ${round.answer}!` : `It was ${round.answer}.`
    : round.mode === 'symbol' ? `What is ${round.g} × ${round.per}?` : `${round.g} groups of ${round.per}…`

  return (
    <div style={S.page}>
      <SpeakingLock />
      <GameTopbar chapterName="Multiplication" roundIdx={roundIdx} totalRounds={TOTAL_ROUNDS} />
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 8, background: 'rgba(0,0,0,0.08)', zIndex: 5 }}>
        <div style={{ height: '100%', width: `${(roundIdx / TOTAL_ROUNDS) * 100}%`, background: 'var(--garden-green)', borderRadius: '0 4px 4px 0', transition: 'width 0.4s ease' }} />
      </div>
      <div style={S.topRow}>
        <DifficultyBadge difficulty={ada.difficulty} isOnFire={ada.isOnFire} />
        {ada.shouldHint && <span style={S.hintTag}>💡 Count the groups!</span>}
      </div>
      <div style={S.miloRow}>
        <img src="/assets/characters/milo-happy.png" alt="Milo" style={S.milo}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        <div className="milo-bubble" style={{ flex: 1, fontSize: 21 }}>{bubbleText}</div>
      </div>

      <div style={S.sceneBox}>
        {round.mode === 'groups' && <GroupsScene groups={round.g} per={round.per} emoji={round.emoji} />}
        {round.mode === 'array' && <ArrayScene rows={round.g} cols={round.per} />}
        {round.mode === 'symbol' && (
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 56, color: 'var(--milo-orange)' }}>{round.g} × {round.per} = ?</div>
        )}
      </div>

      <button onClick={() => speak(round.say)} style={S.replayWrap}><span style={S.replay}>🔊 Say it again</span></button>

      <div style={S.choicesRow}>
        {round.choices.map(ch => {
          const isSel = selected === ch, isOk = ch === round.answer
          return (
            <button key={ch} disabled={selected !== null} onClick={() => handleAnswer(ch)}
              ref={isOk ? (el) => { answerRef.current = el } : undefined} style={{
                width: 92, height: 92,
                background: isSel ? (isOk ? 'var(--garden-green-soft)' : 'var(--apple-red-soft)') : 'var(--paper)',
                border: `4px solid ${isSel ? (isOk ? 'var(--garden-green)' : 'var(--apple-red)') : 'var(--outline)'}`,
                borderRadius: 24, boxShadow: isSel ? `0 6px 0 ${isOk ? 'var(--garden-green-deep)' : 'var(--apple-red-deep)'}` : '0 6px 0 #c8ac79',
                fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 40, color: 'var(--ink)',
                cursor: selected !== null ? 'default' : 'pointer',
                transform: isSel ? 'scale(1.1) translateY(-4px)' : 'scale(1)',
                transition: 'transform 160ms cubic-bezier(.34,1.56,.64,1),background 160ms ease',
              }}>{ch}</button>
          )
        })}
      </div>

      {feedback && <div style={{ ...S.flash, background: feedback === 'correct' ? 'var(--garden-green)' : 'var(--apple-red)' }}>
        {feedback === 'correct' ? `✅ ${round.answer}!` : `It was ${round.answer}`}
      </div>}
      <p style={S.roundLabel}>Round {Math.min(roundIdx + 1, TOTAL_ROUNDS)} of {TOTAL_ROUNDS}</p>

      {reMed?.phase === 'reteach' && (
        <ReMedOverlay>
          <GroupsWatch groups={reMed.round.g} per={reMed.round.per} emoji={reMed.round.emoji || '🍎'}
            onDone={() => setReMed({ ...reMed, phase: 'check' })} />
        </ReMedOverlay>
      )}
      {reMed?.phase === 'check' && (
        <ReMedOverlay>
          <MultAsk mode={reMed.round.mode === 'symbol' ? 'groups' : reMed.round.mode}
            groups={reMed.round.g} per={reMed.round.per} emoji={reMed.round.emoji || '🍎'} choices={reMed.round.choices}
            intro="Now you try! Count the groups." outro={`Yes! ${reMed.round.answer}!`} onDone={finishReMed} />
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
  page: { minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '72px 24px 32px', gap: 16, position: 'relative', background: 'linear-gradient(180deg,var(--milo-orange-soft) 0%,var(--bg-page) 55%)' },
  topRow: { display: 'flex', gap: 10, alignItems: 'center' },
  hintTag: { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--milo-orange-deep)', background: 'var(--milo-orange-soft)', border: '2px solid var(--milo-orange)', borderRadius: 999, padding: '3px 12px' },
  miloRow: { display: 'flex', alignItems: 'flex-end', gap: 16, width: '100%', maxWidth: 540 },
  milo: { width: 88, height: 88, objectFit: 'contain', flexShrink: 0, filter: 'drop-shadow(0 4px 10px rgba(61,37,22,.15))' },
  sceneBox: { display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.65)', border: '4px solid var(--outline)', borderRadius: 24, padding: '18px 20px', boxShadow: '0 6px 0 rgba(61,37,22,.08)', maxWidth: 620, width: '100%', minHeight: 110 },
  replayWrap: { background: 'none', border: 'none', padding: 0, cursor: 'pointer' },
  replay: { display: 'inline-block', background: 'var(--paper)', border: '3px solid var(--outline)', borderRadius: 999, padding: '8px 18px', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: 'var(--ink)', boxShadow: '0 3px 0 rgba(61,37,22,.12)' },
  choicesRow: { display: 'flex', gap: 18, justifyContent: 'center', flexWrap: 'wrap', animation: 'slide-up 300ms ease both' },
  flash: { position: 'fixed', top: '38%', left: '50%', transform: 'translate(-50%,-50%)', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 38, padding: '18px 44px', borderRadius: 28, border: '4px solid var(--outline)', boxShadow: '0 8px 0 rgba(61,37,22,.2)', zIndex: 50, textAlign: 'center', animation: 'modal-in 280ms cubic-bezier(.34,1.56,.64,1) both' },
  roundLabel: { fontFamily: 'var(--font-body)', fontSize: 'var(--t-label)', color: 'var(--ink-muted)', margin: 0 },
}
