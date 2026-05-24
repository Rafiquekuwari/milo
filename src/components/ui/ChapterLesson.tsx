/**
 * ChapterLesson — Interactive lesson shell (5 examples before practice)
 *
 * Chrome autoplay behaviour (per developer.chrome.com/blog/autoplay):
 *  - PWA installed to home screen → autoplay always works, no button needed
 *  - Browser tab, first visit → blocked until user taps something
 *
 * When blocked: useIsBlocked() = true → "Tap to hear Milo!" button pulses
 * When not blocked (PWA / returning user): button is a quiet replay control
 */
'use client'

import React, { useState, useEffect, useRef } from 'react'
import { MiloProgressBar } from '@/components/ui/MiloUI'
import {
  useMiloSpeaker,
  replayLast,
  useIsSpeaking,
  useIsBlocked,
} from '@/lib/useMiloSpeaker'
import SpeakingLock from '@/components/ui/SpeakingLock'

export interface LessonExample {
  title:      string
  miloSays:   string
  visual:     React.ReactNode
  tapPrompt?: string
  onTap?:     () => void
}

interface Props {
  chapterId:        string
  childName:        string
  examples:         LessonExample[]
  onLessonComplete: () => void
}

const TOTAL_EXAMPLES = 5

export default function ChapterLesson({
  childName, examples, onLessonComplete,
}: Props) {
  const { speak }     = useMiloSpeaker()
  const isSpeaking    = useIsSpeaking()
  const isBlocked     = useIsBlocked()   // true = Chrome blocked autoplay
  const [idx, setIdx] = useState(0)
  const [leaving, setLeaving] = useState(false)
  const spoken        = useRef(false)

  const ex = examples[idx % examples.length]

  useEffect(() => { spoken.current = false }, [idx])

  useEffect(() => {
    if (spoken.current) return
    spoken.current = true
    const text = idx === 0
      ? `Hi ${childName}! Let me show you how this works. Watch carefully! ${ex.miloSays}`
      : ex.miloSays
    speak(text)
    // If Chrome blocks it (not-allowed), useIsBlocked() becomes true automatically
    // and the button below pulses to ask the child to tap
  }, [idx, ex.miloSays, childName, speak])

  function handleListenButton() {
    // onClick = user gesture → Chrome always allows this
    replayLast()
  }

  function goNext() {
    if (idx + 1 >= TOTAL_EXAMPLES) {
      setLeaving(true)
      speak("Amazing! Now it's your turn! Let's practise!")
      setTimeout(onLessonComplete, 1400)
      return
    }
    setIdx(i => i + 1)
  }

  const isLast = idx + 1 >= TOTAL_EXAMPLES

  // Button state
  const btnLabel = isBlocked
    ? '🔇 Tap to hear Milo!'
    : isSpeaking
      ? '🔊 Milo is talking...'
      : '🎧 Listen to Milo...'

  const btnBg = isBlocked
    ? 'linear-gradient(135deg, #e53e3e 0%, #c53030 100%)'   // red pulse = needs tap
    : isSpeaking
      ? 'linear-gradient(135deg, var(--sky-blue) 0%, var(--sky-blue-deep) 100%)'
      : 'linear-gradient(135deg, var(--milo-orange) 0%, var(--milo-orange-deep) 100%)'

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '64px 24px 32px', gap: 20, position: 'relative',
      background: 'linear-gradient(180deg, var(--sky-blue-soft) 0%, var(--bg-page) 55%)',
      opacity: leaving ? 0 : 1,
      transition: 'opacity 0.4s ease',
    }}>
      <SpeakingLock />

      <MiloProgressBar current={idx} total={TOTAL_EXAMPLES} />

      {/* Example badge */}
      <div style={{
        background: 'var(--milo-orange)', color: '#fff',
        borderRadius: 20, padding: '6px 18px',
        fontSize: 15, fontWeight: 700,
      }}>
        🌟 Example {idx + 1} of {TOTAL_EXAMPLES}
      </div>

      {/* Speech bubble */}
      <div style={{
        background: '#fff',
        border: '2.5px solid var(--milo-orange-soft)',
        borderRadius: 20, padding: '18px 22px',
        maxWidth: 460, width: '100%',
        boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
        fontSize: 17, fontWeight: 600, lineHeight: 1.5,
        color: 'var(--text-dark)', position: 'relative',
      }}>
        <div style={{
          position: 'absolute', left: -44, top: '50%',
          transform: 'translateY(-50%)', fontSize: 36,
          animation: isSpeaking ? 'miloBounce 0.6s ease-in-out infinite alternate' : 'none',
        }}>🦊</div>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6, color: 'var(--milo-orange)' }}>
          {ex.title}
        </div>
        {ex.miloSays}
      </div>

      {/* Visual */}
      <div style={{
        background: '#fff', borderRadius: 20,
        border: '2px solid var(--border-soft)',
        padding: '24px 32px', width: '100%', maxWidth: 460,
        minHeight: 140,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 12,
      }}>
        {ex.visual}
        {ex.tapPrompt && (
          <div style={{ fontSize: 14, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 6 }}>
            {ex.tapPrompt}
          </div>
        )}
      </div>

      {/* Dot indicators */}
      <div style={{ display: 'flex', gap: 8 }}>
        {Array.from({ length: TOTAL_EXAMPLES }).map((_, i) => (
          <div key={i} style={{
            width: i === idx ? 20 : 10, height: 10, borderRadius: 5,
            background: i <= idx ? 'var(--milo-orange)' : 'var(--border-soft)',
            transition: 'all 0.3s ease',
          }} />
        ))}
      </div>

      {/* Listen / Replay button */}
      <button
        onClick={handleListenButton}
        style={{
          background: btnBg,
          color: '#fff', border: 'none', borderRadius: 50,
          padding: '16px 36px', fontSize: 18, fontWeight: 700,
          cursor: isSpeaking ? 'wait' : 'pointer',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          transition: 'all 0.3s ease',
          width: '100%', maxWidth: 340,
          animation: isBlocked ? 'attentionPulse 1.2s ease-in-out infinite' : 'none',
        }}
      >
        {btnLabel}
      </button>

      {/* Next button — disabled while speaking */}
      <button
        onClick={goNext}
        disabled={isSpeaking}
        style={{
          background: isSpeaking ? 'var(--border-soft)' : 'var(--garden-green)',
          color: isSpeaking ? 'var(--text-muted)' : '#fff',
          border: 'none', borderRadius: 50,
          padding: '14px 36px', fontSize: 17, fontWeight: 700,
          cursor: isSpeaking ? 'not-allowed' : 'pointer',
          boxShadow: isSpeaking ? 'none' : '0 4px 16px rgba(0,0,0,0.12)',
          transition: 'all 0.3s ease',
          width: '100%', maxWidth: 340,
        }}
      >
        {isLast ? '🎉 Start Practising!' : 'Next Example →'}
      </button>

      <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
        {isBlocked
          ? 'Tap the button above so Milo can talk!'
          : isSpeaking
            ? 'Wait for Milo to finish...'
            : "Watch all examples, then it's your turn!"}
      </div>

      <style>{`
        @keyframes miloBounce {
          from { transform: translateY(-50%) rotate(-5deg); }
          to   { transform: translateY(-55%) rotate(5deg); }
        }
        @keyframes attentionPulse {
          0%, 100% { transform: scale(1);    box-shadow: 0 4px 20px rgba(229,62,62,0.4); }
          50%       { transform: scale(1.04); box-shadow: 0 8px 32px rgba(229,62,62,0.6); }
        }
      `}</style>
    </div>
  )
}
