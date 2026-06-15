'use client'
/**
 * ColorGardenLesson — gentle intro to colours for 3-5 year olds.
 * Teaches colour RECOGNITION + NAMING in little steps (no mixing here):
 *   meet each colour (tap to bloom a flower → name it → see things of that
 *   colour) → match a colour by name → name a colour you see.
 *
 * Same shell/architecture as the other lessons.
 */

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { speak, stopSpeech } from '@/lib/useMiloSpeaker'

interface Props { childName: string; onLessonComplete: () => void }

const TOTAL_STEPS = 14

interface ColorDef { name:string; hex:string; things:{e:string,w:string}[] }
const COLORS: Record<string,ColorDef> = {
  red:    { name:'red',    hex:'#E64545', things:[{e:'🍎',w:'an apple'},{e:'🍓',w:'a strawberry'},{e:'🌹',w:'a rose'}] },
  yellow: { name:'yellow', hex:'#FFC933', things:[{e:'☀️',w:'the sun'},{e:'🍌',w:'a banana'},{e:'⭐',w:'a star'}] },
  blue:   { name:'blue',   hex:'#5BC3F0', things:[{e:'🫐',w:'a blueberry'},{e:'🌊',w:'the sea'},{e:'💙',w:'a heart'}] },
  green:  { name:'green',  hex:'#6FBE3F', things:[{e:'🍀',w:'a clover'},{e:'🐸',w:'a frog'},{e:'🥦',w:'broccoli'}] },
  orange: { name:'orange', hex:'#F26B2C', things:[{e:'🍊',w:'an orange'},{e:'🥕',w:'a carrot'},{e:'🦊',w:'a fox'}] },
  purple: { name:'purple', hex:'#9362D8', things:[{e:'🍇',w:'grapes'},{e:'🍆',w:'an eggplant'},{e:'🦄',w:'a unicorn'}] },
}
const cap = (s:string)=> s.charAt(0).toUpperCase()+s.slice(1)

const CSS = `
  @keyframes cg_pop {0%{transform:scale(0) rotate(-12deg);opacity:0}55%{transform:scale(1.25) rotate(4deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}
  @keyframes cg_in {0%{transform:translateY(16px) scale(0.5);opacity:0}60%{transform:translateY(-4px) scale(1.1);opacity:1}100%{transform:translateY(0) scale(1);opacity:1}}
  @keyframes cg_slideUp {from{transform:translateY(50px);opacity:0}to{transform:translateY(0);opacity:1}}
  @keyframes cg_sectionIn {0%{transform:scale(0.4) rotate(-8deg);opacity:0}60%{transform:scale(1.1) rotate(3deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}
  @keyframes cg_idle {0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-6px) rotate(2deg)}}
  @keyframes cg_jump {0%,100%{transform:translateY(0) rotate(-3deg) scale(1)}40%{transform:translateY(-24px) rotate(5deg) scale(1.15)}}
  @keyframes cg_confetti {from{transform:translateY(-10px) rotate(0deg);opacity:1}to{transform:translateY(140px) rotate(540deg);opacity:0}}
  @keyframes cg_pulse {0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
  @keyframes cg_bloom {0%{transform:scale(0.4) rotate(-30deg);opacity:0.3}60%{transform:scale(1.15) rotate(8deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}
`

function Confetti() {
  const colors = ['#E64545','#F26B2C','#FFC933','#6FBE3F','#5BC3F0','#9362D8']
  return (
    <div style={{position:'absolute',inset:0,pointerEvents:'none',overflow:'hidden',zIndex:10}}>
      {Array.from({length:20}).map((_,i)=>(
        <div key={i} style={{position:'absolute',left:`${8+(i*5)%84}%`,top:`${(i*11)%25}%`,width:10,height:10,
          borderRadius:i%2===0?'50%':'3px',background:colors[i%colors.length],
          animation:`cg_confetti ${0.8+(i%3)*0.2}s ease-in ${(i%6)*0.07}s both`}}/>
      ))}
    </div>
  )
}

function Flower({color,size=140,bloom}:{color:string,size?:number,bloom?:boolean}) {
  const c = color
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={bloom?{animation:'cg_bloom 0.6s cubic-bezier(.34,1.56,.64,1)'}:undefined}>
      {[[50,30,12,18,0],[50,70,12,18,0],[30,50,18,12,0],[70,50,18,12,0],[36,36,12,18,45],[64,36,12,18,-45],[36,64,12,18,-45],[64,64,12,18,45]].map(([cx,cy,rx,ry,rot],i)=>(
        <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} fill={c} opacity={0.95} transform={`rotate(${rot} ${cx} ${cy})`}/>
      ))}
      <circle cx={50} cy={50} r={14} fill="#FFC933" stroke="#E0A800" strokeWidth={2}/>
    </svg>
  )
}

function SectionBreak({emoji,title,subtitle,onDone}:{emoji:string,title:string,subtitle:string,onDone:()=>void}) {
  useEffect(()=>{ const t=window.setTimeout(onDone,2800); return ()=>window.clearTimeout(t) },[onDone])
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16,padding:'20px 0',position:'relative'}}>
      <Confetti/>
      <div style={{fontSize:72,animation:'cg_jump 0.8s ease-in-out infinite'}}>{emoji}</div>
      <div style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:28,color:'var(--milo-orange)',textAlign:'center',lineHeight:1.2,animation:'cg_sectionIn 0.6s cubic-bezier(.34,1.56,.64,1)',textShadow:'0 3px 0 rgba(61,37,22,.1)'}}>{title}</div>
      <div style={{fontFamily:'var(--font-body)',fontSize:16,color:'var(--ink-soft)',textAlign:'center',animation:'cg_slideUp 0.5s ease 0.2s both'}}>{subtitle}</div>
    </div>
  )
}

// ─── Meet a colour: tap the flower to bloom it, name it, see things ──
function MeetColor({color,onDone}:{color:ColorDef,onDone:()=>void}){
  const [bloom,setBloom]=useState(false)
  const [things,setThings]=useState(false)
  const spoken=useRef(false)
  useEffect(()=>{ if(spoken.current)return;spoken.current=true; speak('Tap the flower to see its colour!') },[])
  function tap(){
    if(bloom)return
    setBloom(true)
    speak(`This is ${color.name}!`)
    window.setTimeout(()=>{
      setThings(true)
      speak(`${cap(color.name)}, like ${color.things[0].w}, ${color.things[1].w}, and ${color.things[2].w}!`)
    },1500)
    window.setTimeout(onDone, 4200)
  }
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
      {bloom && (
        <div style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:40,color:color.hex,textShadow:'0 3px 0 rgba(61,37,22,.12)',textTransform:'capitalize',animation:'cg_pop 0.5s cubic-bezier(.34,1.56,.64,1)'}}>{color.name}</div>
      )}
      <button onClick={tap} disabled={bloom} style={{background:'transparent',border:'none',cursor:bloom?'default':'pointer',position:'relative',animation:!bloom?'cg_pulse 1.2s ease-in-out infinite':'none'}}>
        <Flower color={bloom?color.hex:'#D8D5CE'} bloom={bloom} size={150}/>
        {!bloom && <div style={{position:'absolute',bottom:-6,left:'50%',transform:'translateX(-50%)',fontFamily:'var(--font-display)',fontWeight:800,fontSize:14,color:'var(--ink-soft)',whiteSpace:'nowrap'}}>👆 Tap me!</div>}
      </button>
      <div style={{display:'flex',gap:16,minHeight:54,alignItems:'center'}}>
        {things && color.things.map((t,i)=>(
          <span key={i} style={{fontSize:40,animation:`cg_in 0.45s ease ${i*0.15}s both`}}>{t.e}</span>
        ))}
      </div>
    </div>
  )
}

// ─── Match a colour by name (find the X flower) ──────────────
function MatchColor({names,targetName,mode,onDone}:{names:string[],targetName:string,mode:'watch'|'do',onDone:()=>void}){
  const [picked,setPicked]=useState<string|null>(null)
  const [wrong,setWrong]=useState<string|null>(null)
  const [revealed,setRevealed]=useState(false)
  const ran=useRef(false)
  useEffect(()=>{
    if(ran.current)return;ran.current=true
    speak(`Find the ${targetName} flower!`)
    if(mode==='watch'){ window.setTimeout(()=>{ setRevealed(true); speak(`There it is! The ${targetName} flower!`); window.setTimeout(onDone,2600) },2200) }
  },[])
  function pick(name:string){
    if(mode!=='do'||picked)return
    if(name===targetName){ setPicked(name); setRevealed(true); speak(`Yes! ${targetName}! Lovely!`); window.setTimeout(onDone,2200) }
    else { setWrong(name); speak(`That's ${name}. Find the ${targetName} flower!`); window.setTimeout(()=>setWrong(null),900) }
  }
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:14}}>
      <div style={{fontFamily:'var(--font-display)',fontWeight:800,fontSize:16,color:'var(--milo-orange)',background:'var(--milo-orange-soft)',borderRadius:50,padding:'6px 18px',border:'2px solid var(--milo-orange)',textTransform:'capitalize'}}>Find {targetName}! 👆</div>
      <div style={{display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap'}}>
        {names.map(name=>{
          const lit=(revealed||picked===name)&&name===targetName
          const bad=wrong===name
          return (
            <button key={name} onClick={()=>pick(name)} disabled={mode!=='do'||!!picked} style={{
              background:lit?'var(--garden-green-soft)':bad?'var(--apple-red-soft)':'transparent',
              border:`4px solid ${lit?'var(--garden-green)':bad?'var(--apple-red)':'transparent'}`,
              borderRadius:18,padding:4,cursor:mode==='do'&&!picked?'pointer':'default',
              transform:lit?'scale(1.1)':'scale(1)',transition:'all 0.25s cubic-bezier(.34,1.56,.64,1)',
            }}>
              <Flower color={COLORS[name].hex} size={92}/>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Name the colour you see ─────────────────────────────────
function NameColor({targetName,choices,mode,onDone}:{targetName:string,choices:string[],mode:'watch'|'do',onDone:()=>void}){
  const [picked,setPicked]=useState<string|null>(null)
  const [wrong,setWrong]=useState<string|null>(null)
  const ran=useRef(false)
  useEffect(()=>{
    if(ran.current)return;ran.current=true
    if(mode==='watch'){ speak(`Look at this flower. This flower is ${targetName}!`); window.setTimeout(onDone,3200) }
    else speak('What colour is this flower? Tap the colour!')
  },[])
  function pick(name:string){
    if(mode!=='do'||picked)return
    if(name===targetName){ setPicked(name); speak(`Yes! It's ${targetName}! Wonderful!`); window.setTimeout(onDone,2200) }
    else { setWrong(name); speak(`Not quite. Look again — what colour is it?`); window.setTimeout(()=>setWrong(null),900) }
  }
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:16}}>
      <Flower color={COLORS[targetName].hex} size={150}/>
      {mode==='watch'
        ? <div style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:34,color:COLORS[targetName].hex,textTransform:'capitalize',animation:'cg_pop 0.5s cubic-bezier(.34,1.56,.64,1)'}}>{targetName}</div>
        : (
          <>
            <div style={{fontFamily:'var(--font-display)',fontWeight:800,fontSize:15,color:'var(--ink-soft)'}}>What colour is this?</div>
            <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
              {choices.map(name=>{
                const isPick=picked===name, right=name===targetName, bad=wrong===name
                return (
                  <button key={name} onClick={()=>pick(name)} disabled={!!picked} style={{
                    display:'flex',flexDirection:'column',alignItems:'center',gap:4,
                    background:'var(--paper)',border:`4px solid ${isPick&&right?'var(--garden-green)':bad?'var(--apple-red)':'var(--outline)'}`,
                    borderRadius:16,padding:'10px 14px',cursor:picked?'default':'pointer',
                    boxShadow:isPick&&right?'0 5px 0 var(--garden-green-deep)':'0 5px 0 #c8ac79',
                    transform:isPick&&right?'scale(1.06)':'scale(1)',transition:'all 0.2s',
                  }}>
                    <div style={{width:44,height:44,borderRadius:'50%',background:COLORS[name].hex,border:'3px solid var(--outline)'}}/>
                    <span style={{fontFamily:'var(--font-display)',fontWeight:800,fontSize:14,color:'var(--ink)',textTransform:'capitalize'}}>{name}</span>
                  </button>
                )
              })}
            </div>
          </>
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
    <div style={{minHeight:'100dvh',display:'flex',flexDirection:'column',alignItems:'center',background:'var(--bg-page)',padding:'10px 14px 24px',gap:10}}>
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
        <img src={src} alt="Milo" style={{width:66,height:66,objectFit:'contain',flexShrink:0,filter:'drop-shadow(0 4px 8px rgba(61,37,22,.2))',animation:miloMood==='celebrate'?'cg_jump 0.7s ease-in-out infinite':'cg_idle 3s ease-in-out infinite'}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
        <div style={{background:'#fff',border:'3px solid var(--outline)',borderRadius:'18px 18px 18px 4px',padding:'10px 14px',flex:1,fontFamily:'var(--font-display)',fontWeight:700,fontSize:15,color:'var(--ink)',lineHeight:1.4,boxShadow:'0 4px 0 rgba(61,37,22,.07)'}}>{bubble}</div>
      </div>

      <div style={{flex:1,width:'100%',maxWidth:520,background:'rgba(255,255,255,0.72)',border:'3px solid var(--outline)',borderRadius:22,boxShadow:'0 5px 0 rgba(61,37,22,.07)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:16,minHeight:320,position:'relative',overflow:'hidden'}}>
        {children}
      </div>

      <button onClick={onNext} disabled={!nextReady} style={{width:'100%',maxWidth:520,padding:'15px',background:nextReady?'linear-gradient(135deg,var(--milo-orange) 0%,var(--milo-orange-deep) 100%)':'rgba(61,37,22,0.1)',color:nextReady?'#fff':'rgba(61,37,22,0.25)',border:'none',borderRadius:50,fontFamily:'var(--font-display)',fontWeight:900,fontSize:18,cursor:nextReady?'pointer':'not-allowed',boxShadow:nextReady?'0 4px 18px rgba(242,107,44,0.35)':'none',transition:'all 0.3s ease',transform:nextReady?'scale(1)':'scale(0.97)'}}>{nextReady?'Next →':'🎧 Listen to Milo...'}</button>
    </div>
  )
}

// ─── The 14 steps ────────────────────────────────────────────
function Step({i,onDone}:{i:number,onDone:()=>void}){
  switch(i){
    case 0:  return <MeetColor color={COLORS.red} onDone={onDone}/>
    case 1:  return <MeetColor color={COLORS.yellow} onDone={onDone}/>
    case 2:  return <MeetColor color={COLORS.blue} onDone={onDone}/>
    case 3:  return <SectionBreak emoji="🎨" title="Three colours!" subtitle="Red, yellow, blue — now three more!" onDone={onDone}/>
    case 4:  return <MeetColor color={COLORS.green} onDone={onDone}/>
    case 5:  return <MeetColor color={COLORS.orange} onDone={onDone}/>
    case 6:  return <MeetColor color={COLORS.purple} onDone={onDone}/>
    case 7:  return <SectionBreak emoji="🌈" title="You know 6 colours!" subtitle="Now let's find them!" onDone={onDone}/>
    case 8:  return <MatchColor mode="watch" targetName="red" names={['blue','red','yellow']} onDone={onDone}/>
    case 9:  return <MatchColor mode="do" targetName="green" names={['green','purple','orange']} onDone={onDone}/>
    case 10: return <SectionBreak emoji="🔎" title="Now name them!" subtitle="What colour do you see?" onDone={onDone}/>
    case 11: return <NameColor mode="watch" targetName="blue" choices={[]} onDone={onDone}/>
    case 12: return <NameColor mode="do" targetName="yellow" choices={['yellow','purple','green']} onDone={onDone}/>
    case 13: return <NameColor mode="do" targetName="purple" choices={['red','purple','blue']} onDone={onDone}/>
    default: return null
  }
}

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════
export default function ColorGardenLesson({childName,onLessonComplete}:Props){
  const router=useRouter()
  const [step,setStep]=useState(0)
  const [nextReady,setNextReady]=useState(false)
  const [confirmBack,setConfirmBack]=useState(false)

  const BUBBLES=[
    `Hi ${childName}! Let's learn colours! Tap the flower! 🌸`,
    'Tap to see the next colour! 🌻',
    'Another colour — tap the flower! 💧',
    '🎨 Three colours done! Three more!',
    'Tap the flower for green! 🍀',
    'Tap for orange! 🍊',
    'Tap for purple! 🍇',
    '🌈 You know 6 colours! Let\'s find them!',
    'Watch Milo find the red flower! 👀',
    'Your turn! Find the green flower! 👆',
    '🔎 Now let\'s name the colours!',
    'What colour is this flower? Watch! 💙',
    'What colour is this? Tap it! 💛',
    'Last one! What colour is this? 💜',
  ]
  const MOODS:Array<'happy'|'thinking'|'celebrate'>=[
    'happy','happy','happy','celebrate','happy','happy','happy','celebrate','happy','thinking','celebrate','happy','thinking','thinking',
  ]

  function done(){ setNextReady(true) }
  function next(){
    if(!nextReady)return
    stopSpeech()
    if(step>=TOTAL_STEPS-1){
      speak(`Wonderful, ${childName}! You know your colours! Let's play in the garden!`)
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
