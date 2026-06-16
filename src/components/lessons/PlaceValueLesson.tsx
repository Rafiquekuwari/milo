'use client'
/**
 * PlaceValueLesson — tens & ones for 6–8 year olds. Teaches that a two-digit
 * number is some TENS and some ONES, how to count them, and how to read the
 * whole number back. Built on the shared kit; reuses ReadNumber / TensOnes /
 * NumberChart from Numbers100Lesson. Exports AskChoice for the practice re-teach.
 */
import React, { useState, useEffect, useRef } from 'react'
import { speak } from '@/lib/useMiloSpeaker'
import { LessonScaffold, SectionBreak, Confetti, numberToWords, type LessonStep } from './_kit'
import { ReadNumber, TensOnes, NumberChart } from './Numbers100Lesson'

interface Props { childName: string; onLessonComplete: () => void }

// Big numeral shown above the blocks for tens/ones questions.
function Numeral({ n }: { n: number }) {
  return <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 56, lineHeight: 1, color: 'var(--milo-orange)', textShadow: '0 4px 0 rgba(61,37,22,.12)' }}>{n}</div>
}

// ═══ Show a visual + question, tap the right answer (gentle: retry till right) ═══
export function AskChoice({ promptText, visual, choices, answer, intro, outro, onDone }: {
  promptText: string; visual: React.ReactNode; choices: number[]; answer: number
  intro: string; outro: string; onDone: () => void
}) {
  const [picked, setPicked] = useState<number | null>(null)
  const [wrong, setWrong] = useState<number | null>(null)
  const [burst, setBurst] = useState(false)
  const spoken = useRef(false)
  useEffect(() => { if (spoken.current) return; spoken.current = true; speak(intro) }, [intro])

  function pick(c: number) {
    if (picked != null) return
    if (c === answer) {
      setPicked(c); setWrong(null); setBurst(true)
      speak(outro)
      window.setTimeout(onDone, 2200)
    } else {
      setWrong(c)
      speak(`Not quite! ${promptText}`)
      window.setTimeout(() => setWrong(null), 950)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, position: 'relative' }}>
      {burst && <Confetti />}
      {visual}
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: 'var(--milo-orange)',
        background: 'var(--milo-orange-soft)', borderRadius: 50, padding: '6px 18px', border: '2px solid var(--milo-orange)' }}>
        {promptText}
      </div>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        {choices.map(c => {
          const isRight = picked === c, isWrong = wrong === c
          return (
            <button key={c} onClick={() => pick(c)} disabled={picked != null} style={{
              width: 78, height: 78, borderRadius: 18,
              background: isRight ? 'var(--garden-green-soft)' : isWrong ? 'var(--apple-red-soft)' : 'var(--paper)',
              border: `4px solid ${isRight ? 'var(--garden-green)' : isWrong ? 'var(--apple-red)' : 'var(--outline)'}`,
              boxShadow: isRight ? '0 6px 0 var(--garden-green-deep)' : isWrong ? '0 6px 0 var(--apple-red-deep)' : '0 6px 0 #c8ac79',
              fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 34, color: 'var(--ink)',
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

// Static full blocks for a number (tens rods + ones dots).
export function NumberBlocks({ n }: { n: number }) {
  return <TensOnes n={n} revealTens={Math.floor(n / 10)} revealOnes={n % 10} />
}

export default function PlaceValueLesson({ childName, onLessonComplete }: Props) {
  const steps: LessonStep[] = [
    { bubble: `Hi ${childName}! A big number is made of TENS and ONES. Watch! ✋`, mood: 'happy',
      render: d => <ReadNumber n={23} intro="Let's build twenty-three. Two tens…" outro="Two tens and three ones make twenty-three!" onDone={d} /> },
    { bubble: '🎉 Every number has tens and ones!', mood: 'celebrate',
      render: d => <SectionBreak emoji="🧱" title="Tens and Ones!" subtitle="Tall blocks are tens, dots are ones." onDone={d} /> },

    // Teach how to read the tens, then the ones, off the same number.
    { bubble: 'Look at thirty-four. How many TENS? 🤔', mood: 'thinking',
      render: d => <AskChoice promptText="How many tens?" answer={3} choices={[2, 3, 4]}
        visual={<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}><Numeral n={34} /><NumberBlocks n={34} /></div>}
        intro="Look at thirty-four. Count the tall blocks. How many tens?" outro="Yes! Three tens!" onDone={d} /> },
    { bubble: 'And how many ONES in thirty-four? 🤔', mood: 'thinking',
      render: d => <AskChoice promptText="How many ones?" answer={4} choices={[3, 4, 5]}
        visual={<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}><Numeral n={34} /><NumberBlocks n={34} /></div>}
        intro="Now count the dots. How many ones?" outro="Yes! Four ones!" onDone={d} /> },

    { bubble: '🌟 You can find tens and ones!', mood: 'celebrate',
      render: d => <SectionBreak emoji="⭐" title="Now read the whole number!" subtitle="Count the tens, then the ones." onDone={d} /> },

    // Build a bigger one, then read blocks back to a whole number.
    { bubble: 'Let’s build fifty-two. Five tens… 🤔', mood: 'thinking',
      render: d => <ReadNumber n={52} intro="Let's build fifty-two. Five tens…" outro="Fifty-two!" onDone={d} /> },
    { bubble: 'What number is this? Count tens, then ones! 👀', mood: 'thinking',
      render: d => <AskChoice promptText="What number is this?" answer={46} choices={[40, 46, 64]}
        visual={<NumberBlocks n={46} />}
        intro="Count the tens and the ones. What number is this?" outro="Yes! Forty-six!" onDone={d} /> },

    // Point to the always-available chart button.
    { bubble: '🔢 Tap the chart button up top any time to explore numbers!', mood: 'celebrate',
      render: d => <SectionBreak emoji="🔢" title="Explore any number!" subtitle="Tap the 🔢 button up top to see how any number is built." onDone={d} /> },
  ]

  return (
    <LessonScaffold childName={childName} onLessonComplete={onLessonComplete} steps={steps}
      finalSpeech={`Great job, ${childName}! You know tens and ones! Let’s practise!`}
      chart={<NumberChart />} />
  )
}

