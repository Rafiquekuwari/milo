'use client'

import React from 'react'
import { type AgeBand, BAND_FRAMING } from '@/components/teen/types'

export interface CaseCardProps {
  band: AgeBand
  /** e.g. "Investigation 03" — defaults to BAND_FRAMING[band].unit */
  kicker?: string
  /** the real-world hook title ("The Better Buy") */
  title: string
  /** one line: why this matters */
  why: string
  /** the question the chapter answers */
  question: string
  /** optional small diagram/graph */
  visual?: React.ReactNode
  onStart: () => void
  /** default "Start" */
  startLabel?: string
}

/**
 * CaseCard — the applied-hook opener for a teen chapter.
 * Renders the band-appropriate brief (Investigation / Commission / Module),
 * the why-it-matters line, the driving question, an optional visual slot,
 * and a calm Start button. Theme comes from an ancestor `data-band` scope —
 * this component only reads CSS variables.
 */
export default function CaseCard({
  band,
  kicker,
  title,
  why,
  question,
  visual,
  onStart,
  startLabel = 'Start',
}: CaseCardProps) {
  const kickerText = kicker ?? BAND_FRAMING[band].unit

  return (
    <section
      className="teen-case-card"
      style={{
        boxSizing: 'border-box',
        width: '100%',
        maxWidth: 640,
        margin: '0 auto',
        padding: '32px 28px',
        background: 'var(--paper)',
        border: '1px solid var(--outline)',
        borderRadius: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        fontFamily: 'var(--font-body)',
        color: 'var(--ink)',
      }}
    >
      <header style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span
          style={{
            fontFamily: 'var(--font-numeric)',
            fontSize: 13,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--accent)',
          }}
        >
          {kickerText}
        </span>
        <h1
          style={{
            margin: 0,
            fontSize: 26,
            lineHeight: 1.2,
            fontWeight: 600,
            color: 'var(--ink)',
          }}
        >
          {title}
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: 15,
            lineHeight: 1.5,
            color: 'var(--ink-soft)',
          }}
        >
          {why}
        </p>
      </header>

      {visual != null && (
        <div
          style={{
            background: 'var(--bg-1)',
            border: '1px solid var(--outline)',
            borderRadius: 10,
            padding: 16,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          {visual}
        </div>
      )}

      <div
        style={{
          borderLeft: '2px solid var(--accent)',
          paddingLeft: 14,
        }}
      >
        <span
          style={{
            display: 'block',
            fontFamily: 'var(--font-numeric)',
            fontSize: 11,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--ink-muted)',
            marginBottom: 6,
          }}
        >
          The question
        </span>
        <p
          style={{
            margin: 0,
            fontSize: 17,
            lineHeight: 1.45,
            color: 'var(--ink)',
          }}
        >
          {question}
        </p>
      </div>

      <div style={{ display: 'flex' }}>
        <button
          type="button"
          onClick={onStart}
          style={{
            appearance: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--paper)',
            background: 'var(--accent)',
            border: '1px solid var(--accent)',
            borderRadius: 10,
            padding: '11px 26px',
            transition: 'transform 200ms var(--ease-smooth), opacity 200ms var(--ease-smooth)',
          }}
        >
          {startLabel}
        </button>
      </div>

      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .teen-case-card button:hover { transform: translateY(-1px); }
          .teen-case-card button:active { transform: translateY(0); opacity: 0.92; }
        }
      `}</style>
    </section>
  )
}
