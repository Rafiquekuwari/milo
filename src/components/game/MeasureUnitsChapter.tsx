'use client'
/**
 * MeasureUnitsChapter (9–11) — choose the sensible unit and convert between metric
 * units. Adaptive: L1 choose-unit + ×10/×100, L2 adds ×1000, L3 adds ÷ conversions.
 * 10 rounds, after-3-wrong re-teach (worked conversion / unit tip, then check).
 * See docs/curriculum-9-11.md.
 */
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useMiloSpeaker, afterSpeech, speakAfterCurrent, speakAt, speak } from '@/lib/useMiloSpeaker'
import { useAdaptive } from '@/lib/adaptive'
import { DifficultyBadge } from '../ui/DifficultyBadge'
import { useChapterPhase } from '@/lib/useChapterPhase'
import SpeakingLock from '@/components/ui/SpeakingLock'
import GameTopbar from '../ui/GameTopbar'
import { CSS as KIT_CSS } from '../lessons/_kit'
import MeasureUnitsLesson, { ConvertWatch, MeasurePick, unitName } from '../lessons/MeasureUnitsLesson'

interface Props { onComplete: (c: number, w: number) => void; childName: string }

const TOTAL_ROUNDS = 10
const rint = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]
const shuffle = <T,>(a: T[]) => a.slice().sort(() => Math.random() - 0.5)

const CONV = [
  { big: 'm', small: 'cm', factor: 100 }, { big: 'cm', small: 'mm', factor: 10 },
  { big: 'km', small: 'm', factor: 1000 }, { big: 'kg', small: 'g', factor: 1000 },
  { big: 'l', small: 'ml', factor: 1000 },
]
const OBJECTS = [
  { emoji: '✏️', name: 'a pencil', unit: 'cm', options: ['mm', 'cm', 'km'] },
  { emoji: '🏊', name: 'a swimming pool', unit: 'm', options: ['cm', 'm', 'km'] },
  { emoji: '🚗', name: 'a long car trip', unit: 'km', options: ['cm', 'm', 'km'] },
  { emoji: '🍉', name: 'a watermelon', unit: 'kg', options: ['g', 'kg', 'ml'] },
  { emoji: '🪶', name: 'a feather', unit: 'g', options: ['g', 'kg', 'l'] },
  { emoji: '🥤', name: 'a cup of juice', unit: 'ml', options: ['ml', 'l', 'g'] },
  { emoji: '🛢️', name: 'a water tank', unit: 'l', options: ['ml', 'l', 'cm'] },
  { emoji: '🐜', name: 'an ant', unit: 'mm', options: ['mm', 'cm', 'm'] },
]

type QType = 'unit' | 'convert' | 'convertDiv'
interface Round {
  type: QType; question: string; say: string; answer: string; choices: string[]
  value?: number; from?: string; factor?: number; op?: '×' | '÷'; to?: string  // convert
  emoji?: string; name?: string; unit?: string                                  // unit
}

function makeRound(d: 1 | 2 | 3): Round {
  const pool: QType[] = d === 1 ? ['unit', 'convert'] : d === 2 ? ['unit', 'convert', 'convert'] : ['convert', 'convertDiv', 'unit']
  const t = pick(pool)
  if (t === 'unit') {
    const o = pick(OBJECTS)
    return { type: t, emoji: o.emoji, name: o.name, unit: o.unit, question: `Which unit measures ${o.name}?`, say: `Which unit measures ${o.name}?`, answer: o.unit, choices: o.options }
  }
  if (t === 'convert') {
    const c = pick(d === 1 ? CONV.filter(x => x.factor <= 100) : CONV)
    const value = rint(2, 9)
    const answer = value * c.factor
    const choices = shuffle([value * Math.round(c.factor / 10), answer, value * c.factor * 10].map(String))
    return { type: t, value, from: c.big, factor: c.factor, op: '×', to: c.small, question: `${value} ${c.big} = ? ${c.small}`, say: `${value} ${unitName(c.big, value)} is how many ${unitName(c.small, 2)}?`, answer: String(answer), choices }
  }
  const c = pick(CONV)
  const q = rint(2, 9)
  const value = c.factor * q
  const choices = shuffle([q, q * 10, q * 100].map(String))
  return { type: 'convertDiv', value, from: c.small, factor: c.factor, op: '÷', to: c.big, question: `${value} ${c.small} = ? ${c.big}`, say: `${value} ${unitName(c.small, value)} is how many ${unitName(c.big, 2)}?`, answer: String(q), choices }
}

// Small "we measure X in Y" tip for the unit-question re-teach.
function UnitTip({ emoji, name, unit, onDone }: { emoji: string; name: string; unit: string; onDone: () => void }) {
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return; ran.current = true
    speak(`We measure ${name} in ${unitName(unit, 2)}.`)
    const id = window.setTimeout(onDone, 2800)
    return () => window.clearTimeout(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <div style={{ fontSize: 64 }}>{emoji}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, color: 'var(--milo-orange)', textAlign: 'center' }}>We measure {name} in {unit}.</div>
    </div>
  )
}

type ReMed = { phase: 'reteach' | 'check'; round: Round } | null

export default function MeasureUnitsChapter({ onComplete, childName }: Props) {
  const { phase, startPractice } = useChapterPhase()
  const { speak } = useMiloSpeaker()
  const ada = useAdaptive('measurementUnits')
  const [roundIdx, setRoundIdx] = useState(0)
  const [round, setRound] = useState<Round>(() => makeRound(1))
  const [selected, setSelected] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [correct, setCorrect] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [wrongRun, setWrongRun] = useState(0)
  const [reMed, setReMed] = useState<ReMed>(null)
  const answerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (phase !== 'practice') return
    const r = makeRound(ada.difficulty)
    setRound(r); setSelected(null); setFeedback(null)
    speakAfterCurrent(roundIdx === 0 ? `Hi ${childName}! ${r.say}` : r.say)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIdx, phase])

  if (phase === 'lesson') return <MeasureUnitsLesson childName={childName} onLessonComplete={startPractice} />

  function handleAnswer(choice: string) {
    if (selected !== null) return
    const ok = choice === round.answer
    setSelected(choice); setFeedback(ok ? 'correct' : 'wrong')
    ada.record(ok)
    const newRun = ok ? 0 : wrongRun + 1
    setWrongRun(newRun)
    if (ok) { setCorrect(c => c + 1); speakAt(`Yes! ${ada.praise}`, answerRef.current) }
    else { setWrong(w => w + 1); speakAt(`It was ${round.answer}. ${ada.encouragement}`, answerRef.current) }
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

  const bubbleText = selected !== null
    ? feedback === 'correct' ? '🎉 Correct!' : `It's ${round.answer} — now you know.`
    : round.question

  return (
    <div style={S.page}>
      <SpeakingLock />
      <GameTopbar chapterName="Measurement" roundIdx={roundIdx} totalRounds={TOTAL_ROUNDS} />
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 8, background: 'rgba(0,0,0,0.08)', zIndex: 5 }}>
        <div style={{ height: '100%', width: `${(roundIdx / TOTAL_ROUNDS) * 100}%`, background: 'var(--garden-green)', borderRadius: '0 4px 4px 0', transition: 'width 0.4s ease' }} />
      </div>
      <div style={S.topRow}>
        <DifficultyBadge difficulty={ada.difficulty} isOnFire={ada.isOnFire} />
        {ada.shouldHint && <span style={S.hintTag}>💡 {round.type === 'unit' ? 'Picture the size!' : '×/÷ by 10, 100 or 1000'}</span>}
      </div>
      <div style={S.miloRow}>
        <img src="/assets/characters/milo-happy.png" alt="Milo" style={S.milo}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        <div className="milo-bubble" style={{ flex: 1, fontSize: 22 }}>{bubbleText}</div>
      </div>

      <div style={S.visual}>
        {round.type === 'unit'
          ? <div style={{ fontSize: 64 }}>{round.emoji}</div>
          : <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 40, color: 'var(--milo-orange)' }}>{round.question}</div>}
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
                minWidth: 96, height: 84, padding: '0 14px',
                background: (selected !== null && isOk) ? 'var(--garden-green-soft)' : 'var(--paper)',
                border: `4px solid ${(selected !== null && isOk) ? 'var(--garden-green)' : isSel ? 'var(--ink-muted)' : 'var(--outline)'}`,
                borderRadius: 24, boxShadow: `0 6px 0 ${(selected !== null && isOk) ? 'var(--garden-green-deep)' : '#c8ac79'}`,
                fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 28, color: 'var(--ink)',
                cursor: selected !== null ? 'default' : 'pointer',
                transform: ((selected !== null && isOk) || isSel) ? 'scale(1.08) translateY(-4px)' : 'scale(1)',
                transition: 'transform 160ms cubic-bezier(.34,1.56,.64,1),background 160ms ease',
              }}>{ch}</button>
          )
        })}
      </div>

      {feedback && <div style={{ ...S.flash, background: feedback === 'correct' ? 'var(--garden-green)' : 'var(--milo-orange)' }}>
        {feedback === 'correct' ? '✅ Yes!' : `It's ${round.answer} — now you know! 🙂`}
      </div>}
      <p style={S.roundLabel}>Round {Math.min(roundIdx + 1, TOTAL_ROUNDS)} of {TOTAL_ROUNDS}</p>

      {reMed?.phase === 'reteach' && (
        <ReMedOverlay>
          {reMed.round.type === 'unit'
            ? <UnitTip emoji={reMed.round.emoji!} name={reMed.round.name!} unit={reMed.round.unit!} onDone={() => setReMed({ ...reMed, phase: 'check' })} />
            : <ConvertWatch value={reMed.round.value!} from={reMed.round.from!} factor={reMed.round.factor!} op={reMed.round.op!} to={reMed.round.to!} intro="Let's convert it together." outro="Now you try!" onDone={() => setReMed({ ...reMed, phase: 'check' })} />}
        </ReMedOverlay>
      )}
      {reMed?.phase === 'check' && (
        <ReMedOverlay>
          <MeasurePick prompt={reMed.round.question} options={reMed.round.choices} answer={reMed.round.answer} intro="Now you pick the answer!" outro="Yes! Well done!" onDone={finishReMed} />
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
  visual: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,.65)', border: '4px solid var(--outline)', borderRadius: 24, padding: '18px 22px', boxShadow: '0 6px 0 rgba(61,37,22,.08)', minHeight: 110, justifyContent: 'center' },
  replayWrap: { background: 'none', border: 'none', padding: 0, cursor: 'pointer' },
  replay: { display: 'inline-block', background: 'var(--paper)', border: '3px solid var(--outline)', borderRadius: 999, padding: '8px 18px', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: 'var(--ink)', boxShadow: '0 3px 0 rgba(61,37,22,.12)' },
  choicesRow: { display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', animation: 'slide-up 300ms ease both' },
  flash: { position: 'fixed', top: '38%', left: '50%', transform: 'translate(-50%,-50%)', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 38, padding: '18px 44px', borderRadius: 28, border: '4px solid var(--outline)', boxShadow: '0 8px 0 rgba(61,37,22,.2)', zIndex: 50, textAlign: 'center', animation: 'modal-in 280ms cubic-bezier(.34,1.56,.64,1) both' },
  roundLabel: { fontFamily: 'var(--font-body)', fontSize: 'var(--t-label)', color: 'var(--ink-muted)', margin: 0 },
}
