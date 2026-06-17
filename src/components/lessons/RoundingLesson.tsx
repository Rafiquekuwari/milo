'use client'
/**
 * RoundingLesson (9–11) — rounding to the nearest 10 / 100 on a number line, and
 * estimating sums by rounding first. Worked examples place the number on a line
 * between two multiples, show the halfway point, then snap to the nearer one.
 * Built on the shared kit (centered Retry+Next pop-up, no celebration slides).
 * See docs/curriculum-9-11.md.
 */
import React, { useState, useEffect, useRef } from 'react'
import { speak, speakSeq } from '@/lib/useMiloSpeaker'
import { LessonScaffold, Confetti, type LessonStep } from './_kit'

export function roundTo(n: number, m: number): number {
  // Half rounds up (45 → 50): bias the .5 case upward explicitly.
  return Math.floor(n / m + 0.5) * m
}

// ─── Number line between the two multiples bracketing `value` ─────
export function RoundLine({ value, m, stage }: { value: number; m: number; stage: number }) {
  const low = Math.floor(value / m) * m
  const high = low + m
  const mid = low + m / 2
  const nearest = roundTo(value, m)
  const frac = (value - low) / m
  const showLine = stage >= 1
  const showValue = stage >= 2
  const showMid = stage >= 3
  const decided = stage >= 4
  const lowHi = decided && nearest === low
  const highHi = decided && nearest === high
  return (
    <div style={{ width: 320, maxWidth: '90vw', padding: '34px 8px 28px', position: 'relative' }}>
      {/* track */}
      <div style={{ position: 'relative', height: 6, background: showLine ? 'var(--outline)' : 'rgba(0,0,0,0.08)', borderRadius: 3, transition: 'background 0.3s' }}>
        {/* endpoints */}
        {([['L', 0, low, lowHi], ['H', 1, high, highHi]] as const).map(([k, x, label, hi]) => (
          <div key={k} style={{ position: 'absolute', left: `${(x as number) * 100}%`, top: -7, transform: 'translateX(-50%)', opacity: showLine ? 1 : 0, transition: 'opacity 0.3s' }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: hi ? 'var(--garden-green)' : 'var(--paper)', border: `3px solid ${hi ? 'var(--garden-green-deep)' : 'var(--outline)'}`, boxShadow: hi ? '0 0 0 4px #fff, 0 6px 14px rgba(111,190,63,.6)' : 'none', transition: 'all 0.3s' }} />
            <div style={{ position: 'absolute', top: 24, left: '50%', transform: 'translateX(-50%)', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, color: hi ? 'var(--garden-green-deep)' : 'var(--ink)' }}>{label}</div>
          </div>
        ))}
        {/* midpoint */}
        <div style={{ position: 'absolute', left: '50%', top: -5, transform: 'translateX(-50%)', opacity: showMid ? 0.85 : 0, transition: 'opacity 0.3s' }}>
          <div style={{ width: 2, height: 16, background: 'var(--ink-muted)' }} />
          <div style={{ position: 'absolute', top: -26, left: '50%', transform: 'translateX(-50%)', fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--ink-muted)', whiteSpace: 'nowrap' }}>half = {mid}</div>
        </div>
        {/* value marker */}
        <div style={{ position: 'absolute', left: `${frac * 100}%`, top: -16, transform: 'translateX(-50%)', opacity: showValue ? 1 : 0, transition: 'opacity 0.3s, left 0.4s ease' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, color: 'var(--milo-orange)', textShadow: '0 2px 0 rgba(61,37,22,.15)' }}>{value}</div>
          <div style={{ width: 0, height: 0, margin: '2px auto 0', borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderTop: '10px solid var(--milo-orange)' }} />
        </div>
      </div>
    </div>
  )
}

// ─── Worked example: round on the line ───────────────────────
export function RoundWatch({ value, m, intro, outro, onDone }: { value: number; m: number; intro: string; outro: string; onDone: () => void }) {
  const low = Math.floor(value / m) * m, high = low + m, mid = low + m / 2
  const nearest = roundTo(value, m)
  const [stage, setStage] = useState(1)
  const [done, setDone] = useState(false)
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return
    ran.current = true
    const lines = [
      intro,
      `${value} is between ${low} and ${high}.`,
      `Halfway is ${mid}.`,
      value >= mid ? `${value} is ${mid === value ? 'right at half, so it rounds up' : 'past halfway'} — it rounds to ${nearest}.` : `${value} is below halfway — it rounds to ${nearest}.`,
      outro,
    ]
    let started = false, finished = false
    const cl: Array<() => void> = []
    const at = (fn: () => void, ms: number) => { const id = window.setTimeout(fn, ms); cl.push(() => window.clearTimeout(id)) }
    const apply = (i: number) => { if (i === 1) setStage(2); else if (i === 2) setStage(3); else if (i === 3) { setStage(4); setDone(true) } }
    const complete = () => { if (finished) return; finished = true; at(onDone, 900) }
    const cancel = speakSeq(lines, { onWord: i => { started = true; apply(i) }, onDone: complete })
    cl.push(cancel)
    at(() => {
      if (started || finished) return
      cancel()
      let t = 0
      at(() => { setStage(2); speak(lines[1]) }, t); t += 2000
      at(() => { setStage(3); speak(lines[2]) }, t); t += 1800
      at(() => { setStage(4); setDone(true); speak(lines[3]) }, t); t += 2200
      at(() => { speak(outro); complete() }, t)
    }, 1900)
    return () => cl.forEach(f => f())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, position: 'relative' }}>
      {done && <Confetti />}
      <RoundLine value={value} m={m} stage={stage} />
      <div style={{ height: 44, display: 'flex', alignItems: 'center' }}>
        {done && (
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, color: 'var(--garden-green-deep)', background: 'var(--garden-green-soft)', border: '3px solid var(--garden-green)', borderRadius: 50, padding: '6px 18px', animation: 'k_bounceIn 0.45s cubic-bezier(.34,1.56,.64,1)' }}>
            {value} → {nearest}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Interactive: pick the rounded value ─────────────────────
export function RoundPick({ value, m, choices, intro, outro, onDone }: { value: number; m: number; choices: number[]; intro: string; outro: string; onDone: () => void }) {
  const answer = roundTo(value, m)
  const [picked, setPicked] = useState<number | null>(null)
  const [wrong, setWrong] = useState<number | null>(null)
  const [ready, setReady] = useState(false)
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return; ran.current = true
    speak(intro)
    const id = window.setTimeout(() => setReady(true), 600)
    return () => window.clearTimeout(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  function pick(c: number) {
    if (picked != null || !ready) return
    if (c === answer) { setPicked(c); setWrong(null); speak(outro); window.setTimeout(onDone, 1900) }
    else { setWrong(c); speak(`Not quite. Look at the line — which is nearer?`); window.setTimeout(() => setWrong(null), 1000) }
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: 'var(--milo-orange)', background: 'var(--milo-orange-soft)', borderRadius: 50, padding: '6px 18px', border: '2px solid var(--milo-orange)' }}>
        Round {value} to the nearest {m}! 👆
      </div>
      <RoundLine value={value} m={m} stage={2} />
      <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', opacity: ready ? 1 : 0.5, transition: 'opacity 0.2s' }}>
        {choices.map(c => {
          const isRight = picked === c, isWrong = wrong === c
          return (
            <button key={c} onClick={() => pick(c)} disabled={picked != null || !ready} style={{
              width: 92, height: 84, borderRadius: 22,
              background: isRight ? 'var(--garden-green-soft)' : isWrong ? 'var(--apple-red-soft)' : 'var(--paper)',
              border: `4px solid ${isRight ? 'var(--garden-green)' : isWrong ? 'var(--apple-red)' : 'var(--outline)'}`,
              boxShadow: isRight ? '0 6px 0 var(--garden-green-deep)' : isWrong ? '0 6px 0 var(--apple-red-deep)' : '0 6px 0 #c8ac79',
              fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 34, color: 'var(--ink)',
              cursor: picked != null || !ready ? 'default' : 'pointer',
            }}>{c}</button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Worked example: estimate a sum by rounding ──────────────
export function EstimateWatch({ a, b, intro, outro, onDone }: { a: number; b: number; intro: string; outro: string; onDone: () => void }) {
  const ra = roundTo(a, 10), rb = roundTo(b, 10), est = ra + rb
  const [shown, setShown] = useState(0)
  const [done, setDone] = useState(false)
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return; ran.current = true
    const lines = [intro, `${a} rounds to ${ra}.`, `${b} rounds to ${rb}.`, `So ${a} plus ${b} is about ${est}.`, outro]
    let started = false, finished = false
    const cl: Array<() => void> = []
    const at = (fn: () => void, ms: number) => { const id = window.setTimeout(fn, ms); cl.push(() => window.clearTimeout(id)) }
    const apply = (i: number) => { if (i >= 1 && i <= 3) setShown(i); if (i === 3) setDone(true) }
    const complete = () => { if (finished) return; finished = true; at(onDone, 900) }
    const cancel = speakSeq(lines, { onWord: i => { started = true; apply(i) }, onDone: complete })
    cl.push(cancel)
    at(() => {
      if (started || finished) return
      cancel()
      let t = 0
      for (let k = 1; k <= 3; k++) { const kk = k; at(() => { setShown(kk); if (kk === 3) setDone(true); speak(lines[kk]) }, t); t += 1800 }
      at(() => { speak(outro); complete() }, t)
    }, 1900)
    return () => cl.forEach(f => f())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const Row = ({ n, r, on }: { n: number; r: number; on: boolean }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: on ? 1 : 0.2, transition: 'opacity 0.3s' }}>
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 30, color: 'var(--ink)' }}>{n}</span>
      <span style={{ fontSize: 20, color: 'var(--ink-muted)' }}>→</span>
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 30, color: 'var(--milo-orange)' }}>{r}</span>
    </div>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, position: 'relative' }}>
      {done && <Confetti />}
      <Row n={a} r={ra} on={shown >= 1} />
      <Row n={b} r={rb} on={shown >= 2} />
      <div style={{ height: 56, display: 'flex', alignItems: 'center' }}>
        {done && (
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 26, color: 'var(--garden-green-deep)', background: 'var(--garden-green-soft)', border: '3px solid var(--garden-green)', borderRadius: 50, padding: '8px 22px', animation: 'k_bounceIn 0.45s cubic-bezier(.34,1.56,.64,1)' }}>
            about {est}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Interactive: pick the estimate of a sum ─────────────────
export function EstimatePick({ a, b, choices, intro, outro, onDone }: { a: number; b: number; choices: number[]; intro: string; outro: string; onDone: () => void }) {
  const answer = roundTo(a, 10) + roundTo(b, 10)
  const [picked, setPicked] = useState<number | null>(null)
  const [wrong, setWrong] = useState<number | null>(null)
  const [ready, setReady] = useState(false)
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return; ran.current = true
    speak(intro)
    const id = window.setTimeout(() => setReady(true), 600)
    return () => window.clearTimeout(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  function pick(c: number) {
    if (picked != null || !ready) return
    if (c === answer) { setPicked(c); setWrong(null); speak(outro); window.setTimeout(onDone, 1900) }
    else { setWrong(c); speak(`Not quite. Round each number first, then add.`); window.setTimeout(() => setWrong(null), 1000) }
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: 'var(--milo-orange)', background: 'var(--milo-orange-soft)', borderRadius: 50, padding: '6px 18px', border: '2px solid var(--milo-orange)' }}>
        About how much is {a} + {b}? 👆
      </div>
      <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', opacity: ready ? 1 : 0.5, transition: 'opacity 0.2s' }}>
        {choices.map(c => {
          const isRight = picked === c, isWrong = wrong === c
          return (
            <button key={c} onClick={() => pick(c)} disabled={picked != null || !ready} style={{
              width: 96, height: 84, borderRadius: 22,
              background: isRight ? 'var(--garden-green-soft)' : isWrong ? 'var(--apple-red-soft)' : 'var(--paper)',
              border: `4px solid ${isRight ? 'var(--garden-green)' : isWrong ? 'var(--apple-red)' : 'var(--outline)'}`,
              boxShadow: isRight ? '0 6px 0 var(--garden-green-deep)' : isWrong ? '0 6px 0 var(--apple-red-deep)' : '0 6px 0 #c8ac79',
              fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 32, color: 'var(--ink)',
              cursor: picked != null || !ready ? 'default' : 'pointer',
            }}>about {c}</button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Steps ───────────────────────────────────────────────────
interface Props { childName: string; onLessonComplete: () => void }
function buildSteps(childName: string): LessonStep[] {
  return [
    // Warm-up: greet + what "nearest" means, with a clear round-down example.
    { bubble: `Hi ${childName}! Rounding finds the NEAREST ten. 🎯`, mood: 'happy',
      render: d => <RoundWatch value={34} m={10} intro={`Hi ${childName}! Rounding finds the nearest ten — the closest round number. Let's round thirty-four.`} outro="Thirty-four is closer to thirty!" onDone={d} /> },
    { bubble: 'Closer to the bigger ten? Round up. ⬆️', mood: 'happy',
      render: d => <RoundWatch value={47} m={10} intro="Now forty-seven to the nearest ten." outro="Forty-seven is nearer fifty!" onDone={d} /> },
    { bubble: 'Your turn — round it! 👂', mood: 'thinking',
      render: d => <RoundPick value={68} m={10} choices={[60, 70, 80]} intro="Round sixty-eight to the nearest ten!" outro="Yes! Seventy!" onDone={d} /> },
    { bubble: 'One more — this one rounds down! 👂', mood: 'thinking',
      render: d => <RoundPick value={31} m={10} choices={[20, 30, 40]} intro="Round thirty-one to the nearest ten!" outro="Yes! Thirty!" onDone={d} /> },
    { bubble: 'Exactly halfway? Round UP! ⬆️', mood: 'thinking',
      render: d => <RoundWatch value={45} m={10} intro="Forty-five is exactly halfway. The rule: round up!" outro="Forty-five rounds up to fifty!" onDone={d} /> },
    { bubble: 'Now the nearest HUNDRED! 💯', mood: 'happy',
      render: d => <RoundWatch value={280} m={100} intro="Let's round two hundred eighty to the nearest hundred." outro="It's nearer three hundred!" onDone={d} /> },
    { bubble: 'Hundreds can round down too. ⬇️', mood: 'thinking',
      render: d => <RoundWatch value={640} m={100} intro="Now six hundred forty to the nearest hundred." outro="It's nearer six hundred!" onDone={d} /> },
    { bubble: 'Find the nearest hundred! 👂', mood: 'thinking',
      render: d => <RoundPick value={240} m={100} choices={[200, 300, 400]} intro="Round two hundred forty to the nearest hundred!" outro="Yes! Two hundred!" onDone={d} /> },
    { bubble: 'Halfway hundred — round up! 👂', mood: 'thinking',
      render: d => <RoundPick value={450} m={100} choices={[400, 500, 600]} intro="Round four hundred fifty to the nearest hundred!" outro="Yes! Five hundred!" onDone={d} /> },
    { bubble: 'Estimating uses rounding! ✨', mood: 'happy',
      render: d => <EstimateWatch a={38} b={23} intro="To estimate thirty-eight plus twenty-three, round each first." outro="About sixty — quick and close!" onDone={d} /> },
    { bubble: 'Estimate another sum! ✨', mood: 'thinking',
      render: d => <EstimateWatch a={61} b={28} intro="Estimate sixty-one plus twenty-eight. Round each first." outro="About ninety!" onDone={d} /> },
    { bubble: 'Last one — you estimate! 🏆', mood: 'thinking',
      render: d => <EstimatePick a={52} b={29} choices={[70, 80, 90]} intro="About how much is fifty-two plus twenty-nine? Round each first." outro="Yes! About eighty!" onDone={d} /> },
  ]
}
export default function RoundingLesson({ childName, onLessonComplete }: Props) {
  return (
    <LessonScaffold
      childName={childName}
      onLessonComplete={onLessonComplete}
      steps={buildSteps(childName)}
      finalSpeech={`Great rounding, ${childName}! Now let's practise!`}
    />
  )
}
