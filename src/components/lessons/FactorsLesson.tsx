'use client'
/**
 * FactorsLesson (9–11) — even & odd, multiples, factors, and prime vs composite.
 * Even/odd pairs dots; multiples light up a number row; factors show factor pairs;
 * primes have exactly two factors. Built on the shared kit (centered Retry+Next
 * pop-up, no celebration slides). See docs/curriculum-9-11.md.
 */
import React, { useState, useEffect, useRef } from 'react'
import { speak, speakSeq } from '@/lib/useMiloSpeaker'
import { LessonScaffold, Confetti, type LessonStep } from './_kit'

// ─── Number helpers ──────────────────────────────────────────
export function isPrime(n: number): boolean {
  if (n < 2) return false
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false
  return true
}
export function factorsOf(n: number): number[] {
  const f: number[] = []
  for (let i = 1; i <= n; i++) if (n % i === 0) f.push(i)
  return f
}
export function factorPairs(n: number): [number, number][] {
  const p: [number, number][] = []
  for (let i = 1; i * i <= n; i++) if (n % i === 0) p.push([i, n / i])
  return p
}

// ─── Dots paired two-by-two (even/odd) ───────────────────────
function DotPairs({ n, show, flagLeftover }: { n: number; show: boolean; flagLeftover: boolean }) {
  const cols = Math.ceil(n / 2)
  const lonely = n % 2 === 1
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 340, opacity: show ? 1 : 0, transition: 'opacity 0.3s' }}>
      {Array.from({ length: cols }).map((_, c) => {
        const isLonely = lonely && c === cols - 1
        const dots = isLonely ? 1 : 2
        const hot = isLonely && flagLeftover
        return (
          <div key={c} style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 4, borderRadius: 10, border: hot ? '3px dashed var(--apple-red)' : '3px solid transparent', background: hot ? 'var(--apple-red-soft)' : 'transparent' }}>
            {Array.from({ length: dots }).map((_, j) => (
              <div key={j} style={{ width: 22, height: 22, borderRadius: '50%', background: hot ? 'var(--apple-red)' : 'var(--milo-orange)' }} />
            ))}
          </div>
        )
      })}
    </div>
  )
}

// ─── Worked example: even or odd ─────────────────────────────
export function EvenOddWatch({ n, intro, outro, onDone }: { n: number; intro: string; outro: string; onDone: () => void }) {
  const even = n % 2 === 0
  const [stage, setStage] = useState(0)
  const [done, setDone] = useState(false)
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return; ran.current = true
    const lines = [intro, 'Pair them up, two by two.', even ? `${n} makes perfect pairs — ${n} is even!` : `${n} has one left over — ${n} is odd!`, outro]
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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, position: 'relative' }}>
      {done && even && <Confetti />}
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 48, color: 'var(--ink)' }}>{n}</div>
      <DotPairs n={n} show={stage >= 1} flagLeftover={stage >= 2 && !even} />
      <div style={{ height: 46, display: 'flex', alignItems: 'center' }}>
        {done && (
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 24, color: '#fff', background: even ? 'var(--garden-green)' : 'var(--milo-orange)', borderRadius: 50, padding: '8px 26px', animation: 'k_bounceIn 0.45s cubic-bezier(.34,1.56,.64,1)' }}>{even ? 'EVEN' : 'ODD'}</div>
        )}
      </div>
    </div>
  )
}

// ─── Worked example: multiples on a number row ───────────────
export function MultiplesWatch({ base, upTo, intro, outro, onDone }: { base: number; upTo: number; intro: string; outro: string; onDone: () => void }) {
  const mults = Array.from({ length: Math.floor(upTo / base) }, (_, i) => (i + 1) * base)
  const [shown, setShown] = useState(0)
  const [done, setDone] = useState(false)
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return; ran.current = true
    const lines = [intro, ...mults.map(String), `Those are the multiples of ${base}!`, outro]
    let started = false, finished = false
    const cl: Array<() => void> = []
    const at = (fn: () => void, ms: number) => { const id = window.setTimeout(fn, ms); cl.push(() => window.clearTimeout(id)) }
    const apply = (i: number) => { if (i >= 1 && i <= mults.length) setShown(i); if (i === mults.length + 1) setDone(true) }
    const complete = () => { if (finished) return; finished = true; at(onDone, 900) }
    const cancel = speakSeq(lines, { onWord: i => { started = true; apply(i) }, onDone: complete })
    cl.push(cancel)
    at(() => { if (started || finished) return; cancel(); let t = 0; for (let k = 1; k <= mults.length; k++) { const kk = k; at(() => { setShown(kk); speak(String(mults[kk - 1])) }, t); t += 800 } at(() => { setDone(true); speak(`Those are the multiples of ${base}!`) }, t); t += 1600; at(() => { speak(outro); complete() }, t) }, 1900)
    return () => cl.forEach(f => f())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const shownMults = new Set(mults.slice(0, shown))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, position: 'relative' }}>
      {done && <Confetti />}
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, color: 'var(--milo-orange)' }}>Multiples of {base}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', maxWidth: 360 }}>
        {Array.from({ length: upTo }, (_, i) => i + 1).map(num => {
          const hot = shownMults.has(num)
          return (
            <div key={num} style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, background: hot ? 'var(--milo-orange)' : 'var(--paper)', color: hot ? '#fff' : 'var(--ink-muted)', border: `2px solid ${hot ? 'var(--milo-orange-deep)' : 'var(--outline)'}`, transform: hot ? 'scale(1.08)' : 'scale(1)', transition: 'all 0.2s' }}>{num}</div>
          )
        })}
      </div>
      <div style={{ height: 30, fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, color: 'var(--garden-green-deep)' }}>{done ? mults.join(', ') : shown > 0 ? `${mults.slice(0, shown).join(', ')}…` : ''}</div>
    </div>
  )
}

// ─── Worked example: factor pairs of n ───────────────────────
export function FactorWatch({ n, intro, outro, onDone }: { n: number; intro: string; outro: string; onDone: () => void }) {
  const pairs = factorPairs(n)
  const facs = factorsOf(n)
  const [shown, setShown] = useState(0)
  const [done, setDone] = useState(false)
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return; ran.current = true
    const lines = [intro, ...pairs.map(([a, b]) => `${a} times ${b}`), `The factors of ${n} are ${facs.join(', ')}.`, outro]
    let started = false, finished = false
    const cl: Array<() => void> = []
    const at = (fn: () => void, ms: number) => { const id = window.setTimeout(fn, ms); cl.push(() => window.clearTimeout(id)) }
    const apply = (i: number) => { if (i >= 1 && i <= pairs.length) setShown(i); if (i === pairs.length + 1) setDone(true) }
    const complete = () => { if (finished) return; finished = true; at(onDone, 900) }
    const cancel = speakSeq(lines, { onWord: i => { started = true; apply(i) }, onDone: complete })
    cl.push(cancel)
    at(() => { if (started || finished) return; cancel(); let t = 0; for (let k = 1; k <= pairs.length; k++) { const kk = k; at(() => { setShown(kk); speak(`${pairs[kk - 1][0]} times ${pairs[kk - 1][1]}`) }, t); t += 1400 } at(() => { setDone(true); speak(`The factors of ${n} are ${facs.join(', ')}.`) }, t); t += 2200; at(() => { speak(outro); complete() }, t) }, 1900)
    return () => cl.forEach(f => f())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, position: 'relative' }}>
      {done && <Confetti />}
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 30, color: 'var(--milo-orange)' }}>Factors of {n}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minHeight: 80 }}>
        {pairs.map(([a, b], i) => (
          <div key={i} style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, color: 'var(--ink)', opacity: i < shown ? 1 : 0.18, transition: 'opacity 0.3s' }}>{a} × {b} = {n}</div>
        ))}
      </div>
      <div style={{ height: 44, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
        {done && facs.map(f => (
          <span key={f} style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, color: 'var(--garden-green-deep)', background: 'var(--garden-green-soft)', border: '2px solid var(--garden-green)', borderRadius: 10, padding: '4px 10px', animation: 'k_bounceIn 0.4s cubic-bezier(.34,1.56,.64,1)' }}>{f}</span>
        ))}
      </div>
    </div>
  )
}

// ─── Worked example: prime or composite ──────────────────────
export function PrimeWatch({ n, intro, outro, onDone }: { n: number; intro: string; outro: string; onDone: () => void }) {
  const prime = isPrime(n)
  const pairs = factorPairs(n)
  const facs = factorsOf(n)
  const [stage, setStage] = useState(0)
  const [done, setDone] = useState(false)
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return; ran.current = true
    const lines = [intro, `${n} has the factors ${facs.join(', ')}.`, prime ? `Only two factors — one and itself. ${n} is PRIME!` : `More than two factors. ${n} is composite.`, outro]
    let started = false, finished = false
    const cl: Array<() => void> = []
    const at = (fn: () => void, ms: number) => { const id = window.setTimeout(fn, ms); cl.push(() => window.clearTimeout(id)) }
    const apply = (i: number) => { if (i === 1) setStage(1); if (i === 2) { setStage(2); setDone(true) } }
    const complete = () => { if (finished) return; finished = true; at(onDone, 900) }
    const cancel = speakSeq(lines, { onWord: i => { started = true; apply(i) }, onDone: complete })
    cl.push(cancel)
    at(() => { if (started || finished) return; cancel(); let t = 0; at(() => { setStage(1); speak(lines[1]) }, t); t += 2400; at(() => { setStage(2); setDone(true); speak(lines[2]) }, t); t += 2600; at(() => { speak(outro); complete() }, t) }, 1900)
    return () => cl.forEach(f => f())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, position: 'relative' }}>
      {done && prime && <Confetti />}
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 48, color: 'var(--ink)' }}>{n}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minHeight: 56, opacity: stage >= 1 ? 1 : 0.2, transition: 'opacity 0.3s' }}>
        {pairs.map(([a, b], i) => (
          <div key={i} style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: 'var(--ink-soft)' }}>{a} × {b}</div>
        ))}
      </div>
      <div style={{ height: 46, display: 'flex', alignItems: 'center' }}>
        {done && (
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, color: '#fff', background: prime ? 'var(--garden-green)' : 'var(--sky-blue-deep)', borderRadius: 50, padding: '8px 24px', animation: 'k_bounceIn 0.45s cubic-bezier(.34,1.56,.64,1)' }}>{prime ? 'PRIME ⭐' : 'COMPOSITE'}</div>
        )}
      </div>
    </div>
  )
}

// ─── Generic interactive pick ────────────────────────────────
export function Pick({ prompt, options, answer, visual, intro, outro, onDone }: { prompt: string; options: string[]; answer: string; visual?: React.ReactNode; intro: string; outro: string; onDone: () => void }) {
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
    else { setWrong(c); speak('Not quite. Have another look!'); window.setTimeout(() => setWrong(null), 1000) }
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
    // ── Even & Odd ──
    { bubble: `Hi ${childName}! Even numbers pair up perfectly. 🔵`, mood: 'happy',
      render: d => <EvenOddWatch n={6} intro={`Hi ${childName}! Can six make perfect pairs? Let's see.`} outro="Pairs with none left — even!" onDone={d} /> },
    { bubble: 'Odd numbers have one left over. 🔶', mood: 'thinking',
      render: d => <EvenOddWatch n={7} intro="Now seven. Pair them up." outro="One is lonely — odd!" onDone={d} /> },
    { bubble: 'Even again? 🔵', mood: 'thinking',
      render: d => <EvenOddWatch n={10} intro="Try ten." outro="All paired — even!" onDone={d} /> },
    { bubble: 'Odd again? 🔶', mood: 'thinking',
      render: d => <EvenOddWatch n={9} intro="Try nine." outro="One left over — odd!" onDone={d} /> },
    { bubble: 'A small even number. 🔵', mood: 'thinking',
      render: d => <EvenOddWatch n={4} intro="What about four?" outro="Two pairs — even!" onDone={d} /> },
    { bubble: 'Your turn — even or odd? 👂', mood: 'thinking',
      render: d => <Pick prompt="Is 8 even or odd?" options={['Even', 'Odd']} answer="Even" visual={<DotPairsStatic n={8} />} intro="Is eight even or odd?" outro="Yes! Eight is even!" onDone={d} /> },
    { bubble: 'One more! 👂', mood: 'thinking',
      render: d => <Pick prompt="Is 5 even or odd?" options={['Even', 'Odd']} answer="Odd" visual={<DotPairsStatic n={5} />} intro="Is five even or odd?" outro="Yes! Five is odd!" onDone={d} /> },
    // ── Multiples ──
    { bubble: 'Multiples are skip-counting! 🐰', mood: 'happy',
      render: d => <MultiplesWatch base={2} upTo={12} intro="Count by twos — these are the multiples of two." outro="Multiples of two are all even!" onDone={d} /> },
    { bubble: 'Multiples of three! 🔢', mood: 'thinking',
      render: d => <MultiplesWatch base={3} upTo={18} intro="Now count by threes." outro="Those are multiples of three!" onDone={d} /> },
    { bubble: 'Multiples of four! 🔢', mood: 'thinking',
      render: d => <MultiplesWatch base={4} upTo={20} intro="Count by fours." outro="Multiples of four!" onDone={d} /> },
    { bubble: 'Multiples of five! 🖐️', mood: 'thinking',
      render: d => <MultiplesWatch base={5} upTo={25} intro="Count by fives." outro="Multiples of five end in 0 or 5!" onDone={d} /> },
    { bubble: 'Which is a multiple of 5? 👂', mood: 'thinking',
      render: d => <Pick prompt="Which is a multiple of 5?" options={['12', '15', '22']} answer="15" intro="Which one is a multiple of five?" outro="Yes! Fifteen!" onDone={d} /> },
    { bubble: 'Which is a multiple of 3? 👂', mood: 'thinking',
      render: d => <Pick prompt="Which is a multiple of 3?" options={['10', '12', '14']} answer="12" intro="Which one is a multiple of three?" outro="Yes! Twelve!" onDone={d} /> },
    // ── Factors ──
    { bubble: 'Factors divide a number exactly. 🧩', mood: 'happy',
      render: d => <FactorWatch n={6} intro="Factors of six: which pairs multiply to make six?" outro="Six has four factors!" onDone={d} /> },
    { bubble: 'Factors of twelve! 🧩', mood: 'thinking',
      render: d => <FactorWatch n={12} intro="Now the factors of twelve." outro="Twelve has lots of factors!" onDone={d} /> },
    { bubble: 'Factors of eight! 🧩', mood: 'thinking',
      render: d => <FactorWatch n={8} intro="Factors of eight." outro="One, two, four and eight!" onDone={d} /> },
    { bubble: 'Factors of ten! 🧩', mood: 'thinking',
      render: d => <FactorWatch n={10} intro="Factors of ten." outro="One, two, five and ten!" onDone={d} /> },
    { bubble: 'Which is a factor of 12? 👂', mood: 'thinking',
      render: d => <Pick prompt="Which is a factor of 12?" options={['5', '4', '7']} answer="4" intro="Which one is a factor of twelve?" outro="Yes! Four divides twelve exactly!" onDone={d} /> },
    // ── Primes ──
    { bubble: 'A PRIME has just two factors. ⭐', mood: 'happy',
      render: d => <PrimeWatch n={7} intro="Seven — what are its factors?" outro="Only one and seven — prime!" onDone={d} /> },
    { bubble: 'Composite has more. 🔷', mood: 'thinking',
      render: d => <PrimeWatch n={6} intro="Six — count its factors." outro="More than two — composite!" onDone={d} /> },
    { bubble: 'Is five prime? ⭐', mood: 'thinking',
      render: d => <PrimeWatch n={5} intro="Five — its factors?" outro="One and five only — prime!" onDone={d} /> },
    { bubble: 'Is nine prime? 🔷', mood: 'thinking',
      render: d => <PrimeWatch n={9} intro="Nine — its factors?" outro="One, three, nine — composite!" onDone={d} /> },
    { bubble: 'Two is special! ⭐', mood: 'happy',
      render: d => <PrimeWatch n={2} intro="Two — its factors?" outro="One and two — prime! The only even prime!" onDone={d} /> },
    { bubble: 'Is three prime? ⭐', mood: 'thinking',
      render: d => <PrimeWatch n={3} intro="Three — its factors?" outro="One and three only — prime!" onDone={d} /> },
    { bubble: 'A bigger prime! ⭐', mood: 'thinking',
      render: d => <PrimeWatch n={13} intro="Thirteen — its factors?" outro="Only one and thirteen — prime!" onDone={d} /> },
    { bubble: 'Is ten prime? 🔷', mood: 'thinking',
      render: d => <PrimeWatch n={10} intro="Ten — its factors?" outro="One, two, five, ten — composite!" onDone={d} /> },
    { bubble: 'Is fifteen prime? 🔷', mood: 'thinking',
      render: d => <PrimeWatch n={15} intro="Fifteen — its factors?" outro="One, three, five, fifteen — composite!" onDone={d} /> },
    { bubble: 'Your turn — is 11 prime? 👂', mood: 'thinking',
      render: d => <Pick prompt="Is 11 prime?" options={['Yes', 'No']} answer="Yes" intro="Is eleven prime?" outro="Yes! Eleven is prime!" onDone={d} /> },
    { bubble: 'Last one — is 8 prime? 👂', mood: 'thinking',
      render: d => <Pick prompt="Is 8 prime?" options={['Yes', 'No']} answer="No" intro="Is eight prime?" outro="Right! Eight is composite, not prime!" onDone={d} /> },
  ]
}

// Static dot-pairs for pick visuals (no animation).
function DotPairsStatic({ n }: { n: number }) { return <DotPairs n={n} show flagLeftover={false} /> }

export default function FactorsLesson({ childName, onLessonComplete }: Props) {
  return (
    <LessonScaffold
      childName={childName}
      onLessonComplete={onLessonComplete}
      steps={buildSteps(childName)}
      finalSpeech={`Brilliant, ${childName}! Even, odd, multiples, factors and primes — now let's practise!`}
    />
  )
}
