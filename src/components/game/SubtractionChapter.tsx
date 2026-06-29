'use client'
import { useChapterPhase } from '@/lib/useChapterPhase'
import SpeakingLock from '@/components/ui/SpeakingLock'
import GameTopbar from '../ui/GameTopbar'
import { afterSpeech, speakAfterCurrent, speakAt } from '@/lib/useMiloSpeaker'
import{useState,useEffect,useRef}from'react'
import{useMiloSpeaker}from'@/lib/useMiloSpeaker'
import{useAdaptive,subPair,Difficulty}from'@/lib/adaptive'
import { makeDistinct } from '@/lib/questionVariety'
import { DifficultyBadge } from '../ui/DifficultyBadge'
import SubtractionLesson, { WatchSub, ChooseDiff, CSS as SUB_CSS } from '../lessons/SubtractionLesson'

interface Props{onComplete:(c:number,w:number,mastered?:boolean)=>void;childName:string}

const THEMES=[
  {emoji:'✨',subject:'fireflies',lineB:(k:number)=>`${k} fly away into the night.`},
  {emoji:'🍪',subject:'cookies',lineB:(k:number)=>`He eats ${k}. Yum!`},
  {emoji:'🎈',subject:'balloons',lineB:(k:number)=>`Pop! ${k} burst.`},
  {emoji:'🐦',subject:'birds',lineB:(k:number)=>`${k} fly away.`},
  {emoji:'🌟',subject:'stars',lineB:(k:number)=>`${k} hide behind clouds.`},
  {emoji:'🐸',subject:'frogs',lineB:(k:number)=>`${k} jump into the pond!`},
]
type Stage='showAll'|'takeAway'|'question'|'answered'

function buildChoices(ans:number):number[]{
  const opts=new Set<number>([ans])
  while(opts.size<3){const d=Math.floor(Math.random()*3)+1;const v=Math.random()<.5?ans+d:Math.max(0,ans-d);if(v!==ans)opts.add(v)}
  return[...opts].sort(()=>Math.random()-.5)
}
const TOTAL_ROUNDS=10

export default function SubtractionChapter({onComplete,childName}:Props){
  const { phase, startPractice } = useChapterPhase()
  const{speak}=useMiloSpeaker()
  const ada=useAdaptive('subtraction')
  const[roundIdx,setRoundIdx]=useState(0)
  const[total,setTotal]=useState(3);const[take,setTake]=useState(1)
  const[theme,setTheme]=useState(THEMES[0])
  const[stage,setStage]=useState<Stage>('showAll')
  const[choices,setChoices]=useState<number[]>([])
  const[selected,setSelected]=useState<number|null>(null)
  const[correct,setCorrect]=useState(0);const[wrong,setWrong]=useState(0)
  const[feedback,setFeedback]=useState<'correct'|'wrong'|null>(null)
  // Adaptive remediation: after 3 wrong in a row, re-teach by counting what's left.
  const[wrongRun,setWrongRun]=useState(0)
  const[reMed,setReMed]=useState<{phase:'reteach'|'check';total:number;take:number;emoji:string}|null>(null)
  const answerRef=useRef<HTMLElement|null>(null)   // the correct answer choice (for the pointer)
  const seen=useRef<Set<string>>(new Set())        // (total−take) pairs already asked this session
  const timers=useRef<number[]>([])
  const clearT=()=>{timers.current.forEach(id => window.clearTimeout(id));timers.current=[]}

  function loadRound(idx:number){
    clearT()
    // Don't ask the same take-away twice in a session — re-roll to keep it fresh.
    const[nt,nk]=makeDistinct(()=>subPair(ada.difficulty),seen.current,p=>p.join('-'))
    const th=THEMES[idx%THEMES.length]
    setTotal(nt);setTake(nk);setTheme(th)
    setChoices(buildChoices(nt-nk));setSelected(null);setFeedback(null);setStage('showAll')
    // Keep spoken lines short and spaced so they never cut each other off.
    speakAfterCurrent(idx===0?`Hi ${childName}! Let's take away!`:`There are ${nt} ${th.subject}!`)
    const base=nt*200
    const t1=window.setTimeout(()=>{setStage('takeAway');speak(th.lineB(nk))}, base+1800)
    const t2=window.setTimeout(()=>{setStage('question');speak(`How many ${th.subject} are left?`)}, base+1800+nk*240+2200)
    timers.current=[t1,t2]
  }

  // Only build/announce a round in the practice phase — otherwise the prompt
  // would be spoken over the lesson while phase is still 'lesson'.
  useEffect(()=>{if(phase!=='practice')return;loadRound(roundIdx);return clearT},[roundIdx,ada.difficulty,phase]) // eslint-disable-line

  function handleAnswer(choice:number){
    if(selected!==null)return
    clearT()
    const ans=total-take;const ok=choice===ans
    setSelected(choice);setStage('answered');setFeedback(ok?'correct':'wrong')
    const res=ada.record(ok)
    const newRun=ok?0:wrongRun+1
    setWrongRun(newRun)
    if(ok){setCorrect(c=>c+1);speakAt(`Yes! ${total} minus ${take} is ${ans}! ${ada.praise}`, answerRef.current)}
    else  {setWrong(w=>w+1);speakAt(`Almost! ${total} take away ${take} is ${ans} — now you know. ${ada.encouragement}`, answerRef.current)}
    afterSpeech(()=>{
      setFeedback(null)
      // 3 wrong in a row → re-teach this take-away, then check
      if(!ok && newRun>=3){ setReMed({phase:'reteach',total,take,emoji:theme.emoji}); return }
      // Demonstrated mastery → finish early with full stars, skip the repetitive tail.
      if(res.mastered){ onComplete(ok?correct+1:correct, ok?wrong:wrong+1, true); return }
      const next=roundIdx+1
      if(next>=TOTAL_ROUNDS)onComplete(ok?correct+1:correct,ok?wrong:wrong+1)
     else window.setTimeout(() => setRoundIdx(next), 300)})
  }

  function finishReMed(){
    setReMed(null); setWrongRun(0)
    if(roundIdx+1>=TOTAL_ROUNDS) onComplete(correct, wrong)
    else setRoundIdx(roundIdx+1)
  }

  const ans=total-take
  const flown=new Set(stage==='takeAway'||stage==='question'||stage==='answered'
    ?Array.from({length:take},(_,i)=>total-take+i):[])

  if(phase==='lesson') return(
    <SubtractionLesson childName={childName} onLessonComplete={startPractice}/>
  )

  return(
    <div style={{...S.page,background:'linear-gradient(180deg,var(--sky-blue-soft) 0%,var(--bg-page) 55%)'}}>
      <SpeakingLock />
      <GameTopbar chapterName="Subtraction" roundIdx={roundIdx} totalRounds={TOTAL_ROUNDS} />
      <div style={{position:'fixed',top:0,left:0,right:0,height:8,background:'rgba(0,0,0,0.08)',zIndex:5}}>
        <div style={{height:'100%',width:`${(roundIdx/TOTAL_ROUNDS)*100}%`,background:'var(--garden-green)',borderRadius:'0 4px 4px 0',transition:'width 0.4s ease'}} />
      </div>
      <div style={S.topRow}>
        <DifficultyBadge difficulty={ada.difficulty} isOnFire={ada.isOnFire}/>
        {ada.shouldHint&&<span style={S.hintTag}>💡 Watch carefully!</span>}
      </div>
      <div style={S.miloRow}>
        <img src={feedback==='wrong'?'/assets/characters/milo-thinking.png':'/assets/characters/milo-happy.png'}
          alt="Milo" style={S.milo} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
        <div className="milo-bubble" style={{flex:1,fontSize:20}}>
          {selected!==null
            ?feedback==='correct'?`🎉 ${total} − ${take} = ${ans}!`:`It's ${ans} — now you know.`
            :stage==='showAll'?`There are ${total} ${theme.subject}!`
            :stage==='takeAway'?theme.lineB(take)
            :`How many ${theme.subject} are left?`}
        </div>
      </div>
      {/* Equation */}
      <div style={S.eq}>
        {[{v:total,col:'var(--milo-orange)',dep:'var(--milo-orange-deep)'},{v:null,col:'',dep:''},{v:take,col:'var(--apple-red)',dep:'var(--apple-red-deep)'},{v:null,col:'',dep:''},{v:selected!==null?ans:null,col:selected!==null?'var(--garden-green)':'var(--milo-orange)',dep:''}]
          .map((item,i)=>i%2===1
            ?<span key={i} style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:36,color:'var(--ink-soft)'}}>{i===1?'−':'='}</span>
            :<div key={i} style={{textAlign:'center'}}>
              <div style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:44,color:item.col,WebkitTextStroke:'2px var(--outline)',paintOrder:'stroke fill',
                opacity:i===4&&selected===null?0.15:i===2&&stage==='showAll'?0.2:1,transition:'opacity 400ms ease,transform 400ms cubic-bezier(.34,1.56,.64,1)',
                transform:i===4&&selected!==null?'scale(1.2)':'scale(1)'}}>
                {item.v??'?'}
              </div>
              <span className="label" style={{fontSize:11}}>{i===0?'TOTAL':i===2?'AWAY':i===4?'LEFT':''}</span>
            </div>
          )}
      </div>
      {/* Grid */}
      <div style={S.gridWrap}>
        {/* Answer breakdown — only AFTER the child answers, so it confirms the
            result instead of revealing it. The child counts the remaining
            emojis to choose; this would otherwise spoil "{ans} left". */}
        {stage==='answered'&&(
          <div style={S.sectionRow}>
            <span style={{...S.secTag,background:'var(--garden-green)',color:'#fff',flex:ans}}>{ans} left ✓</span>
            <span style={{...S.secTag,background:'var(--apple-red)',color:'#fff',flex:take}}>{take} away</span>
          </div>
        )}
        <div style={S.emojiRow}>
          {Array.from({length:total}).map((_,i)=>{
            const gone=flown.has(i)
            return(
              <div key={i} style={{width:56,height:56,borderRadius:14,border:`3px solid ${gone?'var(--apple-red-soft)':'var(--outline)'}`,
                background:gone?'var(--apple-red-soft)':'rgba(255,255,255,.8)',
                display:'flex',alignItems:'center',justifyContent:'center',position:'relative',overflow:'hidden',
                boxShadow:gone?'none':'0 3px 0 rgba(61,37,22,.1)',
                transition:`background 300ms ease ${(i-(total-take))*120}ms,border-color 300ms ease`}}>
                <span style={{fontSize:32,display:'inline-block',
                  opacity:gone?0:1,transform:gone?'translateY(-50px) scale(0)':'translateY(0) scale(1)',
                  transition:`all 500ms cubic-bezier(.34,1.56,.64,1) ${(i-(total-take))*140}ms`}}>
                  {theme.emoji}
                </span>
                {gone&&<span style={{position:'absolute',fontSize:22,color:'var(--apple-red)',fontWeight:900}}>✕</span>}
              </div>
            )
          })}
        </div>
      </div>
      {/* Bond */}
      {(stage==='question'||stage==='answered')&&ada.shouldHint&&(
        <div style={S.bond}>
          <div style={S.bondGroup}>{Array.from({length:ans}).map((_,i)=>(
            <div key={i} style={{...S.bondDot,background:'var(--garden-green)',borderColor:'var(--garden-green-deep)'}}>
              <span style={{fontSize:12,fontFamily:'var(--font-display)',fontWeight:900,color:'#fff'}}>{i+1}</span>
            </div>))}</div>
          <div style={{width:28,height:3,background:'var(--outline)',borderRadius:2}}/>
          <div style={{width:60,height:60,borderRadius:'50%',background:'var(--milo-orange)',border:'4px solid var(--outline)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 0 var(--milo-orange-deep)'}}>
            <span style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:26,color:'#fff'}}>{total}</span>
          </div>
          <div style={{width:28,height:3,background:'var(--outline)',borderRadius:2}}/>
          <div style={S.bondGroup}>{Array.from({length:take}).map((_,i)=>(
            <div key={i} style={{...S.bondDot,background:'var(--apple-red)',borderColor:'var(--apple-red-deep)'}}>
              <span style={{fontSize:14,fontWeight:900,color:'#fff'}}>✕</span>
            </div>))}</div>
        </div>
      )}
      {/* Choices */}
      {(stage==='question'||stage==='answered')&&(
        <div style={S.choicesRow}>
          {choices.map(ch=>{
            const isSel=selected===ch;const isOk=ch===ans
            return(
              <button key={ch} disabled={selected!==null} onClick={()=>handleAnswer(ch)}
                ref={isOk ? (el)=>{answerRef.current=el} : undefined} style={{
                width:96,height:96,background:(selected!==null&&isOk)?'var(--garden-green-soft)':'var(--paper)',
                border:`4px solid ${(selected!==null&&isOk)?'var(--garden-green)':isSel?'var(--ink-muted)':'var(--outline)'}`,
                borderRadius:24,boxShadow:`0 6px 0 ${(selected!==null&&isOk)?'var(--garden-green-deep)':'#c8ac79'}`,
                fontFamily:'var(--font-display)',fontWeight:900,fontSize:42,color:'var(--ink)',
                cursor:selected!==null?'default':'pointer',
                transform:((selected!==null&&isOk)||isSel)?'scale(1.1) translateY(-4px)':'scale(1)',
                transition:'transform 160ms cubic-bezier(.34,1.56,.64,1),background 160ms ease'}}
                onMouseDown={e=>{if(!selected)(e.currentTarget.style.transform='translateY(6px)')}}
                onMouseUp={e=>{if(!selected)(e.currentTarget.style.transform='')}}
                onMouseLeave={e=>{if(!selected)(e.currentTarget.style.transform='')}}
              >{ch}</button>
            )
          })}
        </div>
      )}
      {feedback&&<div style={{...S.flash,background:feedback==='correct'?'var(--garden-green)':'var(--milo-orange)'}}>
        {feedback==='correct'?`✅ ${total} − ${take} = ${ans}!`:`It's ${ans} — now you know! 🙂`}
      </div>}
      <p style={S.roundLabel}>Round {Math.min(roundIdx+1,TOTAL_ROUNDS)} of {TOTAL_ROUNDS}</p>

      {reMed?.phase==='reteach' && (
        <SubRemediationOverlay>
          <WatchSub total={reMed.total} take={reMed.take} emoji={reMed.emoji}
            intro={`Let's count what's left! ${reMed.total} ${theme.subject}.`}
            outro={`${reMed.total} take away ${reMed.take} is ${reMed.total-reMed.take}! Now you try!`}
            onDone={()=>setReMed({phase:'check',total:3,take:1,emoji:reMed.emoji})}/>
        </SubRemediationOverlay>
      )}
      {reMed?.phase==='check' && (
        <SubRemediationOverlay>
          <ChooseDiff total={reMed.total} take={reMed.take} emoji={reMed.emoji}
            intro="Now you try! How many are left?"
            onDone={finishReMed}/>
        </SubRemediationOverlay>
      )}
    </div>
  )
}

// Overlay wrapper for the re-teach / check (carries the lesson's animation CSS).
function SubRemediationOverlay({children}:{children:React.ReactNode}){
  return (
    <div style={{position:'fixed',inset:0,zIndex:200,background:'rgba(61,37,22,0.7)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <style>{SUB_CSS}</style>
      <div style={{background:'var(--paper)',border:'4px solid var(--outline)',borderRadius:24,padding:'22px 14px 26px',maxWidth:480,width:'100%',boxShadow:'0 8px 0 rgba(61,37,22,.2)',maxHeight:'94vh',overflowY:'auto'}}>
        {children}
      </div>
    </div>
  )
}

const S:Record<string,React.CSSProperties>={
  page:{minHeight:'100dvh',display:'flex',flexDirection:'column',alignItems:'center',padding:'72px 24px 32px',gap:16,position:'relative'},
  topRow:{display:'flex',gap:10,alignItems:'center'},
  hintTag:{fontFamily:'var(--font-display)',fontWeight:700,fontSize:14,color:'var(--sky-blue-deep)',background:'var(--sky-blue-soft)',border:'2px solid var(--sky-blue)',borderRadius:999,padding:'3px 12px'},
  miloRow:{display:'flex',alignItems:'flex-end',gap:16,width:'100%',maxWidth:540},
  milo:{width:92,height:92,objectFit:'contain',flexShrink:0,filter:'drop-shadow(0 4px 10px rgba(61,37,22,.15))'},
  eq:{display:'flex',alignItems:'center',gap:14,background:'var(--paper)',border:'4px solid var(--outline)',borderRadius:24,padding:'12px 28px',boxShadow:'0 6px 0 rgba(61,37,22,.10)'},
  gridWrap:{width:'100%',maxWidth:580,background:'rgba(255,255,255,.65)',border:'4px solid var(--outline)',borderRadius:28,padding:'16px 20px',boxShadow:'0 6px 0 rgba(61,37,22,.08)'},
  sectionRow:{display:'flex',gap:8,marginBottom:10},
  secTag:{fontFamily:'var(--font-display)',fontWeight:800,fontSize:13,padding:'4px 10px',borderRadius:999,border:'2px solid var(--outline)',textAlign:'center',transition:'flex 400ms ease',animation:'slide-up 250ms ease both'},
  emojiRow:{display:'flex',flexWrap:'wrap',gap:8,justifyContent:'center'},
  bond:{display:'flex',alignItems:'center',justifyContent:'center',gap:10,animation:'slide-up 300ms ease both',flexWrap:'wrap'},
  bondGroup:{display:'flex',gap:5,flexWrap:'wrap',justifyContent:'center',maxWidth:150},
  bondDot:{width:34,height:34,borderRadius:'50%',border:'3px solid',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 0 rgba(61,37,22,.15)'},
  choicesRow:{display:'flex',gap:18,justifyContent:'center',flexWrap:'wrap',animation:'slide-up 300ms ease both'},
  flash:{position:'fixed',top:'38%',left:'50%',transform:'translate(-50%,-50%)',color:'#fff',fontFamily:'var(--font-display)',fontWeight:900,fontSize:38,padding:'18px 44px',borderRadius:28,border:'4px solid var(--outline)',boxShadow:'0 8px 0 rgba(61,37,22,.2)',zIndex:50,textAlign:'center',animation:'modal-in 280ms cubic-bezier(.34,1.56,.64,1) both'},
  roundLabel:{fontFamily:'var(--font-body)',fontSize:'var(--t-label)',color:'var(--ink-muted)',margin:0},
}
