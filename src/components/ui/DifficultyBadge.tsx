import React from 'react'
import type { Difficulty } from '@/lib/adaptive'

export function DifficultyBadge({
  difficulty,
  isOnFire,
}: {
  difficulty: Difficulty
  isOnFire: boolean
}): React.ReactElement {
  const config = {
    1: { bg: 'var(--sky-blue-soft)',      border: 'var(--sky-blue-deep)',     label: 'Starter' },
    2: { bg: 'var(--sun-yellow-soft)',    border: 'var(--sun-yellow-deep)',   label: 'Getting there' },
    3: { bg: 'var(--garden-green-soft)', border: 'var(--garden-green-deep)', label: 'Champion' },
  }[difficulty]

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: config.bg, border: `2px solid ${config.border}`,
      borderRadius: 'var(--r-pill)', padding: '4px 12px',
      fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14,
      color: 'var(--ink)', boxShadow: '0 2px 0 rgba(61,37,22,.10)',
    }}>
      <span>{isOnFire ? '🔥' : difficulty === 3 ? '⭐⭐⭐' : difficulty === 2 ? '⭐⭐' : '⭐'}</span>
      <span>{config.label}</span>
    </div>
  )
}
