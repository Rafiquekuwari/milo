'use client'
/**
 * Chapter 6 — "Milo's Shape Town Walk", the SHAPE-recognition story (skill `shapes`,
 * the old "Shape House" drill reborn as story mode). Milo strolls through Shape Town,
 * where everyday things are made of shapes; each round he names a shape ("Can you find
 * the triangle?") and the child taps the matching one from the scene. Told through THREE
 * places that rotate across the 10 adaptive rounds (one continuous SkillBeat — harder on
 * a streak, easier when struggling, re-teach after 3 wrong):
 *   🎈 Balloon Park · 🪧 Sign Street · 🌷 Flower Garden
 *
 * Difficulty grows the field (variation = progression):
 *   choices 3 → 4 · the look-alike square/rectangle pair is guaranteed at the hardest tier
 *   so it's recognition, not guessing-by-elimination.
 *
 * The 6 shapes are pure SVG (ShapeSVG from ShapesLesson) — NO art is needed. Each scene
 * dresses them as a town object (balloon string / signpost / flower stem) over a code-drawn
 * backdrop with an auto-upgrade <img> hook. Mirrors story/NumberDoors.tsx
 * (phases intro→demo→guided→practice, ONE SkillBeat); wrapped by game/ShapeHouseChapter.tsx.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { speak, speakSteps, useIsSpeaking, stopSpeech } from '@/lib/useMiloSpeaker'
import { SkillBeat, type Beat } from './StoryWorld'
import { ShapeSVG, SHAPES, SHAPE_ORDER, type ShapeName } from '../lessons/ShapesLesson'

// After a declaring tap, ignore further taps briefly — `useIsSpeaking()` only flips true
// ~100-150ms after speak(), so a fast second tap would slip through. Same lesson as
// NumberDoors/Kitchen/RiverCrossing.
const SPEAK_LOCK_MS = 600
const shuffle = <T,>(a: T[]): T[] => a.slice().sort(() => Math.random() - 0.5)

// The classic look-alike pair — seeded as a distractor at the hardest tier so the child
// must recognise the form, not eliminate.
const TWIN: Partial<Record<ShapeName, ShapeName>> = { square: 'rectangle', rectangle: 'square' }

// ─── Scenes ────────────────────────────────────────────────────────────────────────
type Scene = 'park' | 'street' | 'garden'
interface ShapeRound {
  scene: Scene
  options: ShapeName[]   // shapes shown, in display order (always includes the target)
  answerIdx: number      // index of the target shape
}
const SCENE_ORDER: Scene[] = ['park', 'street', 'garden']
function sceneForRound(round: number): Scene { return SCENE_ORDER[round % SCENE_ORDER.length] }

// A short scene-flavour line so Milo "walks somewhere new" each round (spoken, not read).
const SCENE_INTRO: Record<Scene, string> = {
  park:     'Look at the balloons in the park!',
  street:   'Look at the shop signs on the street!',
  garden:   'Look at the flowers in the garden!',
}

// Painted-scene hooks: a code-drawn gradient always shows; an optional <img> fades in on
// top if the art exists (auto-upgrade), hiding itself on error.
const SCENE_BG: Record<Scene, { grad: string; img: string }> = {
  park:     { grad: 'linear-gradient(#bfe7ff 0%, #d8f1e6 55%, #b6e29a 100%)', img: '/assets/backgrounds/town_park.jpeg' },
  street:   { grad: 'linear-gradient(#ffe7c9 0%, #fff1df 48%, #ecd8bd 100%)', img: '/assets/backgrounds/town_street.jpeg' },
  garden:   { grad: 'linear-gradient(#cdeeff 0%, #e7f6d8 52%, #aedd86 100%)', img: '/assets/backgrounds/town_garden.jpeg' },
}

function Background({ scene }: { scene: Scene }) {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#dff0e4' }}>
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

// ─── Milo the explorer (one persistent presence, bottom-left) ───────────────────────
// Anchored by the BOTTOM corner so a bigger sprite stays grounded. The float lives on an
// INNER div — putting it on the positioned outer div would override its transform.
function MiloExplorer({ left }: { left: number }) {
  const [step, setStep] = useState(0)
  const srcs = ['/assets/characters/milo_explorer.png', '/assets/characters/milo_idle.png']
  return (
    <div style={{ position: 'fixed', left: `${left}%`, bottom: 0, transform: 'translateX(-50%)', zIndex: 26, width: 'min(36vh, 320px)', height: 'min(36vh, 320px)' }}>
      <div style={{ width: '100%', height: '100%', animation: 'st_float 3.4s ease-in-out infinite' }}>
        {step >= srcs.length
          ? <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
              <span style={{ fontSize: 104, filter: 'drop-shadow(0 5px 8px rgba(0,0,0,.35))' }}>🐴</span>
              <span style={{ position: 'absolute', bottom: 10, right: 14, fontSize: 44 }}>🗺️</span>
            </div>
          : <img src={srcs[step]} alt="Milo the explorer" draggable={false} onError={() => setStep(s => s + 1)}
              style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'bottom', filter: 'drop-shadow(0 5px 8px rgba(0,0,0,.35))' }} />}
      </div>
    </div>
  )
}

// ─── A shape "thing" (the shape, dressed as a town object) ──────────────────────────
// Designed at THING_W×THING_H; `scale` blows the whole thing up uniformly so it grows
// with the viewport (never hard-coded px on a 100vw stage — see feedback-viewport-scaling).
// The shape sits in the top square; the scene decoration hangs in the band below it.
const THING_W = 112, DECO_H = 48, THING_H = THING_W + DECO_H
type ThingState = 'idle' | 'glow' | 'wrong' | 'picked'

// The scene-specific "object" that the shape becomes. All decorations hang BELOW the shape
// so the form stays unmistakable (recognition must read clearly).
function Decoration({ scene, scale }: { scene: Scene; scale: number }) {
  const band = DECO_H * scale
  const mid = { position: 'absolute' as const, left: '50%', transform: 'translateX(-50%)' }
  if (scene === 'park') {           // balloon: a thin string + knot
    return (
      <div style={{ position: 'absolute', left: 0, right: 0, top: THING_W * scale, height: band }}>
        <div style={{ ...mid, top: 0, width: 0, height: 0, borderLeft: `${4 * scale}px solid transparent`, borderRight: `${4 * scale}px solid transparent`, borderTop: `${7 * scale}px solid rgba(80,66,45,.55)` }} />
        <div style={{ ...mid, top: 6 * scale, width: Math.max(1.5, 2 * scale), height: band - 6 * scale, background: 'rgba(80,66,45,.5)', borderRadius: 2 }} />
      </div>
    )
  }
  if (scene === 'garden') {         // flower: a green stem + two leaves
    return (
      <div style={{ position: 'absolute', left: 0, right: 0, top: THING_W * scale, height: band }}>
        <div style={{ ...mid, top: 0, width: Math.max(2.5, 4 * scale), height: band, background: '#5a9c3a', borderRadius: 3 }} />
        <div style={{ ...mid, top: band * 0.36, marginLeft: -10 * scale, width: 16 * scale, height: 9 * scale, background: '#6fbe3f', borderRadius: '60% 0 60% 0', transform: 'translateX(-50%) rotate(-18deg)' }} />
        <div style={{ ...mid, top: band * 0.5, marginLeft: 10 * scale, width: 16 * scale, height: 9 * scale, background: '#6fbe3f', borderRadius: '0 60% 0 60%', transform: 'translateX(-50%) rotate(18deg)' }} />
      </div>
    )
  }
  // street: a signpost the shape-sign sits on
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: THING_W * scale, height: band }}>
      <div style={{ ...mid, top: 0, width: 9 * scale, height: band, background: '#9c7b51', borderRadius: 3, boxShadow: 'inset -2px 0 0 rgba(0,0,0,.18)' }} />
      <div style={{ ...mid, bottom: 0, width: 26 * scale, height: 6 * scale, background: '#7d5f3a', borderRadius: 3 }} />
    </div>
  )
}

function ShapeThing({ scene, name, state, scale, left, top, onTap, aria }: {
  scene: Scene; name: ShapeName; state: ThingState; scale: number
  left: number; top: number; onTap?: () => void; aria: string
}) {
  const W = THING_W * scale, H = THING_H * scale
  const shapePx = THING_W * scale * 0.96
  const lit = state === 'glow' || state === 'picked'
  // 'street' frames the shape on a little paper board so it reads as a hanging sign.
  const onBoard = scene === 'street'
  return (
    <button onClick={onTap} disabled={!onTap} aria-label={aria}
      style={{ position: 'fixed', left: `${left}%`, top: `${top}%`, transform: 'translate(-50%,-50%)', zIndex: 30, width: W, height: H, padding: 0, border: 'none', background: 'transparent', cursor: onTap ? 'pointer' : 'default' }}>
      <Decoration scene={scene} scale={scale} />
      <div style={{ position: 'absolute', left: '50%', top: 0, transform: 'translateX(-50%)', width: THING_W * scale, height: THING_W * scale,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: state === 'wrong' ? 'st_shake .42s ease' : lit ? 'st_pop .45s ease' : 'st_sway 4s ease-in-out infinite',
        filter: lit ? 'drop-shadow(0 0 16px var(--garden-green)) drop-shadow(0 0 10px var(--garden-green))' : 'drop-shadow(0 6px 8px rgba(0,0,0,.22))' }}>
        {onBoard && (
          <div style={{ position: 'absolute', inset: `${6 * scale}px`, background: 'var(--paper)', borderRadius: 14 * scale, border: `${3 * scale}px solid #b88a52`, boxShadow: 'inset 0 2px 4px rgba(0,0,0,.1)' }} />
        )}
        <div style={{ position: 'relative', lineHeight: 0 }}>
          <ShapeSVG name={name} size={onBoard ? shapePx * 0.74 : shapePx} />
        </div>
      </div>
    </button>
  )
}

// Shapes sit a little higher than the door siblings (TOP=50 vs NumberDoors' 56) because each
// shape has a decoration band hanging BELOW it (balloon string / signpost / flower stem); the row
// of shapes needs that headroom so the decoration doesn't dangle off the bottom.
const TOP = 50
// How big to draw the shapes — as large as fits given the count and viewport, but CAPPED three
// ways: (a) a huge sprite on a wide screen reads as oversized/crowded (see feedback-viewport-
// scaling); (b) narrow phones shrink them to fit — the per-shape width fraction is already under
// the column spacing, so they never overlap each other; (c) on short / tablet-landscape viewports
// the whole thing (shape + decoration band) is kept ABOVE Milo's bottom-left sprite so they never
// collide. One row only (max 4 options, like NumberDoors), so it never overflows.
function useThingScale(n: number): number {
  const [scale, setScale] = useState(1.3)
  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth, h = window.innerHeight
      const byWidth = w * (n <= 2 ? 0.28 : n === 3 ? 0.22 : 0.175)        // horizontal room per shape
      const byHeight = (h * 0.42) / (THING_H / THING_W)                   // vertical room (keep aspect)
      const s = Math.min(byWidth, byHeight, THING_W * 1.5) / THING_W
      // Keep the box bottom above Milo (anchored bottom-left, height min(36vh, 320)). The tight
      // case is short / landscape viewports where Milo is large relative to the height.
      const miloTop = h - Math.min(0.36 * h, 320)
      const clearScale = ((miloTop - (TOP / 100) * h) * 2) / THING_H
      setScale(Math.max(0.62, Math.min(s, clearScale)))
    }
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [n])
  return scale
}

// Slot positions (left%, top%) — a single centred row. Always returns at least `n` slots
// (evenly spread for any unexpected count) so a slot lookup can never be undefined.
function layoutFor(n: number): { left: number; top: number }[] {
  const xs = n <= 2 ? [33, 67] : n === 3 ? [24, 50, 76] : n === 4 ? [15, 38, 62, 85]
    : Array.from({ length: n }, (_, i) => 12 + (i * 76) / (n - 1))
  return xs.map(left => ({ left, top: TOP }))
}

// ─── Round copy ──────────────────────────────────────────────────────────────────
function promptFor(d: ShapeRound): string { return `Find the ${SHAPES[d.options[d.answerIdx]].label}!` }
function sayFor(d: ShapeRound): string {
  const label = SHAPES[d.options[d.answerIdx]].label
  return `${SCENE_INTRO[d.scene]} Can you find the ${label}? Tap the ${label}!`
}

// ─── The interactive play surface (guided / practice) ──────────────────────────────
type Mode = 'guided' | 'practice'
const ShapesPlay: React.FC<{ data: ShapeRound; mode: Mode; onComplete: (correct: boolean) => void }> = ({ data, mode, onComplete }) => {
  const { scene, options, answerIdx } = data
  const label = SHAPES[options[answerIdx]].label
  const n = options.length
  const slots = layoutFor(n)
  const scale = useThingScale(n)
  const [pickedIdx, setPickedIdx] = useState<number | null>(null)
  const [wrongIdx, setWrongIdx] = useState<number | null>(null)
  const erred = useRef(false), done = useRef(false), wrongLock = useRef(false), tapLock = useRef(false)
  const speaking = useIsSpeaking()

  const finish = useCallback(() => {
    if (done.current) return; done.current = true
    // Only the GUIDED round praises out loud here; in practice the SkillBeat speaks the
    // praise (double-speak was a voice-cut source in earlier chapters).
    if (mode === 'guided') speak(`Yes! The ${label}! Great job!`)
    window.setTimeout(() => onComplete(mode === 'practice' ? !erred.current : true), 950)
  }, [mode, label, onComplete])

  useEffect(() => {
    if (mode === 'guided') speak(`Now you! Find the ${label}. Tap it!`)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function tap(i: number) {
    if (done.current || speaking || tapLock.current) return
    if (i === answerIdx) {
      setPickedIdx(i)
      tapLock.current = true; window.setTimeout(() => { tapLock.current = false }, SPEAK_LOCK_MS)
      window.setTimeout(finish, 650)
    } else {
      erred.current = true
      setWrongIdx(i)
      if (!wrongLock.current) { wrongLock.current = true; speak(`That's a ${SHAPES[options[i]].label}. Find the ${label}!`); window.setTimeout(() => { wrongLock.current = false }, 1300) }
      window.setTimeout(() => setWrongIdx(w => (w === i ? null : w)), 600)
    }
  }

  return (
    <>
      {options.map((name, i) => {
        const state: ThingState = pickedIdx === i ? 'picked' : wrongIdx === i ? 'wrong' : 'idle'
        return <ShapeThing key={i} scene={scene} name={name} state={state} scale={scale}
          left={slots[i].left} top={slots[i].top} onTap={() => tap(i)} aria={`${SHAPES[name].label}`} />
      })}
    </>
  )
}

// ─── The teaching demo (opening preview + 3-wrong re-teach) ─────────────────────────
// Milo names the shape; the matching thing lights up. Timer-driven (not speech-gated) so
// it can never hang if the browser drops voice.
const ShapesExplain: React.FC<{ data: ShapeRound; onDone: () => void }> = ({ data, onDone }) => {
  const { scene, options, answerIdx } = data
  const label = SHAPES[options[answerIdx]].label
  const n = options.length
  const slots = layoutFor(n)
  const scale = useThingScale(n)
  const [glow, setGlow] = useState(false)
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return; ran.current = true
    // speakSeq plays each line ONLY when the previous one's `end` fires, so the lines can
    // never overlap or cut each other (a fixed-timer speak() would clip a slow/long line).
    // The reveal glow is synced to the START of the 3rd line via onWord, and onDone fires
    // after the last line truly finishes. speakSeq's own watchdog means it can't hang.
    const lines = [
      `${SCENE_INTRO[scene]} Milo is looking for the ${label}.`,
      `The ${label}! Can you see it?`,
      `There it is! The ${label}.`,
    ]
    const cancel = speakSteps(lines, {
      onStep: (i) => { if (i === 2) setGlow(true) },
      onDone: () => window.setTimeout(onDone, 700),
    })
    return cancel
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <>
      {options.map((name, i) => (
        <ShapeThing key={i} scene={scene} name={name} state={i === answerIdx && glow ? 'glow' : 'idle'} scale={scale}
          left={slots[i].left} top={slots[i].top} aria={`example ${SHAPES[name].label}`} />
      ))}
    </>
  )
}

// ─── Value generation ──────────────────────────────────────────────────────────────
// Target cycles through all six shapes by round (full coverage, never the same two in a
// row). Difficulty grows the field (3 → 4 choices) and, at the top tier, GUARANTEES the
// look-alike twin is on screen so it's recognition, not guessing-by-elimination.
function makeShapeRound(d: 1 | 2 | 3, round: number): ShapeRound {
  const scene = sceneForRound(round)
  const n = d === 1 ? 3 : 4
  const target = SHAPE_ORDER[round % SHAPE_ORDER.length]
  let pool = SHAPE_ORDER.filter(s => s !== target)
  // Easiest tier: don't pit a square against a rectangle.
  if (d === 1 && TWIN[target]) pool = pool.filter(s => s !== TWIN[target])
  let distractors: ShapeName[]
  const twin = TWIN[target]
  if (d >= 3 && twin && pool.includes(twin)) {
    distractors = shuffle([twin, ...shuffle(pool.filter(s => s !== twin)).slice(0, n - 2)])
  } else {
    distractors = shuffle(pool).slice(0, n - 1)
  }
  const options = shuffle([target, ...distractors])
  return { scene, options, answerIdx: options.indexOf(target) }
}

// ─── The scored practice (SkillBeat) — one continuous adaptive sequence ────────────
export const shapeTownBeat: Beat<ShapeRound> = {
  skillId: 'shapes', rounds: 10, reteachAfter: 3,
  // The place already changes EVERY round (via the bg cross-fade); a short "walk to the
  // next spot" pause every 3 rounds keeps it from feeling rushed.
  walkEvery: 3,
  make: (d, round = 0) => makeShapeRound((d || 1) as 1 | 2 | 3, round),
  prompt: d => promptFor(d),
  say: d => sayFor(d),
  Play: ({ data, onSubmit }) => <ShapesPlay data={data} mode="practice" onComplete={onSubmit} />,
  Reteach: ({ data, onDone }) => <ShapesExplain data={data} onDone={onDone} />,
}

// ─── Orchestrator ──────────────────────────────────────────────────────────────────
// TWO teaching demos — different scenes — so the intro previews variety. Milo names the
// shape and the matching thing lights up.
const DEMO_ROUNDS: ShapeRound[] = [
  { scene: 'park',   options: ['circle', 'triangle'],       answerIdx: 1 },
  { scene: 'street', options: ['square', 'circle', 'star'], answerIdx: 0 },
]
const GUIDED_ROUND: ShapeRound = { scene: 'garden', options: ['triangle', 'circle'], answerIdx: 1 }

const ST_CSS = `
@keyframes st_float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
@keyframes st_sway { 0%,100%{transform:rotate(-2deg)} 50%{transform:rotate(2deg)} }
@keyframes st_pop { 0%{transform:scale(1)} 40%{transform:scale(1.12)} 100%{transform:scale(1)} }
@keyframes st_shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px) rotate(-2deg)} 75%{transform:translateX(6px) rotate(2deg)} }
@keyframes k_bounceIn { 0%{transform:scale(0) translateY(30px);opacity:0} 60%{transform:scale(1.25) translateY(-6px);opacity:1} 100%{transform:scale(1) translateY(0);opacity:1} }
`

type Phase = 'intro' | 'demo' | 'guided' | 'practice'
export default function ShapeTown({ onFinish, onExit }: {
  onFinish?: (correct: number, wrong: number) => void
  onExit?: () => void
}) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('intro')
  const [scene, setScene] = useState<Scene>('park')
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
    : 'park'

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
      <style>{ST_CSS}</style>
      <Background scene={bgScene} />
      {TopBar}

      {phase === 'intro' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 45, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
          <div style={{ maxWidth: '74%', background: '#fff', border: '3px solid var(--outline)', borderRadius: 18, padding: '14px 20px', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19, color: 'var(--ink)', textAlign: 'center', boxShadow: '0 4px 0 rgba(61,37,22,.1)' }}>
            Milo is exploring <b>Shape Town</b>! Everything is made of shapes. <b>Listen</b> for the shape, then tap it. First, watch Milo!
          </div>
          <button onClick={() => setPhase('demo')}
            style={{ padding: '14px 38px', borderRadius: 50, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,var(--milo-orange),var(--milo-orange-deep))', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, boxShadow: '0 6px 16px rgba(242,107,44,.4)' }}>Let&apos;s explore! ▶</button>
        </div>
      )}

      {phase === 'demo' && (<>{Banner(`Find the shape Milo names  (${demoIdx + 1}/${DEMO_ROUNDS.length})`)}
        <ShapesExplain key={`demo${demoIdx}`} data={DEMO_ROUNDS[demoIdx]}
          onDone={() => { if (demoIdx + 1 < DEMO_ROUNDS.length) setDemoIdx(demoIdx + 1); else setPhase('guided') }} /></>)}

      {phase === 'guided' && (<>{Banner('Now you! Tap the shape Milo says')}
        <ShapesPlay key="guided" data={GUIDED_ROUND} mode="guided" onComplete={() => setPhase('practice')} /></>)}

      {phase === 'practice' && (
        <div style={{ position: 'absolute', top: 48, left: 0, right: 0, zIndex: 45, display: 'flex', justifyContent: 'center', padding: '0 12px' }}>
          <SkillBeat beat={shapeTownBeat} onInterlude={interlude}
            onRound={(data) => { if (data?.scene) setScene(data.scene as Scene) }}
            onComplete={(c, w) => { result.current.correct += c; result.current.wrong += w; finishChapter(result.current.correct, result.current.wrong) }} />
        </div>
      )}

      {phase !== 'intro' && <MiloExplorer left={12} />}
    </div>
  )
}
