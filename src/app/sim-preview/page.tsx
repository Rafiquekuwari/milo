'use client'
// Dev-only preview of the LineExplorer concept simulation in the 12–14 skin.
import BandScope from '@/components/teen/BandScope'
import LineExplorer from '@/components/teen/sims/LineExplorer'

export default function SimPreviewPage() {
  return (
    <BandScope band="12-14" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 18px' }}>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 16 }}>
        Explore · Linear relationships
      </div>
      <LineExplorer band="12-14" />
    </BandScope>
  )
}
