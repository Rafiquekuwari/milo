'use client'
export const dynamic = 'force-static'
/**
 * Hand Games hub — lists the AR / webcam hand-tracking activities. New AR
 * activities just add an entry to GAMES here (keeps the main menu uncluttered).
 */
import { useRouter } from 'next/navigation'

const GAMES = [
  { emoji: '✋', title: 'Finger Counting', desc: 'Count with your fingers!', href: '/play/finger-counting' },
  { emoji: '➕', title: 'Add with Fingers', desc: 'Show the answer on your hands!', href: '/play/finger-addition' },
  { emoji: '🧺', title: 'Catch It!', desc: 'Catch the falling apples!', href: '/play/catch-it' },
  { emoji: '🔢', title: 'Catch the Number', desc: 'Catch the number Milo calls!', href: '/play/catch-number' },
  { emoji: '🎨', title: 'Catch the Color', desc: 'Catch the colour Milo names!', href: '/play/catch-color' },
  { emoji: '📦', title: 'Sort the Sizes', desc: 'Big left, small right!', href: '/play/sort-bins' },
  { emoji: '🔢', title: 'Match the Number', desc: 'Pinch & drag the number!', href: '/play/match-number' },
  { emoji: '🔢', title: 'Number Order', desc: 'Drag numbers into order!', href: '/play/number-order' },
  { emoji: '🎨', title: 'Pattern Builder', desc: 'Drag what comes next!', href: '/play/pattern-builder' },
  { emoji: '👍', title: 'Thumbs Up or Down', desc: 'Answer yes or no!', href: '/play/thumbs-quiz' },
]

export default function HandGamesHub() {
  const router = useRouter()
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, padding: '32px 24px', background: 'linear-gradient(180deg,var(--sky-blue-soft) 0%,var(--bg-page) 55%)' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--ink)', margin: 0 }}>✋ Hand Games</h1>
      <p style={{ fontFamily: 'var(--font-body)', color: 'var(--ink-soft)', margin: 0, textAlign: 'center' }}>Play with your hands and the camera!</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16, width: '100%', maxWidth: 900, marginTop: 8 }}>
        {GAMES.map(g => (
          <button key={g.href} onClick={() => router.push(g.href)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center', background: 'var(--paper)', border: '4px solid var(--outline)', borderRadius: 22, padding: '22px 16px', boxShadow: '0 6px 0 rgba(61,37,22,.2)', cursor: 'pointer' }}>
            <span style={{ fontSize: 52 }}>{g.emoji}</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--ink)' }}>{g.title}</span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--ink-soft)' }}>{g.desc}</span>
          </button>
        ))}
      </div>

      <button className="milo-btn tone-cream size-lg" style={{ marginTop: 10 }} onClick={() => router.push('/menu')}>← Back</button>
    </div>
  )
}
