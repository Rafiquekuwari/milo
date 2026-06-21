'use client'
/**
 * Chapter 3 — "Milo's Kitchen", the number-COMPARISON story (skill
 * `numberComparison`). Milo is a tiny chef cooking a yummy feast; at each station he
 * picks the bigger / more one. Told through FOUR stations that rotate across the 10
 * adaptive rounds (one continuous SkillBeat — harder on a streak, easier when
 * struggling, re-teach after 3 wrong):
 *   🍎 Fruit Bowls  — tap the bowl with MORE fruit    (count discrete)
 *   🍪 Cookie Trays — tap the tray with MORE cookies  (count discrete)
 *   🎂 Cake Towers  — tap the BIGGER cake             (compare height)
 *   🍬 Candy Jars   — tap the FULLER jar              (compare fill level)
 *
 * Comparison is a single binary tap, so to keep it from feeling repetitive the rounds
 * vary on FIVE axes, all mapped onto difficulty so variation = progression:
 *   station · reasoning (count→height→fill→symbolic numerals) · polarity (more/fewer)
 *   · choice count (2→3 "the most") · per-station payoff.
 *
 * Built with code-drawn vessels + emoji (named PNG paths auto-upgrade via onError),
 * so it's fully playable with no new art. Mirrors story/RiverCrossing.tsx; does NOT
 * use ForestWalk. Wrapped by game/NumberComparisonChapter.tsx.
 */
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { speak, useIsSpeaking, stopSpeech } from '@/lib/useMiloSpeaker'
import { SkillBeat, type Beat } from './StoryWorld'

// After a correct/declaring tap, ignore further taps briefly. `useIsSpeaking()` only
// flips true ~100-150ms after speak() (Chrome cancel→speak gap + onstart latency), so
// a fast second tap would slip through that window. Same lesson as RiverCrossing.
const SPEAK_LOCK_MS = 600
const rint = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))

// ─── Stations ────────────────────────────────────────────────────────────────────
type Station = 'fruit' | 'cookies' | 'cake' | 'jars'
type Compare = 'more' | 'less'
interface CompareData {
  station: Station
  vals: number[]        // 2 or 3 quantities, in random order
  answerIdx: number     // index of the correct vessel (max for "more", min for "less")
  mode: Compare
  symbolic: boolean     // show a numeral only (no countable items) — the abstract tier
}

// Rotate the station EVERY round (fruit→cookies→cake→jars→fruit→…) so the theme
// changes each question and never repeats back-to-back — same idea as Chapter 1's
// biome cycling. (STATION_ORDER is defined just below, for the Background.)
function stationForRound(round: number): Station {
  return STATION_ORDER[round % STATION_ORDER.length]
}

const STATION_NOUN: Record<Station, string> = { fruit: 'fruit', cookies: 'cookies', cake: 'layers', jars: 'candies' }
const STATION_VESSEL: Record<Station, string> = { fruit: 'bowl', cookies: 'tray', cake: 'cake', jars: 'jar' }
const STATION_FOOD: Record<Station, string> = { fruit: '🍎', cookies: '🍪', cake: '🧁', jars: '🍬' }

// Painted-scene hooks: a code-drawn gradient is always shown; an optional <img> fades
// in on top if the art exists (auto-upgrade), and hides itself on error.
const STATION_BG: Record<Station, { grad: string; img: string }> = {
  fruit:    { grad: 'radial-gradient(ellipse at 50% 26%, #eaf7d6 0%, #cfe9a8 55%, #a9d178 100%)', img: '/assets/backgrounds/kitchen_fruit.jpeg' },
  cookies:  { grad: 'radial-gradient(ellipse at 50% 24%, #ffe2b0 0%, #f5b96b 55%, #e89b46 100%)', img: '/assets/backgrounds/kitchen_oven.jpeg' },
  cake:     { grad: 'radial-gradient(ellipse at 50% 22%, #fff3f7 0%, #ffe0ec 55%, #ffd0e2 100%)', img: '/assets/backgrounds/kitchen_bakery.jpeg' },
  jars:     { grad: 'radial-gradient(ellipse at 50% 24%, #fdeaf6 0%, #f6cde8 55%, #e9b3d8 100%)', img: '/assets/backgrounds/kitchen_pantry.jpeg' },
}
const STATION_ORDER: Station[] = ['fruit', 'cookies', 'cake', 'jars']

function Background({ station }: { station: Station }) {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#f3ead8' }}>
      {STATION_ORDER.map(s => (
        <div key={s} style={{ position: 'absolute', inset: 0, opacity: s === station ? 1 : 0, transition: 'opacity .6s ease' }}>
          <div style={{ position: 'absolute', inset: 0, background: STATION_BG[s].grad }} />
          <img src={STATION_BG[s].img} alt="" draggable={false}
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      ))}
    </div>
  )
}

// ─── Milo the chef (one persistent presence, bottom-left) ──────────────────────────
function MiloChef({ left, top }: { left: number; top: number }) {
  const [step, setStep] = useState(0)
  const srcs = ['/assets/characters/milo_chef.png', '/assets/characters/milo_idle.png']
  return (
    <div style={{ position: 'fixed', left: `${left}%`, top: `${top}%`, transform: 'translate(-50%,-50%)', zIndex: 26, width: 'min(26vh, 220px)', height: 'min(26vh, 220px)', animation: 'mk_float 3.4s ease-in-out infinite' }}>
      {step >= srcs.length
        ? <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <span style={{ fontSize: 86, filter: 'drop-shadow(0 5px 8px rgba(0,0,0,.35))' }}>🦊</span>
            <span style={{ position: 'absolute', top: 2, fontSize: 40 }}>👨‍🍳</span>
          </div>
        : <img src={srcs[step]} alt="Milo the chef" draggable={false} onError={() => setStep(s => s + 1)}
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
// A painted item sprite (apple/cookie); falls back to a simple coloured circle if the
// PNG is missing. Wrapped so it pops in (mk_appear) as it's revealed during counting.
function ItemImg({ src, size, fallbackBg }: { src: string; size: number; fallbackBg: string }) {
  const [missing, setMissing] = useState(false)
  return (
    <span style={{ display: 'inline-block', animation: 'mk_appear .35s ease both' }}>
      {missing
        ? <span style={{ display: 'block', width: size, height: size, borderRadius: '50%', background: fallbackBg, border: '2px solid rgba(0,0,0,.18)' }} />
        : <img src={src} alt="" draggable={false} onError={() => setMissing(true)} style={{ display: 'block', width: size, height: size, objectFit: 'contain' }} />}
    </span>
  )
}

// Each art takes `shown` — how many items to reveal (defaults to all). The counted
// explanation reveals items one at a time (1,2,3…); practice just shows `val`.
// Painted-vessel first (fruitbowl.png + apple.png); falls back to the code-drawn bowl.
function FruitBowlArt({ val, shown, symbolic }: { val: number; shown?: number; symbolic: boolean }) {
  const [imgOk, setImgOk] = useState(true)
  const k = Math.min(val, shown ?? val)
  if (!imgOk) return <FruitBowlDrawn val={val} shown={shown} symbolic={symbolic} />
  // Keep apples BIG regardless of count (only shrink a little when there are lots so
  // they still fit), and pile them ON TOP of the bowl rim — fully visible, not tucked
  // inside the bowl.
  // Apples always sit in ONE row across the bowl's opening: big for the usual small
  // counts (capped at 66), shrinking only enough to keep the whole row inside the bowl
  // so they never spill into a tall floating second row.
  const sz = Math.min(66, Math.floor(168 / k))
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <img src="/assets/objects/fruitbowl.png" alt="bowl" draggable={false} onError={() => setImgOk(false)}
        style={{ position: 'absolute', left: 0, bottom: 0, width: '100%', height: '94%', objectFit: 'contain', objectPosition: 'bottom' }} />
      {/* apples (or numeral) in one centred row in the bowl's opening — fully visible,
          sitting in the bowl (drawn on top of it) */}
      <div style={{ position: 'absolute', left: '3%', right: '3%', top: '26%', height: '34%', display: 'flex', flexWrap: 'nowrap', gap: 2, alignContent: 'center', alignItems: 'center', justifyContent: 'center' }}>
        {symbolic ? <Numeral val={val} color="#b3402e" />
          : Array.from({ length: k }).map((_, i) => <ItemImg key={i} src="/assets/objects/apple.png" size={sz} fallbackBg="var(--apple-red)" />)}
      </div>
    </div>
  )
}
function FruitBowlDrawn({ val, shown, symbolic }: { val: number; shown?: number; symbolic: boolean }) {
  const k = Math.min(val, shown ?? val)
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
      <div style={{ height: '52%', width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 2 }}>
        {symbolic ? <Numeral val={val} color="#b3402e" />
          : <ItemCluster>{Array.from({ length: k }).map((_, i) => (
              <span key={i} style={{ position: 'relative', display: 'inline-block', animation: 'mk_appear .35s ease both' }}>
                <span style={{ position: 'absolute', top: -3, left: '50%', width: 7, height: 6, background: 'var(--garden-green)', borderRadius: '0 80% 0 80%', transform: 'translateX(-1px) rotate(8deg)', zIndex: 1 }} />
                <span style={{ display: 'block', width: 24, height: 24, borderRadius: '50%', background: 'radial-gradient(circle at 34% 28%, #ff8b72, var(--apple-red))', border: '2px solid #9e2f1e', boxShadow: 'inset -2px -3px 4px rgba(0,0,0,.2)' }} />
              </span>
            ))}</ItemCluster>}
      </div>
      <div style={{ position: 'relative', width: '92%', height: '42%' }}>
        <div style={{ position: 'absolute', top: '-6%', left: '3%', right: '3%', height: '34%', borderRadius: '50%', background: 'linear-gradient(#e6c79a, #cda873)', border: '3px solid #9c7034', zIndex: 2 }} />
        <div style={{ position: 'absolute', inset: 0, top: '10%', background: 'linear-gradient(#c89a5f, #9c7034)', borderRadius: '8% 8% 48% 48% / 8% 8% 80% 80%', border: '4px solid #7c5526', boxShadow: 'inset 0 -8px 16px rgba(0,0,0,.35)' }} />
      </div>
    </div>
  )
}

// Painted tray (bakingTray.png + cookie.png); falls back to the code-drawn tray.
function CookieTrayArt({ val, shown, symbolic }: { val: number; shown?: number; symbolic: boolean }) {
  const [imgOk, setImgOk] = useState(true)
  const k = Math.min(val, shown ?? val)
  if (!imgOk) return <CookieTrayDrawn val={val} shown={shown} symbolic={symbolic} />
  const sz = k <= 3 ? 30 : k <= 6 ? 25 : 21
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <img src="/assets/objects/bakingTray.png" alt="tray" draggable={false} onError={() => setImgOk(false)}
        style={{ position: 'absolute', left: 0, bottom: '4%', width: '100%', height: '74%', objectFit: 'contain' }} />
      {/* cookies on the tray surface */}
      <div style={{ position: 'absolute', left: '13%', right: '13%', top: '32%', height: '34%', display: 'flex', flexWrap: 'wrap', gap: 3, alignContent: 'center', justifyContent: 'center' }}>
        {symbolic ? <Numeral val={val} color="#7a4a1c" />
          : Array.from({ length: k }).map((_, i) => <ItemImg key={i} src="/assets/objects/cookie.png" size={sz} fallbackBg="#b5772f" />)}
      </div>
    </div>
  )
}
function CookieTrayDrawn({ val, shown, symbolic }: { val: number; shown?: number; symbolic: boolean }) {
  const k = Math.min(val, shown ?? val)
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '96%', height: '64%', background: 'linear-gradient(#ecc79a, #c89a5f)', borderRadius: 16, border: '4px solid #9a7536', boxShadow: 'inset 0 3px 8px rgba(255,255,255,.4), 0 5px 8px rgba(0,0,0,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8 }}>
        {symbolic ? <Numeral val={val} color="#7a4a1c" />
          : <ItemCluster>{Array.from({ length: k }).map((_, i) => (
              <span key={i} style={{ position: 'relative', width: 26, height: 26, borderRadius: '50%', background: 'radial-gradient(circle at 36% 30%, #d79b54, #a9702f)', border: '2px solid #7c4f20', display: 'inline-block', animation: 'mk_appear .35s ease both' }}>
                <span style={{ position: 'absolute', top: 5, left: 6, width: 4, height: 4, borderRadius: '50%', background: '#43260f' }} />
                <span style={{ position: 'absolute', top: 13, left: 14, width: 4, height: 4, borderRadius: '50%', background: '#43260f' }} />
                <span style={{ position: 'absolute', top: 15, left: 5, width: 3, height: 3, borderRadius: '50%', background: '#43260f' }} />
              </span>
            ))}</ItemCluster>}
      </div>
    </div>
  )
}

const CAKE_LAYERS = ['var(--apple-red-soft)', 'var(--sun-yellow-soft)', 'var(--garden-green-soft)', '#ffd6ea', 'var(--sky-blue-soft)', '#e6d6ff']
// Painted cherry topper, emoji fallback.
function Cherry() {
  const [m, setM] = useState(false)
  if (m) return <span style={{ fontSize: 24, marginBottom: -6, zIndex: 3, animation: 'mk_appear .35s ease both' }}>🍒</span>
  return <img src="/assets/objects/cherry.png" alt="" draggable={false} onError={() => setM(true)} style={{ width: 32, height: 32, objectFit: 'contain', marginBottom: -10, zIndex: 3, filter: 'drop-shadow(0 2px 2px rgba(0,0,0,.25))', animation: 'mk_appear .35s ease both' }} />
}
// Painted cake: stack ONE layer sprite N times (height = count) + cherry on top. The
// sprite's cake band is ~vertically centred, so each div crops to that band
// (backgroundPosition center) and stacked copies sit flush. Falls back to the drawn cake.
const CAKE_LAYER_SRC = '/assets/objects/cakeLayer1.png'
function CakeArt({ val, shown }: { val: number; shown?: number }) {
  const [imgOk, setImgOk] = useState(true)
  const k = Math.min(val, shown ?? val)
  if (!imgOk) return <CakeDrawn val={val} shown={shown} />
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center' }}>
      {/* detector: background-image divs don't fire onError, so a hidden <img> does */}
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
        const fromTop = k - 1 - i              // 0 = bottom layer
        const w = 56 + fromTop * 5             // wider toward the bottom
        return <div key={i} style={{ width: `${Math.min(86, w)}%`, height: 17, background: CAKE_LAYERS[fromTop % CAKE_LAYERS.length], border: '2px solid rgba(122,74,28,.5)', borderRadius: 5, boxShadow: 'inset 0 2px 2px rgba(255,255,255,.5)', animation: 'mk_appear .35s ease both' }} />
      })}
      <div style={{ width: '92%', height: 8, background: '#cdbfae', borderRadius: '0 0 8px 8px', marginTop: 1 }} />
    </div>
  )
}

// Clean code-drawn glass jar + painted candy.png candies filling from the bottom.
// (We DRAW the jar instead of using objects/emptyjar.png — that PNG has a baked-in
// transparency checkerboard, no real alpha. Re-export it transparent to switch back.)
function JarArt({ val, shown }: { val: number; shown?: number }) {
  const k = Math.min(val, shown ?? val)
  const pct = k > 0 ? Math.round((k / 9) * 80) + 14 : 0
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: '74%', height: '86%' }}>
        {/* lid */}
        <div style={{ position: 'absolute', top: -16, left: '40%', right: '40%', height: 9, background: '#c19be0', borderRadius: 6, border: '2px solid #a878c9', zIndex: 3 }} />
        <div style={{ position: 'absolute', top: -10, left: '15%', right: '15%', height: 18, background: 'linear-gradient(#dcbcf0,#c19be0)', borderRadius: 7, border: '2px solid #a878c9', zIndex: 3 }} />
        {/* glass body */}
        <div style={{ position: 'absolute', inset: 0, top: 8, borderRadius: '14% 14% 28% 28%', border: '5px solid rgba(255,255,255,.8)', background: 'linear-gradient(105deg, rgba(255,255,255,.32) 0%, rgba(255,255,255,.12) 42%, rgba(255,255,255,.30) 100%)', overflow: 'hidden', boxShadow: 'inset 0 0 18px rgba(255,255,255,.5)' }}>
          {/* candies fill from the bottom */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${pct}%`, display: 'flex', flexWrap: 'wrap', gap: 2, alignContent: 'flex-end', justifyContent: 'center', padding: 5, transition: 'height .4s ease' }}>
            {Array.from({ length: k }).map((_, i) => (
              <ItemImg key={i} src="/assets/objects/candy.png" size={22} fallbackBg={CANDY_COLORS[i % CANDY_COLORS.length]} />
            ))}
          </div>
          {/* glass shine */}
          <div style={{ position: 'absolute', top: '6%', left: '11%', width: '13%', height: '64%', borderRadius: '50%', background: 'rgba(255,255,255,.5)', filter: 'blur(2px)', pointerEvents: 'none' }} />
        </div>
      </div>
    </div>
  )
}

function VesselArt({ station, val, symbolic, shown }: { station: Station; val: number; symbolic: boolean; shown?: number }) {
  if (station === 'fruit') return <FruitBowlArt val={val} shown={shown} symbolic={symbolic} />
  if (station === 'cookies') return <CookieTrayArt val={val} shown={shown} symbolic={symbolic} />
  if (station === 'cake') return <CakeArt val={val} shown={shown} />
  return <JarArt val={val} shown={shown} />
}

// One tappable vessel: positioned wrapper (no keyframe transform so centering holds);
// the inner div carries the float/pop/shake animation + glow. `countBadge` shows a
// running-count pill under the vessel during the counted explanation.
// The vessel art is designed at 188×210; `scale` blows the whole thing up uniformly
// (vessel + items + numbers) so everything grows together. Button = scaled size.
const DES_W = 188, DES_H = 210
function Vessel({ station, val, symbolic, shown, left, top, glow, wrong, onTap, aria, scale = 1.6 }: {
  station: Station; val: number; symbolic: boolean; shown?: number; left: number; top: number
  glow: boolean; wrong: boolean; onTap?: () => void; aria: string; scale?: number
}) {
  const W = DES_W * scale, H = DES_H * scale
  return (
    <button onClick={onTap} disabled={!onTap} aria-label={aria}
      style={{ position: 'fixed', left: `${left}%`, top: `${top}%`, transform: 'translate(-50%,-50%)', zIndex: 30, width: W, height: H, padding: 0, border: 'none', background: 'transparent', cursor: onTap ? 'pointer' : 'default' }}>
      <div style={{ width: '100%', height: '100%', position: 'relative',
        animation: wrong ? 'mk_shake .42s ease' : glow ? 'mk_pop .45s ease' : 'mk_float 3.6s ease-in-out infinite',
        filter: glow ? 'drop-shadow(0 0 22px var(--garden-green))' : 'drop-shadow(0 10px 12px rgba(0,0,0,.32))',
        transition: 'filter .3s' }}>
        {/* design box scaled up so all the px-based art grows uniformly */}
        <div style={{ position: 'absolute', left: '50%', top: '50%', width: DES_W, height: DES_H, transform: `translate(-50%,-50%) scale(${scale})`, transformOrigin: 'center' }}>
          <VesselArt station={station} val={val} symbolic={symbolic} shown={shown} />
        </div>
      </div>
      {glow && (
        <span style={{ position: 'absolute', top: 6 * scale, right: 10 * scale, width: 30 * scale, height: 30 * scale, borderRadius: '50%', background: 'var(--garden-green)', border: '3px solid #fff', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 * scale, fontWeight: 900, boxShadow: '0 3px 6px rgba(0,0,0,.3)', animation: 'mk_pop .4s ease' }}>✓</span>
      )}
    </button>
  )
}

// The big count number that pops over each group as Milo counts it (used by the
// explanation). Rendered separately from the vessel (zIndex above the banner) so it's
// always visible, sitting just over each vessel's upper area. `cx` = the vessel's
// horizontal centre %, `topPct` the vessel's centre %.
function CountNumber({ value, cx, topPct, scale }: { value: number; cx: number; topPct: number; scale: number }) {
  return (
    <div style={{ position: 'fixed', left: `${cx}%`, top: `calc(${topPct}% - ${76 * scale}px)`, transform: 'translate(-50%,-50%)', zIndex: 47, pointerEvents: 'none' }}>
      <span key={value} style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 58 * scale, lineHeight: 1, color: '#fff', WebkitTextStroke: `${3.5 * scale}px var(--milo-orange)`, textShadow: '0 5px 16px rgba(0,0,0,.5)', animation: 'mk_countpop .42s cubic-bezier(.34,1.56,.64,1)' }}>{value}</span>
    </div>
  )
}

// How big to draw the vessels — as large as fits given the count (2 are spread wider
// than 3) and the viewport (capped so they never overlap or overflow). Re-measures on
// resize. The art is designed at 188px wide; this returns the scale multiplier.
function useVesselScale(n: number): number {
  const [scale, setScale] = useState(1.7)
  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth, h = window.innerHeight
      const byWidth = w * (n <= 2 ? 0.40 : 0.29)        // horizontal room per vessel
      const byHeight = (h * 0.64) / (DES_H / DES_W)     // vertical room (keep aspect)
      setScale(Math.max(1, Math.min(byWidth, byHeight) / DES_W))
    }
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [n])
  return scale
}

// ─── Round copy ────────────────────────────────────────────────────────────────────
function promptFor(d: CompareData): string {
  const three = d.vals.length >= 3
  if (d.station === 'cake') return d.mode === 'more' ? (three ? 'Which cake is the BIGGEST?' : 'Which cake is BIGGER?') : (three ? 'Which cake is the SMALLEST?' : 'Which cake is SMALLER?')
  const m = d.mode === 'more' ? (three ? 'the MOST' : 'MORE') : (three ? 'the LEAST' : 'FEWER')
  return `Which ${STATION_VESSEL[d.station]} has ${m} ${STATION_NOUN[d.station]}?`
}
function praiseFor(d: CompareData): string {
  if (d.station === 'cake') return d.mode === 'more' ? 'Yes! That cake is bigger! 🎉' : 'Yes! That cake is smaller! 🎉'
  return d.mode === 'more' ? 'Yes! That one has more! 🎉' : 'Yes! That one has fewer! 🎉'
}
function nudgeFor(d: CompareData): string {
  if (d.station === 'cake') return d.mode === 'more' ? 'Oops! Which cake is bigger?' : 'Oops! Which cake is smaller?'
  return d.mode === 'more' ? 'Oops! Look again — which has more?' : 'Oops! Look again — which has fewer?'
}
function guidedPrompt(d: CompareData): string {
  if (d.station === 'cake') return d.mode === 'more' ? 'Now you! Tap the bigger cake.' : 'Now you! Tap the smaller cake.'
  return d.mode === 'more' ? 'Now you! Tap the one with more.' : 'Now you! Tap the one with fewer.'
}

// ─── The interactive play surface (guided / practice) ──────────────────────────────
type Mode = 'guided' | 'practice'
const ComparePlay: React.FC<{ data: CompareData; mode: Mode; onComplete: (correct: boolean) => void }> = ({ data, mode, onComplete }) => {
  const { station, vals, answerIdx, symbolic } = data
  const n = vals.length
  const xs = n === 2 ? [28, 72] : [19, 50, 81]
  const TOP = 56
  const scale = useVesselScale(n)
  const [picked, setPicked] = useState<number | null>(null)
  const [wrongIdx, setWrongIdx] = useState<number | null>(null)
  const [reveal, setReveal] = useState(false)
  const erred = useRef(false), done = useRef(false), wrongLock = useRef(false), tapLock = useRef(false)
  const speaking = useIsSpeaking()

  const finish = useCallback(() => {
    if (done.current) return; done.current = true
    // Only the GUIDED round praises out loud here; in practice the SkillBeat speaks the
    // praise (double-speak was a voice-cut source in Ch.2).
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
        return <Vessel key={i} station={station} val={v} symbolic={symbolic} scale={scale}
          left={xs[i]} top={TOP} glow={glow} wrong={wrongIdx === i}
          onTap={() => tap(i)} aria={`choice ${v}`} />
      })}
    </>
  )
}

// ─── The counted explanation (opening demo + 3-wrong re-teach) ─────────────────────
// Milo COUNTS each group out loud, item by item (1, 2, 3…), the count badge ticking up
// under each vessel; then the winning vessel glows. Timer-driven (not speech-gated) so
// it can never hang if the browser drops Milo's voice — same approach as Chapter 1's
// counting demo.
const CompareExplain: React.FC<{ data: CompareData; onDone: () => void }> = ({ data, onDone }) => {
  const { station, vals, answerIdx, mode } = data
  const n = vals.length
  const xs = n === 2 ? [28, 72] : [19, 50, 81]
  const TOP = 56
  const scale = useVesselScale(n)
  const [shown, setShown] = useState<number[]>(() => vals.map(() => 0))
  const [reveal, setReveal] = useState(false)
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return; ran.current = true
    const ids: number[] = []
    const step = 700
    let t = 450
    speak("Let's count!")
    // Count each vessel in turn: reveal one item per number, speaking 1…v.
    vals.forEach((v, vi) => {
      for (let kk = 1; kk <= v; kk++) {
        const c = kk
        ids.push(window.setTimeout(() => {
          setShown(s => { const ns = s.slice(); ns[vi] = c; return ns })
          speak(String(c))
        }, t))
        t += step
      }
      t += 300   // a beat before moving to the next vessel
    })
    const target = vals[answerIdx]
    const word = mode === 'more' ? 'more' : 'fewer'
    const big = mode === 'more' ? 'bigger' : 'smaller'
    ids.push(window.setTimeout(() => { setReveal(true); speak(`${target} is ${word}. This one is ${big}!`) }, t))
    t += 1900
    ids.push(window.setTimeout(onDone, t))
    return () => ids.forEach(clearTimeout)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <>
      {vals.map((v, i) => (
        <Vessel key={i} station={station} val={v} symbolic={false} shown={shown[i]} scale={scale}
          left={xs[i]} top={TOP} glow={reveal && i === answerIdx} wrong={false}
          aria={`example ${v}`} />
      ))}
      {/* big count numbers popping over each group as Milo counts it */}
      {vals.map((v, i) => shown[i] > 0
        ? <CountNumber key={`n${i}`} value={shown[i]} cx={xs[i]} topPct={TOP} scale={scale} />
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
  while (vals.length < count) { const v = rint(lo, hi); if (!vals.includes(v)) vals.push(v) }   // fallback: just distinct
  return vals
}
function makeCompare(d: 1 | 2 | 3, round: number): CompareData {
  const station = stationForRound(round)
  const cap = station === 'cake' ? 6 : 9              // cakes cap at 6 layers so towers fit
  const count = d >= 3 && Math.random() < 0.5 ? 3 : 2 // 3-way "the most/least" creeps in at hard
  const mode: Compare = d === 1 ? 'more' : (Math.random() < 0.5 ? 'more' : 'less')
  const hi = Math.min(d === 1 ? 5 : 9, cap)
  const vals = pickVals(count, 1, hi, d === 1 ? 2 : 1) // diff 1 keeps an obvious gap
  const target = mode === 'more' ? Math.max(...vals) : Math.min(...vals)
  const symbolic = (station === 'fruit' || station === 'cookies') && d === 3 && Math.random() < 0.4
  return { station, vals, answerIdx: vals.indexOf(target), mode, symbolic }
}

// ─── The scored practice (SkillBeat) — one continuous adaptive sequence ────────────
export const kitchenCompareBeat: Beat<CompareData> = {
  skillId: 'numberComparison', rounds: 10, reteachAfter: 3,
  // The station already changes EVERY round (via the bg cross-fade); a short "move to
  // the next counter" pause every 3 rounds keeps it from feeling rushed.
  walkEvery: 3,
  make: (d, round = 0) => makeCompare((d || 1) as 1 | 2 | 3, round),
  prompt: d => promptFor(d),
  say: d => promptFor(d),
  Play: ({ data, onSubmit }) => <ComparePlay data={data} mode="practice" onComplete={onSubmit} />,
  // Re-teach by COUNTING both groups out, then showing which wins (never symbolic).
  Reteach: ({ data, onDone }) => <CompareExplain data={{ ...data, symbolic: false }} onDone={onDone} />,
}

// ─── Orchestrator ──────────────────────────────────────────────────────────────────
// FOUR counted explanation examples — one per station, so the intro also previews
// every theme. Milo counts both groups item-by-item, then shows which is bigger.
// (Bigger side alternates right/left/right/left so it's never positional.)
const DEMO_EXAMPLES: CompareData[] = [
  { station: 'fruit', vals: [2, 4], answerIdx: 1, mode: 'more', symbolic: false },
  { station: 'cookies',  vals: [3, 1], answerIdx: 0, mode: 'more', symbolic: false },
  { station: 'cake',     vals: [1, 3], answerIdx: 1, mode: 'more', symbolic: false },
  { station: 'jars',     vals: [4, 2], answerIdx: 0, mode: 'more', symbolic: false },
]
const GUIDED_DATA: CompareData = { station: 'cookies', vals: [2, 6], answerIdx: 1, mode: 'more', symbolic: false }

const MK_CSS = `
@keyframes mk_float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
@keyframes mk_pop { 0%{transform:scale(1)} 40%{transform:scale(1.16)} 100%{transform:scale(1)} }
@keyframes mk_shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-7px) rotate(-3deg)} 75%{transform:translateX(7px) rotate(3deg)} }
@keyframes mk_appear { 0%{transform:scale(0);opacity:0} 70%{transform:scale(1.12)} 100%{transform:scale(1);opacity:1} }
@keyframes mk_numfloat { 0%,100%{transform:translateX(-50%) translateY(0)} 50%{transform:translateX(-50%) translateY(-7px)} }
@keyframes mk_countpop { 0%{transform:scale(.4);opacity:0} 60%{transform:scale(1.25);opacity:1} 100%{transform:scale(1);opacity:1} }
@keyframes k_bounceIn { 0%{transform:scale(0) translateY(30px);opacity:0} 60%{transform:scale(1.25) translateY(-6px);opacity:1} 100%{transform:scale(1) translateY(0);opacity:1} }
`

type Phase = 'intro' | 'demo' | 'guided' | 'practice'
export default function Kitchen({ onFinish, onExit }: {
  onFinish?: (correct: number, wrong: number) => void
  onExit?: () => void
}) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('intro')
  const [station, setStation] = useState<Station>('fruit')
  const [demoIdx, setDemoIdx] = useState(0)         // which explanation example is showing
  const [feast, setFeast] = useState<string[]>([])
  const result = useRef({ correct: 0, wrong: 0 })
  const finished = useRef(false)
  const exit = useCallback(() => { stopSpeech(); (onExit ?? (() => router.push('/menu')))() }, [router, onExit])

  const finishChapter = useCallback((c: number, w: number) => {
    if (finished.current) return; finished.current = true
    stopSpeech()
    if (onFinish) onFinish(c, w); else exit()
  }, [onFinish, exit])

  const interlude = useCallback(() => new Promise<void>(res => window.setTimeout(res, 850)), [])
  const bgStation: Station = phase === 'practice' ? station
    : phase === 'guided' ? GUIDED_DATA.station
    : phase === 'demo' ? DEMO_EXAMPLES[demoIdx].station
    : 'fruit'

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
      <Background station={bgStation} />
      {TopBar}

      {phase === 'intro' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 45, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
          <div style={{ maxWidth: '74%', background: '#fff', border: '3px solid var(--outline)', borderRadius: 18, padding: '14px 20px', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19, color: 'var(--ink)', textAlign: 'center', boxShadow: '0 4px 0 rgba(61,37,22,.1)' }}>
            🍳 Milo is cooking a yummy feast! Help him pick the one with <b>more</b>. First, watch Milo count!
          </div>
          <button onClick={() => { speak('Let\'s help Milo cook! Watch me count to find which has more.'); setPhase('demo') }}
            style={{ padding: '14px 38px', borderRadius: 50, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,var(--milo-orange),var(--milo-orange-deep))', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, boxShadow: '0 6px 16px rgba(242,107,44,.4)' }}>Let&apos;s cook! ▶</button>
        </div>
      )}

      {phase === 'demo' && (<>{Banner(`Bigger means MORE! Watch Milo count 🍳  (${demoIdx + 1}/${DEMO_EXAMPLES.length})`)}
        <CompareExplain key={`demo${demoIdx}`} data={DEMO_EXAMPLES[demoIdx]}
          onDone={() => { if (demoIdx + 1 < DEMO_EXAMPLES.length) setDemoIdx(demoIdx + 1); else setPhase('guided') }} /></>)}

      {phase === 'guided' && (<>{Banner('Now you! Tap the one with MORE 👆')}
        <ComparePlay key="guided" data={GUIDED_DATA} mode="guided" onComplete={() => setPhase('practice')} /></>)}

      {phase === 'practice' && (
        <>
          <div style={{ position: 'absolute', top: 48, left: 0, right: 0, zIndex: 45, display: 'flex', justifyContent: 'center', padding: '0 12px' }}>
            <SkillBeat beat={kitchenCompareBeat} onInterlude={interlude}
              onRound={(data) => { if (data?.station) { setStation(data.station); setFeast(f => [...f, STATION_FOOD[data.station as Station]]) } }}
              onComplete={(c, w) => { result.current.correct += c; result.current.wrong += w; finishChapter(result.current.correct, result.current.wrong) }} />
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

      {phase !== 'intro' && <MiloChef left={11} top={80} />}
    </div>
  )
}
