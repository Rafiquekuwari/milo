'use client'

import type { AgeBand, AnswerStatus } from '@/components/teen/types'

export interface StepSelectProps {
  band: AgeBand
  shown: { text: string; reason?: string }[] // steps already locked in
  options: { text: string; reason?: string }[] // candidates for the NEXT step
  status?: AnswerStatus
  onPick: (index: number) => void
}

/**
 * "Pick the next correct step / statement + reason" — the calm replacement for every
 * drag-to-build surface (equation solving + two-column proofs).
 *
 * `shown[]` are the steps already locked into the worked solution; they read as a
 * quiet, numbered ledger. `options[]` are the candidates for the NEXT line — the
 * learner taps one and the parent grades via `onPick(index)`.
 *
 * Math-without-fear feedback (status applies to the picked option):
 *  - correct → the option settles into the ledger style with a garden-green edge.
 *  - wrong   → neutral dim + a gentle amber underline on the reason. NEVER red / X / "fail".
 *
 * Theme (accent / ink / paper / outline / status colours) comes from the ancestor
 * `data-band` scope — this component only reads CSS variables, never sets `data-band`.
 *
 * The learner's pick is tracked by the parent through `status`; once `status` leaves
 * 'idle' the option row is considered graded and the grid locks.
 */
export default function StepSelect({
  band,
  shown,
  options,
  status = 'idle',
  onPick,
}: StepSelectProps) {
  const graded = status !== 'idle'

  return (
    <div
      data-band-context={band}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        width: '100%',
        fontFamily: 'var(--font-body)',
        color: 'var(--ink)',
      }}
    >
      {/* Locked-in steps so far — a quiet numbered ledger. */}
      {shown.length > 0 && (
        <ol
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          {shown.map((s, i) => (
            <li
              key={`shown-${i}`}
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr',
                alignItems: 'baseline',
                gap: '0.75rem',
                padding: '0.6rem 0.85rem',
                border: '1px solid var(--outline)',
                borderRadius: '0.5rem',
                background: 'var(--bg-1)',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  fontFamily: 'var(--font-numeric)',
                  fontVariantNumeric: 'tabular-nums',
                  fontSize: '0.8125rem',
                  color: 'var(--ink-muted)',
                  minWidth: '1.5ch',
                  textAlign: 'right',
                }}
              >
                {i + 1}
              </span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-numeric)',
                    fontVariantNumeric: 'tabular-nums',
                    fontSize: '1rem',
                    color: 'var(--ink)',
                    lineHeight: 1.3,
                  }}
                >
                  {s.text}
                </span>
                {s.reason && (
                  <span
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.8125rem',
                      color: 'var(--ink-muted)',
                      lineHeight: 1.35,
                    }}
                  >
                    {s.reason}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ol>
      )}

      {/* Candidates for the next step. */}
      <div
        role="radiogroup"
        aria-label="Pick the next step"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.75rem',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--ink-muted)',
          }}
        >
          Next step
        </span>

        {options.map((opt, i) => {
          // Per-option state. We only know the picked option once it's graded;
          // the parent owns which index was chosen, so on a graded status we treat
          // every visible option uniformly except for the status colouring, which
          // the parent narrows by re-rendering with only the relevant feedback.
          const isCorrect = graded && status === 'correct'
          const isWrong = graded && status === 'wrong'

          const borderColor = isCorrect
            ? 'var(--garden-green)'
            : isWrong
              ? 'var(--note-amber)'
              : 'var(--outline)'

          const textColor = isCorrect
            ? 'var(--garden-green)'
            : isWrong
              ? 'var(--ink-soft)' // neutral dim — not red
              : 'var(--ink)'

          const background = isCorrect ? 'var(--bg-1)' : 'var(--paper)'

          return (
            <button
              key={`opt-${i}`}
              type="button"
              role="radio"
              aria-checked={false}
              disabled={graded}
              onClick={() => {
                if (!graded) onPick(i)
              }}
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr',
                alignItems: 'baseline',
                gap: '0.75rem',
                width: '100%',
                textAlign: 'left',
                padding: '0.75rem 0.95rem',
                border: `1px solid ${borderColor}`,
                borderRadius: '0.625rem',
                background,
                color: textColor,
                cursor: graded ? 'default' : 'pointer',
                opacity: graded ? 0.92 : 1,
                outline: 'none',
                userSelect: 'none',
                transition:
                  'border-color 200ms var(--ease-smooth), color 200ms var(--ease-smooth), background-color 200ms var(--ease-smooth), opacity 200ms var(--ease-smooth)',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  fontFamily: 'var(--font-numeric)',
                  fontVariantNumeric: 'tabular-nums',
                  fontSize: '0.8125rem',
                  color: 'var(--ink-muted)',
                  minWidth: '1.5ch',
                  textAlign: 'right',
                }}
              >
                {String.fromCharCode(65 + i)}
              </span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-numeric)',
                    fontVariantNumeric: 'tabular-nums',
                    fontSize: '1rem',
                    fontWeight: isCorrect ? 600 : 500,
                    lineHeight: 1.3,
                  }}
                >
                  {opt.text}
                </span>
                {opt.reason && (
                  <span
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.8125rem',
                      color: isWrong ? 'var(--ink-soft)' : 'var(--ink-muted)',
                      lineHeight: 1.35,
                      // Amber underline for the wrong pick's reason — a gentle
                      // reframe, not a strike-through.
                      textDecoration: isWrong ? 'underline' : 'none',
                      textDecorationColor: isWrong ? 'var(--note-amber)' : undefined,
                      textDecorationThickness: isWrong ? '2px' : undefined,
                      textUnderlineOffset: isWrong ? '0.24em' : undefined,
                    }}
                  >
                    {opt.reason}
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
