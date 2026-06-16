'use client'
/**
 * MatchingQuantitiesLesson — animated baby-step intro to filling the basket
 * with EXACTLY the right number, for 3-5 yrs.
 * Core idea: the number tells you how many. Count as you add, STOP at the number.
 *   WATCH (count apples into the basket, stop at the target) → TAP_FILL (child
 *   fills the basket) → CHOOSE (pick the group with exactly N), with celebrations.
 */

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { speak, speakSeq, stopSpeech } from '@/lib/useMiloSpeaker'
import ScaleToFill from './ScaleToFill'
import { AdvancePopup, ListeningHint, cheerFor } from './_kit'

interface Props { childName: string; onLessonComplete: () => void }

const TOTAL_STEPS = 8

export const CSS = `
  @keyframes m_bounceIn {0%{transform:scale(0) translateY(30px);opacity:0}60%{transform:scale(1.25) translateY(-6px);opacity:1}100%{transform:scale(1) translateY(0);opacity:1}}
  @keyframes m_pop {0%{transform:scale(0) rotate(-12deg);opacity:0}55%{transform:scale(1.3) rotate(4deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}
  @keyframes m_dropIn {0%{transform:translateY(-46px) scale(.6);opacity:0}70%{transform:translateY(4px) scale(1.1);opacity:1}100%{transform:translateY(0) scale(1);opacity:1}}
  @keyframes m_slideUp {from{transform:translateY(50px);opacity:0}to{transform:translateY(0);opacity:1}}
  @keyframes m_pulse {0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}
  @keyframes m_flipIn {0%{transform:rotateY(90deg) scale(0.5);opacity:0}100%{transform:rotateY(0) scale(1);opacity:1}}
  @keyframes m_idle {0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-6px) rotate(2deg)}}
  @keyframes m_jump {0%,100%{transform:translateY(0) rotate(-3deg) scale(1)}40%{transform:translateY(-24px) rotate(5deg) scale(1.15)}}
  @keyframes m_confetti {from{transform:translateY(-10px) rotate(0deg);opacity:1}to{transform:translateY(140px) rotate(540deg);opacity:0}}
  @keyframes m_sectionIn {0%{transform:scale(0.4) rotate(-8deg);opacity:0}60%{transform:scale(1.1) rotate(3deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}
`

function Confetti() {
  const colors = ['#E64545','#F26B2C','#FFC933','#6FBE3F','#5BC3F0','#9362D8']
  return (
    <div style={{position:'absolute',inset:0,pointerEvents:'none',overflow:'hidden',zIndex:10}}>
      {Array.from({length:20}).map((_,i)=>(
        <div key={i} style={{position:'absolute',left:`${8+(i*5)%84}%`,top:`${(i*11)%25}%`,width:10,height:10,
          borderRadius:i%2===0?'50%':'3px',background:colors[i%colors.length],
          animation:`m_confetti ${0.8+(i%3)*0.2}s ease-in ${(i%6)*0.07}s both`}}/>
      ))}
    </div>
  )
}

function BigCount({n}:{n:number}) {
  if(n<=0) return null
  return (
    <div style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:60,lineHeight:1,
      color:'var(--milo-orange)',textShadow:'0 5px 0 rgba(61,37,22,.12)',
      animation:'m_pop 0.4s cubic-bezier(.34,1.56,.64,1)'}}>{n}</div>
  )
}

// A "need this many" target card.
function NeedCard({n}:{n:number}) {
  return (
    <div style={{textAlign:'center'}}>
      <div style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:44,color:'var(--milo-orange)',WebkitTextStroke:'2px var(--outline)',paintOrder:'stroke fill',lineHeight:1}}>{n}</div>
      <span style={{fontFamily:'var(--font-display)',fontWeight:800,fontSize:11,color:'var(--ink-muted)'}}>WE NEED</span>
    </div>
  )
}

// One basket slot: empty (dashed) or filled (apple drops in).
function Slot({emoji,filled,highlight}:{emoji:string,filled:boolean,highlight?:boolean}) {
  return (
    <div style={{width:48,height:48,borderRadius:13,
      border:`3px ${filled?'solid':'dashed'} ${filled?'var(--outline)':'var(--ink-muted)'}`,
      background:filled?'rgba(255,255,255,.9)':'transparent',
      display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',
      boxShadow:filled?'0 3px 0 rgba(61,37,22,.1)':'none',transition:'background .25s ease,border-color .25s ease'}}>
      {filled && (
        <span style={{fontSize:28,display:'inline-block',animation:'m_dropIn 0.4s cubic-bezier(.34,1.56,.64,1)',
          filter:highlight?'drop-shadow(0 0 12px rgba(255,200,0,0.9))':'none'}}>{emoji}</span>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// WATCH — count apples into the basket, one by one, stop at the target
// ═══════════════════════════════════════════════════════════
export function WatchFill({target,emoji,intro,outro,onDone}:{
  target:number,emoji:string,intro:string,outro:string,onDone:()=>void
}) {
  const [filled,setFilled]=useState(0)
  const [bigN,setBigN]=useState(0)
  const [done,setDone]=useState(false)
  const ran=useRef(false)

  useEffect(()=>{
    if(ran.current)return
    ran.current=true
    const stop=`Stop at ${target}! Just right!`
    const lines=[intro, ...Array.from({length:target},(_,k)=>String(k+1)), stop, outro]
    let started=false, finished=false
    const cleanups:Array<()=>void>=[]
    const at=(fn:()=>void,ms:number)=>{ const id=window.setTimeout(fn,ms); cleanups.push(()=>window.clearTimeout(id)) }
    const applyWord=(i:number)=>{
      if(i>=1 && i<=target){ setFilled(i); setBigN(i) }   // a number is being counted in
      else if(i===target+1){ setBigN(0); setDone(true) }  // the "stop" line
    }
    const complete=()=>{ if(finished)return; finished=true; at(onDone,800) }

    // Primary path: speak each line strictly one-after-another (each waits for the
    // previous to FINISH), so the counting can never cut itself off. Visuals sync
    // to onWord, which fires as each line starts.
    const cancel=speakSeq(lines,{ onWord:(i)=>{ started=true; applyWord(i) }, onDone:complete })
    cleanups.push(cancel)

    // Fallback: if speech never STARTS (blocked autoplay, voices not ready, muted
    // device…), drive the same animation with timers so the lesson can never hang.
    at(()=>{
      if(started||finished)return
      cancel()
      let t=0
      for(let k=1;k<=target;k++){ const kk=k; at(()=>{ setFilled(kk); setBigN(kk); speak(String(kk)) }, t); t+=1100 }
      at(()=>{ setBigN(0); setDone(true); speak(stop) }, t); t+=1900
      at(()=>{ speak(outro); complete() }, t)
    }, 1900)

    return ()=>{ cleanups.forEach(fn=>fn()) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[])

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:14,width:'100%'}}>
      <div style={{height:58,display:'flex',alignItems:'center',justifyContent:'center'}}>
        {bigN>0 && !done && <BigCount key={bigN} n={bigN}/>}
      </div>

      <NeedCard n={target}/>

      {/* basket slots */}
      <div style={{display:'flex',flexWrap:'wrap',gap:8,justifyContent:'center',maxWidth:380,minHeight:48}}>
        {Array.from({length:target}).map((_,i)=>(
          <Slot key={i} emoji={emoji} filled={filled>i} highlight={!done && filled===i+1}/>
        ))}
      </div>

      <div style={{fontSize:46,opacity:.95}}>🧺</div>

      {done && (
        <div style={{background:'var(--garden-green)',color:'#fff',borderRadius:50,padding:'10px 26px',
          fontFamily:'var(--font-display)',fontWeight:900,fontSize:22,boxShadow:'0 4px 0 rgba(61,37,22,.2)',animation:'m_flipIn 0.5s ease'}}>
          {target} {emoji} — just right! ✓
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// TAP_FILL — child taps apples into the basket, stops at the target
// ═══════════════════════════════════════════════════════════
export function TapFill({target,emoji,intro,outro,onDone}:{
  target:number,emoji:string,intro:string,outro:string,onDone:()=>void
}) {
  const tray = target + 2                          // a few extra so the child must STOP at the target
  const [picked,setPicked]=useState<number[]>([])
  const [done,setDone]=useState(false)
  const [burst,setBurst]=useState(false)
  const spoken=useRef(false)
  useEffect(()=>{ if(spoken.current)return; spoken.current=true; speak(intro) },[intro])
  function tap(i:number){
    if(done||picked.includes(i)||picked.length>=target)return
    const next=[...picked,i]; setPicked(next)
    speak(String(next.length))
    if(next.length===target){
      setDone(true); setBurst(true)
      window.setTimeout(()=>{ speak(outro); window.setTimeout(onDone,2400) }, 700)
    }
  }
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:14,position:'relative'}}>
      {burst&&<Confetti/>}
      <div style={{fontFamily:'var(--font-display)',fontWeight:800,fontSize:15,color:'var(--milo-orange)',background:'var(--milo-orange-soft)',borderRadius:50,padding:'6px 16px',border:'2px solid var(--milo-orange)'}}>
        Put exactly {target} in the basket! 👆
      </div>
      <div style={{display:'flex',flexWrap:'wrap',gap:10,justifyContent:'center',maxWidth:380}}>
        {Array.from({length:tray}).map((_,i)=>{
          const inBasket=picked.includes(i)
          return (
            <button key={i} onClick={()=>tap(i)} disabled={inBasket||done||picked.length>=target} style={{
              background:'transparent',border:'none',cursor:inBasket||done||picked.length>=target?'default':'pointer',
              width:58,height:58,display:'flex',alignItems:'center',justifyContent:'center',
            }}>
              <span style={{fontSize:40,display:'inline-block',
                opacity:inBasket?0.2:1,transform:inBasket?'scale(.7)':'scale(1)',
                animation:!done&&!inBasket?`m_pulse 1.6s ease-in-out ${i*0.1}s infinite`:'none',
                transition:'opacity .2s,transform .2s'}}>{emoji}</span>
            </button>
          )
        })}
      </div>
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <span style={{fontSize:40}}>🧺</span>
        <span style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:34,color:picked.length===target?'var(--garden-green)':'var(--milo-orange)'}}>{picked.length} / {target}</span>
      </div>
      {done && (
        <div style={{background:'var(--garden-green)',color:'#fff',borderRadius:50,padding:'10px 26px',fontFamily:'var(--font-display)',fontWeight:900,fontSize:22,animation:'m_bounceIn 0.5s cubic-bezier(.34,1.56,.64,1)'}}>{target} {emoji} — perfect! 🎉</div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// CHOOSE — pick the basket that has EXACTLY the target number
// ═══════════════════════════════════════════════════════════
export function ChooseCount({target,emoji,intro,onDone}:{
  target:number,emoji:string,intro:string,onDone:()=>void
}) {
  const [picked,setPicked]=useState<number|null>(null)
  const [wrongPick,setWrongPick]=useState<number|null>(null)
  const [burst,setBurst]=useState(false)
  const spoken=useRef(false)
  const choices=useRef<number[]>((()=>{
    const opts=new Set<number>([target]); let d=1
    while(opts.size<3){ if(target-d>=1)opts.add(target-d); if(opts.size<3)opts.add(target+d); d++ }
    return [...opts].sort((x,y)=>x-y)
  })()).current
  useEffect(()=>{ if(spoken.current)return; spoken.current=true; speak(intro) },[intro])
  function pick(c:number){
    if(picked!=null)return
    if(c===target){ setPicked(c); setWrongPick(null); setBurst(true); speak(`Yes! That basket has exactly ${target}! Wonderful!`); window.setTimeout(onDone,2600) }
    else { setWrongPick(c); speak('Not quite! Count them carefully. Try again!'); window.setTimeout(()=>setWrongPick(null),900) }
  }
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:14,position:'relative'}}>
      {burst&&<Confetti/>}
      <div style={{display:'flex',alignItems:'center',gap:8}}>
        <NeedCard n={target}/>
        <span style={{fontFamily:'var(--font-display)',fontWeight:800,fontSize:15,color:'var(--ink-soft)'}}>Which basket has exactly {target}?</span>
      </div>
      <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
        {choices.map(c=>{
          const isRight=picked===c, isWrong=wrongPick===c
          return (
            <button key={c} onClick={()=>pick(c)} disabled={picked!=null} style={{
              minWidth:96,padding:'12px 10px',borderRadius:20,
              background:isRight?'var(--garden-green-soft)':isWrong?'var(--apple-red-soft)':'var(--paper)',
              border:`4px solid ${isRight?'var(--garden-green)':isWrong?'var(--apple-red)':'var(--outline)'}`,
              boxShadow:isRight?'0 6px 0 var(--garden-green-deep)':isWrong?'0 6px 0 var(--apple-red-deep)':'0 6px 0 #c8ac79',
              cursor:picked!=null?'default':'pointer',
              transform:isRight?'scale(1.07) translateY(-4px)':'scale(1)',transition:'transform 160ms cubic-bezier(.34,1.56,.64,1)',
            }}>
              <div style={{fontSize:24,marginBottom:4}}>🧺</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:2,justifyContent:'center',maxWidth:84}}>
                {Array.from({length:c}).map((_,i)=><span key={i} style={{fontSize:18}}>{emoji}</span>)}
              </div>
            </button>
          )
        })}
      </div>
      {picked!=null && (
        <div style={{background:'var(--garden-green)',color:'#fff',borderRadius:50,padding:'8px 22px',fontFamily:'var(--font-display)',fontWeight:900,fontSize:20,animation:'m_bounceIn 0.5s cubic-bezier(.34,1.56,.64,1)'}}>Exactly {target}! ⭐</div>
      )}
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
        <img src={src} alt="Milo" style={{width:66,height:66,objectFit:'contain',flexShrink:0,filter:'drop-shadow(0 4px 8px rgba(61,37,22,.2))',animation:miloMood==='celebrate'?'m_jump 0.7s ease-in-out infinite':'m_idle 3s ease-in-out infinite'}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
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
    case 0: return <WatchFill target={3} emoji="🍎"
      intro="We need three apples! Watch me fill the basket." outro="Three apples — the basket is just right!" onDone={onDone}/>
    case 1: return <WatchFill target={5} emoji="🍊"
      intro="Now we need five oranges! Count with me." outro="Five oranges! We stopped at five — perfect!" onDone={onDone}/>
    case 2: return <TapFill target={4} emoji="🍎"
      intro="Your turn! Put exactly four apples in the basket." outro="Four apples! You stopped at the right number!" onDone={onDone}/>
    case 3: return <WatchFill target={4} emoji="🍓"
      intro="We need four strawberries. Watch carefully!" outro="Four strawberries — just right!" onDone={onDone}/>
    case 4: return <ChooseCount target={3} emoji="🍎"
      intro="We need three! Tap the basket with exactly three apples." onDone={onDone}/>
    case 5: return <TapFill target={5} emoji="🍎"
      intro="Put exactly five apples in the basket. Stop at five!" outro="Five apples! You did it!" onDone={onDone}/>
    case 6: return <ChooseCount target={4} emoji="🍊"
      intro="We need four! Tap the basket with exactly four oranges." onDone={onDone}/>
    case 7: return <WatchFill target={6} emoji="🍎"
      intro="Last one! We need six apples." outro="Six apples! You finished the whole lesson!" onDone={onDone}/>
    default: return null
  }
}

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════
export default function MatchingQuantitiesLesson({childName,onLessonComplete}:Props){
  const router=useRouter()
  const [step,setStep]=useState(0)
  const [nextReady,setNextReady]=useState(false)
  const [retry,setRetry]=useState(0)
  const [confirmBack,setConfirmBack]=useState(false)

  const BUBBLES=[
    `Hi ${childName}! Let's fill the basket with the RIGHT number! 🍎`,
    'Count the oranges as they drop in! 🍊',
    'Your turn! Put four apples in! 🍎',
    'Watch the strawberries fill up! 🍓',
    'Which basket has exactly three? 🍎',
    'Put exactly five — then stop! 🍎',
    'Which basket has exactly four? 🍊',
    'Last one! Six apples, please! 🍎',
  ]
  const MOODS:Array<'happy'|'thinking'|'celebrate'>=[
    'happy','happy','thinking','happy','thinking','thinking','thinking','happy',
  ]

  function done(){ setNextReady(true) }
  function retryStep(){ stopSpeech(); setNextReady(false); setRetry(r => r + 1) }
  function next(){
    if(!nextReady)return
    stopSpeech()
    if(step>=TOTAL_STEPS-1){
      speak(`Brilliant, ${childName}! You can fill the basket! Let's practise now!`)
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
