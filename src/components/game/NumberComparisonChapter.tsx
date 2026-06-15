'use client'

import { useState, useEffect, useRef } from 'react'
import { useMiloSpeaker, afterSpeech, speakAfterCurrent, speakAt } from '@/lib/useMiloSpeaker'
import { useAdaptive, type Difficulty } from '@/lib/adaptive'

import { useChapterPhase } from '@/lib/useChapterPhase'
import SpeakingLock from '@/components/ui/SpeakingLock'
import GameTopbar from '../ui/GameTopbar'
import BiggerSmallerLesson, { CompareCards, CSS as LESSON_CSS } from '../lessons/BiggerSmallerLesson'

import { DifficultyBadge } from '../ui/DifficultyBadge'
interface Props {
  onComplete: (correct: number, wrong: number) => void
  childName: string
}

type Key = 'a' | 'b' | 'c'
type Mode = 'more' | 'less'
interface Round { a: number; b: number; c?: number; answer: Key; question: string; mode: Mode }

const rnd = (max: number) => Math.floor(Math.random() * max) + 1

// Question difficulty now comes from the adaptive engine, not the round number:
//   level 1 → 2 cards, numbers 1-5, clear gap, "bigger" only (easiest)
//   level 2 → 2 cards, numbers 1-9, "more" or "fewer"
//   level 3 → 3 cards, numbers 1-10, "most" or "least"
function buildRound(diff: Difficulty): Round {
  const max = diff === 1 ? 5 : diff === 2 ? 9 : 10
  const three = diff >= 3
  const want: Mode = diff === 1 ? 'more' : (Math.random() < 0.5 ? 'more' : 'less')
  let a = rnd(max), b = rnd(max)
  while (b === a) b = rnd(max)
  if (diff === 1) { // make the easiest level an obvious gap
    let guard = 0
    while (Math.abs(a - b) < 2 && guard++ < 20) { b = rnd(max); if (b === a) b = rnd(max) }
  }

  if (!three) {
    const biggerKey: Key = a > b ? 'a' : 'b'
    const smallerKey: Key = a < b ? 'a' : 'b'
    return {
      a, b, mode: want,
      answer: want === 'more' ? biggerKey : smallerKey,
      question: want === 'more' ? 'Which has more?' : 'Which has fewer?',
    }
  }
  let c = rnd(max)
  while (c === a || c === b) c = rnd(max)
  const vals = [a, b, c]
  const targetVal = want === 'more' ? Math.max(...vals) : Math.min(...vals)
  const answer: Key = vals[0] === targetVal ? 'a' : vals[1] === targetVal ? 'b' : 'c'
  return { a, b, c, answer, mode: want, question: want === 'more' ? 'Which has the most?' : 'Which has the least?' }
}

const EASY_PAIR = { a: 4, b: 1 }   // clear gap, used for the remediation check

const TOTAL_ROUNDS = 10
const EMOJIS = ['🌟','🍓','🐸','🎈','🦋']

export default function NumberComparisonChapter({ onComplete, childName }: Props) {
  const { phase, startPractice } = useChapterPhase()
  const { speak } = useMiloSpeaker()
  const ada = useAdaptive('numberComparison')
  const [roundIdx, setRoundIdx] = useState(0)
  const [round, setRound]       = useState<Round>(() => buildRound(1))
  const [selected, setSelected] = useState<Key|null>(null)
  const [correct, setCorrect]   = useState(0)
  const [wrong, setWrong]       = useState(0)
  const [feedback, setFeedback] = useState<'correct'|'wrong'|null>(null)
  const [emoji]                 = useState(EMOJIS[Math.floor(Math.random()*EMOJIS.length)])
  // Adaptive remediation: after 3 wrong in a row, re-teach by counting & comparing.
  const [wrongRun, setWrongRun] = useState(0)
  const [reMed, setReMed]       = useState<{ phase:'reteach'|'check'; a:number; b:number; mode:Mode }|null>(null)
  const answerRef = useRef<HTMLElement|null>(null)   // the correct group (for the pointer)

  useEffect(() => {
    // Build each round from the CURRENT adaptive difficulty (read on round change).
    const r = buildRound(ada.difficulty)
    setRound(r); setSelected(null)
    window.setTimeout(() => { speakAfterCurrent(roundIdx === 0 ? `Hi ${childName}! ${r.question}` : r.question) }, 300)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIdx])

  function advance(ok: boolean) {
    const next = roundIdx + 1
    if (next >= TOTAL_ROUNDS) onComplete(ok?correct+1:correct, ok?wrong:wrong+1)
    else window.setTimeout(() => setRoundIdx(next), 300)
  }

  function handleSelect(key: Key) {
    if (selected) return
    setSelected(key)
    const ok = key === round.answer
    ada.record(ok)                                   // ← feed the adaptive engine
    setFeedback(ok ? 'correct' : 'wrong')
    const newRun = ok ? 0 : wrongRun + 1
    setWrongRun(newRun)
    const correctVal = round.answer==='a'?round.a:round.answer==='b'?round.b:round.c!
    if (ok) { setCorrect(c=>c+1); speakAt(round.mode==='more' ? `Yes! ${correctVal} is more! Great job!` : `Yes! ${correctVal} is fewer! Great job!`, answerRef.current) }
    else    { setWrong(w=>w+1);   speakAt(round.mode==='more' ? `Oops! ${correctVal} is more.` : `Oops! ${correctVal} is fewer.`, answerRef.current) }
    afterSpeech(() => {
      setFeedback(null)
      if (!ok && newRun >= 3) {                      // struggling → re-teach this comparison
        setReMed({ phase:'reteach', a:round.a, b:round.b, mode:round.mode })
        return
      }
      advance(ok)
    })
  }

  function finishReMed() {
    setReMed(null); setWrongRun(0)
    if (roundIdx + 1 >= TOTAL_ROUNDS) onComplete(correct, wrong)
    else setRoundIdx(roundIdx + 1)
  }

  const options: { key: Key; val: number }[] = [
    { key:'a', val:round.a }, { key:'b', val:round.b },
    ...(round.c !== undefined ? [{ key:'c' as Key, val:round.c }] : []),
  ]

  // ── Lesson phase ───────────────────────────────────────────
  if (phase === 'lesson') {
    return <BiggerSmallerLesson childName={childName} onLessonComplete={startPractice} />
  }

  // ── Practice phase (10 questions with adaptive engine) ─────
  return (
    <div style={S.page}>
      <SpeakingLock />
      <GameTopbar chapterName="Bigger or Smaller" roundIdx={roundIdx} totalRounds={TOTAL_ROUNDS} />
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

      <div style={S.cardsRow}>
        {options.map(({ key, val }) => {
          const isSel = selected === key
          const isOk  = round.answer === key
          return (
            <button key={key} onClick={() => handleSelect(key)} disabled={!!selected}
              ref={isOk ? (el)=>{answerRef.current=el} : undefined} style={{
              ...S.card,
              background: isSel ? (isOk ? 'var(--garden-green-soft)' : 'var(--apple-red-soft)') : 'var(--paper)',
              borderColor: isSel ? (isOk ? 'var(--garden-green)' : 'var(--apple-red)') : 'var(--outline)',
              transform: isSel ? 'scale(1.05)' : 'scale(1)',
            }}>
              <span style={{ fontFamily:'var(--font-display)', fontSize:64, fontWeight:700, color:'var(--ink)', lineHeight:1 }}>{val}</span>
              <div style={S.emojiGrid}>
                {Array.from({ length: Math.min(val, 9) }).map((_, i) => <span key={i} style={{ fontSize:26 }}>{emoji}</span>)}
              </div>
              {isSel && <span style={{ position:'absolute', top:-12, right:-12, fontSize:28 }}>{isOk?'✅':'❌'}</span>}
            </button>
          )
        })}
      </div>

      {feedback && <div style={{position:'fixed',top:'38%',left:'50%',transform:'translate(-50%,-50%)',color:'#fff',fontFamily:'var(--font-display)',fontWeight:900,fontSize:'var(--t-h1)',padding:'20px 40px',borderRadius:24,border:'4px solid var(--outline)',boxShadow:'0 8px 0 rgba(61,37,22,.2)',zIndex:50,textAlign:'center',animation:'modal-in 280ms cubic-bezier(.34,1.56,.64,1) both',background:feedback==='correct'?'var(--garden-green)':'var(--apple-red)'}}>
        {feedback==='correct'?'✅ Correct!':'❌ Try again!'}
      </div>}
      <p style={S.label}>Round {Math.min(roundIdx+1, TOTAL_ROUNDS)} of {TOTAL_ROUNDS}</p>

      {reMed?.phase === 'reteach' && (
        <RemediationOverlay>
          <CompareCards
            mode="watch" target={reMed.mode} showNumber
            items={[{count:reMed.a,emoji:'⭐',name:'stars'},{count:reMed.b,emoji:'⭐',name:'stars'}]}
            prompt={reMed.mode==='more' ? "Let's count both groups and find which has MORE!" : "Let's count both groups and find which has FEWER!"}
            outro={reMed.mode==='more' ? `${Math.max(reMed.a,reMed.b)} is more! Now you try!` : `${Math.min(reMed.a,reMed.b)} is fewer! Now you try!`}
            onDone={() => setReMed({ phase:'check', a:EASY_PAIR.a, b:EASY_PAIR.b, mode:reMed.mode })}
          />
        </RemediationOverlay>
      )}
      {reMed?.phase === 'check' && (
        <RemediationOverlay>
          <CompareCards
            mode="do" target={reMed.mode} showNumber
            items={[{count:reMed.a,emoji:'🐸'},{count:reMed.b,emoji:'🐸'}]}
            prompt={reMed.mode==='more' ? 'Now you! Tap the group with MORE' : 'Now you! Tap the group with FEWER'}
            outro={reMed.mode==='more' ? "Yes! That's more! You've got it!" : "Yes! That's fewer! You've got it!"}
            onDone={finishReMed}
          />
        </RemediationOverlay>
      )}
    </div>
  )
}

// Overlay wrapper for the re-teach / check (carries the lesson's animation CSS).
function RemediationOverlay({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(61,37,22,0.7)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <style>{LESSON_CSS}</style>
      <div style={{ background:'var(--paper)', border:'4px solid var(--outline)', borderRadius:24, padding:'22px 16px 26px', maxWidth:460, width:'100%', boxShadow:'0 8px 0 rgba(61,37,22,.2)', maxHeight:'94vh', overflowY:'auto' }}>
        {children}
      </div>
    </div>
  )
}

const S: Record<string, React.CSSProperties> = {
  page:     { minHeight:'100dvh', display:'flex', flexDirection:'column', alignItems:'center', padding:'72px 24px 32px', gap:24, position:'relative' },
  cardsRow: { display:'flex', gap:16, justifyContent:'center', flexWrap:'wrap', width:'100%', maxWidth:520 },
  card:     { flex:'1 1 140px', maxWidth:160, minHeight:200, borderRadius:20, border:'4px solid', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-start', padding:'16px 12px', gap:8, position:'relative', boxShadow:'0 5px 0 var(--outline)', transition:'transform .15s, background .15s' },
  emojiGrid:{ display:'flex', flexWrap:'wrap', gap:4, justifyContent:'center', maxHeight:100, overflow:'hidden' },
  label:    { fontFamily:'var(--font-body)', fontSize:'var(--t-label)', color:'var(--ink-muted)', margin:0 },
}
