'use client'
/**
 * FactorsChapter (9–11) — even/odd, multiples, factors, prime/composite.
 * Adaptive: L1 even-odd + simple multiples, L2 adds factors + primes, L3 harder.
 * 10 rounds, after-3-wrong re-teach (the matching worked example, then check).
 * See docs/curriculum-9-11.md.
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
import FactorsLesson, { EvenOddWatch, MultiplesWatch, FactorWatch, PrimeWatch, Pick, isPrime, factorsOf } from '../lessons/FactorsLesson'

interface Props { onComplete: (c: number, w: number) => void; childName: string }

const TOTAL_ROUNDS = 10
const rint = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]
const shuffle = <T,>(a: T[]) => a.slice().sort(() => Math.random() - 0.5)

type QType = 'evenOdd' | 'multiple' | 'factor' | 'prime'
interface Round { type: QType; n: number; base?: number; question: string; say: string; answer: string; choices: string[] }

function multipleChoices(base: number): { answer: string; choices: string[] } {
  const correct = base * rint(2, 9)
  const opts = new Set<string>([String(correct)])
  for (const c of shuffle([correct + 1, correct - 1, correct + 2, correct - 2, correct + 3])) {
    if (opts.size >= 3) break
    if (c > 0 && c % base !== 0) opts.add(String(c))
  }
  let b = 4; while (opts.size < 3) { const c = correct + b; if (c % base !== 0) opts.add(String(c)); b++ }
  return { answer: String(correct), choices: shuffle([...opts]) }
}
function factorRound(d: 1 | 2 | 3): { n: number; answer: string; choices: string[] } {
  const n = pick(d <= 2 ? [6, 8, 9, 10, 12, 14, 15, 16] : [12, 16, 18, 20, 24, 28, 30, 36])
  const proper = factorsOf(n).filter(f => f !== 1 && f !== n)
  const correct = pick(proper.length ? proper : factorsOf(n))
  const opts = new Set<string>([String(correct)])
  for (const c of shuffle([correct + 1, correct - 1, correct + 2, correct + 3, n - 1])) {
    if (opts.size >= 3) break
    if (c > 1 && n % c !== 0) opts.add(String(c))
  }
  let b = 2; while (opts.size < 3) { const c = correct + b; if (c > 1 && n % c !== 0) opts.add(String(c)); b++ }
  return { n, answer: String(correct), choices: shuffle([...opts]) }
}
function multUpTo(base: number) { return Math.min(base * 5, 30) }

function makeRound(d: 1 | 2 | 3): Round {
  const pool: QType[] = d === 1 ? ['evenOdd', 'evenOdd', 'multiple'] : d === 2 ? ['evenOdd', 'multiple', 'factor', 'prime'] : ['multiple', 'factor', 'prime', 'prime']
  const t = pick(pool)
  if (t === 'evenOdd') {
    const n = rint(2, d === 1 ? 20 : 40)
    return { type: t, n, question: `Is ${n} even or odd?`, say: `Is ${n} even or odd?`, answer: n % 2 === 0 ? 'Even' : 'Odd', choices: ['Even', 'Odd'] }
  }
  if (t === 'multiple') {
    const base = pick(d === 1 ? [2, 5] : [2, 3, 4, 5, 10])
    const { answer, choices } = multipleChoices(base)
    return { type: t, n: 0, base, question: `Which is a multiple of ${base}?`, say: `Which number is a multiple of ${base}?`, answer, choices }
  }
  if (t === 'factor') {
    const { n, answer, choices } = factorRound(d)
    return { type: t, n, question: `Which is a factor of ${n}?`, say: `Which number is a factor of ${n}?`, answer, choices }
  }
  const n = rint(2, d === 2 ? 20 : 40)
  return { type: t, n, question: `Is ${n} prime?`, say: `Is ${n} prime?`, answer: isPrime(n) ? 'Yes' : 'No', choices: ['Yes', 'No'] }
}

type ReMed = { phase: 'reteach' | 'check'; round: Round } | null

export default function FactorsChapter({ onComplete, childName }: Props) {
  const { phase, startPractice } = useChapterPhase()
  const { speak } = useMiloSpeaker()
  const ada = useAdaptive('factorsMultiples')
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

  if (phase === 'lesson') return <FactorsLesson childName={childName} onLessonComplete={startPractice} />

  function handleAnswer(choice: string) {
    if (selected !== null) return
    const ok = choice === round.answer
    setSelected(choice); setFeedback(ok ? 'correct' : 'wrong')
    ada.record(ok)
    const newRun = ok ? 0 : wrongRun + 1
    setWrongRun(newRun)
    if (ok) { setCorrect(c => c + 1); speakAt(`Yes! ${ada.praise}`, answerRef.current) }
    else { setWrong(w => w + 1); speakAt(`It's ${round.answer}. ${ada.encouragement}`, answerRef.current) }
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
      <GameTopbar chapterName="Factors & Primes" roundIdx={roundIdx} totalRounds={TOTAL_ROUNDS} />
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 8, background: 'rgba(0,0,0,0.08)', zIndex: 5 }}>
        <div style={{ height: '100%', width: `${(roundIdx / TOTAL_ROUNDS) * 100}%`, background: 'var(--garden-green)', borderRadius: '0 4px 4px 0', transition: 'width 0.4s ease' }} />
      </div>
      <div style={S.topRow}>
        <DifficultyBadge difficulty={ada.difficulty} isOnFire={ada.isOnFire} />
        {ada.shouldHint && <span style={S.hintTag}>💡 Think it through!</span>}
      </div>
      <div style={S.miloRow}>
        <img src="/assets/characters/milo-happy.png" alt="Milo" style={S.milo}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        <div className="milo-bubble" style={{ flex: 1, fontSize: 22 }}>{bubbleText}</div>
      </div>

      <div style={S.visual}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: round.type === 'evenOdd' || round.type === 'prime' ? 64 : 30, lineHeight: 1.1, color: 'var(--milo-orange)', textShadow: '0 4px 0 rgba(61,37,22,.12)', textAlign: 'center' }}>
          {round.type === 'multiple' ? `Multiples of ${round.base}?` : round.type === 'factor' ? `Factors of ${round.n}?` : round.n}
        </div>
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
                minWidth: 100, height: 88, padding: '0 14px',
                background: (selected !== null && isOk) ? 'var(--garden-green-soft)' : 'var(--paper)',
                border: `4px solid ${(selected !== null && isOk) ? 'var(--garden-green)' : isSel ? 'var(--ink-muted)' : 'var(--outline)'}`,
                borderRadius: 24, boxShadow: `0 6px 0 ${(selected !== null && isOk) ? 'var(--garden-green-deep)' : '#c8ac79'}`,
                fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 30, color: 'var(--ink)',
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
          {reMed.round.type === 'evenOdd' ? <EvenOddWatch n={reMed.round.n} intro={`Let's check if ${reMed.round.n} is even or odd.`} outro="Now you try!" onDone={() => setReMed({ ...reMed, phase: 'check' })} />
            : reMed.round.type === 'multiple' ? <MultiplesWatch base={reMed.round.base!} upTo={multUpTo(reMed.round.base!)} intro={`Let's list the multiples of ${reMed.round.base}.`} outro="Now you try!" onDone={() => setReMed({ ...reMed, phase: 'check' })} />
            : reMed.round.type === 'factor' ? <FactorWatch n={reMed.round.n} intro={`Let's find the factors of ${reMed.round.n}.`} outro="Now you try!" onDone={() => setReMed({ ...reMed, phase: 'check' })} />
            : <PrimeWatch n={reMed.round.n} intro={`Let's check if ${reMed.round.n} is prime.`} outro="Now you try!" onDone={() => setReMed({ ...reMed, phase: 'check' })} />}
        </ReMedOverlay>
      )}
      {reMed?.phase === 'check' && (
        <ReMedOverlay>
          <Pick prompt={reMed.round.question} options={reMed.round.choices} answer={reMed.round.answer} intro="Now you pick the answer!" outro="Yes! Well done!" onDone={finishReMed} />
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
  visual: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,.65)', border: '4px solid var(--outline)', borderRadius: 24, padding: '20px 26px', boxShadow: '0 6px 0 rgba(61,37,22,.08)', minHeight: 110, justifyContent: 'center' },
  replayWrap: { background: 'none', border: 'none', padding: 0, cursor: 'pointer' },
  replay: { display: 'inline-block', background: 'var(--paper)', border: '3px solid var(--outline)', borderRadius: 999, padding: '8px 18px', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: 'var(--ink)', boxShadow: '0 3px 0 rgba(61,37,22,.12)' },
  choicesRow: { display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', animation: 'slide-up 300ms ease both' },
  flash: { position: 'fixed', top: '38%', left: '50%', transform: 'translate(-50%,-50%)', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 38, padding: '18px 44px', borderRadius: 28, border: '4px solid var(--outline)', boxShadow: '0 8px 0 rgba(61,37,22,.2)', zIndex: 50, textAlign: 'center', animation: 'modal-in 280ms cubic-bezier(.34,1.56,.64,1) both' },
  roundLabel: { fontFamily: 'var(--font-body)', fontSize: 'var(--t-label)', color: 'var(--ink-muted)', margin: 0 },
}
