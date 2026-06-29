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
import { BIOMES, BIOME_ORDER, type Band, type Biome, type BiomeId } from './biomes'

const rint = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))
const shuffle = <T,>(a: T[]) => a.slice().sort(() => Math.random() - 0.5)
const bare: React.CSSProperties = { background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }

// Creatures are sized in px against a ~1000px-wide stage. On a tiny window they'd be
// too big; on a wide desktop, fixed px would look small. So we grow them with the
// viewport — but GENTLY (sub-linear): full proportional scaling made them look
// oversized and crowded on a real ~1900px browser. This keeps them a "medium" size at
// any width (≈ preview size at 1000px, only modestly bigger on a wide screen).
const DESIGN_W = 1000
function useScale() {
  const [s, setS] = useState(1)
  useEffect(() => {
    const calc = () => {
      const raw = window.innerWidth / DESIGN_W
      const damped = raw <= 1 ? raw : 1 + (raw - 1) * 0.4   // only 40% of the extra width
      setS(Math.max(0.85, Math.min(1.45, damped)))
    }
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [])
  return s
}

// ── Scene 1: COUNTING (tap each object; counts aloud; success-only) ──
interface CountData { n: number; obj: CountKind; band?: Band }
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

// ── In-scene counting: objects HIDE in the forest, the child hunts & counts ──
// Fireflies/butterflies are tucked into the leafy FOLIAGE BAND of the
// frozen forest (the tree-tops), not the sky or the grass path, so the child has
// to find each one and tap it. Positions are stable per round and kept clear of
// the top bar, Milo (far left), and the edges.
const frac = (x: number) => x - Math.floor(x)
const seed = (i: number, s: number) => frac(Math.sin((i + 1) * s) * 43758.5453)
// Lay objects out so they look SCATTERED across the tree — perched at many
// different heights and tilted, not parked in tidy rows. We still seat each one
// in its own grid cell (so they never pile up and each stays tappable), but then:
//   • shove it hard in Y (±0.5 cell) → every object sits at its own "branch" height
//   • stagger alternate rows sideways → columns don't line up
//   • tilt it a little → it reads as resting on a branch, not floating upright
// The window (X0..X1, Y0..Y1) is the tree-canopy band: left clears Milo, bottom
// stays above the trunks/grass so objects read as "in the leaves".
type Spot = { left: number; top: number; size: number; dur: number; rot: number; delay: number; depth: number }
// `band` is the per-biome spawn window (water low, sky high, leaves mid). Defaults
// to the forest canopy so non-biome callers keep working.
function scatter(n: number, band: Band = BIOMES.forest.band, demo = false): Spot[] {
  // Favour WIDE layouts (landscape) and keep objects mostly in their grid cells so they
  // don't bunch up and overlap — overlapping objects made the right one hard to tap.
  const cols = Math.min(6, Math.max(1, Math.round(Math.sqrt(n) * 1.7)))
  const rows = Math.ceil(n / cols)
  const { x0: X0, x1: X1, y0: Y0, y1: Y1 } = band       // this biome's spawn window
  const cw = (X1 - X0) / cols, ch = (Y1 - Y0) / rows
  const base = demo ? 68 : 78                           // a touch smaller → more gaps, easier taps
  const rng = demo ? 20 : 24
  return Array.from({ length: n }, (_, i) => {
    const r = Math.floor(i / cols), c = i % cols
    const stagger = (r % 2 ? 0.14 : -0.14) * cw          // small odd/even shift so columns don't line up dead-straight
    const jx = (seed(i, 12.9898) - 0.5) * cw * 0.26 + stagger   // gentle jitter — stays well inside the cell
    const jy = (seed(i, 78.233) - 0.5) * ch * 0.45       // gentle vertical jitter (no cross-row bleed)
    const top = Math.max(Y0, Math.min(Y1, Y0 + ch * (r + 0.5) + jy))   // %
    // DEPTH (0 = near/front/low, 1 = far/back/high) read from where the object sits in
    // its band: the lower it is in the frame the NEARER it reads, so it's a touch bigger,
    // sits in front, and casts a darker contact shadow — same grounding cue RainbowTown
    // hand-tunes per object, here derived from each creature's own scattered height. (A
    // 1-row band collapses to a constant 0.5, leaving size/shadow unchanged.)
    const depth = Y1 > Y0 ? Math.max(0, Math.min(1, (Y1 - top) / (Y1 - Y0))) : 0.5
    return {
      left: Math.max(X0, Math.min(X1, X0 + cw * (c + 0.5) + jx)),   // %
      top,
      // farther/higher objects are a touch smaller (depth falloff) — adds aerial depth
      size: (base + Math.round(seed(i, 3.17) * rng)) * (1 - depth * 0.22),
      dur: 3.4 + seed(i, 5.71) * 2.4,                    // s — gentle flutter
      rot: Math.round((seed(i, 5.11) - 0.5) * 24),       // ±12° perched tilt
      delay: +(seed(i, 9.73) * 2).toFixed(2),            // s — desync the flutter
      depth,
    }
  })
}

// One hidden object, perched: an outer flutter (gentle in-place bob, desynced per
// item) wrapping a static tilt, so objects look like they're resting on branches
// rather than drifting in formation. The pop+glow on "found" lives in CountItem.
// Some creatures read too small / camouflaged at the base size (their source art has
// more empty padding around the subject), so scale them up wherever they appear
// (demo + guided + practice all flow through here). Art is untouched — just display size.
const SIZE_BOOST: Partial<Record<CountKind, number>> = { firefly: 2.6, eagle: 1.9, fish: 2.6, shark: 2.4, turtle: 1.8, crab: 1.7, ant: 1.75, squirrel: 1.5, rabbit: 1.6, ladybug: 1.6 }
// `num` (when given) shows the count number on the object once it's counted — used by
// the explanation so the child sees 1, 2, 3… land on each one. Until an object is
// counted (`on`) it BLINKS to invite a tap; tapping stops the blink. No more ✓ badge.
const PerchedItem: React.FC<{ p: Spot; obj: CountKind; on: boolean; idx: number; num?: number }> = ({ p, obj, on, idx, num }) => {
  const scale = useScale()
  const size = Math.round(p.size * (SIZE_BOOST[obj] ?? 1) * scale)
  const badge = Math.round(34 * scale)   // keep the count number proportional to the creature
  // GROUNDING CUE: a soft contact shadow cast on the ground/canopy directly BELOW each
  // creature — the "it belongs in the world, not pasted on" anchor RainbowTown adds. Unlike
  // RainbowTown's single shared ground LINE, these creatures live at many heights and most
  // fly/swim, so the shadow falls a short, depth-scaled distance under EACH one (a cast
  // shadow per object) rather than on one floor — that keeps the deliberate scattered
  // hover/perch/swim composition intact. Nearer (low, depth→0) → bigger + darker + closer;
  // farther (high, depth→1) → smaller + fainter + dropped further below.
  const shW = size * (0.62 - p.depth * 0.16)
  const shOp = Math.max(0.05, (0.24 - p.depth * 0.12) * (on ? 0.5 : 1))
  const shGap = size * (0.46 + p.depth * 0.5)   // how far below the object the shadow falls
  return (
    <span style={{ display: 'block', position: 'relative',
      animation: on ? 'fw_tap .45s cubic-bezier(.36,.07,.19,.97) both' : 'fw_blink .9s ease-in-out infinite' }}>
      {/* Soft contact shadow beneath this creature (drawn first so it sits under the art). */}
      <span aria-hidden style={{ position: 'absolute', top: `calc(50% + ${shGap}px)`, left: '50%', transform: 'translate(-50%,-50%)',
        width: shW, height: shW * 0.34, zIndex: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse at center, rgba(38,28,18,${shOp}) 0%, rgba(38,28,18,0) 72%)` }} />
      <span style={{ display: 'block', position: 'relative', zIndex: 1, transform: `rotate(${p.rot}deg)` }}>
        <CountItem kind={obj} on={on} size={size} variant={idx} blend />
      </span>
      {on && num != null && (
        // Centred ON the object (outer span centres; inner pops) so the number clearly
        // belongs to that object — not floating off in a far corner.
        <span aria-hidden style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 2, pointerEvents: 'none' }}>
          <span style={{ display: 'flex', minWidth: badge, height: badge, padding: `0 ${Math.round(7 * scale)}px`, alignItems: 'center', justifyContent: 'center',
            background: 'var(--paper)', border: '3px solid var(--milo-orange)', borderRadius: 999,
            fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: Math.round(20 * scale), color: 'var(--milo-orange)', lineHeight: 1,
            boxShadow: '0 2px 5px rgba(0,0,0,.3)', animation: 'fw_check .35s cubic-bezier(.36,.07,.19,.97) both' }}>{num}</span>
        </span>
      )}
    </span>
  )
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
  const spots = useMemo(() => scatter(data.n, data.band), [data.n, data.band])  // so fast taps can't skip the count
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
        // nearer (low/depth→0) creatures sit in FRONT of farther ones (depth-aware z-order)
        <button key={i} onClick={() => tap(i)} aria-label={data.obj} disabled={speaking}
          style={{ ...bare, position: 'fixed', left: `${p.left}%`, top: `${p.top}%`, zIndex: 30 + Math.round((1 - p.depth) * 6) }}>
          <PerchedItem p={p} obj={data.obj} on={lit[i]} idx={i} />
        </button>
      ))}
      {/* running count, pinned at the bottom so it never hides an object */}
      <CountBadge value={count} />
    </>
  )
}
const CATCH_INTRO: Partial<Record<CountKind, string>> = {
  firefly: 'Fireflies are out!', butterfly: 'Look, butterflies!', eagle: 'Eagles in the trees!',
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
export const FlyingCountDemo: React.FC<{ to: number; obj: CountKind; band?: Band; onDone: () => void }> = ({ to, obj, band, onDone }) => {
  const [shown, setShown] = useState(0)
  const ran = useRef(false)
  const spots = useMemo(() => scatter(to, band, true), [to, band])
  useEffect(() => {
    if (ran.current) return; ran.current = true
    // Reveal one object per number on a fixed TIMER — NOT on speech events. The
    // very first slide plays before the child has tapped, so the browser blocks
    // Milo's voice and speech `onstart`/`onWord` never fire; a speech-gated demo
    // would show no fireflies at all and skip straight to the next beat. Driving
    // the reveal off setTimeout makes the counting concept always play and the
    // fireflies always appear (scattered in the tree). We still speak each number,
    // best effort — the visuals never wait on it.
    const ids: number[] = []
    const step = 780
    speak("Let's count together!")
    for (let k = 1; k <= to; k++) {
      ids.push(window.setTimeout(() => { setShown(k); speak(String(k)) }, 600 + k * step))
    }
    ids.push(window.setTimeout(onDone, 600 + to * step + 1300))
    return () => ids.forEach(clearTimeout)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <>
      {spots.map((p, i) => i < shown && (
        <span key={i} style={{ position: 'fixed', left: `${p.left}%`, top: `${p.top}%`, zIndex: 30 + Math.round((1 - p.depth) * 6) }}>
          <PerchedItem p={p} obj={obj} on idx={i} num={i + 1} />
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
interface HowManyData { n: number; obj: CountKind; choices: number[]; band?: Band; biomeId?: BiomeId }
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
  const spots = useMemo(() => scatter(data.n, data.band), [data.n, data.band])
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
          style={{ ...bare, position: 'fixed', left: `${p.left}%`, top: `${p.top}%`, zIndex: 30 + Math.round((1 - p.depth) * 6) }}>
          <PerchedItem p={p} obj={data.obj} on={tapped[i]} idx={i} />
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
  <FlyingCountDemo to={data.n} obj={data.obj} band={data.band} onDone={onDone} />

// Quantity for a round, by adaptive difficulty: easy 1–4, medium 3–7, hard 5–10.
function quantityFor(d: 1 | 2 | 3): number {
  return d === 1 ? rint(1, 4) : d === 2 ? rint(3, 7) : rint(5, 10)
}
// Big creatures look better (and stay tappable) in small numbers — cap how many ever
// appear at once. Eagles perch on the trees, so only a few; sharks are large too.
const MAX_N: Partial<Record<CountKind, number>> = { eagle: 4, shark: 5 }
// Per-creature spawn band overrides so each animal appears where it naturally lives.
// Y0 = top of window, Y1 = bottom (viewport %). X0 clears Milo on the left.
function bandFor(biome: Biome, obj: CountKind): Band {
  const b = biome.band
  switch (obj) {
    // FOREST
    case 'butterfly': return { ...b, y0: 8,  y1: 50 }   // flutter high in the canopy
    case 'firefly':   return { ...b, x0: 13, x1: 72, y0: 28, y1: 66 }   // hover near mid-forest / undergrowth
    case 'rabbit':    return { ...b, x0: 18, x1: 82, y0: 60, y1: 82 }   // hop along the forest floor
    case 'eagle':     return { ...b, x0: 16, x1: 78, y0: 10, y1: 40 }   // perched up in the treetops (few of them)
    // UNDERWATER
    case 'fish':      return { ...b, x0: 12, x1: 72, y0: 14, y1: 62 }   // swim freely through the water column
    case 'turtle':    return { ...b, x0: 12, x1: 80, y0: 42, y1: 76 }   // spread across the mid-lower water
    case 'shark':     return { ...b, x0: 12, x1: 72, y0: 18, y1: 60 }   // cruise the open water column
    case 'crab':      return { ...b, x0: 12, x1: 82, y0: 62, y1: 84 }   // scatter across the seabed
    // GARDEN — on the open grass, away from the edge flower beds / bushes
    case 'squirrel':  return { ...b, x0: 16, x1: 50, y0: 50, y1: 74 }   // by the cart/rock on the left
    case 'ant':       return { ...b, x0: 30, x1: 74, y0: 58, y1: 80 }   // march on the open green grass
    case 'ladybug':   return { ...b, x0: 24, x1: 80, y0: 54, y1: 80 }   // dot the grass / low flowers
    default:          return b
  }
}
function howManyData(biome: Biome, obj: CountKind, d: 1 | 2 | 3): HowManyData {
  const n = Math.min(quantityFor(d), MAX_N[obj] ?? 10)
  const set = new Set<number>([n])
  while (set.size < 3) { const c = Math.min(10, Math.max(1, n + rint(-2, 2))); if (c !== n) set.add(c) }
  return { n, obj, band: bandFor(biome, obj), choices: shuffle([...set]), biomeId: biome.id }
}

// THE scored practice — ONE continuous 10-round adaptive sequence. The pedagogy is
// unbroken across all 10 rounds:
//   • difficulty ramps UP on a correct streak and DOWN when struggling (adaptive),
//   • a walk interlude plays every 3 rounds so Milo stays animated,
//   • after 3 wrong IN A ROW Milo re-explains by counting that exact quantity out.
// Background cross-fades smoothly via BiomeBackground's 1s opacity transition.
type PlanCell = { biome: Biome; obj: CountKind }
// Objects used by the opening explanation (count demo) + guided slide — kept OUT of
// the practice so a single session NEVER repeats a creature. (countingChapter's count
// beat = firefly, guide = butterfly.) Every other biome creature appears exactly once.
const EXPLAIN_OBJS = new Set<CountKind>(['firefly', 'butterfly'])
let _plan: PlanCell[] = []
// Every non-explanation biome creature, in biome order — the full practice pool.
function practicePool(): PlanCell[] {
  const pool: PlanCell[] = []
  for (const id of BIOME_ORDER) {
    for (const obj of BIOMES[id].objects) {
      if (!EXPLAIN_OBJS.has(obj)) pool.push({ biome: BIOMES[id], obj })
    }
  }
  return pool
}
// The practice runs exactly ONE round per pool creature, so a correctly-answered
// question never comes back — no creature repeats in a session. (If the roster
// grows/shrinks, the round count follows it automatically.)
const PRACTICE_ROUNDS = practicePool().length
// Build the plan: every pool creature used ONCE, shuffled, then nudged so the same
// biome never runs two rounds in a row.
function buildPlan(): PlanCell[] {
  let pool = practicePool()
  pool = shuffle(pool)
  for (let i = 1; i < pool.length; i++) {
    if (pool[i].biome.id === pool[i - 1].biome.id) {
      const j = pool.findIndex((c, k) => k > i && c.biome.id !== pool[i - 1].biome.id)
      if (j > -1) { const t = pool[i]; pool[i] = pool[j]; pool[j] = t }
    }
  }
  return pool
}
export const practiceCountBeat: Beat<HowManyData> = {
  skillId: 'counting', rounds: PRACTICE_ROUNDS, reteachAfter: 3,
  walkEvery: 3,
  make: (d, round = 0) => {
    if (round === 0) _plan = buildPlan()
    const cell = _plan[round] ?? _plan[_plan.length - 1] ?? { biome: BIOMES.forest, obj: 'butterfly' as CountKind }
    return howManyData(cell.biome, cell.obj, d)
  },
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
