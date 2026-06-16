'use client'
/**
 * StoryProblemsLesson — word problems for 6–8 year olds. Teaches: listen, find
 * the numbers, decide ADD or TAKE AWAY (clue words), then solve. Covers all three
 * types — add, take-away subtract, and "how many more" (compare).
 *
 * Exports the dynamic generator (makeProblem / buildStoryChoices), the picture
 * (StoryScene), and the interactive/worked pieces (StoryAsk / StoryWatch) so the
 * practice chapter and its re-teach reuse them.
 */
import React, { useState, useEffect, useRef, useMemo } from 'react'
import { speak, speakSeq } from '@/lib/useMiloSpeaker'
import { LessonScaffold, Confetti, nounFor, type LessonStep } from './_kit'

interface Props { childName: string; onLessonComplete: () => void }

export type StoryType = 'add' | 'sub' | 'compare'
export interface Theme { emoji: string; noun: string; add: string; sub: string }
export const THEMES: Theme[] = [
  { emoji: '🍎', noun: 'apples', add: 'picks', sub: 'eats' },
  { emoji: '🍪', noun: 'cookies', add: 'bakes', sub: 'eats' },
  { emoji: '⭐', noun: 'stars', add: 'finds', sub: 'gives away' },
  { emoji: '🎈', noun: 'balloons', add: 'gets', sub: 'pops' },
  { emoji: '🌸', noun: 'flowers', add: 'picks', sub: 'gives away' },
  { emoji: '🐟', noun: 'fish', add: 'catches', sub: 'gives away' },
  { emoji: '🦋', noun: 'butterflies', add: 'sees', sub: 'loses' },
  { emoji: '🚗', noun: 'toy cars', add: 'gets', sub: 'gives away' },
]
export const NAMES = ['Sam', 'Mia', 'Leo', 'Zoe', 'Ava', 'Max', 'Lily', 'Ben']

const rint = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))

export interface Problem {
  type: StoryType; a: number; b: number; name: string; friend: string; theme: Theme
  story: string; question: string; say: string; answer: number; choices: number[]; showScene: boolean
}

export function buildStoryChoices(answer: number, trap: number): number[] {
  const opts = new Set<number>([answer])
  for (const v of [trap, answer + 1, answer - 1, answer + 2, answer - 2]) {
    if (opts.size < 3 && v >= 0 && v !== answer) opts.add(v)
  }
  while (opts.size < 3) { const v = answer + rint(1, 3); if (v !== answer) opts.add(v) }
  return [...opts].sort(() => Math.random() - 0.5)
}

export function makeProblem(type: StoryType, a: number, b: number, theme: Theme, name: string, friend: string, showScene: boolean): Problem {
  let story: string, question: string, answer: number
  if (type === 'add') {
    story = `${name} has ${a} ${nounFor(a, theme.noun)}. ${name} ${theme.add} ${b} more. How many ${theme.noun} now?`
    question = 'How many now?'; answer = a + b
  } else if (type === 'sub') {
    story = `${name} has ${a} ${nounFor(a, theme.noun)}. ${name} ${theme.sub} ${b}. How many ${theme.noun} are left?`
    question = 'How many are left?'; answer = a - b
  } else {
    story = `${name} has ${a} ${nounFor(a, theme.noun)}. ${friend} has ${b}. How many more ${theme.noun} does ${name} have?`
    question = 'How many more?'; answer = a - b
  }
  const trap = type === 'add' ? a - b : a + b   // the classic "did the opposite operation" error
  return { type, a, b, name, friend, theme, story, question, say: story, answer, choices: buildStoryChoices(answer, trap), showScene }
}

// ─── Picture for a story (small numbers only; big/compare practice hides it) ──
function EmojiRow({ n, emoji, fadeFrom = -1, glowFrom = -1 }: { n: number; emoji: string; fadeFrom?: number; glowFrom?: number }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center', maxWidth: 280 }}>
      {Array.from({ length: n }).map((_, i) => (
        <span key={i} style={{
          fontSize: 28, lineHeight: 1.1,
          opacity: fadeFrom >= 0 && i >= fadeFrom ? 0.28 : 1,
          filter: glowFrom >= 0 && i >= glowFrom ? 'drop-shadow(0 0 8px var(--sun-yellow-deep))' : 'none',
          transition: 'all 0.3s ease',
        }}>{emoji}</span>
      ))}
    </div>
  )
}

export function StoryScene({ problem }: { problem: Problem }) {
  const { type, a, b, theme, name, friend } = problem
  if (type === 'add') return (
    <div style={S.scene}>
      <EmojiRow n={a} emoji={theme.emoji} />
      <div style={S.op}>+</div>
      <EmojiRow n={b} emoji={theme.emoji} glowFrom={0} />
    </div>
  )
  if (type === 'sub') return (
    <div style={S.scene}>
      <EmojiRow n={a} emoji={theme.emoji} fadeFrom={a - b} />
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, color: 'var(--ink-soft)' }}>👋 {b} leaving</div>
    </div>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
      <div style={S.cmpRow}><span style={S.cmpName}>{name}</span><EmojiRow n={a} emoji={theme.emoji} glowFrom={b} /></div>
      <div style={S.cmpRow}><span style={S.cmpName}>{friend}</span><EmojiRow n={b} emoji={theme.emoji} /></div>
    </div>
  )
}

// ─── Worked example: read the story, act it out, reveal the answer ──
export function StoryWatch({ problem, onDone }: { problem: Problem; onDone: () => void }) {
  const [showAns, setShowAns] = useState(false)
  const doneRef = useRef(onDone); doneRef.current = onDone
  const line = problem.type === 'add' ? `${problem.a} and ${problem.b} more makes ${problem.answer}!`
    : problem.type === 'sub' ? `${problem.a} take away ${problem.b} is ${problem.answer}!`
    : `${problem.a} is ${problem.answer} more than ${problem.b}!`
  useEffect(() => {
    const cancel = speakSeq([problem.say, line], {
      onWord: (i) => { if (i === 1) setShowAns(true) },
      onDone: () => window.setTimeout(() => doneRef.current(), 1200),
    })
    return cancel
  }, []) // eslint-disable-line
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <StoryScene problem={problem} />
      <div style={S.qPill}>{problem.question}</div>
      <div style={{ width: 88, height: 88, borderRadius: 22, border: '4px solid var(--milo-orange-deep)', background: showAns ? 'var(--garden-green)' : 'var(--milo-orange-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.4s', boxShadow: '0 6px 0 rgba(61,37,22,.2)' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 44, color: showAns ? '#fff' : 'var(--milo-orange)' }}>{showAns ? problem.answer : '?'}</span>
      </div>
    </div>
  )
}

// ─── Interactive: read the story, pick the answer (gentle: retry till right) ──
export function StoryAsk({ problem, outro, onDone }: { problem: Problem; outro: string; onDone: () => void }) {
  const [picked, setPicked] = useState<number | null>(null)
  const [wrong, setWrong] = useState<number | null>(null)
  const [burst, setBurst] = useState(false)
  const spoken = useRef(false)
  useEffect(() => { if (spoken.current) return; spoken.current = true; speak(problem.say) }, [])  // eslint-disable-line

  function pick(c: number) {
    if (picked != null) return
    if (c === problem.answer) { setPicked(c); setWrong(null); setBurst(true); speak(outro); window.setTimeout(onDone, 2300) }
    else { setWrong(c); speak('Hmm, not quite! Listen again and count.'); window.setTimeout(() => setWrong(null), 1000) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, position: 'relative' }}>
      {burst && <Confetti />}
      <div style={S.storyText}>{problem.story}</div>
      {problem.showScene && <StoryScene problem={problem} />}
      <div style={S.qPill}>{problem.question}</div>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        {problem.choices.map(c => {
          const isRight = picked === c, isWrong = wrong === c
          return (
            <button key={c} onClick={() => pick(c)} disabled={picked != null} style={{
              width: 78, height: 78, borderRadius: 18,
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

export default function StoryProblemsLesson({ childName, onLessonComplete }: Props) {
  // Build the fixed examples ONCE so their (shuffled) choices don't reshuffle on
  // every re-render — otherwise the answer buttons jump around.
  const P = useMemo(() => {
    const T = (e: string) => THEMES.find(t => t.emoji === e)!
    return {
      intro: makeProblem('add', 3, 2, T('🍎'), 'Sam', 'Mia', true),
      addEx: makeProblem('add', 4, 3, T('🍪'), 'Mia', 'Leo', true),
      subEx: makeProblem('sub', 7, 2, T('🍎'), 'Leo', 'Zoe', true),
      cmpWatch: makeProblem('compare', 5, 3, T('⭐'), 'Zoe', 'Max', true),
      cmpEx: makeProblem('compare', 6, 2, T('🎈'), 'Ava', 'Ben', true),
      last: makeProblem('add', 5, 4, T('🌸'), 'Lily', 'Sam', true),
    }
  }, [])
  const steps: LessonStep[] = [
    { bubble: `Hi ${childName}! Listen to the story, then solve it! 📖`, mood: 'happy',
      render: d => <StoryWatch problem={P.intro} onDone={d} /> },

    { bubble: '“gets more” means ADD! Try it. ➕', mood: 'thinking',
      render: d => <StoryAsk problem={P.addEx} outro="Yes! Four and three more makes seven!" onDone={d} /> },
    { bubble: '“eats” means TAKE AWAY! Try it. ➖', mood: 'thinking',
      render: d => <StoryAsk problem={P.subEx} outro="Yes! Seven take away two is five!" onDone={d} /> },

    { bubble: 'Who has more, and how many more? 👀', mood: 'thinking',
      render: d => <StoryWatch problem={P.cmpWatch} onDone={d} /> },
    { bubble: 'Your turn — how many more? 🤔', mood: 'thinking',
      render: d => <StoryAsk problem={P.cmpEx} outro="Yes! Six is four more than two!" onDone={d} /> },

    { bubble: 'Last one — read and solve! 📖', mood: 'thinking',
      render: d => <StoryAsk problem={P.last} outro="Yes! Five and four more makes nine!" onDone={d} /> },
  ]
  return (
    <LessonScaffold childName={childName} onLessonComplete={onLessonComplete} steps={steps}
      finalSpeech={`Wonderful, ${childName}! You can solve story problems! Let’s practise!`} />
  )
}

const S: Record<string, React.CSSProperties> = {
  scene: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' },
  op: { fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 34, color: 'var(--milo-orange)' },
  cmpRow: { display: 'flex', alignItems: 'center', gap: 10 },
  cmpName: { fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 15, color: 'var(--ink)', minWidth: 44, textAlign: 'right' },
  qPill: { fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: 'var(--milo-orange)', background: 'var(--milo-orange-soft)', borderRadius: 50, padding: '6px 18px', border: '2px solid var(--milo-orange)' },
  storyText: { fontFamily: 'var(--font-body)', fontSize: 17, fontWeight: 600, color: 'var(--ink)', textAlign: 'center', maxWidth: 380, lineHeight: 1.4, background: 'var(--paper-soft)', borderRadius: 16, padding: '12px 16px', border: '2px solid var(--outline)' },
}
