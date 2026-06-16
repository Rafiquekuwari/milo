'use client'
/**
 * NumberDoorsLesson — gentle intro to numeral recognition for 3-5 year olds.
 * Teaches the bridge: number-name ↔ written digit ↔ quantity, in tiny steps.
 *
 * Per number: the child KNOCKS on a door → it opens → that many friends hop
 * out and Milo counts them. Then "find the door" steps practise the actual
 * game skill, a 6-vs-9 look-alike step, and a finale that leads into practice.
 *
 * Same shell/architecture as CountingLesson.tsx.
 */

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { speak, speakSeq, stopSpeech } from '@/lib/useMiloSpeaker'
import ScaleToFill from './ScaleToFill'
import { AdvancePopup, ListeningHint, cheerFor, nounFor } from './_kit'

interface Props { childName: string; onLessonComplete: () => void }

const TOTAL_STEPS = 15
const COLORS = ['#E64545','#F26B2C','#FFC933','#6FBE3F','#5BC3F0','#9362D8','#E64545','#F26B2C','#FFC933','#6FBE3F']

interface Friend { emoji:string; name:string }
const FRIENDS: Record<number,Friend> = {
  1:{emoji:'🐶',name:'puppy'},   2:{emoji:'🐱',name:'kittens'},  3:{emoji:'🐰',name:'bunnies'},
  4:{emoji:'🐻',name:'bears'},   5:{emoji:'🦊',name:'foxes'},    6:{emoji:'🐸',name:'frogs'},
  7:{emoji:'🐥',name:'chicks'},  8:{emoji:'🐢',name:'turtles'},  9:{emoji:'🦋',name:'butterflies'},
  10:{emoji:'🐠',name:'fish'},
}
function numberWord(n:number){ return ['zero','one','two','three','four','five','six','seven','eight','nine','ten'][n] ?? String(n) }

// ─── CSS ─────────────────────────────────────────────────────
const CSS = `
  @keyframes nd_pop {0%{transform:scale(0) rotate(-12deg);opacity:0}55%{transform:scale(1.3) rotate(4deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}
  @keyframes nd_hop {0%{transform:translateY(18px) scale(0);opacity:0}60%{transform:translateY(-6px) scale(1.1);opacity:1}100%{transform:translateY(0) scale(1);opacity:1}}
  @keyframes nd_slideUp {from{transform:translateY(50px);opacity:0}to{transform:translateY(0);opacity:1}}
  @keyframes nd_sectionIn {0%{transform:scale(0.4) rotate(-8deg);opacity:0}60%{transform:scale(1.1) rotate(3deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}
  @keyframes nd_miloIdle {0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-6px) rotate(2deg)}}
  @keyframes nd_miloJump {0%,100%{transform:translateY(0) rotate(-3deg) scale(1)}40%{transform:translateY(-24px) rotate(5deg) scale(1.15)}}
  @keyframes nd_confetti {from{transform:translateY(-10px) rotate(0deg);opacity:1}to{transform:translateY(140px) rotate(540deg);opacity:0}}
  @keyframes nd_knock {0%,100%{transform:rotate(0)}25%{transform:rotate(-3deg)}75%{transform:rotate(3deg)}}
  @keyframes nd_glow {0%,100%{box-shadow:0 0 0 4px var(--sun-yellow),0 6px 0 var(--milo-orange-deep)}50%{box-shadow:0 0 0 9px var(--sun-yellow),0 6px 0 var(--milo-orange-deep)}}
`

function BigCount({n}:{n:number}) {
  if(n<=0) return null
  return (
    <div style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:64,lineHeight:1,
      color:COLORS[(n-1)%COLORS.length],textShadow:'0 5px 0 rgba(61,37,22,.12)',
      animation:'nd_pop 0.5s cubic-bezier(.34,1.56,.64,1)'}}>{n}</div>
  )
}

// ─── A door ──────────────────────────────────────────────────
function Door({n,open,count,friend,onKnock,glow,small}:{
  n:number,open:boolean,count:number,friend:Friend,onKnock?:()=>void,glow?:boolean,small?:boolean
}){
  const W=small?96:128, H=small?150:194
  return (
    <div style={{position:'relative',width:W,height:H,perspective:'700px'}}>
      {/* Interior + friends (revealed when the door opens) */}
      <div style={{position:'absolute',inset:0,borderRadius:'14px 14px 6px 6px',background:'var(--cream)',border:'4px solid var(--outline)',display:'flex',flexWrap:'wrap',alignItems:'center',justifyContent:'center',gap:3,padding:8,overflow:'hidden'}}>
        {Array.from({length:count}).map((_,i)=>(
          <span key={i} style={{fontSize:n>6?18:24,animation:`nd_hop 0.5s ease ${i*0.08}s both`}}>{friend.emoji}</span>
        ))}
      </div>
      {/* Door panel */}
      <button
        onClick={onKnock}
        disabled={open||!onKnock}
        style={{
          position:'absolute',inset:0,borderRadius:'14px 14px 6px 6px',
          background:'linear-gradient(135deg,var(--milo-orange-soft) 0%,#fff 100%)',
          border:'4px solid var(--milo-orange)',
          transformOrigin:'left center',
          transform:open?'rotateY(-118deg)':'rotateY(0deg)',
          transition:'transform 0.8s cubic-bezier(.5,0,.25,1)',
          boxShadow:glow?'0 0 0 5px var(--sun-yellow),0 6px 0 var(--milo-orange-deep)':'0 6px 0 var(--milo-orange-deep)',
          animation:glow&&!open?'nd_glow 1s ease-in-out infinite':'none',
          cursor:open||!onKnock?'default':'pointer',
          display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
        }}
      >
        <span style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:small?52:70,color:'var(--ink)',lineHeight:1}}>{n}</span>
        <div style={{width:11,height:11,borderRadius:'50%',background:'var(--outline)',marginTop:small?12:18}}/>
      </button>
    </div>
  )
}

// ─── STEP: meet a number (knock → count friends) ─────────────
function MeetNumber({n,onDone}:{n:number,onDone:()=>void}){
  const friend=FRIENDS[n]
  const [open,setOpen]=useState(false)
  const [count,setCount]=useState(0)
  const [stage,setStage]=useState<'knock'|'count'>('knock')
  const spoken=useRef(false)
  const doneRef=useRef(onDone); doneRef.current=onDone
  useEffect(()=>{ if(spoken.current)return;spoken.current=true; speak(`This is the number ${n}. Knock on the door to open it!`) },[n])

  function knock(){
    if(open)return
    setOpen(true); setStage('count')
    // speakSeq plays each line only when the previous one's `end` event fires, so
    // the knock line, the counts and the finale can never overlap or cut off —
    // whatever the device's speech speed. onWord reveals each count as it's said.
    const counts=Array.from({length:n},(_,k)=>String(k+1))
    const finale=n>=10
      ? `Ten ${friend.name}! Wonderful! The number ten has a one and a zero!`
      : `${numberWord(n)} ${nounFor(n, friend.name)}! That's the number ${n}!`
    speakSeq(['Knock knock! Who is inside?',...counts,finale],{
      onWord:(i)=>{ if(i>=1&&i<=n) setCount(i) },
      onDone:()=>window.setTimeout(()=>doneRef.current(),600),
    })
  }

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
      <div style={{height:54,display:'flex',alignItems:'center',justifyContent:'center'}}>
        {stage==='count' ? <BigCount n={count}/> :
          <div style={{fontFamily:'var(--font-display)',fontWeight:800,fontSize:15,color:'var(--ink-soft)',animation:'nd_knock 0.9s ease-in-out infinite'}}>👆 Knock on the door!</div>}
      </div>
      <div style={{animation:stage==='knock'?'nd_knock 1.2s ease-in-out infinite':'none'}}>
        <Door n={n} open={open} count={count} friend={friend} onKnock={knock}/>
      </div>
    </div>
  )
}

// ─── STEP: WATCH Milo find a door ────────────────────────────
function FindWatch({target,doors,onDone}:{target:number,doors:number[],onDone:()=>void}){
  const [open,setOpen]=useState(false)
  const ran=useRef(false)
  const doneRef=useRef(onDone); doneRef.current=onDone
  useEffect(()=>{
    if(ran.current)return;ran.current=true
    // Chained so the "there it is" line waits for the intro to finish (no overlap);
    // the door opens exactly as that second line begins.
    const cancel=speakSeq(
      [`Now let's find a door! Where is number ${target}? Look for the ${target}!`,
       `There it is! This door has the number ${target}!`],
      { onWord:(i)=>{ if(i===1) setOpen(true) }, onDone:()=>window.setTimeout(()=>doneRef.current(),900) },
    )
    return cancel
  },[target])
  return (
    <div style={{display:'flex',gap:14,justifyContent:'center',flexWrap:'wrap',alignItems:'flex-end'}}>
      {doors.map(d=>(
        <Door key={d} n={d} small open={d===target&&open} count={d===target?target:0} friend={FRIENDS[d]??FRIENDS[1]} glow={d===target}/>
      ))}
    </div>
  )
}

// ─── STEP: DO — child finds the door (gentle retry) ──────────
function FindDo({target,doors,onDone}:{target:number,doors:number[],onDone:()=>void}){
  const [opened,setOpened]=useState<number|null>(null)
  const [wrong,setWrong]=useState<number|null>(null)
  const spoken=useRef(false)
  useEffect(()=>{ if(spoken.current)return;spoken.current=true; speak(`Your turn! Tap the door with the number ${target}!`) },[target])
  function tap(d:number){
    if(opened!=null)return
    if(d===target){ setOpened(d); setWrong(null); speak(`Yes! Number ${target}! You found it!`); window.setTimeout(onDone,2200) }
    else { setWrong(d); speak(`That's number ${d}. Find the number ${target}! You can do it!`); window.setTimeout(()=>setWrong(null),900) }
  }
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
      <div style={{fontFamily:'var(--font-display)',fontWeight:800,fontSize:15,color:'var(--milo-orange)',background:'var(--milo-orange-soft)',borderRadius:50,padding:'5px 16px',border:'2px solid var(--milo-orange)'}}>
        Find door number {target}! 👆
      </div>
      <div style={{display:'flex',gap:14,justifyContent:'center',flexWrap:'wrap',alignItems:'flex-end'}}>
        {doors.map(d=>(
          <div key={d} onClick={()=>tap(d)} style={{cursor:opened!=null?'default':'pointer',transform:wrong===d?'translateX(0)':'none',opacity:wrong===d?0.6:1,transition:'opacity 0.2s'}}>
            <Door n={d} small open={opened===d} count={opened===d?target:0} friend={FRIENDS[d]??FRIENDS[1]} onKnock={()=>tap(d)}/>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── STEP: 6 vs 9 look-alike ─────────────────────────────────
function SixVsNine({onDone}:{onDone:()=>void}){
  const [picked,setPicked]=useState<number|null>(null)
  const [wrong,setWrong]=useState(false)
  const spoken=useRef(false)
  useEffect(()=>{ if(spoken.current)return;spoken.current=true; speak(`Six and nine look alike! Six has its ball at the bottom. Nine has its ball at the top. Can you tap the six?`) },[])
  function tap(d:number){
    if(picked!=null)return
    if(d===6){ setPicked(6); setWrong(false); speak(`Yes! That's six — its ball is at the bottom! Clever!`); window.setTimeout(onDone,2400) }
    else { setWrong(true); speak(`That's nine — its ball is at the top. The six has its ball at the bottom. Try again!`); window.setTimeout(()=>setWrong(false),900) }
  }
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
      <div style={{fontFamily:'var(--font-display)',fontWeight:800,fontSize:15,color:'var(--milo-orange)'}}>Tap the number 6! ⬇️ ball at the bottom</div>
      <div style={{display:'flex',gap:20,justifyContent:'center'}}>
        {[6,9].map(d=>(
          <div key={d} onClick={()=>tap(d)} style={{cursor:picked!=null?'default':'pointer',opacity:wrong&&d===9?0.6:1,transition:'opacity 0.2s'}}>
            <Door n={d} small open={picked===d} count={picked===d?6:0} friend={FRIENDS[6]} onKnock={()=>tap(d)}/>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Shell ───────────────────────────────────────────────────
function Shell({step,miloMood,bubble,children,nextReady,onBack,onSkip}:{
  step:number,miloMood:'happy'|'thinking'|'celebrate',bubble:string,children:React.ReactNode,
  nextReady:boolean,onBack:()=>void,onSkip:()=>void,
}) {
  const src = miloMood==='thinking'?'/assets/characters/milo-thinking.png':'/assets/characters/milo-happy.png'
  return (
    <div className="milo-lesson" style={{minHeight:'100dvh',display:'flex',flexDirection:'column',alignItems:'center',background:'var(--bg-page)',padding:'10px 14px 24px',gap:10}}>
      <style>{CSS}</style>
      <div style={{display:'flex',alignItems:'center',gap:10,width:'100%',maxWidth:520,paddingTop:6}}>
        <button onClick={onBack} style={{display:'flex',alignItems:'center',gap:4,padding:'7px 14px',borderRadius:50,flexShrink:0,background:'var(--paper)',border:'3px solid var(--milo-orange)',color:'var(--milo-orange)',fontFamily:'var(--font-display)',fontWeight:800,fontSize:13,cursor:'pointer',boxShadow:'0 3px 0 rgba(242,107,44,.25)'}}>← Menu</button>
        <div style={{display:'flex',gap:4,flex:1,justifyContent:'center',flexWrap:'wrap'}}>
          {Array.from({length:TOTAL_STEPS}).map((_,i)=>(
            <div key={i} style={{width:i===step?18:7,height:7,borderRadius:4,transition:'all 0.3s ease',background:i<step?'var(--garden-green)':i===step?'var(--milo-orange)':'rgba(61,37,22,0.12)'}}/>
          ))}
        </div>
        <button onClick={onSkip} title="Skip the lesson and start playing" style={{display:'flex',alignItems:'center',gap:4,padding:'7px 14px',borderRadius:50,flexShrink:0,background:'var(--garden-green)',border:'3px solid var(--garden-green-deep)',color:'#fff',fontFamily:'var(--font-display)',fontWeight:800,fontSize:13,cursor:'pointer',boxShadow:'0 3px 0 var(--garden-green-deep)'}}>Skip ▶</button>
      </div>

      <div style={{display:'flex',alignItems:'flex-end',gap:10,width:'100%',maxWidth:520}}>
        <img src={src} alt="Milo" style={{width:66,height:66,objectFit:'contain',flexShrink:0,filter:'drop-shadow(0 4px 8px rgba(61,37,22,.2))',animation:miloMood==='celebrate'?'nd_miloJump 0.7s ease-in-out infinite':'nd_miloIdle 3s ease-in-out infinite'}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
        <div style={{background:'#fff',border:'3px solid var(--outline)',borderRadius:'18px 18px 18px 4px',padding:'10px 14px',flex:1,fontFamily:'var(--font-display)',fontWeight:700,fontSize:15,color:'var(--ink)',lineHeight:1.4,boxShadow:'0 4px 0 rgba(61,37,22,.07)'}}>{bubble}</div>
      </div>

      <div style={{flex:1,width:'100%',maxWidth:520,background:'rgba(255,255,255,0.72)',border:'3px solid var(--outline)',borderRadius:22,boxShadow:'0 5px 0 rgba(61,37,22,.07)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:16,minHeight:300,position:'relative',overflow:'hidden'}}>
        <ScaleToFill>{children}</ScaleToFill>
      </div>

      <ListeningHint show={!nextReady}/>
    </div>
  )
}

// ─── The 15 steps ────────────────────────────────────────────
function Step({i,onDone}:{i:number,onDone:()=>void}){
  switch(i){
    case 0: return <MeetNumber n={1} onDone={onDone}/>
    case 1: return <MeetNumber n={2} onDone={onDone}/>
    case 2: return <MeetNumber n={3} onDone={onDone}/>
    case 3: return <MeetNumber n={4} onDone={onDone}/>
    case 4: return <MeetNumber n={5} onDone={onDone}/>
    case 5: return <MeetNumber n={6} onDone={onDone}/>
    case 6: return <MeetNumber n={7} onDone={onDone}/>
    case 7: return <MeetNumber n={8} onDone={onDone}/>
    case 8: return <MeetNumber n={9} onDone={onDone}/>
    case 9: return <MeetNumber n={10} onDone={onDone}/>
    case 10: return <FindWatch target={4} doors={[2,4,7]} onDone={onDone}/>
    case 11: return <FindDo target={7} doors={[3,7,9]} onDone={onDone}/>
    case 12: return <FindDo target={5} doors={[5,8,2]} onDone={onDone}/>
    case 13: return <SixVsNine onDone={onDone}/>
    case 14: return <FindDo target={8} doors={[6,8,3]} onDone={onDone}/>
    default: return null
  }
}

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════
export default function NumberDoorsLesson({childName,onLessonComplete}:Props){
  const router=useRouter()
  const [step,setStep]=useState(0)
  const [nextReady,setNextReady]=useState(false)
  const [retry,setRetry]=useState(0)
  const [confirmBack,setConfirmBack]=useState(false)

  const BUBBLES=[
    `Hi ${childName}! Knock on the door to meet number 1! 🚪`,
    'Knock to meet number 2! 🐱',
    'Number 3 — knock and count! 🐰',
    'Open the door for number 4! 🐻',
    'Number 5 — knock and count! 🦊',
    'Number 6 — knock and count! 🐸',
    'Number 7 — who is inside? 🐥',
    'Number 8 — knock and count! 🐢',
    'Number 9 — open the door! 🦋',
    'Number 10 — the biggest door! 🐠',
    'Watch Milo find the right door! 👀',
    'Your turn! Tap the right door! 👆',
    'Find the number — you can do it! 👆',
    '6 and 9 look alike — can you tell them apart? 🔍',
    'Last one! Find the door to finish! 🏆',
  ]
  const MOODS:Array<'happy'|'thinking'|'celebrate'>=[
    'happy','happy','happy','happy','happy',
    'happy','happy','happy','happy','happy',
    'happy','thinking','thinking','thinking','thinking',
  ]

  function done(){ setNextReady(true) }
  function retryStep(){ stopSpeech(); setNextReady(false); setRetry(r => r + 1) }
  function next(){
    if(!nextReady)return
    stopSpeech()
    if(step>=TOTAL_STEPS-1){
      speak(`Brilliant, ${childName}! You know your numbers! Let's play Number Doors!`)
      window.setTimeout(onLessonComplete,3000)
      return
    }
    setStep(s=>s+1); setNextReady(false)
  }

  return (
    <>
      <Shell step={step} miloMood={MOODS[step]} bubble={BUBBLES[step]} nextReady={nextReady}
        onBack={()=>setConfirmBack(true)} onSkip={()=>{stopSpeech();onLessonComplete()}}>
        <Step key={`${step}-${retry}`} i={step} onDone={done}/>
      </Shell>

      {nextReady && <AdvancePopup onRetry={retryStep} onNext={next} cheer={cheerFor(step)} />}

      {confirmBack && (
        <div style={{position:'fixed',inset:0,zIndex:200,background:'rgba(61,37,22,0.65)',display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
          <div style={{background:'var(--paper)',border:'4px solid var(--outline)',borderRadius:24,padding:'28px 24px',maxWidth:320,width:'100%',textAlign:'center',boxShadow:'0 6px 0 var(--outline)'}}>
            <div style={{fontSize:48,marginBottom:8}}>⚠️</div>
            <h3 style={{fontFamily:'var(--font-display)',fontSize:20,margin:'0 0 8px',color:'var(--ink)'}}>Leave the lesson?</h3>
            <p style={{fontSize:14,color:'var(--ink-soft)',margin:'0 0 20px',lineHeight:1.5}}>Your lesson progress will be lost.</p>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>{stopSpeech();router.push('/menu')}} style={{flex:1,padding:'12px',background:'var(--apple-red)',color:'#fff',border:'none',borderRadius:50,fontFamily:'var(--font-display)',fontSize:14,fontWeight:800,cursor:'pointer',boxShadow:'0 3px 0 rgba(61,37,22,.2)'}}>Yes, leave</button>
              <button onClick={()=>setConfirmBack(false)} style={{flex:1,padding:'12px',background:'var(--paper)',border:'3px solid var(--outline)',borderRadius:50,fontFamily:'var(--font-display)',fontSize:14,fontWeight:700,cursor:'pointer',color:'var(--ink)'}}>Keep going!</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
