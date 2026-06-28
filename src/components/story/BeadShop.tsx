'use client'
/**
 * Chapter 8 — "Milo's Bead Shop", the PATTERNS story (skill `patterns`, the old "Patterns" drill
 * reborn as story mode). Milo threads beads onto a necklace; each round a necklace shows a repeating
 * colour pattern with one empty slot at the end, and the child taps the bead that comes NEXT from the
 * tray. Pure "what comes next" — one clean loop. Told as one continuous adaptive SkillBeat (harder on
 * a streak, easier when struggling, re-teach after 3 wrong).
 *
 * Difficulty grows the repeating unit (the adaptive `patternUnitLen`): AB → ABC → ABCD. The choices
 * are the unit's own beads, so the child must READ the pattern and pick the right next bead — not
 * just "a bead". Beads are pure code-drawn (no art); a code-drawn shop backdrop always shows with an
 * optional <img> auto-upgrade. Mirrors story/ShapeTown.tsx (phases intro→demo→guided→practice, ONE
 * SkillBeat); wrapped by game/PatternsChapter.tsx.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { speak, speakSteps, useIsSpeaking, stopSpeech, unlockSpeech } from '@/lib/useMiloSpeaker'
import { SkillBeat, type Beat } from './StoryWorld'
import { patternUnitLen, type Difficulty } from '@/lib/adaptive'

// After a declaring tap, ignore further taps briefly — `useIsSpeaking()` only flips true ~100-150ms
// after speak(), so a fast second tap would slip through. Same lesson as ShapeTown/NumberDoors.
const SPEAK_LOCK_MS = 600
const shuffle = <T,>(a: T[]): T[] => a.slice().sort(() => Math.random() - 0.5)

// ─── Beads ─────────────────────────────────────────────────────────────────────────
type BeadColor = 'red' | 'blue' | 'yellow' | 'green' | 'orange' | 'purple' | 'pink'
const BEADS: Record<BeadColor, { label: string; hex: string; deep: string }> = {
  red:    { label: 'red',    hex: '#E64545', deep: '#B5302F' },
  blue:   { label: 'blue',   hex: '#3FA3EE', deep: '#2575B8' },
  yellow: { label: 'yellow', hex: '#FFC93C', deep: '#D69A12' },
  green:  { label: 'green',  hex: '#5DB94B', deep: '#3C8B2F' },
  orange: { label: 'orange', hex: '#F2872C', deep: '#C25E13' },
  purple: { label: 'purple', hex: '#9B5FD6', deep: '#6E3CA8' },
  pink:   { label: 'pink',   hex: '#F472B6', deep: '#C13E86' },
}
const BEAD_ORDER: BeadColor[] = ['red', 'blue', 'yellow', 'green', 'orange', 'purple', 'pink']

// ─── Round shape ─────────────────────────────────────────────────────────────────────
interface PatternRound {
  unit: BeadColor[]       // the repeating unit (AB / ABC / ABCD)
  sequence: BeadColor[]   // the beads already on the string (a whole-ish number of repeats + a partial)
  choices: BeadColor[]    // tray beads, shuffled (always includes the answer)
  answer: BeadColor       // the bead that comes next
  answerIdx: number       // index of the answer in `choices`
}

// Visible length per unit size — at least one full repeat + a partial so the pattern is unmistakable,
// capped so the whole string (+ the empty slot) fits one row. The answer = unit[L % unitLen], which
// varies the correct bead (it's not always the first).
const LEN_OPTS: Record<number, number[]> = { 2: [4, 5], 3: [4, 5, 6], 4: [5, 6, 7] }

function makePatternRound(d: Difficulty, round: number): PatternRound {
  const unitLen = patternUnitLen(d)                 // 2 | 3 | 4
  // Rotate the palette so each round uses a fresh set of colours.
  const start = (round * 2) % BEAD_ORDER.length
  const unit: BeadColor[] = Array.from({ length: unitLen }, (_, i) => BEAD_ORDER[(start + i) % BEAD_ORDER.length])
  const opts = LEN_OPTS[unitLen] ?? [unitLen + 1]
  const L = opts[round % opts.length]
  const sequence: BeadColor[] = Array.from({ length: L }, (_, i) => unit[i % unitLen])
  const answer = unit[L % unitLen]
  // Choices are the unit's beads (the child must pick the RIGHT next one); add a non-unit "foreign"
  // bead if the unit is too small to give at least 3 choices.
  const choices = [...unit]
  if (choices.length < 3) choices.push(BEAD_ORDER[(start + unitLen) % BEAD_ORDER.length])
  const shuffled = shuffle(choices)
  return { unit, sequence, choices: shuffled, answer, answerIdx: shuffled.indexOf(answer) }
}

// ─── Responsive bead sizing ─────────────────────────────────────────────────────────
// Never hard-code sprite px on a 100vw stage (see feedback-viewport-scaling). The string beads shrink
// to fit the row as the sequence grows; the tray beads stay a comfortable tap size.
function useBeadSizes(seqLen: number): { stringBead: number; trayBead: number } {
  const [sz, setSz] = useState({ stringBead: 56, trayBead: 76 })
  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth
      const stringBead = Math.max(26, Math.min((w * 0.84) / (seqLen + 1.5), 72))
      const trayBead = Math.max(54, Math.min(w * 0.15, 92))
      setSz({ stringBead, trayBead })
    }
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [seqLen])
  return sz
}

// ─── A single bead (code-drawn glossy bead) ─────────────────────────────────────────
type BeadState = 'idle' | 'glow' | 'wrong' | 'pop'
function Bead({ color, size, state = 'idle' }: { color: BeadColor; size: number; state?: BeadState }) {
  const { hex, deep } = BEADS[color]
  const lit = state === 'glow'
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,.85), ${hex} 46%, ${deep} 100%)`,
      border: `${Math.max(1.5, size * 0.03)}px solid ${deep}`,
      boxShadow: lit
        ? '0 0 16px var(--garden-green), 0 0 9px var(--garden-green)'
        : '0 3px 5px rgba(0,0,0,.28), inset 0 -2px 4px rgba(0,0,0,.18)',
      animation: state === 'wrong' ? 'bs_shake .42s ease' : state === 'pop' || lit ? 'bs_pop .45s ease' : undefined,
    }} />
  )
}

// ─── The necklace string (sequence + the empty "next" slot) ─────────────────────────
function Necklace({ sequence, fill, beadPx }: { sequence: BeadColor[]; fill: BeadColor | null; beadPx: number }) {
  const gap = Math.max(4, beadPx * 0.18)
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', gap, padding: `0 ${beadPx * 0.4}px`, maxWidth: '94vw' }}>
      {/* the string running through the beads */}
      <div style={{ position: 'absolute', left: beadPx * 0.2, right: beadPx * 0.2, top: '50%', height: Math.max(3, beadPx * 0.06), transform: 'translateY(-50%)', background: 'linear-gradient(#caa46a,#a07c44)', borderRadius: 99, zIndex: 0 }} />
      {/* clasp/knot at the left end */}
      <div style={{ width: beadPx * 0.34, height: beadPx * 0.34, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%, #fff8, #d9b25e 50%, #a87f2f)', border: '1.5px solid #8a6724', zIndex: 1, flexShrink: 0 }} />
      {sequence.map((c, i) => (
        <div key={i} style={{ zIndex: 1, flexShrink: 0 }}><Bead color={c} size={beadPx} /></div>
      ))}
      {/* the empty next slot — fills with the answer bead once revealed */}
      <div style={{ zIndex: 1, flexShrink: 0, width: beadPx, height: beadPx, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {fill
          ? <Bead color={fill} size={beadPx} state="pop" />
          : <div style={{ width: beadPx, height: beadPx, borderRadius: '50%', border: `${Math.max(2, beadPx * 0.05)}px dashed var(--milo-orange)`, background: 'rgba(255,255,255,.35)' }} />}
      </div>
    </div>
  )
}

// ─── The bead tray (the tappable choices) ───────────────────────────────────────────
function Tray({ choices, beadPx, stateFor, onTap }: {
  choices: BeadColor[]; beadPx: number; stateFor: (i: number) => BeadState; onTap?: (i: number) => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'clamp(12px,3vw,30px)', flexWrap: 'wrap',
      background: 'rgba(255,255,255,.5)', borderRadius: 26, padding: 'clamp(10px,2vh,18px) clamp(14px,3vw,28px)', border: '3px solid rgba(140,110,70,.5)', boxShadow: '0 5px 0 rgba(61,37,22,.1)' }}>
      {choices.map((c, i) => (
        <button key={i} onClick={onTap ? () => onTap(i) : undefined} disabled={!onTap} aria-label={`${BEADS[c].label} bead`}
          style={{ background: 'transparent', border: 'none', padding: 0, cursor: onTap ? 'pointer' : 'default', lineHeight: 0,
            transform: stateFor(i) === 'glow' ? 'scale(1.12)' : 'scale(1)', transition: 'transform .2s' }}>
          <Bead color={c} size={beadPx} state={stateFor(i)} />
        </button>
      ))}
    </div>
  )
}

// ─── Milo (one persistent presence, bottom-left) ────────────────────────────────────
function MiloBead({ left }: { left: number }) {
  const [step, setStep] = useState(0)
  const srcs = ['/assets/characters/milo_beads.png', '/assets/characters/milo_idle.png']
  return (
    <div style={{ position: 'fixed', left: `${left}%`, bottom: 0, transform: 'translateX(-50%)', zIndex: 26, width: 'min(30vh, 260px)', height: 'min(30vh, 260px)' }}>
      <div style={{ width: '100%', height: '100%', animation: 'bs_float 3.4s ease-in-out infinite' }}>
        {step >= srcs.length
          ? <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
              <span style={{ fontSize: 92, filter: 'drop-shadow(0 5px 8px rgba(0,0,0,.35))' }}>🐴</span>
              <span style={{ position: 'absolute', bottom: 8, right: 10, fontSize: 40 }}>📿</span>
            </div>
          : <img src={srcs[step]} alt="Milo" draggable={false} onError={() => setStep(s => s + 1)}
              style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'bottom', filter: 'drop-shadow(0 5px 8px rgba(0,0,0,.35))' }} />}
      </div>
    </div>
  )
}

// The necklace and the tray are two fixed horizontal bands (viewport-relative, like ShapeTown's
// rows) — NOT a flex column — so they sit at stable heights regardless of SkillBeat's own layout
// (which stacks a prompt button above the Play), leave the top clear for that prompt, and never
// cover the whole screen (so they can't block taps). Milo sits bottom-left, clear of both.
const NECKLACE_TOP = 40   // vertical centre %
const TRAY_TOP = 64
const bandStyle = (top: number): React.CSSProperties => ({
  position: 'fixed', top: `${top}%`, left: 0, right: 0, transform: 'translateY(-50%)',
  zIndex: 40, display: 'flex', justifyContent: 'center', padding: '0 12px',
})

// ─── Round copy ──────────────────────────────────────────────────────────────────
const promptFor = (): string => 'What bead comes next?'
const sayFor = (): string => 'Look at the necklace. What bead comes next? Tap it!'

// ─── The interactive play surface (guided / practice) ──────────────────────────────
type Mode = 'guided' | 'practice'
const BeadsPlay: React.FC<{ data: PatternRound; mode: Mode; onComplete: (correct: boolean) => void }> = ({ data, mode, onComplete }) => {
  const { sequence, choices, answer, answerIdx } = data
  const { stringBead, trayBead } = useBeadSizes(sequence.length)
  const [pickedIdx, setPickedIdx] = useState<number | null>(null)
  const [wrongIdx, setWrongIdx] = useState<number | null>(null)
  const erred = useRef(false), done = useRef(false), wrongLock = useRef(false), tapLock = useRef(false)
  const speaking = useIsSpeaking()
  const solved = pickedIdx !== null

  const finish = useCallback(() => {
    if (done.current) return; done.current = true
    if (mode === 'guided') speak(`Yes! The ${BEADS[answer].label} bead! Great pattern!`)
    window.setTimeout(() => onComplete(mode === 'practice' ? !erred.current : true), 950)
  }, [mode, answer, onComplete])

  useEffect(() => {
    if (mode === 'guided') speak('Now you! What bead comes next? Tap it!')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function tap(i: number) {
    if (done.current || speaking || tapLock.current) return
    if (i === answerIdx) {
      setPickedIdx(i)
      tapLock.current = true; window.setTimeout(() => { tapLock.current = false }, SPEAK_LOCK_MS)
      window.setTimeout(finish, 700)
    } else {
      erred.current = true
      setWrongIdx(i)
      if (!wrongLock.current) { wrongLock.current = true; speak(`That's ${BEADS[choices[i]].label}. Look at the pattern — what comes next?`); window.setTimeout(() => { wrongLock.current = false }, 1300) }
      window.setTimeout(() => setWrongIdx(w => (w === i ? null : w)), 600)
    }
  }

  return (
    <>
      <div style={bandStyle(NECKLACE_TOP)}>
        <Necklace sequence={sequence} fill={solved ? answer : null} beadPx={stringBead} />
      </div>
      <div style={bandStyle(TRAY_TOP)}>
        <Tray choices={choices} beadPx={trayBead}
          stateFor={(i) => pickedIdx === i ? 'glow' : wrongIdx === i ? 'wrong' : 'idle'}
          onTap={tap} />
      </div>
    </>
  )
}

// ─── The teaching demo (opening preview + 3-wrong re-teach) ─────────────────────────
// Milo reads the pattern aloud and reveals the next bead. Two SENTENCE lines via speakSteps (lines
// chain on `end`, can't overlap; sentences don't have the short-word race) with the timer fallback.
const BeadsExplain: React.FC<{ data: PatternRound; onDone: () => void }> = ({ data, onDone }) => {
  const { unit, sequence, choices, answer, answerIdx } = data
  const { stringBead, trayBead } = useBeadSizes(sequence.length)
  const [revealed, setRevealed] = useState(false)
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return; ran.current = true
    const unitWords = unit.map(c => BEADS[c].label).join(', ')
    const lines = [
      `Look at the necklace! It goes ${unitWords}, ${unitWords}, over and over.`,
      `So the next bead is ${BEADS[answer].label}!`,
    ]
    const cancel = speakSteps(lines, {
      onStep: (i) => { if (i === 1) setRevealed(true) },
      onDone: () => window.setTimeout(onDone, 800),
    })
    return cancel
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <>
      <div style={bandStyle(NECKLACE_TOP)}>
        <Necklace sequence={sequence} fill={revealed ? answer : null} beadPx={stringBead} />
      </div>
      <div style={bandStyle(TRAY_TOP)}>
        <Tray choices={choices} beadPx={trayBead}
          stateFor={(i) => revealed && i === answerIdx ? 'glow' : 'idle'} />
      </div>
    </>
  )
}

// ─── The scored practice (SkillBeat) — one continuous adaptive sequence ────────────
export const beadShopBeat: Beat<PatternRound> = {
  skillId: 'patterns', rounds: 10, reteachAfter: 3,
  make: (d, round = 0) => makePatternRound((d || 1) as Difficulty, round),
  prompt: () => promptFor(),
  say: () => sayFor(),
  Play: ({ data, onSubmit }) => <BeadsPlay data={data} mode="practice" onComplete={onSubmit} />,
  Reteach: ({ data, onDone }) => <BeadsExplain data={data} onDone={onDone} />,
}

// ─── Orchestrator ──────────────────────────────────────────────────────────────────
// TWO teaching demos (an AB then an ABC pattern) so the intro previews the idea growing.
const DEMO_ROUNDS: PatternRound[] = [
  { unit: ['red', 'blue'], sequence: ['red', 'blue', 'red', 'blue', 'red'], choices: ['blue', 'red', 'green'], answer: 'blue', answerIdx: 0 },
  { unit: ['green', 'yellow', 'purple'], sequence: ['green', 'yellow', 'purple', 'green', 'yellow'], choices: ['green', 'yellow', 'purple'], answer: 'purple', answerIdx: 2 },
]
const GUIDED_ROUND: PatternRound = { unit: ['orange', 'pink'], sequence: ['orange', 'pink', 'orange', 'pink'], choices: ['pink', 'orange', 'blue'], answer: 'orange', answerIdx: 1 }

const BS_CSS = `
@keyframes bs_float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
@keyframes bs_pop { 0%{transform:scale(.3);opacity:.4} 55%{transform:scale(1.18);opacity:1} 100%{transform:scale(1)} }
@keyframes bs_shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px) rotate(-3deg)} 75%{transform:translateX(6px) rotate(3deg)} }
`

type Phase = 'intro' | 'demo' | 'guided' | 'practice'
export default function BeadShop({ onFinish, onExit }: {
  onFinish?: (correct: number, wrong: number) => void
  onExit?: () => void
}) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('intro')
  const [demoIdx, setDemoIdx] = useState(0)
  const result = useRef({ correct: 0, wrong: 0 })
  const finished = useRef(false)
  const exit = useCallback(() => { stopSpeech(); (onExit ?? (() => router.push('/menu')))() }, [router, onExit])

  const finishChapter = useCallback((c: number, w: number) => {
    if (finished.current) return; finished.current = true
    stopSpeech()
    if (onFinish) onFinish(c, w); else exit()
  }, [onFinish, exit])

  const TopBar = (
    <div style={{ position: 'absolute', top: 12, left: 14, right: 14, display: 'flex', alignItems: 'center', zIndex: 50 }}>
      <button onClick={exit} style={{ padding: '7px 14px', borderRadius: 50, background: 'var(--paper)', border: '3px solid var(--milo-orange)', color: 'var(--milo-orange)', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>← Menu</button>
    </div>
  )
  const Banner = (text: string) => (
    <div style={{ position: 'absolute', top: 50, left: 0, right: 0, zIndex: 45, display: 'flex', justifyContent: 'center', padding: '0 12px' }}>
      <div style={{ background: 'var(--paper)', border: '3px solid var(--milo-orange)', borderRadius: 999, padding: '10px 24px', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 19, color: 'var(--milo-orange)', boxShadow: '0 4px 0 rgba(242,107,44,.25)', textAlign: 'center' }}>{text}</div>
    </div>
  )

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100dvh', overflow: 'hidden' }}>
      <style>{BS_CSS}</style>
      {/* code-drawn craft-shop backdrop + optional painted upgrade */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(#ffe9cf 0%, #fff3e2 52%, #f3dcc0 100%)' }} />
      <img src="/assets/backgrounds/bead_shop.jpeg" alt="" draggable={false}
        onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      {TopBar}

      {phase === 'intro' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 45, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
          <div style={{ maxWidth: '74%', background: '#fff', border: '3px solid var(--outline)', borderRadius: 18, padding: '14px 20px', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19, color: 'var(--ink)', textAlign: 'center', boxShadow: '0 4px 0 rgba(61,37,22,.1)' }}>
            Milo is making necklaces in his <b>Bead Shop</b>! The beads make a <b>pattern</b> that repeats. Find the bead that comes <b>next</b>. First, watch Milo!
          </div>
          <button onClick={() => { unlockSpeech(); setPhase('demo') }}
            style={{ padding: '14px 38px', borderRadius: 50, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,var(--milo-orange),var(--milo-orange-deep))', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, boxShadow: '0 6px 16px rgba(242,107,44,.4)' }}>Let&apos;s make beads! ▶</button>
        </div>
      )}

      {phase === 'demo' && (<>{Banner(`Watch the pattern  (${demoIdx + 1}/${DEMO_ROUNDS.length})`)}
        <BeadsExplain key={`demo${demoIdx}`} data={DEMO_ROUNDS[demoIdx]}
          onDone={() => { if (demoIdx + 1 < DEMO_ROUNDS.length) setDemoIdx(demoIdx + 1); else setPhase('guided') }} /></>)}

      {phase === 'guided' && (<>{Banner('Now you! Tap the bead that comes next')}
        <BeadsPlay key="guided" data={GUIDED_ROUND} mode="guided" onComplete={() => setPhase('practice')} /></>)}

      {phase === 'practice' && (
        <div style={{ position: 'absolute', top: 48, left: 0, right: 0, bottom: 0, zIndex: 45 }}>
          <SkillBeat beat={beadShopBeat}
            onComplete={(c, w) => { result.current.correct += c; result.current.wrong += w; finishChapter(result.current.correct, result.current.wrong) }} />
        </div>
      )}

      {phase !== 'intro' && <MiloBead left={11} />}
    </div>
  )
}
