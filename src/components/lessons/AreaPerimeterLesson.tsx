'use client'
/**
 * AreaPerimeterLesson (9–11) — area as squares inside (length × width) and
 * perimeter as the distance around (add the sides). Rectangles are drawn on a
 * unit grid. Built on the shared kit. See docs/curriculum-9-11.md.
 */
import React, { useState, useEffect, useRef } from 'react'
import { speak, speakSeq } from '@/lib/useMiloSpeaker'
import { LessonScaffold, Confetti, type LessonStep } from './_kit'

const cellPx = (w: number, h: number) => Math.min(38, Math.floor(190 / Math.max(w, h)))

// ─── Filled grid (for area) ──────────────────────────────────
export function GridRect({ w, h, show }: { w: number; h: number; show: boolean }) {
  const cell = cellPx(w, h)
  return (
    <div style={{ display: 'inline-grid', gridTemplateColumns: `repeat(${w},${cell}px)`, gridTemplateRows: `repeat(${h},${cell}px)`, border: '3px solid var(--outline)', background: 'var(--paper)' }}>
      {Array.from({ length: w * h }).map((_, i) => (
        <div key={i} style={{ width: cell, height: cell, boxSizing: 'border-box', border: '1px solid var(--ink-muted)', background: show ? 'var(--milo-orange-soft)' : 'var(--paper)', animation: show ? `k_bounceIn 0.3s ease ${i * 0.03}s both` : 'none' }} />
      ))}
    </div>
  )
}

// ─── Grid with side-length labels (for perimeter) ────────────
export function RectFrame({ w, h }: { w: number; h: number }) {
  const cell = cellPx(w, h)
  const lbl: React.CSSProperties = { fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, color: 'var(--milo-orange)' }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
      <div style={lbl}>{w}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={lbl}>{h}</div>
        <div style={{ display: 'inline-grid', gridTemplateColumns: `repeat(${w},${cell}px)`, gridTemplateRows: `repeat(${h},${cell}px)`, border: '3px solid var(--sky-blue-deep)', background: 'var(--sky-blue-soft)' }}>
          {Array.from({ length: w * h }).map((_, i) => <div key={i} style={{ width: cell, height: cell, boxSizing: 'border-box', border: '1px solid rgba(91,195,240,.5)' }} />)}
        </div>
        <div style={lbl}>{h}</div>
      </div>
      <div style={lbl}>{w}</div>
    </div>
  )
}

// ─── Worked example: area = count the squares ────────────────
export function AreaWatch({ w, h, intro, outro, onDone }: { w: number; h: number; intro: string; outro: string; onDone: () => void }) {
  const area = w * h
  const [stage, setStage] = useState(0)
  const [done, setDone] = useState(false)
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return; ran.current = true
    const lines = [intro, `${h} rows of ${w} squares.`, `Area is ${h} times ${w} — ${area} squares!`, outro]
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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, position: 'relative' }}>
      {done && <Confetti />}
      <GridRect w={w} h={h} show={stage >= 1} />
      <div style={{ height: 50, display: 'flex', alignItems: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 26, color: 'var(--ink)' }}>
          Area = {w} × {h}{done ? <span style={{ color: 'var(--garden-green-deep)' }}> = {area}</span> : ''}
        </div>
      </div>
    </div>
  )
}

// ─── Worked example: perimeter = add the sides ───────────────
export function PerimeterWatch({ w, h, intro, outro, onDone }: { w: number; h: number; intro: string; outro: string; onDone: () => void }) {
  const perim = 2 * (w + h)
  const [done, setDone] = useState(false)
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return; ran.current = true
    const lines = [intro, `Add the sides: ${w} plus ${h} plus ${w} plus ${h}.`, `That's ${perim} all the way around!`, outro]
    let started = false, finished = false
    const cl: Array<() => void> = []
    const at = (fn: () => void, ms: number) => { const id = window.setTimeout(fn, ms); cl.push(() => window.clearTimeout(id)) }
    const apply = (i: number) => { if (i === 2) setDone(true) }
    const complete = () => { if (finished) return; finished = true; at(onDone, 900) }
    const cancel = speakSeq(lines, { onWord: i => { started = true; apply(i) }, onDone: complete })
    cl.push(cancel)
    at(() => { if (started || finished) return; cancel(); let t = 0; at(() => { speak(lines[1]) }, t); t += 2600; at(() => { setDone(true); speak(lines[2]) }, t); t += 2400; at(() => { speak(outro); complete() }, t) }, 1900)
    return () => cl.forEach(f => f())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, position: 'relative' }}>
      {done && <Confetti />}
      <RectFrame w={w} h={h} />
      <div style={{ height: 50, display: 'flex', alignItems: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 24, color: 'var(--ink)' }}>
          {w}+{h}+{w}+{h}{done ? <span style={{ color: 'var(--garden-green-deep)' }}> = {perim}</span> : ' = ?'}
        </div>
      </div>
    </div>
  )
}

// ─── Generic interactive pick ────────────────────────────────
export function APick({ prompt, options, answer, visual, intro, outro, onDone }: { prompt: string; options: string[]; answer: string; visual?: React.ReactNode; intro: string; outro: string; onDone: () => void }) {
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
    else { setWrong(c); speak('Not quite. Count again!'); window.setTimeout(() => setWrong(null), 1000) }
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
              minWidth: 84, height: 78, padding: '0 16px', borderRadius: 20,
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
    // ── Area ──
    { bubble: `Hi ${childName}! Area is the squares INSIDE. 🟧`, mood: 'happy',
      render: d => <AreaWatch w={4} h={3} intro={`Hi ${childName}! Count the squares in this rectangle.`} outro="Area is length times width!" onDone={d} /> },
    { bubble: 'Count the squares! 🟧', mood: 'thinking',
      render: d => <AreaWatch w={5} h={2} intro="Five across, two down." outro="Ten squares!" onDone={d} /> },
    { bubble: 'A square shape! 🟧', mood: 'thinking',
      render: d => <AreaWatch w={3} h={3} intro="Three by three." outro="Nine squares!" onDone={d} /> },
    { bubble: 'What is the area? 👂', mood: 'thinking',
      render: d => <APick prompt="What is the area?" options={['6', '8', '10']} answer="8" visual={<GridRect w={4} h={2} show />} intro="What is the area of this rectangle? Count the squares, or times the sides." outro="Yes! Eight squares!" onDone={d} /> },
    // ── Perimeter ──
    { bubble: 'Perimeter is the way AROUND. 🔲', mood: 'happy',
      render: d => <PerimeterWatch w={4} h={3} intro="Now walk around the edge — add all four sides." outro="Perimeter is the distance around!" onDone={d} /> },
    { bubble: 'Add the sides! 🔲', mood: 'thinking',
      render: d => <PerimeterWatch w={5} h={2} intro="Five plus two plus five plus two." outro="Fourteen around!" onDone={d} /> },
    { bubble: 'Around a square! 🔲', mood: 'thinking',
      render: d => <PerimeterWatch w={3} h={3} intro="Three on every side." outro="Twelve around!" onDone={d} /> },
    { bubble: 'What is the perimeter? 👂', mood: 'thinking',
      render: d => <APick prompt="What is the perimeter?" options={['8', '12', '14']} answer="12" visual={<RectFrame w={4} h={2} />} intro="What is the perimeter? Add all four sides." outro="Yes! Four plus two plus four plus two is twelve!" onDone={d} /> },
    // ── Mixed practice ──
    { bubble: 'Area again — a long one! 🟧', mood: 'thinking',
      render: d => <AreaWatch w={6} h={2} intro="Six across, two down." outro="Twelve squares!" onDone={d} /> },
    { bubble: 'Find the area! 👂', mood: 'thinking',
      render: d => <APick prompt="Area of a 5 × 3 rectangle?" options={['8', '15', '16']} answer="15" visual={<GridRect w={5} h={3} show />} intro="What is the area of a five by three rectangle?" outro="Yes! Fifteen squares!" onDone={d} /> },
    { bubble: 'Find the perimeter! 👂', mood: 'thinking',
      render: d => <APick prompt="Perimeter of a 5 × 3 rectangle?" options={['12', '16', '20']} answer="16" visual={<RectFrame w={5} h={3} />} intro="What is the perimeter of a five by three rectangle?" outro="Yes! Five plus three plus five plus three is sixteen!" onDone={d} /> },
  ]
}
export default function AreaPerimeterLesson({ childName, onLessonComplete }: Props) {
  return (
    <LessonScaffold
      childName={childName}
      onLessonComplete={onLessonComplete}
      steps={buildSteps(childName)}
      finalSpeech={`Great work, ${childName}! Area counts the inside, perimeter goes around. Now let's practise!`}
    />
  )
}
