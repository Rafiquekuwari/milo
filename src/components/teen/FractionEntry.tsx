'use client'

import { useId, useState } from 'react'
import type { AgeBand, AnswerStatus } from '@/components/teen/types'

export interface FractionValue {
  whole?: number
  num: number
  den: number
}

export interface FractionEntryProps {
  band: AgeBand
  allowWhole?: boolean
  onSubmit: (v: FractionValue) => void
  status?: AnswerStatus
}

/**
 * Equivalence-aware fraction grading (math-without-fear): a learner who writes
 * 6/4, 1½, or 3/2 has all expressed the same value, so all are accepted.
 *
 * Each FractionValue is collapsed to an improper rational (whole·den + num)/den,
 * sign-normalized, then cross-multiplied so we never lose precision to floats.
 */
export function fractionsEqual(a: FractionValue, b: FractionValue): boolean {
  const ra = toRational(a)
  const rb = toRational(b)
  if (ra === null || rb === null) return false
  // a.n/a.d === b.n/b.d  ⟺  a.n·b.d === b.n·a.d   (dens already > 0)
  return ra.n * rb.d === rb.n * ra.d
}

interface Rational { n: number; d: number }

function toRational(v: FractionValue): Rational | null {
  const whole = v.whole ?? 0
  const num = v.num
  const den = v.den
  if (!Number.isFinite(whole) || !Number.isFinite(num) || !Number.isFinite(den)) return null
  if (den === 0) return null

  // Fold the whole part in. A negative whole carries the sign for the whole value:
  //  -1½  →  -(1·2 + 1)/2 = -3/2.  A bare fraction keeps its own sign.
  const wholeSign = whole < 0 ? -1 : 1
  let n: number
  if (whole !== 0) {
    n = whole * den + wholeSign * Math.abs(num)
  } else {
    n = num
  }
  let d = den

  // Normalize the sign onto the numerator so cross-multiply comparisons are safe.
  if (d < 0) { n = -n; d = -d }
  return { n, d }
}

export default function FractionEntry({
  band,
  allowWhole = false,
  onSubmit,
  status = 'idle',
}: FractionEntryProps) {
  void band
  const [whole, setWhole] = useState('')
  const [num, setNum] = useState('')
  const [den, setDen] = useState('')
  const baseId = useId()

  const correct = status === 'correct'
  const wrong = status === 'wrong'

  // border reflects state — green on correct, amber on a gentle reframe, hairline otherwise.
  const fieldBorder = correct
    ? 'var(--garden-green)'
    : wrong
      ? 'var(--note-amber)'
      : 'var(--outline)'

  const numParsed = parseField(num)
  const denParsed = parseField(den)
  const wholeParsed = parseField(whole)
  const canSubmit =
    numParsed !== null &&
    denParsed !== null &&
    denParsed !== 0 &&
    (!allowWhole || whole.trim() === '' || wholeParsed !== null)

  const handleSubmit = () => {
    if (!canSubmit || numParsed === null || denParsed === null) return
    const v: FractionValue = { num: numParsed, den: denParsed }
    if (allowWhole && whole.trim() !== '' && wholeParsed !== null) v.whole = wholeParsed
    onSubmit(v)
  }

  const fieldStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    textAlign: 'center',
    fontFamily: 'var(--font-numeric)',
    fontSize: '1.25rem',
    color: 'var(--ink)',
    background: 'var(--paper)',
    border: `1px solid ${fieldBorder}`,
    borderRadius: 8,
    padding: '0.5rem 0.4rem',
    outline: 'none',
    transition: 'border-color 200ms var(--ease-smooth), background 200ms var(--ease-smooth)',
    appearance: 'textfield',
    MozAppearance: 'textfield',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '0.3rem',
    fontFamily: 'var(--font-body)',
    fontSize: '0.7rem',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    color: 'var(--ink-muted)',
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.9rem',
        fontFamily: 'var(--font-body)',
        color: 'var(--ink)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: '0.6rem',
        }}
      >
        {allowWhole && (
          <div style={{ flex: '0 0 auto', width: '4.5rem' }}>
            <label htmlFor={`${baseId}-whole`} style={labelStyle}>
              Whole
            </label>
            <input
              id={`${baseId}-whole`}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              aria-label="Whole number"
              value={whole}
              onChange={(e) => setWhole(sanitize(e.target.value, true))}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
              style={fieldStyle}
            />
          </div>
        )}

        {/* numerator over denominator — a true stacked fraction, mono throughout */}
        <div style={{ flex: '0 0 auto', width: '5.5rem' }}>
          <label htmlFor={`${baseId}-num`} style={labelStyle}>
            Numerator
          </label>
          <input
            id={`${baseId}-num`}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            aria-label="Numerator"
            value={num}
            onChange={(e) => setNum(sanitize(e.target.value, true))}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
            style={fieldStyle}
          />
          <div
            aria-hidden
            style={{
              height: 1,
              background: 'var(--ink-soft)',
              margin: '0.45rem 0',
            }}
          />
          <input
            id={`${baseId}-den`}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            aria-label="Denominator"
            value={den}
            onChange={(e) => setDen(sanitize(e.target.value, false))}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
            style={fieldStyle}
          />
          <label
            htmlFor={`${baseId}-den`}
            style={{ ...labelStyle, marginTop: '0.3rem', marginBottom: 0 }}
          >
            Denominator
          </label>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{
            flex: '0 0 auto',
            fontFamily: 'var(--font-body)',
            fontSize: '0.95rem',
            color: canSubmit ? 'var(--paper)' : 'var(--ink-muted)',
            background: canSubmit ? 'var(--accent)' : 'var(--bg-2)',
            border: `1px solid ${canSubmit ? 'var(--accent)' : 'var(--outline)'}`,
            borderRadius: 8,
            padding: '0.55rem 1.1rem',
            cursor: canSubmit ? 'pointer' : 'default',
            transition: 'background 200ms var(--ease-smooth), color 200ms var(--ease-smooth)',
          }}
        >
          Submit
        </button>
      </div>

      {/* status line — a quiet reframe on wrong, a calm confirm on correct. Never red, never an X. */}
      <div
        role="status"
        aria-live="polite"
        style={{
          minHeight: '1.2rem',
          fontFamily: 'var(--font-body)',
          fontSize: '0.85rem',
          color: correct
            ? 'var(--garden-green)'
            : wrong
              ? 'var(--note-amber)'
              : 'var(--ink-muted)',
          transition: 'color 200ms var(--ease-smooth)',
        }}
      >
        {correct
          ? 'That matches.'
          : wrong
            ? "Not quite — any equal form works, so try another way to write it."
            : ' '}
      </div>
    </div>
  )
}

/** Keep only digits, an optional leading minus, and (for num/whole) allow the minus mid-edit. */
function sanitize(raw: string, allowNegative: boolean): string {
  let s = raw.replace(/[^0-9-]/g, '')
  if (!allowNegative) {
    s = s.replace(/-/g, '')
  } else {
    // collapse to at most one leading minus
    const neg = s.startsWith('-')
    s = (neg ? '-' : '') + s.replace(/-/g, '')
  }
  return s
}

/** '' or a lone '-' parse to null (incomplete); otherwise an integer. */
function parseField(raw: string): number | null {
  const t = raw.trim()
  if (t === '' || t === '-') return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}
