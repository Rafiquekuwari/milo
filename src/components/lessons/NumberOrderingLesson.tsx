'use client'
/**
 * NumberOrderingLesson — baby-step intro to number order for 3-5 year olds.
 * Teaches: numbers go in order (smallest → biggest) → what comes NEXT → what's
 * MISSING → tap them in order. Plain fixed-timer voice pacing (no afterSpeech).
 */

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { speak, stopSpeech } from '@/lib/useMiloSpeaker'
import ScaleToFill from './ScaleToFill'
import { AdvancePopup, ListeningHint, cheerFor } from './_kit'

interface Props { childName: string; onLessonComplete: () => void }

const TOTAL_STEPS = 10
function numberWord(n:number){ return ['zero','one','two','three','four','five','six','seven','eight','nine','ten'][n] ?? String(n) }

export const CSS = `
  @keyframes no_pop {0%{transform:scale(0) rotate(-12deg);opacity:0}55%{transform:scale(1.3) rotate(4deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}
  @keyframes no_bounceIn {0%{transform:scale(0) translateY(20px);opacity:0}60%{transform:scale(1.2) translateY(-6px);opacity:1}100%{transform:scale(1) translateY(0);opacity:1}}
  @keyframes no_slideUp {from{transform:translateY(50px);opacity:0}to{transform:translateY(0);opacity:1}}
  @keyframes no_sectionIn {0%{transform:scale(0.4) rotate(-8deg);opacity:0}60%{transform:scale(1.1) rotate(3deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}
  @keyframes no_idle {0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-6px) rotate(2deg)}}
  @keyframes no_jump {0%,100%{transform:translateY(0) rotate(-3deg) scale(1)}40%{transform:translateY(-24px) rotate(5deg) scale(1.15)}}
  @keyframes no_confetti {from{transform:translateY(-10px) rotate(0deg);opacity:1}to{transform:translateY(140px) rotate(540deg);opacity:0}}
  @keyframes no_pulse {0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
`

function Confetti() {
  const colors = ['#E64545','#F26B2C','#FFC933','#6FBE3F','#5BC3F0','#9362D8']
  return (
    <div style={{position:'absolute',inset:0,pointerEvents:'none',overflow:'hidden',zIndex:10}}>
      {Array.from({length:20}).map((_,i)=>(
        <div key={i} style={{position:'absolute',left:`${8+(i*5)%84}%`,top:`${(i*11)%25}%`,width:10,height:10,
          borderRadius:i%2===0?'50%':'3px',background:colors[i%colors.length],
          animation:`no_confetti ${0.8+(i%3)*0.2}s ease-in ${(i%6)*0.07}s both`}}/>
      ))}
    </div>
  )
}

const NUM_COLORS = ['#E64545','#F26B2C','#FFC933','#6FBE3F','#5BC3F0','#9362D8','#E64545','#F26B2C','#FFC933','#6FBE3F']

// A number slot in the sequence track.
function Slot({value,state,color}:{value:number|'?'|null,state:'normal'|'active'|'reveal'|'blank',color?:string}) {
  const bg = state==='reveal'?(color??'var(--garden-green)'):state==='active'?'var(--sun-yellow-soft)':value==='?'?'var(--sun-yellow-soft)':value==null?'rgba(255,255,255,.35)':'var(--paper)'
  return (
    <div style={{
      width:54,height:64,borderRadius:14,border:'3px solid',
      borderColor:state==='reveal'?'var(--outline)':value==='?'?'var(--sun-yellow-deep)':value==null?'var(--ink-muted)':'var(--outline)',
      borderStyle:value==null?'dashed':'solid',
      background:bg,
      display:'flex',alignItems:'center',justifyContent:'center',
      fontFamily:'var(--font-display)',fontWeight:900,fontSize:30,
      color:state==='reveal'?'#fff':value==='?'?'var(--sun-yellow-deep)':'var(--ink)',
      transform:state==='active'||state==='reveal'?'scale(1.12) translateY(-4px)':'scale(1)',
      boxShadow:state==='active'||state==='reveal'?'0 6px 0 rgba(61,37,22,.18)':'0 3px 0 rgba(61,37,22,.1)',
      transition:'all 0.25s cubic-bezier(.34,1.56,.64,1)',
      animation:state==='reveal'?'no_pop 0.45s cubic-bezier(.34,1.56,.64,1)':'none',
    }}>{value==null?'':value}</div>
  )
}

// ═══ WATCH: count a full sequence in order ═══
function CountOrder({nums,onDone}:{nums:number[],onDone:()=>void}){
  const [lit,setLit]=useState(0)
  const ran=useRef(false); const alive=useRef(false)
  useEffect(()=>{
    alive.current=true
    if(!ran.current){
      ran.current=true
      // No spoken intro (it just gets cut by the first number). Count the numbers
      // — each spoken as its slot lights — then say the result AFTER counting.
      let t=900
      for(let k=1;k<=nums.length;k++){
        const kk=k
        window.setTimeout(()=>{ if(!alive.current)return; setLit(kk); window.setTimeout(()=>{ if(alive.current) speak(String(nums[kk-1])) },60) }, t); t+=1200
      }
      window.setTimeout(()=>{ if(!alive.current)return; speak('All in order, smallest to biggest!'); window.setTimeout(()=>{ if(alive.current) onDone() },2800) }, t+400)
    }
    return ()=>{ alive.current=false }
  },[])
  return (
    <div style={{display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap'}}>
      {nums.map((n,i)=><Slot key={i} value={n} state={lit===i+1?'active':lit>i?'reveal':'normal'} color={NUM_COLORS[n-1]}/>)}
    </div>
  )
}

// ═══ WATCH: a sequence with one hole; count in order, then reveal the answer ═══
export function OrderReveal({seq,hole,kind,onDone}:{seq:number[],hole:number,kind:'next'|'missing',onDone:()=>void}){
  const [active,setActive]=useState(-1)
  const [reveal,setReveal]=useState(false)
  const ran=useRef(false); const alive=useRef(false)
  useEffect(()=>{
    alive.current=true
    if(!ran.current){
      ran.current=true
      // No spoken intro. Read each number as its slot lights, then reveal.
      let t=900
      for(let i=0;i<seq.length;i++){
        const ii=i
        window.setTimeout(()=>{ if(!alive.current)return; setActive(ii); window.setTimeout(()=>{ if(alive.current) speak(ii===hole?'hmm?':String(seq[ii])) },60) }, t); t+=1200
      }
      window.setTimeout(()=>{ if(!alive.current)return; setActive(-1); setReveal(true)
        speak(kind==='next'?`Next comes ${seq[hole]}!`:`The missing number is ${seq[hole]}!`)
        window.setTimeout(()=>{ if(alive.current) onDone() },2800)
      }, t+400)
    }
    return ()=>{ alive.current=false }
  },[])
  return (
    <div style={{display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap'}}>
      {seq.map((n,i)=>{
        const isHole=i===hole
        const value = isHole ? (reveal? n : '?') : n
        const state = reveal&&isHole ? 'reveal' : active===i ? 'active' : 'normal'
        return <Slot key={i} value={value} state={state as 'normal'|'active'|'reveal'} color={NUM_COLORS[n-1]}/>
      })}
    </div>
  )
}

// ═══ DO: show a sequence with a hole, pick the answer ═══
export function ChooseOrder({seq,hole,kind,choices,prompt,onDone}:{seq:number[],hole:number,kind:'next'|'missing',choices:number[],prompt:string,onDone:()=>void}){
  const answer=seq[hole]
  const [picked,setPicked]=useState<number|null>(null)
  const [wrong,setWrong]=useState<number|null>(null)
  const [burst,setBurst]=useState(false)
  const spoken=useRef(false)
  useEffect(()=>{ if(spoken.current)return;spoken.current=true; speak(prompt) },[prompt])
  function pick(c:number){
    if(picked!=null)return
    if(c===answer){ setPicked(c); setWrong(null); setBurst(true); speak(kind==='next'?`Yes! Next is ${answer}!`:`Yes! ${answer} was missing!`); window.setTimeout(onDone,2400) }
    else { setWrong(c); speak('Not quite! Read them in order and try again!'); window.setTimeout(()=>setWrong(null),900) }
  }
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:18,position:'relative'}}>
      {burst&&<Confetti/>}
      <div style={{fontFamily:'var(--font-display)',fontWeight:800,fontSize:15,color:'var(--milo-orange)',background:'var(--milo-orange-soft)',borderRadius:50,padding:'6px 16px',border:'2px solid var(--milo-orange)'}}>
        {kind==='next'?'What comes next? 👆':'Which number is missing? 👆'}
      </div>
      <div style={{display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap'}}>
        {seq.map((n,i)=>{
          const isHole=i===hole
          return <Slot key={i} value={isHole?(picked!=null?answer:'?'):n} state={isHole&&picked!=null?'reveal':'normal'} color={NUM_COLORS[n-1]}/>
        })}
      </div>
      <div style={{display:'flex',gap:14,justifyContent:'center',flexWrap:'wrap'}}>
        {choices.map(c=>{
          const isRight=picked===c, isWrong=wrong===c
          return (
            <button key={c} onClick={()=>pick(c)} disabled={picked!=null} style={{
              width:80,height:80,borderRadius:22,
              background:isRight?'var(--garden-green-soft)':isWrong?'var(--apple-red-soft)':'var(--paper)',
              border:`4px solid ${isRight?'var(--garden-green)':isWrong?'var(--apple-red)':'var(--outline)'}`,
              boxShadow:isRight?'0 6px 0 var(--garden-green-deep)':isWrong?'0 6px 0 var(--apple-red-deep)':'0 6px 0 #c8ac79',
              fontFamily:'var(--font-display)',fontWeight:900,fontSize:38,color:'var(--ink)',cursor:picked!=null?'default':'pointer',
              transform:isRight?'scale(1.1) translateY(-4px)':'scale(1)',transition:'transform 160ms cubic-bezier(.34,1.56,.64,1)',
            }}>{c}</button>
          )
        })}
      </div>
    </div>
  )
}

// ═══ DO: tap the numbers in order (smallest → biggest) ═══
function TapOrder({nums,onDone}:{nums:number[],onDone:()=>void}){
  const [tapped,setTapped]=useState<number[]>([])
  const [wrong,setWrong]=useState<number|null>(null)
  const [burst,setBurst]=useState(false)
  const spoken=useRef(false)
  const order=useRef<number[]>([...nums].sort((a,b)=>a-b)).current
  const scrambled=useRef<number[]>([...nums].sort(()=>Math.random()-0.5)).current
  useEffect(()=>{ if(spoken.current)return;spoken.current=true; speak('Tap the numbers in order, smallest first!') },[])
  function tap(n:number){
    if(tapped.includes(n))return
    if(n===order[tapped.length]){
      const next=[...tapped,n]; setTapped(next); setWrong(null); speak(String(n))
      if(next.length===order.length){ setBurst(true); window.setTimeout(()=>{ speak('Perfect! All in order!'); window.setTimeout(onDone,2200) },500) }
    } else {
      setWrong(n); speak(`Next is ${order[tapped.length]}!`); window.setTimeout(()=>setWrong(null),900)
    }
  }
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:18,position:'relative'}}>
      {burst&&<Confetti/>}
      <div style={{fontFamily:'var(--font-display)',fontWeight:800,fontSize:15,color:'var(--milo-orange)',background:'var(--milo-orange-soft)',borderRadius:50,padding:'6px 16px',border:'2px solid var(--milo-orange)'}}>Tap smallest to biggest! 👆</div>
      {/* progress track */}
      <div style={{display:'flex',gap:8,justifyContent:'center'}}>
        {order.map((n,i)=><Slot key={i} value={tapped.length>i?n:null} state={tapped.length>i?'reveal':'blank'} color={NUM_COLORS[n-1]}/>)}
      </div>
      {/* scrambled buttons */}
      <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap',maxWidth:320}}>
        {scrambled.map(n=>{
          const done=tapped.includes(n), bad=wrong===n
          return (
            <button key={n} onClick={()=>tap(n)} disabled={done} style={{
              width:72,height:72,borderRadius:18,
              background:done?'var(--garden-green-soft)':bad?'var(--apple-red-soft)':'var(--cream)',
              border:`4px solid ${done?'var(--garden-green)':bad?'var(--apple-red)':'var(--outline)'}`,
              boxShadow:done?'0 5px 0 var(--garden-green-deep)':'0 5px 0 #c8ac79',
              fontFamily:'var(--font-display)',fontWeight:900,fontSize:32,color:'var(--ink)',
              opacity:done?0.5:1,cursor:done?'default':'pointer',transition:'all 0.15s',
            }}>{n}</button>
          )
        })}
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
            <div key={i} style={{width:i===step?20:7,height:7,borderRadius:4,transition:'all 0.3s ease',background:i<step?'var(--garden-green)':i===step?'var(--milo-orange)':'rgba(61,37,22,0.12)'}}/>
          ))}
        </div>
        <button onClick={onSkip} title="Skip the lesson and start playing" style={{display:'flex',alignItems:'center',gap:4,padding:'7px 14px',borderRadius:50,flexShrink:0,background:'var(--garden-green)',border:'3px solid var(--garden-green-deep)',color:'#fff',fontFamily:'var(--font-display)',fontWeight:800,fontSize:13,cursor:'pointer',boxShadow:'0 3px 0 var(--garden-green-deep)'}}>Skip ▶</button>
      </div>

      <div style={{display:'flex',alignItems:'flex-end',gap:10,width:'100%',maxWidth:520}}>
        <img src={src} alt="Milo" style={{width:66,height:66,objectFit:'contain',flexShrink:0,filter:'drop-shadow(0 4px 8px rgba(61,37,22,.2))',animation:miloMood==='celebrate'?'no_jump 0.7s ease-in-out infinite':'no_idle 3s ease-in-out infinite'}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
        <div style={{background:'#fff',border:'3px solid var(--outline)',borderRadius:'18px 18px 18px 4px',padding:'10px 14px',flex:1,fontFamily:'var(--font-display)',fontWeight:700,fontSize:15,color:'var(--ink)',lineHeight:1.4,boxShadow:'0 4px 0 rgba(61,37,22,.07)'}}>{bubble}</div>
      </div>

      <div style={{flex:1,width:'100%',maxWidth:520,background:'rgba(255,255,255,0.72)',border:'3px solid var(--outline)',borderRadius:22,boxShadow:'0 5px 0 rgba(61,37,22,.07)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:16,minHeight:300,position:'relative',overflow:'hidden'}}>
        <ScaleToFill>{children}</ScaleToFill>
      </div>

      <ListeningHint show={!nextReady}/>
    </div>
  )
}

// ─── The 10 steps ────────────────────────────────────────────
function Step({i,onDone}:{i:number,onDone:()=>void}){
  switch(i){
    // ── numbers go 1 to 10 in order ──
    case 0:  return <CountOrder nums={[1,2,3,4,5]} onDone={onDone}/>
    case 1:  return <CountOrder nums={[6,7,8,9,10]} onDone={onDone}/>
    // ── what comes next (across the range) ──
    case 2:  return <OrderReveal seq={[3,4,5,6,7]} hole={4} kind="next" onDone={onDone}/>
    case 3:  return <ChooseOrder seq={[5,6,7,8]} hole={3} kind="next" choices={[7,8,9]} prompt="Five, six, seven… what comes next? Pick it!" onDone={onDone}/>
    case 4:  return <ChooseOrder seq={[6,7,8,9]} hole={3} kind="next" choices={[8,9,10]} prompt="What comes after eight? Pick it!" onDone={onDone}/>
    // ── what's missing ──
    case 5:  return <OrderReveal seq={[4,5,6,7,8]} hole={2} kind="missing" onDone={onDone}/>
    case 6:  return <ChooseOrder seq={[6,7,8,9,10]} hole={2} kind="missing" choices={[7,8,9]} prompt="Six, seven, then what? Which is missing?" onDone={onDone}/>
    // ── tap in order ──
    case 7:  return <TapOrder nums={[3,4,5,6]} onDone={onDone}/>
    case 8:  return <TapOrder nums={[6,7,8,9]} onDone={onDone}/>
    case 9:  return <ChooseOrder seq={[7,8,9,10]} hole={3} kind="next" choices={[8,9,10]} prompt="Last one! What comes after nine? Pick it!" onDone={onDone}/>
    default: return null
  }
}

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════
export default function NumberOrderingLesson({childName,onLessonComplete}:Props){
  const router=useRouter()
  const [step,setStep]=useState(0)
  const [nextReady,setNextReady]=useState(false)
  const [retry,setRetry]=useState(0)
  const [confirmBack,setConfirmBack]=useState(false)

  const BUBBLES=[
    `Hi ${childName}! Let's put numbers in ORDER! Count 1 to 5! 🔢`,
    'Now the bigger ones — 6 to 10! 🔢',
    'What number comes next? Watch! ➡️',
    'Your turn! What comes next? 👆',
    'Again — what comes next? 👆',
    'Watch — which number is missing? 👀',
    'Your turn! Which is missing? 👆',
    'Tap smallest to biggest! 🟢',
    'Again! Tap them in order! 🟢',
    'Last one! What comes next? 🏆',
  ]
  const MOODS:Array<'happy'|'thinking'|'celebrate'>=[
    'happy','happy','happy','thinking','thinking','happy','thinking','thinking','thinking','happy',
  ]

  function done(){ setNextReady(true) }
  function retryStep(){ stopSpeech(); setNextReady(false); setRetry(r=>r+1) }
  function next(){
    if(!nextReady)return
    stopSpeech()
    if(step>=TOTAL_STEPS-1){
      speak(`Brilliant, ${childName}! You know number order! Let's play!`)
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
