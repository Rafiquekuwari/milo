'use client'
/**
 * SubtractionLesson — animated baby-step intro to taking away, for 3-5 yrs.
 * Core idea: start with a group, take some away, then COUNT what's left.
 *   WATCH (count in → take away → count what's left) → TAP_AWAY (child removes
 *   some) → CHOOSE (pick how many are left), with celebrations + a finale.
 */

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { speak, stopSpeech } from '@/lib/useMiloSpeaker'
import ScaleToFill from './ScaleToFill'

interface Props { childName: string; onLessonComplete: () => void }

const TOTAL_STEPS = 10

function numberWord(n:number){ return ['zero','one','two','three','four','five','six','seven','eight','nine','ten'][n] ?? String(n) }

export const CSS = `
  @keyframes s_bounceIn {0%{transform:scale(0) translateY(30px);opacity:0}60%{transform:scale(1.25) translateY(-6px);opacity:1}100%{transform:scale(1) translateY(0);opacity:1}}
  @keyframes s_pop {0%{transform:scale(0) rotate(-12deg);opacity:0}55%{transform:scale(1.3) rotate(4deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}
  @keyframes s_slideUp {from{transform:translateY(50px);opacity:0}to{transform:translateY(0);opacity:1}}
  @keyframes s_pulse {0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}
  @keyframes s_flyAway {0%{transform:translateY(0) scale(1);opacity:1}100%{transform:translateY(-60px) scale(0.2) rotate(40deg);opacity:0}}
  @keyframes s_flipIn {0%{transform:rotateY(90deg) scale(0.5);opacity:0}100%{transform:rotateY(0) scale(1);opacity:1}}
  @keyframes s_idle {0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-6px) rotate(2deg)}}
  @keyframes s_jump {0%,100%{transform:translateY(0) rotate(-3deg) scale(1)}40%{transform:translateY(-24px) rotate(5deg) scale(1.15)}}
  @keyframes s_confetti {from{transform:translateY(-10px) rotate(0deg);opacity:1}to{transform:translateY(140px) rotate(540deg);opacity:0}}
  @keyframes s_sectionIn {0%{transform:scale(0.4) rotate(-8deg);opacity:0}60%{transform:scale(1.1) rotate(3deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}
`

function Confetti() {
  const colors = ['#E64545','#F26B2C','#FFC933','#6FBE3F','#5BC3F0','#9362D8']
  return (
    <div style={{position:'absolute',inset:0,pointerEvents:'none',overflow:'hidden',zIndex:10}}>
      {Array.from({length:20}).map((_,i)=>(
        <div key={i} style={{position:'absolute',left:`${8+(i*5)%84}%`,top:`${(i*11)%25}%`,width:10,height:10,
          borderRadius:i%2===0?'50%':'3px',background:colors[i%colors.length],
          animation:`s_confetti ${0.8+(i%3)*0.2}s ease-in ${(i%6)*0.07}s both`}}/>
      ))}
    </div>
  )
}

function BigCount({n}:{n:number}) {
  if(n<=0) return null
  return (
    <div style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:60,lineHeight:1,
      color:'var(--milo-orange)',textShadow:'0 5px 0 rgba(61,37,22,.12)',
      animation:'s_pop 0.4s cubic-bezier(.34,1.56,.64,1)'}}>{n}</div>
  )
}

function SectionBreak({emoji,title,subtitle,onDone}:{emoji:string,title:string,subtitle:string,onDone:()=>void}) {
  useEffect(()=>{ const t=window.setTimeout(onDone,2800); return ()=>window.clearTimeout(t) },[onDone])
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16,padding:'20px 0',position:'relative'}}>
      <Confetti/>
      <div style={{fontSize:72,animation:'s_jump 0.8s ease-in-out infinite'}}>{emoji}</div>
      <div style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:28,color:'var(--milo-orange)',textAlign:'center',lineHeight:1.2,animation:'s_sectionIn 0.6s cubic-bezier(.34,1.56,.64,1)',textShadow:'0 3px 0 rgba(61,37,22,.1)'}}>{title}</div>
      <div style={{fontFamily:'var(--font-body)',fontSize:16,color:'var(--ink-soft)',textAlign:'center',animation:'s_slideUp 0.5s ease 0.2s both'}}>{subtitle}</div>
    </div>
  )
}

// ─── An object cell: counted-in, taken-away, or remaining ────
function Cell({emoji,state,highlight}:{emoji:string,state:'hidden'|'show'|'gone',highlight?:boolean}) {
  return (
    <div style={{width:54,height:54,borderRadius:14,
      border:`3px solid ${state==='gone'?'var(--apple-red-soft)':'var(--outline)'}`,
      background:state==='gone'?'var(--apple-red-soft)':state==='show'?'rgba(255,255,255,.85)':'transparent',
      display:'flex',alignItems:'center',justifyContent:'center',position:'relative',overflow:'hidden',
      boxShadow:state==='show'?'0 3px 0 rgba(61,37,22,.1)':'none',transition:'background 0.3s ease,border-color 0.3s ease'}}>
      {state==='show' && (
        <span style={{fontSize:32,display:'inline-block',animation:'s_bounceIn 0.4s cubic-bezier(.34,1.56,.64,1)',
          filter:highlight?'drop-shadow(0 0 12px rgba(255,200,0,0.9))':'none'}}>{emoji}</span>
      )}
      {state==='gone' && <span style={{fontSize:22,color:'var(--apple-red)',fontWeight:900}}>✕</span>}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// WATCH — count the group in, take some away, count what's left
// ═══════════════════════════════════════════════════════════
export function WatchSub({total,take,emoji,intro,outro,onDone}:{
  total:number,take:number,emoji:string,intro:string,outro:string,onDone:()=>void
}) {
  const left=total-take
  const [shown,setShown]=useState(0)      // counted-in so far
  const [removed,setRemoved]=useState(false)
  const [counted,setCounted]=useState(0)  // remaining counted while "what's left"
  const [bigN,setBigN]=useState(0)
  const [phase,setPhase]=useState<'in'|'away'|'count'|'done'>('in')
  const [showAns,setShowAns]=useState(false)
  const ran=useRef(false)
  const alive=useRef(false)

  useEffect(()=>{
    alive.current=true
    if(!ran.current){
      ran.current=true
      // Plain fixed-timer pacing (like the Counting lesson) — no afterSpeech.
      // Lines are short and gaps are generous, so nothing overlaps or clips.
      speak(intro)
      let t=2200                                   // lead so the short intro finishes
      for(let k=1;k<=total;k++){                    // count the group in
        const kk=k
        window.setTimeout(()=>{ if(!alive.current)return; setShown(kk); setBigN(kk); window.setTimeout(()=>{ if(alive.current) speak(String(kk)) },60) }, t); t+=1100
      }
      t+=500
      window.setTimeout(()=>{ if(!alive.current)return; setBigN(0); setPhase('away'); speak(`Take away ${take}!`) }, t); t+=1600
      window.setTimeout(()=>{ if(alive.current) setRemoved(true) }, t); t+=1600
      window.setTimeout(()=>{ if(!alive.current)return; setPhase('count'); speak("Now count what is left!") }, t); t+=1900
      for(let k=1;k<=left;k++){                     // count what is left
        const kk=k
        window.setTimeout(()=>{ if(!alive.current)return; setCounted(kk); setBigN(kk); window.setTimeout(()=>{ if(alive.current) speak(String(kk)) },60) }, t); t+=1100
      }
      t+=500
      window.setTimeout(()=>{ if(!alive.current)return; setShowAns(true); setBigN(0); speak(outro); window.setTimeout(()=>{ if(alive.current) onDone() },3800) }, t)
    }
    return ()=>{ alive.current=false }
  },[])

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:14,width:'100%'}}>
      <div style={{height:58,display:'flex',alignItems:'center',justifyContent:'center'}}>
        {bigN>0 && !showAns && <BigCount key={`${phase}-${bigN}`} n={bigN}/>}
      </div>

      {/* equation: total − take = ? */}
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <EqNum value={total} label="START" color="var(--milo-orange)"/>
        <Op>−</Op>
        <EqNum value={take} label="AWAY" color="var(--apple-red)"/>
        <Op>=</Op>
        <EqNum value={showAns?left:null} label="LEFT" color="var(--garden-green)"/>
      </div>

      {/* objects */}
      <div style={{display:'flex',flexWrap:'wrap',gap:8,justifyContent:'center',maxWidth:420,minHeight:54}}>
        {Array.from({length:total}).map((_,i)=>{
          const isAway = i>=left
          const state = shown>i ? (removed&&isAway ? 'gone' : 'show') : 'hidden'
          const highlight = phase==='count' && counted===i+1 && i<left
          return <Cell key={i} emoji={emoji} state={state as 'hidden'|'show'|'gone'} highlight={highlight}/>
        })}
      </div>

      {showAns && (
        <div style={{background:'var(--garden-green)',color:'#fff',borderRadius:50,padding:'10px 26px',
          fontFamily:'var(--font-display)',fontWeight:900,fontSize:22,boxShadow:'0 4px 0 rgba(61,37,22,.2)',animation:'s_flipIn 0.5s ease'}}>
          {total} − {take} = {left}!
        </div>
      )}
    </div>
  )
}

function Op({children}:{children:React.ReactNode}){
  return <span style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:36,color:'var(--ink-soft)'}}>{children}</span>
}
function EqNum({value,label,color}:{value:number|null,label:string,color:string}){
  return (
    <div style={{textAlign:'center'}}>
      <div style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:44,color,WebkitTextStroke:'2px var(--outline)',paintOrder:'stroke fill',lineHeight:1}}>{value??'?'}</div>
      <span style={{fontFamily:'var(--font-display)',fontWeight:800,fontSize:11,color:'var(--ink-muted)'}}>{label}</span>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// TAP_AWAY — child taps the objects to take away, then counts what's left
// ═══════════════════════════════════════════════════════════
function TapAway({total,take,emoji,intro,outro,onDone}:{
  total:number,take:number,emoji:string,intro:string,outro:string,onDone:()=>void
}) {
  const left=total-take
  const [removed,setRemoved]=useState<number[]>([])
  const [done,setDone]=useState(false)
  const [burst,setBurst]=useState(false)
  const spoken=useRef(false)
  useEffect(()=>{ if(spoken.current)return;spoken.current=true; speak(intro) },[intro])
  function tap(i:number){
    if(removed.includes(i)||done)return
    const next=[...removed,i]; setRemoved(next)
    speak(next.length===take?'and away!':'away!')
    if(next.length===take){
      setDone(true); setBurst(true)
      window.setTimeout(()=>{ speak(outro); window.setTimeout(onDone,2400) }, 700)
    }
  }
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:14,position:'relative'}}>
      {burst&&<Confetti/>}
      <div style={{fontFamily:'var(--font-display)',fontWeight:800,fontSize:15,color:'var(--apple-red)',background:'var(--apple-red-soft)',borderRadius:50,padding:'6px 16px',border:'2px solid var(--apple-red)'}}>
        Take {take} away! Tap {take} to make them go! 👆
      </div>
      <div style={{display:'flex',flexWrap:'wrap',gap:10,justifyContent:'center',maxWidth:380}}>
        {Array.from({length:total}).map((_,i)=>{
          const gone=removed.includes(i)
          return (
            <button key={i} onClick={()=>tap(i)} disabled={gone||done} style={{
              background:'transparent',border:'none',cursor:gone||done?'default':'pointer',
              width:60,height:60,display:'flex',alignItems:'center',justifyContent:'center',
            }}>
              <span style={{fontSize:42,display:'inline-block',
                animation:gone?'s_flyAway 0.5s ease forwards':(!done?'s_pulse 1.6s ease-in-out infinite':'none'),
                animationDelay:gone?'0s':`${i*0.1}s`,
              }}>{emoji}</span>
            </button>
          )
        })}
      </div>
      {done ? (
        <div style={{background:'var(--garden-green)',color:'#fff',borderRadius:50,padding:'10px 26px',fontFamily:'var(--font-display)',fontWeight:900,fontSize:22,animation:'s_bounceIn 0.5s cubic-bezier(.34,1.56,.64,1)'}}>{total} − {take} = {left}! 🎉</div>
      ) : (
        <p style={{fontFamily:'var(--font-body)',fontSize:14,color:'var(--ink-muted)',margin:0}}>{removed.length} of {take} away</p>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// CHOOSE — show total with some taken away, pick how many are LEFT
// ═══════════════════════════════════════════════════════════
export function ChooseDiff({total,take,emoji,intro,onDone}:{
  total:number,take:number,emoji:string,intro:string,onDone:()=>void
}) {
  const left=total-take
  const [picked,setPicked]=useState<number|null>(null)
  const [wrongPick,setWrongPick]=useState<number|null>(null)
  const [burst,setBurst]=useState(false)
  const spoken=useRef(false)
  const choices=useRef<number[]>((()=>{
    const opts=new Set<number>([left]); let d=1
    while(opts.size<3){ if(left-d>=0)opts.add(left-d); if(opts.size<3)opts.add(left+d); d++ }
    return [...opts].sort((x,y)=>x-y)
  })()).current
  useEffect(()=>{ if(spoken.current)return;spoken.current=true; speak(intro) },[intro])
  function pick(c:number){
    if(picked!=null)return
    if(c===left){ setPicked(c); setWrongPick(null); setBurst(true); speak(`Yes! ${total} take away ${take} is ${left}! Wonderful!`); window.setTimeout(onDone,2600) }
    else { setWrongPick(c); speak('Not quite! Count what is left. Try again!'); window.setTimeout(()=>setWrongPick(null),900) }
  }
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:14,position:'relative'}}>
      {burst&&<Confetti/>}
      <div style={{display:'flex',flexWrap:'wrap',gap:7,justifyContent:'center',maxWidth:340}}>
        {Array.from({length:total}).map((_,i)=>{
          const away=i>=left
          return (
            <div key={i} style={{width:46,height:46,borderRadius:12,border:`3px solid ${away?'var(--apple-red-soft)':'var(--outline)'}`,background:away?'var(--apple-red-soft)':'rgba(255,255,255,.85)',display:'flex',alignItems:'center',justifyContent:'center',position:'relative'}}>
              <span style={{fontSize:26,opacity:away?0.25:1}}>{emoji}</span>
              {away&&<span style={{position:'absolute',fontSize:20,color:'var(--apple-red)',fontWeight:900}}>✕</span>}
            </div>
          )
        })}
      </div>
      <div style={{fontFamily:'var(--font-display)',fontWeight:800,fontSize:15,color:'var(--ink-soft)'}}>How many are left?</div>
      <div style={{display:'flex',gap:14,justifyContent:'center',flexWrap:'wrap'}}>
        {choices.map(c=>{
          const isRight=picked===c, isWrong=wrongPick===c
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
      {picked!=null && (
        <div style={{background:'var(--garden-green)',color:'#fff',borderRadius:50,padding:'8px 22px',fontFamily:'var(--font-display)',fontWeight:900,fontSize:20,animation:'s_bounceIn 0.5s cubic-bezier(.34,1.56,.64,1)'}}>{total} − {take} = {left}! ⭐</div>
      )}
    </div>
  )
}

// ─── Shell ───────────────────────────────────────────────────
function Shell({step,miloMood,bubble,children,onNext,nextReady,onBack,onSkip}:{
  step:number,miloMood:'happy'|'thinking'|'celebrate',bubble:string,children:React.ReactNode,
  onNext:()=>void,nextReady:boolean,onBack:()=>void,onSkip:()=>void,
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
        <img src={src} alt="Milo" style={{width:66,height:66,objectFit:'contain',flexShrink:0,filter:'drop-shadow(0 4px 8px rgba(61,37,22,.2))',animation:miloMood==='celebrate'?'s_jump 0.7s ease-in-out infinite':'s_idle 3s ease-in-out infinite'}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
        <div style={{background:'#fff',border:'3px solid var(--outline)',borderRadius:'18px 18px 18px 4px',padding:'10px 14px',flex:1,fontFamily:'var(--font-display)',fontWeight:700,fontSize:15,color:'var(--ink)',lineHeight:1.4,boxShadow:'0 4px 0 rgba(61,37,22,.07)'}}>{bubble}</div>
      </div>

      <div style={{flex:1,width:'100%',maxWidth:520,background:'rgba(255,255,255,0.72)',border:'3px solid var(--outline)',borderRadius:22,boxShadow:'0 5px 0 rgba(61,37,22,.07)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:16,minHeight:300,position:'relative',overflow:'hidden'}}>
        <ScaleToFill>{children}</ScaleToFill>
      </div>

      <button onClick={onNext} disabled={!nextReady} style={{width:'100%',maxWidth:520,padding:'15px',background:nextReady?'linear-gradient(135deg,var(--milo-orange) 0%,var(--milo-orange-deep) 100%)':'rgba(61,37,22,0.1)',color:nextReady?'#fff':'rgba(61,37,22,0.25)',border:'none',borderRadius:50,fontFamily:'var(--font-display)',fontWeight:900,fontSize:18,cursor:nextReady?'pointer':'not-allowed',boxShadow:nextReady?'0 4px 18px rgba(242,107,44,0.35)':'none',transition:'all 0.3s ease',transform:nextReady?'scale(1)':'scale(0.97)'}}>{nextReady?'Next →':'🎧 Listen to Milo...'}</button>
    </div>
  )
}

// ─── The 10 steps ────────────────────────────────────────────
function Step({i,onDone}:{i:number,onDone:()=>void}){
  switch(i){
    case 0: return <WatchSub total={3} take={1} emoji="🍪"
      intro="Milo has three cookies!" outro="Three take away one is two! Two cookies left!" onDone={onDone}/>
    case 1: return <SectionBreak emoji="🍃" title="Taking away makes FEWER!" subtitle="Some go away, so there are less left." onDone={onDone}/>
    case 2: return <WatchSub total={5} take={2} emoji="🎈"
      intro="Five balloons! Watch what happens." outro="Five take away two is three! Three balloons left!" onDone={onDone}/>
    case 3: return <TapAway total={4} take={1} emoji="🐦"
      intro="Four birds. Take one away — tap a bird to fly off!" outro="Four take away one is three! Three birds left!" onDone={onDone}/>
    case 4: return <SectionBreak emoji="🌟" title="You're taking away!" subtitle="Now let's pick how many are left!" onDone={onDone}/>
    case 5: return <WatchSub total={5} take={2} emoji="🐸"
      intro="Five frogs sit by the pond." outro="Five take away two is three! Three frogs left!" onDone={onDone}/>
    case 6: return <ChooseDiff total={4} take={1} emoji="🍎"
      intro="Four apples, one is taken away. How many are left? Pick the answer!" onDone={onDone}/>
    case 7: return <TapAway total={5} take={2} emoji="✨"
      intro="Five fireflies. Take two away — tap two to fly off!" outro="Five take away two is three! Three left!" onDone={onDone}/>
    case 8: return <ChooseDiff total={6} take={2} emoji="🍪"
      intro="Six cookies, two are eaten. How many are left? You choose!" onDone={onDone}/>
    case 9: return <WatchSub total={6} take={3} emoji="🐦"
      intro="Last one! Six birds in the tree." outro="Six take away three is three! You finished the whole lesson!" onDone={onDone}/>
    default: return null
  }
}

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════
export default function SubtractionLesson({childName,onLessonComplete}:Props){
  const router=useRouter()
  const [step,setStep]=useState(0)
  const [nextReady,setNextReady]=useState(false)
  const [confirmBack,setConfirmBack]=useState(false)

  const BUBBLES=[
    `Hi ${childName}! Let's learn TAKING AWAY! Watch the cookies! 🍪`,
    '🍃 Taking away makes FEWER!',
    'Watch the balloons — some pop away! 🎈',
    'Your turn! Tap a bird to fly away! 🐦',
    '🌟 You\'re taking away! Now pick the answer!',
    'Watch the frogs hop into the pond! 🐸',
    'How many apples are left? Pick it! 🍎',
    'Tap two fireflies to fly away! ✨',
    'How many cookies are left? You choose! 🍪',
    'Last one! Three birds fly off! 🐦',
  ]
  const MOODS:Array<'happy'|'thinking'|'celebrate'>=[
    'happy','celebrate','happy','thinking','celebrate','happy','thinking','thinking','thinking','happy',
  ]

  function done(){ setNextReady(true) }
  function next(){
    if(!nextReady)return
    stopSpeech()
    if(step>=TOTAL_STEPS-1){
      speak(`Brilliant, ${childName}! You can take away! Let's practise now!`)
      window.setTimeout(onLessonComplete,3000)
      return
    }
    setStep(s=>s+1); setNextReady(false)
  }

  return (
    <>
      <Shell step={step} miloMood={MOODS[step]} bubble={BUBBLES[step]} onNext={next} nextReady={nextReady}
        onBack={()=>setConfirmBack(true)} onSkip={()=>{stopSpeech();onLessonComplete()}}>
        <Step key={step} i={step} onDone={done}/>
      </Shell>

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
