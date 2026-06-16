/**
 * Single source of truth for chapters.
 *
 * Every surface (menu, chapter picker, parent dashboard, game) derives its
 * chapter list and metadata from the CHAPTERS array below — there are no more
 * copies scattered across files.
 *
 *   • Adding a chapter      → add one entry here (+ wire its component in
 *                             src/app/game/page.tsx and its lesson in
 *                             src/lib/lessons.tsx).
 *   • Adding an age group   → tag the relevant entries with its key in
 *                             `ageGroups`, then add the key to AgeGroup.
 *
 * This file holds DATA only (no React imports) so it stays cheap to import
 * from any page.
 */

export type AgeGroup = '3-5' | '6-8'

export type ChapterType =
  // 3–5
  | 'counting' | 'numberOrdering' | 'numberRecognition'
  | 'matchingQuantities' | 'numberComparison' | 'shapes'
  | 'colors' | 'patterns' | 'addition' | 'subtraction' | 'measurement'
  // 6–8
  | 'numbersTo100' | 'placeValue' | 'skipCounting' | 'storyProblems' | 'multiplication' | 'fractions' | 'money' | 'time'
  | 'compareNumbers' | 'additionTo100' | 'subtractionTo100' | 'shapes2d3d'

export interface ChapterMeta {
  id:          ChapterType
  name:        string        // full display name (menu + picker)
  parentLabel: string        // shorter label for the parent dashboard
  emoji:       string        // chapter icon
  asset:       string        // image on the menu "next up" card
  hint:        string        // one-line hint in the chapter picker
  ageGroups:   AgeGroup[]    // which age groups this chapter belongs to
}

/**
 * Ordered list. Array order IS the play order (was CHAPTER_ORDER).
 * All current chapters belong to the 3–5 group.
 */
export const CHAPTERS: ChapterMeta[] = [
  { id: 'counting',           name: 'Counting',           parentLabel: 'Counting',          emoji: '🌟', asset: '/assets/objects/firefly.png',        hint: 'Tap each one to count!',     ageGroups: ['3-5'] },
  { id: 'numberOrdering',     name: 'Number Order',       parentLabel: 'Number Order',      emoji: '🔢', asset: '/assets/objects/star.png',           hint: 'Put numbers in order!',      ageGroups: ['3-5'] },
  { id: 'numberRecognition',  name: 'Number Doors',       parentLabel: 'Number Doors',      emoji: '🚪', asset: '/assets/objects/star.png',           hint: 'Open the right number.',     ageGroups: ['3-5'] },
  { id: 'matchingQuantities', name: 'Apple Basket',       parentLabel: 'Apple Basket',      emoji: '🍎', asset: '/assets/objects/basket.png',         hint: 'Put N apples in the basket.', ageGroups: ['3-5'] },
  { id: 'numberComparison',   name: 'Bigger or Smaller',  parentLabel: 'Bigger or Smaller', emoji: '⚖️', asset: '/assets/objects/star-alt.png',       hint: 'Which is bigger?',           ageGroups: ['3-5'] },
  { id: 'shapes',             name: 'Shape House',        parentLabel: 'Shape House',       emoji: '🏠', asset: '/assets/shapes/house-complete.png',  hint: "Build Milo's house.",        ageGroups: ['3-5'] },
  { id: 'colors',             name: 'Color Garden',       parentLabel: 'Color Garden',      emoji: '🌈', asset: '/assets/objects/flower-red.png',     hint: 'Paint the flowers!',         ageGroups: ['3-5'] },
  { id: 'patterns',           name: 'Patterns',           parentLabel: 'Patterns',          emoji: '🔷', asset: '/assets/objects/star.png',           hint: 'Find what comes next!',      ageGroups: ['3-5'] },
  { id: 'addition',           name: 'Simple Addition',    parentLabel: 'Addition',          emoji: '➕', asset: '/assets/objects/apple.png',          hint: 'Add apples together!',       ageGroups: ['3-5'] },
  { id: 'subtraction',        name: 'Simple Subtraction', parentLabel: 'Subtraction',       emoji: '➖', asset: '/assets/objects/firefly.png',        hint: 'How many are left?',         ageGroups: ['3-5'] },
  { id: 'measurement',        name: 'Measurement',        parentLabel: 'Measurement',       emoji: '📏', asset: '/assets/objects/star.png',           hint: 'Tall, short, heavy, light!', ageGroups: ['3-5'] },

  // ── 6–8 ──
  { id: 'numbersTo100',       name: 'Numbers to 100',     parentLabel: 'Numbers to 100',    emoji: '💯', asset: '/assets/objects/star.png',           hint: 'Read big numbers up to 100!', ageGroups: ['6-8'] },
  { id: 'placeValue',         name: 'Tens & Ones',        parentLabel: 'Tens & Ones',       emoji: '🧱', asset: '/assets/objects/star.png',           hint: 'Tens and ones make a number!', ageGroups: ['6-8'] },
  { id: 'skipCounting',       name: 'Skip Counting',      parentLabel: 'Skip Counting',     emoji: '🐰', asset: '/assets/objects/star.png',           hint: 'Count by 2s, 5s and 10s!', ageGroups: ['6-8'] },
  { id: 'storyProblems',      name: 'Story Problems',     parentLabel: 'Story Problems',    emoji: '📖', asset: '/assets/objects/apple.png',          hint: 'Listen, then add or take away!', ageGroups: ['6-8'] },
  { id: 'multiplication',     name: 'Multiplication',     parentLabel: 'Multiplication',    emoji: '✖️', asset: '/assets/objects/star.png',           hint: 'Equal groups make multiplying!', ageGroups: ['6-8'] },
  { id: 'fractions',          name: 'Fractions',          parentLabel: 'Fractions',         emoji: '🍕', asset: '/assets/objects/apple.png',          hint: 'Halves, thirds and quarters!', ageGroups: ['6-8'] },
  { id: 'money',              name: 'Money',              parentLabel: 'Money',             emoji: '🪙', asset: '/assets/objects/star.png',           hint: 'Count the coins!', ageGroups: ['6-8'] },
  { id: 'time',               name: 'Time',               parentLabel: 'Time',              emoji: '🕐', asset: '/assets/objects/star.png',           hint: 'Read the clock!', ageGroups: ['6-8'] },
  { id: 'compareNumbers',     name: 'Compare Numbers',    parentLabel: 'Compare Numbers',   emoji: '⚖️', asset: '/assets/objects/star-alt.png',       hint: 'Bigger, smaller or equal?', ageGroups: ['6-8'] },
  { id: 'additionTo100',      name: 'Add to 100',         parentLabel: 'Add to 100',        emoji: '➕', asset: '/assets/objects/apple.png',          hint: 'Add two-digit numbers!', ageGroups: ['6-8'] },
  { id: 'subtractionTo100',   name: 'Subtract to 100',    parentLabel: 'Subtract to 100',   emoji: '➖', asset: '/assets/objects/firefly.png',        hint: 'Subtract two-digit numbers!', ageGroups: ['6-8'] },
  { id: 'shapes2d3d',         name: 'Shapes 2D & 3D',     parentLabel: 'Shapes 2D & 3D',    emoji: '🔷', asset: '/assets/shapes/house-complete.png',  hint: 'Name shapes and count sides!', ageGroups: ['6-8'] },
]

// ── Lookups ──────────────────────────────────────────────────────────────
const BY_ID: Record<ChapterType, ChapterMeta> =
  Object.fromEntries(CHAPTERS.map(c => [c.id, c])) as Record<ChapterType, ChapterMeta>

export const CHAPTER_IDS: ChapterType[] = CHAPTERS.map(c => c.id)

export function getChapter(id: ChapterType): ChapterMeta {
  return BY_ID[id]
}

/** Chapters belonging to an age group, in play order. */
export function chaptersForAge(age: AgeGroup): ChapterMeta[] {
  return CHAPTERS.filter(c => c.ageGroups.includes(age))
}

// ── Back-compat derived maps (so existing imports keep working) ────────────
export const CHAPTER_ORDER: ChapterType[] = CHAPTER_IDS

export const CHAPTER_NAMES = Object.fromEntries(
  CHAPTERS.map(c => [c.id, c.name]),
) as Record<ChapterType, string>

export const CHAPTER_EMOJIS = Object.fromEntries(
  CHAPTERS.map(c => [c.id, c.emoji]),
) as Record<ChapterType, string>

export const CHAPTER_ASSETS = Object.fromEntries(
  CHAPTERS.map(c => [c.id, c.asset]),
) as Record<ChapterType, string>

export const CHAPTER_PARENT_LABELS = Object.fromEntries(
  CHAPTERS.map(c => [c.id, c.parentLabel]),
) as Record<ChapterType, string>
