'use client'
/**
 * Chapter 3 — number-COMPARISON (skill `numberComparison`). Milo the chef picks the bigger /
 * "more" one. The child first PICKS one of THREE storytellings; within the chosen one, three
 * vessel-scenes rotate across the 10 adaptive rounds (each scene = its own vessel + countable
 * item + background), exactly like the colours chapter rotates its object-scenes:
 *   🍳 Kitchen — apple bowls · cookie trays · candy jars
 *   🛒 Grocery — orange bowls · egg trays · strawberry jars
 *   🧁 Bakery  — cupcake trays · cake towers · cherry bowls
 *
 * Comparison is a single binary tap, so the rounds vary on several axes mapped onto difficulty:
 *   scene · reasoning (count → cake height → symbolic numerals) · polarity (more/fewer) ·
 *   choice count (2 → 3 "the most") · per-scene payoff (the feast tray).
 *
 * ART: comparison is about QUANTITY, not colour, so it uses the established COLOURED object
 * sprites directly (no tinting) — reusing the consistent library (apple/cookie/candy/orange/
 * egg/strawberry/cupcake/cherry + cake layers) over existing painted backgrounds. The vessel
 * renderers (bowl / tray / jar / cake) are parameterised by the item sprite, so one renderer
 * serves every scene. Each PNG auto-upgrades over a code-drawn fallback. Mirrors RainbowTown's
 * world-picker; wrapped by game/NumberComparisonChapter.tsx.
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { speak, speakSteps, useIsSpeaking, stopSpeech } from '@/lib/useMiloSpeaker'
import { SkillBeat, type Beat } from './StoryWorld'
import WorldSelect from './WorldSelect'

const SPEAK_LOCK_MS = 600
const rint = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))

// ─── Scenes & worlds ─────────────────────────────────────────────────────────────
type Vessel = 'bowl' | 'tray' | 'jar' | 'cake'
type Compare = 'more' | 'less'
type SceneId =
  | 'k_apple' | 'k_cookie' | 'k_candy'        // Kitchen
  | 'g_orange' | 'g_egg' | 'g_straw'          // Grocery
  | 'b_cupcake' | 'b_cake' | 'b_cherry'       // Bakery

interface SceneDef {
  vessel: Vessel
  sprite: string                 // item sprite (ignored for cake — it stacks layers)
  fallback: string               // colour fallback if the sprite PNG is missing
  noun: string                   // "apples"
  vesselNoun: string             // "bowl"
  food: string                   // emoji for the feast tray
  grad: string                   // code-drawn backdrop (always shows)
  img: string                    // painted backdrop (fades in if it exists)
}
const SCENES: Record<SceneId, SceneDef> = {
  k_apple:   { vessel: 'bowl', sprite: '/assets/objects/apple.png',             fallback: 'var(--apple-red)',  noun: 'apples',       vesselNoun: 'bowl', food: '🍎', grad: 'radial-gradient(ellipse at 50% 26%, #eaf7d6 0%, #cfe9a8 55%, #a9d178 100%)', img: '/assets/backgrounds/kitchen_fruit.jpeg' },
  k_cookie:  { vessel: 'tray', sprite: '/assets/objects/cookie.png',            fallback: '#b5772f',           noun: 'cookies',      vesselNoun: 'tray', food: '🍪', grad: 'radial-gradient(ellipse at 50% 24%, #ffe2b0 0%, #f5b96b 55%, #e89b46 100%)', img: '/assets/backgrounds/kitchen_oven.jpeg' },
  k_candy:   { vessel: 'jar',  sprite: '/assets/objects/candy.png',             fallback: '#e06fae',           noun: 'candies',      vesselNoun: 'jar',  food: '🍬', grad: 'radial-gradient(ellipse at 50% 24%, #fdeaf6 0%, #f6cde8 55%, #e9b3d8 100%)', img: '/assets/backgrounds/kitchen_pantry.jpeg' },
  g_orange:  { vessel: 'bowl', sprite: '/assets/objects/kitchen_orange.png',    fallback: '#f2872c',           noun: 'oranges',      vesselNoun: 'bowl', food: '🍊', grad: 'radial-gradient(ellipse at 50% 26%, #eaf7d6 0%, #cfe9a8 55%, #a9d178 100%)', img: '/assets/backgrounds/grocery_produce.jpeg' },
  g_egg:     { vessel: 'tray', sprite: '/assets/objects/grocery_egg.png',       fallback: '#e9c79c',           noun: 'eggs',         vesselNoun: 'tray', food: '🥚', grad: 'radial-gradient(ellipse at 50% 24%, #fff1df 0%, #f3dcc0 55%, #e6c9a6 100%)', img: '/assets/backgrounds/grocery_deli.jpeg' },
  g_straw:   { vessel: 'jar',  sprite: '/assets/objects/kitchen_strawberry.png', fallback: '#e64545',          noun: 'strawberries', vesselNoun: 'jar',  food: '🍓', grad: 'radial-gradient(ellipse at 50% 24%, #fdeaf6 0%, #f6cde8 55%, #e9b3d8 100%)', img: '/assets/backgrounds/grocery_sweets.jpeg' },
  b_cupcake: { vessel: 'tray', sprite: '/assets/objects/kitchen_cupcake.png',   fallback: '#f49ac0',           noun: 'cupcakes',     vesselNoun: 'tray', food: '🧁', grad: 'radial-gradient(ellipse at 50% 22%, #fff3f7 0%, #ffe0ec 55%, #ffd0e2 100%)', img: '/assets/backgrounds/kitchen_bakery.jpeg' },
  b_cake:    { vessel: 'cake', sprite: '',                                       fallback: '#ffd6ea',           noun: 'layers',       vesselNoun: 'cake', food: '🎂', grad: 'radial-gradient(ellipse at 50% 22%, #fff3f7 0%, #ffe0ec 55%, #ffd0e2 100%)', img: '/assets/backgrounds/grocery_bakery.jpeg' },
  b_cherry:  { vessel: 'bowl', sprite: '/assets/objects/cherry.png',            fallback: '#e23b54',           noun: 'cherries',     vesselNoun: 'bowl', food: '🍒', grad: 'radial-gradient(ellipse at 50% 26%, #ffeef6 0%, #f6cde0 55%, #e9b3cf 100%)', img: '/assets/backgrounds/grocery_flowers.jpeg' },
}

interface KitchenWorld {
  id: string; label: string; emoji: string
  scenes: SceneId[]
  milo: { srcs: string[]; emoji: string; accessory: string }
  intro: string
}
const WORLDS: KitchenWorld[] = [
  { id: 'kitchen', label: 'Kitchen', emoji: '🍳', scenes: ['k_apple', 'k_cookie', 'k_candy'],
    milo: { srcs: ['/assets/characters/milo_chef.png', '/assets/characters/milo_idle.png'], emoji: '🦊', accessory: '👨‍🍳' },
    intro: 'Milo is cooking a yummy feast in his Kitchen! Help him pick the one with more. First, watch Milo count!' },
  { id: 'grocery', label: 'Grocery', emoji: '🛒', scenes: ['g_orange', 'g_egg', 'g_straw'],
    milo: { srcs: ['/assets/characters/milo_grocer.png', '/assets/characters/milo_idle.png'], emoji: '🦊', accessory: '🛒' },
    intro: 'Milo is shopping at the Grocery! Help him pick the one with more. First, watch Milo count!' },
  { id: 'bakery', label: 'Bakery', emoji: '🧁', scenes: ['b_cupcake', 'b_cake', 'b_cherry'],
    milo: { srcs: ['/assets/characters/milo_chef.png', '/assets/characters/milo_idle.png'], emoji: '🦊', accessory: '🧁' },
    intro: 'Milo is baking sweet treats in the Bakery! Help him pick the one with more. First, watch Milo count!' },
]
const worldById = (id: string) => WORLDS.find(w => w.id === id)
const PICK_WORLDS = WORLDS.map(w => ({ id: w.id, label: w.label, emoji: w.emoji, bgImage: SCENES[w.scenes[0]].img }))

interface CompareData {
  scene: SceneId
  vals: number[]        // 2 or 3 quantities, in random order
  answerIdx: number     // index of the correct vessel (max for "more", min for "less")
  mode: Compare
  symbolic: boolean     // show a numeral only (no countable items) — the abstract tier
}

function Background({ scene, scenes }: { scene: SceneId; scenes: SceneId[] }) {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#f3ead8' }}>
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

// ─── Milo the chef (per world) ─────────────────────────────────────────────────────
function MiloChef({ left, top, milo }: { left: number; top: number; milo: KitchenWorld['milo'] }) {
  const [step, setStep] = useState(0)
  return (
    <div style={{ position: 'fixed', left: `${left}%`, top: `${top}%`, transform: 'translate(-50%,-50%)', zIndex: 26, width: 'min(26vh, 220px)', height: 'min(26vh, 220px)', animation: 'mk_float 3.4s ease-in-out infinite' }}>
      {step >= milo.srcs.length
        ? <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <span style={{ fontSize: 86, filter: 'drop-shadow(0 5px 8px rgba(0,0,0,.35))' }}>{milo.emoji}</span>
            <span style={{ position: 'absolute', top: 2, fontSize: 40 }}>{milo.accessory}</span>
          </div>
        : <img src={milo.srcs[step]} alt="Milo the chef" draggable={false} onError={() => setStep(s => s + 1)}
            style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 5px 8px rgba(0,0,0,.35))' }} />}
    </div>
  )
}

// ─── Quantity drawings (countable items / height / fill / numeral) ─────────────────
const CANDY_COLORS = ['var(--apple-red)', 'var(--sun-yellow)', 'var(--berry-purple)', 'var(--garden-green)', 'var(--sky-blue)']

function Numeral({ val, color }: { val: number; color: string }) {
  return <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 60, color, textShadow: '0 2px 0 rgba(255,255,255,.55)', lineHeight: 1 }}>{val}</span>
}
function ItemCluster({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, justifyContent: 'center', alignItems: 'center', maxWidth: '94%', maxHeight: '100%' }}>{children}</div>
}
// Each sprite is rendered cropped to its alpha bounding box (measured once) so the item FILLS
// its slot. `size` = the visible HEIGHT in design px; the box width follows the true aspect.
const SPRITE_BBOX: Record<string, { W: number; H: number; x: number; y: number; w: number; h: number }> = {
  '/assets/objects/apple.png': { W: 1536, H: 1024, x: 526, y: 205, w: 498, h: 573 },
  '/assets/objects/candy.png': { W: 1024, H: 1024, x: 181, y: 203, w: 661, h: 603 },
  '/assets/objects/cookie.png': { W: 1024, H: 1024, x: 105, y: 113, w: 814, h: 807 },
  '/assets/objects/kitchen_orange.png': { W: 836, H: 836, x: 100, y: 39, w: 636, h: 758 },
  '/assets/objects/kitchen_strawberry.png': { W: 798, H: 798, x: 91, y: 37, w: 615, h: 724 },
  '/assets/objects/kitchen_cupcake.png': { W: 950, H: 950, x: 133, y: 44, w: 685, h: 863 },
  '/assets/objects/cherry.png': { W: 2048, H: 2048, x: 606, y: 426, w: 836, h: 1139 },
  '/assets/objects/grocery_egg.png': { W: 1024, H: 1024, x: 285, y: 219, w: 450, h: 588 },
}
const FALLBACK_BBOX = { W: 1024, H: 1024, x: 0, y: 0, w: 1024, h: 1024 }
const TRAY_BBOX = { W: 1024, H: 1024, x: 90, y: 347, w: 844, h: 331 }
function CropSprite({ src, size, fallbackBg }: { src: string; size: number; fallbackBg: string }) {
  const [missing, setMissing] = useState(false)
  const b = SPRITE_BBOX[src] ?? FALLBACK_BBOX
  const s = size / b.h                          // image px → design px
  const boxW = b.w * s
  if (missing) return <span style={{ display: 'block', width: boxW, height: size, borderRadius: '46%', background: fallbackBg, border: '2px solid rgba(0,0,0,.18)', animation: 'mk_appear .35s ease both' }} />
  return (
    <span style={{ display: 'block', position: 'relative', width: boxW, height: size, overflow: 'hidden', animation: 'mk_appear .35s ease both' }}>
      <img src={src} alt="" draggable={false} onError={() => setMissing(true)}
        style={{ position: 'absolute', left: -b.x * s, top: -b.y * s, width: b.W * s, height: b.H * s, maxWidth: 'none' }} />
    </span>
  )
}

// ─── Natural pile layout (shared by the bowl + jar) ────────────────────────────────
interface PileItem { x: number; y: number; rot: number; z: number; size: number }
function buildPile(val: number, opts: {
  cx: number; baseY: number; size: number; colFactor: number; rowFactor: number
  rows: number[]; rotSpread?: number; flatBottomRow?: boolean
}): PileItem[] {
  const { cx, baseY, size, colFactor, rowFactor, rows, rotSpread = 12, flatBottomRow = false } = opts
  const colStep = size * colFactor, rowStep = size * rowFactor
  const out: PileItem[] = []
  let i = 0
  for (let r = 0; r < rows.length && i < val; r++) {
    const cnt = Math.min(rows[r], val - i)
    const y = baseY - r * rowStep
    for (let c = 0; c < cnt; c++) {
      const x = cx + (c - (cnt - 1) / 2) * colStep
      const rot = (flatBottomRow && r === 0) ? 0 : ((i * 53) % (2 * rotSpread + 1)) - rotSpread
      const z = (rows.length - r) * 10 + c
      out.push({ x, y, rot, z, size }); i++
    }
  }
  return out
}
const FRUIT_ROWS: Record<number, number[]> = {
  1: [1], 2: [2], 3: [3], 4: [3, 1], 5: [3, 2],
  6: [3, 2, 1], 7: [3, 3, 1], 8: [3, 3, 2], 9: [3, 3, 2, 1],
}
const CANDY_ROWS: Record<number, number[]> = {
  1: [1], 2: [2], 3: [3], 4: [3, 1], 5: [3, 2], 6: [3, 3],
  7: [3, 3, 1], 8: [3, 3, 2], 9: [3, 3, 3],
}

const DES_W = 188, DES_H = 210

// ─── Bowl (heap of the item sprite) ───────────────────────────────────────────────
function BowlArt({ sprite, fallback, val, shown, symbolic }: { sprite: string; fallback: string; val: number; shown?: number; symbolic: boolean }) {
  const [imgOk, setImgOk] = useState(true)
  const visible = Math.min(val, shown ?? val)
  if (!imgOk) return <BowlDrawn val={val} shown={shown} symbolic={symbolic} fallback={fallback} />
  const bowlImg: React.CSSProperties = { position: 'absolute', left: 0, bottom: 0, width: '100%', height: '94%', objectFit: 'contain', objectPosition: 'bottom' }
  const sz = val <= 1 ? 58 : val <= 2 ? 54 : val <= 3 ? 52 : val <= 4 ? 50 : val <= 6 ? 46 : 42
  const pile = buildPile(val, { cx: DES_W / 2, baseY: 112, size: sz, colFactor: 0.62, rowFactor: 0.56, rows: FRUIT_ROWS[val] ?? FRUIT_ROWS[9], rotSpread: 13 })
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <img src="/assets/objects/fruitbowl.png" alt="bowl" draggable={false} onError={() => setImgOk(false)} style={{ ...bowlImg, zIndex: 1 }} />
      {symbolic
        ? <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
            <div style={{ marginTop: -18 }}><Numeral val={val} color="#b3402e" /></div>
          </div>
        : pile.slice(0, visible).map((p, i) => (
            <div key={i} style={{ position: 'absolute', left: p.x, top: p.y, transform: `translate(-50%,-50%) rotate(${p.rot}deg)`, zIndex: 10 + p.z }}>
              <CropSprite src={sprite} size={p.size} fallbackBg={fallback} />
            </div>
          ))}
      {!symbolic && (
        <img src="/assets/objects/fruitbowl.png" alt="" aria-hidden draggable={false} style={{ ...bowlImg, zIndex: 200, clipPath: 'inset(53% 0 0 0)', pointerEvents: 'none' }} />
      )}
    </div>
  )
}
function BowlDrawn({ val, shown, symbolic, fallback }: { val: number; shown?: number; symbolic: boolean; fallback: string }) {
  const k = Math.min(val, shown ?? val)
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
      <div style={{ height: '52%', width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 2 }}>
        {symbolic ? <Numeral val={val} color="#b3402e" />
          : <ItemCluster>{Array.from({ length: k }).map((_, i) => (
              <span key={i} style={{ display: 'block', width: 24, height: 24, borderRadius: '50%', background: fallback, border: '2px solid rgba(0,0,0,.22)', boxShadow: 'inset -2px -3px 4px rgba(0,0,0,.2)', animation: 'mk_appear .35s ease both' }} />
            ))}</ItemCluster>}
      </div>
      <div style={{ position: 'relative', width: '92%', height: '42%' }}>
        <div style={{ position: 'absolute', top: '-6%', left: '3%', right: '3%', height: '34%', borderRadius: '50%', background: 'linear-gradient(#e6c79a, #cda873)', border: '3px solid #9c7034', zIndex: 2 }} />
        <div style={{ position: 'absolute', inset: 0, top: '10%', background: 'linear-gradient(#c89a5f, #9c7034)', borderRadius: '8% 8% 48% 48% / 8% 8% 80% 80%', border: '4px solid #7c5526', boxShadow: 'inset 0 -8px 16px rgba(0,0,0,.35)' }} />
      </div>
    </div>
  )
}

// ─── Tray (rows of the item sprite) ────────────────────────────────────────────────
const COOKIE_TRAY_ROWS: Record<number, number[]> = {
  1: [1], 2: [2], 3: [3], 4: [4], 5: [5], 6: [3, 3], 7: [4, 3], 8: [4, 4], 9: [5, 4],
}
function TrayArt({ sprite, fallback, val, shown, symbolic }: { sprite: string; fallback: string; val: number; shown?: number; symbolic: boolean }) {
  const [imgOk, setImgOk] = useState(true)
  const visible = Math.min(val, shown ?? val)
  if (!imgOk) return <TrayDrawn val={val} shown={shown} symbolic={symbolic} fallback={fallback} />
  const trayW = DES_W * 0.98, sc = trayW / TRAY_BBOX.w, trayH = TRAY_BBOX.h * sc
  const trayTop = DES_H - trayH - 12, trayLeft = (DES_W - trayW) / 2
  const csz = val <= 4 ? 28 : val <= 6 ? 25 : 22
  const pile = buildPile(val, { cx: DES_W / 2, baseY: trayTop + trayH * 0.46, size: csz, colFactor: 0.92, rowFactor: 0.72, rows: COOKIE_TRAY_ROWS[val] ?? COOKIE_TRAY_ROWS[9], rotSpread: 6 })
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div style={{ position: 'absolute', left: trayLeft, top: trayTop, width: trayW, height: trayH, overflow: 'hidden', zIndex: 1 }}>
        <img src="/assets/objects/bakingTray.png" alt="tray" draggable={false} onError={() => setImgOk(false)}
          style={{ position: 'absolute', left: -TRAY_BBOX.x * sc, top: -TRAY_BBOX.y * sc, width: TRAY_BBOX.W * sc, height: TRAY_BBOX.H * sc, maxWidth: 'none' }} />
      </div>
      {symbolic
        ? <div style={{ position: 'absolute', left: 0, right: 0, top: trayTop - 4, display: 'flex', justifyContent: 'center', zIndex: 5 }}><Numeral val={val} color="#7a4a1c" /></div>
        : pile.slice(0, visible).map((p, i) => (
            <div key={i} style={{ position: 'absolute', left: p.x, top: p.y, transform: `translate(-50%,-50%) rotate(${p.rot}deg)`, zIndex: 5 + p.z }}>
              <CropSprite src={sprite} size={p.size} fallbackBg={fallback} />
            </div>
          ))}
    </div>
  )
}
function TrayDrawn({ val, shown, symbolic, fallback }: { val: number; shown?: number; symbolic: boolean; fallback: string }) {
  const k = Math.min(val, shown ?? val)
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '96%', height: '64%', background: 'linear-gradient(#ecc79a, #c89a5f)', borderRadius: 16, border: '4px solid #9a7536', boxShadow: 'inset 0 3px 8px rgba(255,255,255,.4), 0 5px 8px rgba(0,0,0,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8 }}>
        {symbolic ? <Numeral val={val} color="#7a4a1c" />
          : <ItemCluster>{Array.from({ length: k }).map((_, i) => (
              <span key={i} style={{ width: 26, height: 26, borderRadius: '50%', background: fallback, border: '2px solid rgba(0,0,0,.22)', display: 'inline-block', animation: 'mk_appear .35s ease both' }} />
            ))}</ItemCluster>}
      </div>
    </div>
  )
}

// ─── Cake (stacked layers — height comparison) ─────────────────────────────────────
function Cherry() {
  const [m, setM] = useState(false)
  if (m) return <span style={{ fontSize: 24, marginBottom: -6, zIndex: 3, animation: 'mk_appear .35s ease both' }}>🍒</span>
  return <img src="/assets/objects/cherry.png" alt="" draggable={false} onError={() => setM(true)} style={{ width: 32, height: 32, objectFit: 'contain', marginBottom: -10, zIndex: 3, filter: 'drop-shadow(0 2px 2px rgba(0,0,0,.25))', animation: 'mk_appear .35s ease both' }} />
}
const CAKE_LAYERS = ['var(--apple-red-soft)', 'var(--sun-yellow-soft)', 'var(--garden-green-soft)', '#ffd6ea', 'var(--sky-blue-soft)', '#e6d6ff']
const CAKE_LAYER_SRC = '/assets/objects/cakeLayer1.png'
function CakeArt({ val, shown }: { val: number; shown?: number }) {
  const [imgOk, setImgOk] = useState(true)
  const k = Math.min(val, shown ?? val)
  if (!imgOk) return <CakeDrawn val={val} shown={shown} />
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center' }}>
      <img src={CAKE_LAYER_SRC} alt="" onError={() => setImgOk(false)} style={{ display: 'none' }} />
      {k > 0 && <Cherry />}
      {Array.from({ length: k }).map((_, i) => (
        <div key={i} style={{ width: 132, height: 28, backgroundImage: `url(${CAKE_LAYER_SRC})`, backgroundSize: '100% auto', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', animation: 'mk_appear .35s ease both' }} />
      ))}
    </div>
  )
}
function CakeDrawn({ val, shown }: { val: number; shown?: number }) {
  const k = Math.min(val, shown ?? val)
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center' }}>
      {k > 0 && <span style={{ fontSize: 22, marginBottom: -4, zIndex: 2, animation: 'mk_appear .35s ease both' }}>🍒</span>}
      {Array.from({ length: k }).map((_, i) => {
        const fromTop = k - 1 - i
        const w = 56 + fromTop * 5
        return <div key={i} style={{ width: `${Math.min(86, w)}%`, height: 17, background: CAKE_LAYERS[fromTop % CAKE_LAYERS.length], border: '2px solid rgba(122,74,28,.5)', borderRadius: 5, boxShadow: 'inset 0 2px 2px rgba(255,255,255,.5)', animation: 'mk_appear .35s ease both' }} />
      })}
      <div style={{ width: '92%', height: 8, background: '#cdbfae', borderRadius: '0 0 8px 8px', marginTop: 1 }} />
    </div>
  )
}

// ─── Jar (heap of the item sprite behind glass) ────────────────────────────────────
function JarArt({ sprite, fallback, val, shown }: { sprite: string; fallback: string; val: number; shown?: number }) {
  const visible = Math.min(val, shown ?? val)
  const csz = val <= 2 ? 34 : val <= 4 ? 30 : val <= 6 ? 26 : 22
  const Wg = DES_W * 0.74 - 10, Hg = DES_H * 0.86 - 8 - 10
  const pile = buildPile(val, { cx: Wg / 2, baseY: Hg - 12, size: csz, colFactor: 0.72, rowFactor: 0.6, rows: CANDY_ROWS[val] ?? CANDY_ROWS[9], rotSpread: 8, flatBottomRow: true })
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: '74%', height: '86%' }}>
        <div style={{ position: 'absolute', top: -16, left: '40%', right: '40%', height: 9, background: '#c19be0', borderRadius: 6, border: '2px solid #a878c9', zIndex: 3 }} />
        <div style={{ position: 'absolute', top: -10, left: '15%', right: '15%', height: 18, background: 'linear-gradient(#dcbcf0,#c19be0)', borderRadius: 7, border: '2px solid #a878c9', zIndex: 3 }} />
        <div style={{ position: 'absolute', inset: 0, top: 8, borderRadius: '14% 14% 28% 28%', border: '5px solid rgba(255,255,255,.8)', background: 'linear-gradient(105deg, rgba(255,255,255,.32) 0%, rgba(255,255,255,.12) 42%, rgba(255,255,255,.30) 100%)', overflow: 'hidden', boxShadow: 'inset 0 0 18px rgba(255,255,255,.5)' }}>
          {pile.slice(0, visible).map((p, i) => (
            <div key={i} style={{ position: 'absolute', left: p.x, top: p.y, transform: `translate(-50%,-50%) rotate(${p.rot}deg)`, zIndex: 1 + p.z }}>
              <CropSprite src={sprite} size={p.size} fallbackBg={CANDY_COLORS[i % CANDY_COLORS.length]} />
            </div>
          ))}
          <div style={{ position: 'absolute', top: '6%', left: '11%', width: '13%', height: '64%', borderRadius: '50%', background: 'rgba(255,255,255,.5)', filter: 'blur(2px)', pointerEvents: 'none', zIndex: 40 }} />
        </div>
      </div>
    </div>
  )
}

function VesselArt({ scene, val, symbolic, shown }: { scene: SceneId; val: number; symbolic: boolean; shown?: number }) {
  const def = SCENES[scene]
  if (def.vessel === 'bowl') return <BowlArt sprite={def.sprite} fallback={def.fallback} val={val} shown={shown} symbolic={symbolic} />
  if (def.vessel === 'tray') return <TrayArt sprite={def.sprite} fallback={def.fallback} val={val} shown={shown} symbolic={symbolic} />
  if (def.vessel === 'cake') return <CakeArt val={val} shown={shown} />
  return <JarArt sprite={def.sprite} fallback={def.fallback} val={val} shown={shown} />
}

// One tappable vessel. (Mirrors RainbowTown's grounded, depth-aware placement.)
function Vessel({ scene, val, symbolic, shown, left, top, glow, wrong, onTap, aria, scale = 1.6, depth = 0.3, groundLine }: {
  scene: SceneId; val: number; symbolic: boolean; shown?: number; left: number; top: number
  glow: boolean; wrong: boolean; onTap?: () => void; aria: string; scale?: number; depth?: number; groundLine: number
}) {
  const s = scale * (1 - depth * 0.18)
  const W = DES_W * s, H = DES_H * s
  const shW = W * 0.7
  const shOp = Math.max(0.07, (0.3 - depth * 0.13) * (glow ? 0.5 : 1))
  return (
    <>
      <div aria-hidden style={{ position: 'fixed', left: `${left}%`, top: `${groundLine}%`, transform: 'translate(-50%,-50%)', zIndex: 28,
        width: shW, height: shW * 0.3, background: `radial-gradient(ellipse at center, rgba(38,28,18,${shOp}) 0%, rgba(38,28,18,0) 72%)`, pointerEvents: 'none' }} />
      <button onClick={onTap} disabled={!onTap} aria-label={aria}
        style={{ position: 'fixed', left: `${left}%`, top: `${top}%`, transform: 'translate(-50%,-50%)', zIndex: 30 + Math.round((1 - depth) * 6), width: W, height: H, padding: 0, border: 'none', background: 'transparent', cursor: onTap ? 'pointer' : 'default' }}>
        <div style={{ width: '100%', height: '100%', position: 'relative',
          animation: wrong ? 'mk_shake .42s ease' : glow ? 'mk_pop .45s ease' : 'mk_float 3.6s ease-in-out infinite',
          filter: glow ? 'drop-shadow(0 0 22px var(--garden-green))' : 'drop-shadow(0 10px 12px rgba(0,0,0,.32))',
          transition: 'filter .3s' }}>
          <div style={{ position: 'absolute', left: '50%', top: '50%', width: DES_W, height: DES_H, transform: `translate(-50%,-50%) scale(${s})`, transformOrigin: 'center' }}>
            <VesselArt scene={scene} val={val} symbolic={symbolic} shown={shown} />
          </div>
        </div>
        {glow && (
          <span style={{ position: 'absolute', top: 6 * s, right: 10 * s, width: 30 * s, height: 30 * s, borderRadius: '50%', background: 'var(--garden-green)', border: '3px solid #fff', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 * s, fontWeight: 900, boxShadow: '0 3px 6px rgba(0,0,0,.3)', animation: 'mk_pop .4s ease' }}>✓</span>
        )}
      </button>
    </>
  )
}

function CountNumber({ value, cx, topPct, scale }: { value: number; cx: number; topPct: number; scale: number }) {
  return (
    <div style={{ position: 'fixed', left: `${cx}%`, top: `calc(${topPct}% - ${76 * scale}px)`, transform: 'translate(-50%,-50%)', zIndex: 47, pointerEvents: 'none' }}>
      <span key={value} style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 58 * scale, lineHeight: 1, color: '#fff', WebkitTextStroke: `${3.5 * scale}px var(--milo-orange)`, textShadow: '0 5px 16px rgba(0,0,0,.5)', animation: 'mk_countpop .42s cubic-bezier(.34,1.56,.64,1)' }}>{value}</span>
    </div>
  )
}

function useVesselScale(n: number): number {
  const [scale, setScale] = useState(1.7)
  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth, h = window.innerHeight
      const byWidth = w * (n <= 2 ? 0.40 : 0.29)
      const byHeight = (h * 0.64) / (DES_H / DES_W)
      setScale(Math.max(1, Math.min(byWidth, byHeight) / DES_W))
    }
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [n])
  return scale
}

// ─── Grounded, depth-aware placement ────────────────────────────────────────────────
interface Placed { left: number; top: number; depth: number }
const VESSEL_GROUND = { baseTop: 56, rise: 6, groundLine: 86 }
const VESSEL_DEPTHS: Record<number, number[]> = { 2: [0.12, 0.55], 3: [0.5, 0.05, 0.65] }
const VESSEL_XJIT: Record<number, number[]> = { 2: [-1.5, 1.5], 3: [-1.5, 0, 1.5] }
function placeVessels(n: number): Placed[] {
  const g = VESSEL_GROUND
  const xs = n === 2 ? [30, 73] : [21, 51, 81]
  const depths = VESSEL_DEPTHS[n] ?? xs.map((_, i) => (i % 2 ? 0.5 : 0.15))
  const jit = VESSEL_XJIT[n] ?? xs.map(() => 0)
  return xs.map((x, i) => { const depth = depths[i] ?? 0.3; return { left: x + (jit[i] ?? 0), top: g.baseTop - depth * g.rise, depth } })
}

// ─── Round copy ────────────────────────────────────────────────────────────────────
function promptFor(d: CompareData): string {
  const def = SCENES[d.scene]
  const three = d.vals.length >= 3
  if (def.vessel === 'cake') return d.mode === 'more' ? (three ? 'Which cake is the BIGGEST?' : 'Which cake is BIGGER?') : (three ? 'Which cake is the SMALLEST?' : 'Which cake is SMALLER?')
  const m = d.mode === 'more' ? (three ? 'the MOST' : 'MORE') : (three ? 'the LEAST' : 'FEWER')
  return `Which ${def.vesselNoun} has ${m} ${def.noun}?`
}
function praiseFor(d: CompareData): string {
  if (SCENES[d.scene].vessel === 'cake') return d.mode === 'more' ? 'Yes! That cake is bigger! 🎉' : 'Yes! That cake is smaller! 🎉'
  return d.mode === 'more' ? 'Yes! That one has more! 🎉' : 'Yes! That one has fewer! 🎉'
}
function nudgeFor(d: CompareData): string {
  if (SCENES[d.scene].vessel === 'cake') return d.mode === 'more' ? 'Oops! Which cake is bigger?' : 'Oops! Which cake is smaller?'
  return d.mode === 'more' ? 'Oops! Look again — which has more?' : 'Oops! Look again — which has fewer?'
}
function guidedPrompt(d: CompareData): string {
  if (SCENES[d.scene].vessel === 'cake') return d.mode === 'more' ? 'Now you! Tap the bigger cake.' : 'Now you! Tap the smaller cake.'
  return d.mode === 'more' ? 'Now you! Tap the one with more.' : 'Now you! Tap the one with fewer.'
}

// ─── The interactive play surface (guided / practice) ──────────────────────────────
type Mode = 'guided' | 'practice'
const ComparePlay: React.FC<{ data: CompareData; mode: Mode; onComplete: (correct: boolean) => void }> = ({ data, mode, onComplete }) => {
  const { scene, vals, answerIdx, symbolic } = data
  const n = vals.length
  const slots = placeVessels(n)
  const groundLine = VESSEL_GROUND.groundLine
  const scale = useVesselScale(n)
  const [picked, setPicked] = useState<number | null>(null)
  const [wrongIdx, setWrongIdx] = useState<number | null>(null)
  const [reveal, setReveal] = useState(false)
  const erred = useRef(false), done = useRef(false), wrongLock = useRef(false), tapLock = useRef(false)
  const speaking = useIsSpeaking()

  const finish = useCallback(() => {
    if (done.current) return; done.current = true
    if (mode === 'guided') speak(praiseFor(data))
    window.setTimeout(() => onComplete(mode === 'practice' ? !erred.current : true), 900)
  }, [mode, data, onComplete])

  useEffect(() => {
    if (mode === 'guided') speak(guidedPrompt(data))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function tap(i: number) {
    if (done.current || speaking || tapLock.current) return
    if (i === answerIdx) {
      setPicked(i); setReveal(true)
      tapLock.current = true; window.setTimeout(() => { tapLock.current = false }, SPEAK_LOCK_MS)
      window.setTimeout(finish, 550)
    } else {
      erred.current = true
      setWrongIdx(i)
      if (!wrongLock.current) { wrongLock.current = true; speak(nudgeFor(data)); window.setTimeout(() => { wrongLock.current = false }, 1300) }
      window.setTimeout(() => setWrongIdx(w => (w === i ? null : w)), 600)
    }
  }

  return (
    <>
      {vals.map((v, i) => {
        const glow = (reveal && i === answerIdx) || picked === i
        return <Vessel key={i} scene={scene} val={v} symbolic={symbolic} scale={scale}
          left={slots[i].left} top={slots[i].top} depth={slots[i].depth} groundLine={groundLine} glow={glow} wrong={wrongIdx === i}
          onTap={() => tap(i)} aria={`choice ${v}`} />
      })}
    </>
  )
}

// ─── The counted explanation (opening demo + 3-wrong re-teach) ─────────────────────
const CompareExplain: React.FC<{ data: CompareData; onDone: () => void }> = ({ data, onDone }) => {
  const { scene, vals, answerIdx, mode } = data
  const n = vals.length
  const slots = placeVessels(n)
  const groundLine = VESSEL_GROUND.groundLine
  const scale = useVesselScale(n)
  const [shown, setShown] = useState<number[]>(() => vals.map(() => 0))
  const [reveal, setReveal] = useState(false)
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return; ran.current = true
    const target = vals[answerIdx]
    const word = mode === 'more' ? 'more' : 'fewer'
    const big = mode === 'more' ? 'bigger' : 'smaller'
    const script: string[] = ["Let's count!"]
    const actions: Array<() => void> = [() => {}]
    vals.forEach((v, vi) => {
      for (let kk = 1; kk <= v; kk++) {
        const c = kk
        script.push(String(c))
        actions.push(() => setShown(s => { const ns = s.slice(); ns[vi] = c; return ns }))
      }
    })
    script.push(`${target} is ${word}. This one is ${big}!`)
    actions.push(() => setReveal(true))
    const cancel = speakSteps(script, {
      onStep: (i) => actions[i]?.(),
      onDone: () => window.setTimeout(onDone, 1200),
    })
    return cancel
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <>
      {vals.map((v, i) => (
        <Vessel key={i} scene={scene} val={v} symbolic={false} shown={shown[i]} scale={scale}
          left={slots[i].left} top={slots[i].top} depth={slots[i].depth} groundLine={groundLine} glow={reveal && i === answerIdx} wrong={false}
          aria={`example ${v}`} />
      ))}
      {vals.map((v, i) => shown[i] > 0
        ? <CountNumber key={`n${i}`} value={shown[i]} cx={slots[i].left} topPct={slots[i].top} scale={scale} />
        : null)}
    </>
  )
}

// ─── Value generation ──────────────────────────────────────────────────────────────
function pickVals(count: number, lo: number, hi: number, minGap: number): number[] {
  const vals: number[] = []
  let guard = 0
  while (vals.length < count && guard++ < 200) {
    const v = rint(lo, hi)
    if (vals.every(x => Math.abs(x - v) >= minGap)) vals.push(v)
  }
  while (vals.length < count) { const v = rint(lo, hi); if (!vals.includes(v)) vals.push(v) }
  return vals
}
function makeCompare(world: KitchenWorld, d: 1 | 2 | 3, round: number): CompareData {
  const scene = world.scenes[round % world.scenes.length]
  const isCake = SCENES[scene].vessel === 'cake'
  const cap = isCake ? 6 : 9
  const count = d >= 3 && Math.random() < 0.5 ? 3 : 2
  const mode: Compare = d === 1 ? 'more' : (Math.random() < 0.5 ? 'more' : 'less')
  const hi = Math.min(d === 1 ? 5 : 9, cap)
  const vals = pickVals(count, 1, hi, d === 1 ? 2 : 1)
  const target = mode === 'more' ? Math.max(...vals) : Math.min(...vals)
  const symbolic = !isCake && d === 3 && Math.random() < 0.4
  return { scene, vals, answerIdx: vals.indexOf(target), mode, symbolic }
}

// ─── The scored practice (SkillBeat) — one continuous adaptive sequence ────────────
function makeCompareBeat(world: KitchenWorld): Beat<CompareData> {
  return {
    skillId: 'numberComparison', rounds: 10, reteachAfter: 3, walkEvery: 3,
    make: (d, round = 0) => makeCompare(world, (d || 1) as 1 | 2 | 3, round),
    prompt: d => promptFor(d),
    say: d => promptFor(d),
    Play: ({ data, onSubmit }) => <ComparePlay data={data} mode="practice" onComplete={onSubmit} />,
    Reteach: ({ data, onDone }) => <CompareExplain data={{ ...data, symbolic: false }} onDone={onDone} />,
  }
}

// ─── Orchestrator ──────────────────────────────────────────────────────────────────
const MK_CSS = `
@keyframes mk_float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
@keyframes mk_pop { 0%{transform:scale(1)} 40%{transform:scale(1.16)} 100%{transform:scale(1)} }
@keyframes mk_shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-7px) rotate(-3deg)} 75%{transform:translateX(7px) rotate(3deg)} }
@keyframes mk_appear { 0%{transform:scale(0);opacity:0} 70%{transform:scale(1.12)} 100%{transform:scale(1);opacity:1} }
@keyframes mk_countpop { 0%{transform:scale(.4);opacity:0} 60%{transform:scale(1.25);opacity:1} 100%{transform:scale(1);opacity:1} }
`

type Phase = 'intro' | 'demo' | 'guided' | 'practice'
export default function Kitchen({ world: forcedWorldId, onFinish, onExit }: {
  world?: string
  onFinish?: (correct: number, wrong: number, mastered?: boolean) => void
  onExit?: () => void
}) {
  const router = useRouter()
  const [world, setWorld] = useState<KitchenWorld | null>(() => (forcedWorldId ? worldById(forcedWorldId) ?? null : null))
  const [phase, setPhase] = useState<Phase>('intro')
  const [scene, setScene] = useState<SceneId>('k_apple')
  const [demoIdx, setDemoIdx] = useState(0)
  const [feast, setFeast] = useState<string[]>([])
  const result = useRef({ correct: 0, wrong: 0 })
  const finished = useRef(false)
  const exit = useCallback(() => { stopSpeech(); (onExit ?? (() => router.push('/menu')))() }, [router, onExit])

  const finishChapter = useCallback((c: number, w: number, mastered?: boolean) => {
    if (finished.current) return; finished.current = true
    stopSpeech()
    if (onFinish) onFinish(c, w, mastered); else exit()
  }, [onFinish, exit])

  const interlude = useCallback(() => new Promise<void>(res => window.setTimeout(res, 850)), [])
  const beat = useMemo(() => (world ? makeCompareBeat(world) : null), [world])

  if (!world || !beat) {
    return (
      <div style={{ position: 'relative', width: '100vw', height: '100dvh', overflow: 'hidden' }}>
        <WorldSelect title="Where shall we cook today?" worlds={PICK_WORLDS}
          onPick={(id) => { const w = worldById(id); if (w) { setScene(w.scenes[0]); setWorld(w) } }} onExit={exit} />
      </div>
    )
  }

  // Per-world demo + guided rounds — one per scene so the intro previews every vessel.
  const s0 = world.scenes[0], s1 = world.scenes[1] ?? world.scenes[0], s2 = world.scenes[2] ?? world.scenes[0]
  const DEMO_EXAMPLES: CompareData[] = [
    { scene: s0, vals: [2, 4], answerIdx: 1, mode: 'more', symbolic: false },
    { scene: s1, vals: [3, 1], answerIdx: 0, mode: 'more', symbolic: false },
  ]
  const GUIDED_DATA: CompareData = { scene: s2, vals: [2, 5], answerIdx: 1, mode: 'more', symbolic: false }
  const bgScene: SceneId = phase === 'practice' ? scene
    : phase === 'guided' ? GUIDED_DATA.scene
    : phase === 'demo' ? DEMO_EXAMPLES[demoIdx].scene
    : s0

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
      <style>{MK_CSS}</style>
      <Background scene={bgScene} scenes={world.scenes} />
      {TopBar}

      {phase === 'intro' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 45, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
          <div style={{ maxWidth: '74%', background: '#fff', border: '3px solid var(--outline)', borderRadius: 18, padding: '14px 20px', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19, color: 'var(--ink)', textAlign: 'center', boxShadow: '0 4px 0 rgba(61,37,22,.1)' }}>
            {world.intro}
          </div>
          <button onClick={() => setPhase('demo')}
            style={{ padding: '14px 38px', borderRadius: 50, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,var(--milo-orange),var(--milo-orange-deep))', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, boxShadow: '0 6px 16px rgba(242,107,44,.4)' }}>Let&apos;s go! ▶</button>
        </div>
      )}

      {phase === 'demo' && (<>{Banner(`Bigger means MORE! Watch Milo count  (${demoIdx + 1}/${DEMO_EXAMPLES.length})`)}
        <CompareExplain key={`demo${demoIdx}`} data={DEMO_EXAMPLES[demoIdx]}
          onDone={() => { if (demoIdx + 1 < DEMO_EXAMPLES.length) setDemoIdx(demoIdx + 1); else setPhase('guided') }} /></>)}

      {phase === 'guided' && (<>{Banner('Now you! Tap the one with MORE 👆')}
        <ComparePlay key="guided" data={GUIDED_DATA} mode="guided" onComplete={() => setPhase('practice')} /></>)}

      {phase === 'practice' && (
        <>
          <div style={{ position: 'absolute', top: 48, left: 0, right: 0, zIndex: 45, display: 'flex', justifyContent: 'center', padding: '0 12px' }}>
            <SkillBeat beat={beat} onInterlude={interlude}
              onRound={(data) => { if (data?.scene) { setScene(data.scene as SceneId); setFeast(f => [...f, SCENES[data.scene as SceneId].food]) } }}
              onComplete={(c, w, mastered) => { result.current.correct += c; result.current.wrong += w; finishChapter(result.current.correct, result.current.wrong, mastered) }} />
          </div>
          {feast.length > 0 && (
            <div style={{ position: 'fixed', bottom: 10, left: 0, right: 0, zIndex: 45, display: 'flex', justifyContent: 'center' }}>
              <div style={{ background: 'var(--paper)', border: '3px solid var(--milo-orange)', borderRadius: 999, padding: '6px 16px', display: 'flex', gap: 5, alignItems: 'center', boxShadow: '0 3px 0 rgba(242,107,44,.25)' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, color: 'var(--milo-orange)', marginRight: 2 }}>Feast</span>
                {feast.map((f, i) => <span key={i} style={{ fontSize: 22, animation: 'mk_pop .4s ease' }}>{f}</span>)}
              </div>
            </div>
          )}
        </>
      )}

      {phase !== 'intro' && <MiloChef left={11} top={80} milo={world.milo} />}
    </div>
  )
}
