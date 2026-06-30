/**
 * Story-mode chapter definitions. Each Chapter is an ordered list of beats played
 * by <ForestWalk>. Shared by the standalone /story preview page and the in-game
 * chapter (so the menu's "Counting" launches this exact experience).
 */
import { type Chapter } from './ForestWalk'
import { makePracticeCountBeat } from './world1'
import { type Storytelling, STORYTELLINGS } from './biomes'

// Counting — built per STORYTELLING (Nature Walk · Farm Day · Space Adventure). The
// teaching is identical across all three; only the world changes (3 storytellings ×
// 3 backgrounds × 3 objects), so a returning child never sees the same run twice:
//   1. Milo counts up to 10 by himself (the storytelling's demoCount) — the explanation.
//   2. The child taps to count up to 10 (its demoGuide)               — guided practice.
//   Then ONE scored adaptive "how many?" practice (makePracticeCountBeat). That single
//   practice carries the whole pedagogy unbroken: right answers make it harder,
//   struggling makes it easier, and 3 wrong in a row triggers Milo's re-explanation.
//   The biome cross-fades round-to-round through the storytelling's three places.
// XP comes from this practice. `biomes` tells ForestWalk which backgrounds to stack.
export function makeCountingChapter(story: Storytelling): Chapter {
  const first = story.biomes[0]
  const last = story.biomes[story.biomes.length - 1]
  return {
    id: 'counting',
    title: story.label,
    biomes: story.biomes,
    beats: [
      { kind: 'say', text: story.intro, biome: first },
      { kind: 'count', to: 10, obj: story.demoCount, biome: first },   // 1. Milo counts to 10
      { kind: 'guide', n: 10, obj: story.demoGuide, biome: first },    // 2. child taps to count to 10
      { kind: 'catch', beat: makePracticeCountBeat(story), biome: first },  // 3. scored adaptive practice
      { kind: 'say', text: story.outro, biome: last },
    ],
  }
}

// Nature Walk as a static default — for any caller that doesn't pick a storytelling.
export const countingChapter: Chapter = makeCountingChapter(STORYTELLINGS[0])

// Number Order (Chapter 2) is no longer a ForestWalk chapter — it was redesigned as the
// top-down RiverCrossing experience. See story/RiverCrossing.tsx (wrapped by
// game/NumberOrderingChapter.tsx).
