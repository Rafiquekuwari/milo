'use client'
// Dev-only preview of the Integers pilot chapter (12–14). Mounts the real
// chapter component (which portals itself full-screen). No active learner here,
// so finishAndSync is best-effort — gameplay (intro → lesson → practice → done)
// is what we're verifying.
import IntegersChapter from '@/components/game/IntegersChapter'

export default function IntegersPreviewPage() {
  return <IntegersChapter onComplete={() => {}} childName="Sam" />
}
