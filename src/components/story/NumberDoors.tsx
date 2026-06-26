'use client'
/**
 * Chapter 4 — "Milo's Delivery Round", the number-RECOGNITION story (skill
 * `numberRecognition`). Milo is a postman fox; each round he has a parcel for a numbered
 * door. The child HEARS the address ("…goes to number 4!") and taps the door whose
 * numeral matches the SOUND — recognition by ear, so the target is spoken, never shown
 * as text. Told through FOUR scenes that rotate across the 10 adaptive rounds (one
 * continuous SkillBeat — harder on a streak, easier when struggling, re-teach after 3
 * wrong):
 *   🏘️ Houses   · 📬 Mailboxes · 🧰 Lockers · 🏪 Shops
 *
 * Difficulty grows the listening load (variation = progression):
 *   number range 1–5 → 1–10 · choices 2 → 3 → 4 · look-alike distractors (6/9, 7/1) at hard.
 *
 * Painted door/scene/postman art (code-drawn fallbacks kept). The numeral floats on a
 * sign ABOVE each door; the loop is just ask → tap → next (no friend/celebration emojis).
 * Mirrors story/Kitchen.tsx (phases intro→demo→guided→practice, ONE SkillBeat); wrapped by
 * game/NumberDoorsChapter.tsx.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { speak, useIsSpeaking, stopSpeech } from '@/lib/useMiloSpeaker'
import { SkillBeat, type Beat } from './StoryWorld'

// After a correct/declaring tap, ignore further taps briefly — `useIsSpeaking()` only
// flips true ~100-150ms after speak(), so a fast second tap would slip through. Same
// lesson as Kitchen/RiverCrossing.
const SPEAK_LOCK_MS = 600
const rint = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))
const shuffle = <T,>(a: T[]): T[] => a.slice().sort(() => Math.random() - 0.5)

// Digits that look alike — seeded as distractors at the hardest tier so recognition (not
// guessing-by-elimination) is what's tested.
const LOOKALIKE: Record<number, number> = { 6: 9, 9: 6, 7: 1, 1: 7, 3: 8, 8: 3, 5: 6, 2: 7 }

// ─── Scenes ────────────────────────────────────────────────────────────────────────
type Scene = 'houses' | 'mailboxes' | 'lockers' | 'shops'
interface DoorRound {
  scene: Scene
  doors: number[]       // numerals shown, in display order (always includes the target)
  answerIdx: number     // index of the target door
}
const SCENE_ORDER: Scene[] = ['houses', 'mailboxes', 'lockers', 'shops']
function sceneForRound(round: number): Scene { return SCENE_ORDER[round % SCENE_ORDER.length] }

const SCENE_NOUN: Record<Scene, string> = { houses: 'house', mailboxes: 'mailbox', lockers: 'locker', shops: 'shop' }

// Painted-scene hooks: a code-drawn gradient always shows; an optional <img> fades in on
// top if the art exists (auto-upgrade), and hides itself on error.
const SCENE_BG: Record<Scene, { grad: string; img: string }> = {
  houses:    { grad: 'linear-gradient(#cdeeff 0%, #e7f6d8 56%, #bfe293 100%)', img: '/assets/backgrounds/door_houses.jpeg' },
  mailboxes: { grad: 'linear-gradient(#ffe9cf 0%, #fff0de 46%, #cfe9f5 100%)', img: '/assets/backgrounds/door_street.jpeg' },
  lockers:   { grad: 'linear-gradient(#eef1f7 0%, #e2e8f1 54%, #cfd8e6 100%)', img: '/assets/backgrounds/door_lockers.jpeg' },
  shops:     { grad: 'linear-gradient(#ffe6ef 0%, #fff0dd 54%, #ffe0c2 100%)', img: '/assets/backgrounds/door_shops.jpeg' },
}
// Per-scene door palette + topper, so each scene reads as a different place.
const SCENE_FRAME: Record<Scene, { door: string; edge: string; plaque: string; topper: 'roof' | 'flag' | 'vent' | 'awning' }> = {
  houses:    { door: '#e3914c', edge: '#a85f28', plaque: '#fff4e0', topper: 'roof' },
  mailboxes: { door: '#46a6a0', edge: '#2c6e69', plaque: '#eafaf8', topper: 'flag' },
  lockers:   { door: '#9fb1cc', edge: '#5f7596', plaque: '#eef3fb', topper: 'vent' },
  shops:     { door: '#7c9fe0', edge: '#4b6bb0', plaque: '#eef3ff', topper: 'awning' },
}

// Painted door sprites (user-supplied) — auto-upgrade over the code-drawn DoorFace.
// SCENE_BBOX = measured alpha bounds (crop to it so the door fills its slot). The number
// is NOT drawn on the door — it floats ABOVE each door (see Door).
const SCENE_SPRITE: Record<Scene, string> = {
  houses: '/assets/objects/door_house.png',
  mailboxes: '/assets/objects/door_mailbox.png',
  lockers: '/assets/objects/door_locker.png',
  shops: '/assets/objects/door_shop.png',
}
const SCENE_BBOX: Record<Scene, { W: number; H: number; x: number; y: number; w: number; h: number }> = {
  houses:    { W: 1024, H: 1024, x: 190, y: 72,  w: 649, h: 871 },
  mailboxes: { W: 1024, H: 1024, x: 238, y: 174, w: 511, h: 675 },
  lockers:   { W: 1024, H: 1024, x: 226, y: 165, w: 573, h: 684 },
  shops:     { W: 1024, H: 1024, x: 210, y: 36,  w: 709, h: 925 },
}

function Background({ scene }: { scene: Scene }) {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#eef1f7' }}>
      {SCENE_ORDER.map(s => (
        <div key={s} style={{ position: 'absolute', inset: 0, opacity: s === scene ? 1 : 0, transition: 'opacity .6s ease' }}>
          <div style={{ position: 'absolute', inset: 0, background: SCENE_BG[s].grad }} />
          <img src={SCENE_BG[s].img} alt="" draggable={false}
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      ))}
    </div>
  )
}

// ─── Milo the postman (one persistent presence, bottom-left) ────────────────────────
// Anchored by the BOTTOM corner so a bigger sprite stays grounded (feet on the floor).
// The float lives on an INNER div — putting it on the positioned outer div would override
// its transform and un-anchor him.
function MiloPostman({ left }: { left: number }) {
  const [step, setStep] = useState(0)
  const srcs = ['/assets/characters/milo_postman.png', '/assets/characters/milo_idle.png']
  return (
    <div style={{ position: 'fixed', left: `${left}%`, bottom: 0, transform: 'translateX(-50%)', zIndex: 26, width: 'min(38vh, 340px)', height: 'min(38vh, 340px)' }}>
      <div style={{ width: '100%', height: '100%', animation: 'nd_float 3.4s ease-in-out infinite' }}>
        {step >= srcs.length
          ? <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
              <span style={{ fontSize: 110, filter: 'drop-shadow(0 5px 8px rgba(0,0,0,.35))' }}>🦊</span>
              <span style={{ position: 'absolute', bottom: 12, right: 20, fontSize: 50 }}>📬</span>
            </div>
          : <img src={srcs[step]} alt="Milo the postman" draggable={false} onError={() => setStep(s => s + 1)}
              style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'bottom', filter: 'drop-shadow(0 5px 8px rgba(0,0,0,.35))' }} />}
      </div>
    </div>
  )
}

// ─── A door (painted sprite, or code-drawn fallback). The number floats ABOVE it. ───
// Designed at DOOR_W×DOOR_H; `scale` blows the whole thing up uniformly so the frame
// grows with the viewport. Layout/positioning mirrors Kitchen's Vessel.
const DOOR_W = 128, DOOR_H = 190
type DoorState = 'idle' | 'glow' | 'wrong' | 'open'

function DoorFace({ scene, scale }: { scene: Scene; scale: number }) {
  const f = SCENE_FRAME[scene]
  const topH = DOOR_H * 0.2          // topper zone (roof / awning / vent / flagged top)
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {/* topper */}
      {f.topper === 'roof' && (
        <div style={{ position: 'absolute', left: '6%', right: '6%', top: 0, height: topH, background: '#c0533a', clipPath: 'polygon(50% 0, 100% 100%, 0 100%)' }} />
      )}
      {f.topper === 'awning' && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: topH * 0.45, height: topH * 0.6, borderRadius: 4 * scale,
          background: 'repeating-linear-gradient(90deg, #d9534f 0 14px, #fff 14px 28px)', border: `${2 * scale}px solid #b23b37` }} />
      )}
      {f.topper === 'vent' && (
        <div style={{ position: 'absolute', left: '24%', right: '24%', top: topH * 0.5, height: topH * 0.5, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          {[0, 1, 2].map(i => <div key={i} style={{ height: 3 * scale, background: f.edge, borderRadius: 2 }} />)}
        </div>
      )}
      {f.topper === 'flag' && (
        <div style={{ position: 'absolute', right: '4%', top: topH * 0.3, width: 10 * scale, height: topH, background: f.edge }}>
          <div style={{ position: 'absolute', top: 0, left: 8 * scale, width: 16 * scale, height: 12 * scale, background: '#d9534f', borderRadius: 2 }} />
        </div>
      )}
      {/* door / box body */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: topH,
        borderRadius: scene === 'lockers' ? `${6 * scale}px` : `${18 * scale}px ${18 * scale}px ${5 * scale}px ${5 * scale}px`,
        background: f.door, border: `${4 * scale}px solid ${f.edge}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `inset 0 ${5 * scale}px ${10 * scale}px rgba(255,255,255,.22), inset 0 ${-6 * scale}px ${10 * scale}px rgba(0,0,0,.18)` }}>
        {/* blank nameplate (the number floats above the door) */}
        <div style={{ width: 54 * scale, height: 38 * scale, background: f.plaque, borderRadius: 12 * scale, border: `${3 * scale}px solid ${f.edge}`, boxShadow: 'inset 0 2px 4px rgba(0,0,0,.12)' }} />
        {/* knob */}
        <div style={{ position: 'absolute', right: 9 * scale, top: '52%', width: 10 * scale, height: 10 * scale, borderRadius: '50%', background: f.edge, boxShadow: 'inset -1px -1px 2px rgba(0,0,0,.3)' }} />
      </div>
    </div>
  )
}

// The painted door cropped to its alpha bbox so it fills the slot. No number on it.
function PaintedDoor({ scene, scale, onError }: { scene: Scene; scale: number; onError: () => void }) {
  const bb = SCENE_BBOX[scene]
  const w = DOOR_W * scale
  const h = w * (bb.h / bb.w)
  const s = w / bb.w                 // image px → screen px (bbox fills the width)
  return (
    <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: w, height: h, overflow: 'hidden' }}>
      <img src={SCENE_SPRITE[scene]} alt="" draggable={false} onError={onError}
        style={{ position: 'absolute', left: -bb.x * s, top: -bb.y * s, width: bb.W * s, height: bb.H * s, maxWidth: 'none' }} />
    </div>
  )
}

function Door({ scene, num, state, scale, left, top, onTap, aria }: {
  scene: Scene; num: number; state: DoorState; scale: number
  left: number; top: number; onTap?: () => void; aria: string
}) {
  const [imgOk, setImgOk] = useState(true)
  const W = DOOR_W * scale, H = DOOR_H * scale
  const lit = state === 'glow' || state === 'open'
  return (
    <button onClick={onTap} disabled={!onTap} aria-label={aria}
      style={{ position: 'fixed', left: `${left}%`, top: `${top}%`, transform: 'translate(-50%,-50%)', zIndex: 30, width: W, height: H, padding: 0, border: 'none', background: 'transparent', cursor: onTap ? 'pointer' : 'default' }}>
      {/* the door's NUMBER floats on a little sign ABOVE the door (read it, match the sound) */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: '-16%', display: 'flex', justifyContent: 'center', zIndex: 7, pointerEvents: 'none' }}>
        <span style={{ background: 'var(--paper)', border: `${3 * scale}px solid var(--milo-orange)`, borderRadius: 999, padding: `0 ${14 * scale}px`, fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 48 * scale, color: 'var(--ink)', lineHeight: 1.3, boxShadow: `0 ${3 * scale}px 0 rgba(242,107,44,.3)` }}>{num}</span>
      </div>
      {/* the door — painted sprite, or the code-drawn fallback if the PNG is missing */}
      <div style={{ position: 'absolute', inset: 0,
        animation: state === 'wrong' ? 'nd_shake .42s ease' : lit ? 'nd_pop .45s ease' : 'none',
        filter: lit ? 'drop-shadow(0 0 18px var(--garden-green)) drop-shadow(0 0 12px var(--garden-green))' : 'drop-shadow(0 8px 10px rgba(0,0,0,.28))' }}>
        {imgOk
          ? <PaintedDoor scene={scene} scale={scale} onError={() => setImgOk(false)} />
          : <DoorFace scene={scene} scale={scale} />}
      </div>
    </button>
  )
}

// How big to draw the doors — as large as fits given the count and viewport (capped so
// they never overlap/overflow). The art is designed at DOOR_W wide; returns the scale.
function useDoorScale(n: number): number {
  const [scale, setScale] = useState(1.5)
  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth, h = window.innerHeight
      const byWidth = w * (n <= 2 ? 0.30 : n <= 3 ? 0.22 : 0.17)   // horizontal room per door
      const byHeight = (h * 0.5) / (DOOR_H / DOOR_W)                // vertical room (keep aspect)
      setScale(Math.max(1, Math.min(byWidth, byHeight) / DOOR_W))
    }
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [n])
  return scale
}

const XS: Record<number, number[]> = { 2: [31, 69], 3: [22, 50, 78], 4: [15, 38, 62, 85] }
const TOP = 56

// ─── Round copy ──────────────────────────────────────────────────────────────────
// prompt is SHOWN (must NOT reveal the number — recognition is by ear); say is HEARD.
function promptFor(d: DoorRound): string { return `Which ${SCENE_NOUN[d.scene]} is the parcel for?` }
function sayFor(d: DoorRound): string {
  const t = d.doors[d.answerIdx]
  return `This parcel goes to number ${t}. Tap ${SCENE_NOUN[d.scene]} number ${t}!`
}

// ─── The interactive play surface (guided / practice) ──────────────────────────────
type Mode = 'guided' | 'practice'
const DoorsPlay: React.FC<{ data: DoorRound; mode: Mode; onComplete: (correct: boolean) => void }> = ({ data, mode, onComplete }) => {
  const { scene, doors, answerIdx } = data
  const target = doors[answerIdx]
  const n = doors.length
  const xs = XS[n] ?? XS[2]
  const scale = useDoorScale(n)
  const [openIdx, setOpenIdx] = useState<number | null>(null)
  const [wrongIdx, setWrongIdx] = useState<number | null>(null)
  const erred = useRef(false), done = useRef(false), wrongLock = useRef(false), tapLock = useRef(false)
  const speaking = useIsSpeaking()

  const finish = useCallback(() => {
    if (done.current) return; done.current = true
    // Only the GUIDED round praises out loud here; in practice the SkillBeat speaks the
    // praise (double-speak was a voice-cut source in earlier chapters).
    if (mode === 'guided') speak(`Yes! Number ${target}! Great job!`)
    window.setTimeout(() => onComplete(mode === 'practice' ? !erred.current : true), 950)
  }, [mode, target, onComplete])

  useEffect(() => {
    if (mode === 'guided') speak(`Now you! Find ${SCENE_NOUN[scene]} number ${target}. Tap it!`)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function tap(i: number) {
    if (done.current || speaking || tapLock.current) return
    if (i === answerIdx) {
      setOpenIdx(i)
      tapLock.current = true; window.setTimeout(() => { tapLock.current = false }, SPEAK_LOCK_MS)
      window.setTimeout(finish, 650)
    } else {
      erred.current = true
      setWrongIdx(i)
      if (!wrongLock.current) { wrongLock.current = true; speak(`That's ${doors[i]}. Find number ${target}!`); window.setTimeout(() => { wrongLock.current = false }, 1300) }
      window.setTimeout(() => setWrongIdx(w => (w === i ? null : w)), 600)
    }
  }

  return (
    <>
      {doors.map((num, i) => {
        const state: DoorState = openIdx === i ? 'open' : wrongIdx === i ? 'wrong' : 'idle'
        return <Door key={i} scene={scene} num={num} state={state} scale={scale}
          left={xs[i]} top={TOP} onTap={() => tap(i)} aria={`door ${num}`} />
      })}
    </>
  )
}

// ─── The teaching demo (opening preview + 3-wrong re-teach) ─────────────────────────
// Milo names the number; the matching door (its number is shown above it) lights up.
// Timer-driven (not speech-gated) so it can never hang if the browser drops voice.
const DoorsExplain: React.FC<{ data: DoorRound; onDone: () => void }> = ({ data, onDone }) => {
  const { scene, doors, answerIdx } = data
  const target = doors[answerIdx]
  const n = doors.length
  const xs = XS[n] ?? XS[2]
  const scale = useDoorScale(n)
  const [glow, setGlow] = useState(false)
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return; ran.current = true
    const ids: number[] = []
    ids.push(window.setTimeout(() => speak(`Milo has a parcel for number ${target}.`), 450))
    ids.push(window.setTimeout(() => speak(`${target}! Find the door that says ${target}.`), 2700))
    ids.push(window.setTimeout(() => { setGlow(true); speak(`There it is! Number ${target}.`) }, 4900))
    ids.push(window.setTimeout(onDone, 7000))
    return () => ids.forEach(clearTimeout)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <>
      {doors.map((num, i) => (
        <Door key={i} scene={scene} num={num} state={i === answerIdx && glow ? 'glow' : 'idle'} scale={scale}
          left={xs[i]} top={TOP} aria={`example ${num}`} />
      ))}
    </>
  )
}

// ─── Value generation ──────────────────────────────────────────────────────────────
function makeDoorRound(d: 1 | 2 | 3, round: number): DoorRound {
  const scene = sceneForRound(round)
  const n = d === 1 ? 2 : d === 2 ? 3 : 4                 // more doors = harder discrimination
  const max = d === 1 ? 5 : 10                            // 1–5 easy, grow to 1–10
  const target = rint(1, max)
  const opts = new Set<number>([target])
  // at the hardest tier seed a look-alike digit so it's recognition, not elimination
  if (d >= 3 && opts.size < n) { const la = LOOKALIKE[target]; if (la && la !== target && la <= max) opts.add(la) }
  while (opts.size < n) opts.add(rint(1, max))
  const doors = shuffle([...opts])
  return { scene, doors, answerIdx: doors.indexOf(target) }
}

// ─── The scored practice (SkillBeat) — one continuous adaptive sequence ────────────
export const doorsRecognizeBeat: Beat<DoorRound> = {
  skillId: 'numberRecognition', rounds: 10, reteachAfter: 3,
  // The scene already changes EVERY round (via the bg cross-fade); a short "walk to the
  // next street" pause every 3 rounds keeps it from feeling rushed.
  walkEvery: 3,
  make: (d, round = 0) => makeDoorRound((d || 1) as 1 | 2 | 3, round),
  prompt: d => promptFor(d),
  say: d => sayFor(d),       // the number is HEARD, not read (SkillBeat speaks this each round)
  Play: ({ data, onSubmit }) => <DoorsPlay data={data} mode="practice" onComplete={onSubmit} />,
  // Re-teach by naming + showing the number, then opening the right door (never reveals
  // the target as on-screen text in the prompt).
  Reteach: ({ data, onDone }) => <DoorsExplain data={data} onDone={onDone} />,
}

// ─── Orchestrator ──────────────────────────────────────────────────────────────────
// TWO teaching demos — different scenes — so the intro previews variety. Milo names the
// number and the matching door lights up.
const DEMO_ROUNDS: DoorRound[] = [
  { scene: 'houses',    doors: [2, 3],    answerIdx: 1 },
  { scene: 'mailboxes', doors: [5, 1, 8], answerIdx: 0 },
]
const GUIDED_ROUND: DoorRound = { scene: 'lockers', doors: [4, 2], answerIdx: 1 }

const ND_CSS = `
@keyframes nd_float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
@keyframes nd_pop { 0%{transform:scale(1)} 40%{transform:scale(1.1)} 100%{transform:scale(1)} }
@keyframes nd_shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px) rotate(-2deg)} 75%{transform:translateX(6px) rotate(2deg)} }
@keyframes k_bounceIn { 0%{transform:scale(0) translateY(30px);opacity:0} 60%{transform:scale(1.25) translateY(-6px);opacity:1} 100%{transform:scale(1) translateY(0);opacity:1} }
`

type Phase = 'intro' | 'demo' | 'guided' | 'practice'
export default function NumberDoors({ onFinish, onExit }: {
  onFinish?: (correct: number, wrong: number) => void
  onExit?: () => void
}) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('intro')
  const [scene, setScene] = useState<Scene>('houses')
  const [demoIdx, setDemoIdx] = useState(0)
  const result = useRef({ correct: 0, wrong: 0 })
  const finished = useRef(false)
  const exit = useCallback(() => { stopSpeech(); (onExit ?? (() => router.push('/menu')))() }, [router, onExit])

  const finishChapter = useCallback((c: number, w: number) => {
    if (finished.current) return; finished.current = true
    stopSpeech()
    if (onFinish) onFinish(c, w); else exit()
  }, [onFinish, exit])

  const interlude = useCallback(() => new Promise<void>(res => window.setTimeout(res, 850)), [])
  const bgScene: Scene = phase === 'practice' ? scene
    : phase === 'guided' ? GUIDED_ROUND.scene
    : phase === 'demo' ? DEMO_ROUNDS[demoIdx].scene
    : 'houses'

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
      <style>{ND_CSS}</style>
      <Background scene={bgScene} />
      {TopBar}

      {phase === 'intro' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 45, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
          <div style={{ maxWidth: '74%', background: '#fff', border: '3px solid var(--outline)', borderRadius: 18, padding: '14px 20px', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19, color: 'var(--ink)', textAlign: 'center', boxShadow: '0 4px 0 rgba(61,37,22,.1)' }}>
            Milo is delivering parcels! <b>Listen</b> for the number, then tap that door. First, watch Milo!
          </div>
          <button onClick={() => { speak('Let\'s help Milo deliver! Listen for the number, then tap that door.'); setPhase('demo') }}
            style={{ padding: '14px 38px', borderRadius: 50, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,var(--milo-orange),var(--milo-orange-deep))', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, boxShadow: '0 6px 16px rgba(242,107,44,.4)' }}>Let&apos;s deliver! ▶</button>
        </div>
      )}

      {phase === 'demo' && (<>{Banner(`Listen for the number  (${demoIdx + 1}/${DEMO_ROUNDS.length})`)}
        <DoorsExplain key={`demo${demoIdx}`} data={DEMO_ROUNDS[demoIdx]}
          onDone={() => { if (demoIdx + 1 < DEMO_ROUNDS.length) setDemoIdx(demoIdx + 1); else setPhase('guided') }} /></>)}

      {phase === 'guided' && (<>{Banner('Now you! Tap the door Milo says')}
        <DoorsPlay key="guided" data={GUIDED_ROUND} mode="guided" onComplete={() => setPhase('practice')} /></>)}

      {phase === 'practice' && (
        <div style={{ position: 'absolute', top: 48, left: 0, right: 0, zIndex: 45, display: 'flex', justifyContent: 'center', padding: '0 12px' }}>
          <SkillBeat beat={doorsRecognizeBeat} onInterlude={interlude}
            onRound={(data) => { if (data?.scene) setScene(data.scene as Scene) }}
            onComplete={(c, w) => { result.current.correct += c; result.current.wrong += w; finishChapter(result.current.correct, result.current.wrong) }} />
        </div>
      )}

      {phase !== 'intro' && <MiloPostman left={12} />}
    </div>
  )
}
