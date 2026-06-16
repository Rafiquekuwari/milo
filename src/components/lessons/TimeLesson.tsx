'use client'
/**
 * TimeLesson — telling time for 6–8 year olds: o'clock, half past, quarter past,
 * quarter to. Shows an analog clock; explains the big/little hands. Six worked
 * examples first, then questions.
 *
 * Exports ClockFace / timeLabel / makeTimeChoices / TimeWatch / TimeAsk for the
 * practice chapter and its re-teach.
 */
import React, { useState, useEffect, useRef, useMemo } from 'react'
import { speak, speakSeq } from '@/lib/useMiloSpeaker'
import { LessonScaffold, SectionBreak, Confetti, type LessonStep } from './_kit'

interface Props { childName: string; onLessonComplete: () => void }

const shuffle = <T,>(a: T[]) => a.slice().sort(() => Math.random() - 0.5)

export function timeLabel(h: number, m: number): string {
  if (m === 0) return `${h} o'clock`
  if (m === 30) return `half past ${h}`
  if (m === 15) return `quarter past ${h}`
  if (m === 45) return `quarter to ${(h % 12) + 1}`
  return `${h}:${m.toString().padStart(2, '0')}`
}

function handsExplain(h: number, m: number): string {
  if (m === 0) return `The big hand points to twelve, the little hand to ${h}.`
  if (m === 30) return 'The big hand points to six — that means half past.'
  if (m === 15) return 'The big hand points to three — that means quarter past.'
  if (m === 45) return 'The big hand points to nine — that means quarter to.'
  return ''
}

export function makeTimeChoices(h: number, m: number, mins: number[]): string[] {
  const correct = timeLabel(h, m)
  const labels = new Set<string>([correct])
  const cands = [timeLabel((h % 12) + 1, m), timeLabel(((h + 10) % 12) + 1, m), ...mins.filter(x => x !== m).map(x => timeLabel(h, x))]
  for (const l of shuffle(cands)) { if (labels.size >= 3) break; if (l !== correct) labels.add(l) }
  let hh = 1
  while (labels.size < 3) { const l = timeLabel(((h + hh) % 12) + 1, m); if (l !== correct) labels.add(l); hh++ }
  return shuffle([...labels])
}

// ─── Analog clock ────────────────────────────────────────────
export function ClockFace({ h, m, size = 200 }: { h: number; m: number; size?: number }) {
  const cx = 100, cy = 100
  const minA = m * 6, hourA = (h % 12) * 30 + m * 0.5
  const hand = (angle: number, len: number, w: number, color: string) => {
    const rad = (angle - 90) * Math.PI / 180
    return <line x1={cx} y1={cy} x2={cx + len * Math.cos(rad)} y2={cy + len * Math.sin(rad)} stroke={color} strokeWidth={w} strokeLinecap="round" />
  }
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} style={{ maxWidth: '78vw' }}>
      <circle cx={cx} cy={cy} r={94} fill="var(--paper)" stroke="var(--outline)" strokeWidth={6} />
      {Array.from({ length: 12 }).map((_, i) => {
        const n = i + 1, a = (n * 30 - 90) * Math.PI / 180
        return <text key={n} x={cx + 76 * Math.cos(a)} y={cy + 76 * Math.sin(a)} textAnchor="middle" dominantBaseline="central" fontFamily="var(--font-display)" fontWeight="900" fontSize="18" fill="var(--ink)">{n}</text>
      })}
      {hand(hourA, 46, 7, 'var(--ink)')}
      {hand(minA, 68, 5, 'var(--milo-orange)')}
      <circle cx={cx} cy={cy} r={7} fill="var(--milo-orange-deep)" />
    </svg>
  )
}

// ─── Watch: show a clock, explain the hands, reveal the time ──
export function TimeWatch({ h, m, onDone }: { h: number; m: number; onDone: () => void }) {
  const [show, setShow] = useState(false)
  const doneRef = useRef(onDone); doneRef.current = onDone
  useEffect(() => {
    const cancel = speakSeq(['Look at the clock.', handsExplain(h, m), `It is ${timeLabel(h, m)}!`], {
      onWord: (i) => { if (i === 2) setShow(true) },
      onDone: () => window.setTimeout(() => doneRef.current(), 1100),
    })
    return cancel
  }, []) // eslint-disable-line
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <ClockFace h={h} m={m} />
      {show && <div style={{ background: 'var(--milo-orange)', color: '#fff', borderRadius: 50, padding: '8px 24px', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, animation: 'k_flipIn 0.5s ease' }}>{timeLabel(h, m)}</div>}
    </div>
  )
}

// ─── Interactive: what time is it? (retry till right) ──
export function TimeAsk({ h, m, choices, intro, outro, onDone }: { h: number; m: number; choices: string[]; intro: string; outro: string; onDone: () => void }) {
  const answer = timeLabel(h, m)
  const [picked, setPicked] = useState<string | null>(null)
  const [wrong, setWrong] = useState<string | null>(null)
  const [burst, setBurst] = useState(false)
  const spoken = useRef(false)
  useEffect(() => { if (spoken.current) return; spoken.current = true; speak(intro) }, []) // eslint-disable-line
  function pick(c: string) {
    if (picked != null) return
    if (c === answer) { setPicked(c); setWrong(null); setBurst(true); speak(outro); window.setTimeout(onDone, 2200) }
    else { setWrong(c); speak('Not quite! Look at the hands again.'); window.setTimeout(() => setWrong(null), 950) }
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, position: 'relative' }}>
      {burst && <Confetti />}
      <ClockFace h={h} m={m} size={180} />
      <div style={S.qPill}>What time is it?</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 260 }}>
        {choices.map(c => {
          const isRight = picked === c, isWrong = wrong === c
          return (
            <button key={c} onClick={() => pick(c)} disabled={picked != null} style={timeBtn(isRight, isWrong)}>{c}</button>
          )
        })}
      </div>
    </div>
  )
}

export function timeBtn(isRight: boolean, isWrong: boolean): React.CSSProperties {
  return {
    padding: '13px 18px', borderRadius: 16, width: '100%',
    background: isRight ? 'var(--garden-green-soft)' : isWrong ? 'var(--apple-red-soft)' : 'var(--paper)',
    border: `4px solid ${isRight ? 'var(--garden-green)' : isWrong ? 'var(--apple-red)' : 'var(--outline)'}`,
    boxShadow: isRight ? '0 5px 0 var(--garden-green-deep)' : isWrong ? '0 5px 0 var(--apple-red-deep)' : '0 5px 0 #c8ac79',
    fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 20, color: 'var(--ink)',
    cursor: 'pointer', transition: 'transform 140ms ease,background 140ms ease',
    transform: isRight ? 'scale(1.04)' : 'scale(1)',
  }
}

export default function TimeLesson({ childName, onLessonComplete }: Props) {
  const ALL = [0, 30, 15, 45]
  const C = useMemo(() => ({
    a5: makeTimeChoices(5, 0, ALL),
    a830: makeTimeChoices(8, 30, ALL),
    a1015: makeTimeChoices(10, 15, ALL),
  }), []) // eslint-disable-line
  const steps: LessonStep[] = [
    { bubble: `Hi ${childName}! Let’s read the clock! 🕐`, mood: 'happy',
      render: d => <TimeWatch h={3} m={0} onDone={d} /> },
    { bubble: 'Another o’clock time! 🕖', mood: 'happy',
      render: d => <TimeWatch h={7} m={0} onDone={d} /> },
    { bubble: 'Big hand on six — half past! 🕝', mood: 'happy',
      render: d => <TimeWatch h={2} m={30} onDone={d} /> },
    { bubble: 'Another half past! 🕤', mood: 'happy',
      render: d => <TimeWatch h={9} m={30} onDone={d} /> },
    { bubble: 'Big hand on three — quarter past! 🕕', mood: 'happy',
      render: d => <TimeWatch h={6} m={15} onDone={d} /> },
    { bubble: 'Big hand on nine — quarter to! 🕔', mood: 'happy',
      render: d => <TimeWatch h={4} m={45} onDone={d} /> },

    { bubble: '🌟 Now YOU read the clock!', mood: 'celebrate',
      render: d => <SectionBreak emoji="🕰️" title="Your turn!" subtitle="Look at the hands and pick the time." onDone={d} /> },

    { bubble: 'What time is it? 🤔', mood: 'thinking',
      render: d => <TimeAsk h={5} m={0} choices={C.a5} intro="Look at the hands. What time is it?" outro="Yes! Five o'clock!" onDone={d} /> },
    { bubble: 'What time is it? 🤔', mood: 'thinking',
      render: d => <TimeAsk h={8} m={30} choices={C.a830} intro="Look at the hands. What time is it?" outro="Yes! Half past eight!" onDone={d} /> },
    { bubble: 'Last one — what time is it? 🤔', mood: 'thinking',
      render: d => <TimeAsk h={10} m={15} choices={C.a1015} intro="Look at the hands. What time is it?" outro="Yes! Quarter past ten!" onDone={d} /> },
  ]
  return (
    <LessonScaffold childName={childName} onLessonComplete={onLessonComplete} steps={steps}
      finalSpeech={`Wonderful, ${childName}! You can tell the time! Let’s practise!`} />
  )
}

const S: Record<string, React.CSSProperties> = {
  qPill: { fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: 'var(--milo-orange)', background: 'var(--milo-orange-soft)', borderRadius: 50, padding: '6px 18px', border: '2px solid var(--milo-orange)' },
}
