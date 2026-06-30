'use client'
/**
 * Chapter 11 — MEASUREMENT (skill `measurement`): comparing two things on ONE attribute.
 * The child taps the one that is MORE (or LESS) of that attribute. The real skill is reading
 * magnitude visually. The child PICKS one of three worlds; each world IS one attribute, with the
 * scene rotating across its 3 objects over the 10 adaptive rounds (one continuous SkillBeat —
 * harder = smaller gap, gentler = bigger gap, re-teach after 3 wrong):
 *   🌳 Tall Forest   — taller / shorter   (tree · sunflower · giraffe)   two of one, sized
 *   🐍 Long Trail    — longer / shorter   (snake · train · caterpillar)  two of one, stretched
 *   ⚖️ Balance Market — heavier / lighter  (watermelon·cherry · pumpkin·apple · sack·strawberry)  a tipping scale
 *
 * BLEND: forest/trail items sit on a ground band with a contact shadow; the balance is a
 * code-drawn beam whose heavier pan dips. Difficulty = how CLOSE the two magnitudes are
 * (big gap = obvious, gap of 1 = subtle). Sprites auto-upgrade from emoji → PNG when present.
 * Wrapped by game/MeasurementChapter.tsx.
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { speak, speakSteps, stopSpeech } from '@/lib/useMiloSpeaker'
import { SkillBeat, type Beat } from './StoryWorld'
import WorldSelect from './WorldSelect'

type Attr = 'height' | 'length' | 'weight'
type Scene =
  | 'tree' | 'sunflower' | 'giraffe' | 'tulip' | 'daisy' | 'pine'   // Tall Forest (height)
  | 'snake' | 'train' | 'caterpillar' | 'engine' | 'bus' | 'fish'   // Long Trail (length)
  | 'melon' | 'pumpkin' | 'sack' | 'crate' | 'bucket' | 'fruitbowl' // Balance Market (keyed by the heavy item)

interface Obj { noun: string; img: string; emoji: string }
interface SceneCfg {
  single?: Obj            // height / length: the same object shown twice
  heavy?: Obj; light?: Obj // weight: two different objects on the scale
  bg: { grad: string; img: string }
}
const SCENE: Record<Scene, SceneCfg> = {
  // Tall Forest (height) — two of the same, one taller
  tree:      { single: { noun: 'tree', img: '/assets/objects/tree.png', emoji: '🌳' },               bg: { grad: 'linear-gradient(#cfe9f7 0%, #dff0d8 52%, #b6db94 100%)', img: '/assets/backgrounds/forest_1.jpeg' } },
  sunflower: { single: { noun: 'sunflower', img: '/assets/objects/flower_sunflower.png', emoji: '🌻' }, bg: { grad: 'linear-gradient(#d6efff 0%, #e6f5d8 52%, #c2e69a 100%)', img: '/assets/backgrounds/town_garden.jpeg' } },
  giraffe:   { single: { noun: 'giraffe', img: '/assets/objects/giraffe.png', emoji: '🦒' },          bg: { grad: 'linear-gradient(#fdeecb 0%, #f6e3b0 52%, #e3c585 100%)', img: '/assets/backgrounds/farm_orchard.png' } },
  tulip:     { single: { noun: 'tulip', img: '/assets/objects/flower_tulip.png', emoji: '🌷' },        bg: { grad: 'linear-gradient(#d6efff 0%, #e6f5d8 52%, #c2e69a 100%)', img: '/assets/backgrounds/garden_meadow.png' } },
  daisy:     { single: { noun: 'daisy', img: '/assets/objects/flower_daisy.png', emoji: '🌼' },        bg: { grad: 'linear-gradient(#d6efff 0%, #e6f5d8 52%, #c2e69a 100%)', img: '/assets/backgrounds/garden_park.png' } },
  pine:      { single: { noun: 'pine tree', img: '/assets/objects/tree_3.png', emoji: '🌲' },          bg: { grad: 'linear-gradient(#cfe9f7 0%, #dff0d8 52%, #b6db94 100%)', img: '/assets/backgrounds/forest_3.jpeg' } },
  // Long Trail (length) — two of the same, one longer
  snake:       { single: { noun: 'snake', img: '/assets/objects/snake.png', emoji: '🐍' },             bg: { grad: 'linear-gradient(#cfeaff 0%, #dcefd6 52%, #9fd07a 100%)', img: '/assets/backgrounds/garden_meadow.png' } },
  train:       { single: { noun: 'train', img: '/assets/objects/train_car.png', emoji: '🚃' },         bg: { grad: 'linear-gradient(#d8e6f3 0%, #e2eef5 52%, #c4d2e0 100%)', img: '/assets/backgrounds/train_bg.jpeg' } },
  caterpillar: { single: { noun: 'caterpillar', img: '/assets/objects/caterpillar.png', emoji: '🐛' }, bg: { grad: 'linear-gradient(#cfe9f7 0%, #dff0d8 52%, #b6db94 100%)', img: '/assets/backgrounds/forest_2.jpeg' } },
  engine:      { single: { noun: 'train', img: '/assets/objects/train_engine.png', emoji: '🚂' },      bg: { grad: 'linear-gradient(#d8e6f3 0%, #e2eef5 52%, #c4d2e0 100%)', img: '/assets/backgrounds/train_station.png' } },
  bus:         { single: { noun: 'bus', img: '/assets/objects/bus.png', emoji: '🚌' },                 bg: { grad: 'linear-gradient(#dfeaf5 0%, #e8eef3 52%, #cdd8e0 100%)', img: '/assets/backgrounds/town_street.jpeg' } },
  fish:        { single: { noun: 'fish', img: '/assets/objects/fish.png', emoji: '🐟' },               bg: { grad: 'linear-gradient(#aee3f2 0%, #8fd2ea 52%, #5bb0d4 100%)', img: '/assets/backgrounds/lake.jpeg' } },
  // Balance Market (weight) — heavier dips. heavy + light pair.
  melon:   { heavy: { noun: 'watermelon', img: '/assets/objects/watermelon.png', emoji: '🍉' }, light: { noun: 'cherry', img: '/assets/objects/cherry.png', emoji: '🍒' },          bg: { grad: 'linear-gradient(#dff0c8 0%, #eaf7d6 52%, #cfe9a8 100%)', img: '/assets/backgrounds/grocery_produce.jpeg' } },
  pumpkin: { heavy: { noun: 'pumpkin', img: '/assets/objects/pumpkin.png', emoji: '🎃' },       light: { noun: 'apple', img: '/assets/objects/apple.png', emoji: '🍎' },           bg: { grad: 'linear-gradient(#ffe9c4 0%, #ffe0b0 55%, #f3c483 100%)', img: '/assets/backgrounds/grocery_bakery.jpeg' } },
  sack:    { heavy: { noun: 'flour sack', img: '/assets/objects/flour_sack.png', emoji: '🌾' },  light: { noun: 'strawberry', img: '/assets/objects/kitchen_strawberry.png', emoji: '🍓' }, bg: { grad: 'linear-gradient(#eef3f7 0%, #e6eef5 55%, #d4e2ee 100%)', img: '/assets/backgrounds/kitchen_pantry.jpeg' } },
  crate:   { heavy: { noun: 'crate', img: '/assets/objects/crate.png', emoji: '📦' },          light: { noun: 'egg', img: '/assets/objects/grocery_egg.png', emoji: '🥚' },                bg: { grad: 'linear-gradient(#eef3f7 0%, #e6eef5 55%, #d4e2ee 100%)', img: '/assets/backgrounds/grocery_deli.jpeg' } },
  bucket:  { heavy: { noun: 'bucket', img: '/assets/objects/bucket.png', emoji: '🪣' },         light: { noun: 'cookie', img: '/assets/objects/cookie.png', emoji: '🍪' },                  bg: { grad: 'linear-gradient(#ffe9c4 0%, #ffe0b0 55%, #f3c483 100%)', img: '/assets/backgrounds/kitchen_oven.jpeg' } },
  fruitbowl:{ heavy: { noun: 'fruit bowl', img: '/assets/objects/fruitbowl.png', emoji: '🥗' }, light: { noun: 'candy', img: '/assets/objects/candy.png', emoji: '🍬' },                    bg: { grad: 'linear-gradient(#dff0c8 0%, #eaf7d6 52%, #cfe9a8 100%)', img: '/assets/backgrounds/kitchen_fruit.jpeg' } },
}

interface MWorld {
  id: string; label: string; emoji: string; attr: Attr
  scenes: Scene[]
  milo: { src: string; emoji: string; accessory: string }
  dark?: boolean
  intro: string
}
const WORLDS: MWorld[] = [
  { id: 'forest', label: "Tall Forest", emoji: '🌳', attr: 'height', scenes: ['tree', 'sunflower', 'giraffe', 'tulip', 'daisy', 'pine'],
    milo: { src: '/assets/characters/milo_explorer.png', emoji: '🦊', accessory: '📏' },
    intro: "In the tall forest, things grow BIG and small! Tap the one Milo asks for — taller or shorter. First, watch Milo!" },
  { id: 'trail', label: "Long Trail", emoji: '🐍', attr: 'length', scenes: ['snake', 'train', 'caterpillar', 'engine', 'bus', 'fish'],
    milo: { src: '/assets/characters/milo_explorer.png', emoji: '🦊', accessory: '📐' },
    intro: "On the long trail, some things stretch out far! Tap the one Milo asks for — longer or shorter. First, watch Milo!" },
  { id: 'market', label: "Balance Market", emoji: '⚖️', attr: 'weight', scenes: ['melon', 'pumpkin', 'sack', 'crate', 'bucket', 'fruitbowl'],
    milo: { src: '/assets/characters/milo_grocer.png', emoji: '🦊', accessory: '⚖️' },
    intro: "At the market, Milo weighs things on the big scale! The heavier one goes DOWN. Tap the one Milo asks for. First, watch Milo!" },
]
const worldById = (id: string) => WORLDS.find(w => w.id === id)
const PICK_WORLDS = WORLDS.map(w => ({ id: w.id, label: w.label, emoji: w.emoji, bgImage: SCENE[w.scenes[0]].bg.img }))

function askWord(attr: Attr, ask: 'more' | 'less'): string {
  if (attr === 'height') return ask === 'more' ? 'taller' : 'shorter'
  if (attr === 'length') return ask === 'more' ? 'longer' : 'shorter'
  return ask === 'more' ? 'heavier' : 'lighter'
}

const rnd = (n: number) => Math.floor(Math.random() * n)
const MAXV = 8
function gapFor(d: 1 | 2 | 3): number { if (d === 1) return 4 + rnd(3); if (d === 2) return 2 + rnd(2); return 1 }
function mags(d: 1 | 2 | 3): [number, number] { const gap = gapFor(d); const small = 1 + rnd(Math.max(1, MAXV - gap)); return [small + gap, small] }

interface Side { obj: Obj; val: number }
interface MRound { scene: Scene; attr: Attr; ask: 'more' | 'less'; left: Side; right: Side }

function makeRound(world: MWorld, d: 1 | 2 | 3, round: number): MRound {
  const scene = world.scenes[round % world.scenes.length]
  const cfg = SCENE[scene]
  const ask: 'more' | 'less' = round % 2 === 0 ? 'more' : 'less'
  const [big, small] = mags(d)
  const bigLeft = Math.random() < 0.5
  let left: Side, right: Side
  if (world.attr === 'weight') {
    const h: Side = { obj: cfg.heavy!, val: big }, l: Side = { obj: cfg.light!, val: small }
    left = bigLeft ? h : l; right = bigLeft ? l : h
  } else {
    const o = cfg.single!
    left = { obj: o, val: bigLeft ? big : small }; right = { obj: o, val: bigLeft ? small : big }
  }
  return { scene, attr: world.attr, ask, left, right }
}
const answerSide = (r: MRound): 'left' | 'right' =>
  r.ask === 'more' ? (r.left.val >= r.right.val ? 'left' : 'right') : (r.left.val <= r.right.val ? 'left' : 'right')

function Background({ scene, scenes }: { scene: Scene; scenes: Scene[] }) {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#dfe8d8' }}>
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

function MiloHost({ left, milo }: { left: number; milo: MWorld['milo'] }) {
  const [step, setStep] = useState(0)
  const srcs = [milo.src, '/assets/characters/milo_idle.png']
  return (
    <div style={{ position: 'fixed', left: `${left}%`, bottom: 0, transform: 'translateX(-50%)', zIndex: 26, width: 'min(28vh, 240px)', height: 'min(28vh, 240px)', pointerEvents: 'none' }}>
      <div style={{ width: '100%', height: '100%', animation: 'tf_float 3.4s ease-in-out infinite' }}>
        {step >= srcs.length
          ? <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
              <span style={{ fontSize: 86, filter: 'drop-shadow(0 5px 8px rgba(0,0,0,.35))' }}>{milo.emoji}</span>
              <span style={{ position: 'absolute', bottom: 10, right: 12, fontSize: 38 }}>{milo.accessory}</span>
            </div>
          : <img src={srcs[step]} alt="Milo" draggable={false} onError={() => setStep(s => s + 1)}
              style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'bottom', filter: 'drop-shadow(0 5px 8px rgba(0,0,0,.35))' }} />}
      </div>
    </div>
  )
}

function Sprite({ obj, size }: { obj: Obj; size: string }) {
  const [missing, setMissing] = useState(false)
  if (missing) return <span style={{ fontSize: size, lineHeight: 1, filter: 'drop-shadow(0 3px 4px rgba(0,0,0,.25))' }}>{obj.emoji}</span>
  return <img src={obj.img} alt="" draggable={false} onError={() => setMissing(true)}
    style={{ width: size, height: size, objectFit: 'contain', filter: 'drop-shadow(0 3px 5px rgba(0,0,0,.3))' }} />
}

// ─── HEIGHT: two grounded sprites, uniform-scaled by value (taller = bigger) ─────────
function HeightView({ left, right, grown, reveal, winner, onPick }: {
  left: Side; right: Side; grown: boolean; reveal: boolean; winner: 'left' | 'right'; onPick?: (s: 'left' | 'right') => void
}) {
  const base = 'clamp(80px, 17vmin, 168px)'
  const k = (v: number) => 0.42 + 0.58 * (v / MAXV)
  const cell = (s: Side, side: 'left' | 'right') => {
    const win = reveal && winner === side
    const inner = (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4vh', transformOrigin: 'bottom center',
        transform: `scale(${grown ? k(s.val) : 0.3})`, transition: 'transform .7s cubic-bezier(.34,1.56,.64,1)',
        filter: win ? 'drop-shadow(0 0 18px var(--sun-yellow))' : 'none' }}>
        <Sprite obj={s.obj} size={base} />
        <div aria-hidden style={{ width: `calc(${base} * 0.5)`, height: `calc(${base} * 0.14)`,
          background: 'radial-gradient(ellipse at center, rgba(38,28,18,.26) 0%, rgba(38,28,18,0) 72%)' }} />
      </div>
    )
    return onPick
      ? <button onClick={() => onPick(side)} style={pickBtn(win)}>{inner}</button>
      : <div style={{ position: 'relative' }}>{inner}</div>
  }
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 'clamp(20px,7vw,90px)' }}>
      {cell(left, 'left')}{cell(right, 'right')}
    </div>
  )
}

// ─── LENGTH: two sprites stretched horizontally by value (longer = wider) ────────────
function LengthView({ left, right, grown, reveal, winner, onPick }: {
  left: Side; right: Side; grown: boolean; reveal: boolean; winner: 'left' | 'right'; onPick?: (s: 'left' | 'right') => void
}) {
  const h = 'clamp(46px, 9vmin, 96px)'
  const widthPct = (v: number) => 24 + 62 * (v / MAXV)
  const row = (s: Side, side: 'left' | 'right') => {
    const win = reveal && winner === side
    const inner = (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', height: h,
        width: `${grown ? widthPct(s.val) : 12}%`, transition: 'width .8s cubic-bezier(.4,0,.2,1)',
        filter: win ? 'drop-shadow(0 0 16px var(--sun-yellow))' : 'none' }}>
        <img src={s.obj.img} alt="" draggable={false} onError={e => { const t = e.currentTarget; t.style.display = 'none'; (t.nextSibling as HTMLElement).style.display = 'flex' }}
          style={{ width: '100%', height: '100%', objectFit: 'fill', filter: 'drop-shadow(0 3px 5px rgba(0,0,0,.3))' }} />
        <span style={{ display: 'none', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', fontSize: h, lineHeight: 1 }}>{s.obj.emoji}</span>
      </div>
    )
    return onPick
      ? <button onClick={() => onPick(side)} style={{ ...pickBtn(win), width: '100%', justifyContent: 'flex-start' }}>{inner}</button>
      : <div style={{ width: '100%' }}>{inner}</div>
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(14px,3vh,34px)', width: 'min(80vw, 620px)' }}>
      {row(left, 'left')}{row(right, 'right')}
    </div>
  )
}

// ─── WEIGHT: a code-drawn seesaw balance — the heavier end tips DOWN ─────────────────
function WeightView({ left, right, grown, reveal, winner, onPick }: {
  left: Side; right: Side; grown: boolean; reveal: boolean; winner: 'left' | 'right'; onPick?: (s: 'left' | 'right') => void
}) {
  const heavier: 'left' | 'right' = left.val >= right.val ? 'left' : 'right'
  const angle = grown ? (heavier === 'left' ? 9 : -9) : 0   // positive = left end down
  const objSize = 'clamp(54px, 12vmin, 116px)'
  const cell = (s: Side, side: 'left' | 'right') => {
    const win = reveal && winner === side
    const inner = (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <div style={{ transform: win ? 'scale(1.1)' : 'scale(1)', transition: 'transform .3s ease', filter: win ? 'drop-shadow(0 0 15px var(--sun-yellow))' : 'drop-shadow(0 3px 5px rgba(0,0,0,.3))' }}>
          <Sprite obj={s.obj} size={objSize} />
        </div>
        {/* the small pan the item rests in */}
        <div style={{ width: 'clamp(70px,14vmin,130px)', height: 'clamp(12px,2.4vmin,22px)', background: 'linear-gradient(#e9c98f,#caa468)', border: '3px solid #9c7440', borderRadius: '0 0 45% 45%', boxShadow: '0 3px 5px rgba(0,0,0,.22)' }} />
      </div>
    )
    return (
      <button onClick={onPick ? () => onPick(side) : undefined} disabled={!onPick}
        style={{ position: 'absolute', [side === 'left' ? 'left' : 'right']: '2%', bottom: '100%', transformOrigin: 'bottom center',
          border: win ? '4px solid var(--garden-green)' : '4px solid transparent', background: win ? 'rgba(111,190,63,.16)' : 'transparent',
          borderRadius: 18, padding: '4px 8px', cursor: onPick ? 'pointer' : 'default' }}>{inner}</button>
    )
  }
  return (
    <div style={{ position: 'relative', width: 'min(86vw, 560px)', height: 'clamp(230px,42vh,360px)', margin: '0 auto' }}>
      {/* the tilting plank, pivoting on the fulcrum; objects sit on its ends and tip with it */}
      <div style={{ position: 'absolute', left: '50%', bottom: '24%', width: '94%', transform: `translateX(-50%) rotate(${angle}deg)`, transformOrigin: 'center', transition: 'transform .7s cubic-bezier(.34,1.56,.64,1)' }}>
        <div style={{ position: 'relative', height: 'clamp(12px,2.4vmin,18px)', background: 'linear-gradient(#b98a4e,#8d6736)', borderRadius: 8, boxShadow: '0 3px 0 rgba(61,37,22,.3)' }}>
          {cell(left, 'left')}
          {cell(right, 'right')}
        </div>
      </div>
      {/* fulcrum triangle */}
      <div aria-hidden style={{ position: 'absolute', left: '50%', bottom: '7%', transform: 'translateX(-50%)', width: 0, height: 0,
        borderLeft: 'clamp(42px,9vmin,78px) solid transparent', borderRight: 'clamp(42px,9vmin,78px) solid transparent', borderBottom: 'clamp(78px,17vh,150px) solid #9c7440' }} />
      {/* ground base */}
      <div aria-hidden style={{ position: 'absolute', bottom: '3%', left: '50%', transform: 'translateX(-50%)', width: '58%', height: 'clamp(10px,2vmin,16px)', background: 'linear-gradient(#8d6736,#6b4f2a)', borderRadius: 8, boxShadow: '0 4px 7px rgba(0,0,0,.25)' }} />
    </div>
  )
}

const pickBtn = (win: boolean): React.CSSProperties => ({
  border: win ? '4px solid var(--garden-green)' : '4px solid transparent', background: win ? 'rgba(111,190,63,.18)' : 'transparent',
  borderRadius: 22, padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', transition: 'all .2s ease',
})

function CompareStage({ world, data, grown, reveal, winner, onPick }: {
  world: MWorld; data: MRound; grown: boolean; reveal: boolean; winner: 'left' | 'right'; onPick?: (s: 'left' | 'right') => void
}) {
  const V = world.attr === 'height' ? HeightView : world.attr === 'length' ? LengthView : WeightView
  return (
    <div style={{ position: 'fixed', left: 0, right: 0, top: '52%', transform: 'translateY(-50%)', zIndex: 30, display: 'flex', justifyContent: 'center', padding: '0 4vw' }}>
      <V left={data.left} right={data.right} grown={grown} reveal={reveal} winner={winner} onPick={onPick} />
    </div>
  )
}

// ─── The interactive play surface (guided / practice) ──────────────────────────────
type Mode = 'guided' | 'practice'
const MeasurePlay: React.FC<{ world: MWorld; data: MRound; mode: Mode; onComplete: (correct: boolean) => void }> = ({ world, data, mode, onComplete }) => {
  const ans = answerSide(data)
  const word = askWord(world.attr, data.ask)
  const [grown, setGrown] = useState(false)
  const [picked, setPicked] = useState<'left' | 'right' | null>(null)
  const erred = useRef(false), done = useRef(false)

  useEffect(() => {
    const t = window.setTimeout(() => setGrown(true), 250)
    if (mode === 'guided') speak(`Now you! Tap the ${word} one.`)
    return () => window.clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function pick(side: 'left' | 'right') {
    if (done.current || picked !== null || !grown) return
    if (side === ans) {
      done.current = true; setPicked(side)
      if (mode === 'guided') speak(`Yes! That one is ${word}!`)
      window.setTimeout(() => onComplete(mode === 'practice' ? !erred.current : true), 1150)
    } else {
      erred.current = true
      speak(`Look again — which one is ${word}? Try once more!`)
    }
  }

  return <CompareStage world={world} data={data} grown={grown} reveal={picked !== null} winner={ans} onPick={pick} />
}

// ─── The teaching demo (opening preview + 3-wrong re-teach) ─────────────────────────
const MeasureExplain: React.FC<{ world: MWorld; data: MRound; onDone: () => void }> = ({ world, data, onDone }) => {
  const ans = answerSide(data)
  const word = askWord(world.attr, data.ask)
  const winObj = (ans === 'left' ? data.left : data.right).obj
  const [grown, setGrown] = useState(false)
  const [reveal, setReveal] = useState(false)
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return; ran.current = true
    const verb = world.attr === 'weight' ? 'goes down on the scale' : world.attr === 'height' ? 'reaches up high' : 'stretches out far'
    const script = [`Let's compare! Watch closely…`, `See? This one ${verb}.`, `So this ${winObj.noun} is the ${word} one!`]
    const actions: Array<() => void> = [() => {}, () => setGrown(true), () => setReveal(true)]
    const cancel = speakSteps(script, { onStep: i => actions[i]?.(), onDone: () => window.setTimeout(onDone, 1300) })
    return cancel
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return <CompareStage world={world} data={data} grown={grown} reveal={reveal} winner={ans} />
}

// ─── Beat ───────────────────────────────────────────────────────────────────────────
function makeMeasureBeat(world: MWorld): Beat<MRound> {
  return {
    skillId: 'measurement', rounds: 10, reteachAfter: 3, walkEvery: 3,
    make: (d, round = 0) => makeRound(world, (d || 1) as 1 | 2 | 3, round),
    prompt: d => `Tap the ${askWord(world.attr, d.ask)} one!`,
    say: d => `Tap the ${askWord(world.attr, d.ask)} one!`,
    Play: ({ data, onSubmit }) => <MeasurePlay world={world} data={data} mode="practice" onComplete={onSubmit} />,
    Reteach: ({ data, onDone }) => <MeasureExplain world={world} data={data} onDone={onDone} />,
  }
}

// ─── Orchestrator ──────────────────────────────────────────────────────────────────
const TF_CSS = `
@keyframes tf_float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
`
type Phase = 'intro' | 'demo' | 'guided' | 'practice'
export default function TallForest({ world: forcedWorldId, onFinish, onExit }: {
  world?: string
  onFinish?: (correct: number, wrong: number, mastered?: boolean) => void
  onExit?: () => void
}) {
  const router = useRouter()
  const [world, setWorld] = useState<MWorld | null>(() => (forcedWorldId ? worldById(forcedWorldId) ?? null : null))
  const [phase, setPhase] = useState<Phase>('intro')
  const [scene, setScene] = useState<Scene>('tree')
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
  const beat = useMemo(() => (world ? makeMeasureBeat(world) : null), [world])

  if (!world || !beat) {
    return (
      <div style={{ position: 'relative', width: '100vw', height: '100dvh', overflow: 'hidden' }}>
        <WorldSelect title="What shall we measure today?" worlds={PICK_WORLDS}
          onPick={(id) => { const w = worldById(id); if (w) { setScene(w.scenes[0]); setWorld(w) } }} onExit={exit} />
      </div>
    )
  }

  // Demo + guided use obvious gaps (this world's first scenes).
  const DEMO_ORDERS: MRound[] = [
    makeRoundFixed(world, world.scenes[0], 'more', 7, 2),
    makeRoundFixed(world, world.scenes[1] ?? world.scenes[0], 'less', 2, 7),
  ]
  const GUIDED_ORDER: MRound = makeRoundFixed(world, world.scenes[2] ?? world.scenes[0], 'more', 6, 2)
  const bgScene: Scene = phase === 'practice' ? scene : phase === 'guided' ? GUIDED_ORDER.scene : phase === 'demo' ? DEMO_ORDERS[demoIdx].scene : world.scenes[0]

  const Banner = (text: string) => (
    <div style={{ position: 'absolute', top: 50, left: 0, right: 0, zIndex: 45, display: 'flex', justifyContent: 'center', padding: '0 12px' }}>
      <div style={{ background: 'var(--paper)', border: '3px solid var(--milo-orange)', borderRadius: 999, padding: '10px 24px', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 19, color: 'var(--milo-orange)', boxShadow: '0 4px 0 rgba(242,107,44,.25)', textAlign: 'center' }}>{text}</div>
    </div>
  )

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100dvh', overflow: 'hidden' }}>
      <style>{TF_CSS}</style>
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
            style={{ padding: '14px 38px', borderRadius: 50, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,var(--milo-orange),var(--milo-orange-deep))', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, boxShadow: '0 6px 16px rgba(242,107,44,.4)' }}>Let's go! ▶</button>
        </div>
      )}

      {phase === 'demo' && (<>{Banner(`Watch Milo compare  (${demoIdx + 1}/${DEMO_ORDERS.length})`)}
        <MeasureExplain key={`demo${demoIdx}`} world={world} data={DEMO_ORDERS[demoIdx]}
          onDone={() => { if (demoIdx + 1 < DEMO_ORDERS.length) setDemoIdx(demoIdx + 1); else setPhase('guided') }} /></>)}

      {phase === 'guided' && (<>{Banner('Now you! Tap the right one')}
        <MeasurePlay key="guided" world={world} data={GUIDED_ORDER} mode="guided" onComplete={() => setPhase('practice')} /></>)}

      {phase === 'practice' && (
        <div style={{ position: 'absolute', top: 48, left: 0, right: 0, zIndex: 45, display: 'flex', justifyContent: 'center', padding: '0 12px' }}>
          <SkillBeat beat={beat} onInterlude={interlude}
            onRound={(data) => { if (data?.scene) setScene(data.scene as Scene) }}
            onComplete={(c, w, mastered) => { result.current.correct += c; result.current.wrong += w; finishChapter(result.current.correct, result.current.wrong, mastered) }} />
        </div>
      )}

      <MiloHost left={10} milo={world.milo} />
    </div>
  )
}

// A fixed (non-random) round for demo/guided so the gap is always obvious.
function makeRoundFixed(world: MWorld, scene: Scene, ask: 'more' | 'less', leftV: number, rightV: number): MRound {
  const cfg = SCENE[scene]
  if (world.attr === 'weight') {
    // heavy item always carries the bigger value; put it on the side with the bigger V.
    const bigLeft = leftV >= rightV
    const h: Side = { obj: cfg.heavy!, val: Math.max(leftV, rightV) }
    const l: Side = { obj: cfg.light!, val: Math.min(leftV, rightV) }
    return { scene, attr: world.attr, ask, left: bigLeft ? h : l, right: bigLeft ? l : h }
  }
  const o = cfg.single!
  return { scene, attr: world.attr, ask, left: { obj: o, val: leftV }, right: { obj: o, val: rightV } }
}
