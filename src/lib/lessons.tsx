/**
 * Lesson definitions for every chapter.
 * Each chapter gets 5 interactive examples shown before practice.
 * Import: import { getLessonExamples } from '@/lib/lessons'
 */
import React from 'react'
import type { LessonExample } from '@/components/ui/ChapterLesson'
import type { ChapterType } from './store'

// ─── Shared visual helpers ────────────────────────────────────

function EmojiRow({ items, size = 48 }: { items: string[]; size?: number }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
      {items.map((em, i) => (
        <span key={i} style={{ fontSize: size, lineHeight: 1,
          animation: `bounce-in 350ms cubic-bezier(.34,1.56,.64,1) ${i * 120}ms both` }}>
          {em}
        </span>
      ))}
    </div>
  )
}

function NumberCard({ num, label, color = 'var(--milo-orange)', soft = 'var(--milo-orange-soft)' }:
  { num: number | string; label?: string; color?: string; soft?: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: 100, height: 100, borderRadius: 24, margin: '0 auto',
        background: soft, border: `4px solid ${color}`,
        boxShadow: `0 6px 0 ${color}`, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontFamily: 'var(--font-display)',
        fontWeight: 900, fontSize: 56, color: 'var(--ink)',
      }}>{num}</div>
      {label && <p style={{ marginTop: 8, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--ink-soft)' }}>{label}</p>}
    </div>
  )
}

function AddScene({ a, aEmoji, b, bEmoji, showResult }: { a: number; aEmoji: string; b: number; bEmoji?: string; showResult?: boolean }) {
  const em = bEmoji ?? aEmoji
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
      <div style={{ textAlign: 'center' }}>
        <EmojiRow items={Array(a).fill(aEmoji)} />
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, color: 'var(--sky-blue-deep)', marginTop: 6 }}>{a}</div>
      </div>
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 48, color: 'var(--milo-orange)', WebkitTextStroke: '2px var(--outline)', paintOrder: 'stroke fill' }}>+</span>
      <div style={{ textAlign: 'center' }}>
        <EmojiRow items={Array(b).fill(em)} />
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, color: 'var(--garden-green-deep)', marginTop: 6 }}>{b}</div>
      </div>
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 48, color: 'var(--ink-soft)' }}>=</span>
      <div style={{ width: 80, height: 80, borderRadius: 20, background: showResult ? 'var(--garden-green)' : 'var(--cream)', border: '4px solid var(--outline)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 44, color: showResult ? '#fff' : 'var(--ink-muted)', transition: 'all 400ms ease' }}>
        {showResult ? a + b : '?'}
      </div>
    </div>
  )
}

function SubScene({ total, take, emoji }: { total: number; take: number; emoji: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        {Array.from({ length: total }).map((_, i) => (
          <span key={i} style={{
            fontSize: 40, lineHeight: 1,
            opacity: i >= total - take ? 0.25 : 1,
            transform: i >= total - take ? 'scale(0.7)' : 'scale(1)',
            transition: `all 400ms ease ${i * 80}ms`,
          }}>{emoji}</span>
        ))}
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 28, color: 'var(--ink)' }}>
        <span style={{ color: 'var(--milo-orange)' }}>{total}</span>
        <span style={{ color: 'var(--ink-soft)', margin: '0 12px' }}>−</span>
        <span style={{ color: 'var(--apple-red)' }}>{take}</span>
        <span style={{ color: 'var(--ink-soft)', margin: '0 12px' }}>=</span>
        <span style={{ color: 'var(--garden-green)' }}>{total - take}</span>
      </div>
    </div>
  )
}

function TowerPair({ aH, bH, aLabel, bLabel, aColor, bColor }: { aH: number; bH: number; aLabel: string; bLabel: string; aColor: string; bColor: string }) {
  const max = Math.max(aH, bH)
  return (
    <div style={{ display: 'flex', gap: 40, justifyContent: 'center', alignItems: 'flex-end' }}>
      {[{ h: aH, label: aLabel, col: aColor }, { h: bH, label: bLabel, col: bColor }].map((t, i) => (
        <div key={i} style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column-reverse', gap: 3, height: max * 28, justifyContent: 'flex-start' }}>
            {Array.from({ length: t.h }).map((_, j) => (
              <div key={j} style={{ width: 52, height: 22, borderRadius: 6, background: t.col, border: '2px solid var(--outline)', boxShadow: '0 2px 0 rgba(61,37,22,.12)' }} />
            ))}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 16, color: 'var(--ink)', marginTop: 6 }}>{t.label}</div>
          <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 14, color: 'var(--ink-muted)' }}>{t.h} blocks</div>
        </div>
      ))}
    </div>
  )
}

function PatternRow({ items, showNext = false }: { items: string[]; showNext?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
      {items.map((em, i) => (
        <span key={i} style={{ fontSize: 40, lineHeight: 1, display: 'inline-block',
          animation: `bounce-in 300ms cubic-bezier(.34,1.56,.64,1) ${i * 100}ms both` }}>
          {em}
        </span>
      ))}
      <span style={{ fontSize: 24, color: 'var(--ink-muted)' }}>→</span>
      {showNext
        ? <span style={{ fontSize: 40, animation: 'bounce-in 400ms cubic-bezier(.34,1.56,.64,1) 600ms both' }}>{items[items.length % 2]}</span>
        : <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--sun-yellow-soft)', border: '3px dashed var(--sun-yellow-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: 'var(--ink-muted)' }}>?</div>}
    </div>
  )
}

function ShapeDisplay({ emoji, label, color }: { emoji: string; label: string; color: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 80, lineHeight: 1, animation: 'bounce-in 400ms cubic-bezier(.34,1.56,.64,1) both' }}>{emoji}</div>
      <div style={{ marginTop: 8, background: color, border: '3px solid var(--outline)', borderRadius: 999, padding: '4px 18px', display: 'inline-block', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 20, color: '#fff' }}>{label}</div>
    </div>
  )
}

function ColorFlower({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ width: 100, height: 100, borderRadius: '40% 60% 60% 40% / 50% 40% 60% 50%', background: color, border: '4px solid var(--outline)', margin: '0 auto', boxShadow: `0 6px 0 ${color}88`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>🌸</div>
      <div style={{ marginTop: 10, fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, color: 'var(--ink)' }}>{label}</div>
    </div>
  )
}

// ─── Lesson definitions per chapter ─────────────────────────

const LESSONS: Record<ChapterType, LessonExample[]> = {

  counting: [
    {
      title: 'Counting means saying numbers in order!',
      miloSays: 'When we count, we say 1, 2, 3… and touch each thing once!',
      visual: <div style={{ textAlign: 'center' }}>
        <EmojiRow items={['⭐','⭐','⭐']} />
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 36, color: 'var(--milo-orange)', marginTop: 12 }}>1 … 2 … 3</div>
      </div>,
      tapPrompt: 'Tap the stars one by one!',
    },
    {
      title: 'Let\'s count apples!',
      miloSays: 'There are 5 apples. Touch each one and say the number!',
      visual: <div>
        <EmojiRow items={['🍎','🍎','🍎','🍎','🍎']} />
        <div style={{ display: 'flex', justifyContent: 'center', gap: 18, marginTop: 12 }}>
          {[1,2,3,4,5].map(n => (
            <div key={n} style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--apple-red)', border: '2px solid var(--outline)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, color: '#fff' }}>{n}</div>
          ))}
        </div>
      </div>,
    },
    {
      title: 'Always start from 1!',
      miloSays: '3 butterflies! We always start counting from 1, not 0!',
      visual: <div style={{ textAlign: 'center' }}>
        <EmojiRow items={['🦋','🦋','🦋']} />
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 32, color: 'var(--sky-blue-deep)', marginTop: 12 }}>Start → 1, 2, 3!</div>
      </div>,
    },
    {
      title: 'The last number you say is the answer!',
      miloSays: 'Count these flowers. The LAST number you say tells you HOW MANY there are!',
      visual: <div style={{ textAlign: 'center' }}>
        <EmojiRow items={['🌸','🌸','🌸','🌸']} />
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 28, color: 'var(--ink)', marginTop: 12 }}>1, 2, 3, <span style={{ color: 'var(--garden-green)', fontSize: 38 }}>4!</span></div>
        <p style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 16, color: 'var(--ink-soft)', marginTop: 8 }}>There are 4 flowers! ✅</p>
      </div>,
    },
    {
      title: 'Your turn coming up!',
      miloSays: 'You\'ve got it! Now I\'ll show you some and you tell me how many!',
      visual: <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 64 }}>🌟</div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 28, color: 'var(--milo-orange)', marginTop: 12 }}>Ready to count?</div>
        <p style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 16, color: 'var(--ink-soft)', marginTop: 6 }}>Tap each one, then pick the right number!</p>
      </div>,
    },
  ],

  numberOrdering: [
    {
      title: 'Numbers go in order!',
      miloSays: '1 comes before 2, 2 before 3. Numbers always go in the same order!',
      visual: <div style={{ display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
        {[1,2,3,4,5].map((n, i) => (
          <React.Fragment key={n}>
            <NumberCard num={n} color={`hsl(${200 + i * 30},70%,55%)`} soft={`hsl(${200 + i * 30},70%,92%)`} />
            {i < 4 && <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 28, color: 'var(--ink-muted)' }}>→</span>}
          </React.Fragment>
        ))}
      </div>,
    },
    {
      title: 'Smallest to biggest!',
      miloSays: 'We put numbers from SMALL to BIG. 2, 4, 6 — each one is bigger!',
      visual: <div style={{ display: 'flex', gap: 10, justifyContent: 'center', alignItems: 'flex-end' }}>
        {[2,4,6].map((n, i) => (
          <div key={n} style={{ textAlign: 'center' }}>
            <div style={{ width: 60, height: n * 14, background: 'var(--sky-blue)', border: '3px solid var(--sky-blue-deep)', borderRadius: '8px 8px 0 0', transition: 'height 500ms ease' }} />
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 24, color: 'var(--ink)', marginTop: 4 }}>{n}</div>
          </div>
        ))}
      </div>,
    },
    {
      title: 'What comes next?',
      miloSays: '3, 4, 5… what comes after 5? It\'s 6! Each number is one MORE than before.',
      visual: <div style={{ display: 'flex', gap: 10, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
        {[3,4,5].map(n => <NumberCard key={n} num={n} color="var(--garden-green)" soft="var(--garden-green-soft)" />)}
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 36, color: 'var(--ink-muted)' }}>→</span>
        <NumberCard num={6} color="var(--milo-orange)" soft="var(--milo-orange-soft)" label="That's next!" />
      </div>,
    },
    {
      title: 'Finding the missing number!',
      miloSays: '2, 3, ?, 5. Which number is hiding? It must be 4!',
      visual: <div style={{ display: 'flex', gap: 10, justifyContent: 'center', alignItems: 'center' }}>
        {[2, 3].map(n => <NumberCard key={n} num={n} color="var(--sky-blue)" soft="var(--sky-blue-soft)" />)}
        <div style={{ width: 100, height: 100, borderRadius: 24, background: 'var(--sun-yellow-soft)', border: '4px dashed var(--sun-yellow-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 44, color: 'var(--sun-yellow-deep)', animation: 'tap-pulse 1.4s ease-in-out infinite' }}>?</div>
        <NumberCard num={5} color="var(--sky-blue)" soft="var(--sky-blue-soft)" />
        <span style={{ fontSize: 28, color: 'var(--garden-green)' }}>→ It's <strong>4</strong>!</span>
      </div>,
    },
    {
      title: 'You\'re ready to order numbers!',
      miloSays: 'Brilliant! You know how numbers go in order. Now let\'s practise!',
      visual: <EmojiRow items={['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣']} size={44} />,
    },
  ],

  numberRecognition: [
    {
      title: 'Numbers have special shapes!',
      miloSays: 'Every number looks different. Let\'s learn what they look like!',
      visual: <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
        {[1,2,3,4,5].map((n, i) => (
          <NumberCard key={n} num={n} color={['var(--apple-red)','var(--sky-blue)','var(--garden-green)','var(--berry-purple)','var(--milo-orange)'][i]}
            soft={['var(--apple-red-soft)','var(--sky-blue-soft)','var(--garden-green-soft)','var(--berry-purple-soft)','var(--milo-orange-soft)'][i]} />
        ))}
      </div>,
    },
    {
      title: 'This is the number 3!',
      miloSays: 'The number 3 has two bumps on its right side. Can you see it?',
      visual: <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 140, color: 'var(--milo-orange)', lineHeight: 1, WebkitTextStroke: '4px var(--outline)', paintOrder: 'stroke fill' }}>3</div>
        <p style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 18, color: 'var(--ink-soft)', marginTop: 8 }}>Two bumps → number 3!</p>
      </div>,
    },
    {
      title: 'Find the right door!',
      miloSays: 'I\'ll show you a number, and you find the door that shows it. Like this — the door says 5!',
      visual: <div style={{ display: 'flex', gap: 20, justifyContent: 'center' }}>
        {[3, 5, 7].map((n, i) => (
          <div key={n} style={{ width: 90, height: 140, borderRadius: '16px 16px 4px 4px', background: ['var(--milo-orange-soft)','var(--garden-green-soft)','var(--sky-blue-soft)'][i], border: `4px solid ${['var(--milo-orange)','var(--garden-green)','var(--sky-blue)'][i]}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: `0 6px 0 ${['var(--milo-orange-deep)','var(--garden-green-deep)','var(--sky-blue-deep)'][i]}`, position: 'relative' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 52, color: 'var(--ink)' }}>{n}</span>
            {n === 5 && <div style={{ position: 'absolute', top: -14, right: -14, fontSize: 28 }}>✅</div>}
          </div>
        ))}
      </div>,
    },
    {
      title: 'Numbers 6, 7, 8, 9, 10!',
      miloSays: 'Bigger numbers! 6, 7, 8, 9, 10. They all look different — learn their faces!',
      visual: <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        {[6,7,8,9,10].map((n, i) => (
          <NumberCard key={n} num={n} color={['var(--berry-purple)','var(--apple-red)','var(--milo-orange)','var(--garden-green)','var(--sky-blue)'][i]}
            soft={['var(--berry-purple-soft)','var(--apple-red-soft)','var(--milo-orange-soft)','var(--garden-green-soft)','var(--sky-blue-soft)'][i]} />
        ))}
      </div>,
    },
    {
      title: 'Now you find the numbers!',
      miloSays: 'I\'ll show you a number and you tap the right door. You\'re going to be amazing!',
      visual: <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 64, color: 'var(--berry-purple)' }}>🚪🚪🚪</div>
        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: 'var(--ink-soft)', marginTop: 8 }}>Which door shows the number?</p>
      </div>,
    },
  ],

  matchingQuantities: [
    {
      title: 'Matching means making groups the same size!',
      miloSays: 'If I want 3 apples, I put exactly 3 into the basket — not 2, not 4, exactly 3!',
      visual: <div style={{ display: 'flex', gap: 32, justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <EmojiRow items={['🍎','🍎','🍎']} size={44} />
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 36, color: 'var(--milo-orange)', marginTop: 6 }}>3</div>
        </div>
        <span style={{ fontSize: 32 }}>→</span>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 56 }}>🧺</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 36, color: 'var(--garden-green)', marginTop: 6 }}>3 ✓</div>
        </div>
      </div>,
    },
    {
      title: 'Count as you add!',
      miloSays: 'When I put apples in the basket, I count out loud: 1, 2, 3! Stop at the right number.',
      visual: <div style={{ textAlign: 'center' }}>
        <EmojiRow items={['🍎','🍎','🍎','🍎','🍎']} size={44} />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
          {['1','2','3','✓','✓'].map((n, i) => (
            <div key={i} style={{ width: 36, height: 36, borderRadius: '50%', background: i < 3 ? 'var(--garden-green)' : 'var(--cream)', border: '2px solid var(--outline)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 16, color: i < 3 ? '#fff' : 'var(--ink-muted)' }}>{n}</div>
          ))}
        </div>
        <p style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 16, color: 'var(--ink-soft)', marginTop: 8 }}>Stop at 3!</p>
      </div>,
    },
    {
      title: 'Too many or too few?',
      miloSays: 'We need 3, but I put in 5 — that\'s too many! We need to take 2 out.',
      visual: <div style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} style={{ fontSize: 40, opacity: i < 3 ? 1 : 0.3, filter: i >= 3 ? 'grayscale(1)' : 'none' }}>🍎</span>
          ))}
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, color: 'var(--apple-red)', marginTop: 12 }}>We have 5, but need 3 ❌</div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--ink-soft)', marginTop: 4 }}>Remove 2 🍎🍎 → perfect!</div>
      </div>,
    },
    {
      title: 'The number tells you how many!',
      miloSays: 'See the big number? That tells you exactly how many to put in. Number 4 → 4 apples!',
      visual: <div style={{ display: 'flex', gap: 32, justifyContent: 'center', alignItems: 'center' }}>
        <NumberCard num={4} color="var(--milo-orange)" soft="var(--milo-orange-soft)" label="We need 4" />
        <span style={{ fontSize: 32 }}>→</span>
        <div style={{ textAlign: 'center' }}>
          <EmojiRow items={['🍎','🍎','🍎','🍎']} size={40} />
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 28, color: 'var(--garden-green)', marginTop: 8 }}>4 ✅</div>
        </div>
      </div>,
    },
    {
      title: 'Your turn to fill the basket!',
      miloSays: 'Now you fill the basket. Tap the apples until you reach the right number!',
      visual: <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 64 }}>🧺</div>
        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: 'var(--milo-orange)', marginTop: 8 }}>Tap apples to fill it up!</p>
      </div>,
    },
  ],

  numberComparison: [
    {
      title: 'Bigger means MORE!',
      miloSays: '5 is BIGGER than 2, because 5 has more things in it. Look at the groups!',
      visual: <div style={{ display: 'flex', gap: 32, justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <EmojiRow items={Array(5).fill('🌟')} size={36} />
          <NumberCard num={5} color="var(--milo-orange)" soft="var(--milo-orange-soft)" label="Bigger!" />
        </div>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 40, color: 'var(--ink)' }}>{'>'}</span>
        <div style={{ textAlign: 'center' }}>
          <EmojiRow items={Array(2).fill('🌟')} size={36} />
          <NumberCard num={2} color="var(--sky-blue)" soft="var(--sky-blue-soft)" label="Smaller" />
        </div>
      </div>,
    },
    {
      title: 'Use the number line!',
      miloSays: 'On a number line, numbers further RIGHT are bigger. 7 is to the right of 4, so 7 is bigger!',
      visual: <div style={{ padding: '8px 0' }}>
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center', flexWrap: 'wrap' }}>
          {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
            <div key={n} style={{ width: 36, height: 36, borderRadius: '50%', background: n === 4 ? 'var(--sky-blue)' : n === 7 ? 'var(--milo-orange)' : 'var(--cream)', border: '2px solid var(--outline)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 15, color: [4,7].includes(n) ? '#fff' : 'var(--ink-muted)', transform: [4,7].includes(n) ? 'scale(1.25)' : 'scale(1)' }}>{n}</div>
          ))}
        </div>
        <p style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 16, color: 'var(--ink-soft)', marginTop: 10, textAlign: 'center' }}>7 is to the right of 4 → 7 is bigger!</p>
      </div>,
    },
    {
      title: 'Which group has more?',
      miloSays: 'Count both groups and see which has more! 3 frogs vs 6 frogs — 6 is more!',
      visual: <div style={{ display: 'flex', gap: 20, justifyContent: 'center', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ textAlign: 'center', background: 'var(--sky-blue-soft)', border: '3px solid var(--sky-blue)', borderRadius: 20, padding: '12px 16px' }}>
          <EmojiRow items={['🐸','🐸','🐸']} size={36} />
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 28, color: 'var(--sky-blue-deep)', marginTop: 6 }}>3</div>
        </div>
        <div style={{ textAlign: 'center', background: 'var(--garden-green-soft)', border: '3px solid var(--garden-green)', borderRadius: 20, padding: '12px 16px' }}>
          <EmojiRow items={['🐸','🐸','🐸','🐸','🐸','🐸']} size={36} />
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 28, color: 'var(--garden-green-deep)', marginTop: 6 }}>6 ✅ More!</div>
        </div>
      </div>,
    },
    {
      title: '> means bigger, < means smaller',
      miloSays: 'The crocodile mouth always opens to eat the BIGGER number! 8 > 3 means 8 is bigger.',
      visual: <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 64, color: 'var(--ink)', lineHeight: 1 }}>
          <span style={{ color: 'var(--milo-orange)' }}>8</span>
          <span style={{ color: 'var(--apple-red)', margin: '0 16px' }}>{'>'}</span>
          <span style={{ color: 'var(--sky-blue)' }}>3</span>
        </div>
        <p style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 18, color: 'var(--ink-soft)', marginTop: 10 }}>The mouth opens toward 8 — it\'s bigger! 🐊</p>
      </div>,
    },
    {
      title: 'Now you compare!',
      miloSays: 'Look at two groups and pick the bigger or smaller one. You\'re going to ace this!',
      visual: <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 64 }}>⚖️</div>
        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: 'var(--milo-orange)', marginTop: 8 }}>Which is bigger?</p>
      </div>,
    },
  ],

  shapes: [
    {
      title: 'Shapes are everywhere!',
      miloSays: 'A circle is round. A square has 4 equal sides. A triangle has 3 corners!',
      visual: <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
        <ShapeDisplay emoji="⭕" label="Circle" color="var(--sky-blue)" />
        <ShapeDisplay emoji="🟦" label="Square" color="var(--milo-orange)" />
        <ShapeDisplay emoji="🔺" label="Triangle" color="var(--garden-green)" />
      </div>,
    },
    {
      title: 'Count the corners!',
      miloSays: 'Corners are where two sides meet. Triangle → 3 corners. Square → 4 corners!',
      visual: <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: 72, lineHeight: 1 }}>🔺</span>
          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 20, color: 'var(--garden-green-deep)', marginTop: 6 }}>3 corners</p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: 72, lineHeight: 1 }}>🟦</span>
          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 20, color: 'var(--milo-orange-deep)', marginTop: 6 }}>4 corners</p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: 72, lineHeight: 1 }}>⭕</span>
          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 20, color: 'var(--sky-blue-deep)', marginTop: 6 }}>0 corners!</p>
        </div>
      </div>,
    },
    {
      title: 'Shapes in Milo\'s house!',
      miloSays: 'The roof is a triangle, the door is a rectangle, the windows are squares!',
      visual: <div style={{ textAlign: 'center', position: 'relative', height: 180 }}>
        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: 80, width: 0, height: 0, borderLeft: '70px solid transparent', borderRight: '70px solid transparent', borderBottom: '60px solid var(--apple-red)', filter: 'drop-shadow(0 -2px 0 var(--outline))' }} />
        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: 0, width: 130, height: 80, background: 'var(--milo-orange-soft)', border: '4px solid var(--outline)', borderRadius: '4px 4px 0 0', display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 28, height: 28, background: 'var(--sky-blue-soft)', border: '3px solid var(--sky-blue)' }} />
          <div style={{ width: 22, height: 40, background: 'var(--garden-green-soft)', border: '3px solid var(--garden-green)' }} />
          <div style={{ width: 28, height: 28, background: 'var(--sky-blue-soft)', border: '3px solid var(--sky-blue)' }} />
        </div>
      </div>,
    },
    {
      title: 'More shapes — star and heart!',
      miloSays: 'Stars have 5 points! Hearts are round with a dip at the top. Match them to their slots!',
      visual: <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
        <ShapeDisplay emoji="⭐" label="Star — 5 points!" color="var(--sun-yellow-deep)" />
        <ShapeDisplay emoji="❤️" label="Heart — round!" color="var(--apple-red)" />
      </div>,
    },
    {
      title: 'Now match the shapes!',
      miloSays: 'Tap a shape, then tap the matching slot. You\'ll build Milo\'s house!',
      visual: <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 60 }}>🏠</div>
        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: 'var(--milo-orange)', marginTop: 8 }}>Build the house with shapes!</p>
      </div>,
    },
  ],

  colors: [
    {
      title: 'Colors are everywhere!',
      miloSays: 'Red, blue, green, yellow — these are primary colors. Let\'s learn them all!',
      visual: <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
        {[['Red','#E64545'],['Blue','#5BC3F0'],['Green','#6FBE3F'],['Yellow','#FFC933']].map(([label, hex]) => (
          <ColorFlower key={label} color={hex} label={label} />
        ))}
      </div>,
    },
    {
      title: 'Mixing red and blue makes purple!',
      miloSays: 'When we mix two colors we get a new one! Red + Blue = Purple. Magic!',
      visual: <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div style={{ width: 70, height: 70, borderRadius: '50%', background: '#E64545', border: '4px solid var(--outline)' }} />
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 36, color: 'var(--ink)' }}>+</span>
        <div style={{ width: 70, height: 70, borderRadius: '50%', background: '#5BC3F0', border: '4px solid var(--outline)' }} />
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 36, color: 'var(--ink)' }}>=</span>
        <div style={{ width: 70, height: 70, borderRadius: '50%', background: '#9362D8', border: '4px solid var(--outline)', animation: 'bounce-in 400ms cubic-bezier(.34,1.56,.64,1) 600ms both' }} />
      </div>,
    },
    {
      title: 'Pick the right color bucket!',
      miloSays: 'I\'ll show you a flower and you pick the right paint bucket to color it!',
      visual: <div style={{ display: 'flex', gap: 20, justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ fontSize: 72 }}>🌸</div>
        <span style={{ fontSize: 28 }}>→</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[['var(--apple-red)','red'],['var(--sky-blue)','blue'],['var(--garden-green)','green']].map(([col, label]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: col, border: '2px solid var(--outline)' }} />
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--ink)', textTransform: 'capitalize' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>,
    },
    {
      title: 'Red + Yellow = Orange!',
      miloSays: 'Another mix! Red and Yellow together make Orange. Like Milo\'s fur! 🦊',
      visual: <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div style={{ width: 70, height: 70, borderRadius: '50%', background: '#E64545', border: '4px solid var(--outline)' }} />
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 36 }}>+</span>
        <div style={{ width: 70, height: 70, borderRadius: '50%', background: '#FFC933', border: '4px solid var(--outline)' }} />
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 36 }}>=</span>
        <div style={{ width: 70, height: 70, borderRadius: '50%', background: '#F26B2C', border: '4px solid var(--outline)', animation: 'bounce-in 400ms cubic-bezier(.34,1.56,.64,1) 600ms both' }} />
      </div>,
    },
    {
      title: 'Color the garden!',
      miloSays: 'Now pick the right bucket and paint the flowers. Let\'s make a beautiful garden!',
      visual: <div style={{ textAlign: 'center' }}>
        <EmojiRow items={['🌸','🌼','🌺','🌻']} size={52} />
        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: 'var(--milo-orange)', marginTop: 10 }}>Pick the right color!</p>
      </div>,
    },
  ],

  patterns: [
    {
      title: 'A pattern repeats over and over!',
      miloSays: 'Red, Blue, Red, Blue… it keeps going! That\'s a pattern — it REPEATS!',
      visual: <PatternRow items={['🔴','🔵','🔴','🔵','🔴','🔵']} showNext />,
    },
    {
      title: 'What comes next?',
      miloSays: 'Star, Moon, Star, Moon… what comes next? STAR! The pattern starts again!',
      visual: <div>
        <PatternRow items={['⭐','🌙','⭐','🌙','⭐']} showNext />
        <p style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 20, color: 'var(--garden-green)', marginTop: 12 }}>Next is ⭐! The pattern repeats!</p>
      </div>,
    },
    {
      title: 'Find the missing piece!',
      miloSays: 'Butterfly, Flower, ?, Flower, Butterfly, Flower. What\'s hiding in the middle?',
      visual: <div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
          {['🦋','🌸',null,'🌸','🦋','🌸'].map((em, i) => (
            em ? <span key={i} style={{ fontSize: 40 }}>{em}</span>
              : <div key={i} style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--sun-yellow-soft)', border: '3px dashed var(--sun-yellow-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, animation: 'tap-pulse 1.4s ease-in-out infinite' }}>?</div>
          ))}
        </div>
        <p style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 20, color: 'var(--milo-orange)', marginTop: 12 }}>It's 🦋 — the butterfly!</p>
      </div>,
    },
    {
      title: 'Find the odd one out!',
      miloSays: 'One of these doesn\'t belong! 🔴🔵🔴🍎🔴🔵 — the apple doesn\'t fit the pattern!',
      visual: <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center' }}>
        {['🔴','🔵','🔴','🍎','🔴','🔵'].map((em, i) => (
          <span key={i} style={{ fontSize: 40, background: em === '🍎' ? 'var(--apple-red-soft)' : 'transparent', borderRadius: 12, padding: 4, border: em === '🍎' ? '3px solid var(--apple-red)' : '3px solid transparent' }}>{em}</span>
        ))}
      </div>,
    },
    {
      title: 'Spot the patterns!',
      miloSays: 'Now it\'s your turn! Find what comes next or spot the odd one out!',
      visual: <div style={{ textAlign: 'center' }}>
        <PatternRow items={['🌟','🌙','🌟','🌙']} />
        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: 'var(--milo-orange)', marginTop: 10 }}>What comes next?</p>
      </div>,
    },
  ],

  addition: [
    {
      title: 'Adding means putting together!',
      miloSays: '2 apples plus 3 apples makes 5 apples altogether. We ADD them together!',
      visual: <AddScene a={2} aEmoji="🍎" b={3} showResult />,
    },
    {
      title: 'Count them all together!',
      miloSays: 'When we add, we count ALL of them: 1, 2 from the first group, then 3, 4, 5 from the second!',
      visual: <div style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          {['⭐','⭐','⭐','⭐','⭐'].map((em, i) => (
            <div key={i} style={{ position: 'relative' }}>
              <span style={{ fontSize: 40 }}>{em}</span>
              <div style={{ position: 'absolute', top: -8, right: -8, width: 22, height: 22, borderRadius: '50%', background: i < 2 ? 'var(--sky-blue)' : 'var(--garden-green)', border: '2px solid var(--outline)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 11, color: '#fff' }}>{i + 1}</div>
            </div>
          ))}
        </div>
        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 24, color: 'var(--milo-orange)', marginTop: 12 }}>2 + 3 = 5! ✅</p>
      </div>,
    },
    {
      title: 'Adding 0 — nothing changes!',
      miloSays: '3 frogs plus 0 frogs is still 3 frogs! Adding nothing doesn\'t change anything.',
      visual: <AddScene a={3} aEmoji="🐸" b={0} showResult />,
    },
    {
      title: 'The order doesn\'t matter!',
      miloSays: '2 + 3 is the same as 3 + 2. Both equal 5! You can add in any order.',
      visual: <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        <AddScene a={2} aEmoji="🌸" b={3} showResult />
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 20, color: 'var(--ink-soft)' }}>same as…</div>
        <AddScene a={3} aEmoji="🌸" b={2} showResult />
      </div>,
    },
    {
      title: 'Now you add!',
      miloSays: 'Watch the emojis appear and count them all up. Then tap the right answer!',
      visual: <div style={{ textAlign: 'center' }}>
        <AddScene a={1} aEmoji="🍪" b={2} showResult />
        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: 'var(--milo-orange)', marginTop: 10 }}>1 + 2 = 3! ✅</p>
      </div>,
    },
  ],

  subtraction: [
    {
      title: 'Subtracting means taking away!',
      miloSays: '5 fireflies, then 2 fly away. We SUBTRACT — take away — 2 from 5!',
      visual: <SubScene total={5} take={2} emoji="✨" />,
    },
    {
      title: 'Count what\'s left!',
      miloSays: 'After taking away, count the ones that are LEFT. Those are the answer!',
      visual: <div style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <span key={i} style={{ fontSize: 40, opacity: i >= 2 ? 0.2 : 1, filter: i >= 2 ? 'grayscale(1)' : 'none' }}>🍎</span>
          ))}
        </div>
        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, color: 'var(--ink)', marginTop: 10 }}>4 − 2 = <span style={{ color: 'var(--garden-green)', fontSize: 32 }}>2</span> left!</p>
      </div>,
    },
    {
      title: 'The minus sign − means take away!',
      miloSays: '6 − 3 = 3. The minus sign tells us to take away 3 from 6.',
      visual: <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 72, lineHeight: 1 }}>
          <span style={{ color: 'var(--milo-orange)' }}>6</span>
          <span style={{ color: 'var(--apple-red)', margin: '0 16px' }}>−</span>
          <span style={{ color: 'var(--sky-blue)' }}>3</span>
          <span style={{ color: 'var(--ink-soft)', margin: '0 16px' }}>=</span>
          <span style={{ color: 'var(--garden-green)' }}>3</span>
        </div>
        <p style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 16, color: 'var(--ink-soft)', marginTop: 8 }}>Take 3 away from 6 → 3 left!</p>
      </div>,
    },
    {
      title: 'Subtracting 0 — nothing changes!',
      miloSays: '5 minus 0 is still 5! If nothing flies away, they all stay!',
      visual: <SubScene total={5} take={0} emoji="🌟" />,
    },
    {
      title: 'Now you subtract!',
      miloSays: 'Watch the emojis fly away, then count how many are left and pick the answer!',
      visual: <SubScene total={4} take={1} emoji="🎈" />,
    },
  ],

  measurement: [
    {
      title: 'Taller means it goes up higher!',
      miloSays: 'The red tower is TALLER — it has more blocks and goes higher up!',
      visual: <TowerPair aH={7} bH={4} aLabel="Red Tower" bLabel="Blue Tower" aColor="var(--apple-red)" bColor="var(--sky-blue)" />,
    },
    {
      title: 'Shorter means it doesn\'t go as high!',
      miloSays: 'Now the blue tower is SHORTER. It has fewer blocks and doesn\'t reach as high.',
      visual: <TowerPair aH={3} bH={6} aLabel="Green" bLabel="Yellow" aColor="var(--garden-green)" bColor="var(--sun-yellow)" />,
    },
    {
      title: 'Heavier means it weighs more!',
      miloSays: 'An elephant is HEAVIER than a mouse. The heavy side of the scale goes down!',
      visual: <div style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 40, alignItems: 'flex-end', marginBottom: 12 }}>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: 64 }}>🐘</span>
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 16, color: 'var(--ink-soft)' }}>Heavy! ⬇️</p>
          </div>
          <div style={{ fontSize: 40 }}>⚖️</div>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: 64 }}>🐭</span>
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 16, color: 'var(--ink-soft)' }}>Light! ⬆️</p>
          </div>
        </div>
      </div>,
    },
    {
      title: 'Longer means it stretches further!',
      miloSays: 'A snake is LONGER than a worm. We can measure length with a ruler!',
      visual: <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '0 16px' }}>
        {[{ label: '🐍 Snake', pct: 90, col: 'var(--garden-green)' }, { label: '🪱 Worm', pct: 35, col: 'var(--milo-orange)' }].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, width: 80 }}>{item.label}</span>
            <div style={{ flex: 1, height: 24, background: 'var(--cream)', border: '2px solid var(--outline)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${item.pct}%`, background: item.col, borderRadius: 999, transition: 'width 800ms ease' }} />
            </div>
          </div>
        ))}
      </div>,
    },
    {
      title: 'Now you compare!',
      miloSays: 'Look at each pair and tell me — which is taller, heavier, or longer? You\'ve got this!',
      visual: <div style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', gap: 24, justifyContent: 'center', fontSize: 56 }}>
          <span>📏</span><span>⚖️</span><span>📐</span>
        </div>
        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: 'var(--milo-orange)', marginTop: 10 }}>Tall, short, heavy, light, long!</p>
      </div>,
    },
  ],
}

export function getLessonExamples(chapter: ChapterType): LessonExample[] {
  return LESSONS[chapter] ?? LESSONS.counting
}