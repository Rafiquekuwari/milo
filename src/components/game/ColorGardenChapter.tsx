'use client'

import { useState, useEffect, useRef } from 'react'
import { useMiloSpeaker, afterSpeech, speakAfterCurrent, speak, speakSeq, speakAt } from '@/lib/useMiloSpeaker'

interface Props {
  onComplete: (correct: number, wrong: number) => void
  childName: string
}

interface ColorDef { name: string; hex: string }

const COLORS: ColorDef[] = [
  { name:'red',    hex:'#E64545' },
  { name:'blue',   hex:'#5BC3F0' },
  { name:'green',  hex:'#6FBE3F' },
  { name:'yellow', hex:'#FFC933' },
  { name:'orange', hex:'#F26B2C' },
  { name:'purple', hex:'#9362D8' },
  { name:'pink',   hex:'#F472B6' },
]

type QType = 'matchColor'|'nameColor'
interface Round { type: QType; targetColor: ColorDef; choices: ColorDef[]; question: string; shapeKey: string }

function buildRound(idx: number, diff: number): Round {
  // Pure colour recognition: alternate "match this colour" and "name this colour".
  const type: QType = idx % 2 === 0 ? 'matchColor' : 'nameColor'
  const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)]   // random object
  const shuffled = [...COLORS].sort(() => Math.random()-.5)
  const target = shuffled[0]
  // Difficulty = how many buckets to choose from (more = harder). A demotion
  // shrinks the choices back down.
  const count = diff === 1 ? 3 : diff === 2 ? 4 : 5
  const choices = shuffled.slice(0, count).sort(() => Math.random()-.5)
  return {
    type, targetColor: target, choices, shapeKey: shape.key,
    question: type === 'matchColor' ? `Which paint bucket is ${target.name}?` : `What color is this ${shape.label}?`,
  }
}

const TOTAL_ROUNDS = 10

const FLOWER = (color: string) => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="50" cy="30" rx="12" ry="18" fill="${color}" opacity=".9"/>
  <ellipse cx="50" cy="70" rx="12" ry="18" fill="${color}" opacity=".9"/>
  <ellipse cx="30" cy="50" rx="18" ry="12" fill="${color}" opacity=".9"/>
  <ellipse cx="70" cy="50" rx="18" ry="12" fill="${color}" opacity=".9"/>
  <ellipse cx="36" cy="36" rx="12" ry="18" fill="${color}" opacity=".9" transform="rotate(45 36 36)"/>
  <ellipse cx="64" cy="36" rx="12" ry="18" fill="${color}" opacity=".9" transform="rotate(-45 64 36)"/>
  <ellipse cx="36" cy="64" rx="12" ry="18" fill="${color}" opacity=".9" transform="rotate(-45 36 64)"/>
  <ellipse cx="64" cy="64" rx="12" ry="18" fill="${color}" opacity=".9" transform="rotate(45 64 64)"/>
  <circle cx="50" cy="50" r="14" fill="#FFC933" stroke="#E0A800" stroke-width="2"/>
</svg>`

// Recolorable garden objects — a random one is shown each round so the OBJECT
// varies while the colour stays the thing being tested ("What colour is this …?").
const SHAPES: { key:string; label:string; svg:(c:string)=>string }[] = [
  { key:'flower', label:'flower', svg: FLOWER },
  { key:'balloon', label:'balloon', svg:(c)=>`<svg viewBox="0 0 100 100"><ellipse cx="50" cy="40" rx="30" ry="36" fill="${c}"/><path d="M50 74 l-5 9 h10 z" fill="${c}"/><line x1="50" y1="82" x2="50" y2="98" stroke="#9a8" stroke-width="2"/><ellipse cx="40" cy="30" rx="8" ry="12" fill="#fff" opacity="0.35"/></svg>` },
  { key:'star', label:'star', svg:(c)=>`<svg viewBox="0 0 100 100"><polygon points="50,8 61,38 94,38 67,58 77,90 50,70 23,90 33,58 6,38 39,38" fill="${c}" stroke="rgba(0,0,0,0.08)" stroke-width="1"/></svg>` },
  { key:'heart', label:'heart', svg:(c)=>`<svg viewBox="0 0 100 100"><path d="M50 84 C18 60 10 40 24 28 C37 17 50 29 50 39 C50 29 63 17 76 28 C90 40 82 60 50 84 Z" fill="${c}"/></svg>` },
  { key:'butterfly', label:'butterfly', svg:(c)=>`<svg viewBox="0 0 100 100"><ellipse cx="32" cy="36" rx="20" ry="22" fill="${c}"/><ellipse cx="68" cy="36" rx="20" ry="22" fill="${c}"/><ellipse cx="34" cy="66" rx="16" ry="18" fill="${c}"/><ellipse cx="66" cy="66" rx="16" ry="18" fill="${c}"/><rect x="48" y="28" width="4" height="46" rx="2" fill="#5a4632"/></svg>` },
  { key:'fish', label:'fish', svg:(c)=>`<svg viewBox="0 0 100 100"><ellipse cx="46" cy="52" rx="34" ry="22" fill="${c}"/><polygon points="76,52 96,34 96,70" fill="${c}"/><circle cx="32" cy="46" r="4.5" fill="#fff"/><circle cx="32" cy="46" r="2" fill="#222"/></svg>` },
  { key:'car', label:'car', svg:(c)=>`<svg viewBox="0 0 100 100"><rect x="12" y="50" width="76" height="22" rx="8" fill="${c}"/><path d="M28 50 q8 -18 22 -18 h12 q10 0 16 18 z" fill="${c}"/><circle cx="32" cy="74" r="9" fill="#3a3a3a"/><circle cx="68" cy="74" r="9" fill="#3a3a3a"/></svg>` },
  { key:'ball', label:'ball', svg:(c)=>`<svg viewBox="0 0 100 100"><circle cx="50" cy="52" r="36" fill="${c}"/><ellipse cx="38" cy="40" rx="12" ry="8" fill="#fff" opacity="0.3"/></svg>` },
  { key:'kite', label:'kite', svg:(c)=>`<svg viewBox="0 0 100 100"><polygon points="50,10 78,46 50,82 22,46" fill="${c}" stroke="rgba(0,0,0,0.08)"/><line x1="50" y1="82" x2="50" y2="96" stroke="#9a8" stroke-width="2"/></svg>` },
]
const SHAPE = (key:string) => SHAPES.find(s=>s.key===key) ?? SHAPES[0]

export default function ColorGardenChapter({ onComplete, childName }: Props) {
  const { phase, startPractice } = useChapterPhase()
  const { speak } = useMiloSpeaker()
  const ada = useAdaptive('colors')
  const [roundIdx, setRoundIdx]     = useState(0)
  const [round, setRound]           = useState<Round>(() => buildRound(0, 1))
  const [selected, setSelected]     = useState<string|null>(null)
  const [correct, setCorrect]       = useState(0)
  const [wrong, setWrong]           = useState(0)
  const [feedback, setFeedback]     = useState<'correct'|'wrong'|null>(null)
  const [flowerColor, setFlowerColor] = useState('#D1D5DB')
  // Adaptive remediation: after 3 wrong in a row, re-teach the colour, then check.
  const [wrongRun, setWrongRun] = useState(0)
  const [reMed, setReMed] = useState<{phase:'reteach'|'check'; color:ColorDef; shapeKey:string}|null>(null)
  const answerRef = useRef<HTMLElement | null>(null)   // the correct bucket (for the pointer)

  useEffect(() => {
    if (phase !== 'practice') return   // don't build/speak a round over the lesson
    const r = buildRound(roundIdx, ada.difficulty)
    setRound(r); setSelected(null)
    // "What colour is this flower?" must actually show the colour — otherwise it's
    // unanswerable. Match/mix rounds keep the flower grey until the child answers.
    setFlowerColor(r.type === 'nameColor' ? r.targetColor.hex : '#D1D5DB')
    window.setTimeout(() => { speakAfterCurrent(roundIdx === 0 ? `Hi ${childName}! ${r.question}` : r.question) }, 300)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIdx, ada.difficulty, phase])

  function handleChoice(color: ColorDef) {
    if (selected) return
    setSelected(color.name); setFlowerColor(color.hex)
    const ok = color.name === round.targetColor.name
    setFeedback(ok ? 'correct' : 'wrong')
    ada.record(ok)
    const newRun = ok ? 0 : wrongRun + 1
    setWrongRun(newRun)
    if (ok) { setCorrect(c=>c+1); speakAt(`Yes! ${color.name}! ${ada.praise}`, answerRef.current) }
    else    { setWrong(w=>w+1);   speakAt(`Oops! The answer was ${round.targetColor.name}. ${ada.encouragement}`, answerRef.current); window.setTimeout(()=>setFlowerColor(round.targetColor.hex), 500) }
    afterSpeech(() => {
      setFeedback(null)
      // 3 wrong in a row → re-teach this colour, then check
      if (!ok && newRun >= 3) { setReMed({ phase:'reteach', color: round.targetColor, shapeKey: round.shapeKey }); return }
      const next = roundIdx + 1
      if (next >= TOTAL_ROUNDS) onComplete(ok?correct+1:correct, ok?wrong:wrong+1)
      else window.setTimeout(() => setRoundIdx(next), 300)
    })
  }

  function finishReMed() {
    setReMed(null); setWrongRun(0)
    const next = roundIdx + 1
    if (next >= TOTAL_ROUNDS) onComplete(correct, wrong)
    else setRoundIdx(next)
  }

  // ── Lesson phase ───────────────────────────────────────────
  if (phase === 'lesson') {
    return <ColorGardenLesson childName={childName} onLessonComplete={startPractice} />
  }

  // ── Practice phase (10 questions with adaptive engine) ─────
  return (
    <div style={{ ...S.page, background:'linear-gradient(180deg,var(--sky-blue-soft) 0%,var(--bg-page) 60%)' }}>
      <SpeakingLock />
      <GameTopbar chapterName="Color Garden" roundIdx={roundIdx} totalRounds={TOTAL_ROUNDS} />
      <div style={{position:'fixed',top:0,left:0,right:0,height:8,background:'rgba(0,0,0,0.08)',zIndex:5}}>
        <div style={{height:'100%',width:`${(roundIdx/TOTAL_ROUNDS)*100}%`,background:'var(--garden-green)',borderRadius:'0 4px 4px 0',transition:'width 0.4s ease'}} />
      </div>
      {/* Adaptive difficulty badge */}
      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
        <DifficultyBadge difficulty={ada.difficulty} isOnFire={ada.isOnFire} />
        {ada.shouldHint && (
          <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:14,
            color:'var(--sky-blue-deep)', background:'var(--sky-blue-soft)',
            border:'2px solid var(--sky-blue)', borderRadius:999, padding:'3px 12px' }}>
            💡 Take your time!
          </span>
        )}
      </div>
      <div className="milo-bubble" style={{ width:'100%', maxWidth:480 }}>{round.question}</div>

      {/* Object (random per round) */}
      <div dangerouslySetInnerHTML={{ __html: SHAPE(round.shapeKey).svg(flowerColor) }} style={{ width:180, height:180, transition:'all .4s ease' }} />

      {/* Target swatch for matchColor */}
      {round.type === 'matchColor' && (
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:48, height:48, borderRadius:12, background:round.targetColor.hex, border:'3px solid var(--outline)' }} />
          <span style={{ fontFamily:'var(--font-body)', fontWeight:700, fontSize:'var(--t-body)', color:'var(--ink)', textTransform:'capitalize' }}>{round.targetColor.name}</span>
        </div>
      )}

      {/* Buckets */}
      <div style={S.bucketsRow}>
        {round.choices.map(color => {
          const isSel = selected === color.name
          const isOk  = color.name === round.targetColor.name
          return (
            <button key={color.name} onClick={() => handleChoice(color)} disabled={!!selected}
              ref={isOk ? (el)=>{answerRef.current=el} : undefined}
              style={{
              ...S.bucket,
              background: color.hex,
              borderColor: isSel ? (isOk?'var(--garden-green)':'var(--apple-red)') : 'var(--outline)',
              transform: isSel ? 'scale(1.1) translateY(-6px)' : 'scale(1)',
              boxShadow: `0 5px 0 ${color.hex}aa`,
            }}>
              🪣
              <span style={{ fontFamily:'var(--font-body)', fontSize:12, fontWeight:700, color:'#fff', textShadow:'0 1px 2px rgba(0,0,0,.4)', textTransform:'capitalize' }}>{color.name}</span>
              {isSel && <span style={{ position:'absolute', top:-12, right:-12, fontSize:24 }}>{isOk?'✅':'❌'}</span>}
            </button>
          )
        })}
      </div>

      {feedback && <div style={{position:'fixed',top:'38%',left:'50%',transform:'translate(-50%,-50%)',color:'#fff',fontFamily:'var(--font-display)',fontWeight:900,fontSize:'var(--t-h1)',padding:'20px 40px',borderRadius:24,border:'4px solid var(--outline)',boxShadow:'0 8px 0 rgba(61,37,22,.2)',zIndex:50,textAlign:'center',animation:'modal-in 280ms cubic-bezier(.34,1.56,.64,1) both',background:feedback==='correct'?'var(--garden-green)':'var(--apple-red)'}}>{feedback==='correct'?`🌸 ${round.targetColor.name}!`:`It was ${round.targetColor.name}!`}</div>}
      <p style={S.label}>Round {Math.min(roundIdx+1,TOTAL_ROUNDS)} of {TOTAL_ROUNDS}</p>

      {reMed?.phase==='reteach' && (
        <ColorRemediationOverlay>
          <WatchColor color={reMed.color} shapeKey={reMed.shapeKey} onDone={()=>setReMed({phase:'check',color:reMed.color,shapeKey:reMed.shapeKey})}/>
        </ColorRemediationOverlay>
      )}
      {reMed?.phase==='check' && (
        <ColorRemediationOverlay>
          <CheckColor color={reMed.color} shapeKey={reMed.shapeKey} onDone={finishReMed}/>
        </ColorRemediationOverlay>
      )}
    </div>
  )
}

// ─── Re-teach overlay (shown after 3 wrong in a row) ──────────────
function ColorRemediationOverlay({children}:{children:React.ReactNode}){
  return (
    <div style={{position:'fixed',inset:0,zIndex:200,background:'rgba(61,37,22,0.7)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{background:'var(--paper)',border:'4px solid var(--outline)',borderRadius:28,padding:'24px 22px 28px',maxWidth:420,width:'100%',textAlign:'center',boxShadow:'0 8px 0 rgba(61,37,22,.2)',maxHeight:'92vh',overflowY:'auto'}}>
        {children}
      </div>
    </div>
  )
}

// WATCH — show the object filled with the missed colour and name it.
function WatchColor({color,shapeKey,onDone}:{color:ColorDef;shapeKey:string;onDone:()=>void}){
  const [shown,setShown]=useState(false)
  const ran=useRef(false)
  useEffect(()=>{
    if(ran.current)return; ran.current=true
    const lines=[`Let's look at this colour again.`, `This colour is ${color.name}!`, `${color.name}. Now you try!`]
    let started=false, finished=false
    const cl:Array<()=>void>=[]
    const at=(fn:()=>void,ms:number)=>{ const id=window.setTimeout(fn,ms); cl.push(()=>window.clearTimeout(id)) }
    at(()=>setShown(true),150)
    const complete=()=>{ if(finished)return; finished=true; at(onDone,800) }
    const cancel=speakSeq(lines,{onWord:()=>{started=true},onDone:complete}); cl.push(cancel)
    at(()=>{ if(started||finished)return; cancel(); at(()=>speak(lines[0]),0); at(()=>{setShown(true);speak(`This colour is ${color.name}!`)},2000); at(()=>{speak('Now you try!');complete()},3800) },1900)
    return ()=>cl.forEach(f=>f())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[])
  return (
    <>
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginBottom:8}}>
        <img src="/assets/characters/milo-thinking.png" alt="Milo" style={{width:48,height:48,objectFit:'contain'}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
        <h3 style={{fontFamily:'var(--font-display)',fontSize:20,margin:0,color:'var(--milo-orange)'}}>Let's look again!</h3>
      </div>
      <div style={{height:150,display:'flex',alignItems:'center',justifyContent:'center'}}>
        {shown && <div dangerouslySetInnerHTML={{ __html: SHAPE(shapeKey).svg(color.hex) }} style={{width:140,height:140,animation:'modal-in 400ms cubic-bezier(.34,1.56,.64,1) both'}}/>}
      </div>
      <div style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:26,color:color.hex,textTransform:'capitalize',textShadow:'0 2px 0 rgba(61,37,22,.12)'}}>{color.name}</div>
    </>
  )
}

// CHECK — child picks the colour from two buckets (retry on wrong).
function CheckColor({color,shapeKey,onDone}:{color:ColorDef;shapeKey:string;onDone:()=>void}){
  const buckets=useRef<ColorDef[]>((()=>{
    const other = COLORS.filter(c=>c.name!==color.name).sort(()=>Math.random()-.5)[0]
    return [color,other].sort(()=>Math.random()-.5)
  })()).current
  const [picked,setPicked]=useState<string|null>(null)
  const [wrongPick,setWrongPick]=useState<string|null>(null)
  const spoken=useRef(false)
  useEffect(()=>{ if(spoken.current)return; spoken.current=true; speak(`Now you try! Which one is ${color.name}?`) },[])
  function pick(c:ColorDef){
    if(picked!=null)return
    if(c.name===color.name){ setPicked(c.name); speak(`Yes! ${color.name}! Wonderful!`); window.setTimeout(onDone,2200) }
    else { setWrongPick(c.name); speak(`That's ${c.name}. Find ${color.name}! Try again!`); window.setTimeout(()=>setWrongPick(null),900) }
  }
  return (
    <>
      <h3 style={{fontFamily:'var(--font-display)',fontSize:20,margin:'0 0 4px',color:'var(--garden-green-deep)'}}>Your turn!</h3>
      <p style={{fontFamily:'var(--font-body)',fontSize:15,color:'var(--ink-soft)',margin:'0 0 16px'}}>Tap the <span style={{color:color.hex,textTransform:'capitalize',fontWeight:800}}>{color.name}</span> bucket.</p>
      <div style={{display:'flex',gap:18,justifyContent:'center'}}>
        {buckets.map(c=>{
          const isRight=picked===c.name, isWrong=wrongPick===c.name
          return (
            <button key={c.name} onClick={()=>pick(c)} disabled={picked!=null} style={{
              width:90,height:100,borderRadius:20,background:c.hex,
              border:`4px solid ${isRight?'var(--garden-green)':isWrong?'var(--apple-red)':'var(--outline)'}`,
              boxShadow:`0 5px 0 ${c.hex}aa`,cursor:picked!=null?'default':'pointer',
              display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:4,fontSize:38,position:'relative',
              transform:isRight?'scale(1.1) translateY(-6px)':'scale(1)',transition:'transform 160ms cubic-bezier(.34,1.56,.64,1)',
            }}>
              🪣
              <span style={{fontFamily:'var(--font-body)',fontSize:12,fontWeight:700,color:'#fff',textShadow:'0 1px 2px rgba(0,0,0,.4)',textTransform:'capitalize'}}>{c.name}</span>
              {isRight&&<span style={{position:'absolute',top:-12,right:-12,fontSize:24}}>✅</span>}
            </button>
          )
        })}
      </div>
    </>
  )
}

import React from 'react'
import { useAdaptive } from '@/lib/adaptive'
import { DifficultyBadge } from '../ui/DifficultyBadge'
import ColorGardenLesson from '../lessons/ColorGardenLesson'
import { useChapterPhase } from '@/lib/useChapterPhase'
import SpeakingLock from '@/components/ui/SpeakingLock'
import GameTopbar from '../ui/GameTopbar'
const S: Record<string, React.CSSProperties> = {
  page:      { minHeight:'100dvh', display:'flex', flexDirection:'column', alignItems:'center', padding:'72px 24px 32px', gap:20, position:'relative' },
  bucketsRow:{ display:'flex', gap:16, justifyContent:'center', flexWrap:'wrap' },
  bucket:    { width:90, height:100, borderRadius:20, border:'4px solid', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4, fontSize:38, position:'relative', transition:'transform .15s' },
  label:     { fontFamily:'var(--font-body)', fontSize:'var(--t-label)', color:'var(--ink-muted)', margin:0 },
}
