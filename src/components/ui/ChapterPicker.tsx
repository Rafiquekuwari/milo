'use client'
import { useRouter } from 'next/navigation'
import { useMiloStore, CHAPTER_ORDER, CHAPTER_NAMES, type ChapterType } from '@/lib/store'

const CHAPTER_CONFIG: Record<ChapterType, { asset?: string; doorTone?: boolean; emoji?: string; hint: string }> = {
  counting:           { emoji: '🌟', hint: 'Tap each one to count!' },
  numberOrdering:     { emoji: '🔢', hint: 'Put numbers in order!' },
  numberRecognition:  { doorTone: true, hint: 'Open the right number.' },
  matchingQuantities: { emoji: '🍎', hint: 'Put N apples in the basket.' },
  numberComparison:   { emoji: '⚖️', hint: 'Which is bigger?' },
  shapes:             { emoji: '🏠', hint: 'Build Milo\'s house.' },
  colors:             { emoji: '🌈', hint: 'Paint the flowers!' },
  patterns:           { emoji: '🔷', hint: 'Find what comes next!' },
  addition:           { emoji: '➕', hint: 'Add apples together!' },
  subtraction:        { emoji: '✨', hint: 'How many are left?' },
  measurement:        { emoji: '📏', hint: 'Tall, short, heavy, light!' },
}

// Star rendered purely with CSS + emoji — no PNG dependency
function Stars({ count }: { count: number }) {
  return (
    <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
      {[1, 2, 3].map(n => (
        <span
          key={n}
          style={{
            fontSize: 20,
            lineHeight: 1,
            opacity: n <= count ? 1 : 0.22,
            filter: n <= count
              ? 'drop-shadow(0 1px 3px rgba(255,201,51,.7))'
              : 'grayscale(1)',
            transition: 'opacity 300ms ease',
          }}
        >
          ⭐
        </span>
      ))}
    </div>
  )
}

interface Props { onClose: () => void }

export default function ChapterPicker({ onClose }: Props) {
  const router = useRouter()
  const { profile, startChapter } = useMiloStore()

  function pick(ch: ChapterType) {
    startChapter(ch)
    onClose()
    router.push('/game')
  }

  return (
    <div className="kit-scrim" style={{ position: 'fixed' }} onClick={onClose}>
      <div
        className="kit-modal"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 720, padding: 24, textAlign: 'left', width: '92%', maxHeight: '88dvh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h1 style={{ fontSize: 30 }}>Pick a story!</h1>
          <button
            className="milo-btn tone-cream size-sm is-round"
            style={{ width: 44, height: 44, fontSize: 22, flexShrink: 0 }}
            onClick={onClose}
          >×</button>
        </div>

        {/* Chapter grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {CHAPTER_ORDER.map(ch => {
            const cfg       = CHAPTER_CONFIG[ch]
            // Safe read — falls back to 0 if key missing (old localStorage saves)
            const stars     = Number(profile.chapterStars?.[ch] ?? 0)
            const completed = stars > 0
            const perfect   = stars === 3

            return (
              <div
                key={ch}
                onClick={() => pick(ch)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: perfect
                    ? 'var(--sun-yellow-soft)'
                    : completed
                    ? 'var(--garden-green-soft)'
                    : 'var(--paper-soft)',
                  border: `3px solid ${perfect ? 'var(--sun-yellow-deep)' : completed ? 'var(--garden-green)' : 'var(--outline)'}`,
                  borderRadius: 18,
                  padding: '10px 14px',
                  cursor: 'pointer',
                  boxShadow: `0 4px 0 ${perfect ? 'var(--sun-yellow-deep)' : completed ? 'var(--garden-green-deep)' : 'rgba(61,37,22,.12)'}`,
                  transition: 'transform 160ms cubic-bezier(.4,0,.2,1)',
                  position: 'relative',
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                {/* Icon */}
                {cfg.doorTone ? (
                  <div style={{
                    width: 52, height: 52, flexShrink: 0,
                    background: 'linear-gradient(180deg, #C84F1A 0%, #8E3A11 100%)',
                    border: '3px solid var(--outline)',
                    borderRadius: '26px 26px 6px 6px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-display)', fontWeight: 900,
                    color: 'var(--cream)', fontSize: 20,
                  }}>3</div>
                ) : (
                  <div style={{
                    width: 52, height: 52, flexShrink: 0,
                    background: 'var(--paper)',
                    border: '3px solid var(--outline)',
                    borderRadius: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 28,
                    boxShadow: '0 3px 0 rgba(61,37,22,.10)',
                  }}>
                    {cfg.emoji}
                  </div>
                )}

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontSize: 17, marginBottom: 2 }}>{CHAPTER_NAMES[ch]}</h3>
                  <p style={{ fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.3 }}>{cfg.hint}</p>
                </div>

                {/* Stars — always emoji, never PNG */}
                <Stars count={stars} />

                {/* Perfect badge */}
                {perfect && (
                  <div style={{
                    position: 'absolute', top: -8, right: -8,
                    background: 'var(--sun-yellow)', border: '2px solid var(--outline)',
                    borderRadius: 999, padding: '2px 8px',
                    fontFamily: 'var(--font-display)', fontWeight: 900,
                    fontSize: 11, color: 'var(--outline)',
                  }}>★★★</div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}