'use client'
/**
 * BigNumbersChapter (9–11) — place value to thousands. Three question types:
 * "how many <place>?", "what is the value of the <digit>?", and "what number is
 * this?" (read a place-value chart back to a numeral). Adaptive range, 10 rounds,
 * after-3-wrong re-teach (build the number, then check). See docs/curriculum-9-11.md.
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
import BigNumbersLesson, { bigWords, placeColumns, PlaceChart, BuildNumber, PickBig } from '../lessons/BigNumbersLesson'

interface Props { onComplete: (c: number, w: number, mastered?: boolean) => void; childName: string }

const TOTAL_ROUNDS = 10
const rint = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]
const shuffle = <T,>(a: T[]) => a.slice().sort(() => Math.random() - 0.5)

type QType = 'place' | 'value' | 'whole'
interface Round { n: number; qType: QType; question: string; say: string; answer: number; choices: number[]; showNumeral: boolean; highlight?: number }

function pickN(d: 1 | 2 | 3): number {
  return d === 1 ? rint(100, 999) : d === 2 ? rint(1000, 4999) : rint(1000, 9999)
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
// Same digit at different places — the classic place-value confusion (2, 20, 200…).
function valueOptions(digit: number, answer: number): number[] {
  const all = [digit, digit * 10, digit * 100, digit * 1000].filter(v => v !== answer)
  const opts = new Set<number>([answer])
  for (const v of shuffle(all)) { if (opts.size >= 3) break; opts.add(v) }
  let bump = 1
  while (opts.size < 3) { opts.add(answer + bump * 10); bump++ }
  return shuffle([...opts])
}
function nearNumbers(n: number): number[] {
  const cols = placeColumns(n)
  const swapped: number[] = []
  // swap adjacent place digits to make tempting look-alikes
  const digs = cols.map(c => c.digit)
  for (let i = 0; i < digs.length - 1; i++) {
    const d = digs.slice(); [d[i], d[i + 1]] = [d[i + 1], d[i]]
    swapped.push(d.reduce((acc, x) => acc * 10 + x, 0))
  }
  const cands = shuffle([...swapped, n + 1, n - 1, n + 10, n - 10, n + 100, n - 100])
  const opts = new Set<number>([n])
  for (const c of cands) { if (opts.size >= 3) break; if (c >= 100 && c <= 9999 && c !== n) opts.add(c) }
  while (opts.size < 3) { const r = pickN(3); if (r !== n) opts.add(r) }
  return shuffle([...opts])
}
function makeRound(d: 1 | 2 | 3): Round {
  const n = pickN(d)
  const cols = placeColumns(n)
  const pool: QType[] = d === 1 ? ['place', 'whole', 'value']
    : d === 2 ? ['place', 'value', 'whole', 'whole']
    : ['place', 'value', 'value', 'whole', 'whole']
  const qType = pick(pool)
  if (qType === 'place') {
    const c = pick(cols)
    return { n, qType, question: `How many ${c.plural}?`, say: `How many ${c.plural} in ${bigWords(n)}?`, answer: c.digit, choices: nearDigits(c.digit), showNumeral: true }
  }
  if (qType === 'value') {
    // pick a place whose digit is non-zero and unique, so "the 7" is unambiguous
    const counts: Record<number, number> = {}
    cols.forEach(c => { counts[c.digit] = (counts[c.digit] ?? 0) + 1 })
    const good = cols.filter(c => c.digit !== 0 && counts[c.digit] === 1)
    const c = pick(good.length ? good : cols.filter(x => x.digit !== 0).length ? cols.filter(x => x.digit !== 0) : cols)
    return { n, qType, question: `What is the value of the ${c.digit}?`, say: `In ${bigWords(n)}, what is the value of the ${c.digit}?`, answer: c.value, choices: valueOptions(c.digit, c.value), showNumeral: true, highlight: cols.indexOf(c) }
  }
  return { n, qType, question: 'What number is this?', say: 'What number is this? Read the places.', answer: n, choices: nearNumbers(n), showNumeral: false }
}

type ReMed = { phase: 'reteach' | 'check'; n: number; choices: number[] } | null

export default function BigNumbersChapter({ onComplete, childName }: Props) {
  const { phase, startPractice } = useChapterPhase()
  const { speak } = useMiloSpeaker()
  const ada = useAdaptive('bigNumbers')
  const [roundIdx, setRoundIdx] = useState(0)
  const seen = useRef<Set<string>>(new Set())   // question signatures asked this session
  const [round, setRound] = useState<Round>(() => makeDistinct(() => makeRound(1), seen.current, r => `${r.n}|${r.qType}|${r.answer}`))
  const [selected, setSelected] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [correct, setCorrect] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [wrongRun, setWrongRun] = useState(0)
  const [reMed, setReMed] = useState<ReMed>(null)
  const answerRef = useRef<HTMLElement | null>(null)

  // Build the round once per roundIdx (current difficulty read then); phase-guarded
  // so the prompt isn't spoken over the lesson.
  useEffect(() => {
    if (phase !== 'practice') return
    const r = makeDistinct(() => makeRound(ada.difficulty), seen.current, r => `${r.n}|${r.qType}|${r.answer}`)
    setRound(r); setSelected(null); setFeedback(null)
    speakAfterCurrent(roundIdx === 0 ? `Hi ${childName}! ${r.say}` : r.say)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIdx, phase])

  if (phase === 'lesson') return <BigNumbersLesson childName={childName} onLessonComplete={startPractice} />

  function handleAnswer(choice: number) {
    if (selected !== null) return
    const ok = choice === round.answer
    setSelected(choice); setFeedback(ok ? 'correct' : 'wrong')
    const res = ada.record(ok)
    const newRun = ok ? 0 : wrongRun + 1
    setWrongRun(newRun)
    if (ok) { setCorrect(c => c + 1); speakAt(`Yes! ${ada.praise}`, answerRef.current) }
    else { setWrong(w => w + 1); speakAt(`The answer is ${round.qType === 'whole' ? bigWords(round.answer) : round.answer}. ${ada.encouragement}`, answerRef.current) }
    afterSpeech(() => {
      setFeedback(null)
      if (!ok && newRun >= 3) { setReMed({ phase: 'reteach', n: round.n, choices: nearNumbers(round.n) }); return }
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
    ? feedback === 'correct' ? '🎉 Correct!' : `It's ${round.qType === 'whole' ? bigWords(round.answer) : round.answer} — now you know.`
    : round.question

  return (
    <div style={S.page}>
      <SpeakingLock />
      <GameTopbar chapterName="Big Numbers" roundIdx={roundIdx} totalRounds={TOTAL_ROUNDS} />
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 8, background: 'rgba(0,0,0,0.08)', zIndex: 5 }}>
        <div style={{ height: '100%', width: `${(roundIdx / TOTAL_ROUNDS) * 100}%`, background: 'var(--garden-green)', borderRadius: '0 4px 4px 0', transition: 'width 0.4s ease' }} />
      </div>
      <div style={S.topRow}>
        <DifficultyBadge difficulty={ada.difficulty} isOnFire={ada.isOnFire} />
        {ada.shouldHint && <span style={S.hintTag}>💡 Look at the places!</span>}
      </div>
      <div style={S.miloRow}>
        <img src="/assets/characters/milo-happy.png" alt="Milo" style={S.milo}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        <div className="milo-bubble" style={{ flex: 1, fontSize: 22 }}>{bubbleText}</div>
      </div>

      <div style={S.visual}>
        {round.showNumeral && (
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 48, lineHeight: 1, color: 'var(--milo-orange)', textShadow: '0 4px 0 rgba(61,37,22,.12)' }}>{round.n.toLocaleString('en-US')}</div>
        )}
        <PlaceChart n={round.n} highlight={round.highlight} />
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
                minWidth: 100, height: 92, padding: '0 12px',
                background: (selected !== null && isOk) ? 'var(--garden-green-soft)' : 'var(--paper)',
                border: `4px solid ${(selected !== null && isOk) ? 'var(--garden-green)' : isSel ? 'var(--ink-muted)' : 'var(--outline)'}`,
                borderRadius: 24, boxShadow: `0 6px 0 ${(selected !== null && isOk) ? 'var(--garden-green-deep)' : '#c8ac79'}`,
                fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 36, color: 'var(--ink)',
                cursor: selected !== null ? 'default' : 'pointer',
                transform: ((selected !== null && isOk) || isSel) ? 'scale(1.08) translateY(-4px)' : 'scale(1)',
                transition: 'transform 160ms cubic-bezier(.34,1.56,.64,1),background 160ms ease',
              }}>{ch.toLocaleString('en-US')}</button>
          )
        })}
      </div>

      {feedback && <div style={{ ...S.flash, background: feedback === 'correct' ? 'var(--garden-green)' : 'var(--milo-orange)' }}>
        {feedback === 'correct' ? '✅ Yes!' : `It's ${round.qType === 'whole' ? round.answer.toLocaleString('en-US') : round.answer} — now you know! 🙂`}
      </div>}
      <p style={S.roundLabel}>Round {Math.min(roundIdx + 1, TOTAL_ROUNDS)} of {TOTAL_ROUNDS}</p>

      {reMed?.phase === 'reteach' && (
        <ReMedOverlay>
          <BuildNumber n={reMed.n}
            intro={`Let's build ${bigWords(reMed.n)} together, place by place.`}
            outro="Now you try!"
            onDone={() => setReMed({ ...reMed, phase: 'check' })} />
        </ReMedOverlay>
      )}
      {reMed?.phase === 'check' && (
        <ReMedOverlay>
          <PickBig target={reMed.n} choices={reMed.choices}
            intro="Now you find it!" outro={`Yes! ${bigWords(reMed.n)}!`}
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
  visual: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,.65)', border: '4px solid var(--outline)', borderRadius: 24, padding: '16px 18px', boxShadow: '0 6px 0 rgba(61,37,22,.08)', minHeight: 120, justifyContent: 'center', maxWidth: '100%', overflowX: 'auto' },
  replayWrap: { background: 'none', border: 'none', padding: 0, cursor: 'pointer' },
  replay: { display: 'inline-block', background: 'var(--paper)', border: '3px solid var(--outline)', borderRadius: 999, padding: '8px 18px', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: 'var(--ink)', boxShadow: '0 3px 0 rgba(61,37,22,.12)' },
  choicesRow: { display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', animation: 'slide-up 300ms ease both' },
  flash: { position: 'fixed', top: '38%', left: '50%', transform: 'translate(-50%,-50%)', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 38, padding: '18px 44px', borderRadius: 28, border: '4px solid var(--outline)', boxShadow: '0 8px 0 rgba(61,37,22,.2)', zIndex: 50, textAlign: 'center', animation: 'modal-in 280ms cubic-bezier(.34,1.56,.64,1) both' },
  roundLabel: { fontFamily: 'var(--font-body)', fontSize: 'var(--t-label)', color: 'var(--ink-muted)', margin: 0 },
}
