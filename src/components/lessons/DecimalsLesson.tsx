'use client'
/**
 * DecimalsLesson (9–11) — tenths and hundredths, decimals as fractions, on a
 * number line, and comparing. A 10-part bar shows tenths, a 10×10 grid shows
 * hundredths, and a 0–1 line places a decimal. Built on the shared kit.
 * See docs/curriculum-9-11.md.
 */
import React, { useState, useEffect, useRef } from 'react'
import { speak, speakSeq } from '@/lib/useMiloSpeaker'
import { LessonScaffold, Confetti, type LessonStep } from './_kit'
import { FractionBar } from './FractionsCompareLesson'

const tenthStr = (t: number) => (t / 10).toFixed(1)         // 3 → "0.3"
const hundStr = (n: number) => (n / 100).toFixed(2)         // 7 → "0.07"

// ─── 100-grid for hundredths ─────────────────────────────────
export function HundredGrid({ n, shade = 'var(--milo-orange)' }: { n: number; shade?: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10,1fr)', gap: 1, width: 200, height: 200, maxWidth: '70vw', maxHeight: '70vw', border: '3px solid var(--outline)', borderRadius: 8, overflow: 'hidden', background: 'var(--outline)' }}>
      {Array.from({ length: 100 }).map((_, i) => <div key={i} style={{ background: i < n ? shade : 'var(--paper)', transition: 'background 0.3s' }} />)}
    </div>
  )
}

// ─── 0–1 number line with a decimal marker ───────────────────
export function DecimalLine({ value, show }: { value: number; show: boolean }) {
  return (
    <div style={{ width: 320, maxWidth: '88vw', padding: '30px 12px 26px', position: 'relative' }}>
      <div style={{ position: 'relative', height: 6, background: 'var(--outline)', borderRadius: 3 }}>
        {Array.from({ length: 11 }).map((_, i) => (
          <div key={i} style={{ position: 'absolute', left: `${i * 10}%`, top: -5, transform: 'translateX(-50%)', width: 2, height: 16, background: i === 0 || i === 10 ? 'var(--outline)' : 'var(--ink-muted)' }} />
        ))}
        <div style={{ position: 'absolute', left: '0%', top: 18, transform: 'translateX(-50%)', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 16 }}>0</div>
        <div style={{ position: 'absolute', left: '100%', top: 18, transform: 'translateX(-50%)', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 16 }}>1</div>
        <div style={{ position: 'absolute', left: `${value * 100}%`, top: -18, transform: 'translateX(-50%)', opacity: show ? 1 : 0, transition: 'opacity 0.3s, left 0.5s ease' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, color: 'var(--milo-orange)' }}>{value.toFixed(1)}</div>
          <div style={{ width: 0, height: 0, margin: '2px auto 0', borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderTop: '10px solid var(--milo-orange)' }} />
        </div>
      </div>
    </div>
  )
}

// ─── Worked example: tenths on a bar ─────────────────────────
export function TenthsWatch({ tenths, intro, outro, onDone }: { tenths: number; intro: string; outro: string; onDone: () => void }) {
  const [shaded, setShaded] = useState(0)
  const [done, setDone] = useState(false)
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return; ran.current = true
    const lines = [intro, ...Array.from({ length: tenths }, (_, i) => String(i + 1)), `That's ${tenthStr(tenths)} — ${tenths} tenths!`, outro]
    let started = false, finished = false
    const cl: Array<() => void> = []
    const at = (fn: () => void, ms: number) => { const id = window.setTimeout(fn, ms); cl.push(() => window.clearTimeout(id)) }
    const apply = (i: number) => { if (i >= 1 && i <= tenths) setShaded(i); if (i === tenths + 1) setDone(true) }
    const complete = () => { if (finished) return; finished = true; at(onDone, 900) }
    const cancel = speakSeq(lines, { onWord: i => { started = true; apply(i) }, onDone: complete })
    cl.push(cancel)
    at(() => { if (started || finished) return; cancel(); let t = 0; for (let k = 1; k <= tenths; k++) { const kk = k; at(() => { setShaded(kk); speak(String(kk)) }, t); t += 700 } at(() => { setDone(true); speak(`That's ${tenthStr(tenths)} — ${tenths} tenths!`) }, t); t += 1700; at(() => { speak(outro); complete() }, t) }, 1900)
    return () => cl.forEach(f => f())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, position: 'relative' }}>
      {done && <Confetti />}
      <FractionBar num={shaded} den={10} width={320} />
      <div style={{ height: 52, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 44, color: 'var(--milo-orange)' }}>{tenthStr(tenths)}</div>
        {done && <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, color: 'var(--garden-green-deep)' }}>= {tenths}/10</div>}
      </div>
    </div>
  )
}

// ─── Worked example: tenths on the number line ───────────────
export function DecimalLineWatch({ value, intro, outro, onDone }: { value: number; intro: string; outro: string; onDone: () => void }) {
  const tenths = Math.round(value * 10)
  const [show, setShow] = useState(false)
  const [done, setDone] = useState(false)
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return; ran.current = true
    const lines = [intro, `${value.toFixed(1)} is ${tenths} tenths from zero. Here it is!`, outro]
    let started = false, finished = false
    const cl: Array<() => void> = []
    const at = (fn: () => void, ms: number) => { const id = window.setTimeout(fn, ms); cl.push(() => window.clearTimeout(id)) }
    const apply = (i: number) => { if (i === 1) { setShow(true); setDone(true) } }
    const complete = () => { if (finished) return; finished = true; at(onDone, 900) }
    const cancel = speakSeq(lines, { onWord: i => { started = true; apply(i) }, onDone: complete })
    cl.push(cancel)
    at(() => { if (started || finished) return; cancel(); let t = 0; at(() => { setShow(true); setDone(true); speak(lines[1]) }, t); t += 2600; at(() => { speak(outro); complete() }, t) }, 1900)
    return () => cl.forEach(f => f())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, position: 'relative' }}>
      {done && <Confetti />}
      <DecimalLine value={value} show={show} />
    </div>
  )
}

// ─── Worked example: hundredths on a 100-grid ────────────────
export function HundredthsWatch({ n, intro, outro, onDone }: { n: number; intro: string; outro: string; onDone: () => void }) {
  const [stage, setStage] = useState(0)
  const [done, setDone] = useState(false)
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return; ran.current = true
    const lines = [intro, `${n} out of one hundred squares.`, `That's ${hundStr(n)} — ${n} hundredths!`, outro]
    let started = false, finished = false
    const cl: Array<() => void> = []
    const at = (fn: () => void, ms: number) => { const id = window.setTimeout(fn, ms); cl.push(() => window.clearTimeout(id)) }
    const apply = (i: number) => { if (i === 1) setStage(1); if (i === 2) { setStage(2); setDone(true) } }
    const complete = () => { if (finished) return; finished = true; at(onDone, 900) }
    const cancel = speakSeq(lines, { onWord: i => { started = true; apply(i) }, onDone: complete })
    cl.push(cancel)
    at(() => { if (started || finished) return; cancel(); let t = 0; at(() => { setStage(1); speak(lines[1]) }, t); t += 2200; at(() => { setStage(2); setDone(true); speak(lines[2]) }, t); t += 2200; at(() => { speak(outro); complete() }, t) }, 1900)
    return () => cl.forEach(f => f())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, position: 'relative' }}>
      {done && <Confetti />}
      <HundredGrid n={stage >= 1 ? n : 0} />
      <div style={{ height: 50, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 40, color: 'var(--milo-orange)' }}>{hundStr(n)}</div>
        {done && <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, color: 'var(--garden-green-deep)' }}>= {n}/100</div>}
      </div>
    </div>
  )
}

// ─── Worked example: compare two decimals ────────────────────
export function CompareDecWatch({ a, b, intro, outro, onDone }: { a: number; b: number; intro: string; outro: string; onDone: () => void }) {
  const sym = a > b ? '>' : a < b ? '<' : '='
  const word = a > b ? 'greater than' : a < b ? 'less than' : 'equal to'
  const [stage, setStage] = useState(0)
  const [done, setDone] = useState(false)
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return; ran.current = true
    const lines = [intro, 'Compare the shaded bars.', `${a.toFixed(1)} is ${word} ${b.toFixed(1)}.`, outro]
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 24, color: 'var(--milo-orange)', width: 48 }}>{a.toFixed(1)}</span><FractionBar num={Math.round(a * 10)} den={10} width={240} /></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 24, color: 'var(--sky-blue-deep)', width: 48 }}>{b.toFixed(1)}</span><FractionBar num={Math.round(b * 10)} den={10} shade="var(--sky-blue)" width={240} /></div>
      <div style={{ height: 50, display: 'flex', alignItems: 'center' }}>
        {done && <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 28, color: 'var(--garden-green-deep)', background: 'var(--garden-green-soft)', border: '3px solid var(--garden-green)', borderRadius: 50, padding: '6px 22px', animation: 'k_bounceIn 0.45s cubic-bezier(.34,1.56,.64,1)' }}>{a.toFixed(1)} {sym} {b.toFixed(1)}</div>}
      </div>
    </div>
  )
}

// ─── Generic interactive pick ────────────────────────────────
export function DecPick({ prompt, options, answer, visual, intro, outro, onDone }: { prompt: string; options: string[]; answer: string; visual?: React.ReactNode; intro: string; outro: string; onDone: () => void }) {
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
    else { setWrong(c); speak('Not quite. Look again!'); window.setTimeout(() => setWrong(null), 1000) }
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
    // ── Tenths ──
    { bubble: `Hi ${childName}! A decimal splits one into ten parts. 🔟`, mood: 'happy',
      render: d => <TenthsWatch tenths={3} intro={`Hi ${childName}! Shade three of ten parts.`} outro="Zero point three!" onDone={d} /> },
    { bubble: 'Seven tenths! 🔟', mood: 'thinking',
      render: d => <TenthsWatch tenths={7} intro="Now shade seven parts." outro="Zero point seven!" onDone={d} /> },
    { bubble: 'Half is 0.5! ½', mood: 'happy',
      render: d => <TenthsWatch tenths={5} intro="Five tenths." outro="Zero point five is the same as one half!" onDone={d} /> },
    { bubble: 'What decimal is shaded? 👂', mood: 'thinking',
      render: d => <DecPick prompt="What decimal is shaded?" options={['0.04', '0.4', '4.0']} answer="0.4" visual={<FractionBar num={4} den={10} width={300} />} intro="What decimal is shaded?" outro="Yes! Zero point four!" onDone={d} /> },
    // ── On the number line ──
    { bubble: 'Decimals live on the number line! 📏', mood: 'happy',
      render: d => <DecimalLineWatch value={0.4} intro="Where does zero point four go between zero and one?" outro="Four tenths along!" onDone={d} /> },
    { bubble: 'Further along! 📏', mood: 'thinking',
      render: d => <DecimalLineWatch value={0.8} intro="Now zero point eight." outro="Eight tenths — nearly one!" onDone={d} /> },
    // ── Hundredths ──
    { bubble: 'Split into ONE HUNDRED parts! 💯', mood: 'happy',
      render: d => <HundredthsWatch n={25} intro="Shade twenty-five of the hundred squares." outro="Zero point two five — twenty-five hundredths!" onDone={d} /> },
    { bubble: 'A tiny decimal! 🔬', mood: 'thinking',
      render: d => <HundredthsWatch n={7} intro="Just seven squares of a hundred." outro="Zero point zero seven — seven hundredths!" onDone={d} /> },
    { bubble: 'Hundredths can equal tenths! 🔁', mood: 'thinking',
      render: d => <HundredthsWatch n={60} intro="Sixty out of a hundred." outro="Zero point six zero is the same as zero point six!" onDone={d} /> },
    { bubble: 'What is shaded? 👂', mood: 'thinking',
      render: d => <DecPick prompt="What decimal is shaded?" options={['0.23', '0.023', '2.3']} answer="0.23" visual={<HundredGrid n={23} />} intro="What decimal is shaded?" outro="Yes! Zero point two three!" onDone={d} /> },
    // ── Compare ──
    { bubble: 'Compare decimals! ⚖️', mood: 'happy',
      render: d => <CompareDecWatch a={0.3} b={0.5} intro="Which is bigger, zero point three or zero point five?" outro="Zero point five is bigger!" onDone={d} /> },
    { bubble: 'Compare again! ⚖️', mood: 'thinking',
      render: d => <CompareDecWatch a={0.6} b={0.2} intro="Zero point six and zero point two." outro="Zero point six is bigger!" onDone={d} /> },
    { bubble: 'Which is bigger? 👂', mood: 'thinking',
      render: d => <DecPick prompt="Which is bigger?" options={['0.4', '0.7']} answer="0.7" intro="Which is bigger — zero point four or zero point seven?" outro="Yes! Zero point seven!" onDone={d} /> },
    { bubble: 'Last one! 7 tenths as a decimal? 👂', mood: 'thinking',
      render: d => <DecPick prompt="Which decimal is 7 tenths?" options={['0.07', '0.7', '7.0']} answer="0.7" intro="Which decimal equals seven tenths?" outro="Yes! Zero point seven!" onDone={d} /> },
  ]
}
export default function DecimalsLesson({ childName, onLessonComplete }: Props) {
  return (
    <LessonScaffold
      childName={childName}
      onLessonComplete={onLessonComplete}
      steps={buildSteps(childName)}
      finalSpeech={`Great work with decimals, ${childName}! Now let's practise!`}
    />
  )
}
