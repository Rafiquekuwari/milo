'use client'
/**
 * Chapter 2 — "Milo's Number-Order Journey". The child picks ONE world, then orders
 * numbered objects smallest→biggest across that world's THREE scenes (a continuous
 * adaptive SkillBeat — harder on a streak, easier when struggling, re-explain after 3
 * wrong). The scene CHANGES EVERY round, so each question feels fresh.
 *
 *   🪨 River Crossing — 🪨 stepping stones · 🪷 lily pads · 🎣 catch the fish
 *   🚂 Train Yard     — 🚂 build the train · 🛒 line up the carts · 📦 order the crates
 *   ☁️ Sky Hop        — ☁️ hop the clouds · 🎈 order the balloons · ⭐ catch the stars
 *
 * BLEND is the rule: every numbered object sits naturally in its scene — stones/pads on
 * water (top-down), carts/crates on the yard ground (side-view), clouds/balloons up in
 * the sky — grounded with a contact shadow, sized to read big, never pasted-on.
 *
 * Three mechanics carry all nine scenes:
 *   • path   (top-down water): tap smallest→biggest, items slide into a stepping path, Milo hops across.
 *   • line   (side-view):      tap smallest→biggest, items roll/float into a line (a train trails its engine; carts/crates/clouds/balloons line up).
 *   • collect (side-view):     tap smallest→biggest, items are gathered into a bucket/basket.
 */
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { speak, speakSeq, useIsSpeaking, stopSpeech } from '@/lib/useMiloSpeaker'
import { SkillBeat, type Beat } from './StoryWorld'
import { seqLength } from '@/lib/adaptive'
import WorldSelect from './WorldSelect'

const SPEAK_LOCK_MS = 600
const shuffle = <T,>(a: T[]): T[] => {
  const r = a.slice()
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]] }
  return r
}
const rint = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))
const frac = (x: number) => x - Math.floor(x)
const seed = (i: number, s: number) => frac(Math.sin((i + 1) * s) * 43758.5453)

// Sprites are designed against a ~1000px-wide stage; scale by viewport width so they
// fill the same fraction of the screen at any size (and read BIG, not tiny/sparse).
const DESIGN_W = 1000
function useScale() {
  const [s, setS] = useState(1)
  useEffect(() => {
    const calc = () => setS(Math.max(0.8, Math.min(2.3, window.innerWidth / DESIGN_W)))
    calc(); window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [])
  return s
}

// ─── Scenes & Worlds ─────────────────────────────────────────────────────────────
type Scenario =
  | 'crossing' | 'lilypads' | 'fishing'   // River Crossing
  | 'train' | 'carts' | 'crates'          // Train Yard
  | 'clouds' | 'balloons' | 'stars'       // Sky Hop
type Mechanic = 'path' | 'line' | 'collect'

interface SceneCfg {
  bg: string; zoom?: boolean
  mech: Mechanic
  src: string; aria: string
  prompt: string; say: string
  // path: top-down water (stones/pads). nothing extra.
  // line: side-view; objects line up. baseW = sprite width @1000px, aspect = h/w.
  baseW?: number; aspect?: number; sky?: boolean; lineY?: number
  leaderSrc?: string; leaderEmoji?: string; leaderFlip?: boolean; milo?: boolean
  // collect: side-view; objects gathered into a container.
  itemAspect?: number; containerSrc?: string; collectorSrc?: string; collectorFallback?: string
  band?: { l0: number; l1: number; t0: number; t1: number }
  container?: { left: number; top: number }; collector?: { left: number; top: number }
}

const SCENE: Record<Scenario, SceneCfg> = {
  // River Crossing — top-down water; stones & pads sit ON the water, fish swim IN it.
  crossing: { bg: '/assets/backgrounds/River.jpeg', zoom: true, mech: 'path', src: '/assets/objects/stone_top.png', aria: 'stone',
    prompt: 'Put the stones in order — smallest first!', say: 'Order the stones! Smallest first.' },
  lilypads: { bg: '/assets/backgrounds/pond_top.jpeg', zoom: true, mech: 'path', src: '/assets/objects/lilypad.png', aria: 'lily pad',
    prompt: 'Hop the lily pads — smallest first!', say: 'Hop the lily pads! Smallest first.' },
  fishing: { bg: '/assets/backgrounds/fishing_bg.jpeg', mech: 'collect', src: '/assets/objects/fish.png', aria: 'fish', itemAspect: 0.72,
    containerSrc: '/assets/objects/bucket.png', collectorSrc: '/assets/characters/milo_fishing.png', collectorFallback: '/assets/characters/milo_idle.png',
    band: { l0: 40, l1: 94, t0: 58, t1: 92 }, container: { left: 22, top: 64 }, collector: { left: 29, top: 54 },
    prompt: 'Catch the fish — smallest first!', say: "Let's go fishing! Catch the smallest first." },
  // Train Yard — side-view ground; cars/carts/crates stand on the yard floor.
  train: { bg: '/assets/backgrounds/train_bg.jpeg', mech: 'line', src: '/assets/objects/train_car.png', aria: 'car', baseW: 190, aspect: 0.56, lineY: 70,
    leaderSrc: '/assets/objects/train_engine.png', leaderEmoji: '🚂',
    prompt: 'Build the train — smallest first!', say: "Let's build the train! Smallest first." },
  carts: { bg: '/assets/backgrounds/order_yard.png', mech: 'line', src: '/assets/objects/cart.png', aria: 'cart', baseW: 160, aspect: 0.74, lineY: 74, milo: true,
    prompt: 'Line up the carts — smallest first!', say: 'Line up the carts! Smallest first.' },
  crates: { bg: '/assets/backgrounds/order_depot.png', mech: 'line', src: '/assets/objects/crate.png', aria: 'crate', baseW: 138, aspect: 0.92, lineY: 76, milo: true,
    prompt: 'Order the crates — smallest first!', say: 'Order the crates! Smallest first.' },
  // Sky Hop — side-view sky; clouds & balloons float at altitude (no ground shadow).
  clouds: { bg: '/assets/backgrounds/sky.jpeg', mech: 'line', src: '/assets/objects/space_cloud.png', aria: 'cloud', baseW: 150, aspect: 0.7, sky: true, lineY: 42,
    prompt: 'Hop the clouds — smallest first!', say: 'Hop the clouds! Smallest first.' },
  balloons: { bg: '/assets/backgrounds/order_balloonsky.png', mech: 'line', src: '/assets/objects/balloon.png', aria: 'balloon', baseW: 116, aspect: 1.3, sky: true, lineY: 46,
    prompt: 'Order the balloons — smallest first!', say: 'Order the balloons! Smallest first.' },
  stars: { bg: '/assets/backgrounds/space_deepspace.png', mech: 'collect', src: '/assets/objects/star.png', aria: 'star', itemAspect: 1,
    containerSrc: '/assets/objects/basket.png', collectorSrc: '/assets/characters/milo_idle.png', collectorFallback: '/assets/characters/milo_idle.png',
    band: { l0: 30, l1: 92, t0: 16, t1: 56 }, container: { left: 24, top: 80 }, collector: { left: 31, top: 72 },
    prompt: 'Catch the stars — smallest first!', say: 'Catch the falling stars! Smallest first.' },
}

interface OrderWorld { id: string; label: string; emoji: string; scenes: Scenario[] }
const ORDER_WORLDS: OrderWorld[] = [
  { id: 'river', label: 'River Crossing', emoji: '🪨', scenes: ['crossing', 'lilypads', 'fishing'] },
  { id: 'train', label: 'Train Yard', emoji: '🚂', scenes: ['train', 'carts', 'crates'] },
  { id: 'sky', label: 'Sky Hop', emoji: '☁️', scenes: ['clouds', 'balloons', 'stars'] },
]
const worldById = (id: string) => ORDER_WORLDS.find(w => w.id === id)

// Painted scene backgrounds for the active world; cross-fade by opacity. Top-down water
// scenes are zoomed so the water fills the screen; side-view ones are shown as-is.
function Background({ scenario, scenes }: { scenario: Scenario; scenes: Scenario[] }) {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#86ca63' }}>
      {scenes.map(s => {
        const c = SCENE[s]
        return <img key={s} src={c.bg} alt="" draggable={false}
          onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = '0' }}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: c.zoom ? 'scale(1.4)' : 'none', transformOrigin: 'center', opacity: s === scenario ? 1 : 0, transition: 'opacity .6s ease' }} />
      })}
    </div>
  )
}

// ─── Grounding cues (shared) ─────────────────────────────────────────────────────
function depthFor(top: number): number { return Math.max(0, Math.min(1, (90 - top) / 80)) }
function ContactShadow({ left, top, w, depth, kind = 'ground', lit = false }: { left: number; top: number; w: number; depth: number; kind?: 'flat' | 'ground' | 'water'; lit?: boolean }) {
  const ar = kind === 'flat' ? 0.34 : 0.3
  const baseOp = kind === 'water' ? 0.16 : 0.24
  const op = Math.max(0.05, (baseOp - depth * 0.12) * (lit ? 0.5 : 1))
  const wMul = kind === 'flat' ? 0.62 : kind === 'water' ? 0.78 : 0.7
  const shW = w * wMul
  return (
    <div aria-hidden style={{ position: 'fixed', left: `${left}%`, top: `${top}%`, transform: 'translate(-50%,-50%)', zIndex: 25,
      width: shW, height: shW * ar, background: `radial-gradient(ellipse at center, rgba(38,28,18,${op}) 0%, rgba(38,28,18,0) 72%)`, pointerEvents: 'none',
      transition: 'left .5s cubic-bezier(.34,1.3,.64,1), top .5s cubic-bezier(.34,1.3,.64,1)' }} />
  )
}
// A readable number chip, used by the side-view (line/collect) items.
function NumChip({ d, n }: { d: number; n: number }) {
  return (
    <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 2,
      display: 'flex', minWidth: d, height: d, padding: `0 ${Math.round(d * 0.18)}px`, alignItems: 'center', justifyContent: 'center',
      background: 'var(--paper)', border: '3px solid var(--milo-orange)', borderRadius: 999,
      fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: d * 0.56, color: 'var(--milo-orange)', lineHeight: 1, boxShadow: '0 2px 5px rgba(0,0,0,.3)' }}>{n}</span>
  )
}

// ─── Top-down Milo + path geometry (River world) ────────────────────────────────
const NEAR = { left: 50, top: 93 }
const FAR = { left: 50, top: 7 }
function pathSlot(rank: number, n: number, horizontal = false) {
  if (horizontal) return { left: n <= 1 ? 50 : 9 + rank * (82 / (n - 1)), top: 46 }
  return { left: 50, top: n <= 1 ? 50 : 84 - rank * (70 / (n - 1)) }
}
function scatterPos(i: number) { return { left: 12 + seed(i, 12.9898) * 76, top: 24 + seed(i, 78.233) * 54 } }
function MiloTop({ left, top, size = 148 }: { left: number; top: number; size?: number }) {
  const [missing, setMissing] = useState(false)
  const sz = size * useScale()
  return (
    <div style={{ position: 'fixed', left: `${left}%`, top: `${top}%`, transform: 'translate(-50%,-50%)', zIndex: 40, width: sz, height: sz, transition: 'left .55s cubic-bezier(.34,1.3,.64,1), top .55s cubic-bezier(.34,1.3,.64,1)' }}>
      {missing
        ? <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'radial-gradient(circle at 50% 38%, #ffb066, #f26b2c)', border: '4px solid #fff', boxShadow: '0 4px 10px rgba(0,0,0,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38 }}>🐴</div>
        : <img src="/assets/characters/milo_top.png" alt="Milo" draggable={false} onError={() => setMissing(true)} style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,.35))' }} />}
    </div>
  )
}
// One tappable path item — a stone or lily pad on the water (top-down). Number on it.
function OrderItem({ n, left, top, placed, wrong, onTap, size = 124, src, aria }: { n: number; left: number; top: number; placed: boolean; wrong: boolean; onTap?: () => void; size?: number; src: string; aria: string }) {
  const [missing, setMissing] = useState(false)
  const depth = depthFor(top)
  const sz = size * useScale() * (1 - depth * 0.16)
  return (
    <>
      <ContactShadow left={left} top={top + 1.4} w={sz} depth={depth} kind="flat" lit={placed} />
      <button onClick={onTap} disabled={!onTap || placed} aria-label={`${aria} ${n}`}
        style={{ position: 'fixed', left: `${left}%`, top: `${top}%`, transform: `translate(-50%,-50%) ${wrong ? 'rotate(-6deg)' : ''}`, zIndex: 30 + Math.round((1 - depth) * 6),
          width: sz, height: sz, padding: 0, border: 'none', background: 'transparent', cursor: onTap && !placed ? 'pointer' : 'default',
          transition: 'left .5s cubic-bezier(.34,1.3,.64,1), top .5s cubic-bezier(.34,1.3,.64,1), transform .15s' }}>
        {missing
          ? <div style={{ width: '100%', height: '100%', borderRadius: '46% 46% 50% 50% / 56% 56% 44% 44%', background: placed ? '#a6dd84' : (wrong ? '#f3b0a0' : '#cabda9'), border: `4px solid ${placed ? '#6fbe3f' : (wrong ? '#d9512f' : '#9c8f7a')}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: sz * 0.42, color: '#3d2516' }}>{n}</div>
          : <div style={{ position: 'relative', width: '100%', height: '100%' }}>
              <img src={src} alt="" draggable={false} onError={() => setMissing(true)}
                style={{ width: '100%', height: '100%', objectFit: 'contain', filter: placed ? 'drop-shadow(0 0 12px rgba(111,190,63,.7))' : 'drop-shadow(0 4px 5px rgba(0,0,0,.4))' }} />
              <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: sz * 0.4, color: '#3d2516' }}>{n}</span>
            </div>}
      </button>
    </>
  )
}

// ─── path mechanic (River world: stones + lily pads) ────────────────────────────
type Mode = 'demo' | 'guided' | 'practice'
const CrossingPlay: React.FC<{ nums: number[]; mode: Mode; horizontal?: boolean; src: string; aria: string; onComplete: (correct: boolean) => void }> = ({ nums, mode, horizontal = false, src, aria, onComplete }) => {
  const sorted = useMemo(() => [...nums].sort((a, b) => a - b), [nums])
  const scatter = useMemo(() => nums.map((_, i) => scatterPos(i)), [nums])
  const [placed, setPlaced] = useState(0)
  const [wrong, setWrong] = useState<number | null>(null)
  const erred = useRef(false), done = useRef(false), wrongLock = useRef(false), tapLock = useRef(false)
  const speaking = useIsSpeaking()
  const n = sorted.length
  const size = horizontal ? (n >= 8 ? 78 : 92) : (n >= 5 ? 108 : 124)
  const near = horizontal ? { left: 4, top: 62 } : NEAR
  const far = horizontal ? { left: 96, top: 62 } : FAR

  const finish = useCallback(() => {
    if (done.current) return; done.current = true
    if (mode === 'guided') speak('You crossed! 🎉')
    window.setTimeout(() => onComplete(mode === 'practice' ? !erred.current : true), 1100)
  }, [mode, onComplete])

  useEffect(() => {
    if (mode === 'demo') {
      const words = ['Watch! Smallest to biggest.', ...sorted.map(String)]
      const cancel = speakSeq(words, { onWord: i => { if (i >= 1) setPlaced(i) }, onDone: () => window.setTimeout(finish, 500) })
      return () => cancel()
    }
    if (mode === 'guided') speak('Now you! Tap the smallest one first.')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function tap(v: number) {
    if (mode === 'demo' || done.current || speaking || tapLock.current) return
    if (v === sorted[placed]) {
      const np = placed + 1; setPlaced(np); setWrong(null)
      tapLock.current = true; speak(String(v)); window.setTimeout(() => { tapLock.current = false }, SPEAK_LOCK_MS)
      if (np === sorted.length) window.setTimeout(finish, 500)
    } else {
      if (mode === 'practice') erred.current = true
      setWrong(v)
      if (!wrongLock.current) { wrongLock.current = true; speak('Oops! Tap the smallest one.'); window.setTimeout(() => { wrongLock.current = false }, 1300) }
      window.setTimeout(() => setWrong(w => (w === v ? null : w)), 600)
    }
  }

  const lastSlot = placed > 0 ? pathSlot(placed - 1, n, horizontal) : null
  const miloPos = done.current ? far : lastSlot ? (horizontal ? { left: lastSlot.left, top: 64 } : { left: 50, top: lastSlot.top - 6 }) : near
  return (
    <>
      {nums.map((v, i) => {
        const rank = sorted.indexOf(v)
        const isPlaced = rank < placed
        if (mode === 'demo' && !isPlaced) return null
        const pos = isPlaced ? pathSlot(rank, n, horizontal) : scatter[i]
        return <OrderItem key={i} n={v} left={pos.left} top={pos.top} placed={isPlaced} wrong={wrong === v} size={size} src={src} aria={aria} onTap={mode === 'demo' ? undefined : () => tap(v)} />
      })}
      <MiloTop left={miloPos.left} top={miloPos.top} />
    </>
  )
}

// ─── Shared "tap smallest-first" logic (line + collect) ─────────────────────────
function useOrderTaps(nums: number[], onComplete: (correct: boolean) => void) {
  const sorted = useMemo(() => [...nums].sort((a, b) => a - b), [nums])
  const [placed, setPlaced] = useState(0)
  const [wrong, setWrong] = useState<number | null>(null)
  const erred = useRef(false), done = useRef(false), wrongLock = useRef(false), tapLock = useRef(false)
  const speaking = useIsSpeaking()
  function tap(v: number) {
    if (done.current || speaking || tapLock.current) return
    if (v === sorted[placed]) {
      const np = placed + 1; setPlaced(np); setWrong(null)
      tapLock.current = true; speak(String(v)); window.setTimeout(() => { tapLock.current = false }, SPEAK_LOCK_MS)
      if (np === sorted.length) { done.current = true; window.setTimeout(() => onComplete(!erred.current), 1000) }
    } else {
      erred.current = true; setWrong(v)
      if (!wrongLock.current) { wrongLock.current = true; speak('Oops! Smallest first.'); window.setTimeout(() => { wrongLock.current = false }, 1300) }
      window.setTimeout(() => setWrong(w => (w === v ? null : w)), 600)
    }
  }
  return { sorted, placed, wrong, done: done.current, tap }
}

// ─── line mechanic (Train Yard: train/carts/crates · Sky: clouds/balloons) ──────
const ANCHOR_X = 86
function Leader({ left, y, src, emoji }: { left: number; y: number; src: string; emoji: string }) {
  const [m, setM] = useState(false)
  const w = 250 * useScale(), h = w * 0.75
  return (
    <div style={{ position: 'fixed', left: `${left}%`, top: `${y}%`, transform: 'translate(-50%,-92%)', zIndex: 36, width: w, height: h }}>
      {m ? <div style={{ fontSize: 110, transform: 'scaleX(-1)' }}>{emoji}</div>
        : <img src={src} alt="" draggable={false} onError={() => setM(true)} style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 5px 7px rgba(0,0,0,.3))' }} />}
    </div>
  )
}
// A small Milo standing at the head of a ground line (carts/crates), so the scene isn't empty.
function CornerMilo({ left, y }: { left: number; y: number }) {
  const [m, setM] = useState(false)
  const h = 150 * useScale()
  return <img src={m ? '/assets/characters/milo_idle.png' : '/assets/characters/milo_idle.png'} alt="Milo" draggable={false} onError={() => setM(true)}
    style={{ position: 'fixed', left: `${left}%`, top: `${y}%`, transform: 'translate(-50%,-100%)', zIndex: 35, width: h * 0.8, height: h, objectFit: 'contain', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,.3))' }} />
}
function LineItem({ n, left, top, placed, wrong, onTap, c }: { n: number; left: number; top: number; placed: boolean; wrong: boolean; onTap: () => void; c: SceneCfg }) {
  const [m, setM] = useState(false)
  const depth = depthFor(top)
  const w = (c.baseW ?? 160) * useScale() * (1 - depth * 0.14), h = w * (c.aspect ?? 0.7)
  const anchor = c.sky ? 'translate(-50%,-50%)' : 'translate(-50%,-90%)'   // sky items float (center), ground items stand (bottom)
  const d = Math.round(w * 0.34)
  return (
    <>
      {!c.sky && <ContactShadow left={left} top={top + 0.6} w={w} depth={depth} kind="ground" lit={placed} />}
      <button onClick={onTap} disabled={placed} aria-label={`${c.aria} ${n}`}
        style={{ position: 'fixed', left: `${left}%`, top: `${top}%`, transform: `${anchor} ${wrong ? 'rotate(-5deg)' : ''}`, zIndex: 30 + Math.round((1 - depth) * 6), width: w, height: h, padding: 0, border: 'none', background: 'transparent', cursor: placed ? 'default' : 'pointer', transition: 'left .55s cubic-bezier(.34,1.3,.64,1), top .55s cubic-bezier(.34,1.3,.64,1), transform .15s' }}>
        {m
          ? <div style={{ width: '100%', height: '100%', borderRadius: 14, background: placed ? '#a6dd84' : '#4f9fd4', border: '4px solid #2e6e9e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: w * 0.3, color: '#fff' }}>{n}</div>
          : <div style={{ position: 'relative', width: '100%', height: '100%' }}>
              <img src={c.src} alt="" draggable={false} onError={() => setM(true)} style={{ width: '100%', height: '100%', objectFit: 'contain', filter: placed ? 'drop-shadow(0 0 10px rgba(111,190,63,.8))' : 'drop-shadow(0 3px 4px rgba(0,0,0,.35))' }} />
              <NumChip d={d} n={n} />
            </div>}
      </button>
    </>
  )
}
const LinePlay: React.FC<{ nums: number[]; c: SceneCfg; onSubmit: (correct: boolean) => void }> = ({ nums, c, onSubmit }) => {
  const { sorted, placed, wrong, tap } = useOrderTaps(nums, onSubmit)
  const n = sorted.length
  const lineY = c.lineY ?? 70
  const hasLeader = !!c.leaderSrc
  const scatter = useMemo(() => nums.map((_, i) => c.sky
    ? ({ left: 14 + seed(i, 12.9898) * 70, top: 16 + seed(i, 3.17) * 22 })
    : ({ left: 16 + seed(i, 12.9898) * 60, top: 24 + seed(i, 3.17) * 16 })), [nums, c.sky])
  const gap = Math.min(15, 64 / (n + 1))
  const anchorX = hasLeader ? ANCHOR_X : 88
  return (
    <>
      {hasLeader && <Leader left={anchorX} y={lineY} src={c.leaderSrc!} emoji={c.leaderEmoji ?? '🚂'} />}
      {c.milo && <CornerMilo left={94} y={lineY + 2} />}
      {nums.map((v, i) => {
        const rank = sorted.indexOf(v)
        const isPlaced = rank < placed
        const pos = isPlaced ? { left: anchorX - 13 - rank * gap, top: lineY } : scatter[i]
        return <LineItem key={i} n={v} left={pos.left} top={pos.top} placed={isPlaced} wrong={wrong === v} c={c} onTap={() => tap(v)} />
      })}
    </>
  )
}

// ─── collect mechanic (Fishing: fish→bucket · Sky: stars→basket) ────────────────
function Container({ src, left, top }: { src: string; left: number; top: number }) {
  const b = 118 * useScale()
  return <img src={src} alt="" draggable={false} style={{ position: 'fixed', left: `${left}%`, top: `${top}%`, transform: 'translate(-50%,-50%)', zIndex: 28, width: b, height: b, objectFit: 'contain', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,.3))' }} />
}
function Collector({ src, fallback, left, top }: { src: string; fallback: string; left: number; top: number }) {
  const [s, setS] = useState(src)
  const sz = 150 * useScale()
  return <img src={s} alt="Milo" draggable={false} onError={() => setS(fallback)} style={{ position: 'fixed', left: `${left}%`, top: `${top}%`, transform: 'translate(-50%,-50%)', zIndex: 27, width: sz, height: sz, objectFit: 'contain', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,.3))' }} />
}
function CollectItem({ n, left, top, caught, wrong, onTap, c }: { n: number; left: number; top: number; caught: boolean; wrong: boolean; onTap: () => void; c: SceneCfg }) {
  const [m, setM] = useState(false)
  const depth = depthFor(top)
  const w = 104 * useScale() * (1 - depth * 0.16), asp = c.itemAspect ?? 0.9
  const d = Math.round(w * 0.4)
  return (
    <>
      <div style={{ opacity: caught ? 0 : 1, transition: 'opacity .45s' }}>
        <ContactShadow left={left} top={top + 4.5} w={w} depth={depth} kind="water" />
      </div>
      <button onClick={onTap} disabled={caught} aria-label={`${c.aria} ${n}`}
        style={{ position: 'fixed', left: `${left}%`, top: `${top}%`, transform: `translate(-50%,-50%) ${wrong ? 'rotate(-8deg)' : ''}`, zIndex: 30 + Math.round((1 - depth) * 6), width: w, height: w * asp, padding: 0, border: 'none', background: 'transparent', cursor: caught ? 'default' : 'pointer', opacity: caught ? 0 : 1, transition: 'left .5s cubic-bezier(.34,1.3,.64,1), top .5s cubic-bezier(.34,1.3,.64,1), opacity .45s, transform .15s' }}>
        {m
          ? <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#ffd34d', border: '4px solid #e0a020', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: w * 0.4, color: '#7a5300' }}>{n}</div>
          : <div style={{ position: 'relative', width: '100%', height: '100%' }}>
              <img src={c.src} alt="" draggable={false} onError={() => setM(true)} style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 3px 4px rgba(0,0,0,.3))' }} />
              <span style={{ position: 'absolute', top: '-8%', left: '50%', transform: 'translateX(-50%)', background: '#fff', border: '3px solid var(--milo-orange)', borderRadius: '50%', width: d, height: d, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: d * 0.56, color: 'var(--milo-orange)' }}>{n}</span>
            </div>}
      </button>
    </>
  )
}
const CollectPlay: React.FC<{ nums: number[]; c: SceneCfg; onSubmit: (correct: boolean) => void }> = ({ nums, c, onSubmit }) => {
  const { sorted, placed, wrong, tap } = useOrderTaps(nums, onSubmit)
  const band = c.band ?? { l0: 40, l1: 94, t0: 58, t1: 92 }
  const scatter = useMemo(() => nums.map((_, i) => ({ left: band.l0 + seed(i, 12.9898) * (band.l1 - band.l0), top: band.t0 + seed(i, 3.17) * (band.t1 - band.t0) })), [nums, band.l0, band.l1, band.t0, band.t1])
  const container = c.container ?? { left: 22, top: 64 }
  const collector = c.collector ?? { left: 29, top: 54 }
  return (
    <>
      <Collector src={c.collectorSrc!} fallback={c.collectorFallback ?? '/assets/characters/milo_idle.png'} left={collector.left} top={collector.top} />
      <Container src={c.containerSrc!} left={container.left} top={container.top} />
      {nums.map((v, i) => {
        const caught = sorted.indexOf(v) < placed
        const pos = caught ? container : scatter[i]
        return <CollectItem key={i} n={v} left={pos.left} top={pos.top} caught={caught} wrong={wrong === v} c={c} onTap={() => tap(v)} />
      })}
    </>
  )
}

// ─── The scored practice (SkillBeat) — one continuous adaptive sequence ──────────
interface OrderData { nums: number[]; scenario: Scenario }
function makeRiverOrderBeat(world: OrderWorld): Beat<OrderData> {
  const scenes = world.scenes
  return {
    skillId: 'numberOrdering', rounds: 10, reteachAfter: 3,
    walkEvery: 3,
    make: (d, round = 0) => {
      const scenario = scenes[round % scenes.length]
      const diff = (d || 1) as 1 | 2 | 3
      const len = Math.min(5, seqLength(diff))
      let nums: number[]
      // The TRAIN is always a CONSECUTIVE series (1·2·3·4·5) — no skipped numbers.
      if (scenario === 'train') { const start = rint(1, 10 - len + 1); nums = Array.from({ length: len }, (_, i) => start + i) }
      else {
        const consecutive = diff === 1 ? true : diff === 2 ? Math.random() < 0.5 : Math.random() < 0.25
        if (consecutive) { const start = rint(1, 10 - len + 1); nums = Array.from({ length: len }, (_, i) => start + i) }
        else nums = shuffle(Array.from({ length: 10 }, (_, i) => i + 1)).slice(0, len)
      }
      return { nums: shuffle(nums), scenario }
    },
    prompt: d => SCENE[d.scenario].prompt,
    say: d => SCENE[d.scenario].say,
    Play: ({ data, onSubmit }) => {
      const c = SCENE[data.scenario]
      if (c.mech === 'path') return <CrossingPlay nums={data.nums} mode="practice" src={c.src} aria={c.aria} onComplete={onSubmit} />
      if (c.mech === 'line') return <LinePlay nums={data.nums} c={c} onSubmit={onSubmit} />
      return <CollectPlay nums={data.nums} c={c} onSubmit={onSubmit} />
    },
    // Re-teach is the universal "smallest→biggest" stone demo (concept, not scene-specific).
    Reteach: ({ data, onDone }) => <CrossingPlay nums={data.nums} mode="demo" horizontal src="/assets/objects/stone_top.png" aria="stone" onComplete={onDone} />,
  }
}

// ─── Orchestrator ──────────────────────────────────────────────────────────────
const ORDER_PICK_WORLDS = ORDER_WORLDS.map(w => ({ id: w.id, label: w.label, emoji: w.emoji, bgImage: SCENE[w.scenes[0]].bg }))

export default function RiverCrossing({ world: forcedWorldId, onFinish, onExit }: {
  world?: string
  onFinish?: (correct: number, wrong: number, mastered?: boolean) => void
  onExit?: () => void
}) {
  const router = useRouter()
  const [world, setWorld] = useState<OrderWorld | null>(() => (forcedWorldId ? worldById(forcedWorldId) ?? null : null))
  const [scenario, setScenario] = useState<Scenario>('crossing')
  const result = useRef({ correct: 0, wrong: 0 })
  const finished = useRef(false)
  const exit = useCallback(() => { stopSpeech(); (onExit ?? (() => router.push('/menu')))() }, [router, onExit])

  const finishChapter = useCallback((c: number, w: number, mastered?: boolean) => {
    if (finished.current) return; finished.current = true
    stopSpeech()
    if (onFinish) onFinish(c, w, mastered); else exit()
  }, [onFinish, exit])

  const beat = useMemo(() => (world ? makeRiverOrderBeat(world) : null), [world])
  const interlude = useCallback(() => new Promise<void>(res => window.setTimeout(res, 850)), [])

  const TopBar = (
    <div style={{ position: 'absolute', top: 12, left: 14, right: 14, display: 'flex', alignItems: 'center', zIndex: 50 }}>
      <button onClick={exit} style={{ padding: '7px 14px', borderRadius: 50, background: 'var(--paper)', border: '3px solid var(--milo-orange)', color: 'var(--milo-orange)', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>← Menu</button>
    </div>
  )

  if (!world || !beat) {
    return (
      <div style={{ position: 'relative', width: '100vw', height: '100dvh', overflow: 'hidden' }}>
        <WorldSelect title="Where shall we count in order?" worlds={ORDER_PICK_WORLDS}
          onPick={(id) => { const w = worldById(id); if (w) { setScenario(w.scenes[0]); setWorld(w) } }}
          onExit={exit} />
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100dvh', overflow: 'hidden' }}>
      <Background scenario={scenario} scenes={world.scenes} />
      {TopBar}
      <div style={{ position: 'absolute', top: 48, left: 0, right: 0, zIndex: 45, display: 'flex', justifyContent: 'center', padding: '0 12px' }}>
        <SkillBeat beat={beat} onInterlude={interlude}
          onRound={(data) => { if (data?.scenario) setScenario(data.scenario) }}
          onComplete={(c, w, mastered) => { result.current.correct += c; result.current.wrong += w; finishChapter(result.current.correct, result.current.wrong, mastered) }} />
      </div>
    </div>
  )
}
