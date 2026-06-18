/**
 * Story-mode chapter definitions. Each Chapter is an ordered list of beats played
 * by <ForestWalk>. Shared by the standalone /story preview page and the in-game
 * chapter (so the menu's "Counting" launches this exact experience).
 */
import { type Chapter } from './ForestWalk'
import { practiceCountBeat } from './world1'

// Counting — "Chapter 1". Three teaching slides flow straight into the practice,
// all auto-advancing (no Next buttons):
//   1. Milo counts 1→10 by himself (fireflies).
//   2. "Now you count!" — the child taps all 10 (butterflies).
//   3. A smaller number, to show counting isn't always to ten (pigeons → 5).
// Then the scored practice: 10 adaptive "how many?" questions, with Milo
// re-explaining (counting them out) after 3 wrong in a row. XP comes from these.
export const countingChapter: Chapter = {
  id: 'counting',
  title: 'Counting in the Forest',
  beats: [
    { kind: 'say', text: "Let's learn to count in the forest!" },
    { kind: 'count', to: 10, obj: 'firefly' },
    { kind: 'walk', ms: 2600 },                 // Milo walks a few steps to the next spot
    { kind: 'guide', n: 10, obj: 'butterfly' },
    { kind: 'walk', ms: 2600 },
    { kind: 'count', to: 5, obj: 'pigeon' },
    { kind: 'walk', ms: 3000 },
    { kind: 'catch', beat: practiceCountBeat }, // 10 questions; Milo walks every 2 (walkEvery)
    { kind: 'say', text: 'You are a counting star! 🌟' },
  ],
}
