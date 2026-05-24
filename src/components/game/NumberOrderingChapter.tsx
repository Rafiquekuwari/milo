'use client'
import { useState, useEffect } from 'react'
import { useMiloSpeaker, afterSpeech, speakAfterCurrent } from '@/lib/useMiloSpeaker'
import { MiloProgressBar } from '@/components/ui/MiloUI'
import { useAdaptive, seqStart, seqLength } from '@/lib/adaptive'
import { DifficultyBadge } from '../ui/DifficultyBadge'
import ChapterLesson from '@/components/ui/ChapterLesson'
import { getLessonExamples } from '@/lib/lessons'
import { useChapterPhase } from '@/lib/useChapterPhase'
import SpeakingLock from '@/components/ui/SpeakingLock'
import GameTopbar from '../ui/GameTopbar'

interface Props { onComplete:(c:number,w:number)=>void; childName:string }

type QType = 'tapInOrder'|'fillMissing'|'whatComesNext'

interface Round {
  type: QType; sequence: number[]
  missingIndex?: number; choices: number[]; answer: number
}

function buildRound(idx: number, diff: number): Round {
  const type: QType = idx<2?'tapInOrder':idx<4?'fillMissing':'whatComesNext'
  const start = seqStart(diff as 1|2|3)
  const len   = seqLength(diff as 1|2|3)

  if (type === 'tapInOrder') {
    const seq = Array.from({length:len},(_,i)=>start+i)
    return { type, sequence:seq, choices:[], answer:0 }
  }
  if (type === 'fillMissing') {
    const seq = Array.from({length:5},(_,i)=>start+i)
    const mi  = Math.floor(Math.random()*3)+1
    const ans = seq[mi]
    const choices = [ans, ans+Math.floor(Math.random()*2)+1, Math.max(1,ans-Math.floor(Math.random()*2)-1)].sort(()=>Math.random()-.5)
    return { type, sequence:seq, missingIndex:mi, choices, answer:ans }
  }
  const seq = Array.from({length:5},(_,i)=>start+i)
  const ans = seq[4]
  const choices = [ans, ans+2, Math.max(1,ans-2)].sort(()=>Math.random()-.5)
  return { type, sequence:seq, choices, answer:ans }
}

const TOTAL_ROUNDS = 10

export default function NumberOrderingChapter({ onComplete, childName }: Props) {
  const { speak } = useMiloSpeaker()
  const ada = useAdaptive('numberOrdering')
  const { phase, startPractice } = useChapterPhase()
  const [roundIdx, setRoundIdx] = useState(0)
  const [round, setRound]       = useState<Round>(()=>buildRound(0,1))
  const [tapped, setTapped]     = useState<number[]>([])
  const [answered, setAnswered] = useState(false)
  const [correct, setCorrect]   = useState(0)
  const [wrong, setWrong]       = useState(0)
  const [feedback, setFeedback] = useState<'correct'|'wrong'|null>(null)
  // Must be before any early return — hooks must always be called in same order
  const [shuffled] = useState(() => [...Array(6).keys()].sort(()=>Math.random()-.5))

  useEffect(() => {
    const r = buildRound(roundIdx % 5, ada.difficulty)
    setRound(r); setTapped([]); setAnswered(false)
    window.setTimeout(() => {
      if (r.type === 'tapInOrder') speakAfterCurrent(roundIdx===0?`Let's put numbers in order! Tap from smallest to biggest!`:`Tap the numbers in order!`)
      else if (r.type === 'fillMissing') speakAfterCurrent(`Which number is missing?`)
      else speakAfterCurrent(`What number comes next?`)
    }, 300)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIdx, ada.difficulty])

  if (phase === 'lesson') return (
    <ChapterLesson chapterId="numberOrdering" childName={childName}
      examples={getLessonExamples('numberOrdering')} onLessonComplete={startPractice} />
  )

  function advance(ok: boolean) {
    afterSpeech(() => {
          setFeedback(null)
              const next = roundIdx + 1
              if (next >= TOTAL_ROUNDS) onComplete(ok?correct+1:correct, ok?wrong:wrong+1)
              else window.setTimeout(() => setRoundIdx(next), 300)})
  }

  function handleTapOrder(num: number, ni: number) {
    if (answered || tapped.includes(ni)) return
    if (round.sequence[tapped.length] === num) {
      const next = [...tapped, ni]; setTapped(next); speak(String(num))
      if (next.length === round.sequence.length) {
        setAnswered(true); setCorrect(c=>c+1); setFeedback('correct')
        ada.record(true); speak(`Perfect! ${ada.praise}`); advance(true)
      }
    } else {
      setWrong(w=>w+1); ada.record(false); setFeedback('wrong')
      speak(`Oops! Next is ${round.sequence[tapped.length]}`)
      window.setTimeout(()=>setFeedback(null), 900)
    }
  }

  function handleChoice(choice: number) {
    if (answered) return
    setAnswered(true)
    const ok = choice === round.answer
    setFeedback(ok?'correct':'wrong')
    ada.record(ok)
    if (ok) { setCorrect(c=>c+1); speak(`Yes! ${round.answer}! ${ada.praise}`) }
    else    { setWrong(w=>w+1);   speak(`The answer is ${round.answer}. ${ada.encouragement}`) }
    advance(ok)
  }

  const displaySeq = round.type==='fillMissing'
    ? round.sequence.map((n,i)=>i===round.missingIndex?'?':n)
    : round.type==='whatComesNext'
    ? [...round.sequence.slice(0,4),'?']
    : round.sequence.map((_,i)=>tapped.length>i?round.sequence[i]:'_')

  return (
    <div style={S.page}>
      <MiloProgressBar current={roundIdx} total={TOTAL_ROUNDS} />
      <SpeakingLock />
      <GameTopbar chapterName="Number Order" roundIdx={roundIdx} totalRounds={TOTAL_ROUNDS} />
      <div style={{display:'flex',gap:8,alignItems:'center'}}>
        <DifficultyBadge difficulty={ada.difficulty} isOnFire={ada.isOnFire} />
        {ada.shouldHint&&<span style={S.hint}>💡 Take your time!</span>}
      </div>
      <div style={S.miloRow}>
        <img src="/assets/characters/milo-happy.png" alt="Milo" style={S.milo}
          onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
        <div className="milo-bubble" style={{flex:1,fontSize:20}}>
          {round.type==='tapInOrder'?'Tap 1, 2, 3… in order!'
          :round.type==='fillMissing'?'Which number is missing?'
          :'What comes next?'}
        </div>
      </div>

      {/* Sequence track */}
      <div style={S.track}>
        {displaySeq.map((n,i) => (
          <div key={i} style={{
            ...S.slot,
            background: n==='?'?'var(--sun-yellow-soft)':n==='_'?'rgba(255,255,255,.4)':'var(--paper)',
            borderColor: n==='?'?'var(--sun-yellow-deep)':n==='_'?'var(--ink-muted)':'var(--outline)',
            borderStyle: n==='_'?'dashed':'solid',
            color: n==='?'?'var(--sun-yellow-deep)':'var(--ink)',
          }}>{n}</div>
        ))}
      </div>

      {/* Tap grid */}
      {round.type==='tapInOrder'&&(
        <div style={S.tapGrid}>
          {round.sequence
            .map((n,i)=>({n,i}))
            .sort(()=>Math.random()-.5)
            .map(({n,i})=>(
              <button key={i} className={`milo-btn ${tapped.includes(i)?'tone-green':'tone-cream'}`}
                onClick={()=>handleTapOrder(n,i)} disabled={answered||tapped.includes(i)}
                style={{width:72,height:72,fontSize:30,borderRadius:18,opacity:tapped.includes(i)?.4:1}}>
                {n}
              </button>
            ))}
        </div>
      )}

      {/* Choice buttons */}
      {round.type!=='tapInOrder'&&(
        <div style={S.choiceRow}>
          {round.choices.map(c=>(
            <button key={c} className="milo-btn tone-blue" onClick={()=>handleChoice(c)} disabled={answered}
              style={{width:88,height:88,fontSize:38,borderRadius:22}}>
              {c}
            </button>
          ))}
        </div>
      )}

      {feedback&&<div style={{...S.flash,background:feedback==='correct'?'var(--garden-green)':'var(--apple-red)'}}>
        {feedback==='correct'?'✅ Correct!':'❌ Try again!'}
      </div>}
      <p style={S.label}>Round {Math.min(roundIdx+1,TOTAL_ROUNDS)} of {TOTAL_ROUNDS}</p>
    </div>
  )
}

const S:Record<string,React.CSSProperties>={
  page:{minHeight:'100dvh',display:'flex',flexDirection:'column',alignItems:'center',padding:'72px 24px 32px',gap:20,position:'relative',background:'linear-gradient(180deg,var(--sky-blue-soft) 0%,var(--bg-page) 55%)'},
  hint:{fontFamily:'var(--font-display)',fontWeight:700,fontSize:14,color:'var(--sky-blue-deep)',background:'var(--sky-blue-soft)',border:'2px solid var(--sky-blue)',borderRadius:999,padding:'3px 12px'},
  miloRow:{display:'flex',alignItems:'flex-end',gap:16,width:'100%',maxWidth:540},
  milo:{width:92,height:92,objectFit:'contain',flexShrink:0},
  track:{display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap'},
  slot:{width:56,height:64,borderRadius:14,border:'3px solid',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--font-display)',fontSize:32,fontWeight:900,color:'var(--ink)',transition:'background .2s'},
  tapGrid:{display:'flex',flexWrap:'wrap',gap:10,justifyContent:'center',maxWidth:320},
  choiceRow:{display:'flex',gap:18,justifyContent:'center'},
  flash:{position:'fixed',top:'38%',left:'50%',transform:'translate(-50%,-50%)',color:'#fff',fontFamily:'var(--font-display)',fontWeight:900,fontSize:36,padding:'18px 44px',borderRadius:28,border:'4px solid var(--outline)',boxShadow:'0 8px 0 rgba(61,37,22,.2)',zIndex:50,textAlign:'center',animation:'modal-in 280ms cubic-bezier(.34,1.56,.64,1) both'},
  label:{fontFamily:'var(--font-body)',fontSize:'var(--t-label)',color:'var(--ink-muted)',margin:0},
}
