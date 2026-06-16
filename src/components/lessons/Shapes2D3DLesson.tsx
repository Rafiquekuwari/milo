'use client'
/**
 * Shapes2D3DLesson — 2D shapes (with side counts) and 3D solids for 6–8.
 * 2D drawn as SVG; 3D shown as emoji. Worked examples first, then questions.
 *
 * Exports ShapeView / SHAPES_2D / SHAPES_3D / sidesOf / ShapeWatch / ShapeAsk /
 * buildNameChoices for the practice chapter and its re-teach.
 */
import React, { useState, useEffect, useRef, useMemo } from 'react'
import { speak, speakSeq } from '@/lib/useMiloSpeaker'
import { LessonScaffold, SectionBreak, Confetti, type LessonStep } from './_kit'

interface Props { childName: string; onLessonComplete: () => void }

export const SHAPES_2D = ['circle', 'triangle', 'square', 'rectangle', 'pentagon', 'hexagon', 'star']
export const SHAPES_3D = ['cube', 'sphere', 'cone', 'cylinder']
const SIDES: Record<string, number> = { triangle: 3, square: 4, rectangle: 4, pentagon: 5, hexagon: 6 }
const EMOJI_3D: Record<string, string> = { cube: '🧊', sphere: '⚽', cone: '🍦', cylinder: '🥫' }
export function sidesOf(name: string): number | null { return SIDES[name] ?? null }
export function is3D(name: string): boolean { return SHAPES_3D.includes(name) }

const poly = (n: number, cx: number, cy: number, r: number, rot = -90) =>
  Array.from({ length: n }, (_, i) => { const a = (rot + i * 360 / n) * Math.PI / 180; return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}` }).join(' ')
const starPts = (cx: number, cy: number, ro: number, ri: number) =>
  Array.from({ length: 10 }, (_, i) => { const r = i % 2 === 0 ? ro : ri; const a = (-90 + i * 36) * Math.PI / 180; return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}` }).join(' ')

export function ShapeView({ name, size = 120 }: { name: string; size?: number }) {
  if (is3D(name)) return <span style={{ fontSize: size * 0.92, lineHeight: 1 }}>{EMOJI_3D[name]}</span>
  const s = size, cx = s / 2, cy = s / 2, r = s * 0.42
  const fill = 'var(--milo-orange)', stroke = 'var(--outline)', sw = 4
  let el: React.ReactNode = null
  if (name === 'circle') el = <circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth={sw} />
  else if (name === 'square') el = <rect x={cx - r} y={cy - r} width={2 * r} height={2 * r} rx={6} fill={fill} stroke={stroke} strokeWidth={sw} />
  else if (name === 'rectangle') el = <rect x={s * 0.08} y={s * 0.26} width={s * 0.84} height={s * 0.48} rx={6} fill={fill} stroke={stroke} strokeWidth={sw} />
  else if (name === 'triangle') el = <polygon points={poly(3, cx, cy + 6, r)} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
  else if (name === 'pentagon') el = <polygon points={poly(5, cx, cy, r)} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
  else if (name === 'hexagon') el = <polygon points={poly(6, cx, cy, r, 0)} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
  else if (name === 'star') el = <polygon points={starPts(cx, cy, r, r * 0.45)} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
  return <svg viewBox={`0 0 ${s} ${s}`} width={size} height={size} style={{ maxWidth: '72vw' }}>{el}</svg>
}

export function buildNameChoices(answer: string, pool: string[]): string[] {
  const opts = new Set<string>([answer])
  for (const v of pool.slice().sort(() => Math.random() - 0.5)) { if (opts.size >= 3) break; if (v !== answer) opts.add(v) }
  return [...opts].sort(() => Math.random() - 0.5)
}

function describe(name: string): string {
  if (is3D(name)) return `This is a ${name}. It is a solid shape.`
  const s = sidesOf(name)
  if (s) return `This is a ${name}. It has ${s} sides.`
  return `This is a ${name}. It is round.`
}

export function ShapeWatch({ name, onDone }: { name: string; onDone: () => void }) {
  const [show, setShow] = useState(false)
  const doneRef = useRef(onDone); doneRef.current = onDone
  useEffect(() => {
    const cancel = speakSeq(['Look at the shape.', describe(name)], {
      onWord: (i) => { if (i === 1) setShow(true) },
      onDone: () => window.setTimeout(() => doneRef.current(), 1100),
    })
    return cancel
  }, []) // eslint-disable-line
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <ShapeView name={name} />
      {show && <div style={{ background: 'var(--milo-orange)', color: '#fff', borderRadius: 50, padding: '8px 24px', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, animation: 'k_flipIn 0.5s ease', textTransform: 'capitalize' }}>{name}{sidesOf(name) ? ` · ${sidesOf(name)} sides` : ''}</div>}
    </div>
  )
}

export function ShapeAsk({ name, mode, choices, answer, intro, outro, onDone }: {
  name: string; mode: 'name' | 'sides'; choices: (string | number)[]; answer: string | number; intro: string; outro: string; onDone: () => void
}) {
  const [picked, setPicked] = useState<string | number | null>(null)
  const [wrong, setWrong] = useState<string | number | null>(null)
  const [burst, setBurst] = useState(false)
  const spoken = useRef(false)
  useEffect(() => { if (spoken.current) return; spoken.current = true; speak(intro) }, []) // eslint-disable-line
  function pick(c: string | number) {
    if (picked != null) return
    if (c === answer) { setPicked(c); setWrong(null); setBurst(true); speak(outro); window.setTimeout(onDone, 2100) }
    else { setWrong(c); speak('Not quite! Look again.'); window.setTimeout(() => setWrong(null), 900) }
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, position: 'relative' }}>
      {burst && <Confetti />}
      <ShapeView name={name} size={110} />
      <div style={S.qPill}>{mode === 'name' ? 'What shape is this?' : 'How many sides?'}</div>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', maxWidth: 320 }}>
        {choices.map(c => {
          const isRight = picked === c, isWrong = wrong === c
          return (
            <button key={String(c)} onClick={() => pick(c)} disabled={picked != null} style={{
              minWidth: 84, height: 64, padding: '0 16px', borderRadius: 16,
              background: isRight ? 'var(--garden-green-soft)' : isWrong ? 'var(--apple-red-soft)' : 'var(--paper)',
              border: `4px solid ${isRight ? 'var(--garden-green)' : isWrong ? 'var(--apple-red)' : 'var(--outline)'}`,
              boxShadow: isRight ? '0 5px 0 var(--garden-green-deep)' : isWrong ? '0 5px 0 var(--apple-red-deep)' : '0 5px 0 #c8ac79',
              fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: mode === 'name' ? 19 : 28, color: 'var(--ink)',
              cursor: picked != null ? 'default' : 'pointer', textTransform: 'capitalize',
              transform: isRight ? 'scale(1.08) translateY(-3px)' : 'scale(1)',
              transition: 'transform 160ms cubic-bezier(.34,1.56,.64,1),background 160ms ease',
            }}>{c}</button>
          )
        })}
      </div>
    </div>
  )
}

export default function Shapes2D3DLesson({ childName, onLessonComplete }: Props) {
  // Freeze the (shuffled) name choices once so the buttons don't reshuffle on re-render.
  const C = useMemo(() => ({ tri: buildNameChoices('triangle', SHAPES_2D), cone: buildNameChoices('cone', SHAPES_3D) }), [])
  const steps: LessonStep[] = [
    { bubble: `Hi ${childName}! Let’s learn shapes! 🔷`, mood: 'happy',
      render: d => <ShapeWatch name="circle" onDone={d} /> },
    { bubble: 'A triangle has 3 sides! 🔺', mood: 'happy',
      render: d => <ShapeWatch name="triangle" onDone={d} /> },
    { bubble: 'A square has 4 sides! 🟧', mood: 'happy',
      render: d => <ShapeWatch name="square" onDone={d} /> },
    { bubble: 'A pentagon has 5 sides! 🔷', mood: 'happy',
      render: d => <ShapeWatch name="pentagon" onDone={d} /> },
    { bubble: 'Now SOLID shapes — a cube! 🧊', mood: 'happy',
      render: d => <ShapeWatch name="cube" onDone={d} /> },
    { bubble: 'A sphere is round like a ball! ⚽', mood: 'happy',
      render: d => <ShapeWatch name="sphere" onDone={d} /> },

    { bubble: '🌟 Now YOU name the shapes!', mood: 'celebrate',
      render: d => <SectionBreak emoji="🔷" title="Your turn!" subtitle="Name the shape and count its sides." onDone={d} /> },

    { bubble: 'What shape is this? 🤔', mood: 'thinking',
      render: d => <ShapeAsk name="triangle" mode="name" answer="triangle" choices={C.tri} intro="What shape is this?" outro="Yes! A triangle!" onDone={d} /> },
    { bubble: 'How many sides? 🤔', mood: 'thinking',
      render: d => <ShapeAsk name="square" mode="sides" answer={4} choices={[3, 4, 5]} intro="How many sides does a square have?" outro="Yes! Four sides!" onDone={d} /> },
    { bubble: 'And this solid shape? 🤔', mood: 'thinking',
      render: d => <ShapeAsk name="cone" mode="name" answer="cone" choices={C.cone} intro="What solid shape is this?" outro="Yes! A cone!" onDone={d} /> },
  ]
  return (
    <LessonScaffold childName={childName} onLessonComplete={onLessonComplete} steps={steps}
      finalSpeech={`Wonderful, ${childName}! You know 2D and 3D shapes! Let’s practise!`} />
  )
}

const S: Record<string, React.CSSProperties> = {
  qPill: { fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: 'var(--milo-orange)', background: 'var(--milo-orange-soft)', borderRadius: 50, padding: '6px 18px', border: '2px solid var(--milo-orange)' },
}
