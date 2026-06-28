'use client'

import type { AgeBand, AnswerStatus, Choice } from '@/components/teen/types'

export interface ChoiceGridProps {
  band: AgeBand
  choices: Choice[]
  selected?: string | number | null
  status?: AnswerStatus // applies to the selected choice
  correctValue?: string | number // revealed on a wrong pick (amber → then show correct green)
  onPick: (value: string | number) => void
  columns?: number // default auto (2)
  mono?: boolean // render labels in --font-numeric (default true for math)
}

/**
 * Teen MCQ tap targets.
 *
 * Math-without-fear feedback:
 *  - selected + correct → quiet garden-green reveal.
 *  - selected + wrong   → neutral dim + amber underline (never red / X / "fail").
 *    Once a wrong pick is locked in (`correctValue` provided), the actual answer
 *    is revealed in calm garden-green so the learner sees where it lands.
 *
 * Theme (accent / ink / paper / outline / status colours) comes from the ancestor
 * `data-band` scope — we only read CSS variables, never set `data-band`.
 */
export default function ChoiceGrid({
  band,
  choices,
  selected = null,
  status = 'idle',
  correctValue,
  onPick,
  columns = 2,
  mono = true,
}: ChoiceGridProps) {
  // The grid is locked once the selected choice has been graded.
  const graded = selected != null && status !== 'idle'
  const hasReveal = correctValue !== undefined

  return (
    <div
      data-band-context={band}
      role="radiogroup"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${Math.max(1, columns)}, minmax(0, 1fr))`,
        gap: '0.75rem',
        width: '100%',
      }}
    >
      {choices.map((choice) => {
        const isSelected = selected != null && choice.value === selected
        const isCorrectReveal =
          hasReveal && choice.value === correctValue && status === 'wrong'

        // Per-choice state: how this tile should read.
        let state: 'idle' | 'correct' | 'wrong' | 'reveal' = 'idle'
        if (isSelected && status === 'correct') state = 'correct'
        else if (isSelected && status === 'wrong') state = 'wrong'
        else if (isCorrectReveal) state = 'reveal'

        // After grading, the un-chosen, non-revealed tiles dim back quietly.
        const dimmed = graded && state === 'idle'

        const borderColor =
          state === 'correct' || state === 'reveal'
            ? 'var(--garden-green)'
            : state === 'wrong'
              ? 'var(--note-amber)'
              : 'var(--outline)'

        const labelColor =
          state === 'correct' || state === 'reveal'
            ? 'var(--garden-green)'
            : state === 'wrong'
              ? 'var(--ink-soft)' // neutral dim — not red
              : dimmed
                ? 'var(--ink-muted)'
                : 'var(--ink)'

        const background =
          state === 'correct' || state === 'reveal'
            ? 'var(--bg-1)'
            : 'var(--paper)'

        return (
          <button
            key={String(choice.value)}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={graded}
            onClick={() => {
              if (!graded) onPick(choice.value)
            }}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              minHeight: '3.25rem',
              padding: '0.85rem 1rem',
              border: `1px solid ${borderColor}`,
              borderRadius: '0.625rem',
              background,
              color: labelColor,
              cursor: graded ? 'default' : 'pointer',
              opacity: dimmed ? 0.55 : 1,
              fontFamily: mono ? 'var(--font-numeric)' : 'var(--font-body)',
              fontVariantNumeric: mono ? 'tabular-nums' : undefined,
              fontSize: '1.0625rem',
              fontWeight: state === 'correct' || state === 'reveal' ? 600 : 500,
              lineHeight: 1.2,
              // Amber "underline" for a wrong pick — a gentle reframe, not a strike.
              textDecoration: state === 'wrong' ? 'underline' : 'none',
              textDecorationColor:
                state === 'wrong' ? 'var(--note-amber)' : undefined,
              textDecorationThickness: state === 'wrong' ? '2px' : undefined,
              textUnderlineOffset: state === 'wrong' ? '0.28em' : undefined,
              outline: 'none',
              userSelect: 'none',
              transition:
                'border-color 200ms var(--ease-smooth), color 200ms var(--ease-smooth), background-color 200ms var(--ease-smooth), opacity 200ms var(--ease-smooth)',
            }}
          >
            {choice.label}
          </button>
        )
      })}
    </div>
  )
}
