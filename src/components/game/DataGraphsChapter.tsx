'use client'
/**
 * DataGraphsChapter (9–11) — reading bar charts and pictographs.
 * Adaptive: L1 bar chart, 3 categories, read-a-value / most / least; L2 bar
 * chart, 4 categories, adds "how many more"; L3 pictographs (each picture = 2
 * or 5) with value / more / total. 10 rounds, after-3-wrong re-teach (watch it
 * read, then check). See docs/curriculum-9-11.md.
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
import DataGraphsLesson, { ChartView, ChartWatch, ChartPick, type ChartData, type ChartQuestion } from '../lessons/DataGraphsLesson'

interface Props { onComplete: (c: number, w: number) => void; childName: string }

const TOTAL_ROUNDS = 10
const rint = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))
const shuffle = <T,>(a: T[]) => a.slice().sort(() => Math.random() - 0.5)
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]

const SETS: { unit: string; cats: [string, string][] }[] = [
  { unit: 'votes', cats: [['Apple', '🍎'], ['Banana', '🍌'], ['Cherry', '🍒'], ['Grape', '🍇']] },
  { unit: 'pets', cats: [['Dogs', '🐶'], ['Cats', '🐱'], ['Fish', '🐟'], ['Birds', '🐦']] },
  { unit: 'cars', cats: [['Red', '🚗'], ['Blue', '🚙'], ['Green', '🚐'], ['Black', '🏎️']] },
  { unit: 'stars', cats: [['Mon', '⭐'], ['Tue', '⭐'], ['Wed', '⭐'], ['Thu', '⭐']] },
]

function numChoices(answer: number, pool: number[]): string[] {
  const opts = new Set<string>([String(answer)])
  for (const v of shuffle(pool)) { if (opts.size >= 3) break; if (v > 0 && v !== answer) opts.add(String(v)) }
  let bump = 1
  while (opts.size < 3) { if (answer + bump > 0) opts.add(String(answer + bump)); bump = bump > 0 ? -bump : -bump + 1 }
  return shuffle([...opts])
}

function makeChart(d: 1 | 2 | 3): ChartData {
  const set = pick(SETS)
  const n = d === 1 ? 3 : 4
  const cats = shuffle(set.cats.map(c => [...c])).slice(0, n)
  if (d === 3) {
    const per = pick([2, 5])
    return { kind: 'picto', unit: set.unit, perSymbol: per, categories: cats.map(([label, emoji]) => ({ label, emoji, value: per * rint(1, 5) })) }
  }
  const hi = d === 1 ? 6 : 10
  // distinct values so "most"/"least" are unambiguous
  const used = new Set<number>()
  const valueFor = () => { let v = rint(1, hi); while (used.has(v)) v = rint(1, hi); used.add(v); return v }
  return { kind: 'bar', unit: set.unit, categories: cats.map(([label, emoji]) => ({ label, emoji, value: valueFor() })) }
}

function makeQuestion(d: 1 | 2 | 3): ChartQuestion {
  const chart = makeChart(d)
  const cs = chart.categories
  const sorted = [...cs].sort((a, b) => b.value - a.value)
  const kinds: Array<'value' | 'most' | 'least' | 'diff' | 'total'> =
    d === 1 ? ['value', 'most', 'least'] : d === 2 ? ['value', 'most', 'least', 'diff'] : ['value', 'diff', 'total', 'most']
  const kind = pick(kinds)

  if (kind === 'most' || kind === 'least') {
    const target = kind === 'most' ? sorted[0] : sorted[sorted.length - 1]
    const others = shuffle(cs.filter(c => c.label !== target.label).map(c => c.label)).slice(0, 2)
    return { chart, ask: `Which has the ${kind === 'most' ? 'MOST' : 'LEAST'} ${chart.unit}?`,
      reveal: `${target.label} has the ${kind === 'most' ? 'most' : 'least'}.`, answer: target.label,
      choices: shuffle([target.label, ...others]), highlight: [target.label] }
  }
  if (kind === 'diff') {
    const [a, b] = shuffle(cs).slice(0, 2).sort((x, y) => y.value - x.value)
    const ans = a.value - b.value
    return { chart, ask: `How many more ${chart.unit} does ${a.label} have than ${b.label}?`,
      reveal: `${a.value} take away ${b.value} is ${ans}.`, answer: String(ans),
      choices: numChoices(ans, [a.value + b.value, a.value, b.value, ans + 1, ans + 2]), highlight: [a.label, b.label] }
  }
  if (kind === 'total') {
    const ans = cs.reduce((s, c) => s + c.value, 0)
    return { chart, ask: `How many ${chart.unit} in all?`,
      reveal: `Add them all up — that's ${ans}.`, answer: String(ans),
      choices: numChoices(ans, [ans - cs[0].value, ans + chart.perSymbol! , ans - chart.perSymbol!, ans + 2]), highlight: cs.map(c => c.label) }
  }
  // value
  const target = pick(cs)
  const keyHint = chart.kind === 'picto' ? ` (each ${target.emoji} = ${chart.perSymbol})` : ''
  return { chart, ask: `How many ${chart.unit} for ${target.label}?${keyHint}`,
    reveal: `${target.label} has ${target.value}.`, answer: String(target.value),
    choices: numChoices(target.value, cs.map(c => c.value).concat([target.value + 1, target.value + 2])), highlight: [target.label] }
}

type ReMed = { phase: 'reteach' | 'check'; q: ChartQuestion } | null

export default function DataGraphsChapter({ onComplete, childName }: Props) {
  const { phase, startPractice } = useChapterPhase()
  const { speak } = useMiloSpeaker()
  const ada = useAdaptive('dataGraphs')
  const [roundIdx, setRoundIdx] = useState(0)
  const [q, setQ] = useState<ChartQuestion>(() => makeQuestion(1))
  const [selected, setSelected] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [correct, setCorrect] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [wrongRun, setWrongRun] = useState(0)
  const [reMed, setReMed] = useState<ReMed>(null)
  const answerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (phase !== 'practice') return
    const next = makeQuestion(ada.difficulty)
    setQ(next); setSelected(null); setFeedback(null)
    speakAfterCurrent(roundIdx === 0 ? `Hi ${childName}! Read the chart. ${next.ask}` : next.ask)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIdx, phase])

  if (phase === 'lesson') return <DataGraphsLesson childName={childName} onLessonComplete={startPractice} />

  function handleAnswer(choice: string) {
    if (selected !== null) return
    const ok = choice === q.answer
    setSelected(choice); setFeedback(ok ? 'correct' : 'wrong')
    ada.record(ok)
    const newRun = ok ? 0 : wrongRun + 1
    setWrongRun(newRun)
    if (ok) { setCorrect(c => c + 1); speakAt(`Yes! ${ada.praise}`, answerRef.current) }
    else { setWrong(w => w + 1); speakAt(`It's ${q.answer}. ${ada.encouragement}`, answerRef.current) }
    afterSpeech(() => {
      setFeedback(null)
      if (!ok && newRun >= 3) { setReMed({ phase: 'reteach', q }); return }
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
    ? feedback === 'correct' ? '🎉 Correct!' : `It's ${q.answer} — now you know.`
    : 'Read the chart, then answer!'

  return (
    <div style={S.page}>
      <SpeakingLock />
      <GameTopbar chapterName="Data & Graphs" roundIdx={roundIdx} totalRounds={TOTAL_ROUNDS} />
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 8, background: 'rgba(0,0,0,0.08)', zIndex: 5 }}>
        <div style={{ height: '100%', width: `${(roundIdx / TOTAL_ROUNDS) * 100}%`, background: 'var(--garden-green)', borderRadius: '0 4px 4px 0', transition: 'width 0.4s ease' }} />
      </div>
      <div style={S.topRow}>
        <DifficultyBadge difficulty={ada.difficulty} isOnFire={ada.isOnFire} />
        {ada.shouldHint && <span style={S.hintTag}>💡 Taller means more!</span>}
      </div>
      <div style={S.miloRow}>
        <img src="/assets/characters/milo-happy.png" alt="Milo" style={S.milo}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        <div className="milo-bubble" style={{ flex: 1, fontSize: 22 }}>{bubbleText}</div>
      </div>

      <div style={S.visual}>
        <ChartView chart={q.chart} highlight={selected ? q.highlight : []} dim={selected != null} />
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17, color: 'var(--ink)', textAlign: 'center', maxWidth: 420 }}>{q.ask}</div>
      </div>

      <button onClick={() => speak(q.ask)} style={S.replayWrap}>
        <span style={S.replay}>🔊 Say it again</span>
      </button>

      <div style={S.choicesRow}>
        {q.choices.map(ch => {
          const isSel = selected === ch, isOk = ch === q.answer
          return (
            <button key={ch} disabled={selected !== null} onClick={() => handleAnswer(ch)}
              ref={isOk ? (el) => { answerRef.current = el } : undefined} style={{
                minWidth: 84, height: 84, padding: '0 14px',
                background: (selected !== null && isOk) ? 'var(--garden-green-soft)' : 'var(--paper)',
                border: `4px solid ${(selected !== null && isOk) ? 'var(--garden-green)' : isSel ? 'var(--ink-muted)' : 'var(--outline)'}`,
                borderRadius: 24, boxShadow: `0 6px 0 ${(selected !== null && isOk) ? 'var(--garden-green-deep)' : '#c8ac79'}`,
                fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 26, color: 'var(--ink)',
                cursor: selected !== null ? 'default' : 'pointer',
                transform: ((selected !== null && isOk) || isSel) ? 'scale(1.08) translateY(-4px)' : 'scale(1)',
                transition: 'transform 160ms cubic-bezier(.34,1.56,.64,1),background 160ms ease',
              }}>{ch}</button>
          )
        })}
      </div>

      {feedback && <div style={{ ...S.flash, background: feedback === 'correct' ? 'var(--garden-green)' : 'var(--milo-orange)' }}>
        {feedback === 'correct' ? '✅ Yes!' : `It's ${q.answer} — now you know! 🙂`}
      </div>}
      <p style={S.roundLabel}>Round {Math.min(roundIdx + 1, TOTAL_ROUNDS)} of {TOTAL_ROUNDS}</p>

      {reMed?.phase === 'reteach' && (
        <ReMedOverlay>
          <ChartWatch q={reMed.q} intro="Let's read this chart together." outro="Now you try!"
            onDone={() => setReMed({ ...reMed, phase: 'check' })} />
        </ReMedOverlay>
      )}
      {reMed?.phase === 'check' && (
        <ReMedOverlay>
          <ChartPick q={reMed.q} intro="Now you pick the answer!" outro={`Yes! ${reMed.q.answer}!`} onDone={finishReMed} />
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
  visual: { display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', background: 'rgba(255,255,255,.65)', border: '4px solid var(--outline)', borderRadius: 24, padding: '18px 22px', boxShadow: '0 6px 0 rgba(61,37,22,.08)', minHeight: 110, maxWidth: 540, justifyContent: 'center' },
  replayWrap: { background: 'none', border: 'none', padding: 0, cursor: 'pointer' },
  replay: { display: 'inline-block', background: 'var(--paper)', border: '3px solid var(--outline)', borderRadius: 999, padding: '8px 18px', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: 'var(--ink)', boxShadow: '0 3px 0 rgba(61,37,22,.12)' },
  choicesRow: { display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', animation: 'slide-up 300ms ease both' },
  flash: { position: 'fixed', top: '38%', left: '50%', transform: 'translate(-50%,-50%)', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 38, padding: '18px 44px', borderRadius: 28, border: '4px solid var(--outline)', boxShadow: '0 8px 0 rgba(61,37,22,.2)', zIndex: 50, textAlign: 'center', animation: 'modal-in 280ms cubic-bezier(.34,1.56,.64,1) both' },
  roundLabel: { fontFamily: 'var(--font-body)', fontSize: 'var(--t-label)', color: 'var(--ink-muted)', margin: 0 },
}
