'use client'
import { useState, useEffect, useRef } from 'react'
import { useMiloSpeaker, afterSpeech, speakAfterCurrent } from '@/lib/useMiloSpeaker'
import { useAdaptive, addPair } from '@/lib/adaptive'
import { DifficultyBadge } from '../ui/DifficultyBadge'
import { useChapterPhase } from '@/lib/useChapterPhase'
import SpeakingLock from '@/components/ui/SpeakingLock'
import GameTopbar from '../ui/GameTopbar'
import AdditionLesson, { WatchAdd, ChooseSum, CSS as ADD_CSS } from '../lessons/AdditionLesson'


interface Props{onComplete:(c:number,w:number)=>void;childName:string}

const STORIES=[
  {emoji:'🍎',subject:'apples'},  {emoji:'⭐',subject:'stars'},
  {emoji:'🐸',subject:'frogs'},   {emoji:'🍪',subject:'cookies'},
  {emoji:'🌸',subject:'flowers'}, {emoji:'🦋',subject:'butterflies'},
  {emoji:'🐠',subject:'fish'},    {emoji:'🍄',subject:'mushrooms'},
]

type Stage='groupA'|'groupB'|'question'|'answered'

function buildChoices(answer:number):number[]{
  const opts=new Set<number>([answer])
  while(opts.size<3){
    const d=Math.floor(Math.random()*3)+1
    const v=Math.random()<0.5?answer+d:Math.max(0,answer-d)
    if(v!==answer)opts.add(v)
  }
  return[...opts].sort(()=>Math.random()-.5)
}

const TOTAL_ROUNDS=6

export default function AdditionChapter({onComplete,childName}:Props){
  const { phase, startPractice } = useChapterPhase()
  const{speak}=useMiloSpeaker()
  const ada=useAdaptive('addition')
  const[roundIdx,setRoundIdx]=useState(0)
  const[a,setA]=useState(1);const[b,setB]=useState(1)
  const[story,setStory]=useState(STORIES[0])
  const[stage,setStage]=useState<Stage>('groupA')
  const[choices,setChoices]=useState<number[]>([])
  const[selected,setSelected]=useState<number|null>(null)
  const[correct,setCorrect]=useState(0);const[wrong,setWrong]=useState(0)
  const[feedback,setFeedback]=useState<'correct'|'wrong'|null>(null)
  // Adaptive remediation: after 3 wrong in a row, re-teach by counting the sum.
  const[wrongRun,setWrongRun]=useState(0)
  const[reMed,setReMed]=useState<{phase:'reteach'|'check';a:number;b:number;emoji:string}|null>(null)
  const timers=useRef<number[]>([])
  const clearT=()=>{timers.current.forEach(id=>window.clearTimeout(id));timers.current=[]}

  function loadRound(idx:number){
    clearT()
    const[na,nb]=addPair(ada.difficulty)
    const st=STORIES[idx%STORIES.length]
    setA(na);setB(nb);setStory(st)
    setChoices(buildChoices(na+nb))
    setSelected(null);setFeedback(null);setStage('groupA')
    speakAfterCurrent(idx===0?`Hi ${childName}! Let's add! Watch carefully!`
      :ada.shouldHint?`Watch — ${na} ${st.subject} plus ${nb} more!`
      :`${na} ${st.subject} and ${nb} more!`)
    const t1=window.setTimeout(()=>setStage('groupB'),na*200+700)
    const t2=window.setTimeout(()=>setStage('question'),na*200+nb*200+1300)
    timers.current=[t1,t2]
  }

  useEffect(()=>{loadRound(roundIdx);return clearT},[roundIdx,ada.difficulty]) // eslint-disable-line

  function handleAnswer(choice:number){
    if(selected!==null)return
    clearT()
    const ans=a+b;const ok=choice===ans
    setSelected(choice);setStage('answered');setFeedback(ok?'correct':'wrong')
    ada.record(ok)
    const newRun=ok?0:wrongRun+1
    setWrongRun(newRun)
    if(ok){setCorrect(c=>c+1);speak(`Yes! ${a} plus ${b} is ${ans}! ${ada.praise}`)}
    else  {setWrong(w=>w+1);speak(`${a} plus ${b} equals ${ans}. ${ada.encouragement}`)}
    afterSpeech(()=>{
      setFeedback(null)
      // 3 wrong in a row → re-teach this sum by counting it, then check
      if(!ok && newRun>=3){ setReMed({phase:'reteach',a,b,emoji:story.emoji}); return }
      const next=roundIdx+1
      if(next>=TOTAL_ROUNDS){
        onComplete(
          ok?correct+1:correct,
          ok?wrong:wrong+1
        )
      } else {
        window.setTimeout(()=>setRoundIdx(next),300)
      }
    })
    timers.current=[]
  }

  // Remediation finished (passed the check) → resume play. The triggering answer
  // was wrong and already counted.
  function finishReMed(){
    setReMed(null); setWrongRun(0)
    if(roundIdx+1>=TOTAL_ROUNDS) onComplete(correct, wrong)
    else setRoundIdx(roundIdx+1)
  }

  const ans=a+b
  const bubbleText=selected!==null
    ?feedback==='correct'?`🎉 ${a} + ${b} = ${ans}!`:`The answer was ${ans}!`
    :stage==='groupA'?`Milo has ${a} ${story.subject}…`
    :stage==='groupB'?`He gets ${b} more ${story.subject}!`
    :`How many ${story.subject} altogether?`

  if(phase==='lesson') return(
    <AdditionLesson childName={childName} onLessonComplete={startPractice}/>
  )

  return(
    <div style={{...S.page,background:'linear-gradient(180deg,var(--sun-yellow-soft) 0%,var(--bg-page) 55%)'}}>
      <SpeakingLock />
      <GameTopbar chapterName="Addition" roundIdx={roundIdx} totalRounds={TOTAL_ROUNDS} />
      <div style={{position:'fixed',top:0,left:0,right:0,height:8,background:'rgba(0,0,0,0.08)',zIndex:5}}>
        <div style={{height:'100%',width:`${(roundIdx/TOTAL_ROUNDS)*100}%`,background:'var(--garden-green)',borderRadius:'0 4px 4px 0',transition:'width 0.4s ease'}} />
      </div>
      <div style={S.topRow}>
        <DifficultyBadge difficulty={ada.difficulty} isOnFire={ada.isOnFire}/>
        {ada.shouldHint&&<span style={S.hintTag}>💡 Take your time!</span>}
      </div>
      <div style={S.miloRow}>
        <img src="/assets/characters/milo-happy.png" alt="Milo" style={S.milo}
          onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
        <div className="milo-bubble" style={{flex:1,fontSize:20}}>{bubbleText}</div>
      </div>
      {/* Scene */}
      <div style={S.scene}>
        {/* Group A */}
        <div style={S.group}>
          <span className="label" style={{fontSize:12,marginBottom:6,display:'block',textAlign:'center'}}>MILO HAS</span>
          <div style={S.emojiGrid}>
            {Array.from({length:a}).map((_,i)=>(
              <span key={i} style={{fontSize:ada.difficulty===1?48:40,display:'inline-block',
                opacity:1,transform:'scale(1)',transition:`all 300ms cubic-bezier(.34,1.56,.64,1) ${i*150}ms`}}>
                {story.emoji}
              </span>
            ))}
          </div>
          <div style={{...S.badge,background:'var(--sky-blue)',borderColor:'var(--sky-blue-deep)'}}>{a}</div>
        </div>
        <div style={S.op}>+</div>
        {/* Group B */}
        <div style={S.group}>
          <span className="label" style={{fontSize:12,marginBottom:6,display:'block',textAlign:'center'}}>HE GETS</span>
          <div style={S.emojiGrid}>
            {Array.from({length:b}).map((_,i)=>(
              <span key={i} style={{fontSize:ada.difficulty===1?48:40,display:'inline-block',
                opacity:stage==='groupA'?0:1,
                transform:stage==='groupA'?'scale(0) translateY(-20px)':'scale(1) translateY(0)',
                transition:`all 350ms cubic-bezier(.34,1.56,.64,1) ${i*150}ms`}}>
                {story.emoji}
              </span>
            ))}
          </div>
          <div style={{...S.badge,background:'var(--garden-green)',borderColor:'var(--garden-green-deep)',
            opacity:stage==='groupA'?0:1,transition:'opacity 300ms ease'}}>{b}</div>
        </div>
        <div style={S.op}>=</div>
        {/* Total */}
        <div style={{...S.totalBox,
          background:feedback==='correct'?'var(--garden-green)':feedback==='wrong'?'var(--apple-red)':'var(--milo-orange)',
          borderColor:feedback==='correct'?'var(--garden-green-deep)':feedback==='wrong'?'var(--apple-red-deep)':'var(--milo-orange-deep)',
          opacity:selected!==null?1:0.2,transform:selected!==null?'scale(1)':'scale(0.6)',
          transition:'all 400ms cubic-bezier(.34,1.56,.64,1)'}}>
          <span style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:44,color:'#fff',lineHeight:1}}>{ans}</span>
        </div>
      </div>
      {/* Hint number line */}
      {ada.shouldHint&&(stage==='question'||selected!==null)&&(
        <div style={S.numLine}>
          {Array.from({length:ans+1}).map((_,i)=>(
            <div key={i} style={{...S.numDot,
              background:i===0?'var(--cream)':i<=a?'var(--sky-blue)':'var(--garden-green)',
              borderColor:i<=a?'var(--sky-blue-deep)':'var(--garden-green-deep)',
              transform:`scale(${i===ans?1.3:1})`,
              boxShadow:i===ans?'0 0 0 3px var(--milo-orange)':'0 2px 0 rgba(61,37,22,.15)'}}>
              <span style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:13,
                color:i===0?'var(--ink-muted)':'#fff'}}>{i}</span>
            </div>
          ))}
        </div>
      )}
      {/* Choices */}
      {(stage==='question'||selected!==null)&&(
        <div style={S.choicesRow}>
          {choices.map(ch=>{
            const isSel=selected===ch;const isOk=ch===ans
            return(
              <button key={ch} disabled={selected!==null} onClick={()=>handleAnswer(ch)} style={{
                width:96,height:96,background:isSel?(isOk?'var(--garden-green-soft)':'var(--apple-red-soft)'):'var(--paper)',
                border:`4px solid ${isSel?(isOk?'var(--garden-green)':'var(--apple-red)'):'var(--outline)'}`,
                borderRadius:24,boxShadow:isSel?`0 6px 0 ${isOk?'var(--garden-green-deep)':'var(--apple-red-deep)'}`:'0 6px 0 #c8ac79',
                fontFamily:'var(--font-display)',fontWeight:900,fontSize:42,color:'var(--ink)',cursor:selected!==null?'default':'pointer',
                transform:isSel?'scale(1.1) translateY(-4px)':'scale(1)',
                transition:'transform 160ms cubic-bezier(.34,1.56,.64,1),background 160ms ease',
              }}
              onMouseDown={e=>{if(!selected)(e.currentTarget.style.transform='translateY(6px)')}}
              onMouseUp={e=>{if(!selected)(e.currentTarget.style.transform='')}}
              onMouseLeave={e=>{if(!selected)(e.currentTarget.style.transform='')}}
              >{ch}</button>
            )
          })}
        </div>
      )}
      {feedback&&<div style={{...S.flash,background:feedback==='correct'?'var(--garden-green)':'var(--apple-red)'}}>
        {feedback==='correct'?`✅ ${a} + ${b} = ${ans}!`:`The answer was ${ans}`}
      </div>}
      <p style={S.roundLabel}>Round {Math.min(roundIdx+1,TOTAL_ROUNDS)} of {TOTAL_ROUNDS}</p>

      {reMed?.phase==='reteach' && (
        <AddRemediationOverlay>
          <WatchAdd a={reMed.a} b={reMed.b} emoji={reMed.emoji}
            intro={`Let's count them together! ${reMed.a} and ${reMed.b} more.`}
            outro={`${reMed.a} plus ${reMed.b} is ${reMed.a+reMed.b}! Now you try!`}
            onDone={()=>setReMed({phase:'check',a:2,b:1,emoji:reMed.emoji})}/>
        </AddRemediationOverlay>
      )}
      {reMed?.phase==='check' && (
        <AddRemediationOverlay>
          <ChooseSum a={reMed.a} b={reMed.b} emoji={reMed.emoji}
            intro="Now you try! Count and pick how many altogether."
            onDone={finishReMed}/>
        </AddRemediationOverlay>
      )}
    </div>
  )
}

// Overlay wrapper for the re-teach / check (carries the lesson's animation CSS).
function AddRemediationOverlay({children}:{children:React.ReactNode}){
  return (
    <div style={{position:'fixed',inset:0,zIndex:200,background:'rgba(61,37,22,0.7)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <style>{ADD_CSS}</style>
      <div style={{background:'var(--paper)',border:'4px solid var(--outline)',borderRadius:24,padding:'22px 14px 26px',maxWidth:480,width:'100%',boxShadow:'0 8px 0 rgba(61,37,22,.2)',maxHeight:'94vh',overflowY:'auto'}}>
        {children}
      </div>
    </div>
  )
}

const S:Record<string,React.CSSProperties>={
  page:{minHeight:'100dvh',display:'flex',flexDirection:'column',alignItems:'center',padding:'72px 24px 32px',gap:18,position:'relative'},
  topRow:{display:'flex',gap:10,alignItems:'center'},
  hintTag:{fontFamily:'var(--font-display)',fontWeight:700,fontSize:14,color:'var(--sky-blue-deep)',background:'var(--sky-blue-soft)',border:'2px solid var(--sky-blue)',borderRadius:999,padding:'3px 12px'},
  miloRow:{display:'flex',alignItems:'flex-end',gap:16,width:'100%',maxWidth:540},
  milo:{width:92,height:92,objectFit:'contain',flexShrink:0,filter:'drop-shadow(0 4px 10px rgba(61,37,22,.15))'},
  scene:{display:'flex',alignItems:'center',justifyContent:'center',gap:16,flexWrap:'wrap',background:'rgba(255,255,255,.65)',border:'4px solid var(--outline)',borderRadius:28,padding:'20px 28px',boxShadow:'0 6px 0 rgba(61,37,22,.08)',maxWidth:620,width:'100%'},
  group:{display:'flex',flexDirection:'column',alignItems:'center',gap:4,minWidth:110},
  emojiGrid:{display:'flex',flexWrap:'wrap',gap:5,justifyContent:'center',maxWidth:160,minHeight:56},
  badge:{marginTop:8,width:42,height:42,borderRadius:'50%',border:'3px solid',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--font-display)',fontWeight:900,fontSize:20,color:'#fff',boxShadow:'0 3px 0 rgba(61,37,22,.2)'},
  op:{fontFamily:'var(--font-display)',fontWeight:900,fontSize:52,color:'var(--milo-orange)',WebkitTextStroke:'2px var(--outline)',paintOrder:'stroke fill',lineHeight:1,marginTop:20},
  totalBox:{width:84,height:84,borderRadius:22,border:'4px solid',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 6px 0 rgba(61,37,22,.2)'},
  numLine:{display:'flex',alignItems:'center',gap:5,background:'rgba(255,255,255,.7)',border:'3px solid var(--outline)',borderRadius:20,padding:'8px 14px',flexWrap:'wrap',justifyContent:'center',maxWidth:540,animation:'slide-up 300ms ease both'},
  numDot:{width:36,height:36,borderRadius:'50%',border:'3px solid',display:'flex',alignItems:'center',justifyContent:'center',transition:'transform 200ms ease'},
  choicesRow:{display:'flex',gap:18,justifyContent:'center',flexWrap:'wrap',animation:'slide-up 300ms ease both'},
  flash:{position:'fixed',top:'38%',left:'50%',transform:'translate(-50%,-50%)',color:'#fff',fontFamily:'var(--font-display)',fontWeight:900,fontSize:38,padding:'18px 44px',borderRadius:28,border:'4px solid var(--outline)',boxShadow:'0 8px 0 rgba(61,37,22,.2)',zIndex:50,textAlign:'center',animation:'modal-in 280ms cubic-bezier(.34,1.56,.64,1) both'},
  roundLabel:{fontFamily:'var(--font-body)',fontSize:'var(--t-label)',color:'var(--ink-muted)',margin:0},
}
