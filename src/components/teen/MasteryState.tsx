'use client'

import { useEffect, useRef } from 'react'
import { BAND_FRAMING, type AgeBand } from '@/components/teen/types'
import { speak } from '@/lib/useMiloSpeaker'

export interface MasteryStateProps {
  band: AgeBand
  /** Ledger items shown in the 17-18 variant; their count drives the headline. */
  conceptsConfirmed?: string[]
  /** "Where this goes next" pointer — surfaced in the 17-18 variant. */
  nextPointer?: string
  onPlayAgain?: () => void
  onExit?: () => void
}

/**
 * De-confettied chapter-complete state. Calm, earned, no cheer.
 * Three variants by band:
 *   12-14 → a quiet "SOLVED" stamp.
 *   15-16 → "Commission shipped" — a studio dispatch note.
 *   17-18 → "Module complete — N concepts confirmed" ledger + a nextPointer.
 *
 * Theme (accent/ink/paper) is read from the ancestor `data-band` scope; we set
 * no colors literally. Motion is a single short settle, suppressed under
 * prefers-reduced-motion. No bounce, no confetti, no sparkle.
 */
export default function MasteryState({
  band,
  conceptsConfirmed,
  nextPointer,
  onPlayAgain,
  onExit,
}: MasteryStateProps) {
  // The de-confetti rule: one calm spoken acknowledgement on mount, nothing
  // looping. `speak` (single line) is correct here — there's no multi-line
  // narration to chain, so speakSteps/speakSeq aren't needed.
  const announcedRef = useRef(false)
  useEffect(() => {
    if (announcedRef.current) return
    announcedRef.current = true
    speak(headlineSpeechFor(band, conceptsConfirmed))
  }, [band, conceptsConfirmed])

  const persona = BAND_FRAMING[band].persona

  return (
    <section
      data-band-context={band}
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: '1.5rem',
        maxWidth: '34rem',
        margin: '0 auto',
        padding: '2.5rem 1.5rem',
        fontFamily: 'var(--font-body)',
        color: 'var(--ink)',
      }}
    >
      <CalmSettle>
        {band === '12-14' && <SolvedStamp />}
        {band === '15-16' && <CommissionShipped persona={persona} />}
        {band === '17-18' && (
          <ModuleLedger conceptsConfirmed={conceptsConfirmed ?? []} nextPointer={nextPointer} />
        )}
      </CalmSettle>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '0.75rem',
          marginTop: '0.5rem',
        }}
      >
        {onPlayAgain && (
          <button type="button" onClick={onPlayAgain} style={btnStyle(false)}>
            {playAgainLabelFor(band)}
          </button>
        )}
        {onExit && (
          <button type="button" onClick={onExit} style={btnStyle(true)}>
            {exitLabelFor(band)}
          </button>
        )}
      </div>
    </section>
  )
}

/* ---------------------------------------------------------------- variants */

/** 12-14: a quiet rubber-stamp. The mark is a check, never a trophy/sparkle. */
function SolvedStamp() {
  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.9rem',
      }}
    >
      <span
        aria-hidden
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0.55em 1.4em',
          border: '2px solid var(--garden-green)',
          borderRadius: '0.5rem',
          color: 'var(--garden-green)',
          fontFamily: 'var(--font-numeric)',
          fontWeight: 700,
          fontSize: '1.5rem',
          letterSpacing: '0.22em',
          textIndent: '0.22em',
          // a stamp sits slightly askew, but stays still — no animation
          transform: 'rotate(-3deg)',
        }}
      >
        SOLVED
      </span>
      <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: '0.95rem' }}>
        That one&rsquo;s yours. Nice work.
      </p>
    </div>
  )
}

/** 15-16: a studio dispatch note — the commission left the building. */
function CommissionShipped({ persona }: { persona: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.8rem' }}>
      <span
        style={{
          fontFamily: 'var(--font-numeric)',
          fontSize: '0.75rem',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--ink-muted)',
        }}
      >
        Studio dispatch
      </span>
      <h2
        style={{
          margin: 0,
          fontFamily: 'var(--font-body)',
          fontWeight: 600,
          fontSize: '1.6rem',
          color: 'var(--ink)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5em',
        }}
      >
        <span aria-hidden style={{ color: 'var(--garden-green)' }}>
          {'✓'}
        </span>
        Commission shipped
      </h2>
      <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: '0.95rem', maxWidth: '26rem' }}>
        Signed off and out the door, {persona}. Clean spec, met.
      </p>
    </div>
  )
}

/** 17-18: a research ledger — N concepts confirmed, with a forward pointer. */
function ModuleLedger({
  conceptsConfirmed,
  nextPointer,
}: {
  conceptsConfirmed: string[]
  nextPointer?: string
}) {
  const n = conceptsConfirmed.length
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        width: '100%',
        textAlign: 'left',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', textAlign: 'center' }}>
        <h2
          style={{
            margin: 0,
            fontFamily: 'var(--font-body)',
            fontWeight: 600,
            fontSize: '1.45rem',
            color: 'var(--ink)',
          }}
        >
          Module complete
        </h2>
        <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: '0.95rem' }}>
          <span style={{ fontFamily: 'var(--font-numeric)', color: 'var(--accent)', fontWeight: 600 }}>
            {n}
          </span>{' '}
          {n === 1 ? 'concept' : 'concepts'} confirmed
        </p>
      </div>

      {n > 0 && (
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            border: '1px solid var(--outline)',
            borderRadius: '0.6rem',
            background: 'var(--bg-1)',
            overflow: 'hidden',
          }}
        >
          {conceptsConfirmed.map((concept, i) => (
            <li
              key={`${i}-${concept}`}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '0.7rem',
                padding: '0.6rem 0.9rem',
                borderTop: i === 0 ? 'none' : '1px solid var(--outline)',
              }}
            >
              <span
                aria-hidden
                style={{
                  fontFamily: 'var(--font-numeric)',
                  fontSize: '0.8rem',
                  color: 'var(--ink-muted)',
                  minWidth: '1.6em',
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <span style={{ flex: 1, color: 'var(--ink)', fontSize: '0.95rem' }}>{concept}</span>
              <span aria-hidden style={{ color: 'var(--garden-green)', fontSize: '0.85rem' }}>
                {'✓'}
              </span>
            </li>
          ))}
        </ul>
      )}

      {nextPointer && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
            paddingTop: '0.25rem',
            borderTop: '1px solid var(--outline)',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-numeric)',
              fontSize: '0.7rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--ink-muted)',
            }}
          >
            Where this goes next
          </span>
          <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: '0.95rem' }}>{nextPointer}</p>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ motion */

/**
 * A single, calm settle on mount (fade + tiny rise). No looping, no bounce.
 * Suppressed entirely under prefers-reduced-motion via the media query.
 */
function CalmSettle({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{calmCss}</style>
      <div className="teen-mastery-settle" style={{ width: '100%' }}>
        {children}
      </div>
    </>
  )
}

const calmCss = `
@keyframes teenMasterySettle {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.teen-mastery-settle {
  animation: teenMasterySettle 260ms var(--ease-smooth) both;
}
@media (prefers-reduced-motion: reduce) {
  .teen-mastery-settle { animation: none; }
}
`

/* ------------------------------------------------------------------ styles */

function btnStyle(primary: boolean): React.CSSProperties {
  return {
    appearance: 'none',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    fontSize: '0.95rem',
    fontWeight: 500,
    padding: '0.6em 1.4em',
    borderRadius: '0.55rem',
    border: '1px solid var(--outline)',
    background: primary ? 'var(--bg-1)' : 'var(--accent)',
    color: primary ? 'var(--ink-soft)' : 'var(--paper)',
    transition:
      'background 200ms var(--ease-smooth), color 200ms var(--ease-smooth), border-color 200ms var(--ease-smooth)',
  }
}

/* ---------------------------------------------------------------- copy banks */

function playAgainLabelFor(band: AgeBand): string {
  switch (band) {
    case '12-14':
      return 'Try again'
    case '15-16':
      return 'New commission'
    case '17-18':
      return 'Run it again'
  }
}

function exitLabelFor(band: AgeBand): string {
  switch (band) {
    case '12-14':
      return 'Done'
    case '15-16':
      return 'Back to studio'
    case '17-18':
      return 'Back to modules'
  }
}

function headlineSpeechFor(band: AgeBand, conceptsConfirmed?: string[]): string {
  switch (band) {
    case '12-14':
      return 'Solved. Nice work.'
    case '15-16':
      return 'Commission shipped.'
    case '17-18': {
      const n = conceptsConfirmed?.length ?? 0
      return `Module complete. ${n} ${n === 1 ? 'concept' : 'concepts'} confirmed.`
    }
  }
}
