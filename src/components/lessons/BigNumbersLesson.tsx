'use client'
/**
 * BigNumbersLesson (9–11) — place value beyond 100: hundreds, then thousands.
 * Worked examples build a number place-by-place on a place-value chart, then the
 * child picks numbers and reads the value of a digit. Built on the shared kit:
 * centered Retry+Next pop-up + no celebration slides come for free via
 * LessonScaffold. See docs/curriculum-9-11.md.
 */
import React, { useState, useEffect, useRef } from 'react'
import { speak, speakSeq } from '@/lib/useMiloSpeaker'
import { nounFor } from '@/lib/grammar'
import { LessonScaffold, Confetti, type LessonStep } from './_kit'

// ─── Number → words (0–9999) ─────────────────────────────────
const ONES = ['zero','one','two','three','four','five','six','seven','eight','nine','ten',
  'eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen']
const TENS = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety']
function under100(n: number): string {
  if (n < 20) return ONES[n]
  const t = Math.floor(n / 10), o = n % 10
  return o === 0 ? TENS[t] : `${TENS[t]}-${ONES[o]}`
}
function under1000(n: number): string {
  if (n < 100) return under100(n)
  const h = Math.floor(n / 100), r = n % 100
  return r === 0 ? `${ONES[h]} hundred` : `${ONES[h]} hundred ${under100(r)}`
}
export function bigWords(n: number): string {
  if (n < 0 || n > 9999) return String(n)
  if (n < 1000) return under1000(n)
  const th = Math.floor(n / 1000), r = n % 1000
  return r === 0 ? `${ONES[th]} thousand` : `${ONES[th]} thousand ${under1000(r)}`
}

// ─── Place-value columns for a number ────────────────────────
export interface PlaceCol { label: string; plural: string; digit: number; value: number; color: string }
const PLACE_COLORS = { thousands: '#9362D8', hundreds: '#5BC3F0', tens: '#F26B2C', ones: '#6FBE3F' }
export function placeColumns(n: number): PlaceCol[] {
  const th = Math.floor(n / 1000) % 10, h = Math.floor(n / 100) % 10, t = Math.floor(n / 10) % 10, o = n % 10
  const cols: PlaceCol[] = []
  if (n >= 1000) cols.push({ label: 'Thousands', plural: 'thousands', digit: th, value: th * 1000, color: PLACE_COLORS.thousands })
  if (n >= 100)  cols.push({ label: 'Hundreds',  plural: 'hundreds',  digit: h,  value: h * 100,  color: PLACE_COLORS.hundreds })
  cols.push({ label: 'Tens', plural: 'tens', digit: t, value: t * 10, color: PLACE_COLORS.tens })
  cols.push({ label: 'Ones', plural: 'ones', digit: o, value: o, color: PLACE_COLORS.ones })
  return cols
}

// ─── Place-value chart visual ────────────────────────────────
export function PlaceChart({ n, reveal, highlight }: { n: number; reveal?: number; highlight?: number }) {
  const cols = placeColumns(n)
  const shown = reveal ?? cols.length
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'nowrap' }}>
      {cols.map((c, i) => {
        const visible = i < shown
        const isHi = highlight === i
        return (
          <div key={c.label} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            opacity: visible ? 1 : 0.18, transition: 'opacity 0.3s ease, transform 0.3s cubic-bezier(.34,1.56,.64,1)',
            transform: isHi ? 'scale(1.12) translateY(-4px)' : 'scale(1)',
          }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase', color: c.color }}>{c.label}</div>
            <div style={{
              width: 58, height: 70, borderRadius: 14, border: `3px solid ${c.color}`,
              background: visible ? `${c.color}1a` : 'rgba(0,0,0,0.03)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 40, color: 'var(--ink)',
              boxShadow: isHi ? `0 0 0 4px #fff, 0 8px 18px ${c.color}80` : '0 3px 0 rgba(61,37,22,.12)',
            }}>{visible ? c.digit : ''}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, color: visible ? c.color : 'transparent' }}>{c.value}</div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Worked example: build a number place by place ───────────
export function BuildNumber({ n, intro, outro, onDone }: { n: number; intro: string; outro: string; onDone: () => void }) {
  const cols = placeColumns(n)
  const [shown, setShown] = useState(0)
  const [done, setDone] = useState(false)
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return
    ran.current = true
    const placeLines = cols.map(c => `${c.digit} ${nounFor(c.digit, c.plural)}`)
    const lines = [intro, ...placeLines, `That makes ${bigWords(n)}!`, outro]
    let started = false, finished = false
    const cleanups: Array<() => void> = []
    const at = (fn: () => void, ms: number) => { const id = window.setTimeout(fn, ms); cleanups.push(() => window.clearTimeout(id)) }
    const apply = (i: number) => {
      if (i >= 1 && i <= cols.length) setShown(i)
      else if (i === cols.length + 1) { setShown(cols.length); setDone(true) }
    }
    const complete = () => { if (finished) return; finished = true; at(onDone, 900) }
    const cancel = speakSeq(lines, { onWord: i => { started = true; apply(i) }, onDone: complete })
    cleanups.push(cancel)
    // Fallback if speech never starts (blocked autoplay / muted): drive by timers.
    at(() => {
      if (started || finished) return
      cancel()
      let t = 0
      for (let k = 1; k <= cols.length; k++) { const kk = k; at(() => { setShown(kk); speak(placeLines[kk - 1]) }, t); t += 1300 }
      at(() => { setShown(cols.length); setDone(true); speak(`That makes ${bigWords(n)}!`) }, t); t += 2000
      at(() => { speak(outro); complete() }, t)
    }, 1900)
    return () => cleanups.forEach(fn => fn())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, position: 'relative' }}>
      {done && <Confetti />}
      <PlaceChart n={n} reveal={shown} />
      <div style={{ height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {done && (
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 52, lineHeight: 1, color: 'var(--milo-orange)', textShadow: '0 5px 0 rgba(61,37,22,.12)', animation: 'k_countBadge 0.5s cubic-bezier(.34,1.56,.64,1)' }}>
            {n.toLocaleString('en-US')}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Interactive: pick the right number ──────────────────────
export function PickBig({ target, choices, intro, outro, onDone }: { target: number; choices: number[]; intro: string; outro: string; onDone: () => void }) {
  const [picked, setPicked] = useState<number | null>(null)
  const [wrong, setWrong] = useState<number | null>(null)
  const [ready, setReady] = useState(false)
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return
    ran.current = true
    speak(intro)
    const id = window.setTimeout(() => setReady(true), 600)
    return () => window.clearTimeout(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  function pick(c: number) {
    if (picked != null || !ready) return
    if (c === target) { setPicked(c); setWrong(null); speak(outro); window.setTimeout(onDone, 1900) }
    else { setWrong(c); speak(`Not quite. Look again — find ${bigWords(target)}.`); window.setTimeout(() => setWrong(null), 1000) }
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: 'var(--milo-orange)', background: 'var(--milo-orange-soft)', borderRadius: 50, padding: '6px 18px', border: '2px solid var(--milo-orange)' }}>
        Find {bigWords(target)}! 👆
      </div>
      <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', opacity: ready ? 1 : 0.5, transition: 'opacity 0.2s' }}>
        {choices.map(c => {
          const isRight = picked === c, isWrong = wrong === c
          return (
            <button key={c} onClick={() => pick(c)} disabled={picked != null || !ready} style={{
              minWidth: 110, padding: '16px 14px', borderRadius: 22,
              background: isRight ? 'var(--garden-green-soft)' : isWrong ? 'var(--apple-red-soft)' : 'var(--paper)',
              border: `4px solid ${isRight ? 'var(--garden-green)' : isWrong ? 'var(--apple-red)' : 'var(--outline)'}`,
              boxShadow: isRight ? '0 6px 0 var(--garden-green-deep)' : isWrong ? '0 6px 0 var(--apple-red-deep)' : '0 6px 0 #c8ac79',
              fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 34, color: 'var(--ink)',
              cursor: picked != null || !ready ? 'default' : 'pointer',
            }}>{c.toLocaleString('en-US')}</button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Opening: ten tens make one hundred (bridge from prior knowledge) ──
const TEN_TOTALS = ['ten', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety', 'one hundred']
function MakeHundred({ onDone }: { onDone: () => void }) {
  const [shown, setShown] = useState(0)
  const [done, setDone] = useState(false)
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return
    ran.current = true
    const lines = ["You already know tens and ones! Let's count ten tens.", ...TEN_TOTALS, 'Ten tens make one hundred!']
    let started = false, finished = false
    const cl: Array<() => void> = []
    const at = (fn: () => void, ms: number) => { const id = window.setTimeout(fn, ms); cl.push(() => window.clearTimeout(id)) }
    const apply = (i: number) => { if (i >= 1 && i <= 10) setShown(i); if (i === 11) setDone(true) }
    const complete = () => { if (finished) return; finished = true; at(onDone, 1000) }
    const cancel = speakSeq(lines, { onWord: i => { started = true; apply(i) }, onDone: complete })
    cl.push(cancel)
    at(() => {
      if (started || finished) return
      cancel()
      let t = 0
      for (let k = 1; k <= 10; k++) { const kk = k; at(() => { setShown(kk); speak(TEN_TOTALS[kk - 1]) }, t); t += 800 }
      at(() => { setDone(true); speak('Ten tens make one hundred!') }, t); t += 1600
      at(() => complete(), t)
    }, 1900)
    return () => cl.forEach(f => f())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, position: 'relative' }}>
      {done && <Confetti />}
      <div style={{ height: 64, display: 'flex', alignItems: 'center' }}>
        {done
          ? <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 64, color: PLACE_COLORS.hundreds, textShadow: '0 5px 0 rgba(61,37,22,.12)', animation: 'k_countBadge 0.5s cubic-bezier(.34,1.56,.64,1)' }}>100</div>
          : shown > 0 ? <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 52, color: 'var(--milo-orange)' }}>{shown * 10}</div> : null}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 300 }}>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} style={{
            width: 46, height: 54, borderRadius: 10, border: `3px solid ${PLACE_COLORS.tens}`,
            background: i < shown ? `${PLACE_COLORS.tens}22` : 'rgba(0,0,0,0.03)',
            opacity: i < shown ? 1 : 0.25, transform: i < shown ? 'scale(1)' : 'scale(0.9)',
            transition: 'all 0.25s cubic-bezier(.34,1.56,.64,1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, color: 'var(--ink)',
          }}>10</div>
        ))}
      </div>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--ink-muted)' }}>{done ? 'ten tens = one hundred 🎉' : 'counting tens…'}</div>
    </div>
  )
}

// ─── Opening: ten hundreds make one thousand ─────────────────
const HUNDRED_TOTALS = ['one hundred', 'two hundred', 'three hundred', 'four hundred', 'five hundred', 'six hundred', 'seven hundred', 'eight hundred', 'nine hundred', 'one thousand']
function MakeThousand({ onDone }: { onDone: () => void }) {
  const [shown, setShown] = useState(0)
  const [done, setDone] = useState(false)
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return
    ran.current = true
    const lines = ["You know hundreds now! Let's count ten hundreds.", ...HUNDRED_TOTALS, 'Ten hundreds make one thousand!']
    let started = false, finished = false
    const cl: Array<() => void> = []
    const at = (fn: () => void, ms: number) => { const id = window.setTimeout(fn, ms); cl.push(() => window.clearTimeout(id)) }
    const apply = (i: number) => { if (i >= 1 && i <= 10) setShown(i); if (i === 11) setDone(true) }
    const complete = () => { if (finished) return; finished = true; at(onDone, 1000) }
    const cancel = speakSeq(lines, { onWord: i => { started = true; apply(i) }, onDone: complete })
    cl.push(cancel)
    at(() => {
      if (started || finished) return
      cancel()
      let t = 0
      for (let k = 1; k <= 10; k++) { const kk = k; at(() => { setShown(kk); speak(HUNDRED_TOTALS[kk - 1]) }, t); t += 800 }
      at(() => { setDone(true); speak('Ten hundreds make one thousand!') }, t); t += 1600
      at(() => complete(), t)
    }, 1900)
    return () => cl.forEach(f => f())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, position: 'relative' }}>
      {done && <Confetti />}
      <div style={{ height: 64, display: 'flex', alignItems: 'center' }}>
        {done
          ? <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 60, color: PLACE_COLORS.thousands, textShadow: '0 5px 0 rgba(61,37,22,.12)', animation: 'k_countBadge 0.5s cubic-bezier(.34,1.56,.64,1)' }}>1,000</div>
          : shown > 0 ? <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 50, color: PLACE_COLORS.hundreds }}>{(shown * 100).toLocaleString('en-US')}</div> : null}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 320 }}>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} style={{
            width: 52, height: 54, borderRadius: 10, border: `3px solid ${PLACE_COLORS.hundreds}`,
            background: i < shown ? `${PLACE_COLORS.hundreds}22` : 'rgba(0,0,0,0.03)',
            opacity: i < shown ? 1 : 0.25, transform: i < shown ? 'scale(1)' : 'scale(0.9)',
            transition: 'all 0.25s cubic-bezier(.34,1.56,.64,1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 16, color: 'var(--ink)',
          }}>100</div>
        ))}
      </div>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--ink-muted)' }}>{done ? 'ten hundreds = one thousand 🎉' : 'counting hundreds…'}</div>
    </div>
  )
}

// ─── Steps ───────────────────────────────────────────────────
interface Props { childName: string; onLessonComplete: () => void }
function buildSteps(childName: string): LessonStep[] {
  return [
    { bubble: `Hi ${childName}! You know tens and ones — now meet HUNDREDS! 🔢`, mood: 'happy',
      render: d => <MakeHundred onDone={d} /> },
    { bubble: 'Now let\'s build a big number, place by place. 🧱', mood: 'happy',
      render: d => <BuildNumber n={247} intro="Every digit has a place. Watch me build two hundred forty-seven." outro="Each digit tells us how many hundreds, tens and ones!" onDone={d} /> },
    { bubble: 'Hundreds, tens and ones. 🧱', mood: 'thinking',
      render: d => <BuildNumber n={362} intro="Let's build three hundred sixty-two. Watch each place." outro="Three hundreds, six tens, two ones — three hundred sixty-two!" onDone={d} /> },
    { bubble: 'Now YOU find it! 👂', mood: 'thinking',
      render: d => <PickBig target={362} choices={[326, 362, 263]} intro="Find three hundred sixty-two!" outro="Yes! Three hundred sixty-two!" onDone={d} /> },
    { bubble: 'Now even BIGGER — thousands! 🚀', mood: 'happy',
      render: d => <MakeThousand onDone={d} /> },
    { bubble: 'See one thousand on the chart! 🔢', mood: 'happy',
      render: d => <BuildNumber n={1000} intro="One thousand has a one in the thousands place, and zeros everywhere else." outro="One thousand — our biggest place yet!" onDone={d} /> },
    { bubble: 'Build a thousands number! 🧮', mood: 'thinking',
      render: d => <BuildNumber n={3256} intro="Let's build three thousand two hundred fifty-six. Place by place." outro="Three thousands, two hundreds, five tens, six ones!" onDone={d} /> },
    { bubble: 'Your turn — find it! 👂', mood: 'thinking',
      render: d => <PickBig target={3256} choices={[3265, 2356, 3256]} intro="Find three thousand two hundred fifty-six!" outro="Brilliant! Three thousand two hundred fifty-six!" onDone={d} /> },
    { bubble: 'A digit\'s VALUE depends on its place. 💡', mood: 'thinking',
      render: d => <BuildNumber n={4070} intro="In four thousand seventy, the zero holds the hundreds place — zero hundreds!" outro="The 7 is in the tens place, so it's worth seventy!" onDone={d} /> },
    { bubble: 'Last one — find the big number! 🏆', mood: 'thinking',
      render: d => <PickBig target={4070} choices={[4700, 4070, 470]} intro="Find four thousand seventy!" outro="Amazing! Four thousand seventy!" onDone={d} /> },
  ]
}
export default function BigNumbersLesson({ childName, onLessonComplete }: Props) {
  return (
    <LessonScaffold
      childName={childName}
      onLessonComplete={onLessonComplete}
      steps={buildSteps(childName)}
      finalSpeech={`Fantastic, ${childName}! You can read big numbers by their places! Let's practise!`}
    />
  )
}
