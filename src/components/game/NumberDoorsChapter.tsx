'use client'
import { useState, useEffect, useRef } from 'react'
import { useMiloSpeaker, afterSpeech, speakAfterCurrent, speak, speakSeq } from '@/lib/useMiloSpeaker'
import { MiloProgressBar } from '@/components/ui/MiloUI'
import { useAdaptive } from '@/lib/adaptive'
import { DifficultyBadge } from '../ui/DifficultyBadge'
import { useChapterPhase } from '@/lib/useChapterPhase'
import SpeakingLock from '@/components/ui/SpeakingLock'
import GameTopbar from '../ui/GameTopbar'
import NumberDoorsLesson from '../lessons/NumberDoorsLesson'

interface Props { onComplete:(c:number,w:number)=>void; childName:string }

const DOOR_COLORS = [
  { bg:'var(--milo-orange-soft)',  border:'var(--milo-orange)',  shadow:'var(--milo-orange-deep)' },
  { bg:'var(--sky-blue-soft)',     border:'var(--sky-blue)',     shadow:'var(--sky-blue-deep)' },
  { bg:'var(--garden-green-soft)', border:'var(--garden-green)', shadow:'var(--garden-green-deep)' },
  { bg:'var(--apple-red-soft)',    border:'var(--apple-red)',    shadow:'var(--apple-red-deep)' },
]

function buildRound(diff: number) {
  const max = diff === 1 ? 5 : diff === 2 ? 8 : 10
  const correct = Math.floor(Math.random()*max)+1
  const opts = new Set<number>([correct])
  while(opts.size<3){ const v=Math.floor(Math.random()*max)+1; opts.add(v) }
  return { correct, doors:[...opts].sort(()=>Math.random()-.5) }
}

const TOTAL_ROUNDS = 10

export default function NumberDoorsChapter({ onComplete, childName }: Props) {
  const { speak } = useMiloSpeaker()
  const ada = useAdaptive('numberRecognition')
  const { phase, startPractice } = useChapterPhase()
  const [roundIdx, setRoundIdx] = useState(0)
  const [round, setRound] = useState(()=>buildRound(1))
  const [selected, setSelected] = useState<number|null>(null)
  const [correct, setCorrect] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [feedback, setFeedback] = useState<'correct'|'wrong'|null>(null)
  // Adaptive remediation: after 3 wrong in a row, re-teach the number, then check.
  const [wrongRun, setWrongRun] = useState(0)
  const [reMed, setReMed] = useState<{phase:'reteach'|'check'; target:number}|null>(null)

  useEffect(() => {
    const r = buildRound(ada.difficulty)
    setRound(r); setSelected(null)
    window.setTimeout(() => speakAfterCurrent(
      roundIdx === 0
        ? `Hi ${childName}! Find the door with the number ${r.correct}!`
        : ada.shouldHint
        ? `Look carefully — which door shows the number ${r.correct}?`
        : `Which door has the number ${r.correct}?`
    ), 300)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIdx, ada.difficulty])

  if (phase === 'lesson') return (
    <NumberDoorsLesson childName={childName} onLessonComplete={startPractice} />
  )

  function handleDoor(num: number) {
    if (selected !== null) return
    setSelected(num)
    const ok = num === round.correct
    setFeedback(ok ? 'correct' : 'wrong')
    ada.record(ok)
    const newRun = ok ? 0 : wrongRun + 1
    setWrongRun(newRun)
    if (ok) { setCorrect(c=>c+1); speak(`Yes! Number ${round.correct}! ${ada.praise}`) }
    else    { setWrong(w=>w+1);   speak(`Door ${round.correct} was right! ${ada.encouragement}`) }
    afterSpeech(() => {
          setFeedback(null)
          // 3 wrong in a row → re-teach the number, then check
          if (!ok && newRun >= 3) { setReMed({ phase:'reteach', target: round.correct }); return }
          const next = roundIdx + 1
          if (next >= TOTAL_ROUNDS) onComplete(ok?correct+1:correct, ok?wrong:wrong+1)
          else window.setTimeout(() => setRoundIdx(next), 300)})
  }

  function finishReMed() {
    setReMed(null); setWrongRun(0)
    const next = roundIdx + 1
    if (next >= TOTAL_ROUNDS) onComplete(correct, wrong)
    else setRoundIdx(next)
  }

  return (
    <div style={S.page}>
      <MiloProgressBar current={roundIdx} total={TOTAL_ROUNDS} />
      <SpeakingLock />
      <GameTopbar chapterName="Number Doors" roundIdx={roundIdx} totalRounds={TOTAL_ROUNDS} />
      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
        <DifficultyBadge difficulty={ada.difficulty} isOnFire={ada.isOnFire} />
        {ada.shouldHint && <span style={S.hint}>💡 Look at the number shape!</span>}
      </div>
      <div style={S.miloRow}>
        <img src="/assets/characters/milo-happy.png" alt="Milo" style={S.milo}
          onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
        <div className="milo-bubble" style={{flex:1,fontSize:20}}>
          Find the door Milo says! 🔊
        </div>
      </div>
      <div style={S.doorsRow}>
        {round.doors.map((num,i) => {
          const col = DOOR_COLORS[i%DOOR_COLORS.length]
          const isSel = selected===num; const isOk=num===round.correct
          return (
            <button key={num} onClick={()=>handleDoor(num)} disabled={selected!==null} style={{
              ...S.door,
              background:isSel?(isOk?'var(--garden-green-soft)':'var(--apple-red-soft)'):col.bg,
              borderColor:isSel?(isOk?'var(--garden-green)':'var(--apple-red)'):col.border,
              boxShadow:`0 6px 0 ${isSel?(isOk?'var(--garden-green-deep)':'var(--apple-red-deep)'):col.shadow}`,
              transform:isSel?'scale(1.08) translateY(-4px)':'scale(1)',
            }}>
              <span style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:64,color:'var(--ink)',lineHeight:1}}>{num}</span>
              <div style={{width:12,height:12,borderRadius:'50%',background:'var(--outline)',marginTop:16}}/>
              {isSel&&<span style={{position:'absolute',top:-16,left:'50%',transform:'translateX(-50%)',fontSize:32}}>{isOk?'✅':'❌'}</span>}
            </button>
          )
        })}
      </div>
      <button
        onClick={()=>speak(`Find the door with the number ${round.correct}!`)}
        disabled={selected!==null}
        style={S.replayBtn}
      >
        🔊 Hear it again
      </button>
      {feedback && (
        <div style={{...S.flash, background: feedback==='correct' ? 'var(--garden-green)' : 'var(--apple-red)'}}>
          {feedback==='correct' ? `🎉 Correct!` : `It was ${round.correct}`}
        </div>
      )}
      <p style={S.label}>Round {Math.min(roundIdx+1,TOTAL_ROUNDS)} of {TOTAL_ROUNDS}</p>

      {reMed?.phase==='reteach' && (
        <DoorRemediationOverlay>
          <WatchNumber target={reMed.target} onDone={()=>setReMed({phase:'check',target:reMed.target})}/>
        </DoorRemediationOverlay>
      )}
      {reMed?.phase==='check' && (
        <DoorRemediationOverlay>
          <CheckNumber target={reMed.target} onDone={finishReMed}/>
        </DoorRemediationOverlay>
      )}
    </div>
  )
}

// ─── Re-teach overlay (shown after 3 wrong in a row) ──────────────
function DoorRemediationOverlay({children}:{children:React.ReactNode}){
  return (
    <div style={{position:'fixed',inset:0,zIndex:200,background:'rgba(61,37,22,0.7)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{background:'var(--paper)',border:'4px solid var(--outline)',borderRadius:28,padding:'24px 22px 28px',maxWidth:420,width:'100%',textAlign:'center',boxShadow:'0 8px 0 rgba(61,37,22,.2)',maxHeight:'92vh',overflowY:'auto'}}>
        {children}
      </div>
    </div>
  )
}

// WATCH — show the missed number big and name it (robust against blocked audio).
function WatchNumber({target,onDone}:{target:number;onDone:()=>void}){
  const [shown,setShown]=useState(false)
  const ran=useRef(false)
  useEffect(()=>{
    if(ran.current)return; ran.current=true
    const lines=[`Let's look at this number again.`, `This is the number ${target}!`, `${target}. Now you try!`]
    let started=false, finished=false
    const cl:Array<()=>void>=[]
    const at=(fn:()=>void,ms:number)=>{ const id=window.setTimeout(fn,ms); cl.push(()=>window.clearTimeout(id)) }
    at(()=>setShown(true),150)
    const complete=()=>{ if(finished)return; finished=true; at(onDone,800) }
    const cancel=speakSeq(lines,{onWord:()=>{started=true},onDone:complete}); cl.push(cancel)
    at(()=>{ if(started||finished)return; cancel(); at(()=>speak(lines[0]),0); at(()=>{setShown(true);speak(`This is the number ${target}!`)},2000); at(()=>{speak('Now you try!');complete()},3800) },1900)
    return ()=>cl.forEach(f=>f())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[])
  return (
    <>
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginBottom:8}}>
        <img src="/assets/characters/milo-thinking.png" alt="Milo" style={{width:48,height:48,objectFit:'contain'}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
        <h3 style={{fontFamily:'var(--font-display)',fontSize:20,margin:0,color:'var(--milo-orange)'}}>Let's look again!</h3>
      </div>
      <div style={{height:150,display:'flex',alignItems:'center',justifyContent:'center'}}>
        {shown && <div style={{width:120,height:150,borderRadius:'16px 16px 4px 4px',border:'5px solid var(--milo-orange)',background:'var(--milo-orange-soft)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 6px 0 var(--milo-orange-deep)',animation:'modal-in 400ms cubic-bezier(.34,1.56,.64,1) both'}}>
          <span style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:84,color:'var(--ink)',lineHeight:1}}>{target}</span>
        </div>}
      </div>
    </>
  )
}

// CHECK — child picks the number from two doors (retry on wrong).
function CheckNumber({target,onDone}:{target:number;onDone:()=>void}){
  const doors=useRef<number[]>((()=>{
    const distractor = target>1 ? (Math.random()<0.5?target-1:target+1) : target+1
    return [target,distractor].sort(()=>Math.random()-.5)
  })()).current
  const [picked,setPicked]=useState<number|null>(null)
  const [wrongPick,setWrongPick]=useState<number|null>(null)
  const spoken=useRef(false)
  useEffect(()=>{ if(spoken.current)return; spoken.current=true; speak(`Now you try! Find the number ${target}.`) },[])
  function pick(n:number){
    if(picked!=null)return
    if(n===target){ setPicked(n); speak(`Yes! Number ${target}! Wonderful!`); window.setTimeout(onDone,2200) }
    else { setWrongPick(n); speak(`That's ${n}. Find ${target}! Try again!`); window.setTimeout(()=>setWrongPick(null),900) }
  }
  return (
    <>
      <h3 style={{fontFamily:'var(--font-display)',fontSize:20,margin:'0 0 4px',color:'var(--garden-green-deep)'}}>Your turn!</h3>
      <p style={{fontFamily:'var(--font-body)',fontSize:15,color:'var(--ink-soft)',margin:'0 0 16px'}}>Tap the number {target}.</p>
      <div style={{display:'flex',gap:18,justifyContent:'center'}}>
        {doors.map(n=>{
          const isRight=picked===n, isWrong=wrongPick===n
          return (
            <button key={n} onClick={()=>pick(n)} disabled={picked!=null} style={{
              width:96,height:130,borderRadius:'14px 14px 4px 4px',
              background:isRight?'var(--garden-green-soft)':isWrong?'var(--apple-red-soft)':'var(--sky-blue-soft)',
              border:`4px solid ${isRight?'var(--garden-green)':isWrong?'var(--apple-red)':'var(--sky-blue)'}`,
              boxShadow:`0 6px 0 ${isRight?'var(--garden-green-deep)':isWrong?'var(--apple-red-deep)':'var(--sky-blue-deep)'}`,
              cursor:picked!=null?'default':'pointer',
              transform:isRight?'scale(1.08) translateY(-4px)':'scale(1)',transition:'transform 160ms cubic-bezier(.34,1.56,.64,1)',
            }}>
              <span style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:56,color:'var(--ink)'}}>{n}</span>
            </button>
          )
        })}
      </div>
    </>
  )
}

const S:Record<string,React.CSSProperties>={
  page:{minHeight:'100dvh',display:'flex',flexDirection:'column',alignItems:'center',padding:'72px 24px 32px',gap:24,position:'relative',background:'linear-gradient(180deg,var(--milo-orange-soft) 0%,var(--bg-page) 55%)'},
  hint:{fontFamily:'var(--font-display)',fontWeight:700,fontSize:14,color:'var(--sky-blue-deep)',background:'var(--sky-blue-soft)',border:'2px solid var(--sky-blue)',borderRadius:999,padding:'3px 12px'},
  miloRow:{display:'flex',alignItems:'flex-end',gap:16,width:'100%',maxWidth:540},
  milo:{width:92,height:92,objectFit:'contain',flexShrink:0},
  doorsRow:{display:'flex',gap:20,justifyContent:'center',flexWrap:'wrap',padding:'0 8px'},
  door:{width:110,height:170,borderRadius:'16px 16px 4px 4px',border:'4px solid',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',position:'relative',transition:'transform .15s, box-shadow .15s'},
  replayBtn:{background:'var(--sky-blue-soft)',border:'3px solid var(--sky-blue)',color:'var(--sky-blue-deep)',borderRadius:50,padding:'12px 28px',fontFamily:'var(--font-display)',fontWeight:800,fontSize:18,cursor:'pointer',boxShadow:'0 4px 0 var(--sky-blue-deep)'},
  flash:{position:'fixed',top:'38%',left:'50%',transform:'translate(-50%,-50%)',color:'#fff',fontFamily:'var(--font-display)',fontWeight:900,fontSize:36,padding:'18px 44px',borderRadius:28,border:'4px solid var(--outline)',boxShadow:'0 8px 0 rgba(61,37,22,.2)',zIndex:50,textAlign:'center',animation:'modal-in 280ms cubic-bezier(.34,1.56,.64,1) both'},
  label:{fontFamily:'var(--font-body)',fontSize:'var(--t-label)',color:'var(--ink-muted)',margin:0},
}
