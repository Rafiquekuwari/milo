'use client'
/**
 * BiggerSmallerLesson — gentle intro to comparing amounts for 3-5 year olds.
 * Builds the idea in little steps:
 *   more vs fewer (compare amounts) → the one-to-one matching trick →
 *   the bigger NUMBER means more → "which has the most" with three groups.
 *
 * Same shell/architecture as the other lessons.
 */

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { speak, stopSpeech } from '@/lib/useMiloSpeaker'

interface Props { childName: string; onLessonComplete: () => void }

const TOTAL_STEPS = 15

export const CSS = `
  @keyframes bs_pop {0%{transform:scale(0) rotate(-10deg);opacity:0}55%{transform:scale(1.25) rotate(3deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}
  @keyframes bs_in {0%{transform:translateY(16px) scale(0.6);opacity:0}60%{transform:translateY(-4px) scale(1.08);opacity:1}100%{transform:translateY(0) scale(1);opacity:1}}
  @keyframes bs_slideUp {from{transform:translateY(50px);opacity:0}to{transform:translateY(0);opacity:1}}
  @keyframes bs_sectionIn {0%{transform:scale(0.4) rotate(-8deg);opacity:0}60%{transform:scale(1.1) rotate(3deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}
  @keyframes bs_miloIdle {0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-6px) rotate(2deg)}}
  @keyframes bs_miloJump {0%,100%{transform:translateY(0) rotate(-3deg) scale(1)}40%{transform:translateY(-24px) rotate(5deg) scale(1.15)}}
  @keyframes bs_confetti {from{transform:translateY(-10px) rotate(0deg);opacity:1}to{transform:translateY(140px) rotate(540deg);opacity:0}}
  @keyframes bs_pulse {0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}
  @keyframes bs_winner {0%{transform:scale(1)}30%{transform:scale(1.16) translateY(-10px)}60%{transform:scale(1.05) translateY(-2px)}100%{transform:scale(1.08) translateY(-4px)}}
  @keyframes bs_shake {0%,100%{transform:translateX(0)}20%{transform:translateX(-7px)}40%{transform:translateX(7px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}
  @keyframes bs_count {0%{transform:scale(0) rotate(-20deg);opacity:0}60%{transform:scale(1.4);opacity:1}100%{transform:scale(1);opacity:1}}
  @keyframes bs_vs {0%,100%{transform:scale(1) rotate(-4deg)}50%{transform:scale(1.18) rotate(4deg)}}
`

function Confetti() {
  const colors = ['#E64545','#F26B2C','#FFC933','#6FBE3F','#5BC3F0','#9362D8']
  return (
    <div style={{position:'absolute',inset:0,pointerEvents:'none',overflow:'hidden',zIndex:10}}>
      {Array.from({length:20}).map((_,i)=>(
        <div key={i} style={{position:'absolute',left:`${8+(i*5)%84}%`,top:`${(i*11)%25}%`,width:10,height:10,
          borderRadius:i%2===0?'50%':'3px',background:colors[i%colors.length],
          animation:`bs_confetti ${0.8+(i%3)*0.2}s ease-in ${(i%6)*0.07}s both`}}/>
      ))}
    </div>
  )
}

function SectionBreak({emoji,title,subtitle,onDone}:{emoji:string,title:string,subtitle:string,onDone:()=>void}) {
  useEffect(()=>{ const t=window.setTimeout(onDone,2800); return ()=>window.clearTimeout(t) },[onDone])
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16,padding:'20px 0',position:'relative'}}>
      <Confetti/>
      <div style={{fontSize:72,animation:'bs_miloJump 0.8s ease-in-out infinite'}}>{emoji}</div>
      <div style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:28,color:'var(--milo-orange)',textAlign:'center',lineHeight:1.2,animation:'bs_sectionIn 0.6s cubic-bezier(.34,1.56,.64,1)',textShadow:'0 3px 0 rgba(61,37,22,.1)'}}>{title}</div>
      <div style={{fontFamily:'var(--font-body)',fontSize:16,color:'var(--ink-soft)',textAlign:'center',animation:'bs_slideUp 0.5s ease 0.2s both'}}>{subtitle}</div>
    </div>
  )
}

// ─── Compare 2 or 3 groups: count each (big pop), then reveal/pick ──
// `target` chooses whether we want the bigger ('more') or smaller ('less') one.
// WATCH: highlights one group, counts it object-by-object with a BIG number
// popping and Milo saying each (spaced so nothing overlaps), counts the next
// group, then a pointer + banner call out the answer (which bounces; rest dim).
// DO: pops the objects in, then the child taps (wrong → shake + hint).
export function CompareCards({items,target='more',mode,prompt,outro,showNumber,onDone}:{
  items:{count:number,emoji:string,name?:string}[],target?:'more'|'less',mode:'watch'|'do',
  prompt:string,outro:string,showNumber?:boolean,onDone:()=>void
}){
  const [shown,setShown]=useState<number[]>(items.map(()=>0)) // revealed objects per card
  const [active,setActive]=useState<number|null>(null)        // group currently being counted
  const [bigN,setBigN]=useState(0)                            // big centre count number
  const [phase,setPhase]=useState<'count'|'ready'|'compare'>('count')
  const [picked,setPicked]=useState<number|null>(null)
  const [wrong,setWrong]=useState<number|null>(null)
  const ran=useRef(false)
  const alive=useRef(false)

  const three = items.length>2
  const vals = items.map(it=>it.count)
  const targetVal = target==='more' ? Math.max(...vals) : Math.min(...vals)
  const answerIdx = vals.indexOf(targetVal)
  const tag = target==='more' ? (three?'MOST':'MORE') : (three?'LEAST':'FEWER')

  useEffect(()=>{
    alive.current=true
    if(!ran.current){
      ran.current=true
      speak(prompt)
      if(mode==='watch'){
        // Timed counting at a 1000ms cadence (same as the Counting lesson, which
        // counts cleanly). Each number is spoken just after its object appears.
        let t=2000                                  // lead so the prompt is heard first
        items.forEach((it,ci)=>{
          window.setTimeout(()=>{ if(alive.current){ setActive(ci); setBigN(0) } }, t); t+=450
          for(let k=1;k<=it.count;k++){
            window.setTimeout(()=>{
              if(!alive.current)return
              setShown(s=>{const n=[...s];n[ci]=k;return n}); setBigN(k)
              window.setTimeout(()=>{ if(alive.current) speak(String(k)) }, 60)
            }, t)
            t+=1000
          }
          window.setTimeout(()=>{ if(alive.current) speak(`${numberWord(it.count)} ${it.name??''}!`) }, t); t+=1500
        })
        window.setTimeout(()=>{ if(!alive.current)return; setActive(null); setBigN(0); setPhase('compare'); speak(outro); window.setTimeout(()=>{ if(alive.current) onDone() },3400) }, t+200)
      } else {
        // Quick pop-in of all objects, then let the child choose.
        let t=1000
        items.forEach((it,ci)=>{
          for(let k=1;k<=it.count;k++){ window.setTimeout(()=>{ if(alive.current) setShown(s=>{const n=[...s];n[ci]=k;return n}) },t); t+=120 }
        })
        window.setTimeout(()=>{ if(alive.current){ setPhase('ready'); speak(prompt) } }, t+300)
      }
    }
    return ()=>{ alive.current=false }
  },[])

  function pick(i:number){
    if(mode!=='do'||phase!=='ready'||picked!=null)return
    if(i===answerIdx){ setPicked(i); setPhase('compare'); setWrong(null); speak(outro); window.setTimeout(onDone,2600) }
    else {
      setWrong(i)
      speak(target==='more' ? 'That group has fewer. Find the one with MORE!' : 'That group has more. Find the one with FEWER!')
      window.setTimeout(()=>setWrong(null),900)
    }
  }

  const two = !three
  const winnerVal = items[answerIdx].count
  const others = items.filter((_,i)=>i!==answerIdx).map(it=>it.count)
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
      {mode==='do' && phase!=='compare' && (
        <div style={{fontFamily:'var(--font-display)',fontWeight:800,fontSize:15,color:'var(--milo-orange)',background:'var(--milo-orange-soft)',borderRadius:50,padding:'5px 16px',border:'2px solid var(--milo-orange)'}}>{prompt} 👆</div>
      )}

      {/* BIG counting number while a group is being counted */}
      {mode==='watch' && (
        <div style={{height:60,display:'flex',alignItems:'center',justifyContent:'center'}}>
          {phase==='count' && bigN>0 && (
            <div key={`${active}-${bigN}`} style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:54,lineHeight:1,color:'var(--milo-orange)',textShadow:'0 4px 0 rgba(61,37,22,.12)',animation:'bs_count 0.35s cubic-bezier(.34,1.56,.64,1)'}}>{bigN}</div>
          )}
        </div>
      )}

      <div style={{display:'flex',gap:two?16:10,justifyContent:'center',alignItems:'center',flexWrap:'nowrap'}}>
        {items.map((it,i)=>{
          const isAns=i===answerIdx
          const compared=phase==='compare'
          const counting=active===i
          const lit = compared && isAns
          const dim = compared && !isAns
          const bad = wrong===i
          const seen = shown[i]
          const total = seen===it.count && seen>0
          return (
            <React.Fragment key={i}>
              {i>0 && two && (
                <span style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:22,color:'var(--ink-muted)',animation:'bs_vs 1.4s ease-in-out infinite'}}>vs</span>
              )}
              <div style={{position:'relative'}}>
                {/* pointer to the winner */}
                {lit && <div style={{position:'absolute',top:-44,left:'50%',transform:'translateX(-50%)',fontSize:30,animation:'bs_miloJump 0.7s ease-in-out infinite',zIndex:3}}>👇</div>}
                <button onClick={()=>pick(i)} disabled={mode!=='do'||phase!=='ready'} style={{
                  position:'relative',
                  width:two?120:92, minHeight:two?180:152,
                  borderRadius:18,padding:'14px 8px 12px',
                  background:lit?'var(--garden-green-soft)':bad?'var(--apple-red-soft)':'var(--paper)',
                  border:`4px solid ${lit?'var(--garden-green)':bad?'var(--apple-red)':counting?'var(--sun-yellow-deep)':'var(--outline)'}`,
                  boxShadow:lit?'0 7px 0 var(--garden-green-deep)':counting?'0 0 0 4px var(--sun-yellow),0 6px 0 #c8ac79':'0 6px 0 #c8ac79',
                  opacity:dim?0.5:1,
                  filter:dim?'grayscale(0.6)':'none',
                  transform:lit?'scale(1.08) translateY(-4px)':counting?'scale(1.04)':'scale(1)',
                  animation:lit?'bs_winner 0.6s cubic-bezier(.34,1.56,.64,1) both':bad?'bs_shake 0.5s ease':'none',
                  transition:'opacity 0.3s ease, filter 0.3s ease, box-shadow 0.2s ease, transform 0.2s ease',
                  cursor:mode==='do'&&phase==='ready'?'pointer':'default',
                  display:'flex',flexDirection:'column',alignItems:'center',gap:8,
                }}>
                  {/* total number shown once a card is fully counted (or always for number steps) */}
                  {(showNumber||total||compared) && seen>0 && (
                    <span key={seen} style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:two?44:36,color:lit?'var(--garden-green-deep)':'var(--ink)',lineHeight:1,animation:'bs_count 0.3s cubic-bezier(.34,1.56,.64,1)'}}>{seen}</span>
                  )}
                  <div style={{display:'flex',flexWrap:'wrap',gap:3,justifyContent:'center',maxWidth:two?100:80}}>
                    {Array.from({length:Math.min(it.count,9)}).map((_,j)=>(
                      <span key={j} style={{fontSize:two?24:20,opacity:j<seen?1:0,transform:j<seen?'scale(1)':'scale(0.4)',transition:'all 0.3s cubic-bezier(.34,1.56,.64,1)',filter:j===seen-1&&counting?'drop-shadow(0 0 8px rgba(255,200,0,0.9))':'none'}}>{it.emoji}</span>
                    ))}
                  </div>
                  {lit && (
                    <span style={{position:'absolute',top:-14,left:'50%',transform:'translateX(-50%)',background:'var(--garden-green)',color:'#fff',borderRadius:50,padding:'3px 14px',fontFamily:'var(--font-display)',fontWeight:900,fontSize:13,border:'2.5px solid var(--outline)',whiteSpace:'nowrap',animation:'bs_pop 0.4s cubic-bezier(.34,1.56,.64,1)'}}>{tag}! ✓</span>
                  )}
                </button>
              </div>
            </React.Fragment>
          )
        })}
      </div>

      {/* comparison banner */}
      {phase==='compare' && (
        <div style={{background:'var(--garden-green)',color:'#fff',borderRadius:50,padding:'9px 24px',fontFamily:'var(--font-display)',fontWeight:900,fontSize:19,boxShadow:'0 4px 0 rgba(61,37,22,.2)',animation:'bs_pop 0.5s cubic-bezier(.34,1.56,.64,1)',textAlign:'center'}}>
          {target==='more'
            ? (three ? `${winnerVal} is the most! 🌟` : `${winnerVal} is more than ${others.join(' and ')}! ⭐`)
            : (three ? `${winnerVal} is the least!` : `${winnerVal} is fewer than ${others.join(' and ')}!`)}
        </div>
      )}
    </div>
  )
}

function numberWord(n:number){ return ['zero','one','two','three','four','five','six','seven','eight','nine','ten'][n] ?? String(n) }

// ─── One-to-one matching: why one row has more ───────────────
function MatchRows({top,bottom,onDone}:{top:number,bottom:number,onDone:()=>void}){
  const more=Math.max(top,bottom), less=Math.min(top,bottom)
  const [matched,setMatched]=useState(0)   // how many pairs joined so far
  const [extra,setExtra]=useState(false)    // extras highlighted
  const [banner,setBanner]=useState(false)
  const ran=useRef(false)
  const GAP=36, R=13
  useEffect(()=>{
    if(ran.current)return;ran.current=true
    speak('How do we know which has more? We give each one a friend!')
    let t=2200
    for(let k=1;k<=less;k++){
      window.setTimeout(()=>{ setMatched(k); speak('match!') }, t); t+=950
    }
    window.setTimeout(()=>{ setExtra(true); speak(`Look! These have no friend. They are extra!`) }, t); t+=2000
    window.setTimeout(()=>{ setBanner(true); speak(`So ${more} is more than ${less}!`); window.setTimeout(onDone,2600) }, t)
  },[])
  const W = more*GAP
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:10}}>
      <svg width={Math.min(W+24,470)} height={150} viewBox={`0 0 ${W+24} 150`}>
        {/* match lines, drawn one at a time */}
        {Array.from({length:matched}).map((_,i)=>(
          <line key={'l'+i} x1={14+i*GAP+R} y1={42} x2={14+i*GAP+R} y2={104}
            stroke="var(--garden-green)" strokeWidth={4} strokeLinecap="round"
            style={{animation:'bs_slideUp 0.35s ease both'}}/>
        ))}
        {/* top row (more) */}
        {Array.from({length:more}).map((_,i)=>{
          const isExtra=i>=less
          const paired=i<matched
          const glow=(isExtra&&extra)
          return <circle key={'t'+i} cx={14+i*GAP+R} cy={30} r={R}
            fill={glow?'var(--sun-yellow)':paired?'var(--garden-green)':'var(--sky-blue)'} stroke="var(--outline)" strokeWidth={3}
            style={{animation:glow?'bs_pulse 0.9s ease-in-out infinite':paired?'bs_pop 0.3s ease':'none'}}/>
        })}
        {/* bottom row (less) */}
        {Array.from({length:less}).map((_,i)=>{
          const paired=i<matched
          return <circle key={'b'+i} cx={14+i*GAP+R} cy={116} r={R}
            fill={paired?'var(--garden-green)':'var(--milo-orange)'} stroke="var(--outline)" strokeWidth={3}
            style={{animation:paired?'bs_pop 0.3s ease':'none'}}/>
        })}
        {extra && more>less && (
          <text x={14+((less+more-1)/2)*GAP+R} y={16} textAnchor="middle"
            fontFamily="var(--font-display)" fontWeight="900" fontSize="13" fill="var(--sun-yellow-deep)">extra!</text>
        )}
      </svg>
      {banner && (
        <div style={{background:'var(--garden-green)',color:'#fff',borderRadius:50,padding:'8px 22px',fontFamily:'var(--font-display)',fontWeight:900,fontSize:20,animation:'bs_pop 0.5s cubic-bezier(.34,1.56,.64,1)'}}>
          {more} is more than {less}!
        </div>
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
        <img src={src} alt="Milo" style={{width:66,height:66,objectFit:'contain',flexShrink:0,filter:'drop-shadow(0 4px 8px rgba(61,37,22,.2))',animation:miloMood==='celebrate'?'bs_miloJump 0.7s ease-in-out infinite':'bs_miloIdle 3s ease-in-out infinite'}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
        <div style={{background:'#fff',border:'3px solid var(--outline)',borderRadius:'18px 18px 18px 4px',padding:'10px 14px',flex:1,fontFamily:'var(--font-display)',fontWeight:700,fontSize:15,color:'var(--ink)',lineHeight:1.4,boxShadow:'0 4px 0 rgba(61,37,22,.07)'}}>{bubble}</div>
      </div>

      <div style={{flex:1,width:'100%',maxWidth:520,background:'rgba(255,255,255,0.72)',border:'3px solid var(--outline)',borderRadius:22,boxShadow:'0 5px 0 rgba(61,37,22,.07)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:16,minHeight:300,position:'relative',overflow:'hidden'}}>
        {children}
      </div>

      <button onClick={onNext} disabled={!nextReady} style={{width:'100%',maxWidth:520,padding:'15px',background:nextReady?'linear-gradient(135deg,var(--milo-orange) 0%,var(--milo-orange-deep) 100%)':'rgba(61,37,22,0.1)',color:nextReady?'#fff':'rgba(61,37,22,0.25)',border:'none',borderRadius:50,fontFamily:'var(--font-display)',fontWeight:900,fontSize:18,cursor:nextReady?'pointer':'not-allowed',boxShadow:nextReady?'0 4px 18px rgba(242,107,44,0.35)':'none',transition:'all 0.3s ease',transform:nextReady?'scale(1)':'scale(0.97)'}}>{nextReady?'Next →':'🎧 Listen to Milo...'}</button>
    </div>
  )
}

// ─── The 12 steps ────────────────────────────────────────────
function Step({i,onDone}:{i:number,onDone:()=>void}){
  switch(i){
    // ── BIGGER / MORE ──
    case 0: return <CompareCards mode="watch" target="more" items={[{count:5,emoji:'⭐',name:'stars'},{count:2,emoji:'⭐',name:'stars'}]}
      prompt="Let's count the stars!" outro="Five is more than two! There are MORE stars here!" onDone={onDone}/>
    case 1: return <CompareCards mode="do" target="more" items={[{count:2,emoji:'🐸',name:'frogs'},{count:5,emoji:'🐸',name:'frogs'}]}
      prompt="Now you try! Tap the group with MORE" outro="Yes! Five is more than two! Well done!" onDone={onDone}/>
    // ── SMALLER / FEWER ──
    case 2: return <SectionBreak emoji="🐢" title="Now... SMALLER!" subtitle="Smaller means FEWER — not so many!" onDone={onDone}/>
    case 3: return <CompareCards mode="watch" target="less" items={[{count:5,emoji:'🍎',name:'apples'},{count:2,emoji:'🍎',name:'apples'}]}
      prompt="Let's count the apples!" outro="Two is fewer than five! This group is SMALLER!" onDone={onDone}/>
    case 4: return <CompareCards mode="do" target="less" items={[{count:6,emoji:'🎈',name:'balloons'},{count:3,emoji:'🎈',name:'balloons'}]}
      prompt="Tap the group with FEWER" outro="Yes! Three is fewer than six! Well done!" onDone={onDone}/>
    // ── matching trick ──
    case 5: return <SectionBreak emoji="🔗" title="The matching trick!" subtitle="Match them one to one to be sure." onDone={onDone}/>
    case 6: return <MatchRows top={6} bottom={4} onDone={onDone}/>
    // ── numbers tell us ──
    case 7: return <SectionBreak emoji="🔢" title="Numbers tell us too!" subtitle="Bigger number = more. Smaller number = fewer." onDone={onDone}/>
    case 8: return <CompareCards mode="watch" target="more" showNumber items={[{count:3,emoji:'⭐',name:'stars'},{count:7,emoji:'⭐',name:'stars'}]}
      prompt="Let's count the stars!" outro="Seven is bigger than three! The bigger number is more!" onDone={onDone}/>
    case 9: return <CompareCards mode="do" target="more" showNumber items={[{count:6,emoji:'🎈'},{count:9,emoji:'🎈'}]}
      prompt="Tap the BIGGER number" outro="Nine is bigger than six! Brilliant!" onDone={onDone}/>
    case 10: return <CompareCards mode="do" target="less" showNumber items={[{count:8,emoji:'🦋'},{count:5,emoji:'🦋'}]}
      prompt="Now tap the SMALLER number" outro="Five is smaller than eight! Amazing!" onDone={onDone}/>
    // ── most / least with three ──
    case 11: return <SectionBreak emoji="🌟" title="Most and Least!" subtitle="With three groups, find the most and the least!" onDone={onDone}/>
    case 12: return <CompareCards mode="watch" target="more" showNumber items={[{count:2,emoji:'🍓',name:'berries'},{count:5,emoji:'🍓',name:'berries'},{count:3,emoji:'🍓',name:'berries'}]}
      prompt="Let's count each group!" outro="Five is the most! It's bigger than two and three!" onDone={onDone}/>
    case 13: return <CompareCards mode="do" target="more" showNumber items={[{count:4,emoji:'🐸'},{count:7,emoji:'🐸'},{count:2,emoji:'🐸'}]}
      prompt="Which has the MOST? Tap it!" outro="Seven is the most! You did it!" onDone={onDone}/>
    case 14: return <CompareCards mode="do" target="less" showNumber items={[{count:5,emoji:'🦋'},{count:2,emoji:'🦋'},{count:8,emoji:'🦋'}]}
      prompt="Last one! Which has the LEAST? Tap it!" outro="Two is the least! You're a superstar!" onDone={onDone}/>
    default: return null
  }
}

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════
export default function BiggerSmallerLesson({childName,onLessonComplete}:Props){
  const router=useRouter()
  const [step,setStep]=useState(0)
  const [nextReady,setNextReady]=useState(false)
  const [confirmBack,setConfirmBack]=useState(false)

  const BUBBLES=[
    `Hi ${childName}! Let's learn bigger and smaller! Let's count the stars! ⭐`,
    'Your turn! Tap the group with MORE! 🐸',
    '🐢 Now let\'s learn SMALLER — that means fewer!',
    'Which has fewer apples? Let\'s count! 🍎',
    'Tap the group with FEWER! 🎈',
    '🔗 The matching trick — match them one to one!',
    'Watch them match up to see which has more!',
    '🔢 Numbers tell us too!',
    'Let\'s count — which is bigger, 3 or 7? ⭐',
    'Tap the BIGGER number! 🎈',
    'Now tap the SMALLER number! 🦋',
    '🌟 Now the MOST and the LEAST!',
    'Three groups — count to find the most! 🍓',
    'Tap the group with the MOST! 🐸',
    'Last one! Tap the group with the LEAST! 🦋',
  ]
  const MOODS:Array<'happy'|'thinking'|'celebrate'>=[
    'happy','thinking','celebrate','happy','thinking','celebrate','happy','celebrate','happy','thinking','thinking','celebrate','happy','thinking','thinking',
  ]

  function done(){ setNextReady(true) }
  function next(){
    if(!nextReady)return
    stopSpeech()
    if(step>=TOTAL_STEPS-1){
      speak(`Wonderful, ${childName}! You know bigger and smaller! Let's play!`)
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
