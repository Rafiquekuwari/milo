'use client'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useMiloStore, CHAPTER_ORDER, CHAPTER_NAMES } from '@/lib/store'
import { useMiloSpeaker } from '@/lib/useMiloSpeaker'

const STAR_MSGS = ['', 'Keep practising — you can do it!', 'Well done! You are getting there!', 'Amazing! You are a star!']

interface Props {
  onPlayAgain?: () => void   // override the default "play again" (chapter restart)
  onExit?: () => void        // override the default "back to menu"
  exitLabel?: string         // label for the exit button
  hideNext?: boolean         // hide the "next chapter" button (e.g. AR activities)
}

export default function CelebrationModal({ onPlayAgain, onExit, exitLabel, hideNext }: Props = {}) {
  const router = useRouter()
  const { celebration, dismissCelebration, startChapter } = useMiloStore()
  const { speak } = useMiloSpeaker()
  const spoken = useRef(false)

  useEffect(() => {
    if (celebration && !spoken.current) {
      spoken.current = true
      const msg = celebration.stars === 3
        ? `Woohoo! Three stars! You are amazing, ${celebration.childName}!`
        : celebration.stars === 2
        ? `Great job! Two stars! You did really well!`
        : `Good try! Keep practising and you will get three stars!`
      speak(msg)
    }
    if (!celebration) spoken.current = false
  }, [celebration, speak])

  if (!celebration) return null

  const { stars, xpGained, coinsGained, completedChapter } = celebration
  const nextChapterIdx = CHAPTER_ORDER.indexOf(completedChapter) + 1
  const nextChapter    = CHAPTER_ORDER[nextChapterIdx] ?? null

  function handleMenu() {
    dismissCelebration()
    if (onExit) onExit(); else router.push('/menu')
  }

  function handlePlayAgain() {
    dismissCelebration()
    if (onPlayAgain) onPlayAgain(); else startChapter(completedChapter)
  }

  function handleNextChapter() {
    if (!nextChapter) return
    dismissCelebration()
    startChapter(nextChapter)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(61,37,22,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      {/* Confetti */}
      {[...Array(18)].map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          top: `${(i * 17) % 80}%`,
          left: `${(i * 23) % 100}%`,
          width: 14, height: 14,
          borderRadius: i % 2 === 0 ? '50%' : '3px',
          background: ['#F26B2C','#FFC933','#6FBE3F','#5BC3F0','#9362D8','#E64545'][i % 6],
          animation: `confettiFall ${1.2 + (i % 3) * 0.3}s ease-in ${(i % 5) * 0.1}s both`,
          pointerEvents: 'none',
        }} />
      ))}

      <div style={{
        background: 'var(--paper)', border: '4px solid var(--outline)',
        borderRadius: 32, padding: '36px 28px 28px',
        maxWidth: 360, width: '100%', textAlign: 'center',
        boxShadow: '0 8px 0 var(--outline)', position: 'relative', zIndex: 1,
      }}>
        <img src="/assets/characters/milo-happy.png" alt="Milo"
          style={{ width: 110, height: 110, objectFit: 'contain', marginBottom: 4 }}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />

        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--t-h1)', color: 'var(--ink)', margin: '0 0 4px' }}>
          {stars === 3 ? '🎉 Amazing!' : stars === 2 ? '🌟 Great job!' : '💪 Good try!'}
        </h2>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--t-body-lg)', color: 'var(--ink-soft)', margin: '0 0 20px' }}>
          {STAR_MSGS[stars]}
        </p>

        {/* Stars */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
          {[1,2,3].map(n => (
            <span key={n} style={{ fontSize: 44, opacity: n <= stars ? 1 : 0.18 }}>⭐</span>
          ))}
        </div>

        {/* XP + coins */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 24 }}>
          {[
            { label: 'XP', value: `+${xpGained}`, bg: 'var(--sky-blue-soft)', border: 'var(--sky-blue)' },
            { label: '🪙', value: `+${coinsGained}`, bg: 'var(--sun-yellow-soft)', border: 'var(--sun-yellow-deep)' },
          ].map(s => (
            <div key={s.label} style={{
              background: s.bg, border: `3px solid ${s.border}`,
              borderRadius: 14, padding: '8px 16px',
              fontFamily: 'var(--font-display)', fontWeight: 900,
              fontSize: 18, color: 'var(--ink)',
              boxShadow: '0 3px 0 rgba(61,37,22,.10)',
            }}>
              {s.value} {s.label}
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Next chapter — primary if available (hidden for AR activities) */}
          {!hideNext && nextChapter && (
            <button className="milo-btn tone-green size-lg" onClick={handleNextChapter}
              style={{ width: '100%' }}>
              Next: {CHAPTER_NAMES[nextChapter]} →
            </button>
          )}

          {/* Play again */}
          <button className="milo-btn tone-blue size-lg" onClick={handlePlayAgain}
            style={{ width: '100%' }}>
            🔁 Play again
          </button>

          {/* Back to menu (or custom exit) */}
          <button className="milo-btn tone-cream" onClick={handleMenu}
            style={{ width: '100%', fontSize: 15 }}>
            {exitLabel ?? '← Back to menu'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes confettiFall {
          from { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          to   { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  )
}