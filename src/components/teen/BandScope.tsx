// BandScope — the teen "Field Lab" theme scope wrapper.
// Renders <div data-band={band}> so every CSS-var token remap cascades to its
// subtree. This is the ONLY teen kit component allowed to set data-band; all
// other components just read the resulting vars. We never mutate <html>.

import * as React from 'react'
import type { AgeBand } from '@/components/teen/types'

export interface BandScopeProps {
  band: AgeBand
  children: React.ReactNode
  style?: React.CSSProperties
  className?: string
}

export default function BandScope({ band, children, style, className }: BandScopeProps) {
  return (
    <div
      data-band={band}
      className={className}
      style={{
        background: 'var(--bg-page)',
        color: 'var(--ink)',
        minHeight: '100dvh',
        ...style,
      }}
    >
      {children}
    </div>
  )
}
