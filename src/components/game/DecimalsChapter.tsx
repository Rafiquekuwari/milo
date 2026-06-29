'use client'
/**
 * DecimalsChapter (9–11) — name tenths/hundredths and compare decimals.
 * All three question types appear from L1; higher levels ask hundredths more
 * often. 10 rounds,
 * after-3-wrong re-teach (the matching worked example, then check).
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
import { FractionBar } from '../lessons/FractionsCompareLesson'
import DecimalsLesson, { HundredGrid, TenthsWatch, HundredthsWatch, CompareDecWatch, DecPick } from '../lessons/DecimalsLesson'

interface Props { onComplete: (c: number, w: number, mastered?: boolean) => void; childName: string }

const TOTAL_ROUNDS = 10
const rint = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]
const shuffle = <T,>(a: T[]) => a.slice().sort(() => Math.random() - 0.5)
const tenthStr = (t: number) => (t / 10).toFixed(1)
const hundStr = (n: number) => (n / 100).toFixed(2)

type QType = 'tenthName' | 'hundName' | 'compare'
interface Round { type: QType; question: string; say: string; answer: string; choices: string[]; t?: number; n?: number; a?: number; b?: number }

function tenthChoices(t: number): string[] { return shuffle([tenthStr(t), `0.0${t}`, `${t}.0`]) }
function hundChoices(n: number): string[] {
  const set = new Set<string>([hundStr(n), (n / 10).toFixed(1), (n / 1000).toFixed(3)])
  let bump = 1; while (set.size < 3) { set.add(hundStr(Math.min(99, n + bump))); bump++ }
  return shuffle([...set])
}
function makeRound(d: 1 | 2 | 3): Round {
  const pool: QType[] = d === 1 ? ['tenthName', 'hundName', 'compare'] : d === 2 ? ['tenthName', 'hundName', 'hundName', 'compare'] : ['hundName', 'hundName', 'compare', 'tenthName']
  const ty = pick(pool)
  if (ty === 'tenthName') {
    const t = rint(1, 9)
    return { type: ty, t, question: 'What decimal is shaded?', say: 'What decimal is shaded?', answer: tenthStr(t), choices: tenthChoices(t) }
  }
  if (ty === 'hundName') {
    const n = rint(1, 99)
    return { type: ty, n, question: 'What decimal is shaded?', say: 'What decimal is shaded?', answer: hundStr(n), choices: hundChoices(n) }
  }
  let ta = rint(1, 9), tb = rint(1, 9); while (tb === ta) tb = rint(1, 9)
  const a = ta / 10, b = tb / 10
  return { type: ty, a, b, question: 'Which is bigger?', say: 'Which decimal is bigger?', answer: (a > b ? a : b).toFixed(1), choices: shuffle([a.toFixed(1), b.toFixed(1)]) }
}

type ReMed = { phase: 'reteach' | 'check'; round: Round } | null

export default function DecimalsChapter({ onComplete, childName }: Props) {
  const { phase, startPractice } = useChapterPhase()
  const { speak } = useMiloSpeaker()
  const ada = useAdaptive('decimals')
  const seen = useRef<Set<string>>(new Set())
  const [roundIdx, setRoundIdx] = useState(0)
  const [round, setRound] = useState<Round>(() => makeDistinct(() => makeRound(1), seen.current, x => `${x.type}:${x.t ?? ''}:${x.n ?? ''}:${x.a ?? ''}:${x.b ?? ''}`))
  const [selected, setSelected] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [correct, setCorrect] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [wrongRun, setWrongRun] = useState(0)
  const [reMed, setReMed] = useState<ReMed>(null)
  const answerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (phase !== 'practice') return
    const r = makeDistinct(() => makeRound(ada.difficulty), seen.current, x => `${x.type}:${x.t ?? ''}:${x.n ?? ''}:${x.a ?? ''}:${x.b ?? ''}`)
    setRound(r); setSelected(null); setFeedback(null)
    speakAfterCurrent(roundIdx === 0 ? `Hi ${childName}! ${r.say}` : r.say)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIdx, phase])

  if (phase === 'lesson') return <DecimalsLesson childName={childName} onLessonComplete={startPractice} />

  function handleAnswer(choice: string) {
    if (selected !== null) return
    const ok = choice === round.answer
    setSelected(choice); setFeedback(ok ? 'correct' : 'wrong')
    const res = ada.record(ok)
    const newRun = ok ? 0 : wrongRun + 1
    setWrongRun(newRun)
    if (ok) { setCorrect(c => c + 1); speakAt(`Yes! ${ada.praise}`, answerRef.current) }
    else { setWrong(w => w + 1); speakAt(`It's ${round.answer}. ${ada.encouragement}`, answerRef.current) }
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
    ? feedback === 'correct' ? '🎉 Correct!' : `It's ${round.answer} — now you know.`
    : round.question

  return (
    <div style={S.page}>
      <SpeakingLock />
      <GameTopbar chapterName="Decimals" roundIdx={roundIdx} totalRounds={TOTAL_ROUNDS} />
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 8, background: 'rgba(0,0,0,0.08)', zIndex: 5 }}>
        <div style={{ height: '100%', width: `${(roundIdx / TOTAL_ROUNDS) * 100}%`, background: 'var(--garden-green)', borderRadius: '0 4px 4px 0', transition: 'width 0.4s ease' }} />
      </div>
      <div style={S.topRow}>
        <DifficultyBadge difficulty={ada.difficulty} isOnFire={ada.isOnFire} />
        {ada.shouldHint && <span style={S.hintTag}>💡 Count the parts!</span>}
      </div>
      <div style={S.miloRow}>
        <img src="/assets/characters/milo-happy.png" alt="Milo" style={S.milo}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        <div className="milo-bubble" style={{ flex: 1, fontSize: 22 }}>{bubbleText}</div>
      </div>

      <div style={S.visual}>
        {round.type === 'tenthName' && <FractionBar num={round.t!} den={10} width={300} />}
        {round.type === 'hundName' && <HundredGrid n={round.n!} />}
        {round.type === 'compare' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <FractionBar num={Math.round(round.a! * 10)} den={10} width={260} />
            <FractionBar num={Math.round(round.b! * 10)} den={10} shade="var(--sky-blue)" width={260} />
          </div>
        )}
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
                minWidth: 100, height: 84, padding: '0 14px',
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
          {reMed.round.type === 'tenthName' ? <TenthsWatch tenths={reMed.round.t!} intro="Let's count the tenths." outro="Now you try!" onDone={() => setReMed({ ...reMed, phase: 'check' })} />
            : reMed.round.type === 'hundName' ? <HundredthsWatch n={reMed.round.n!} intro="Let's count the hundredths." outro="Now you try!" onDone={() => setReMed({ ...reMed, phase: 'check' })} />
            : <CompareDecWatch a={reMed.round.a!} b={reMed.round.b!} intro="Let's compare the bars." outro="Now you try!" onDone={() => setReMed({ ...reMed, phase: 'check' })} />}
        </ReMedOverlay>
      )}
      {reMed?.phase === 'check' && (
        <ReMedOverlay>
          <DecPick prompt={reMed.round.question} options={reMed.round.choices} answer={reMed.round.answer} intro="Now you pick the answer!" outro="Yes! Well done!" onDone={finishReMed} />
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
