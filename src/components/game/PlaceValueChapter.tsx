'use client'
/**
 * PlaceValueChapter (6–8) — tens & ones. Three question types: "how many tens?",
 * "how many ones?", and "what number is this?" (read blocks back to a numeral).
 * Adaptive range, 10 rounds, after-3-wrong re-teach (build the number, then check).
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
import { ReadNumber, NumberChart } from '../lessons/Numbers100Lesson'
import PlaceValueLesson, { AskChoice, NumberBlocks } from '../lessons/PlaceValueLesson'

interface Props { onComplete: (c: number, w: number) => void; childName: string }

const TOTAL_ROUNDS = 10
const rint = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))
const shuffle = <T,>(a: T[]) => a.slice().sort(() => Math.random() - 0.5)

type QType = 'tens' | 'ones' | 'whole'
interface Round { n: number; qType: QType; question: string; say: string; answer: number; choices: number[]; showNumeral: boolean }

function pickN(d: 1 | 2 | 3): number {
  return d === 1 ? rint(11, 29) : d === 2 ? rint(20, 69) : rint(30, 99)
}
function nearDigits(answer: number): number[] {
  const opts = new Set<number>([answer]); let delta = 1
  while (opts.size < 3) {
    if (answer - delta >= 0) opts.add(answer - delta)
    if (opts.size < 3 && answer + delta <= 9) opts.add(answer + delta)
    delta++
  }
  return shuffle([...opts])
}
function nearNumbers(n: number): number[] {
  const opts = new Set<number>([n]); const t = Math.floor(n / 10), o = n % 10
  const cands = [o * 10 + t, n + 1, n - 1, n + 10, n - 10]
  for (const c of shuffle(cands)) { if (opts.size >= 3) break; if (c >= 1 && c <= 99 && c !== n) opts.add(c) }
  while (opts.size < 3) { const r = rint(10, 99); if (r !== n) opts.add(r) }
  return shuffle([...opts])
}
function makeRound(d: 1 | 2 | 3): Round {
  const n = pickN(d)
  const pool: QType[] = d === 1 ? ['tens', 'ones', 'whole']
    : d === 2 ? ['tens', 'ones', 'whole', 'whole']
    : ['tens', 'ones', 'whole', 'whole', 'whole']
  const qType = pool[rint(0, pool.length - 1)]
  if (qType === 'tens')
    return { n, qType, question: 'How many tens?', say: `How many tens in ${numberToWords(n)}?`, answer: Math.floor(n / 10), choices: nearDigits(Math.floor(n / 10)), showNumeral: true }
  if (qType === 'ones')
    return { n, qType, question: 'How many ones?', say: `How many ones in ${numberToWords(n)}?`, answer: n % 10, choices: nearDigits(n % 10), showNumeral: true }
  return { n, qType, question: 'What number is this?', say: 'What number is this? Count the tens and the ones.', answer: n, choices: nearNumbers(n), showNumeral: false }
}

type ReMed = { phase: 'reteach' | 'check'; n: number; choices: number[] } | null

export default function PlaceValueChapter({ onComplete, childName }: Props) {
  const { phase, startPractice } = useChapterPhase()
  const { speak } = useMiloSpeaker()
  const ada = useAdaptive('placeValue')
  const [roundIdx, setRoundIdx] = useState(0)
  const [round, setRound] = useState<Round>(() => makeRound(1))
  const [selected, setSelected] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [correct, setCorrect] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [wrongRun, setWrongRun] = useState(0)
  const [reMed, setReMed] = useState<ReMed>(null)
  const [showChart, setShowChart] = useState(false)
  const answerRef = useRef<HTMLElement | null>(null)

  function loadRound(idx: number) {
    const r = makeRound(ada.difficulty)
    setRound(r); setSelected(null); setFeedback(null)
    speakAfterCurrent(idx === 0 ? `Hi ${childName}! ${r.say}` : r.say)
  }

  // Only run the round loop in the practice phase (not during the lesson).
  useEffect(() => { if (phase === 'practice') loadRound(roundIdx) }, [roundIdx, ada.difficulty, phase]) // eslint-disable-line

  function handleAnswer(choice: number) {
    if (selected !== null) return
    const ok = choice === round.answer
    setSelected(choice); setFeedback(ok ? 'correct' : 'wrong')
    ada.record(ok)
    const newRun = ok ? 0 : wrongRun + 1
    setWrongRun(newRun)
    if (ok) { setCorrect(c => c + 1); speakAt(`Yes! ${ada.praise}`, answerRef.current) }
    else { setWrong(w => w + 1); speakAt(`The answer is ${numberToWords(round.answer)}. ${ada.encouragement}`, answerRef.current) }
    afterSpeech(() => {
      setFeedback(null)
      if (!ok && newRun >= 3) { setReMed({ phase: 'reteach', n: round.n, choices: nearNumbers(round.n) }); return }
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

  if (phase === 'lesson') return <PlaceValueLesson childName={childName} onLessonComplete={startPractice} />

  const bubbleText = selected !== null
    ? feedback === 'correct' ? '🎉 Correct!' : `It was ${numberToWords(round.answer)}.`
    : round.question

  return (
    <div style={S.page}>
      <SpeakingLock />
      <GameTopbar chapterName="Tens & Ones" roundIdx={roundIdx} totalRounds={TOTAL_ROUNDS} />
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 8, background: 'rgba(0,0,0,0.08)', zIndex: 5 }}>
        <div style={{ height: '100%', width: `${(roundIdx / TOTAL_ROUNDS) * 100}%`, background: 'var(--garden-green)', borderRadius: '0 4px 4px 0', transition: 'width 0.4s ease' }} />
      </div>
      <div style={S.topRow}>
        <DifficultyBadge difficulty={ada.difficulty} isOnFire={ada.isOnFire} />
        {ada.shouldHint && <span style={S.hintTag}>💡 Count the blocks!</span>}
      </div>
      <div style={S.miloRow}>
        <img src="/assets/characters/milo-happy.png" alt="Milo" style={S.milo}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        <div className="milo-bubble" style={{ flex: 1, fontSize: 22 }}>{bubbleText}</div>
      </div>

      {/* Visual: numeral + blocks for tens/ones; blocks only for "what number?" */}
      <div style={S.visual}>
        {round.showNumeral && (
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 56, lineHeight: 1, color: 'var(--milo-orange)', textShadow: '0 4px 0 rgba(61,37,22,.12)' }}>{round.n}</div>
        )}
        <NumberBlocks n={round.n} />
      </div>

      <button onClick={() => speak(round.say)} style={S.replayWrap}>
        <span style={S.replay}>🔊 Say it again</span>
      </button>
      <button onClick={() => setShowChart(true)} style={S.replayWrap}>
        <span style={S.replay}>🔢 Number chart</span>
      </button>

      <div style={S.choicesRow}>
        {round.choices.map(ch => {
          const isSel = selected === ch, isOk = ch === round.answer
          return (
            <button key={ch} disabled={selected !== null} onClick={() => handleAnswer(ch)}
              ref={isOk ? (el) => { answerRef.current = el } : undefined} style={{
                width: 96, height: 96,
                background: isSel ? (isOk ? 'var(--garden-green-soft)' : 'var(--apple-red-soft)') : 'var(--paper)',
                border: `4px solid ${isSel ? (isOk ? 'var(--garden-green)' : 'var(--apple-red)') : 'var(--outline)'}`,
                borderRadius: 24, boxShadow: isSel ? `0 6px 0 ${isOk ? 'var(--garden-green-deep)' : 'var(--apple-red-deep)'}` : '0 6px 0 #c8ac79',
                fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 42, color: 'var(--ink)',
                cursor: selected !== null ? 'default' : 'pointer',
                transform: isSel ? 'scale(1.1) translateY(-4px)' : 'scale(1)',
                transition: 'transform 160ms cubic-bezier(.34,1.56,.64,1),background 160ms ease',
              }}>{ch}</button>
          )
        })}
      </div>

      {feedback && <div style={{ ...S.flash, background: feedback === 'correct' ? 'var(--garden-green)' : 'var(--apple-red)' }}>
        {feedback === 'correct' ? '✅ Yes!' : `It was ${round.answer}`}
      </div>}
      <p style={S.roundLabel}>Round {Math.min(roundIdx + 1, TOTAL_ROUNDS)} of {TOTAL_ROUNDS}</p>

      {reMed?.phase === 'reteach' && (
        <ReMedOverlay>
          <ReadNumber n={reMed.n}
            intro={`Let's look at ${numberToWords(reMed.n)} together.`}
            outro="Now you try!"
            onDone={() => setReMed({ ...reMed, phase: 'check' })} />
        </ReMedOverlay>
      )}
      {reMed?.phase === 'check' && (
        <ReMedOverlay>
          <AskChoice promptText="What number is this?" answer={reMed.n} choices={reMed.choices}
            visual={<NumberBlocks n={reMed.n} />}
            intro="Now you count! What number is this?"
            outro={`Yes! ${numberToWords(reMed.n)}!`}
            onDone={finishReMed} />
        </ReMedOverlay>
      )}

      {showChart && typeof document !== 'undefined' && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 250, background: 'rgba(61,37,22,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--paper)', border: '4px solid var(--outline)', borderRadius: 24, padding: 'clamp(12px,2vmin,20px)', width: 'fit-content', maxWidth: '96vw', maxHeight: '96dvh', overflowY: 'auto', boxShadow: '0 8px 0 rgba(61,37,22,.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, margin: 0, color: 'var(--ink)' }}>Number Chart 🔢</h3>
              <button onClick={() => setShowChart(false)} style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid var(--outline)', background: 'var(--paper)', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 20, cursor: 'pointer' }}>×</button>
            </div>
            <NumberChart />
          </div>
        </div>,
        document.body,
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
  visual: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,.65)', border: '4px solid var(--outline)', borderRadius: 24, padding: '16px 22px', boxShadow: '0 6px 0 rgba(61,37,22,.08)', minHeight: 120, justifyContent: 'center' },
  replayWrap: { background: 'none', border: 'none', padding: 0, cursor: 'pointer' },
  replay: { display: 'inline-block', background: 'var(--paper)', border: '3px solid var(--outline)', borderRadius: 999, padding: '8px 18px', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: 'var(--ink)', boxShadow: '0 3px 0 rgba(61,37,22,.12)' },
  choicesRow: { display: 'flex', gap: 18, justifyContent: 'center', flexWrap: 'wrap', animation: 'slide-up 300ms ease both' },
  flash: { position: 'fixed', top: '38%', left: '50%', transform: 'translate(-50%,-50%)', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 38, padding: '18px 44px', borderRadius: 28, border: '4px solid var(--outline)', boxShadow: '0 8px 0 rgba(61,37,22,.2)', zIndex: 50, textAlign: 'center', animation: 'modal-in 280ms cubic-bezier(.34,1.56,.64,1) both' },
  roundLabel: { fontFamily: 'var(--font-body)', fontSize: 'var(--t-label)', color: 'var(--ink-muted)', margin: 0 },
}
