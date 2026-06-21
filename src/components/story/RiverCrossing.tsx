'use client'
/**
 * Chapter 2 — "Milo's Number-Order Journey", told through FOUR mini-games that rotate
 * across the 10 adaptive rounds (one continuous SkillBeat — harder on a streak, easier
 * when struggling, re-explain after 3 wrong):
 *   🪨 River Crossing — tap stones smallest→biggest; they slide into a path, Milo hops over.
 *   🌉 Mend the Bridge — a plank is missing (1·2·?·4·5); tap the number that fits.
 *   🚂 Build the Train — tap cars smallest→biggest; they line up behind the engine.
 *   🎣 Go Fishing      — tap fish smallest→biggest; each is reeled into the bucket.
 * The chapter opens with a 1→10 number-line explanation + a guided round, then rotates.
 */
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { speak, speakSeq, useIsSpeaking, stopSpeech } from '@/lib/useMiloSpeaker'
import { SkillBeat, type Beat } from './StoryWorld'
import { seqLength } from '@/lib/adaptive'

// After a number is spoken on a correct tap, ignore further taps for this long. The
// `speaking` flag only flips true ~100-150ms after speak() (Chrome's cancel→speak gap
// + onstart latency); without this synchronous lock a fast second tap slips through
// that window and cancels the number mid-word. This bridges to the `speaking` gate.
const SPEAK_LOCK_MS = 600
const shuffle = <T,>(a: T[]) => a.slice().sort(() => Math.random() - 0.5)
const rint = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))
const frac = (x: number) => x - Math.floor(x)
const seed = (i: number, s: number) => frac(Math.sin((i + 1) * s) * 43758.5453)

// ─── Scenarios ─────────────────────────────────────────────────────────────────
type Scenario = 'crossing' | 'bridge' | 'train' | 'fishing'
const SCENARIO_PLAN: { s: Scenario; n: number }[] = [
  { s: 'crossing', n: 3 }, { s: 'bridge', n: 2 }, { s: 'train', n: 2 }, { s: 'fishing', n: 3 },
]
function scenarioForRound(round: number): Scenario {
  let a = 0
  for (const seg of SCENARIO_PLAN) { if (round < a + seg.n) return seg.s; a += seg.n }
  return 'fishing'
}
const SCENARIO_STARTS = new Set<number>([3, 5, 7])   // rounds where a new mini-game begins
const SCENARIO_BG: Record<Scenario, { src: string; zoom: boolean }> = {
  crossing: { src: '/assets/backgrounds/River.jpeg', zoom: true },
  bridge:   { src: '/assets/backgrounds/pond_top.jpeg', zoom: true },
  train:    { src: '/assets/backgrounds/train_bg.jpeg', zoom: false },
  fishing:  { src: '/assets/backgrounds/fishing_bg.jpeg', zoom: false },
}
const SCENARIO_ORDER: Scenario[] = ['crossing', 'bridge', 'train', 'fishing']
const SCENARIO_PROMPT: Record<Scenario, string> = {
  crossing: 'Put the stones in order — smallest first!',
  bridge: 'Build the bridge — smallest first!',
  train: 'Build the train — smallest first!',
  fishing: 'Catch the fish — smallest first!',
}
const SCENARIO_SAY: Record<Scenario, string> = {
  crossing: 'Order the stones! Smallest first.',
  bridge: "Let's mend the bridge! Smallest first.",
  train: "Let's build the train! Smallest first.",
  fishing: "Let's go fishing! Catch the smallest first.",
}

// Painted scene backgrounds; cross-fade by opacity. The top-down water scenes are
// zoomed so the water fills the screen; the side-view ones are shown as-is.
function Background({ scenario }: { scenario: Scenario }) {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#86ca63' }}>
      {SCENARIO_ORDER.map(s => {
        const b = SCENARIO_BG[s]
        return <img key={s} src={b.src} alt="" draggable={false}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: b.zoom ? 'scale(1.4)' : 'none', transformOrigin: 'center', opacity: s === scenario ? 1 : 0, transition: 'opacity .6s ease' }} />
      })}
    </div>
  )
}

// ─── Crossing geometry (top-down water) ────────────────────────────────────────
const NEAR = { left: 50, top: 93 }   // Milo's start bank (bottom)
const FAR = { left: 50, top: 7 }     // the far bank (top)
function pathSlot(rank: number, n: number, horizontal = false) {
  if (horizontal) return { left: n <= 1 ? 50 : 9 + rank * (82 / (n - 1)), top: 46 }
  return { left: 50, top: n <= 1 ? 50 : 84 - rank * (70 / (n - 1)) }   // 84% (near) → 14% (far)
}
function scatterPos(i: number) {
  return { left: 12 + seed(i, 12.9898) * 76, top: 24 + seed(i, 78.233) * 54 }   // across the water
}

// ─── Top-down Milo + Stone (River Crossing + Bridge reuse these) ───────────────
function MiloTop({ left, top, size = 148 }: { left: number; top: number; size?: number }) {
  const [missing, setMissing] = useState(false)
  return (
    <div style={{ position: 'fixed', left: `${left}%`, top: `${top}%`, transform: 'translate(-50%,-50%)', zIndex: 40, width: size, height: size, transition: 'left .55s cubic-bezier(.34,1.3,.64,1), top .55s cubic-bezier(.34,1.3,.64,1)' }}>
      {missing
        ? <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'radial-gradient(circle at 50% 38%, #ffb066, #f26b2c)', border: '4px solid #fff', boxShadow: '0 4px 10px rgba(0,0,0,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38 }}>🐴</div>
        : <img src="/assets/characters/milo_top.png" alt="Milo" draggable={false} onError={() => setMissing(true)} style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,.35))' }} />}
    </div>
  )
}
// One tappable ordering item — a STONE (River Crossing) or a PLANK (Mend the Bridge).
function OrderItem({ n, left, top, placed, wrong, onTap, size = 124, src = '/assets/objects/stone_top.png', aria = 'stone' }: { n: number; left: number; top: number; placed: boolean; wrong: boolean; onTap?: () => void; size?: number; src?: string; aria?: string }) {
  const [missing, setMissing] = useState(false)
  return (
    <button onClick={onTap} disabled={!onTap || placed} aria-label={`${aria} ${n}`}
      style={{ position: 'fixed', left: `${left}%`, top: `${top}%`, transform: `translate(-50%,-50%) ${wrong ? 'rotate(-6deg)' : ''}`, zIndex: 30,
        width: size, height: size, padding: 0, border: 'none', background: 'transparent', cursor: onTap && !placed ? 'pointer' : 'default',
        transition: 'left .5s cubic-bezier(.34,1.3,.64,1), top .5s cubic-bezier(.34,1.3,.64,1), transform .15s' }}>
      {missing
        ? <div style={{ width: '100%', height: '100%', borderRadius: '46% 46% 50% 50% / 56% 56% 44% 44%', background: placed ? '#a6dd84' : (wrong ? '#f3b0a0' : '#cabda9'), border: `4px solid ${placed ? '#6fbe3f' : (wrong ? '#d9512f' : '#9c8f7a')}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: size * 0.42, color: '#3d2516' }}>{n}</div>
        : <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <img src={src} alt="" draggable={false} onError={() => setMissing(true)}
              style={{ width: '100%', height: '100%', objectFit: 'contain', filter: placed ? 'drop-shadow(0 0 12px rgba(111,190,63,.7))' : 'drop-shadow(0 4px 5px rgba(0,0,0,.4))' }} />
            <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: size * 0.4, color: '#3d2516' }}>{n}</span>
          </div>}
    </button>
  )
}

// ─── Shared "tap smallest-first" logic (crossing / train / fishing) ────────────
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

// ─── 🪨 River Crossing (also powers the 1→10 demo + guided) ────────────────────
type Mode = 'demo' | 'guided' | 'practice'
const CrossingPlay: React.FC<{ nums: number[]; mode: Mode; horizontal?: boolean; item?: 'stone' | 'plank'; onComplete: (correct: boolean) => void }> = ({ nums, mode, horizontal = false, item = 'stone', onComplete }) => {
  const itemSrc = item === 'plank' ? '/assets/objects/plank_top.png' : '/assets/objects/stone_top.png'
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
    // Only the GUIDED round praises out loud — the demo would say it as it unmounts to
    // hand off to guided, and the speakSeq cleanup cancel() cuts it off mid-word.
    if (mode === 'guided') speak('You crossed! 🎉')
    window.setTimeout(() => onComplete(mode === 'practice' ? !erred.current : true), 1100)
  }, [mode, onComplete])

  useEffect(() => {
    if (mode === 'demo') {
      const words = ['Watch! Smallest to biggest.', ...sorted.map(String)]
      const cancel = speakSeq(words, { onWord: i => { if (i >= 1) setPlaced(i) }, onDone: () => window.setTimeout(finish, 500) })
      return () => cancel()
    }
    // The guided round used to be silent — give it a spoken prompt so the child hears
    // what to do (the on-screen banner alone isn't enough for pre-readers).
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
        return <OrderItem key={i} n={v} left={pos.left} top={pos.top} placed={isPlaced} wrong={wrong === v} size={size} src={itemSrc} aria={item} onTap={mode === 'demo' ? undefined : () => tap(v)} />
      })}
      <MiloTop left={miloPos.left} top={miloPos.top} />
    </>
  )
}

// ─── 🚂 Build the Train ────────────────────────────────────────────────────────
// Engine faces RIGHT, so it sits on the RIGHT and the cars trail to the LEFT (placed
// "back" behind it). The track is large, so the engine + cars are large to match.
const RAIL_Y = 70
function EngineSprite({ left }: { left: number }) {
  const [m, setM] = useState(false)
  const w = 250, h = w * 0.75
  return (
    <div style={{ position: 'fixed', left: `${left}%`, top: `${RAIL_Y}%`, transform: 'translate(-50%,-92%)', zIndex: 36, width: w, height: h }}>
      {m ? <div style={{ fontSize: 110, transform: 'scaleX(-1)' }}>🚂</div>
        : <img src="/assets/objects/train_engine.png" alt="engine" draggable={false} onError={() => setM(true)} style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 5px 7px rgba(0,0,0,.3))' }} />}
    </div>
  )
}
function TrainCar({ n, left, top, placed, wrong, onTap }: { n: number; left: number; top: number; placed: boolean; wrong: boolean; onTap: () => void }) {
  const [m, setM] = useState(false)
  const w = 190, h = w * 0.56
  return (
    <button onClick={onTap} disabled={placed} aria-label={`car ${n}`}
      style={{ position: 'fixed', left: `${left}%`, top: `${top}%`, transform: `translate(-50%,-90%) ${wrong ? 'rotate(-5deg)' : ''}`, zIndex: 30, width: w, height: h, padding: 0, border: 'none', background: 'transparent', cursor: placed ? 'default' : 'pointer', transition: 'left .55s cubic-bezier(.34,1.3,.64,1), top .55s cubic-bezier(.34,1.3,.64,1), transform .15s' }}>
      {m ? <div style={{ width: '100%', height: '100%', borderRadius: 14, background: placed ? '#a6dd84' : '#4f9fd4', border: '4px solid #2e6e9e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: w * 0.3, color: '#fff' }}>{n}</div>
        : <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <img src="/assets/objects/train_car.png" alt="" draggable={false} onError={() => setM(true)} style={{ width: '100%', height: '100%', objectFit: 'contain', filter: placed ? 'drop-shadow(0 0 10px rgba(111,190,63,.8))' : 'drop-shadow(0 3px 4px rgba(0,0,0,.35))' }} />
            <span style={{ position: 'absolute', left: 0, right: 0, top: '28%', textAlign: 'center', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: w * 0.26, color: '#15406b' }}>{n}</span>
          </div>}
    </button>
  )
}
const ENGINE_X = 86
const TrainPlay: React.FC<{ nums: number[]; onSubmit: (c: boolean) => void }> = ({ nums, onSubmit }) => {
  const { sorted, placed, wrong, tap } = useOrderTaps(nums, onSubmit)
  const n = sorted.length
  const scatter = useMemo(() => nums.map((_, i) => ({ left: 16 + seed(i, 12.9898) * 60, top: 22 + seed(i, 3.17) * 18 })), [nums])
  const gap = Math.min(15, 64 / (n + 1))
  return (
    <>
      <EngineSprite left={ENGINE_X} />
      {nums.map((v, i) => {
        const rank = sorted.indexOf(v)
        const isPlaced = rank < placed
        // smallest sits just behind the engine; the rest trail off to the LEFT.
        const pos = isPlaced ? { left: ENGINE_X - 13 - rank * gap, top: RAIL_Y } : scatter[i]
        return <TrainCar key={i} n={v} left={pos.left} top={pos.top} placed={isPlaced} wrong={wrong === v} onTap={() => tap(v)} />
      })}
    </>
  )
}

// ─── 🎣 Go Fishing ─────────────────────────────────────────────────────────────
function Bucket({ left, top }: { left: number; top: number }) {
  return <img src="/assets/objects/bucket.png" alt="bucket" draggable={false} style={{ position: 'fixed', left: `${left}%`, top: `${top}%`, transform: 'translate(-50%,-50%)', zIndex: 28, width: 118, height: 118, objectFit: 'contain', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,.3))' }} />
}
function FishingMilo({ left, top }: { left: number; top: number }) {
  const [m, setM] = useState(false)
  return <img src={m ? '/assets/characters/milo_idle.png' : '/assets/characters/milo_fishing.png'} alt="Milo" draggable={false} onError={() => setM(true)} style={{ position: 'fixed', left: `${left}%`, top: `${top}%`, transform: 'translate(-50%,-50%)', zIndex: 27, width: 150, height: 150, objectFit: 'contain', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,.3))' }} />
}
function Fish({ n, left, top, caught, wrong, onTap }: { n: number; left: number; top: number; caught: boolean; wrong: boolean; onTap: () => void }) {
  const w = 100
  return (
    <button onClick={onTap} disabled={caught} aria-label={`fish ${n}`}
      style={{ position: 'fixed', left: `${left}%`, top: `${top}%`, transform: `translate(-50%,-50%) ${wrong ? 'rotate(-8deg)' : ''}`, zIndex: 30, width: w, height: w * 0.72, padding: 0, border: 'none', background: 'transparent', cursor: caught ? 'default' : 'pointer', opacity: caught ? 0 : 1, transition: 'left .5s cubic-bezier(.34,1.3,.64,1), top .5s cubic-bezier(.34,1.3,.64,1), opacity .45s, transform .15s' }}>
      <img src="/assets/objects/fish.png" alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 3px 4px rgba(0,0,0,.3))' }} />
      <span style={{ position: 'absolute', top: '-8%', left: '50%', transform: 'translateX(-50%)', background: '#fff', border: '3px solid var(--milo-orange)', borderRadius: '50%', width: w * 0.4, height: w * 0.4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: w * 0.24, color: 'var(--milo-orange)' }}>{n}</span>
    </button>
  )
}
const FishingPlay: React.FC<{ nums: number[]; onSubmit: (c: boolean) => void }> = ({ nums, onSubmit }) => {
  const { sorted, placed, wrong, tap } = useOrderTaps(nums, onSubmit)
  // Fish swim DOWN in the darker underwater area (lower water), not floating on top.
  const scatter = useMemo(() => nums.map((_, i) => ({ left: 40 + seed(i, 12.9898) * 54, top: 58 + seed(i, 3.17) * 34 })), [nums])
  const bucket = { left: 22, top: 64 }
  return (
    <>
      <FishingMilo left={29} top={54} />
      <Bucket left={bucket.left} top={bucket.top} />
      {nums.map((v, i) => {
        const caught = sorted.indexOf(v) < placed
        const pos = caught ? bucket : scatter[i]
        return <Fish key={i} n={v} left={pos.left} top={pos.top} caught={caught} wrong={wrong === v} onTap={() => tap(v)} />
      })}
    </>
  )
}

// ─── The scored practice (SkillBeat) — one continuous adaptive sequence ────────
interface OrderData { nums: number[]; scenario: Scenario }
export const riverOrderBeat: Beat<OrderData> = {
  skillId: 'numberOrdering', rounds: 10, reteachAfter: 3,
  walkBeforeRound: r => SCENARIO_STARTS.has(r),
  make: (d, round = 0) => {
    const scenario = scenarioForRound(round)
    const diff = (d || 1) as 1 | 2 | 3
    const len = Math.min(5, seqLength(diff))
    let nums: number[]
    // The TRAIN is always a CONSECUTIVE series (1·2·3·4·5) — no skipped numbers.
    if (scenario === 'train') { const start = rint(1, 10 - len + 1); nums = Array.from({ length: len }, (_, i) => start + i) }
    else {
      // Others mix the "pre-ordering" consecutive case with random distinct (harder).
      const consecutive = diff === 1 ? true : diff === 2 ? Math.random() < 0.5 : Math.random() < 0.25
      if (consecutive) { const start = rint(1, 10 - len + 1); nums = Array.from({ length: len }, (_, i) => start + i) }
      else nums = shuffle(Array.from({ length: 10 }, (_, i) => i + 1)).slice(0, len)
    }
    return { nums: shuffle(nums), scenario }
  },
  prompt: d => SCENARIO_PROMPT[d.scenario],
  say: d => SCENARIO_SAY[d.scenario],
  Play: ({ data, onSubmit }) =>
    data.scenario === 'bridge' ? <CrossingPlay nums={data.nums} mode="practice" item="plank" onComplete={onSubmit} />
      : data.scenario === 'train' ? <TrainPlay nums={data.nums} onSubmit={onSubmit} />
        : data.scenario === 'fishing' ? <FishingPlay nums={data.nums} onSubmit={onSubmit} />
          : <CrossingPlay nums={data.nums} mode="practice" onComplete={onSubmit} />,
  Reteach: ({ data, onDone }) => <CrossingPlay nums={data.nums} mode="demo" horizontal onComplete={onDone} />,
}

// ─── Orchestrator ──────────────────────────────────────────────────────────────
type Phase = 'intro' | 'demo' | 'guided' | 'practice'
export default function RiverCrossing({ onFinish, onExit }: {
  onFinish?: (correct: number, wrong: number) => void
  onExit?: () => void
}) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('intro')
  const [scenario, setScenario] = useState<Scenario>('crossing')
  const result = useRef({ correct: 0, wrong: 0 })
  const finished = useRef(false)
  const exit = useCallback(() => { stopSpeech(); (onExit ?? (() => router.push('/menu')))() }, [router, onExit])

  const finishChapter = useCallback((c: number, w: number) => {
    if (finished.current) return; finished.current = true
    stopSpeech()
    if (onFinish) onFinish(c, w); else exit()
  }, [onFinish, exit])

  // Brief pause when a new mini-game begins (the bg cross-fades, Milo announces it).
  const interlude = useCallback(() => new Promise<void>(res => window.setTimeout(res, 850)), [])

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
      <Background scenario={phase === 'practice' ? scenario : 'crossing'} />
      {TopBar}

      {phase === 'intro' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 45, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
          <div style={{ maxWidth: '70%', background: '#fff', border: '3px solid var(--outline)', borderRadius: 18, padding: '14px 20px', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19, color: 'var(--ink)', textAlign: 'center', boxShadow: '0 4px 0 rgba(61,37,22,.1)' }}>
            Let&apos;s put numbers in order! First, watch me — smallest to biggest.
          </div>
          <button onClick={() => { speak('Watch me put the numbers in order, smallest to biggest!'); setPhase('demo') }}
            style={{ padding: '14px 38px', borderRadius: 50, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,var(--milo-orange),var(--milo-orange-deep,#d2541b))', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, boxShadow: '0 6px 16px rgba(242,107,44,.4)' }}>Let&apos;s go! ▶</button>
        </div>
      )}

      {phase === 'demo' && (<>{Banner('Numbers in order: 1 to 10! 🔢')}
        <CrossingPlay key="demo" nums={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]} mode="demo" horizontal onComplete={() => setPhase('guided')} /></>)}

      {phase === 'guided' && (<>{Banner('Now you! Smallest first 👆')}
        <CrossingPlay key="guided" nums={shuffle([1, 2, 3, 4])} mode="guided" onComplete={() => setPhase('practice')} /></>)}

      {phase === 'practice' && (
        <div style={{ position: 'absolute', top: 48, left: 0, right: 0, zIndex: 45, display: 'flex', justifyContent: 'center', padding: '0 12px' }}>
          <SkillBeat beat={riverOrderBeat} onInterlude={interlude}
            onRound={(data) => { if (data?.scenario) setScenario(data.scenario) }}
            onComplete={(c, w) => { result.current.correct += c; result.current.wrong += w; finishChapter(result.current.correct, result.current.wrong) }} />
        </div>
      )}
    </div>
  )
}
