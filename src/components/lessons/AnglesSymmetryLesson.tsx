'use client'
/**
 * AnglesSymmetryLesson (9–11) — angles (acute / right / obtuse, compared to a
 * square corner) and lines of symmetry (where a shape folds onto itself). Built
 * on the shared kit. See docs/curriculum-9-11.md.
 */
import React, { useState, useEffect, useRef } from 'react'
import { speak, speakSeq } from '@/lib/useMiloSpeaker'
import { LessonScaffold, Confetti, type LessonStep } from './_kit'

export function angleType(deg: number): 'acute' | 'right' | 'obtuse' { return deg < 90 ? 'acute' : deg > 90 ? 'obtuse' : 'right' }

// ─── An angle drawn from a vertex ────────────────────────────
export function AngleView({ deg }: { deg: number }) {
  const cx = 26, cy = 96, len = 108
  const rad = (deg * Math.PI) / 180
  const x3 = cx + len * Math.cos(rad), y3 = cy - len * Math.sin(rad)
  const ar = 30
  const ax2 = cx + ar * Math.cos(rad), ay2 = cy - ar * Math.sin(rad)
  return (
    <svg width={160} height={120} viewBox="0 0 160 120">
      <line x1={cx} y1={cy} x2={cx + len} y2={cy} stroke="var(--outline)" strokeWidth={4} strokeLinecap="round" />
      <line x1={cx} y1={cy} x2={x3} y2={y3} stroke="var(--outline)" strokeWidth={4} strokeLinecap="round" />
      <path d={`M ${cx + ar} ${cy} A ${ar} ${ar} 0 0 0 ${ax2} ${ay2}`} fill="none" stroke="var(--milo-orange)" strokeWidth={3} />
      {deg === 90 && <rect x={cx} y={cy - 16} width={16} height={16} fill="none" stroke="var(--milo-orange)" strokeWidth={3} />}
      <circle cx={cx} cy={cy} r={4} fill="var(--outline)" />
    </svg>
  )
}

// ─── Worked example: name an angle ───────────────────────────
export function AngleWatch({ deg, intro, outro, onDone }: { deg: number; intro: string; outro: string; onDone: () => void }) {
  const type = angleType(deg)
  const [done, setDone] = useState(false)
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return; ran.current = true
    const verdict = type === 'right' ? 'This is a right angle — a square corner!' : type === 'acute' ? 'Smaller than a corner — it\'s acute!' : 'Bigger than a corner — it\'s obtuse!'
    const lines = [intro, verdict, outro]
    let started = false, finished = false
    const cl: Array<() => void> = []
    const at = (fn: () => void, ms: number) => { const id = window.setTimeout(fn, ms); cl.push(() => window.clearTimeout(id)) }
    const apply = (i: number) => { if (i === 1) setDone(true) }
    const complete = () => { if (finished) return; finished = true; at(onDone, 900) }
    const cancel = speakSeq(lines, { onWord: i => { started = true; apply(i) }, onDone: complete })
    cl.push(cancel)
    at(() => { if (started || finished) return; cancel(); let t = 0; at(() => { setDone(true); speak(verdict) }, t); t += 2600; at(() => { speak(outro); complete() }, t) }, 1900)
    return () => cl.forEach(f => f())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const color = type === 'right' ? 'var(--garden-green)' : type === 'acute' ? 'var(--sky-blue-deep)' : '#9362D8'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, position: 'relative' }}>
      {done && <Confetti />}
      <AngleView deg={deg} />
      <div style={{ height: 46, display: 'flex', alignItems: 'center' }}>
        {done && <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 24, color: '#fff', background: color, borderRadius: 50, padding: '8px 26px', animation: 'k_bounceIn 0.45s cubic-bezier(.34,1.56,.64,1)', textTransform: 'uppercase' }}>{type}</div>}
      </div>
    </div>
  )
}

// ─── Symmetry: a dashed fold line ────────────────────────────
function SymLine({ kind }: { kind: 'v' | 'h' | 'd1' | 'd2' }) {
  if (kind === 'v') return <div style={{ position: 'absolute', top: -6, bottom: -6, left: '50%', borderLeft: '3px dashed var(--apple-red)' }} />
  if (kind === 'h') return <div style={{ position: 'absolute', left: -6, right: -6, top: '50%', borderTop: '3px dashed var(--apple-red)' }} />
  return <div style={{ position: 'absolute', top: '50%', left: '50%', width: '150%', borderTop: '3px dashed var(--apple-red)', transform: `translate(-50%,-50%) rotate(${kind === 'd1' ? 45 : -45}deg)` }} />
}
export function SymShape({ kind, show }: { kind: 'butterfly' | 'rectangle' | 'square'; show: boolean }) {
  if (kind === 'butterfly') {
    return (
      <div style={{ position: 'relative', width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 88 }}>🦋</div>
        {show && <SymLine kind="v" />}
      </div>
    )
  }
  const w = kind === 'square' ? 104 : 124, h = kind === 'square' ? 104 : 76
  return (
    <div style={{ position: 'relative', width: w, height: h, background: 'var(--sky-blue-soft)', border: '3px solid var(--sky-blue-deep)', borderRadius: 6 }}>
      {show && <SymLine kind="v" />}
      {show && <SymLine kind="h" />}
      {show && kind === 'square' && <SymLine kind="d1" />}
      {show && kind === 'square' && <SymLine kind="d2" />}
    </div>
  )
}

// ─── Worked example: lines of symmetry ───────────────────────
export function SymmetryWatch({ kind, count, label, intro, outro, onDone }: { kind: 'butterfly' | 'rectangle' | 'square'; count: number; label: string; intro: string; outro: string; onDone: () => void }) {
  const [show, setShow] = useState(false)
  const [done, setDone] = useState(false)
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return; ran.current = true
    const lines = [intro, `A ${label} has ${count} ${count === 1 ? 'line' : 'lines'} of symmetry!`, outro]
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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, position: 'relative' }}>
      {done && <Confetti />}
      <SymShape kind={kind} show={show} />
      <div style={{ height: 46, display: 'flex', alignItems: 'center' }}>
        {done && <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, color: 'var(--garden-green-deep)', background: 'var(--garden-green-soft)', border: '3px solid var(--garden-green)', borderRadius: 50, padding: '8px 22px', animation: 'k_bounceIn 0.45s cubic-bezier(.34,1.56,.64,1)' }}>{count} {count === 1 ? 'line' : 'lines'}</div>}
      </div>
    </div>
  )
}

// ─── Generic interactive pick ────────────────────────────────
export function ASPick({ prompt, options, answer, visual, intro, outro, onDone }: { prompt: string; options: string[]; answer: string; visual?: React.ReactNode; intro: string; outro: string; onDone: () => void }) {
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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
      {visual}
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: 'var(--milo-orange)', background: 'var(--milo-orange-soft)', borderRadius: 50, padding: '6px 18px', border: '2px solid var(--milo-orange)', textAlign: 'center' }}>{prompt}</div>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', opacity: ready ? 1 : 0.5, transition: 'opacity 0.2s' }}>
        {options.map(c => {
          const isRight = picked === c, isWrong = wrong === c
          return (
            <button key={c} onClick={() => pick(c)} disabled={picked != null || !ready} style={{
              minWidth: 90, height: 76, padding: '0 16px', borderRadius: 20,
              background: isRight ? 'var(--garden-green-soft)' : isWrong ? 'var(--apple-red-soft)' : 'var(--paper)',
              border: `4px solid ${isRight ? 'var(--garden-green)' : isWrong ? 'var(--apple-red)' : 'var(--outline)'}`,
              boxShadow: isRight ? '0 6px 0 var(--garden-green-deep)' : isWrong ? '0 6px 0 var(--apple-red-deep)' : '0 6px 0 #c8ac79',
              fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, color: 'var(--ink)',
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
    // ── Angles ──
    { bubble: `Hi ${childName}! A right angle is a square corner. 📐`, mood: 'happy',
      render: d => <AngleWatch deg={90} intro={`Hi ${childName}! This square corner is a right angle.`} outro="A right angle is exactly a corner!" onDone={d} /> },
    { bubble: 'Smaller than a corner = acute! 📐', mood: 'thinking',
      render: d => <AngleWatch deg={45} intro="This angle is small and sharp." outro="Acute angles are less than a right angle!" onDone={d} /> },
    { bubble: 'Bigger than a corner = obtuse! 📐', mood: 'thinking',
      render: d => <AngleWatch deg={130} intro="This angle is wide open." outro="Obtuse angles are more than a right angle!" onDone={d} /> },
    { bubble: 'Another acute angle! 📐', mood: 'thinking',
      render: d => <AngleWatch deg={70} intro="Is this one smaller or bigger than a corner?" outro="Smaller — acute!" onDone={d} /> },
    { bubble: 'Name the angle! 👂', mood: 'thinking',
      render: d => <ASPick prompt="Acute, right or obtuse?" options={['Acute', 'Right', 'Obtuse']} answer="Obtuse" visual={<AngleView deg={120} />} intro="Is this angle acute, right or obtuse?" outro="Yes! It's obtuse — bigger than a corner!" onDone={d} /> },
    { bubble: 'One more! 👂', mood: 'thinking',
      render: d => <ASPick prompt="Acute, right or obtuse?" options={['Acute', 'Right', 'Obtuse']} answer="Right" visual={<AngleView deg={90} />} intro="What about this one?" outro="Yes! A right angle!" onDone={d} /> },
    // ── Symmetry ──
    { bubble: 'A line of symmetry folds it in half! 🦋', mood: 'happy',
      render: d => <SymmetryWatch kind="butterfly" count={1} label="butterfly" intro="Fold the butterfly down the middle — both halves match!" outro="One line of symmetry!" onDone={d} /> },
    { bubble: 'A rectangle has two! ▭', mood: 'thinking',
      render: d => <SymmetryWatch kind="rectangle" count={2} label="rectangle" intro="A rectangle folds two ways — across and down." outro="Two lines of symmetry!" onDone={d} /> },
    { bubble: 'A square has FOUR! 🟦', mood: 'thinking',
      render: d => <SymmetryWatch kind="square" count={4} label="square" intro="A square folds four ways — even the diagonals match!" outro="Four lines of symmetry!" onDone={d} /> },
    { bubble: 'How many lines of symmetry? 👂', mood: 'thinking',
      render: d => <ASPick prompt="How many lines of symmetry?" options={['1', '2', '4']} answer="2" visual={<SymShape kind="rectangle" show={false} />} intro="How many lines of symmetry does this rectangle have?" outro="Yes! Two!" onDone={d} /> },
    { bubble: 'And this one? 👂', mood: 'thinking',
      render: d => <ASPick prompt="How many lines of symmetry?" options={['1', '2', '4']} answer="4" visual={<SymShape kind="square" show={false} />} intro="How many lines of symmetry does this square have?" outro="Yes! Four!" onDone={d} /> },
  ]
}
export default function AnglesSymmetryLesson({ childName, onLessonComplete }: Props) {
  return (
    <LessonScaffold
      childName={childName}
      onLessonComplete={onLessonComplete}
      steps={buildSteps(childName)}
      finalSpeech={`Great work, ${childName}! Angles and symmetry — now let's practise!`}
    />
  )
}
