'use client'

import { useState, useEffect } from 'react'
import { useMiloSpeaker, afterSpeech, speakAfterCurrent } from '@/lib/useMiloSpeaker'

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

type QType = 'matchColor'|'nameColor'|'mixColor'
interface Round { type: QType; targetColor: ColorDef; choices: ColorDef[]; question: string; mixA?: ColorDef; mixB?: ColorDef }

function buildRound(idx: number): Round {
  const type: QType = idx < 2 ? 'matchColor' : idx < 4 ? 'nameColor' : 'mixColor'
  const shuffled = [...COLORS].sort(() => Math.random()-.5)
  const target = shuffled[0]
  const choices = [target, shuffled[1], shuffled[2]].sort(() => Math.random()-.5)

  if (type !== 'mixColor') {
    return { type, targetColor: target, choices, question: type === 'matchColor' ? `Which paint bucket is ${target.name}?` : `What color is this flower?` }
  }

  const mixes: [string,string,string][] = [['red','yellow','orange'],['red','blue','purple'],['blue','yellow','green']]
  const mix = mixes[Math.floor(Math.random()*mixes.length)]
  const mixA = COLORS.find(c=>c.name===mix[0])!
  const mixB = COLORS.find(c=>c.name===mix[1])!
  const result = COLORS.find(c=>c.name===mix[2])!
  const w1 = shuffled.find(c=>c.name!==result.name&&c.name!==mix[0]&&c.name!==mix[1]) ?? shuffled[3]
  const w2 = shuffled.find(c=>c.name!==result.name&&c.name!==mix[0]&&c.name!==mix[1]&&c.name!==w1.name) ?? shuffled[4]
  return { type:'mixColor', targetColor:result, choices:[result,w1,w2].sort(()=>Math.random()-.5), question:`What color do you get when you mix ${mix[0]} and ${mix[1]}?`, mixA, mixB }
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

export default function ColorGardenChapter({ onComplete, childName }: Props) {
  const { phase, startPractice } = useChapterPhase()
  const { speak } = useMiloSpeaker()
  const ada = useAdaptive('colors')
  const [roundIdx, setRoundIdx]     = useState(0)
  const [round, setRound]           = useState<Round>(() => buildRound(0))
  const [selected, setSelected]     = useState<string|null>(null)
  const [correct, setCorrect]       = useState(0)
  const [wrong, setWrong]           = useState(0)
  const [feedback, setFeedback]     = useState<'correct'|'wrong'|null>(null)
  const [flowerColor, setFlowerColor] = useState('#D1D5DB')

  useEffect(() => {
    const r = buildRound(roundIdx)
    setRound(r); setSelected(null); setFlowerColor('#D1D5DB')
    window.setTimeout(() => { speakAfterCurrent(roundIdx === 0 ? `Hi ${childName}! ${r.question}` : r.question) }, 300)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIdx])

  function handleChoice(color: ColorDef) {
    if (selected) return
    setSelected(color.name); setFlowerColor(color.hex)
    const ok = color.name === round.targetColor.name
    setFeedback(ok ? 'correct' : 'wrong')
    if (ok) { setCorrect(c=>c+1); speak(`Yes! ${color.name}! Beautiful!`) }
    else    { setWrong(w=>w+1);   speak(`Oops! The answer was ${round.targetColor.name}!`); window.setTimeout(()=>setFlowerColor(round.targetColor.hex), 500) }
    afterSpeech(() => {
      setFeedback(null)
      const next = roundIdx + 1
      if (next >= TOTAL_ROUNDS) onComplete(ok?correct+1:correct, ok?wrong:wrong+1)
      else window.setTimeout(() => setRoundIdx(next), 300)
    })
  }

  // ── Lesson phase (5 interactive examples) ──────────────────
  if (phase === 'lesson') {
    return (
      <ChapterLesson
        chapterId="colors"
        childName={childName}
        examples={getLessonExamples('colors')}
        onLessonComplete={startPractice}
      />
    )
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

      {/* Mix row */}
      {round.type === 'mixColor' && round.mixA && round.mixB && (
        <div style={S.mixRow}>
          {[round.mixA, round.mixB].map((c, i) => (
            <React.Fragment key={c.name}>
              <div style={{ ...S.mixSwatch, background: c.hex }}>
                <span style={{ fontFamily:'var(--font-body)', fontSize:11, fontWeight:700, color:'#fff', textShadow:'0 1px 2px rgba(0,0,0,.5)', textTransform:'capitalize' }}>{c.name}</span>
              </div>
              {i === 0 && <span style={S.plusSign}>+</span>}
            </React.Fragment>
          ))}
          <span style={S.plusSign}>=</span>
          <div style={{ ...S.mixSwatch, background:'#D1D5DB', border:'3px dashed var(--outline)' }}>
            <span style={{ fontSize:28 }}>?</span>
          </div>
        </div>
      )}

      {/* Flower */}
      <div dangerouslySetInnerHTML={{ __html: FLOWER(flowerColor) }} style={{ width:180, height:180, transition:'all .4s ease' }} />

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
            <button key={color.name} onClick={() => handleChoice(color)} disabled={!!selected} style={{
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
    </div>
  )
}

import React from 'react'
import { useAdaptive } from '@/lib/adaptive'
import { DifficultyBadge } from '../ui/DifficultyBadge'
import ChapterLesson from '@/components/ui/ChapterLesson'
import { getLessonExamples } from '@/lib/lessons'
import { useChapterPhase } from '@/lib/useChapterPhase'
import SpeakingLock from '@/components/ui/SpeakingLock'
import GameTopbar from '../ui/GameTopbar'
const S: Record<string, React.CSSProperties> = {
  page:      { minHeight:'100dvh', display:'flex', flexDirection:'column', alignItems:'center', padding:'72px 24px 32px', gap:20, position:'relative' },
  mixRow:    { display:'flex', alignItems:'center', gap:12 },
  mixSwatch: { width:72, height:72, borderRadius:16, border:'3px solid var(--outline)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', boxShadow:'0 3px 0 var(--outline)' },
  plusSign:  { fontFamily:'var(--font-display)', fontSize:'var(--t-h2)', fontWeight:700, color:'var(--ink)' },
  bucketsRow:{ display:'flex', gap:16, justifyContent:'center', flexWrap:'wrap' },
  bucket:    { width:90, height:100, borderRadius:20, border:'4px solid', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4, fontSize:38, position:'relative', transition:'transform .15s' },
  label:     { fontFamily:'var(--font-body)', fontSize:'var(--t-label)', color:'var(--ink-muted)', margin:0 },
}
