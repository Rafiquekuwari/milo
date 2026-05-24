'use client'
export const dynamic = 'force-static'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMiloStore, CHAPTER_ORDER, CHAPTER_NAMES, getLevelProgress, getNextLevelXP } from '@/lib/store'
import { getLearnerStats, getLearnerProgress } from '@/lib/supabase/queries'
import { getActiveLearner } from '@/lib/supabase/useLearnerSession'
import type { LearnerStats, LearnerProgress } from '@/lib/supabase/types'

const AVATAR_SRCS = ['/assets/objects/fox.png','/assets/objects/bunny.png','/assets/objects/bear.png','/assets/objects/cat.png']
const LEVEL_NAMES   = ['Beginner','Counter','Explorer','Number Star','Math Wizard','Champion',"Milo's Champion",'Legend']

const CHAPTER_EMOJIS: Record<string, string> = {
  counting:'⭐', numberOrdering:'🔢', numberRecognition:'🚪',
  matchingQuantities:'🍎', numberComparison:'⚖️', shapes:'🏠',
  colors:'🌈', patterns:'🔷', addition:'➕', subtraction:'➖', measurement:'📏',
}

export default function ProfilePage() {
  const router  = useRouter()
  const profile = useMiloStore(s => s.profile)
  const [stats,    setStats]    = useState<LearnerStats | null>(null)
  const [progress, setProgress] = useState<LearnerProgress[]>([])

  useEffect(() => {
    async function load() {
      const learner = getActiveLearner()
      if (!learner || !navigator.onLine) return
      const [s, p] = await Promise.all([
        getLearnerStats(learner.id),
        getLearnerProgress(learner.id),
      ])
      setStats(s)
      setProgress(p)
    }
    load()
  }, [])

  const totalXP      = stats?.total_xp      ?? profile.totalXP
  const totalCoins   = stats?.total_coins   ?? profile.totalCoins
  const currentLevel = stats?.current_level ?? profile.currentLevel
  const streak       = stats?.current_streak ?? profile.currentStreak

  const levelName   = LEVEL_NAMES[Math.min(currentLevel - 1, LEVEL_NAMES.length - 1)]
  const levelPct    = Math.round(getLevelProgress(totalXP, currentLevel) * 100)
  const nextXP      = getNextLevelXP(currentLevel)
  const thresholds  = [0,500,1200,2500,4500,7000,10000,14000]
  const currentFloor = thresholds[currentLevel - 1] ?? 0
  const xpIntoLevel = totalXP - currentFloor
  const xpNeeded    = nextXP - currentFloor

  function getStars(ch: string): number {
    const s = progress.find(p => p.chapter === ch)?.best_stars ?? 0
    const l = profile.chapterStars[ch as keyof typeof profile.chapterStars] ?? 0
    return Math.max(s, l)
  }

  const totalStars = CHAPTER_ORDER.reduce((sum, ch) => sum + getStars(ch), 0)
  const maxStars   = CHAPTER_ORDER.length * 3

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--bg-page)',
      fontFamily: 'var(--font-body)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Topbar */}
      <div className="kit-topbar" style={{ padding: '16px 20px' }}>
        <button
          onClick={() => router.push('/menu')}
          className="kit-backbtn"
          style={{ fontSize: 20 }}
        >←</button>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'var(--sun-yellow-soft)',
          border: '2.5px solid var(--outline)',
          borderRadius: 50, padding: '6px 16px',
        }}>
          <span className="kit-coin size-sm">C</span>
          <span className="numeric" style={{ fontSize: 16, fontWeight: 800 }}>{totalCoins}</span>
        </div>
      </div>

      {/* Two-column layout */}
      <div style={{
        flex: 1, display: 'flex', gap: 16,
        padding: '16px 20px',
        maxWidth: 760, width: '100%', margin: '0 auto',
        flexWrap: 'wrap',
      }}>
        {/* ── Left panel: avatar + stats ── */}
        <div style={{
          flex: '0 0 220px', minWidth: 200,
          background: 'var(--paper)',
          border: '4px solid var(--outline)',
          borderRadius: 28,
          boxShadow: '0 6px 0 rgba(61,37,22,.12)',
          padding: '28px 20px',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 12,
        }}>
          {/* Avatar */}
          <div style={{
            width: 120, height: 120, borderRadius: '50%',
            background: 'var(--milo-orange-soft)',
            border: '5px solid var(--outline)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 0 rgba(61,37,22,.15)',
            overflow: 'hidden',
          }}>
            <img
              src={AVATAR_SRCS[profile.avatarIndex] ?? AVATAR_SRCS[0]}
              alt="avatar"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontFamily: 'var(--font-display)', fontWeight: 900,
              fontSize: 26, color: 'var(--ink)',
            }}>{profile.childName}</div>
            <div style={{ fontSize: 14, color: 'var(--ink-soft)', marginTop: 2 }}>
              Level {currentLevel} · {levelName}
            </div>
          </div>

          {/* XP bar */}
          <div style={{ width: '100%' }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: 11, fontWeight: 700,
              color: 'var(--ink-muted)', textTransform: 'uppercase',
              letterSpacing: 0.5, marginBottom: 6,
            }}>
              <span>EXPERIENCE</span>
              <span>{xpIntoLevel} / {xpNeeded} XP</span>
            </div>
            <div style={{
              background: 'var(--cream)', border: '3px solid var(--outline)',
              borderRadius: 999, height: 18, overflow: 'hidden',
              boxShadow: 'inset 0 2px 4px rgba(61,37,22,.1)',
            }}>
              <div style={{
                width: `${levelPct}%`, height: '100%',
                background: 'linear-gradient(90deg, var(--sun-yellow) 0%, var(--milo-orange) 100%)',
                borderRadius: 999,
                transition: 'width 0.6s ease',
              }} />
            </div>
          </div>

          {/* Coins + streak */}
          <div style={{ display: 'flex', gap: 10, width: '100%' }}>
            {[
              { label: 'COINS',      value: totalCoins, bg: 'var(--sun-yellow-soft)', border: 'var(--sun-yellow-deep)', dot: '🪙' },
              { label: 'DAY STREAK', value: streak,     bg: 'var(--garden-green-soft)', border: 'var(--garden-green)', dot: '•' },
            ].map(s => (
              <div key={s.label} style={{
                flex: 1, background: s.bg,
                border: `3px solid var(--outline)`,
                borderRadius: 16, padding: '10px 8px',
                textAlign: 'center',
                boxShadow: '0 3px 0 rgba(61,37,22,.10)',
              }}>
                <div style={{
                  fontFamily: 'var(--font-display)', fontWeight: 900,
                  fontSize: 22, color: 'var(--ink)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                }}>
                  <span style={{ fontSize: 13 }}>{s.dot}</span>
                  {s.value}
                </div>
                <div style={{
                  fontSize: 10, fontWeight: 700,
                  color: 'var(--ink-muted)', marginTop: 2,
                  textTransform: 'uppercase', letterSpacing: 0.5,
                }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right panel: stars ── */}
        <div style={{
          flex: '1 1 280px',
          background: 'var(--paper)',
          border: '4px solid var(--outline)',
          borderRadius: 28,
          boxShadow: '0 6px 0 rgba(61,37,22,.12)',
          padding: '24px 20px',
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 4,
          }}>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontWeight: 900,
              fontSize: 22, color: 'var(--ink)', margin: 0,
            }}>Your stars</h2>
            <span style={{
              fontFamily: 'var(--font-display)', fontWeight: 800,
              fontSize: 16, color: 'var(--ink-soft)',
            }}>
              <span style={{ fontSize: 18 }}>⭐</span> {totalStars} / {maxStars}
            </span>
          </div>

          {CHAPTER_ORDER.map(ch => {
            const stars   = getStars(ch)
            const sessions = progress.find(p => p.chapter === ch)?.total_sessions ?? 0
            return (
              <div key={ch} style={{
                display: 'flex', alignItems: 'center',
                background: 'var(--cream)',
                border: '3px solid var(--outline)',
                borderRadius: 16, padding: '10px 14px',
                gap: 10,
                boxShadow: '0 3px 0 rgba(61,37,22,.08)',
              }}>
                <span style={{ fontSize: 20 }}>{CHAPTER_EMOJIS[ch]}</span>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontFamily: 'var(--font-display)', fontWeight: 800,
                    fontSize: 15, color: 'var(--ink)',
                  }}>{CHAPTER_NAMES[ch]}</div>
                  {sessions > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 1 }}>
                      {sessions} session{sessions !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 3 }}>
                  {[1,2,3].map(i => (
                    <span key={i} style={{
                      fontSize: 20,
                      opacity: i <= stars ? 1 : 0.2,
                      filter: i <= stars ? 'none' : 'grayscale(1)',
                    }}>⭐</span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}