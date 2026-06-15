'use client'
/**
 * CountingLesson — 17 steps for 3-5 year olds
 * Rich animations: section breaks, sparkle taps, drop-in objects,
 * mirror steps, celebrations between sections
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { speak, stopSpeech } from '@/lib/useMiloSpeaker'
import ScaleToFill from './ScaleToFill'

interface Props { childName: string; onLessonComplete: () => void }

const TOTAL_STEPS = 16
const NUM_COLORS  = [
  '#E64545','#F26B2C','#FFC933','#6FBE3F','#5BC3F0',
  '#9362D8','#E64545','#F26B2C','#FFC933','#6FBE3F',
]

// ─── Global CSS ───────────────────────────────────────────────
const CSS = `
  @keyframes bounceIn {
    0%  { transform:scale(0) translateY(30px); opacity:0 }
    60% { transform:scale(1.25) translateY(-6px); opacity:1 }
    100%{ transform:scale(1) translateY(0); opacity:1 }
  }
  @keyframes popIn {
    0%  { transform:scale(0); opacity:0 }
    70% { transform:scale(1.35); opacity:1 }
    100%{ transform:scale(1); opacity:1 }
  }
  @keyframes dropIn {
    0%  { transform:translateY(-80px) scale(0.6); opacity:0 }
    60% { transform:translateY(8px) scale(1.1); opacity:1 }
    100%{ transform:translateY(0) scale(1); opacity:1 }
  }
  @keyframes slideUp {
    from{ transform:translateY(50px); opacity:0 }
    to  { transform:translateY(0); opacity:1 }
  }
  @keyframes hopUp {
    0%,100%{ transform:translateY(0) scaleX(1) }
    35%    { transform:translateY(-32px) scaleX(0.8) }
    65%    { transform:translateY(-20px) scaleX(0.9) }
  }
  @keyframes pulse {
    0%,100%{ transform:scale(1) }
    50%    { transform:scale(1.14) }
  }
  @keyframes glow {
    0%,100%{ filter:drop-shadow(0 0 4px rgba(255,200,0,0.3)) }
    50%    { filter:drop-shadow(0 0 20px rgba(255,200,0,1)) }
  }
  @keyframes flipIn {
    0%  { transform:rotateY(90deg) scale(0.5); opacity:0 }
    100%{ transform:rotateY(0) scale(1); opacity:1 }
  }
  @keyframes sparkleOut {
    0%  { transform:scale(0) rotate(0deg); opacity:1 }
    100%{ transform:scale(2.5) rotate(180deg); opacity:0 }
  }
  @keyframes miloIdle {
    0%,100%{ transform:translateY(0) rotate(-2deg) }
    50%    { transform:translateY(-6px) rotate(2deg) }
  }
  @keyframes miloJump {
    0%,100%{ transform:translateY(0) rotate(-3deg) scale(1) }
    40%    { transform:translateY(-24px) rotate(5deg) scale(1.15) }
  }
  @keyframes confetti {
    from{ transform:translateY(-10px) rotate(0deg); opacity:1 }
    to  { transform:translateY(140px) rotate(540deg); opacity:0 }
  }
  @keyframes countBadge {
    0%  { transform:scale(0) rotate(-20deg); opacity:0 }
    60% { transform:scale(1.4) rotate(5deg); opacity:1 }
    100%{ transform:scale(1) rotate(0deg); opacity:1 }
  }
  @keyframes groundPop {
    0%  { transform:scaleY(0) translateY(20px); opacity:0; transform-origin:bottom }
    60% { transform:scaleY(1.2) translateY(-4px); opacity:1; transform-origin:bottom }
    100%{ transform:scaleY(1) translateY(0); opacity:1; transform-origin:bottom }
  }
  @keyframes floatBalloon {
    0%  { transform:translateY(60px) scale(0); opacity:0 }
    60% { transform:translateY(-6px) scale(1.1); opacity:1 }
    100%{ transform:translateY(0) scale(1); opacity:1 }
  }
  @keyframes sectionIn {
    0%  { transform:scale(0.4) rotate(-8deg); opacity:0 }
    60% { transform:scale(1.1) rotate(3deg); opacity:1 }
    100%{ transform:scale(1) rotate(0deg); opacity:1 }
  }
  @keyframes dotPop {
    0%  { transform:scale(0) }
    100%{ transform:scale(1) }
  }
  @keyframes numberPop {
    0%  { transform:scale(0) rotate(-15deg); opacity:0 }
    55% { transform:scale(1.3) rotate(4deg); opacity:1 }
    100%{ transform:scale(1) rotate(0deg); opacity:1 }
  }
  @keyframes sparkleRing {
    0%  { transform:scale(0.5); opacity:1 }
    100%{ transform:scale(2.2); opacity:0 }
  }
`

// ─── Helpers ─────────────────────────────────────────────────

function Confetti() {
  const colors = ['#E64545','#F26B2C','#FFC933','#6FBE3F','#5BC3F0','#9362D8']
  return (
    <div style={{position:'absolute',inset:0,pointerEvents:'none',overflow:'hidden',zIndex:10}}>
      {Array.from({length:20}).map((_,i)=>(
        <div key={i} style={{
          position:'absolute',
          left:`${8+(i*5)%84}%`,
          top:`${(i*11)%25}%`,
          width:10,height:10,
          borderRadius:i%2===0?'50%':'3px',
          background:colors[i%colors.length],
          animation:`confetti ${0.8+(i%3)*0.2}s ease-in ${(i%6)*0.07}s both`,
        }}/>
      ))}
    </div>
  )
}

// Sparkle that bursts from a tapped object
function SparkleAt({x,y}:{x:number,y:number}) {
  return (
    <div style={{
      position:'absolute', left:x-20, top:y-20,
      width:40,height:40, pointerEvents:'none', zIndex:20,
    }}>
      {['⭐','✨','💫','🌟'].map((s,i)=>(
        <span key={i} style={{
          position:'absolute',
          fontSize:14,
          top:'50%',left:'50%',
          animation:`sparkleOut 0.6s ease-out ${i*0.08}s both`,
          transformOrigin:'center',
          marginLeft:-7,marginTop:-7,
        }}>{s}</span>
      ))}
    </div>
  )
}

// Number card with dots
function NumberCard({n,visible,isActive,delay=0}:{n:number,visible:boolean,isActive:boolean,delay?:number}) {
  return (
    <div style={{
      width:62,height:78,
      background: visible ? NUM_COLORS[n-1] : 'rgba(200,200,200,0.15)',
      borderRadius:18,
      border:`3px solid ${visible ? 'rgba(61,37,22,.15)' : 'rgba(200,200,200,0.2)'}`,
      display:'flex',flexDirection:'column',
      alignItems:'center',justifyContent:'center',gap:5,
      opacity: visible ? 1 : 0,
      animation: visible ? `numberPop 0.5s cubic-bezier(.34,1.56,.64,1) ${delay}ms both` : 'none',
      // The number currently being spoken pops up BIG to grab the child's attention
      transform: isActive ? 'scale(1.9) translateY(-12px)' : 'scale(1)',
      zIndex: isActive ? 5 : 1,
      boxShadow: isActive
        ? `0 0 0 6px white, 0 18px 42px ${NUM_COLORS[n-1]}c0`
        : visible ? '0 4px 0 rgba(61,37,22,.18)' : 'none',
      transition:'transform 0.28s cubic-bezier(.34,1.56,.64,1), box-shadow 0.28s ease',
    }}>
      {visible && <>
        <span style={{
          fontFamily:'var(--font-display)',fontWeight:900,
          fontSize: isActive ? 52 : 32, color:'#fff',
          textShadow:'0 2px 6px rgba(0,0,0,.25)',lineHeight:1,
          transition:'font-size 0.28s ease',
        }}>{n}</span>
        <div style={{display:'flex',flexWrap:'wrap',gap:3,justifyContent:'center',maxWidth:46}}>
          {Array.from({length:Math.min(n,5)}).map((_,j)=>(
            <div key={j} style={{
              width:8,height:8,borderRadius:'50%',
              background:'rgba(255,255,255,0.9)',
              animation:`dotPop 0.2s ease ${j*60}ms both`,
            }}/>
          ))}
        </div>
      </>}
    </div>
  )
}

// Section celebration break
function SectionBreak({emoji,title,subtitle,onDone}:{
  emoji:string,title:string,subtitle:string,onDone:()=>void
}) {
  useEffect(()=>{
    window.setTimeout(onDone, 2800)
  },[onDone])
  return (
    <div style={{
      display:'flex',flexDirection:'column',
      alignItems:'center',justifyContent:'center',
      gap:16, padding:'20px 0', position:'relative',
    }}>
      <Confetti/>
      <div style={{fontSize:72,animation:'miloJump 0.8s ease-in-out infinite'}}>{emoji}</div>
      <div style={{
        fontFamily:'var(--font-display)',fontWeight:900,
        fontSize:28,color:'var(--milo-orange)',
        textAlign:'center',lineHeight:1.2,
        animation:'sectionIn 0.6s cubic-bezier(.34,1.56,.64,1)',
        textShadow:'0 3px 0 rgba(61,37,22,.1)',
      }}>{title}</div>
      <div style={{
        fontFamily:'var(--font-body)',fontSize:16,
        color:'var(--ink-soft)',textAlign:'center',
        animation:'slideUp 0.5s ease 0.2s both',
      }}>{subtitle}</div>
    </div>
  )
}

// Shell
function Shell({step,miloMood,bubble,children,onNext,nextReady,onBack,onSkip}:{
  step:number,miloMood:'happy'|'thinking'|'celebrate',
  bubble:string,children:React.ReactNode,
  onNext:()=>void,nextReady:boolean,onBack:()=>void,onSkip:()=>void,
}) {
  const src = miloMood==='thinking'
    ?'/assets/characters/milo-thinking.png'
    :'/assets/characters/milo-happy.png'
  return (
    <div className="milo-lesson" style={{
      minHeight:'100dvh',display:'flex',flexDirection:'column',
      alignItems:'center',background:'var(--bg-page)',
      padding:'10px 14px 24px',gap:10,
    }}>
      <style>{CSS}</style>

      {/* Top row: back button + progress */}
      <div style={{display:'flex',alignItems:'center',gap:10,width:'100%',maxWidth:520,paddingTop:6}}>
        <button
          onClick={onBack}
          style={{
            display:'flex',alignItems:'center',gap:4,
            padding:'7px 14px',borderRadius:50,flexShrink:0,
            background:'var(--paper)',
            border:'3px solid var(--milo-orange)',
            color:'var(--milo-orange)',
            fontFamily:'var(--font-display)',fontWeight:800,fontSize:13,
            cursor:'pointer',transition:'all 0.15s',
            boxShadow:'0 3px 0 rgba(242,107,44,.25)',
          }}
          onMouseDown={e=>{e.currentTarget.style.transform='translateY(3px)';e.currentTarget.style.boxShadow='none'}}
          onMouseUp={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='0 3px 0 rgba(242,107,44,.25)'}}
          onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='0 3px 0 rgba(242,107,44,.25)'}}
        >← Menu</button>
        <div style={{display:'flex',gap:4,flex:1,justifyContent:'center'}}>
        {Array.from({length:TOTAL_STEPS}).map((_,i)=>(
          <div key={i} style={{
            width:i===step?22:8,height:8,borderRadius:4,
            transition:'all 0.3s ease',
            background: i<step
              ?'var(--garden-green)'
              :i===step
                ?'var(--milo-orange)'
                :'rgba(61,37,22,0.12)',
          }}/>
        ))}
        </div>
        <button
          onClick={onSkip}
          title="Skip the lesson and start playing"
          style={{
            display:'flex',alignItems:'center',gap:4,
            padding:'7px 14px',borderRadius:50,flexShrink:0,
            background:'var(--garden-green)',border:'3px solid var(--garden-green-deep)',
            color:'#fff',
            fontFamily:'var(--font-display)',fontWeight:800,fontSize:13,
            cursor:'pointer',transition:'all 0.15s',
            boxShadow:'0 3px 0 var(--garden-green-deep)',
          }}
          onMouseDown={e=>{e.currentTarget.style.transform='translateY(3px)';e.currentTarget.style.boxShadow='none'}}
          onMouseUp={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='0 3px 0 var(--garden-green-deep)'}}
          onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='0 3px 0 var(--garden-green-deep)'}}
        >Skip ▶</button>
      </div>

      {/* Milo + bubble */}
      <div style={{display:'flex',alignItems:'flex-end',gap:10,width:'100%',maxWidth:520}}>
        <img src={src} alt="Milo" style={{
          width:66,height:66,objectFit:'contain',flexShrink:0,
          filter:'drop-shadow(0 4px 8px rgba(61,37,22,.2))',
          animation:miloMood==='celebrate'?'miloJump 0.7s ease-in-out infinite':'miloIdle 3s ease-in-out infinite',
        }} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
        <div style={{
          background:'#fff',border:'3px solid var(--outline)',
          borderRadius:'18px 18px 18px 4px',
          padding:'10px 14px',flex:1,
          fontFamily:'var(--font-display)',fontWeight:700,
          fontSize:15,color:'var(--ink)',lineHeight:1.4,
          boxShadow:'0 4px 0 rgba(61,37,22,.07)',
        }}>{bubble}</div>
      </div>

      {/* Visual area */}
      <div style={{
        flex:1,width:'100%',maxWidth:520,
        background:'rgba(255,255,255,0.72)',
        border:'3px solid var(--outline)',borderRadius:22,
        boxShadow:'0 5px 0 rgba(61,37,22,.07)',
        display:'flex',flexDirection:'column',
        alignItems:'center',justifyContent:'center',
        padding:16,minHeight:260,
        position:'relative',overflow:'hidden',
      }}>
        <ScaleToFill>{children}</ScaleToFill>
      </div>

      {/* Next */}
      <button onClick={onNext} disabled={!nextReady} style={{
        width:'100%',maxWidth:520,padding:'15px',
        background: nextReady
          ?'linear-gradient(135deg,var(--milo-orange) 0%,var(--milo-orange-deep) 100%)'
          :'rgba(61,37,22,0.1)',
        color:nextReady?'#fff':'rgba(61,37,22,0.25)',
        border:'none',borderRadius:50,
        fontFamily:'var(--font-display)',fontWeight:900,fontSize:18,
        cursor:nextReady?'pointer':'not-allowed',
        boxShadow:nextReady?'0 4px 18px rgba(242,107,44,0.35)':'none',
        transition:'all 0.3s ease',
        transform:nextReady?'scale(1)':'scale(0.97)',
      }}>{nextReady?'Next →':'🎧 Listen to Milo...'}</button>
    </div>
  )
}

// Big number that pops in the centre as counting progresses — one at a time.
// Give it `key={n}` at the call site so each change remounts and replays the pop.
function BigCount({n}:{n:number}) {
  if(n<=0) return null
  return (
    <div style={{
      fontFamily:'var(--font-display)',fontWeight:900,fontSize:104,lineHeight:1,
      color:NUM_COLORS[(n-1)%10],
      textShadow:'0 6px 0 rgba(61,37,22,.12)',
      animation:'numberPop 0.5s cubic-bezier(.34,1.56,.64,1)',
    }}>{n}</div>
  )
}

// ═══════════════════════════════════════════
// STEP 1 — Numbers 1-10: 1-5 appear on top, then 6-10 below
// ═══════════════════════════════════════════
function NumberRow({label,nums,shown,active}:{
  label:string,nums:number[],shown:number[],active:number
}) {
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
      <div style={{
        fontFamily:'var(--font-display)',fontWeight:800,fontSize:13,
        color:'var(--ink-muted)',letterSpacing:1.5,textTransform:'uppercase',
      }}>{label}</div>
      <div style={{display:'flex',gap:9,justifyContent:'center'}}>
        {nums.map(n=>(
          <NumberCard key={n} n={n} visible={shown.includes(n)} isActive={active===n}/>
        ))}
      </div>
    </div>
  )
}

function S1({onDone}:{onDone:()=>void}) {
  const [shown,setShown]=useState<number[]>([])
  const [active,setActive]=useState(0)
  const [showRow2,setShowRow2]=useState(false)
  const ran=useRef(false)
  useEffect(()=>{
    if(ran.current)return;ran.current=true
    speak("Let's meet the numbers! Watch carefully!")
    const words=['One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten']
    const STEP=900
    words.forEach((w,i)=>{
      window.setTimeout(()=>{
        if(i===5){ setShowRow2(true) }   // reveal the bottom row when 6 appears
        setShown(p=>[...p,i+1]);setActive(i+1)
        window.setTimeout(()=>speak(w),80)
      },1300+i*STEP)
    })
    window.setTimeout(()=>{
      setActive(0)
      speak('You know all the numbers from one to ten! Amazing!')
      window.setTimeout(onDone,2500)
    },1300+10*STEP+300)
  },[onDone])
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:30}}>
      <NumberRow label="Numbers 1 to 5 🌟" nums={[1,2,3,4,5]} shown={shown} active={active}/>
      <div style={{
        opacity:showRow2?1:0,
        transform:showRow2?'translateY(0)':'translateY(16px)',
        transition:'opacity 0.4s ease, transform 0.4s ease',
      }}>
        <NumberRow label="Numbers 6 to 10 🎯" nums={[6,7,8,9,10]} shown={shown} active={active}/>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════
// STEP 3 — Section break: "You know 1-10!"
// ═══════════════════════════════════════════
function S3({onDone}:{onDone:()=>void}) {
  useEffect(()=>{ speak('Amazing! You know all the numbers from one to ten! Wonderful!') },[])
  return (
    <SectionBreak
      emoji="🎉"
      title="You know 1 to 10!"
      subtitle="Now let's see the numbers count things!"
      onDone={onDone}
    />
  )
}

// ═══════════════════════════════════════════
// STEP 4 — Frog hops 1→10 (slower, bigger)
// ═══════════════════════════════════════════
function S4({onDone}:{onDone:()=>void}) {
  const [pos,setPos]=useState(0)
  const [active,setActive]=useState(0)
  const ran=useRef(false)
  const CELL=38
  useEffect(()=>{
    if(ran.current)return;ran.current=true
    speak('Watch the frog jump! He jumps on every number!')
    const words=['One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten']
    words.forEach((w,i)=>{
      window.setTimeout(()=>{
        setPos(i+1);setActive(i+1)
        window.setTimeout(()=>speak(w),120)
      },1600+i*1050)
    })
    window.setTimeout(()=>{
      speak('One to ten! The frog jumped on every single number! Brilliant!')
      window.setTimeout(onDone,3000)
    },1600+10*1050+400)
  },[onDone])
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,width:'100%'}}>
      <div style={{position:'relative',width:'100%',maxWidth:400,height:64}}>
        <div style={{
          position:'absolute',
          left:pos>0?`${(pos-1)*CELL+2}px`:'2px',
          bottom:6,fontSize:36,
          transition:'left 0.38s cubic-bezier(.34,1.56,.64,1)',
          animation:pos>0?'hopUp 0.38s ease':'none',
          filter:'drop-shadow(0 4px 8px rgba(0,0,0,.2))',
        }}>🐸</div>
      </div>
      <div style={{display:'flex',gap:4}}>
        {Array.from({length:10}).map((_,i)=>{
          const n=i+1,isA=active===n,isPast=active>n
          return (
            <div key={n} style={{
              width:34,height:34,borderRadius:10,
              background:isA?NUM_COLORS[i]:isPast?'var(--garden-green-soft)':'var(--cream)',
              border:`3px solid ${isA?NUM_COLORS[i]:'var(--outline)'}`,
              display:'flex',alignItems:'center',justifyContent:'center',
              fontFamily:'var(--font-display)',fontWeight:900,
              fontSize:isA?26:13,
              color:isA?'#fff':'var(--ink)',
              transform:isA?'scale(1.85)':'scale(1)',
              zIndex:isA?5:1,
              transition:'all 0.28s cubic-bezier(.34,1.56,.64,1)',
              boxShadow:isA?`0 0 0 5px white, 0 12px 26px ${NUM_COLORS[i]}b0`:'0 2px 0 rgba(61,37,22,.1)',
            }}>{n}</div>
          )
        })}
      </div>
      <div style={{display:'flex',gap:4}}>
        {Array.from({length:10}).map((_,i)=>(
          <div key={i} style={{width:34,textAlign:'center',fontSize:16}}>🍃</div>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════
// STEP 5 — Firefly groups 1-5 (items drop in)
// ═══════════════════════════════════════════
function S5({onDone}:{onDone:()=>void}) {
  const [gi,setGi]=useState(-1)
  const [shown,setShown]=useState(0)
  const [badge,setBadge]=useState(false)
  const ran=useRef(false)
  const GRP=[
    {n:1,w:'One firefly!'},
    {n:2,w:'Two fireflies!'},
    {n:3,w:'Three fireflies!'},
    {n:4,w:'Four fireflies!'},
    {n:5,w:'Five fireflies!'},
  ]
  useEffect(()=>{
    if(ran.current)return;ran.current=true
    speak('Watch! Each number means this many fireflies!')
    let base=1400
    GRP.forEach((g,idx)=>{
      window.setTimeout(()=>{
        setGi(idx);setShown(0);setBadge(false)
        window.setTimeout(()=>speak(g.w),200)
        for(let k=1;k<=g.n;k++){
          window.setTimeout(()=>setShown(k),k*260)
        }
        window.setTimeout(()=>setBadge(true),g.n*260+350)
      },base)
      base+=g.n*260+1300
    })
    window.setTimeout(()=>{
      speak('One, two, three, four, five! Now you know!')
      window.setTimeout(onDone,2800)
    },base+200)
  },[onDone])
  const g=gi>=0?GRP[gi]:null
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:14}}>
      <div style={{display:'flex',gap:8}}>
        {GRP.map((gr,i)=>(
          <div key={i} style={{
            width:38,height:38,borderRadius:10,
            background:i===gi?NUM_COLORS[i]:i<gi?'var(--garden-green)':'var(--cream)',
            border:`2.5px solid ${i===gi?NUM_COLORS[i]:'var(--outline)'}`,
            display:'flex',alignItems:'center',justifyContent:'center',
            fontFamily:'var(--font-display)',fontWeight:900,
            fontSize:17,color:i<=gi?'#fff':'var(--ink-muted)',
            transform:i===gi?'scale(1.28)':'scale(1)',
            transition:'all 0.28s cubic-bezier(.34,1.56,.64,1)',
            opacity:i>gi?0.32:1,
            boxShadow:i===gi?`0 4px 12px ${NUM_COLORS[i]}70`:'0 2px 0 rgba(61,37,22,.1)',
          }}>{gr.n}</div>
        ))}
      </div>
      {g && (
        <div style={{
          display:'flex',flexWrap:'wrap',gap:8,
          justifyContent:'center',maxWidth:260,
          minHeight:90,padding:'14px 16px',
          background:'rgba(255,255,255,0.55)',
          border:'2px solid var(--outline)',borderRadius:18,
        }}>
          {Array.from({length:g.n}).map((_,i)=>(
            <div key={i} style={{position:'relative'}}>
              <span style={{
                fontSize:40,display:'inline-block',
                opacity:i<shown?1:0,
                animation:i<shown?`dropIn 0.4s cubic-bezier(.34,1.56,.64,1) both`:'none',
                filter:i<shown?'drop-shadow(0 0 10px rgba(255,200,0,0.8))':'none',
              }}>✨</span>
            </div>
          ))}
        </div>
      )}
      {g&&badge&&(
        <div style={{
          background:NUM_COLORS[gi>=0?gi:0],color:'#fff',
          borderRadius:50,padding:'8px 22px',
          fontFamily:'var(--font-display)',fontWeight:900,fontSize:22,
          boxShadow:'0 4px 0 rgba(61,37,22,.2)',
          animation:'bounceIn 0.45s cubic-bezier(.34,1.56,.64,1)',
        }}>{g.n} ✨</div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════
// STEP 6 — Star groups 6-10 (same style)
// ═══════════════════════════════════════════
function S6({onDone}:{onDone:()=>void}) {
  const [gi,setGi]=useState(-1)
  const [shown,setShown]=useState(0)
  const [badge,setBadge]=useState(false)
  const ran=useRef(false)
  const GRP=[
    {n:6,w:'Six stars!'},
    {n:7,w:'Seven stars!'},
    {n:8,w:'Eight stars!'},
    {n:9,w:'Nine stars!'},
    {n:10,w:'Ten stars!'},
  ]
  useEffect(()=>{
    if(ran.current)return;ran.current=true
    speak('Now the bigger groups! Six all the way to ten!')
    let base=1400
    GRP.forEach((g,idx)=>{
      window.setTimeout(()=>{
        setGi(idx);setShown(0);setBadge(false)
        window.setTimeout(()=>speak(g.w),200)
        for(let k=1;k<=g.n;k++){
          window.setTimeout(()=>setShown(k),k*200)
        }
        window.setTimeout(()=>setBadge(true),g.n*200+350)
      },base)
      base+=g.n*200+1300
    })
    window.setTimeout(()=>{
      speak('Six, seven, eight, nine, ten! You know ALL the numbers now!')
      window.setTimeout(onDone,2800)
    },base+200)
  },[onDone])
  const g=gi>=0?GRP[gi]:null
  const col=NUM_COLORS[(gi+5)%10]
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:14}}>
      <div style={{display:'flex',gap:8}}>
        {GRP.map((gr,i)=>(
          <div key={i} style={{
            width:38,height:38,borderRadius:10,
            background:i===gi?NUM_COLORS[(i+5)%10]:i<gi?'var(--garden-green)':'var(--cream)',
            border:`2.5px solid ${i===gi?NUM_COLORS[(i+5)%10]:'var(--outline)'}`,
            display:'flex',alignItems:'center',justifyContent:'center',
            fontFamily:'var(--font-display)',fontWeight:900,
            fontSize:15,color:i<=gi?'#fff':'var(--ink-muted)',
            transform:i===gi?'scale(1.28)':'scale(1)',
            transition:'all 0.28s cubic-bezier(.34,1.56,.64,1)',
            opacity:i>gi?0.32:1,
          }}>{gr.n}</div>
        ))}
      </div>
      {g&&(
        <div style={{
          display:'flex',flexWrap:'wrap',gap:6,
          justifyContent:'center',maxWidth:300,
          minHeight:90,padding:'12px 14px',
          background:'rgba(255,255,255,0.55)',
          border:'2px solid var(--outline)',borderRadius:18,
        }}>
          {Array.from({length:g.n}).map((_,i)=>(
            <div key={i} style={{position:'relative'}}>
              <span style={{
                fontSize:32,display:'inline-block',
                opacity:i<shown?1:0,
                animation:i<shown?'dropIn 0.35s cubic-bezier(.34,1.56,.64,1) both':'none',
              }}>🌟</span>
            </div>
          ))}
        </div>
      )}
      {g&&badge&&(
        <div style={{
          background:col,color:'#fff',
          borderRadius:50,padding:'8px 22px',
          fontFamily:'var(--font-display)',fontWeight:900,fontSize:22,
          boxShadow:'0 4px 0 rgba(61,37,22,.2)',
          animation:'bounceIn 0.45s cubic-bezier(.34,1.56,.64,1)',
        }}>{g.n} 🌟</div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════
// STEP 7 — Section break: "Now let's count!"
// ═══════════════════════════════════════════
function S7({onDone}:{onDone:()=>void}) {
  useEffect(()=>{ speak('Great job! Now let us COUNT together! Watch Milo first!') },[])
  return (
    <SectionBreak
      emoji="🌟"
      title="Now let's COUNT!"
      subtitle="Watch Milo first, then your turn!"
      onDone={onDone}
    />
  )
}

// ═══════════════════════════════════════════
// STEP 8 — WATCH: Milo counts 3 apples (drop from sky)
// ═══════════════════════════════════════════
function S8({onDone}:{onDone:()=>void}) {
  const [shown,setShown]=useState(0)
  const [badge,setBadge]=useState(false)
  const ran=useRef(false)
  useEffect(()=>{
    if(ran.current)return;ran.current=true
    speak('Watch me count! See how I touch each apple!')
    window.setTimeout(()=>{
      [1,2,3].forEach((n,i)=>{
        window.setTimeout(()=>{
          setShown(n)
          window.setTimeout(()=>speak(String(n)),100)
        },i*900)
      })
      window.setTimeout(()=>{
        setBadge(true)
        speak('Three apples! One, two, three! See how I count each one!')
        window.setTimeout(onDone,2800)
      },3*900+500)
    },1000)
  },[onDone])
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:22}}>
      <BigCount key={shown} n={shown}/>
      <div style={{display:'flex',gap:18}}>
        {[0,1,2].map(i=>(
          <div key={i} style={{position:'relative',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <span style={{
              fontSize:64,display:'block',
              opacity:shown>i?1:0,
              animation:shown>i?'dropIn 0.5s cubic-bezier(.34,1.56,.64,1) both':'none',
              filter:shown===i+1?'drop-shadow(0 0 16px rgba(242,107,44,0.7))':'none',
            }}>🍎</span>          </div>
        ))}
      </div>
      {badge&&(
        <div style={{
          background:'var(--milo-orange)',color:'#fff',
          borderRadius:50,padding:'12px 28px',
          fontFamily:'var(--font-display)',fontWeight:900,fontSize:26,
          boxShadow:'0 5px 0 rgba(61,37,22,.2)',
          animation:'flipIn 0.5s ease',
        }}>3 apples! 🍎🍎🍎</div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════
// STEP 9 — TAP_IT: 3 apples (mirror of step 8)
// ═══════════════════════════════════════════
function S9({onDone}:{onDone:()=>void}) {
  const [tapped,setTapped]=useState<number[]>([])
  const [sparkles,setSparkles]=useState<{x:number,y:number,id:number}[]>([])
  const [done,setDone]=useState(false)
  const [burst,setBurst]=useState(false)
  const spoken=useRef(false)
  let spId=useRef(0)

  useEffect(()=>{
    if(spoken.current)return;spoken.current=true
    speak('Now YOU try! Tap each apple to count it! Go!')
  },[])

  function tap(i:number,e:React.MouseEvent){
    if(tapped.includes(i)||done)return
    const rect=(e.currentTarget as HTMLElement).getBoundingClientRect()
    const next=[...tapped,i]
    setTapped(next)
    speak(String(next.length))
    // Sparkle
    spId.current++
    const sid=spId.current
    setSparkles(p=>[...p,{x:rect.left+rect.width/2,y:rect.top+rect.height/2,id:sid}])
    window.setTimeout(()=>setSparkles(p=>p.filter(s=>s.id!==sid)),700)
    if(next.length===3){
      setDone(true);setBurst(true)
      window.setTimeout(()=>{
        speak('Three! You counted three apples! Just like Milo! Amazing!')
        window.setTimeout(onDone,2200)
      },400)
    }
  }

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:20,position:'relative'}}>
      {burst&&<Confetti/>}
      {sparkles.map(s=><SparkleAt key={s.id} x={s.x} y={s.y}/>)}
      <BigCount key={tapped.length} n={tapped.length}/>
      <div style={{
        fontFamily:'var(--font-display)',fontWeight:800,fontSize:15,
        color:'var(--milo-orange)',background:'var(--milo-orange-soft)',
        borderRadius:50,padding:'6px 18px',border:'2px solid var(--milo-orange)',
      }}>Tap each apple! 👆</div>
      <div style={{display:'flex',gap:20}}>
        {[0,1,2].map(i=>{
          const isTapped=tapped.includes(i)
          return (
            <button key={i} onClick={e=>tap(i,e)} disabled={isTapped} style={{
              background:'transparent',border:'none',
              cursor:isTapped?'default':'pointer',
              position:'relative',width:90,height:90,
              display:'flex',alignItems:'center',justifyContent:'center',
            }}>
              <span style={{
                fontSize:64,
                opacity:isTapped?0.35:1,
                transform:isTapped?'scale(0.85)':'scale(1)',
                animation:!isTapped?'pulse 1.5s ease-in-out infinite':'none',
                animationDelay:`${i*0.2}s`,
                filter:isTapped?'grayscale(1)':'none',
                transition:'all 0.2s ease',
              }}>🍎</span>
              {!isTapped&&(
                <div style={{
                  position:'absolute',inset:-4,borderRadius:'50%',
                  border:'3px dashed var(--milo-orange)',
                  animation:'pulse 1.5s ease-in-out infinite',
                  animationDelay:`${i*0.2}s`,
                  pointerEvents:'none',
                }}/>
              )}            </button>
          )
        })}
      </div>
      {done&&(
        <div style={{
          background:'var(--garden-green)',color:'#fff',
          borderRadius:50,padding:'10px 26px',
          fontFamily:'var(--font-display)',fontWeight:900,fontSize:22,
          animation:'bounceIn 0.5s cubic-bezier(.34,1.56,.64,1)',
        }}>🍎 3 apples! Well done!</div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════
// STEP 10 — WATCH: 5 frogs jump in from sides
// ═══════════════════════════════════════════
function S10({onDone}:{onDone:()=>void}) {
  const [shown,setShown]=useState(0)
  const [badge,setBadge]=useState(false)
  const ran=useRef(false)
  useEffect(()=>{
    if(ran.current)return;ran.current=true
    speak('Watch five frogs jump in! Count with me!')
    window.setTimeout(()=>{
      [1,2,3,4,5].forEach((n,i)=>{
        window.setTimeout(()=>{
          setShown(n)
          window.setTimeout(()=>speak(String(n)),100)
        },i*750)
      })
      window.setTimeout(()=>{
        setBadge(true)
        speak('Five frogs! One, two, three, four, five!')
        window.setTimeout(onDone,2800)
      },5*750+600)
    },1000)
  },[onDone])
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:20}}>
      <BigCount key={shown} n={shown}/>
      <div style={{display:'flex',gap:10,flexWrap:'wrap',justifyContent:'center'}}>
        {[0,1,2,3,4].map(i=>(
          <div key={i} style={{position:'relative',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <span style={{
              fontSize:52,display:'block',
              opacity:shown>i?1:0,
              animation:shown>i
                ?(i%2===0
                  ?'slideUp 0.45s cubic-bezier(.34,1.56,.64,1) both'
                  :'dropIn 0.45s cubic-bezier(.34,1.56,.64,1) both')
                :'none',
              filter:shown===i+1?'drop-shadow(0 0 14px rgba(111,190,63,0.8))':'none',
            }}>🐸</span>          </div>
        ))}
      </div>
      {badge&&(
        <div style={{
          background:NUM_COLORS[4],color:'#fff',
          borderRadius:50,padding:'10px 24px',
          fontFamily:'var(--font-display)',fontWeight:900,fontSize:24,
          boxShadow:'0 4px 0 rgba(61,37,22,.2)',
          animation:'flipIn 0.5s ease',
        }}>5 frogs! 🐸</div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════
// STEP 11 — TAP_IT: 5 stars (mirror of step 10)
// ═══════════════════════════════════════════
function S11({onDone}:{onDone:()=>void}) {
  const [tapped,setTapped]=useState<number[]>([])
  const [sparkles,setSparkles]=useState<{x:number,y:number,id:number}[]>([])
  const [done,setDone]=useState(false)
  const [burst,setBurst]=useState(false)
  const spoken=useRef(false)
  const spId=useRef(0)

  useEffect(()=>{
    if(spoken.current)return;spoken.current=true
    speak('Now your turn! Tap every star! Count each one!')
  },[])

  function tap(i:number,e:React.MouseEvent){
    if(tapped.includes(i)||done)return
    const rect=(e.currentTarget as HTMLElement).getBoundingClientRect()
    const next=[...tapped,i]
    setTapped(next)
    speak(String(next.length))
    spId.current++
    const sid=spId.current
    setSparkles(p=>[...p,{x:rect.left+rect.width/2,y:rect.top+rect.height/2,id:sid}])
    window.setTimeout(()=>setSparkles(p=>p.filter(s=>s.id!==sid)),700)
    if(next.length===5){
      setDone(true);setBurst(true)
      window.setTimeout(()=>{
        speak('Five stars! You are a superstar counter!')
        window.setTimeout(onDone,2200)
      },400)
    }
  }

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:16,position:'relative'}}>
      {burst&&<Confetti/>}
      {sparkles.map(s=><SparkleAt key={s.id} x={s.x} y={s.y}/>)}
      <BigCount key={tapped.length} n={tapped.length}/>
      <div style={{
        fontFamily:'var(--font-display)',fontWeight:800,fontSize:14,
        color:'var(--sun-yellow-deep)',background:'var(--sun-yellow-soft)',
        borderRadius:50,padding:'5px 16px',border:'2px solid var(--sun-yellow-deep)',
      }}>Tap each star! ⭐</div>
      <div style={{display:'flex',gap:10,flexWrap:'wrap',justifyContent:'center'}}>
        {[0,1,2,3,4].map(i=>{
          const isTapped=tapped.includes(i)
          return (
            <button key={i} onClick={e=>tap(i,e)} disabled={isTapped} style={{
              background:'transparent',border:'none',
              cursor:isTapped?'default':'pointer',
              position:'relative',width:76,height:76,
              display:'flex',alignItems:'center',justifyContent:'center',
            }}>
              <span style={{
                fontSize:56,
                opacity:isTapped?0.3:1,
                animation:!isTapped?'pulse 1.5s ease-in-out infinite':'none',
                animationDelay:`${i*0.18}s`,
                filter:isTapped?'grayscale(1)':'none',
                transition:'all 0.2s',
              }}>⭐</span>
              {!isTapped&&(
                <div style={{
                  position:'absolute',inset:-4,borderRadius:'50%',
                  border:'3px dashed var(--sun-yellow-deep)',
                  animation:'pulse 1.5s ease-in-out infinite',
                  animationDelay:`${i*0.18}s`,
                  pointerEvents:'none',
                }}/>
              )}            </button>
          )
        })}
      </div>
      {done&&(
        <div style={{
          background:'var(--sun-yellow-deep)',color:'#fff',
          borderRadius:50,padding:'8px 22px',
          fontFamily:'var(--font-display)',fontWeight:900,fontSize:20,
          animation:'bounceIn 0.5s cubic-bezier(.34,1.56,.64,1)',
        }}>⭐ Five stars! Brilliant!</div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════
// STEP 12 — Section: "Now the big numbers!"
// ═══════════════════════════════════════════
function S12({onDone}:{onDone:()=>void}) {
  useEffect(()=>{ speak('Fantastic! Now let us count the bigger numbers! Six, seven, eight, nine, ten!') },[])
  return (
    <SectionBreak
      emoji="🚀"
      title="Big numbers time!"
      subtitle="Count 6, 7, 8, 9 and 10!"
      onDone={onDone}
    />
  )
}

// ═══════════════════════════════════════════
// STEP 13 — WATCH: 8 mushrooms pop from ground
// ═══════════════════════════════════════════
function S13({onDone}:{onDone:()=>void}) {
  const [shown,setShown]=useState(0)
  const [badge,setBadge]=useState(false)
  const ran=useRef(false)
  useEffect(()=>{
    if(ran.current)return;ran.current=true
    speak('Watch these mushrooms pop up! Count every one!')
    window.setTimeout(()=>{
      Array.from({length:8}).forEach((_,i)=>{
        window.setTimeout(()=>{
          setShown(i+1)
          window.setTimeout(()=>speak(String(i+1)),80)
        },i*560)
      })
      window.setTimeout(()=>{
        setBadge(true)
        speak('Eight mushrooms! One, two, three, four, five, six, seven, eight!')
        window.setTimeout(onDone,3000)
      },8*560+600)
    },1000)
  },[onDone])
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:16}}>
      <BigCount key={shown} n={shown}/>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
        {Array.from({length:8}).map((_,i)=>(
          <div key={i} style={{position:'relative',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <span style={{
              fontSize:44,display:'block',
              opacity:shown>i?1:0,
              animation:shown>i?'groundPop 0.45s cubic-bezier(.34,1.56,.64,1) both':'none',
              filter:shown===i+1?'drop-shadow(0 0 12px rgba(242,107,44,0.6))':'none',
            }}>🍄</span>          </div>
        ))}
      </div>
      {badge&&(
        <div style={{
          background:NUM_COLORS[7],color:'#fff',
          borderRadius:50,padding:'8px 22px',
          fontFamily:'var(--font-display)',fontWeight:900,fontSize:22,
          animation:'flipIn 0.5s ease',
          boxShadow:'0 4px 0 rgba(61,37,22,.2)',
        }}>8 mushrooms! 🍄</div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════
// STEP 14 — TAP_IT: 6 mushrooms (sparkle taps)
// ═══════════════════════════════════════════
function S14({onDone}:{onDone:()=>void}) {
  const [tapped,setTapped]=useState<number[]>([])
  const [sparkles,setSparkles]=useState<{x:number,y:number,id:number}[]>([])
  const [done,setDone]=useState(false)
  const [burst,setBurst]=useState(false)
  const spoken=useRef(false)
  const spId=useRef(0)

  useEffect(()=>{
    if(spoken.current)return;spoken.current=true
    speak('Now you count! Tap all the mushrooms!')
  },[])

  function tap(i:number,e:React.MouseEvent){
    if(tapped.includes(i)||done)return
    const rect=(e.currentTarget as HTMLElement).getBoundingClientRect()
    const next=[...tapped,i]
    setTapped(next);speak(String(next.length))
    spId.current++
    const sid=spId.current
    setSparkles(p=>[...p,{x:rect.left+rect.width/2,y:rect.top+rect.height/2,id:sid}])
    window.setTimeout(()=>setSparkles(p=>p.filter(s=>s.id!==sid)),700)
    if(next.length===6){
      setDone(true);setBurst(true)
      window.setTimeout(()=>{
        speak('Six mushrooms! You counted every single one!')
        window.setTimeout(onDone,2200)
      },400)
    }
  }

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:14,position:'relative'}}>
      {burst&&<Confetti/>}
      {sparkles.map(s=><SparkleAt key={s.id} x={s.x} y={s.y}/>)}
      <BigCount key={tapped.length} n={tapped.length}/>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
        {Array.from({length:6}).map((_,i)=>{
          const isTapped=tapped.includes(i)
          return (
            <button key={i} onClick={e=>tap(i,e)} disabled={isTapped} style={{
              background:'transparent',border:'none',
              cursor:isTapped?'default':'pointer',
              position:'relative',width:80,height:80,
              display:'flex',alignItems:'center',justifyContent:'center',
            }}>
              <span style={{
                fontSize:56,
                opacity:isTapped?0.3:1,
                animation:!isTapped?'pulse 1.7s ease-in-out infinite':'none',
                animationDelay:`${i*0.15}s`,
                filter:isTapped?'grayscale(1)':'none',
                transition:'all 0.2s',
              }}>🍄</span>
              {!isTapped&&(
                <div style={{
                  position:'absolute',inset:-4,borderRadius:'50%',
                  border:'3px dashed var(--milo-orange)',
                  animation:'pulse 1.7s ease-in-out infinite',
                  animationDelay:`${i*0.15}s`,
                  pointerEvents:'none',
                }}/>
              )}            </button>
          )
        })}
      </div>
      <p style={{fontFamily:'var(--font-body)',fontSize:14,color:'var(--ink-muted)',margin:0}}>
        {done?'🎉 Six mushrooms!':`${tapped.length} of 6`}
      </p>
    </div>
  )
}

// ═══════════════════════════════════════════
// STEP 15 — COUNT_IT: 9 balloons float up
// ═══════════════════════════════════════════
function S15({onDone}:{onDone:()=>void}) {
  const [tapped,setTapped]=useState<number[]>([])
  const [sparkles,setSparkles]=useState<{x:number,y:number,id:number}[]>([])
  const [done,setDone]=useState(false)
  const [burst,setBurst]=useState(false)
  const spoken=useRef(false)
  const spId=useRef(0)
  const COLS=['#E64545','#F26B2C','#FFC933','#6FBE3F','#5BC3F0','#9362D8','#E64545','#F26B2C','#FFC933']

  useEffect(()=>{
    if(spoken.current)return;spoken.current=true
    speak('Count these balloons! Tap every single one!')
  },[])

  function tap(i:number,e:React.MouseEvent){
    if(tapped.includes(i)||done)return
    const rect=(e.currentTarget as HTMLElement).getBoundingClientRect()
    const next=[...tapped,i]
    setTapped(next);speak(String(next.length))
    spId.current++
    const sid=spId.current
    setSparkles(p=>[...p,{x:rect.left+rect.width/2,y:rect.top+rect.height/2,id:sid}])
    window.setTimeout(()=>setSparkles(p=>p.filter(s=>s.id!==sid)),700)
    if(next.length===9){
      setDone(true);setBurst(true)
      window.setTimeout(()=>{
        speak('Nine balloons! Incredible counting! Almost at ten!')
        window.setTimeout(onDone,2200)
      },400)
    }
  }

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:10,position:'relative'}}>
      {burst&&<Confetti/>}
      {sparkles.map(s=><SparkleAt key={s.id} x={s.x} y={s.y}/>)}
      <BigCount key={tapped.length} n={tapped.length}/>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
        {Array.from({length:9}).map((_,i)=>{
          const isTapped=tapped.includes(i)
          return (
            <button key={i} onClick={e=>tap(i,e)} disabled={isTapped} style={{
              background:'transparent',border:'none',
              cursor:isTapped?'default':'pointer',
              display:'flex',flexDirection:'column',
              alignItems:'center',position:'relative',width:72,
            }}>
              <div style={{
                width:50,height:58,
                borderRadius:'50% 50% 50% 50% / 55% 55% 45% 45%',
                background:isTapped?'#ccc':COLS[i],
                opacity:isTapped?0.35:1,
                transition:'all 0.2s',
                animation:!isTapped?`pulse 1.4s ease-in-out infinite`:'none',
                animationDelay:`${i*0.11}s`,
                boxShadow:isTapped?'none':`0 4px 14px ${COLS[i]}60`,
              }}/>
              <div style={{width:1,height:10,background:'#888',opacity:isTapped?0.3:0.6}}/>
            </button>
          )
        })}
      </div>
      <p style={{fontFamily:'var(--font-body)',fontSize:14,color:'var(--ink-muted)',margin:0}}>
        {done?'🎈 Nine balloons!':`${tapped.length} of 9`}
      </p>
    </div>
  )
}

// ═══════════════════════════════════════════
// STEP 16 — TAP_IT: 10 flowers (grand finale tap)
// ═══════════════════════════════════════════
function S16({onDone}:{onDone:()=>void}) {
  const [tapped,setTapped]=useState<number[]>([])
  const [sparkles,setSparkles]=useState<{x:number,y:number,id:number}[]>([])
  const [done,setDone]=useState(false)
  const [burst,setBurst]=useState(false)
  const spoken=useRef(false)
  const spId=useRef(0)

  useEffect(()=>{
    if(spoken.current)return;spoken.current=true
    speak('Last one! Can you count to TEN? Tap all the flowers!')
  },[])

  function tap(i:number,e:React.MouseEvent){
    if(tapped.includes(i)||done)return
    const rect=(e.currentTarget as HTMLElement).getBoundingClientRect()
    const next=[...tapped,i]
    setTapped(next);speak(String(next.length))
    spId.current++
    const sid=spId.current
    setSparkles(p=>[...p,{x:rect.left+rect.width/2,y:rect.top+rect.height/2,id:sid}])
    window.setTimeout(()=>setSparkles(p=>p.filter(s=>s.id!==sid)),700)
    if(next.length===10){
      setDone(true);setBurst(true)
      window.setTimeout(()=>{
        speak('TEN! You counted ALL ten flowers! You are a counting superstar! Amazing!')
        window.setTimeout(onDone,3000)
      },400)
    }
  }

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:12,position:'relative'}}>
      {burst&&<Confetti/>}
      {sparkles.map(s=><SparkleAt key={s.id} x={s.x} y={s.y}/>)}
      <BigCount key={tapped.length} n={tapped.length}/>
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:6}}>
        {Array.from({length:10}).map((_,i)=>{
          const isTapped=tapped.includes(i)
          return (
            <button key={i} onClick={e=>tap(i,e)} disabled={isTapped} style={{
              background:'transparent',border:'none',
              cursor:isTapped?'default':'pointer',
              position:'relative',width:56,height:64,
              display:'flex',alignItems:'center',justifyContent:'center',
            }}>
              <span style={{
                fontSize:40,
                opacity:isTapped?0.3:1,
                animation:!isTapped?'pulse 1.6s ease-in-out infinite':'none',
                animationDelay:`${i*0.12}s`,
                filter:isTapped?'grayscale(1)':'none',
                transition:'all 0.2s',
              }}>🌸</span>
              {!isTapped&&(
                <div style={{
                  position:'absolute',inset:-2,borderRadius:'50%',
                  border:'2.5px dashed #ff6b9d',
                  animation:'pulse 1.6s ease-in-out infinite',
                  animationDelay:`${i*0.12}s`,
                  pointerEvents:'none',
                }}/>
              )}            </button>
          )
        })}
      </div>
      <p style={{fontFamily:'var(--font-body)',fontSize:14,color:'var(--ink-muted)',margin:0}}>
        {done?'🌸 All 10 flowers! Superstar!':`${tapped.length} of 10`}
      </p>
    </div>
  )
}

// ═══════════════════════════════════════════
// STEP 17 — REVEAL: 4 butterflies mystery
// ═══════════════════════════════════════════
function S17({onDone}:{onDone:()=>void}) {
  const [countIdx,setCountIdx]=useState(-1)
  const [showAnswer,setShowAnswer]=useState(false)
  const [burst,setBurst]=useState(false)
  const ran=useRef(false)
  useEffect(()=>{
    if(ran.current)return;ran.current=true
    speak('Final challenge! How many butterflies? Count with me!')
    window.setTimeout(()=>{
      [0,1,2,3].forEach((i)=>{
        window.setTimeout(()=>{
          setCountIdx(i)
          window.setTimeout(()=>speak(String(i+1)),100)
        },i*750)
      })
      window.setTimeout(()=>{
        setShowAnswer(true);setBurst(true)
        speak('Four butterflies! The answer is four! You finished the whole lesson! Incredible!')
        window.setTimeout(onDone,4000)
      },4*750+600)
    },1200)
  },[onDone])
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:20,position:'relative'}}>
      {burst&&<Confetti/>}
      <div style={{
        background:'var(--sun-yellow-soft)',border:'3px solid var(--sun-yellow-deep)',
        borderRadius:50,padding:'8px 22px',
        fontFamily:'var(--font-display)',fontWeight:800,fontSize:18,color:'var(--ink)',
      }}>How many butterflies? 🦋</div>
      <BigCount key={countIdx} n={showAnswer?0:countIdx+1}/>
      <div style={{display:'flex',gap:14,flexWrap:'wrap',justifyContent:'center'}}>
        {[0,1,2,3].map(i=>(
          <div key={i} style={{position:'relative',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <span style={{
              fontSize:64,display:'block',
              opacity:countIdx>=i?1:0.15,
              transform:countIdx===i?'scale(1.4)':countIdx>i?'scale(1)':'scale(0.7)',
              transition:'all 0.35s cubic-bezier(.34,1.56,.64,1)',
              filter:countIdx===i
                ?'drop-shadow(0 0 20px rgba(147,98,216,0.9))'
                :countIdx>i
                  ?'drop-shadow(0 0 6px rgba(147,98,216,0.3))'
                  :'grayscale(1)',
            }}>🦋</span>          </div>
        ))}
      </div>
      {showAnswer&&(
        <div style={{
          background:'var(--milo-orange)',color:'#fff',
          borderRadius:20,padding:'16px 36px',
          fontFamily:'var(--font-display)',fontWeight:900,fontSize:36,
          boxShadow:'0 6px 0 rgba(61,37,22,.2)',
          animation:'flipIn 0.6s ease both',
        }}>4! 🦋🦋🦋🦋</div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════
export default function CountingLesson({childName,onLessonComplete}:Props) {
  const router=useRouter()
  const [step,setStep]=useState(0)
  const [nextReady,setNextReady]=useState(false)
  const [confirmBack,setConfirmBack]=useState(false)

  const BUBBLES=[
    `Hi ${childName}! Let's meet the numbers 1 to 10! Watch every one! 🌟`,
    '🎉 You know 1 to 10! Now watch them count things!',
    'The frog jumps on every number! Watch closely! 🐸',
    'Watch! Each number means this many things! ✨',
    'Now the bigger groups — six to ten! 🌟',
    '🌟 Now let\'s COUNT together!',
    'Watch Milo count three apples! See how he does it! 🍎',
    'Your turn! Tap each apple — just like Milo did! 🍎',
    'Five frogs jump in! Count every one! 🐸',
    'Your turn! Tap each star to count! ⭐',
    '🚀 Big numbers time! Six, seven, eight, nine, ten!',
    'Watch the mushrooms pop up! Count with me! 🍄',
    'Now YOU count! Tap all the mushrooms! 🍄',
    'Count the balloons — tap every single one! 🎈',
    'Last one! Can you reach TEN? Tap all the flowers! 🌸',
    'Final challenge! Count the butterflies with me! 🦋',
  ]

  const MOODS:Array<'happy'|'thinking'|'celebrate'>=[
    'happy','celebrate',
    'happy','happy','happy','celebrate',
    'happy','thinking','happy','thinking','celebrate',
    'happy','thinking','thinking','thinking','celebrate',
  ]

  function done(){setNextReady(true)}

  function next(){
    if(!nextReady)return
    stopSpeech()
    if(step>=TOTAL_STEPS-1){
      speak(`Incredible work, ${childName}! You are a counting champion! Let's practise now!`)
      window.setTimeout(onLessonComplete,3500)
      return
    }
    setStep(s=>s+1)
    setNextReady(false)
  }

  const STEPS=[
    <S1  key={0}  onDone={done}/>,
    <S3  key={1}  onDone={done}/>,
    <S4  key={2}  onDone={done}/>,
    <S5  key={3}  onDone={done}/>,
    <S6  key={4}  onDone={done}/>,
    <S7  key={5}  onDone={done}/>,
    <S8  key={6}  onDone={done}/>,
    <S9  key={7}  onDone={done}/>,
    <S10 key={8}  onDone={done}/>,
    <S11 key={9}  onDone={done}/>,
    <S12 key={10} onDone={done}/>,
    <S13 key={11} onDone={done}/>,
    <S14 key={12} onDone={done}/>,
    <S15 key={13} onDone={done}/>,
    <S16 key={14} onDone={done}/>,
    <S17 key={15} onDone={done}/>,
  ]

  return (
    <>
      <Shell
        step={step}
        miloMood={MOODS[step]}
        bubble={BUBBLES[step]}
        onNext={next}
        nextReady={nextReady}
        onBack={()=>setConfirmBack(true)}
        onSkip={()=>{stopSpeech();onLessonComplete()}}
      >
        {STEPS[step]}
      </Shell>

      {confirmBack && (
        <div style={{
          position:'fixed',inset:0,zIndex:200,
          background:'rgba(61,37,22,0.65)',
          display:'flex',alignItems:'center',justifyContent:'center',
          padding:24,
        }}>
          <div style={{
            background:'var(--paper)',border:'4px solid var(--outline)',
            borderRadius:24,padding:'28px 24px',
            maxWidth:320,width:'100%',textAlign:'center',
            boxShadow:'0 6px 0 var(--outline)',
          }}>
            <div style={{fontSize:48,marginBottom:8}}>⚠️</div>
            <h3 style={{
              fontFamily:'var(--font-display)',fontSize:20,
              margin:'0 0 8px',color:'var(--ink)',
            }}>Leave the lesson?</h3>
            <p style={{
              fontSize:14,color:'var(--ink-soft)',
              margin:'0 0 20px',lineHeight:1.5,
            }}>Your lesson progress will be lost.</p>
            <div style={{display:'flex',gap:10}}>
              <button
                onClick={()=>router.push('/menu')}
                style={{
                  flex:1,padding:'12px',
                  background:'var(--apple-red)',color:'#fff',
                  border:'none',borderRadius:50,
                  fontFamily:'var(--font-display)',
                  fontSize:14,fontWeight:800,cursor:'pointer',
                  boxShadow:'0 3px 0 rgba(61,37,22,.2)',
                }}
              >Yes, leave</button>
              <button
                onClick={()=>setConfirmBack(false)}
                style={{
                  flex:1,padding:'12px',
                  background:'var(--paper)',border:'3px solid var(--outline)',
                  borderRadius:50,
                  fontFamily:'var(--font-display)',
                  fontSize:14,fontWeight:700,cursor:'pointer',color:'var(--ink)',
                }}
              >Keep going!</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}