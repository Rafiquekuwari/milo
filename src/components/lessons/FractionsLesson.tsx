'use client'
/**
 * FractionsLesson — halves, thirds, quarters for 6–8 year olds. Two ideas:
 *   • a fraction = EQUAL parts of one whole (shade 1 of D parts → 1/D)
 *   • a fraction OF a group (half of 6 = one of two equal groups = 3)
 *
 * Exports FractionBar / Frac / FractionWatch / FractionAsk / GroupScene /
 * GroupWatch / GroupAsk / buildFracNumChoices / fracWord for the practice + re-teach.
 */
import React, { useState, useEffect, useRef, useMemo } from 'react'
import { speak, speakSeq } from '@/lib/useMiloSpeaker'
import { LessonScaffold, SectionBreak, Confetti, BigCount, numberToWords, type LessonStep } from './_kit'

interface Props { childName: string; onLessonComplete: () => void }

export const DENS = [2, 3, 4] // halves, thirds, quarters
export function fracWord(d: number, plural = false): string {
  const w = d === 2 ? 'half' : d === 3 ? 'third' : 'quarter'
  return plural ? (d === 2 ? 'halves' : w + 's') : w
}

// Stacked fraction label, e.g. 1 / 2.
export function Frac({ n, d, size = 26 }: { n: number; d: number; size?: number }) {
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1, fontFamily: 'var(--font-display)', fontWeight: 900 }}>
      <span style={{ fontSize: size }}>{n}</span>
      <span style={{ width: size, height: 3, background: 'currentColor', margin: '3px 0' }} />
      <span style={{ fontSize: size }}>{d}</span>
    </span>
  )
}

// A whole bar split into `parts` equal pieces, `shaded` of them filled.
export function FractionBar({ parts, shaded }: { parts: number; shaded: number }) {
  return (
    <div style={{ display: 'flex', width: 'min(80vw, 280px)', height: 70, border: '4px solid var(--outline)', borderRadius: 14, overflow: 'hidden', boxShadow: '0 4px 0 rgba(61,37,22,.15)' }}>
      {Array.from({ length: parts }).map((_, i) => (
        <div key={i} style={{
          flex: 1, borderRight: i < parts - 1 ? '3px solid var(--outline)' : 'none',
          background: i < shaded ? 'var(--milo-orange)' : 'var(--paper)',
          transition: 'background 0.3s ease',
        }} />
      ))}
    </div>
  )
}

// `total` items split into `den` equal groups; the first group is the "one part".
export function GroupScene({ total, den, emoji, lit = 99 }: { total: number; den: number; emoji: string; lit?: number }) {
  const per = total / den
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 380 }}>
      {Array.from({ length: den }).map((_, g) => (
        <div key={g} style={{
          display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'center', alignContent: 'center', maxWidth: 92, padding: 8,
          borderRadius: 14, border: `3px ${g === 0 ? 'solid' : 'dashed'} ${g === 0 ? 'var(--garden-green)' : 'var(--outline)'}`,
          background: g === 0 ? 'var(--garden-green-soft)' : 'var(--paper-soft)',
          opacity: g < lit ? 1 : 0.18, transition: 'all 0.3s ease',
        }}>
          {Array.from({ length: per }).map((_, i) => <span key={i} style={{ fontSize: 24 }}>{emoji}</span>)}
        </div>
      ))}
    </div>
  )
}

export function buildFracNumChoices(answer: number): number[] {
  const opts = new Set<number>([answer])
  for (const v of [answer + 1, answer - 1, answer * 2, answer + 2]) { if (opts.size < 3 && v > 0 && v !== answer) opts.add(v) }
  while (opts.size < 3) { const v = answer + (Math.floor(Math.random() * 5) - 2); if (v > 0 && v !== answer) opts.add(v) }
  return [...opts].sort(() => Math.random() - 0.5)
}

// ─── Watch: split a whole into D equal parts and shade one ──
export function FractionWatch({ den, intro, outro, onDone }: { den: number; intro: string; outro: string; onDone: () => void }) {
  const [parts, setParts] = useState(1)
  const [shaded, setShaded] = useState(0)
  const [showLabel, setShowLabel] = useState(false)
  const doneRef = useRef(onDone); doneRef.current = onDone
  useEffect(() => {
    const cancel = speakSeq([intro, `Split into ${numberToWords(den)} equal parts.`, `Shade one part. That is one ${fracWord(den)}!`], {
      onWord: (i) => { if (i === 1) setParts(den); else if (i === 2) { setShaded(1); setShowLabel(true) } },
      onDone: () => window.setTimeout(() => doneRef.current(), 900),
    })
    return cancel
  }, []) // eslint-disable-line
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <FractionBar parts={parts} shaded={shaded} />
      {showLabel && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--milo-orange)', animation: 'k_flipIn 0.5s ease' }}>
          <Frac n={1} d={den} size={32} />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22 }}>one {fracWord(den)}</span>
        </div>
      )}
    </div>
  )
}

// ─── Watch: split a group into D equal parts; one part is the answer ──
export function GroupWatch({ total, den, emoji, onDone }: { total: number; den: number; emoji: string; onDone: () => void }) {
  const answer = total / den
  const [lit, setLit] = useState(0)
  const [show, setShow] = useState(false)
  const doneRef = useRef(onDone); doneRef.current = onDone
  useEffect(() => {
    const cancel = speakSeq([
      `Split ${numberToWords(total)} into ${numberToWords(den)} equal groups.`,
      `One ${fracWord(den)} of ${numberToWords(total)} is ${numberToWords(answer)}!`,
    ], {
      onWord: (i) => { if (i === 0) setLit(den); else if (i === 1) setShow(true) },
      onDone: () => window.setTimeout(() => doneRef.current(), 900),
    })
    return cancel
  }, []) // eslint-disable-line
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <GroupScene total={total} den={den} emoji={emoji} lit={lit} />
      {show && <div style={{ background: 'var(--milo-orange)', color: '#fff', borderRadius: 50, padding: '8px 22px', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 20, animation: 'k_flipIn 0.5s ease' }}>one {fracWord(den)} of {total} = {answer}</div>}
    </div>
  )
}

// ─── Interactive: which fraction is shaded? (pick the denominator) ──
export function FractionAsk({ den, intro, outro, onDone }: { den: number; intro: string; outro: string; onDone: () => void }) {
  const [picked, setPicked] = useState<number | null>(null)
  const [wrong, setWrong] = useState<number | null>(null)
  const [burst, setBurst] = useState(false)
  const spoken = useRef(false)
  useEffect(() => { if (spoken.current) return; spoken.current = true; speak(intro) }, []) // eslint-disable-line
  function pick(c: number) {
    if (picked != null) return
    if (c === den) { setPicked(c); setWrong(null); setBurst(true); speak(outro); window.setTimeout(onDone, 2200) }
    else { setWrong(c); speak('Not quite! Count the equal parts.'); window.setTimeout(() => setWrong(null), 950) }
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, position: 'relative' }}>
      {burst && <Confetti />}
      <FractionBar parts={den} shaded={1} />
      <div style={S.qPill}>What fraction is shaded?</div>
      <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
        {DENS.map(c => {
          const isRight = picked === c, isWrong = wrong === c
          return (
            <button key={c} onClick={() => pick(c)} disabled={picked != null} style={{ ...btn(isRight, isWrong), color: 'var(--ink)' }}>
              <Frac n={1} d={c} size={24} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Interactive: a fraction of a group → a number ──
export function GroupAsk({ total, den, emoji, choices, intro, outro, onDone }: {
  total: number; den: number; emoji: string; choices: number[]; intro: string; outro: string; onDone: () => void
}) {
  const answer = total / den
  const [picked, setPicked] = useState<number | null>(null)
  const [wrong, setWrong] = useState<number | null>(null)
  const [burst, setBurst] = useState(false)
  const spoken = useRef(false)
  useEffect(() => { if (spoken.current) return; spoken.current = true; speak(intro) }, []) // eslint-disable-line
  function pick(c: number) {
    if (picked != null) return
    if (c === answer) { setPicked(c); setWrong(null); setBurst(true); speak(outro); window.setTimeout(onDone, 2200) }
    else { setWrong(c); speak('Not quite! Count one group.'); window.setTimeout(() => setWrong(null), 950) }
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, position: 'relative' }}>
      {burst && <Confetti />}
      <GroupScene total={total} den={den} emoji={emoji} />
      <div style={S.qPill}>One {fracWord(den)} of {total}?</div>
      <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
        {choices.map(c => {
          const isRight = picked === c, isWrong = wrong === c
          return <button key={c} onClick={() => pick(c)} disabled={picked != null} style={btn(isRight, isWrong)}>{c}</button>
        })}
      </div>
    </div>
  )
}

function btn(isRight: boolean, isWrong: boolean): React.CSSProperties {
  return {
    width: 80, height: 80, borderRadius: 18,
    background: isRight ? 'var(--garden-green-soft)' : isWrong ? 'var(--apple-red-soft)' : 'var(--paper)',
    border: `4px solid ${isRight ? 'var(--garden-green)' : isWrong ? 'var(--apple-red)' : 'var(--outline)'}`,
    boxShadow: isRight ? '0 6px 0 var(--garden-green-deep)' : isWrong ? '0 6px 0 var(--apple-red-deep)' : '0 6px 0 #c8ac79',
    fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 32, color: 'var(--ink)',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    transform: isRight ? 'scale(1.1) translateY(-4px)' : 'scale(1)',
    transition: 'transform 160ms cubic-bezier(.34,1.56,.64,1),background 160ms ease',
  }
}

export default function FractionsLesson({ childName, onLessonComplete }: Props) {
  const C = useMemo(() => ({ half6: buildFracNumChoices(3), half8: buildFracNumChoices(4) }), [])
  const steps: LessonStep[] = [
    // Explain ALL three fractions first (watch), then ask.
    { bubble: `Hi ${childName}! A fraction is EQUAL parts of a whole. Watch! 🍕`, mood: 'happy',
      render: d => <FractionWatch den={2} intro="Two equal parts. Shade one." outro="One half!" onDone={d} /> },
    { bubble: 'Now THIRDS — three equal parts. Watch! ', mood: 'happy',
      render: d => <FractionWatch den={3} intro="Three equal parts. Shade one." outro="One third!" onDone={d} /> },
    { bubble: 'And QUARTERS — four equal parts. Watch!', mood: 'happy',
      render: d => <FractionWatch den={4} intro="Four equal parts. Shade one." outro="One quarter!" onDone={d} /> },
    { bubble: '🎉 Half, third, quarter!', mood: 'celebrate',
      render: d => <SectionBreak emoji="🍕" title="Equal parts!" subtitle="½ = 2 parts · ⅓ = 3 parts · ¼ = 4 parts" onDone={d} /> },

    // Now ask about each (all already shown).
    { bubble: 'Now YOU — what fraction is shaded? 🤔', mood: 'thinking',
      render: d => <FractionAsk den={2} intro="Two equal parts. One is shaded. What fraction?" outro="Yes! One half!" onDone={d} /> },
    { bubble: 'What fraction is shaded? 🤔', mood: 'thinking',
      render: d => <FractionAsk den={4} intro="Four equal parts. One is shaded. What fraction?" outro="Yes! One quarter!" onDone={d} /> },
    { bubble: 'And this one? 🤔', mood: 'thinking',
      render: d => <FractionAsk den={3} intro="Three equal parts. One is shaded. What fraction?" outro="Yes! One third!" onDone={d} /> },

    { bubble: '🌟 A fraction of a GROUP!', mood: 'celebrate',
      render: d => <SectionBreak emoji="🍪" title="Half of a group!" subtitle="Split the group into equal parts." onDone={d} /> },
    { bubble: 'Half of six cookies — watch!', mood: 'happy',
      render: d => <GroupWatch total={6} den={2} emoji="🍪" onDone={d} /> },
    { bubble: 'Your turn — what is half of eight? 🤔', mood: 'thinking',
      render: d => <GroupAsk total={8} den={2} emoji="⭐" choices={C.half8} intro="Split eight into two equal groups. What is half of eight?" outro="Yes! Half of eight is four!" onDone={d} /> },
  ]
  return (
    <LessonScaffold childName={childName} onLessonComplete={onLessonComplete} steps={steps}
      finalSpeech={`Wonderful, ${childName}! You know halves, thirds and quarters! Let’s practise!`} />
  )
}

const S: Record<string, React.CSSProperties> = {
  qPill: { fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: 'var(--milo-orange)', background: 'var(--milo-orange-soft)', borderRadius: 50, padding: '6px 18px', border: '2px solid var(--milo-orange)' },
}
