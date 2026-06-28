'use client'

import React from 'react'
import type { AgeBand } from '@/components/teen/types'

export interface TeenTopbarProps {
  band: AgeBand
  title: string
  roundIdx: number
  totalRounds: number
  onBack?: () => void
}

/**
 * Teen equivalent of GameTopbar: chapter title + a thin hairline progress rail.
 * No stars/coins. Numbers render in --font-numeric.
 * Theme comes from an ancestor data-band attribute — this component only reads vars.
 */
export default function TeenTopbar({
  band,
  title,
  roundIdx,
  totalRounds,
  onBack,
}: TeenTopbarProps) {
  const safeTotal = Math.max(1, totalRounds)
  // roundIdx is the zero-based current round; completed fraction = (idx+1)/total, clamped.
  const current = Math.min(Math.max(roundIdx + 1, 0), safeTotal)
  const pct = Math.round((current / safeTotal) * 100)

  return (
    <header
      data-teen-topbar={band}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        padding: '0.75rem 1rem 0.625rem',
        borderBottom: '1px solid var(--outline)',
        background: 'var(--bg-1)',
        color: 'var(--ink)',
        fontFamily: 'var(--font-body)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          minHeight: '1.75rem',
        }}
      >
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            style={{
              flexShrink: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.25rem 0.5rem',
              background: 'transparent',
              border: '1px solid var(--outline)',
              borderRadius: '0.5rem',
              color: 'var(--ink-soft)',
              font: 'inherit',
              fontSize: '0.8125rem',
              cursor: 'pointer',
              transition: 'color 200ms var(--ease-smooth), border-color 200ms var(--ease-smooth)',
            }}
          >
            <span aria-hidden="true" style={{ fontSize: '1em', lineHeight: 1 }}>
              ‹
            </span>
            Back
          </button>
        )}

        <h1
          style={{
            margin: 0,
            flex: 1,
            minWidth: 0,
            fontFamily: 'var(--font-body)',
            fontSize: '1rem',
            fontWeight: 600,
            lineHeight: 1.25,
            color: 'var(--ink)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </h1>

        <span
          aria-hidden="true"
          style={{
            flexShrink: 0,
            fontFamily: 'var(--font-numeric)',
            fontSize: '0.8125rem',
            color: 'var(--ink-muted)',
            letterSpacing: '0.02em',
          }}
        >
          {current} / {safeTotal}
        </span>
      </div>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={safeTotal}
        aria-valuenow={current}
        aria-label={`Round ${current} of ${safeTotal}`}
        style={{
          position: 'relative',
          height: '2px',
          width: '100%',
          borderRadius: '999px',
          background: 'var(--bg-2)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            insetInlineStart: 0,
            top: 0,
            bottom: 0,
            width: `${pct}%`,
            background: 'var(--accent)',
            borderRadius: '999px',
            transition: 'width 250ms var(--ease-smooth)',
          }}
        />
      </div>
    </header>
  )
}
