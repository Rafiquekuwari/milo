'use client'
/**
 * TimesTablesLesson (9–11) — times-table fluency and 2-digit × 1-digit. Facts are
 * taught as arrays with skip-counting; bigger products are split by place value
 * (23 × 3 = 20×3 + 3×3). Built on the shared kit (centered Retry+Next pop-up, no
 * celebration slides). See docs/curriculum-9-11.md.
 */
import React, { useState, useEffect, useRef } from 'react'
import { speak, speakSeq } from '@/lib/useMiloSpeaker'
import { LessonScaffold, Confetti, type LessonStep } from './_kit'

// ─── Array of dots ───────────────────────────────────────────
function ArrayGrid({ rows, cols, shown }: { rows: number; cols: number; shown: number }) {
  const dot = cols > 6 ? 16 : 22
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ display: 'flex', gap: 5 }}>
          {Array.from({ length: cols }).map((_, c) => {
            const on = r * cols + c < shown
            return <div key={c} style={{ width: dot, height: dot, borderRadius: '50%', background: on ? 'var(--milo-orange)' : 'rgba(61,37,22,0.1)', transform: on ? 'scale(1)' : 'scale(0.8)', transition: 'all 0.2s cubic-bezier(.34,1.56,.64,1)' }} />
          })}
        </div>
      ))}
    </div>
  )
}

// ─── Worked example: a fact as an array, row by row (skip counting) ──
export function FactWatch({ a, b, intro, outro, onDone }: { a: number; b: number; intro: string; outro: string; onDone: () => void }) {
  const total = a * b
  const [rowsShown, setRowsShown] = useState(0)
  const [done, setDone] = useState(false)
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return
    ran.current = true
    const mults = Array.from({ length: a }, (_, i) => String((i + 1) * b))
    const lines = [intro, ...mults, `${a} times ${b} is ${total}!`, outro]
    let started = false, finished = false
    const cl: Array<() => void> = []
    const at = (fn: () => void, ms: number) => { const id = window.setTimeout(fn, ms); cl.push(() => window.clearTimeout(id)) }
    const apply = (i: number) => { if (i >= 1 && i <= a) setRowsShown(i); if (i === a + 1) setDone(true) }
    const complete = () => { if (finished) return; finished = true; at(onDone, 900) }
    const cancel = speakSeq(lines, { onWord: i => { started = true; apply(i) }, onDone: complete })
    cl.push(cancel)
    at(() => {
      if (started || finished) return
      cancel()
      let t = 0
      for (let k = 1; k <= a; k++) { const kk = k; at(() => { setRowsShown(kk); speak(mults[kk - 1]) }, t); t += 900 }
      at(() => { setDone(true); speak(`${a} times ${b} is ${total}!`) }, t); t += 1700
      at(() => { speak(outro); complete() }, t)
    }, 1900)
    return () => cl.forEach(f => f())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, position: 'relative' }}>
      {done && <Confetti />}
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 30, color: 'var(--ink)' }}>
        {a} × {b}{done ? <span style={{ color: 'var(--garden-green-deep)' }}> = {total}</span> : rowsShown > 0 ? <span style={{ color: 'var(--milo-orange)' }}> = {rowsShown * b}…</span> : null}
      </div>
      <ArrayGrid rows={a} cols={b} shown={rowsShown * b} />
    </div>
  )
}

// ─── Worked example: 2-digit × 1-digit, split by place value ─
export function SplitWatch({ n, k, intro, outro, onDone }: { n: number; k: number; intro: string; outro: string; onDone: () => void }) {
  const tens = Math.floor(n / 10) * 10, ones = n % 10
  const p1 = tens * k, p2 = ones * k, total = p1 + p2
  const [shown, setShown] = useState(0)
  const [done, setDone] = useState(false)
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return
    ran.current = true
    const lines = [intro, `${tens} times ${k} is ${p1}.`, `${ones} times ${k} is ${p2}.`, `${p1} plus ${p2} is ${total}, so ${n} times ${k} is ${total}!`, outro]
    let started = false, finished = false
    const cl: Array<() => void> = []
    const at = (fn: () => void, ms: number) => { const id = window.setTimeout(fn, ms); cl.push(() => window.clearTimeout(id)) }
    const apply = (i: number) => { if (i >= 1 && i <= 2) setShown(i); if (i === 3) { setShown(3); setDone(true) } }
    const complete = () => { if (finished) return; finished = true; at(onDone, 900) }
    const cancel = speakSeq(lines, { onWord: i => { started = true; apply(i) }, onDone: complete })
    cl.push(cancel)
    at(() => {
      if (started || finished) return
      cancel()
      let t = 0
      at(() => { setShown(1); speak(lines[1]) }, t); t += 1900
      at(() => { setShown(2); speak(lines[2]) }, t); t += 1900
      at(() => { setShown(3); setDone(true); speak(lines[3]) }, t); t += 2400
      at(() => { speak(outro); complete() }, t)
    }, 1900)
    return () => cl.forEach(f => f())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const Part = ({ x, k2, p, on, color }: { x: number; k2: number; p: number; on: boolean; color: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: on ? 1 : 0.2, transition: 'opacity 0.3s' }}>
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 24, color: 'var(--ink)' }}>{x} × {k2}</span>
      <span style={{ fontSize: 18, color: 'var(--ink-muted)' }}>=</span>
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 24, color }}>{p}</span>
    </div>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, position: 'relative' }}>
      {done && <Confetti />}
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 34, color: 'var(--milo-orange)' }}>{n} × {k}</div>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--ink-muted)' }}>split into tens and ones:</div>
      <Part x={tens} k2={k} p={p1} on={shown >= 1} color="#5BC3F0" />
      <Part x={ones} k2={k} p={p2} on={shown >= 2} color="#6FBE3F" />
      <div style={{ height: 50, display: 'flex', alignItems: 'center' }}>
        {done && (
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 24, color: 'var(--garden-green-deep)', background: 'var(--garden-green-soft)', border: '3px solid var(--garden-green)', borderRadius: 50, padding: '8px 22px', animation: 'k_bounceIn 0.45s cubic-bezier(.34,1.56,.64,1)' }}>
            {p1} + {p2} = {total}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Interactive: pick the product ───────────────────────────
export function MultPick({ a, b, choices, intro, outro, onDone, showArray }: { a: number; b: number; choices: number[]; intro: string; outro: string; onDone: () => void; showArray?: boolean }) {
  const answer = a * b
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
    else { setWrong(c); speak(`Not quite. ${a} times ${b}. Try again!`); window.setTimeout(() => setWrong(null), 1000) }
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 44, color: 'var(--milo-orange)' }}>{a} × {b} = ?</div>
      {showArray && <ArrayGrid rows={a} cols={b} shown={a * b} />}
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

// ─── Steps ───────────────────────────────────────────────────
interface Props { childName: string; onLessonComplete: () => void }
function buildSteps(childName: string): LessonStep[] {
  return [
    // ── Equal groups / dot arrays (skip-counting) ──
    { bubble: `Hi ${childName}! Multiplication is equal groups. ✖️`, mood: 'happy',
      render: d => <FactWatch a={4} b={3} intro={`Hi ${childName}! Four rows of three. Let's skip-count them.`} outro="Four threes make twelve!" onDone={d} /> },
    { bubble: 'Skip-count the rows! 🔢', mood: 'thinking',
      render: d => <FactWatch a={6} b={4} intro="Six rows of four. Count by fours!" outro="Six fours are twenty-four!" onDone={d} /> },
    { bubble: 'Count by fives! 🖐️', mood: 'happy',
      render: d => <FactWatch a={2} b={5} intro="Two rows of five. Count by fives!" outro="Two fives are ten!" onDone={d} /> },
    { bubble: 'Count by sixes! 🔢', mood: 'thinking',
      render: d => <FactWatch a={3} b={6} intro="Three rows of six. Count by sixes!" outro="Three sixes are eighteen!" onDone={d} /> },
    { bubble: 'A square of fives! ⭐', mood: 'happy',
      render: d => <FactWatch a={5} b={5} intro="Five rows of five. Count by fives!" outro="Five fives are twenty-five!" onDone={d} /> },
    { bubble: 'Count by twos! 👣', mood: 'thinking',
      render: d => <FactWatch a={6} b={2} intro="Six rows of two. Count by twos!" outro="Six twos are twelve!" onDone={d} /> },
    { bubble: 'Bigger groups! 🔢', mood: 'thinking',
      render: d => <FactWatch a={8} b={3} intro="Eight rows of three. Count by threes!" outro="Eight threes are twenty-four!" onDone={d} /> },
    { bubble: 'Your turn — pick the product! 👂', mood: 'thinking',
      render: d => <MultPick a={7} b={3} choices={[18, 21, 24]} intro="What is seven times three?" outro="Yes! Twenty-one!" showArray onDone={d} /> },
    // ── Split tens and ones (2-digit × 1-digit) ──
    { bubble: 'Bigger numbers? Split by place! 🧱', mood: 'happy',
      render: d => <SplitWatch n={23} k={3} intro="For twenty-three times three, split into twenty and three." outro="That's how we do big ones!" onDone={d} /> },
    { bubble: 'Split the tens and ones. 🧮', mood: 'thinking',
      render: d => <SplitWatch n={14} k={5} intro="Fourteen times five — split into ten and four." outro="Add the parts!" onDone={d} /> },
    { bubble: 'Split twenty-six! 🧱', mood: 'thinking',
      render: d => <SplitWatch n={26} k={2} intro="Twenty-six times two — split into twenty and six." outro="Forty plus twelve!" onDone={d} /> },
    { bubble: 'Split thirty-five! 🧮', mood: 'thinking',
      render: d => <SplitWatch n={35} k={2} intro="Thirty-five times two — split into thirty and five." outro="Sixty plus ten!" onDone={d} /> },
    { bubble: 'Split eighteen! 🧱', mood: 'thinking',
      render: d => <SplitWatch n={18} k={4} intro="Eighteen times four — split into ten and eight." outro="Forty plus thirty-two!" onDone={d} /> },
    { bubble: 'Split twenty-four! 🧮', mood: 'thinking',
      render: d => <SplitWatch n={24} k={3} intro="Twenty-four times three — split into twenty and four." outro="Sixty plus twelve!" onDone={d} /> },
    { bubble: 'Split forty-three! 🧱', mood: 'thinking',
      render: d => <SplitWatch n={43} k={2} intro="Forty-three times two — split into forty and three." outro="Eighty plus six!" onDone={d} /> },
    { bubble: 'Now YOU try a big one! 👂', mood: 'thinking',
      render: d => <MultPick a={21} b={4} choices={[80, 84, 88]} intro="What is twenty-one times four? Split it: twenty times four, plus one times four." outro="Brilliant! Eighty-four!" onDone={d} /> },
    { bubble: 'Last one — split and solve! 🏆', mood: 'thinking',
      render: d => <MultPick a={32} b={3} choices={[90, 96, 99]} intro="What is thirty-two times three? Thirty times three, plus two times three." outro="Amazing! Ninety-six!" onDone={d} /> },
  ]
}
export default function TimesTablesLesson({ childName, onLessonComplete }: Props) {
  return (
    <LessonScaffold
      childName={childName}
      onLessonComplete={onLessonComplete}
      steps={buildSteps(childName)}
      finalSpeech={`Super multiplying, ${childName}! Now let's practise!`}
    />
  )
}
