'use client'
/**
 * Numbers100Lesson — baby-step intro to numbers up to 100 for 6–8 year olds.
 * Core ideas: numbers keep going past ten; count by tens (10…100); a two-digit
 * number is some TENS and some ONES (24 = 2 tens + 4 ones); read it aloud.
 *
 * Built on the shared lesson kit. Exports ReadNumber + PickNumber so the
 * practice chapter reuses them for the after-3-wrong re-teach.
 */
import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { speak, speakSeq } from '@/lib/useMiloSpeaker'
import { LessonScaffold, SectionBreak, BigCount, Confetti, CSS as KIT_CSS, numberToWords, type LessonStep } from './_kit'

interface Props { childName: string; onLessonComplete: () => void }

// ─── A two-digit number drawn as ten-rods + ones ─────────────
export function TensOnes({ n, revealTens, revealOnes }: { n: number; revealTens: number; revealOnes: number }) {
  const t = Math.floor(n / 10), o = n % 10
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, justifyContent: 'center', minHeight: 96 }}>
      {/* ten-rods */}
      <div style={{ display: 'flex', gap: 6 }}>
        {Array.from({ length: t }).map((_, i) => (
          <div key={i} style={{
            width: 26, height: 84, borderRadius: 7, border: '3px solid var(--sky-blue-deep)',
            background: 'var(--sky-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 13,
            opacity: i < revealTens ? 1 : 0.12,
            transform: i < revealTens ? 'scale(1)' : 'scale(0.7)',
            transition: 'all 0.35s cubic-bezier(.34,1.56,.64,1)',
          }}>10</div>
        ))}
      </div>
      {t > 0 && o > 0 && <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 30, color: 'var(--milo-orange)', paddingBottom: 28 }}>+</div>}
      {/* ones */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, maxWidth: 120, alignContent: 'flex-end' }}>
        {Array.from({ length: o }).map((_, i) => (
          <div key={i} style={{
            width: 22, height: 22, borderRadius: '50%', border: '3px solid var(--garden-green-deep)',
            background: 'var(--garden-green)',
            opacity: i < revealOnes ? 1 : 0.12,
            transform: i < revealOnes ? 'scale(1)' : 'scale(0.6)',
            transition: 'all 0.3s cubic-bezier(.34,1.56,.64,1)',
          }} />
        ))}
      </div>
    </div>
  )
}

// ═══ Milo reveals a number as tens + ones, then reads it ═══
export function ReadNumber({ n, intro, outro, onDone }: {
  n: number; intro: string; outro: string; onDone: () => void
}) {
  const t = Math.floor(n / 10), o = n % 10
  const [rt, setRt] = useState(0)
  const [ro, setRo] = useState(0)
  const [bigN, setBigN] = useState<number | null>(null)   // running count shown as Milo speaks
  const [showNum, setShowNum] = useState(false)
  const doneRef = useRef(onDone); doneRef.current = onDone

  useEffect(() => {
    // Count by tens, then count on through the ones, then say the whole number —
    // spoken via speakSeq so each number finishes before the next (never cut),
    // with onWord driving the matching reveal AND the big running count, so the
    // child sees 10, 20, 21, 22, 23, 24 before the final number settles.
    const tensWords = Array.from({ length: t }, (_, k) => String((k + 1) * 10))
    const onesWords = Array.from({ length: o }, (_, k) => String(t * 10 + k + 1))
    const tensPart = t > 0 ? `${t} ${t === 1 ? 'ten' : 'tens'}` : ''
    const onesPart = o > 0 ? `${o} ${o === 1 ? 'one' : 'ones'}` : ''
    const both = [tensPart, onesPart].filter(Boolean).join(' and ')
    const summary = `${both} make ${numberToWords(n)}. ${outro}`
    const words = [intro, ...tensWords, ...onesWords, summary]
    const cancel = speakSeq(words, {
      onWord: (i) => {
        if (i >= 1 && i <= t) { setRt(i); setBigN(i * 10) }                 // 10, 20, …
        else if (i > t && i <= t + o) { setRo(i - t); setBigN(t * 10 + (i - t)) } // 21, 22, …
        else if (i === t + o + 1) { setBigN(n); setShowNum(true) }          // settle on the number
      },
      onDone: () => { setBigN(n); setShowNum(true); window.setTimeout(() => doneRef.current(), 600) },
    })
    return cancel
  }, []) // eslint-disable-line

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div style={{ height: 64, display: 'flex', alignItems: 'center' }}>
        {bigN != null && <BigCount key={bigN} n={bigN} />}
      </div>
      <TensOnes n={n} revealTens={rt} revealOnes={ro} />
      {showNum && (
        <div style={{ background: 'var(--milo-orange)', color: '#fff', borderRadius: 50, padding: '8px 22px',
          fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, animation: 'k_flipIn 0.5s ease' }}>
          {t > 0 ? `${t} tens` : ''}{t > 0 && o > 0 ? ' + ' : ''}{o > 0 ? `${o} ones` : ''} = {n}
        </div>
      )}
    </div>
  )
}

// ═══ Tens ladder: each ten explained with a block (1 ten=10 … 10 tens=100) ═══
function TensLadder({ onDone }: { onDone: () => void }) {
  const [shown, setShown] = useState(0)            // rods revealed
  const [big, setBig] = useState<number | null>(null)
  const doneRef = useRef(onDone); doneRef.current = onDone
  useEffect(() => {
    // "one ten makes ten", "two tens make twenty", … "ten tens make one hundred"
    const phrases = Array.from({ length: 10 }, (_, k) => {
      const tens = k + 1
      return `${numberToWords(tens)} ${tens === 1 ? 'ten makes' : 'tens make'} ${numberToWords(tens * 10)}`
    })
    const words = ['Every ten is one block. Count the tens with me!', ...phrases, 'You counted all the way to one hundred!']
    const cancel = speakSeq(words, {
      onWord: (i) => { if (i >= 1 && i <= 10) { setShown(i); setBig(i * 10) } },
      onDone: () => window.setTimeout(() => doneRef.current(), 400),
    })
    return cancel
  }, []) // eslint-disable-line
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <div style={{ height: 56, display: 'flex', alignItems: 'center' }}>
        {big != null && <BigCount key={big} n={big} />}
      </div>
      <div style={{ display: 'flex', gap: 5, alignItems: 'flex-end', justifyContent: 'center', maxWidth: 320 }}>
        {Array.from({ length: 10 }).map((_, i) => {
          const seen = i < shown
          return (
            <div key={i} style={{
              width: 18, height: 72, borderRadius: 5, border: '3px solid var(--sky-blue-deep)',
              background: seen ? 'var(--sky-blue)' : 'var(--paper-soft)',
              opacity: seen ? 1 : 0.25, transform: i === shown - 1 ? 'scale(1.1)' : 'scale(1)',
              transition: 'all 0.3s cubic-bezier(.34,1.56,.64,1)',
              display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 3,
              color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 10,
            }}>10</div>
          )
        })}
      </div>
    </div>
  )
}

// ═══ Pick the number Milo says (gentle: retry until right) ═══
export function PickNumber({ target, choices, intro, outro, onDone }: {
  target: number; choices: number[]; intro: string; outro: string; onDone: () => void
}) {
  const [picked, setPicked] = useState<number | null>(null)
  const [wrong, setWrong] = useState<number | null>(null)
  const [burst, setBurst] = useState(false)
  const spoken = useRef(false)
  useEffect(() => { if (spoken.current) return; spoken.current = true; speak(intro) }, [intro])

  function pick(c: number) {
    if (picked != null) return
    if (c === target) {
      setPicked(c); setWrong(null); setBurst(true)
      speak(outro)
      window.setTimeout(onDone, 2400)
    } else {
      setWrong(c)
      speak(`That is ${numberToWords(c)}. Listen again — find ${numberToWords(target)}!`)
      window.setTimeout(() => setWrong(null), 1000)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, position: 'relative' }}>
      {burst && <Confetti />}
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: 'var(--milo-orange)',
        background: 'var(--milo-orange-soft)', borderRadius: 50, padding: '6px 18px', border: '2px solid var(--milo-orange)' }}>
        Find {numberToWords(target)}! 👂
      </div>
      <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
        {choices.map(c => {
          const isRight = picked === c, isWrong = wrong === c
          return (
            <button key={c} onClick={() => pick(c)} disabled={picked != null} style={{
              width: 96, height: 88, borderRadius: 20,
              background: isRight ? 'var(--garden-green-soft)' : isWrong ? 'var(--apple-red-soft)' : 'var(--paper)',
              border: `4px solid ${isRight ? 'var(--garden-green)' : isWrong ? 'var(--apple-red)' : 'var(--outline)'}`,
              boxShadow: isRight ? '0 6px 0 var(--garden-green-deep)' : isWrong ? '0 6px 0 var(--apple-red-deep)' : '0 6px 0 #c8ac79',
              fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 38, color: 'var(--ink)',
              cursor: picked != null ? 'default' : 'pointer',
              transform: isRight ? 'scale(1.1) translateY(-4px)' : 'scale(1)',
              transition: 'transform 160ms cubic-bezier(.34,1.56,.64,1),background 160ms ease',
            }}>{c}</button>
          )
        })}
      </div>
      {picked != null && (
        <div style={{ background: 'var(--garden-green)', color: '#fff', borderRadius: 50, padding: '8px 22px',
          fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 20, animation: 'k_bounceIn 0.5s cubic-bezier(.34,1.56,.64,1)' }}>
          {numberToWords(target)} is {target}! ⭐
        </div>
      )}
    </div>
  )
}

// ═══ Reusable 1–100 chart; tap a number → build it. The build pop-up is
// portaled to <body> so a parent scale-transform can't clip it. ═══
export function NumberChart() {
  const [picked, setPicked] = useState<number | null>(null)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState<number | null>(null)   // number being read during count-all
  const cancelRef = useRef<(() => void) | null>(null)

  function stopCount() { cancelRef.current?.(); cancelRef.current = null; setPlaying(false); setCurrent(null) }
  function playAll() {
    if (playing) { stopCount(); return }
    setPlaying(true)
    // Just pronounce each number 1→100 (no tens/ones breakdown), lighting it up.
    const words = Array.from({ length: 100 }, (_, k) => numberToWords(k + 1))
    cancelRef.current = speakSeq(words, {
      onWord: (i) => setCurrent(i + 1),
      onDone: () => { setPlaying(false); setCurrent(null); cancelRef.current = null },
    })
  }
  useEffect(() => () => { cancelRef.current?.() }, []) // stop on unmount

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: 'var(--milo-orange)' }}>
        Tap any number to see its tens &amp; ones! 👆
      </div>
      <button onClick={playAll} style={{
        padding: '9px 18px', borderRadius: 50, cursor: 'pointer',
        background: playing ? 'var(--apple-red)' : 'var(--garden-green)',
        border: `3px solid ${playing ? 'var(--apple-red-deep)' : 'var(--garden-green-deep)'}`,
        color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14,
        boxShadow: `0 3px 0 ${playing ? 'var(--apple-red-deep)' : 'var(--garden-green-deep)'}`,
      }}>{playing ? '⏹ Stop' : '🔊 Count 1 to 100'}</button>
      {/* As large as the viewport allows — bounded by BOTH width and height so it
          fits any device (10 cols ≈ square, leaving room for the header/buttons). */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 'clamp(3px, 0.8vmin, 7px)',
        width: 'min(92vw, 760px, calc(94dvh - 200px))',
      }}>
        {Array.from({ length: 100 }).map((_, idx) => {
          const v = idx + 1
          const evenTen = Math.floor((v - 1) / 10) % 2 === 0
          const isCur = current === v
          return (
            <button key={v} onClick={() => { stopCount(); setPicked(v) }} style={{
              aspectRatio: '1', minWidth: 0, borderRadius: 'clamp(6px, 1.4vmin, 12px)',
              border: `2px solid ${isCur ? 'var(--garden-green-deep)' : 'var(--outline)'}`,
              background: isCur ? 'var(--garden-green)' : evenTen ? 'var(--paper)' : 'var(--sky-blue-soft)',
              fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(12px, 3vmin, 26px)',
              color: isCur ? '#fff' : 'var(--ink)',
              transform: isCur ? 'scale(1.18)' : 'scale(1)',
              transition: 'all 0.15s ease',
              cursor: 'pointer', padding: 0,
            }}>{v}</button>
          )
        })}
      </div>

      {picked != null && typeof document !== 'undefined' && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(61,37,22,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <style>{KIT_CSS}</style>
          <div style={{ background: 'var(--paper)', border: '4px solid var(--outline)', borderRadius: 24, padding: '22px 16px 18px', maxWidth: 460, width: '100%', boxShadow: '0 8px 0 rgba(61,37,22,.2)', maxHeight: '94vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <ReadNumber key={picked} n={picked}
              intro={`Let's build ${numberToWords(picked)}.`}
              outro={`That is ${numberToWords(picked)}!`}
              onDone={() => {}} />
            <button onClick={() => setPicked(null)} style={{
              padding: '12px 24px', background: 'linear-gradient(135deg,var(--milo-orange) 0%,var(--milo-orange-deep) 100%)',
              color: '#fff', border: 'none', borderRadius: 50, fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 16,
              cursor: 'pointer', boxShadow: '0 4px 0 rgba(61,37,22,.2)',
            }}>Pick another number →</button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}

// ─── The lesson steps ────────────────────────────────────────
export default function Numbers100Lesson({ childName, onLessonComplete }: Props) {
  const steps: LessonStep[] = [
    // Past ten: numbers keep going.
    { bubble: `Hi ${childName}! Numbers keep going past ten. Watch! 🔢`, mood: 'happy',
      render: d => <ReadNumber n={13} intro="After ten come the teens! Let's build thirteen. Count with me." outro="That is thirteen!" onDone={d} /> },
    { bubble: '🎉 Numbers keep going and going!', mood: 'celebrate',
      render: d => <SectionBreak emoji="🚀" title="Numbers keep going!" subtitle="All the way up to one hundred!" onDone={d} /> },

    // Every ten explained as a block.
    { bubble: 'Every ten is one block. Count the tens! 🔟', mood: 'happy',
      render: d => <TensLadder onDone={d} /> },

    // Teach 15 → then find 15.
    { bubble: 'A big number is TENS and ONES. Let’s build fifteen! ✋', mood: 'thinking',
      render: d => <ReadNumber n={15} intro="Let's build fifteen. One ten…" outro="One ten and five ones make fifteen!" onDone={d} /> },
    { bubble: 'Now YOU find fifteen! 👂', mood: 'thinking',
      render: d => <PickNumber target={15} choices={[10, 15, 20]} intro="Find fifteen!" outro="Yes! Fifteen!" onDone={d} /> },

    { bubble: '🌟 You found it! Bigger numbers work the same way!', mood: 'celebrate',
      render: d => <SectionBreak emoji="⭐" title="Tens and ones!" subtitle="Two tens, three tens… same idea!" onDone={d} /> },

    // Teach 24 → find 24.
    { bubble: 'Let’s build twenty-four. Two tens… 🤔', mood: 'thinking',
      render: d => <ReadNumber n={24} intro="Let's build twenty-four. Two tens…" outro="Twenty-four!" onDone={d} /> },
    { bubble: 'Now find twenty-four! 👂', mood: 'thinking',
      render: d => <PickNumber target={24} choices={[21, 24, 27]} intro="Find twenty-four!" outro="Yes! Twenty-four!" onDone={d} /> },

    // Teach 38 → find 38.
    { bubble: 'Now thirty-eight. Three tens… 🤔', mood: 'thinking',
      render: d => <ReadNumber n={38} intro="Let's build thirty-eight. Three tens…" outro="Thirty-eight!" onDone={d} /> },
    { bubble: 'Find thirty-eight! 👂', mood: 'thinking',
      render: d => <PickNumber target={38} choices={[35, 38, 41]} intro="Find thirty-eight!" outro="Brilliant! Thirty-eight!" onDone={d} /> },

    // Teach 62 → find 62 (final, bigger).
    { bubble: 'Last one — sixty-two! Six tens… 🤔', mood: 'thinking',
      render: d => <ReadNumber n={62} intro="Let's build sixty-two. Six tens…" outro="Sixty-two!" onDone={d} /> },
    { bubble: 'Find sixty-two! 👂', mood: 'thinking',
      render: d => <PickNumber target={62} choices={[26, 62, 60]} intro="Find sixty-two!" outro="Amazing! Sixty-two!" onDone={d} /> },

    // Point to the always-available chart button (full-screen, responsive).
    { bubble: '🔢 Tap the chart button up top any time to explore numbers!', mood: 'celebrate',
      render: d => <SectionBreak emoji="🔢" title="Explore any number!" subtitle="Tap the 🔢 button up top to see how any number is built." onDone={d} /> },
  ]
  return (
    <LessonScaffold childName={childName} onLessonComplete={onLessonComplete} steps={steps}
      finalSpeech={`Amazing, ${childName}! You can read numbers up to one hundred! Let’s practise!`}
      chart={<NumberChart />} />
  )
}
