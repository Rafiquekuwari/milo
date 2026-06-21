/**
 * Story-mode chapter definitions. Each Chapter is an ordered list of beats played
 * by <ForestWalk>. Shared by the standalone /story preview page and the in-game
 * chapter (so the menu's "Counting" launches this exact experience).
 */
import { type Chapter } from './ForestWalk'
import { practiceCountBeat } from './world1'

// Counting — "Milo's Counting Journey". The teaching is fixed and always runs the
// same way (only the visuals change):
//   1. Milo counts up to 10 by himself (fireflies)            — the explanation.
//   2. The child taps to count up to 10 (butterflies)         — guided practice.
//   3. Milo counts a smaller number by himself (dragonflies → 5)— shows it's not always 10.
// Then ONE scored practice of 10 adaptive "how many?" questions (practiceCountBeat).
// That single practice carries the whole pedagogy unbroken: right answers make it
// harder, struggling makes it easier, and 3 wrong in a row triggers Milo's
// re-explanation. The biome rotates inside the practice (forest→pond→sky→garden) for
// variety, but it stays one continuous adaptive sequence. XP comes from this practice.
export const countingChapter: Chapter = {
  id: 'counting',
  title: "Milo's Counting Journey",
  beats: [
    { kind: 'say', text: "Let's learn to count in the forest!", biome: 'forest' },
    { kind: 'count', to: 10, obj: 'firefly', biome: 'forest' },   // 1. Milo counts to 10
    { kind: 'guide', n: 10, obj: 'butterfly', biome: 'forest' },  // 2. child taps to count to 10
    { kind: 'catch', beat: practiceCountBeat, biome: 'forest' },  // 3–4. scored adaptive practice (10 Qs)
    { kind: 'say', text: 'You counted everywhere! You are a counting star! 🌟', biome: 'garden' },
  ],
}

// Number Order (Chapter 2) is no longer a ForestWalk chapter — it was redesigned as the
// top-down RiverCrossing experience. See story/RiverCrossing.tsx (wrapped by
// game/NumberOrderingChapter.tsx).
