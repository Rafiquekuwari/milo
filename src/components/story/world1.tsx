'use client'
/**
 * World 1 — "Milo's Picnic Party" (The Number Forest).
 * Merges counting · number recognition · matching quantity · more/less · number
 * order into one journey. Each skill scene is a SkillBeat (adaptive + re-teach +
 * warm feedback). Illustrated with hand-built SVG art (./art). See docs/story-mode-3-5.md.
 */
import React, { useState, useEffect, useRef, useMemo } from 'react'
import { speak, speakSeq, speakAfterCurrent, useIsSpeaking } from '@/lib/useMiloSpeaker'
import { type Difficulty } from '@/lib/adaptive'
import type { World, Beat } from './StoryWorld'
import { CountItem, CountStage, type CountKind, COUNT_LABEL, COUNT_PLURAL, DoorArt, Apple, Berry, Stone, Basket } from './art'

const rint = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))
const shuffle = <T,>(a: T[]) => a.slice().sort(() => Math.random() - 0.5)
const bare: React.CSSProperties = { background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }

// ── Scene 1: COUNTING (tap each object; counts aloud; success-only) ──
interface CountData { n: number; obj: CountKind }
const CountPlay: React.FC<{ data: CountData; onSubmit: (c: boolean) => void }> = ({ data, onSubmit }) => {
  const [lit, setLit] = useState<boolean[]>(() => Array(data.n).fill(false))
  const done = useRef(false)
  const count = lit.filter(Boolean).length
  function tap(i: number) {
    if (lit[i] || done.current) return
    const nl = lit.slice(); nl[i] = true; setLit(nl)
    const c = nl.filter(Boolean).length
    speak(String(c))
    if (c === data.n) { done.current = true; window.setTimeout(() => onSubmit(true), 950) }
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 52, color: '#fff', textShadow: '0 2px 6px rgba(0,0,0,.35)' }}>{count}</div>
      <CountStage kind={data.obj}>
        {lit.map((on, i) => (
          <button key={i} onClick={() => tap(i)} style={{ ...bare, animation: on || data.obj !== 'firefly' ? 'none' : 's_twinkle 2s ease-in-out infinite' }}><CountItem kind={data.obj} on={on} /></button>
        ))}
      </CountStage>
    </div>
  )
}
const AutoCountReteach: React.FC<{ data: CountData; onDone: () => void }> = ({ data, onDone }) => {
  const [shown, setShown] = useState(0)
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return; ran.current = true
    const ids: number[] = []
    for (let k = 1; k <= data.n; k++) ids.push(window.setTimeout(() => { setShown(k); speak(String(k)) }, k * 750))
    ids.push(window.setTimeout(onDone, data.n * 750 + 900))
    return () => ids.forEach(clearTimeout)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 52, color: '#fff', textShadow: '0 2px 6px rgba(0,0,0,.35)' }}>{shown}</div>
      <CountStage kind={data.obj}>
        {Array.from({ length: data.n }).map((_, i) => <span key={i} style={{ opacity: i < shown ? 1 : 0.3, transition: 'opacity .3s' }}><CountItem kind={data.obj} on={i < shown} /></span>)}
      </CountStage>
    </div>
  )
}
// One counting beat per object type, so a chapter can count fireflies, then
// apples, then mushrooms… (the quantity stays adaptive; only the thing changes).
export function countBeatFor(obj: CountKind): Beat<CountData> {
  return {
    skillId: 'counting', rounds: 1,
    make: d => ({ n: d === 1 ? rint(2, 3) : d === 2 ? rint(4, 5) : rint(6, 8), obj }),
    prompt: d => `Tap each ${COUNT_LABEL[d.obj]} to count them!`,
    Play: CountPlay, Reteach: AutoCountReteach,
  }
}
export const countBeat = countBeatFor('firefly')
export const countApples = countBeatFor('apple')
export const countMushrooms = countBeatFor('mushroom')

// ── In-scene counting: objects fly around the FOREST (not a canvas) ──
// Fireflies/butterflies/pigeons appear scattered over the whole scene, big and
// floating, and the child taps each one. Positions are stable per round and kept
// clear of the top bar, Milo (far left), and the edges.
const frac = (x: number) => x - Math.floor(x)
const seed = (i: number, s: number) => frac(Math.sin((i + 1) * s) * 43758.5453)
// Lay objects out on a loose GRID (+ small jitter) so they never collapse onto
// each other — every object stays in its own cell and is individually tappable.
// `demo` objects are a touch smaller (up to 10 on screen); practice ones bigger.
function scatter(n: number, demo = false) {
  const cols = Math.min(5, Math.max(1, Math.ceil(Math.sqrt(n * 2.2))))
  const rows = Math.ceil(n / cols)
  const X0 = 12, X1 = 90, Y0 = 16, Y1 = 78
  const cw = (X1 - X0) / cols, ch = (Y1 - Y0) / rows
  const base = demo ? 124 : 150
  const rng = demo ? 22 : 28
  return Array.from({ length: n }, (_, i) => {
    const r = Math.floor(i / cols), c = i % cols
    const jx = (seed(i, 12.9898) - 0.5) * cw * 0.36
    const jy = (seed(i, 78.233) - 0.5) * ch * 0.36
    return {
      left: X0 + cw * (c + 0.5) + jx,   // %
      top: Y0 + ch * (r + 0.5) + jy,    // %
      size: base + Math.round(seed(i, 3.17) * rng),
      dur: 4.6 + seed(i, 5.71) * 3,     // s
    }
  })
}

// Big, prominent running-count badge (kept large so the number is easy to read).
const CountBadge: React.FC<{ value: number | string }> = ({ value }) => (
  <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 30,
    minWidth: 100, height: 100, padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--paper)', border: '5px solid var(--milo-orange)', borderRadius: 999,
    fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 66, lineHeight: 1, color: 'var(--milo-orange)', boxShadow: '0 6px 0 rgba(242,107,44,.3)' }}>{value}</div>
)
export const FlyingCountPlay: React.FC<{ data: CountData; onSubmit: (c: boolean) => void }> = ({ data, onSubmit }) => {
  const [lit, setLit] = useState<boolean[]>(() => Array(data.n).fill(false))
  const done = useRef(false)
  const speaking = useIsSpeaking()              // block taps while Milo says a number,
  const spots = useMemo(() => scatter(data.n), [data.n])  // so fast taps can't skip the count
  const count = lit.filter(Boolean).length
  function tap(i: number) {
    if (lit[i] || done.current || speaking) return
    const nl = lit.slice(); nl[i] = true; setLit(nl)
    const c = nl.filter(Boolean).length
    speak(String(c))
    if (c === data.n) { done.current = true; window.setTimeout(() => onSubmit(true), 950) }
  }
  return (
    <>
      {spots.map((p, i) => (
        <button key={i} onClick={() => tap(i)} aria-label={data.obj} disabled={speaking}
          style={{ ...bare, position: 'fixed', left: `${p.left}%`, top: `${p.top}%`, zIndex: 30,
            animation: lit[i] ? 'none' : `fw_fly ${p.dur}s ease-in-out ${i * 0.3}s infinite` }}>
          <CountItem kind={data.obj} on={lit[i]} size={p.size} variant={i} />
        </button>
      ))}
      {/* running count, pinned at the bottom so it never hides an object */}
      <CountBadge value={count} />
    </>
  )
}
const CATCH_INTRO: Partial<Record<CountKind, string>> = {
  firefly: 'Fireflies are out!', butterfly: 'Look, butterflies!', pigeon: 'Pigeons in the forest!',
}
export function flyingCountBeatFor(obj: CountKind): Beat<CountData> {
  return {
    skillId: 'counting', rounds: 1,
    make: d => ({ n: d === 1 ? rint(2, 3) : d === 2 ? rint(4, 5) : rint(6, 8), obj }),
    prompt: d => `Tap each ${COUNT_LABEL[d.obj]} you see!`,
    // Spoken when the practice auto-starts — the explanation IS the practice intro,
    // so there's no separate "Next" step between telling and doing.
    say: d => `${CATCH_INTRO[d.obj] ?? ''} Tap each ${COUNT_LABEL[d.obj]} you see!`.trim(),
    Play: FlyingCountPlay, Reteach: AutoCountReteach,
  }
}

// The opening demo, in the SAME flying-in-the-scene style as the practice: Milo
// reveals one object per number and says 1…N aloud, so explanation → practice is
// one continuous flow (no jump to a different-looking canvas).
export const FlyingCountDemo: React.FC<{ to: number; obj: CountKind; onDone: () => void }> = ({ to, obj, onDone }) => {
  const [shown, setShown] = useState(0)
  const ran = useRef(false)
  const spots = useMemo(() => scatter(to, true), [to])
  useEffect(() => {
    if (ran.current) return; ran.current = true
    // speakSeq plays each phrase only after the previous one ENDS — so numbers are
    // never cut off, and the matching object appears exactly as its number is said.
    const words = ["Let's count together!", ...Array.from({ length: to }, (_, k) => String(k + 1))]
    const cancel = speakSeq(words, {
      onWord: i => { if (i >= 1) setShown(i) },        // i=0 is the intro line
      onDone: () => { window.setTimeout(onDone, 1400) },
    })
    return () => cancel()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <>
      {spots.map((p, i) => i < shown && (
        <span key={i} style={{ position: 'fixed', left: `${p.left}%`, top: `${p.top}%`, zIndex: 30,
          animation: `fw_fly ${p.dur}s ease-in-out ${i * 0.3}s infinite` }}>
          <CountItem kind={obj} on size={p.size} variant={i} />
        </span>
      ))}
      <CountBadge value={shown} />
    </>
  )
}

// ── The PRACTICE: 10 adaptive "How many do you see?" questions ──
// Objects fly around the scene; the child counts and taps the matching number.
// Wrong is possible (unlike tap-to-collect), so the adaptive + 3-wrong-streak
// re-explanation actually fires. Re-explanation = Milo counts them out (a flying
// demo of exactly this quantity).
const COUNTABLES: CountKind[] = ['firefly', 'butterfly', 'pigeon']
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]
interface HowManyData { n: number; obj: CountKind; choices: number[] }
// Two steps: (1) the child taps each flying object to COUNT it — each tap grows the
// object (so none are recounted or missed) and Milo says the running count; (2) once
// every object is tapped, the number choices appear and the child picks the answer.
const HowManyPlay: React.FC<{ data: HowManyData; onSubmit: (c: boolean) => void }> = ({ data, onSubmit }) => {
  // The child just taps each object to count it — it grows so it isn't recounted.
  // No number on the object, no running-count pill: only the tap. Once every object
  // is tapped, the number choices appear.
  const [tapped, setTapped] = useState<boolean[]>(() => Array(data.n).fill(false))
  const [picked, setPicked] = useState<number | null>(null)
  const speaking = useIsSpeaking()                 // taps are blocked until Milo finishes
  const spots = useMemo(() => scatter(data.n), [data.n])
  const allTapped = tapped.every(Boolean)
  const asked = useRef(false)
  function tap(i: number) {
    if (tapped[i] || picked != null || speaking) return
    const nt = tapped.slice(); nt[i] = true; setTapped(nt)   // mark counted; no voice, no number
  }
  function choose(v: number) { if (picked != null || speaking) return; setPicked(v); window.setTimeout(() => onSubmit(v === data.n), 450) }
  useEffect(() => {
    if (allTapped && !asked.current) { asked.current = true; speakAfterCurrent('So how many? Tap the number!') }
  }, [allTapped])
  return (
    <>
      {spots.map((p, i) => (
        <button key={i} onClick={() => tap(i)} aria-label={data.obj} disabled={picked != null || speaking}
          style={{ ...bare, position: 'fixed', left: `${p.left}%`, top: `${p.top}%`, zIndex: 30,
            animation: tapped[i] ? 'none' : `fw_fly ${p.dur}s ease-in-out ${i * 0.3}s infinite` }}>
          <CountItem kind={data.obj} on={tapped[i]} size={p.size} variant={i} />
        </button>
      ))}
      {allTapped && (
        <div style={{ position: 'fixed', bottom: 18, left: '50%', transform: 'translateX(-50%)', zIndex: 30, display: 'flex', gap: 16, animation: 'fw_pop .35s ease both' }}>
          {data.choices.map(v => {
            const isPick = picked === v, ok = isPick && v === data.n
            return (
              <button key={v} onClick={() => choose(v)} disabled={picked != null || speaking} style={{
                width: 96, height: 96, borderRadius: 22, fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 46, cursor: picked != null ? 'default' : 'pointer',
                color: ok ? '#fff' : 'var(--milo-orange)', background: ok ? 'var(--garden-green)' : 'var(--paper)',
                border: `5px solid ${ok ? 'var(--garden-green-deep)' : 'var(--milo-orange)'}`, boxShadow: '0 6px 0 rgba(242,107,44,.3)',
                transform: isPick ? 'translateY(-4px)' : 'none', transition: 'all .15s' }}>{v}</button>
            )
          })}
        </div>
      )}
    </>
  )
}
// Re-explanation: Milo counts these objects out, 1…n, flying in the scene.
const FlyingReteach: React.FC<{ data: HowManyData; onDone: () => void }> = ({ data, onDone }) =>
  <FlyingCountDemo to={data.n} obj={data.obj} onDone={onDone} />

export const practiceCountBeat: Beat<HowManyData> = {
  skillId: 'counting', rounds: 10, reteachAfter: 3, walkEvery: 2,
  make: d => {
    const obj = pick(COUNTABLES)
    const n = d === 1 ? rint(1, 4) : d === 2 ? rint(3, 7) : rint(5, 10)
    const set = new Set<number>([n])
    while (set.size < 3) { const c = Math.min(10, Math.max(1, n + rint(-2, 2))); if (c !== n) set.add(c) }
    return { n, obj, choices: shuffle([...set]) }
  },
  // Clear action for the child: tap each one to count it. (After they've tapped all,
  // HowManyPlay says "So how many? Tap the number!" for the answer step.)
  prompt: d => `Tap and count the ${COUNT_PLURAL[d.obj]}!`,
  say: d => `Tap and count the ${COUNT_PLURAL[d.obj]}! Tap each one.`,
  Play: HowManyPlay, Reteach: FlyingReteach,
}

// ── Scene 2: NUMBER RECOGNITION (knock on door N) ──
interface DoorData { target: number; choices: number[] }
const DoorPlay: React.FC<{ data: DoorData; onSubmit: (c: boolean) => void }> = ({ data, onSubmit }) => {
  const [picked, setPicked] = useState<number | null>(null)
  function tap(v: number) { if (picked != null) return; setPicked(v); window.setTimeout(() => onSubmit(v === data.target), 350) }
  return (
    <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
      {data.choices.map(v => {
        const ok = picked === v && v === data.target
        return (
          <button key={v} onClick={() => tap(v)} disabled={picked != null} style={{ ...bare, width: 80, height: 110, cursor: picked != null ? 'default' : 'pointer',
            transform: ok ? 'translateY(-6px) scale(1.05)' : 'none', transition: 'transform .2s', filter: ok ? 'drop-shadow(0 0 10px rgba(111,190,63,.85))' : 'none' }}>
            <DoorArt n={v} highlight={ok} />
          </button>
        )
      })}
    </div>
  )
}
const DoorReteach: React.FC<{ data: DoorData; onDone: () => void }> = ({ data, onDone }) => {
  const ran = useRef(false)
  useEffect(() => { if (ran.current) return; ran.current = true; speak(`This is door number ${data.target}. Let's knock here!`); const id = window.setTimeout(onDone, 2200); return () => clearTimeout(id) }, [data.target, onDone])
  return (
    <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
      {data.choices.map(v => (
        <div key={v} style={{ width: 80, height: 110, opacity: v === data.target ? 1 : 0.45, filter: v === data.target ? 'drop-shadow(0 0 12px rgba(111,190,63,.9))' : 'none', transition: 'all .3s' }}>
          <DoorArt n={v} highlight={v === data.target} />
        </div>
      ))}
    </div>
  )
}
const doorBeat: Beat<DoorData> = {
  skillId: 'numberRecognition', rounds: 2,
  make: d => {
    const max = d === 1 ? 5 : d === 2 ? 9 : 10
    const n = d === 1 ? 3 : 4
    const target = rint(1, max)
    const set = new Set<number>([target])
    while (set.size < n) set.add(rint(1, max))
    return { target, choices: shuffle([...set]) }
  },
  // Number-recognition: the target is HEARD, not written — the child must
  // listen, then find the matching numeral on the doors. 🔊 replays the number.
  prompt: () => 'Which door did I say? Tap it!',
  say: data => `Knock on door number ${data.target}!`,
  Play: DoorPlay, Reteach: DoorReteach,
}

// ── Scene 3: MATCHING QUANTITY (put N apples in the basket) ──
interface BasketData { n: number; pool: number }
const BasketPlay: React.FC<{ data: BasketData; onSubmit: (c: boolean) => void }> = ({ data, onSubmit }) => {
  const [picked, setPicked] = useState<boolean[]>(() => Array(data.pool).fill(false))
  const inBasket = picked.filter(Boolean).length
  function tap(i: number) { if (picked[i]) return; const np = picked.slice(); np[i] = true; setPicked(np); speak(String(np.filter(Boolean).length)) }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', maxWidth: 300, minHeight: 48 }}>
        {picked.map((used, i) => used ? null : (
          <button key={i} onClick={() => tap(i)} style={{ ...bare }}><Apple size={46} /></button>
        ))}
      </div>
      <Basket count={inBasket} />
      <button onClick={() => onSubmit(inBasket === data.n)} style={{ padding: '12px 28px', borderRadius: 50, fontSize: 18, color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 900, cursor: 'pointer',
        background: 'linear-gradient(135deg,var(--garden-green),var(--garden-green-deep))', border: 'none', boxShadow: '0 5px 0 var(--garden-green-deep)' }}>Done ✓</button>
    </div>
  )
}
const BasketReteach: React.FC<{ data: BasketData; onDone: () => void }> = ({ data, onDone }) => {
  const [filled, setFilled] = useState(0)
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return; ran.current = true
    const ids: number[] = []
    speak(`We need ${data.n}. Let's count them in.`)
    for (let k = 1; k <= data.n; k++) ids.push(window.setTimeout(() => { setFilled(k); speak(String(k)) }, 600 + k * 700))
    ids.push(window.setTimeout(onDone, 600 + data.n * 700 + 900))
    return () => ids.forEach(clearTimeout)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return <Basket count={filled} />
}
const basketBeat: Beat<BasketData> = {
  skillId: 'matchingQuantities', rounds: 2,
  make: d => { const n = d === 1 ? rint(2, 3) : d === 2 ? rint(3, 5) : rint(5, 7); return { n, pool: n + 2 } },
  prompt: data => `Put ${data.n} apples in the basket!`,
  Play: BasketPlay, Reteach: BasketReteach,
}

// ── Scene 4: MORE / LESS (who has more berries?) ──
interface CompData { a: number; b: number }
function Pile({ n, onClick, picked, big }: { n: number; onClick?: () => void; picked?: boolean; big?: boolean }) {
  const style: React.CSSProperties = { padding: 10, borderRadius: 18, minWidth: 124, minHeight: 120, display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center', justifyContent: 'center',
    background: (picked || big) ? 'rgba(111,190,63,.35)' : 'rgba(255,255,255,.6)', border: `4px solid ${(picked || big) ? 'var(--garden-green)' : 'var(--outline)'}`,
    boxShadow: big ? '0 0 16px 4px rgba(111,190,63,.5)' : 'none', cursor: onClick ? 'pointer' : 'default' }
  const inner = Array.from({ length: n }).map((_, i) => <Berry key={i} />)
  return onClick ? <button onClick={onClick} style={style}>{inner}</button> : <div style={style}>{inner}</div>
}
const ComparePlay: React.FC<{ data: CompData; onSubmit: (c: boolean) => void }> = ({ data, onSubmit }) => {
  const [picked, setPicked] = useState<'a' | 'b' | null>(null)
  function tap(side: 'a' | 'b') { if (picked) return; setPicked(side); const more = data.a >= data.b ? 'a' : 'b'; window.setTimeout(() => onSubmit(side === more), 350) }
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      <Pile n={data.a} onClick={() => tap('a')} picked={picked === 'a'} />
      <span style={{ fontSize: 22, fontWeight: 900, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,.4)' }}>or</span>
      <Pile n={data.b} onClick={() => tap('b')} picked={picked === 'b'} />
    </div>
  )
}
const CompareReteach: React.FC<{ data: CompData; onDone: () => void }> = ({ data, onDone }) => {
  const ran = useRef(false); const more = Math.max(data.a, data.b)
  useEffect(() => { if (ran.current) return; ran.current = true; speak(`This side has ${data.a}, this side has ${data.b}. ${more} is more!`); const id = window.setTimeout(onDone, 2600); return () => clearTimeout(id) }, [data.a, data.b, more, onDone])
  return <div style={{ display: 'flex', gap: 16 }}><Pile n={data.a} big={data.a >= data.b} /><Pile n={data.b} big={data.b > data.a} /></div>
}
const compareBeat: Beat<CompData> = {
  skillId: 'numberComparison', rounds: 2,
  make: d => { const gap = d === 1 ? rint(3, 4) : d === 2 ? 2 : 1; const a = rint(1, 5); let b = Math.random() < 0.5 ? a + gap : a - gap; if (b < 1) b = a + gap; return { a, b } },
  prompt: () => 'Who picked more berries? Tap the bigger pile!',
  Play: ComparePlay, Reteach: CompareReteach,
}

// ── Scene 5: NUMBER ORDER (hop the stones smallest first) ──
interface OrderData { nums: number[] }
const OrderPlay: React.FC<{ data: OrderData; onSubmit: (c: boolean) => void }> = ({ data, onSubmit }) => {
  const sorted = [...data.nums].sort((x, y) => x - y)
  const [stepped, setStepped] = useState<number[]>([])
  const locked = useRef(false)
  function tap(v: number) {
    if (locked.current || stepped.includes(v)) return
    if (v === sorted[stepped.length]) {
      const ns = [...stepped, v]; setStepped(ns); speak(String(v))
      if (ns.length === sorted.length) { locked.current = true; window.setTimeout(() => onSubmit(true), 500) }
    } else { locked.current = true; window.setTimeout(() => onSubmit(false), 300) }
  }
  return (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', alignItems: 'flex-end' }}>
      {data.nums.map(v => {
        const on = stepped.includes(v)
        return <button key={v} onClick={() => tap(v)} style={{ ...bare, transform: on ? 'translateY(-8px)' : 'none', transition: 'transform .2s' }}><Stone n={v} stepped={on} /></button>
      })}
    </div>
  )
}
const OrderReteach: React.FC<{ data: OrderData; onDone: () => void }> = ({ data, onDone }) => {
  const sorted = [...data.nums].sort((x, y) => x - y)
  const [upto, setUpto] = useState(0)
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return; ran.current = true
    const ids: number[] = []
    sorted.forEach((v, k) => ids.push(window.setTimeout(() => { setUpto(k + 1); speak(String(v)) }, (k + 1) * 750)))
    ids.push(window.setTimeout(onDone, sorted.length * 750 + 900))
    return () => ids.forEach(clearTimeout)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', alignItems: 'flex-end' }}>
      {sorted.map((v, k) => <span key={v} style={{ opacity: k < upto ? 1 : 0.4, transform: k < upto ? 'translateY(-6px)' : 'none', transition: 'all .3s' }}><Stone n={v} stepped={k < upto} /></span>)}
    </div>
  )
}
const orderBeat: Beat<OrderData> = {
  skillId: 'numberOrdering', rounds: 1,
  make: d => { const count = d === 1 ? 3 : 4; const start = rint(1, d === 3 ? 6 : 3); return { nums: shuffle(Array.from({ length: count }, (_, i) => start + i)) } },
  prompt: () => 'Hop the stones in order — smallest first!',
  Play: OrderPlay, Reteach: OrderReteach,
}

// ── The world ──
const SKY = 'linear-gradient(180deg,#bfe6f7 0%,var(--bg-page) 60%)'
const DUSK = 'linear-gradient(180deg,#6b5b95 0%,var(--bg-page) 60%)'
const GARDEN = 'linear-gradient(180deg,#a6dd84 0%,var(--bg-page) 60%)'

export const world1: World = {
  id: 'number-forest',
  title: "Milo's Picnic Party",
  scenes: [
    { kind: 'intro', bg: SKY, backdrop: 'meadow', bubble: "Hi! I'm having a PICNIC with all my friends. Will you help me get ready? Let's go!" },
    { kind: 'skill', bg: DUSK, backdrop: 'dusk', bubble: 'Fireflies came to light our way! Let\'s count them.', beat: countBeat },
    { kind: 'skill', bg: SKY, backdrop: 'meadow', bubble: 'My friends live here! Knock on the right door to invite them.', friend: { emoji: '🐰', name: 'Bunny' }, beat: doorBeat },
    { kind: 'skill', bg: GARDEN, backdrop: 'orchard', bubble: 'We need apples for the pie. Put the right number in the basket!', friend: { emoji: '🐻', name: 'Bear' }, beat: basketBeat },
    { kind: 'skill', bg: GARDEN, backdrop: 'meadow', bubble: 'My friends picked berries. Who picked more?', friend: { emoji: '🐿️', name: 'Squirrel' }, beat: compareBeat },
    { kind: 'skill', bg: SKY, backdrop: 'stream', bubble: 'A stream! Hop across the stones in the right order.', friend: { emoji: '🐦', name: 'Bird' }, beat: orderBeat },
    { kind: 'payoff', bg: GARDEN, backdrop: 'meadow', bubble: 'We did it! Look at all my friends. Best picnic ever — thank you for helping me!' },
  ],
}
