'use client'
/**
 * AdditionLesson — animated intro to adding for 3-5 year olds.
 * Teaches the core idea: adding = putting two groups TOGETHER, then
 * counting how many there are altogether.
 *
 * Same architecture as CountingLesson.tsx:
 *   WATCH (Milo demonstrates) → TAP_IT (count the total) → CHOOSE (pick the sum)
 *   with section-break celebrations and a final REVEAL.
 */

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { speak, stopSpeech } from '@/lib/useMiloSpeaker'
import ScaleToFill from './ScaleToFill'

interface Props { childName: string; onLessonComplete: () => void }

const TOTAL_STEPS = 10

const GROUP_A_COLOR = 'var(--sky-blue)'
const GROUP_B_COLOR = 'var(--garden-green)'
const TOTAL_COLOR   = 'var(--milo-orange)'
const BADGE_COLORS  = ['#E64545','#F26B2C','#FFC933','#6FBE3F','#5BC3F0','#9362D8','#E64545','#F26B2C']

function numberWord(n: number): string {
  return ['zero','one','two','three','four','five','six','seven','eight','nine','ten'][n] ?? String(n)
}

// ─── Global CSS (shared keyframes) ────────────────────────────
export const CSS = `
  @keyframes a_bounceIn {
    0%  { transform:scale(0) translateY(30px); opacity:0 }
    60% { transform:scale(1.25) translateY(-6px); opacity:1 }
    100%{ transform:scale(1) translateY(0); opacity:1 }
  }
  @keyframes a_dropIn {
    0%  { transform:translateY(-80px) scale(0.6); opacity:0 }
    60% { transform:translateY(8px) scale(1.1); opacity:1 }
    100%{ transform:translateY(0) scale(1); opacity:1 }
  }
  @keyframes a_slideUp {
    from{ transform:translateY(50px); opacity:0 }
    to  { transform:translateY(0); opacity:1 }
  }
  @keyframes a_slideInRight {
    0%  { transform:translateX(70px) scale(0.6); opacity:0 }
    60% { transform:translateX(-6px) scale(1.1); opacity:1 }
    100%{ transform:translateX(0) scale(1); opacity:1 }
  }
  @keyframes a_pulse {
    0%,100%{ transform:scale(1) }
    50%    { transform:scale(1.14) }
  }
  @keyframes a_flipIn {
    0%  { transform:rotateY(90deg) scale(0.5); opacity:0 }
    100%{ transform:rotateY(0) scale(1); opacity:1 }
  }
  @keyframes a_sparkleOut {
    0%  { transform:scale(0) rotate(0deg); opacity:1 }
    100%{ transform:scale(2.5) rotate(180deg); opacity:0 }
  }
  @keyframes a_miloIdle {
    0%,100%{ transform:translateY(0) rotate(-2deg) }
    50%    { transform:translateY(-6px) rotate(2deg) }
  }
  @keyframes a_miloJump {
    0%,100%{ transform:translateY(0) rotate(-3deg) scale(1) }
    40%    { transform:translateY(-24px) rotate(5deg) scale(1.15) }
  }
  @keyframes a_confetti {
    from{ transform:translateY(-10px) rotate(0deg); opacity:1 }
    to  { transform:translateY(140px) rotate(540deg); opacity:0 }
  }
  @keyframes a_countBadge {
    0%  { transform:scale(0) rotate(-20deg); opacity:0 }
    60% { transform:scale(1.4) rotate(5deg); opacity:1 }
    100%{ transform:scale(1) rotate(0deg); opacity:1 }
  }
  @keyframes a_sectionIn {
    0%  { transform:scale(0.4) rotate(-8deg); opacity:0 }
    60% { transform:scale(1.1) rotate(3deg); opacity:1 }
    100%{ transform:scale(1) rotate(0deg); opacity:1 }
  }
`

// ─── Small shared pieces ─────────────────────────────────────

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
          animation:`a_confetti ${0.8+(i%3)*0.2}s ease-in ${(i%6)*0.07}s both`,
        }}/>
      ))}
    </div>
  )
}

function SparkleAt({x,y}:{x:number,y:number}) {
  return (
    <div style={{position:'absolute',left:x-20,top:y-20,width:40,height:40,pointerEvents:'none',zIndex:20}}>
      {['⭐','✨','💫','🌟'].map((s,i)=>(
        <span key={i} style={{
          position:'absolute',fontSize:14,top:'50%',left:'50%',
          animation:`a_sparkleOut 0.6s ease-out ${i*0.08}s both`,
          transformOrigin:'center',marginLeft:-7,marginTop:-7,
        }}>{s}</span>
      ))}
    </div>
  )
}

function CountBadge({n,color}:{n:number,color:string}) {
  return (
    <div style={{
      position:'absolute',top:-6,right:-6,
      width:26,height:26,borderRadius:'50%',
      background:color,color:'#fff',
      display:'flex',alignItems:'center',justifyContent:'center',
      fontFamily:'var(--font-display)',fontWeight:900,fontSize:13,
      border:'2.5px solid var(--outline)',
      animation:'a_countBadge 0.4s cubic-bezier(.34,1.56,.64,1)',
      boxShadow:'0 3px 8px rgba(0,0,0,.25)',zIndex:5,
    }}>{n}</div>
  )
}

function GroupBadge({n,color}:{n:number,color:string}) {
  return (
    <div style={{
      width:40,height:40,borderRadius:'50%',
      border:'3px solid var(--outline)',background:color,color:'#fff',
      display:'flex',alignItems:'center',justifyContent:'center',
      fontFamily:'var(--font-display)',fontWeight:900,fontSize:20,
      boxShadow:'0 3px 0 rgba(61,37,22,.2)',
    }}>{n}</div>
  )
}

// Big number that pops in the centre as counting progresses (one at a time).
function BigCount({n}:{n:number}) {
  if(n<=0) return null
  return (
    <div style={{
      fontFamily:'var(--font-display)',fontWeight:900,fontSize:60,lineHeight:1,
      color:'var(--milo-orange)',textShadow:'0 5px 0 rgba(61,37,22,.12)',
      animation:'a_countBadge 0.4s cubic-bezier(.34,1.56,.64,1)',
    }}>{n}</div>
  )
}

function SectionBreak({emoji,title,subtitle,onDone}:{
  emoji:string,title:string,subtitle:string,onDone:()=>void
}) {
  useEffect(()=>{ const t=window.setTimeout(onDone,2800); return ()=>window.clearTimeout(t) },[onDone])
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16,padding:'20px 0',position:'relative'}}>
      <Confetti/>
      <div style={{fontSize:72,animation:'a_miloJump 0.8s ease-in-out infinite'}}>{emoji}</div>
      <div style={{
        fontFamily:'var(--font-display)',fontWeight:900,fontSize:28,
        color:'var(--milo-orange)',textAlign:'center',lineHeight:1.2,
        animation:'a_sectionIn 0.6s cubic-bezier(.34,1.56,.64,1)',
        textShadow:'0 3px 0 rgba(61,37,22,.1)',
      }}>{title}</div>
      <div style={{
        fontFamily:'var(--font-body)',fontSize:16,color:'var(--ink-soft)',
        textAlign:'center',animation:'a_slideUp 0.5s ease 0.2s both',
      }}>{subtitle}</div>
    </div>
  )
}

// ─── Shell (back + progress + Milo bubble + Next) ────────────
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

      <div style={{display:'flex',alignItems:'center',gap:10,width:'100%',maxWidth:520,paddingTop:6}}>
        <button
          onClick={onBack}
          style={{
            display:'flex',alignItems:'center',gap:4,
            padding:'7px 14px',borderRadius:50,flexShrink:0,
            background:'var(--paper)',border:'3px solid var(--milo-orange)',
            color:'var(--milo-orange)',
            fontFamily:'var(--font-display)',fontWeight:800,fontSize:13,
            cursor:'pointer',transition:'all 0.15s',
            boxShadow:'0 3px 0 rgba(242,107,44,.25)',
          }}
        >← Menu</button>
        <div style={{display:'flex',gap:4,flex:1,justifyContent:'center',flexWrap:'wrap'}}>
        {Array.from({length:TOTAL_STEPS}).map((_,i)=>(
          <div key={i} style={{
            width:i===step?22:8,height:8,borderRadius:4,transition:'all 0.3s ease',
            background:i<step?'var(--garden-green)':i===step?'var(--milo-orange)':'rgba(61,37,22,0.12)',
          }}/>
        ))}
        </div>
        <button onClick={onSkip} title="Skip the lesson and start playing" style={{
          display:'flex',alignItems:'center',gap:4,padding:'7px 14px',borderRadius:50,flexShrink:0,
          background:'var(--garden-green)',border:'3px solid var(--garden-green-deep)',color:'#fff',
          fontFamily:'var(--font-display)',fontWeight:800,fontSize:13,cursor:'pointer',
          boxShadow:'0 3px 0 var(--garden-green-deep)',
        }}>Skip ▶</button>
      </div>

      <div style={{display:'flex',alignItems:'flex-end',gap:10,width:'100%',maxWidth:520}}>
        <img src={src} alt="Milo" style={{
          width:66,height:66,objectFit:'contain',flexShrink:0,
          filter:'drop-shadow(0 4px 8px rgba(61,37,22,.2))',
          animation:miloMood==='celebrate'?'a_miloJump 0.7s ease-in-out infinite':'a_miloIdle 3s ease-in-out infinite',
        }} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
        <div style={{
          background:'#fff',border:'3px solid var(--outline)',
          borderRadius:'18px 18px 18px 4px',padding:'10px 14px',flex:1,
          fontFamily:'var(--font-display)',fontWeight:700,
          fontSize:15,color:'var(--ink)',lineHeight:1.4,
          boxShadow:'0 4px 0 rgba(61,37,22,.07)',
        }}>{bubble}</div>
      </div>

      <div style={{
        flex:1,width:'100%',maxWidth:520,
        background:'rgba(255,255,255,0.72)',
        border:'3px solid var(--outline)',borderRadius:22,
        boxShadow:'0 5px 0 rgba(61,37,22,.07)',
        display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
        padding:16,minHeight:260,position:'relative',overflow:'hidden',
      }}>
        <ScaleToFill>{children}</ScaleToFill>
      </div>

      <button onClick={onNext} disabled={!nextReady} style={{
        width:'100%',maxWidth:520,padding:'15px',
        background:nextReady?'linear-gradient(135deg,var(--milo-orange) 0%,var(--milo-orange-deep) 100%)':'rgba(61,37,22,0.1)',
        color:nextReady?'#fff':'rgba(61,37,22,0.25)',
        border:'none',borderRadius:50,
        fontFamily:'var(--font-display)',fontWeight:900,fontSize:18,
        cursor:nextReady?'pointer':'not-allowed',
        boxShadow:nextReady?'0 4px 18px rgba(242,107,44,0.35)':'none',
        transition:'all 0.3s ease',transform:nextReady?'scale(1)':'scale(0.97)',
      }}>{nextReady?'Next →':'🎧 Listen to Milo...'}</button>
    </div>
  )
}

// ─── An equation row: [group A] + [group B] ( = total ) ──────
function ItemSpan({emoji,size,highlight,badge,badgeColor,anim}:{
  emoji:string,size:number,highlight?:boolean,badge?:number,badgeColor?:string,anim?:string
}) {
  return (
    <div style={{position:'relative',display:'inline-flex',alignItems:'center',justifyContent:'center'}}>
      <span style={{
        fontSize:size,display:'block',
        animation:anim,
        filter:highlight?'drop-shadow(0 0 14px rgba(255,200,0,0.9))':'none',
        transition:'filter 0.2s ease',
      }}>{emoji}</span>
      {badge!=null && <CountBadge n={badge} color={badgeColor??'var(--milo-orange)'}/>}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// WATCH — Milo combines two groups and counts the total
// ═══════════════════════════════════════════════════════════
export function WatchAdd({a,b,emoji,intro,outro,onDone}:{
  a:number,b:number,emoji:string,intro:string,outro:string,onDone:()=>void
}) {
  const total=a+b
  const [shown,setShown]=useState(0)      // items revealed so far (group A first, then B)
  const [bigN,setBigN]=useState(0)        // big centre count number
  const [showTotal,setShowTotal]=useState(false)
  const ran=useRef(false)
  const alive=useRef(false)

  useEffect(()=>{
    alive.current=true
    if(!ran.current){
      ran.current=true
      // Plain fixed-timer pacing (like the Counting lesson) — no afterSpeech.
      speak(intro)
      let t=2200                                  // lead so the short intro finishes
      for(let k=1;k<=total;k++){                   // each object pops in as it's counted
        const kk=k
        window.setTimeout(()=>{ if(!alive.current)return; setShown(kk); setBigN(kk); window.setTimeout(()=>{ if(alive.current) speak(String(kk)) },60) }, t); t+=1100
      }
      t+=500
      window.setTimeout(()=>{ if(!alive.current)return; setShowTotal(true); speak(outro); window.setTimeout(()=>{ if(alive.current) onDone() },3800) }, t)
    }
    return ()=>{ alive.current=false }
  },[])

  // Render a group's slots: empty outline until that object is counted, then it pops in.
  const renderGroup = (count:number, offset:number) => (
    <div style={{display:'flex',gap:6,flexWrap:'wrap',justifyContent:'center',maxWidth:150,minHeight:50}}>
      {Array.from({length:count}).map((_,i)=>{
        const idx=offset+i
        const seen=shown>idx
        const justNow=shown===idx+1 && !showTotal
        return seen ? (
          <span key={i} style={{
            fontSize:40,display:'inline-block',
            animation:'a_bounceIn 0.45s cubic-bezier(.34,1.56,.64,1)',
            filter:justNow?'drop-shadow(0 0 12px rgba(255,200,0,0.9))':'none',
          }}>{emoji}</span>
        ) : (
          <div key={i} style={{width:40,height:40,borderRadius:'50%',border:'2px dashed rgba(61,37,22,0.18)'}}/>
        )
      })}
    </div>
  )

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:14,width:'100%'}}>
      {/* big counting number */}
      <div style={{height:58,display:'flex',alignItems:'center',justifyContent:'center'}}>
        {bigN>0 && !showTotal && <BigCount key={bigN} n={bigN}/>}
      </div>

      <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:12,flexWrap:'wrap'}}>
        {/* Group A */}
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8}}>
          {renderGroup(a,0)}
          <GroupBadge n={a} color={GROUP_A_COLOR}/>
        </div>

        <div style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:40,color:'var(--milo-orange)'}}>+</div>

        {/* Group B */}
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8}}>
          {renderGroup(b,a)}
          <GroupBadge n={b} color={GROUP_B_COLOR}/>
        </div>

        <div style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:40,color:'var(--milo-orange)',opacity:showTotal?1:0.2,transition:'opacity 0.3s'}}>=</div>

        {/* Total */}
        <div style={{
          width:78,height:78,borderRadius:20,border:'4px solid var(--milo-orange-deep)',
          background:TOTAL_COLOR,display:'flex',alignItems:'center',justifyContent:'center',
          opacity:showTotal?1:0.15,transform:showTotal?'scale(1)':'scale(0.6)',
          transition:'all 0.45s cubic-bezier(.34,1.56,.64,1)',
          boxShadow:'0 6px 0 rgba(61,37,22,.2)',
        }}>
          <span style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:42,color:'#fff'}}>{showTotal?total:'?'}</span>
        </div>
      </div>

      {showTotal && (
        <div style={{
          background:'var(--milo-orange)',color:'#fff',borderRadius:50,padding:'10px 26px',
          fontFamily:'var(--font-display)',fontWeight:900,fontSize:22,
          boxShadow:'0 4px 0 rgba(61,37,22,.2)',animation:'a_flipIn 0.5s ease',
        }}>{a} + {b} = {total}!</div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// TAP_IT — both groups shown; child taps every item to count the total
// ═══════════════════════════════════════════════════════════
function TapTotal({a,b,emoji,intro,outro,onDone}:{
  a:number,b:number,emoji:string,intro:string,outro:string,onDone:()=>void
}) {
  const total=a+b
  const [tapped,setTapped]=useState<number[]>([])
  const [sparkles,setSparkles]=useState<{x:number,y:number,id:number}[]>([])
  const [done,setDone]=useState(false)
  const [burst,setBurst]=useState(false)
  const spoken=useRef(false)
  const spId=useRef(0)

  useEffect(()=>{
    if(spoken.current)return; spoken.current=true
    speak(intro)
  },[intro])

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
    if(next.length===total){
      setDone(true); setBurst(true)
      window.setTimeout(()=>{
        speak(outro)
        window.setTimeout(onDone,2400)
      },400)
    }
  }

  // Render a+b buttons in two visually distinct groups separated by +
  function renderGroup(count:number,offset:number){
    return (
      <div style={{display:'flex',gap:8,flexWrap:'wrap',justifyContent:'center',maxWidth:170}}>
        {Array.from({length:count}).map((_,j)=>{
          const i=offset+j
          const isTapped=tapped.includes(i)
          return (
            <button key={i} onClick={e=>tap(i,e)} disabled={isTapped} style={{
              background:'transparent',border:'none',cursor:isTapped?'default':'pointer',
              position:'relative',width:64,height:64,
              display:'flex',alignItems:'center',justifyContent:'center',
            }}>
              <span style={{
                fontSize:46,
                opacity:isTapped?0.32:1,
                transform:isTapped?'scale(0.85)':'scale(1)',
                animation:!isTapped?'a_pulse 1.5s ease-in-out infinite':'none',
                animationDelay:`${i*0.12}s`,
                filter:isTapped?'grayscale(1)':'none',
                transition:'all 0.2s ease',
              }}>{emoji}</span>
              {!isTapped&&(
                <div style={{
                  position:'absolute',inset:-3,borderRadius:'50%',
                  border:`3px dashed ${offset===0?'var(--sky-blue-deep)':'var(--garden-green-deep)'}`,
                  animation:'a_pulse 1.5s ease-in-out infinite',
                  animationDelay:`${i*0.12}s`,pointerEvents:'none',
                }}/>
              )}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:14,position:'relative'}}>
      {burst&&<Confetti/>}
      {sparkles.map(s=><SparkleAt key={s.id} x={s.x} y={s.y}/>)}
      <div style={{
        fontFamily:'var(--font-display)',fontWeight:800,fontSize:14,
        color:'var(--milo-orange)',background:'var(--milo-orange-soft)',
        borderRadius:50,padding:'6px 16px',border:'2px solid var(--milo-orange)',
      }}>Tap them ALL to count! 👆</div>
      <div style={{height:50,display:'flex',alignItems:'center',justifyContent:'center'}}>
        {tapped.length>0 && !done && <BigCount key={tapped.length} n={tapped.length}/>}
      </div>
      <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',justifyContent:'center'}}>
        {renderGroup(a,0)}
        <div style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:34,color:'var(--milo-orange)'}}>+</div>
        {renderGroup(b,a)}
      </div>
      {done ? (
        <div style={{
          background:'var(--garden-green)',color:'#fff',borderRadius:50,padding:'10px 26px',
          fontFamily:'var(--font-display)',fontWeight:900,fontSize:22,
          animation:'a_bounceIn 0.5s cubic-bezier(.34,1.56,.64,1)',
        }}>{a} + {b} = {total}! 🎉</div>
      ) : (
        <p style={{fontFamily:'var(--font-body)',fontSize:14,color:'var(--ink-muted)',margin:0}}>{tapped.length} of {total}</p>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// CHOOSE — show A + B, pick the total from 3 choices (gentle: retry until right)
// ═══════════════════════════════════════════════════════════
export function ChooseSum({a,b,emoji,intro,onDone}:{
  a:number,b:number,emoji:string,intro:string,onDone:()=>void
}) {
  const total=a+b
  const [shown,setShown]=useState(0)       // objects revealed so far (A then B)
  const [bigN,setBigN]=useState(0)
  const [phase,setPhase]=useState<'count'|'choose'>('count')
  const [picked,setPicked]=useState<number|null>(null)
  const [wrongPick,setWrongPick]=useState<number|null>(null)
  const [burst,setBurst]=useState(false)
  const ran=useRef(false)
  const alive=useRef(false)

  const choices=useRef<number[]>((()=>{
    const opts=new Set<number>([total])
    let d=1
    while(opts.size<3){
      if(total-d>=0)opts.add(total-d)
      if(opts.size<3)opts.add(total+d)
      d++
    }
    return [...opts].sort((x,y)=>x-y)
  })()).current

  useEffect(()=>{
    alive.current=true
    if(!ran.current){
      ran.current=true
      // Plain fixed-timer pacing (like the Counting lesson) — no afterSpeech.
      speak(intro)
      let t=2200
      for(let k=1;k<=a;k++){ const kk=k; window.setTimeout(()=>{ if(!alive.current)return; setShown(kk); setBigN(kk); window.setTimeout(()=>{ if(alive.current) speak(String(kk)) },60) }, t); t+=1100 }
      t+=400
      window.setTimeout(()=>{ if(!alive.current)return; setBigN(0); speak('and more!') }, t); t+=1400
      for(let k=1;k<=b;k++){ const kk=k; const gi=a+k; window.setTimeout(()=>{ if(!alive.current)return; setShown(gi); setBigN(kk); window.setTimeout(()=>{ if(alive.current) speak(String(kk)) },60) }, t); t+=1100 }
      t+=400
      window.setTimeout(()=>{ if(!alive.current)return; setBigN(0); setPhase('choose'); speak('How many altogether? Pick the answer!') }, t)
    }
    return ()=>{ alive.current=false }
  },[])

  function pick(c:number){
    if(phase!=='choose'||picked!=null)return
    if(c===total){
      setPicked(c); setWrongPick(null); setBurst(true)
      speak(`Yes! ${a} plus ${b} equals ${total}! Wonderful!`)
      window.setTimeout(onDone,2600)
    } else {
      setWrongPick(c)
      speak(`Not quite! Count them again — ${a} and ${b} more. Try again!`)
      window.setTimeout(()=>setWrongPick(null),900)
    }
  }

  const renderGroup = (count:number, offset:number) => (
    <div style={{display:'flex',gap:5,flexWrap:'wrap',justifyContent:'center',maxWidth:130,minHeight:42}}>
      {Array.from({length:count}).map((_,i)=>{
        const idx=offset+i
        const seen=shown>idx
        const justNow=shown===idx+1 && phase==='count'
        return seen ? (
          <span key={i} style={{fontSize:34,display:'inline-block',animation:'a_bounceIn 0.45s cubic-bezier(.34,1.56,.64,1)',filter:justNow?'drop-shadow(0 0 10px rgba(255,200,0,0.9))':'none'}}>{emoji}</span>
        ) : (
          <div key={i} style={{width:34,height:34,borderRadius:'50%',border:'2px dashed rgba(61,37,22,0.18)'}}/>
        )
      })}
    </div>
  )

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:14,position:'relative'}}>
      {burst&&<Confetti/>}

      <div style={{height:46,display:'flex',alignItems:'center',justifyContent:'center'}}>
        {bigN>0 && <BigCount key={bigN} n={bigN}/>}
      </div>

      <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',justifyContent:'center'}}>
        {renderGroup(a,0)}
        <div style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:32,color:'var(--milo-orange)'}}>+</div>
        {renderGroup(b,a)}
        <div style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:32,color:'var(--milo-orange)'}}>=</div>
        <div style={{
          width:54,height:54,borderRadius:16,border:'3px solid var(--milo-orange-deep)',
          background:picked!=null?'var(--garden-green)':'var(--milo-orange-soft)',
          display:'flex',alignItems:'center',justifyContent:'center',
          fontFamily:'var(--font-display)',fontWeight:900,fontSize:28,
          color:picked!=null?'#fff':'var(--milo-orange)',transition:'all 0.3s',
        }}>{picked!=null?total:'?'}</div>
      </div>

      {phase==='choose' && !picked && (
        <div style={{fontFamily:'var(--font-display)',fontWeight:800,fontSize:14,color:'var(--ink-soft)'}}>How many altogether?</div>
      )}

      {phase==='choose' && (
        <div style={{display:'flex',gap:14,justifyContent:'center',flexWrap:'wrap'}}>
          {choices.map(c=>{
            const isRight=picked===c
            const isWrong=wrongPick===c
            return (
              <button key={c} onClick={()=>pick(c)} disabled={picked!=null} style={{
                width:80,height:80,borderRadius:22,
                background:isRight?'var(--garden-green-soft)':isWrong?'var(--apple-red-soft)':'var(--paper)',
                border:`4px solid ${isRight?'var(--garden-green)':isWrong?'var(--apple-red)':'var(--outline)'}`,
                boxShadow:isRight?'0 6px 0 var(--garden-green-deep)':isWrong?'0 6px 0 var(--apple-red-deep)':'0 6px 0 #c8ac79',
                fontFamily:'var(--font-display)',fontWeight:900,fontSize:38,color:'var(--ink)',
                cursor:picked!=null?'default':'pointer',
                transform:isRight?'scale(1.1) translateY(-4px)':isWrong?'translateX(0)':'scale(1)',
                transition:'transform 160ms cubic-bezier(.34,1.56,.64,1),background 160ms ease',
              }}>{c}</button>
            )
          })}
        </div>
      )}

      {picked!=null && (
        <div style={{
          background:'var(--garden-green)',color:'#fff',borderRadius:50,padding:'8px 22px',
          fontFamily:'var(--font-display)',fontWeight:900,fontSize:20,
          animation:'a_bounceIn 0.5s cubic-bezier(.34,1.56,.64,1)',
        }}>{a} + {b} = {total}! ⭐</div>
      )}
    </div>
  )
}

// ─── The 10 steps ────────────────────────────────────────────
function Step({i,onDone}:{i:number,onDone:()=>void}) {
  switch(i){
    case 0: return <WatchAdd a={2} b={1} emoji="🍎"
      intro="Milo has two apples!"
      outro="Two apples and one more apple make three! Adding makes MORE!" onDone={onDone}/>
    case 1: return <SectionBreak emoji="🎉" title="Adding makes MORE!"
      subtitle="Two groups join together to make a bigger group!" onDone={onDone}/>
    case 2: return <WatchAdd a={1} b={2} emoji="⭐"
      intro="Watch again! One star…"
      outro="One star and two more stars make three stars! Let's count together!" onDone={onDone}/>
    case 3: return <TapTotal a={2} b={1} emoji="🐸"
      intro="Now YOU try! Tap every frog to count them all together!"
      outro="Three frogs! Two and one more make three! You added!" onDone={onDone}/>
    case 4: return <SectionBreak emoji="🌟" title="You're adding!"
      subtitle="Now let's pick the answer ourselves!" onDone={onDone}/>
    case 5: return <WatchAdd a={2} b={2} emoji="🍪"
      intro="Milo has two cookies…"
      outro="Two cookies and two more make four cookies! Yummy!" onDone={onDone}/>
    case 6: return <ChooseSum a={3} b={1} emoji="🌸"
      intro="Three flowers and one more flower!" onDone={onDone}/>
    case 7: return <TapTotal a={3} b={2} emoji="🦋"
      intro="Tap all the butterflies! Count three and two more!"
      outro="Five butterflies! Three and two more make five! Amazing!" onDone={onDone}/>
    case 8: return <ChooseSum a={4} b={2} emoji="🎈"
      intro="Four balloons and two more balloons!" onDone={onDone}/>
    case 9: return <WatchAdd a={3} b={3} emoji="🍄"
      intro="Last one! Three mushrooms…"
      outro="Three and three more make six! You finished the whole lesson! Incredible!" onDone={onDone}/>
    default: return null
  }
}

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════
export default function AdditionLesson({childName,onLessonComplete}:Props) {
  const router=useRouter()
  const [step,setStep]=useState(0)
  const [nextReady,setNextReady]=useState(false)
  const [confirmBack,setConfirmBack]=useState(false)

  const BUBBLES=[
    `Hi ${childName}! Let's learn ADDING! Watch Milo put groups together! 🍎`,
    '🎉 Adding makes MORE! Two groups join into one!',
    'Watch again — one star plus two more! ⭐',
    'Your turn! Tap every frog to count them all! 🐸',
    '🌟 You\'re adding! Now pick the answers yourself!',
    'Watch Milo add two cookies and two more! 🍪',
    'How many flowers altogether? Pick the answer! 🌸',
    'Tap all the butterflies — three and two more! 🦋',
    'How many balloons altogether? You choose! 🎈',
    'Last one! Three mushrooms and three more! 🍄',
  ]
  const MOODS:Array<'happy'|'thinking'|'celebrate'>=[
    'happy','celebrate','happy','thinking','celebrate',
    'happy','thinking','thinking','thinking','happy',
  ]

  function done(){ setNextReady(true) }

  function next(){
    if(!nextReady)return
    stopSpeech()
    if(step>=TOTAL_STEPS-1){
      speak(`Brilliant work, ${childName}! You're an adding star! Let's practise now!`)
      window.setTimeout(onLessonComplete,3200)
      return
    }
    setStep(s=>s+1)
    setNextReady(false)
  }

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
        <Step key={step} i={step} onDone={done}/>
      </Shell>

      {confirmBack && (
        <div style={{
          position:'fixed',inset:0,zIndex:200,background:'rgba(61,37,22,0.65)',
          display:'flex',alignItems:'center',justifyContent:'center',padding:24,
        }}>
          <div style={{
            background:'var(--paper)',border:'4px solid var(--outline)',borderRadius:24,
            padding:'28px 24px',maxWidth:320,width:'100%',textAlign:'center',
            boxShadow:'0 6px 0 var(--outline)',
          }}>
            <div style={{fontSize:48,marginBottom:8}}>⚠️</div>
            <h3 style={{fontFamily:'var(--font-display)',fontSize:20,margin:'0 0 8px',color:'var(--ink)'}}>Leave the lesson?</h3>
            <p style={{fontSize:14,color:'var(--ink-soft)',margin:'0 0 20px',lineHeight:1.5}}>Your lesson progress will be lost.</p>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>{stopSpeech();router.push('/menu')}} style={{
                flex:1,padding:'12px',background:'var(--apple-red)',color:'#fff',
                border:'none',borderRadius:50,fontFamily:'var(--font-display)',
                fontSize:14,fontWeight:800,cursor:'pointer',boxShadow:'0 3px 0 rgba(61,37,22,.2)',
              }}>Yes, leave</button>
              <button onClick={()=>setConfirmBack(false)} style={{
                flex:1,padding:'12px',background:'var(--paper)',border:'3px solid var(--outline)',
                borderRadius:50,fontFamily:'var(--font-display)',fontSize:14,fontWeight:700,
                cursor:'pointer',color:'var(--ink)',
              }}>Keep going!</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
