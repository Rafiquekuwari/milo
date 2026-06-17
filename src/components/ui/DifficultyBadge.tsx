import React from 'react'
import type { Difficulty } from '@/lib/adaptive'

/**
 * "Math without fear": the adaptive difficulty is felt, never SHOWN. A visible
 * tier (Starter → Champion) reads as a demotion to a struggling kid the moment it
 * drops, so we keep the level invisible. The only thing we surface is a positive,
 * celebratory streak chip — it can reward, but it can never punish. `difficulty`
 * is accepted for call-site compatibility but intentionally not displayed.
 */
export function DifficultyBadge({
  isOnFire,
}: {
  difficulty: Difficulty
  isOnFire: boolean
}): React.ReactElement | null {
  if (!isOnFire) return null
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: 'var(--sun-yellow-soft)', border: '2px solid var(--sun-yellow-deep)',
      borderRadius: 'var(--r-pill)', padding: '4px 12px',
      fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14,
      color: 'var(--ink)', boxShadow: '0 2px 0 rgba(61,37,22,.10)',
    }}>
      <span>🔥</span><span>On a roll!</span>
    </div>
  )
}
