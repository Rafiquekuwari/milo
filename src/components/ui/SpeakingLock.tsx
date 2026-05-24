'use client'

/**
 * SpeakingLock — blocks all taps while Milo is speaking
 *
 * Drop this inside any chapter's return JSX (anywhere in the tree).
 * While Milo speaks:
 *   - A transparent overlay blocks all pointer events
 *   - Milo's avatar gently pulses
 *   - A small "Milo is talking..." badge appears
 *
 * Usage:
 *   import SpeakingLock from '@/components/ui/SpeakingLock'
 *   // inside chapter JSX:
 *   <SpeakingLock />
 */

import { useIsSpeaking } from '@/lib/useMiloSpeaker'

export default function SpeakingLock() {
  const speaking = useIsSpeaking()
  if (!speaking) return null

  return (
    <>
      {/* Invisible full-screen tap blocker */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 40,            // below celebration modal (50) but above everything else
          cursor: 'wait',
          // Completely transparent — kids see the game, just can't tap
          background: 'transparent',
          pointerEvents: 'all',
        }}
        // Eat all pointer events silently
        onClick={e => e.stopPropagation()}
        onPointerDown={e => e.stopPropagation()}
        onTouchStart={e => e.stopPropagation()}
      />

      {/* "Milo is talking" badge — bottom center, unobtrusive */}
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 41,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'var(--paper)',
          border: '3px solid var(--outline)',
          borderRadius: 'var(--r-pill)',
          padding: '8px 18px',
          boxShadow: '0 4px 0 rgba(61,37,22,.15)',
          animation: 'slide-up 200ms ease both',
          pointerEvents: 'none',
        }}
      >
        {/* Milo avatar pulsing */}
        <img
          src="/assets/characters/milo-happy.png"
          alt="Milo speaking"
          style={{
            width: 32,
            height: 32,
            objectFit: 'contain',
            animation: 'tap-pulse 0.8s ease-in-out infinite',
          }}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
        />

        {/* Sound wave bars */}
        <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 20 }}>
          {[1, 2, 3, 2, 1].map((h, i) => (
            <div
              key={i}
              style={{
                width: 4,
                borderRadius: 2,
                background: 'var(--milo-orange)',
                height: `${h * 5}px`,
                animation: `soundBar 0.6s ease-in-out ${i * 0.1}s infinite alternate`,
              }}
            />
          ))}
        </div>

        <span style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 15,
          color: 'var(--ink-soft)',
        }}>
          Milo is talking…
        </span>
      </div>

      <style>{`
        @keyframes soundBar {
          from { transform: scaleY(1);   opacity: 0.6; }
          to   { transform: scaleY(2.5); opacity: 1;   }
        }
      `}</style>
    </>
  )
}
