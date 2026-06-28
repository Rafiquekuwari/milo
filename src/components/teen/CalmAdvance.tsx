'use client'

// CalmAdvance — the teen "Field Lab" replacement for the kids' AdvancePopup.
// A quiet fixed/portal panel with two neutral controls (Replay step / Continue)
// and an optional note line. No cheer emoji, no bounce, no confetti — wrong is
// never marked; advancing is just a calm, deliberate step forward.
//
// Also exports teenMicrocopy(band): warm, no-judgement copy banks (the teen
// replacement for the kids' cheerFor() one-liner).

import { createPortal } from 'react-dom'
import type { AgeBand } from '@/components/teen/types'

export interface CalmAdvanceProps {
  band: AgeBand
  onRetry: () => void
  onContinue: () => void
  note?: string
  labels?: { retry?: string; next?: string } // defaults: "Replay step" / "Continue"
}

// ─── Per-band, no-judgement copy banks (the teen cheerFor) ───────────────
// encouragement: shown on a confirmed-correct beat (calm, peer-level, never a cheer).
// reframe:       shown on a wrong pick — warm + neutral, never "wrong/fail".
// mastery:       shown at chapter/module completion.
const MICROCOPY: Record<AgeBand, { encouragement: string[]; reframe: string[]; mastery: string[] }> = {
  '12-14': {
    encouragement: [
      'That holds up.',
      'Solid reasoning.',
      'That checks out.',
      'Good call — the logic works.',
      'Nice — that lines up.',
    ],
    reframe: [
      'Not quite — let’s trace it again.',
      'Close. Take another look at that step.',
      'Worth a second pass — the idea’s nearly there.',
      'Let’s replay it and see where it shifts.',
    ],
    mastery: [
      'Investigation closed.',
      'You worked that all the way through.',
      'Case solved — clean reasoning.',
    ],
  },
  '15-16': {
    encouragement: [
      'Confirmed.',
      'That’s a defensible answer.',
      'Checks out against the brief.',
      'Good — the method’s sound.',
      'That’s the right read.',
    ],
    reframe: [
      'Let’s revisit that step.',
      'The approach is close — re-check the detail.',
      'One value to reconsider; the structure’s fine.',
      'Replay it — the logic just needs a tweak.',
    ],
    mastery: [
      'Commission shipped.',
      'Spec met — nice work.',
      'Delivered, and it holds up.',
    ],
  },
  '17-18': {
    encouragement: [
      'Verified.',
      'Consistent with the model.',
      'That argument is valid.',
      'Holds under the constraints.',
      'Rigorous — that follows.',
    ],
    reframe: [
      'Re-examine that inference.',
      'The framework’s right; one term to revisit.',
      'Replay the step — the derivation drifts there.',
      'Almost — recheck the assumption you used.',
    ],
    mastery: [
      'Module complete.',
      'Concept confirmed.',
      'Result established — well argued.',
    ],
  },
}

/** Warm, no-judgement copy banks per band — the teen replacement for cheerFor. */
export function teenMicrocopy(band: AgeBand): { encouragement: string[]; reframe: string[]; mastery: string[] } {
  const m = MICROCOPY[band]
  // Return shallow copies so callers can't mutate the shared banks.
  return {
    encouragement: [...m.encouragement],
    reframe: [...m.reframe],
    mastery: [...m.mastery],
  }
}

export default function CalmAdvance({
  band,
  onRetry,
  onContinue,
  note,
  labels,
}: CalmAdvanceProps) {
  if (typeof document === 'undefined') return null

  const retryLabel = labels?.retry ?? 'Replay step'
  const nextLabel = labels?.next ?? 'Continue'

  return createPortal(
    <div
      data-band={band}
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000, // must sit ABOVE a chapter's full-screen portal (z 900), or Continue is hidden
        background: 'var(--bg-page)',
        // a soft scrim that doesn't read as an alarm
        backgroundColor: 'color-mix(in srgb, var(--ink) 28%, transparent)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 20px',
        animation: 'teen_calm_fade 200ms var(--ease-smooth)',
      }}
    >
      <style>{CALM_CSS}</style>
      <div
        style={{
          background: 'var(--paper)',
          border: '1px solid var(--outline)',
          borderRadius: 14,
          padding: '22px 24px 20px',
          maxWidth: 380,
          width: '100%',
          boxShadow: '0 6px 28px color-mix(in srgb, var(--ink) 14%, transparent)',
          animation: 'teen_calm_rise 220ms var(--ease-smooth)',
        }}
      >
        {note && (
          <p
            style={{
              margin: '0 0 18px',
              fontFamily: 'var(--font-body)',
              fontSize: 15,
              lineHeight: 1.5,
              color: 'var(--ink-soft)',
            }}
          >
            {note}
          </p>
        )}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', alignItems: 'center' }}>
          <button
            type="button"
            onClick={onRetry}
            style={{
              padding: '10px 18px',
              borderRadius: 10,
              background: 'var(--paper)',
              border: '1px solid var(--outline)',
              color: 'var(--ink-soft)',
              fontFamily: 'var(--font-body)',
              fontWeight: 600,
              fontSize: 15,
              cursor: 'pointer',
              transition: 'color 150ms var(--ease-smooth), border-color 150ms var(--ease-smooth), background 150ms var(--ease-smooth)',
            }}
          >
            {retryLabel}
          </button>
          <button
            type="button"
            onClick={onContinue}
            style={{
              padding: '10px 20px',
              borderRadius: 10,
              background: 'var(--accent)',
              border: '1px solid var(--accent)',
              color: 'var(--paper)',
              fontFamily: 'var(--font-body)',
              fontWeight: 700,
              fontSize: 15,
              cursor: 'pointer',
              transition: 'opacity 150ms var(--ease-smooth)',
            }}
          >
            {nextLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

const CALM_CSS = `
@keyframes teen_calm_fade { from { opacity: 0 } to { opacity: 1 } }
@keyframes teen_calm_rise { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: translateY(0) } }
@media (prefers-reduced-motion: reduce) {
  [data-band] [role="dialog"], .teen-calm-panel { animation: none !important }
}
`
