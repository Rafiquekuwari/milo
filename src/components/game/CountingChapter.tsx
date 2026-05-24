'use client'
import { useState, useEffect } from 'react'

import { useAdaptive, countTarget } from '@/lib/adaptive'
import { DifficultyBadge } from '@/components/ui/DifficultyBadge'
import ChapterLesson from '@/components/ui/ChapterLesson'
import { getLessonExamples } from '@/lib/lessons'
import { useChapterPhase } from '@/lib/useChapterPhase'
import SpeakingLock from '@/components/ui/SpeakingLock'
import GameTopbar from '../ui/GameTopbar'
import { afterSpeech, speakAfterCurrent, useMiloSpeaker } from '@/lib/useMiloSpeaker'

interface Props { onComplete:(c:number,w:number)=>void; childName:string }

const EMOJIS = [
  { emoji:'⭐', label:'stars'       },
  { emoji:'🦋', label:'butterflies' },
  { emoji:'🍄', label:'mushrooms'   },
  { emoji:'🌸', label:'flowers'     },
  { emoji:'🍎', label:'apples'      },
  { emoji:'🐸', label:'frogs'       },
  { emoji:'🎈', label:'balloons'    },
]

function buildChoices(target:number):number[]{
  const opts=new Set<number>([target])
  while(opts.size<3){
    const d=Math.floor(Math.random()*3)+1
    const v=Math.random()<0.5?target-d:target+d
    if(v>0&&v<=12)opts.add(v)
  }
  return[...opts].sort(()=>Math.random()-.5)
}

const TOTAL_ROUNDS=6

export default function CountingChapter({onComplete,childName}:Props){
  const { phase, startPractice } = useChapterPhase()
  const{speak}=useMiloSpeaker()
  const ada=useAdaptive('counting')
  const[roundIdx,setRoundIdx]=useState(0)
  const[target,setTarget]=useState(0)
  const[emojiSet,setEmojiSet]=useState(EMOJIS[0])
  const[tapped,setTapped]=useState<number[]>([])
  const[choices,setChoices]=useState<number[]>([])
  const[answered,setAnswered]=useState(false)
  const[correct,setCorrect]=useState(0)
  const[wrong,setWrong]=useState(0)
  const[feedback,setFeedback]=useState<'correct'|'wrong'|null>(null)

  function newRound(idx:number){
    const t=countTarget(ada.difficulty)
    const em=EMOJIS[idx%EMOJIS.length]
    setTarget(t);setEmojiSet(em)
    setChoices(buildChoices(t));setTapped([]);setAnswered(false)
    const msg=idx===0
      ?`Hi ${childName}! Tap each ${em.label} to count them!`
      :ada.shouldHint
        ?`Count carefully — tap each one! ${t} ${em.label} — how many?`
        :`Count the ${em.label}!`
    speakAfterCurrent(msg)
  }

  useEffect(()=>{newRound(roundIdx)},[roundIdx,ada.difficulty]) // eslint-disable-line

  function handleTap(i:number){
    if(answered||tapped.includes(i))return
    const next=[...tapped,i];setTapped(next)
    speak(String(next.length))
  }

  function handleAnswer(choice:number){
    if(answered)return
    setAnswered(true)
    const ok=choice===target
    ada.record(ok)
    setFeedback(ok?'correct':'wrong')
    if(ok){setCorrect(c=>c+1);speak(ada.isOnFire?ada.praise:`Yes! ${target} ${emojiSet.label}! ${ada.praise}`)}
    else   {setWrong(w=>w+1);speak(`Oops! There are ${target} ${emojiSet.label}. ${ada.encouragement}`)}
    afterSpeech(() => {
          setFeedback(null)
          const next = roundIdx + 1
          if (next >= TOTAL_ROUNDS) onComplete(ok?correct+1:correct, ok?wrong:wrong+1)
          else window.setTimeout(() => setRoundIdx(next), 300)
        })
  }

  const bubbleText=tapped.length===0?`Tap each ${emojiSet.label} to count!`
    :tapped.length<target?`${tapped.length}…`
    :`How many ${emojiSet.label}?`

  return(
    <div style={S.page}>
      <SpeakingLock />
      <GameTopbar chapterName="Counting" roundIdx={roundIdx} totalRounds={TOTAL_ROUNDS} />
      <div style={{position:'fixed',top:0,left:0,right:0,height:8,background:'rgba(0,0,0,0.08)',zIndex:5}}>
        <div style={{height:'100%',width:`${(roundIdx/TOTAL_ROUNDS)*100}%`,background:'var(--garden-green)',borderRadius:'0 4px 4px 0',transition:'width 0.4s ease'}} />
      </div>
      <div style={S.topRow}>
        <DifficultyBadge difficulty={ada.difficulty} isOnFire={ada.isOnFire}/>
        {ada.isOnFire&&<span style={S.fireTag}>🔥 On a roll!</span>}
      </div>
      <div style={S.miloRow}>
        <img src="/assets/characters/milo-happy.png" alt="Milo" style={S.milo}
          onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
        <div className="milo-bubble" style={{flex:1,fontSize:20}}>{bubbleText}</div>
      </div>
      <div style={S.objectGrid}>
        {Array.from({length:target}).map((_,i)=>(
          <button key={i} onClick={()=>handleTap(i)} style={{
            ...S.objectBtn,
            background:tapped.includes(i)?'var(--sun-yellow-soft)':'rgba(255,255,255,.8)',
            borderColor:tapped.includes(i)?'var(--sun-yellow-deep)':'var(--outline)',
            transform:tapped.includes(i)?'scale(1.2)':'scale(1)',
          }}>
            <span style={{fontSize:ada.difficulty===1?52:44}}>{emojiSet.emoji}</span>
            {tapped.includes(i)&&<span style={S.tapBadge}>{tapped.indexOf(i)+1}</span>}
          </button>
        ))}
      </div>
      {/* Hint: show number line when struggling */}
      {ada.shouldHint&&(
        <div style={S.hintRow}>
          {Array.from({length:target}).map((_,i)=>(
            <div key={i} style={{...S.hintDot,background:'var(--sky-blue)',borderColor:'var(--sky-blue-deep)'}}>
              <span style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:13,color:'#fff'}}>{i+1}</span>
            </div>
          ))}
        </div>
      )}
      <div style={S.choiceRow}>
        {choices.map(c=>(
          <button key={c} onClick={()=>handleAnswer(c)} disabled={answered} style={{
            ...S.choiceBtn,
            background:answered&&c===target?'var(--garden-green-soft)':'var(--paper)',
            borderColor:answered&&c===target?'var(--garden-green)':'var(--outline)',
            boxShadow:answered&&c===target?'0 6px 0 var(--garden-green-deep)':'0 6px 0 #c8ac79',
          }}
          onMouseDown={e=>{if(!answered)(e.currentTarget.style.transform='translateY(6px)')}}
          onMouseUp={e=>{(e.currentTarget.style.transform='')}}
          onMouseLeave={e=>{(e.currentTarget.style.transform='')}}
          >{c}</button>
        ))}
      </div>
      {feedback&&<div style={{...S.flash,background:feedback==='correct'?'var(--garden-green)':'var(--apple-red)'}}>
        {feedback==='correct'?`✅ ${target}!`:`It was ${target}`}
      </div>}
      <p style={S.label}>Round {Math.min(roundIdx+1,TOTAL_ROUNDS)} of {TOTAL_ROUNDS}</p>
    </div>
  )
}

const S:Record<string,React.CSSProperties>={
  page:{minHeight:'100dvh',display:'flex',flexDirection:'column',alignItems:'center',padding:'72px 24px 32px',gap:18,position:'relative',background:'linear-gradient(180deg,var(--sky-blue-soft) 0%,var(--bg-page) 55%)'},
  topRow:{display:'flex',gap:10,alignItems:'center'},
  fireTag:{fontFamily:'var(--font-display)',fontWeight:900,fontSize:16,color:'var(--milo-orange)'},
  miloRow:{display:'flex',alignItems:'flex-end',gap:16,width:'100%',maxWidth:540},
  milo:{width:92,height:92,objectFit:'contain',flexShrink:0,filter:'drop-shadow(0 4px 10px rgba(61,37,22,.15))'},
  objectGrid:{display:'flex',flexWrap:'wrap',gap:12,justifyContent:'center',maxWidth:400},
  objectBtn:{width:86,height:86,borderRadius:18,border:'3px solid',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',position:'relative',transition:'transform .15s, background .15s',boxShadow:'0 4px 0 rgba(61,37,22,.1)'},
  tapBadge:{position:'absolute',top:-8,right:-8,background:'var(--milo-orange)',color:'#fff',borderRadius:'50%',width:24,height:24,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--font-display)',fontSize:13,fontWeight:700,border:'2px solid var(--outline)'},
  hintRow:{display:'flex',gap:6,flexWrap:'wrap',justifyContent:'center',animation:'slide-up 300ms ease both'},
  hintDot:{width:34,height:34,borderRadius:'50%',border:'3px solid',display:'flex',alignItems:'center',justifyContent:'center'},
  choiceRow:{display:'flex',gap:16,justifyContent:'center',flexWrap:'wrap'},
  choiceBtn:{width:92,height:92,borderRadius:22,border:'4px solid',cursor:'pointer',fontFamily:'var(--font-display)',fontWeight:900,fontSize:42,color:'var(--ink)',transition:'transform 160ms cubic-bezier(.34,1.56,.64,1),background 160ms ease'},
  flash:{position:'fixed',top:'38%',left:'50%',transform:'translate(-50%,-50%)',color:'#fff',fontFamily:'var(--font-display)',fontWeight:900,fontSize:38,padding:'18px 44px',borderRadius:28,border:'4px solid var(--outline)',boxShadow:'0 8px 0 rgba(61,37,22,.2)',zIndex:50,textAlign:'center',animation:'modal-in 280ms cubic-bezier(.34,1.56,.64,1) both'},
  label:{fontFamily:'var(--font-body)',fontSize:'var(--t-label)',color:'var(--ink-muted)',margin:0},
}
