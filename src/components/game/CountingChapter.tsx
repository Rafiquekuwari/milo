'use client'
import { useState, useEffect, useRef } from 'react'

import { useAdaptive, countTarget } from '@/lib/adaptive'
import { DifficultyBadge } from '@/components/ui/DifficultyBadge'


import { useChapterPhase } from '@/lib/useChapterPhase'
import SpeakingLock from '@/components/ui/SpeakingLock'
import GameTopbar from '@/components/ui/GameTopbar'
import { afterSpeech, speakAfterCurrent, speak, stopSpeech, useMiloSpeaker } from '@/lib/useMiloSpeaker'
import CountingLesson from '../lessons/CountingLesson'

interface Props { onComplete:(c:number,w:number)=>void; childName:string }

type Remediation =
  | { phase:'explain'; target:number; emoji:string; label:string; escalated:boolean }
  | { phase:'check';   target:number; emoji:string; label:string }

const EMOJIS = [
  { emoji:'⭐', label:'stars'       },
  { emoji:'🦋', label:'butterflies' },
  { emoji:'🍄', label:'mushrooms'   },
  { emoji:'🌸', label:'flowers'     },
  { emoji:'🍎', label:'apples'      },
  { emoji:'🐸', label:'frogs'       },
  { emoji:'🎈', label:'balloons'    },
]

function buildChoices(target:number):number[]{
  const opts=new Set<number>([target])
  while(opts.size<3){
    const d=Math.floor(Math.random()*3)+1
    const v=Math.random()<0.5?target-d:target+d
    if(v>0&&v<=12)opts.add(v)
  }
  return[...opts].sort(()=>Math.random()-.5)
}

const TOTAL_ROUNDS=6

export default function CountingChapter({onComplete,childName}:Props){
  const { phase, startPractice } = useChapterPhase()
  const{speak}=useMiloSpeaker()
  const ada=useAdaptive('counting')
  const[roundIdx,setRoundIdx]=useState(0)
  const[target,setTarget]=useState(0)
  const[emojiSet,setEmojiSet]=useState(EMOJIS[0])
  const[tapped,setTapped]=useState<number[]>([])
  const[choices,setChoices]=useState<number[]>([])
  const[answered,setAnswered]=useState(false)
  const[correct,setCorrect]=useState(0)
  const[wrong,setWrong]=useState(0)
  const[feedback,setFeedback]=useState<'correct'|'wrong'|null>(null)
  // Adaptive remediation: after 3 wrong in a row, Milo re-teaches the missed
  // quantity (explain), then checks understanding with one easier matched
  // question (check). A failed check escalates to one more re-teach, then resumes.
  const[wrongRun,setWrongRun]=useState(0)
  const[remediation,setRemediation]=useState<Remediation|null>(null)

  function newRound(idx:number){
    const t=countTarget(ada.difficulty)
    const em=EMOJIS[idx%EMOJIS.length]
    setTarget(t);setEmojiSet(em)
    setChoices(buildChoices(t));setTapped([]);setAnswered(false)
    const msg=idx===0
      ?`Hi ${childName}! Tap each ${em.label} to count them!`
      :ada.shouldHint
        ?`Count carefully — tap each one! ${t} ${em.label} — how many?`
        :`Count the ${em.label}!`
    speakAfterCurrent(msg)
  }

  useEffect(()=>{newRound(roundIdx)},[roundIdx,ada.difficulty]) // eslint-disable-line

  function handleTap(i:number){
    if(answered||tapped.includes(i))return
    const next=[...tapped,i];setTapped(next)
    speak(String(next.length))
  }

  // Move to the next round, or finish the chapter.
  function advance(ok:boolean){
    const next = roundIdx + 1
    if (next >= TOTAL_ROUNDS) onComplete(ok?correct+1:correct, ok?wrong:wrong+1)
    else window.setTimeout(() => setRoundIdx(next), 300)
  }

  function handleAnswer(choice:number){
    if(answered)return
    setAnswered(true)
    const ok=choice===target
    ada.record(ok)
    setFeedback(ok?'correct':'wrong')
    const newRun = ok ? 0 : wrongRun + 1
    setWrongRun(newRun)
    if(ok){setCorrect(c=>c+1);speak(ada.isOnFire?ada.praise:`Yes! ${target} ${emojiSet.label}! ${ada.praise}`)}
    else   {setWrong(w=>w+1);speak(`Oops! There are ${target} ${emojiSet.label}. ${ada.encouragement}`)}
    afterSpeech(() => {
          setFeedback(null)
          // 3 wrong in a row → pause and re-teach this quantity before moving on
          if (!ok && newRun >= 3) {
            setRemediation({ phase:'explain', target, emoji: emojiSet.emoji, label: emojiSet.label, escalated:false })
            return
          }
          advance(ok)
        })
  }

  // Remediation finished (passed the check, or escalation exhausted) → resume play.
  // The answer that triggered remediation was wrong and is already counted.
  function finishRemediation(){
    stopSpeech()
    setRemediation(null)
    setWrongRun(0)
    if (roundIdx + 1 >= TOTAL_ROUNDS) onComplete(correct, wrong)
    else setRoundIdx(roundIdx + 1)
  }

  // After the re-teach: first time → check understanding; escalated → just resume.
  function handleExplainDone(){
    if (!remediation || remediation.phase !== 'explain') { finishRemediation(); return }
    if (remediation.escalated) { finishRemediation(); return }
    stopSpeech()
    const { target:t, emoji:e, label:l } = remediation
    setRemediation({ phase:'check', target:t, emoji:e, label:l })
  }

  // Result of the check question: pass → resume; fail → one more (slower) re-teach.
  function handleCheckResult(pass:boolean){
    if (!remediation) { finishRemediation(); return }
    if (pass) { finishRemediation(); return }
    stopSpeech()
    const { target:t, emoji:e, label:l } = remediation
    setRemediation({ phase:'explain', target:t, emoji:e, label:l, escalated:true })
  }

  const bubbleText=tapped.length===0?`Tap each ${emojiSet.label} to count!`
    :tapped.length<target?`${tapped.length}…`
    :`How many ${emojiSet.label}?`

  if(phase==='lesson') return(
    <CountingLesson childName={childName} onLessonComplete={startPractice}/>
  )

  return(
    <div style={S.page}>
      <SpeakingLock />
      <GameTopbar chapterName="Counting" roundIdx={roundIdx} totalRounds={TOTAL_ROUNDS} />
      <div style={{position:'fixed',top:0,left:0,right:0,height:8,background:'rgba(0,0,0,0.08)',zIndex:5}}>
        <div style={{height:'100%',width:`${(roundIdx/TOTAL_ROUNDS)*100}%`,background:'var(--garden-green)',borderRadius:'0 4px 4px 0',transition:'width 0.4s ease'}} />
      </div>
      <div style={S.topRow}>
        <DifficultyBadge difficulty={ada.difficulty} isOnFire={ada.isOnFire}/>
        {ada.isOnFire&&<span style={S.fireTag}>🔥 On a roll!</span>}
      </div>
      <div style={S.miloRow}>
        <img src="/assets/characters/milo-happy.png" alt="Milo" style={S.milo}
          onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
        <div className="milo-bubble" style={{flex:1,fontSize:20}}>{bubbleText}</div>
      </div>
      <div style={S.objectGrid}>
        {Array.from({length:target}).map((_,i)=>(
          <button key={i} onClick={()=>handleTap(i)} style={{
            ...S.objectBtn,
            background:tapped.includes(i)?'var(--sun-yellow-soft)':'rgba(255,255,255,.8)',
            borderColor:tapped.includes(i)?'var(--sun-yellow-deep)':'var(--outline)',
            transform:tapped.includes(i)?'scale(1.2)':'scale(1)',
          }}>
            <span style={{fontSize:ada.difficulty===1?52:44}}>{emojiSet.emoji}</span>
            {tapped.includes(i)&&<span style={S.tapBadge}>{tapped.indexOf(i)+1}</span>}
          </button>
        ))}
      </div>
      {/* Hint: show number line when struggling */}
      {ada.shouldHint&&(
        <div style={S.hintRow}>
          {Array.from({length:target}).map((_,i)=>(
            <div key={i} style={{...S.hintDot,background:'var(--sky-blue)',borderColor:'var(--sky-blue-deep)'}}>
              <span style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:13,color:'#fff'}}>{i+1}</span>
            </div>
          ))}
        </div>
      )}
      <div style={S.choiceRow}>
        {choices.map(c=>(
          <button key={c} onClick={()=>handleAnswer(c)} disabled={answered} style={{
            ...S.choiceBtn,
            background:answered&&c===target?'var(--garden-green-soft)':'var(--paper)',
            borderColor:answered&&c===target?'var(--garden-green)':'var(--outline)',
            boxShadow:answered&&c===target?'0 6px 0 var(--garden-green-deep)':'0 6px 0 #c8ac79',
          }}
          onMouseDown={e=>{if(!answered)(e.currentTarget.style.transform='translateY(6px)')}}
          onMouseUp={e=>{(e.currentTarget.style.transform='')}}
          onMouseLeave={e=>{(e.currentTarget.style.transform='')}}
          >{c}</button>
        ))}
      </div>
      {feedback&&<div style={{...S.flash,background:feedback==='correct'?'var(--garden-green)':'var(--apple-red)'}}>
        {feedback==='correct'?`✅ ${target}!`:`It was ${target}`}
      </div>}
      <p style={S.label}>Round {Math.min(roundIdx+1,TOTAL_ROUNDS)} of {TOTAL_ROUNDS}</p>
      {remediation?.phase==='explain' && (
        <ReExplainOverlay
          target={remediation.target} emoji={remediation.emoji} label={remediation.label}
          again={remediation.escalated} onClose={handleExplainDone}
        />
      )}
      {remediation?.phase==='check' && (
        <CheckQuestion
          target={remediation.target} emoji={remediation.emoji} label={remediation.label}
          onResult={handleCheckResult}
        />
      )}
    </div>
  )
}

// ─── Re-explanation overlay ──────────────────────────────────
// Shown after 3 wrong answers in a row. Milo counts the missed
// quantity slowly, one at a time, then lets the child try again.
function ReExplainOverlay({target,emoji,label,again,onClose}:{
  target:number;emoji:string;label:string;again?:boolean;onClose:()=>void
}){
  const [shown,setShown]=useState(0)
  const [ready,setReady]=useState(false)
  const ran=useRef(false)
  const COLORS=['#E64545','#F26B2C','#FFC933','#6FBE3F','#5BC3F0','#9362D8','#E64545','#F26B2C','#FFC933']
  useEffect(()=>{
    if(ran.current)return;ran.current=true
    speak(again
      ? `No worries! Let's count the ${label} one more time, super slowly!`
      : `Let's count the ${label} together, slowly!`)
    for(let k=1;k<=target;k++){
      window.setTimeout(()=>{
        setShown(k)
        window.setTimeout(()=>speak(String(k)),80)
      },1300+(k-1)*1100)
    }
    window.setTimeout(()=>{
      speak(`That's ${target} ${label}! Now you try again. You can do it!`)
      setReady(true)
    },1300+target*1100+300)
  },[target,label,again])
  return (
    <div style={{position:'fixed',inset:0,zIndex:200,background:'rgba(61,37,22,0.7)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <style>{`@keyframes re-pop{0%{transform:scale(0) rotate(-12deg);opacity:0}55%{transform:scale(1.35) rotate(4deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}`}</style>
      <div style={{background:'var(--paper)',border:'4px solid var(--outline)',borderRadius:28,padding:'24px 22px 28px',maxWidth:420,width:'100%',textAlign:'center',boxShadow:'0 8px 0 rgba(61,37,22,.2)',maxHeight:'92vh',overflowY:'auto'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginBottom:4}}>
          <img src="/assets/characters/milo-thinking.png" alt="Milo" style={{width:48,height:48,objectFit:'contain'}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
          <h3 style={{fontFamily:'var(--font-display)',fontSize:20,margin:0,color:'var(--milo-orange)'}}>Let's count together!</h3>
        </div>
        <p style={{fontFamily:'var(--font-body)',fontSize:14,color:'var(--ink-soft)',margin:'0 0 12px'}}>Watch carefully — count the {label} with Milo.</p>
        <div style={{height:92,display:'flex',alignItems:'center',justifyContent:'center'}}>
          {shown>0 && (
            <div key={shown} style={{
              fontFamily:'var(--font-display)',fontWeight:900,fontSize:80,lineHeight:1,
              color:COLORS[(shown-1)%COLORS.length],textShadow:'0 5px 0 rgba(61,37,22,.12)',
              animation:'re-pop 0.5s cubic-bezier(.34,1.56,.64,1)',
            }}>{shown}</div>
          )}
        </div>
        <div style={{display:'flex',flexWrap:'wrap',gap:10,justifyContent:'center',maxWidth:320,margin:'8px auto 18px',minHeight:56}}>
          {Array.from({length:target}).map((_,i)=>(
            <span key={i} style={{
              fontSize:40,
              opacity:shown>i?1:0.15,
              transform:shown===i+1?'scale(1.3)':'scale(1)',
              transition:'all 0.3s cubic-bezier(.34,1.56,.64,1)',
              filter:shown===i+1?'drop-shadow(0 0 12px rgba(242,107,44,0.7))':'none',
            }}>{emoji}</span>
          ))}
        </div>
        <button onClick={onClose} disabled={!ready} style={{
          width:'100%',padding:'14px',
          background:ready?'linear-gradient(135deg,var(--garden-green) 0%,var(--garden-green-deep) 100%)':'rgba(61,37,22,0.12)',
          color:ready?'#fff':'rgba(61,37,22,0.3)',
          border:'none',borderRadius:50,
          fontFamily:'var(--font-display)',fontWeight:900,fontSize:17,
          cursor:ready?'pointer':'not-allowed',
          boxShadow:ready?'0 4px 14px rgba(111,190,63,0.4)':'none',
        }}>{ready?"I'm ready! Try again 💪":'🎧 Listen to Milo…'}</button>
      </div>
    </div>
  )
}

// ─── Check question ──────────────────────────────────────────
// Shown right after a re-teach to verify the child understood. Matched to the
// missed quantity but made easier: only 2 choices and the number-line hint is
// always on. Pass → resume play; fail → escalate to one more re-teach.
function CheckQuestion({target,emoji,label,onResult}:{
  target:number;emoji:string;label:string;onResult:(pass:boolean)=>void
}){
  const [picked,setPicked]=useState<number|null>(null)
  const [ready,setReady]=useState(false)
  const ran=useRef(false)
  const choices=useRef<number[]>((()=>{
    const distractor = target>1 ? (Math.random()<0.5?target-1:target+1) : target+1
    return [target,distractor].sort(()=>Math.random()-0.5)
  })()).current
  useEffect(()=>{
    if(ran.current)return;ran.current=true
    speak(`Now you try! How many ${label}? Touch the right number.`)
    window.setTimeout(()=>afterSpeech(()=>setReady(true)),400)
  },[label])
  function pick(c:number){
    if(picked!=null||!ready)return
    setPicked(c)
    const ok=c===target
    if(ok) speak(`Yes! ${target} ${label}! You've got it! Wonderful!`)
    else   speak(`Not quite. Let's look one more time together.`)
    window.setTimeout(()=>onResult(ok),1900)
  }
  return (
    <div style={{position:'fixed',inset:0,zIndex:200,background:'rgba(61,37,22,0.7)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{background:'var(--paper)',border:'4px solid var(--outline)',borderRadius:28,padding:'24px 22px 28px',maxWidth:420,width:'100%',textAlign:'center',boxShadow:'0 8px 0 rgba(61,37,22,.2)',maxHeight:'92vh',overflowY:'auto'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginBottom:4}}>
          <img src="/assets/characters/milo-happy.png" alt="Milo" style={{width:48,height:48,objectFit:'contain'}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
          <h3 style={{fontFamily:'var(--font-display)',fontSize:20,margin:0,color:'var(--garden-green-deep)'}}>Your turn!</h3>
        </div>
        <p style={{fontFamily:'var(--font-body)',fontSize:15,color:'var(--ink-soft)',margin:'0 0 14px'}}>How many {label}? Count them!</p>
        {/* Objects to count */}
        <div style={{display:'flex',flexWrap:'wrap',gap:10,justifyContent:'center',maxWidth:320,margin:'0 auto 12px',minHeight:56}}>
          {Array.from({length:target}).map((_,i)=>(
            <span key={i} style={{fontSize:40}}>{emoji}</span>
          ))}
        </div>
        {/* Number-line hint (always on) */}
        <div style={{display:'flex',gap:6,flexWrap:'wrap',justifyContent:'center',marginBottom:18}}>
          {Array.from({length:target}).map((_,i)=>(
            <div key={i} style={{width:30,height:30,borderRadius:'50%',border:'3px solid var(--sky-blue-deep)',background:'var(--sky-blue)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <span style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:12,color:'#fff'}}>{i+1}</span>
            </div>
          ))}
        </div>
        {/* 2 choices */}
        <div style={{display:'flex',gap:16,justifyContent:'center',opacity:ready?1:0.45,transition:'opacity 0.2s'}}>
          {choices.map(c=>{
            const isPicked=picked===c
            const isRight=c===target
            const showState=picked!=null
            return (
              <button key={c} onClick={()=>pick(c)} disabled={picked!=null||!ready} style={{
                width:88,height:88,borderRadius:22,
                background:showState&&isRight?'var(--garden-green-soft)':showState&&isPicked?'var(--apple-red-soft)':'var(--paper)',
                border:`4px solid ${showState&&isRight?'var(--garden-green)':showState&&isPicked?'var(--apple-red)':'var(--outline)'}`,
                boxShadow:showState&&isRight?'0 6px 0 var(--garden-green-deep)':showState&&isPicked?'0 6px 0 var(--apple-red-deep)':'0 6px 0 #c8ac79',
                fontFamily:'var(--font-display)',fontWeight:900,fontSize:40,color:'var(--ink)',
                cursor:picked!=null||!ready?'default':'pointer',
              }}>{c}</button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const S:Record<string,React.CSSProperties>={
  page:{minHeight:'100dvh',display:'flex',flexDirection:'column',alignItems:'center',padding:'72px 24px 32px',gap:18,position:'relative',background:'linear-gradient(180deg,var(--sky-blue-soft) 0%,var(--bg-page) 55%)'},
  topRow:{display:'flex',gap:10,alignItems:'center'},
  fireTag:{fontFamily:'var(--font-display)',fontWeight:900,fontSize:16,color:'var(--milo-orange)'},
  miloRow:{display:'flex',alignItems:'flex-end',gap:16,width:'100%',maxWidth:540},
  milo:{width:92,height:92,objectFit:'contain',flexShrink:0,filter:'drop-shadow(0 4px 10px rgba(61,37,22,.15))'},
  objectGrid:{display:'flex',flexWrap:'wrap',gap:12,justifyContent:'center',maxWidth:400},
  objectBtn:{width:86,height:86,borderRadius:18,border:'3px solid',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',position:'relative',transition:'transform .15s, background .15s',boxShadow:'0 4px 0 rgba(61,37,22,.1)'},
  tapBadge:{position:'absolute',top:-8,right:-8,background:'var(--milo-orange)',color:'#fff',borderRadius:'50%',width:24,height:24,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--font-display)',fontSize:13,fontWeight:700,border:'2px solid var(--outline)'},
  hintRow:{display:'flex',gap:6,flexWrap:'wrap',justifyContent:'center',animation:'slide-up 300ms ease both'},
  hintDot:{width:34,height:34,borderRadius:'50%',border:'3px solid',display:'flex',alignItems:'center',justifyContent:'center'},
  choiceRow:{display:'flex',gap:16,justifyContent:'center',flexWrap:'wrap'},
  choiceBtn:{width:92,height:92,borderRadius:22,border:'4px solid',cursor:'pointer',fontFamily:'var(--font-display)',fontWeight:900,fontSize:42,color:'var(--ink)',transition:'transform 160ms cubic-bezier(.34,1.56,.64,1),background 160ms ease'},
  flash:{position:'fixed',top:'38%',left:'50%',transform:'translate(-50%,-50%)',color:'#fff',fontFamily:'var(--font-display)',fontWeight:900,fontSize:38,padding:'18px 44px',borderRadius:28,border:'4px solid var(--outline)',boxShadow:'0 8px 0 rgba(61,37,22,.2)',zIndex:50,textAlign:'center',animation:'modal-in 280ms cubic-bezier(.34,1.56,.64,1) both'},
  label:{fontFamily:'var(--font-body)',fontSize:'var(--t-label)',color:'var(--ink-muted)',margin:0},
}
