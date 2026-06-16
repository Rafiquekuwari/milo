'use client'
/**
 * ArithmeticLesson — two-digit addition / subtraction to 100 for 6–8. One
 * component, parameterized by `op` ('+' or '-'), used by both the Add and
 * Subtract chapters. Teaches "add/subtract the tens, then the ones" with several
 * worked examples before the questions.
 *
 * Exports EquationWatch / EquationAsk / buildArithChoices / applyOp for the
 * practice chapter and its re-teach.
 */
import React, { useState, useEffect, useRef, useMemo } from 'react'
import { speak, speakSeq } from '@/lib/useMiloSpeaker'
import { LessonScaffold, SectionBreak, Confetti, numberToWords, type LessonStep } from './_kit'
import { TensOnes } from './Numbers100Lesson'

export type Op = '+' | '-'
export const applyOp = (op: Op, a: number, b: number) => (op === '+' ? a + b : a - b)
const opWord = (op: Op) => (op === '+' ? 'plus' : 'minus')
const opSym = (op: Op) => (op === '+' ? '+' : '−')

interface Props { op: Op; childName: string; onLessonComplete: () => void }

export function buildArithChoices(answer: number, op: Op, a: number, b: number): number[] {
  const trap = op === '+' ? Math.abs(a - b) : a + b
  const opts = new Set<number>([answer])
  for (const v of [trap, answer + 1, answer - 1, answer + 10, answer - 10]) { if (opts.size < 3 && v >= 0 && v !== answer) opts.add(v) }
  while (opts.size < 3) { const v = answer + (Math.floor(Math.random() * 5) - 2); if (v >= 0 && v !== answer) opts.add(v) }
  return [...opts].sort(() => Math.random() - 0.5)
}

export function Equation({ a, op, b, answer }: { a: number; op: Op; b: number; answer: number | null }) {
  return (
    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(34px, 9vw, 52px)', color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 10 }}>
      <span>{a}</span><span style={{ color: 'var(--milo-orange)' }}>{opSym(op)}</span><span>{b}</span>
      <span style={{ color: 'var(--milo-orange)' }}>=</span>
      <span style={{ color: answer == null ? 'var(--ink-muted)' : 'var(--garden-green-deep)' }}>{answer == null ? '?' : answer}</span>
    </div>
  )
}

// Base-ten block view of "a op b = answer" (tens rods + ones dots) so two-digit
// arithmetic is concrete: the rods and dots combine (or take away) to the answer.
function blocks(n: number) { return <TensOnes n={n} revealTens={Math.floor(n / 10)} revealOnes={n % 10} /> }
export function BlockMath({ a, op, b, answer, showAnswer }: { a: number; op: Op; b: number; answer: number; showAnswer: boolean }) {
  const sym = (s: string) => <span style={{ width: 26, textAlign: 'center', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 32, color: 'var(--milo-orange)', flexShrink: 0 }}>{s}</span>
  const numeral = (n: number) => <span style={{ width: 56, textAlign: 'right', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 32, color: 'var(--ink)', flexShrink: 0 }}>{n}</span>
  // Each row: [op sign] [numeral] [blocks] — so the number sits next to its blocks.
  const Row = ({ n, s }: { n: number; s: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{sym(s)}{numeral(n)}{blocks(n)}</div>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
      <Row n={a} s="" />
      <Row n={b} s={opSym(op)} />
      <div style={{ alignSelf: 'stretch', height: 3, background: 'var(--outline)', borderRadius: 2, margin: '4px 0' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 88 }}>
        {sym('=')}
        {showAnswer ? <>{numeral(answer)}{blocks(answer)}</> : <span style={{ width: 56, textAlign: 'right', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 44, color: 'var(--ink-muted)' }}>?</span>}
      </div>
    </div>
  )
}

export function EquationWatch({ op, a, b, onDone }: { op: Op; a: number; b: number; onDone: () => void }) {
  const answer = applyOp(op, a, b)
  const [show, setShow] = useState(false)
  const doneRef = useRef(onDone); doneRef.current = onDone
  useEffect(() => {
    const cancel = speakSeq([
      `${numberToWords(a)} ${opWord(op)} ${numberToWords(b)}. ${op === '+' ? 'Add' : 'Take away'} the tens, then the ones.`,
      `That makes ${numberToWords(answer)}!`,
    ], {
      onWord: (i) => { if (i === 1) setShow(true) },
      onDone: () => window.setTimeout(() => doneRef.current(), 1300),
    })
    return cancel
  }, []) // eslint-disable-line
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <BlockMath a={a} op={op} b={b} answer={answer} showAnswer={show} />
      {show && <div style={{ background: 'var(--garden-green)', color: '#fff', borderRadius: 50, padding: '8px 24px', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, animation: 'k_flipIn 0.5s ease' }}>{a} {opSym(op)} {b} = {answer}</div>}
    </div>
  )
}

export function EquationAsk({ op, a, b, choices, intro, outro, onDone }: { op: Op; a: number; b: number; choices: number[]; intro: string; outro: string; onDone: () => void }) {
  const answer = applyOp(op, a, b)
  const [picked, setPicked] = useState<number | null>(null)
  const [wrong, setWrong] = useState<number | null>(null)
  const [burst, setBurst] = useState(false)
  const spoken = useRef(false)
  useEffect(() => { if (spoken.current) return; spoken.current = true; speak(intro) }, []) // eslint-disable-line
  function pick(c: number) {
    if (picked != null) return
    if (c === answer) { setPicked(c); setWrong(null); setBurst(true); speak(outro); window.setTimeout(onDone, 2200) }
    else { setWrong(c); speak('Not quite! Try the tens, then the ones.'); window.setTimeout(() => setWrong(null), 950) }
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, position: 'relative' }}>
      {burst && <Confetti />}
      <BlockMath a={a} op={op} b={b} answer={answer} showAnswer={picked != null} />
      <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
        {choices.map(c => {
          const isRight = picked === c, isWrong = wrong === c
          return (
            <button key={c} onClick={() => pick(c)} disabled={picked != null} style={{
              width: 84, height: 84, borderRadius: 18,
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

export default function ArithmeticLesson({ op, childName, onLessonComplete }: Props) {
  const isAdd = op === '+'
  const W: [number, number][] = isAdd ? [[11, 5], [20, 10], [23, 14], [30, 25], [42, 7]] : [[18, 5], [30, 10], [27, 14], [45, 20], [38, 7]]
  const A: [number, number][] = isAdd ? [[15, 12], [34, 23], [50, 25]] : [[26, 13], [49, 15], [60, 30]]
  const C = useMemo(() => A.map(([a, b]) => buildArithChoices(applyOp(op, a, b), op, a, b)), []) // eslint-disable-line
  const verb = isAdd ? 'add' : 'subtract'
  const steps: LessonStep[] = [
    { bubble: `Hi ${childName}! Let’s ${verb} big numbers! Watch! ${isAdd ? '➕' : '➖'}`, mood: 'happy',
      render: d => <EquationWatch op={op} a={W[0][0]} b={W[0][1]} onDone={d} /> },
    { bubble: 'Watch again! 👀', mood: 'happy',
      render: d => <EquationWatch op={op} a={W[1][0]} b={W[1][1]} onDone={d} /> },
    { bubble: `${isAdd ? 'Add' : 'Subtract'} the tens, then the ones. 👀`, mood: 'happy',
      render: d => <EquationWatch op={op} a={W[2][0]} b={W[2][1]} onDone={d} /> },
    { bubble: 'Watch! 👀', mood: 'happy',
      render: d => <EquationWatch op={op} a={W[3][0]} b={W[3][1]} onDone={d} /> },
    { bubble: 'One more — watch! 👀', mood: 'happy',
      render: d => <EquationWatch op={op} a={W[4][0]} b={W[4][1]} onDone={d} /> },

    { bubble: `🌟 Now YOU ${verb}!`, mood: 'celebrate',
      render: d => <SectionBreak emoji={isAdd ? '➕' : '➖'} title={`Your turn!`} subtitle={`${isAdd ? 'Add' : 'Subtract'} the tens, then the ones.`} onDone={d} /> },

    { bubble: 'What is the answer? 🤔', mood: 'thinking',
      render: d => <EquationAsk op={op} a={A[0][0]} b={A[0][1]} choices={C[0]} intro={`${numberToWords(A[0][0])} ${opWord(op)} ${numberToWords(A[0][1])}. What is the answer?`} outro={`Yes! ${numberToWords(applyOp(op, A[0][0], A[0][1]))}!`} onDone={d} /> },
    { bubble: 'What is the answer? 🤔', mood: 'thinking',
      render: d => <EquationAsk op={op} a={A[1][0]} b={A[1][1]} choices={C[1]} intro={`${numberToWords(A[1][0])} ${opWord(op)} ${numberToWords(A[1][1])}. What is the answer?`} outro={`Yes! ${numberToWords(applyOp(op, A[1][0], A[1][1]))}!`} onDone={d} /> },
    { bubble: 'Last one! 🤔', mood: 'thinking',
      render: d => <EquationAsk op={op} a={A[2][0]} b={A[2][1]} choices={C[2]} intro={`${numberToWords(A[2][0])} ${opWord(op)} ${numberToWords(A[2][1])}. What is the answer?`} outro={`Yes! ${numberToWords(applyOp(op, A[2][0], A[2][1]))}!`} onDone={d} /> },
  ]
  return (
    <LessonScaffold childName={childName} onLessonComplete={onLessonComplete} steps={steps}
      finalSpeech={`Great work, ${childName}! You can ${verb} big numbers! Let’s practise!`} />
  )
}
