'use client'
/**
 * MoneyLesson — coins & counting money for 6–8 year olds. Generic coins worth
 * 1, 5, 10, 25 (shown as numbered coins, no country names). Teaches: each coin's
 * value, then counting a handful by adding the values (count from the biggest).
 *
 * Exports Coin / CoinRow / CoinWatch / CoinAsk / buildCoinChoices / COIN_VALUES.
 */
import React, { useState, useEffect, useRef, useMemo } from 'react'
import { speak, speakSeq } from '@/lib/useMiloSpeaker'
import { LessonScaffold, SectionBreak, Confetti, BigCount, numberToWords, type LessonStep } from './_kit'

interface Props { childName: string; onLessonComplete: () => void }

export const COIN_VALUES = [1, 5, 10, 25]
const COIN_STYLE: Record<number, { bg: string; bd: string }> = {
  1: { bg: '#D08B3C', bd: '#9C6322' },   // bronze
  5: { bg: '#B9BEC4', bd: '#7E848B' },   // silver
  10: { bg: '#E0A33E', bd: '#A9761F' },  // gold
  25: { bg: '#7FB2D9', bd: '#4E84AB' },  // blue
}

export function Coin({ value, size = 52 }: { value: number; size?: number }) {
  const c = COIN_STYLE[value] ?? COIN_STYLE[1]
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `radial-gradient(circle at 34% 30%, rgba(255,255,255,.55), ${c.bg})`,
      border: `3px solid ${c.bd}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: size * 0.4, color: '#fff',
      textShadow: '0 1px 2px rgba(0,0,0,.35)', boxShadow: '0 3px 0 rgba(61,37,22,.2)', flexShrink: 0,
    }}>{value}</div>
  )
}

export function CoinRow({ coins, lit = 99, size = 52 }: { coins: number[]; lit?: number; size?: number }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 360 }}>
      {coins.map((v, i) => (
        <div key={i} style={{ opacity: i < lit ? 1 : 0.18, transform: i === lit - 1 ? 'scale(1.12)' : 'scale(1)', transition: 'all 0.25s ease' }}>
          <Coin value={v} size={size} />
        </div>
      ))}
    </div>
  )
}

export function buildCoinChoices(answer: number): number[] {
  const opts = new Set<number>([answer])
  for (const v of [answer + 1, answer - 1, answer + 5, answer - 5, answer + 2]) { if (opts.size < 3 && v > 0 && v !== answer) opts.add(v) }
  while (opts.size < 3) { const v = answer + (Math.floor(Math.random() * 7) - 3); if (v > 0 && v !== answer) opts.add(v) }
  return [...opts].sort(() => Math.random() - 0.5)
}

// ─── Meet the coins: reveal each coin and say its worth ──
function CoinMeet({ onDone }: { onDone: () => void }) {
  const [lit, setLit] = useState(0)
  const doneRef = useRef(onDone); doneRef.current = onDone
  useEffect(() => {
    const cancel = speakSeq(['Meet the coins!', 'This coin is worth one.', 'This one is worth five.', 'This is worth ten.', 'And this is worth twenty-five!'], {
      onWord: (i) => { if (i >= 1 && i <= 4) setLit(i) },
      onDone: () => window.setTimeout(() => doneRef.current(), 900),
    })
    return cancel
  }, []) // eslint-disable-line
  return (
    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
      {COIN_VALUES.map((v, i) => (
        <div key={v} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, opacity: i < lit ? 1 : 0.18, transform: i === lit - 1 ? 'scale(1.12)' : 'scale(1)', transition: 'all 0.3s ease' }}>
          <Coin value={v} size={60} />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, color: 'var(--ink-soft)' }}>worth {v}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Count a handful: reveal coins, adding up the running total ──
export function CoinWatch({ coins, intro, onDone }: { coins: number[]; intro: string; onDone: () => void }) {
  const cum = coins.reduce<number[]>((acc, v, i) => { acc.push((acc[i - 1] ?? 0) + v); return acc }, [])
  const total = cum[cum.length - 1]
  const [lit, setLit] = useState(0)
  const [big, setBig] = useState<number | null>(null)
  const [show, setShow] = useState(false)
  const doneRef = useRef(onDone); doneRef.current = onDone
  useEffect(() => {
    const words = [intro, ...cum.map(c => numberToWords(c)), `Altogether, ${numberToWords(total)}!`]
    const cancel = speakSeq(words, {
      onWord: (i) => { if (i >= 1 && i <= coins.length) { setLit(i); setBig(cum[i - 1]) } else if (i === coins.length + 1) { setBig(total); setShow(true) } },
      onDone: () => window.setTimeout(() => doneRef.current(), 900),
    })
    return cancel
  }, []) // eslint-disable-line
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <div style={{ height: 56, display: 'flex', alignItems: 'center' }}>{big != null && <BigCount key={big} n={big} />}</div>
      <CoinRow coins={coins} lit={lit} />
      {show && <div style={{ background: 'var(--milo-orange)', color: '#fff', borderRadius: 50, padding: '8px 22px', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, animation: 'k_flipIn 0.5s ease' }}>= {total}</div>}
    </div>
  )
}

// ─── Interactive: how much money? (retry till right) ──
export function CoinAsk({ coins, choices, intro, outro, onDone }: { coins: number[]; choices: number[]; intro: string; outro: string; onDone: () => void }) {
  const answer = coins.reduce((s, v) => s + v, 0)
  const [picked, setPicked] = useState<number | null>(null)
  const [wrong, setWrong] = useState<number | null>(null)
  const [burst, setBurst] = useState(false)
  const spoken = useRef(false)
  useEffect(() => { if (spoken.current) return; spoken.current = true; speak(intro) }, []) // eslint-disable-line
  function pick(c: number) {
    if (picked != null) return
    if (c === answer) { setPicked(c); setWrong(null); setBurst(true); speak(outro); window.setTimeout(onDone, 2200) }
    else { setWrong(c); speak('Not quite! Add the coins again.'); window.setTimeout(() => setWrong(null), 950) }
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, position: 'relative' }}>
      {burst && <Confetti />}
      <CoinRow coins={coins} />
      <div style={S.qPill}>How much money?</div>
      <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
        {choices.map(c => {
          const isRight = picked === c, isWrong = wrong === c
          return (
            <button key={c} onClick={() => pick(c)} disabled={picked != null} style={{
              width: 80, height: 80, borderRadius: 18,
              background: isRight ? 'var(--garden-green-soft)' : isWrong ? 'var(--apple-red-soft)' : 'var(--paper)',
              border: `4px solid ${isRight ? 'var(--garden-green)' : isWrong ? 'var(--apple-red)' : 'var(--outline)'}`,
              boxShadow: isRight ? '0 6px 0 var(--garden-green-deep)' : isWrong ? '0 6px 0 var(--apple-red-deep)' : '0 6px 0 #c8ac79',
              fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 32, color: 'var(--ink)',
              cursor: picked != null ? 'default' : 'pointer',
              transform: isRight ? 'scale(1.1) translateY(-4px)' : 'scale(1)',
              transition: 'transform 160ms cubic-bezier(.34,1.56,.64,1),background 160ms ease',
            }}>{c}</button>
          )
        })}
      </div>
    </div>
  )
}

export default function MoneyLesson({ childName, onLessonComplete }: Props) {
  const C = useMemo(() => ({ c7: buildCoinChoices(7), c16: buildCoinChoices(16), c25: buildCoinChoices(25) }), [])
  const steps: LessonStep[] = [
    { bubble: `Hi ${childName}! Let’s meet the coins! 🪙`, mood: 'happy',
      render: d => <CoinMeet onDone={d} /> },
    { bubble: '🎉 Now count your coins!', mood: 'celebrate',
      render: d => <SectionBreak emoji="🪙" title="Count your coins!" subtitle="Add up the coin values." onDone={d} /> },

    // Watch several handfuls counted up.
    { bubble: 'Two fives — count them! 🪙', mood: 'happy',
      render: d => <CoinWatch coins={[5, 5]} intro="Two coins worth five. Count up." onDone={d} /> },
    { bubble: 'Three ones — count them! 🪙', mood: 'happy',
      render: d => <CoinWatch coins={[1, 1, 1]} intro="Three coins worth one. Count up." onDone={d} /> },
    { bubble: 'Two fives and a one! 🪙', mood: 'happy',
      render: d => <CoinWatch coins={[5, 5, 1]} intro="Five, ten, and one more. Count up." onDone={d} /> },
    { bubble: 'A ten and a five! 🪙', mood: 'happy',
      render: d => <CoinWatch coins={[10, 5]} intro="A ten and a five. Count up." onDone={d} /> },
    { bubble: 'Two tens! 🪙', mood: 'happy',
      render: d => <CoinWatch coins={[10, 10]} intro="Two coins worth ten. Count up." onDone={d} /> },
    { bubble: 'A twenty-five and a five! 🪙', mood: 'happy',
      render: d => <CoinWatch coins={[25, 5]} intro="A twenty-five and a five. Count up." onDone={d} /> },

    { bubble: '🌟 Now YOU count!', mood: 'celebrate',
      render: d => <SectionBreak emoji="🧮" title="Your turn!" subtitle="Add the coins and pick the total." onDone={d} /> },

    { bubble: 'How much money? 🤔', mood: 'thinking',
      render: d => <CoinAsk coins={[5, 1, 1]} choices={C.c7} intro="Add the coins. Five, and one, and one. How much money?" outro="Yes! Seven!" onDone={d} /> },
    { bubble: 'How much money? 🤔', mood: 'thinking',
      render: d => <CoinAsk coins={[10, 5, 1]} choices={C.c16} intro="A ten, a five, and a one. How much money?" outro="Yes! Sixteen!" onDone={d} /> },
    { bubble: 'Last one — count carefully! 🤔', mood: 'thinking',
      render: d => <CoinAsk coins={[10, 10, 5]} choices={C.c25} intro="Two tens and a five. How much money?" outro="Yes! Twenty-five!" onDone={d} /> },
  ]
  return (
    <LessonScaffold childName={childName} onLessonComplete={onLessonComplete} steps={steps}
      finalSpeech={`Great job, ${childName}! You can count money! Let’s practise!`} />
  )
}

const S: Record<string, React.CSSProperties> = {
  qPill: { fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: 'var(--milo-orange)', background: 'var(--milo-orange-soft)', borderRadius: 50, padding: '6px 18px', border: '2px solid var(--milo-orange)' },
}
