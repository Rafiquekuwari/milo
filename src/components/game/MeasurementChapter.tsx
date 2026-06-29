'use client'

import { useState, useEffect, useRef } from 'react'
import { useAdaptive, Difficulty } from '@/lib/adaptive'
import { makeDistinct } from '@/lib/questionVariety'
import MeasurementLesson, { WatchCompare, ChooseCompare, CSS as MEAS_CSS, type Category, type Ask, type Item } from '../lessons/MeasurementLesson'
import { useChapterPhase } from '@/lib/useChapterPhase'
import SpeakingLock from '@/components/ui/SpeakingLock'
import GameTopbar from '@/components/ui/GameTopbar'
import { afterSpeech, speakAfterCurrent, speakAt, useMiloSpeaker } from '@/lib/useMiloSpeaker'
import { DifficultyBadge } from '../ui/DifficultyBadge'

interface Props {
  onComplete: (correct: number, wrong: number, mastered?: boolean) => void
  childName: string
}

interface Round {
  category: Category
  ask: Ask
  question: string
  a: Item
  b: Item
  answer: 'a' | 'b'
  bigItem: Item        // the semantically larger member (for re-teach)
  smallItem: Item
  miloHint: string
}

// ─── Theme pairs, ordered [bigger, smaller] so values stay intuitive ─────────
// Neutral colour-named towers — the label must NOT hint which is taller.
const TOWER_STYLES: Item[] = [
  { emoji:'🟥', label:'Red Tower',    color:'var(--apple-red)',    value:0 },
  { emoji:'🟦', label:'Blue Tower',   color:'var(--sky-blue)',     value:0 },
  { emoji:'🟩', label:'Green Tower',  color:'var(--garden-green)', value:0 },
  { emoji:'🟨', label:'Yellow Tower', color:'var(--sun-yellow)',   value:0 },
  { emoji:'🟧', label:'Orange Tower', color:'var(--milo-orange)',  value:0 },
  { emoji:'🟪', label:'Purple Tower', color:'var(--berry-purple)', value:0 },
]
const WEIGHT_PAIRS: [Item, Item][] = [
  [{ emoji:'🐘', label:'Elephant', color:'#9CA3AF', value:0 }, { emoji:'🐭', label:'Mouse',   color:'#D97706', value:0 }],
  [{ emoji:'🦁', label:'Lion',     color:'var(--sun-yellow)', value:0 }, { emoji:'🐰', label:'Rabbit', color:'#EC4899', value:0 }],
  [{ emoji:'🐻', label:'Bear',     color:'#92400E', value:0 }, { emoji:'🐔', label:'Chicken', color:'var(--milo-orange)', value:0 }],
  [{ emoji:'🦛', label:'Hippo',    color:'#7C3AED', value:0 }, { emoji:'🐱', label:'Cat',     color:'#F472B6', value:0 }],
]
const LENGTH_PAIRS: [Item, Item][] = [
  [{ emoji:'🐍', label:'Snake',  color:'var(--garden-green)', value:0 }, { emoji:'🪱', label:'Worm',  color:'#D97706', value:0 }],
  [{ emoji:'🚂', label:'Train',  color:'var(--apple-red)', value:0 }, { emoji:'🚗', label:'Car',   color:'var(--sky-blue)', value:0 }],
  [{ emoji:'✏️', label:'Pencil', color:'#F59E0B', value:0 }, { emoji:'🖍️', label:'Crayon', color:'#EC4899', value:0 }],
]

const rnd = (n: number) => Math.floor(Math.random() * n)

// Difficulty = how CLOSE the two magnitudes are. Big gap = obvious (easy);
// gap of 1 = subtle (hard). A demotion widens the gap again.
function gapFor(d: Difficulty): number {
  if (d === 1) return 4 + rnd(3)   // 4–6
  if (d === 2) return 2 + rnd(2)   // 2–3
  return 1
}
function genMagnitudes(d: Difficulty): [number, number] {
  const gap = gapFor(d)
  const small = 1 + rnd(Math.max(1, 9 - gap))   // 1 … 9-gap
  return [small + gap, small]                    // [big, small], both ≤ 9
}

function buildRound(idx: number, d: Difficulty): Round {
  const category: Category = (['height','weight','length'] as Category[])[idx % 3]
  const ask: Ask = idx % 2 === 0 ? 'more' : 'less'
  const [big, small] = genMagnitudes(d)

  let bigItem: Item, smallItem: Item
  if (category === 'height') {
    const s1 = TOWER_STYLES[idx % TOWER_STYLES.length]
    const s2 = TOWER_STYLES[(idx + 2) % TOWER_STYLES.length]
    const bigStyle = Math.random() < 0.5 ? s1 : s2   // colour doesn't reveal height
    const smallStyle = bigStyle === s1 ? s2 : s1
    bigItem   = { ...bigStyle, value: big }
    smallItem = { ...smallStyle, value: small }
  } else if (category === 'weight') {
    const [bg, sm] = WEIGHT_PAIRS[idx % WEIGHT_PAIRS.length]
    bigItem   = { ...bg, value: big }
    smallItem = { ...sm, value: small }
  } else {
    const [bg, sm] = LENGTH_PAIRS[idx % LENGTH_PAIRS.length]
    bigItem   = { ...bg, value: big }
    smallItem = { ...sm, value: small }
  }

  // Randomise which side (a/b) holds the bigger item.
  const bigOnA = Math.random() < 0.5
  const a = bigOnA ? bigItem : smallItem
  const b = bigOnA ? smallItem : bigItem
  const aWins = ask === 'more' ? a.value > b.value : a.value < b.value
  const answer: 'a' | 'b' = aWins ? 'a' : 'b'

  const word = wordFor(category, ask)
  const question =
    category === 'height' ? `Which tower is ${word}?` :
    category === 'weight' ? `Which animal is ${word}?` :
    `Which one is ${word}?`
  const miloHint =
    ask === 'more'
      ? (category === 'height' ? 'Look up! Which one goes higher?' : category === 'weight' ? 'Which one would push the seesaw down?' : 'Which one stretches out further?')
      : (category === 'height' ? 'Find the little one — which is lower?' : category === 'weight' ? 'Which one is light as a feather?' : 'Which one is the short one?')

  return { category, ask, question, a, b, answer, bigItem, smallItem, miloHint }
}

function wordFor(category: Category, ask: Ask): string {
  if (category === 'height') return ask === 'more' ? 'taller' : 'shorter'
  if (category === 'weight') return ask === 'more' ? 'heavier' : 'lighter'
  return ask === 'more' ? 'longer' : 'shorter'
}

// Signature for de-duping: the items shown + which is asked + their magnitudes.
function roundSig(r: Round): string {
  return `${r.category}|${r.ask}|${r.a.label}:${r.a.value}|${r.b.label}:${r.b.value}`
}

const TOTAL_ROUNDS = 10
const CAT_BADGE: Record<Category, string> = { height: '📏 Height', weight: '⚖️ Weight', length: '📐 Length' }
const CAT_BG: Record<Category, string> = {
  height: 'linear-gradient(180deg, var(--sky-blue-soft) 0%, var(--bg-page) 60%)',
  weight: 'linear-gradient(180deg, var(--apple-red-soft) 0%, var(--bg-page) 60%)',
  length: 'linear-gradient(180deg, var(--sun-yellow-soft) 0%, var(--bg-page) 60%)',
}

// ─── Tower visual ────────────────────────────────────────────────
function Tower({ opt }: { opt: Item }) {
  const MAX = 9
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
      <div style={{ display:'flex', flexDirection:'column-reverse', gap:3, height: MAX * 30 + (MAX-1) * 3, justifyContent:'flex-start' }}>
        {Array.from({ length: MAX }).map((_, i) => {
          const filled = i < opt.value
          return (
            <div key={i} style={{
              width: 60, height: 27, borderRadius: 8, border: '3px solid var(--outline)',
              background: filled ? opt.color : 'rgba(255,255,255,.3)',
              boxShadow: filled ? '0 3px 0 rgba(61,37,22,.15)' : 'none',
              opacity: filled ? 1 : 0.25,
              transform: filled ? 'scale(1)' : 'scale(0.9)',
              transition: `background 200ms ease, transform 200ms ease ${i * 60}ms`,
            }} />
          )
        })}
      </div>
      <div style={{ background: 'var(--paper)', border: `3px solid ${opt.color}`, borderRadius: 12, padding: '4px 12px',
        fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 16, color: 'var(--ink)' }}>
        {opt.value} blocks
      </div>
    </div>
  )
}

// ─── Seesaw / scale visual — tip scales with the gap (subtle = harder) ────────
function Scale({ a, b, revealed }: { a: Item; b: Item; revealed: boolean }) {
  const aHeavier  = a.value > b.value
  const gap = Math.abs(a.value - b.value)
  const mag = Math.min(18, 6 + gap * 2)
  const tiltAngle = revealed ? (aHeavier ? -mag : mag) : 0
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
      <div style={{ position:'relative', width:320, height:120 }}>
        <div style={{ position:'absolute', left:24, top:0, width:2, height:52, background:'var(--outline)', transformOrigin:'bottom center', transform:`rotate(${tiltAngle * 0.5}deg)`, transition:'transform 600ms cubic-bezier(.34,1.56,.64,1)' }} />
        <div style={{ position:'absolute', right:24, top:0, width:2, height:52, background:'var(--outline)', transformOrigin:'bottom center', transform:`rotate(${-tiltAngle * 0.5}deg)`, transition:'transform 600ms cubic-bezier(.34,1.56,.64,1)' }} />
        <div style={{ position:'absolute', left:'50%', top:48, width:260, height:12, marginLeft:-130, background:'var(--ink)', borderRadius:6, transform:`rotate(${tiltAngle}deg)`, transformOrigin:'center center', transition:'transform 600ms cubic-bezier(.34,1.56,.64,1)', boxShadow:'0 4px 0 rgba(61,37,22,.3)' }}>
          <div style={{ position:'absolute', left:-18, bottom:8, width:64, height:20, background:'var(--cream)', border:'3px solid var(--outline)', borderRadius:8, boxShadow:'0 4px 0 rgba(61,37,22,.15)' }}>
            <span style={{ fontSize:28, position:'absolute', top:-32, left:8 }}>{a.emoji}</span>
          </div>
          <div style={{ position:'absolute', right:-18, bottom:8, width:64, height:20, background:'var(--cream)', border:'3px solid var(--outline)', borderRadius:8, boxShadow:'0 4px 0 rgba(61,37,22,.15)' }}>
            <span style={{ fontSize:28, position:'absolute', top:-32, left:8 }}>{b.emoji}</span>
          </div>
        </div>
        <div style={{ position:'absolute', left:'50%', top:54, width:12, height:60, marginLeft:-6, background:'var(--ink)', borderRadius:6 }} />
        <div style={{ position:'absolute', left:'50%', top:110, width:80, height:12, marginLeft:-40, background:'var(--ink)', borderRadius:6 }} />
      </div>
      {revealed && (
        <div style={{ fontFamily:'var(--font-body)', fontWeight:800, fontSize:14, color:'var(--ink-muted)', marginTop:4, animation:'slide-up 300ms ease both' }}>
          The heavier side goes down ⬇
        </div>
      )}
    </div>
  )
}

// ─── Ruler / length visual ───────────────────────────────────────
function LengthBar({ opt, max }: { opt: Item; max: number }) {
  const pct = (opt.value / max) * 100
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, width:'100%' }}>
      <span style={{ fontSize:36, flexShrink:0, width:44, textAlign:'center' }}>{opt.emoji}</span>
      <div style={{ flex:1, height:28, background:'rgba(255,255,255,.5)', border:'3px solid var(--outline)', borderRadius:999, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${pct}%`, background: opt.color, borderRadius:999, borderRight:'3px solid var(--outline)', transition:'width 800ms cubic-bezier(.4,0,.2,1)', boxShadow:'inset 0 2px 0 rgba(255,255,255,.3)' }} />
      </div>
    </div>
  )
}

// ─── Choice button ───────────────────────────────────────────────
function ChoiceBtn({ opt, chosen, isCorrect, revealed, onClick, innerRef }:
  { opt: Item; chosen: boolean; isCorrect: boolean; revealed: boolean; onClick: () => void; innerRef?: (el: HTMLButtonElement | null) => void }) {
  const correct = chosen && isCorrect
  const wrong   = chosen && !isCorrect
  const showRight = revealed && isCorrect && !chosen
  return (
    <button ref={innerRef} onClick={onClick} disabled={revealed} style={{
      flex:1, minWidth:130, maxWidth:220, padding:'18px 12px',
      background: correct ? 'var(--garden-green-soft)' : showRight ? 'var(--garden-green-soft)' : 'var(--paper)',
      border: `4px solid ${correct ? 'var(--garden-green)' : wrong ? 'var(--ink-muted)' : showRight ? 'var(--garden-green)' : opt.color}`,
      borderRadius: 28,
      boxShadow: correct ? '0 6px 0 var(--garden-green-deep)' : wrong ? '0 6px 0 #c8ac79' : showRight ? '0 6px 0 var(--garden-green-deep)' : `0 6px 0 ${opt.color}`,
      cursor: revealed ? 'default' : 'pointer',
      display:'flex', flexDirection:'column', alignItems:'center', gap:6,
      transform: chosen ? 'scale(1.06) translateY(-4px)' : 'scale(1)',
      transition:'all 200ms cubic-bezier(.34,1.56,.64,1)',
    }}
      onMouseDown={e => { if (!revealed) e.currentTarget.style.transform='translateY(6px)' }}
      onMouseUp={e => { if (!revealed) e.currentTarget.style.transform='' }}
      onMouseLeave={e => { if (!revealed) e.currentTarget.style.transform='' }}
    >
      <span style={{ fontSize:52, lineHeight:1 }}>{opt.emoji}</span>
      <span style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:20, color:'var(--ink)' }}>{opt.label}</span>
      {correct && <span style={{ fontSize:28 }}>✅</span>}
      {showRight && <span style={{ fontSize:20, fontFamily:'var(--font-body)', fontWeight:800, color:'var(--garden-green-deep)' }}>← Correct!</span>}
    </button>
  )
}

// ─── Main component ──────────────────────────────────────────────
export default function MeasurementChapter({ onComplete, childName }: Props) {
  const { phase, startPractice } = useChapterPhase()
  const { speak } = useMiloSpeaker()
  const ada = useAdaptive('measurement')

  const [roundIdx,  setRoundIdx]  = useState(0)
  const seen = useRef<Set<string>>(new Set())   // question signatures asked this session
  const [round,     setRound]     = useState<Round>(() => makeDistinct(() => buildRound(0, 1), seen.current, roundSig))
  const [selected,  setSelected]  = useState<'a'|'b'|null>(null)
  const [correct,   setCorrect]   = useState(0)
  const [wrong,     setWrong]     = useState(0)
  const [feedback,  setFeedback]  = useState<'correct'|'wrong'|null>(null)
  const [scaleReveal, setScaleReveal] = useState(false)
  // Adaptive remediation: after 3 wrong in a row, re-teach with an obvious gap, then check.
  const [wrongRun, setWrongRun] = useState(0)
  const [reMed, setReMed] = useState<{ phase:'reteach'|'check'; round: Round } | null>(null)
  const answerRef = useRef<HTMLButtonElement | null>(null)   // the winning choice (for the pointer)
  const timers = useRef<number[]>([])

  function clearT() { timers.current.forEach(id => window.clearTimeout(id)); timers.current = [] }

  useEffect(() => {
    if (phase !== 'practice') return   // don't build/speak a round over the lesson
    clearT()
    const r = makeDistinct(() => buildRound(roundIdx, ada.difficulty), seen.current, roundSig)
    setRound(r); setSelected(null); setFeedback(null); setScaleReveal(false)
    speakAfterCurrent(roundIdx === 0
      ? `Hi ${childName}! Let's compare sizes! ${r.question}`
      : ada.shouldHint ? `${r.miloHint}` : r.question)
    return clearT
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIdx, ada.difficulty, phase])

  function handleChoice(key: 'a'|'b') {
    if (selected) return
    clearT()
    const ok = key === round.answer
    setSelected(key)
    setFeedback(ok ? 'correct' : 'wrong')
    const res = ada.record(ok)
    const newRun = ok ? 0 : wrongRun + 1
    setWrongRun(newRun)

    if (round.category === 'weight') {
      const id = window.setTimeout(() => setScaleReveal(true), 400)
      timers.current.push(id)
    }

    const winner = round.answer === 'a' ? round.a : round.b
    const word = wordFor(round.category, round.ask)
    if (ok) {
      setCorrect(c => c + 1)
      speakAt(`Yes! The ${winner.label} is ${word}! ${ada.praise}`, answerRef.current)
    } else {
      setWrong(w => w + 1)
      speakAt(`Almost! It's the ${winner.label} — now you know. ${ada.encouragement}`, answerRef.current)
    }

    afterSpeech(() => {
      setFeedback(null)
      // 3 wrong in a row → re-teach with an obvious gap, then check
      if (!ok && newRun >= 3) { setReMed({ phase:'reteach', round }); return }
      // Demonstrated mastery → finish early with full stars, skip the repetitive tail.
      if (res.mastered) { onComplete(ok?correct+1:correct, ok?wrong:wrong+1, true); return }
      const next = roundIdx + 1
      if (next >= TOTAL_ROUNDS) onComplete(ok?correct+1:correct, ok?wrong:wrong+1)
      else window.setTimeout(() => setRoundIdx(next), 300)
    })
  }

  function finishReMed() {
    setReMed(null); setWrongRun(0)
    const next = roundIdx + 1
    if (next >= TOTAL_ROUNDS) onComplete(correct, wrong)
    else setRoundIdx(next)
  }

  const maxVal = Math.max(round.a.value, round.b.value)

  // ── Lesson phase ────────────────────────────────────────────
  if (phase === 'lesson') {
    return <MeasurementLesson childName={childName} onLessonComplete={startPractice} />
  }

  // Obvious (big-gap) versions of the failed items, for the re-teach.
  const obvBig: Item | null   = reMed ? { ...reMed.round.bigItem,   value: 8 } : null
  const obvSmall: Item | null = reMed ? { ...reMed.round.smallItem, value: 2 } : null

  // ── Practice phase ──────────────────────────────────────────
  return (
    <div style={{ ...S.page, background: CAT_BG[round.category] }}>
      <SpeakingLock />
      <GameTopbar chapterName="Measurement" roundIdx={roundIdx} totalRounds={TOTAL_ROUNDS} />
      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
        <DifficultyBadge difficulty={ada.difficulty} isOnFire={ada.isOnFire} />
        {ada.shouldHint && (
          <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:14,
            color:'var(--sky-blue-deep)', background:'var(--sky-blue-soft)',
            border:'2px solid var(--sky-blue)', borderRadius:999, padding:'3px 12px' }}>
            💡 Look carefully!
          </span>
        )}
      </div>

      <div style={S.miloRow}>
        <img src="/assets/characters/milo-happy.png" alt="Milo"
          style={{ width:92, height:92, objectFit:'contain', flexShrink:0, filter:'drop-shadow(0 4px 10px rgba(61,37,22,.15))' }}
          onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
        <div className="milo-bubble" style={{ flex:1, fontSize:20 }}>
          {selected
            ? feedback === 'correct'
              ? `🎉 Correct! The ${(round.answer==='a'?round.a:round.b).label} is the answer!`
              : `Almost! It's the ${(round.answer==='a'?round.a:round.b).label} — now you know.`
            : round.question}
        </div>
      </div>

      <div style={{ background: 'var(--paper)', border:'3px solid var(--outline)', borderRadius:'var(--r-pill)', padding:'6px 22px',
        fontFamily:'var(--font-display)', fontWeight:900, fontSize:18, color:'var(--ink)', boxShadow:'0 3px 0 rgba(61,37,22,.10)' }}>
        {CAT_BADGE[round.category]}
      </div>

      <div style={S.visualArea}>
        {round.category === 'height' && (
          <div style={{ display:'flex', alignItems:'flex-end', gap:32, justifyContent:'center' }}>
            <Tower opt={round.a} />
            <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:28, color:'var(--ink-muted)', marginBottom:16 }}>VS</div>
            <Tower opt={round.b} />
          </div>
        )}
        {round.category === 'weight' && (
          <Scale a={round.a} b={round.b} revealed={scaleReveal || !!selected} />
        )}
        {round.category === 'length' && (
          <div style={{ width:'100%', display:'flex', flexDirection:'column', gap:14 }}>
            <LengthBar opt={round.a} max={maxVal * 1.1} />
            <LengthBar opt={round.b} max={maxVal * 1.1} />
          </div>
        )}
      </div>

      <div style={S.choicesRow}>
        <ChoiceBtn opt={round.a} chosen={selected==='a'} isCorrect={round.answer==='a'} revealed={!!selected} onClick={() => handleChoice('a')} innerRef={round.answer==='a' ? (el)=>{answerRef.current=el} : undefined} />
        <ChoiceBtn opt={round.b} chosen={selected==='b'} isCorrect={round.answer==='b'} revealed={!!selected} onClick={() => handleChoice('b')} innerRef={round.answer==='b' ? (el)=>{answerRef.current=el} : undefined} />
      </div>

      {feedback && (
        <div style={{
          position:'fixed', top:'38%', left:'50%', transform:'translate(-50%,-50%)',
          background: feedback==='correct' ? 'var(--garden-green)' : 'var(--milo-orange)',
          color:'#fff', fontFamily:'var(--font-display)', fontWeight:900, fontSize:38,
          padding:'18px 44px', borderRadius:28, border:'4px solid var(--outline)',
          boxShadow:'0 8px 0 rgba(61,37,22,.2)', zIndex:50, textAlign:'center',
          animation:'modal-in 280ms cubic-bezier(.34,1.56,.64,1) both',
        }}>
          {feedback==='correct' ? '✅ That\'s right!' : 'Let\'s look together! 🙂'}
        </div>
      )}

      <p style={S.roundLabel}>Round {Math.min(roundIdx+1,TOTAL_ROUNDS)} of {TOTAL_ROUNDS}</p>

      {reMed?.phase === 'reteach' && obvBig && obvSmall && (
        <MeasRemediationOverlay>
          <WatchCompare category={reMed.round.category} a={obvBig} b={obvSmall} ask="more"
            intro="Let's look again! See how different they are?"
            outro="See? Now you try with an easy one!"
            onDone={() => setReMed({ phase:'check', round: reMed.round })}/>
        </MeasRemediationOverlay>
      )}
      {reMed?.phase === 'check' && obvBig && obvSmall && (
        <MeasRemediationOverlay>
          <ChooseCompare category={reMed.round.category} a={obvBig} b={obvSmall} ask="more"
            intro="Now you try! Which one is bigger?"
            onDone={finishReMed}/>
        </MeasRemediationOverlay>
      )}
    </div>
  )
}

// Overlay wrapper for the re-teach / check (carries the lesson's animation CSS).
function MeasRemediationOverlay({ children }: { children: React.ReactNode }) {
  return (
    <div style={{position:'fixed',inset:0,zIndex:200,background:'rgba(61,37,22,0.7)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <style>{MEAS_CSS}</style>
      <div style={{background:'var(--paper)',border:'4px solid var(--outline)',borderRadius:24,padding:'22px 14px 26px',maxWidth:480,width:'100%',boxShadow:'0 8px 0 rgba(61,37,22,.2)',maxHeight:'94vh',overflowY:'auto'}}>
        {children}
      </div>
    </div>
  )
}

const S: Record<string,React.CSSProperties> = {
  page: { minHeight:'100dvh', display:'flex', flexDirection:'column', alignItems:'center', padding:'72px 24px 32px', gap:18, position:'relative' },
  miloRow: { display:'flex', alignItems:'flex-end', gap:16, width:'100%', maxWidth:580 },
  visualArea: { width:'100%', maxWidth:600, background:'rgba(255,255,255,0.65)', border:'4px solid var(--outline)', borderRadius:28, padding:'24px 28px', boxShadow:'0 6px 0 rgba(61,37,22,.08)', display:'flex', alignItems:'center', justifyContent:'center', minHeight:220, animation:'slide-up 300ms cubic-bezier(.4,0,.2,1) both' },
  choicesRow: { display:'flex', gap:16, justifyContent:'center', width:'100%', maxWidth:520, flexWrap:'wrap' },
  roundLabel: { fontFamily:'var(--font-body)', fontSize:'var(--t-label)', color:'var(--ink-muted)', margin:0 },
}
