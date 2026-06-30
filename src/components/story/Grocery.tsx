'use client'
/**
 * Chapter 5 — number↔QUANTITY / cardinality (skill `matchingQuantities`). An order asks for
 * EXACTLY N of one item; the child taps items off the shelf INTO/ONTO a container (each tap
 * counts aloud), fixes miscounts with "put one back", then serves — correct only at exactly N.
 * The real skill is to STOP at N. The child PICKS one of three worlds; in each, the same skill
 * is dressed differently and the scene rotates across the 10 adaptive rounds (one continuous
 * SkillBeat — harder on a streak, gentler when struggling, re-teach after 3 wrong):
 *   🛒 Little Grocery — fill the bag        (produce · bakery · deli · flowers · sweets)
 *   🍕 Pizza Parlor   — top the pizza, bake (olive · mushroom · pepper)
 *   🌻 Flower Garden  — plant the flowers   (tulip · daisy · sunflower)
 *
 * BLEND: items rest on a wooden shelf (contact shadow), and the picked items go where they
 * belong — into the bag, scattered ON the pizza, or planted standing on the green grass (no
 * 3D container — each flower stands with a soft contact shadow). Difficulty (the count) ramps
 * 1–3 → 3–6 → 6–10; harder rounds leave more spare items so the child must count and STOP.
 * Wrapped by game/MatchingQuantitiesChapter.tsx.
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { speak, speakSteps, stopSpeech } from '@/lib/useMiloSpeaker'
import { SkillBeat, type Beat } from './StoryWorld'
import { matchTarget } from '@/lib/adaptive'
import WorldSelect from './WorldSelect'

const rint = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))

// ─── Scenes & Worlds ───────────────────────────────────────────────────────────────
type Scene =
  | 'produce' | 'bakery' | 'deli' | 'flowers' | 'sweets'   // Little Grocery
  | 'olive' | 'mushroom' | 'pepper'                        // Pizza Parlor
  | 'tulip' | 'daisy' | 'sunflower'                        // Flower Garden
type CType = 'bag' | 'pizza' | 'ground'

interface SceneCfg {
  noun: string; nounPlural: string; item: string; itemImg: string; customer: string
  container: string                         // the spoken word ("bag" / "pizza" / "box")
  cType: CType; containerImg?: string       // how the container renders
  bg: { grad: string; img: string }
  bbox?: { W: number; H: number; x: number; y: number; w: number; h: number }
}
const SCENE: Record<Scene, SceneCfg> = {
  // Little Grocery (code-drawn bag)
  produce: { noun: 'apple', nounPlural: 'apples', item: '🍎', itemImg: '/assets/objects/apple.png', customer: '🐰', container: 'bag', cType: 'bag', bg: { grad: 'linear-gradient(#dff0c8 0%, #eaf7d6 52%, #cfe9a8 100%)', img: '/assets/backgrounds/grocery_produce.jpeg' }, bbox: { W: 1536, H: 1024, x: 526, y: 205, w: 498, h: 573 } },
  bakery:  { noun: 'bun', nounPlural: 'buns', item: '🥐', itemImg: '/assets/objects/grocery_bun.png', customer: '🐻', container: 'box', cType: 'bag', bg: { grad: 'linear-gradient(#ffe9c4 0%, #ffe0b0 55%, #f3c483 100%)', img: '/assets/backgrounds/grocery_bakery.jpeg' } },
  deli:    { noun: 'egg', nounPlural: 'eggs', item: '🥚', itemImg: '/assets/objects/grocery_egg.png', customer: '🐱', container: 'carton', cType: 'bag', bg: { grad: 'linear-gradient(#eef3f7 0%, #e6eef5 55%, #d4e2ee 100%)', img: '/assets/backgrounds/grocery_deli.jpeg' } },
  flowers: { noun: 'flower', nounPlural: 'flowers', item: '🌷', itemImg: '/assets/objects/grocery_flower.png', customer: '🐭', container: 'bouquet', cType: 'bag', bg: { grad: 'linear-gradient(#ffe6f0 0%, #fdeef6 55%, #e7f3d8 100%)', img: '/assets/backgrounds/grocery_flowers.jpeg' } },
  sweets:  { noun: 'candy', nounPlural: 'candies', item: '🍬', itemImg: '/assets/objects/grocery_candy.png', customer: '🦔', container: 'cone', cType: 'bag', bg: { grad: 'linear-gradient(#ffe3f3 0%, #f3e0ff 55%, #d8ecff 100%)', img: '/assets/backgrounds/grocery_sweets.jpeg' } },
  // Pizza Parlor (toppings scatter ON the pizza base)
  olive:     { noun: 'olive', nounPlural: 'olives', item: '🫒', itemImg: '/assets/objects/topping_olive.png', customer: '🐺', container: 'pizza', cType: 'pizza', containerImg: '/assets/objects/pizza_base.png', bg: { grad: 'linear-gradient(#ffe9c4 0%, #ffe0b0 55%, #e6c89a 100%)', img: '/assets/backgrounds/pizzeria.png' } },
  mushroom:  { noun: 'mushroom', nounPlural: 'mushrooms', item: '🍄', itemImg: '/assets/objects/topping_mushroom.png', customer: '🐯', container: 'pizza', cType: 'pizza', containerImg: '/assets/objects/pizza_base.png', bg: { grad: 'linear-gradient(#ffe9c4 0%, #ffe0b0 55%, #e6c89a 100%)', img: '/assets/backgrounds/pizzeria.png' } },
  pepper:    { noun: 'pepper', nounPlural: 'peppers', item: '🫑', itemImg: '/assets/objects/topping_pepper.png', customer: '🐮', container: 'pizza', cType: 'pizza', containerImg: '/assets/objects/pizza_base.png', bg: { grad: 'linear-gradient(#ffe9c4 0%, #ffe0b0 55%, #e6c89a 100%)', img: '/assets/backgrounds/pizzeria.png' } },
  // Flower Garden (flowers planted standing in a soil bed — no 3D container, no float)
  tulip:     { noun: 'tulip', nounPlural: 'tulips', item: '🌷', itemImg: '/assets/objects/flower_tulip.png', customer: '🐰', container: 'garden', cType: 'ground', bg: { grad: 'linear-gradient(#bfe7ff 0%, #d8f1e6 44%, #9ad06a 100%)', img: '/assets/backgrounds/garden_meadow.png' } },
  daisy:     { noun: 'daisy', nounPlural: 'daisies', item: '🌼', itemImg: '/assets/objects/flower_daisy.png', customer: '🐭', container: 'garden', cType: 'ground', bg: { grad: 'linear-gradient(#bfe7ff 0%, #dceee0 44%, #9ad06a 100%)', img: '/assets/backgrounds/garden_fence.png' } },
  sunflower: { noun: 'sunflower', nounPlural: 'sunflowers', item: '🌻', itemImg: '/assets/objects/flower_sunflower.png', customer: '🐻', container: 'garden', cType: 'ground', bg: { grad: 'linear-gradient(#bfe7ff 0%, #d8f1e6 44%, #9ad06a 100%)', img: '/assets/backgrounds/garden_park.png' } },
}

interface ShopWorld {
  id: string; label: string; emoji: string
  scenes: Scene[]
  milo: { src: string; emoji: string; accessory: string }
  verbLabel: string; verbEmoji: string   // the serve button ("Ring it up" / "Bake it!" / "Pack it!")
  prep: 'in' | 'on'                      // "put N {prep} the {container}"
  intro: string
}
const WORLDS: ShopWorld[] = [
  { id: 'grocery', label: "Little Grocery", emoji: '🛒', scenes: ['produce', 'bakery', 'deli', 'flowers', 'sweets'],
    milo: { src: '/assets/characters/milo_grocer.png', emoji: '🦊', accessory: '🛒' }, verbLabel: 'Ring it up!', verbEmoji: '🔔', prep: 'in',
    intro: "Milo's shop is open! Each customer wants EXACTLY some things — tap them into the bag and ring the bell. First, watch Milo!" },
  { id: 'pizza', label: "Pizza Parlor", emoji: '🍕', scenes: ['olive', 'mushroom', 'pepper'],
    milo: { src: '/assets/characters/milo_chef.png', emoji: '🦊', accessory: '🍕' }, verbLabel: 'Bake it!', verbEmoji: '🔥', prep: 'on',
    intro: "Milo's pizzeria is open! Each order wants EXACTLY some toppings — tap them onto the pizza, then bake it. First, watch Milo!" },
  { id: 'garden', label: "Flower Garden", emoji: '🌻', scenes: ['tulip', 'daisy', 'sunflower'],
    milo: { src: '/assets/characters/milo_idle.png', emoji: '🐴', accessory: '🌻' }, verbLabel: 'Plant it!', verbEmoji: '🌱', prep: 'in',
    intro: "Milo's garden is open! Each order wants EXACTLY some flowers — tap them into the flower bed, then plant them. First, watch Milo!" },
]
const worldById = (id: string) => WORLDS.find(w => w.id === id)
const PICK_WORLDS = WORLDS.map(w => ({ id: w.id, label: w.label, emoji: w.emoji, bgImage: SCENE[w.scenes[0]].bg.img }))

interface OrderRound { scene: Scene; target: number; shelf: number }
const qty = (n: number, cfg: SceneCfg) => `${n} ${n === 1 ? cfg.noun : cfg.nounPlural}`

function Background({ scene, scenes }: { scene: Scene; scenes: Scene[] }) {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#f3ead8' }}>
      {scenes.map(s => (
        <div key={s} style={{ position: 'absolute', inset: 0, opacity: s === scene ? 1 : 0, transition: 'opacity .6s ease' }}>
          <div style={{ position: 'absolute', inset: 0, background: SCENE[s].bg.grad }} />
          <img src={SCENE[s].bg.img} alt="" draggable={false}
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      ))}
    </div>
  )
}

function MiloHost({ left, milo }: { left: number; milo: ShopWorld['milo'] }) {
  const [step, setStep] = useState(0)
  const srcs = [milo.src, '/assets/characters/milo_idle.png']
  return (
    <div style={{ position: 'fixed', left: `${left}%`, bottom: 0, transform: 'translateX(-50%)', zIndex: 26, width: 'min(34vh, 300px)', height: 'min(34vh, 300px)' }}>
      <div style={{ width: '100%', height: '100%', animation: 'gr_float 3.4s ease-in-out infinite' }}>
        {step >= srcs.length
          ? <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
              <span style={{ fontSize: 100, filter: 'drop-shadow(0 5px 8px rgba(0,0,0,.35))' }}>{milo.emoji}</span>
              <span style={{ position: 'absolute', bottom: 14, right: 16, fontSize: 44 }}>{milo.accessory}</span>
            </div>
          : <img src={srcs[step]} alt="Milo" draggable={false} onError={() => setStep(s => s + 1)}
              style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'bottom', filter: 'drop-shadow(0 5px 8px rgba(0,0,0,.35))' }} />}
      </div>
    </div>
  )
}

// ─── An item sprite (painted PNG if present, else the scene's emoji) ────────────────
function Item({ cfg, size }: { cfg: SceneCfg; size: string }) {
  const [missing, setMissing] = useState(false)
  if (missing) return <span style={{ fontSize: size, lineHeight: 1, filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.2))' }}>{cfg.item}</span>
  if (cfg.bbox) {
    const b = cfg.bbox
    const FILL = 0.86
    const bgH = ((b.H / b.h) * FILL * 100).toFixed(1)
    const cx = (((b.x + b.w / 2) / b.W) * 100).toFixed(1)
    const cy = (((b.y + b.h / 2) / b.H) * 100).toFixed(1)
    return <span style={{ display: 'block', width: size, height: size, backgroundImage: `url(${cfg.itemImg})`, backgroundSize: `auto ${bgH}%`, backgroundPosition: `${cx}% ${cy}%`, backgroundRepeat: 'no-repeat', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.2))' }} />
  }
  return <img src={cfg.itemImg} alt="" draggable={false} onError={() => setMissing(true)}
    style={{ width: size, height: size, objectFit: 'contain', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.2))' }} />
}

// ─── A shelf item, GROUNDED on the wooden ledge ─────────────────────────────────────
function ShelfItem({ cfg, size, i, onPick }: { cfg: SceneCfg; size: string; i: number; onPick?: () => void }) {
  const back = i % 2 === 1
  const depth = back ? 0.5 : 0.12
  const lift = back ? 0.5 : 0
  const jx = [-1.4, 1.1, -0.6, 1.6, -1.1, 0.7][i % 6]
  const shOp = 0.24 - depth * 0.12
  const shW = `calc(${size} * 0.66)`
  const inner = (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center',
      transform: `translate(${jx}px, ${-lift}vmin) scale(${1 - depth * 0.14})`, zIndex: back ? 1 : 2, transformOrigin: 'bottom center' }}>
      <Item cfg={cfg} size={size} />
      <div aria-hidden style={{ width: shW, height: `calc(${shW} * 0.3)`, marginTop: '0.4vmin',
        background: `radial-gradient(ellipse at center, rgba(38,28,18,${shOp.toFixed(2)}) 0%, rgba(38,28,18,0) 72%)`, pointerEvents: 'none' }} />
    </div>
  )
  return onPick
    ? <button onClick={onPick} aria-label={`take ${cfg.noun}`} style={bareBtn}>{inner}</button>
    : <span style={{ lineHeight: 0 }}>{inner}</span>
}

// ─── The container the order fills into (bag / pizza / box). NO running count shown. ─
// Radial spots for toppings ON the pizza disk (centre-out, never overlapping the crust).
const PIZZA_SPOTS: Array<[number, number]> = [
  [0, -2], [-22, -16], [22, -14], [-26, 12], [24, 14], [0, 26], [-4, -28], [-34, -2], [34, 0], [2, 4],
]
function Container({ cfg, picked }: { cfg: SceneCfg; picked: number }) {
  if (cfg.cType === 'pizza') {
    return (
      <div style={{ position: 'relative', width: 'clamp(150px, 27vmin, 290px)', height: 'clamp(150px, 27vmin, 290px)' }}>
        <img src={cfg.containerImg} alt="" draggable={false} onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = '0.001' }}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 6px 8px rgba(0,0,0,.25))' }} />
        {Array.from({ length: picked }).map((_, i) => {
          const [x, y] = PIZZA_SPOTS[i % PIZZA_SPOTS.length]
          return <span key={i} style={{ position: 'absolute', left: `${50 + x}%`, top: `${50 + y}%`, transform: 'translate(-50%,-50%)', animation: 'gr_pop .3s ease both' }}>
            <Item cfg={cfg} size="clamp(22px, 4vmin, 46px)" />
          </span>
        })}
      </div>
    )
  }
  // ('ground' / flower garden is rendered directly by <Stage> as a scatter on the grass —
  //  no container box — so it never reaches here.)
  // bag (grocery) — code-drawn
  return (
    <div style={{ position: 'relative', width: 'clamp(118px, 21vmin, 230px)', height: 'clamp(128px, 23vmin, 250px)' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: '20%', borderRadius: '7% 7% 13% 13%', background: 'linear-gradient(#ecc89a,#d2a86f)', border: '4px solid #b07f44', overflow: 'hidden',
        boxShadow: 'inset 0 6px 12px rgba(255,255,255,.25), inset 0 -8px 14px rgba(0,0,0,.18)', display: 'flex', flexWrap: 'wrap', alignContent: 'flex-end', justifyContent: 'center', gap: '0.5vmin', padding: '7% 6% 6%' }}>
        {Array.from({ length: picked }).map((_, i) => (
          <span key={i} style={{ display: 'inline-block', animation: 'gr_pop .3s ease both' }}><Item cfg={cfg} size="clamp(24px, 4.4vmin, 50px)" /></span>
        ))}
      </div>
      <div style={{ position: 'absolute', left: '-2%', right: '-2%', top: '12%', height: '15%', background: 'linear-gradient(#f2d4a6,#e3bd86)', borderRadius: 6, border: '4px solid #b07f44' }} />
    </div>
  )
}

function OrderTicket({ cfg, target }: { cfg: SceneCfg; target: number }) {
  return (
    <div style={{ position: 'relative', background: 'var(--paper)', border: '4px solid var(--milo-orange)', borderRadius: 16, padding: 'clamp(6px,1.3vmin,14px) clamp(14px,2.4vmin,26px)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2vh', boxShadow: '0 5px 0 rgba(242,107,44,.25)' }}>
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(46px,9.5vmin,104px)', color: 'var(--ink)', lineHeight: 1 }}>{target}</span>
      <Item cfg={cfg} size="clamp(28px,5vmin,58px)" />
    </div>
  )
}

const bareBtn: React.CSSProperties = { border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', lineHeight: 0 }

// ─── Flower Garden: planted flowers scattered on the green ground ───────────────────
// No container — each planted flower just stands on the grass at a scattered spot with a
// soft contact shadow at its base (depth: higher up = a touch smaller/farther). Big blooms.
// Order alternates near/far + left/right so even 2–4 flowers read as scattered across the
// open grass (not a single tidy row near the shelf).
const GROUND_SPOTS: Array<{ l: number; t: number }> = [
  { l: 44, t: 79 }, { l: 68, t: 67 }, { l: 86, t: 81 }, { l: 33, t: 70 }, { l: 58, t: 85 },
  { l: 80, t: 71 }, { l: 91, t: 84 }, { l: 50, t: 74 }, { l: 73, t: 86 }, { l: 38, t: 85 },
]
function GroundScatter({ cfg, picked, glow }: { cfg: SceneCfg; picked: number; glow: boolean }) {
  return (
    <>
      {Array.from({ length: picked }).map((_, i) => {
        const p = GROUND_SPOTS[i % GROUND_SPOTS.length]
        const depth = Math.max(0, Math.min(1, (86 - p.t) / 30))   // higher on screen → farther → smaller
        const k = 1 - depth * 0.24
        const size = `clamp(${Math.round(64 * k)}px, ${(11.5 * k).toFixed(1)}vmin, ${Math.round(150 * k)}px)`
        const shW = `clamp(${Math.round(34 * k)}px, ${(6 * k).toFixed(1)}vmin, ${Math.round(78 * k)}px)`
        return (
          <React.Fragment key={i}>
            {/* contact shadow pooled on the grass at the flower's base */}
            <div aria-hidden style={{ position: 'fixed', left: `${p.l}%`, top: `${p.t}%`, transform: 'translate(-50%,-50%)', zIndex: 28,
              width: shW, height: `calc(${shW} * 0.3)`, background: `radial-gradient(ellipse at center, rgba(38,28,18,${(0.22 - depth * 0.1).toFixed(2)}) 0%, rgba(38,28,18,0) 72%)`, pointerEvents: 'none' }} />
            {/* the planted flower — anchored by its base on the spot */}
            <div style={{ position: 'fixed', left: `${p.l}%`, top: `${p.t}%`, transform: 'translate(-50%,-100%)', zIndex: 30 + Math.round((1 - depth) * 6), animation: 'gr_pop .35s ease both',
              filter: glow ? 'drop-shadow(0 0 14px var(--garden-green))' : 'drop-shadow(0 4px 5px rgba(0,0,0,.25))' }}>
              <Item cfg={cfg} size={size} />
            </div>
          </React.Fragment>
        )
      })}
    </>
  )
}

function Stage({ cfg, target, shelf, picked, glow, shake, onPick }: {
  cfg: SceneCfg; target: number; shelf: number; picked: number; glow: boolean; shake: boolean; onPick?: () => void
}) {
  const remaining = Math.max(0, shelf - picked)
  const isGround = cfg.cType === 'ground'
  // Flowers are big blooms — bigger shelf box than the compact grocery/pizza items.
  const itemSize = isGround ? 'clamp(60px, 11vmin, 132px)' : 'clamp(42px, 7vmin, 82px)'
  return (
    <>
      <div style={{ position: 'fixed', left: 0, right: 0, top: isGround ? '50%' : '40%', transform: 'translateY(-50%)', zIndex: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4vh' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.6vmin', justifyContent: 'center', alignItems: 'flex-end', maxWidth: '74vw', minHeight: '13vh' }}>
          {Array.from({ length: remaining }).map((_, i) => (
            <ShelfItem key={i} cfg={cfg} size={itemSize} i={i} onPick={onPick} />
          ))}
        </div>
        {/* a wooden shelf ledge for the shop worlds; the garden has no plank (flowers on grass). */}
        {!isGround && <div style={{ width: '76vw', maxWidth: 780, height: '2.4vh', minHeight: 14, background: 'linear-gradient(#caa46a,#a07a44)', borderRadius: 6, boxShadow: '0 5px 9px rgba(0,0,0,.28)' }} />}
      </div>
      {isGround ? (
        // Flower Garden: order pinned at the TOP (out of the grass), flowers planted below.
        <div style={{ position: 'fixed', top: '15%', left: 0, right: 0, zIndex: 31, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 'clamp(12px, 2.5vw, 40px)' }}>
          <OrderTicket cfg={cfg} target={target} />
          <span style={{ fontSize: 'clamp(40px, 8vmin, 96px)', lineHeight: 1, filter: 'drop-shadow(0 4px 6px rgba(0,0,0,.25))', animation: glow ? 'gr_pop .5s ease' : 'gr_float 3.6s ease-in-out infinite' }}>{cfg.customer}</span>
        </div>
      ) : (
        <div style={{ position: 'fixed', left: 0, right: 0, top: '70%', transform: 'translateY(-50%)', zIndex: 30, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 'clamp(14px, 3vw, 50px)' }}>
          <OrderTicket cfg={cfg} target={target} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, transform: 'scale(0.93)', transformOrigin: 'bottom center' }}>
            <span style={{ fontSize: 'clamp(46px, 9vmin, 108px)', lineHeight: 1, filter: 'drop-shadow(0 4px 6px rgba(0,0,0,.25))', animation: glow ? 'gr_pop .5s ease' : 'gr_float 3.6s ease-in-out infinite' }}>{cfg.customer}</span>
            <div aria-hidden style={{ width: 'clamp(40px, 7vmin, 90px)', height: 'clamp(12px, 2.1vmin, 27px)', marginTop: '0.3vmin',
              background: 'radial-gradient(ellipse at center, rgba(38,28,18,0.16) 0%, rgba(38,28,18,0) 72%)', pointerEvents: 'none' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, transformOrigin: 'bottom center' }}>
            <div style={{ position: 'relative', animation: shake ? 'gr_shake .42s ease' : 'none', filter: glow ? 'drop-shadow(0 0 18px var(--garden-green))' : 'drop-shadow(0 8px 10px rgba(0,0,0,.25))' }}>
              <Container cfg={cfg} picked={picked} />
            </div>
            <div aria-hidden style={{ width: 'clamp(80px, 15vmin, 170px)', height: 'clamp(20px, 4vmin, 46px)', marginTop: '0.2vmin',
              background: 'radial-gradient(ellipse at center, rgba(38,28,18,0.24) 0%, rgba(38,28,18,0) 72%)', pointerEvents: 'none' }} />
          </div>
        </div>
      )}
      {/* Flower Garden: the planted flowers scatter across the open green grass. */}
      {isGround && <GroundScatter cfg={cfg} picked={picked} glow={glow} />}
    </>
  )
}

// ─── The interactive play surface (guided / practice) ──────────────────────────────
type Mode = 'guided' | 'practice'
const ShopPlay: React.FC<{ world: ShopWorld; data: OrderRound; mode: Mode; onComplete: (correct: boolean) => void }> = ({ world, data, mode, onComplete }) => {
  const { scene, target, shelf } = data
  const cfg = SCENE[scene]
  const [picked, setPicked] = useState(0)
  const pickedRef = useRef(0)
  const [glow, setGlow] = useState(false)
  const [shake, setShake] = useState(false)
  const erred = useRef(false), done = useRef(false), tapLock = useRef(false), wrongLock = useRef(false)

  useEffect(() => {
    if (mode === 'guided') speak(`Now you! Put ${qty(target, cfg)} ${world.prep} the ${cfg.container}, then ${world.verbLabel.replace(/!$/, '')}.`)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function pick() {
    if (done.current || pickedRef.current >= shelf) return
    pickedRef.current += 1; setPicked(pickedRef.current); speak(String(pickedRef.current))
  }
  function putBack() {
    if (done.current || pickedRef.current <= 0) return
    pickedRef.current -= 1; setPicked(pickedRef.current)
  }
  function ringUp() {
    if (done.current || tapLock.current) return
    tapLock.current = true; window.setTimeout(() => { tapLock.current = false }, 350)
    const p = pickedRef.current
    if (p === target) {
      done.current = true; setGlow(true)
      if (mode === 'guided') speak(`Yes! Exactly ${target}! Done!`)
      window.setTimeout(() => onComplete(mode === 'practice' ? !erred.current : true), 1100)
    } else {
      erred.current = true; setShake(true); window.setTimeout(() => setShake(false), 460)
      if (!wrongLock.current) {
        wrongLock.current = true
        speak(p < target ? `The order is ${target}. You have ${p} — a few more!` : `That's ${p} — too many! The order is ${target}. Put some back.`)
        window.setTimeout(() => { wrongLock.current = false }, 1700)
      }
    }
  }

  return (
    <>
      <Stage cfg={cfg} target={target} shelf={shelf} picked={picked} glow={glow} shake={shake} onPick={pick} />
      {glow && (
        <div style={{ position: 'fixed', left: '50%', top: '53%', transform: 'translateX(-50%)', zIndex: 48, fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(26px, 5vmin, 52px)', color: '#fff', background: 'var(--garden-green)', border: '4px solid #fff', borderRadius: 18, padding: '6px 26px', boxShadow: '0 6px 0 rgba(0,0,0,.2)', animation: 'gr_sold .5s cubic-bezier(.34,1.56,.64,1) both', whiteSpace: 'nowrap' }}>✓ Done!</div>
      )}
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: '4%', zIndex: 31, display: 'flex', justifyContent: 'center', gap: '3vw', flexWrap: 'wrap', padding: '0 12px' }}>
        <button onClick={putBack} disabled={picked <= 0}
          style={{ ...CTRL, background: 'var(--paper)', color: 'var(--milo-orange)', border: '3px solid var(--milo-orange)', opacity: picked <= 0 ? 0.45 : 1, cursor: picked <= 0 ? 'default' : 'pointer' }}>↩ Put one back</button>
        <button onClick={ringUp}
          style={{ ...CTRL, background: 'linear-gradient(135deg,var(--garden-green),var(--garden-green-deep))', color: '#fff', border: 'none', cursor: 'pointer' }}>{world.verbEmoji} {world.verbLabel}</button>
      </div>
    </>
  )
}
const CTRL: React.CSSProperties = { padding: '12px 26px', borderRadius: 50, fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, boxShadow: '0 5px 0 rgba(0,0,0,.18)' }

// ─── The teaching demo (opening preview + 3-wrong re-teach) ─────────────────────────
const ShopExplain: React.FC<{ world: ShopWorld; data: OrderRound; onDone: () => void }> = ({ world, data, onDone }) => {
  const { scene, target, shelf } = data
  const cfg = SCENE[scene]
  const [filled, setFilled] = useState(0)
  const [glow, setGlow] = useState(false)
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return; ran.current = true
    const script: string[] = [`This order wants ${qty(target, cfg)}. Let's count them ${world.prep} the ${cfg.container}.`]
    const actions: Array<() => void> = [() => {}]
    for (let k = 1; k <= target; k++) { const c = k; script.push(String(c)); actions.push(() => setFilled(c)) }
    script.push(`${target}! Just right — stop. ${world.verbLabel}`)
    actions.push(() => setGlow(true))
    const cancel = speakSteps(script, { onStep: (i) => actions[i]?.(), onDone: () => window.setTimeout(onDone, 1200) })
    return cancel
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return <Stage cfg={cfg} target={target} shelf={shelf} picked={filled} glow={glow} shake={false} />
}

// ─── Value generation ──────────────────────────────────────────────────────────────
function makeOrder(world: ShopWorld, d: 1 | 2 | 3, round: number): OrderRound {
  const scene = world.scenes[round % world.scenes.length]
  const target = matchTarget(d as 1 | 2 | 3)
  const spares = d === 1 ? 0 : d === 2 ? 2 : rint(3, 4)
  const shelf = Math.min(10, target + spares)
  return { scene, target, shelf }
}

function makeGroceryBeat(world: ShopWorld): Beat<OrderRound> {
  return {
    skillId: 'matchingQuantities', rounds: 10, reteachAfter: 3, walkEvery: 3,
    make: (d, round = 0) => makeOrder(world, (d || 1) as 1 | 2 | 3, round),
    prompt: d => `Put ${qty(d.target, SCENE[d.scene])} ${world.prep} the ${SCENE[d.scene].container}.`,
    say: d => `This order would like ${qty(d.target, SCENE[d.scene])}. Tap them ${world.prep} the ${SCENE[d.scene].container}, then ${world.verbLabel.replace(/!$/, '')}!`,
    Play: ({ data, onSubmit }) => <ShopPlay world={world} data={data} mode="practice" onComplete={onSubmit} />,
    Reteach: ({ data, onDone }) => <ShopExplain world={world} data={data} onDone={onDone} />,
  }
}

// ─── Orchestrator ──────────────────────────────────────────────────────────────────
const GR_CSS = `
@keyframes gr_float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
@keyframes gr_pop { 0%{transform:scale(0);opacity:0} 70%{transform:scale(1.15);opacity:1} 100%{transform:scale(1);opacity:1} }
@keyframes gr_shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px) rotate(-2deg)} 75%{transform:translateX(6px) rotate(2deg)} }
@keyframes gr_sold { 0%{transform:translateX(-50%) scale(.3);opacity:0} 60%{transform:translateX(-50%) scale(1.2);opacity:1} 100%{transform:translateX(-50%) scale(1);opacity:1} }
`
type Phase = 'intro' | 'demo' | 'guided' | 'practice'
export default function Grocery({ world: forcedWorldId, onFinish, onExit }: {
  world?: string
  onFinish?: (correct: number, wrong: number, mastered?: boolean) => void
  onExit?: () => void
}) {
  const router = useRouter()
  const [world, setWorld] = useState<ShopWorld | null>(() => (forcedWorldId ? worldById(forcedWorldId) ?? null : null))
  const [phase, setPhase] = useState<Phase>('intro')
  const [scene, setScene] = useState<Scene>('produce')
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
  const beat = useMemo(() => (world ? makeGroceryBeat(world) : null), [world])

  if (!world || !beat) {
    return (
      <div style={{ position: 'relative', width: '100vw', height: '100dvh', overflow: 'hidden' }}>
        <WorldSelect title="Which shop shall we open?" worlds={PICK_WORLDS}
          onPick={(id) => { const w = worldById(id); if (w) { setScene(w.scenes[0]); setWorld(w) } }} onExit={exit} />
      </div>
    )
  }

  // Per-world demo + guided orders (small numbers, this world's first scenes).
  const DEMO_ORDERS: OrderRound[] = [
    { scene: world.scenes[0], target: 3, shelf: 3 },
    { scene: world.scenes[1] ?? world.scenes[0], target: 5, shelf: 7 },
  ]
  const GUIDED_ORDER: OrderRound = { scene: world.scenes[2] ?? world.scenes[0], target: 2, shelf: 4 }
  const bgScene: Scene = phase === 'practice' ? scene : phase === 'guided' ? GUIDED_ORDER.scene : phase === 'demo' ? DEMO_ORDERS[demoIdx].scene : world.scenes[0]

  const Banner = (text: string) => (
    <div style={{ position: 'absolute', top: 50, left: 0, right: 0, zIndex: 45, display: 'flex', justifyContent: 'center', padding: '0 12px' }}>
      <div style={{ background: 'var(--paper)', border: '3px solid var(--milo-orange)', borderRadius: 999, padding: '10px 24px', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 19, color: 'var(--milo-orange)', boxShadow: '0 4px 0 rgba(242,107,44,.25)', textAlign: 'center' }}>{text}</div>
    </div>
  )

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100dvh', overflow: 'hidden' }}>
      <style>{GR_CSS}</style>
      <Background scene={bgScene} scenes={world.scenes} />
      <div style={{ position: 'absolute', top: 12, left: 14, right: 14, display: 'flex', alignItems: 'center', zIndex: 50 }}>
        <button onClick={exit} style={{ padding: '7px 14px', borderRadius: 50, background: 'var(--paper)', border: '3px solid var(--milo-orange)', color: 'var(--milo-orange)', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>← Menu</button>
      </div>

      {phase === 'intro' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 45, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
          <div style={{ maxWidth: '76%', background: '#fff', border: '3px solid var(--outline)', borderRadius: 18, padding: '14px 20px', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19, color: 'var(--ink)', textAlign: 'center', boxShadow: '0 4px 0 rgba(61,37,22,.1)' }}>
            {world.intro}
          </div>
          <button onClick={() => setPhase('demo')}
            style={{ padding: '14px 38px', borderRadius: 50, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,var(--milo-orange),var(--milo-orange-deep))', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, boxShadow: '0 6px 16px rgba(242,107,44,.4)' }}>Open up! ▶</button>
        </div>
      )}

      {phase === 'demo' && (<>{Banner(`Watch Milo fill the order  (${demoIdx + 1}/${DEMO_ORDERS.length})`)}
        <ShopExplain key={`demo${demoIdx}`} world={world} data={DEMO_ORDERS[demoIdx]}
          onDone={() => { if (demoIdx + 1 < DEMO_ORDERS.length) setDemoIdx(demoIdx + 1); else setPhase('guided') }} /></>)}

      {phase === 'guided' && (<>{Banner('Now you! Fill the order, then serve it')}
        <ShopPlay key="guided" world={world} data={GUIDED_ORDER} mode="guided" onComplete={() => setPhase('practice')} /></>)}

      {phase === 'practice' && (
        <div style={{ position: 'absolute', top: 48, left: 0, right: 0, zIndex: 45, display: 'flex', justifyContent: 'center', padding: '0 12px' }}>
          <SkillBeat beat={beat} onInterlude={interlude}
            onRound={(data) => { if (data?.scene) setScene(data.scene as Scene) }}
            onComplete={(c, w, mastered) => { result.current.correct += c; result.current.wrong += w; finishChapter(result.current.correct, result.current.wrong, mastered) }} />
        </div>
      )}

      {<MiloHost left={11} milo={world.milo} />}
    </div>
  )
}
