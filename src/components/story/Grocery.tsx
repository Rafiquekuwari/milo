'use client'
/**
 * Chapter 5 — "Milo's Little Grocery", the number↔QUANTITY story (skill
 * `matchingQuantities`, the old "Apple Basket" drill reborn as story mode, same as
 * Ch.1–4). Milo runs a corner shop; each round a new customer orders EXACTLY N of one
 * item. The child taps items off the shelf into the customer's bag (each tap counts
 * aloud), fixes miscounts with "put one back", then rings the bell to serve — correct
 * only when the bag holds exactly N. This is the cardinality skill: a number tells you
 * exactly HOW MANY, and the real challenge is to STOP at N.
 *
 * FIVE stalls rotate across the 10 adaptive rounds (one continuous SkillBeat — harder on
 * a streak, gentler when struggling, re-teach after 3 wrong):
 *   🍎 Produce · 🥐 Bakery · 🥚 Deli · 🌷 Flowers · 🍬 Sweet shop
 * Difficulty (the count to build) ramps 1–3 → 3–6 → 6–10 (matchTarget); harder rounds
 * also leave more spare items on the shelf so the child must count and STOP, not grab
 * everything. PURE counting — every item on the shelf is the right kind (no decoys).
 *
 * Code-drawn + emoji first (fully playable), with auto-upgrade hooks for painted PNGs.
 * Mirrors story/NumberDoors.tsx (phases intro→demo→guided→practice, ONE SkillBeat);
 * wrapped by game/MatchingQuantitiesChapter.tsx.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { speak, speakSteps, stopSpeech } from '@/lib/useMiloSpeaker'
import { SkillBeat, type Beat } from './StoryWorld'
import { matchTarget } from '@/lib/adaptive'

const rint = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))

// ─── Stalls ──────────────────────────────────────────────────────────────────────
type Stall = 'produce' | 'bakery' | 'deli' | 'flowers' | 'sweets'
interface OrderRound {
  stall: Stall
  target: number    // how many to put in the bag
  shelf: number     // how many items sit on the shelf (>= target; the spare is the "stop at N" pressure)
}
interface StallCfg {
  noun: string; nounPlural: string; item: string; itemImg: string; customer: string; container: string
  bg: { grad: string; img: string }
  // optional alpha bbox — for a sprite with heavy transparent padding (e.g. the reused
  // apple.png), crop to its bounds so it fills its slot like the tight grocery sprites.
  bbox?: { W: number; H: number; x: number; y: number; w: number; h: number }
}
const STALL_ORDER: Stall[] = ['produce', 'bakery', 'deli', 'flowers', 'sweets']
const stallForRound = (round: number): Stall => STALL_ORDER[round % STALL_ORDER.length]
// "1 apple" / "3 apples" — singular when one, so the spoken+shown order reads naturally.
const qty = (n: number, cfg: StallCfg) => `${n} ${n === 1 ? cfg.noun : cfg.nounPlural}`

const STALL: Record<Stall, StallCfg> = {
  produce: { noun: 'apple',  nounPlural: 'apples',  item: '🍎', itemImg: '/assets/objects/apple.png',          customer: '🐰', container: 'bag',     bg: { grad: 'linear-gradient(#dff0c8 0%, #eaf7d6 52%, #cfe9a8 100%)', img: '/assets/backgrounds/grocery_produce.jpeg' }, bbox: { W: 1536, H: 1024, x: 526, y: 205, w: 498, h: 573 } },
  bakery:  { noun: 'bun',    nounPlural: 'buns',    item: '🥐', itemImg: '/assets/objects/grocery_bun.png',    customer: '🐻', container: 'box',     bg: { grad: 'linear-gradient(#ffe9c4 0%, #ffe0b0 55%, #f3c483 100%)', img: '/assets/backgrounds/grocery_bakery.jpeg' } },
  deli:    { noun: 'egg',    nounPlural: 'eggs',    item: '🥚', itemImg: '/assets/objects/grocery_egg.png',    customer: '🐱', container: 'carton',  bg: { grad: 'linear-gradient(#eef3f7 0%, #e6eef5 55%, #d4e2ee 100%)', img: '/assets/backgrounds/grocery_deli.jpeg' } },
  flowers: { noun: 'flower', nounPlural: 'flowers', item: '🌷', itemImg: '/assets/objects/grocery_flower.png', customer: '🐭', container: 'bouquet', bg: { grad: 'linear-gradient(#ffe6f0 0%, #fdeef6 55%, #e7f3d8 100%)', img: '/assets/backgrounds/grocery_flowers.jpeg' } },
  sweets:  { noun: 'candy',  nounPlural: 'candies', item: '🍬', itemImg: '/assets/objects/grocery_candy.png',  customer: '🦔', container: 'cone',    bg: { grad: 'linear-gradient(#ffe3f3 0%, #f3e0ff 55%, #d8ecff 100%)', img: '/assets/backgrounds/grocery_sweets.jpeg' } },
}

function Background({ stall }: { stall: Stall }) {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#f3ead8' }}>
      {STALL_ORDER.map(s => (
        <div key={s} style={{ position: 'absolute', inset: 0, opacity: s === stall ? 1 : 0, transition: 'opacity .6s ease' }}>
          <div style={{ position: 'absolute', inset: 0, background: STALL[s].bg.grad }} />
          <img src={STALL[s].bg.img} alt="" draggable={false}
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      ))}
    </div>
  )
}

// ─── Milo the grocer (bottom-left, grounded; bigger sprite stays on the floor) ──────
function MiloGrocer({ left }: { left: number }) {
  const [step, setStep] = useState(0)
  const srcs = ['/assets/characters/milo_grocer.png', '/assets/characters/milo_idle.png']
  return (
    <div style={{ position: 'fixed', left: `${left}%`, bottom: 0, transform: 'translateX(-50%)', zIndex: 26, width: 'min(34vh, 300px)', height: 'min(34vh, 300px)' }}>
      <div style={{ width: '100%', height: '100%', animation: 'gr_float 3.4s ease-in-out infinite' }}>
        {step >= srcs.length
          ? <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
              <span style={{ fontSize: 100, filter: 'drop-shadow(0 5px 8px rgba(0,0,0,.35))' }}>🦊</span>
              <span style={{ position: 'absolute', bottom: 14, right: 16, fontSize: 44 }}>🛒</span>
            </div>
          : <img src={srcs[step]} alt="Milo the grocer" draggable={false} onError={() => setStep(s => s + 1)}
              style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'bottom', filter: 'drop-shadow(0 5px 8px rgba(0,0,0,.35))' }} />}
      </div>
    </div>
  )
}

// ─── An item sprite (painted PNG if present, else the stall's emoji) ────────────────
function Item({ cfg, size }: { cfg: StallCfg; size: string }) {
  const [missing, setMissing] = useState(false)
  if (missing) return <span style={{ fontSize: size, lineHeight: 1, filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.2))' }}>{cfg.item}</span>
  if (cfg.bbox) {
    // crop to the alpha bbox via background-image so a padded sprite fills the slot like
    // the tight grocery sprites (the reused apple.png is mostly transparent padding).
    const b = cfg.bbox
    const FILL = 0.86                                    // fraction of the slot the item fills
    const bgH = ((b.H / b.h) * FILL * 100).toFixed(1)    // bg height as % of the square slot
    const cx = (((b.x + b.w / 2) / b.W) * 100).toFixed(1)
    const cy = (((b.y + b.h / 2) / b.H) * 100).toFixed(1)
    return <span style={{ display: 'block', width: size, height: size, backgroundImage: `url(${cfg.itemImg})`, backgroundSize: `auto ${bgH}%`, backgroundPosition: `${cx}% ${cy}%`, backgroundRepeat: 'no-repeat', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.2))' }} />
  }
  return <img src={cfg.itemImg} alt="" draggable={false} onError={() => setMissing(true)}
    style={{ width: size, height: size, objectFit: 'contain', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.2))' }} />
}

// ─── The bag/box the order fills into. NO running count shown — the child must count for
// themselves (the live tally was a crutch); they just see the items they've gathered. ───
function Bag({ cfg, picked }: { cfg: StallCfg; picked: number }) {
  return (
    <div style={{ position: 'relative', width: 'clamp(118px, 21vmin, 230px)', height: 'clamp(128px, 23vmin, 250px)' }}>
      {/* bag body */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: '20%', borderRadius: '7% 7% 13% 13%', background: 'linear-gradient(#ecc89a,#d2a86f)', border: '4px solid #b07f44', overflow: 'hidden',
        boxShadow: 'inset 0 6px 12px rgba(255,255,255,.25), inset 0 -8px 14px rgba(0,0,0,.18)', display: 'flex', flexWrap: 'wrap', alignContent: 'flex-end', justifyContent: 'center', gap: '0.5vmin', padding: '7% 6% 6%' }}>
        {Array.from({ length: picked }).map((_, i) => (
          <span key={i} style={{ display: 'inline-block', animation: 'gr_pop .3s ease both' }}><Item cfg={cfg} size="clamp(24px, 4.4vmin, 50px)" /></span>
        ))}
      </div>
      {/* rolled-down bag top */}
      <div style={{ position: 'absolute', left: '-2%', right: '-2%', top: '12%', height: '15%', background: 'linear-gradient(#f2d4a6,#e3bd86)', borderRadius: 6, border: '4px solid #b07f44' }} />
    </div>
  )
}

// The customer's order, shown as a big NUMBER FIGURE + the item — the child RECOGNISES the
// numeral (and hears it spoken) and builds that many. This is the figure-recognition cue.
function OrderTicket({ cfg, target }: { cfg: StallCfg; target: number }) {
  return (
    <div style={{ position: 'relative', background: 'var(--paper)', border: '4px solid var(--milo-orange)', borderRadius: 16, padding: 'clamp(6px,1.3vmin,14px) clamp(14px,2.4vmin,26px)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2vh', boxShadow: '0 5px 0 rgba(242,107,44,.25)' }}>
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(46px,9.5vmin,104px)', color: 'var(--ink)', lineHeight: 1 }}>{target}</span>
      <Item cfg={cfg} size="clamp(28px,5vmin,58px)" />
    </div>
  )
}

const bareBtn: React.CSSProperties = { border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', lineHeight: 0 }

// ─── The shelf + bag + customer (shared by the play surface and the demo) ───────────
function Stage({ cfg, target, shelf, picked, glow, shake, onPick }: {
  cfg: StallCfg; target: number; shelf: number; picked: number; glow: boolean; shake: boolean; onPick?: () => void
}) {
  const remaining = Math.max(0, shelf - picked)
  const itemSize = 'clamp(42px, 7vmin, 82px)'
  return (
    <>
      {/* shelf of items to pick from */}
      <div style={{ position: 'fixed', left: 0, right: 0, top: '40%', transform: 'translateY(-50%)', zIndex: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.2vh' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.6vmin', justifyContent: 'center', alignItems: 'flex-end', maxWidth: '74vw', minHeight: '13vh' }}>
          {Array.from({ length: remaining }).map((_, i) => onPick
            ? <button key={i} onClick={onPick} aria-label={`take ${cfg.noun}`} style={bareBtn}><Item cfg={cfg} size={itemSize} /></button>
            : <span key={i} style={{ lineHeight: 0 }}><Item cfg={cfg} size={itemSize} /></span>)}
        </div>
        {/* wooden shelf ledge */}
        <div style={{ width: '76vw', maxWidth: 780, height: '2.4vh', minHeight: 14, background: 'linear-gradient(#caa46a,#a07a44)', borderRadius: 6, boxShadow: '0 5px 9px rgba(0,0,0,.28)' }} />
      </div>
      {/* the order (big number figure), the customer, and the bag they're being served */}
      <div style={{ position: 'fixed', left: 0, right: 0, top: '70%', transform: 'translateY(-50%)', zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'clamp(14px, 3vw, 50px)' }}>
        <OrderTicket cfg={cfg} target={target} />
        <span style={{ fontSize: 'clamp(46px, 9vmin, 108px)', lineHeight: 1, filter: 'drop-shadow(0 4px 6px rgba(0,0,0,.25))', animation: glow ? 'gr_pop .5s ease' : 'gr_float 3.6s ease-in-out infinite' }}>{cfg.customer}</span>
        <div style={{ position: 'relative', animation: shake ? 'gr_shake .42s ease' : 'none', filter: glow ? 'drop-shadow(0 0 18px var(--garden-green))' : 'drop-shadow(0 8px 10px rgba(0,0,0,.25))' }}>
          <Bag cfg={cfg} picked={picked} />
        </div>
      </div>
    </>
  )
}

// ─── The interactive play surface (guided / practice) ──────────────────────────────
type Mode = 'guided' | 'practice'
const GroceryPlay: React.FC<{ data: OrderRound; mode: Mode; onComplete: (correct: boolean) => void }> = ({ data, mode, onComplete }) => {
  const { stall, target, shelf } = data
  const cfg = STALL[stall]
  const [picked, setPicked] = useState(0)
  const pickedRef = useRef(0)        // synchronous source of truth (rapid taps mustn't lose a count)
  const [glow, setGlow] = useState(false)
  const [shake, setShake] = useState(false)
  const erred = useRef(false), done = useRef(false), tapLock = useRef(false), wrongLock = useRef(false)

  useEffect(() => {
    if (mode === 'guided') speak(`Now you! Put ${qty(target, cfg)} in the ${cfg.container}, then ring the bell.`)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Pick is NOT gated on speaking — rapid taps each say the running count (the count-aloud
  // IS the cardinality heartbeat); a new count just cancels the previous, which is fine.
  function pick() {
    if (done.current || pickedRef.current >= shelf) return
    pickedRef.current += 1; setPicked(pickedRef.current); speak(String(pickedRef.current))
  }
  function putBack() {
    if (done.current || pickedRef.current <= 0) return
    pickedRef.current -= 1; setPicked(pickedRef.current)
  }

  function ringUp() {
    if (done.current || tapLock.current) return
    tapLock.current = true; window.setTimeout(() => { tapLock.current = false }, 350)
    const p = pickedRef.current
    if (p === target) {
      done.current = true; setGlow(true)
      if (mode === 'guided') speak(`Yes! Exactly ${target}! Sold!`)   // practice praise comes from SkillBeat
      window.setTimeout(() => onComplete(mode === 'practice' ? !erred.current : true), 1100)
    } else {
      erred.current = true; setShake(true); window.setTimeout(() => setShake(false), 460)
      if (!wrongLock.current) {
        wrongLock.current = true
        speak(p < target ? `The order is ${target}. You have ${p} — a few more!` : `That's ${p} — too many! The order is ${target}. Put some back.`)
        window.setTimeout(() => { wrongLock.current = false }, 1700)
      }
    }
  }

  return (
    <>
      <Stage cfg={cfg} target={target} shelf={shelf} picked={picked} glow={glow} shake={shake} onPick={pick} />
      {glow && (
        <div style={{ position: 'fixed', left: '50%', top: '53%', transform: 'translateX(-50%)', zIndex: 48, fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(26px, 5vmin, 52px)', color: '#fff', background: 'var(--garden-green)', border: '4px solid #fff', borderRadius: 18, padding: '6px 26px', boxShadow: '0 6px 0 rgba(0,0,0,.2)', animation: 'gr_sold .5s cubic-bezier(.34,1.56,.64,1) both', whiteSpace: 'nowrap' }}>✓ Sold!</div>
      )}
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: '4%', zIndex: 31, display: 'flex', justifyContent: 'center', gap: '3vw', flexWrap: 'wrap', padding: '0 12px' }}>
        <button onClick={putBack} disabled={picked <= 0}
          style={{ ...CTRL, background: 'var(--paper)', color: 'var(--milo-orange)', border: '3px solid var(--milo-orange)', opacity: picked <= 0 ? 0.45 : 1, cursor: picked <= 0 ? 'default' : 'pointer' }}>↩ Put one back</button>
        <button onClick={ringUp}
          style={{ ...CTRL, background: 'linear-gradient(135deg,var(--garden-green),var(--garden-green-deep))', color: '#fff', border: 'none', cursor: 'pointer' }}>🔔 Ring it up!</button>
      </div>
    </>
  )
}
const CTRL: React.CSSProperties = { padding: '12px 26px', borderRadius: 50, fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, boxShadow: '0 5px 0 rgba(0,0,0,.18)' }

// ─── The teaching demo (opening preview + 3-wrong re-teach) ─────────────────────────
// Milo counts items into the bag one-by-one and STOPS at N. Timer-driven (not
// speech-gated) so it can never hang if the browser drops voice.
const GroceryExplain: React.FC<{ data: OrderRound; onDone: () => void }> = ({ data, onDone }) => {
  const { stall, target, shelf } = data
  const cfg = STALL[stall]
  const [filled, setFilled] = useState(0)
  const [glow, setGlow] = useState(false)
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return; ran.current = true
    // speakSeq plays each line only when the previous one's `end` fires, so the intro line,
    // the counted numbers, and the closing line can never overlap or clip (fixed timers
    // clipped the long intro line). Each line's visual fires from onWord when that line
    // actually starts; speakSeq's watchdog means it can't hang.
    const script: string[] = [`This shopper wants ${qty(target, cfg)}. Let's count them into the ${cfg.container}.`]
    const actions: Array<() => void> = [() => {}]
    for (let k = 1; k <= target; k++) { const c = k; script.push(String(c)); actions.push(() => setFilled(c)) }
    script.push(`${target}! Just right — stop. Ring it up, sold!`)
    actions.push(() => setGlow(true))
    const cancel = speakSteps(script, {
      onStep: (i) => actions[i]?.(),
      onDone: () => window.setTimeout(onDone, 1200),
    })
    return cancel
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return <Stage cfg={cfg} target={target} shelf={shelf} picked={filled} glow={glow} shake={false} />
}

// ─── Value generation ──────────────────────────────────────────────────────────────
function makeOrder(d: 1 | 2 | 3, round: number): OrderRound {
  const stall = stallForRound(round)
  const target = matchTarget(d as 1 | 2 | 3)                 // 1–3 / 3–6 / 6–10 (shared adaptive ladder)
  const spares = d === 1 ? 0 : d === 2 ? 2 : rint(3, 4)      // harder → fuller shelf → must STOP at N
  const shelf = Math.min(10, target + spares)               // shelf capped at 10
  return { stall, target, shelf }
}

// ─── The scored practice (SkillBeat) — one continuous adaptive sequence ────────────
export const groceryBeat: Beat<OrderRound> = {
  skillId: 'matchingQuantities', rounds: 10, reteachAfter: 3,
  // The stall already changes EVERY round (via the bg cross-fade); a short "next customer"
  // pause every 3 rounds keeps it from feeling rushed.
  walkEvery: 3,
  make: (d, round = 0) => makeOrder((d || 1) as 1 | 2 | 3, round),
  prompt: d => `Put ${qty(d.target, STALL[d.stall])} in the ${STALL[d.stall].container}.`,
  say: d => `This shopper would like ${qty(d.target, STALL[d.stall])}. Tap them into the ${STALL[d.stall].container}, then ring the bell!`,
  Play: ({ data, onSubmit }) => <GroceryPlay data={data} mode="practice" onComplete={onSubmit} />,
  Reteach: ({ data, onDone }) => <GroceryExplain data={data} onDone={onDone} />,
}

// ─── Orchestrator ──────────────────────────────────────────────────────────────────
// TWO teaching demos — different stalls — so the intro previews variety. Milo counts an
// order into the bag and stops at the number.
const DEMO_ORDERS: OrderRound[] = [
  { stall: 'produce', target: 3, shelf: 3 },
  { stall: 'bakery',  target: 5, shelf: 7 },
]
const GUIDED_ORDER: OrderRound = { stall: 'deli', target: 2, shelf: 4 }

const GR_CSS = `
@keyframes gr_float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
@keyframes gr_pop { 0%{transform:scale(0);opacity:0} 70%{transform:scale(1.15);opacity:1} 100%{transform:scale(1);opacity:1} }
@keyframes gr_shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px) rotate(-2deg)} 75%{transform:translateX(6px) rotate(2deg)} }
@keyframes gr_sold { 0%{transform:translateX(-50%) scale(.3);opacity:0} 60%{transform:translateX(-50%) scale(1.2);opacity:1} 100%{transform:translateX(-50%) scale(1);opacity:1} }
@keyframes k_bounceIn { 0%{transform:scale(0) translateY(30px);opacity:0} 60%{transform:scale(1.25) translateY(-6px);opacity:1} 100%{transform:scale(1) translateY(0);opacity:1} }
`

type Phase = 'intro' | 'demo' | 'guided' | 'practice'
export default function Grocery({ onFinish, onExit }: {
  onFinish?: (correct: number, wrong: number) => void
  onExit?: () => void
}) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('intro')
  const [stall, setStall] = useState<Stall>('produce')
  const [demoIdx, setDemoIdx] = useState(0)
  const result = useRef({ correct: 0, wrong: 0 })
  const finished = useRef(false)
  const exit = useCallback(() => { stopSpeech(); (onExit ?? (() => router.push('/menu')))() }, [router, onExit])

  const finishChapter = useCallback((c: number, w: number) => {
    if (finished.current) return; finished.current = true
    stopSpeech()
    if (onFinish) onFinish(c, w); else exit()
  }, [onFinish, exit])

  const interlude = useCallback(() => new Promise<void>(res => window.setTimeout(res, 850)), [])
  const bgStall: Stall = phase === 'practice' ? stall
    : phase === 'guided' ? GUIDED_ORDER.stall
    : phase === 'demo' ? DEMO_ORDERS[demoIdx].stall
    : 'produce'

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
      <style>{GR_CSS}</style>
      <Background stall={bgStall} />
      {TopBar}

      {phase === 'intro' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 45, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
          <div style={{ maxWidth: '76%', background: '#fff', border: '3px solid var(--outline)', borderRadius: 18, padding: '14px 20px', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19, color: 'var(--ink)', textAlign: 'center', boxShadow: '0 4px 0 rgba(61,37,22,.1)' }}>
            Milo&apos;s shop is open! Each customer wants <b>exactly</b> some things — tap them into the bag and ring the bell. First, watch Milo!
          </div>
          <button onClick={() => setPhase('demo')}
            style={{ padding: '14px 38px', borderRadius: 50, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,var(--milo-orange),var(--milo-orange-deep))', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, boxShadow: '0 6px 16px rgba(242,107,44,.4)' }}>Open the shop! ▶</button>
        </div>
      )}

      {phase === 'demo' && (<>{Banner(`Watch Milo fill the order  (${demoIdx + 1}/${DEMO_ORDERS.length})`)}
        <GroceryExplain key={`demo${demoIdx}`} data={DEMO_ORDERS[demoIdx]}
          onDone={() => { if (demoIdx + 1 < DEMO_ORDERS.length) setDemoIdx(demoIdx + 1); else setPhase('guided') }} /></>)}

      {phase === 'guided' && (<>{Banner('Now you! Fill the order, then ring the bell')}
        <GroceryPlay key="guided" data={GUIDED_ORDER} mode="guided" onComplete={() => setPhase('practice')} /></>)}

      {phase === 'practice' && (
        <div style={{ position: 'absolute', top: 48, left: 0, right: 0, zIndex: 45, display: 'flex', justifyContent: 'center', padding: '0 12px' }}>
          <SkillBeat beat={groceryBeat} onInterlude={interlude}
            onRound={(data) => { if (data?.stall) setStall(data.stall as Stall) }}
            onComplete={(c, w) => { result.current.correct += c; result.current.wrong += w; finishChapter(result.current.correct, result.current.wrong) }} />
        </div>
      )}

      {phase !== 'intro' && <MiloGrocer left={11} />}
    </div>
  )
}
