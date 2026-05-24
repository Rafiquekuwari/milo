'use client'
/**
 * Milo Design System — Shared Components
 * Drop this file into src/components/ui/MiloUI.tsx
 * Import what you need: import { MiloButton, MiloCard, MiloBubble } from '@/components/ui/MiloUI'
 */

import React from 'react'

// ─── Types ───────────────────────────────────────────────────

type Tone = 'orange' | 'green' | 'yellow' | 'blue' | 'red' | 'purple' | 'cream'
type Size = 'sm' | 'md' | 'lg' | 'xl'

// ─── Tone maps ───────────────────────────────────────────────

const TONE_BG: Record<Tone, string> = {
  orange: 'var(--milo-orange)',
  green:  'var(--garden-green)',
  yellow: 'var(--sun-yellow)',
  blue:   'var(--sky-blue)',
  red:    'var(--apple-red)',
  purple: 'var(--berry-purple)',
  cream:  'var(--cream)',
}

const TONE_SHADOW: Record<Tone, string> = {
  orange: 'var(--milo-orange-deep)',
  green:  'var(--garden-green-deep)',
  yellow: 'var(--sun-yellow-deep)',
  blue:   'var(--sky-blue-deep)',
  red:    'var(--apple-red-deep)',
  purple: 'var(--berry-purple-deep)',
  cream:  'var(--ink-muted)',
}

const TONE_COLOR: Record<Tone, string> = {
  orange: '#fff',
  green:  '#fff',
  yellow: 'var(--ink)',
  blue:   '#fff',
  red:    '#fff',
  purple: '#fff',
  cream:  'var(--ink)',
}

const TONE_SOFT: Record<Tone, string> = {
  orange: 'var(--milo-orange-soft)',
  green:  'var(--garden-green-soft)',
  yellow: 'var(--sun-yellow-soft)',
  blue:   'var(--sky-blue-soft)',
  red:    'var(--apple-red-soft)',
  purple: 'var(--berry-purple-soft)',
  cream:  'var(--cream)',
}

const TONE_BORDER: Record<Tone, string> = {
  orange: 'var(--milo-orange)',
  green:  'var(--garden-green)',
  yellow: 'var(--sun-yellow-deep)',
  blue:   'var(--sky-blue-deep)',
  red:    'var(--apple-red)',
  purple: 'var(--berry-purple)',
  cream:  'var(--ink-muted)',
}

const BTN_SIZE: Record<Size, React.CSSProperties> = {
  sm: { fontSize: 15, padding: '8px 18px',  boxShadow: '0 4px 0 var(--shadow-color)' },
  md: { fontSize: 18, padding: '12px 26px', boxShadow: '0 5px 0 var(--shadow-color)' },
  lg: { fontSize: 22, padding: '14px 32px', boxShadow: '0 6px 0 var(--shadow-color)' },
  xl: { fontSize: 26, padding: '18px 40px', boxShadow: '0 7px 0 var(--shadow-color)' },
}

// ─── MiloButton ──────────────────────────────────────────────

interface MiloButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: Tone
  size?: Size
  round?: boolean
  children: React.ReactNode
}

export function MiloButton({
  tone = 'orange',
  size = 'md',
  round = false,
  children,
  style,
  ...props
}: MiloButtonProps) {
  const sizeStyle = BTN_SIZE[size]

  return (
    <button
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-display)',
        fontWeight: 'var(--w-bold)',
        border: '3px solid var(--outline)',
        borderRadius: round ? '50%' : 'var(--r-pill, 999px)',
        cursor: props.disabled ? 'not-allowed' : 'pointer',
        background: TONE_BG[tone],
        color: TONE_COLOR[tone],
        boxShadow: `0 ${size === 'sm' ? 4 : size === 'xl' ? 7 : size === 'lg' ? 6 : 5}px 0 ${TONE_SHADOW[tone]}`,
        transition: 'transform .1s, box-shadow .1s',
        opacity: props.disabled ? 0.5 : 1,
        ...(round ? { width: 52, height: 52, padding: 0, fontSize: 22 } : {}),
        ...sizeStyle,
        ...style,
      }}
      onMouseDown={e => {
        if (!props.disabled) {
          const btn = e.currentTarget
          btn.style.transform = 'translateY(4px)'
          btn.style.boxShadow = '0 0 0 transparent'
        }
      }}
      onMouseUp={e => {
        const btn = e.currentTarget
        btn.style.transform = ''
        btn.style.boxShadow = ''
      }}
      onMouseLeave={e => {
        const btn = e.currentTarget
        btn.style.transform = ''
        btn.style.boxShadow = ''
      }}
      {...props}
    >
      {children}
    </button>
  )
}

// ─── MiloCard ────────────────────────────────────────────────

interface MiloCardProps {
  tone?: Tone | 'paper'
  children: React.ReactNode
  style?: React.CSSProperties
  onClick?: () => void
}

export function MiloCard({ tone = 'paper', children, style, onClick }: MiloCardProps) {
  const bg = tone === 'paper' ? 'var(--paper)' : TONE_SOFT[tone as Tone]
  const border = tone === 'paper' ? 'var(--outline)' : TONE_BORDER[tone as Tone]

  return (
    <div
      onClick={onClick}
      style={{
        background: bg,
        border: `3px solid ${border}`,
        borderRadius: 'var(--r-lg, 28px)',
        padding: 16,
        boxShadow: '0 5px 0 rgba(42,26,15,.1)',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// ─── MiloBubble ──────────────────────────────────────────────

interface MiloBubbleProps {
  children: React.ReactNode
  miloSrc?: string
  miloFallback?: string
  style?: React.CSSProperties
}

export function MiloBubble({ children, miloSrc = '/assets/characters/milo-happy.png', miloFallback = '🦊', style }: MiloBubbleProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, ...style }}>
      <img
        src={miloSrc}
        alt="Milo"
        style={{ width: 80, height: 80, objectFit: 'contain', flexShrink: 0 }}
        onError={e => {
          const el = e.target as HTMLImageElement
          el.style.display = 'none'
          const span = document.createElement('span')
          span.textContent = miloFallback
          span.style.fontSize = '56px'
          el.parentNode?.insertBefore(span, el)
        }}
      />
      <div style={{
        background: 'var(--paper)',
        border: '3px solid var(--outline)',
        borderRadius: '20px 20px 20px 4px',
        padding: '12px 18px',
        fontFamily: 'var(--font-body)',
        fontSize: 'var(--t-body-lg)',
        fontWeight: 'var(--w-bold)',
        color: 'var(--ink)',
        flex: 1,
        boxShadow: '0 4px 0 rgba(42,26,15,.08)',
      }}>
        {children}
      </div>
    </div>
  )
}

// ─── MiloInput ───────────────────────────────────────────────

interface MiloInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
  label?: string
}

export function MiloInput({ error, label, style, ...props }: MiloInputProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
      {label && (
        <span style={{
          fontFamily: 'var(--font-body)',
          fontSize: 12,
          fontWeight: 'var(--w-heavy)',
          letterSpacing: '.08em',
          textTransform: 'uppercase',
          color: 'var(--ink-muted)',
        }}>
          {label}
        </span>
      )}
      <input
        style={{
          width: '100%',
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: 'var(--t-h3)',
          color: error ? 'var(--apple-red-deep)' : 'var(--ink)',
          background: error ? 'var(--apple-red-soft)' : 'var(--paper)',
          border: `4px solid ${error ? 'var(--apple-red)' : 'var(--outline)'}`,
          borderRadius: 'var(--r-md, 18px)',
          padding: '12px 18px',
          outline: 'none',
          boxShadow: error
            ? '0 4px 0 rgba(176,35,35,.18)'
            : '0 4px 0 rgba(61,37,22,.10)',
          boxSizing: 'border-box',
          ...style,
        }}
        {...props}
      />
      {error && (
        <span style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          color: 'var(--apple-red-deep)',
          fontSize: 14,
        }}>
          {error}
        </span>
      )}
    </div>
  )
}

// ─── MiloChip ────────────────────────────────────────────────

interface MiloChipProps {
  tone?: Tone | 'default'
  children: React.ReactNode
  style?: React.CSSProperties
}

export function MiloChip({ tone = 'default', children, style }: MiloChipProps) {
  const bg = tone === 'default' ? 'var(--paper)' : TONE_SOFT[tone as Tone]
  const border = tone === 'default' ? 'var(--outline)' : TONE_BORDER[tone as Tone]

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '7px 14px',
      borderRadius: 'var(--r-pill, 999px)',
      border: `2px solid ${border}`,
      background: bg,
      fontFamily: 'var(--font-body)',
      fontSize: 14,
      fontWeight: 'var(--w-heavy)',
      color: 'var(--ink)',
      ...style,
    }}>
      {children}
    </span>
  )
}

// ─── MiloXPBar ───────────────────────────────────────────────

interface MiloXPBarProps {
  value: number   // 0–1
  tone?: 'yellow' | 'green'
  label?: string
  sublabel?: string
  style?: React.CSSProperties
}

export function MiloXPBar({ value, tone = 'yellow', label, sublabel, style }: MiloXPBarProps) {
  const fill = tone === 'green'
    ? 'linear-gradient(90deg, var(--garden-green-soft), var(--garden-green))'
    : 'linear-gradient(90deg, var(--sun-yellow), var(--milo-orange))'

  return (
    <div style={{ width: '100%', ...style }}>
      {(label || sublabel) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          {label   && <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 'var(--w-bold)', color: 'var(--ink-soft)' }}>{label}</span>}
          {sublabel && <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--ink-soft)' }}>{sublabel}</span>}
        </div>
      )}
      <div style={{
        height: 18,
        background: 'var(--cream)',
        borderRadius: 'var(--r-pill, 999px)',
        border: '2.5px solid var(--outline)',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${Math.min(1, Math.max(0, value)) * 100}%`,
          background: fill,
          borderRadius: 'var(--r-pill, 999px)',
          transition: 'width .6s ease',
        }} />
      </div>
    </div>
  )
}

// ─── MiloStars ───────────────────────────────────────────────

interface MiloStarsProps {
  count: number   // 0–3
  size?: number
  style?: React.CSSProperties
}

export function MiloStars({ count, size = 40, style }: MiloStarsProps) {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', ...style }}>
      {[1, 2, 3].map(n => (
        <span
          key={n}
          style={{
            fontSize: size,
            opacity: n <= count ? 1 : 0.2,
            filter: n <= count ? `drop-shadow(0 2px 4px rgba(255,201,51,.5))` : 'none',
            transition: 'opacity .3s',
          }}
        >
          ⭐
        </span>
      ))}
    </div>
  )
}

// ─── MiloAvatar ──────────────────────────────────────────────

const AVATAR_EMOJIS = ['🦊', '🐰', '🐻', '🐱']

interface MiloAvatarProps {
  index: number
  selected?: boolean
  dim?: boolean
  size?: number
  onClick?: () => void
}

export function MiloAvatar({ index, selected, dim, size = 80, onClick }: MiloAvatarProps) {
  return (
    <div
      onClick={onClick}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'var(--paper)',
        border: selected ? `4px solid var(--sun-yellow)` : '3px solid var(--ink-muted)',
        boxShadow: selected ? '0 0 0 3px var(--sun-yellow-deep)' : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.6,
        cursor: onClick ? 'pointer' : 'default',
        opacity: dim ? 0.55 : 1,
        transform: selected ? 'scale(1.15)' : 'scale(1)',
        transition: 'transform .15s, box-shadow .15s, border-color .15s, opacity .15s',
      }}
    >
      {AVATAR_EMOJIS[index % AVATAR_EMOJIS.length]}
    </div>
  )
}

// ─── MiloFeedback ────────────────────────────────────────────

interface MiloFeedbackProps {
  type: 'correct' | 'wrong'
  message?: string
}

export function MiloFeedback({ type, message }: MiloFeedbackProps) {
  return (
    <div style={{
      position: 'fixed',
      top: '40%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: type === 'correct' ? 'var(--garden-green)' : 'var(--apple-red)',
      color: '#fff',
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--t-h1)',
      fontWeight: 'var(--w-bold)',
      padding: '20px 40px',
      borderRadius: 24,
      border: '3px solid var(--outline)',
      zIndex: 50,
      textAlign: 'center',
      boxShadow: '0 8px 0 rgba(42,26,15,.2)',
    }}>
      {message ?? (type === 'correct' ? '✅ Correct!' : '❌ Try again!')}
    </div>
  )
}

// ─── MiloProgressBar ─────────────────────────────────────────

interface MiloProgressBarProps {
  current: number
  total: number
}

export function MiloProgressBar({ current, total }: MiloProgressBarProps) {
  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      height: 8,
      background: 'rgba(0,0,0,0.1)',
      zIndex: 5,
    }}>
      <div style={{
        height: '100%',
        width: `${(current / total) * 100}%`,
        background: 'var(--garden-green)',
        borderRadius: '0 4px 4px 0',
        transition: 'width 0.4s ease',
      }} />
    </div>
  )
}