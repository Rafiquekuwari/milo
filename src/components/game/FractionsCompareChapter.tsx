'use client'
/**
 * FractionsCompareChapter (9–11) — name a fraction, compare same-denominator
 * fractions, and add/subtract with the same denominator. Adaptive: L1 name +
 * compare, L2 adds addition, L3 adds subtraction + bigger denominators. 10 rounds,
 * after-3-wrong re-teach (the matching worked example, then check).
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
import FractionsCompareLesson, { FractionBar, FractionWatch, CompareWatch, FracOpWatch, FracPick } from '../lessons/FractionsCompareLesson'

interface Props { onComplete: (c: number, w: number) => void; childName: string }

const TOTAL_ROUNDS = 10
const rint = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]
const shuffle = <T,>(a: T[]) => a.slice().sort(() => Math.random() - 0.5)

type QType = 'name' | 'compare' | 'op'
interface Round {
  type: QType; question: string; say: string; answer: string; choices: string[]
  num?: number; den?: number               // name
  a?: [number, number]; b?: [number, number] // compare
  op?: '+' | '-'; n1?: number; n2?: number; opDen?: number // op
}

function nameChoices(num: number, den: number): string[] {
  const correct = `${num}/${den}`
  const set = new Set<string>([correct])
  for (const c of [`${den}/${num}`, `${num + 1 <= den ? num + 1 : num - 1}/${den}`, `${num}/${den + 1}`, `${num - 1 >= 1 ? num - 1 : num + 1}/${den}`]) {
    if (set.size >= 3) break
    if (c !== correct) set.add(c)
  }
  return shuffle([...set])
}
function opChoices(res: number, den: number): string[] {
  const set = new Set<string>([`${res}/${den}`])
  for (const r of shuffle([res + 1, res - 1, res + 2, res - 2])) { if (set.size >= 3) break; if (r >= 1 && r <= den) set.add(`${r}/${den}`) }
  if (set.size < 3) set.add(`${res}/${den * 2}`)
  let r = 1; while (set.size < 3 && r <= den) { if (res + r <= den) set.add(`${res + r}/${den}`); r++ }
  while (set.size < 3) set.add(`${Math.max(1, res - set.size)}/${den}`)
  return shuffle([...set])
}
function makeRound(d: 1 | 2 | 3): Round {
  const pool: QType[] = d === 1 ? ['name', 'compare'] : d === 2 ? ['name', 'compare', 'op'] : ['compare', 'op', 'op']
  const t = pick(pool)
  if (t === 'name') {
    const den = pick(d === 1 ? [2, 3, 4] : [3, 4, 5, 6, 8])
    const num = rint(1, den - 1)
    return { type: t, num, den, question: 'What fraction is shaded?', say: 'What fraction is shaded?', answer: `${num}/${den}`, choices: nameChoices(num, den) }
  }
  if (t === 'compare') {
    const den = pick([4, 5, 6, 8])
    let na = rint(1, den - 1), nb = rint(1, den - 1)
    while (nb === na) nb = rint(1, den - 1)
    const answer = na > nb ? `${na}/${den}` : `${nb}/${den}`
    return { type: t, a: [na, den], b: [nb, den], question: 'Which is bigger?', say: 'Which fraction is bigger?', answer, choices: shuffle([`${na}/${den}`, `${nb}/${den}`]) }
  }
  const den = pick([4, 5, 6, 8])
  const add = d < 3 ? true : Math.random() < 0.55
  if (add) {
    const n1 = rint(1, den - 2), n2 = rint(1, den - 1 - n1), res = n1 + n2
    return { type: t, op: '+', n1, n2, opDen: den, question: `${n1}/${den} + ${n2}/${den}`, say: `What is ${n1} over ${den} plus ${n2} over ${den}?`, answer: `${res}/${den}`, choices: opChoices(res, den) }
  }
  const n1 = rint(2, den - 1), n2 = rint(1, n1 - 1), res = n1 - n2
  return { type: t, op: '-', n1, n2, opDen: den, question: `${n1}/${den} - ${n2}/${den}`, say: `What is ${n1} over ${den} minus ${n2} over ${den}?`, answer: `${res}/${den}`, choices: opChoices(res, den) }
}

type ReMed = { phase: 'reteach' | 'check'; round: Round } | null

export default function FractionsCompareChapter({ onComplete, childName }: Props) {
  const { phase, startPractice } = useChapterPhase()
  const { speak } = useMiloSpeaker()
  const ada = useAdaptive('fractionsCompare')
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

  if (phase === 'lesson') return <FractionsCompareLesson childName={childName} onLessonComplete={startPractice} />

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
      <GameTopbar chapterName="Fractions" roundIdx={roundIdx} totalRounds={TOTAL_ROUNDS} />
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 8, background: 'rgba(0,0,0,0.08)', zIndex: 5 }}>
        <div style={{ height: '100%', width: `${(roundIdx / TOTAL_ROUNDS) * 100}%`, background: 'var(--garden-green)', borderRadius: '0 4px 4px 0', transition: 'width 0.4s ease' }} />
      </div>
      <div style={S.topRow}>
        <DifficultyBadge difficulty={ada.difficulty} isOnFire={ada.isOnFire} />
        {ada.shouldHint && <span style={S.hintTag}>💡 Look at the bars!</span>}
      </div>
      <div style={S.miloRow}>
        <img src="/assets/characters/milo-happy.png" alt="Milo" style={S.milo}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        <div className="milo-bubble" style={{ flex: 1, fontSize: 22 }}>{bubbleText}</div>
      </div>

      <div style={S.visual}>
        {round.type === 'name' && <FractionBar num={round.num!} den={round.den!} />}
        {round.type === 'compare' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <FractionBar num={round.a![0]} den={round.a![1]} width={260} />
            <FractionBar num={round.b![0]} den={round.b![1]} shade="var(--sky-blue)" width={260} />
          </div>
        )}
        {round.type === 'op' && <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 40, color: 'var(--milo-orange)' }}>{round.question}</div>}
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
          {reMed.round.type === 'name' ? <FractionWatch num={reMed.round.num!} den={reMed.round.den!} intro={`Let's name the shaded fraction.`} outro="Now you try!" onDone={() => setReMed({ ...reMed, phase: 'check' })} />
            : reMed.round.type === 'compare' ? <CompareWatch a={reMed.round.a!} b={reMed.round.b!} intro="Let's compare the bars." outro="Now you try!" onDone={() => setReMed({ ...reMed, phase: 'check' })} />
            : <FracOpWatch op={reMed.round.op!} n1={reMed.round.n1!} n2={reMed.round.n2!} den={reMed.round.opDen!} intro="Let's work it out on the bar." outro="Now you try!" onDone={() => setReMed({ ...reMed, phase: 'check' })} />}
        </ReMedOverlay>
      )}
      {reMed?.phase === 'check' && (
        <ReMedOverlay>
          <FracPick prompt={reMed.round.question} options={reMed.round.choices} answer={reMed.round.answer} intro="Now you pick the answer!" outro="Yes! Well done!" onDone={finishReMed} />
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
