'use client'
/**
 * Chapter 9 — simple ADDITION (skill `addition`). Two groups of the same thing join into
 * one: Milo has `a`, then `b` MORE arrive; the child counts them ALL together and taps how
 * many there are altogether. The real skill is "combine and count on". The child PICKS one of
 * three worlds; in each, the same skill is dressed differently and the scene rotates across the
 * 10 adaptive rounds (one continuous SkillBeat — harder on a streak, gentler when struggling,
 * re-teach after 3 wrong):
 *   🍎 Orchard   — gather fruit into the basket   (apple · pear · cherry)
 *   🐠 Coral Reef — friends swim together          (fish · sea-star · crab)
 *   🚀 Space      — count the things in the sky    (star · rocket · planet)
 *
 * BLEND: the two groups rest on a wooden ground band (each object casts a soft contact shadow,
 * organic jitter); a "+" sits between them and the answers drop in below. The demo + re-teach
 * fill a basket one-by-one as Milo counts them all. Difficulty (the addends) ramps via
 * addPair: 1–3 + 1–3 → 2–5 + 2–5 → 4–8 + 2–6. Reuses committed art (no new assets).
 * Wrapped by game/AdditionChapter.tsx.
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { speak, stopSpeech } from '@/lib/useMiloSpeaker'
import { SkillBeat, type Beat } from './StoryWorld'
import { addPair } from '@/lib/adaptive'
import WorldSelect from './WorldSelect'

// ─── Scenes & Worlds ───────────────────────────────────────────────────────────────
type Scene =
  | 'apple' | 'pear' | 'cherry'        // Orchard
  | 'fish' | 'seastar' | 'crab'        // Coral Reef
  | 'star' | 'rocket' | 'planet'       // Space

interface SceneCfg {
  noun: string; nounPlural: string; item: string; itemImg: string
  bg: { grad: string; img: string }
}
const SCENE: Record<Scene, SceneCfg> = {
  // Orchard — fruit into the basket
  apple:  { noun: 'apple', nounPlural: 'apples', item: '🍎', itemImg: '/assets/objects/apple.png',  bg: { grad: 'linear-gradient(#dff0c8 0%, #eaf7d6 52%, #cfe9a8 100%)', img: '/assets/backgrounds/farm_orchard.png' } },
  pear:   { noun: 'pear', nounPlural: 'pears',   item: '🍐', itemImg: '/assets/objects/pear.png',   bg: { grad: 'linear-gradient(#e8f3cf 0%, #eef7da 52%, #d6ecb0 100%)', img: '/assets/backgrounds/town_garden.jpeg' } },
  cherry: { noun: 'cherry', nounPlural: 'cherries', item: '🍒', itemImg: '/assets/objects/cherry.png', bg: { grad: 'linear-gradient(#dff0c8 0%, #e6f3d4 52%, #c8e6a0 100%)', img: '/assets/backgrounds/forest_1.jpeg' } },
  // Coral Reef — friends swim together
  fish:    { noun: 'fish', nounPlural: 'fish',     item: '🐠', itemImg: '/assets/objects/reef_fish.png',     bg: { grad: 'linear-gradient(#aee3f2 0%, #7fcbe8 55%, #4ea7cf 100%)', img: '/assets/backgrounds/reef_open.png' } },
  seastar: { noun: 'sea star', nounPlural: 'sea stars', item: '⭐', itemImg: '/assets/objects/reef_starfish.png', bg: { grad: 'linear-gradient(#bfe9f4 0%, #8fd2ea 55%, #5bb0d4 100%)', img: '/assets/backgrounds/reef_sand.png' } },
  crab:    { noun: 'crab', nounPlural: 'crabs',    item: '🦀', itemImg: '/assets/objects/crab.png',          bg: { grad: 'linear-gradient(#a9dff0 0%, #79c6e4 55%, #469fc8 100%)', img: '/assets/backgrounds/reef_deep.png' } },
  // Space — count the things in the sky
  star:   { noun: 'star', nounPlural: 'stars',     item: '⭐', itemImg: '/assets/objects/star.png',    bg: { grad: 'linear-gradient(#243056 0%, #1b2548 55%, #131a36 100%)', img: '/assets/backgrounds/space_deepspace.png' } },
  rocket: { noun: 'rocket', nounPlural: 'rockets', item: '🚀', itemImg: '/assets/objects/rocket.png',  bg: { grad: 'linear-gradient(#2a3a5e 0%, #20294c 55%, #161d3a 100%)', img: '/assets/backgrounds/space_launchpad.png' } },
  planet: { noun: 'planet', nounPlural: 'planets', item: '🪐', itemImg: '/assets/objects/planet.png',  bg: { grad: 'linear-gradient(#222d52 0%, #19224444 55%, #10173200 100%)', img: '/assets/backgrounds/space_moon.png' } },
}

interface AddWorld {
  id: string; label: string; emoji: string
  scenes: Scene[]
  milo: { src: string; emoji: string; accessory: string }
  vessel: 'basket' | 'water' | 'sky'   // how the "all together" group is framed
  joinVerb: string                     // "more arrive" verb for the bubble
  dark?: boolean                       // dark scene → light text on the ground band
  intro: string
}
const WORLDS: AddWorld[] = [
  { id: 'orchard', label: "Orchard", emoji: '🍎', scenes: ['apple', 'pear', 'cherry'],
    milo: { src: '/assets/characters/milo_explorer.png', emoji: '🦊', accessory: '🧺' }, vessel: 'basket', joinVerb: 'picks',
    intro: "Milo is gathering fruit! He picks some, then picks SOME MORE. Count them ALL to see how many altogether. First, watch Milo!" },
  { id: 'reef', label: "Coral Reef", emoji: '🐠', scenes: ['fish', 'seastar', 'crab'],
    milo: { src: '/assets/characters/milo_underwater.png', emoji: '🐢', accessory: '🫧' }, vessel: 'water', joinVerb: 'meets',
    intro: "Down in the reef, friends swim together! Some are here, then MORE swim over. Count them ALL altogether. First, watch Milo!" },
  { id: 'space', label: "Space", emoji: '🚀', scenes: ['star', 'rocket', 'planet'],
    milo: { src: '/assets/characters/milo_explorer.png', emoji: '🦊', accessory: '🚀' }, vessel: 'sky', dark: true, joinVerb: 'spots',
    intro: "Blast off! Milo sees some things in space, then MORE appear. Count them ALL to find how many altogether. First, watch Milo!" },
]
const worldById = (id: string) => WORLDS.find(w => w.id === id)
const PICK_WORLDS = WORLDS.map(w => ({ id: w.id, label: w.label, emoji: w.emoji, bgImage: SCENE[w.scenes[0]].bg.img }))

interface AddRound { scene: Scene; a: number; b: number }
const qty = (n: number, cfg: SceneCfg) => `${n} ${n === 1 ? cfg.noun : cfg.nounPlural}`

function buildChoices(answer: number): number[] {
  const opts = new Set<number>([answer])
  while (opts.size < 3) {
    const d = Math.floor(Math.random() * 3) + 1
    const v = Math.random() < 0.5 ? answer + d : Math.max(1, answer - d)
    if (v !== answer) opts.add(v)
  }
  // Fisher–Yates for honest shuffle (avoid sort(()=>rand) bias).
  const arr = [...opts]
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[arr[i], arr[j]] = [arr[j], arr[i]] }
  return arr
}

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

function MiloHost({ left, milo }: { left: number; milo: AddWorld['milo'] }) {
  const [step, setStep] = useState(0)
  const srcs = [milo.src, '/assets/characters/milo_idle.png']
  return (
    <div style={{ position: 'fixed', left: `${left}%`, bottom: 0, transform: 'translateX(-50%)', zIndex: 26, width: 'min(30vh, 260px)', height: 'min(30vh, 260px)', pointerEvents: 'none' }}>
      <div style={{ width: '100%', height: '100%', animation: 'or_float 3.4s ease-in-out infinite' }}>
        {step >= srcs.length
          ? <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
              <span style={{ fontSize: 92, filter: 'drop-shadow(0 5px 8px rgba(0,0,0,.35))' }}>{milo.emoji}</span>
              <span style={{ position: 'absolute', bottom: 12, right: 14, fontSize: 40 }}>{milo.accessory}</span>
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
  return <img src={cfg.itemImg} alt="" draggable={false} onError={() => setMissing(true)}
    style={{ width: size, height: size, objectFit: 'contain', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.25))' }} />
}

// One object grounded on the band with a contact shadow + organic jitter. When `lit` it
// pops bigger with a warm glow — used to count the objects one-by-one ("1, 2, 3…").
function GroundedItem({ cfg, size, i, lit }: { cfg: SceneCfg; size: string; i: number; lit?: boolean }) {
  const back = i % 2 === 1
  const depth = back ? 0.42 : 0.1
  const jx = [-1.4, 1.1, -0.6, 1.6, -1.1, 0.7][i % 6]
  const shOp = (0.24 - depth * 0.12).toFixed(2)
  const shW = `calc(${size} * 0.62)`
  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center',
      transform: `translate(${jx}px, ${back ? -0.5 : 0}vmin) scale(${(1 - depth * 0.13) * (lit ? 1.18 : 1)})`, zIndex: back ? 1 : 2, transformOrigin: 'bottom center',
      filter: lit ? 'drop-shadow(0 0 12px var(--sun-yellow))' : 'none', transition: 'transform .2s cubic-bezier(.34,1.56,.64,1), filter .2s ease', animation: 'or_pop .3s ease both' }}>
      <Item cfg={cfg} size={size} />
      <div aria-hidden style={{ width: shW, height: `calc(${shW} * 0.3)`, marginTop: '0.3vmin',
        background: `radial-gradient(ellipse at center, rgba(38,28,18,${shOp}) 0%, rgba(38,28,18,0) 72%)`, pointerEvents: 'none' }} />
    </div>
  )
}

// A group that pops its objects in ONE AT A TIME (`shown` of `total`); the count badge
// appears once the whole group has arrived. Keeps the question from dumping everything
// on screen at once — the child watches the group build up.
function Group({ cfg, shown, total, size, litN = 0 }: { cfg: SceneCfg; shown: number; total: number; size: string; litN?: number }) {
  const ready = total > 0 && shown >= total
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6vh' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.2vmin', justifyContent: 'center', alignItems: 'flex-end', maxWidth: 'min(46vw, 400px)', minHeight: size }}>
        {Array.from({ length: shown }).map((_, i) => <GroundedItem key={i} cfg={cfg} size={size} i={i} lit={i < litN} />)}
      </div>
      <div style={{ width: 'clamp(40px,6.4vmin,56px)', height: 'clamp(40px,6.4vmin,56px)', borderRadius: '50%', background: 'var(--sky-blue)', border: '3px solid var(--sky-blue-deep)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(19px,3.2vmin,27px)', color: '#fff', boxShadow: '0 3px 0 rgba(61,37,22,.2)',
        opacity: ready ? 1 : 0, transform: ready ? 'scale(1)' : 'scale(0.5)', transition: 'opacity .25s ease, transform .25s cubic-bezier(.34,1.56,.64,1)' }}>{total}</div>
    </div>
  )
}

// ─── The scene: group A + "+" + group B on the ground; "= ?" answer box below ───
// Staged: `aShown`/`bShown` pop the groups in one-by-one, `showPlus` brings the "+", and the
// answer box only appears once `showQ` is set. `lit` counts the objects one-by-one across both
// groups (1..a in A, then a+1..total in B) while `boxValue` climbs — so "count them all" reads
// WITHOUT any basket. `boxValue` is null → "?", a number → that count; `boxDone` = green final.
function Stage({ cfg, a, b, aShown, bShown, showPlus, showQ, lit, boxValue, boxDone, dark }: {
  cfg: SceneCfg; a: number; b: number; aShown: number; bShown: number; showPlus: boolean; showQ: boolean; lit: number; boxValue: number | null; boxDone: boolean; dark?: boolean
}) {
  // Big objects, but shrink a little when a group is large so they never wrap into the
  // answer box (esp. in short/landscape viewports). Small counts (the common case) stay BIG.
  const maxN = Math.max(a, b)
  const itemSize = maxN <= 3 ? 'clamp(96px, 18.5vmin, 220px)' : maxN <= 5 ? 'clamp(82px, 15vmin, 175px)' : 'clamp(64px, 11.5vmin, 135px)'
  const op = dark ? '#fff' : 'var(--milo-orange)'
  const litA = Math.min(lit, a), litB = Math.max(0, lit - a)
  return (
    <>
      {/* Two groups + operator, resting on the ground band */}
      <div style={{ position: 'fixed', left: 0, right: 0, top: '40%', transform: 'translateY(-50%)', zIndex: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6vh' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 'clamp(10px,2.6vw,40px)', maxWidth: '94vw' }}>
          <Group cfg={cfg} shown={aShown} total={a} size={itemSize} litN={litA} />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(40px,8vmin,76px)', color: op, WebkitTextStroke: '2px var(--outline)', paintOrder: 'stroke fill', lineHeight: 1, marginBottom: '3.4vh',
            opacity: showPlus ? 1 : 0, transform: showPlus ? 'scale(1)' : 'scale(0.4)', transition: 'opacity .3s ease, transform .3s cubic-bezier(.34,1.56,.64,1)' }}>+</span>
          <Group cfg={cfg} shown={bShown} total={b} size={itemSize} litN={litB} />
        </div>
        <div style={{ width: 'min(74vw, 700px)', height: '2.1vh', minHeight: 12, background: dark ? 'linear-gradient(#5a4d7a,#3b3158)' : 'linear-gradient(#caa46a,#a07a44)', borderRadius: 6, boxShadow: '0 5px 9px rgba(0,0,0,.28)' }} />
      </div>

      {/* "How many altogether?" answer box — only after both groups have arrived */}
      <div style={{ position: 'fixed', left: 0, right: 0, top: '71%', transform: 'translateY(-50%)', zIndex: 31, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6vh',
        opacity: showQ ? 1 : 0, transition: 'opacity .4s ease', pointerEvents: showQ ? 'auto' : 'none' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(12px,1.9vh,16px)', letterSpacing: '.08em', color: dark ? '#dfe6ff' : 'var(--ink-soft)' }}>ALTOGETHER</span>
        <div style={{ width: 'clamp(100px,17vmin,150px)', height: 'clamp(100px,17vmin,150px)', borderRadius: 28, border: '5px solid',
          background: boxDone ? 'var(--garden-green)' : 'var(--paper)', borderColor: boxDone ? 'var(--garden-green-deep)' : 'var(--outline)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 0 rgba(61,37,22,.2)', transition: 'all .3s ease',
          animation: boxDone ? 'or_pop .5s ease' : 'none', filter: boxDone ? 'drop-shadow(0 0 16px var(--garden-green))' : 'none' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(52px,10vmin,82px)', color: boxDone ? '#fff' : 'var(--ink-muted)', lineHeight: 1 }}>{boxValue ?? '?'}</span>
        </div>
      </div>
    </>
  )
}

// ─── The interactive play surface (guided / practice) ──────────────────────────────
type Mode = 'guided' | 'practice'
const AddPlay: React.FC<{ world: AddWorld; data: AddRound; mode: Mode; onComplete: (correct: boolean) => void }> = ({ world, data, mode, onComplete }) => {
  const { scene, a, b } = data
  const cfg = SCENE[scene]
  const total = a + b
  const choices = useMemo(() => buildChoices(total), [scene, a, b])   // stable for this round
  const [picked, setPicked] = useState<number | null>(null)
  // Staged reveal — the groups pop in one-by-one, THEN the "+", THEN group B, and only
  // then the answer choices appear. Builds focus instead of dumping it all at once.
  const [aShown, setAShown] = useState(0)
  const [bShown, setBShown] = useState(0)
  const [showPlus, setShowPlus] = useState(false)
  const [asking, setAsking] = useState(false)
  // On a correct answer we COUNT all the objects (lit one-by-one) while the box climbs.
  const [lit, setLit] = useState(0)
  const [boxValue, setBoxValue] = useState<number | null>(null)
  const [boxDone, setBoxDone] = useState(false)
  const erred = useRef(false), done = useRef(false)

  useEffect(() => {
    const T: number[] = []
    const STEP = 480
    let t = 350
    if (mode === 'guided') speak(`Milo has ${qty(a, cfg)}, and ${b} more!`)
    for (let i = 1; i <= a; i++) { const c = i; T.push(window.setTimeout(() => setAShown(c), t)); t += STEP }
    t += 350; T.push(window.setTimeout(() => setShowPlus(true), t)); t += 420
    for (let i = 1; i <= b; i++) { const c = i; T.push(window.setTimeout(() => setBShown(c), t)); t += STEP }
    t += 400
    T.push(window.setTimeout(() => { setAsking(true); speak(`How many ${cfg.nounPlural} altogether?`) }, t))
    return () => T.forEach(id => window.clearTimeout(id))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function choose(n: number) {
    if (done.current || picked !== null || !asking) return
    setPicked(n)
    if (n === total) {
      done.current = true
      // count every object one-by-one (lit + box climbs), then land on the total
      if (mode === 'guided') speak(`Let's count! ${a} plus ${b}…`)
      let k = 0
      const tick = () => {
        k++; setLit(k); setBoxValue(k)
        if (k < total) { window.setTimeout(tick, 300) }
        else { setBoxDone(true); if (mode === 'guided') speak(`${total}! Altogether ${total}!`) }
      }
      window.setTimeout(tick, 250)
      window.setTimeout(() => onComplete(mode === 'practice' ? !erred.current : true), total * 300 + 1400)
    } else {
      erred.current = true
      speak(`Count again — ${a} and ${b} more. Try once more!`)
      window.setTimeout(() => setPicked(null), 1100)   // let them try again
    }
  }

  return (
    <>
      <Stage cfg={cfg} a={a} b={b} aShown={aShown} bShown={bShown} showPlus={showPlus} showQ={asking || picked !== null} lit={lit} boxValue={boxValue} boxDone={boxDone} dark={world.dark} />
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: '4%', zIndex: 31, display: 'flex', justifyContent: 'center', gap: 'clamp(14px,4vw,34px)', flexWrap: 'wrap', padding: '0 12px',
        opacity: asking ? 1 : 0, transform: asking ? 'translateY(0)' : 'translateY(20px)', transition: 'opacity .4s ease, transform .4s ease', pointerEvents: asking ? 'auto' : 'none' }}>
        {choices.map(n => {
          const isPick = picked === n, isOk = n === total
          return (
            <button key={n} onClick={() => choose(n)} disabled={picked !== null} style={{
              width: 'clamp(92px,16vmin,124px)', height: 'clamp(92px,16vmin,124px)', borderRadius: 24,
              background: (isPick && isOk) ? 'var(--garden-green-soft)' : 'var(--paper)',
              border: `4px solid ${(isPick && isOk) ? 'var(--garden-green)' : isPick ? 'var(--ink-muted)' : 'var(--outline)'}`,
              boxShadow: `0 6px 0 ${(isPick && isOk) ? 'var(--garden-green-deep)' : '#c8ac79'}`,
              fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(34px,6.4vmin,50px)', color: 'var(--ink)',
              cursor: picked !== null ? 'default' : 'pointer', transform: (isPick && isOk) ? 'scale(1.08) translateY(-3px)' : 'scale(1)',
              transition: 'transform 160ms cubic-bezier(.34,1.56,.64,1), background 160ms ease',
            }}>{n}</button>
          )
        })}
      </div>
    </>
  )
}

// ─── The teaching demo (opening preview + 3-wrong re-teach) ─────────────────────────
const AddExplain: React.FC<{ world: AddWorld; data: AddRound; onDone: () => void }> = ({ world, data, onDone }) => {
  const { scene, a, b } = data
  const cfg = SCENE[scene]
  const total = a + b
  // The demo pops each object in ONE AT A TIME (counting as it appears), then the "+", then
  // group B one-by-one, then the reveal — so the explanation builds up exactly like the play.
  const [aShown, setAShown] = useState(0)
  const [bShown, setBShown] = useState(0)
  const [showPlus, setShowPlus] = useState(false)
  const [lit, setLit] = useState(0)
  const [boxValue, setBoxValue] = useState<number | null>(null)
  const [boxDone, setBoxDone] = useState(false)
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return; ran.current = true
    const T: number[] = []
    const STEP = 720   // slow, deliberate pops so each one clearly catches the eye
    let t = 550
    speak(`Milo has ${qty(a, cfg)}, and ${b} more. Let's count them all!`)
    // group A — pop each object, counting 1..a
    for (let i = 1; i <= a; i++) { const c = i; T.push(window.setTimeout(() => { setAShown(c); setLit(c); setBoxValue(c); speak(String(c)) }, t)); t += STEP }
    // the "+"
    t += 320; T.push(window.setTimeout(() => setShowPlus(true), t)); t += 480
    // group B — pop each object, continuing the count a+1..total
    for (let j = 1; j <= b; j++) { const c = j; T.push(window.setTimeout(() => { setBShown(c); setLit(a + c); setBoxValue(a + c); speak(String(a + c)) }, t)); t += STEP }
    // reveal
    t += 450; T.push(window.setTimeout(() => { setBoxDone(true); speak(`${a} plus ${b} is ${total}! Altogether ${total}!`) }, t))
    t += 1700; T.push(window.setTimeout(onDone, t))
    return () => T.forEach(id => window.clearTimeout(id))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return <Stage cfg={cfg} a={a} b={b} aShown={aShown} bShown={bShown} showPlus={showPlus} showQ lit={lit} boxValue={boxValue} boxDone={boxDone} dark={world.dark} />
}

// ─── Value generation ──────────────────────────────────────────────────────────────
function makeRound(world: AddWorld, d: 1 | 2 | 3, round: number): AddRound {
  const scene = world.scenes[round % world.scenes.length]
  const [a, b] = addPair(d)
  return { scene, a, b }
}

function makeAddBeat(world: AddWorld): Beat<AddRound> {
  return {
    skillId: 'addition', rounds: 10, reteachAfter: 3, walkEvery: 3,
    make: (d, round = 0) => makeRound(world, (d || 1) as 1 | 2 | 3, round),
    prompt: d => `${d.a} and ${d.b} more — how many altogether?`,
    say: d => `Milo has ${qty(d.a, SCENE[d.scene])} and ${d.b} more. Count them all — how many altogether?`,
    Play: ({ data, onSubmit }) => <AddPlay world={world} data={data} mode="practice" onComplete={onSubmit} />,
    Reteach: ({ data, onDone }) => <AddExplain world={world} data={data} onDone={onDone} />,
  }
}

// ─── Orchestrator ──────────────────────────────────────────────────────────────────
const OR_CSS = `
@keyframes or_float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
@keyframes or_pop { 0%{transform:scale(0);opacity:0} 70%{transform:scale(1.15);opacity:1} 100%{transform:scale(1);opacity:1} }
`
type Phase = 'intro' | 'demo' | 'guided' | 'practice'
export default function Orchard({ world: forcedWorldId, onFinish, onExit }: {
  world?: string
  onFinish?: (correct: number, wrong: number, mastered?: boolean) => void
  onExit?: () => void
}) {
  const router = useRouter()
  const [world, setWorld] = useState<AddWorld | null>(() => (forcedWorldId ? worldById(forcedWorldId) ?? null : null))
  const [phase, setPhase] = useState<Phase>('intro')
  const [scene, setScene] = useState<Scene>('apple')
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
  const beat = useMemo(() => (world ? makeAddBeat(world) : null), [world])

  if (!world || !beat) {
    return (
      <div style={{ position: 'relative', width: '100vw', height: '100dvh', overflow: 'hidden' }}>
        <WorldSelect title="Where shall we add today?" worlds={PICK_WORLDS}
          onPick={(id) => { const w = worldById(id); if (w) { setScene(w.scenes[0]); setWorld(w) } }} onExit={exit} />
      </div>
    )
  }

  const DEMO_ORDERS: AddRound[] = [
    { scene: world.scenes[0], a: 2, b: 1 },
    { scene: world.scenes[1] ?? world.scenes[0], a: 3, b: 2 },
  ]
  const GUIDED_ORDER: AddRound = { scene: world.scenes[2] ?? world.scenes[0], a: 2, b: 2 }
  const bgScene: Scene = phase === 'practice' ? scene : phase === 'guided' ? GUIDED_ORDER.scene : phase === 'demo' ? DEMO_ORDERS[demoIdx].scene : world.scenes[0]

  const Banner = (text: string) => (
    <div style={{ position: 'absolute', top: 50, left: 0, right: 0, zIndex: 45, display: 'flex', justifyContent: 'center', padding: '0 12px' }}>
      <div style={{ background: 'var(--paper)', border: '3px solid var(--milo-orange)', borderRadius: 999, padding: '10px 24px', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 19, color: 'var(--milo-orange)', boxShadow: '0 4px 0 rgba(242,107,44,.25)', textAlign: 'center' }}>{text}</div>
    </div>
  )

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100dvh', overflow: 'hidden' }}>
      <style>{OR_CSS}</style>
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

      {phase === 'demo' && (<>{Banner(`Watch Milo count them all  (${demoIdx + 1}/${DEMO_ORDERS.length})`)}
        <AddExplain key={`demo${demoIdx}`} world={world} data={DEMO_ORDERS[demoIdx]}
          onDone={() => { if (demoIdx + 1 < DEMO_ORDERS.length) setDemoIdx(demoIdx + 1); else setPhase('guided') }} /></>)}

      {phase === 'guided' && (<>{Banner('Now you! Count them all together')}
        <AddPlay key="guided" world={world} data={GUIDED_ORDER} mode="guided" onComplete={() => setPhase('practice')} /></>)}

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
