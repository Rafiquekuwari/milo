'use client'
/**
 * MeasurementLesson — animated baby-step intro to comparing size, for 3-5 yrs.
 * Covers three kinds of measuring, each with its own visual:
 *   • HEIGHT  → two towers (taller / shorter)
 *   • WEIGHT  → a seesaw that tips (heavier / lighter)
 *   • LENGTH  → two bars that stretch (longer / shorter)
 *   WATCH (the comparison plays out, winner highlighted) → CHOOSE (child taps).
 */

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { speak, speakSeq, stopSpeech } from '@/lib/useMiloSpeaker'

interface Props { childName: string; onLessonComplete: () => void }

const TOTAL_STEPS = 10

export type Category = 'height' | 'weight' | 'length'
export type Ask = 'more' | 'less'
export interface Item { emoji: string; label: string; color: string; value: number }

export function askWord(category: Category, ask: Ask): string {
  if (category === 'height') return ask === 'more' ? 'taller' : 'shorter'
  if (category === 'weight') return ask === 'more' ? 'heavier' : 'lighter'
  return ask === 'more' ? 'longer' : 'shorter'
}
const CAT_ICON: Record<Category, string> = { height: '📏 Height', weight: '⚖️ Weight', length: '📐 Length' }

export const CSS = `
  @keyframes me_bounceIn {0%{transform:scale(0) translateY(30px);opacity:0}60%{transform:scale(1.25) translateY(-6px);opacity:1}100%{transform:scale(1) translateY(0);opacity:1}}
  @keyframes me_pop {0%{transform:scale(0) rotate(-12deg);opacity:0}55%{transform:scale(1.3) rotate(4deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}
  @keyframes me_slideUp {from{transform:translateY(50px);opacity:0}to{transform:translateY(0);opacity:1}}
  @keyframes me_idle {0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-6px) rotate(2deg)}}
  @keyframes me_jump {0%,100%{transform:translateY(0) rotate(-3deg) scale(1)}40%{transform:translateY(-24px) rotate(5deg) scale(1.15)}}
  @keyframes me_confetti {from{transform:translateY(-10px) rotate(0deg);opacity:1}to{transform:translateY(140px) rotate(540deg);opacity:0}}
  @keyframes me_sectionIn {0%{transform:scale(0.4) rotate(-8deg);opacity:0}60%{transform:scale(1.1) rotate(3deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}
  @keyframes me_shake {0%,100%{transform:translateX(0)}25%{transform:translateX(-7px)}75%{transform:translateX(7px)}}
  @keyframes me_glow {0%,100%{box-shadow:0 0 0 rgba(255,200,0,0)}50%{box-shadow:0 0 22px rgba(255,200,0,.9)}}
`

function Confetti() {
  const colors = ['#E64545','#F26B2C','#FFC933','#6FBE3F','#5BC3F0','#9362D8']
  return (
    <div style={{position:'absolute',inset:0,pointerEvents:'none',overflow:'hidden',zIndex:10}}>
      {Array.from({length:20}).map((_,i)=>(
        <div key={i} style={{position:'absolute',left:`${8+(i*5)%84}%`,top:`${(i*11)%25}%`,width:10,height:10,
          borderRadius:i%2===0?'50%':'3px',background:colors[i%colors.length],
          animation:`me_confetti ${0.8+(i%3)*0.2}s ease-in ${(i%6)*0.07}s both`}}/>
      ))}
    </div>
  )
}

function SectionBreak({emoji,title,subtitle,onDone}:{emoji:string,title:string,subtitle:string,onDone:()=>void}) {
  useEffect(()=>{ const t=window.setTimeout(onDone,2800); return ()=>window.clearTimeout(t) },[onDone])
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16,padding:'20px 0',position:'relative'}}>
      <Confetti/>
      <div style={{fontSize:72,animation:'me_jump 0.8s ease-in-out infinite'}}>{emoji}</div>
      <div style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:28,color:'var(--milo-orange)',textAlign:'center',lineHeight:1.2,animation:'me_sectionIn 0.6s cubic-bezier(.34,1.56,.64,1)',textShadow:'0 3px 0 rgba(61,37,22,.1)'}}>{title}</div>
      <div style={{fontFamily:'var(--font-body)',fontSize:16,color:'var(--ink-soft)',textAlign:'center',animation:'me_slideUp 0.5s ease 0.2s both'}}>{subtitle}</div>
    </div>
  )
}

// ─── Mini visuals (shared by WATCH + CHOOSE) ──────────────────────
function MiniTower({item,grown,win}:{item:Item,grown:boolean,win:boolean}) {
  const MAX=8
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
      <div style={{display:'flex',flexDirection:'column-reverse',gap:3,height:MAX*22+(MAX-1)*3,justifyContent:'flex-start'}}>
        {Array.from({length:MAX}).map((_,i)=>{
          const filled=i<item.value
          return <div key={i} style={{width:46,height:20,borderRadius:6,border:'2px solid var(--outline)',
            background:filled?item.color:'rgba(255,255,255,.25)',opacity:filled?(grown?1:0):0.2,
            transform:filled&&grown?'scaleY(1)':'scaleY(.2)',transformOrigin:'bottom',
            transition:`opacity 260ms ease ${i*70}ms, transform 260ms cubic-bezier(.34,1.56,.64,1) ${i*70}ms`}}/>
        })}
      </div>
      <span style={{fontSize:26}}>{item.emoji}</span>
      <span style={{fontFamily:'var(--font-display)',fontWeight:800,fontSize:13,color:win?'var(--garden-green-deep)':'var(--ink-soft)'}}>{item.label}</span>
    </div>
  )
}

function MiniScale({a,b,tip}:{a:Item,b:Item,tip:boolean}) {
  const aHeavier=a.value>b.value
  const angle=tip?(aHeavier?-16:16):0
  return (
    <div style={{position:'relative',width:280,height:140}}>
      <div style={{position:'absolute',left:'50%',top:54,width:230,height:11,marginLeft:-115,background:'var(--ink)',borderRadius:6,
        transform:`rotate(${angle}deg)`,transformOrigin:'center',transition:'transform 600ms cubic-bezier(.34,1.56,.64,1)',boxShadow:'0 3px 0 rgba(61,37,22,.3)'}}>
        <div style={{position:'absolute',left:-16,bottom:8,width:58,height:16,background:'var(--cream)',border:'3px solid var(--outline)',borderRadius:8}}>
          <span style={{fontSize:30,position:'absolute',top:-34,left:10}}>{a.emoji}</span>
        </div>
        <div style={{position:'absolute',right:-16,bottom:8,width:58,height:16,background:'var(--cream)',border:'3px solid var(--outline)',borderRadius:8}}>
          <span style={{fontSize:30,position:'absolute',top:-34,left:10}}>{b.emoji}</span>
        </div>
      </div>
      <div style={{position:'absolute',left:'50%',top:58,width:11,height:64,marginLeft:-5,background:'var(--ink)',borderRadius:6}}/>
      <div style={{position:'absolute',left:'50%',top:120,width:76,height:11,marginLeft:-38,background:'var(--ink)',borderRadius:6}}/>
    </div>
  )
}

function MiniBar({item,max,stretch,win}:{item:Item,max:number,stretch:boolean,win:boolean}) {
  const pct=stretch?(item.value/max)*100:6
  return (
    <div style={{display:'flex',alignItems:'center',gap:10,width:'100%'}}>
      <span style={{fontSize:30,flexShrink:0,width:36,textAlign:'center'}}>{item.emoji}</span>
      <div style={{flex:1,height:26,background:'rgba(255,255,255,.5)',border:`3px solid ${win?'var(--garden-green)':'var(--outline)'}`,borderRadius:999,overflow:'hidden'}}>
        <div style={{height:'100%',width:`${pct}%`,background:item.color,borderRadius:999,transition:'width 800ms cubic-bezier(.4,0,.2,1)'}}/>
      </div>
    </div>
  )
}

function WinnerBanner({text}:{text:string}) {
  return (
    <div style={{background:'var(--garden-green)',color:'#fff',borderRadius:50,padding:'10px 24px',fontFamily:'var(--font-display)',fontWeight:900,fontSize:20,boxShadow:'0 4px 0 rgba(61,37,22,.2)',animation:'me_bounceIn 0.5s cubic-bezier(.34,1.56,.64,1)'}}>{text}</div>
  )
}

function CompareVisual({category,a,b,active,revealed,winnerKey}:{
  category:Category,a:Item,b:Item,active:boolean,revealed:boolean,winnerKey:'a'|'b'
}) {
  if (category==='height') return (
    <div style={{display:'flex',alignItems:'flex-end',gap:28,justifyContent:'center'}}>
      <MiniTower item={a} grown={active} win={revealed&&winnerKey==='a'}/>
      <div style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:22,color:'var(--ink-muted)',marginBottom:30}}>VS</div>
      <MiniTower item={b} grown={active} win={revealed&&winnerKey==='b'}/>
    </div>
  )
  if (category==='weight') return <MiniScale a={a} b={b} tip={revealed}/>
  const max=Math.max(a.value,b.value)*1.1
  return (
    <div style={{width:'100%',display:'flex',flexDirection:'column',gap:14}}>
      <MiniBar item={a} max={max} stretch={active} win={revealed&&winnerKey==='a'}/>
      <MiniBar item={b} max={max} stretch={active} win={revealed&&winnerKey==='b'}/>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// WATCH — the comparison plays out, then the winner is named
// ═══════════════════════════════════════════════════════════
export function WatchCompare({category,a,b,ask,intro,outro,onDone}:{
  category:Category,a:Item,b:Item,ask:Ask,intro:string,outro:string,onDone:()=>void
}) {
  const word=askWord(category,ask)
  const aWins = ask==='more' ? a.value>b.value : a.value<b.value
  const winnerKey:'a'|'b' = aWins ? 'a' : 'b'
  const winner = aWins ? a : b
  const [active,setActive]=useState(false)   // towers grow / bars stretch
  const [revealed,setRevealed]=useState(false)
  const ran=useRef(false)

  useEffect(()=>{
    if(ran.current)return
    ran.current=true
    const lines=[intro, `${winner.label} is ${word}!`, outro]
    let started=false, finished=false
    const cleanups:Array<()=>void>=[]
    const at=(fn:()=>void,ms:number)=>{ const id=window.setTimeout(fn,ms); cleanups.push(()=>window.clearTimeout(id)) }
    // The visual flourish (grow/stretch) always plays, independent of audio.
    at(()=>setActive(true), 250)
    const complete=()=>{ if(finished)return; finished=true; at(onDone,900) }
    const apply=(i:number)=>{ if(i===1) setRevealed(true) }   // reveal winner on the naming line

    const cancel=speakSeq(lines,{ onWord:(i)=>{ started=true; apply(i) }, onDone:complete })
    cleanups.push(cancel)
    // Fallback if speech never starts (blocked autoplay / muted): drive by timers.
    at(()=>{
      if(started||finished)return
      cancel()
      at(()=>speak(intro),0)
      at(()=>{ setRevealed(true); speak(`${winner.label} is ${word}!`) },2200)
      at(()=>{ speak(outro); complete() },4200)
    },1900)

    return ()=>{ cleanups.forEach(fn=>fn()) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[])

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:18,width:'100%'}}>
      <div style={{fontFamily:'var(--font-display)',fontWeight:800,fontSize:14,color:'var(--ink-soft)',background:'var(--paper)',border:'2px solid var(--outline)',borderRadius:50,padding:'4px 14px'}}>{CAT_ICON[category]}</div>
      <div style={{minHeight:200,display:'flex',alignItems:'center',justifyContent:'center',width:'100%'}}>
        <CompareVisual category={category} a={a} b={b} active={active} revealed={revealed} winnerKey={winnerKey}/>
      </div>
      {revealed && <WinnerBanner text={`${winner.emoji} ${winner.label} is ${word}! ✓`}/>}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// CHOOSE — child taps the taller / heavier / longer (or the opposite)
// ═══════════════════════════════════════════════════════════
export function ChooseCompare({category,a,b,ask,intro,onDone}:{
  category:Category,a:Item,b:Item,ask:Ask,intro:string,onDone:()=>void
}) {
  const word=askWord(category,ask)
  const aWins = ask==='more' ? a.value>b.value : a.value<b.value
  const answer:'a'|'b' = aWins ? 'a' : 'b'
  const [picked,setPicked]=useState<'a'|'b'|null>(null)
  const [wrong,setWrong]=useState<'a'|'b'|null>(null)
  const [burst,setBurst]=useState(false)
  const spoken=useRef(false)
  useEffect(()=>{ if(spoken.current)return; spoken.current=true; speak(intro) },[intro])
  function pick(k:'a'|'b'){
    if(picked)return
    if(k===answer){ setPicked(k); setWrong(null); setBurst(true); const w=k==='a'?a:b; speak(`Yes! ${w.label} is ${word}! Wonderful!`); window.setTimeout(onDone,2400) }
    else { setWrong(k); speak(`Not quite! Which one is ${word}? Try again!`); window.setTimeout(()=>setWrong(null),900) }
  }
  const card=(k:'a'|'b',item:Item)=>{
    const isRight=picked===k, isWrong=wrong===k
    return (
      <button onClick={()=>pick(k)} disabled={picked!=null} style={{
        flex:1,minWidth:120,maxWidth:190,padding:'16px 10px',borderRadius:24,
        background:isRight?'var(--garden-green-soft)':isWrong?'var(--apple-red-soft)':'var(--paper)',
        border:`4px solid ${isRight?'var(--garden-green)':isWrong?'var(--apple-red)':item.color}`,
        boxShadow:isRight?'0 6px 0 var(--garden-green-deep)':isWrong?'0 6px 0 var(--apple-red-deep)':`0 6px 0 ${item.color}`,
        cursor:picked!=null?'default':'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:6,
        animation:isWrong?'me_shake 0.4s ease both':'none',
        transform:isRight?'scale(1.06) translateY(-4px)':'scale(1)',transition:'transform 200ms cubic-bezier(.34,1.56,.64,1)',
      }}>
        <span style={{fontSize:50,lineHeight:1}}>{item.emoji}</span>
        <span style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:18,color:'var(--ink)'}}>{item.label}</span>
        {isRight&&<span style={{fontSize:24}}>✅</span>}
      </button>
    )
  }
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:16,position:'relative',width:'100%'}}>
      {burst&&<Confetti/>}
      <div style={{fontFamily:'var(--font-display)',fontWeight:800,fontSize:16,color:'var(--ink)',background:'var(--sun-yellow-soft)',border:'2px solid var(--sun-yellow-deep)',borderRadius:50,padding:'6px 18px'}}>
        Which is {word}? 👆
      </div>
      {/* a hint visual so the choice isn't blind */}
      <div style={{width:'100%',maxWidth:340,opacity:.95}}>
        <CompareVisual category={category} a={a} b={b} active revealed={false} winnerKey={answer}/>
      </div>
      <div style={{display:'flex',gap:14,justifyContent:'center',width:'100%'}}>
        {card('a',a)}
        {card('b',b)}
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
        <img src={src} alt="Milo" style={{width:66,height:66,objectFit:'contain',flexShrink:0,filter:'drop-shadow(0 4px 8px rgba(61,37,22,.2))',animation:miloMood==='celebrate'?'me_jump 0.7s ease-in-out infinite':'me_idle 3s ease-in-out infinite'}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
        <div style={{background:'#fff',border:'3px solid var(--outline)',borderRadius:'18px 18px 18px 4px',padding:'10px 14px',flex:1,fontFamily:'var(--font-display)',fontWeight:700,fontSize:15,color:'var(--ink)',lineHeight:1.4,boxShadow:'0 4px 0 rgba(61,37,22,.07)'}}>{bubble}</div>
      </div>

      <div style={{flex:1,width:'100%',maxWidth:520,background:'rgba(255,255,255,0.72)',border:'3px solid var(--outline)',borderRadius:22,boxShadow:'0 5px 0 rgba(61,37,22,.07)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:16,minHeight:320,position:'relative',overflow:'hidden'}}>
        {children}
      </div>

      <button onClick={onNext} disabled={!nextReady} style={{width:'100%',maxWidth:520,padding:'15px',background:nextReady?'linear-gradient(135deg,var(--milo-orange) 0%,var(--milo-orange-deep) 100%)':'rgba(61,37,22,0.1)',color:nextReady?'#fff':'rgba(61,37,22,0.25)',border:'none',borderRadius:50,fontFamily:'var(--font-display)',fontWeight:900,fontSize:18,cursor:nextReady?'pointer':'not-allowed',boxShadow:nextReady?'0 4px 18px rgba(242,107,44,0.35)':'none',transition:'all 0.3s ease',transform:nextReady?'scale(1)':'scale(0.97)'}}>{nextReady?'Next →':'🎧 Listen to Milo...'}</button>
    </div>
  )
}

// ─── Items used in the lesson ────────────────────────────────
const RED   :Item={emoji:'🟥',label:'Red Tower',  color:'var(--apple-red)',   value:6}
const BLUE  :Item={emoji:'🟦',label:'Blue Tower', color:'var(--sky-blue)',    value:3}
const GREEN :Item={emoji:'🟩',label:'Green Tower',color:'var(--garden-green)',value:2}
const ORANGE:Item={emoji:'🟧',label:'Tall Tower', color:'var(--milo-orange)', value:7}
const ELEPHANT:Item={emoji:'🐘',label:'Elephant',color:'#9CA3AF',value:9}
const MOUSE   :Item={emoji:'🐭',label:'Mouse',   color:'#D97706',value:2}
const LION    :Item={emoji:'🦁',label:'Lion',    color:'var(--sun-yellow)',value:8}
const RABBIT  :Item={emoji:'🐰',label:'Rabbit',  color:'#EC4899',value:3}
const SNAKE:Item={emoji:'🐍',label:'Snake',color:'var(--garden-green)',value:9}
const WORM :Item={emoji:'🪱',label:'Worm', color:'#D97706',value:3}
const TRAIN:Item={emoji:'🚂',label:'Train',color:'var(--apple-red)',value:8}
const CAR  :Item={emoji:'🚗',label:'Car',  color:'var(--sky-blue)',value:3}

// ─── The 10 steps ────────────────────────────────────────────
function Step({i,onDone}:{i:number,onDone:()=>void}){
  switch(i){
    case 0: return <WatchCompare category="height" a={RED} b={BLUE} ask="more"
      intro="Look at the two towers. One is bigger!" outro="The red tower is taller — it goes higher up!" onDone={onDone}/>
    case 1: return <SectionBreak emoji="📏" title="Taller means HIGHER UP!" subtitle="Shorter means closer to the ground." onDone={onDone}/>
    case 2: return <WatchCompare category="height" a={GREEN} b={ORANGE} ask="less"
      intro="Now find the small one. Which is shorter?" outro="The green tower is shorter — it is the little one!" onDone={onDone}/>
    case 3: return <ChooseCompare category="height" a={BLUE} b={ORANGE} ask="more"
      intro="Your turn! Tap the tower that is taller." onDone={onDone}/>
    case 4: return <SectionBreak emoji="⚖️" title="Now let's weigh things!" subtitle="Heavier things push the seesaw DOWN." onDone={onDone}/>
    case 5: return <WatchCompare category="weight" a={ELEPHANT} b={MOUSE} ask="more"
      intro="An elephant and a mouse on the seesaw. Watch!" outro="The elephant is heavier — its side goes down!" onDone={onDone}/>
    case 6: return <ChooseCompare category="weight" a={LION} b={RABBIT} ask="more"
      intro="Tap the animal that is heavier!" onDone={onDone}/>
    case 7: return <SectionBreak emoji="📐" title="Now let's measure length!" subtitle="Longer things stretch out further." onDone={onDone}/>
    case 8: return <WatchCompare category="length" a={SNAKE} b={WORM} ask="more"
      intro="A snake and a worm. Which stretches further?" outro="The snake is longer — it reaches way out!" onDone={onDone}/>
    case 9: return <ChooseCompare category="length" a={TRAIN} b={CAR} ask="more"
      intro="Last one! Tap the one that is longer." onDone={onDone}/>
    default: return null
  }
}

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════
export default function MeasurementLesson({childName,onLessonComplete}:Props){
  const router=useRouter()
  const [step,setStep]=useState(0)
  const [nextReady,setNextReady]=useState(false)
  const [confirmBack,setConfirmBack]=useState(false)

  const BUBBLES=[
    `Hi ${childName}! Let's measure and compare! Which is taller? 📏`,
    '📏 Taller means higher up!',
    'Now find the shorter one! 🟩',
    'Your turn! Tap the taller tower! 👆',
    '⚖️ Heavier things go DOWN!',
    'Watch the elephant and the mouse! 🐘🐭',
    'Tap the heavier animal! 🦁',
    '📐 Longer things stretch out!',
    'Watch the snake and the worm! 🐍🪱',
    'Last one! Tap the longer one! 🚂',
  ]
  const MOODS:Array<'happy'|'thinking'|'celebrate'>=[
    'happy','celebrate','happy','thinking','celebrate','happy','thinking','celebrate','happy','thinking',
  ]

  function done(){ setNextReady(true) }
  function next(){
    if(!nextReady)return
    stopSpeech()
    if(step>=TOTAL_STEPS-1){
      speak(`Brilliant, ${childName}! You can compare sizes! Let's practise now!`)
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
