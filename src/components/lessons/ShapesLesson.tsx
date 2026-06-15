'use client'
/**
 * ShapesLesson — animated baby-step intro to the basic shapes, for 3-5 yrs.
 * Teaches each shape by name with a friendly fact (a circle is round, a triangle
 * has 3 corners…).
 *   WATCH (a shape is drawn + named + described) → CHOOSE (tap the named shape).
 */

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { speak, speakSeq, stopSpeech } from '@/lib/useMiloSpeaker'

interface Props { childName: string; onLessonComplete: () => void }

const TOTAL_STEPS = 10

export type ShapeName = 'circle' | 'square' | 'triangle' | 'rectangle' | 'star' | 'heart'
export interface Shape { name: ShapeName; label: string; path: string; fact: string }

export const SHAPES: Record<ShapeName, Shape> = {
  circle:    { name:'circle',    label:'circle',    path:'M50,10 a40,40 0 1,0 0.001,0 Z',                                   fact:'A circle is round, with no corners.' },
  square:    { name:'square',    label:'square',    path:'M10,10 h80 v80 h-80 Z',                                            fact:'A square has four equal sides and four corners.' },
  triangle:  { name:'triangle',  label:'triangle',  path:'M50,5 L95,95 L5,95 Z',                                             fact:'A triangle has three sides, like a roof.' },
  rectangle: { name:'rectangle', label:'rectangle', path:'M5,25 h90 v50 h-90 Z',                                             fact:'A rectangle has two long sides and two short sides.' },
  star:      { name:'star',      label:'star',      path:'M50,5 l12,35 h37 l-30,22 11,35 L50,77 l-30,20 11-35 L1,40 h37 Z', fact:'A star has five pointy points.' },
  heart:     { name:'heart',     label:'heart',     path:'M50,85 C20,65 5,50 5,30 a20,20 0 0,1 45,-5 a20,20 0 0,1 45,5 C95,50 80,65 50,85 Z', fact:'A heart, the shape of love!' },
}
export const SHAPE_ORDER: ShapeName[] = ['circle','square','triangle','rectangle','star','heart']
export const COLORS: Record<ShapeName, string> = {
  circle:'#5BC3F0', square:'#F26B2C', triangle:'#6FBE3F',
  rectangle:'#9362D8', star:'#FFC933', heart:'#E64545',
}

export const CSS = `
  @keyframes sh_bounceIn {0%{transform:scale(0) translateY(30px);opacity:0}60%{transform:scale(1.25) translateY(-6px);opacity:1}100%{transform:scale(1) translateY(0);opacity:1}}
  @keyframes sh_pop {0%{transform:scale(0) rotate(-12deg);opacity:0}55%{transform:scale(1.25) rotate(6deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}
  @keyframes sh_slideUp {from{transform:translateY(50px);opacity:0}to{transform:translateY(0);opacity:1}}
  @keyframes sh_idle {0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-6px) rotate(2deg)}}
  @keyframes sh_jump {0%,100%{transform:translateY(0) rotate(-3deg) scale(1)}40%{transform:translateY(-24px) rotate(5deg) scale(1.15)}}
  @keyframes sh_confetti {from{transform:translateY(-10px) rotate(0deg);opacity:1}to{transform:translateY(140px) rotate(540deg);opacity:0}}
  @keyframes sh_sectionIn {0%{transform:scale(0.4) rotate(-8deg);opacity:0}60%{transform:scale(1.1) rotate(3deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}
  @keyframes sh_shake {0%,100%{transform:translateX(0)}25%{transform:translateX(-7px)}75%{transform:translateX(7px)}}
  @keyframes sh_float {0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-8px) rotate(2deg)}}
`

export function ShapeSVG({ name, size = 96, outline = false }: { name: ShapeName; size?: number; outline?: boolean }) {
  const s = SHAPES[name]
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <path d={s.path} fill={outline ? 'none' : COLORS[name]} stroke={outline ? 'var(--ink-muted)' : 'none'} strokeWidth={outline ? 7 : 0} strokeLinejoin="round" />
    </svg>
  )
}

function Confetti() {
  const colors = ['#E64545','#F26B2C','#FFC933','#6FBE3F','#5BC3F0','#9362D8']
  return (
    <div style={{position:'absolute',inset:0,pointerEvents:'none',overflow:'hidden',zIndex:10}}>
      {Array.from({length:20}).map((_,i)=>(
        <div key={i} style={{position:'absolute',left:`${8+(i*5)%84}%`,top:`${(i*11)%25}%`,width:10,height:10,
          borderRadius:i%2===0?'50%':'3px',background:colors[i%colors.length],
          animation:`sh_confetti ${0.8+(i%3)*0.2}s ease-in ${(i%6)*0.07}s both`}}/>
      ))}
    </div>
  )
}

function SectionBreak({emoji,title,subtitle,onDone}:{emoji:string,title:string,subtitle:string,onDone:()=>void}) {
  useEffect(()=>{ const t=window.setTimeout(onDone,2800); return ()=>window.clearTimeout(t) },[onDone])
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16,padding:'20px 0',position:'relative'}}>
      <Confetti/>
      <div style={{fontSize:72,animation:'sh_jump 0.8s ease-in-out infinite'}}>{emoji}</div>
      <div style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:28,color:'var(--milo-orange)',textAlign:'center',lineHeight:1.2,animation:'sh_sectionIn 0.6s cubic-bezier(.34,1.56,.64,1)',textShadow:'0 3px 0 rgba(61,37,22,.1)'}}>{title}</div>
      <div style={{fontFamily:'var(--font-body)',fontSize:16,color:'var(--ink-soft)',textAlign:'center',animation:'sh_slideUp 0.5s ease 0.2s both'}}>{subtitle}</div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// WATCH — a shape is drawn, named, and described
// ═══════════════════════════════════════════════════════════
export function WatchShape({name,intro,outro,onDone}:{
  name:ShapeName,intro:string,outro:string,onDone:()=>void
}) {
  const shape=SHAPES[name]
  const [shown,setShown]=useState(false)
  const [told,setTold]=useState(false)
  const ran=useRef(false)

  useEffect(()=>{
    if(ran.current)return
    ran.current=true
    const lines=[intro, `This is a ${shape.label}!`, shape.fact, outro]
    let started=false, finished=false
    const cleanups:Array<()=>void>=[]
    const at=(fn:()=>void,ms:number)=>{ const id=window.setTimeout(fn,ms); cleanups.push(()=>window.clearTimeout(id)) }
    at(()=>setShown(true), 200)                 // the shape pops in regardless of audio
    const complete=()=>{ if(finished)return; finished=true; at(onDone,900) }
    const apply=(i:number)=>{ if(i===1) setShown(true); if(i===2) setTold(true) }

    const cancel=speakSeq(lines,{ onWord:(i)=>{ started=true; apply(i) }, onDone:complete })
    cleanups.push(cancel)
    at(()=>{
      if(started||finished)return
      cancel()
      at(()=>speak(intro),0)
      at(()=>{ setShown(true); speak(`This is a ${shape.label}!`) },1900)
      at(()=>{ setTold(true); speak(shape.fact) },3600)
      at(()=>{ speak(outro); complete() },6000)
    },1900)

    return ()=>{ cleanups.forEach(fn=>fn()) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[])

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:16,width:'100%'}}>
      <div style={{minHeight:140,display:'flex',alignItems:'center',justifyContent:'center'}}>
        {shown && (
          <div style={{animation:'sh_pop 0.5s cubic-bezier(.34,1.56,.64,1), sh_float 3s ease-in-out 0.5s infinite',filter:`drop-shadow(0 6px 0 rgba(61,37,22,.18))`}}>
            <ShapeSVG name={name} size={132}/>
          </div>
        )}
      </div>
      <div style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:30,color:COLORS[name],textTransform:'capitalize',textShadow:'0 2px 0 rgba(61,37,22,.12)'}}>{shape.label}</div>
      {told && (
        <div style={{background:'var(--paper)',border:'3px solid var(--outline)',borderRadius:16,padding:'10px 18px',maxWidth:360,textAlign:'center',fontFamily:'var(--font-body)',fontWeight:700,fontSize:15,color:'var(--ink-soft)',animation:'sh_slideUp 0.4s ease both'}}>
          {shape.fact}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// CHOOSE — tap the named shape from a few options
// ═══════════════════════════════════════════════════════════
export function ChooseShape({target,options,intro,onDone}:{
  target:ShapeName,options:ShapeName[],intro:string,onDone:()=>void
}) {
  const [picked,setPicked]=useState<ShapeName|null>(null)
  const [wrong,setWrong]=useState<ShapeName|null>(null)
  const [burst,setBurst]=useState(false)
  const spoken=useRef(false)
  useEffect(()=>{ if(spoken.current)return; spoken.current=true; speak(intro) },[intro])
  function pick(n:ShapeName){
    if(picked)return
    if(n===target){ setPicked(n); setWrong(null); setBurst(true); speak(`Yes! That's the ${SHAPES[target].label}! Wonderful!`); window.setTimeout(onDone,2400) }
    else { setWrong(n); speak(`That's a ${SHAPES[n].label}. Find the ${SHAPES[target].label}! Try again!`); window.setTimeout(()=>setWrong(null),900) }
  }
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:18,position:'relative',width:'100%'}}>
      {burst&&<Confetti/>}
      <div style={{fontFamily:'var(--font-display)',fontWeight:800,fontSize:17,color:'var(--ink)',background:'var(--sun-yellow-soft)',border:'2px solid var(--sun-yellow-deep)',borderRadius:50,padding:'8px 20px'}}>
        Tap the <span style={{color:COLORS[target],textTransform:'capitalize'}}>{SHAPES[target].label}</span>! 👆
      </div>
      <div style={{display:'flex',gap:14,flexWrap:'wrap',justifyContent:'center'}}>
        {options.map(n=>{
          const isRight=picked===n, isWrong=wrong===n
          return (
            <button key={n} onClick={()=>pick(n)} disabled={picked!=null} style={{
              width:96,height:96,borderRadius:22,
              background:isRight?'var(--garden-green-soft)':isWrong?'var(--apple-red-soft)':'var(--paper)',
              border:`4px solid ${isRight?'var(--garden-green)':isWrong?'var(--apple-red)':'var(--outline)'}`,
              boxShadow:isRight?'0 6px 0 var(--garden-green-deep)':isWrong?'0 6px 0 var(--apple-red-deep)':'0 6px 0 #c8ac79',
              cursor:picked!=null?'default':'pointer',display:'flex',alignItems:'center',justifyContent:'center',
              animation:isWrong?'sh_shake 0.4s ease both':'none',
              transform:isRight?'scale(1.1) translateY(-4px)':'scale(1)',transition:'transform 160ms cubic-bezier(.34,1.56,.64,1)',
            }}>
              <ShapeSVG name={n} size={60}/>
            </button>
          )
        })}
      </div>
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
    <div style={{minHeight:'100dvh',display:'flex',flexDirection:'column',alignItems:'center',background:'var(--bg-page)',padding:'10px 14px 24px',gap:10}}>
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
        <img src={src} alt="Milo" style={{width:66,height:66,objectFit:'contain',flexShrink:0,filter:'drop-shadow(0 4px 8px rgba(61,37,22,.2))',animation:miloMood==='celebrate'?'sh_jump 0.7s ease-in-out infinite':'sh_idle 3s ease-in-out infinite'}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
        <div style={{background:'#fff',border:'3px solid var(--outline)',borderRadius:'18px 18px 18px 4px',padding:'10px 14px',flex:1,fontFamily:'var(--font-display)',fontWeight:700,fontSize:15,color:'var(--ink)',lineHeight:1.4,boxShadow:'0 4px 0 rgba(61,37,22,.07)'}}>{bubble}</div>
      </div>

      <div style={{flex:1,width:'100%',maxWidth:520,background:'rgba(255,255,255,0.72)',border:'3px solid var(--outline)',borderRadius:22,boxShadow:'0 5px 0 rgba(61,37,22,.07)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:16,minHeight:320,position:'relative',overflow:'hidden'}}>
        {children}
      </div>

      <button onClick={onNext} disabled={!nextReady} style={{width:'100%',maxWidth:520,padding:'15px',background:nextReady?'linear-gradient(135deg,var(--milo-orange) 0%,var(--milo-orange-deep) 100%)':'rgba(61,37,22,0.1)',color:nextReady?'#fff':'rgba(61,37,22,0.25)',border:'none',borderRadius:50,fontFamily:'var(--font-display)',fontWeight:900,fontSize:18,cursor:nextReady?'pointer':'not-allowed',boxShadow:nextReady?'0 4px 18px rgba(242,107,44,0.35)':'none',transition:'all 0.3s ease',transform:nextReady?'scale(1)':'scale(0.97)'}}>{nextReady?'Next →':'🎧 Listen to Milo...'}</button>
    </div>
  )
}

// ─── The 10 steps ────────────────────────────────────────────
function Step({i,onDone}:{i:number,onDone:()=>void}){
  switch(i){
    case 0: return <WatchShape name="circle"
      intro="Let's meet our first shape!" outro="That's a circle — round and round!" onDone={onDone}/>
    case 1: return <WatchShape name="square"
      intro="Here is the next shape." outro="That's a square — four equal sides!" onDone={onDone}/>
    case 2: return <ChooseShape target="circle" options={['triangle','circle','square']}
      intro="Your turn! Tap the circle." onDone={onDone}/>
    case 3: return <WatchShape name="triangle"
      intro="Look at this pointy one." outro="That's a triangle — three corners!" onDone={onDone}/>
    case 4: return <SectionBreak emoji="🔷" title="You're learning shapes!" subtitle="Let's meet a few more." onDone={onDone}/>
    case 5: return <WatchShape name="rectangle"
      intro="This one is like a door." outro="That's a rectangle — long and tall!" onDone={onDone}/>
    case 6: return <ChooseShape target="square" options={['square','rectangle','circle']}
      intro="Tap the square — careful, not the rectangle!" onDone={onDone}/>
    case 7: return <WatchShape name="star"
      intro="Twinkle, twinkle! Look up high." outro="That's a star — five points!" onDone={onDone}/>
    case 8: return <ChooseShape target="triangle" options={['circle','square','triangle','star']}
      intro="Tap the triangle!" onDone={onDone}/>
    case 9: return <WatchShape name="heart"
      intro="Last shape — and a sweet one!" outro="That's a heart! You learned all the shapes!" onDone={onDone}/>
    default: return null
  }
}

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════
export default function ShapesLesson({childName,onLessonComplete}:Props){
  const router=useRouter()
  const [step,setStep]=useState(0)
  const [nextReady,setNextReady]=useState(false)
  const [confirmBack,setConfirmBack]=useState(false)

  const BUBBLES=[
    `Hi ${childName}! Let's learn SHAPES! First, the circle! 🔵`,
    'Next up — the square! 🟧',
    'Your turn! Tap the circle! 👆',
    'A pointy triangle! 🔺',
    '🔷 You\'re learning shapes!',
    'A rectangle, like a door! 🟪',
    'Tap the square — not the rectangle! 👆',
    'Twinkle! A star! ⭐',
    'Tap the triangle! 👆',
    'Last one — a heart! ❤️',
  ]
  const MOODS:Array<'happy'|'thinking'|'celebrate'>=[
    'happy','happy','thinking','happy','celebrate','happy','thinking','happy','thinking','celebrate',
  ]

  function done(){ setNextReady(true) }
  function next(){
    if(!nextReady)return
    stopSpeech()
    if(step>=TOTAL_STEPS-1){
      speak(`Brilliant, ${childName}! You know your shapes! Let's practise now!`)
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
