'use client'
/**
 * Shapes2D3DChapter (6–8) — name shapes and count sides; 3D solids at L3.
 * Adaptive: L1 basic 2D names → L2 + more 2D + "how many sides?" → L3 + 3D solids.
 * 10 rounds, after-3-wrong re-teach.
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
import Shapes2D3DLesson, {
  SHAPES_2D, SHAPES_3D, sidesOf, is3D, ShapeView, ShapeWatch, ShapeAsk, buildNameChoices,
} from '../lessons/Shapes2D3DLesson'

interface Props { onComplete: (c: number, w: number, mastered?: boolean) => void; childName: string }

const TOTAL_ROUNDS = 10
const rint = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))
const pick = <T,>(a: T[]) => a[rint(0, a.length - 1)]

type SMode = 'name' | 'sides'
interface Round { name: string; mode: SMode; pool: string[]; answer: string | number; choices: (string | number)[]; say: string }

function makeRound(d: 1 | 2 | 3): Round {
  const pool2d = d === 1 ? ['circle', 'triangle', 'square'] : SHAPES_2D
  // L3 mixes in 3D names.
  const namePool = d === 3 ? [...SHAPES_2D, ...SHAPES_3D] : pool2d
  const name = pick(d === 3 && rint(1, 2) === 1 ? [...SHAPES_2D, ...SHAPES_3D] : pool2d)
  // "sides" only for 2D polygons, and only from L2.
  const canSides = d >= 2 && !is3D(name) && sidesOf(name) != null
  const mode: SMode = canSides && rint(1, 2) === 1 ? 'sides' : 'name'
  if (mode === 'sides') {
    const s = sidesOf(name)!
    const choices = [...new Set([s, s - 1, s + 1])].filter(n => n >= 3).slice(0, 3)
    while (choices.length < 3) { const n = s + choices.length; if (!choices.includes(n)) choices.push(n) }
    return { name, mode, pool: namePool, answer: s, choices: choices.sort(() => Math.random() - 0.5), say: `How many sides does this shape have?` }
  }
  const poolForChoices = is3D(name) ? SHAPES_3D : (d === 1 ? pool2d : SHAPES_2D)
  return { name, mode: 'name', pool: namePool, answer: name, choices: buildNameChoices(name, poolForChoices), say: 'What shape is this?' }
}

type ReMed = { phase: 'reteach' | 'check'; round: Round } | null

export default function Shapes2D3DChapter({ onComplete, childName }: Props) {
  const { phase, startPractice } = useChapterPhase()
  const { speak } = useMiloSpeaker()
  const ada = useAdaptive('shapes2d3d')
  const seen = useRef<Set<string>>(new Set())   // question signatures asked this session
  const [roundIdx, setRoundIdx] = useState(0)
  const [round, setRound] = useState<Round>(() => makeDistinct(() => makeRound(1), seen.current, r => `${r.name}|${r.mode}`))
  const [selected, setSelected] = useState<string | number | null>(null)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [correct, setCorrect] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [wrongRun, setWrongRun] = useState(0)
  const [reMed, setReMed] = useState<ReMed>(null)
  const answerRef = useRef<HTMLElement | null>(null)

  function loadRound(idx: number) {
    const r = makeDistinct(() => makeRound(ada.difficulty), seen.current, r => `${r.name}|${r.mode}`)
    setRound(r); setSelected(null); setFeedback(null)
    speakAfterCurrent(idx === 0 ? `Hi ${childName}! ${r.say}` : r.say)
  }

  useEffect(() => { if (phase === 'practice') loadRound(roundIdx) }, [roundIdx, ada.difficulty, phase]) // eslint-disable-line

  function handleAnswer(choice: string | number) {
    if (selected !== null) return
    const ok = choice === round.answer
    setSelected(choice); setFeedback(ok ? 'correct' : 'wrong')
    const res = ada.record(ok)
    const newRun = ok ? 0 : wrongRun + 1
    setWrongRun(newRun)
    if (ok) { setCorrect(c => c + 1); speakAt(`Yes! ${ada.praise}`, answerRef.current) }
    else { setWrong(w => w + 1); speakAt(`It was ${round.answer}. ${ada.encouragement}`, answerRef.current) }
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

  if (phase === 'lesson') return <Shapes2D3DLesson childName={childName} onLessonComplete={startPractice} />

  const bubbleText = selected !== null
    ? feedback === 'correct' ? '🎉 Correct!' : `It's ${round.answer} — now you know.`
    : round.mode === 'name' ? 'What shape is this?' : 'How many sides?'

  return (
    <div style={S.page}>
      <SpeakingLock />
      <GameTopbar chapterName="Shapes" roundIdx={roundIdx} totalRounds={TOTAL_ROUNDS} />
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 8, background: 'rgba(0,0,0,0.08)', zIndex: 5 }}>
        <div style={{ height: '100%', width: `${(roundIdx / TOTAL_ROUNDS) * 100}%`, background: 'var(--garden-green)', borderRadius: '0 4px 4px 0', transition: 'width 0.4s ease' }} />
      </div>
      <div style={S.topRow}>
        <DifficultyBadge difficulty={ada.difficulty} isOnFire={ada.isOnFire} />
        {ada.shouldHint && <span style={S.hintTag}>💡 Look at the corners!</span>}
      </div>
      <div style={S.miloRow}>
        <img src="/assets/characters/milo-happy.png" alt="Milo" style={S.milo}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        <div className="milo-bubble" style={{ flex: 1, fontSize: 22, textTransform: feedback === 'wrong' ? 'capitalize' : 'none' }}>{bubbleText}</div>
      </div>

      <div style={S.sceneBox}><ShapeView name={round.name} size={120} /></div>

      <button onClick={() => speak(round.say)} style={S.replayWrap}><span style={S.replay}>🔊 Say it again</span></button>

      <div style={S.choicesRow}>
        {round.choices.map(ch => {
          const isSel = selected === ch, isOk = ch === round.answer
          return (
            <button key={String(ch)} disabled={selected !== null} onClick={() => handleAnswer(ch)}
              ref={isOk ? (el) => { answerRef.current = el } : undefined} style={{
                minWidth: 92, height: 76, padding: '0 18px',
                background: (selected !== null && isOk) ? 'var(--garden-green-soft)' : 'var(--paper)',
                border: `4px solid ${(selected !== null && isOk) ? 'var(--garden-green)' : isSel ? 'var(--ink-muted)' : 'var(--outline)'}`,
                borderRadius: 20, boxShadow: `0 6px 0 ${(selected !== null && isOk) ? 'var(--garden-green-deep)' : '#c8ac79'}`,
                fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: round.mode === 'name' ? 20 : 32, color: 'var(--ink)',
                cursor: selected !== null ? 'default' : 'pointer', textTransform: 'capitalize',
                transform: ((selected !== null && isOk) || isSel) ? 'scale(1.08) translateY(-3px)' : 'scale(1)',
                transition: 'transform 160ms cubic-bezier(.34,1.56,.64,1),background 160ms ease',
              }}>{ch}</button>
          )
        })}
      </div>

      {feedback && <div style={{ ...S.flash, background: feedback === 'correct' ? 'var(--garden-green)' : 'var(--milo-orange)', textTransform: 'capitalize' }}>
        {feedback === 'correct' ? '✅ Yes!' : `It's ${round.answer} — now you know! 🙂`}
      </div>}
      <p style={S.roundLabel}>Round {Math.min(roundIdx + 1, TOTAL_ROUNDS)} of {TOTAL_ROUNDS}</p>

      {reMed?.phase === 'reteach' && (
        <ReMedOverlay>
          <ShapeWatch name={reMed.round.name} onDone={() => setReMed({ ...reMed, phase: 'check' })} />
        </ReMedOverlay>
      )}
      {reMed?.phase === 'check' && (
        <ReMedOverlay>
          <ShapeAsk name={reMed.round.name} mode={reMed.round.mode} answer={reMed.round.answer} choices={reMed.round.choices}
            intro={reMed.round.mode === 'name' ? 'Now you name it!' : 'Now you count the sides!'}
            outro={`Yes! ${reMed.round.answer}!`} onDone={finishReMed} />
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
      <div style={{ background: 'var(--paper)', border: '4px solid var(--outline)', borderRadius: 24, padding: '22px 16px 26px', maxWidth: 440, width: '100%', boxShadow: '0 8px 0 rgba(61,37,22,.2)', maxHeight: '94vh', overflowY: 'auto' }}>
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
  sceneBox: { display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.65)', border: '4px solid var(--outline)', borderRadius: 24, padding: '18px', boxShadow: '0 6px 0 rgba(61,37,22,.08)', minHeight: 130 },
  replayWrap: { background: 'none', border: 'none', padding: 0, cursor: 'pointer' },
  replay: { display: 'inline-block', background: 'var(--paper)', border: '3px solid var(--outline)', borderRadius: 999, padding: '8px 18px', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: 'var(--ink)', boxShadow: '0 3px 0 rgba(61,37,22,.12)' },
  choicesRow: { display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', animation: 'slide-up 300ms ease both' },
  flash: { position: 'fixed', top: '38%', left: '50%', transform: 'translate(-50%,-50%)', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 38, padding: '18px 44px', borderRadius: 28, border: '4px solid var(--outline)', boxShadow: '0 8px 0 rgba(61,37,22,.2)', zIndex: 50, textAlign: 'center', animation: 'modal-in 280ms cubic-bezier(.34,1.56,.64,1) both' },
  roundLabel: { fontFamily: 'var(--font-body)', fontSize: 'var(--t-label)', color: 'var(--ink-muted)', margin: 0 },
}
