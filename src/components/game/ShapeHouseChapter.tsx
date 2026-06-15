'use client'
import { useState, useEffect, useRef } from 'react'
import { useMiloSpeaker, afterSpeech, speakAfterCurrent, speakAt } from '@/lib/useMiloSpeaker'
import { MiloProgressBar } from '@/components/ui/MiloUI'
import { useAdaptive, Difficulty } from '@/lib/adaptive'
import { DifficultyBadge } from '../ui/DifficultyBadge'
import ShapesLesson, {
  WatchShape, ChooseShape, ShapeSVG, SHAPES, SHAPE_ORDER, COLORS,
  CSS as SHAPE_CSS, type ShapeName,
} from '../lessons/ShapesLesson'
import { useChapterPhase } from '@/lib/useChapterPhase'
import SpeakingLock from '@/components/ui/SpeakingLock'
import GameTopbar from '../ui/GameTopbar'

interface Props { onComplete:(c:number,w:number)=>void; childName:string }

const TOTAL_ROUNDS = 10

interface Round { target: ShapeName; options: ShapeName[] }

function shuffle<T>(arr: T[]): T[] { return [...arr].sort(() => Math.random() - .5) }

// Difficulty = how many shapes to choose from, and whether the tricky look-alike
// (square ↔ rectangle) is mixed in. A demotion shrinks the choices again.
function buildRound(idx: number, diff: Difficulty): Round {
  const target = SHAPE_ORDER[idx % SHAPE_ORDER.length]
  const count = diff === 1 ? 3 : diff === 2 ? 4 : 6
  let pool = SHAPE_ORDER.filter(n => n !== target)
  // On the easiest level, don't pit a square against a rectangle.
  if (diff === 1) {
    if (target === 'square')    pool = pool.filter(n => n !== 'rectangle')
    if (target === 'rectangle') pool = pool.filter(n => n !== 'square')
  }
  const distractors = shuffle(pool).slice(0, count - 1)
  return { target, options: shuffle([target, ...distractors]) }
}

export default function ShapeHouseChapter({ onComplete, childName }: Props) {
  const { speak } = useMiloSpeaker()
  const ada = useAdaptive('shapes')
  const { phase, startPractice } = useChapterPhase()
  const [roundIdx, setRoundIdx] = useState(0)
  const [round, setRound]       = useState<Round>(() => buildRound(0, 1))
  const [picked, setPicked]     = useState<ShapeName | null>(null)
  const [correct, setCorrect]   = useState(0)
  const [wrong, setWrong]       = useState(0)
  const [feedback, setFeedback] = useState<'correct'|'wrong'|null>(null)
  // Adaptive remediation: after 3 wrong in a row, re-teach the shape then check.
  const [wrongRun, setWrongRun] = useState(0)
  const [reMed, setReMed] = useState<{ phase:'reteach'|'check'; target: ShapeName } | null>(null)
  const answerRef = useRef<HTMLElement | null>(null)   // the correct shape button (for the pointer)

  useEffect(() => {
    const r = buildRound(roundIdx, ada.difficulty)
    setRound(r); setPicked(null); setFeedback(null)
    window.setTimeout(() => speakAfterCurrent(
      roundIdx === 0
        ? `Hi ${childName}! Tap the ${SHAPES[r.target].label}!`
        : ada.shouldHint ? `Take your time. Find the ${SHAPES[r.target].label}!`
        : `Tap the ${SHAPES[r.target].label}!`
    ), 300)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIdx, ada.difficulty])

  if (phase === 'lesson') return (
    <ShapesLesson childName={childName} onLessonComplete={startPractice} />
  )

  function handlePick(name: ShapeName) {
    if (picked) return
    const ok = name === round.target
    setPicked(name)
    setFeedback(ok ? 'correct' : 'wrong')
    ada.record(ok)
    const newRun = ok ? 0 : wrongRun + 1
    setWrongRun(newRun)
    if (ok) {
      setCorrect(c => c + 1)
      speakAt(`Yes! That's the ${SHAPES[round.target].label}! ${ada.praise}`, answerRef.current)
    } else {
      setWrong(w => w + 1)
      speakAt(`That's a ${SHAPES[name].label}. We wanted the ${SHAPES[round.target].label}. ${ada.encouragement}`, answerRef.current)
    }
    afterSpeech(() => {
      setFeedback(null)
      // 3 wrong in a row → re-teach this shape, then check
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

  // Two easy, distinct distractors for the re-teach check.
  const checkOptions = (t: ShapeName): ShapeName[] => {
    const twin: Partial<Record<ShapeName, ShapeName>> = { square:'rectangle', rectangle:'square' }
    const pool = SHAPE_ORDER.filter(n => n !== t && n !== twin[t])
    return shuffle([t, ...shuffle(pool).slice(0, 2)])
  }

  return (
    <div style={S.page}>
      <MiloProgressBar current={roundIdx} total={TOTAL_ROUNDS} />
      <SpeakingLock />
      <GameTopbar chapterName="Shape House" roundIdx={roundIdx} totalRounds={TOTAL_ROUNDS} />
      <div style={{display:'flex',gap:8,alignItems:'center'}}>
        <DifficultyBadge difficulty={ada.difficulty} isOnFire={ada.isOnFire} />
        {ada.shouldHint && (
          <span style={S.hint}>💡 Look at the corners!</span>
        )}
      </div>

      <div style={S.miloRow}>
        <img src="/assets/characters/milo-happy.png" alt="Milo" style={S.milo}
          onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
        <div className="milo-bubble" style={{flex:1,fontSize:20}}>
          {picked
            ? feedback === 'correct'
              ? `🎉 Yes! That's the ${SHAPES[round.target].label}!`
              : `That was the ${SHAPES[round.target].label}!`
            : <>Tap the <strong style={{color:COLORS[round.target],textTransform:'capitalize'}}>{SHAPES[round.target].label}</strong>!</>}
        </div>
      </div>

      {/* Target name badge */}
      <div style={S.targetBadge}>
        Find the <span style={{color:COLORS[round.target],textTransform:'capitalize'}}>{SHAPES[round.target].label}</span>
      </div>

      {/* Shape options */}
      <div style={S.grid}>
        {round.options.map(n => {
          const isPicked = picked === n
          const isTarget = n === round.target
          const showRight = picked && isTarget   // reveal the right one after a wrong pick
          return (
            <button key={n} onClick={() => handlePick(n)} disabled={!!picked}
              ref={isTarget ? (el) => { answerRef.current = el } : undefined}
              style={{
              ...S.optBtn,
              background: isPicked
                ? (isTarget ? 'var(--garden-green-soft)' : 'var(--apple-red-soft)')
                : showRight ? 'var(--garden-green-soft)' : 'var(--paper)',
              borderColor: isPicked
                ? (isTarget ? 'var(--garden-green)' : 'var(--apple-red)')
                : showRight ? 'var(--garden-green)' : 'var(--outline)',
              boxShadow: isPicked
                ? `0 6px 0 ${isTarget ? 'var(--garden-green-deep)' : 'var(--apple-red-deep)'}`
                : '0 6px 0 #c8ac79',
              transform: isPicked ? 'scale(1.08) translateY(-3px)' : 'scale(1)',
              cursor: picked ? 'default' : 'pointer',
            }}>
              <ShapeSVG name={n} size={68}/>
              {isPicked && isTarget && <span style={S.tick}>✅</span>}
              {isPicked && !isTarget && <span style={S.tick}>❌</span>}
            </button>
          )
        })}
      </div>

      {feedback && (
        <div style={{...S.flash, background: feedback==='correct' ? 'var(--garden-green)' : 'var(--apple-red)'}}>
          {feedback==='correct' ? `🎉 ${SHAPES[round.target].label}!` : `It was the ${SHAPES[round.target].label}`}
        </div>
      )}

      <p style={S.label}>Round {Math.min(roundIdx+1,TOTAL_ROUNDS)} of {TOTAL_ROUNDS}</p>

      {reMed?.phase === 'reteach' && (
        <ShapeRemediationOverlay>
          <WatchShape name={reMed.target}
            intro="Let's look at this shape again!"
            outro={`That's a ${SHAPES[reMed.target].label}! Now you try!`}
            onDone={() => setReMed({ phase:'check', target: reMed.target })}/>
        </ShapeRemediationOverlay>
      )}
      {reMed?.phase === 'check' && (
        <ShapeRemediationOverlay>
          <ChooseShape target={reMed.target} options={checkOptions(reMed.target)}
            intro={`Now you try! Tap the ${SHAPES[reMed.target].label}.`}
            onDone={finishReMed}/>
        </ShapeRemediationOverlay>
      )}
    </div>
  )
}

function ShapeRemediationOverlay({ children }: { children: React.ReactNode }) {
  return (
    <div style={{position:'fixed',inset:0,zIndex:200,background:'rgba(61,37,22,0.7)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <style>{SHAPE_CSS}</style>
      <div style={{background:'var(--paper)',border:'4px solid var(--outline)',borderRadius:24,padding:'22px 14px 26px',maxWidth:480,width:'100%',boxShadow:'0 8px 0 rgba(61,37,22,.2)',maxHeight:'94vh',overflowY:'auto'}}>
        {children}
      </div>
    </div>
  )
}

const S:Record<string,React.CSSProperties>={
  page:{minHeight:'100dvh',display:'flex',flexDirection:'column',alignItems:'center',padding:'72px 24px 32px',gap:20,position:'relative',background:'linear-gradient(180deg,var(--berry-purple-soft) 0%,var(--bg-page) 55%)'},
  hint:{fontFamily:'var(--font-display)',fontWeight:700,fontSize:14,color:'var(--sky-blue-deep)',background:'var(--sky-blue-soft)',border:'2px solid var(--sky-blue)',borderRadius:999,padding:'3px 12px'},
  miloRow:{display:'flex',alignItems:'flex-end',gap:16,width:'100%',maxWidth:540},
  milo:{width:92,height:92,objectFit:'contain',flexShrink:0},
  targetBadge:{fontFamily:'var(--font-display)',fontWeight:900,fontSize:20,color:'var(--ink)',background:'var(--paper)',border:'3px solid var(--outline)',borderRadius:'var(--r-pill)',padding:'8px 24px',boxShadow:'0 3px 0 rgba(61,37,22,.12)'},
  grid:{display:'flex',flexWrap:'wrap',gap:14,justifyContent:'center',maxWidth:440},
  optBtn:{width:96,height:96,borderRadius:22,border:'4px solid',display:'flex',alignItems:'center',justifyContent:'center',position:'relative',transition:'transform 160ms cubic-bezier(.34,1.56,.64,1),background .15s,border-color .15s'},
  tick:{position:'absolute',top:-8,right:-8,fontSize:22},
  flash:{position:'fixed',top:'38%',left:'50%',transform:'translate(-50%,-50%)',color:'#fff',fontFamily:'var(--font-display)',fontWeight:900,fontSize:36,padding:'18px 44px',borderRadius:28,border:'4px solid var(--outline)',boxShadow:'0 8px 0 rgba(61,37,22,.2)',zIndex:50,textAlign:'center',textTransform:'capitalize',animation:'modal-in 280ms cubic-bezier(.34,1.56,.64,1) both'},
  label:{fontFamily:'var(--font-body)',fontSize:'var(--t-label)',color:'var(--ink-muted)',margin:0},
}
