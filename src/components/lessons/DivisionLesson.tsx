'use client'
/**
 * DivisionLesson (9–11) — division as sharing equally into groups, division facts
 * (the inverse of times tables), and remainders (what's left over). Items are
 * dealt into group bins; leftovers sit in a "left over" tray. Built on the shared
 * kit (centered Retry+Next pop-up, no celebration slides). See docs/curriculum-9-11.md.
 */
import React, { useState, useEffect, useRef } from 'react'
import { speak, speakSeq } from '@/lib/useMiloSpeaker'
import { LessonScaffold, Confetti, type LessonStep } from './_kit'

// ─── Worked example: share `total` into `groups` equal bins ──
export function ShareWatch({ total, groups, emoji = '🍪', intro, outro, onDone }: { total: number; groups: number; emoji?: string; intro: string; outro: string; onDone: () => void }) {
  const q = Math.floor(total / groups), rem = total % groups
  const [stage, setStage] = useState(0)   // 0 idle · 1 dealt · 2 result+leftover
  const [done, setDone] = useState(false)
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return
    ran.current = true
    const lines = [
      intro,
      `Share ${total} among ${groups} — one to each!`,
      rem > 0 ? `Each gets ${q}, with ${rem} left over!` : `Each gets ${q}! ${total} divided by ${groups} is ${q}.`,
      outro,
    ]
    let started = false, finished = false
    const cl: Array<() => void> = []
    const at = (fn: () => void, ms: number) => { const id = window.setTimeout(fn, ms); cl.push(() => window.clearTimeout(id)) }
    const apply = (i: number) => { if (i === 1) setStage(1); if (i === 2) { setStage(2); setDone(true) } }
    const complete = () => { if (finished) return; finished = true; at(onDone, 900) }
    const cancel = speakSeq(lines, { onWord: i => { started = true; apply(i) }, onDone: complete })
    cl.push(cancel)
    at(() => {
      if (started || finished) return
      cancel()
      let t = 0
      at(() => { setStage(1); speak(lines[1]) }, t); t += 2400
      at(() => { setStage(2); setDone(true); speak(lines[2]) }, t); t += 2600
      at(() => { speak(outro); complete() }, t)
    }, 1900)
    return () => cl.forEach(f => f())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const itemFont = groups > 4 || q > 4 ? 20 : 26
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, position: 'relative' }}>
      {done && <Confetti />}
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 34, color: 'var(--ink)' }}>
        {total} ÷ {groups}{done ? <span style={{ color: 'var(--garden-green-deep)' }}> = {q}{rem > 0 ? ` r ${rem}` : ''}</span> : null}
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', maxWidth: 380 }}>
        {Array.from({ length: groups }).map((_, b) => (
          <div key={b} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 56, border: '3px solid var(--sky-blue-deep)', background: 'var(--sky-blue-soft)', borderRadius: 14, padding: '8px 6px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center', maxWidth: 70, minHeight: 30 }}>
              {Array.from({ length: q }).map((_, j) => (
                <span key={j} style={{ fontSize: itemFont, opacity: stage >= 1 ? 1 : 0, animation: stage >= 1 ? `k_dropIn 0.4s ease ${(b * q + j) * 0.06}s both` : 'none' }}>{emoji}</span>
              ))}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 12, color: 'var(--sky-blue-deep)' }}>{stage >= 2 ? `${q} each` : `box ${b + 1}`}</div>
          </div>
        ))}
      </div>
      {rem > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: stage >= 2 ? 1 : 0, transition: 'opacity 0.3s', border: '3px dashed var(--apple-red)', borderRadius: 14, padding: '6px 14px', background: 'var(--apple-red-soft)' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, color: 'var(--apple-red-deep)' }}>left over:</span>
          {Array.from({ length: rem }).map((_, j) => (
            <span key={j} style={{ fontSize: 24, animation: stage >= 2 ? `k_dropIn 0.4s ease ${j * 0.1}s both` : 'none' }}>{emoji}</span>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Interactive: pick the quotient (or quotient + remainder) ──
export function DivPick({ total, groups, choices, intro, outro, onDone }: { total: number; groups: number; choices: string[]; intro: string; outro: string; onDone: () => void }) {
  const q = Math.floor(total / groups), rem = total % groups
  const answer = rem > 0 ? `${q} r ${rem}` : `${q}`
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
    else { setWrong(c); speak(`Not quite. Share ${total} into ${groups} and count.`); window.setTimeout(() => setWrong(null), 1000) }
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 44, color: 'var(--milo-orange)' }}>{total} ÷ {groups} = ?</div>
      <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', opacity: ready ? 1 : 0.5, transition: 'opacity 0.2s' }}>
        {choices.map(c => {
          const isRight = picked === c, isWrong = wrong === c
          return (
            <button key={c} onClick={() => pick(c)} disabled={picked != null || !ready} style={{
              minWidth: 96, height: 84, padding: '0 12px', borderRadius: 22,
              background: isRight ? 'var(--garden-green-soft)' : isWrong ? 'var(--apple-red-soft)' : 'var(--paper)',
              border: `4px solid ${isRight ? 'var(--garden-green)' : isWrong ? 'var(--apple-red)' : 'var(--outline)'}`,
              boxShadow: isRight ? '0 6px 0 var(--garden-green-deep)' : isWrong ? '0 6px 0 var(--apple-red-deep)' : '0 6px 0 #c8ac79',
              fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 30, color: 'var(--ink)',
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
    // ── Equal sharing (no remainder) ──
    { bubble: `Hi ${childName}! Division means sharing equally. 🍪`, mood: 'happy',
      render: d => <ShareWatch total={12} groups={3} emoji="🍪" intro={`Hi ${childName}! Twelve cookies shared among three. Watch.`} outro="Sharing equally is dividing!" onDone={d} /> },
    { bubble: 'Share them out, one to each! 🤝', mood: 'thinking',
      render: d => <ShareWatch total={15} groups={5} emoji="⭐" intro="Fifteen stars shared among five boxes." outro="Fifteen divided by five is three!" onDone={d} /> },
    { bubble: 'Division undoes times tables! 🔁', mood: 'happy',
      render: d => <ShareWatch total={20} groups={4} emoji="🍎" intro="Twenty apples shared among four. Four times five is twenty!" outro="So twenty divided by four is five!" onDone={d} /> },
    { bubble: 'Share by twos! 👣', mood: 'thinking',
      render: d => <ShareWatch total={8} groups={2} emoji="🍓" intro="Eight strawberries shared between two." outro="Eight divided by two is four!" onDone={d} /> },
    { bubble: 'Share by threes! 🔢', mood: 'thinking',
      render: d => <ShareWatch total={9} groups={3} emoji="🍌" intro="Nine bananas shared among three." outro="Nine divided by three is three!" onDone={d} /> },
    { bubble: 'Four equal boxes. 📦', mood: 'thinking',
      render: d => <ShareWatch total={16} groups={4} emoji="🐟" intro="Sixteen fish shared among four." outro="Sixteen divided by four is four!" onDone={d} /> },
    { bubble: 'Five equal boxes! 🖐️', mood: 'thinking',
      render: d => <ShareWatch total={25} groups={5} emoji="⭐" intro="Twenty-five stars shared among five." outro="Twenty-five divided by five is five!" onDone={d} /> },
    { bubble: 'Six boxes this time! 📦', mood: 'thinking',
      render: d => <ShareWatch total={18} groups={6} emoji="🍇" intro="Eighteen grapes shared among six." outro="Eighteen divided by six is three!" onDone={d} /> },
    { bubble: 'Your turn — how many each? 👂', mood: 'thinking',
      render: d => <DivPick total={18} groups={3} choices={['5', '6', '7']} intro="Eighteen shared among three — how many each?" outro="Yes! Six each!" onDone={d} /> },
    // ── Remainders (some left over) ──
    { bubble: 'Sometimes some are LEFT OVER! 🧩', mood: 'happy',
      render: d => <ShareWatch total={13} groups={4} emoji="🍪" intro="Thirteen cookies among four. Deal them out…" outro="Three each, and one left over!" onDone={d} /> },
    { bubble: 'The leftover is the remainder. ➗', mood: 'thinking',
      render: d => <ShareWatch total={17} groups={5} emoji="⭐" intro="Seventeen stars among five boxes." outro="Three each, with two left over!" onDone={d} /> },
    { bubble: 'One left over! 🧩', mood: 'thinking',
      render: d => <ShareWatch total={7} groups={2} emoji="🍓" intro="Seven strawberries between two." outro="Three each, and one left over!" onDone={d} /> },
    { bubble: 'Two left over! 🧩', mood: 'thinking',
      render: d => <ShareWatch total={11} groups={3} emoji="🍌" intro="Eleven bananas among three." outro="Three each, with two left over!" onDone={d} /> },
    { bubble: 'Three left over! 🧩', mood: 'thinking',
      render: d => <ShareWatch total={19} groups={4} emoji="🐟" intro="Nineteen fish among four." outro="Four each, with three left over!" onDone={d} /> },
    { bubble: 'A bigger share! 📦', mood: 'thinking',
      render: d => <ShareWatch total={22} groups={5} emoji="🍇" intro="Twenty-two grapes among five." outro="Four each, with two left over!" onDone={d} /> },
    { bubble: 'Five in each box! 🖐️', mood: 'thinking',
      render: d => <ShareWatch total={16} groups={3} emoji="🍪" intro="Sixteen cookies among three." outro="Five each, and one left over!" onDone={d} /> },
    { bubble: 'Your turn — with a remainder! 👂', mood: 'thinking',
      render: d => <DivPick total={14} groups={4} choices={['3 r 1', '3 r 2', '4 r 2']} intro="Fourteen shared among four — how many each, and how many left over?" outro="Yes! Three each, remainder two!" onDone={d} /> },
    { bubble: 'Last one — share and find the leftover! 🏆', mood: 'thinking',
      render: d => <DivPick total={23} groups={5} choices={['4 r 2', '4 r 3', '5 r 3']} intro="Twenty-three shared among five — how many each, and the remainder?" outro="Amazing! Four each, remainder three!" onDone={d} /> },
  ]
}
export default function DivisionLesson({ childName, onLessonComplete }: Props) {
  return (
    <LessonScaffold
      childName={childName}
      onLessonComplete={onLessonComplete}
      steps={buildSteps(childName)}
      finalSpeech={`Great dividing, ${childName}! Now let's practise!`}
    />
  )
}
