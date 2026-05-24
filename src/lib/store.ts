import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { getActiveLearner } from './supabase/useLearnerSession'

// ─────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────

export type AvatarIndex = 0 | 1 | 2 | 3
export type ChapterType =
  | 'counting' | 'numberOrdering' | 'numberRecognition'
  | 'matchingQuantities' | 'numberComparison' | 'shapes'
  | 'colors' | 'patterns' | 'addition' | 'subtraction' | 'measurement'

export interface ChapterStars {
  counting: number; numberOrdering: number; numberRecognition: number
  matchingQuantities: number; numberComparison: number; shapes: number
  colors: number; patterns: number; addition: number
  subtraction: number; measurement: number
}

export interface PlayerProfile {
  childName:         string
  avatarIndex:       AvatarIndex
  hasCompletedSetup: boolean
  totalXP:           number
  totalCoins:        number
  currentLevel:      number
  currentStreak:     number
  lastPlayedDate:    string
  chapterStars:      ChapterStars
  ownedItems:        string[]
  equippedItems:     Record<string, string>
}

export interface CelebrationData {
  stars:            number
  xpGained:         number
  coinsGained:      number
  childName:        string
  completedChapter: ChapterType
}

// ─────────────────────────────────────────────────────────────
//  Level helpers
// ─────────────────────────────────────────────────────────────

const LEVEL_THRESHOLDS = [0, 500, 1200, 2500, 4500, 7000, 10000, 14000]
const LEVEL_NAMES = [
  'Beginner', 'Counter', 'Explorer', 'Number Star',
  'Math Wizard', 'Champion', "Milo's Champion", 'Legend',
]

export function getLevelFromXP(xp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i + 1
  }
  return 1
}
export function getLevelName(level: number): string {
  return LEVEL_NAMES[Math.min(level - 1, LEVEL_NAMES.length - 1)]
}
export function getNextLevelXP(level: number): number {
  return LEVEL_THRESHOLDS[Math.min(level, LEVEL_THRESHOLDS.length - 1)]
}
export function getLevelProgress(xp: number, level: number): number {
  const start = LEVEL_THRESHOLDS[level - 1] ?? 0
  const end   = getNextLevelXP(level)
  if (end <= start) return 1
  return Math.min(1, (xp - start) / (end - start))
}

// ─────────────────────────────────────────────────────────────
//  Chapter metadata
// ─────────────────────────────────────────────────────────────

export const CHAPTER_ORDER: ChapterType[] = [
  'counting', 'numberOrdering', 'numberRecognition', 'matchingQuantities',
  'numberComparison', 'shapes', 'colors', 'patterns', 'addition', 'subtraction', 'measurement',
]

export const CHAPTER_NAMES: Record<ChapterType, string> = {
  counting: 'Counting', numberOrdering: 'Number Order',
  numberRecognition: 'Number Doors', matchingQuantities: 'Apple Basket',
  numberComparison: 'Bigger or Smaller', shapes: 'Shape House',
  colors: 'Color Garden', patterns: 'Patterns',
  addition: 'Simple Addition', subtraction: 'Simple Subtraction',
  measurement: 'Measurement',
}

export const CHAPTER_EMOJIS: Record<ChapterType, string> = {
  counting: '🌟', numberOrdering: '🔢', numberRecognition: '🚪',
  matchingQuantities: '🍎', numberComparison: '⚖️', shapes: '🏠',
  colors: '🌈', patterns: '🔷', addition: '➕', subtraction: '➖',
  measurement: '📏',
}

// ─────────────────────────────────────────────────────────────
//  Scoring
// ─────────────────────────────────────────────────────────────

function calcStars(correct: number, wrong: number): number {
  const total = correct + wrong
  if (total === 0) return 1
  const pct = correct / total
  return pct >= 0.85 ? 3 : pct >= 0.6 ? 2 : 1
}
function calcXP(stars: number, correct: number): number {
  return stars * 50 + correct * 10
}
function calcCoins(stars: number): number {
  return stars * 5
}

// ─────────────────────────────────────────────────────────────
//  Default profile
// ─────────────────────────────────────────────────────────────

const defaultChapterStars: ChapterStars = {
  counting: 0, numberOrdering: 0, numberRecognition: 0,
  matchingQuantities: 0, numberComparison: 0, shapes: 0,
  colors: 0, patterns: 0, addition: 0, subtraction: 0, measurement: 0,
}

const defaultProfile: PlayerProfile = {
  childName: '', avatarIndex: 0, hasCompletedSetup: false,
  totalXP: 0, totalCoins: 0, currentLevel: 1, currentStreak: 0,
  lastPlayedDate: '',
  chapterStars: { ...defaultChapterStars },
  ownedItems: [], equippedItems: {},
}

// ─────────────────────────────────────────────────────────────
//  Per-learner localStorage key
//  Each child gets their own isolated storage bucket.
// ─────────────────────────────────────────────────────────────

function getLearnerStorageKey(): string {
  if (typeof window === 'undefined') return 'milo-profile-v2'
  try {
    const raw = sessionStorage.getItem('milo_active_learner')
    if (!raw) return 'milo-profile-v2'
    const learner = JSON.parse(raw)
    if (learner?.id) return `milo-profile-${learner.id}`
  } catch {}
  return 'milo-profile-v2'
}

// ─────────────────────────────────────────────────────────────
//  Store
// ─────────────────────────────────────────────────────────────

interface MiloStore {
  profile:        PlayerProfile
  currentChapter: ChapterType | null
  isSpeaking:     boolean
  celebration:    CelebrationData | null

  completeSetup:      (name: string, avatarIndex: AvatarIndex) => void
  finishChapter:      (chapter: ChapterType, correct: number, wrong: number) => void
  dismissCelebration: () => void
  purchaseItem:       (itemId: string, cost: number) => boolean
  equipItem:          (slot: string, itemId: string) => void
  startChapter:       (chapter: ChapterType) => void
  setIsSpeaking:      (v: boolean) => void
  getNextChapter:     (chapter: ChapterType) => ChapterType | null

  // Load a learner's profile from localStorage into the store
  loadLearner: (learnerId: string, displayName: string, avatarIndex: number) => void
}

export const useMiloStore = create<MiloStore>()(
  persist(
    (set, get) => ({
      profile:        { ...defaultProfile },
      currentChapter: null,
      isSpeaking:     false,
      celebration:    null,

      loadLearner: (learnerId, displayName, avatarIndex) => {
        // Read this learner's saved profile from their own localStorage key
        const key = `milo-profile-${learnerId}`
        try {
          const raw = localStorage.getItem(key)
          if (raw) {
            const saved = JSON.parse(raw)
            const savedProfile = saved?.state?.profile
            if (savedProfile) {
              set({
                profile: {
                  ...defaultProfile,
                  ...savedProfile,
                  // Always use latest name/avatar from Supabase (source of truth)
                  childName:         displayName,
                  avatarIndex:       avatarIndex as AvatarIndex,
                  hasCompletedSetup: true,
                  chapterStars: {
                    ...defaultChapterStars,
                    ...(savedProfile.chapterStars ?? {}),
                  },
                },
                currentChapter: null,
                celebration:    null,
              })
              return
            }
          }
        } catch {}

        // No saved data — fresh profile for this learner
        set({
          profile: {
            ...defaultProfile,
            childName:         displayName,
            avatarIndex:       avatarIndex as AvatarIndex,
            hasCompletedSetup: true,
          },
          currentChapter: null,
          celebration:    null,
        })
      },

      completeSetup: (name, avatarIndex) =>
        set(s => ({
          profile: { ...s.profile, childName: name, avatarIndex, hasCompletedSetup: true },
        })),

      finishChapter: (chapter, correct, wrong) => {
        const stars       = calcStars(correct, wrong)
        const xpGained    = calcXP(stars, correct)
        const coinsGained = calcCoins(stars)
        set(s => {
          const newXP     = s.profile.totalXP + xpGained
          const newCoins  = s.profile.totalCoins + coinsGained
          const newLevel  = getLevelFromXP(newXP)
          const prevStars = s.profile.chapterStars[chapter]

          // Streak: only increment once per calendar day
          const today      = new Date().toDateString()
          const lastPlayed = s.profile.lastPlayedDate
          const yesterday  = new Date(Date.now() - 86400000).toDateString()
          const newStreak  = lastPlayed === today
            ? s.profile.currentStreak       // already played today
            : lastPlayed === yesterday
              ? s.profile.currentStreak + 1 // consecutive day
              : 1                           // missed a day — reset

          return {
            profile: {
              ...s.profile,
              totalXP:        newXP,
              totalCoins:     newCoins,
              currentLevel:   newLevel,
              currentStreak:  newStreak,
              lastPlayedDate: today,
              chapterStars: {
                ...s.profile.chapterStars,
                [chapter]: Math.max(prevStars, stars),
              },
            },
            currentChapter: null,
            celebration: {
              stars, xpGained, coinsGained,
              childName:        s.profile.childName,
              completedChapter: chapter,
            },
          }
        })
      },

      dismissCelebration: () => set({ celebration: null }),

      purchaseItem: (itemId, cost) => {
        const { profile } = get()
        if (profile.totalCoins < cost) return false
        if (profile.ownedItems.includes(itemId)) return false
        set(s => ({
          profile: {
            ...s.profile,
            totalCoins: s.profile.totalCoins - cost,
            ownedItems: [...s.profile.ownedItems, itemId],
          },
        }))
        return true
      },

      equipItem: (slot, itemId) =>
        set(s => ({
          profile: {
            ...s.profile,
            equippedItems: { ...s.profile.equippedItems, [slot]: itemId },
          },
        })),

      startChapter:  (chapter) => set({ currentChapter: chapter }),
      setIsSpeaking: (v) => set({ isSpeaking: v }),

      getNextChapter: (chapter) => {
        const idx = CHAPTER_ORDER.indexOf(chapter)
        if (idx === -1 || idx === CHAPTER_ORDER.length - 1) return null
        return CHAPTER_ORDER[idx + 1]
      },
    }),
    {
      // Key is dynamic — resolved at runtime based on active learner
      name:    'milo-profile-v2', // fallback, overridden by loadLearner
      storage: createJSONStorage(() => {
        // Custom storage that writes to the learner-specific key
        return {
          getItem: (name) => {
            const key = getLearnerStorageKey()
            return localStorage.getItem(key) ?? localStorage.getItem(name)
          },
          setItem: (name, value) => {
            const key = getLearnerStorageKey()
            localStorage.setItem(key, value)
          },
          removeItem: (name) => {
            const key = getLearnerStorageKey()
            localStorage.removeItem(key)
            localStorage.removeItem(name)
          },
        }
      }),
      partialize: (s) => ({ profile: s.profile }),
      merge: (persisted: unknown, current) => {
        const p = persisted as Partial<typeof current>
        if (!p?.profile) return current
        return {
          ...current,
          profile: {
            ...current.profile,
            ...p.profile,
            chapterStars: {
              ...defaultChapterStars,
              ...(p.profile.chapterStars ?? {}),
            },
          },
        }
      },
    }
  )
)