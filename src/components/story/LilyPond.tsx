'use client'
/**
 * Chapter 10 — simple SUBTRACTION (skill `subtraction`). Milo has `total`; then `take` of them
 * LEAVE (jump in / float off / blink out); the child counts what's LEFT and taps that number.
 * The real skill is "take away and count what remains". The child PICKS one of three worlds; in
 * each, the same skill is dressed differently and the scene rotates across the 10 adaptive rounds
 * (one continuous SkillBeat — harder on a streak, gentler when struggling, re-teach after 3 wrong):
 *   🐸 Lily Pond  — friends hop into the water   (frog · duck · fish)   leave: down + fade
 *   🎉 Party      — balloons float away          (red · rainbow · spotty) leave: up + fade
 *   🌙 Night Sky  — lights blink out             (firefly · star · comet) leave: up + fade
 *
 * BLEND: everyone rests on a ground band with a soft contact shadow; the `take` that leave drift
 * away one-by-one (staggered) in the world's direction; the demo + re-teach then count the ones
 * that stayed. Difficulty (the numbers) ramps via subPair: 3–5 −1–2 → 5–8 −2–4 → 7–10 −3–6.
 * Reuses committed art (no new assets). Wrapped by game/SubtractionChapter.tsx.
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { speak, stopSpeech } from '@/lib/useMiloSpeaker'
import { SkillBeat, type Beat } from './StoryWorld'
import { subPair } from '@/lib/adaptive'
import WorldSelect from './WorldSelect'

// ─── Scenes & Worlds ───────────────────────────────────────────────────────────────
type Scene =
  | 'frog' | 'duck' | 'fish'           // Lily Pond
  | 'balloonR' | 'balloonRb' | 'balloonS'  // Party
  | 'firefly' | 'star' | 'comet'       // Night Sky

interface SceneCfg {
  noun: string; nounPlural: string; item: string; itemImg: string
  bg: { grad: string; img: string }
}
const SCENE: Record<Scene, SceneCfg> = {
  // Lily Pond
  frog: { noun: 'frog', nounPlural: 'frogs', item: '🐸', itemImg: '/assets/objects/frog.png', bg: { grad: 'linear-gradient(#bfe7ff 0%, #cdeede 46%, #8fd0a0 100%)', img: '/assets/backgrounds/pond.jpeg' } },
  duck: { noun: 'duck', nounPlural: 'ducks', item: '🦆', itemImg: '/assets/objects/duck.png', bg: { grad: 'linear-gradient(#bfe7ff 0%, #c8ecf0 46%, #7fc6d8 100%)', img: '/assets/backgrounds/lake.jpeg' } },
  fish: { noun: 'fish', nounPlural: 'fish', item: '🐟', itemImg: '/assets/objects/fish.png', bg: { grad: 'linear-gradient(#aee3f2 0%, #8fd2ea 50%, #5bb0d4 100%)', img: '/assets/backgrounds/River.jpeg' } },
  // Party
  balloonR:  { noun: 'balloon', nounPlural: 'balloons', item: '🎈', itemImg: '/assets/objects/balloon.png',         bg: { grad: 'linear-gradient(#ffe6f0 0%, #fdeef6 52%, #e7d8f3 100%)', img: '/assets/backgrounds/party_balloons.png' } },
  balloonRb: { noun: 'balloon', nounPlural: 'balloons', item: '🎈', itemImg: '/assets/objects/rainbow_balloon.png', bg: { grad: 'linear-gradient(#ffeede 0%, #fdf0e6 52%, #f3e2d8 100%)', img: '/assets/backgrounds/balloon_fair.png' } },
  balloonS:  { noun: 'balloon', nounPlural: 'balloons', item: '🎈', itemImg: '/assets/objects/pat_balloon.png',      bg: { grad: 'linear-gradient(#e6f0ff 0%, #eef4fd 52%, #d8e6f3 100%)', img: '/assets/backgrounds/party_banner.png' } },
  // Night Sky
  firefly: { noun: 'firefly', nounPlural: 'fireflies', item: '✨', itemImg: '/assets/objects/firefly.png', bg: { grad: 'linear-gradient(#2b3a63 0%, #213056 52%, #182241 100%)', img: '/assets/backgrounds/sky.jpeg' } },
  star:    { noun: 'star', nounPlural: 'stars', item: '⭐', itemImg: '/assets/objects/star.png', bg: { grad: 'linear-gradient(#243056 0%, #1b2548 52%, #131a36 100%)', img: '/assets/backgrounds/space_deepspace.png' } },
  comet:   { noun: 'comet', nounPlural: 'comets', item: '☄️', itemImg: '/assets/objects/comet.png', bg: { grad: 'linear-gradient(#283357 0%, #1f294a 52%, #161d3a 100%)', img: '/assets/backgrounds/forest_2.jpeg' } },
}

type LeaveDir = 'down' | 'up'
interface SubWorld {
  id: string; label: string; emoji: string
  scenes: Scene[]
  milo: { src: string; emoji: string; accessory: string }
  leave: LeaveDir
  leaveWord: (k: number) => string   // spoken "k jump in / float away …"
  dark?: boolean
  intro: string
}
const WORLDS: SubWorld[] = [
  { id: 'pond', label: "Lily Pond", emoji: '🐸', scenes: ['frog', 'duck', 'fish'],
    milo: { src: '/assets/characters/milo_fishing.png', emoji: '🐢', accessory: '🎣' }, leave: 'down',
    leaveWord: k => `${k} hop into the water!`,
    intro: "At the lily pond, some friends hop in for a swim! Watch how many LEAVE, then count who's LEFT. First, watch Milo!" },
  { id: 'party', label: "Party", emoji: '🎉', scenes: ['balloonR', 'balloonRb', 'balloonS'],
    milo: { src: '/assets/characters/milo_idle.png', emoji: '🦊', accessory: '🎈' }, leave: 'up',
    leaveWord: k => `${k} float away!`,
    intro: "It's a party! Some balloons float up and away. Watch how many LEAVE, then count how many are LEFT. First, watch Milo!" },
  { id: 'night', label: "Night Sky", emoji: '🌙', scenes: ['firefly', 'star', 'comet'],
    milo: { src: '/assets/characters/milo_explorer.png', emoji: '🦊', accessory: '🔭' }, leave: 'up', dark: true,
    leaveWord: k => `${k} blink out!`,
    intro: "Up in the night sky, some lights blink out one by one. Watch how many LEAVE, then count how many are LEFT. First, watch Milo!" },
]
const worldById = (id: string) => WORLDS.find(w => w.id === id)
const PICK_WORLDS = WORLDS.map(w => ({ id: w.id, label: w.label, emoji: w.emoji, bgImage: SCENE[w.scenes[0]].bg.img }))

interface SubRound { scene: Scene; total: number; take: number }
const qty = (n: number, cfg: SceneCfg) => `${n} ${n === 1 ? cfg.noun : cfg.nounPlural}`

function buildChoices(answer: number): number[] {
  const opts = new Set<number>([answer])
  while (opts.size < 3) {
    const d = Math.floor(Math.random() * 3) + 1
    const v = Math.random() < 0.5 ? answer + d : Math.max(0, answer - d)
    if (v !== answer) opts.add(v)
  }
  const arr = [...opts]
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[arr[i], arr[j]] = [arr[j], arr[i]] }
  return arr
}

function Background({ scene, scenes }: { scene: Scene; scenes: Scene[] }) {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#dfeef3' }}>
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

function MiloHost({ left, milo }: { left: number; milo: SubWorld['milo'] }) {
  const [step, setStep] = useState(0)
  const srcs = [milo.src, '/assets/characters/milo_idle.png']
  return (
    <div style={{ position: 'fixed', left: `${left}%`, bottom: 0, transform: 'translateX(-50%)', zIndex: 26, width: 'min(30vh, 260px)', height: 'min(30vh, 260px)', pointerEvents: 'none' }}>
      <div style={{ width: '100%', height: '100%', animation: 'lp_float 3.4s ease-in-out infinite' }}>
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

function Item({ cfg, size }: { cfg: SceneCfg; size: string }) {
  const [missing, setMissing] = useState(false)
  if (missing) return <span style={{ fontSize: size, lineHeight: 1, filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.2))' }}>{cfg.item}</span>
  return <img src={cfg.itemImg} alt="" draggable={false} onError={() => setMissing(true)}
    style={{ width: size, height: size, objectFit: 'contain', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.25))' }} />
}

// ─── The scene: `total` objects on the ground; the last `take` drift away when `left`. ──
// Staged: `shown` pops the objects in one-by-one; the "how many left" box only appears
// once `showQ` is set (after the take-away has played).
function Stage({ cfg, total, take, shown, left, lit, showLeft, glow, dir, dark, showQ = true }: {
  cfg: SceneCfg; total: number; take: number; shown?: number; left: boolean; lit: number; showLeft: boolean; glow: boolean; dir: LeaveDir; dark?: boolean; showQ?: boolean
}) {
  const answer = total - take
  const N = shown ?? total
  // Big objects, but shrink a little when there are many so they never collide with the
  // "how many left" box (esp. in short/landscape viewports). Small counts stay BIG.
  const itemSize = total <= 4 ? 'clamp(94px, 18vmin, 210px)' : total <= 7 ? 'clamp(78px, 14vmin, 165px)' : 'clamp(62px, 11vmin, 135px)'
  const drift = dir === 'down' ? '4.5vh' : '-6vh'
  return (
    <>
      {/* the row of friends, grounded; the last `take` leave (staggered) */}
      <div style={{ position: 'fixed', left: 0, right: 0, top: '36%', transform: 'translateY(-50%)', zIndex: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6vh' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.6vmin', justifyContent: 'center', alignItems: 'flex-end', maxWidth: '88vw', minHeight: '13vh' }}>
          {Array.from({ length: N }).map((_, i) => {
            const leaving = i >= total - take
            const gone = leaving && left
            const stay = !leaving
            const litNow = stay && i < lit
            const back = i % 2 === 1
            const depth = back ? 0.4 : 0.1
            const jx = [-1.4, 1.1, -0.6, 1.6, -1.1, 0.7][i % 6]
            const shOp = (0.24 - depth * 0.12).toFixed(2)
            const shW = `calc(${itemSize} * 0.62)`
            const delay = leaving ? (i - (total - take)) * 170 : 0
            return (
              <div key={i} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center',
                transform: `translate(${jx}px, ${gone ? drift : back ? '-0.5vmin' : '0'}) scale(${gone ? 0.5 : (1 - depth * 0.13) * (litNow ? 1.16 : 1)})`,
                opacity: gone ? 0 : 1, zIndex: back ? 1 : 2, transformOrigin: 'bottom center',
                transition: `transform .55s ease ${delay}ms, opacity .55s ease ${delay}ms`,
                filter: litNow ? 'drop-shadow(0 0 12px var(--sun-yellow))' : 'none', animation: !left ? 'lp_pop .3s ease both' : 'none' }}>
                <Item cfg={cfg} size={itemSize} />
                {!gone && <div aria-hidden style={{ width: shW, height: `calc(${shW} * 0.3)`, marginTop: '0.3vmin',
                  background: `radial-gradient(ellipse at center, rgba(38,28,18,${shOp}) 0%, rgba(38,28,18,0) 72%)`, pointerEvents: 'none' }} />}
              </div>
            )
          })}
        </div>
        <div style={{ width: 'min(72vw, 660px)', height: '2.1vh', minHeight: 12, background: dark ? 'linear-gradient(#3a4a72,#283156)' : 'linear-gradient(#9ccb86,#6fa64f)', borderRadius: 6, boxShadow: '0 5px 9px rgba(0,0,0,.28)' }} />
      </div>

      {/* "How many LEFT" box + answer — only after the take-away has played */}
      <div style={{ position: 'fixed', left: 0, right: 0, top: '71%', transform: 'translateY(-50%)', zIndex: 31, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4vh',
        opacity: showQ ? 1 : 0, transition: 'opacity .4s ease' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(12px,1.9vh,17px)', letterSpacing: '.08em', color: dark ? '#dfe6ff' : 'var(--ink-soft)' }}>HOW MANY LEFT?</span>
        <div style={{ width: 'clamp(100px,17vmin,150px)', height: 'clamp(100px,17vmin,150px)', borderRadius: 28, border: '5px solid',
          background: showLeft ? 'var(--garden-green)' : 'var(--paper)', borderColor: showLeft ? 'var(--garden-green-deep)' : 'var(--outline)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 0 rgba(61,37,22,.2)', transition: 'all .35s ease',
          animation: glow ? 'lp_pop .5s ease' : 'none', filter: glow ? 'drop-shadow(0 0 16px var(--garden-green))' : 'none' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(52px,10vmin,82px)', color: showLeft ? '#fff' : 'var(--ink-muted)', lineHeight: 1 }}>{showLeft ? answer : '?'}</span>
        </div>
      </div>
    </>
  )
}

// ─── The interactive play surface (guided / practice) ──────────────────────────────
type Mode = 'guided' | 'practice'
const SubPlay: React.FC<{ world: SubWorld; data: SubRound; mode: Mode; onComplete: (correct: boolean) => void }> = ({ world, data, mode, onComplete }) => {
  const { scene, total, take } = data
  const cfg = SCENE[scene]
  const answer = total - take
  const choices = useMemo(() => buildChoices(answer), [scene, total, take])
  const [shown, setShown] = useState(0)
  const [left, setLeft] = useState(false)
  const [picked, setPicked] = useState<number | null>(null)
  const [lit, setLit] = useState(0)
  const [asking, setAsking] = useState(false)
  const erred = useRef(false), done = useRef(false)

  // Staged: the friends pop in one-by-one, THEN `take` of them leave, and only THEN do the
  // answer choices appear — so the child watches the take-away instead of seeing it all at once.
  useEffect(() => {
    const T: number[] = []
    const STEP = 440
    let t = 350
    if (mode === 'guided') speak(`Milo has ${qty(total, cfg)}.`)
    for (let i = 1; i <= total; i++) { const c = i; T.push(window.setTimeout(() => setShown(c), t)); t += STEP }
    t += 450
    T.push(window.setTimeout(() => { setLeft(true); if (mode === 'guided') speak(world.leaveWord(take)) }, t))
    t += Math.max(900, take * 200 + 700)
    T.push(window.setTimeout(() => { setAsking(true); speak(`How many ${cfg.nounPlural} are LEFT?`) }, t))
    return () => T.forEach(id => window.clearTimeout(id))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function choose(n: number) {
    if (done.current || picked !== null || !asking) return
    setPicked(n)
    if (n === answer) {
      done.current = true
      let k = 0
      const tick = () => { k++; setLit(k); if (k < answer) window.setTimeout(tick, 220) }
      window.setTimeout(tick, 100)
      if (mode === 'guided') speak(`Yes! ${total} take away ${take} is ${answer}! ${answer} left!`)
      window.setTimeout(() => onComplete(mode === 'practice' ? !erred.current : true), 1300)
    } else {
      erred.current = true
      speak(`Count the ones that stayed. Try once more!`)
      window.setTimeout(() => setPicked(null), 1100)
    }
  }

  const reveal = picked === answer
  return (
    <>
      <Stage cfg={cfg} total={total} take={take} shown={shown} left={left} lit={reveal ? lit : 0} showLeft={reveal} glow={reveal} dir={world.leave} dark={world.dark} showQ={asking || picked !== null} />
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: '4%', zIndex: 31, display: 'flex', justifyContent: 'center', gap: 'clamp(14px,4vw,34px)', flexWrap: 'wrap', padding: '0 12px',
        opacity: asking ? 1 : 0, transform: asking ? 'translateY(0)' : 'translateY(20px)', transition: 'opacity .4s ease, transform .4s ease', pointerEvents: asking ? 'auto' : 'none' }}>
        {choices.map(n => {
          const isPick = picked === n, isOk = n === answer
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
const SubExplain: React.FC<{ world: SubWorld; data: SubRound; onDone: () => void }> = ({ world, data, onDone }) => {
  const { scene, total, take } = data
  const cfg = SCENE[scene]
  const answer = total - take
  // The demo pops each object in ONE AT A TIME (counting 1..total), THEN the `take` leave,
  // THEN counts who's left — so the explanation builds up exactly like the play.
  const [shown, setShown] = useState(0)
  const [left, setLeft] = useState(false)
  const [lit, setLit] = useState(0)
  const [showLeft, setShowLeft] = useState(false)
  const [glow, setGlow] = useState(false)
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return; ran.current = true
    const T: number[] = []
    const STEP = 700
    let t = 550
    speak(`Milo has ${qty(total, cfg)}.`)
    // pop each one in, counting 1..total
    for (let i = 1; i <= total; i++) { const c = i; T.push(window.setTimeout(() => { setShown(c); speak(String(c)) }, t)); t += STEP }
    // the take-away
    t += 500; T.push(window.setTimeout(() => { setLeft(true); speak(world.leaveWord(take)) }, t))
    t += Math.max(1100, take * 220 + 800)
    // count who's left, one-by-one
    T.push(window.setTimeout(() => speak(`Now count who's left…`), t)); t += 800
    for (let k = 1; k <= answer; k++) { const c = k; T.push(window.setTimeout(() => { setLit(c); speak(String(c)) }, t)); t += 560 }
    t += 300; T.push(window.setTimeout(() => { setShowLeft(true); setGlow(true); speak(`${total} take away ${take} is ${answer}! ${answer} left!`) }, t))
    t += 1700; T.push(window.setTimeout(onDone, t))
    return () => T.forEach(id => window.clearTimeout(id))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return <Stage cfg={cfg} total={total} take={take} shown={shown} left={left} lit={lit} showLeft={showLeft} glow={glow} dir={world.leave} dark={world.dark} />
}

// ─── Value generation ──────────────────────────────────────────────────────────────
function makeRound(world: SubWorld, d: 1 | 2 | 3, round: number): SubRound {
  const scene = world.scenes[round % world.scenes.length]
  const [total, take] = subPair(d)
  return { scene, total, take }
}

function makeSubBeat(world: SubWorld): Beat<SubRound> {
  return {
    skillId: 'subtraction', rounds: 10, reteachAfter: 3, walkEvery: 3,
    make: (d, round = 0) => makeRound(world, (d || 1) as 1 | 2 | 3, round),
    prompt: d => `${d.total} take away ${d.take} — how many are left?`,
    say: d => `Milo has ${qty(d.total, SCENE[d.scene])}. ${world.leaveWord(d.take)} How many are left?`,
    Play: ({ data, onSubmit }) => <SubPlay world={world} data={data} mode="practice" onComplete={onSubmit} />,
    Reteach: ({ data, onDone }) => <SubExplain world={world} data={data} onDone={onDone} />,
  }
}

// ─── Orchestrator ──────────────────────────────────────────────────────────────────
const LP_CSS = `
@keyframes lp_float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
@keyframes lp_pop { 0%{transform:scale(0);opacity:0} 70%{transform:scale(1.15);opacity:1} 100%{transform:scale(1);opacity:1} }
`
type Phase = 'intro' | 'demo' | 'guided' | 'practice'
export default function LilyPond({ world: forcedWorldId, onFinish, onExit }: {
  world?: string
  onFinish?: (correct: number, wrong: number, mastered?: boolean) => void
  onExit?: () => void
}) {
  const router = useRouter()
  const [world, setWorld] = useState<SubWorld | null>(() => (forcedWorldId ? worldById(forcedWorldId) ?? null : null))
  const [phase, setPhase] = useState<Phase>('intro')
  const [scene, setScene] = useState<Scene>('frog')
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
  const beat = useMemo(() => (world ? makeSubBeat(world) : null), [world])

  if (!world || !beat) {
    return (
      <div style={{ position: 'relative', width: '100vw', height: '100dvh', overflow: 'hidden' }}>
        <WorldSelect title="Where shall we take away today?" worlds={PICK_WORLDS}
          onPick={(id) => { const w = worldById(id); if (w) { setScene(w.scenes[0]); setWorld(w) } }} onExit={exit} />
      </div>
    )
  }

  const DEMO_ORDERS: SubRound[] = [
    { scene: world.scenes[0], total: 4, take: 1 },
    { scene: world.scenes[1] ?? world.scenes[0], total: 5, take: 2 },
  ]
  const GUIDED_ORDER: SubRound = { scene: world.scenes[2] ?? world.scenes[0], total: 4, take: 2 }
  const bgScene: Scene = phase === 'practice' ? scene : phase === 'guided' ? GUIDED_ORDER.scene : phase === 'demo' ? DEMO_ORDERS[demoIdx].scene : world.scenes[0]

  const Banner = (text: string) => (
    <div style={{ position: 'absolute', top: 50, left: 0, right: 0, zIndex: 45, display: 'flex', justifyContent: 'center', padding: '0 12px' }}>
      <div style={{ background: 'var(--paper)', border: '3px solid var(--milo-orange)', borderRadius: 999, padding: '10px 24px', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 19, color: 'var(--milo-orange)', boxShadow: '0 4px 0 rgba(242,107,44,.25)', textAlign: 'center' }}>{text}</div>
    </div>
  )

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100dvh', overflow: 'hidden' }}>
      <style>{LP_CSS}</style>
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

      {phase === 'demo' && (<>{Banner(`Watch Milo take some away  (${demoIdx + 1}/${DEMO_ORDERS.length})`)}
        <SubExplain key={`demo${demoIdx}`} world={world} data={DEMO_ORDERS[demoIdx]}
          onDone={() => { if (demoIdx + 1 < DEMO_ORDERS.length) setDemoIdx(demoIdx + 1); else setPhase('guided') }} /></>)}

      {phase === 'guided' && (<>{Banner('Now you! Count how many are left')}
        <SubPlay key="guided" world={world} data={GUIDED_ORDER} mode="guided" onComplete={() => setPhase('practice')} /></>)}

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
