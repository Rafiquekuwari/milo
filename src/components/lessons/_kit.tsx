'use client'
/**
 * Shared lesson kit — the scaffolding every animated lesson reuses, extracted
 * from the original 3–5 lessons (CountingLesson / AdditionLesson) so new 6–8
 * lessons are short and consistent: just supply step render functions + bubbles.
 *
 *   <LessonScaffold childName onLessonComplete steps={[...]} finalSpeech="..." />
 *
 * Plus the small visual pieces (Confetti, SectionBreak, BigCount, badges) and a
 * numberToWords helper for spoken numbers up to 100.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { speak, stopSpeech } from '@/lib/useMiloSpeaker'
import ScaleToFill from './ScaleToFill'

// ─── Spoken numbers (0–100) ──────────────────────────────────
const ONES = ['zero','one','two','three','four','five','six','seven','eight','nine','ten',
  'eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen']
const TENS = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety']
export function numberToWords(n: number): string {
  if (n < 0 || n > 100) return String(n)
  if (n < 20) return ONES[n]
  if (n === 100) return 'one hundred'
  const t = Math.floor(n / 10), o = n % 10
  return o === 0 ? TENS[t] : `${TENS[t]}-${ONES[o]}`
}

// ─── Grammar: singular/plural agreement ──────────────────────
// Lives in '@/lib/grammar' (shared with the practice chapters); re-exported here
// so lessons can keep importing nounFor / singular / countNoun from './_kit'.
export { singular, nounFor, countNoun } from '@/lib/grammar'

// ─── Shared keyframes ────────────────────────────────────────
export const CSS = `
  @keyframes k_bounceIn { 0%{transform:scale(0) translateY(30px);opacity:0} 60%{transform:scale(1.25) translateY(-6px);opacity:1} 100%{transform:scale(1) translateY(0);opacity:1} }
  @keyframes k_dropIn { 0%{transform:translateY(-80px) scale(0.6);opacity:0} 60%{transform:translateY(8px) scale(1.1);opacity:1} 100%{transform:translateY(0) scale(1);opacity:1} }
  @keyframes k_slideUp { from{transform:translateY(50px);opacity:0} to{transform:translateY(0);opacity:1} }
  @keyframes k_pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.14)} }
  @keyframes k_flipIn { 0%{transform:rotateY(90deg) scale(0.5);opacity:0} 100%{transform:rotateY(0) scale(1);opacity:1} }
  @keyframes k_sparkleOut { 0%{transform:scale(0) rotate(0deg);opacity:1} 100%{transform:scale(2.5) rotate(180deg);opacity:0} }
  @keyframes k_miloIdle { 0%,100%{transform:translateY(0) rotate(-2deg)} 50%{transform:translateY(-6px) rotate(2deg)} }
  @keyframes k_miloJump { 0%,100%{transform:translateY(0) rotate(-3deg) scale(1)} 40%{transform:translateY(-24px) rotate(5deg) scale(1.15)} }
  @keyframes k_confetti { from{transform:translateY(-10px) rotate(0deg);opacity:1} to{transform:translateY(140px) rotate(540deg);opacity:0} }
  @keyframes k_countBadge { 0%{transform:scale(0) rotate(-20deg);opacity:0} 60%{transform:scale(1.4) rotate(5deg);opacity:1} 100%{transform:scale(1) rotate(0deg);opacity:1} }
  @keyframes k_sectionIn { 0%{transform:scale(0.4) rotate(-8deg);opacity:0} 60%{transform:scale(1.1) rotate(3deg);opacity:1} 100%{transform:scale(1) rotate(0deg);opacity:1} }
  @keyframes k_symIn { from{opacity:0} to{opacity:1} }
`

const CONFETTI_COLORS = ['#E64545','#F26B2C','#FFC933','#6FBE3F','#5BC3F0','#9362D8']

export function Confetti() {
  return (
    <div style={{position:'absolute',inset:0,pointerEvents:'none',overflow:'hidden',zIndex:10}}>
      {Array.from({length:20}).map((_,i)=>(
        <div key={i} style={{
          position:'absolute',left:`${8+(i*5)%84}%`,top:`${(i*11)%25}%`,width:10,height:10,
          borderRadius:i%2===0?'50%':'3px',background:CONFETTI_COLORS[i%CONFETTI_COLORS.length],
          animation:`k_confetti ${0.8+(i%3)*0.2}s ease-in ${(i%6)*0.07}s both`,
        }}/>
      ))}
    </div>
  )
}

export function SparkleAt({x,y}:{x:number,y:number}) {
  return (
    <div style={{position:'absolute',left:x-20,top:y-20,width:40,height:40,pointerEvents:'none',zIndex:20}}>
      {['⭐','✨','💫','🌟'].map((s,i)=>(
        <span key={i} style={{position:'absolute',fontSize:14,top:'50%',left:'50%',
          animation:`k_sparkleOut 0.6s ease-out ${i*0.08}s both`,transformOrigin:'center',marginLeft:-7,marginTop:-7}}>{s}</span>
      ))}
    </div>
  )
}

export function CountBadge({n,color}:{n:number,color:string}) {
  return (
    <div style={{position:'absolute',top:-6,right:-6,width:26,height:26,borderRadius:'50%',background:color,color:'#fff',
      display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--font-display)',fontWeight:900,fontSize:13,
      border:'2.5px solid var(--outline)',animation:'k_countBadge 0.4s cubic-bezier(.34,1.56,.64,1)',boxShadow:'0 3px 8px rgba(0,0,0,.25)',zIndex:5}}>{n}</div>
  )
}

export function BigCount({n}:{n:number|string}) {
  return (
    <div style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:60,lineHeight:1,color:'var(--milo-orange)',
      textShadow:'0 5px 0 rgba(61,37,22,.12)',animation:'k_countBadge 0.4s cubic-bezier(.34,1.56,.64,1)'}}>{n}</div>
  )
}

export function SectionBreak({emoji,title,subtitle,onDone}:{
  emoji:string,title:string,subtitle:string,onDone:()=>void
}) {
  // Run-once timer (calls the latest onDone via a ref) so a re-render can't keep
  // resetting it — that would stall the lesson with Next disabled forever.
  const doneRef = useRef(onDone); doneRef.current = onDone
  useEffect(()=>{
    speak(`${title}. ${subtitle}`)
    const t=window.setTimeout(()=>doneRef.current(),2800)
    return ()=>window.clearTimeout(t)
  },[]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16,padding:'20px 0',position:'relative'}}>
      <Confetti/>
      <div style={{fontSize:72,animation:'k_miloJump 0.8s ease-in-out infinite'}}>{emoji}</div>
      <div style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:28,color:'var(--milo-orange)',textAlign:'center',
        lineHeight:1.2,animation:'k_sectionIn 0.6s cubic-bezier(.34,1.56,.64,1)',textShadow:'0 3px 0 rgba(61,37,22,.1)'}}>{title}</div>
      <div style={{fontFamily:'var(--font-body)',fontSize:16,color:'var(--ink-soft)',textAlign:'center',animation:'k_slideUp 0.5s ease 0.2s both'}}>{subtitle}</div>
    </div>
  )
}

// ─── Advance pop-up: appears when a slide finishes (Retry + Next) ──
// A bottom button that quietly switches from "Listen…" to "Next" is easy for a
// young child to miss, so the controls POP UP over the slide the moment it's
// done. Retry replays the whole slide (the caller remounts it). Rendered through
// a portal so it overlays full-screen, unaffected by the lesson's scaling.
const CHEERS = ['Nice! 🌟','Great! 🎉','Well done! ⭐','Lovely! 🌈','Yay! 🎈','Super! 💫','Brilliant! ✨']
export function cheerFor(step:number){ return CHEERS[step % CHEERS.length] }

export function AdvancePopup({onRetry,onNext,cheer}:{onRetry:()=>void,onNext:()=>void,cheer:string}) {
  if (typeof document === 'undefined') return null
  return createPortal(
    <div style={{position:'fixed',inset:0,zIndex:240,background:'rgba(61,37,22,0.45)',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px 20px'}}>
      <style>{CSS}</style>
      <div style={{background:'var(--paper)',border:'4px solid var(--outline)',borderRadius:28,padding:'20px 22px 24px',maxWidth:380,width:'100%',textAlign:'center',boxShadow:'0 8px 0 rgba(61,37,22,.2)',animation:'k_bounceIn 0.45s cubic-bezier(.34,1.56,.64,1)'}}>
        <div style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:24,color:'var(--milo-orange)',marginBottom:16}}>{cheer}</div>
        <div style={{display:'flex',gap:12,justifyContent:'center'}}>
          <button onClick={onRetry} style={{flex:'0 0 auto',padding:'14px 22px',borderRadius:50,background:'var(--paper)',border:'3px solid var(--milo-orange)',color:'var(--milo-orange)',fontFamily:'var(--font-display)',fontWeight:900,fontSize:17,cursor:'pointer',boxShadow:'0 4px 0 rgba(242,107,44,.3)'}}>🔄 Retry</button>
          <button onClick={onNext} style={{flex:'1 1 auto',padding:'14px 22px',borderRadius:50,background:'linear-gradient(135deg,var(--milo-orange) 0%,var(--milo-orange-deep) 100%)',color:'#fff',border:'none',fontFamily:'var(--font-display)',fontWeight:900,fontSize:18,cursor:'pointer',boxShadow:'0 4px 18px rgba(242,107,44,0.4)'}}>Next →</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

/** Bottom-of-screen hint shown while Milo is still talking (before the popup). */
export function ListeningHint({show}:{show:boolean}) {
  return (
    <div style={{height:54,display:'flex',alignItems:'center',justifyContent:'center'}}>
      {show && <span style={{fontFamily:'var(--font-display)',fontWeight:800,fontSize:15,color:'var(--ink-muted)'}}>🎧 Listen to Milo…</span>}
    </div>
  )
}

// ─── A lesson step: a render fn + the bubble/mood shown alongside it ──
export type LessonStep = {
  bubble: string
  mood?: 'happy' | 'thinking' | 'celebrate'
  /** Call `onDone` when the step's animation/interaction is finished to unlock Next. */
  render: (onDone: () => void) => React.ReactNode
}

// ─── Shell: back + progress dots + Milo bubble + Next ────────
function Shell({step,total,miloMood,bubble,children,nextReady,onBack,onSkip,onChart}:{
  step:number,total:number,miloMood:'happy'|'thinking'|'celebrate',bubble:string,
  children:React.ReactNode,nextReady:boolean,onBack:()=>void,onSkip:()=>void,
  onChart?:()=>void,
}) {
  const src = miloMood==='thinking' ? '/assets/characters/milo-thinking.png' : '/assets/characters/milo-happy.png'
  return (
    <div className="milo-lesson" style={{minHeight:'100dvh',display:'flex',flexDirection:'column',alignItems:'center',
      background:'var(--bg-page)',padding:'10px 14px 24px',gap:10}}>
      <style>{CSS}</style>
      <div style={{display:'flex',alignItems:'center',gap:10,width:'100%',maxWidth:520,paddingTop:6}}>
        <button onClick={onBack} style={{display:'flex',alignItems:'center',gap:4,padding:'7px 14px',borderRadius:50,flexShrink:0,
          background:'var(--paper)',border:'3px solid var(--milo-orange)',color:'var(--milo-orange)',
          fontFamily:'var(--font-display)',fontWeight:800,fontSize:13,cursor:'pointer',boxShadow:'0 3px 0 rgba(242,107,44,.25)'}}>← Menu</button>
        <div style={{display:'flex',gap:4,flex:1,justifyContent:'center',flexWrap:'wrap'}}>
          {Array.from({length:total}).map((_,i)=>(
            <div key={i} style={{width:i===step?22:8,height:8,borderRadius:4,transition:'all 0.3s ease',
              background:i<step?'var(--garden-green)':i===step?'var(--milo-orange)':'rgba(61,37,22,0.12)'}}/>
          ))}
        </div>
        {onChart && (
          <button onClick={onChart} title="Number chart" style={{flexShrink:0,width:40,height:40,borderRadius:'50%',
            background:'var(--paper)',border:'3px solid var(--milo-orange)',fontSize:18,cursor:'pointer',
            boxShadow:'0 3px 0 rgba(242,107,44,.25)'}}>🔢</button>
        )}
        <button onClick={onSkip} title="Skip the lesson and start playing" style={{display:'flex',alignItems:'center',gap:4,
          padding:'7px 14px',borderRadius:50,flexShrink:0,background:'var(--garden-green)',border:'3px solid var(--garden-green-deep)',
          color:'#fff',fontFamily:'var(--font-display)',fontWeight:800,fontSize:13,cursor:'pointer',boxShadow:'0 3px 0 var(--garden-green-deep)'}}>Skip ▶</button>
      </div>

      <div style={{display:'flex',alignItems:'flex-end',gap:10,width:'100%',maxWidth:520}}>
        <img src={src} alt="Milo" style={{width:66,height:66,objectFit:'contain',flexShrink:0,
          filter:'drop-shadow(0 4px 8px rgba(61,37,22,.2))',
          animation:miloMood==='celebrate'?'k_miloJump 0.7s ease-in-out infinite':'k_miloIdle 3s ease-in-out infinite'}}
          onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
        <div style={{background:'#fff',border:'3px solid var(--outline)',borderRadius:'18px 18px 18px 4px',padding:'10px 14px',flex:1,
          fontFamily:'var(--font-display)',fontWeight:700,fontSize:15,color:'var(--ink)',lineHeight:1.4,boxShadow:'0 4px 0 rgba(61,37,22,.07)'}}>{bubble}</div>
      </div>

      <div style={{flex:1,width:'100%',maxWidth:520,background:'rgba(255,255,255,0.72)',border:'3px solid var(--outline)',
        borderRadius:22,boxShadow:'0 5px 0 rgba(61,37,22,.07)',display:'flex',flexDirection:'column',alignItems:'center',
        justifyContent:'center',padding:16,minHeight:260,position:'relative',overflow:'hidden'}}>
        <ScaleToFill>{children}</ScaleToFill>
      </div>

      {/* Advancing is handled by the AdvancePopup that appears when the slide
          finishes; while Milo is still talking we just show a gentle hint. */}
      <ListeningHint show={!nextReady}/>
    </div>
  )
}

// ─── LessonScaffold: drives the step list + back/skip confirm ──
export function LessonScaffold({childName,onLessonComplete,steps,finalSpeech,chart}:{
  childName:string,onLessonComplete:()=>void,steps:LessonStep[],finalSpeech:string,
  /** Optional explore widget; when given, a 🔢 button in the header opens it. */
  chart?:React.ReactNode,
}) {
  const router = useRouter()
  const [step,setStep] = useState(0)
  const [nextReady,setNextReady] = useState(false)
  const [retry,setRetry] = useState(0)   // bumping this remounts the step → replays it
  const [confirmBack,setConfirmBack] = useState(false)
  const [showChart,setShowChart] = useState(false)
  const cur = steps[step]
  // Stable so step components depending on it (e.g. timer effects) don't re-fire.
  const onStepDone = useCallback(()=>setNextReady(true),[])

  function next(){
    if(!nextReady) return
    stopSpeech()
    if(step>=steps.length-1){
      speak(finalSpeech)
      window.setTimeout(onLessonComplete,3200)
      return
    }
    setStep(s=>s+1); setNextReady(false)
  }

  // Retry = replay the current slide: re-mount it (key change re-runs its
  // animation + speech) and hide the popup until it finishes again.
  function retryStep(){ stopSpeech(); setNextReady(false); setRetry(r=>r+1) }

  return (
    <>
      <Shell step={step} total={steps.length} miloMood={cur.mood??'happy'} bubble={cur.bubble}
        nextReady={nextReady} onBack={()=>setConfirmBack(true)}
        onSkip={()=>{stopSpeech();onLessonComplete()}}
        onChart={chart ? ()=>setShowChart(true) : undefined}>
        <StepHost key={`${step}-${retry}`} render={cur.render} onDone={onStepDone}/>
      </Shell>

      {nextReady && <AdvancePopup onRetry={retryStep} onNext={next} cheer={cheerFor(step)}/>}

      {chart && showChart && typeof document !== 'undefined' && createPortal(
        <div style={{position:'fixed',inset:0,zIndex:250,background:'rgba(61,37,22,0.7)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div style={{background:'var(--paper)',border:'4px solid var(--outline)',borderRadius:24,padding:'clamp(12px,2vmin,20px)',width:'fit-content',maxWidth:'96vw',maxHeight:'96dvh',overflowY:'auto',boxShadow:'0 8px 0 rgba(61,37,22,.2)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
              <h3 style={{fontFamily:'var(--font-display)',fontSize:20,margin:0,color:'var(--ink)'}}>Number Chart 🔢</h3>
              <button onClick={()=>setShowChart(false)} style={{width:40,height:40,borderRadius:'50%',border:'3px solid var(--outline)',background:'var(--paper)',fontFamily:'var(--font-display)',fontWeight:900,fontSize:20,cursor:'pointer'}}>×</button>
            </div>
            {chart}
          </div>
        </div>,
        document.body,
      )}

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

function StepHost({render,onDone}:{render:(onDone:()=>void)=>React.ReactNode,onDone:()=>void}) {
  return <>{render(onDone)}</>
}
