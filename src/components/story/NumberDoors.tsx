'use client'
/**
 * Chapter 4 — number-RECOGNITION (skill `numberRecognition`). The child HEARS a number
 * and taps the object whose numeral matches the SOUND — recognition by ear, so the target
 * is spoken, never shown as readable prompt text. The child PICKS one of three worlds; in
 * each, the same "hear it → tap the matching numeral" skill is dressed differently and the
 * scene rotates across the 10 adaptive rounds (one continuous SkillBeat — harder on a
 * streak, easier when struggling, re-teach after 3 wrong):
 *   🚪 Number Doors — Milo the postman delivers to the door you hear  (houses · mailboxes · lockers · shops)
 *   🎈 Balloon Pop  — at the fair, pop the balloon you hear           (fairground · sky · open sky)
 *   🚌 Bus Stop     — catch the bus you hear                          (bus stop · depot · street)
 *
 * BLEND is the rule: doors/buses STAND on the ground (contact shadow + grounded), balloons
 * FLOAT in the sky (no ground shadow, gentle bob); each object shows its numeral on a clear
 * chip. Difficulty grows the listening load: range 1–5 → 1–10, choices 2 → 3 → 4, look-alike
 * distractors (6/9, 7/1) at the hardest tier. Wrapped by game/NumberDoorsChapter.tsx.
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { speak, speakSteps, useIsSpeaking, stopSpeech } from '@/lib/useMiloSpeaker'
import { SkillBeat, type Beat } from './StoryWorld'
import WorldSelect from './WorldSelect'

const SPEAK_LOCK_MS = 600
const rint = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))
const shuffle = <T,>(a: T[]): T[] => {
  const r = a.slice()
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]] }
  return r
}
const LOOKALIKE: Record<number, number> = { 6: 9, 9: 6, 7: 1, 1: 7, 3: 8, 8: 3, 5: 6, 2: 7 }

// ─── Scenes & Worlds ─────────────────────────────────────────────────────────────────
type ObjKind = 'door' | 'balloon' | 'bus'
type Scene =
  | 'houses' | 'mailboxes' | 'lockers' | 'shops'    // Number Doors
  | 'fair' | 'balloonsky' | 'skypark'               // Balloon Pop
  | 'busstop' | 'busdepot' | 'busstreet'            // Bus Stop

interface SceneInfo { bg: string; grad: string; kind: ObjKind }
const SCENE_INFO: Record<Scene, SceneInfo> = {
  houses:    { kind: 'door', grad: 'linear-gradient(#cdeeff 0%, #e7f6d8 56%, #bfe293 100%)', bg: '/assets/backgrounds/door_houses.jpeg' },
  mailboxes: { kind: 'door', grad: 'linear-gradient(#ffe9cf 0%, #fff0de 46%, #cfe9f5 100%)', bg: '/assets/backgrounds/door_street.jpeg' },
  lockers:   { kind: 'door', grad: 'linear-gradient(#eef1f7 0%, #e2e8f1 54%, #cfd8e6 100%)', bg: '/assets/backgrounds/door_lockers.jpeg' },
  shops:     { kind: 'door', grad: 'linear-gradient(#ffe6ef 0%, #fff0dd 54%, #ffe0c2 100%)', bg: '/assets/backgrounds/door_shops.jpeg' },
  fair:       { kind: 'balloon', grad: 'linear-gradient(#bfe7ff 0%, #d8f1e6 70%, #b6e29a 100%)', bg: '/assets/backgrounds/balloon_fair.png' },
  balloonsky: { kind: 'balloon', grad: 'linear-gradient(#bfe7ff 0%, #d8f1e6 76%, #cdeccf 100%)', bg: '/assets/backgrounds/order_balloonsky.png' },
  skypark:    { kind: 'balloon', grad: 'linear-gradient(#cfe8ff 0%, #eaf6ff 72%, #bfe293 100%)', bg: '/assets/backgrounds/sky.jpeg' },
  busstop:   { kind: 'bus', grad: 'linear-gradient(#cfe8ff 0%, #eaf2f7 56%, #c9ccd1 100%)', bg: '/assets/backgrounds/bus_stop.png' },
  busdepot:  { kind: 'bus', grad: 'linear-gradient(#dfeaf2 0%, #eef2f6 54%, #c8ccd0 100%)', bg: '/assets/backgrounds/bus_depot.png' },
  busstreet: { kind: 'bus', grad: 'linear-gradient(#cfe8ff 0%, #eaf2f7 54%, #c9ccd1 100%)', bg: '/assets/backgrounds/town_street.jpeg' },
}

interface RecogWorld {
  id: string; label: string; emoji: string
  scenes: Scene[]
  kind: ObjKind
  noun: string                         // "door" / "balloon" / "bus"
  milo: { src: string; emoji: string; accessory: string }
  intro: string
  verb: string                         // "Tap" / "Pop" / "Catch"
}
const WORLDS: RecogWorld[] = [
  { id: 'doors', label: "Number Doors", emoji: '🚪', scenes: ['houses', 'mailboxes', 'lockers', 'shops'], kind: 'door', noun: 'door',
    milo: { src: '/assets/characters/milo_postman.png', emoji: '🦊', accessory: '📬' },
    intro: 'Milo is delivering parcels! Listen for the number, then tap that door. First, watch Milo!', verb: 'Tap' },
  { id: 'balloons', label: "Balloon Pop", emoji: '🎈', scenes: ['fair', 'balloonsky', 'skypark'], kind: 'balloon', noun: 'balloon',
    milo: { src: '/assets/characters/milo_explorer.png', emoji: '🐴', accessory: '🎈' },
    intro: "Milo is at the fair! Listen for the number, then pop that balloon. First, watch Milo!", verb: 'Pop' },
  { id: 'buses', label: "Bus Stop", emoji: '🚌', scenes: ['busstop', 'busdepot', 'busstreet'], kind: 'bus', noun: 'bus',
    milo: { src: '/assets/characters/milo_idle.png', emoji: '🐴', accessory: '🚌' },
    intro: "Milo is at the bus stop! Listen for the number, then tap that bus. First, watch Milo!", verb: 'Catch' },
]
const worldById = (id: string) => WORLDS.find(w => w.id === id)
const PICK_WORLDS = WORLDS.map(w => ({ id: w.id, label: w.label, emoji: w.emoji, bgImage: SCENE_INFO[w.scenes[0]].bg }))

interface DoorRound { scene: Scene; doors: number[]; answerIdx: number }

function Background({ scene, scenes }: { scene: Scene; scenes: Scene[] }) {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#eef1f7' }}>
      {scenes.map(s => (
        <div key={s} style={{ position: 'absolute', inset: 0, opacity: s === scene ? 1 : 0, transition: 'opacity .6s ease' }}>
          <div style={{ position: 'absolute', inset: 0, background: SCENE_INFO[s].grad }} />
          <img src={SCENE_INFO[s].bg} alt="" draggable={false}
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      ))}
    </div>
  )
}

// ─── Milo (per world) ───────────────────────────────────────────────────────────────
function MiloHost({ left, milo }: { left: number; milo: RecogWorld['milo'] }) {
  const [step, setStep] = useState(0)
  const srcs = [milo.src, '/assets/characters/milo_idle.png']
  return (
    <div style={{ position: 'fixed', left: `${left}%`, bottom: 0, transform: 'translateX(-50%)', zIndex: 26, width: 'min(38vh, 340px)', height: 'min(38vh, 340px)' }}>
      <div style={{ width: '100%', height: '100%', animation: 'nd_float 3.4s ease-in-out infinite' }}>
        {step >= srcs.length
          ? <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
              <span style={{ fontSize: 110, filter: 'drop-shadow(0 5px 8px rgba(0,0,0,.35))' }}>{milo.emoji}</span>
              <span style={{ position: 'absolute', bottom: 12, right: 20, fontSize: 50 }}>{milo.accessory}</span>
            </div>
          : <img src={srcs[step]} alt="Milo" draggable={false} onError={() => setStep(s => s + 1)}
              style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'bottom', filter: 'drop-shadow(0 5px 8px rgba(0,0,0,.35))' }} />}
      </div>
    </div>
  )
}

// ─── Door face fallback (code-drawn) — used until the painted door PNG loads ─────────
const SCENE_FRAME: Partial<Record<Scene, { door: string; edge: string; plaque: string; topper: 'roof' | 'flag' | 'vent' | 'awning' }>> = {
  houses:    { door: '#e3914c', edge: '#a85f28', plaque: '#fff4e0', topper: 'roof' },
  mailboxes: { door: '#46a6a0', edge: '#2c6e69', plaque: '#eafaf8', topper: 'flag' },
  lockers:   { door: '#9fb1cc', edge: '#5f7596', plaque: '#eef3fb', topper: 'vent' },
  shops:     { door: '#7c9fe0', edge: '#4b6bb0', plaque: '#eef3ff', topper: 'awning' },
}
const SCENE_SPRITE: Partial<Record<Scene, string>> = {
  houses: '/assets/objects/door_house.png', mailboxes: '/assets/objects/door_mailbox.png',
  lockers: '/assets/objects/door_locker.png', shops: '/assets/objects/door_shop.png',
}
const SCENE_BBOX: Partial<Record<Scene, { W: number; H: number; x: number; y: number; w: number; h: number }>> = {
  houses:    { W: 1024, H: 1024, x: 190, y: 72,  w: 649, h: 871 },
  mailboxes: { W: 1024, H: 1024, x: 238, y: 174, w: 511, h: 675 },
  lockers:   { W: 1024, H: 1024, x: 226, y: 165, w: 573, h: 684 },
  shops:     { W: 1024, H: 1024, x: 210, y: 36,  w: 709, h: 925 },
}
const DOOR_W = 128, DOOR_H = 190
function DoorFace({ scene, scale }: { scene: Scene; scale: number }) {
  const f = SCENE_FRAME[scene]!
  const topH = DOOR_H * 0.2
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {f.topper === 'roof' && <div style={{ position: 'absolute', left: '6%', right: '6%', top: 0, height: topH, background: '#c0533a', clipPath: 'polygon(50% 0, 100% 100%, 0 100%)' }} />}
      {f.topper === 'awning' && <div style={{ position: 'absolute', left: 0, right: 0, top: topH * 0.45, height: topH * 0.6, borderRadius: 4 * scale, background: 'repeating-linear-gradient(90deg, #d9534f 0 14px, #fff 14px 28px)', border: `${2 * scale}px solid #b23b37` }} />}
      {f.topper === 'vent' && <div style={{ position: 'absolute', left: '24%', right: '24%', top: topH * 0.5, height: topH * 0.5, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>{[0, 1, 2].map(i => <div key={i} style={{ height: 3 * scale, background: f.edge, borderRadius: 2 }} />)}</div>}
      {f.topper === 'flag' && <div style={{ position: 'absolute', right: '4%', top: topH * 0.3, width: 10 * scale, height: topH, background: f.edge }}><div style={{ position: 'absolute', top: 0, left: 8 * scale, width: 16 * scale, height: 12 * scale, background: '#d9534f', borderRadius: 2 }} /></div>}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: topH, borderRadius: scene === 'lockers' ? `${6 * scale}px` : `${18 * scale}px ${18 * scale}px ${5 * scale}px ${5 * scale}px`, background: f.door, border: `${4 * scale}px solid ${f.edge}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `inset 0 ${5 * scale}px ${10 * scale}px rgba(255,255,255,.22), inset 0 ${-6 * scale}px ${10 * scale}px rgba(0,0,0,.18)` }}>
        <div style={{ width: 54 * scale, height: 38 * scale, background: f.plaque, borderRadius: 12 * scale, border: `${3 * scale}px solid ${f.edge}`, boxShadow: 'inset 0 2px 4px rgba(0,0,0,.12)' }} />
        <div style={{ position: 'absolute', right: 9 * scale, top: '52%', width: 10 * scale, height: 10 * scale, borderRadius: '50%', background: f.edge, boxShadow: 'inset -1px -1px 2px rgba(0,0,0,.3)' }} />
      </div>
    </div>
  )
}
function PaintedDoor({ scene, w, onError }: { scene: Scene; w: number; onError: () => void }) {
  const bb = SCENE_BBOX[scene]!
  const h = w * (bb.h / bb.w)
  const s = w / bb.w
  return (
    <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: w, height: h, overflow: 'hidden' }}>
      <img src={SCENE_SPRITE[scene]!} alt="" draggable={false} onError={onError}
        style={{ position: 'absolute', left: -bb.x * s, top: -bb.y * s, width: bb.W * s, height: bb.H * s, maxWidth: 'none' }} />
    </div>
  )
}

// ─── A numbered, tappable object (door / balloon / bus) ─────────────────────────────
// Per-kind footprint @1000px stage. Doors stand tall; balloons are roundish & float; buses
// are wide & stand on the road.
const BASE: Record<ObjKind, { w: number; h: number }> = { door: { w: 128, h: 190 }, balloon: { w: 118, h: 150 }, bus: { w: 210, h: 132 } }
// Colour variety for the recolourable sprites (balloon/bus) — a CSS hue-rotate per index so a
// row never looks identical; the numeral stays readable on its chip.
const HUES = [0, 45, 95, 150, 205, 280]
type ItemState = 'idle' | 'glow' | 'wrong' | 'open'

function RecogItem({ scene, kind, num, idx, state, scale, left, top, depth = 0.3, groundLine, float, onTap, aria }: {
  scene: Scene; kind: ObjKind; num: number; idx: number; state: ItemState; scale: number
  left: number; top: number; depth?: number; groundLine: number; float?: boolean; onTap?: () => void; aria: string
}) {
  const [imgOk, setImgOk] = useState(true)
  const b = BASE[kind]
  const dscale = scale * (1 - depth * 0.22)
  const W = b.w * dscale, H = b.h * dscale
  const lit = state === 'glow' || state === 'open'
  const shW = W * (kind === 'bus' ? 0.78 : 0.7)
  const shOp = Math.max(0.06, (0.26 - depth * 0.13) * (lit ? 0.5 : 1))
  // Doors carry the numeral on a sign ABOVE (full door visible). Balloons/buses carry a
  // SMALL chip ON their face — kept modest so the object reads around it (a big chip used
  // to hide the whole balloon/bus). Door chip stays generous since it floats above.
  const chip = Math.round((kind === 'door' ? 44 : 26) * dscale)
  const hue = HUES[idx % HUES.length]
  const litFilter = lit ? 'drop-shadow(0 0 18px var(--garden-green)) drop-shadow(0 0 12px var(--garden-green))' : 'drop-shadow(0 8px 10px rgba(0,0,0,.28))'

  // numeral chip position by kind: above doors, on the balloon's bulb, on the bus's sign.
  const chipTop = kind === 'door' ? '-16%' : kind === 'bus' ? '8%' : '15%'

  return (
    <>
      {!float && (
        <div aria-hidden style={{ position: 'fixed', left: `${left}%`, top: `${groundLine}%`, transform: 'translate(-50%,-50%)', zIndex: 28,
          width: shW, height: shW * 0.3, background: `radial-gradient(ellipse at center, rgba(38,28,18,${shOp}) 0%, rgba(38,28,18,0) 72%)`, pointerEvents: 'none' }} />
      )}
      <button onClick={onTap} disabled={!onTap} aria-label={aria}
        style={{ position: 'fixed', left: `${left}%`, top: `${top}%`, transform: 'translate(-50%,-50%)', zIndex: 30 + Math.round((1 - depth) * 6), width: W, height: H, padding: 0, border: 'none', background: 'transparent', cursor: onTap ? 'pointer' : 'default' }}>
        {/* numeral chip */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: chipTop, display: 'flex', justifyContent: 'center', zIndex: 7, pointerEvents: 'none' }}>
          <span style={{ background: 'var(--paper)', border: `${3 * dscale}px solid var(--milo-orange)`, borderRadius: 999, minWidth: chip, padding: `0 ${12 * dscale}px`, fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: chip, color: 'var(--ink)', lineHeight: 1.3, boxShadow: `0 ${3 * dscale}px 0 rgba(242,107,44,.3)` }}>{num}</span>
        </div>
        {/* the object */}
        <div style={{ position: 'absolute', inset: 0,
          animation: state === 'wrong' ? 'nd_shake .42s ease' : lit ? 'nd_pop .45s ease' : (float ? 'nd_bob 3.6s ease-in-out infinite' : 'none'),
          filter: litFilter }}>
          {kind === 'door'
            ? (imgOk ? <PaintedDoor scene={scene} w={W} onError={() => setImgOk(false)} /> : <DoorFace scene={scene} scale={dscale} />)
            : <img src={kind === 'balloon' ? '/assets/objects/balloon.png' : '/assets/objects/bus.png'} alt="" draggable={false}
                onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = '0.001' }}
                style={{ width: '100%', height: '100%', objectFit: 'contain', filter: `hue-rotate(${hue}deg) saturate(1.05)` }} />}
        </div>
      </button>
    </>
  )
}

// ─── Grounded / floating placement ──────────────────────────────────────────────────
function useItemScale(n: number, kind: ObjKind): number {
  const [scale, setScale] = useState(1.4)
  useEffect(() => {
    const b = BASE[kind]
    const calc = () => {
      const w = window.innerWidth, h = window.innerHeight
      const byWidth = w * (n <= 2 ? 0.30 : n <= 3 ? 0.22 : 0.17) / b.w
      const byHeight = (h * 0.5) / b.h
      setScale(Math.max(0.8, Math.min(byWidth, byHeight, 2.6)))
    }
    calc(); window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [n, kind])
  return scale
}
interface Placed { left: number; top: number; depth: number }
// Per-scene-kind ground tuning. Doors/buses stand low (grounded); balloons float high.
const KIND_GROUND: Record<ObjKind, { baseTop: number; rise: number; groundLine: number; float: boolean }> = {
  door:    { baseTop: 56, rise: 8, groundLine: 84, float: false },
  bus:     { baseTop: 64, rise: 7, groundLine: 86, float: false },
  balloon: { baseTop: 40, rise: 13, groundLine: 0, float: true },
}
const DEPTHS: Record<number, number[]> = { 2: [0.12, 0.55], 3: [0.5, 0.05, 0.65], 4: [0.6, 0.18, 0.4, 0.78] }
const XJIT: Record<number, number[]> = { 2: [-1.5, 1.5], 3: [-1.5, 1, -1], 4: [-1.5, 1, -1, 1.5] }
function placeFor(n: number, kind: ObjKind): Placed[] {
  const g = KIND_GROUND[kind]
  const xs = n <= 2 ? [33, 70] : n === 3 ? [26, 52, 80] : n === 4 ? [20, 42, 64, 87] : Array.from({ length: n }, (_, i) => 22 + (i * 66) / (n - 1))
  const depths = DEPTHS[n] ?? xs.map((_, i) => (i % 2 ? 0.55 : 0.2))
  const jit = XJIT[n] ?? xs.map(() => 0)
  return xs.map((x, i) => { const depth = depths[i] ?? 0.3; return { left: x + (jit[i] ?? 0), top: g.baseTop - depth * g.rise, depth } })
}

// ─── Round copy (per world) ────────────────────────────────────────────────────────
function promptFor(w: RecogWorld): string { return `Which ${w.noun} did Milo say?` }
function sayFor(w: RecogWorld, d: DoorRound): string {
  const t = d.doors[d.answerIdx]
  return `${w.verb} ${w.noun} number ${t}! Number ${t}.`
}

// ─── Play surface (guided / practice) ──────────────────────────────────────────────
type Mode = 'guided' | 'practice'
const ItemsPlay: React.FC<{ world: RecogWorld; data: DoorRound; mode: Mode; onComplete: (correct: boolean) => void }> = ({ world, data, mode, onComplete }) => {
  const { scene, doors, answerIdx } = data
  const target = doors[answerIdx]
  const n = doors.length
  const slots = placeFor(n, world.kind)
  const g = KIND_GROUND[world.kind]
  const scale = useItemScale(n, world.kind)
  const [openIdx, setOpenIdx] = useState<number | null>(null)
  const [wrongIdx, setWrongIdx] = useState<number | null>(null)
  const erred = useRef(false), done = useRef(false), wrongLock = useRef(false), tapLock = useRef(false)
  const speaking = useIsSpeaking()

  const finish = useCallback(() => {
    if (done.current) return; done.current = true
    if (mode === 'guided') speak(`Yes! Number ${target}! Great job!`)
    window.setTimeout(() => onComplete(mode === 'practice' ? !erred.current : true), 950)
  }, [mode, target, onComplete])

  useEffect(() => {
    if (mode === 'guided') speak(`Now you! Find ${world.noun} number ${target}. Tap it!`)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function tap(i: number) {
    if (done.current || speaking || tapLock.current) return
    if (i === answerIdx) {
      setOpenIdx(i)
      tapLock.current = true; window.setTimeout(() => { tapLock.current = false }, SPEAK_LOCK_MS)
      window.setTimeout(finish, 650)
    } else {
      erred.current = true; setWrongIdx(i)
      if (!wrongLock.current) { wrongLock.current = true; speak(`That's ${doors[i]}. Find number ${target}!`); window.setTimeout(() => { wrongLock.current = false }, 1300) }
      window.setTimeout(() => setWrongIdx(w => (w === i ? null : w)), 600)
    }
  }

  return (
    <>
      {doors.map((num, i) => {
        const state: ItemState = openIdx === i ? 'open' : wrongIdx === i ? 'wrong' : 'idle'
        return <RecogItem key={i} scene={scene} kind={world.kind} num={num} idx={i} state={state} scale={scale}
          left={slots[i].left} top={slots[i].top} depth={slots[i].depth} groundLine={g.groundLine} float={g.float} onTap={() => tap(i)} aria={`${world.noun} ${num}`} />
      })}
    </>
  )
}

// ─── Teaching demo (intro preview + 3-wrong re-teach) ──────────────────────────────
const ItemsExplain: React.FC<{ world: RecogWorld; data: DoorRound; onDone: () => void }> = ({ world, data, onDone }) => {
  const { scene, doors, answerIdx } = data
  const target = doors[answerIdx]
  const n = doors.length
  const slots = placeFor(n, world.kind)
  const g = KIND_GROUND[world.kind]
  const scale = useItemScale(n, world.kind)
  const [glow, setGlow] = useState(false)
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return; ran.current = true
    const lines = [
      `Milo wants ${world.noun} number ${target}.`,
      `${target}! Find the ${world.noun} that says ${target}.`,
      `There it is! Number ${target}.`,
    ]
    const cancel = speakSteps(lines, { onStep: (i) => { if (i === 2) setGlow(true) }, onDone: () => window.setTimeout(onDone, 700) })
    return cancel
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <>
      {doors.map((num, i) => (
        <RecogItem key={i} scene={scene} kind={world.kind} num={num} idx={i} state={i === answerIdx && glow ? 'glow' : 'idle'} scale={scale}
          left={slots[i].left} top={slots[i].top} depth={slots[i].depth} groundLine={g.groundLine} float={g.float} aria={`example ${num}`} />
      ))}
    </>
  )
}

// ─── Value generation ──────────────────────────────────────────────────────────────
function makeRound(world: RecogWorld, d: 1 | 2 | 3, round: number): DoorRound {
  const scene = world.scenes[round % world.scenes.length]
  const n = d === 1 ? 2 : d === 2 ? 3 : 4
  const max = d === 1 ? 5 : 10
  const target = rint(1, max)
  const opts = new Set<number>([target])
  if (d >= 3 && opts.size < n) { const la = LOOKALIKE[target]; if (la && la !== target && la <= max) opts.add(la) }
  while (opts.size < n) opts.add(rint(1, max))
  const doors = shuffle([...opts])
  return { scene, doors, answerIdx: doors.indexOf(target) }
}

function makeRecognizeBeat(world: RecogWorld): Beat<DoorRound> {
  return {
    skillId: 'numberRecognition', rounds: 10, reteachAfter: 3, walkEvery: 3,
    make: (d, round = 0) => makeRound(world, (d || 1) as 1 | 2 | 3, round),
    prompt: () => promptFor(world),
    say: d => sayFor(world, d),
    Play: ({ data, onSubmit }) => <ItemsPlay world={world} data={data} mode="practice" onComplete={onSubmit} />,
    Reteach: ({ data, onDone }) => <ItemsExplain world={world} data={data} onDone={onDone} />,
  }
}

// ─── Orchestrator ──────────────────────────────────────────────────────────────────
const ND_CSS = `
@keyframes nd_float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
@keyframes nd_bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
@keyframes nd_pop { 0%{transform:scale(1)} 40%{transform:scale(1.1)} 100%{transform:scale(1)} }
@keyframes nd_shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px) rotate(-2deg)} 75%{transform:translateX(6px) rotate(2deg)} }
`
type Phase = 'intro' | 'demo' | 'guided' | 'practice'
export default function NumberDoors({ world: forcedWorldId, onFinish, onExit }: {
  world?: string
  onFinish?: (correct: number, wrong: number, mastered?: boolean) => void
  onExit?: () => void
}) {
  const router = useRouter()
  const [world, setWorld] = useState<RecogWorld | null>(() => (forcedWorldId ? worldById(forcedWorldId) ?? null : null))
  const [phase, setPhase] = useState<Phase>('intro')
  const [scene, setScene] = useState<Scene>('houses')
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
  const beat = useMemo(() => (world ? makeRecognizeBeat(world) : null), [world])

  if (!world || !beat) {
    return (
      <div style={{ position: 'relative', width: '100vw', height: '100dvh', overflow: 'hidden' }}>
        <WorldSelect title="Where shall we find the numbers?" worlds={PICK_WORLDS}
          onPick={(id) => { const w = worldById(id); if (w) { setScene(w.scenes[0]); setWorld(w) } }} onExit={exit} />
      </div>
    )
  }

  // Per-world demo + guided rounds (drawn from this world's first scenes).
  const DEMO_ROUNDS: DoorRound[] = [
    { scene: world.scenes[0], doors: [2, 3], answerIdx: 1 },
    { scene: world.scenes[1] ?? world.scenes[0], doors: [5, 1, 8], answerIdx: 0 },
  ]
  const GUIDED_ROUND: DoorRound = { scene: world.scenes[2] ?? world.scenes[0], doors: [4, 2], answerIdx: 1 }
  const bgScene: Scene = phase === 'practice' ? scene : phase === 'guided' ? GUIDED_ROUND.scene : phase === 'demo' ? DEMO_ROUNDS[demoIdx].scene : world.scenes[0]

  const Banner = (text: string) => (
    <div style={{ position: 'absolute', top: 50, left: 0, right: 0, zIndex: 45, display: 'flex', justifyContent: 'center', padding: '0 12px' }}>
      <div style={{ background: 'var(--paper)', border: '3px solid var(--milo-orange)', borderRadius: 999, padding: '10px 24px', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 19, color: 'var(--milo-orange)', boxShadow: '0 4px 0 rgba(242,107,44,.25)', textAlign: 'center' }}>{text}</div>
    </div>
  )

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100dvh', overflow: 'hidden' }}>
      <style>{ND_CSS}</style>
      <Background scene={bgScene} scenes={world.scenes} />
      <div style={{ position: 'absolute', top: 12, left: 14, right: 14, display: 'flex', alignItems: 'center', zIndex: 50 }}>
        <button onClick={exit} style={{ padding: '7px 14px', borderRadius: 50, background: 'var(--paper)', border: '3px solid var(--milo-orange)', color: 'var(--milo-orange)', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>← Menu</button>
      </div>

      {phase === 'intro' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 45, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
          <div style={{ maxWidth: '74%', background: '#fff', border: '3px solid var(--outline)', borderRadius: 18, padding: '14px 20px', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19, color: 'var(--ink)', textAlign: 'center', boxShadow: '0 4px 0 rgba(61,37,22,.1)' }}>
            {world.intro}
          </div>
          <button onClick={() => setPhase('demo')}
            style={{ padding: '14px 38px', borderRadius: 50, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,var(--milo-orange),var(--milo-orange-deep))', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, boxShadow: '0 6px 16px rgba(242,107,44,.4)' }}>Let&apos;s go! ▶</button>
        </div>
      )}

      {phase === 'demo' && (<>{Banner(`Listen for the number  (${demoIdx + 1}/${DEMO_ROUNDS.length})`)}
        <ItemsExplain key={`demo${demoIdx}`} world={world} data={DEMO_ROUNDS[demoIdx]}
          onDone={() => { if (demoIdx + 1 < DEMO_ROUNDS.length) setDemoIdx(demoIdx + 1); else setPhase('guided') }} /></>)}

      {phase === 'guided' && (<>{Banner(`Now you! Tap the ${world.noun} Milo says`)}
        <ItemsPlay key="guided" world={world} data={GUIDED_ROUND} mode="guided" onComplete={() => setPhase('practice')} /></>)}

      {phase === 'practice' && (
        <div style={{ position: 'absolute', top: 48, left: 0, right: 0, zIndex: 45, display: 'flex', justifyContent: 'center', padding: '0 12px' }}>
          <SkillBeat beat={beat} onInterlude={interlude}
            onRound={(data) => { if (data?.scene) setScene(data.scene as Scene) }}
            onComplete={(c, w, mastered) => { result.current.correct += c; result.current.wrong += w; finishChapter(result.current.correct, result.current.wrong, mastered) }} />
        </div>
      )}

      {<MiloHost left={12} milo={world.milo} />}
    </div>
  )
}
