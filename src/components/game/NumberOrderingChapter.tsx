'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { useMiloSpeaker, afterSpeech, speakAfterCurrent, speakAt } from '@/lib/useMiloSpeaker'
import { MiloProgressBar } from '@/components/ui/MiloUI'
import { useAdaptive, seqStart, seqLength } from '@/lib/adaptive'
import { DifficultyBadge } from '../ui/DifficultyBadge'
import { useChapterPhase } from '@/lib/useChapterPhase'
import SpeakingLock from '@/components/ui/SpeakingLock'
import GameTopbar from '../ui/GameTopbar'
import NumberOrderingLesson, { OrderReveal, ChooseOrder, CSS as ORDER_CSS } from '../lessons/NumberOrderingLesson'

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
  const [selected, setSelected] = useState<number|null>(null)
  const [correct, setCorrect]   = useState(0)
  const [wrong, setWrong]       = useState(0)
  const [feedback, setFeedback] = useState<'correct'|'wrong'|null>(null)
  // Adaptive remediation: after 3 wrong in a row, re-teach the order then check.
  const [wrongRun, setWrongRun] = useState(0)
  const [reMed, setReMed] = useState<{phase:'reteach'|'check';seq:number[];hole:number;kind:'next'|'missing'}|null>(null)
  const answerRef = useRef<HTMLElement|null>(null)   // the correct choice (for the pointer)
  // Shuffle the tap-grid tiles ONCE per round. Doing this inline in render
  // reshuffled the tiles on every re-render (speech, feedback, pointer), making
  // the numbers appear to randomly jump around. Keyed on `round` so it's stable
  // for the whole round and only reshuffles when a new round is built.
  const tapTiles = useMemo(
    () => round.sequence.map((n,i)=>({n,i})).sort(()=>Math.random()-.5),
    [round],
  )

  useEffect(() => {
    if (phase !== 'practice') return   // don't build/speak a round over the lesson
    const r = buildRound(roundIdx % 5, ada.difficulty)
    setRound(r); setTapped([]); setAnswered(false); setSelected(null)
    window.setTimeout(() => {
      if (r.type === 'tapInOrder') speakAfterCurrent(roundIdx===0?`Let's put numbers in order! Tap from smallest to biggest!`:`Tap the numbers in order!`)
      else if (r.type === 'fillMissing') speakAfterCurrent(`Which number is missing?`)
      else speakAfterCurrent(`What number comes next?`)
    }, 300)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIdx, ada.difficulty, phase])

  if (phase === 'lesson') return (
    <NumberOrderingLesson childName={childName} onLessonComplete={startPractice} />
  )

  function advance(ok: boolean) {
    afterSpeech(() => {
          setFeedback(null)
              const next = roundIdx + 1
              if (next >= TOTAL_ROUNDS) onComplete(ok?correct+1:correct, ok?wrong:wrong+1)
              else window.setTimeout(() => setRoundIdx(next), 300)})
  }

  function finishReMed(){
    setReMed(null); setWrongRun(0)
    if (roundIdx + 1 >= TOTAL_ROUNDS) onComplete(correct, wrong)
    else setRoundIdx(roundIdx + 1)
  }

  function handleTapOrder(num: number, ni: number) {
    if (answered || tapped.includes(ni)) return
    if (round.sequence[tapped.length] === num) {
      const next = [...tapped, ni]; setTapped(next); speak(String(num))
      if (next.length === round.sequence.length) {
        setAnswered(true); setCorrect(c=>c+1); setFeedback('correct'); setWrongRun(0)
        ada.record(true); speak(`Perfect! ${ada.praise}`); advance(true)
      }
    } else {
      setWrong(w=>w+1); ada.record(false); setFeedback('wrong')
      speak(`Almost! Next is ${round.sequence[tapped.length]}`)
      window.setTimeout(()=>setFeedback(null), 900)
    }
  }

  function handleChoice(choice: number) {
    if (answered) return
    setAnswered(true); setSelected(choice)
    const ok = choice === round.answer
    setFeedback(ok?'correct':'wrong')
    ada.record(ok)
    const newRun = ok ? 0 : wrongRun + 1
    setWrongRun(newRun)
    if (ok) { setCorrect(c=>c+1); speakAt(`Yes! ${round.answer}! ${ada.praise}`, answerRef.current) }
    else    { setWrong(w=>w+1);   speakAt(`The answer is ${round.answer}. ${ada.encouragement}`, answerRef.current) }
    // 3 wrong in a row → re-teach the order, then check
    if (!ok && newRun >= 3) {
      const hole = round.type==='fillMissing' ? (round.missingIndex ?? 2) : round.sequence.length-1
      afterSpeech(() => { setFeedback(null); setReMed({ phase:'reteach', seq:round.sequence, hole, kind: round.type==='fillMissing'?'missing':'next' }) })
      return
    }
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
          {round.type==='tapInOrder'?'Tap them in order — smallest first!'
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
          {tapTiles
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
          {round.choices.map(c=>{
            const isSel = selected===c, isOk = c===round.answer
            return (
              <button key={c} onClick={()=>handleChoice(c)} disabled={answered}
                ref={isOk ? (el)=>{answerRef.current=el} : undefined}
                style={{
                  width:88,height:88,fontSize:38,borderRadius:22,
                  background:(answered&&isOk)?'var(--garden-green-soft)':'var(--paper)',
                  border:`4px solid ${(answered&&isOk)?'var(--garden-green)':isSel?'var(--ink-muted)':'var(--outline)'}`,
                  boxShadow:`0 6px 0 ${(answered&&isOk)?'var(--garden-green-deep)':'#c8ac79'}`,
                  fontFamily:'var(--font-display)',fontWeight:900,color:'var(--ink)',
                  cursor:answered?'default':'pointer',
                  transform:((answered&&isOk)||isSel)?'scale(1.08) translateY(-4px)':'scale(1)',
                  transition:'transform 160ms cubic-bezier(.34,1.56,.64,1),background 160ms ease',
                }}>
                {c}
              </button>
            )
          })}
        </div>
      )}

      {feedback&&<div style={{...S.flash,background:feedback==='correct'?'var(--garden-green)':'var(--milo-orange)'}}>
        {feedback==='correct'?'✅ Correct!':"Let's look together! 🙂"}
      </div>}
      <p style={S.label}>Round {Math.min(roundIdx+1,TOTAL_ROUNDS)} of {TOTAL_ROUNDS}</p>

      {reMed?.phase==='reteach' && (
        <OrderRemediationOverlay>
          <OrderReveal seq={reMed.seq} hole={reMed.hole} kind={reMed.kind}
            onDone={()=>setReMed({phase:'check',seq:[1,2,3,4],hole:3,kind:'next'})}/>
        </OrderRemediationOverlay>
      )}
      {reMed?.phase==='check' && (
        <OrderRemediationOverlay>
          <ChooseOrder seq={reMed.seq} hole={reMed.hole} kind={reMed.kind} choices={[3,4,5]}
            prompt="Now you try! What comes next?" onDone={finishReMed}/>
        </OrderRemediationOverlay>
      )}
    </div>
  )
}

// Overlay wrapper for the re-teach / check (carries the lesson's animation CSS).
function OrderRemediationOverlay({children}:{children:React.ReactNode}){
  return (
    <div style={{position:'fixed',inset:0,zIndex:200,background:'rgba(61,37,22,0.7)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <style>{ORDER_CSS}</style>
      <div style={{background:'var(--paper)',border:'4px solid var(--outline)',borderRadius:24,padding:'22px 14px 26px',maxWidth:480,width:'100%',boxShadow:'0 8px 0 rgba(61,37,22,.2)',maxHeight:'94vh',overflowY:'auto'}}>
        {children}
      </div>
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
