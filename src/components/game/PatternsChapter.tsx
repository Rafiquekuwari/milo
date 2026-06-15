'use client'

import { useState, useEffect } from 'react'
import { useMiloSpeaker, afterSpeech, speakAfterCurrent } from '@/lib/useMiloSpeaker'
import { useAdaptive, patternUnitLen } from '@/lib/adaptive'
import { DifficultyBadge } from '../ui/DifficultyBadge'
import PatternsLesson, { WatchPattern, TapNext, CSS as PAT_CSS } from '../lessons/PatternsLesson'
import { useChapterPhase } from '@/lib/useChapterPhase'
import SpeakingLock from '@/components/ui/SpeakingLock'
import GameTopbar from '../ui/GameTopbar'

interface Props {
  onComplete: (correct: number, wrong: number) => void
  childName: string
}

// ─── Pattern themes (up to 4 distinct items so units can be AB / ABC / ABCD) ──
const THEMES = [
  { items: ['🔴','🔵','🟢','🟡'], names: ['red','blue','green','yellow'] },
  { items: ['⭐','🌙','☀️','☁️'], names: ['star','moon','sun','cloud'] },
  { items: ['🦋','🌸','🐝','🍀'], names: ['butterfly','flower','bee','clover'] },
  { items: ['🐸','🐠','🐢','🦀'], names: ['frog','fish','turtle','crab'] },
  { items: ['🍎','🍋','🍇','🍊'], names: ['apple','lemon','grape','orange'] },
  { items: ['🔺','🔷','🟥','🟪'], names: ['triangle','diamond','square','purple'] },
]

type QType = 'whatComesNext' | 'whatIsMissing' | 'whichBreaks'

interface Round {
  type: QType
  sequence: string[]      // full sequence displayed (with ❓ / intruder if applicable)
  answer: string          // correct answer emoji
  choices: string[]       // 3 shuffled choices
  unit: string[]          // the repeating unit (for the rule row + re-teach)
  unitNames: string[]     // spoken names parallel to unit
  foreign: string         // an item from another theme (distractor / intruder)
  hint: string
}

function makeSeq(unit: string[], reps: number): string[] {
  const out: string[] = []
  for (let r = 0; r < reps; r++) out.push(...unit)
  return out
}

function pick3(answer: string, pool: string[]): string[] {
  const opts = new Set<string>([answer])
  for (const p of pool) { if (opts.size >= 3) break; if (p !== answer) opts.add(p) }
  return [...opts].sort(() => Math.random() - .5)
}

function buildRound(idx: number, difficulty: 1 | 2 | 3): Round {
  const theme   = THEMES[idx % THEMES.length]
  const foreign = THEMES[(idx + 3) % THEMES.length].items[0]
  const unitLen = patternUnitLen(difficulty)
  const unit      = theme.items.slice(0, unitLen)
  const unitNames = theme.names.slice(0, unitLen)
  const type: QType = (['whatComesNext','whatIsMissing','whichBreaks'] as QType[])[idx % 3]
  const reps = unitLen <= 2 ? 3 : 2
  const common = { unit, unitNames, foreign }

  if (type === 'whatComesNext') {
    const base    = reps * unitLen
    const extra   = Math.floor(Math.random() * unitLen)   // a partial last unit → answer varies
    const shownLen = base + extra
    const seq: string[] = []
    for (let i = 0; i < shownLen; i++) seq.push(unit[i % unitLen])
    const answer  = unit[shownLen % unitLen]
    const choices = pick3(answer, [...unit, foreign])
    return { type, sequence: seq, answer, choices, ...common, hint: 'What comes next in the pattern?' }
  }

  if (type === 'whatIsMissing') {
    const seq = makeSeq(unit, reps)
    const missingIndex = unitLen + Math.floor(Math.random() * (seq.length - unitLen))
    const answer = seq[missingIndex]
    const display = [...seq]
    display[missingIndex] = '❓'
    const choices = pick3(answer, [...unit, foreign])
    return { type, sequence: display, answer, choices, ...common, hint: 'Which one is missing from the pattern?' }
  }

  // whichBreaks: inject a foreign item; the answer is the odd one out
  const seq = makeSeq(unit, reps)
  const breakIdx = 1 + Math.floor(Math.random() * (seq.length - 2))
  seq[breakIdx] = foreign
  const answer = foreign
  const choices = pick3(answer, unit)
  return { type, sequence: seq, answer, choices, ...common, hint: "Find the one that doesn't belong!" }
}

const TOTAL_ROUNDS = 10

const TYPE_LABEL: Record<QType, string> = {
  whatComesNext:  'What comes next?',
  whatIsMissing:  'What is missing?',
  whichBreaks:    'Find the odd one out!',
}

const TYPE_COLOR: Record<QType, string> = {
  whatComesNext: 'var(--sky-blue-soft)',
  whatIsMissing: 'var(--sun-yellow-soft)',
  whichBreaks:   'var(--apple-red-soft)',
}

export default function PatternsChapter({ onComplete, childName }: Props) {
  const { phase, startPractice } = useChapterPhase()
  const { speak } = useMiloSpeaker()
  const ada = useAdaptive('patterns')
  const [roundIdx,  setRoundIdx]  = useState(0)
  const [round,     setRound]     = useState<Round>(() => buildRound(0, 1))
  const [selected,  setSelected]  = useState<string | null>(null)
  const [correct,   setCorrect]   = useState(0)
  const [wrong,     setWrong]     = useState(0)
  const [feedback,  setFeedback]  = useState<'correct' | 'wrong' | null>(null)
  // Adaptive remediation: after 3 wrong in a row, re-teach the pattern, then check.
  const [wrongRun, setWrongRun] = useState(0)
  const [reMed, setReMed] = useState<{ phase: 'reteach' | 'check'; round: Round } | null>(null)

  useEffect(() => {
    const r = buildRound(roundIdx, ada.difficulty)
    setRound(r)
    setSelected(null)

    const intro = roundIdx === 0
      ? `Hi ${childName}! Let's find patterns! Look carefully at the sequence.`
      : ada.shouldHint ? `Take your time. ${r.hint}` : r.hint
    window.setTimeout(() => { speakAfterCurrent(intro) }, 300)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIdx, ada.difficulty])

  function handleChoice(choice: string) {
    if (selected !== null) return
    setSelected(choice)
    const ok = choice === round.answer
    setFeedback(ok ? 'correct' : 'wrong')
    ada.record(ok)
    const newRun = ok ? 0 : wrongRun + 1
    setWrongRun(newRun)

    if (ok) {
      setCorrect(c => c + 1)
      speak(roundIdx % 3 === 0 ? `Amazing! You found the pattern! ${ada.praise}` : `Yes! Great pattern thinking! ${ada.praise}`)
    } else {
      setWrong(w => w + 1)
      speak(`Not quite! The answer was ${round.answer}. ${ada.encouragement}`)
    }

    afterSpeech(() => {
      setFeedback(null)
      // 3 wrong in a row → re-teach this pattern, then check with an easy one.
      if (!ok && newRun >= 3) { setReMed({ phase: 'reteach', round }); return }
      const next = roundIdx + 1
      if (next >= TOTAL_ROUNDS) onComplete(ok ? correct + 1 : correct, ok ? wrong : wrong + 1)
      else window.setTimeout(() => setRoundIdx(next), 300)
    })
  }

  function finishReMed() {
    setReMed(null); setWrongRun(0)
    const next = roundIdx + 1
    if (next >= TOTAL_ROUNDS) onComplete(correct, wrong)
    else setRoundIdx(next)
  }

  // Derive bubble text
  const bubbleText = selected !== null
    ? feedback === 'correct' ? '🎉 Correct! Great pattern thinking!' : `The answer was ${round.answer}`
    : TYPE_LABEL[round.type]

  // ── Lesson phase (animated baby-step lesson) ───────────────
  if (phase === 'lesson') {
    return <PatternsLesson childName={childName} onLessonComplete={startPractice} />
  }

  // ── Practice phase (10 questions with adaptive engine) ─────
  return (
    <div style={S.page}>
      <SpeakingLock />
      <GameTopbar chapterName="Patterns" roundIdx={roundIdx} totalRounds={TOTAL_ROUNDS} />
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

      {/* Milo bubble */}
      <div className="milo-bubble" style={{ width: '100%', maxWidth: 520 }}>
        {bubbleText}
      </div>

      {/* Type label badge */}
      <div style={{
        background: TYPE_COLOR[round.type],
        border: '3px solid var(--outline)',
        borderRadius: 'var(--r-pill)',
        padding: '6px 20px',
        fontFamily: 'var(--font-display)',
        fontWeight: 'var(--w-heavy)',
        fontSize: 'var(--t-label)',
        color: 'var(--ink)',
        boxShadow: '0 3px 0 rgba(61,37,22,.12)',
      }}>
        {TYPE_LABEL[round.type]}
      </div>

      {/* Pattern sequence display */}
      <div style={S.sequenceWrap}>
        {round.sequence.map((item, i) => {
          const isMissing  = item === '❓'
          const isBreaker  = round.type === 'whichBreaks' && item === round.answer

          return (
            <div
              key={i}
              className={isBreaker && selected === null ? 'kit-pulse' : ''}
              style={{
                ...S.patternCell,
                background: isMissing
                  ? 'var(--sun-yellow-soft)'
                  : isBreaker && selected !== null
                  ? 'var(--apple-red-soft)'
                  : 'rgba(255,255,255,0.75)',
                borderColor: isMissing
                  ? 'var(--sun-yellow-deep)'
                  : isBreaker && selected !== null
                  ? 'var(--apple-red)'
                  : 'var(--outline)',
                transform: isMissing ? 'scale(1.1)' : 'scale(1)',
              }}
            >
              <span style={{ fontSize: isMissing ? 36 : 44, lineHeight: 1 }}>{item}</span>

              {/* Position number under each cell */}
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--ink-muted)',
                marginTop: 2,
              }}>{i + 1}</span>
            </div>
          )
        })}

        {/* Arrow + blank for whatComesNext */}
        {round.type === 'whatComesNext' && (
          <>
            <div style={S.arrow}>→</div>
            <div style={{
              ...S.patternCell,
              background: selected !== null ? 'var(--garden-green-soft)' : 'var(--cream)',
              borderColor: selected !== null ? 'var(--garden-green)' : 'var(--ink-muted)',
              borderStyle: 'dashed',
            }}>
              <span style={{ fontSize: 44 }}>
                {selected !== null ? round.answer : '?'}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Repeating rule hint — show the base unit */}
      <div style={S.ruleRow}>
        <span style={S.ruleLabel}>Pattern rule:</span>
        {round.unit.map((em, i) => (
          <span key={i} style={{ fontSize: 28 }}>{em}</span>
        ))}
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--ink-muted)' }}>repeating</span>
      </div>

      {/* Answer choices */}
      <div style={S.choicesRow}>
        {round.choices.map(ch => {
          const isCorrect  = ch === round.answer
          const isSelected = selected === ch
          let bg = 'var(--paper)'
          if (isSelected && feedback === 'correct') bg = 'var(--garden-green-soft)'
          if (isSelected && feedback === 'wrong')   bg = 'var(--apple-red-soft)'

          return (
            <button
              key={ch}
              onClick={() => handleChoice(ch)}
              disabled={selected !== null}
              style={{
                ...S.choiceBtn,
                background: bg,
                borderColor: isSelected
                  ? (isCorrect ? 'var(--garden-green)' : 'var(--apple-red)')
                  : 'var(--outline)',
                boxShadow: isSelected
                  ? `0 5px 0 ${isCorrect ? 'var(--garden-green-deep)' : 'var(--apple-red-deep)'}`
                  : '0 5px 0 var(--outline)',
                transform: isSelected ? 'scale(1.08) translateY(-2px)' : 'scale(1)',
              }}
            >
              <span style={{ fontSize: 48, lineHeight: 1 }}>{ch}</span>
            </button>
          )
        })}
      </div>

      {feedback && (
        <div style={{position:'fixed',top:'38%',left:'50%',transform:'translate(-50%,-50%)',color:'#fff',fontFamily:'var(--font-display)',fontWeight:900,fontSize:'var(--t-h1)',padding:'20px 40px',borderRadius:24,border:'4px solid var(--outline)',boxShadow:'0 8px 0 rgba(61,37,22,.2)',zIndex:50,textAlign:'center',animation:'modal-in 280ms cubic-bezier(.34,1.56,.64,1) both',background:feedback==='correct'?'var(--garden-green)':'var(--apple-red)'}}>{feedback==='correct'?'🎉 You got it!':`It was ${round.answer}`}</div>
      )}

      <p style={S.roundLabel}>
        Round {Math.min(roundIdx + 1, TOTAL_ROUNDS)} of {TOTAL_ROUNDS}
      </p>

      {reMed?.phase === 'reteach' && (
        <PatternRemediationOverlay>
          <WatchPattern unit={reMed.round.unit} names={reMed.round.unitNames}
            reps={reMed.round.unit.length <= 2 ? 3 : 2}
            intro="Let's look at the pattern together! It repeats, over and over."
            outro="See? Now you try with an easy one!"
            onDone={() => setReMed({ phase: 'check', round: reMed.round })}/>
        </PatternRemediationOverlay>
      )}
      {reMed?.phase === 'check' && (
        <PatternRemediationOverlay>
          <TapNext unit={reMed.round.unit.slice(0, 2)} reps={3} foreign={reMed.round.foreign}
            intro="Now you try! What comes next?"
            onDone={finishReMed}/>
        </PatternRemediationOverlay>
      )}
    </div>
  )
}

// Overlay wrapper for the re-teach / check (carries the lesson's animation CSS).
function PatternRemediationOverlay({ children }: { children: React.ReactNode }) {
  return (
    <div style={{position:'fixed',inset:0,zIndex:200,background:'rgba(61,37,22,0.7)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <style>{PAT_CSS}</style>
      <div style={{background:'var(--paper)',border:'4px solid var(--outline)',borderRadius:24,padding:'22px 14px 26px',maxWidth:480,width:'100%',boxShadow:'0 8px 0 rgba(61,37,22,.2)',maxHeight:'94vh',overflowY:'auto'}}>
        {children}
      </div>
    </div>
  )
}

const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100dvh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '64px 20px 32px',
    gap: 20,
    position: 'relative',
    background: 'linear-gradient(180deg, var(--sky-blue-soft) 0%, var(--bg-page) 50%)',
  },
  sequenceWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    justifyContent: 'center',
    background: 'rgba(255,255,255,0.6)',
    borderRadius: 24,
    padding: '20px 24px',
    border: '3px solid var(--outline)',
    boxShadow: '0 6px 0 rgba(61,37,22,.08)',
    maxWidth: 580,
    width: '100%',
  },
  patternCell: {
    width: 72,
    height: 80,
    borderRadius: 16,
    border: '3px solid',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform .15s, background .2s, border-color .2s',
    boxShadow: '0 3px 0 rgba(61,37,22,.1)',
  },
  arrow: {
    fontFamily: 'var(--font-display)',
    fontSize: 32,
    fontWeight: 700,
    color: 'var(--ink-muted)',
    margin: '0 4px',
  },
  ruleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'var(--paper)',
    border: '2px solid var(--outline)',
    borderRadius: 'var(--r-pill)',
    padding: '8px 20px',
    boxShadow: '0 3px 0 rgba(61,37,22,.08)',
  },
  ruleLabel: {
    fontFamily: 'var(--font-body)',
    fontSize: 14,
    fontWeight: 800,
    color: 'var(--ink-muted)',
    textTransform: 'uppercase',
    letterSpacing: '.06em',
    marginRight: 4,
  },
  choicesRow: {
    display: 'flex',
    gap: 20,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  choiceBtn: {
    width: 96,
    height: 96,
    borderRadius: 22,
    border: '4px solid',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform .15s, background .15s, box-shadow .15s',
  },
  roundLabel: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--t-label)',
    color: 'var(--ink-muted)',
    margin: 0,
  },
}
