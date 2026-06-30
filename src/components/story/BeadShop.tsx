'use client'
/**
 * Chapter 8 — PATTERNS (skill `patterns`). A repeating colour pattern runs along a line with one
 * empty slot at the end; the child taps the item that comes NEXT from the tray. Pure "what comes
 * next" — one clean loop. The child first PICKS one of THREE storytellings; within the chosen one,
 * three object-scenes rotate across the 10 adaptive rounds (each scene = its own background + its
 * own repeating item), exactly like the colours chapter rotates fish→starfish→jelly:
 *   📿 Bead Shop — beads (necklace) · buttons (sewing table) · gems (jewellery counter)
 *   🎉 Party     — flags (bunting) · balloons (party wall) · lanterns (garden)
 *   🧸 Toy Box   — train cars (track) · blocks (playroom) · ducks (toy shelf)
 *
 * Difficulty grows the repeating unit (the adaptive `patternUnitLen`): AB → ABC → ABCD. The choices
 * are the unit's own colours, so the child must READ the pattern and pick the right next item. Items
 * are pure code-drawn and COLOUR-tinted in code (colour is the pattern variable, so it must stay
 * exact — same rule as the colours chapter); a greyscale sprite auto-upgrades each by tint when the
 * art exists, falling back to the code-drawn shape. One continuous adaptive SkillBeat (harder on a
 * streak, easier when struggling, re-teach after 3 wrong); wrapped by game/PatternsChapter.tsx.
 *
 * GROUNDING: things that rest on a surface (bead/button/gem/car/block/duck) carry a soft CONTACT
 * SHADOW; things that hang or float (flag/lantern/balloon) do not. The strung line stays a deliberate
 * straight row (the "what comes next" reading depends on it). The TRAY items are a loose pile, so they
 * get a gentle depth scatter + jitter + nearer-in-front z-order.
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { speak, speakSteps, useIsSpeaking, stopSpeech, unlockSpeech } from '@/lib/useMiloSpeaker'
import { SkillBeat, type Beat } from './StoryWorld'
import WorldSelect from './WorldSelect'
import { patternUnitLen, type Difficulty } from '@/lib/adaptive'

const SPEAK_LOCK_MS = 600
const shuffle = <T,>(a: T[]): T[] => {
  const r = a.slice()
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]] }
  return r
}

// ─── Colours (the pattern variable) ──────────────────────────────────────────────────
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

// ─── Item kinds ───────────────────────────────────────────────────────────────────────
// Each kind: its spoken noun, how its line is drawn (string through centre / cord at top / track at
// bottom / none for free-floating), the connector y as a fraction of the item box, and an optional
// greyscale sprite that gets tinted (the colour stays in code; dark parts like wheels/holes stay
// dark via multiply). Flags/lanterns/balloons hang or float → no ground shadow.
type ItemKind = 'bead' | 'button' | 'gem' | 'flag' | 'balloon' | 'lantern' | 'car' | 'block' | 'duck'
type Connector = 'string' | 'cord' | 'track' | 'none'
interface ItemMeta { noun: string; connector: Connector; line: number; src: string }
const ITEM_META: Record<ItemKind, ItemMeta> = {
  bead:    { noun: 'bead',      connector: 'string', line: 0.5,  src: '/assets/objects/pat_bead.png' },
  button:  { noun: 'button',    connector: 'string', line: 0.5,  src: '/assets/objects/pat_button.png' },
  gem:     { noun: 'gem',       connector: 'string', line: 0.5,  src: '/assets/objects/pat_gem.png' },
  flag:    { noun: 'flag',      connector: 'cord',   line: 0.08, src: '/assets/objects/pat_flag.png' },
  balloon: { noun: 'balloon',   connector: 'none',   line: 0.5,  src: '/assets/objects/pat_balloon.png' },
  lantern: { noun: 'lantern',   connector: 'cord',   line: 0.07, src: '/assets/objects/pat_lantern.png' },
  car:     { noun: 'train car', connector: 'track',  line: 0.9,  src: '/assets/objects/pat_car.png' },
  block:   { noun: 'block',     connector: 'track',  line: 0.93, src: '/assets/objects/pat_block.png' },
  duck:    { noun: 'duck',      connector: 'track',  line: 0.92, src: '/assets/objects/pat_duck.png' },
}
const NO_SHADOW = new Set<ItemKind>(['flag', 'lantern', 'balloon'])  // hang or float
const TOP_ALIGN = new Set<ItemKind>(['flag', 'lantern', 'balloon'])  // anchored at the top

// ─── Worlds ──────────────────────────────────────────────────────────────────────────
interface Scene { kind: ItemKind; grad: string; img: string }
interface PatternWorld {
  id: string; label: string; emoji: string
  scenes: Scene[]
  milo: { srcs: string[]; emoji: string; accessory: string }
  intro: string
}
const WORLDS: PatternWorld[] = [
  { id: 'beads', label: 'Bead Shop', emoji: '📿',
    scenes: [
      { kind: 'bead',   grad: 'linear-gradient(#ffe9cf 0%, #fff3e2 52%, #f3dcc0 100%)', img: '/assets/backgrounds/bead_shop.png' },
      { kind: 'button', grad: 'linear-gradient(#ffeede 0%, #fff5ea 52%, #ecd9bf 100%)', img: '/assets/backgrounds/craft_buttons.png' },
      { kind: 'gem',    grad: 'linear-gradient(#f3e9ff 0%, #fbf3ff 52%, #e6d8f2 100%)', img: '/assets/backgrounds/craft_gems.png' },
    ],
    milo: { srcs: ['/assets/characters/milo_beads.png', '/assets/characters/milo_idle.png'], emoji: '🐴', accessory: '📿' },
    intro: 'Milo is making jewellery in his Bead Shop! The colours make a pattern that repeats. Find what comes next. First, watch Milo!' },
  { id: 'party', label: 'Party', emoji: '🎉',
    scenes: [
      { kind: 'flag',    grad: 'linear-gradient(#e7f3ff 0%, #fff3e2 52%, #ffe2ef 100%)', img: '/assets/backgrounds/party_banner.png' },
      { kind: 'balloon', grad: 'linear-gradient(#ffe9f4 0%, #fff4ec 52%, #ffe0cf 100%)', img: '/assets/backgrounds/party_balloons.png' },
      { kind: 'lantern', grad: 'linear-gradient(#cdd6f0 0%, #e3e7f6 52%, #d7c9e6 100%)', img: '/assets/backgrounds/party_lanterns.png' },
    ],
    milo: { srcs: ['/assets/characters/milo_idle.png', '/assets/characters/milo_explorer.png'], emoji: '🐴', accessory: '🎉' },
    intro: 'Milo is decorating for a party! The colours make a pattern that repeats. Find what comes next. First, watch Milo!' },
  { id: 'toys', label: 'Toy Box', emoji: '🧸',
    scenes: [
      { kind: 'car',   grad: 'linear-gradient(#dff0ff 0%, #eef6ff 52%, #d7e3ec 100%)', img: '/assets/backgrounds/train_station.png' },
      { kind: 'block', grad: 'linear-gradient(#fff0d9 0%, #fff6ea 52%, #e9dcc4 100%)', img: '/assets/backgrounds/toy_blocks.png' },
      { kind: 'duck',  grad: 'linear-gradient(#e7f6ff 0%, #f2fbff 52%, #d9ecd6 100%)', img: '/assets/backgrounds/toy_ducks.png' },
    ],
    milo: { srcs: ['/assets/characters/milo_idle.png', '/assets/characters/milo_explorer.png'], emoji: '🐴', accessory: '🧸' },
    intro: 'Milo is lining up his toys! The colours make a pattern that repeats. Find what comes next. First, watch Milo!' },
]
const worldById = (id: string) => WORLDS.find(w => w.id === id)
const PICK_WORLDS = WORLDS.map(w => ({ id: w.id, label: w.label, emoji: w.emoji, bgImage: w.scenes[0].img }))

// ─── Round shape ─────────────────────────────────────────────────────────────────────
interface PatternRound {
  kind: ItemKind
  unit: BeadColor[]
  sequence: BeadColor[]
  choices: BeadColor[]
  answer: BeadColor
  answerIdx: number
}

const LEN_OPTS: Record<number, number[]> = { 2: [4, 5], 3: [4, 5, 6], 4: [5, 6, 7] }

function makePatternRound(world: PatternWorld, d: Difficulty, round: number): PatternRound {
  const kind = world.scenes[round % world.scenes.length].kind
  const unitLen = patternUnitLen(d)
  const start = (round * 2) % BEAD_ORDER.length
  const unit: BeadColor[] = Array.from({ length: unitLen }, (_, i) => BEAD_ORDER[(start + i) % BEAD_ORDER.length])
  const opts = LEN_OPTS[unitLen] ?? [unitLen + 1]
  const L = opts[round % opts.length]
  const sequence: BeadColor[] = Array.from({ length: L }, (_, i) => unit[i % unitLen])
  const answer = unit[L % unitLen]
  const choices = [...unit]
  if (choices.length < 3) choices.push(BEAD_ORDER[(start + unitLen) % BEAD_ORDER.length])
  const shuffled = shuffle(choices)
  return { kind, unit, sequence, choices: shuffled, answer, answerIdx: shuffled.indexOf(answer) }
}

// ─── Background (cross-fade across the world's scenes) ────────────────────────────────
function Background({ kind, scenes }: { kind: ItemKind; scenes: Scene[] }) {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#fff3e2' }}>
      {scenes.map(s => (
        <div key={s.kind} style={{ position: 'absolute', inset: 0, opacity: s.kind === kind ? 1 : 0, transition: 'opacity .6s ease' }}>
          <div style={{ position: 'absolute', inset: 0, background: s.grad }} />
          <img src={s.img} alt="" draggable={false}
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      ))}
    </div>
  )
}

// ─── Responsive item sizing ───────────────────────────────────────────────────────────
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

// ─── Optional painted greyscale sprites (auto-upgrade by tint) ───────────────────────
const _objLoaded: Record<string, boolean> = {}
function usePaintedObject(src?: string): boolean {
  const [, force] = useState(0)
  useEffect(() => {
    if (!src || src in _objLoaded) return
    const img = new Image()
    img.onload = () => { _objLoaded[src] = true; force(n => n + 1) }
    img.onerror = () => { _objLoaded[src] = false; force(n => n + 1) }
    img.src = src
  }, [src])
  return src ? (_objLoaded[src] ?? false) : false
}

// ─── A single item (painted-tinted sprite, or code-drawn fallback) ──────────────────
type BeadState = 'idle' | 'glow' | 'wrong' | 'pop'
function Item({ kind, color, size, state = 'idle', depth = 0, shadow = true }: {
  kind: ItemKind; color: BeadColor; size: number; state?: BeadState; depth?: number; shadow?: boolean
}) {
  const { hex, deep } = BEADS[color]
  const lit = state === 'glow'
  const box = size * (1 - depth * 0.18)
  const H = box * 1.18
  const shW = box * 0.82
  const shOp = Math.max(0.05, (0.24 - depth * 0.1) * (lit ? 0.5 : 1))
  const anim = state === 'wrong' ? 'bs_shake .42s ease' : state === 'pop' || lit ? 'bs_pop .45s ease' : undefined
  const glowShadow = '0 0 16px var(--garden-green), 0 0 9px var(--garden-green)'
  const glowFilter = 'drop-shadow(0 0 12px var(--garden-green)) drop-shadow(0 0 7px var(--garden-green))'
  const groundShadow = NO_SHADOW.has(kind) ? false : shadow
  const src = ITEM_META[kind].src
  const painted = usePaintedObject(src)
  const topAligned = TOP_ALIGN.has(kind)
  const pos = topAligned ? 'top' : 'center'
  const tintH = kind === 'balloon' ? box * 1.18 : (kind === 'flag' || kind === 'lantern') ? box * 1.08 : box
  const mask = {
    WebkitMaskImage: `url(${src})`, maskImage: `url(${src})`,
    WebkitMaskSize: 'contain', maskSize: 'contain',
    WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
    WebkitMaskPosition: pos, maskPosition: pos,
  } as const

  return (
    <div style={{ position: 'relative', width: box, height: H, display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
      {groundShadow && (
        <div aria-hidden style={{ position: 'absolute', left: '50%', bottom: 0, transform: 'translateX(-50%)',
          width: shW, height: shW * 0.3, pointerEvents: 'none',
          background: `radial-gradient(ellipse at center, rgba(38,28,18,${shOp}) 0%, rgba(38,28,18,0) 72%)` }} />
      )}

      {/* painted greyscale sprite, tinted to the hex (auto-upgrade); else the code-drawn shape */}
      {painted && (
        <div style={{ width: box, height: tintH, position: 'relative', isolation: 'isolate', animation: anim,
          filter: lit ? glowFilter : 'drop-shadow(0 3px 4px rgba(0,0,0,.28))' }}>
          <div style={{ position: 'absolute', inset: 0, background: hex, ...mask }} />
          <img src={src} alt="" draggable={false} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', objectPosition: pos, mixBlendMode: 'multiply' }} />
        </div>
      )}

      {!painted && kind === 'flag' && (
        <div style={{ width: box, height: box * 1.08, position: 'relative', animation: anim,
          filter: lit ? 'drop-shadow(0 0 12px var(--garden-green)) drop-shadow(0 0 7px var(--garden-green))' : 'drop-shadow(0 3px 4px rgba(0,0,0,.28))' }}>
          <div style={{ position: 'absolute', left: '50%', top: 0, transform: 'translateX(-50%)', width: box * 0.16, height: box * 0.16, borderRadius: '50%', border: `${Math.max(1.5, box * 0.04)}px solid ${deep}`, background: 'transparent' }} />
          <div style={{ position: 'absolute', left: 0, top: box * 0.12, width: box, height: box * 0.9,
            background: `linear-gradient(160deg, rgba(255,255,255,.55), ${hex} 38%, ${deep} 100%)`, clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }} />
        </div>
      )}

      {!painted && kind === 'car' && (
        <div style={{ width: box, height: box, position: 'relative', animation: anim,
          filter: lit ? 'drop-shadow(0 0 12px var(--garden-green)) drop-shadow(0 0 7px var(--garden-green))' : 'none' }}>
          <div style={{ position: 'absolute', left: box * 0.06, top: box * 0.12, width: box * 0.88, height: box * 0.58, borderRadius: box * 0.16,
            background: `linear-gradient(#ffffff22, ${hex} 30%, ${deep} 100%)`, border: `${Math.max(1.5, box * 0.03)}px solid ${deep}`, boxShadow: 'inset 0 -3px 5px rgba(0,0,0,.2)' }} />
          <div style={{ position: 'absolute', left: box * 0.2, top: box * 0.2, width: box * 0.32, height: box * 0.22, borderRadius: box * 0.06, background: 'rgba(255,255,255,.7)', border: `${Math.max(1, box * 0.02)}px solid ${deep}` }} />
          <div style={{ position: 'absolute', left: box * 0.2, top: box * 0.66, width: box * 0.2, height: box * 0.2, borderRadius: '50%', background: '#3a3a3a', border: `${Math.max(1.5, box * 0.03)}px solid #1f1f1f` }} />
          <div style={{ position: 'absolute', left: box * 0.58, top: box * 0.66, width: box * 0.2, height: box * 0.2, borderRadius: '50%', background: '#3a3a3a', border: `${Math.max(1.5, box * 0.03)}px solid #1f1f1f` }} />
        </div>
      )}

      {/* generic glossy-orb fallback for bead/button/gem/balloon/lantern/block/duck before their art loads */}
      {!painted && kind !== 'flag' && kind !== 'car' && (
        <div style={{
          width: box, height: box, borderRadius: '50%',
          background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,.85), ${hex} 46%, ${deep} 100%)`,
          border: `${Math.max(1.5, box * 0.03)}px solid ${deep}`,
          boxShadow: lit ? glowShadow : '0 3px 5px rgba(0,0,0,.28), inset 0 -2px 4px rgba(0,0,0,.18)',
          animation: anim,
        }} />
      )}
    </div>
  )
}

// The empty "next" slot, ghosted per item kind.
function EmptySlot({ kind, box }: { kind: ItemKind; box: number }) {
  const dash = `${Math.max(2, box * 0.05)}px dashed var(--milo-orange)`
  if (kind === 'flag') {
    return <div style={{ width: box, height: box * 0.9, marginTop: box * 0.12, background: 'rgba(255,255,255,.32)', border: dash, clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }} />
  }
  if (kind === 'car' || kind === 'block') {
    return <div style={{ width: box * 0.88, height: box * 0.58, marginTop: box * 0.16, borderRadius: box * 0.16, border: dash, background: 'rgba(255,255,255,.32)' }} />
  }
  return <div style={{ width: box, height: box, borderRadius: '50%', border: dash, background: 'rgba(255,255,255,.35)' }} />
}

// ─── The strung line (sequence + the empty "next" slot) ──────────────────────────────
function Strip({ kind, sequence, fill, beadPx }: { kind: ItemKind; sequence: BeadColor[]; fill: BeadColor | null; beadPx: number }) {
  const meta = ITEM_META[kind]
  const gap = Math.max(4, beadPx * 0.18)
  const lineTop = beadPx * meta.line
  const lineColor = meta.connector === 'cord' ? 'linear-gradient(#9c7b51,#7d5f3a)'
    : meta.connector === 'track' ? 'linear-gradient(#b8bcc2,#8d9298)'
    : 'linear-gradient(#caa46a,#a07c44)'
  const lineH = meta.connector === 'track' ? Math.max(4, beadPx * 0.1) : Math.max(3, beadPx * 0.06)
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap, padding: `0 ${beadPx * 0.4}px`, maxWidth: '94vw' }}>
      {meta.connector !== 'none' && (
        <div style={{ position: 'absolute', left: beadPx * 0.2, right: beadPx * 0.2, top: lineTop, height: lineH, transform: 'translateY(-50%)', background: lineColor, borderRadius: 99, zIndex: 0 }} />
      )}
      {meta.connector === 'string' && (
        <div style={{ width: beadPx * 0.34, height: beadPx * 0.34, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%, #fff8, #d9b25e 50%, #a87f2f)', border: '1.5px solid #8a6724', zIndex: 1, flexShrink: 0, marginTop: lineTop - beadPx * 0.17 }} />
      )}
      {sequence.map((c, i) => (
        <div key={i} style={{ zIndex: 1, flexShrink: 0 }}><Item kind={kind} color={c} size={beadPx} /></div>
      ))}
      <div style={{ zIndex: 1, flexShrink: 0, width: beadPx, height: beadPx * 1.18, display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
        {fill
          ? <Item kind={kind} color={fill} size={beadPx} state="pop" />
          : <EmptySlot kind={kind} box={beadPx} />}
      </div>
    </div>
  )
}

// ─── The tray (the tappable choices) ─────────────────────────────────────────────────
const TRAY_DEPTHS: Record<number, number[]> = { 1: [0.2], 2: [0.15, 0.5], 3: [0.45, 0.05, 0.6], 4: [0.6, 0.15, 0.4, 0.75] }
const TRAY_YJIT: Record<number, number[]> = { 1: [0], 2: [2, -2], 3: [3, -2, 4], 4: [4, -2, 1, 5] }
function Tray({ kind, choices, beadPx, stateFor, onTap }: {
  kind: ItemKind; choices: BeadColor[]; beadPx: number; stateFor: (i: number) => BeadState; onTap?: (i: number) => void
}) {
  const n = choices.length
  const depths = TRAY_DEPTHS[n] ?? choices.map((_, i) => (i % 2 ? 0.5 : 0.15))
  const yjit = TRAY_YJIT[n] ?? choices.map(() => 0)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 'clamp(12px,3vw,30px)', flexWrap: 'wrap',
      background: 'rgba(255,255,255,.5)', borderRadius: 26, padding: 'clamp(10px,2vh,18px) clamp(14px,3vw,28px)', border: '3px solid rgba(140,110,70,.5)', boxShadow: '0 5px 0 rgba(61,37,22,.1)' }}>
      {choices.map((c, i) => {
        const depth = depths[i] ?? 0.3
        return (
          <button key={i} onClick={onTap ? () => onTap(i) : undefined} disabled={!onTap} aria-label={`${BEADS[c].label} ${ITEM_META[kind].noun}`}
            style={{ background: 'transparent', border: 'none', padding: 0, cursor: onTap ? 'pointer' : 'default', lineHeight: 0,
              marginTop: yjit[i] ?? 0, position: 'relative', zIndex: 2 + Math.round((1 - depth) * 4),
              transform: stateFor(i) === 'glow' ? 'scale(1.12)' : 'scale(1)', transition: 'transform .2s' }}>
            <Item kind={kind} color={c} size={beadPx} state={stateFor(i)} depth={depth} />
          </button>
        )
      })}
    </div>
  )
}

// ─── Milo (per world) ────────────────────────────────────────────────────────────────
function MiloBead({ left, milo }: { left: number; milo: PatternWorld['milo'] }) {
  const [step, setStep] = useState(0)
  return (
    <div style={{ position: 'fixed', left: `${left}%`, bottom: 0, transform: 'translateX(-50%)', zIndex: 26, width: 'min(30vh, 260px)', height: 'min(30vh, 260px)' }}>
      <div style={{ width: '100%', height: '100%', animation: 'bs_float 3.4s ease-in-out infinite' }}>
        {step >= milo.srcs.length
          ? <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
              <span style={{ fontSize: 92, filter: 'drop-shadow(0 5px 8px rgba(0,0,0,.35))' }}>{milo.emoji}</span>
              <span style={{ position: 'absolute', bottom: 8, right: 10, fontSize: 40 }}>{milo.accessory}</span>
            </div>
          : <img src={milo.srcs[step]} alt="Milo" draggable={false} onError={() => setStep(s => s + 1)}
              style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'bottom', filter: 'drop-shadow(0 5px 8px rgba(0,0,0,.35))' }} />}
      </div>
    </div>
  )
}

const NECKLACE_TOP = 40
const TRAY_TOP = 64
const bandStyle = (top: number): React.CSSProperties => ({
  position: 'fixed', top: `${top}%`, left: 0, right: 0, transform: 'translateY(-50%)',
  zIndex: 40, display: 'flex', justifyContent: 'center', padding: '0 12px',
})

// ─── Round copy ──────────────────────────────────────────────────────────────────
const promptFor = (): string => 'What comes next?'
const sayFor = (d: PatternRound): string => `Look at the pattern. What ${ITEM_META[d.kind].noun} comes next? Tap it!`

// ─── The interactive play surface (guided / practice) ──────────────────────────────
type Mode = 'guided' | 'practice'
const BeadsPlay: React.FC<{ data: PatternRound; mode: Mode; onComplete: (correct: boolean) => void }> = ({ data, mode, onComplete }) => {
  const { kind, sequence, choices, answer, answerIdx } = data
  const noun = ITEM_META[kind].noun
  const { stringBead, trayBead } = useBeadSizes(sequence.length)
  const [pickedIdx, setPickedIdx] = useState<number | null>(null)
  const [wrongIdx, setWrongIdx] = useState<number | null>(null)
  const erred = useRef(false), done = useRef(false), wrongLock = useRef(false), tapLock = useRef(false)
  const speaking = useIsSpeaking()
  const solved = pickedIdx !== null

  const finish = useCallback(() => {
    if (done.current) return; done.current = true
    if (mode === 'guided') speak(`Yes! The ${BEADS[answer].label} ${noun}! Great pattern!`)
    window.setTimeout(() => onComplete(mode === 'practice' ? !erred.current : true), 950)
  }, [mode, answer, noun, onComplete])

  useEffect(() => {
    if (mode === 'guided') speak(`Now you! What ${noun} comes next? Tap it!`)
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
        <Strip kind={kind} sequence={sequence} fill={solved ? answer : null} beadPx={stringBead} />
      </div>
      <div style={bandStyle(TRAY_TOP)}>
        <Tray kind={kind} choices={choices} beadPx={trayBead}
          stateFor={(i) => pickedIdx === i ? 'glow' : wrongIdx === i ? 'wrong' : 'idle'}
          onTap={tap} />
      </div>
    </>
  )
}

// ─── The teaching demo (opening preview + 3-wrong re-teach) ─────────────────────────
const BeadsExplain: React.FC<{ data: PatternRound; onDone: () => void }> = ({ data, onDone }) => {
  const { kind, unit, sequence, choices, answer, answerIdx } = data
  const noun = ITEM_META[kind].noun
  const { stringBead, trayBead } = useBeadSizes(sequence.length)
  const [revealed, setRevealed] = useState(false)
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return; ran.current = true
    const unitWords = unit.map(c => BEADS[c].label).join(', ')
    const lines = [
      `Look at the pattern! It goes ${unitWords}, ${unitWords}, over and over.`,
      `So the next ${noun} is ${BEADS[answer].label}!`,
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
        <Strip kind={kind} sequence={sequence} fill={revealed ? answer : null} beadPx={stringBead} />
      </div>
      <div style={bandStyle(TRAY_TOP)}>
        <Tray kind={kind} choices={choices} beadPx={trayBead}
          stateFor={(i) => revealed && i === answerIdx ? 'glow' : 'idle'} />
      </div>
    </>
  )
}

// ─── The scored practice (SkillBeat) — one continuous adaptive sequence ────────────
function makePatternBeat(world: PatternWorld): Beat<PatternRound> {
  return {
    skillId: 'patterns', rounds: 10, reteachAfter: 3, walkEvery: 3,
    make: (d, round = 0) => makePatternRound(world, (d || 1) as Difficulty, round),
    prompt: () => promptFor(),
    say: d => sayFor(d),
    Play: ({ data, onSubmit }) => <BeadsPlay data={data} mode="practice" onComplete={onSubmit} />,
    Reteach: ({ data, onDone }) => <BeadsExplain data={data} onDone={onDone} />,
  }
}

// ─── Orchestrator ──────────────────────────────────────────────────────────────────
const BS_CSS = `
@keyframes bs_float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
@keyframes bs_pop { 0%{transform:scale(.3);opacity:.4} 55%{transform:scale(1.18);opacity:1} 100%{transform:scale(1)} }
@keyframes bs_shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px) rotate(-3deg)} 75%{transform:translateX(6px) rotate(3deg)} }
`

type Phase = 'intro' | 'demo' | 'guided' | 'practice'
export default function BeadShop({ world: forcedWorldId, onFinish, onExit }: {
  world?: string
  onFinish?: (correct: number, wrong: number, mastered?: boolean) => void
  onExit?: () => void
}) {
  const router = useRouter()
  const [world, setWorld] = useState<PatternWorld | null>(() => (forcedWorldId ? worldById(forcedWorldId) ?? null : null))
  const [phase, setPhase] = useState<Phase>('intro')
  const [scene, setScene] = useState<ItemKind>('bead')
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
  const beat = useMemo(() => (world ? makePatternBeat(world) : null), [world])

  if (!world || !beat) {
    return (
      <div style={{ position: 'relative', width: '100vw', height: '100dvh', overflow: 'hidden' }}>
        <WorldSelect title="Where shall we make patterns?" worlds={PICK_WORLDS}
          onPick={(id) => { const w = worldById(id); if (w) { setScene(w.scenes[0].kind); setWorld(w) } }} onExit={exit} />
      </div>
    )
  }

  // Per-world demo + guided rounds — one per scene so the intro previews all three items.
  const k0 = world.scenes[0].kind, k1 = (world.scenes[1] ?? world.scenes[0]).kind, k2 = (world.scenes[2] ?? world.scenes[0]).kind
  const DEMO_ROUNDS: PatternRound[] = [
    { kind: k0, unit: ['red', 'blue'], sequence: ['red', 'blue', 'red', 'blue', 'red'], choices: ['blue', 'red', 'green'], answer: 'blue', answerIdx: 0 },
    { kind: k1, unit: ['green', 'yellow', 'purple'], sequence: ['green', 'yellow', 'purple', 'green', 'yellow'], choices: ['green', 'yellow', 'purple'], answer: 'purple', answerIdx: 2 },
  ]
  const GUIDED_ROUND: PatternRound = { kind: k2, unit: ['orange', 'pink'], sequence: ['orange', 'pink', 'orange', 'pink'], choices: ['pink', 'orange', 'blue'], answer: 'orange', answerIdx: 1 }
  const bgKind: ItemKind = phase === 'practice' ? scene
    : phase === 'guided' ? GUIDED_ROUND.kind
    : phase === 'demo' ? DEMO_ROUNDS[demoIdx].kind
    : k0

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
      <Background kind={bgKind} scenes={world.scenes} />
      {TopBar}

      {phase === 'intro' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 45, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
          <div style={{ maxWidth: '74%', background: '#fff', border: '3px solid var(--outline)', borderRadius: 18, padding: '14px 20px', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19, color: 'var(--ink)', textAlign: 'center', boxShadow: '0 4px 0 rgba(61,37,22,.1)' }}>
            {world.intro}
          </div>
          <button onClick={() => { unlockSpeech(); setPhase('demo') }}
            style={{ padding: '14px 38px', borderRadius: 50, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,var(--milo-orange),var(--milo-orange-deep))', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, boxShadow: '0 6px 16px rgba(242,107,44,.4)' }}>Let&apos;s go! ▶</button>
        </div>
      )}

      {phase === 'demo' && (<>{Banner(`Watch the pattern  (${demoIdx + 1}/${DEMO_ROUNDS.length})`)}
        <BeadsExplain key={`demo${demoIdx}`} data={DEMO_ROUNDS[demoIdx]}
          onDone={() => { if (demoIdx + 1 < DEMO_ROUNDS.length) setDemoIdx(demoIdx + 1); else setPhase('guided') }} /></>)}

      {phase === 'guided' && (<>{Banner(`Now you! Tap the ${ITEM_META[GUIDED_ROUND.kind].noun} that comes next`)}
        <BeadsPlay key="guided" data={GUIDED_ROUND} mode="guided" onComplete={() => setPhase('practice')} /></>)}

      {phase === 'practice' && (
        <div style={{ position: 'absolute', top: 48, left: 0, right: 0, bottom: 0, zIndex: 45 }}>
          <SkillBeat beat={beat} onInterlude={interlude}
            onRound={(data) => { if (data?.kind) setScene(data.kind as ItemKind) }}
            onComplete={(c, w, mastered) => { result.current.correct += c; result.current.wrong += w; finishChapter(result.current.correct, result.current.wrong, mastered) }} />
        </div>
      )}

      {phase !== 'intro' && <MiloBead left={11} milo={world.milo} />}
    </div>
  )
}
