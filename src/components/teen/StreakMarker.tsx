'use client'

import type { AgeBand } from '@/components/teen/types'

export interface StreakMarkerProps {
  band: AgeBand
  count: number
}

/**
 * Positive-only momentum chip — "Streak ×N" in mono. No flame, no fire, no
 * red, no fail. Renders nothing until there's an actual streak (count >= 2).
 * Theme (accent/ink) comes from the ancestor `data-band` scope; we only read vars.
 */
export default function StreakMarker({ band, count }: StreakMarkerProps) {
  // Below 2 there is no streak to celebrate — stay silent rather than nag.
  if (count < 2) return null

  return (
    <span
      data-band-context={band}
      role="status"
      aria-label={`Streak of ${count}`}
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: '0.35em',
        padding: '0.25em 0.7em',
        border: '1px solid var(--outline)',
        borderRadius: '999px',
        background: 'var(--bg-1)',
        color: 'var(--ink-soft)',
        lineHeight: 1,
        whiteSpace: 'nowrap',
        userSelect: 'none',
        fontFamily: 'var(--font-body)',
        fontSize: '0.8125rem',
        transition: 'color 200ms var(--ease-smooth), border-color 200ms var(--ease-smooth)',
      }}
    >
      <span style={{ fontFamily: 'var(--font-body)', letterSpacing: '0.02em' }}>Streak</span>
      <span
        style={{
          fontFamily: 'var(--font-numeric)',
          fontWeight: 600,
          color: 'var(--accent)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        ×{count}
      </span>
    </span>
  )
}
