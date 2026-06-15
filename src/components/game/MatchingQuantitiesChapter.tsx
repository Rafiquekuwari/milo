'use client'
import { useState, useEffect } from 'react'
import { useMiloSpeaker, afterSpeech, speakSeq } from '@/lib/useMiloSpeaker'
import { MiloProgressBar } from '@/components/ui/MiloUI'
import { useAdaptive, matchTarget, Difficulty } from '@/lib/adaptive'
import { DifficultyBadge } from '../ui/DifficultyBadge'
import MatchingQuantitiesLesson, { WatchFill, TapFill, CSS as MATCH_CSS } from '../lessons/MatchingQuantitiesLesson'
import { useChapterPhase } from '@/lib/useChapterPhase'
import SpeakingLock from '@/components/ui/SpeakingLock'
import GameTopbar from '../ui/GameTopbar'

interface Props { onComplete:(c:number,w:number)=>void; childName:string }
const TOTAL_ROUNDS = 10
const TOTAL_APPLES = 10

function buildRound(diff: Difficulty) {
  return { target: matchTarget(diff) }
}

export default function MatchingQuantitiesChapter({ onComplete, childName }: Props) {
  const { speak } = useMiloSpeaker()
  const ada = useAdaptive('matchingQuantities')
  const { phase, startPractice } = useChapterPhase()
  const [roundIdx, setRoundIdx] = useState(0)
  const [round, setRound] = useState(() => buildRound(1))
  const [basket, setBasket] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [correct, setCorrect] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [feedback, setFeedback] = useState<'correct'|'wrong'|null>(null)
  const [shaking, setShaking] = useState(false)
  // Gates apple-tapping until Milo has FINISHED the round instruction, so the
  // counting can never jump ahead of "Put N apples in the basket!".
  const [ready, setReady] = useState(false)
  // Adaptive remediation: after 3 wrong in a row, re-teach by re-counting into
  // the basket, then check with a small, confidence-building number.
  const [wrongRun, setWrongRun] = useState(0)
  const [reMed, setReMed] = useState<{phase:'reteach'|'check'; target:number}|null>(null)

  useEffect(() => {
    const r = buildRound(ada.difficulty)
    setRound(r); setBasket(0); setSubmitted(false); setReady(false)
    const apples = `apple${r.target > 1 ? 's' : ''}`
    const prompt =
      roundIdx === 0   ? `Hi ${childName}! Put ${r.target} ${apples} in the basket!`
      : ada.shouldHint ? `Put exactly ${r.target} ${apples} — count carefully!`
      :                  `Put ${r.target} ${apples} in the basket!`
    // Speak the instruction first; only unlock tapping once it has finished, so a
    // number can never be spoken before the instruction.
    let started = false
    const cancel = speakSeq([prompt], { onWord: () => { started = true }, onDone: () => setReady(true) })
    // Fallback: if speech never starts (blocked autoplay, muted device…), unlock
    // anyway so the round can never get stuck with the apples disabled.
    const fb = window.setTimeout(() => { if (!started) setReady(true) }, 2000)
    return () => { cancel(); window.clearTimeout(fb) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIdx, ada.difficulty])

  if (phase === 'lesson') return (
    <MatchingQuantitiesLesson childName={childName} onLessonComplete={startPractice} />
  )

  function addApple() {
    if (!ready || submitted || basket >= TOTAL_APPLES) return
    const next = basket + 1
    setBasket(next)
    speak(String(next))
  }

  function handleSubmit() {
    if (submitted) return
    setSubmitted(true)
    const ok = basket === round.target
    setFeedback(ok ? 'correct' : 'wrong')
    ada.record(ok)
    const newRun = ok ? 0 : wrongRun + 1
    setWrongRun(newRun)
    if (ok) { setCorrect(c=>c+1); speak(`Yes! ${round.target} apples! ${ada.praise}`) }
    else { setWrong(w=>w+1); setShaking(true); speak(`We needed ${round.target}. ${ada.encouragement}`); window.setTimeout(()=>setShaking(false),500) }
    afterSpeech(() => {
          setFeedback(null)
          // 3 wrong in a row → re-teach this target, then check with a small one.
          if (!ok && newRun >= 3) { setReMed({ phase:'reteach', target: round.target }); return }
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

  return (
    <div style={S.page}>
      <MiloProgressBar current={roundIdx} total={TOTAL_ROUNDS} />
      <SpeakingLock />
      <GameTopbar chapterName="Apple Basket" roundIdx={roundIdx} totalRounds={TOTAL_ROUNDS} />
      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
        <DifficultyBadge difficulty={ada.difficulty} isOnFire={ada.isOnFire} />
        {ada.shouldHint && <span style={S.hint}>💡 Count carefully!</span>}
      </div>
      <div style={S.miloRow}>
        <img src="/assets/characters/milo-happy.png" alt="Milo" style={S.milo}
          onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
        <div className="milo-bubble" style={{flex:1,fontSize:20}}>
          Put <strong style={{color:'var(--milo-orange)',fontSize:'1.2em'}}>{round.target}</strong> apple{round.target>1?'s':''} in the basket!
        </div>
      </div>
      <div style={S.treeArea}>
        <p style={S.areaLabel}>Tap apples to pick them:</p>
        <div style={S.appleGrid}>
          {Array.from({length:TOTAL_APPLES}).map((_,i)=>(
            <button key={i} onClick={addApple} disabled={!ready||submitted||i<basket} style={{
              fontSize:ada.difficulty===1?40:34, background:'transparent', border:'none',
              cursor:!ready||submitted||i<basket?'default':'pointer',
              opacity:i<basket?0.25:!ready?0.5:1, transform:i<basket?'scale(.8)':'scale(1)',
              transition:'all .15s',
            }}>🍎</button>
          ))}
        </div>
      </div>
      <div style={{...S.basketArea, animation:shaking?'shake 400ms ease both':'none'}}>
        <p style={S.areaLabel}>Your basket: <strong>{basket}</strong> / {round.target}</p>
        <div style={S.basketRow}>
          <span style={{fontSize:48}}>🧺</span>
          <div style={S.basketApples}>
            {basket>0
              ? Array.from({length:Math.min(basket,10)}).map((_,i)=><span key={i} style={{fontSize:24}}>🍎</span>)
              : <span style={{color:'var(--ink-muted)',fontSize:14}}>empty</span>}
          </div>
          <span style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:40,color:basket===round.target?'var(--garden-green)':'var(--milo-orange)',minWidth:48,textAlign:'center'}}>{basket}</span>
        </div>
        {basket>0&&!submitted&&(
          <button onClick={()=>setBasket(c=>Math.max(0,c-1))} style={S.undoBtn}>↩ Remove one</button>
        )}
      </div>
      <button className="milo-btn tone-green size-lg" onClick={handleSubmit}
        disabled={submitted||basket===0} style={{opacity:submitted||basket===0?.5:1}}>
        ✅ Done!
      </button>
      {feedback&&<div style={{...S.flash,background:feedback==='correct'?'var(--garden-green)':'var(--apple-red)'}}>
        {feedback==='correct'?`🎉 ${round.target} apples!`:`We needed ${round.target}!`}
      </div>}
      <p style={S.label}>Round {Math.min(roundIdx+1,TOTAL_ROUNDS)} of {TOTAL_ROUNDS}</p>

      {reMed?.phase==='reteach' && (
        <MatchRemediationOverlay>
          <WatchFill target={reMed.target} emoji="🍎"
            intro={`Let's count them in together! We need ${reMed.target}.`}
            outro={`${reMed.target} apples — just right! Now you try with a small one!`}
            onDone={()=>setReMed({phase:'check',target:Math.min(reMed.target,3)})}/>
        </MatchRemediationOverlay>
      )}
      {reMed?.phase==='check' && (
        <MatchRemediationOverlay>
          <TapFill target={reMed.target} emoji="🍎"
            intro={`Now you try! Put exactly ${reMed.target} in the basket.`}
            outro={`${reMed.target} apples! You did it!`}
            onDone={finishReMed}/>
        </MatchRemediationOverlay>
      )}
    </div>
  )
}

// Overlay wrapper for the re-teach / check (carries the lesson's animation CSS).
function MatchRemediationOverlay({children}:{children:React.ReactNode}){
  return (
    <div style={{position:'fixed',inset:0,zIndex:200,background:'rgba(61,37,22,0.7)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <style>{MATCH_CSS}</style>
      <div style={{background:'var(--paper)',border:'4px solid var(--outline)',borderRadius:24,padding:'22px 14px 26px',maxWidth:480,width:'100%',boxShadow:'0 8px 0 rgba(61,37,22,.2)',maxHeight:'94vh',overflowY:'auto'}}>
        {children}
      </div>
    </div>
  )
}

const S:Record<string,React.CSSProperties>={
  page:{minHeight:'100dvh',display:'flex',flexDirection:'column',alignItems:'center',padding:'72px 24px 32px',gap:18,position:'relative',background:'linear-gradient(180deg,var(--garden-green-soft) 0%,var(--bg-page) 55%)'},
  hint:{fontFamily:'var(--font-display)',fontWeight:700,fontSize:14,color:'var(--sky-blue-deep)',background:'var(--sky-blue-soft)',border:'2px solid var(--sky-blue)',borderRadius:999,padding:'3px 12px'},
  miloRow:{display:'flex',alignItems:'flex-end',gap:16,width:'100%',maxWidth:540},
  milo:{width:92,height:92,objectFit:'contain',flexShrink:0},
  treeArea:{background:'rgba(255,255,255,.6)',borderRadius:20,padding:16,width:'100%',maxWidth:400},
  areaLabel:{fontFamily:'var(--font-body)',fontSize:16,color:'var(--ink-soft)',margin:'0 0 10px',textAlign:'center'},
  appleGrid:{display:'flex',flexWrap:'wrap',gap:6,justifyContent:'center'},
  basketArea:{background:'var(--paper)',border:'4px solid var(--outline)',borderRadius:20,padding:16,width:'100%',maxWidth:400,boxShadow:'0 5px 0 rgba(61,37,22,.10)'},
  basketRow:{display:'flex',alignItems:'center',gap:12,justifyContent:'center',flexWrap:'wrap',minHeight:60},
  basketApples:{display:'flex',flexWrap:'wrap',gap:4,flex:1,justifyContent:'center'},
  undoBtn:{marginTop:8,background:'none',border:'2px solid var(--ink-muted)',borderRadius:12,padding:'6px 14px',fontFamily:'var(--font-body)',fontSize:14,color:'var(--ink-soft)',cursor:'pointer',display:'block',margin:'8px auto 0'},
  flash:{position:'fixed',top:'38%',left:'50%',transform:'translate(-50%,-50%)',color:'#fff',fontFamily:'var(--font-display)',fontWeight:900,fontSize:36,padding:'18px 44px',borderRadius:28,border:'4px solid var(--outline)',boxShadow:'0 8px 0 rgba(61,37,22,.2)',zIndex:50,textAlign:'center',animation:'modal-in 280ms cubic-bezier(.34,1.56,.64,1) both'},
  label:{fontFamily:'var(--font-body)',fontSize:'var(--t-label)',color:'var(--ink-muted)',margin:0},
}
