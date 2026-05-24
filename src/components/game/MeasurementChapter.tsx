'use client'

import { useState, useEffect, useRef } from 'react'

import { useAdaptive } from '@/lib/adaptive'

import ChapterLesson from '@/components/ui/ChapterLesson'
import { getLessonExamples } from '@/lib/lessons'
import { useChapterPhase } from '@/lib/useChapterPhase'
import SpeakingLock from '@/components/ui/SpeakingLock'
import GameTopbar from '@/components/ui/GameTopbar'
import { afterSpeech, speakAfterCurrent, useMiloSpeaker } from '@/lib/useMiloSpeaker'
import { DifficultyBadge } from '../ui/DifficultyBadge'

interface Props {
  onComplete: (correct: number, wrong: number) => void
  childName: string
}

// ─── Types ───────────────────────────────────────────────────────
type QType = 'taller' | 'shorter' | 'heavier' | 'lighter' | 'longer' | 'shorter_obj'

interface Option {
  label: string
  emoji: string
  value: number        // height/weight/length unit — higher = bigger
  color: string
  colorSoft: string
}

interface Round {
  type: QType
  question: string
  unitLabel: string    // 'blocks tall' | 'kg' | 'cm long'
  a: Option
  b: Option
  answer: 'a' | 'b'
  miloHint: string
}

// ─── Data pools ──────────────────────────────────────────────────
const TOWER_PAIRS: [Option, Option][] = [
  [
    { label:'Red Tower',  emoji:'🟥', value:6, color:'var(--apple-red)',   colorSoft:'var(--apple-red-soft)' },
    { label:'Blue Tower', emoji:'🟦', value:3, color:'var(--sky-blue)',    colorSoft:'var(--sky-blue-soft)' },
  ],
  [
    { label:'Yellow Tower', emoji:'🟨', value:4, color:'var(--sun-yellow)',   colorSoft:'var(--sun-yellow-soft)' },
    { label:'Green Tower',  emoji:'🟩', value:7, color:'var(--garden-green)', colorSoft:'var(--garden-green-soft)' },
  ],
  [
    { label:'Purple Tower', emoji:'🟪', value:8, color:'var(--berry-purple)', colorSoft:'var(--berry-purple-soft)' },
    { label:'Orange Tower', emoji:'🟧', value:5, color:'var(--milo-orange)',  colorSoft:'var(--milo-orange-soft)' },
  ],
  [
    { label:'Pink Tower', emoji:'🌸', value:3, color:'#F472B6', colorSoft:'#FCE7F3' },
    { label:'Mint Tower', emoji:'🌿', value:9, color:'#34D399', colorSoft:'#D1FAE5' },
  ],
]

const ANIMAL_PAIRS: [Option, Option][] = [
  [
    { label:'Elephant', emoji:'🐘', value:90, color:'#9CA3AF', colorSoft:'#F3F4F6' },
    { label:'Mouse',    emoji:'🐭', value:2,  color:'#D97706', colorSoft:'#FEF3C7' },
  ],
  [
    { label:'Lion',  emoji:'🦁', value:60, color:'var(--sun-yellow)',   colorSoft:'var(--sun-yellow-soft)' },
    { label:'Rabbit',emoji:'🐰', value:4,  color:'#EC4899',             colorSoft:'#FCE7F3' },
  ],
  [
    { label:'Bear',    emoji:'🐻', value:70, color:'#92400E', colorSoft:'#FEF3C7' },
    { label:'Chicken', emoji:'🐔', value:3,  color:'var(--milo-orange)', colorSoft:'var(--milo-orange-soft)' },
  ],
  [
    { label:'Hippo', emoji:'🦛', value:80, color:'#7C3AED', colorSoft:'var(--berry-purple-soft)' },
    { label:'Cat',   emoji:'🐱', value:5,  color:'#F472B6', colorSoft:'#FCE7F3' },
  ],
]

const OBJECT_PAIRS: [Option, Option][] = [
  [
    { label:'Snake',  emoji:'🐍', value:18, color:'var(--garden-green)', colorSoft:'var(--garden-green-soft)' },
    { label:'Worm',   emoji:'🪱', value:4,  color:'#D97706',             colorSoft:'#FEF3C7' },
  ],
  [
    { label:'Pencil', emoji:'✏️', value:16, color:'#F59E0B', colorSoft:'#FEF3C7' },
    { label:'Eraser', emoji:'🧹', value:5,  color:'#EC4899', colorSoft:'#FCE7F3' },
  ],
  [
    { label:'Train',  emoji:'🚂', value:20, color:'var(--apple-red)',  colorSoft:'var(--apple-red-soft)' },
    { label:'Car',    emoji:'🚗', value:8,  color:'var(--sky-blue)',   colorSoft:'var(--sky-blue-soft)' },
  ],
]

// ─── Build a round ───────────────────────────────────────────────
function buildRound(idx: number): Round {
  const mode = idx % 5   // 0-1 towers, 2-3 animals, 4 objects

  if (mode <= 1) {
    const pair    = TOWER_PAIRS[idx % TOWER_PAIRS.length]
    const [a, b]  = Math.random() < 0.5 ? pair : [pair[1], pair[0]]
    const taller  = a.value > b.value ? 'a' : 'b'
    const shorter = a.value < b.value ? 'a' : 'b'
    const ask     = idx % 2 === 0 ? 'taller' : 'shorter'
    return {
      type: ask as QType,
      question: ask === 'taller' ? 'Which tower is taller?' : 'Which tower is shorter?',
      unitLabel: 'blocks tall',
      a, b,
      answer: ask === 'taller' ? taller : shorter,
      miloHint: ask === 'taller'
        ? `Look up! Which one goes higher?`
        : `Look for the small one — which is lower?`,
    }
  }

  if (mode <= 3) {
    const pair   = ANIMAL_PAIRS[idx % ANIMAL_PAIRS.length]
    const [a, b] = Math.random() < 0.5 ? pair : [pair[1], pair[0]]
    const heavier = a.value > b.value ? 'a' : 'b'
    const lighter = a.value < b.value ? 'a' : 'b'
    const ask     = idx % 2 === 0 ? 'heavier' : 'lighter'
    return {
      type: ask as QType,
      question: ask === 'heavier' ? 'Which animal is heavier?' : 'Which animal is lighter?',
      unitLabel: 'kg',
      a, b,
      answer: ask === 'heavier' ? heavier : lighter,
      miloHint: ask === 'heavier'
        ? `Think big! Which one would make the scale go down more?`
        : `Think small! Which one is light as a feather?`,
    }
  }

  // objects — longer / shorter
  const pair   = OBJECT_PAIRS[idx % OBJECT_PAIRS.length]
  const [a, b] = Math.random() < 0.5 ? pair : [pair[1], pair[0]]
  const longer  = a.value > b.value ? 'a' : 'b'
  const shorter2 = a.value < b.value ? 'a' : 'b'
  const ask      = idx % 2 === 0 ? 'longer' : 'shorter_obj'
  return {
    type: ask as QType,
    question: ask === 'longer' ? 'Which one is longer?' : 'Which one is shorter?',
    unitLabel: 'cm long',
    a, b,
    answer: ask === 'longer' ? longer : shorter2,
    miloHint: ask === 'longer'
      ? `Stretch it out! Which one is longer?`
      : `Which one is shorter — the little one!`,
  }
}

const TOTAL_ROUNDS = 10
const isTowerType   = (t: QType) => t === 'taller' || t === 'shorter'
const isAnimalType  = (t: QType) => t === 'heavier' || t === 'lighter'
const isObjectType  = (t: QType) => t === 'longer'  || t === 'shorter_obj'
const isMoreType    = (t: QType) => t === 'taller'  || t === 'heavier' || t === 'longer'

// ─── Tower visual ────────────────────────────────────────────────
function Tower({ opt, blocks, selected, isAnswer, isWrong, animate }:
  { opt: Option; blocks: number; selected: boolean; isAnswer: boolean; isWrong: boolean; animate: boolean }) {
  const MAX = 10
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
      {/* Block stack */}
      <div style={{ display:'flex', flexDirection:'column-reverse', gap:3, height: MAX * 34 + (MAX-1) * 3, justifyContent:'flex-start' }}>
        {Array.from({ length: MAX }).map((_, i) => {
          const filled = i < blocks
          return (
            <div key={i} style={{
              width: 64, height: 30,
              borderRadius: 8,
              border: '3px solid var(--outline)',
              background: filled ? opt.color : 'rgba(255,255,255,.3)',
              boxShadow: filled ? '0 3px 0 rgba(61,37,22,.15)' : 'none',
              opacity: filled ? 1 : 0.25,
              transform: filled && animate ? 'scale(1)' : filled ? 'scale(1)' : 'scale(0.9)',
              transition: `background 200ms ease, transform 200ms ease ${i * 60}ms`,
            }} />
          )
        })}
      </div>
      {/* Height label */}
      <div style={{
        background: opt.colorSoft,
        border: `3px solid ${opt.color}`,
        borderRadius: 12,
        padding: '4px 12px',
        fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18,
        color: 'var(--ink)',
      }}>
        {blocks} blocks
      </div>
    </div>
  )
}

// ─── Seesaw / scale visual ───────────────────────────────────────
function Scale({ a, b, revealed }: { a: Option; b: Option; revealed: boolean }) {
  const aHeavier  = a.value > b.value
  const tiltAngle = revealed ? (aHeavier ? -18 : 18) : 0

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:0 }}>
      {/* Pans + beam */}
      <div style={{ position:'relative', width:320, height:120 }}>
        {/* Left pan string */}
        <div style={{
          position:'absolute', left:24, top:0, width:2, height:52,
          background:'var(--outline)',
          transformOrigin:'bottom center',
          transform:`rotate(${tiltAngle * 0.5}deg)`,
          transition:'transform 600ms cubic-bezier(.34,1.56,.64,1)',
        }} />
        {/* Right pan string */}
        <div style={{
          position:'absolute', right:24, top:0, width:2, height:52,
          background:'var(--outline)',
          transformOrigin:'bottom center',
          transform:`rotate(${-tiltAngle * 0.5}deg)`,
          transition:'transform 600ms cubic-bezier(.34,1.56,.64,1)',
        }} />
        {/* Beam */}
        <div style={{
          position:'absolute', left:'50%', top:48,
          width:260, height:12, marginLeft:-130,
          background:'var(--ink)', borderRadius:6,
          transform:`rotate(${tiltAngle}deg)`,
          transformOrigin:'center center',
          transition:'transform 600ms cubic-bezier(.34,1.56,.64,1)',
          boxShadow:'0 4px 0 rgba(61,37,22,.3)',
        }}>
          {/* Left pan */}
          <div style={{
            position:'absolute', left:-18, bottom:8,
            width:64, height:20,
            background:'var(--cream)', border:'3px solid var(--outline)',
            borderRadius:8,
            boxShadow:'0 4px 0 rgba(61,37,22,.15)',
          }}>
            <span style={{ fontSize:28, position:'absolute', top:-32, left:8 }}>{a.emoji}</span>
          </div>
          {/* Right pan */}
          <div style={{
            position:'absolute', right:-18, bottom:8,
            width:64, height:20,
            background:'var(--cream)', border:'3px solid var(--outline)',
            borderRadius:8,
            boxShadow:'0 4px 0 rgba(61,37,22,.15)',
          }}>
            <span style={{ fontSize:28, position:'absolute', top:-32, left:8 }}>{b.emoji}</span>
          </div>
        </div>
        {/* Stand */}
        <div style={{
          position:'absolute', left:'50%', top:54,
          width:12, height:60, marginLeft:-6,
          background:'var(--ink)', borderRadius:6,
        }} />
        <div style={{
          position:'absolute', left:'50%', top:110,
          width:80, height:12, marginLeft:-40,
          background:'var(--ink)', borderRadius:6,
        }} />
      </div>
      {revealed && (
        <div style={{
          fontFamily:'var(--font-body)', fontWeight:800, fontSize:14,
          color:'var(--ink-muted)', marginTop:4,
          animation:'slide-up 300ms ease both',
        }}>
          {a.value}kg vs {b.value}kg
        </div>
      )}
    </div>
  )
}

// ─── Ruler / length visual ───────────────────────────────────────
function LengthBar({ opt, max }: { opt: Option; max: number }) {
  const pct = (opt.value / max) * 100
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, width:'100%' }}>
      <span style={{ fontSize:36, flexShrink:0 }}>{opt.emoji}</span>
      <div style={{ flex:1, height:28, background:'rgba(255,255,255,.5)', border:'3px solid var(--outline)', borderRadius:999, overflow:'hidden' }}>
        <div style={{
          height:'100%', width:`${pct}%`,
          background: opt.color,
          borderRadius:999,
          borderRight:'3px solid var(--outline)',
          transition:'width 800ms cubic-bezier(.4,0,.2,1)',
          boxShadow:'inset 0 2px 0 rgba(255,255,255,.3)',
        }} />
      </div>
      <span style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:18, color:'var(--ink)', width:48, textAlign:'right' }}>
        {opt.value}cm
      </span>
    </div>
  )
}

// ─── Choice button ───────────────────────────────────────────────
function ChoiceBtn({ opt, chosen, isCorrect, revealed, onClick }:
  { opt: Option; chosen: boolean; isCorrect: boolean; revealed: boolean; onClick: () => void }) {
  const correct = chosen && isCorrect
  const wrong   = chosen && !isCorrect
  const showRight = revealed && isCorrect && !chosen

  return (
    <button
      onClick={onClick}
      disabled={revealed}
      style={{
        flex:1, minWidth:130, maxWidth:220,
        padding:'18px 12px',
        background: correct ? 'var(--garden-green-soft)'
          : wrong    ? 'var(--apple-red-soft)'
          : showRight ? 'var(--garden-green-soft)'
          : opt.colorSoft,
        border: `4px solid ${correct ? 'var(--garden-green)' : wrong ? 'var(--apple-red)' : showRight ? 'var(--garden-green)' : opt.color}`,
        borderRadius: 28,
        boxShadow: correct ? '0 6px 0 var(--garden-green-deep)'
          : wrong   ? '0 6px 0 var(--apple-red-deep)'
          : `0 6px 0 ${opt.color}`,
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
      {wrong   && <span style={{ fontSize:28 }}>❌</span>}
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
  const [round,     setRound]     = useState<Round>(() => buildRound(0))
  const [selected,  setSelected]  = useState<'a'|'b'|null>(null)
  const [correct,   setCorrect]   = useState(0)
  const [wrong,     setWrong]     = useState(0)
  const [feedback,  setFeedback]  = useState<'correct'|'wrong'|null>(null)
  const [scaleReveal, setScaleReveal] = useState(false)
  const timers = useRef<number[]>([])

  function clearT() { timers.current.forEach(id => window.clearTimeout(id)); timers.current = [] }

  function loadRound(idx: number) {
    clearT()
    const r = buildRound(idx)
    setRound(r)
    setSelected(null)
    setFeedback(null)
    setScaleReveal(false)

    speakAfterCurrent(idx === 0
      ? `Hi ${childName}! Let's learn about size and weight! ${r.question}`
      : r.miloHint)
  }

  useEffect(() => { loadRound(roundIdx); return clearT }, [roundIdx]) // eslint-disable-line

  function handleChoice(key: 'a'|'b') {
    if (selected) return
    clearT()
    const ok = key === round.answer
    setSelected(key)
    setFeedback(ok ? 'correct' : 'wrong')

    if (isAnimalType(round.type)) {
      const t = window.setTimeout(() => setScaleReveal(true), 400)
  
    }

    const winner = round.answer === 'a' ? round.a : round.b
    if (ok) {
      setCorrect(c => c + 1)
      speak(`Yes! The ${winner.label} is ${round.type === 'heavier' ? 'heavier' : round.type === 'lighter' ? 'lighter' : round.type === 'taller' ? 'taller' : round.type === 'shorter' ? 'shorter' : 'longer'}! Great job!`)
    } else {
      setWrong(w => w + 1)
      speak(`Not quite! The ${winner.label} was the answer. Let's try again!`)
    }

    afterSpeech(() => {
      setFeedback(null)
          const next = roundIdx + 1
          if (next >= TOTAL_ROUNDS) onComplete(ok?correct+1:correct, ok?wrong:wrong+1)
          else window.setTimeout(() => setRoundIdx(next), 300)})

  }

  const TYPE_BG: Record<QType, string> = {
    taller:      'linear-gradient(180deg, var(--sky-blue-soft) 0%, var(--bg-page) 60%)',
    shorter:     'linear-gradient(180deg, var(--sky-blue-soft) 0%, var(--bg-page) 60%)',
    heavier:     'linear-gradient(180deg, var(--apple-red-soft) 0%, var(--bg-page) 60%)',
    lighter:     'linear-gradient(180deg, var(--garden-green-soft) 0%, var(--bg-page) 60%)',
    longer:      'linear-gradient(180deg, var(--sun-yellow-soft) 0%, var(--bg-page) 60%)',
    shorter_obj: 'linear-gradient(180deg, var(--sun-yellow-soft) 0%, var(--bg-page) 60%)',
  }

  const maxVal = Math.max(round.a.value, round.b.value)

  // ── Lesson phase ────────────────────────────────────────────
  if (phase === 'lesson') {
    return (
      <ChapterLesson
        chapterId="measurement"
        childName={childName}
        examples={getLessonExamples('measurement')}
        onLessonComplete={startPractice}
      />
    )
  }

  // ── Practice phase ──────────────────────────────────────────
  return (
    <div style={{ ...S.page, background: TYPE_BG[round.type] }}>
      <SpeakingLock />
      <GameTopbar chapterName="Measurement" roundIdx={roundIdx} totalRounds={TOTAL_ROUNDS} />
      {/* Adaptive difficulty badge */}
      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
        <DifficultyBadge difficulty={ada.difficulty} isOnFire={ada.isOnFire} />
        {ada.shouldHint && (
          <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:14,
            color:'var(--sky-blue-deep)', background:'var(--sky-blue-soft)',
            border:'2px solid var(--sky-blue)', borderRadius:999, padding:'3px 12px' }}>
            💡 Take your time!
          </span>
        )}
      </div>

      {/* Milo + bubble */}
      <div style={S.miloRow}>
        <img
          src="/assets/characters/milo-happy.png" alt="Milo"
          style={{ width:92, height:92, objectFit:'contain', flexShrink:0,
            filter:'drop-shadow(0 4px 10px rgba(61,37,22,.15))' }}
          onError={e => { (e.target as HTMLImageElement).style.display='none' }}
        />
        <div className="milo-bubble" style={{ flex:1, fontSize:20 }}>
          {selected
            ? feedback === 'correct'
              ? `🎉 Correct! ${(round.answer==='a'?round.a:round.b).label} is the answer!`
              : `The ${(round.answer==='a'?round.a:round.b).label} was the right answer!`
            : round.question}
        </div>
      </div>

      {/* ── Question type badge ── */}
      <div style={{
        background: 'var(--paper)', border:'3px solid var(--outline)',
        borderRadius:'var(--r-pill)', padding:'6px 22px',
        fontFamily:'var(--font-display)', fontWeight:900, fontSize:18, color:'var(--ink)',
        boxShadow:'0 3px 0 rgba(61,37,22,.10)',
      }}>
        {round.type === 'taller'     && '📏 Height'}
        {round.type === 'shorter'    && '📏 Height'}
        {round.type === 'heavier'    && '⚖️ Weight'}
        {round.type === 'lighter'    && '⚖️ Weight'}
        {round.type === 'longer'     && '📐 Length'}
        {round.type === 'shorter_obj'&& '📐 Length'}
      </div>

      {/* ── Visual area ── */}
      <div style={S.visualArea}>
        {isTowerType(round.type) && (
          <div style={{ display:'flex', alignItems:'flex-end', gap:32, justifyContent:'center' }}>
            <Tower opt={round.a} blocks={round.a.value} selected={selected==='a'} isAnswer={round.answer==='a'} isWrong={selected==='a'&&round.answer!=='a'} animate />
            {/* VS divider */}
            <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:28,
              color:'var(--ink-muted)', marginBottom:16 }}>VS</div>
            <Tower opt={round.b} blocks={round.b.value} selected={selected==='b'} isAnswer={round.answer==='b'} isWrong={selected==='b'&&round.answer!=='b'} animate />
          </div>
        )}

        {isAnimalType(round.type) && (
          <Scale a={round.a} b={round.b} revealed={scaleReveal || !!selected} />
        )}

        {isObjectType(round.type) && (
          <div style={{ width:'100%', display:'flex', flexDirection:'column', gap:14 }}>
            <LengthBar opt={round.a} max={maxVal * 1.1} />
            <LengthBar opt={round.b} max={maxVal * 1.1} />
          </div>
        )}
      </div>

      {/* ── Choice buttons ── */}
      <div style={S.choicesRow}>
        <ChoiceBtn opt={round.a} chosen={selected==='a'} isCorrect={round.answer==='a'} revealed={!!selected} onClick={() => handleChoice('a')} />
        <ChoiceBtn opt={round.b} chosen={selected==='b'} isCorrect={round.answer==='b'} revealed={!!selected} onClick={() => handleChoice('b')} />
      </div>

      {/* Feedback flash */}
      {feedback && (
        <div style={{
          position:'fixed', top:'38%', left:'50%', transform:'translate(-50%,-50%)',
          background: feedback==='correct' ? 'var(--garden-green)' : 'var(--apple-red)',
          color:'#fff', fontFamily:'var(--font-display)', fontWeight:900, fontSize:38,
          padding:'18px 44px', borderRadius:28, border:'4px solid var(--outline)',
          boxShadow:'0 8px 0 rgba(61,37,22,.2)', zIndex:50, textAlign:'center',
          animation:'modal-in 280ms cubic-bezier(.34,1.56,.64,1) both',
        }}>
          {feedback==='correct' ? '✅ That\'s right!' : '❌ Not quite!'}
        </div>
      )}

      <p style={S.roundLabel}>Round {Math.min(roundIdx+1,TOTAL_ROUNDS)} of {TOTAL_ROUNDS}</p>
    </div>
  )
}

const S: Record<string,React.CSSProperties> = {
  page: {
    minHeight:'100dvh', display:'flex', flexDirection:'column',
    alignItems:'center', padding:'72px 24px 32px', gap:18, position:'relative',
  },
  miloRow: {
    display:'flex', alignItems:'flex-end', gap:16, width:'100%', maxWidth:580,
  },
  visualArea: {
    width:'100%', maxWidth:600,
    background:'rgba(255,255,255,0.65)',
    border:'4px solid var(--outline)', borderRadius:28,
    padding:'24px 28px',
    boxShadow:'0 6px 0 rgba(61,37,22,.08)',
    display:'flex', alignItems:'center', justifyContent:'center',
    minHeight:220,
    animation:'slide-up 300ms cubic-bezier(.4,0,.2,1) both',
  },
  choicesRow: {
    display:'flex', gap:16, justifyContent:'center',
    width:'100%', maxWidth:520, flexWrap:'wrap',
  },
  roundLabel: {
    fontFamily:'var(--font-body)', fontSize:'var(--t-label)',
    color:'var(--ink-muted)', margin:0,
  },
}