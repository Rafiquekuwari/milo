/**
 * Biomes — the places Milo travels through in the counting journey. Each place has
 * its own background, its own 3 creatures, and its own SPAWN BAND (where those
 * creatures sit on screen): fish low on the water, birds high in the sky, bugs in
 * the leaves. The math (how many to count) is the same everywhere — only the place
 * and creatures rotate, so 10 questions never feel repetitive.
 *
 * Biomes are grouped into STORYTELLINGS (themed journeys): a session plays ONE
 * storytelling — Nature Walk, Farm Day, or Space Adventure — and rotates through
 * ITS three biomes. A returning child round-robins to the next storytelling, so the
 * counting chapter looks different every visit (3 storytellings × 3 backgrounds ×
 * 3 objects). The teaching is identical across all three; only the world changes.
 *
 * Backgrounds: `bgImage` biomes use a painted JPEG/PNG; the others render a tasteful
 * gradient placeholder (see <BiomeBackground> in ForestWalk) and upgrade to painted
 * art the moment a `bgImage` is added here — same deal as the emoji creatures.
 */
import { type CountKind } from './art'

export type BiomeId =
  // Storytelling 1 — Nature Walk
  | 'forest' | 'underwater' | 'garden'
  // Storytelling 2 — Farm Day
  | 'barnyard' | 'orchard' | 'pond'
  // Storytelling 3 — Space Adventure
  | 'launchpad' | 'deepspace' | 'moon'

// Spawn window in viewport %, where this biome's creatures scatter.
export interface Band { x0: number; x1: number; y0: number; y1: number }

export interface Biome {
  id: BiomeId
  label: string
  emoji: string                 // shown on the "you reached…" banner
  arrive: string                // Milo's line when he walks in
  objects: CountKind[]          // the 3 creatures of this place
  band: Band
  bgImage?: string              // painted background (tiled+scrolled); absent → gradient placeholder
}

export const BIOMES: Record<BiomeId, Biome> = {
  // ── Storytelling 1: Nature Walk ──────────────────────────────
  forest: {
    id: 'forest', label: 'Forest', emoji: '🌳',
    arrive: "We're in the forest! Let's count what we find.",
    objects: ['butterfly', 'firefly', 'rabbit', 'eagle'],   // eagles perch in the treetops
    band: { x0: 13, x1: 84, y0: 9, y1: 71 },        // in the leaves (mid); x1 pulled in so big sprites stay on-screen
    bgImage: '/assets/backgrounds/forest_1.jpeg',
  },
  underwater: {
    id: 'underwater', label: 'Underwater', emoji: '🐠',
    arrive: "We're underwater! What can we find here?",
    objects: ['fish', 'turtle', 'shark', 'crab'],   // shark replaces octopus
    band: { x0: 10, x1: 84, y0: 15, y1: 78 },        // spread across the full depth
    bgImage: '/assets/backgrounds/underwater.jpeg',
  },
  garden: {
    id: 'garden', label: 'Garden', emoji: '🌷',
    arrive: 'A flower garden! Tiny friends everywhere.',
    objects: ['squirrel', 'ant', 'ladybug'],   // snail removed; ladybug replaces it
    band: { x0: 20, x1: 84, y0: 40, y1: 79 },        // low-mid, on the grass
    bgImage: '/assets/backgrounds/garden.png',
  },

  // ── Storytelling 2: Farm Day ─────────────────────────────────
  barnyard: {
    id: 'barnyard', label: 'Barnyard', emoji: '🐔',
    arrive: "We're at the barnyard! Let's count the little animals.",
    objects: ['chick', 'lamb', 'duckling'],
    band: { x0: 18, x1: 88, y0: 50, y1: 88 },        // across the big open grass field (low-horizon bg; clears the barn on the left)
    bgImage: '/assets/backgrounds/farm_barnyard.png',
  },
  orchard: {
    id: 'orchard', label: 'Orchard', emoji: '🍎',
    arrive: 'The orchard! Fruit on the trees and busy bees.',
    objects: ['apple', 'pear', 'bee'],
    band: { x0: 14, x1: 84, y0: 16, y1: 74 },        // up in the trees + bees buzzing
    bgImage: '/assets/backgrounds/farm_orchard.png',
  },
  pond: {
    id: 'pond', label: 'Pond', emoji: '🦆',
    arrive: "A pond! Let's count who lives by the water.",
    objects: ['frog', 'duck', 'dragonfly'],
    band: { x0: 12, x1: 84, y0: 30, y1: 80 },        // water + reeds
    bgImage: '/assets/backgrounds/farm_pond.png',
  },

  // ── Storytelling 3: Space Adventure ──────────────────────────
  launchpad: {
    id: 'launchpad', label: 'Launchpad', emoji: '🚀',
    arrive: "We're at the launchpad! Ready to count to the stars?",
    objects: ['rocket', 'star', 'cloud'],
    band: { x0: 14, x1: 84, y0: 14, y1: 74 },        // rockets rising, stars + clouds in the sky
    bgImage: '/assets/backgrounds/space_launchpad.png',
  },
  deepspace: {
    id: 'deepspace', label: 'Deep Space', emoji: '🪐',
    arrive: "We're out in deep space! Look at everything floating.",
    objects: ['planet', 'comet', 'satellite'],
    band: { x0: 10, x1: 86, y0: 12, y1: 78 },        // floating across the whole frame
    bgImage: '/assets/backgrounds/space_deepspace.png',
  },
  moon: {
    id: 'moon', label: 'The Moon', emoji: '🌙',
    arrive: 'We landed on the Moon! Who and what can we count?',
    objects: ['astronaut', 'moonRock', 'alien'],
    band: { x0: 16, x1: 86, y0: 60, y1: 85 },        // standing on the moon's surface
    bgImage: '/assets/backgrounds/space_moon.png',
  },
}

// ── Storytellings (themed journeys) ──────────────────────────────
// A session plays ONE storytelling and rotates through its three biomes. demoCount /
// demoGuide are the creatures Milo counts in the opening demo + guided slide (both
// drawn from the FIRST biome, so the demo happens "here" before the walk); they're
// kept OUT of that storytelling's practice pool so a session never repeats a creature.
export interface Storytelling {
  id: string
  label: string                 // chapter title for this run
  emoji: string
  biomes: BiomeId[]             // its 3 biomes, in walk order
  demoCount: CountKind          // Milo counts these to 10 (the explanation)
  demoGuide: CountKind          // child taps these to 10 (guided practice)
  intro: string                 // Milo's opening line
  outro: string                 // Milo's closing line
}

export const STORYTELLINGS: Storytelling[] = [
  {
    id: 'nature', label: "Milo's Counting Journey", emoji: '🌳',
    biomes: ['forest', 'underwater', 'garden'],
    demoCount: 'firefly', demoGuide: 'butterfly',
    intro: "Let's learn to count in the forest!",
    outro: 'You counted everywhere! You are a counting star! 🌟',
  },
  {
    id: 'farm', label: "Milo's Farm Day", emoji: '🐔',
    biomes: ['barnyard', 'orchard', 'pond'],
    demoCount: 'chick', demoGuide: 'duckling',
    intro: "Welcome to Milo's farm! Let's count the animals together!",
    outro: 'You counted the whole farm! Wonderful counting! 🌟',
  },
  {
    id: 'space', label: "Milo's Space Adventure", emoji: '🚀',
    biomes: ['launchpad', 'deepspace', 'moon'],
    demoCount: 'star', demoGuide: 'rocket',
    intro: "Blast off! Let's count our way through space!",
    outro: "You counted across the whole galaxy! You're a counting astronaut! 🚀",
  },
]

// Round-robin the storytelling per session so a returning child gets a different
// world each visit (and a "play again" advances to the next theme). Persisted in
// localStorage; falls back to the first storytelling on the server / when storage
// is unavailable.
const STORY_KEY = 'milo.counting.storyIdx'
export function pickStorytelling(): Storytelling {
  if (typeof window === 'undefined') return STORYTELLINGS[0]
  let prev = -1
  try { prev = parseInt(window.localStorage.getItem(STORY_KEY) || '-1', 10) } catch { /* storage blocked */ }
  if (!Number.isFinite(prev)) prev = -1
  const next = (prev + 1) % STORYTELLINGS.length
  try { window.localStorage.setItem(STORY_KEY, String(next)) } catch { /* storage blocked */ }
  return STORYTELLINGS[next]
}

export function storytellingById(id: string | null | undefined): Storytelling | undefined {
  return STORYTELLINGS.find(s => s.id === id)
}

// Nature Walk's biomes — kept as the default rotation/background order for any caller
// that doesn't yet thread a storytelling through (back-compat).
export const BIOME_ORDER: BiomeId[] = ['forest', 'underwater', 'garden']
