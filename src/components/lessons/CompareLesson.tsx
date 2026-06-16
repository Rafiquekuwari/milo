'use client'
/**
 * CompareLesson — comparing numbers with >, <, = for 6–8. The sign "points to"
 * (opens toward) the bigger number. Worked examples first, then questions.
 *
 * Exports CompareView / compareSign / CompareWatch / CompareAsk for the practice + re-teach.
 */
import React, { useState, useEffect, useRef } from 'react'
import { speak, speakSeq } from '@/lib/useMiloSpeaker'
import { LessonScaffold, SectionBreak, Confetti, numberToWords, type LessonStep } from './_kit'

interface Props { childName: string; onLessonComplete: () => void }

export const SIGNS = ['>', '<', '=']
export function compareSign(a: number, b: number): string { return a > b ? '>' : a < b ? '<' : '=' }
function signPhrase(a: number, b: number): string {
  if (a > b) return `${numberToWords(a)} is greater than ${numberToWords(b)}.`
  if (a < b) return `${numberToWords(a)} is less than ${numberToWords(b)}.`
  return `${numberToWords(a)} is equal to ${numberToWords(b)}.`
}

export function CompareView({ a, b, sign }: { a: number; b: number; sign: string | null }) {
  const box = (n: number) => (
    <div style={{ minWidth: 84, padding: '12px 18px', borderRadius: 18, border: '4px solid var(--outline)', background: 'var(--paper)', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(34px, 9vw, 48px)', color: 'var(--ink)', boxShadow: '0 4px 0 rgba(61,37,22,.15)' }}>{n}</div>
  )
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      {box(a)}
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 52, color: sign ? 'var(--milo-orange)' : 'var(--ink-muted)', minWidth: 40, textAlign: 'center' }}>{sign ?? '?'}</span>
      {box(b)}
    </div>
  )
}

export function CompareWatch({ a, b, onDone }: { a: number; b: number; onDone: () => void }) {
  const [show, setShow] = useState(false)
  const doneRef = useRef(onDone); doneRef.current = onDone
  useEffect(() => {
    const cancel = speakSeq(['Compare the numbers.', signPhrase(a, b)], {
      onWord: (i) => { if (i === 1) setShow(true) },
      onDone: () => window.setTimeout(() => doneRef.current(), 1100),
    })
    return cancel
  }, []) // eslint-disable-line
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <CompareView a={a} b={b} sign={show ? compareSign(a, b) : null} />
      {show && <div style={{ background: 'var(--milo-orange)', color: '#fff', borderRadius: 50, padding: '8px 22px', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, animation: 'k_flipIn 0.5s ease' }}>{a > b ? 'greater than' : a < b ? 'less than' : 'equal to'}</div>}
    </div>
  )
}

export function CompareAsk({ a, b, intro, outro, onDone }: { a: number; b: number; intro: string; outro: string; onDone: () => void }) {
  const answer = compareSign(a, b)
  const [picked, setPicked] = useState<string | null>(null)
  const [wrong, setWrong] = useState<string | null>(null)
  const [burst, setBurst] = useState(false)
  const spoken = useRef(false)
  useEffect(() => { if (spoken.current) return; spoken.current = true; speak(intro) }, []) // eslint-disable-line
  function pick(c: string) {
    if (picked != null) return
    if (c === answer) { setPicked(c); setWrong(null); setBurst(true); speak(outro); window.setTimeout(onDone, 2100) }
    else { setWrong(c); speak('Not quite! Which number is bigger?'); window.setTimeout(() => setWrong(null), 950) }
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, position: 'relative' }}>
      {burst && <Confetti />}
      <CompareView a={a} b={b} sign={picked} />
      <div style={S.qPill}>Which sign is right?</div>
      <div style={{ display: 'flex', gap: 14, justifyContent: 'center' }}>
        {SIGNS.map(c => {
          const isRight = picked === c, isWrong = wrong === c
          return (
            <button key={c} onClick={() => pick(c)} disabled={picked != null} style={{
              width: 84, height: 84, borderRadius: 18,
              background: isRight ? 'var(--garden-green-soft)' : isWrong ? 'var(--apple-red-soft)' : 'var(--paper)',
              border: `4px solid ${isRight ? 'var(--garden-green)' : isWrong ? 'var(--apple-red)' : 'var(--outline)'}`,
              boxShadow: isRight ? '0 6px 0 var(--garden-green-deep)' : isWrong ? '0 6px 0 var(--apple-red-deep)' : '0 6px 0 #c8ac79',
              fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 40, color: 'var(--ink)',
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

export default function CompareLesson({ childName, onLessonComplete }: Props) {
  const steps: LessonStep[] = [
    { bubble: `Hi ${childName}! The sign opens toward the BIGGER number! Watch. 🐊`, mood: 'happy',
      render: d => <CompareWatch a={5} b={2} onDone={d} /> },
    { bubble: 'Now the smaller one is first! 👀', mood: 'happy',
      render: d => <CompareWatch a={3} b={8} onDone={d} /> },
    { bubble: 'When they’re the same — equals! 👀', mood: 'happy',
      render: d => <CompareWatch a={6} b={6} onDone={d} /> },
    { bubble: 'Bigger numbers work the same way! 👀', mood: 'happy',
      render: d => <CompareWatch a={42} b={37} onDone={d} /> },
    { bubble: 'Watch one more! 👀', mood: 'happy',
      render: d => <CompareWatch a={18} b={61} onDone={d} /> },

    { bubble: '🌟 Now YOU pick the sign!', mood: 'celebrate',
      render: d => <SectionBreak emoji="⚖️" title="Your turn!" subtitle="> bigger · < smaller · = same" onDone={d} /> },

    { bubble: 'Which sign is right? 🤔', mood: 'thinking',
      render: d => <CompareAsk a={7} b={4} intro="Seven and four. Which sign is right?" outro="Yes! Seven is greater than four!" onDone={d} /> },
    { bubble: 'And this one? 🤔', mood: 'thinking',
      render: d => <CompareAsk a={23} b={45} intro="Twenty-three and forty-five. Which sign?" outro="Yes! Twenty-three is less than forty-five!" onDone={d} /> },
    { bubble: 'Last one! 🤔', mood: 'thinking',
      render: d => <CompareAsk a={50} b={50} intro="Fifty and fifty. Which sign?" outro="Yes! They are equal!" onDone={d} /> },
  ]
  return (
    <LessonScaffold childName={childName} onLessonComplete={onLessonComplete} steps={steps}
      finalSpeech={`Great job, ${childName}! You can compare numbers! Let’s practise!`} />
  )
}

const S: Record<string, React.CSSProperties> = {
  qPill: { fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: 'var(--milo-orange)', background: 'var(--milo-orange-soft)', borderRadius: 50, padding: '6px 18px', border: '2px solid var(--milo-orange)' },
}
