'use client'
/**
 * Numbers100Chapter (6–8) — number recognition up to 100. Milo names a number
 * (shown as a word + spoken); the child taps the matching numeral from 3 cards.
 * Adaptive range, 10 rounds, and an after-3-wrong re-teach that breaks the number
 * into tens + ones (reusing the lesson's ReadNumber / PickNumber).
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
import Numbers100Lesson, { ReadNumber, PickNumber, NumberChart } from '../lessons/Numbers100Lesson'

interface Props { onComplete: (c: number, w: number, mastered?: boolean) => void; childName: string }

const TOTAL_ROUNDS = 10
const rint = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))
const shuffle = <T,>(a: T[]) => a.slice().sort(() => Math.random() - 0.5)

// Range widens with difficulty: 1 → 10–20, 2 → 20–60, 3 → 50–100.
function pickTarget(difficulty: 1 | 2 | 3): number {
  if (difficulty === 1) return rint(10, 20)
  if (difficulty === 2) return rint(20, 60)
  return rint(50, 100)
}

// 3 numeral choices: target + two plausible distractors (near values, ten-swap,
// and — at higher difficulty — the digit-swapped number to make it tricky).
function buildChoices(target: number, difficulty: 1 | 2 | 3): number[] {
  const opts = new Set<number>([target])
  const t = Math.floor(target / 10), o = target % 10
  const cands = [target + 1, target - 1, target + 10, target - 10]
  if (difficulty >= 2 && target >= 10) { const sw = o * 10 + t; if (sw !== target) cands.unshift(sw) }
  for (const c of shuffle(cands)) { if (opts.size >= 3) break; if (c >= 1 && c <= 100 && c !== target) opts.add(c) }
  while (opts.size < 3) { const r = rint(1, 100); if (r !== target) opts.add(r) }
  return shuffle([...opts])
}

type ReMed = { phase: 'reteach' | 'check'; target: number; choices: number[] } | null

export default function Numbers100Chapter({ onComplete, childName }: Props) {
  const { phase, startPractice } = useChapterPhase()
  const { speak } = useMiloSpeaker()
  const ada = useAdaptive('numbersTo100')
  const [roundIdx, setRoundIdx] = useState(0)
  const [target, setTarget] = useState(10)
  const [choices, setChoices] = useState<number[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [correct, setCorrect] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [wrongRun, setWrongRun] = useState(0)
  const [reMed, setReMed] = useState<ReMed>(null)
  const [showChart, setShowChart] = useState(false)
  const answerRef = useRef<HTMLElement | null>(null)
  const seen = useRef<Set<string>>(new Set())   // target numbers already asked this session

  function loadRound(idx: number) {
    const tgt = makeDistinct(() => pickTarget(ada.difficulty), seen.current, t => String(t))
    setTarget(tgt); setChoices(buildChoices(tgt, ada.difficulty))
    setSelected(null); setFeedback(null)
    speakAfterCurrent(idx === 0
      ? `Hi ${childName}! Find the number I say. Find ${numberToWords(tgt)}!`
      : ada.shouldHint ? `Take your time. Find ${numberToWords(tgt)}.`
      : `Find ${numberToWords(tgt)}!`)
  }

  // Only run the round loop in the practice phase — otherwise it would speak a
  // random "Find <n>!" over the lesson while phase is still 'lesson'.
  useEffect(() => { if (phase === 'practice') loadRound(roundIdx) }, [roundIdx, ada.difficulty, phase]) // eslint-disable-line

  function handleAnswer(choice: number) {
    if (selected !== null) return
    const ok = choice === target
    setSelected(choice); setFeedback(ok ? 'correct' : 'wrong')
    const res = ada.record(ok)
    const newRun = ok ? 0 : wrongRun + 1
    setWrongRun(newRun)
    if (ok) { setCorrect(c => c + 1); speakAt(`Yes! That is ${numberToWords(target)}! ${ada.praise}`, answerRef.current) }
    else { setWrong(w => w + 1); speakAt(`That one is ${numberToWords(target)}. ${ada.encouragement}`, answerRef.current) }
    afterSpeech(() => {
      setFeedback(null)
      if (!ok && newRun >= 3) { setReMed({ phase: 'reteach', target, choices: buildChoices(target, ada.difficulty) }); return }
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

  if (phase === 'lesson') return <Numbers100Lesson childName={childName} onLessonComplete={startPractice} />

  const bubbleText = selected !== null
    ? feedback === 'correct' ? `🎉 ${numberToWords(target)} is ${target}!` : `It's ${target} — now you know.`
    : `Find ${numberToWords(target)}!`

  return (
    <div style={S.page}>
      <SpeakingLock />
      <GameTopbar chapterName="Numbers to 100" roundIdx={roundIdx} totalRounds={TOTAL_ROUNDS} />
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 8, background: 'rgba(0,0,0,0.08)', zIndex: 5 }}>
        <div style={{ height: '100%', width: `${(roundIdx / TOTAL_ROUNDS) * 100}%`, background: 'var(--garden-green)', borderRadius: '0 4px 4px 0', transition: 'width 0.4s ease' }} />
      </div>
      <div style={S.topRow}>
        <DifficultyBadge difficulty={ada.difficulty} isOnFire={ada.isOnFire} />
        {ada.shouldHint && <span style={S.hintTag}>💡 Listen carefully!</span>}
      </div>
      <div style={S.miloRow}>
        <img src="/assets/characters/milo-happy.png" alt="Milo" style={S.milo}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        <div className="milo-bubble" style={{ flex: 1, fontSize: 22 }}>{bubbleText}</div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button onClick={() => speak(`Find ${numberToWords(target)}!`)} style={S.replay}>🔊 Say it again</button>
        <button onClick={() => setShowChart(true)} style={S.replay}>🔢 Number chart</button>
      </div>

      <div style={S.choicesRow}>
        {choices.map(ch => {
          const isSel = selected === ch, isOk = ch === target
          return (
            <button key={ch} disabled={selected !== null} onClick={() => handleAnswer(ch)}
              ref={isOk ? (el) => { answerRef.current = el } : undefined} style={{
                width: 104, height: 104,
                background: (selected !== null && isOk) ? 'var(--garden-green-soft)' : 'var(--paper)',
                border: `4px solid ${(selected !== null && isOk) ? 'var(--garden-green)' : isSel ? 'var(--ink-muted)' : 'var(--outline)'}`,
                borderRadius: 24, boxShadow: `0 6px 0 ${(selected !== null && isOk) ? 'var(--garden-green-deep)' : '#c8ac79'}`,
                fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 44, color: 'var(--ink)',
                cursor: selected !== null ? 'default' : 'pointer',
                transform: ((selected !== null && isOk) || isSel) ? 'scale(1.1) translateY(-4px)' : 'scale(1)',
                transition: 'transform 160ms cubic-bezier(.34,1.56,.64,1),background 160ms ease',
              }}>{ch}</button>
          )
        })}
      </div>

      {feedback && <div style={{ ...S.flash, background: feedback === 'correct' ? 'var(--garden-green)' : 'var(--milo-orange)' }}>
        {feedback === 'correct' ? `✅ ${target}!` : `It's ${target} — now you know! 🙂`}
      </div>}
      <p style={S.roundLabel}>Round {Math.min(roundIdx + 1, TOTAL_ROUNDS)} of {TOTAL_ROUNDS}</p>

      {reMed?.phase === 'reteach' && (
        <ReMedOverlay>
          <ReadNumber n={reMed.target}
            intro={`Let's look at ${numberToWords(reMed.target)} together.`}
            outro="Now you try!"
            onDone={() => setReMed({ ...reMed, phase: 'check' })} />
        </ReMedOverlay>
      )}
      {reMed?.phase === 'check' && (
        <ReMedOverlay>
          <PickNumber target={reMed.target} choices={reMed.choices}
            intro={`Now you find it! Find ${numberToWords(reMed.target)}.`}
            outro={`Yes! ${numberToWords(reMed.target)}!`}
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
  // Portal to <body> so the game's zoom transform can't clip this full-screen overlay.
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
  page: { minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '72px 24px 32px', gap: 18, position: 'relative', background: 'linear-gradient(180deg,var(--sky-blue-soft) 0%,var(--bg-page) 55%)' },
  topRow: { display: 'flex', gap: 10, alignItems: 'center' },
  hintTag: { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--sky-blue-deep)', background: 'var(--sky-blue-soft)', border: '2px solid var(--sky-blue)', borderRadius: 999, padding: '3px 12px' },
  miloRow: { display: 'flex', alignItems: 'flex-end', gap: 16, width: '100%', maxWidth: 540 },
  milo: { width: 92, height: 92, objectFit: 'contain', flexShrink: 0, filter: 'drop-shadow(0 4px 10px rgba(61,37,22,.15))' },
  replay: { background: 'var(--paper)', border: '3px solid var(--outline)', borderRadius: 999, padding: '8px 18px', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: 'var(--ink)', cursor: 'pointer', boxShadow: '0 3px 0 rgba(61,37,22,.12)' },
  choicesRow: { display: 'flex', gap: 18, justifyContent: 'center', flexWrap: 'wrap', animation: 'slide-up 300ms ease both' },
  flash: { position: 'fixed', top: '38%', left: '50%', transform: 'translate(-50%,-50%)', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 38, padding: '18px 44px', borderRadius: 28, border: '4px solid var(--outline)', boxShadow: '0 8px 0 rgba(61,37,22,.2)', zIndex: 50, textAlign: 'center', animation: 'modal-in 280ms cubic-bezier(.34,1.56,.64,1) both' },
  roundLabel: { fontFamily: 'var(--font-body)', fontSize: 'var(--t-label)', color: 'var(--ink-muted)', margin: 0 },
}
