'use client'
/**
 * GameTopbar — persistent topbar shown during all chapter gameplay
 * Matches the style of the reference (BAO) but with Milo's design system
 *
 * Shows: back button | chapter name | stars | round progress | XP chip
 */
import React from 'react'
import { useRouter } from 'next/navigation'
import { useMiloStore } from '@/lib/store'

interface Props {
  chapterName:   string
  roundIdx:      number
  totalRounds:   number
  starsEarned?:  number   // 0-3 stars earned so far this session
  onBack?:       () => void  // override default back behaviour
}

export default function GameTopbar({
  chapterName, roundIdx, totalRounds, starsEarned = 0, onBack,
}: Props) {
  const router  = useRouter()
  const profile = useMiloStore(s => s.profile)
  const pct     = Math.round((roundIdx / totalRounds) * 100)

  const [confirmBack, setConfirmBack] = React.useState(false)

  function handleBack() {
    if (onBack) { onBack(); return }
    setConfirmBack(true)
  }

  return (
    <>
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      background: 'var(--milo-orange)',
      borderBottom: '4px solid var(--milo-orange-deep)',
      boxShadow: '0 4px 0 rgba(61,37,22,.2)',
      display: 'flex', alignItems: 'center',
      padding: '0 12px',
      height: 56,
      gap: 10,
    }}>
      {/* Back button */}
      <button
        onClick={handleBack}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '7px 14px', borderRadius: 50, flexShrink: 0,
          background: 'rgba(255,255,255,0.18)',
          border: '2.5px solid rgba(255,255,255,0.5)',
          color: '#fff',
          fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14,
          cursor: 'pointer', transition: 'all 0.15s',
          boxShadow: '0 3px 0 rgba(61,37,22,.2)',
        }}
        onMouseDown={e => {
          e.currentTarget.style.transform = 'translateY(3px)'
          e.currentTarget.style.boxShadow = 'none'
        }}
        onMouseUp={e => {
          e.currentTarget.style.transform = ''
          e.currentTarget.style.boxShadow = '0 3px 0 rgba(61,37,22,.2)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = ''
          e.currentTarget.style.boxShadow = '0 3px 0 rgba(61,37,22,.2)'
        }}
      >← Back</button>

      {/* Chapter name */}
      <div style={{
        flex: 1, minWidth: 0,
        textAlign: 'center',
      }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontWeight: 900,
          fontSize: 16, color: '#fff',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          textShadow: '0 1px 3px rgba(61,37,22,.3)',
        }}>
          {chapterName}
        </div>
        {/* Progress bar */}
        <div style={{
          height: 6, background: 'rgba(255,255,255,0.25)',
          borderRadius: 999, marginTop: 4, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', width: `${pct}%`,
            background: '#fff',
            borderRadius: 999,
            transition: 'width 0.4s ease',
          }} />
        </div>
      </div>

      {/* Stars */}
      <div style={{
        display: 'flex', gap: 2, flexShrink: 0,
      }}>
        {[1,2,3].map(i => (
          <span key={i} style={{
            fontSize: 22,
            opacity: i <= starsEarned ? 1 : 0.3,
            filter: i <= starsEarned ? 'none' : 'grayscale(1)',
            transition: 'all 0.3s ease',
          }}>⭐</span>
        ))}
      </div>

      {/* Round counter */}
      <div style={{
        background: 'rgba(255,255,255,0.2)',
        border: '2px solid rgba(255,255,255,0.35)',
        borderRadius: 50, padding: '4px 10px',
        flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 4,
      }}>
        <span style={{
          fontFamily: 'var(--font-display)', fontWeight: 900,
          fontSize: 13, color: '#fff',
        }}>{Math.min(roundIdx + 1, totalRounds)}/{totalRounds}</span>
      </div>

      {/* XP chip */}
      <div style={{
        background: 'rgba(255,255,255,0.15)',
        border: '2px solid rgba(255,255,255,0.3)',
        borderRadius: 50, padding: '4px 10px',
        flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4,
      }}>
        <span style={{ fontSize: 12 }}>⚡</span>
        <span style={{
          fontFamily: 'var(--font-display)', fontWeight: 900,
          fontSize: 13, color: '#fff',
        }}>{profile.totalXP}</span>
      </div>
    </div>

    {/* Back confirmation */}
    {confirmBack && (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(61,37,22,0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}>
        <div style={{
          background: 'var(--paper)', border: '4px solid var(--outline)',
          borderRadius: 24, padding: '28px 24px',
          maxWidth: 320, width: '100%', textAlign: 'center',
          boxShadow: '0 6px 0 var(--outline)',
        }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>⚠️</div>
          <h3 style={{
            fontFamily: 'var(--font-display)', fontSize: 20,
            margin: '0 0 8px', color: 'var(--ink)',
          }}>Leave this chapter?</h3>
          <p style={{
            fontSize: 14, color: 'var(--ink-soft)',
            margin: '0 0 20px', lineHeight: 1.5,
          }}>Your progress in this round will be lost.</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => { setConfirmBack(false); router.push('/menu') }}
              style={{
                flex: 1, padding: '12px',
                background: 'var(--apple-red)', color: '#fff',
                border: 'none', borderRadius: 50,
                fontSize: 14, fontWeight: 800, cursor: 'pointer',
              }}
            >Yes, leave</button>
            <button
              onClick={() => setConfirmBack(false)}
              style={{
                flex: 1, padding: '12px',
                background: 'var(--paper)', border: '3px solid var(--outline)',
                borderRadius: 50, fontSize: 14, fontWeight: 700,
                cursor: 'pointer', color: 'var(--ink)',
              }}
            >Keep playing</button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}