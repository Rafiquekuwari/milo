'use client'

import { useId, useMemo, useState } from 'react'
import type { AgeBand, AnswerStatus } from '@/components/teen/types'

/**
 * Tolerance-aware numeric equality for grading clean decimals.
 * The parent owns correctness; this helper is the shared comparator.
 */
export function numericEqual(a: number, b: number, tol = 1e-9): boolean {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false
  return Math.abs(a - b) <= tol
}

export interface NumericEntryProps {
  band: AgeBand
  onSubmit: (value: number, raw: string) => void
  status?: AnswerStatus
  placeholder?: string
  suffix?: string
  /** default true */
  allowNegative?: boolean
  /** default true */
  allowDecimal?: boolean
}

/** Strip characters that aren't part of a valid number, honoring the allow* flags. */
function sanitize(raw: string, allowNegative: boolean, allowDecimal: boolean): string {
  let out = ''
  let seenDot = false
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]
    if (ch >= '0' && ch <= '9') {
      out += ch
    } else if (ch === '-' && allowNegative && out.length === 0) {
      // leading minus only
      out += ch
    } else if (ch === '.' && allowDecimal && !seenDot) {
      seenDot = true
      out += ch
    }
  }
  return out
}

export default function NumericEntry({
  band,
  onSubmit,
  status = 'idle',
  placeholder,
  suffix,
  allowNegative = true,
  allowDecimal = true,
}: NumericEntryProps) {
  const [raw, setRaw] = useState('')
  const inputId = useId()

  const parsed = useMemo(() => {
    if (raw === '' || raw === '-' || raw === '.' || raw === '-.') return NaN
    return Number(raw)
  }, [raw])

  const canSubmit = Number.isFinite(parsed)
  const isCorrect = status === 'correct'
  const isWrong = status === 'wrong'

  const submit = () => {
    if (!canSubmit) return
    onSubmit(parsed, raw)
  }

  // hairline accent reflects state: teal idle, garden-green correct, amber wrong (never red)
  const accentVar = isCorrect
    ? 'var(--garden-green)'
    : isWrong
      ? 'var(--note-amber)'
      : 'var(--accent)'

  const reframe = band === '12-14' ? 'Not yet — try the value again.' : 'Off by a bit — adjust and resubmit.'

  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        gap: 8,
        fontFamily: 'var(--font-body)',
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'stretch',
          gap: 8,
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 14px',
            background: 'var(--paper)',
            border: '1px solid var(--outline)',
            borderRadius: 10,
            borderBottom: `2px solid ${accentVar}`,
            transition: 'border-color 200ms var(--ease-smooth)',
          }}
        >
          <input
            id={inputId}
            type="text"
            inputMode={allowDecimal ? 'decimal' : 'numeric'}
            autoComplete="off"
            spellCheck={false}
            value={raw}
            placeholder={placeholder ?? '0'}
            aria-invalid={isWrong || undefined}
            aria-describedby={isWrong ? `${inputId}-note` : undefined}
            onChange={(e) => setRaw(sanitize(e.target.value, allowNegative, allowDecimal))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                submit()
              }
            }}
            style={{
              width: 96,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: isCorrect ? 'var(--garden-green)' : 'var(--ink)',
              fontFamily: 'var(--font-numeric)',
              fontSize: 18,
              letterSpacing: '0.01em',
              textAlign: 'right',
              padding: 0,
            }}
          />
          {suffix ? (
            <span
              aria-hidden="true"
              style={{
                fontFamily: 'var(--font-numeric)',
                fontSize: 16,
                color: 'var(--ink-muted)',
              }}
            >
              {suffix}
            </span>
          ) : null}
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          style={{
            padding: '10px 16px',
            border: '1px solid var(--outline)',
            borderRadius: 10,
            background: canSubmit ? 'var(--accent)' : 'var(--bg-2)',
            color: canSubmit ? 'var(--paper)' : 'var(--ink-muted)',
            fontFamily: 'var(--font-body)',
            fontSize: 15,
            cursor: canSubmit ? 'pointer' : 'default',
            transition: 'background 200ms var(--ease-smooth), color 200ms var(--ease-smooth)',
          }}
        >
          Check
        </button>
      </div>

      {isWrong ? (
        <span
          id={`${inputId}-note`}
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            color: 'var(--note-amber)',
          }}
        >
          {reframe}
        </span>
      ) : null}
    </div>
  )
}
