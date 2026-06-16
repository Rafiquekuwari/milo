'use client'
/**
 * SkipCountingLesson — counting by 2s, 5s and 10s for 6–8 year olds. Teaches the
 * "jump by the same amount" idea, then "what comes next?" and "what's missing?".
 * Built on the shared kit. Exports SeqRow / SkipWatch / SkipPick / buildSkipChoices
 * for the practice chapter and its re-teach.
 */
import React, { useState, useEffect, useRef } from 'react'
import { speak, speakSeq } from '@/lib/useMiloSpeaker'
import { LessonScaffold, SectionBreak, Confetti, numberToWords, type LessonStep } from './_kit'

interface Props { childName: string; onLessonComplete: () => void }

export type Tone = 'on' | 'off' | 'cur' | 'blank'

// A row of number bubbles (a skip-count sequence).
export function SeqRow({ items }: { items: { label: string; tone: Tone }[] }) {
  const tones: Record<Tone, { bg: string; bd: string; col: string }> = {
    on:    { bg: 'var(--garden-green)', bd: 'var(--garden-green-deep)', col: '#fff' },
    cur:   { bg: 'var(--milo-orange)', bd: 'var(--milo-orange-deep)', col: '#fff' },
    blank: { bg: 'var(--sun-yellow)', bd: 'var(--sun-yellow-deep)', col: 'var(--ink)' },
    off:   { bg: 'var(--paper-soft)', bd: 'var(--outline)', col: 'var(--ink-muted)' },
  }
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
      {items.map((it, i) => {
        const t = tones[it.tone]
        return (
          <div key={i} style={{
            minWidth: 54, height: 54, padding: '0 10px', borderRadius: 14, border: `3px solid ${t.bd}`,
            background: t.bg, color: t.col, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 24,
            transform: it.tone === 'cur' ? 'scale(1.12)' : 'scale(1)', transition: 'all 0.2s ease',
            boxShadow: '0 3px 0 rgba(61,37,22,.15)',
          }}>{it.label}</div>
        )
      })}
    </div>
  )
}

// Milo counts a sequence by `step`, revealing & speaking each term.
export function SkipWatch({ step, terms, intro, outro, onDone }: {
  step: number; terms: number; intro: string; outro: string; onDone: () => void
}) {
  const seq = Array.from({ length: terms }, (_, k) => (k + 1) * step)
  const [shown, setShown] = useState(0)
  const doneRef = useRef(onDone); doneRef.current = onDone
  useEffect(() => {
    const cancel = speakSeq([intro, ...seq.map(v => numberToWords(v)), outro], {
      onWord: (i) => { if (i >= 1 && i <= terms) setShown(i) },
      onDone: () => window.setTimeout(() => doneRef.current(), 500),
    })
    return cancel
  }, []) // eslint-disable-line
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: 'var(--milo-orange)',
        background: 'var(--milo-orange-soft)', borderRadius: 50, padding: '6px 18px', border: '2px solid var(--milo-orange)' }}>
        Counting by {step}s
      </div>
      <SeqRow items={seq.map((v, i) => ({ label: String(v), tone: i === shown - 1 ? 'cur' : i < shown ? 'on' : 'off' }))} />
    </div>
  )
}

export function buildSkipChoices(answer: number, step: number): number[] {
  const opts = new Set<number>([answer])
  for (const v of [answer + step, answer - step, answer + 2 * step, answer - 2 * step]) {
    if (opts.size < 3 && v > 0 && v !== answer) opts.add(v)
  }
  while (opts.size < 3) { const v = answer + (Math.floor(Math.random() * 5) - 2); if (v > 0 && v !== answer) opts.add(v) }
  return [...opts].sort(() => Math.random() - 0.5)
}

// Show a sequence with one blank; child taps the missing number.
export function SkipPick({ seq, blankIndex, step, intro, outro, onDone }: {
  seq: number[]; blankIndex: number; step: number; intro: string; outro: string; onDone: () => void
}) {
  const answer = seq[blankIndex]
  const choices = useRef(buildSkipChoices(answer, step)).current
  const [picked, setPicked] = useState<number | null>(null)
  const [wrong, setWrong] = useState<number | null>(null)
  const [burst, setBurst] = useState(false)
  const spoken = useRef(false)
  useEffect(() => { if (spoken.current) return; spoken.current = true; speak(intro) }, [intro])

  function pick(c: number) {
    if (picked != null) return
    if (c === answer) { setPicked(c); setWrong(null); setBurst(true); speak(outro); window.setTimeout(onDone, 2200) }
    else { setWrong(c); speak(`Not quite! Count by ${step}s.`); window.setTimeout(() => setWrong(null), 950) }
  }

  const isNext = blankIndex === seq.length - 1
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, position: 'relative' }}>
      {burst && <Confetti />}
      <SeqRow items={seq.map((v, i) => ({
        label: i === blankIndex ? (picked != null ? String(answer) : '?') : String(v),
        tone: i === blankIndex ? 'blank' : 'on',
      }))} />
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: 'var(--milo-orange)',
        background: 'var(--milo-orange-soft)', borderRadius: 50, padding: '6px 18px', border: '2px solid var(--milo-orange)' }}>
        {isNext ? 'What comes next?' : 'What is missing?'}
      </div>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        {choices.map(c => {
          const isRight = picked === c, isWrong = wrong === c
          return (
            <button key={c} onClick={() => pick(c)} disabled={picked != null} style={{
              width: 80, height: 80, borderRadius: 18,
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

export default function SkipCountingLesson({ childName, onLessonComplete }: Props) {
  const steps: LessonStep[] = [
    { bubble: `Hi ${childName}! Skip counting means we JUMP! Count by twos! 🐰`, mood: 'happy',
      render: d => <SkipWatch step={2} terms={5} intro="Count by twos! We skip every other number." outro="Great counting by twos!" onDone={d} /> },
    { bubble: '🎉 Skip counting — we jump ahead!', mood: 'celebrate',
      render: d => <SectionBreak emoji="🐸" title="Skip counting!" subtitle="Jump by the same amount each time." onDone={d} /> },

    { bubble: 'Count by tens! 🔟', mood: 'happy',
      render: d => <SkipWatch step={10} terms={10} intro="Count by tens!" outro="All the way to one hundred!" onDone={d} /> },
    { bubble: 'Your turn — what comes next? 🤔', mood: 'thinking',
      render: d => <SkipPick seq={[2, 4, 6, 8]} blankIndex={3} step={2} intro="Count by twos. Two, four, six… what comes next?" outro="Yes! Eight!" onDone={d} /> },

    { bubble: '🌟 Now count by fives!', mood: 'celebrate',
      render: d => <SectionBreak emoji="🖐️" title="Count by fives!" subtitle="Five, ten, fifteen…" onDone={d} /> },
    { bubble: 'Count by fives! ✋', mood: 'happy',
      render: d => <SkipWatch step={5} terms={6} intro="Count by fives!" outro="Great counting by fives!" onDone={d} /> },
    { bubble: 'What number is missing? 🤔', mood: 'thinking',
      render: d => <SkipPick seq={[5, 10, 15, 20]} blankIndex={2} step={5} intro="Count by fives. Five, ten… what is missing before twenty?" outro="Yes! Fifteen!" onDone={d} /> },

    { bubble: 'Last one — count by twos! 🐰', mood: 'thinking',
      render: d => <SkipPick seq={[2, 4, 6, 8, 10]} blankIndex={3} step={2} intro="Count by twos. What is missing?" outro="Yes! Eight!" onDone={d} /> },
  ]
  return (
    <LessonScaffold childName={childName} onLessonComplete={onLessonComplete} steps={steps}
      finalSpeech={`Awesome, ${childName}! You can skip count! Let’s practise!`} />
  )
}
