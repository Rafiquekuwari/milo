'use client'

import type { AgeBand } from '@/components/teen/types'

export interface FindingsLogProps {
  band: AgeBand
  items: { label: string; value?: string; done: boolean }[]
  title?: string
}

/**
 * Right-side accumulation panel — a titled list that fills as the learner
 * answers (findings / spec rows / concepts confirmed). Done items get a quiet
 * green check; values render in mono. No red, no X, no fail — pending items just
 * wait, neutral. Theme (accent/garden-green/ink) comes from the ancestor
 * `data-band` scope; we only read vars.
 */
export default function FindingsLog({ band, items, title = 'Findings' }: FindingsLogProps) {
  const total = items.length
  const doneCount = items.reduce((n, it) => (it.done ? n + 1 : n), 0)

  return (
    <section
      data-band-context={band}
      aria-label={title}
      style={{
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        padding: '1.25rem',
        border: '1px solid var(--outline)',
        borderRadius: '12px',
        background: 'var(--bg-1)',
        color: 'var(--ink)',
        fontFamily: 'var(--font-body)',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: '0.75rem',
          paddingBottom: '0.75rem',
          borderBottom: '1px solid var(--outline)',
        }}
      >
        <h3
          style={{
            margin: 0,
            fontFamily: 'var(--font-body)',
            fontSize: '0.875rem',
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: 'var(--ink-soft)',
          }}
        >
          {title}
        </h3>
        {total > 0 && (
          <span
            aria-hidden="true"
            style={{
              fontFamily: 'var(--font-numeric)',
              fontVariantNumeric: 'tabular-nums',
              fontSize: '0.8125rem',
              color: 'var(--ink-muted)',
            }}
          >
            {doneCount}/{total}
          </span>
        )}
      </header>

      {total === 0 ? (
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--font-body)',
            fontSize: '0.875rem',
            color: 'var(--ink-muted)',
          }}
        >
          Nothing logged yet.
        </p>
      ) : (
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.125rem',
          }}
        >
          {items.map((item, i) => (
            <li
              key={`${i}-${item.label}`}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '0.625rem',
                padding: '0.5rem 0',
                borderTop: i === 0 ? 'none' : '1px solid var(--outline)',
                transition: 'opacity 200ms var(--ease-smooth)',
              }}
            >
              <Marker done={item.done} />
              <span
                style={{
                  flex: '1 1 auto',
                  minWidth: 0,
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.9375rem',
                  lineHeight: 1.35,
                  color: item.done ? 'var(--ink)' : 'var(--ink-soft)',
                }}
              >
                {item.label}
              </span>
              {item.value != null && (
                <span
                  style={{
                    flex: '0 0 auto',
                    fontFamily: 'var(--font-numeric)',
                    fontVariantNumeric: 'tabular-nums',
                    fontSize: '0.9375rem',
                    color: item.done ? 'var(--ink)' : 'var(--ink-muted)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.value}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/**
 * Leading status glyph. Done → a quiet green check (garden-green); pending →
 * a hollow hairline ring. Never red, never an X.
 */
function Marker({ done }: { done: boolean }) {
  return (
    <span
      aria-hidden="true"
      style={{
        flex: '0 0 auto',
        position: 'relative',
        top: '0.1em',
        width: '1rem',
        height: '1rem',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'opacity 200ms var(--ease-smooth)',
      }}
    >
      {done ? (
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M3.5 8.5L6.5 11.5L12.5 4.5"
            stroke="var(--garden-green)"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <span
          style={{
            width: '0.7rem',
            height: '0.7rem',
            borderRadius: '999px',
            border: '1px solid var(--outline)',
            background: 'var(--bg-2)',
          }}
        />
      )}
    </span>
  )
}
