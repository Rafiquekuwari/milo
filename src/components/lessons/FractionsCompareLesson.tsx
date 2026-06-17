'use client'
/**
 * FractionsCompareLesson (9–11) — extends unit fractions: non-unit fractions
 * (2/3, 3/4), equivalent fractions (1/2 = 2/4), comparing same-denominator
 * fractions, and adding/subtracting with the same denominator. Fraction bars
 * shade parts. Built on the shared kit. See docs/curriculum-9-11.md.
 */
import React, { useState, useEffect, useRef } from 'react'
import { speak, speakSeq } from '@/lib/useMiloSpeaker'
import { LessonScaffold, Confetti, type LessonStep } from './_kit'

// ─── Fraction names ──────────────────────────────────────────
const NUMW = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']
const DENW: Record<number, [string, string]> = { 2: ['half', 'halves'], 3: ['third', 'thirds'], 4: ['quarter', 'quarters'], 5: ['fifth', 'fifths'], 6: ['sixth', 'sixths'], 8: ['eighth', 'eighths'], 10: ['tenth', 'tenths'], 12: ['twelfth', 'twelfths'] }
export function fracName(num: number, den: number): string {
  const dw = DENW[den] ?? [`${den}th`, `${den}ths`]
  return `${NUMW[num] ?? num} ${num === 1 ? dw[0] : dw[1]}`
}

// ─── Fraction bar ────────────────────────────────────────────
export function FractionBar({ num, den, shade = 'var(--milo-orange)', shade2, n2, width = 300 }: { num: number; den: number; shade?: string; shade2?: string; n2?: number; width?: number }) {
  return (
    <div style={{ display: 'flex', width, maxWidth: '86vw', height: 52, border: '3px solid var(--outline)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 3px 0 rgba(61,37,22,.1)' }}>
      {Array.from({ length: den }).map((_, i) => {
        const inFirst = i < num
        const inSecond = shade2 != null && n2 != null && i >= num && i < num + n2
        return <div key={i} style={{ flex: 1, borderRight: i < den - 1 ? '2px solid var(--outline)' : 'none', background: inFirst ? shade : inSecond ? shade2 : 'var(--paper)', transition: 'background 0.3s' }} />
      })}
    </div>
  )
}

// ─── Worked example: name a (non-unit) fraction ──────────────
export function FractionWatch({ num, den, intro, outro, onDone }: { num: number; den: number; intro: string; outro: string; onDone: () => void }) {
  const [shaded, setShaded] = useState(0)
  const [done, setDone] = useState(false)
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return; ran.current = true
    const lines = [intro, ...Array.from({ length: num }, (_, i) => String(i + 1)), `That's ${fracName(num, den)}!`, outro]
    let started = false, finished = false
    const cl: Array<() => void> = []
    const at = (fn: () => void, ms: number) => { const id = window.setTimeout(fn, ms); cl.push(() => window.clearTimeout(id)) }
    const apply = (i: number) => { if (i >= 1 && i <= num) setShaded(i); if (i === num + 1) setDone(true) }
    const complete = () => { if (finished) return; finished = true; at(onDone, 900) }
    const cancel = speakSeq(lines, { onWord: i => { started = true; apply(i) }, onDone: complete })
    cl.push(cancel)
    at(() => { if (started || finished) return; cancel(); let t = 0; for (let k = 1; k <= num; k++) { const kk = k; at(() => { setShaded(kk); speak(String(kk)) }, t); t += 800 } at(() => { setDone(true); speak(`That's ${fracName(num, den)}!`) }, t); t += 1700; at(() => { speak(outro); complete() }, t) }, 1900)
    return () => cl.forEach(f => f())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, position: 'relative' }}>
      {done && <Confetti />}
      <FractionBar num={shaded} den={den} />
      <div style={{ height: 50, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 40, color: 'var(--milo-orange)' }}>{num}/{den}</div>
        {done && <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, color: 'var(--garden-green-deep)' }}>= {fracName(num, den)}</div>}
      </div>
    </div>
  )
}

// ─── Worked example: equivalent fractions ────────────────────
export function EquivWatch({ a, b, intro, outro, onDone }: { a: [number, number]; b: [number, number]; intro: string; outro: string; onDone: () => void }) {
  const [stage, setStage] = useState(0)
  const [done, setDone] = useState(false)
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return; ran.current = true
    const lines = [intro, `${fracName(a[0], a[1])} and ${fracName(b[0], b[1])} cover the same amount.`, `So ${a[0]} over ${a[1]} equals ${b[0]} over ${b[1]}!`, outro]
    let started = false, finished = false
    const cl: Array<() => void> = []
    const at = (fn: () => void, ms: number) => { const id = window.setTimeout(fn, ms); cl.push(() => window.clearTimeout(id)) }
    const apply = (i: number) => { if (i === 1) setStage(1); if (i === 2) { setStage(2); setDone(true) } }
    const complete = () => { if (finished) return; finished = true; at(onDone, 900) }
    const cancel = speakSeq(lines, { onWord: i => { started = true; apply(i) }, onDone: complete })
    cl.push(cancel)
    at(() => { if (started || finished) return; cancel(); let t = 0; at(() => { setStage(1); speak(lines[1]) }, t); t += 2400; at(() => { setStage(2); setDone(true); speak(lines[2]) }, t); t += 2400; at(() => { speak(outro); complete() }, t) }, 1900)
    return () => cl.forEach(f => f())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, position: 'relative' }}>
      {done && <Confetti />}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 24, color: 'var(--milo-orange)', width: 52 }}>{a[0]}/{a[1]}</span><FractionBar num={a[0]} den={a[1]} width={240} /></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: stage >= 1 ? 1 : 0.2, transition: 'opacity 0.3s' }}><span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 24, color: 'var(--sky-blue-deep)', width: 52 }}>{b[0]}/{b[1]}</span><FractionBar num={b[0]} den={b[1]} shade="var(--sky-blue)" width={240} /></div>
      <div style={{ height: 44, display: 'flex', alignItems: 'center' }}>
        {done && <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 24, color: 'var(--garden-green-deep)', background: 'var(--garden-green-soft)', border: '3px solid var(--garden-green)', borderRadius: 50, padding: '6px 20px', animation: 'k_bounceIn 0.45s cubic-bezier(.34,1.56,.64,1)' }}>{a[0]}/{a[1]} = {b[0]}/{b[1]}</div>}
      </div>
    </div>
  )
}

// ─── Worked example: compare two fractions ───────────────────
export function CompareWatch({ a, b, intro, outro, onDone }: { a: [number, number]; b: [number, number]; intro: string; outro: string; onDone: () => void }) {
  const va = a[0] / a[1], vb = b[0] / b[1]
  const sym = va > vb ? '>' : va < vb ? '<' : '='
  const word = va > vb ? 'greater than' : va < vb ? 'less than' : 'equal to'
  const [stage, setStage] = useState(0)
  const [done, setDone] = useState(false)
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return; ran.current = true
    const lines = [intro, `Compare the shaded parts.`, `${fracName(a[0], a[1])} is ${word} ${fracName(b[0], b[1])}.`, outro]
    let started = false, finished = false
    const cl: Array<() => void> = []
    const at = (fn: () => void, ms: number) => { const id = window.setTimeout(fn, ms); cl.push(() => window.clearTimeout(id)) }
    const apply = (i: number) => { if (i === 1) setStage(1); if (i === 2) { setStage(2); setDone(true) } }
    const complete = () => { if (finished) return; finished = true; at(onDone, 900) }
    const cancel = speakSeq(lines, { onWord: i => { started = true; apply(i) }, onDone: complete })
    cl.push(cancel)
    at(() => { if (started || finished) return; cancel(); let t = 0; at(() => { setStage(1); speak(lines[1]) }, t); t += 2200; at(() => { setStage(2); setDone(true); speak(lines[2]) }, t); t += 2400; at(() => { speak(outro); complete() }, t) }, 1900)
    return () => cl.forEach(f => f())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, position: 'relative' }}>
      {done && <Confetti />}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 24, color: 'var(--milo-orange)', width: 52 }}>{a[0]}/{a[1]}</span><FractionBar num={a[0]} den={a[1]} width={240} /></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 24, color: 'var(--sky-blue-deep)', width: 52 }}>{b[0]}/{b[1]}</span><FractionBar num={b[0]} den={b[1]} shade="var(--sky-blue)" width={240} /></div>
      <div style={{ height: 50, display: 'flex', alignItems: 'center' }}>
        {done && <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 28, color: 'var(--garden-green-deep)', background: 'var(--garden-green-soft)', border: '3px solid var(--garden-green)', borderRadius: 50, padding: '6px 22px', animation: 'k_bounceIn 0.45s cubic-bezier(.34,1.56,.64,1)' }}>{a[0]}/{a[1]} {sym} {b[0]}/{b[1]}</div>}
      </div>
    </div>
  )
}

// ─── Worked example: add / subtract with same denominator ────
export function FracOpWatch({ op, n1, n2, den, intro, outro, onDone }: { op: '+' | '-'; n1: number; n2: number; den: number; intro: string; outro: string; onDone: () => void }) {
  const result = op === '+' ? n1 + n2 : n1 - n2
  const [stage, setStage] = useState(0)
  const [done, setDone] = useState(false)
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return; ran.current = true
    const lines = [intro, op === '+' ? `Shade ${n1}, then ${n2} more.` : `Shade ${n1}, then take ${n2} away.`, `That makes ${result} over ${den}!`, outro]
    let started = false, finished = false
    const cl: Array<() => void> = []
    const at = (fn: () => void, ms: number) => { const id = window.setTimeout(fn, ms); cl.push(() => window.clearTimeout(id)) }
    const apply = (i: number) => { if (i === 1) setStage(1); if (i === 2) { setStage(2); setDone(true) } }
    const complete = () => { if (finished) return; finished = true; at(onDone, 900) }
    const cancel = speakSeq(lines, { onWord: i => { started = true; apply(i) }, onDone: complete })
    cl.push(cancel)
    at(() => { if (started || finished) return; cancel(); let t = 0; at(() => { setStage(1); speak(lines[1]) }, t); t += 2400; at(() => { setStage(2); setDone(true); speak(lines[2]) }, t); t += 2200; at(() => { speak(outro); complete() }, t) }, 1900)
    return () => cl.forEach(f => f())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // Bar: for add, base n1 + second n2 (different colour at stage2); for sub, base shows n1 then result.
  const barNum = op === '+' ? (stage >= 1 ? n1 : 0) : (stage >= 2 ? result : stage >= 1 ? n1 : 0)
  const barN2 = op === '+' ? (stage >= 2 ? n2 : 0) : 0
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, position: 'relative' }}>
      {done && <Confetti />}
      <FractionBar num={barNum} den={den} shade2="var(--garden-green)" n2={barN2} />
      <div style={{ height: 56, display: 'flex', alignItems: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 30, color: 'var(--ink)' }}>
          {n1}/{den} {op} {n2}/{den}{done ? <span style={{ color: 'var(--garden-green-deep)' }}> = {result}/{den}</span> : ' = ?'}
        </div>
      </div>
    </div>
  )
}

// ─── Generic interactive pick ────────────────────────────────
export function FracPick({ prompt, options, answer, visual, intro, outro, onDone }: { prompt: string; options: string[]; answer: string; visual?: React.ReactNode; intro: string; outro: string; onDone: () => void }) {
  const [picked, setPicked] = useState<string | null>(null)
  const [wrong, setWrong] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return; ran.current = true
    speak(intro)
    const id = window.setTimeout(() => setReady(true), 600)
    return () => window.clearTimeout(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  function pick(c: string) {
    if (picked != null || !ready) return
    if (c === answer) { setPicked(c); setWrong(null); speak(outro); window.setTimeout(onDone, 1900) }
    else { setWrong(c); speak('Not quite. Look at the bars again!'); window.setTimeout(() => setWrong(null), 1000) }
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      {visual}
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: 'var(--milo-orange)', background: 'var(--milo-orange-soft)', borderRadius: 50, padding: '6px 18px', border: '2px solid var(--milo-orange)', textAlign: 'center' }}>{prompt}</div>
      <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', opacity: ready ? 1 : 0.5, transition: 'opacity 0.2s' }}>
        {options.map(c => {
          const isRight = picked === c, isWrong = wrong === c
          return (
            <button key={c} onClick={() => pick(c)} disabled={picked != null || !ready} style={{
              minWidth: 92, height: 78, padding: '0 16px', borderRadius: 20,
              background: isRight ? 'var(--garden-green-soft)' : isWrong ? 'var(--apple-red-soft)' : 'var(--paper)',
              border: `4px solid ${isRight ? 'var(--garden-green)' : isWrong ? 'var(--apple-red)' : 'var(--outline)'}`,
              boxShadow: isRight ? '0 6px 0 var(--garden-green-deep)' : isWrong ? '0 6px 0 var(--apple-red-deep)' : '0 6px 0 #c8ac79',
              fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 26, color: 'var(--ink)',
              cursor: picked != null || !ready ? 'default' : 'pointer',
            }}>{c}</button>
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
    // ── Non-unit fractions ──
    { bubble: `Hi ${childName}! A fraction can shade MANY parts. 🍫`, mood: 'happy',
      render: d => <FractionWatch num={2} den={3} intro={`Hi ${childName}! Shade two of the three parts.`} outro="Two thirds!" onDone={d} /> },
    { bubble: 'Shade three of four! 🍫', mood: 'thinking',
      render: d => <FractionWatch num={3} den={4} intro="Now three out of four parts." outro="Three quarters!" onDone={d} /> },
    { bubble: 'Two fifths! 🍫', mood: 'thinking',
      render: d => <FractionWatch num={2} den={5} intro="Shade two of the five parts." outro="Two fifths!" onDone={d} /> },
    { bubble: 'What fraction is shaded? 👂', mood: 'thinking',
      render: d => <FracPick prompt="What fraction is shaded?" options={['1/4', '3/4', '4/3']} answer="3/4" visual={<FractionBar num={3} den={4} />} intro="What fraction is shaded?" outro="Yes! Three quarters!" onDone={d} /> },
    // ── Equivalent fractions ──
    { bubble: 'Different names, same amount! 🟰', mood: 'happy',
      render: d => <EquivWatch a={[1, 2]} b={[2, 4]} intro="One half and two quarters — watch the bars." outro="They're equivalent!" onDone={d} /> },
    { bubble: 'Another equal pair! 🟰', mood: 'thinking',
      render: d => <EquivWatch a={[1, 3]} b={[2, 6]} intro="One third and two sixths." outro="Equivalent again!" onDone={d} /> },
    { bubble: 'Which equals 1/2? 👂', mood: 'thinking',
      render: d => <FracPick prompt="Which equals 1/2?" options={['1/3', '2/4', '3/4']} answer="2/4" visual={<FractionBar num={1} den={2} />} intro="Which fraction equals one half?" outro="Yes! Two quarters!" onDone={d} /> },
    // ── Comparing (same denominator) ──
    { bubble: 'More parts shaded = bigger! ⚖️', mood: 'happy',
      render: d => <CompareWatch a={[3, 5]} b={[2, 5]} intro="Compare three fifths and two fifths." outro="Three fifths is bigger!" onDone={d} /> },
    { bubble: 'Compare these! ⚖️', mood: 'thinking',
      render: d => <CompareWatch a={[1, 4]} b={[3, 4]} intro="Compare one quarter and three quarters." outro="One quarter is smaller!" onDone={d} /> },
    { bubble: 'Which is bigger? 👂', mood: 'thinking',
      render: d => <FracPick prompt="Which is bigger?" options={['2/6', '5/6']} answer="5/6"
        visual={<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><FractionBar num={2} den={6} width={240} /><FractionBar num={5} den={6} shade="var(--sky-blue)" width={240} /></div>}
        intro="Which is bigger — two sixths or five sixths?" outro="Yes! Five sixths!" onDone={d} /> },
    // ── Add / subtract same denominator ──
    { bubble: 'Add the top numbers! ➕', mood: 'happy',
      render: d => <FracOpWatch op="+" n1={1} n2={2} den={5} intro="One fifth plus two fifths. The bottom stays the same." outro="Three fifths!" onDone={d} /> },
    { bubble: 'Add again! ➕', mood: 'thinking',
      render: d => <FracOpWatch op="+" n1={2} n2={1} den={4} intro="Two quarters plus one quarter." outro="Three quarters!" onDone={d} /> },
    { bubble: 'Take some away! ➖', mood: 'thinking',
      render: d => <FracOpWatch op="-" n1={4} n2={1} den={5} intro="Four fifths take away one fifth." outro="Three fifths!" onDone={d} /> },
    { bubble: 'Last one — add them! 👂', mood: 'thinking',
      render: d => <FracPick prompt="1/4 + 2/4 = ?" options={['3/8', '2/4', '3/4']} answer="3/4" intro="What is one quarter plus two quarters?" outro="Yes! Three quarters! The bottom stays four!" onDone={d} /> },
  ]
}
export default function FractionsCompareLesson({ childName, onLessonComplete }: Props) {
  return (
    <LessonScaffold
      childName={childName}
      onLessonComplete={onLessonComplete}
      steps={buildSteps(childName)}
      finalSpeech={`Wonderful fractions, ${childName}! Now let's practise!`}
    />
  )
}
