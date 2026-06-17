'use client'
/**
 * WordProblemsChapter (9–11) — multi-step, mixed-operation word problems.
 * Adaptive: L1 two-step with small numbers (× then −, + then −), L2 adds
 * "multiply then add" and bigger numbers, L3 adds division-first problems and
 * larger ranges. 10 rounds, after-3-wrong re-teach (watch it solved, then
 * check). See docs/curriculum-9-11.md.
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
import WordProblemsLesson, { SolveWatch, WordPick, type WordProblem } from '../lessons/WordProblemsLesson'

interface Props { onComplete: (c: number, w: number) => void; childName: string }

const TOTAL_ROUNDS = 10
const rint = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))
const shuffle = <T,>(a: T[]) => a.slice().sort(() => Math.random() - 0.5)
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]

const NAMES = ['Milo', 'Mia', 'Sam', 'Lena', 'Theo', 'Ava', 'Noah', 'Zara']

interface Round { problem: WordProblem; choices: number[] }

/** Final answer + two plausible distractors (common mistakes), shuffled. */
function buildChoices(answer: number, candidates: number[]): number[] {
  const opts = new Set<number>()
  for (const c of candidates) { if (opts.size >= 2) break; if (c > 0 && c !== answer) opts.add(c) }
  let bump = 1
  while (opts.size < 2) { const c = answer + bump; if (c > 0 && c !== answer) opts.add(c); bump = bump > 0 ? -bump : -bump + 1 }
  return shuffle([answer, ...opts])
}

// ── Templates: each returns a complete Round ──
// "× then −": buy packs, give some away.
function tPacksMinus(maxP: number, maxN: number): Round {
  const name = pick(NAMES)
  const item = pick(['apples', 'stickers', 'marbles', 'sweets', 'cards'])
  const p = rint(2, maxP), n = rint(2, maxN), made = p * n
  const g = rint(1, Math.max(1, made - 2)), answer = made - g
  return {
    problem: {
      scene: `${name} buys ${p} packs of ${n} ${item}, then gives ${g} away. How many ${item} are left?`, emoji: '🛍️',
      steps: [{ say: `First, ${p} packs of ${n} is ${made}.`, expr: `${p} × ${n} = ${made}` }, { say: `Then give ${g} away. ${made} minus ${g} is ${answer}.`, expr: `${made} − ${g} = ${answer}` }],
      answer, unit: item,
    },
    choices: buildChoices(answer, [made, made + g, p * n - 1, answer + g]),
  }
}

// "+ then −": have some, earn more, spend some.
function tPlusMinus(hi: number): Round {
  const name = pick(NAMES)
  const a = rint(4, hi), b = rint(3, hi), sum = a + b
  const c = rint(2, Math.max(2, sum - 2)), answer = sum - c
  return {
    problem: {
      scene: `${name} has ${a} coins, earns ${b} more, then spends ${c}. How many coins now?`, emoji: '🪙',
      steps: [{ say: `First, ${a} plus ${b} is ${sum}.`, expr: `${a} + ${b} = ${sum}` }, { say: `Then spend ${c}. ${sum} minus ${c} is ${answer}.`, expr: `${sum} − ${c} = ${answer}` }],
      answer, unit: 'coins',
    },
    choices: buildChoices(answer, [sum, a + b + c, answer + c, a - c > 0 ? a - c : a + 1]),
  }
}

// "× then +": same amount each day, plus an extra.
function tTimesPlus(maxA: number, maxD: number): Round {
  const name = pick(NAMES)
  const a = rint(3, maxA), d = rint(2, maxD), made = a * d
  const e = rint(2, 9), answer = made + e
  return {
    problem: {
      scene: `${name} reads ${a} pages each day for ${d} days, then ${e} more pages. How many pages in all?`, emoji: '📚',
      steps: [{ say: `First, ${a} pages for ${d} days is ${made}.`, expr: `${a} × ${d} = ${made}` }, { say: `Then add ${e} more. ${made} plus ${e} is ${answer}.`, expr: `${made} + ${e} = ${answer}` }],
      answer, unit: 'pages',
    },
    choices: buildChoices(answer, [made, made - e, a + d + e, answer + d]),
  }
}

// "÷ then −": share equally into bags, lose a few from one bag.
function tDivideMinus(): Round {
  const name = pick(NAMES)
  const item = pick(['marbles', 'cookies', 'beads', 'grapes'])
  const g = rint(3, 5), each = rint(4, 9), total = g * each
  const e = rint(1, each - 1), answer = each - e
  return {
    problem: {
      scene: `${name} shares ${total} ${item} into ${g} bags equally, then loses ${e} from one bag. How many ${item} in that bag now?`, emoji: '🎒',
      steps: [{ say: `Share ${total} into ${g} bags — that is ${each} each.`, expr: `${total} ÷ ${g} = ${each}` }, { say: `Then lose ${e}. ${each} minus ${e} is ${answer}.`, expr: `${each} − ${e} = ${answer}` }],
      answer, unit: item,
    },
    choices: buildChoices(answer, [each, total - e, each + e, answer + 1]),
  }
}

function makeRound(d: 1 | 2 | 3): Round {
  if (d === 1) return Math.random() < 0.5 ? tPacksMinus(4, 5) : tPlusMinus(9)
  if (d === 2) return pick([() => tPacksMinus(6, 6), () => tPlusMinus(15), () => tTimesPlus(8, 5)])()
  return pick([() => tTimesPlus(9, 9), () => tDivideMinus(), () => tPacksMinus(9, 8)])()
}

type ReMed = { phase: 'reteach' | 'check'; round: Round } | null

export default function WordProblemsChapter({ onComplete, childName }: Props) {
  const { phase, startPractice } = useChapterPhase()
  const { speak } = useMiloSpeaker()
  const ada = useAdaptive('wordProblems')
  const [roundIdx, setRoundIdx] = useState(0)
  const [round, setRound] = useState<Round>(() => makeRound(1))
  const [selected, setSelected] = useState<number | null>(null)
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
    speakAfterCurrent(roundIdx === 0 ? `Hi ${childName}! Listen carefully. ${r.problem.scene}` : r.problem.scene)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIdx, phase])

  if (phase === 'lesson') return <WordProblemsLesson childName={childName} onLessonComplete={startPractice} />

  function handleAnswer(choice: number) {
    if (selected !== null) return
    const ok = choice === round.problem.answer
    setSelected(choice); setFeedback(ok ? 'correct' : 'wrong')
    ada.record(ok)
    const newRun = ok ? 0 : wrongRun + 1
    setWrongRun(newRun)
    if (ok) { setCorrect(c => c + 1); speakAt(`Yes! ${ada.praise}`, answerRef.current) }
    else { setWrong(w => w + 1); speakAt(`It's ${round.problem.answer}. ${ada.encouragement}`, answerRef.current) }
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
    ? feedback === 'correct' ? '🎉 Correct!' : `It's ${round.problem.answer} — now you know.`
    : 'Solve it one step at a time!'

  return (
    <div style={S.page}>
      <SpeakingLock />
      <GameTopbar chapterName="Word Problems" roundIdx={roundIdx} totalRounds={TOTAL_ROUNDS} />
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 8, background: 'rgba(0,0,0,0.08)', zIndex: 5 }}>
        <div style={{ height: '100%', width: `${(roundIdx / TOTAL_ROUNDS) * 100}%`, background: 'var(--garden-green)', borderRadius: '0 4px 4px 0', transition: 'width 0.4s ease' }} />
      </div>
      <div style={S.topRow}>
        <DifficultyBadge difficulty={ada.difficulty} isOnFire={ada.isOnFire} />
        {ada.shouldHint && <span style={S.hintTag}>💡 One step at a time!</span>}
      </div>
      <div style={S.miloRow}>
        <img src="/assets/characters/milo-happy.png" alt="Milo" style={S.milo}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        <div className="milo-bubble" style={{ flex: 1, fontSize: 22 }}>{bubbleText}</div>
      </div>

      <div style={S.visual}>
        <span style={{ fontSize: 30, flexShrink: 0 }}>{round.problem.emoji}</span>
        <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 19, color: 'var(--ink)', lineHeight: 1.45 }}>{round.problem.scene}</span>
      </div>

      <button onClick={() => speak(round.problem.scene)} style={S.replayWrap}>
        <span style={S.replay}>🔊 Read it again</span>
      </button>

      <div style={S.choicesRow}>
        {round.choices.map(ch => {
          const isSel = selected === ch, isOk = ch === round.problem.answer
          return (
            <button key={ch} disabled={selected !== null} onClick={() => handleAnswer(ch)}
              ref={isOk ? (el) => { answerRef.current = el } : undefined} style={{
                minWidth: 90, height: 88, padding: '0 12px',
                background: (selected !== null && isOk) ? 'var(--garden-green-soft)' : 'var(--paper)',
                border: `4px solid ${(selected !== null && isOk) ? 'var(--garden-green)' : isSel ? 'var(--ink-muted)' : 'var(--outline)'}`,
                borderRadius: 24, boxShadow: `0 6px 0 ${(selected !== null && isOk) ? 'var(--garden-green-deep)' : '#c8ac79'}`,
                fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 32, color: 'var(--ink)',
                cursor: selected !== null ? 'default' : 'pointer',
                transform: ((selected !== null && isOk) || isSel) ? 'scale(1.08) translateY(-4px)' : 'scale(1)',
                transition: 'transform 160ms cubic-bezier(.34,1.56,.64,1),background 160ms ease',
              }}>{ch}</button>
          )
        })}
      </div>

      {feedback && <div style={{ ...S.flash, background: feedback === 'correct' ? 'var(--garden-green)' : 'var(--milo-orange)' }}>
        {feedback === 'correct' ? '✅ Yes!' : `It's ${round.problem.answer} — now you know! 🙂`}
      </div>}
      <p style={S.roundLabel}>Round {Math.min(roundIdx + 1, TOTAL_ROUNDS)} of {TOTAL_ROUNDS}</p>

      {reMed?.phase === 'reteach' && (
        <ReMedOverlay>
          <SolveWatch problem={reMed.round.problem}
            intro="Let's solve this one together, step by step." outro="Now you try!"
            onDone={() => setReMed({ ...reMed, phase: 'check' })} />
        </ReMedOverlay>
      )}
      {reMed?.phase === 'check' && (
        <ReMedOverlay>
          <WordPick problem={reMed.round.problem} choices={reMed.round.choices}
            intro="Now you pick the answer!" outro={`Yes! ${reMed.round.problem.answer}!`} onDone={finishReMed} />
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
  visual: { display: 'flex', gap: 12, alignItems: 'flex-start', background: 'rgba(255,255,255,.65)', border: '4px solid var(--outline)', borderRadius: 24, padding: '18px 22px', boxShadow: '0 6px 0 rgba(61,37,22,.08)', minHeight: 96, maxWidth: 540, justifyContent: 'flex-start' },
  replayWrap: { background: 'none', border: 'none', padding: 0, cursor: 'pointer' },
  replay: { display: 'inline-block', background: 'var(--paper)', border: '3px solid var(--outline)', borderRadius: 999, padding: '8px 18px', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: 'var(--ink)', boxShadow: '0 3px 0 rgba(61,37,22,.12)' },
  choicesRow: { display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', animation: 'slide-up 300ms ease both' },
  flash: { position: 'fixed', top: '38%', left: '50%', transform: 'translate(-50%,-50%)', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 38, padding: '18px 44px', borderRadius: 28, border: '4px solid var(--outline)', boxShadow: '0 8px 0 rgba(61,37,22,.2)', zIndex: 50, textAlign: 'center', animation: 'modal-in 280ms cubic-bezier(.34,1.56,.64,1) both' },
  roundLabel: { fontFamily: 'var(--font-body)', fontSize: 'var(--t-label)', color: 'var(--ink-muted)', margin: 0 },
}
