'use client'
/**
 * MultiplicationLesson — intro to multiplication for 6–8 year olds. Builds the
 * idea: multiplication = equal groups = repeated addition, shown as groups,
 * arrays, and finally the × sign (links to skip counting: count by the group size).
 *
 * Exports GroupsScene / ArrayScene / GroupsWatch / MultAsk / buildMultChoices for
 * the practice chapter and its re-teach.
 */
import React, { useState, useEffect, useRef, useMemo } from 'react'
import { speak, speakSeq } from '@/lib/useMiloSpeaker'
import { LessonScaffold, Confetti, BigCount, numberToWords, type LessonStep } from './_kit'

interface Props { childName: string; onLessonComplete: () => void }

export type MultMode = 'groups' | 'array' | 'symbol'

// ─── Equal groups: `groups` clusters of `per` items ──────────
export function GroupsScene({ groups, per, emoji, lit = 99 }: { groups: number; per: number; emoji: string; lit?: number }) {
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 380 }}>
      {Array.from({ length: groups }).map((_, g) => (
        <div key={g} style={{
          display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'center', alignContent: 'center',
          maxWidth: 92, padding: 8, borderRadius: 14, border: '3px dashed var(--milo-orange)',
          background: 'var(--milo-orange-soft)',
          opacity: g < lit ? 1 : 0.15, transform: g === lit - 1 ? 'scale(1.06)' : 'scale(1)',
          transition: 'all 0.3s cubic-bezier(.34,1.56,.64,1)',
        }}>
          {Array.from({ length: per }).map((_, i) => <span key={i} style={{ fontSize: 24 }}>{emoji}</span>)}
        </div>
      ))}
    </div>
  )
}

// ─── Array: rows × cols of dots ──────────────────────────────
export function ArrayScene({ rows, cols }: { rows: number; cols: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ display: 'flex', gap: 6 }}>
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--sky-blue)', border: '2px solid var(--sky-blue-deep)' }} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function buildMultChoices(answer: number, g: number, per: number): number[] {
  const opts = new Set<number>([answer])
  for (const v of [g + per, g * (per + 1), g * Math.max(1, per - 1), answer + 1, answer - 1, answer + per, answer - per]) {
    if (opts.size < 3 && v > 0 && v !== answer) opts.add(v)
  }
  while (opts.size < 3) { const v = answer + (Math.floor(Math.random() * 5) - 2); if (v > 0 && v !== answer) opts.add(v) }
  return [...opts].sort(() => Math.random() - 0.5)
}

// ─── Watch: reveal groups one at a time, counting up by the group size ──
export function GroupsWatch({ groups, per, emoji, onDone }: { groups: number; per: number; emoji: string; onDone: () => void }) {
  const product = groups * per
  const [lit, setLit] = useState(0)
  const [big, setBig] = useState<number | null>(null)
  const [showProd, setShowProd] = useState(false)
  const doneRef = useRef(onDone); doneRef.current = onDone
  useEffect(() => {
    const totals = Array.from({ length: groups }, (_, k) => numberToWords((k + 1) * per))
    const words = [`${numberToWords(groups)} groups of ${numberToWords(per)}. Count by ${per}s!`, ...totals,
      `${numberToWords(groups)} groups of ${numberToWords(per)} is ${numberToWords(product)}!`]
    const cancel = speakSeq(words, {
      onWord: (i) => {
        if (i >= 1 && i <= groups) { setLit(i); setBig(i * per) }
        else if (i === groups + 1) { setBig(product); setShowProd(true) }
      },
      onDone: () => window.setTimeout(() => doneRef.current(), 900),
    })
    return cancel
  }, []) // eslint-disable-line
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <div style={{ height: 56, display: 'flex', alignItems: 'center' }}>{big != null && <BigCount key={big} n={big} />}</div>
      <GroupsScene groups={groups} per={per} emoji={emoji} lit={lit} />
      {showProd && (
        <div style={{ background: 'var(--milo-orange)', color: '#fff', borderRadius: 50, padding: '8px 22px',
          fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, animation: 'k_flipIn 0.5s ease' }}>
          {groups} × {per} = {product}
        </div>
      )}
    </div>
  )
}

// ─── Interactive: show groups/array/symbol, pick the total (retry till right) ──
export function MultAsk({ mode, groups, per, emoji, choices, intro, outro, onDone }: {
  mode: MultMode; groups: number; per: number; emoji: string; choices: number[]; intro: string; outro: string; onDone: () => void
}) {
  const answer = groups * per
  const [picked, setPicked] = useState<number | null>(null)
  const [wrong, setWrong] = useState<number | null>(null)
  const [burst, setBurst] = useState(false)
  const spoken = useRef(false)
  useEffect(() => { if (spoken.current) return; spoken.current = true; speak(intro) }, []) // eslint-disable-line

  function pick(c: number) {
    if (picked != null) return
    if (c === answer) { setPicked(c); setWrong(null); setBurst(true); speak(outro); window.setTimeout(onDone, 2300) }
    else { setWrong(c); speak(`Not quite! Count the groups.`); window.setTimeout(() => setWrong(null), 950) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, position: 'relative' }}>
      {burst && <Confetti />}
      {mode === 'groups' && <GroupsScene groups={groups} per={per} emoji={emoji} />}
      {mode === 'array' && <ArrayScene rows={groups} cols={per} />}
      {mode === 'symbol' && (
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 52, color: 'var(--milo-orange)' }}>{groups} × {per} = ?</div>
      )}
      <div style={S.qPill}>How many altogether?</div>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        {choices.map(c => {
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

export default function MultiplicationLesson({ childName, onLessonComplete }: Props) {
  // Freeze the (shuffled) choices once so the answer buttons don't reshuffle on
  // every re-render.
  const C = useMemo(() => ({
    g2x4: buildMultChoices(8, 2, 4),
    a3x3: buildMultChoices(9, 3, 3),
    s3x2: buildMultChoices(6, 3, 2),
    s2x5: buildMultChoices(10, 2, 5),
  }), [])
  const steps: LessonStep[] = [
    { bubble: `Hi ${childName}! Multiplication is EQUAL groups! Watch! ✖️`, mood: 'happy',
      render: d => <GroupsWatch groups={3} per={2} emoji="🍎" onDone={d} /> },
    { bubble: 'Two groups of three! Watch and count. ✖️', mood: 'happy',
      render: d => <GroupsWatch groups={2} per={3} emoji="🍪" onDone={d} /> },
    { bubble: 'Four groups of two! Count by twos. ✖️', mood: 'happy',
      render: d => <GroupsWatch groups={4} per={2} emoji="⭐" onDone={d} /> },
    { bubble: 'Three groups of three! ✖️', mood: 'happy',
      render: d => <GroupsWatch groups={3} per={3} emoji="🌸" onDone={d} /> },
    { bubble: 'Two groups of five! Count by fives. ✖️', mood: 'happy',
      render: d => <GroupsWatch groups={2} per={5} emoji="🎈" onDone={d} /> },
    { bubble: 'Five groups of two! ✖️', mood: 'happy',
      render: d => <GroupsWatch groups={5} per={2} emoji="🐟" onDone={d} /> },

    { bubble: 'Two groups of four — how many? 🤔', mood: 'thinking',
      render: d => <MultAsk mode="groups" groups={2} per={4} emoji="🍪" choices={C.g2x4}
        intro="Two groups of four. Count them. How many altogether?" outro="Yes! Two groups of four is eight!" onDone={d} /> },

    { bubble: 'Three rows of three — how many dots? 🤔', mood: 'thinking',
      render: d => <MultAsk mode="array" groups={3} per={3} emoji="🔵" choices={C.a3x3}
        intro="Three rows of three. How many dots altogether?" outro="Yes! Three rows of three is nine!" onDone={d} /> },

    { bubble: 'What is 3 × 2? 🤔', mood: 'thinking',
      render: d => <MultAsk mode="symbol" groups={3} per={2} emoji="⭐" choices={C.s3x2}
        intro="Three times two. Three groups of two. How many altogether?" outro="Yes! Three times two is six!" onDone={d} /> },

    { bubble: 'Last one — what is 2 × 5? 🤔', mood: 'thinking',
      render: d => <MultAsk mode="symbol" groups={2} per={5} emoji="✨" choices={C.s2x5}
        intro="Two times five. Two groups of five. How many altogether?" outro="Yes! Two times five is ten!" onDone={d} /> },
  ]
  return (
    <LessonScaffold childName={childName} onLessonComplete={onLessonComplete} steps={steps}
      finalSpeech={`Brilliant, ${childName}! You started multiplying! Let’s practise!`} />
  )
}

const S: Record<string, React.CSSProperties> = {
  qPill: { fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: 'var(--milo-orange)', background: 'var(--milo-orange-soft)', borderRadius: 50, padding: '6px 18px', border: '2px solid var(--milo-orange)' },
}
