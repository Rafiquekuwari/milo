'use client'
/**
 * Chapter 7 — "Milo's Rainbow Town Walk", the COLOUR-recognition story (skill `colors`,
 * the old "Color Garden" drill reborn as story mode). Milo strolls through Rainbow Town,
 * where everything comes in every colour; each round he names a colour ("Can you find the
 * red balloon?") and the child taps the matching one. Told through THREE places that rotate
 * across the 10 adaptive rounds (one continuous SkillBeat — harder on a streak, easier when
 * struggling, re-teach after 3 wrong):
 *   🎈 Balloon Stand · 🚗 Toy Street · 🌷 Flower Market
 *
 * Difficulty grows the field (variation = progression):
 *   choices 3 → 4 · a look-alike colour (red/orange, blue/green…) is guaranteed at the
 *   hardest tier so it's recognition, not guessing-by-elimination.
 *
 * Each round shows the SAME object type in DIFFERENT colours, so the COLOUR is the only
 * variable being tested. The objects are pure code-drawn SVG filled with the round's hex —
 * NO art is needed (a code-drawn backdrop always shows; an optional <img> fades in on top if
 * the art exists). Mirrors story/ShapeTown.tsx (phases intro→demo→guided→practice, ONE
 * SkillBeat); wrapped by game/ColorGardenChapter.tsx.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { speak, speakSteps, useIsSpeaking, stopSpeech, unlockSpeech } from '@/lib/useMiloSpeaker'
import { SkillBeat, type Beat } from './StoryWorld'

// After a declaring tap, ignore further taps briefly — `useIsSpeaking()` only flips true
// ~100-150ms after speak(), so a fast second tap would slip through. Same lesson as
// ShapeTown/NumberDoors/Kitchen/RiverCrossing.
const SPEAK_LOCK_MS = 600
const shuffle = <T,>(a: T[]): T[] => a.slice().sort(() => Math.random() - 0.5)

// ─── Colours ───────────────────────────────────────────────────────────────────────
type ColorName = 'red' | 'yellow' | 'blue' | 'green' | 'orange' | 'purple'
// `deep` is a darker stroke so light fills (yellow especially) read against the backdrop.
const COLORS: Record<ColorName, { label: string; hex: string; deep: string }> = {
  red:    { label: 'red',    hex: '#E64545', deep: '#B5302F' },
  yellow: { label: 'yellow', hex: '#FFC93C', deep: '#D69A12' },
  blue:   { label: 'blue',   hex: '#3FA3EE', deep: '#2575B8' },
  green:  { label: 'green',  hex: '#5DB94B', deep: '#3C8B2F' },
  orange: { label: 'orange', hex: '#F2872C', deep: '#C25E13' },
  purple: { label: 'purple', hex: '#9B5FD6', deep: '#6E3CA8' },
}
// Target cycles through all six so every colour gets covered and no two rounds repeat in a row.
const COLOR_ORDER: ColorName[] = ['red', 'yellow', 'blue', 'green', 'orange', 'purple']
// The genuinely confusable partner for a 3–5 year old — seeded as a distractor at the hardest
// tier so the child must recognise the colour, not eliminate the odd one out.
const TWIN: Record<ColorName, ColorName> = {
  red: 'orange', orange: 'red', yellow: 'orange', green: 'blue', blue: 'green', purple: 'blue',
}

// ─── Scenes ────────────────────────────────────────────────────────────────────────
type Scene = 'balloons' | 'cars' | 'flowers'
interface ColorRound {
  scene: Scene
  options: ColorName[]   // colours shown, in display order (always includes the target)
  answerIdx: number      // index of the target colour
}
const SCENE_ORDER: Scene[] = ['balloons', 'cars', 'flowers']
function sceneForRound(round: number): Scene { return SCENE_ORDER[round % SCENE_ORDER.length] }

// The object noun for each scene — spoken ("find the red BALLOON") so the ask stays concrete.
const SCENE_NOUN: Record<Scene, string> = { balloons: 'balloon', cars: 'car', flowers: 'flower' }
// A short scene-flavour line so Milo "walks somewhere new" each round (spoken, not read).
const SCENE_INTRO: Record<Scene, string> = {
  balloons: 'Look at the balloons at the stand!',
  cars:     'Look at the toy cars on the street!',
  flowers:  'Look at the flowers at the market!',
}

// Painted-scene hooks: a code-drawn gradient always shows; an optional <img> fades in on
// top if the art exists (auto-upgrade), hiding itself on error.
const SCENE_BG: Record<Scene, { grad: string; img: string }> = {
  balloons: { grad: 'linear-gradient(#bfe7ff 0%, #d8f1e6 58%, #b6e29a 100%)', img: '/assets/backgrounds/rainbow_balloons.jpeg' },
  cars:     { grad: 'linear-gradient(#cfe8ff 0%, #eaf2f7 54%, #c9ccd1 100%)', img: '/assets/backgrounds/rainbow_street.jpeg' },
  flowers:  { grad: 'linear-gradient(#ffe7c9 0%, #fff1df 50%, #dcecca 100%)', img: '/assets/backgrounds/rainbow_market.jpeg' },
}

function Background({ scene }: { scene: Scene }) {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#e6f0f7' }}>
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
// INNER div — putting it on the positioned outer div would override its transform. Tries a
// painter sprite first (auto-upgrade), then the explorer/idle sprites, then an emoji.
function MiloWalker({ left }: { left: number }) {
  const [step, setStep] = useState(0)
  const srcs = ['/assets/characters/milo_painter.png', '/assets/characters/milo_explorer.png', '/assets/characters/milo_idle.png']
  return (
    <div style={{ position: 'fixed', left: `${left}%`, bottom: 0, transform: 'translateX(-50%)', zIndex: 26, width: 'min(36vh, 320px)', height: 'min(36vh, 320px)' }}>
      <div style={{ width: '100%', height: '100%', animation: 'rt_float 3.4s ease-in-out infinite' }}>
        {step >= srcs.length
          ? <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
              <span style={{ fontSize: 104, filter: 'drop-shadow(0 5px 8px rgba(0,0,0,.35))' }}>🐴</span>
              <span style={{ position: 'absolute', bottom: 10, right: 14, fontSize: 44 }}>🌈</span>
            </div>
          : <img src={srcs[step]} alt="Milo" draggable={false} onError={() => setStep(s => s + 1)}
              style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'bottom', filter: 'drop-shadow(0 5px 8px rgba(0,0,0,.35))' }} />}
      </div>
    </div>
  )
}

// ─── Optional painted greyscale object sprites (auto-upgrade) ────────────────────────
// If a greyscale PNG exists for a scene's object it is TINTED to the round's exact hex: a
// solid-colour fill is shaped by the sprite's alpha (its silhouette), then the greyscale art
// is multiplied back on top so its shading darkens the colour WITHOUT shifting the hue
// (white→full colour, grey→a darker shade). Keeping the colour in code — not baked into the
// PNG — is what lets ONE sprite serve all six colours and stay exactly consistent with the
// labels + the showcase. Falls back to the code-drawn SVG until the art exists.
const OBJECT_SRC: Record<Scene, string> = {
  balloons: '/assets/objects/rainbow_balloon.png',
  cars:     '/assets/objects/rainbow_car.png',
  flowers:  '/assets/objects/rainbow_flower.png',
}
const _objLoaded: Record<string, boolean> = {}
function usePaintedObject(src: string): boolean {
  const [, force] = useState(0)   // bump to re-render once the probe resolves
  useEffect(() => {
    if (src in _objLoaded) return                       // already known → render reads the cache
    const img = new Image()
    img.onload = () => { _objLoaded[src] = true; force(n => n + 1) }
    img.onerror = () => { _objLoaded[src] = false; force(n => n + 1) }
    img.src = src
  }, [src])
  return _objLoaded[src] ?? false   // read the module cache at render — always current for `src`
}

// ─── The recolorable object for each scene ──────────────────────────────────────────
// Painted greyscale sprite tinted to the hex when present; otherwise a code-drawn SVG in a
// 0 0 100 100 box (all three share the same square footprint and scaling).
function ObjectSVG({ scene, color, size }: { scene: Scene; color: ColorName; size: number }) {
  const { hex, deep } = COLORS[color]
  const painted = usePaintedObject(OBJECT_SRC[scene])
  if (painted) {
    const src = OBJECT_SRC[scene]
    const mask = {
      WebkitMaskImage: `url(${src})`, maskImage: `url(${src})`,
      WebkitMaskSize: 'contain', maskSize: 'contain',
      WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
      WebkitMaskPosition: 'center', maskPosition: 'center',
    } as const
    // `isolation:isolate` keeps the multiply blending within these two layers only (not the
    // scene behind). The fill is the EXACT hex; the greyscale art multiplies its shading on top.
    return (
      <div style={{ position: 'relative', width: size, height: size, isolation: 'isolate' }}>
        <div style={{ position: 'absolute', inset: 0, background: hex, ...mask }} />
        <img src={src} alt="" draggable={false}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', mixBlendMode: 'multiply' }} />
      </div>
    )
  }
  const common = { width: size, height: size, viewBox: '0 0 100 100' } as const
  if (scene === 'balloons') {
    return (
      <svg {...common}>
        <line x1="50" y1="74" x2="50" y2="97" stroke="#7a6b50" strokeWidth="2" />
        <ellipse cx="50" cy="40" rx="30" ry="34" fill={hex} stroke={deep} strokeWidth="2.5" />
        <path d="M50 72 l-6 9 h12 z" fill={hex} stroke={deep} strokeWidth="2" strokeLinejoin="round" />
        <ellipse cx="40" cy="29" rx="8" ry="12" fill="#fff" opacity="0.32" />
      </svg>
    )
  }
  if (scene === 'cars') {
    return (
      <svg {...common}>
        <path d="M30 52 q9 -20 23 -20 h8 q13 0 19 20 z" fill={hex} stroke={deep} strokeWidth="2.5" strokeLinejoin="round" />
        <rect x="42" y="36" width="20" height="13" rx="3" fill="#fff" opacity="0.55" />
        <rect x="12" y="50" width="76" height="24" rx="10" fill={hex} stroke={deep} strokeWidth="2.5" />
        <circle cx="33" cy="76" r="11" fill="#3a3a3a" /><circle cx="33" cy="76" r="4.5" fill="#cfcfcf" />
        <circle cx="67" cy="76" r="11" fill="#3a3a3a" /><circle cx="67" cy="76" r="4.5" fill="#cfcfcf" />
      </svg>
    )
  }
  // flowers — 8 petals in the colour, neutral cream centre (so the bloom colour is unambiguous)
  const petals: [number, number, number, number, number][] = [
    [50, 28, 12, 18, 0], [50, 72, 12, 18, 0], [28, 50, 18, 12, 0], [72, 50, 18, 12, 0],
    [35, 35, 12, 18, 45], [65, 35, 12, 18, -45], [35, 65, 12, 18, -45], [65, 65, 12, 18, 45],
  ]
  return (
    <svg {...common}>
      {petals.map(([cx, cy, rx, ry, rot], i) => (
        <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} fill={hex} stroke={deep} strokeWidth="1.5" transform={`rotate(${rot} ${cx} ${cy})`} />
      ))}
      <circle cx="50" cy="50" r="13" fill="#FFF4D6" stroke="#E0C48A" strokeWidth="2.5" />
    </svg>
  )
}

// ─── A colour "thing" (the scene's object, filled with the colour) ──────────────────
// Designed at THING×THING; `scale` blows the whole thing up uniformly so it grows with the
// viewport (never hard-coded px on a 100vw stage — see feedback-viewport-scaling).
const THING = 112
type ThingState = 'idle' | 'glow' | 'wrong' | 'picked'

function ColorThing({ scene, color, state, scale, left, top, depth = 0.3, groundLine, onTap, aria }: {
  scene: Scene; color: ColorName; state: ThingState; scale: number
  left: number; top: number; depth?: number; groundLine: number; onTap?: () => void; aria: string
}) {
  const box = THING * scale * (1 - depth * 0.22)   // farther objects are a touch smaller
  const lit = state === 'glow' || state === 'picked'
  const shW = box * 0.6
  const shOp = Math.max(0.06, (0.26 - depth * 0.13) * (lit ? 0.5 : 1))
  return (
    <>
      {/* Soft contact shadow on the scene's ground line — the main "it belongs here" cue. */}
      <div aria-hidden style={{ position: 'fixed', left: `${left}%`, top: `${groundLine}%`, transform: 'translate(-50%,-50%)', zIndex: 28,
        width: shW, height: shW * 0.32, background: `radial-gradient(ellipse at center, rgba(38,28,18,${shOp}) 0%, rgba(38,28,18,0) 72%)`, pointerEvents: 'none' }} />
      <button onClick={onTap} disabled={!onTap} aria-label={aria}
        style={{ position: 'fixed', left: `${left}%`, top: `${top}%`, transform: 'translate(-50%,-50%)', zIndex: 30 + Math.round((1 - depth) * 6), width: box, height: box, padding: 0, border: 'none', background: 'transparent', cursor: onTap ? 'pointer' : 'default' }}>
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: state === 'wrong' ? 'rt_shake .42s ease' : lit ? 'rt_pop .45s ease' : 'rt_sway 4s ease-in-out infinite',
          filter: lit ? 'drop-shadow(0 0 16px var(--garden-green)) drop-shadow(0 0 10px var(--garden-green))' : 'drop-shadow(0 5px 6px rgba(0,0,0,.16))' }}>
          <ObjectSVG scene={scene} color={color} size={box} />
        </div>
      </button>
    </>
  )
}

// Base footprint top, used only by the scale clamp below (keep objects clear of Milo).
const THING_BASE_TOP = 50
// How big to draw the objects — as large as fits given the count and viewport, CAPPED so a
// huge sprite never reads as oversized/crowded, narrow phones shrink to fit, and short
// viewports keep the object clear of Milo's bottom-left sprite.
function useThingScale(n: number, scene: Scene): number {
  const [scale, setScale] = useState(1.3)
  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth, h = window.innerHeight
      const byWidth = w * (n <= 2 ? 0.28 : n === 3 ? 0.22 : 0.175)        // horizontal room per object
      const byHeight = h * 0.42                                           // vertical room (square box)
      const s = Math.min(byWidth, byHeight, THING * 1.5) / THING
      if (scene === 'cars') { setScale(Math.max(0.62, s)); return }
      const miloTop = h - Math.min(0.36 * h, 320)
      const clearScale = ((miloTop - (THING_BASE_TOP / 100) * h) * 2) / THING
      setScale(Math.max(0.62, Math.min(s, clearScale)))
    }
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [n, scene])
  return scale
}

// ─── Grounded, depth-aware placement ────────────────────────────────────────────────
// Objects used to sit in a flat, evenly-spaced row at ONE height and ONE size — so they read
// as stickers pasted over the scene. Now each gets a small DEPTH (0 = near/front, 1 = far/back):
// farther objects are a touch smaller and sit a little higher, and EVERY object casts a soft
// contact SHADOW on the scene's ground line below it. The shadow + the depth scatter break the
// row and anchor the objects in the world. Tap targets stay big and never overlap.
interface Placed { left: number; top: number; depth: number }
// Per-scene ground tuning. baseTop = centre Y% of the NEAREST object; rise = how much higher the
// farthest sits; groundLine = where contact shadows fall (balloons hover well above theirs,
// flowers/cars sit just above theirs).
const SCENE_GROUND: Record<Scene, { baseTop: number; rise: number; groundLine: number }> = {
  balloons: { baseTop: 44, rise: 10, groundLine: 82 },
  cars:     { baseTop: 64, rise: 7,  groundLine: 75 },
  flowers:  { baseTop: 60, rise: 8,  groundLine: 73 },
}
// A gentle, balanced depth scatter per object count (centre nearest) — never a flat line.
const DEPTHS: Record<number, number[]> = { 1: [0.25], 2: [0.15, 0.6], 3: [0.5, 0.05, 0.7], 4: [0.7, 0.2, 0.45, 0.85] }
// Small deterministic x nudges so the columns aren't mechanically even.
const XJIT: Record<number, number[]> = { 1: [0], 2: [-2, 2], 3: [-1.5, 1.5, -1], 4: [-2, 1, -1.5, 2] }

// Per-object placement (left%, top%, depth). Cars group to Milo's right (the road); the others
// spread across but stay right of Milo's bottom-left column so a low object never collides.
// Always returns at least `n` entries so a lookup can never be undefined.
function placeFor(n: number, scene: Scene): Placed[] {
  const g = SCENE_GROUND[scene]
  const xs = scene === 'cars'
    ? (n <= 2 ? [46, 76] : n === 3 ? [34, 58, 82] : n === 4 ? [30, 50, 70, 90] : Array.from({ length: n }, (_, i) => 30 + (i * 60) / (n - 1)))
    : (n <= 2 ? [36, 68] : n === 3 ? [30, 54, 80] : n === 4 ? [24, 45, 65, 86] : Array.from({ length: n }, (_, i) => 22 + (i * 66) / (n - 1)))
  const depths = DEPTHS[n] ?? xs.map((_, i) => (i % 2 ? 0.55 : 0.2))
  const jit = XJIT[n] ?? xs.map(() => 0)
  return xs.map((x, i) => { const depth = depths[i] ?? 0.3; return { left: x + (jit[i] ?? 0), top: g.baseTop - depth * g.rise, depth } })
}

// ─── Round copy ──────────────────────────────────────────────────────────────────
function targetOf(d: ColorRound): { label: string; noun: string } {
  return { label: COLORS[d.options[d.answerIdx]].label, noun: SCENE_NOUN[d.scene] }
}
function promptFor(d: ColorRound): string { const t = targetOf(d); return `Find the ${t.label} ${t.noun}!` }
function sayFor(d: ColorRound): string {
  const t = targetOf(d)
  return `${SCENE_INTRO[d.scene]} Can you find the ${t.label} ${t.noun}? Tap the ${t.label} ${t.noun}!`
}

// ─── The interactive play surface (guided / practice) ──────────────────────────────
type Mode = 'guided' | 'practice'
const ColorsPlay: React.FC<{ data: ColorRound; mode: Mode; onComplete: (correct: boolean) => void }> = ({ data, mode, onComplete }) => {
  const { scene, options, answerIdx } = data
  const { label, noun } = targetOf(data)
  const n = options.length
  const slots = placeFor(n, scene)
  const groundLine = SCENE_GROUND[scene].groundLine
  const scale = useThingScale(n, scene)
  const [pickedIdx, setPickedIdx] = useState<number | null>(null)
  const [wrongIdx, setWrongIdx] = useState<number | null>(null)
  const erred = useRef(false), done = useRef(false), wrongLock = useRef(false), tapLock = useRef(false)
  const speaking = useIsSpeaking()

  const finish = useCallback(() => {
    if (done.current) return; done.current = true
    // Only the GUIDED round praises out loud here; in practice the SkillBeat speaks the
    // praise (double-speak was a voice-cut source in earlier chapters).
    if (mode === 'guided') speak(`Yes! The ${label} ${noun}! Great job!`)
    window.setTimeout(() => onComplete(mode === 'practice' ? !erred.current : true), 950)
  }, [mode, label, noun, onComplete])

  useEffect(() => {
    if (mode === 'guided') speak(`Now you! Find the ${label} ${noun}. Tap it!`)
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
      if (!wrongLock.current) { wrongLock.current = true; speak(`That ${noun} is ${COLORS[options[i]].label}. Find the ${label} ${noun}!`); window.setTimeout(() => { wrongLock.current = false }, 1300) }
      window.setTimeout(() => setWrongIdx(w => (w === i ? null : w)), 600)
    }
  }

  return (
    <>
      {options.map((color, i) => {
        const state: ThingState = pickedIdx === i ? 'picked' : wrongIdx === i ? 'wrong' : 'idle'
        return <ColorThing key={i} scene={scene} color={color} state={state} scale={scale}
          left={slots[i].left} top={slots[i].top} depth={slots[i].depth} groundLine={groundLine} onTap={() => tap(i)} aria={`${COLORS[color].label} ${SCENE_NOUN[scene]}`} />
      })}
    </>
  )
}

// ─── The teaching demo (opening preview + 3-wrong re-teach) ─────────────────────────
// Milo names the colour; the matching thing lights up. Timer-driven via speakSteps (lines
// chain on `end`, can never overlap), with the speakSteps watchdog so it can't hang.
const ColorsExplain: React.FC<{ data: ColorRound; onDone: () => void }> = ({ data, onDone }) => {
  const { scene, options, answerIdx } = data
  const { label, noun } = targetOf(data)
  const n = options.length
  const slots = placeFor(n, scene)
  const groundLine = SCENE_GROUND[scene].groundLine
  const scale = useThingScale(n, scene)
  const [glow, setGlow] = useState(false)
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return; ran.current = true
    const lines = [
      `${SCENE_INTRO[scene]} Milo is looking for the ${label} ${noun}.`,
      `The ${label} ${noun}! Can you see it?`,
      `There it is! The ${label} ${noun}.`,
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
      {options.map((color, i) => (
        <ColorThing key={i} scene={scene} color={color} state={i === answerIdx && glow ? 'glow' : 'idle'} scale={scale}
          left={slots[i].left} top={slots[i].top} depth={slots[i].depth} groundLine={groundLine} aria={`example ${COLORS[color].label} ${SCENE_NOUN[scene]}`} />
      ))}
    </>
  )
}

// ─── The "meet every colour" showcase (opens the explanation) ───────────────────────
// Shows ALL six colours at once and Milo names each in turn (it lights up). SELF-PACED on a
// deterministic timer — deliberately NOT driven by speech events. Tying the reveal to speakSeq's
// onstart/onend made the single short words ("red", "blue") RACE: on a real device onend fires in
// ~300ms, so the sequence blasted through all six and advanced the phase early (the reported "going
// fast without completing"). A fixed dwell per item (the documented "counting" pattern — the one
// case where fixed-timer speak() is safe, because the words are short with generous gaps) keeps each
// colour shown + named for a full beat no matter how fast — or whether — speech fires. If audio is
// blocked the visuals still pace deliberately and complete.
const SHOWCASE_DWELL = 1500   // each item stays lit + named for this long
const ColorShowcase: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const [lit, setLit] = useState(-1)
  const [px, setPx] = useState(110)
  const ran = useRef(false)
  useEffect(() => {
    const calc = () => setPx(Math.max(62, Math.min(window.innerWidth * 0.15, 124)))
    calc(); window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [])
  useEffect(() => {
    if (ran.current) return; ran.current = true
    const timers: Array<ReturnType<typeof setTimeout>> = []
    let cancelled = false
    speak('These are the colours!')
    let t = 2000   // let the intro line finish before the first colour
    COLOR_ORDER.forEach((c, i) => {
      timers.push(setTimeout(() => { if (cancelled) return; setLit(i); speak(COLORS[c].label) }, t))
      t += SHOWCASE_DWELL
    })
    timers.push(setTimeout(() => { if (!cancelled) onDone() }, t + 600))
    return () => { cancelled = true; timers.forEach(clearTimeout) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '11% 4% 26%' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, auto)', columnGap: 'clamp(16px,4vw,56px)', rowGap: 'clamp(8px,2vw,24px)', justifyItems: 'center', alignItems: 'end' }}>
        {COLOR_ORDER.map((c, i) => {
          const on = lit === i
          return (
            <div key={c} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, transform: on ? 'scale(1.14)' : 'scale(1)', transition: 'transform .3s cubic-bezier(.34,1.56,.64,1)' }}>
              <div style={{ filter: on ? 'drop-shadow(0 0 14px var(--garden-green)) drop-shadow(0 0 9px var(--garden-green))' : 'drop-shadow(0 5px 7px rgba(0,0,0,.22))' }}>
                <ObjectSVG scene="balloons" color={c} size={px} />
              </div>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(13px,2.2vw,20px)', color: COLORS[c].deep, textTransform: 'capitalize', opacity: on ? 1 : 0.8 }}>{COLORS[c].label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Value generation ──────────────────────────────────────────────────────────────
// Target cycles through all six colours by round (full coverage, never the same two in a
// row). Difficulty grows the field (3 → 4 choices) and, at the top tier, GUARANTEES the
// look-alike colour is on screen so it's recognition, not guessing-by-elimination.
function makeColorRound(d: 1 | 2 | 3, round: number): ColorRound {
  const scene = sceneForRound(round)
  const n = d === 1 ? 3 : 4
  const target = COLOR_ORDER[round % COLOR_ORDER.length]
  let pool = COLOR_ORDER.filter(c => c !== target)
  // Easiest tier: don't pit a colour against its look-alike twin.
  if (d === 1) pool = pool.filter(c => c !== TWIN[target])
  let distractors: ColorName[]
  const twin = TWIN[target]
  if (d >= 3 && pool.includes(twin)) {
    distractors = shuffle([twin, ...shuffle(pool.filter(c => c !== twin)).slice(0, n - 2)])
  } else {
    distractors = shuffle(pool).slice(0, n - 1)
  }
  const options = shuffle([target, ...distractors])
  return { scene, options, answerIdx: options.indexOf(target) }
}

// ─── The scored practice (SkillBeat) — one continuous adaptive sequence ────────────
export const rainbowTownBeat: Beat<ColorRound> = {
  skillId: 'colors', rounds: 10, reteachAfter: 3,
  // The place already changes EVERY round (via the bg cross-fade); a short "walk to the
  // next spot" pause every 3 rounds keeps it from feeling rushed.
  walkEvery: 3,
  make: (d, round = 0) => makeColorRound((d || 1) as 1 | 2 | 3, round),
  prompt: d => promptFor(d),
  say: d => sayFor(d),
  Play: ({ data, onSubmit }) => <ColorsPlay data={data} mode="practice" onComplete={onSubmit} />,
  Reteach: ({ data, onDone }) => <ColorsExplain data={data} onDone={onDone} />,
}

// ─── Orchestrator ──────────────────────────────────────────────────────────────────
// TWO teaching demos — different scenes — so the intro previews variety.
const DEMO_ROUNDS: ColorRound[] = [
  { scene: 'balloons', options: ['blue', 'red'],            answerIdx: 1 },
  { scene: 'cars',     options: ['green', 'yellow', 'blue'], answerIdx: 1 },
]
const GUIDED_ROUND: ColorRound = { scene: 'flowers', options: ['purple', 'orange'], answerIdx: 1 }

const RT_CSS = `
@keyframes rt_float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
@keyframes rt_sway { 0%,100%{transform:rotate(-2deg)} 50%{transform:rotate(2deg)} }
@keyframes rt_pop { 0%{transform:scale(1)} 40%{transform:scale(1.12)} 100%{transform:scale(1)} }
@keyframes rt_shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px) rotate(-2deg)} 75%{transform:translateX(6px) rotate(2deg)} }
`

type Phase = 'intro' | 'showcase' | 'demo' | 'guided' | 'practice'
export default function RainbowTown({ onFinish, onExit }: {
  onFinish?: (correct: number, wrong: number, mastered?: boolean) => void
  onExit?: () => void
}) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('intro')
  const [scene, setScene] = useState<Scene>('balloons')
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
  const bgScene: Scene = phase === 'practice' ? scene
    : phase === 'guided' ? GUIDED_ROUND.scene
    : phase === 'demo' ? DEMO_ROUNDS[demoIdx].scene
    : 'balloons'

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
      <style>{RT_CSS}</style>
      <Background scene={bgScene} />
      {TopBar}

      {phase === 'intro' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 45, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
          <div style={{ maxWidth: '74%', background: '#fff', border: '3px solid var(--outline)', borderRadius: 18, padding: '14px 20px', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19, color: 'var(--ink)', textAlign: 'center', boxShadow: '0 4px 0 rgba(61,37,22,.1)' }}>
            Milo is walking through <b>Rainbow Town</b>! Everything comes in every colour. <b>Listen</b> for the colour, then tap it. First, let&apos;s meet the colours!
          </div>
          <button onClick={() => { unlockSpeech(); setPhase('showcase') }}
            style={{ padding: '14px 38px', borderRadius: 50, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,var(--milo-orange),var(--milo-orange-deep))', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, boxShadow: '0 6px 16px rgba(242,107,44,.4)' }}>Let&apos;s explore! ▶</button>
        </div>
      )}

      {phase === 'showcase' && (<>{Banner('Meet the colours!')}
        <ColorShowcase onDone={() => setPhase('demo')} /></>)}

      {phase === 'demo' && (<>{Banner(`Find the colour Milo names  (${demoIdx + 1}/${DEMO_ROUNDS.length})`)}
        <ColorsExplain key={`demo${demoIdx}`} data={DEMO_ROUNDS[demoIdx]}
          onDone={() => { if (demoIdx + 1 < DEMO_ROUNDS.length) setDemoIdx(demoIdx + 1); else setPhase('guided') }} /></>)}

      {phase === 'guided' && (<>{Banner('Now you! Tap the colour Milo says')}
        <ColorsPlay key="guided" data={GUIDED_ROUND} mode="guided" onComplete={() => setPhase('practice')} /></>)}

      {phase === 'practice' && (
        <div style={{ position: 'absolute', top: 48, left: 0, right: 0, zIndex: 45, display: 'flex', justifyContent: 'center', padding: '0 12px' }}>
          <SkillBeat beat={rainbowTownBeat} onInterlude={interlude}
            onRound={(data) => { if (data?.scene) setScene(data.scene as Scene) }}
            onComplete={(c, w, mastered) => { result.current.correct += c; result.current.wrong += w; finishChapter(result.current.correct, result.current.wrong, mastered) }} />
        </div>
      )}

      {phase !== 'intro' && <MiloWalker left={12} />}
    </div>
  )
}
