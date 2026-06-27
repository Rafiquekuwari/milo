// ─────────────────────────────────────────────────────────────
//  Scoring
//  Single source of truth for how a chapter run converts into
//  stars / XP / coins. Previously copy-pasted verbatim in both
//  store.ts and supabase/useChapterSync.ts; keep it here only.
//
//  NOTE: the server RPC (sync_session) trusts the client-supplied
//  stars/xp/coins, so this module is the authoritative formula.
// ─────────────────────────────────────────────────────────────

export function calcStars(correct: number, wrong: number): number {
  const total = correct + wrong
  if (total === 0) return 1
  const pct = correct / total
  return pct >= 0.85 ? 3 : pct >= 0.6 ? 2 : 1
}

export function calcXP(stars: number, correct: number): number {
  return stars * 50 + correct * 10
}

export function calcCoins(stars: number): number {
  return stars * 5
}

/** What a single chapter run is worth. */
export interface ChapterScore {
  stars:  number
  xp:     number
  coins:  number
}

/** Score one run from its raw (correct, wrong) tally. */
export function scoreChapter(correct: number, wrong: number): ChapterScore {
  const stars = calcStars(correct, wrong)
  return { stars, xp: calcXP(stars, correct), coins: calcCoins(stars) }
}
