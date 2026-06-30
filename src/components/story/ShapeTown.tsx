'use client'
/**
 * Chapter 6 — SHAPE-recognition (skill `shapes`). Milo names a shape ("Can you find the
 * triangle?") and the child taps the matching one. The child first PICKS one of THREE
 * worlds; within the chosen world three object-scenes rotate across the 10 adaptive rounds
 * (one continuous SkillBeat — harder on a streak, easier when struggling, re-teach after 3
 * wrong):
 *   🏙️ Shape Town — balloons · shop signs · flowers
 *   🎪 Fun Fair    — kites · lollipops · prize rosettes
 *   🏖️ Beach Day   — sandcastle flags · sailboats · picnic plates
 *
 * The 6 shapes are pure SVG (ShapeSVG from ShapesLesson) — they MUST stay code-drawn so the
 * geometry is exact (a painted "triangle" could round off and break recognition). Each scene
 * only DRESSES a shape as a town object via a small code-drawn "mount" hanging below it (a
 * balloon string / signpost / kite tail / lollipop stick / ribbon / flagpole / boat hull /
 * plate), over a backdrop with an auto-upgrade <img> hook. Difficulty grows the field (3 → 4
 * choices) and, at the top tier, guarantees the square/rectangle look-alike is present so it's
 * recognition, not elimination. Mirrors RainbowTown's world-picker pattern; wrapped by
 * game/ShapeHouseChapter.tsx.
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { speak, speakSteps, useIsSpeaking, stopSpeech, unlockSpeech } from '@/lib/useMiloSpeaker'
import { SkillBeat, type Beat } from './StoryWorld'
import WorldSelect from './WorldSelect'
import { ShapeSVG, SHAPES, SHAPE_ORDER, type ShapeName } from '../lessons/ShapesLesson'

// After a declaring tap, ignore further taps briefly — `useIsSpeaking()` only flips true
// ~100-150ms after speak(), so a fast second tap would slip through. Same lesson as
// NumberDoors/Kitchen/RiverCrossing.
const SPEAK_LOCK_MS = 600
const shuffle = <T,>(a: T[]): T[] => {
  const r = a.slice()
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]] }
  return r
}

// The classic look-alike pair — seeded as a distractor at the hardest tier so the child
// must recognise the form, not eliminate.
const TWIN: Partial<Record<ShapeName, ShapeName>> = { square: 'rectangle', rectangle: 'square' }

// ─── Scenes ────────────────────────────────────────────────────────────────────────
// A "scene" within a world dresses the shapes as a particular town object via its `deco`
// mount, over its own backdrop, with its own ground tuning. `board` frames the shape on a
// little paper board (a hanging shop sign).
type DecoKind = 'balloon' | 'sign' | 'stem' | 'kite' | 'stick' | 'ribbon' | 'flag' | 'boat' | 'plate'
type SceneId =
  | 'park' | 'street' | 'garden'           // Shape Town
  | 'kites' | 'sweets' | 'prizes'          // Fun Fair
  | 'sandcastle' | 'boats' | 'picnic'      // Beach Day

interface SceneDef {
  intro: string                                  // spoken when Milo "walks" to this spot
  grad: string                                   // code-drawn backdrop (always shows)
  img: string                                    // optional painted bg (fades in if it exists)
  deco: DecoKind
  board?: boolean
  ground: { baseTop: number; rise: number; groundLine: number }
}
const SCENES: Record<SceneId, SceneDef> = {
  park:       { intro: 'Look at the balloons in the park!',     deco: 'balloon', grad: 'linear-gradient(#bfe7ff 0%, #d8f1e6 55%, #b6e29a 100%)', img: '/assets/backgrounds/town_park.jpeg',   ground: { baseTop: 48, rise: 10, groundLine: 84 } },
  street:     { intro: 'Look at the shop signs on the street!',  deco: 'sign', board: true, grad: 'linear-gradient(#ffe7c9 0%, #fff1df 48%, #ecd8bd 100%)', img: '/assets/backgrounds/town_street.jpeg', ground: { baseTop: 52, rise: 8, groundLine: 86 } },
  garden:     { intro: 'Look at the flowers in the garden!',     deco: 'stem', grad: 'linear-gradient(#cdeeff 0%, #e7f6d8 52%, #aedd86 100%)', img: '/assets/backgrounds/town_garden.jpeg', ground: { baseTop: 50, rise: 9, groundLine: 84 } },
  kites:      { intro: 'Look at the kites in the sky!',          deco: 'kite', grad: 'linear-gradient(#afdcff 0%, #d4ecff 55%, #bfe6c2 100%)', img: '/assets/backgrounds/fair_sky.png',     ground: { baseTop: 44, rise: 11, groundLine: 86 } },
  sweets:     { intro: 'Look at the lollipops at the stand!',    deco: 'stick', grad: 'linear-gradient(#ffe2f1 0%, #ffeef6 52%, #ffd9c2 100%)', img: '/assets/backgrounds/fair_sweets.png',  ground: { baseTop: 52, rise: 8, groundLine: 86 } },
  prizes:     { intro: 'Look at the prize ribbons at the fair!', deco: 'ribbon', grad: 'linear-gradient(#ffe8cf 0%, #fff2e0 50%, #ffe0c8 100%)', img: '/assets/backgrounds/fair_prizes.png',  ground: { baseTop: 50, rise: 9, groundLine: 85 } },
  sandcastle: { intro: 'Look at the flags on the sandcastles!',  deco: 'flag', grad: 'linear-gradient(#bfe9ff 0%, #d8f1ff 50%, #f0dcab 100%)', img: '/assets/backgrounds/beach_sand.png',   ground: { baseTop: 52, rise: 8, groundLine: 86 } },
  boats:      { intro: 'Look at the sailboats on the water!',    deco: 'boat', grad: 'linear-gradient(#bfe9ff 0%, #a9defa 52%, #5fb6e6 100%)', img: '/assets/backgrounds/beach_sea.png',    ground: { baseTop: 50, rise: 9, groundLine: 84 } },
  picnic:     { intro: 'Look at the treats on the picnic rug!',  deco: 'plate', grad: 'linear-gradient(#cdeeff 0%, #e7f6d8 52%, #aedd86 100%)', img: '/assets/backgrounds/beach_picnic.png', ground: { baseTop: 54, rise: 7, groundLine: 84 } },
}

// ─── Worlds ──────────────────────────────────────────────────────────────────────────
interface ShapeWorld {
  id: string; label: string; emoji: string
  scenes: SceneId[]
  milo: { srcs: string[]; emoji: string; accessory: string }
  intro: string
}
const WORLDS: ShapeWorld[] = [
  { id: 'town', label: 'Shape Town', emoji: '🏙️', scenes: ['park', 'street', 'garden'],
    milo: { srcs: ['/assets/characters/milo_explorer.png', '/assets/characters/milo_idle.png'], emoji: '🐴', accessory: '🗺️' },
    intro: 'Milo is exploring Shape Town! Everything is made of shapes. Listen for the shape, then tap it. First, let’s meet the shapes!' },
  { id: 'fair', label: 'Fun Fair', emoji: '🎪', scenes: ['kites', 'sweets', 'prizes'],
    milo: { srcs: ['/assets/characters/milo_explorer.png', '/assets/characters/milo_idle.png'], emoji: '🐴', accessory: '🎪' },
    intro: 'Milo is at the Fun Fair! Everything here is made of shapes. Listen for the shape, then tap it. First, let’s meet the shapes!' },
  { id: 'beach', label: 'Beach Day', emoji: '🏖️', scenes: ['sandcastle', 'boats', 'picnic'],
    milo: { srcs: ['/assets/characters/milo_explorer.png', '/assets/characters/milo_idle.png'], emoji: '🐴', accessory: '🏖️' },
    intro: 'Milo is at the beach! Everything here is made of shapes. Listen for the shape, then tap it. First, let’s meet the shapes!' },
]
const worldById = (id: string) => WORLDS.find(w => w.id === id)
const PICK_WORLDS = WORLDS.map(w => ({ id: w.id, label: w.label, emoji: w.emoji, bgImage: SCENES[w.scenes[0]].img }))

interface ShapeRound {
  scene: SceneId
  options: ShapeName[]   // shapes shown, in display order (always includes the target)
  answerIdx: number      // index of the target shape
}

function Background({ scene, scenes }: { scene: SceneId; scenes: SceneId[] }) {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#dff0e4' }}>
      {scenes.map(s => (
        <div key={s} style={{ position: 'absolute', inset: 0, opacity: s === scene ? 1 : 0, transition: 'opacity .6s ease' }}>
          <div style={{ position: 'absolute', inset: 0, background: SCENES[s].grad }} />
          <img src={SCENES[s].img} alt="" draggable={false}
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      ))}
    </div>
  )
}

// ─── Milo (per world) ────────────────────────────────────────────────────────────────
function MiloExplorer({ left, milo }: { left: number; milo: ShapeWorld['milo'] }) {
  const [step, setStep] = useState(0)
  return (
    <div style={{ position: 'fixed', left: `${left}%`, bottom: 0, transform: 'translateX(-50%)', zIndex: 26, width: 'min(36vh, 320px)', height: 'min(36vh, 320px)' }}>
      <div style={{ width: '100%', height: '100%', animation: 'st_float 3.4s ease-in-out infinite' }}>
        {step >= milo.srcs.length
          ? <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
              <span style={{ fontSize: 104, filter: 'drop-shadow(0 5px 8px rgba(0,0,0,.35))' }}>{milo.emoji}</span>
              <span style={{ position: 'absolute', bottom: 10, right: 14, fontSize: 44 }}>{milo.accessory}</span>
            </div>
          : <img src={milo.srcs[step]} alt="Milo the explorer" draggable={false} onError={() => setStep(s => s + 1)}
              style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'bottom', filter: 'drop-shadow(0 5px 8px rgba(0,0,0,.35))' }} />}
      </div>
    </div>
  )
}

// ─── A shape "thing" (the shape, dressed as a town object) ──────────────────────────
// Designed at THING_W×THING_H; `scale` blows the whole thing up uniformly so it grows
// with the viewport (never hard-coded px on a 100vw stage — see feedback-viewport-scaling).
// The shape sits in the top square; the scene's mount hangs in the band below it.
const THING_W = 112, DECO_H = 48, THING_H = THING_W + DECO_H
type ThingState = 'idle' | 'glow' | 'wrong' | 'picked'

// The scene-specific "mount" the shape becomes. All mounts hang BELOW the shape so the form
// stays unmistakable (recognition must read clearly).
function Decoration({ deco, scale }: { deco: DecoKind; scale: number }) {
  const band = DECO_H * scale
  const mid = { position: 'absolute' as const, left: '50%', transform: 'translateX(-50%)' }
  const wrap = { position: 'absolute' as const, left: 0, right: 0, top: THING_W * scale, height: band }
  switch (deco) {
    case 'balloon':   // a thin string + knot
      return (
        <div style={wrap}>
          <div style={{ ...mid, top: 0, width: 0, height: 0, borderLeft: `${4 * scale}px solid transparent`, borderRight: `${4 * scale}px solid transparent`, borderTop: `${7 * scale}px solid rgba(80,66,45,.55)` }} />
          <div style={{ ...mid, top: 6 * scale, width: Math.max(1.5, 2 * scale), height: band - 6 * scale, background: 'rgba(80,66,45,.5)', borderRadius: 2 }} />
        </div>
      )
    case 'kite':      // a tail with little bows
      return (
        <div style={wrap}>
          <div style={{ ...mid, top: 0, width: Math.max(1.5, 2 * scale), height: band, background: 'rgba(80,66,45,.5)', borderRadius: 2 }} />
          {[0.3, 0.6, 0.9].map((f, i) => (
            <div key={i} style={{ ...mid, top: band * f, width: 0, height: 0, borderTop: `${5 * scale}px solid transparent`, borderBottom: `${5 * scale}px solid transparent`, borderLeft: `${7 * scale}px solid #e58aa6`, marginLeft: -7 * scale }} />
          ))}
        </div>
      )
    case 'stem':      // a green stem + two leaves
      return (
        <div style={wrap}>
          <div style={{ ...mid, top: 0, width: Math.max(2.5, 4 * scale), height: band, background: '#5a9c3a', borderRadius: 3 }} />
          <div style={{ ...mid, top: band * 0.36, marginLeft: -10 * scale, width: 16 * scale, height: 9 * scale, background: '#6fbe3f', borderRadius: '60% 0 60% 0', transform: 'translateX(-50%) rotate(-18deg)' }} />
          <div style={{ ...mid, top: band * 0.5, marginLeft: 10 * scale, width: 16 * scale, height: 9 * scale, background: '#6fbe3f', borderRadius: '0 60% 0 60%', transform: 'translateX(-50%) rotate(18deg)' }} />
        </div>
      )
    case 'sign':      // a signpost the shape-sign sits on
      return (
        <div style={wrap}>
          <div style={{ ...mid, top: 0, width: 9 * scale, height: band, background: '#9c7b51', borderRadius: 3, boxShadow: 'inset -2px 0 0 rgba(0,0,0,.18)' }} />
          <div style={{ ...mid, bottom: 0, width: 26 * scale, height: 6 * scale, background: '#7d5f3a', borderRadius: 3 }} />
        </div>
      )
    case 'stick':     // a lollipop / candy stick
      return (
        <div style={wrap}>
          <div style={{ ...mid, top: 0, width: Math.max(3, 5 * scale), height: band, background: '#efe7d6', borderRadius: 4, boxShadow: 'inset -2px 0 0 rgba(0,0,0,.12)' }} />
        </div>
      )
    case 'ribbon':    // a prize rosette: knot at top + two ribbon tails
      return (
        <div style={wrap}>
          <div style={{ ...mid, top: 0, width: 14 * scale, height: 10 * scale, background: '#e6679a', borderRadius: '50%', boxShadow: 'inset 0 -2px 3px rgba(0,0,0,.18)' }} />
          <div style={{ ...mid, top: 7 * scale, marginLeft: -6 * scale, width: 9 * scale, height: band - 7 * scale, background: '#e6679a', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 78%, 0 100%)', transform: 'translateX(-50%) rotate(-9deg)' }} />
          <div style={{ ...mid, top: 7 * scale, marginLeft: 6 * scale, width: 9 * scale, height: band - 7 * scale, background: '#d4548a', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 78%, 0 100%)', transform: 'translateX(-50%) rotate(9deg)' }} />
        </div>
      )
    case 'flag':      // a flagpole planted in a small sand mound
      return (
        <div style={wrap}>
          <div style={{ ...mid, top: 0, width: Math.max(2.5, 4 * scale), height: band, background: '#b79356', borderRadius: 2 }} />
          <div style={{ ...mid, bottom: 0, width: 34 * scale, height: 12 * scale, background: 'radial-gradient(ellipse at center, #e9d3a0 0%, #d8bd83 75%, rgba(216,189,131,0) 100%)' }} />
        </div>
      )
    case 'boat':      // a boat hull (shape is the sail), with a short mast
      return (
        <div style={wrap}>
          <div style={{ ...mid, top: 0, width: Math.max(2, 3 * scale), height: band * 0.55, background: '#8a6a44', borderRadius: 2 }} />
          <div style={{ ...mid, bottom: 0, width: 46 * scale, height: 16 * scale, background: 'linear-gradient(#c45b3a,#a8472b)', borderRadius: `0 0 ${22 * scale}px ${22 * scale}px`, boxShadow: 'inset 0 2px 3px rgba(255,255,255,.18)' }} />
        </div>
      )
    case 'plate':     // a round plate the treat rests on
    default:
      return (
        <div style={wrap}>
          <div style={{ ...mid, bottom: 0, width: 56 * scale, height: 16 * scale, background: 'radial-gradient(ellipse at center, #ffffff 0%, #e7e2d8 70%, #d2ccbe 100%)', borderRadius: '50%', boxShadow: '0 2px 3px rgba(0,0,0,.12)' }} />
        </div>
      )
  }
}

function ShapeThing({ scene, name, state, scale, left, top, depth = 0.3, groundLine, onTap, aria }: {
  scene: SceneId; name: ShapeName; state: ThingState; scale: number
  left: number; top: number; depth?: number; groundLine: number; onTap?: () => void; aria: string
}) {
  // Farther things are a touch smaller (depth falloff) — the WHOLE thing (shape + its mount
  // band) shrinks together so the form-to-mount proportion is preserved.
  const ds = scale * (1 - depth * 0.22)
  const W = THING_W * ds, H = THING_H * ds
  const shapePx = THING_W * ds * 0.96
  const lit = state === 'glow' || state === 'picked'
  const onBoard = !!SCENES[scene].board
  // Contact shadow: a soft ellipse on the scene's ground line where the mount's foot touches.
  const shW = W * 0.58
  const shOp = Math.max(0.06, (0.26 - depth * 0.13) * (lit ? 0.5 : 1))
  return (
    <>
      <div aria-hidden style={{ position: 'fixed', left: `${left}%`, top: `${groundLine}%`, transform: 'translate(-50%,-50%)', zIndex: 28,
        width: shW, height: shW * 0.32, background: `radial-gradient(ellipse at center, rgba(38,28,18,${shOp}) 0%, rgba(38,28,18,0) 72%)`, pointerEvents: 'none' }} />
      <button onClick={onTap} disabled={!onTap} aria-label={aria}
        style={{ position: 'fixed', left: `${left}%`, top: `${top}%`, transform: 'translate(-50%,-50%)', zIndex: 30 + Math.round((1 - depth) * 6), width: W, height: H, padding: 0, border: 'none', background: 'transparent', cursor: onTap ? 'pointer' : 'default' }}>
        <Decoration deco={SCENES[scene].deco} scale={ds} />
        {/* Centering lives on this outer wrapper; the animation (which sets `transform`) lives on
            the inner div, so the sway/pop keyframes can't clobber the centering. The box width
            equals the button width, so left:0 + width keeps the shape centered over its mount. */}
        <div style={{ position: 'absolute', left: 0, top: 0, width: THING_W * ds, height: THING_W * ds, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '100%', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: state === 'wrong' ? 'st_shake .42s ease' : lit ? 'st_pop .45s ease' : 'st_sway 4s ease-in-out infinite',
          filter: lit ? 'drop-shadow(0 0 16px var(--garden-green)) drop-shadow(0 0 10px var(--garden-green))' : 'drop-shadow(0 6px 8px rgba(0,0,0,.22))' }}>
          {onBoard && (
            <div style={{ position: 'absolute', inset: `${6 * ds}px`, background: 'var(--paper)', borderRadius: 14 * ds, border: `${3 * ds}px solid #b88a52`, boxShadow: 'inset 0 2px 4px rgba(0,0,0,.1)' }} />
          )}
          <div style={{ position: 'relative', lineHeight: 0 }}>
            <ShapeSVG name={name} size={onBoard ? shapePx * 0.74 : shapePx} />
          </div>
        </div>
        </div>
      </button>
    </>
  )
}

// Base footprint top, used only by the scale clamp below (keep objects clear of Milo). Shapes
// sit a little higher than the door siblings because each shape has a mount band hanging BELOW
// it — the layout needs that headroom so the mount doesn't dangle off the bottom.
const THING_BASE_TOP = 50
// How big to draw the shapes — as large as fits given the count and viewport, CAPPED so a huge
// sprite never reads as oversized/crowded, narrow phones shrink to fit, and short viewports keep
// the whole thing (shape + mount band) above Milo's bottom-left sprite. One row only (max 4).
function useThingScale(n: number): number {
  const [scale, setScale] = useState(1.3)
  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth, h = window.innerHeight
      const byWidth = w * (n <= 2 ? 0.28 : n === 3 ? 0.22 : 0.175)        // horizontal room per shape
      const byHeight = (h * 0.42) / (THING_H / THING_W)                   // vertical room (keep aspect)
      const s = Math.min(byWidth, byHeight, THING_W * 1.5) / THING_W
      const miloTop = h - Math.min(0.36 * h, 320)
      const clearScale = ((miloTop - (THING_BASE_TOP / 100) * h) * 2) / THING_H
      setScale(Math.max(0.62, Math.min(s, clearScale)))
    }
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [n])
  return scale
}

// ─── Grounded, depth-aware placement ────────────────────────────────────────────────
// Each shape gets a small DEPTH (0 = near/front, 1 = far/back): farther shapes are a touch
// smaller and sit a little higher, and EVERY object casts a soft contact SHADOW on the scene's
// ground line below it. The shadow + depth scatter break the row and anchor the objects.
interface Placed { left: number; top: number; depth: number }
// A gentle, balanced depth scatter per shape count (centre nearest) — never a flat line.
const DEPTHS: Record<number, number[]> = { 1: [0.25], 2: [0.15, 0.6], 3: [0.5, 0.05, 0.7], 4: [0.7, 0.2, 0.45, 0.85] }
// Small deterministic x nudges so the columns aren't mechanically even.
const XJIT: Record<number, number[]> = { 1: [0], 2: [-2, 2], 3: [-1.5, 1.5, -1], 4: [-2, 1, -1.5, 2] }

// Per-object placement (left%, top%, depth). Shapes spread across but stay right of Milo's
// bottom-left column so a low object never collides.
function placeFor(n: number, scene: SceneId): Placed[] {
  const g = SCENES[scene].ground
  const xs = n <= 2 ? [36, 70] : n === 3 ? [27, 53, 79] : n === 4 ? [20, 42, 64, 87]
    : Array.from({ length: n }, (_, i) => 18 + (i * 70) / (n - 1))
  const depths = DEPTHS[n] ?? xs.map((_, i) => (i % 2 ? 0.55 : 0.2))
  const jit = XJIT[n] ?? xs.map(() => 0)
  return xs.map((x, i) => { const depth = depths[i] ?? 0.3; return { left: x + (jit[i] ?? 0), top: g.baseTop - depth * g.rise, depth } })
}

// ─── Round copy ──────────────────────────────────────────────────────────────────
function promptFor(d: ShapeRound): string { return `Find the ${SHAPES[d.options[d.answerIdx]].label}!` }
function sayFor(d: ShapeRound): string {
  const label = SHAPES[d.options[d.answerIdx]].label
  return `${SCENES[d.scene].intro} Can you find the ${label}? Tap the ${label}!`
}

// ─── The interactive play surface (guided / practice) ──────────────────────────────
type Mode = 'guided' | 'practice'
const ShapesPlay: React.FC<{ data: ShapeRound; mode: Mode; onComplete: (correct: boolean) => void }> = ({ data, mode, onComplete }) => {
  const { scene, options, answerIdx } = data
  const label = SHAPES[options[answerIdx]].label
  const n = options.length
  const slots = placeFor(n, scene)
  const groundLine = SCENES[scene].ground.groundLine
  const scale = useThingScale(n)
  const [pickedIdx, setPickedIdx] = useState<number | null>(null)
  const [wrongIdx, setWrongIdx] = useState<number | null>(null)
  const erred = useRef(false), done = useRef(false), wrongLock = useRef(false), tapLock = useRef(false)
  const speaking = useIsSpeaking()

  const finish = useCallback(() => {
    if (done.current) return; done.current = true
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
          left={slots[i].left} top={slots[i].top} depth={slots[i].depth} groundLine={groundLine} onTap={() => tap(i)} aria={`${SHAPES[name].label}`} />
      })}
    </>
  )
}

// ─── The teaching demo (opening preview + 3-wrong re-teach) ─────────────────────────
const ShapesExplain: React.FC<{ data: ShapeRound; onDone: () => void }> = ({ data, onDone }) => {
  const { scene, options, answerIdx } = data
  const label = SHAPES[options[answerIdx]].label
  const n = options.length
  const slots = placeFor(n, scene)
  const groundLine = SCENES[scene].ground.groundLine
  const scale = useThingScale(n)
  const [glow, setGlow] = useState(false)
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return; ran.current = true
    const lines = [
      `${SCENES[scene].intro} Milo is looking for the ${label}.`,
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
          left={slots[i].left} top={slots[i].top} depth={slots[i].depth} groundLine={groundLine} aria={`example ${SHAPES[name].label}`} />
      ))}
    </>
  )
}

// ─── The "meet every shape" showcase (opens the explanation) ────────────────────────
// Shows ALL six shapes at once and Milo names each in turn (it lights up). SELF-PACED on a
// deterministic timer — deliberately NOT driven by speech events (tying short single words to
// onstart/onend made them RACE on real devices). A fixed dwell per item keeps each shape shown
// + named for a full beat no matter how fast — or whether — speech fires.
const SHOWCASE_DWELL = 1500   // each item stays lit + named for this long
const ShapeShowcase: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const [lit, setLit] = useState(-1)
  const [px, setPx] = useState(104)
  const ran = useRef(false)
  useEffect(() => {
    const calc = () => setPx(Math.max(58, Math.min(window.innerWidth * 0.14, 120)))
    calc(); window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [])
  useEffect(() => {
    if (ran.current) return; ran.current = true
    const timers: Array<ReturnType<typeof setTimeout>> = []
    let cancelled = false
    speak('These are the shapes!')
    let t = 2000   // let the intro line finish before the first shape
    SHAPE_ORDER.forEach((s, i) => {
      timers.push(setTimeout(() => { if (cancelled) return; setLit(i); speak(SHAPES[s].label) }, t))
      t += SHOWCASE_DWELL
    })
    timers.push(setTimeout(() => { if (!cancelled) onDone() }, t + 600))
    return () => { cancelled = true; timers.forEach(clearTimeout) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '11% 4% 26%' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, auto)', columnGap: 'clamp(16px,4vw,56px)', rowGap: 'clamp(8px,2vw,24px)', justifyItems: 'center', alignItems: 'end' }}>
        {SHAPE_ORDER.map((s, i) => {
          const on = lit === i
          return (
            <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, transform: on ? 'scale(1.14)' : 'scale(1)', transition: 'transform .3s cubic-bezier(.34,1.56,.64,1)' }}>
              <div style={{ filter: on ? 'drop-shadow(0 0 14px var(--garden-green)) drop-shadow(0 0 9px var(--garden-green))' : 'drop-shadow(0 5px 7px rgba(0,0,0,.22))' }}>
                <ShapeSVG name={s} size={px} />
              </div>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(13px,2.2vw,20px)', color: 'var(--ink)', textTransform: 'capitalize', opacity: on ? 1 : 0.8 }}>{SHAPES[s].label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Value generation ──────────────────────────────────────────────────────────────
// Target cycles through all six shapes by round (full coverage, never the same two in a
// row). Difficulty grows the field (3 → 4 choices) and, at the top tier, GUARANTEES the
// look-alike twin is on screen so it's recognition, not guessing-by-elimination.
function makeShapeRound(world: ShapeWorld, d: 1 | 2 | 3, round: number): ShapeRound {
  const scene = world.scenes[round % world.scenes.length]
  const n = d === 1 ? 3 : 4
  const target = SHAPE_ORDER[round % SHAPE_ORDER.length]
  let pool = SHAPE_ORDER.filter(s => s !== target)
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
function makeShapeBeat(world: ShapeWorld): Beat<ShapeRound> {
  return {
    skillId: 'shapes', rounds: 10, reteachAfter: 3,
    // The place already changes EVERY round (via the bg cross-fade); a short "walk to the
    // next spot" pause every 3 rounds keeps it from feeling rushed.
    walkEvery: 3,
    make: (d, round = 0) => makeShapeRound(world, (d || 1) as 1 | 2 | 3, round),
    prompt: d => promptFor(d),
    say: d => sayFor(d),
    Play: ({ data, onSubmit }) => <ShapesPlay data={data} mode="practice" onComplete={onSubmit} />,
    Reteach: ({ data, onDone }) => <ShapesExplain data={data} onDone={onDone} />,
  }
}

// ─── Orchestrator ──────────────────────────────────────────────────────────────────
const ST_CSS = `
@keyframes st_float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
@keyframes st_sway { 0%,100%{transform:rotate(-2deg)} 50%{transform:rotate(2deg)} }
@keyframes st_pop { 0%{transform:scale(1)} 40%{transform:scale(1.12)} 100%{transform:scale(1)} }
@keyframes st_shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px) rotate(-2deg)} 75%{transform:translateX(6px) rotate(2deg)} }
`

type Phase = 'intro' | 'showcase' | 'demo' | 'guided' | 'practice'
export default function ShapeTown({ world: forcedWorldId, onFinish, onExit }: {
  world?: string
  onFinish?: (correct: number, wrong: number, mastered?: boolean) => void
  onExit?: () => void
}) {
  const router = useRouter()
  const [world, setWorld] = useState<ShapeWorld | null>(() => (forcedWorldId ? worldById(forcedWorldId) ?? null : null))
  const [phase, setPhase] = useState<Phase>('intro')
  const [scene, setScene] = useState<SceneId>('park')
  const [demoIdx, setDemoIdx] = useState(0)
  const result = useRef({ correct: 0, wrong: 0 })
  const finished = useRef(false)
  const exit = useCallback(() => { stopSpeech(); (onExit ?? (() => router.push('/menu')))() }, [router, onExit])

  const finishChapter = useCallback((c: number, w: number, mastered?: boolean) => {
    if (finished.current) return; finished.current = true
    stopSpeech()
    if (onFinish) onFinish(c, w, mastered); else exit()
  }, [onFinish, exit])

  const interlude = useCallback(() => new Promise<void>(res => window.setTimeout(res, 850)), [])
  const beat = useMemo(() => (world ? makeShapeBeat(world) : null), [world])

  if (!world || !beat) {
    return (
      <div style={{ position: 'relative', width: '100vw', height: '100dvh', overflow: 'hidden' }}>
        <WorldSelect title="Where shall we find the shapes?" worlds={PICK_WORLDS}
          onPick={(id) => { const w = worldById(id); if (w) { setScene(w.scenes[0]); setWorld(w) } }} onExit={exit} />
      </div>
    )
  }

  // Per-world demo + guided rounds, drawn from this world's scenes.
  const DEMO_ROUNDS: ShapeRound[] = [
    { scene: world.scenes[0], options: ['circle', 'triangle'], answerIdx: 1 },
    { scene: world.scenes[1] ?? world.scenes[0], options: ['square', 'circle', 'star'], answerIdx: 0 },
  ]
  const GUIDED_ROUND: ShapeRound = { scene: world.scenes[2] ?? world.scenes[0], options: ['triangle', 'circle'], answerIdx: 1 }
  const bgScene: SceneId = phase === 'practice' ? scene
    : phase === 'guided' ? GUIDED_ROUND.scene
    : phase === 'demo' ? DEMO_ROUNDS[demoIdx].scene
    : world.scenes[0]

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
      <Background scene={bgScene} scenes={world.scenes} />
      {TopBar}

      {phase === 'intro' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 45, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
          <div style={{ maxWidth: '74%', background: '#fff', border: '3px solid var(--outline)', borderRadius: 18, padding: '14px 20px', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19, color: 'var(--ink)', textAlign: 'center', boxShadow: '0 4px 0 rgba(61,37,22,.1)' }}>
            {world.intro}
          </div>
          <button onClick={() => { unlockSpeech(); setPhase('showcase') }}
            style={{ padding: '14px 38px', borderRadius: 50, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,var(--milo-orange),var(--milo-orange-deep))', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, boxShadow: '0 6px 16px rgba(242,107,44,.4)' }}>Let&apos;s explore! ▶</button>
        </div>
      )}

      {phase === 'showcase' && (<>{Banner('Meet the shapes!')}
        <ShapeShowcase onDone={() => setPhase('demo')} /></>)}

      {phase === 'demo' && (<>{Banner(`Find the shape Milo names  (${demoIdx + 1}/${DEMO_ROUNDS.length})`)}
        <ShapesExplain key={`demo${demoIdx}`} data={DEMO_ROUNDS[demoIdx]}
          onDone={() => { if (demoIdx + 1 < DEMO_ROUNDS.length) setDemoIdx(demoIdx + 1); else setPhase('guided') }} /></>)}

      {phase === 'guided' && (<>{Banner('Now you! Tap the shape Milo says')}
        <ShapesPlay key="guided" data={GUIDED_ROUND} mode="guided" onComplete={() => setPhase('practice')} /></>)}

      {phase === 'practice' && (
        <div style={{ position: 'absolute', top: 48, left: 0, right: 0, zIndex: 45, display: 'flex', justifyContent: 'center', padding: '0 12px' }}>
          <SkillBeat beat={beat} onInterlude={interlude}
            onRound={(data) => { if (data?.scene) setScene(data.scene as SceneId) }}
            onComplete={(c, w, mastered) => { result.current.correct += c; result.current.wrong += w; finishChapter(result.current.correct, result.current.wrong, mastered) }} />
        </div>
      )}

      {phase !== 'intro' && <MiloExplorer left={12} milo={world.milo} />}
    </div>
  )
}
