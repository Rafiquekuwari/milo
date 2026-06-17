'use client'
/**
 * MeasureUnitsLesson (9–11) — metric units for length (mm/cm/m/km), mass (g/kg)
 * and capacity (ml/l), choosing a sensible unit, and simple conversions
 * (×/÷ by 10, 100, 1000). Built on the shared kit. See docs/curriculum-9-11.md.
 */
import React, { useState, useEffect, useRef } from 'react'
import { speak, speakSeq } from '@/lib/useMiloSpeaker'
import { LessonScaffold, Confetti, type LessonStep } from './_kit'

const UW: Record<string, string> = { m: 'metre', cm: 'centimetre', mm: 'millimetre', km: 'kilometre', kg: 'kilogram', g: 'gram', l: 'litre', ml: 'millilitre' }
export function unitName(sym: string, n: number): string { const w = UW[sym] ?? sym; return n === 1 ? w : `${w}s` }

// ─── Worked example: a unit-conversion FACT (1 big = factor small) ──
export function UnitFactWatch({ emoji, big, factor, small, intro, outro, onDone }: { emoji: string; big: string; factor: number; small: string; intro: string; outro: string; onDone: () => void }) {
  const [show, setShow] = useState(false)
  const [done, setDone] = useState(false)
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return; ran.current = true
    const lines = [intro, `One ${unitName(big, 1)} equals ${factor} ${unitName(small, factor)}.`, outro]
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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, position: 'relative' }}>
      {done && <Confetti />}
      <div style={{ fontSize: 60 }}>{emoji}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 32, color: 'var(--ink)' }}>
        <span style={{ color: 'var(--milo-orange)' }}>1 {big}</span>
        <span style={{ opacity: show ? 1 : 0.15, transition: 'opacity 0.3s' }}>=</span>
        <span style={{ color: 'var(--garden-green-deep)', opacity: show ? 1 : 0.15, transition: 'opacity 0.3s' }}>{factor} {small}</span>
      </div>
    </div>
  )
}

// ─── Worked example: convert a value (× or ÷) ────────────────
export function ConvertWatch({ value, from, factor, op, to, intro, outro, onDone }: { value: number; from: string; factor: number; op: '×' | '÷'; to: string; intro: string; outro: string; onDone: () => void }) {
  const result = op === '×' ? value * factor : value / factor
  const [show, setShow] = useState(false)
  const [done, setDone] = useState(false)
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return; ran.current = true
    const lines = [intro, `${value} ${unitName(from, value)} ${op === '×' ? 'times' : 'divided by'} ${factor} is ${result} ${unitName(to, result)}!`, outro]
    let started = false, finished = false
    const cl: Array<() => void> = []
    const at = (fn: () => void, ms: number) => { const id = window.setTimeout(fn, ms); cl.push(() => window.clearTimeout(id)) }
    const apply = (i: number) => { if (i === 1) { setShow(true); setDone(true) } }
    const complete = () => { if (finished) return; finished = true; at(onDone, 900) }
    const cancel = speakSeq(lines, { onWord: i => { started = true; apply(i) }, onDone: complete })
    cl.push(cancel)
    at(() => { if (started || finished) return; cancel(); let t = 0; at(() => { setShow(true); setDone(true); speak(lines[1]) }, t); t += 2800; at(() => { speak(outro); complete() }, t) }, 1900)
    return () => cl.forEach(f => f())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, position: 'relative' }}>
      {done && <Confetti />}
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 30, color: 'var(--ink)' }}>{value} {from}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: 'var(--sky-blue-deep)', opacity: show ? 1 : 0.2, transition: 'opacity 0.3s' }}>{op} {factor}</div>
      <div style={{ height: 50, display: 'flex', alignItems: 'center' }}>
        {done && <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 30, color: 'var(--garden-green-deep)', background: 'var(--garden-green-soft)', border: '3px solid var(--garden-green)', borderRadius: 50, padding: '8px 24px', animation: 'k_bounceIn 0.45s cubic-bezier(.34,1.56,.64,1)' }}>= {result} {to}</div>}
      </div>
    </div>
  )
}

// ─── Generic interactive pick ────────────────────────────────
export function MeasurePick({ prompt, options, answer, visual, intro, outro, onDone }: { prompt: string; options: string[]; answer: string; visual?: React.ReactNode; intro: string; outro: string; onDone: () => void }) {
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
    else { setWrong(c); speak('Not quite. Try again!'); window.setTimeout(() => setWrong(null), 1000) }
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
              minWidth: 92, height: 78, padding: '0 18px', borderRadius: 20,
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
    // ── Length: facts ──
    { bubble: `Hi ${childName}! We measure length with metres. 📏`, mood: 'happy',
      render: d => <UnitFactWatch emoji="📏" big="m" factor={100} small="cm" intro={`Hi ${childName}! How many centimetres are in one metre?`} outro="One metre is a hundred centimetres!" onDone={d} /> },
    { bubble: 'Smaller still — millimetres! 📏', mood: 'thinking',
      render: d => <UnitFactWatch emoji="📐" big="cm" factor={10} small="mm" intro="How many millimetres in one centimetre?" outro="Ten millimetres make a centimetre!" onDone={d} /> },
    { bubble: 'Bigger — kilometres! 🛣️', mood: 'thinking',
      render: d => <UnitFactWatch emoji="🛣️" big="km" factor={1000} small="m" intro="How many metres in one kilometre?" outro="One kilometre is a thousand metres!" onDone={d} /> },
    // ── Length: conversions ──
    { bubble: 'Convert metres to centimetres! 🔁', mood: 'thinking',
      render: d => <ConvertWatch value={3} from="m" factor={100} op="×" to="cm" intro="Three metres — how many centimetres? Times one hundred." outro="Three hundred centimetres!" onDone={d} /> },
    { bubble: 'Another one! 🔁', mood: 'thinking',
      render: d => <ConvertWatch value={4} from="m" factor={100} op="×" to="cm" intro="Four metres to centimetres." outro="Four hundred centimetres!" onDone={d} /> },
    { bubble: 'Centimetres to millimetres! 🔁', mood: 'thinking',
      render: d => <ConvertWatch value={7} from="cm" factor={10} op="×" to="mm" intro="Seven centimetres — times ten." outro="Seventy millimetres!" onDone={d} /> },
    { bubble: 'Kilometres to metres! 🔁', mood: 'thinking',
      render: d => <ConvertWatch value={5} from="km" factor={1000} op="×" to="m" intro="Five kilometres — times a thousand." outro="Five thousand metres!" onDone={d} /> },
    // ── Length: choose the unit ──
    { bubble: 'Pick the sensible unit! 👂', mood: 'thinking',
      render: d => <MeasurePick prompt="Which unit measures a pencil?" options={['mm', 'cm', 'km']} answer="cm" visual={<div style={{ fontSize: 60 }}>✏️</div>} intro="Which unit measures a pencil?" outro="Yes! Centimetres!" onDone={d} /> },
    { bubble: 'And this one? 👂', mood: 'thinking',
      render: d => <MeasurePick prompt="Which unit measures a long car trip?" options={['cm', 'm', 'km']} answer="km" visual={<div style={{ fontSize: 60 }}>🚗</div>} intro="Which unit measures a long car trip?" outro="Yes! Kilometres!" onDone={d} /> },
    // ── Mass ──
    { bubble: 'Mass is measured in grams! ⚖️', mood: 'happy',
      render: d => <UnitFactWatch emoji="⚖️" big="kg" factor={1000} small="g" intro="How many grams in one kilogram?" outro="One kilogram is a thousand grams!" onDone={d} /> },
    { bubble: 'Convert kilograms to grams! 🔁', mood: 'thinking',
      render: d => <ConvertWatch value={2} from="kg" factor={1000} op="×" to="g" intro="Two kilograms — how many grams? Times a thousand." outro="Two thousand grams!" onDone={d} /> },
    { bubble: 'Another mass conversion! 🔁', mood: 'thinking',
      render: d => <ConvertWatch value={3} from="kg" factor={1000} op="×" to="g" intro="Three kilograms to grams." outro="Three thousand grams!" onDone={d} /> },
    { bubble: 'Grams back to kilograms! 🔁', mood: 'thinking',
      render: d => <ConvertWatch value={4000} from="g" factor={1000} op="÷" to="kg" intro="Four thousand grams — divide by a thousand." outro="Four kilograms!" onDone={d} /> },
    { bubble: 'Pick the unit for mass! 👂', mood: 'thinking',
      render: d => <MeasurePick prompt="Which unit measures a watermelon?" options={['g', 'kg', 'ml']} answer="kg" visual={<div style={{ fontSize: 60 }}>🍉</div>} intro="Which unit measures a watermelon?" outro="Yes! Kilograms!" onDone={d} /> },
    { bubble: 'And a tiny feather? 👂', mood: 'thinking',
      render: d => <MeasurePick prompt="Which unit measures a feather?" options={['g', 'kg', 'l']} answer="g" visual={<div style={{ fontSize: 60 }}>🪶</div>} intro="Which unit measures a feather?" outro="Yes! Grams!" onDone={d} /> },
    // ── Capacity ──
    { bubble: 'Capacity is measured in litres! 🥤', mood: 'happy',
      render: d => <UnitFactWatch emoji="🥤" big="l" factor={1000} small="ml" intro="How many millilitres in one litre?" outro="One litre is a thousand millilitres!" onDone={d} /> },
    { bubble: 'Litres to millilitres! 🔁', mood: 'thinking',
      render: d => <ConvertWatch value={3} from="l" factor={1000} op="×" to="ml" intro="Three litres — times a thousand." outro="Three thousand millilitres!" onDone={d} /> },
    { bubble: 'Millilitres back to litres! 🔁', mood: 'thinking',
      render: d => <ConvertWatch value={5000} from="ml" factor={1000} op="÷" to="l" intro="Five thousand millilitres — divide by a thousand." outro="Five litres!" onDone={d} /> },
    { bubble: 'Pick the unit for capacity! 👂', mood: 'thinking',
      render: d => <MeasurePick prompt="Which unit measures a big juice carton?" options={['ml', 'l', 'g']} answer="l" visual={<div style={{ fontSize: 60 }}>🧃</div>} intro="Which unit measures a big juice carton?" outro="Yes! Litres!" onDone={d} /> },
    // ── More divide conversions + your-turn ──
    { bubble: 'Millimetres back to centimetres! 🔁', mood: 'thinking',
      render: d => <ConvertWatch value={30} from="mm" factor={10} op="÷" to="cm" intro="Thirty millimetres — divide by ten." outro="Three centimetres!" onDone={d} /> },
    { bubble: 'Your turn — convert! 👂', mood: 'thinking',
      render: d => <MeasurePick prompt="300 cm = ? m" options={['3', '30', '3000']} answer="3" intro="Three hundred centimetres is how many metres? Divide by a hundred." outro="Yes! Three metres!" onDone={d} /> },
    { bubble: 'Last one — convert! 👂', mood: 'thinking',
      render: d => <MeasurePick prompt="2 l = ? ml" options={['20', '200', '2000']} answer="2000" intro="Two litres is how many millilitres? Times a thousand." outro="Yes! Two thousand millilitres!" onDone={d} /> },
  ]
}
export default function MeasureUnitsLesson({ childName, onLessonComplete }: Props) {
  return (
    <LessonScaffold
      childName={childName}
      onLessonComplete={onLessonComplete}
      steps={buildSteps(childName)}
      finalSpeech={`Great measuring, ${childName}! Now let's practise!`}
    />
  )
}
