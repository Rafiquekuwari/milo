import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { kv } from './kv'
import { getActiveLearner } from './supabase/useLearnerSession'
import type { LearnerStats, LearnerProgress, LearnerState } from './supabase/types'
import { CHAPTER_IDS, type ChapterType } from './chapters'
import { scoreChapter, type ChapterScore } from './scoring'

// Chapter metadata now lives in the single registry (src/lib/chapters.ts).
// Re-exported here so existing `@/lib/store` imports keep working.
export type { ChapterType } from './chapters'
export { CHAPTER_ORDER, CHAPTER_NAMES, CHAPTER_EMOJIS } from './chapters'

// ─────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────

export type AvatarIndex = 0 | 1 | 2 | 3

// One star count per chapter, keyed off the registry so new chapters are
// covered automatically.
export type ChapterStars = Record<ChapterType, number>

export interface PlayerProfile {
  childName:         string
  avatarIndex:       AvatarIndex
  hasCompletedSetup: boolean
  totalXP:           number
  totalCoins:        number      // spendable balance (earned − spent)
  coinsSpent:        number      // monotonic; lets balance merge across devices
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
//  Default profile
// ─────────────────────────────────────────────────────────────

const defaultChapterStars: ChapterStars =
  Object.fromEntries(CHAPTER_IDS.map(id => [id, 0])) as ChapterStars

const defaultProfile: PlayerProfile = {
  childName: '', avatarIndex: 0, hasCompletedSetup: false,
  totalXP: 0, totalCoins: 0, coinsSpent: 0, currentLevel: 1, currentStreak: 0,
  lastPlayedDate: '',
  chapterStars: { ...defaultChapterStars },
  ownedItems: [], equippedItems: {},
}

// ─────────────────────────────────────────────────────────────
//  Per-learner local store key (IndexedDB via kv)
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
  finishChapter:      (chapter: ChapterType, correct: number, wrong: number) => ChapterScore
  dismissCelebration: () => void
  purchaseItem:       (itemId: string, cost: number) => boolean
  equipItem:          (slot: string, itemId: string) => void
  startChapter:       (chapter: ChapterType) => void
  setIsSpeaking:      (v: boolean) => void
  getNextChapter:     (chapter: ChapterType) => ChapterType | null

  // Load a learner's profile from the local store (kv) into the store
  loadLearner: (learnerId: string, displayName: string, avatarIndex: number) => void

  // Merge a learner's server-side state (cross-device) into the profile:
  // progress (stars/XP/level/streak), coins balance, owned + equipped items.
  applyServerProgress: (
    stats: LearnerStats | null,
    progress: LearnerProgress[],
    state: LearnerState | null,
  ) => void
}

export const useMiloStore = create<MiloStore>()(
  persist(
    (set, get) => ({
      profile:        { ...defaultProfile },
      currentChapter: null,
      isSpeaking:     false,
      celebration:    null,

      loadLearner: (learnerId, displayName, avatarIndex) => {
        // Read this learner's saved profile from their own local store key.
        // Synchronous: kv is hydrated by StorageGate before any page mounts.
        const key = `milo-profile-${learnerId}`
        try {
          const raw = kv.get(key)
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

      // Pull the learner's full state from Supabase so it appears on EVERY device
      // they sign in on. Everything merges monotonically (never regresses):
      //   stars/XP/streak → max(local, server)
      //   coins balance   → earned (server learner_stats) − spent (max local/server)
      //   owned items     → union; equipped → server when present
      applyServerProgress: (stats, progress, state) =>
        set(s => {
          const cs = { ...s.profile.chapterStars }
          for (const row of progress) {
            const ch = row.chapter as ChapterType
            if (ch in cs) cs[ch] = Math.max(cs[ch] ?? 0, row.best_stars ?? 0)
          }
          const totalXP        = Math.max(s.profile.totalXP, stats?.total_xp ?? 0)
          const currentStreak  = Math.max(s.profile.currentStreak, stats?.current_streak ?? 0)
          const lastPlayedDate = stats?.last_played_at
            ? new Date(stats.last_played_at).toDateString()
            : s.profile.lastPlayedDate

          // ── Coins: balance = earned − spent, both monotonic so it never loses ──
          const earned = stats?.total_coins ?? 0
          // spent: from server when present; otherwise reconstruct from THIS device's
          // known balance (handles existing users who spent before spent-tracking).
          const spent = state
            ? Math.max(s.profile.coinsSpent ?? 0, state.coins_spent ?? 0)
            : Math.max(s.profile.coinsSpent ?? 0, earned - s.profile.totalCoins, 0)
          // Keep at least the local balance so unsynced local earnings aren't lost.
          const totalCoins = Math.max(s.profile.totalCoins, earned - spent)

          // ── Shop items ──
          const ownedItems = state
            ? Array.from(new Set([...s.profile.ownedItems, ...(state.owned_items ?? [])]))
            : s.profile.ownedItems
          const equippedItems = state && state.equipped_items && Object.keys(state.equipped_items).length
            ? { ...s.profile.equippedItems, ...state.equipped_items }
            : s.profile.equippedItems

          return {
            profile: {
              ...s.profile,
              chapterStars: cs,
              totalXP,
              currentLevel: getLevelFromXP(totalXP),
              currentStreak,
              lastPlayedDate,
              totalCoins,
              coinsSpent: spent,
              ownedItems,
              equippedItems,
            },
          }
        }),

      completeSetup: (name, avatarIndex) =>
        set(s => ({
          profile: { ...s.profile, childName: name, avatarIndex, hasCompletedSetup: true },
        })),

      finishChapter: (chapter, correct, wrong) => {
        const { stars, xp: xpGained, coins: coinsGained } = scoreChapter(correct, wrong)
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
        // Return what we scored so callers (e.g. finishAndSync) can build the
        // sync payload without recomputing the same formula.
        return { stars, xp: xpGained, coins: coinsGained }
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
            coinsSpent: (s.profile.coinsSpent ?? 0) + cost,   // monotonic — for cross-device merge
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
        const idx = CHAPTER_IDS.indexOf(chapter)
        if (idx === -1 || idx === CHAPTER_IDS.length - 1) return null
        return CHAPTER_IDS[idx + 1]
      },
    }),
    {
      // Key is dynamic — resolved at runtime based on active learner
      name:    'milo-profile-v2', // fallback, overridden by loadLearner
      // kv is async (IndexedDB-backed) and only safe to read after it hydrates,
      // so we skip auto-hydration here and trigger it from StorageGate once
      // kv.ready() resolves. See src/lib/kv.ts and StorageGate.
      skipHydration: true,
      storage: createJSONStorage(() => {
        // Custom storage that reads/writes the learner-specific key via kv.
        return {
          getItem: (name) => {
            const key = getLearnerStorageKey()
            return kv.get(key) ?? kv.get(name)
          },
          setItem: (name, value) => {
            const key = getLearnerStorageKey()
            kv.set(key, value)
          },
          removeItem: (name) => {
            const key = getLearnerStorageKey()
            kv.remove(key)
            kv.remove(name)
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