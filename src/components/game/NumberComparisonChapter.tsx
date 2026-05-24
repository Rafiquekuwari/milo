'use client'

import { useState, useEffect } from 'react'
import { useMiloSpeaker, afterSpeech, speakAfterCurrent } from '@/lib/useMiloSpeaker'
import { useAdaptive } from '@/lib/adaptive'

import ChapterLesson from '@/components/ui/ChapterLesson'
import { getLessonExamples } from '@/lib/lessons'
import { useChapterPhase } from '@/lib/useChapterPhase'
import SpeakingLock from '@/components/ui/SpeakingLock'
import GameTopbar from '../ui/GameTopbar'

import { DifficultyBadge } from '../ui/DifficultyBadge'
interface Props {
  onComplete: (correct: number, wrong: number) => void
  childName: string
}

type Key = 'a' | 'b' | 'c'
interface Round { a: number; b: number; c?: number; answer: Key; question: string }

function buildRound(idx: number): Round {
  const max = idx < 2 ? 6 : idx < 4 ? 9 : 10
  const a = Math.floor(Math.random() * max) + 1
  let b = Math.floor(Math.random() * max) + 1
  while (b === a) b = Math.floor(Math.random() * max) + 1

  if (idx < 4) {
    return { a, b, answer: a > b ? 'a' : 'b', question: idx < 2 ? 'Which number is bigger?' : 'Which group has more?' }
  }
  let c = Math.floor(Math.random() * max) + 1
  while (c === a || c === b) c = Math.floor(Math.random() * max) + 1
  const vals = [a, b, c]; const mx = Math.max(...vals)
  return { a, b, c, answer: vals[0]===mx?'a':vals[1]===mx?'b':'c', question: 'Which has the most?' }
}

const TOTAL_ROUNDS = 10
const EMOJIS = ['🌟','🍓','🐸','🎈','🦋']

export default function NumberComparisonChapter({ onComplete, childName }: Props) {
  const { phase, startPractice } = useChapterPhase()
  const { speak } = useMiloSpeaker()
  const ada = useAdaptive('numberComparison')
  const [roundIdx, setRoundIdx] = useState(0)
  const [round, setRound]       = useState<Round>(() => buildRound(0))
  const [selected, setSelected] = useState<Key|null>(null)
  const [correct, setCorrect]   = useState(0)
  const [wrong, setWrong]       = useState(0)
  const [feedback, setFeedback] = useState<'correct'|'wrong'|null>(null)
  const [emoji]                 = useState(EMOJIS[Math.floor(Math.random()*EMOJIS.length)])

  useEffect(() => {
    const r = buildRound(roundIdx)
    setRound(r); setSelected(null)
    window.setTimeout(() => { speakAfterCurrent(roundIdx === 0 ? `Hi ${childName}! ${r.question}` : r.question) }, 300)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIdx])

  function handleSelect(key: Key) {
    if (selected) return
    setSelected(key)
    const ok = key === round.answer
    setFeedback(ok ? 'correct' : 'wrong')
    const val = key==='a'?round.a:key==='b'?round.b:round.c!
    const correctVal = round.answer==='a'?round.a:round.answer==='b'?round.b:round.c!
    if (ok) { setCorrect(c=>c+1); speak(`Yes! ${val} is more! Great job!`) }
    else    { setWrong(w=>w+1);   speak(`Oops! ${correctVal} is the most!`) }
    afterSpeech(() => {
          setFeedback(null)
              const next = roundIdx + 1
              if (next >= TOTAL_ROUNDS) onComplete(ok?correct+1:correct, ok?wrong:wrong+1)
              else window.setTimeout(() => setRoundIdx(next), 300)})
  }

  const options: { key: Key; val: number }[] = [
    { key:'a', val:round.a }, { key:'b', val:round.b },
    ...(round.c !== undefined ? [{ key:'c' as Key, val:round.c }] : []),
  ]

  // ── Lesson phase (5 interactive examples) ──────────────────
  if (phase === 'lesson') {
    return (
      <ChapterLesson
        chapterId="numberComparison"
        childName={childName}
        examples={getLessonExamples('numberComparison')}
        onLessonComplete={startPractice}
      />
    )
  }

  // ── Practice phase (10 questions with adaptive engine) ─────
  return (
    <div style={S.page}>
      <SpeakingLock />
      <GameTopbar chapterName="Bigger or Smaller" roundIdx={roundIdx} totalRounds={TOTAL_ROUNDS} />
      <div style={{position:'fixed',top:0,left:0,right:0,height:8,background:'rgba(0,0,0,0.08)',zIndex:5}}>
        <div style={{height:'100%',width:`${(roundIdx/TOTAL_ROUNDS)*100}%`,background:'var(--garden-green)',borderRadius:'0 4px 4px 0',transition:'width 0.4s ease'}} />
      </div>
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
      <div className="milo-bubble" style={{ width:'100%', maxWidth:480 }}>{round.question}</div>

      <div style={S.cardsRow}>
        {options.map(({ key, val }) => {
          const isSel = selected === key
          const isOk  = round.answer === key
          return (
            <button key={key} onClick={() => handleSelect(key)} disabled={!!selected} style={{
              ...S.card,
              background: isSel ? (isOk ? 'var(--garden-green-soft)' : 'var(--apple-red-soft)') : 'var(--paper)',
              borderColor: isSel ? (isOk ? 'var(--garden-green)' : 'var(--apple-red)') : 'var(--outline)',
              transform: isSel ? 'scale(1.05)' : 'scale(1)',
            }}>
              <span style={{ fontFamily:'var(--font-display)', fontSize:64, fontWeight:700, color:'var(--ink)', lineHeight:1 }}>{val}</span>
              <div style={S.emojiGrid}>
                {Array.from({ length: Math.min(val, 9) }).map((_, i) => <span key={i} style={{ fontSize:26 }}>{emoji}</span>)}
              </div>
              {isSel && <span style={{ position:'absolute', top:-12, right:-12, fontSize:28 }}>{isOk?'✅':'❌'}</span>}
            </button>
          )
        })}
      </div>

      {feedback && <div style={{position:'fixed',top:'38%',left:'50%',transform:'translate(-50%,-50%)',color:'#fff',fontFamily:'var(--font-display)',fontWeight:900,fontSize:'var(--t-h1)',padding:'20px 40px',borderRadius:24,border:'4px solid var(--outline)',boxShadow:'0 8px 0 rgba(61,37,22,.2)',zIndex:50,textAlign:'center',animation:'modal-in 280ms cubic-bezier(.34,1.56,.64,1) both',background:feedback==='correct'?'var(--garden-green)':'var(--apple-red)'}}>
        {feedback==='correct'?'✅ Correct!':'❌ Try again!'}
      </div>}
      <p style={S.label}>Round {Math.min(roundIdx+1, TOTAL_ROUNDS)} of {TOTAL_ROUNDS}</p>
    </div>
  )
}

const S: Record<string, React.CSSProperties> = {
  page:     { minHeight:'100dvh', display:'flex', flexDirection:'column', alignItems:'center', padding:'72px 24px 32px', gap:24, position:'relative' },
  cardsRow: { display:'flex', gap:16, justifyContent:'center', flexWrap:'wrap', width:'100%', maxWidth:520 },
  card:     { flex:'1 1 140px', maxWidth:160, minHeight:200, borderRadius:20, border:'4px solid', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-start', padding:'16px 12px', gap:8, position:'relative', boxShadow:'0 5px 0 var(--outline)', transition:'transform .15s, background .15s' },
  emojiGrid:{ display:'flex', flexWrap:'wrap', gap:4, justifyContent:'center', maxHeight:100, overflow:'hidden' },
  label:    { fontFamily:'var(--font-body)', fontSize:'var(--t-label)', color:'var(--ink-muted)', margin:0 },
}
