'use client'
/**
 * PatternsLesson — animated baby-step intro to repeating patterns, for 3-5 yrs.
 * Core idea: a pattern REPEATS the same little unit over and over, so you can
 * predict what comes next, spot a missing piece, or find the odd one out.
 *   WATCH (the unit repeats, then reveal what's next) → TAP_NEXT (child picks the
 *   next item) → FIND_ODD (child taps the one that doesn't belong).
 */

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { speak, speakSeq, stopSpeech } from '@/lib/useMiloSpeaker'

interface Props { childName: string; onLessonComplete: () => void }

const TOTAL_STEPS = 10

export const CSS = `
  @keyframes p_bounceIn {0%{transform:scale(0) translateY(30px);opacity:0}60%{transform:scale(1.25) translateY(-6px);opacity:1}100%{transform:scale(1) translateY(0);opacity:1}}
  @keyframes p_pop {0%{transform:scale(0) rotate(-12deg);opacity:0}55%{transform:scale(1.3) rotate(4deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}
  @keyframes p_slideUp {from{transform:translateY(50px);opacity:0}to{transform:translateY(0);opacity:1}}
  @keyframes p_pulse {0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}
  @keyframes p_idle {0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-6px) rotate(2deg)}}
  @keyframes p_jump {0%,100%{transform:translateY(0) rotate(-3deg) scale(1)}40%{transform:translateY(-24px) rotate(5deg) scale(1.15)}}
  @keyframes p_confetti {from{transform:translateY(-10px) rotate(0deg);opacity:1}to{transform:translateY(140px) rotate(540deg);opacity:0}}
  @keyframes p_sectionIn {0%{transform:scale(0.4) rotate(-8deg);opacity:0}60%{transform:scale(1.1) rotate(3deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}
  @keyframes p_shake {0%,100%{transform:translateX(0)}25%{transform:translateX(-7px)}75%{transform:translateX(7px)}}
`

function Confetti() {
  const colors = ['#E64545','#F26B2C','#FFC933','#6FBE3F','#5BC3F0','#9362D8']
  return (
    <div style={{position:'absolute',inset:0,pointerEvents:'none',overflow:'hidden',zIndex:10}}>
      {Array.from({length:20}).map((_,i)=>(
        <div key={i} style={{position:'absolute',left:`${8+(i*5)%84}%`,top:`${(i*11)%25}%`,width:10,height:10,
          borderRadius:i%2===0?'50%':'3px',background:colors[i%colors.length],
          animation:`p_confetti ${0.8+(i%3)*0.2}s ease-in ${(i%6)*0.07}s both`}}/>
      ))}
    </div>
  )
}

function SectionBreak({emoji,title,subtitle,onDone}:{emoji:string,title:string,subtitle:string,onDone:()=>void}) {
  useEffect(()=>{ const t=window.setTimeout(onDone,2800); return ()=>window.clearTimeout(t) },[onDone])
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16,padding:'20px 0',position:'relative'}}>
      <Confetti/>
      <div style={{fontSize:72,animation:'p_jump 0.8s ease-in-out infinite'}}>{emoji}</div>
      <div style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:28,color:'var(--milo-orange)',textAlign:'center',lineHeight:1.2,animation:'p_sectionIn 0.6s cubic-bezier(.34,1.56,.64,1)',textShadow:'0 3px 0 rgba(61,37,22,.1)'}}>{title}</div>
      <div style={{fontFamily:'var(--font-body)',fontSize:16,color:'var(--ink-soft)',textAlign:'center',animation:'p_slideUp 0.5s ease 0.2s both'}}>{subtitle}</div>
    </div>
  )
}

// One pattern cell: hidden, shown, the "?" slot, or filled answer.
function Cell({emoji,state}:{emoji:string,state:'hidden'|'show'|'ask'|'fill'}) {
  const ask = state==='ask'
  return (
    <div style={{width:54,height:54,borderRadius:13,
      border:`3px ${ask?'dashed':'solid'} ${ask?'var(--sun-yellow-deep)':state==='hidden'?'transparent':'var(--outline)'}`,
      background:ask?'var(--sun-yellow-soft)':state==='hidden'?'transparent':'rgba(255,255,255,.9)',
      display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',
      boxShadow:state==='show'||state==='fill'?'0 3px 0 rgba(61,37,22,.1)':'none',transition:'background .2s,border-color .2s'}}>
      {state==='show' && <span style={{fontSize:32,animation:'p_bounceIn 0.4s cubic-bezier(.34,1.56,.64,1)'}}>{emoji}</span>}
      {state==='fill' && <span style={{fontSize:32,animation:'p_pop 0.45s cubic-bezier(.34,1.56,.64,1)'}}>{emoji}</span>}
      {ask && <span style={{fontSize:26,fontFamily:'var(--font-display)',fontWeight:900,color:'var(--sun-yellow-deep)'}}>?</span>}
    </div>
  )
}

function makeSeq(unit:string[], reps:number){ const o:string[]=[]; for(let r=0;r<reps;r++) o.push(...unit); return o }

// ═══════════════════════════════════════════════════════════
// WATCH — the unit repeats, name each beat, then reveal what comes next
// ═══════════════════════════════════════════════════════════
export function WatchPattern({unit,names,reps,intro,outro,onDone}:{
  unit:string[],names:string[],reps:number,intro:string,outro:string,onDone:()=>void
}) {
  const seq=makeSeq(unit,reps)
  const answer=unit[seq.length % unit.length]
  const [shown,setShown]=useState(0)   // how many cells revealed
  const [asking,setAsking]=useState(false)
  const [filled,setFilled]=useState(false)
  const ran=useRef(false)

  useEffect(()=>{
    if(ran.current)return
    ran.current=true
    const nameOf=(em:string)=>names[unit.indexOf(em)] ?? ''
    const lines=[intro, ...seq.map(nameOf), 'What comes next?', `${nameOf(answer)}!`, outro]
    let started=false, finished=false
    const cleanups:Array<()=>void>=[]
    const at=(fn:()=>void,ms:number)=>{ const id=window.setTimeout(fn,ms); cleanups.push(()=>window.clearTimeout(id)) }
    const apply=(i:number)=>{
      if(i>=1 && i<=seq.length) setShown(i)              // reveal a beat
      else if(i===seq.length+1) setAsking(true)          // show the "?" cell
      else if(i===seq.length+2){ setAsking(false); setFilled(true) } // fill the answer
    }
    const complete=()=>{ if(finished)return; finished=true; at(onDone,900) }

    const cancel=speakSeq(lines,{ onWord:(i)=>{ started=true; apply(i) }, onDone:complete })
    cleanups.push(cancel)
    // Fallback if speech never starts (blocked autoplay / muted): drive by timers.
    at(()=>{
      if(started||finished)return
      cancel()
      let t=0
      for(let k=1;k<=seq.length;k++){ const kk=k; at(()=>{ setShown(kk); speak(nameOf(seq[kk-1])) }, t); t+=850 }
      at(()=>{ setAsking(true); speak('What comes next?') }, t); t+=1500
      at(()=>{ setAsking(false); setFilled(true); speak(`${nameOf(answer)}!`) }, t); t+=1400
      at(()=>{ speak(outro); complete() }, t)
    }, 1900)

    return ()=>{ cleanups.forEach(fn=>fn()) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[])

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:18,width:'100%'}}>
      <div style={{display:'flex',gap:8,flexWrap:'wrap',justifyContent:'center',maxWidth:420,minHeight:54}}>
        {seq.map((em,i)=><Cell key={i} emoji={em} state={shown>i?'show':'hidden'}/>)}
        {(asking||filled) && <span style={{fontFamily:'var(--font-display)',fontSize:28,fontWeight:900,color:'var(--ink-muted)',alignSelf:'center'}}>→</span>}
        {asking && <Cell emoji="" state="ask"/>}
        {filled && <Cell emoji={answer} state="fill"/>}
      </div>
      {filled && (
        <div style={{background:'var(--garden-green)',color:'#fff',borderRadius:50,padding:'10px 24px',fontFamily:'var(--font-display)',fontWeight:900,fontSize:20,boxShadow:'0 4px 0 rgba(61,37,22,.2)',animation:'p_bounceIn 0.5s cubic-bezier(.34,1.56,.64,1)'}}>
          {answer} comes next! ✓
        </div>
      )}
    </div>
  )
}

// Builds 3 shuffled choices: the answer + the other unit items + a foreign item.
function choicesFor(answer:string, unit:string[], foreign:string){
  const opts=new Set<string>([answer])
  for(const u of unit){ if(opts.size<3 && u!==answer) opts.add(u) }
  if(opts.size<3) opts.add(foreign)
  // deterministic-ish shuffle by char code so it doesn't need Math.random ordering
  return [...opts].sort((a,b)=>a.localeCompare(b))
}

// ═══════════════════════════════════════════════════════════
// TAP_NEXT — child picks the item that comes next (or fills the blank)
// ═══════════════════════════════════════════════════════════
export function TapNext({unit,reps,foreign,intro,onDone}:{
  unit:string[],reps:number,foreign:string,intro:string,onDone:()=>void
}) {
  const seq=makeSeq(unit,reps)
  const answer=unit[seq.length % unit.length]
  const choices=useRef<string[]>(choicesFor(answer,unit,foreign)).current
  const [picked,setPicked]=useState<string|null>(null)
  const [wrongPick,setWrongPick]=useState<string|null>(null)
  const [burst,setBurst]=useState(false)
  const spoken=useRef(false)
  useEffect(()=>{ if(spoken.current)return; spoken.current=true; speak(intro) },[intro])
  function pick(c:string){
    if(picked!=null)return
    if(c===answer){ setPicked(c); setWrongPick(null); setBurst(true); speak('Yes! That comes next! Wonderful!'); window.setTimeout(onDone,2400) }
    else { setWrongPick(c); speak('Not quite! Look at the pattern again. Try again!'); window.setTimeout(()=>setWrongPick(null),900) }
  }
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:16,position:'relative'}}>
      {burst&&<Confetti/>}
      <div style={{fontFamily:'var(--font-display)',fontWeight:800,fontSize:15,color:'var(--sky-blue-deep)',background:'var(--sky-blue-soft)',borderRadius:50,padding:'6px 16px',border:'2px solid var(--sky-blue)'}}>
        What comes next? 👆
      </div>
      <div style={{display:'flex',gap:7,flexWrap:'wrap',justifyContent:'center',maxWidth:380,alignItems:'center'}}>
        {seq.map((em,i)=><Cell key={i} emoji={em} state="show"/>)}
        <span style={{fontFamily:'var(--font-display)',fontSize:26,fontWeight:900,color:'var(--ink-muted)'}}>→</span>
        <Cell emoji={picked??''} state={picked?'fill':'ask'}/>
      </div>
      <div style={{display:'flex',gap:14,justifyContent:'center',flexWrap:'wrap'}}>
        {choices.map(c=>{
          const isRight=picked===c, isWrong=wrongPick===c
          return (
            <button key={c} onClick={()=>pick(c)} disabled={picked!=null} style={{
              width:78,height:78,borderRadius:20,
              background:isRight?'var(--garden-green-soft)':isWrong?'var(--apple-red-soft)':'var(--paper)',
              border:`4px solid ${isRight?'var(--garden-green)':isWrong?'var(--apple-red)':'var(--outline)'}`,
              boxShadow:isRight?'0 6px 0 var(--garden-green-deep)':isWrong?'0 6px 0 var(--apple-red-deep)':'0 6px 0 #c8ac79',
              cursor:picked!=null?'default':'pointer',fontSize:38,
              transform:isRight?'scale(1.1) translateY(-4px)':'scale(1)',
              animation:isWrong?'p_shake 0.4s ease both':'none',
              transition:'transform 160ms cubic-bezier(.34,1.56,.64,1)',
            }}>{c}</button>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// FIND_ODD — child taps the item that doesn't belong in the pattern
// ═══════════════════════════════════════════════════════════
export function FindOdd({unit,reps,foreign,intro,onDone}:{
  unit:string[],reps:number,foreign:string,intro:string,onDone:()=>void
}) {
  const built=useRef<{seq:string[],oddIdx:number}>((()=>{
    const seq=makeSeq(unit,reps)
    const oddIdx=1+((unit.length)%(seq.length-2))   // a middle position, deterministic
    seq[oddIdx]=foreign
    return {seq,oddIdx}
  })()).current
  const [picked,setPicked]=useState<number|null>(null)
  const [wrongPick,setWrongPick]=useState<number|null>(null)
  const [burst,setBurst]=useState(false)
  const spoken=useRef(false)
  useEffect(()=>{ if(spoken.current)return; spoken.current=true; speak(intro) },[intro])
  function pick(i:number){
    if(picked!=null)return
    if(i===built.oddIdx){ setPicked(i); setWrongPick(null); setBurst(true); speak('Yes! That one does not belong! Great spotting!'); window.setTimeout(onDone,2400) }
    else { setWrongPick(i); speak('Not that one! Find the one that breaks the pattern!'); window.setTimeout(()=>setWrongPick(null),900) }
  }
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:16,position:'relative'}}>
      {burst&&<Confetti/>}
      <div style={{fontFamily:'var(--font-display)',fontWeight:800,fontSize:15,color:'var(--apple-red)',background:'var(--apple-red-soft)',borderRadius:50,padding:'6px 16px',border:'2px solid var(--apple-red)'}}>
        Tap the one that doesn&apos;t belong! 👆
      </div>
      <div style={{display:'flex',gap:8,flexWrap:'wrap',justifyContent:'center',maxWidth:400}}>
        {built.seq.map((em,i)=>{
          const isRight=picked===i, isWrong=wrongPick===i
          return (
            <button key={i} onClick={()=>pick(i)} disabled={picked!=null} style={{
              width:56,height:56,borderRadius:14,
              background:isRight?'var(--garden-green-soft)':isWrong?'var(--apple-red-soft)':'rgba(255,255,255,.9)',
              border:`3px solid ${isRight?'var(--garden-green)':isWrong?'var(--apple-red)':'var(--outline)'}`,
              cursor:picked!=null?'default':'pointer',fontSize:30,
              boxShadow:'0 3px 0 rgba(61,37,22,.1)',
              animation:isWrong?'p_shake 0.4s ease both':'none',
              transform:isRight?'scale(1.12)':'scale(1)',transition:'transform 160ms cubic-bezier(.34,1.56,.64,1)',
            }}>{em}</button>
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
        <img src={src} alt="Milo" style={{width:66,height:66,objectFit:'contain',flexShrink:0,filter:'drop-shadow(0 4px 8px rgba(61,37,22,.2))',animation:miloMood==='celebrate'?'p_jump 0.7s ease-in-out infinite':'p_idle 3s ease-in-out infinite'}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
        <div style={{background:'#fff',border:'3px solid var(--outline)',borderRadius:'18px 18px 18px 4px',padding:'10px 14px',flex:1,fontFamily:'var(--font-display)',fontWeight:700,fontSize:15,color:'var(--ink)',lineHeight:1.4,boxShadow:'0 4px 0 rgba(61,37,22,.07)'}}>{bubble}</div>
      </div>

      <div style={{flex:1,width:'100%',maxWidth:520,background:'rgba(255,255,255,0.72)',border:'3px solid var(--outline)',borderRadius:22,boxShadow:'0 5px 0 rgba(61,37,22,.07)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:16,minHeight:300,position:'relative',overflow:'hidden'}}>
        {children}
      </div>

      <button onClick={onNext} disabled={!nextReady} style={{width:'100%',maxWidth:520,padding:'15px',background:nextReady?'linear-gradient(135deg,var(--milo-orange) 0%,var(--milo-orange-deep) 100%)':'rgba(61,37,22,0.1)',color:nextReady?'#fff':'rgba(61,37,22,0.25)',border:'none',borderRadius:50,fontFamily:'var(--font-display)',fontWeight:900,fontSize:18,cursor:nextReady?'pointer':'not-allowed',boxShadow:nextReady?'0 4px 18px rgba(242,107,44,0.35)':'none',transition:'all 0.3s ease',transform:nextReady?'scale(1)':'scale(0.97)'}}>{nextReady?'Next →':'🎧 Listen to Milo...'}</button>
    </div>
  )
}

// ─── The 10 steps ────────────────────────────────────────────
function Step({i,onDone}:{i:number,onDone:()=>void}){
  switch(i){
    case 0: return <WatchPattern unit={['🔴','🔵']} names={['red','blue']} reps={3}
      intro="Look! Red, blue, red, blue. A pattern repeats!" outro="Red comes next — the pattern starts again!" onDone={onDone}/>
    case 1: return <SectionBreak emoji="🔁" title="A pattern REPEATS!" subtitle="The same little group goes over and over." onDone={onDone}/>
    case 2: return <WatchPattern unit={['⭐','🌙']} names={['star','moon']} reps={3}
      intro="Star, moon, star, moon. Watch what comes next." outro="Star! You can guess what comes next!" onDone={onDone}/>
    case 3: return <TapNext unit={['🦋','🌸']} reps={3} foreign="🐠"
      intro="Butterfly, flower, butterfly, flower… your turn! What comes next?" onDone={onDone}/>
    case 4: return <SectionBreak emoji="🌟" title="You found the pattern!" subtitle="Now let's spot the odd one out!" onDone={onDone}/>
    case 5: return <WatchPattern unit={['🐸','🐠']} names={['frog','fish']} reps={3}
      intro="Frog, fish, frog, fish. The pattern keeps going!" outro="Frog comes next!" onDone={onDone}/>
    case 6: return <FindOdd unit={['🍎','🍋']} reps={3} foreign="🐝"
      intro="One of these does not belong. Tap the odd one out!" onDone={onDone}/>
    case 7: return <TapNext unit={['🔺','🔷','🟥']} reps={2} foreign="🌙"
      intro="A longer pattern! Triangle, diamond, square… what comes next?" onDone={onDone}/>
    case 8: return <FindOdd unit={['⭐','🌙']} reps={3} foreign="🍎"
      intro="Find the one that breaks the star-moon pattern!" onDone={onDone}/>
    case 9: return <WatchPattern unit={['🟦','🟨']} names={['blue','yellow']} reps={3}
      intro="Last one! Blue, yellow, blue, yellow." outro="Blue comes next! You finished the whole lesson!" onDone={onDone}/>
    default: return null
  }
}

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════
export default function PatternsLesson({childName,onLessonComplete}:Props){
  const router=useRouter()
  const [step,setStep]=useState(0)
  const [nextReady,setNextReady]=useState(false)
  const [confirmBack,setConfirmBack]=useState(false)

  const BUBBLES=[
    `Hi ${childName}! Let's learn PATTERNS! Watch them repeat! 🔴🔵`,
    '🔁 A pattern repeats over and over!',
    'Star, moon… what comes next? ⭐🌙',
    'Your turn! What comes next? 🦋🌸',
    '🌟 Now spot the odd one out!',
    'Watch the frog-fish pattern! 🐸🐠',
    'Tap the one that does not belong! 🐝',
    'A longer pattern! What comes next? 🔺🔷🟥',
    'Find the one that breaks it! 🍎',
    'Last one! Blue, yellow… 🟦🟨',
  ]
  const MOODS:Array<'happy'|'thinking'|'celebrate'>=[
    'happy','celebrate','happy','thinking','celebrate','happy','thinking','thinking','thinking','happy',
  ]

  function done(){ setNextReady(true) }
  function next(){
    if(!nextReady)return
    stopSpeech()
    if(step>=TOTAL_STEPS-1){
      speak(`Brilliant, ${childName}! You can find patterns! Let's practise now!`)
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
