'use client'
/**
 * BackButton — consistent back navigation button used across all pages
 * Matches the milo-btn design system with orange outline style
 */

import { useRouter } from 'next/navigation'

interface Props {
  onClick?:  () => void   // override default router.back()
  label?:    string       // default "← Back"
  href?:     string       // go to specific route instead of router.back()
  variant?:  'outline' | 'solid' | 'ghost'
  size?:     'sm' | 'md' | 'lg'
}

export default function BackButton({
  onClick, label = '← Back', href, variant = 'outline', size = 'md',
}: Props) {
  const router = useRouter()

  function handleClick() {
    if (onClick) { onClick(); return }
    if (href)    { router.push(href); return }
    router.back()
  }

  const sizeStyles = {
    sm: { padding: '7px 16px',  fontSize: 13, borderRadius: 50 },
    md: { padding: '10px 20px', fontSize: 15, borderRadius: 50 },
    lg: { padding: '13px 28px', fontSize: 17, borderRadius: 50 },
  }

  const variantStyles = {
    outline: {
      background:   'var(--paper)',
      color:        'var(--milo-orange)',
      border:       '3px solid var(--milo-orange)',
      boxShadow:    '0 3px 0 rgba(242,107,44,.25)',
    },
    solid: {
      background:   'linear-gradient(135deg, var(--milo-orange) 0%, var(--milo-orange-deep) 100%)',
      color:        '#fff',
      border:       '3px solid var(--milo-orange-deep)',
      boxShadow:    '0 4px 0 rgba(61,37,22,.2)',
    },
    ghost: {
      background:   'rgba(255,255,255,0.15)',
      color:        '#fff',
      border:       '2.5px solid rgba(255,255,255,0.4)',
      boxShadow:    'none',
    },
  }

  return (
    <button
      onClick={handleClick}
      style={{
        display:       'inline-flex',
        alignItems:    'center',
        gap:           6,
        fontFamily:    'var(--font-display)',
        fontWeight:    800,
        cursor:        'pointer',
        transition:    'all 0.15s ease',
        flexShrink:    0,
        ...sizeStyles[size],
        ...variantStyles[variant],
      }}
      onMouseDown={e => {
        e.currentTarget.style.transform = 'translateY(3px)'
        e.currentTarget.style.boxShadow = 'none'
      }}
      onMouseUp={e => {
        e.currentTarget.style.transform = ''
        e.currentTarget.style.boxShadow = variantStyles[variant].boxShadow
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = ''
        e.currentTarget.style.boxShadow = variantStyles[variant].boxShadow
      }}
    >
      {label}
    </button>
  )
}
