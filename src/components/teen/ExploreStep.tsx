'use client'
/**
 * ExploreStep — the "play with it first" screen that hosts a concept simulation
 * before the worked-example lesson. Discovery-first, the active-learning pattern
 * that drives teen engagement. Deliberately does NOT use CalmAdvance (its
 * full-screen scrim would cover the sim); it renders a normal inline Continue.
 * Full-height (className="milo-lesson") so it sits cleanly in the chapter portal.
 */
import type { AgeBand } from '@/components/teen/types'

export interface ExploreStepProps {
  band: AgeBand
  title: string
  intro?: string
  children: React.ReactNode   // the simulation
  onContinue: () => void
  continueLabel?: string
}

export default function ExploreStep({ band, title, intro, children, onContinue, continueLabel = 'Continue' }: ExploreStepProps) {
  void band // theme comes from the ancestor data-band scope
  return (
    <div className="milo-lesson" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--bg-page)', color: 'var(--ink)', fontFamily: 'var(--font-body)' }}>
      <header style={{ width: '100%', maxWidth: 560, padding: '16px 18px 4px', boxSizing: 'border-box' }}>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>Explore</div>
        <h1 style={{ margin: '2px 0 0', fontFamily: 'var(--font-body)', fontSize: '1.05rem', fontWeight: 600, color: 'var(--ink)' }}>{title}</h1>
        {intro && <p style={{ margin: '6px 0 0', fontSize: 14, lineHeight: 1.5, color: 'var(--ink-soft)' }}>{intro}</p>}
      </header>

      <main style={{ flex: 1, width: '100%', maxWidth: 560, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 18px 16px', boxSizing: 'border-box' }}>
        {children}
      </main>

      <footer style={{ width: '100%', maxWidth: 560, padding: '0 18px 24px', boxSizing: 'border-box', display: 'flex', justifyContent: 'flex-end' }}>
        <button type="button" onClick={onContinue} style={{ padding: '12px 22px', borderRadius: 10, background: 'var(--accent)', border: '1px solid var(--accent)', color: 'var(--fg-on-color)', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
          {continueLabel} →
        </button>
      </footer>
    </div>
  )
}
