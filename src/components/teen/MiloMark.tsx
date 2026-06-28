'use client'

import React from 'react'
import type { AgeBand, MiloMood } from '@/components/teen/types'

/**
 * MiloMark — the aging-up monogram for the teen "Field Lab" kit.
 *
 * Pure CSS/SVG, no PNG. Reads theme from an ancestor `data-band` attribute
 * (`var(--accent)` / `var(--ink)`); it never sets `data-band` itself.
 *
 *  - 12-14 → a friendly rounded-square "M" tile.
 *  - 15-16 → an "M." avatar (rounded plate, period dot).
 *  - 17-18 → a restrained "M·" mark; when `mood` is thinking/speaking it gains a
 *    subtle waveform (speaking) or blinking cursor (thinking).
 *
 * Motion stays calm (150–300ms) and honours `prefers-reduced-motion`.
 */
export interface MiloMarkProps {
  band: AgeBand
  mood?: MiloMood
  /** px, default 40 */
  size?: number
}

// Stable id suffix so multiple marks on a page don't collide on <defs> ids.
let __miloMarkSeq = 0

export default function MiloMark({ band, mood = 'idle', size = 40 }: MiloMarkProps) {
  const uid = React.useMemo(() => `mm${(__miloMarkSeq += 1)}`, [])

  // Shared inline-block frame so the mark sits on a text baseline cleanly.
  const wrapStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: size,
    height: size,
    flex: '0 0 auto',
    lineHeight: 0,
  }

  const label =
    mood === 'thinking'
      ? 'Milo, thinking'
      : mood === 'speaking'
        ? 'Milo, speaking'
        : 'Milo'

  // ---- 12-14: rounded-square "M" tile -------------------------------------
  if (band === '12-14') {
    return (
      <span style={wrapStyle} role="img" aria-label={label}>
        <svg
          viewBox="0 0 48 48"
          width={size}
          height={size}
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <rect
            x="3"
            y="3"
            width="42"
            height="42"
            rx="12"
            fill="var(--accent)"
          />
          <text
            x="24"
            y="25"
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="var(--font-numeric)"
            fontWeight="700"
            fontSize="24"
            fill="var(--paper)"
          >
            M
          </text>
        </svg>
      </span>
    )
  }

  // ---- 15-16: "M." avatar plate -------------------------------------------
  if (band === '15-16') {
    return (
      <span style={wrapStyle} role="img" aria-label={label}>
        <svg
          viewBox="0 0 48 48"
          width={size}
          height={size}
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <rect
            x="2.5"
            y="2.5"
            width="43"
            height="43"
            rx="21.5"
            fill="var(--bg-2)"
            stroke="var(--outline)"
            strokeWidth="1"
          />
          <text
            x="21"
            y="25"
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="var(--font-numeric)"
            fontWeight="600"
            fontSize="22"
            fill="var(--ink)"
          >
            M
          </text>
          <circle cx="34" cy="32" r="2.6" fill="var(--accent)" />
        </svg>
      </span>
    )
  }

  // ---- 17-18: "M·" mark (+ optional waveform / cursor) --------------------
  return (
    <span style={wrapStyle} role="img" aria-label={label}>
      <svg
        viewBox="0 0 64 48"
        width={(size * 64) / 48}
        height={size}
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <style>{`
          @keyframes ${uid}-wave {
            0%, 100% { transform: scaleY(0.35); }
            50%      { transform: scaleY(1); }
          }
          @keyframes ${uid}-blink {
            0%, 45%  { opacity: 1; }
            55%, 100% { opacity: 0.15; }
          }
          .${uid}-bar {
            transform-box: fill-box;
            transform-origin: center;
            animation: ${uid}-wave 900ms var(--ease-smooth) infinite;
          }
          .${uid}-cursor {
            animation: ${uid}-blink 1100ms steps(1, end) infinite;
          }
          @media (prefers-reduced-motion: reduce) {
            .${uid}-bar { animation: none; transform: scaleY(0.7); }
            .${uid}-cursor { animation: none; opacity: 0.6; }
          }
        `}</style>

        {/* The "M·" mark */}
        <text
          x="2"
          y="25"
          textAnchor="start"
          dominantBaseline="central"
          fontFamily="var(--font-numeric)"
          fontWeight="500"
          fontSize="26"
          fill="var(--ink)"
        >
          M
        </text>
        <circle cx="30" cy="24" r="2.4" fill="var(--accent)" />

        {/* speaking → waveform; thinking → blinking cursor */}
        {mood === 'speaking' && (
          <g>
            {[0, 1, 2, 3].map((i) => (
              <rect
                key={i}
                className={`${uid}-bar`}
                x={40 + i * 6}
                y="16"
                width="3"
                height="16"
                rx="1.5"
                fill="var(--accent)"
                style={{ animationDelay: `${i * 120}ms` }}
              />
            ))}
          </g>
        )}
        {mood === 'thinking' && (
          <rect
            className={`${uid}-cursor`}
            x="40"
            y="14"
            width="3"
            height="20"
            rx="1.5"
            fill="var(--ink-muted)"
          />
        )}
      </svg>
    </span>
  )
}
