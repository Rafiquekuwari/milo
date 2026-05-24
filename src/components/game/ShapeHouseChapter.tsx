'use client'
import { useState, useEffect } from 'react'
import { useMiloSpeaker, afterSpeech, speakAfterCurrent } from '@/lib/useMiloSpeaker'
import { MiloProgressBar } from '@/components/ui/MiloUI'
import { useAdaptive } from '@/lib/adaptive'
import { DifficultyBadge } from '../ui/DifficultyBadge'
import ChapterLesson from '@/components/ui/ChapterLesson'
import { getLessonExamples } from '@/lib/lessons'
import { useChapterPhase } from '@/lib/useChapterPhase'
import SpeakingLock from '@/components/ui/SpeakingLock'
import GameTopbar from '../ui/GameTopbar'

interface Props { onComplete:(c:number,w:number)=>void; childName:string }

type ShapeName = 'circle'|'square'|'triangle'|'rectangle'|'star'|'heart'
interface Shape { name:ShapeName; label:string; path:string }

const SHAPES: Shape[] = [
  { name:'circle',    label:'circle',    path:'M50,10 a40,40 0 1,0 0.001,0 Z' },
  { name:'square',    label:'square',    path:'M10,10 h80 v80 h-80 Z' },
  { name:'triangle',  label:'triangle',  path:'M50,5 L95,95 L5,95 Z' },
  { name:'rectangle', label:'rectangle', path:'M5,25 h90 v50 h-90 Z' },
  { name:'star',      label:'star',      path:'M50,5 l12,35 h37 l-30,22 11,35 L50,77 l-30,20 11-35 L1,40 h37 Z' },
  { name:'heart',     label:'heart',     path:'M50,85 C20,65 5,50 5,30 a20,20 0 0,1 45,-5 a20,20 0 0,1 45,5 C95,50 80,65 50,85 Z' },
]
const COLORS: Record<ShapeName,string> = {
  circle:'#5BC3F0',square:'#F26B2C',triangle:'#6FBE3F',
  rectangle:'#9362D8',star:'#FFC933',heart:'#E64545',
}

function pickShapes(diff: number) {
  const count = diff===1?3:diff===2?4:5
  return [...SHAPES].sort(()=>Math.random()-.5).slice(0,count)
}

const TOTAL_ROUNDS = 10

export default function ShapeHouseChapter({ onComplete, childName }: Props) {
  const { speak } = useMiloSpeaker()
  const ada = useAdaptive('shapes')
  const { phase, startPractice } = useChapterPhase()
  const [roundIdx, setRoundIdx]   = useState(0)
  const [shapes, setShapes]       = useState<Shape[]>(()=>pickShapes(1))
  const [placed, setPlaced]       = useState<Record<string,boolean>>({})
  const [active, setActive]       = useState<ShapeName|null>(null)
  const [correct, setCorrect]     = useState(0)
  const [wrong, setWrong]         = useState(0)
  const [slotFB, setSlotFB]       = useState<{slot:ShapeName;ok:boolean}|null>(null)

  useEffect(() => {
    const s = pickShapes(ada.difficulty)
    setShapes(s); setPlaced({}); setActive(null)
    window.setTimeout(() => speakAfterCurrent(
      roundIdx===0
        ? `Hi ${childName}! Tap a shape then tap its matching slot!`
        : `Match each shape to its slot!`
    ), 300)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIdx, ada.difficulty])

  if (phase === 'lesson') return (
    <ChapterLesson chapterId="shapes" childName={childName}
      examples={getLessonExamples('shapes')} onLessonComplete={startPractice} />
  )

  function handlePick(name: ShapeName) {
    if (placed[name]) return
    setActive(name); speak(name)
  }

  function handleSlot(slotName: ShapeName) {
    if (!active) { speak('Pick a shape first!'); return }
    if (placed[slotName]) return
    const ok = active === slotName
    setSlotFB({slot:slotName,ok})
    if (ok) {
      ada.record(true); setCorrect(c=>c+1); speak(`Yes! ${slotName}! ${ada.praise}`)
      const next = {...placed,[slotName]:true}; setPlaced(next); setActive(null)
      if (Object.keys(next).length === shapes.length) {
        speak('Amazing! All matched!')
        afterSpeech(() => {
          setSlotFB(null)
          const nextRound = roundIdx+1
          if (nextRound>=TOTAL_ROUNDS) onComplete(correct+1,wrong)
          else window.setTimeout(() => setRoundIdx(nextRound), 300)
        })
      } else window.setTimeout(()=>setSlotFB(null),700)
    } else {
      ada.record(false); setWrong(w=>w+1)
      speak(`That slot needs a ${slotName}! ${ada.encouragement}`)
      window.setTimeout(()=>{setSlotFB(null);setActive(null)},1000)
    }
  }

  return (
    <div style={S.page}>
      <MiloProgressBar current={roundIdx} total={TOTAL_ROUNDS} />
      <SpeakingLock />
      <GameTopbar chapterName="Shape House" roundIdx={roundIdx} totalRounds={TOTAL_ROUNDS} />
      <div style={{display:'flex',gap:8,alignItems:'center'}}>
        <DifficultyBadge difficulty={ada.difficulty} isOnFire={ada.isOnFire} />
      </div>
      <div style={S.miloRow}>
        <img src="/assets/characters/milo-happy.png" alt="Milo" style={S.milo}
          onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
        <div className="milo-bubble" style={{flex:1,fontSize:20}}>
          {active?`Tap the ${active} slot!`:'Tap a shape to pick it!'}
        </div>
      </div>

      {/* Slots */}
      <div style={S.section}>
        <p style={S.sLabel}>Match these slots:</p>
        <div style={S.grid}>
          {shapes.map(s => {
            const isP=placed[s.name]; const isFB=slotFB?.slot===s.name
            return (
              <button key={s.name} onClick={()=>!isP&&handleSlot(s.name)} style={{
                ...S.slot,
                background:isP?COLORS[s.name]+'33':isFB?(slotFB.ok?'var(--garden-green-soft)':'var(--apple-red-soft)'):'rgba(255,255,255,.5)',
                borderColor:isP?COLORS[s.name]:isFB?(slotFB.ok?'var(--garden-green)':'var(--apple-red)'):'var(--ink-muted)',
                borderStyle:isP?'solid':'dashed',cursor:isP?'default':'pointer',
              }}>
                <svg width={56} height={56} viewBox="0 0 100 100">
                  <path d={s.path} fill={isP?COLORS[s.name]:'none'} stroke={isP?COLORS[s.name]:'var(--ink-muted)'} strokeWidth={isP?0:7} strokeLinejoin="round"/>
                </svg>
                <span style={{fontFamily:'var(--font-body)',fontSize:12,fontWeight:700,color:isP?COLORS[s.name]:'var(--ink-muted)',textTransform:'capitalize'}}>{s.label}</span>
                {isP&&<span style={{position:'absolute',top:-8,right:-8,fontSize:20}}>✅</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Picker */}
      <div style={S.section}>
        <p style={S.sLabel}>Pick a shape:</p>
        <div style={S.grid}>
          {shapes.map(s => {
            const isP=placed[s.name]; const isA=active===s.name
            return (
              <button key={s.name} onClick={()=>!isP&&handlePick(s.name)} disabled={isP} style={{
                ...S.picker,
                opacity:isP?.3:1,
                background:isA?COLORS[s.name]+'33':'var(--paper)',
                borderColor:isA?COLORS[s.name]:'var(--outline)',
                transform:isA?'scale(1.1)':'scale(1)',
                boxShadow:isA?`0 0 0 3px ${COLORS[s.name]}`:'0 4px 0 rgba(61,37,22,.10)',
              }}>
                <svg width={48} height={48} viewBox="0 0 100 100">
                  <path d={s.path} fill={COLORS[s.name]} strokeLinejoin="round"/>
                </svg>
              </button>
            )
          })}
        </div>
      </div>

      <p style={S.label}>{Object.keys(placed).length}/{shapes.length} matched · Round {Math.min(roundIdx+1,TOTAL_ROUNDS)} of {TOTAL_ROUNDS}</p>
    </div>
  )
}

const S:Record<string,React.CSSProperties>={
  page:{minHeight:'100dvh',display:'flex',flexDirection:'column',alignItems:'center',padding:'72px 24px 32px',gap:20,position:'relative',background:'linear-gradient(180deg,var(--berry-purple-soft) 0%,var(--bg-page) 55%)'},
  miloRow:{display:'flex',alignItems:'flex-end',gap:16,width:'100%',maxWidth:540},
  milo:{width:92,height:92,objectFit:'contain',flexShrink:0},
  section:{width:'100%',maxWidth:480},
  sLabel:{fontFamily:'var(--font-body)',fontSize:16,color:'var(--ink-soft)',margin:'0 0 10px',textAlign:'center'},
  grid:{display:'flex',flexWrap:'wrap',gap:12,justifyContent:'center'},
  slot:{width:100,height:110,borderRadius:16,border:'3px',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:6,position:'relative',transition:'background .2s'},
  picker:{width:72,height:72,borderRadius:16,border:'3px solid',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'transform .15s,box-shadow .15s,background .15s'},
  label:{fontFamily:'var(--font-body)',fontSize:'var(--t-label)',color:'var(--ink-muted)',margin:0,textAlign:'center'},
}
