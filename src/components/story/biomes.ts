/**
 * Biomes — the places Milo travels through in the counting journey. Each place has
 * its own background, its own 3 creatures, and its own SPAWN BAND (where those
 * creatures sit on screen): fish low on the water, birds high in the sky, bugs in
 * the leaves. The math (how many to count) is the same everywhere — only the place
 * and creatures rotate, so 10 questions never feel repetitive.
 *
 * Backgrounds: `bgImage` biomes use a painted JPEG/PNG; the others render a tasteful
 * gradient placeholder (see <BiomeBackground> in ForestWalk) and upgrade to painted
 * art the moment a `bgImage` is added here — same deal as the emoji creatures.
 */
import { type CountKind } from './art'

export type BiomeId = 'forest' | 'underwater' | 'garden'

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
}

export const BIOME_ORDER: BiomeId[] = ['forest', 'underwater', 'garden']
