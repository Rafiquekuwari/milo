'use client'
/**
 * daily — "Milo's Daily": the retention loop. A short spaced-repetition review of
 * already-learned skills + a gentle streak. Built for "math without fear": no
 * timer, no shame on a missed day (streak just restarts warmly), wrong answers
 * stay kind. State is local-first (kv, per learner). Engagement is logged via
 * analytics (daily_open / daily_complete) and read on /insights.
 */
import { kv } from './kv'
import { createClient } from './supabase/client'
import type { AgeGroup } from './chapters'

const rint = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]
const shuffle = <T,>(a: T[]) => a.slice().sort(() => Math.random() - 0.5)
const numChoices = (ans: number, spread = 3): string[] => {
  const set = new Set<string>([String(ans)])
  let guard = 0
  while (set.size < 3 && guard++ < 50) { const d = rint(1, spread); const v = Math.random() < 0.5 ? ans + d : ans - d; if (v >= 0) set.add(String(v)) }
  let b = 1; while (set.size < 3) { set.add(String(ans + b)); b++ }
  return shuffle([...set])
}
const factorsOf = (n: number) => { const f: number[] = []; for (let i = 1; i <= n; i++) if (n % i === 0) f.push(i); return f }
const roundTo = (n: number, m: number) => Math.floor(n / m + 0.5) * m

export interface DailyQuestion { skill: string; prompt: string; say: string; choices: string[]; answer: string }
type Gen = () => DailyQuestion

// ─── Skill banks per age group (compact review questions) ────
const SKILLS: Record<AgeGroup, { key: string; gen: Gen }[]> = {
  '3-5': [
    { key: 'count', gen: () => { const n = rint(1, 9); const e = pick(['🍎', '⭐', '🐸', '🎈', '🐱', '🍪']); return { skill: 'count', prompt: e.repeat(n), say: 'How many do you see?', choices: numChoices(n, 2), answer: String(n) } } },
    { key: 'compare', gen: () => { let a = rint(1, 9), b = rint(1, 9); while (b === a) b = rint(1, 9); return { skill: 'compare', prompt: `${a}   or   ${b}`, say: `Which is bigger, ${a} or ${b}?`, choices: shuffle([String(a), String(b)]), answer: String(Math.max(a, b)) } } },
    { key: 'add', gen: () => { const a = rint(1, 5), b = rint(1, 5); return { skill: 'add', prompt: `${a} + ${b}`, say: `What is ${a} plus ${b}?`, choices: numChoices(a + b, 2), answer: String(a + b) } } },
    { key: 'sub', gen: () => { const a = rint(2, 9), b = rint(1, a); return { skill: 'sub', prompt: `${a} − ${b}`, say: `What is ${a} take away ${b}?`, choices: numChoices(a - b, 2), answer: String(a - b) } } },
    { key: 'next', gen: () => { const n = rint(1, 9); return { skill: 'next', prompt: `${n}, ?`, say: `What comes after ${n}?`, choices: numChoices(n + 1, 2), answer: String(n + 1) } } },
  ],
  '6-8': [
    { key: 'tens', gen: () => { const n = rint(11, 99); return { skill: 'tens', prompt: `${n}`, say: `How many tens in ${n}?`, choices: numChoices(Math.floor(n / 10), 2), answer: String(Math.floor(n / 10)) } } },
    { key: 'skip', gen: () => { const step = pick([2, 5, 10]); const start = step * rint(1, 4); return { skill: 'skip', prompt: `${start}, ${start + step}, ?`, say: 'What comes next?', choices: numChoices(start + 2 * step, step), answer: String(start + 2 * step) } } },
    { key: 'add100', gen: () => { const a = rint(10, 49), b = rint(10, 49); return { skill: 'add100', prompt: `${a} + ${b}`, say: `What is ${a} plus ${b}?`, choices: numChoices(a + b, 5), answer: String(a + b) } } },
    { key: 'sub100', gen: () => { const a = rint(20, 80), b = rint(5, a - 1); return { skill: 'sub100', prompt: `${a} − ${b}`, say: `What is ${a} minus ${b}?`, choices: numChoices(a - b, 5), answer: String(a - b) } } },
    { key: 'mult', gen: () => { const a = rint(2, 9), b = rint(2, 9); return { skill: 'mult', prompt: `${a} × ${b}`, say: `What is ${a} times ${b}?`, choices: numChoices(a * b, 4), answer: String(a * b) } } },
    { key: 'half', gen: () => { const n = pick([4, 6, 8, 10, 12, 14]); return { skill: 'half', prompt: `½ of ${n}`, say: `What is half of ${n}?`, choices: numChoices(n / 2, 2), answer: String(n / 2) } } },
  ],
  '9-11': [
    { key: 'round', gen: () => { const n = rint(11, 99); return { skill: 'round', prompt: `Round ${n} → nearest 10`, say: `Round ${n} to the nearest ten.`, choices: shuffle([String(roundTo(n, 10)), String(roundTo(n, 10) + 10), String(Math.max(0, roundTo(n, 10) - 10))]), answer: String(roundTo(n, 10)) } } },
    { key: 'divide', gen: () => { const b = rint(2, 9), q = rint(2, 9); return { skill: 'divide', prompt: `${b * q} ÷ ${b}`, say: `What is ${b * q} divided by ${b}?`, choices: numChoices(q, 2), answer: String(q) } } },
    { key: 'times', gen: () => { const a = rint(3, 12), b = rint(3, 9); return { skill: 'times', prompt: `${a} × ${b}`, say: `What is ${a} times ${b}?`, choices: numChoices(a * b, 6), answer: String(a * b) } } },
    { key: 'factor', gen: () => { const n = pick([12, 16, 18, 20, 24]); const proper = factorsOf(n).filter(f => f !== 1 && f !== n); const c = pick(proper); const opts = new Set<string>([String(c)]); let d = 1; while (opts.size < 3) { const v = c + d; if (n % v !== 0 && v > 1) opts.add(String(v)); d++ } return { skill: 'factor', prompt: `Factor of ${n}?`, say: `Which is a factor of ${n}?`, choices: shuffle([...opts]), answer: String(c) } } },
    { key: 'fraction', gen: () => { const den = pick([4, 5, 6]); let na = rint(1, den - 1), nb = rint(1, den - 1); while (nb === na) nb = rint(1, den - 1); return { skill: 'fraction', prompt: `${na}/${den}   or   ${nb}/${den}`, say: `Which is bigger?`, choices: shuffle([`${na}/${den}`, `${nb}/${den}`]), answer: `${Math.max(na, nb)}/${den}` } } },
    { key: 'decimal', gen: () => { let a = rint(1, 9), b = rint(1, 9); while (b === a) b = rint(1, 9); return { skill: 'decimal', prompt: `${(a / 10).toFixed(1)}   or   ${(b / 10).toFixed(1)}`, say: 'Which is bigger?', choices: shuffle([(a / 10).toFixed(1), (b / 10).toFixed(1)]), answer: (Math.max(a, b) / 10).toFixed(1) } } },
  ],
}

// ─── Spaced repetition: pick the skills most in need of review ──
interface SkillStat { lastSeen: number; wrong: number }
const skillsKey = (id: string) => `milo_daily_skills_${id}`
function readSkillStats(id: string): Record<string, SkillStat> {
  try { return JSON.parse(kv.get(skillsKey(id)) ?? '{}') } catch { return {} }
}
export function recordSkillResult(learnerId: string, skill: string, correct: boolean) {
  const stats = readSkillStats(learnerId)
  const prev = stats[skill]
  stats[skill] = { lastSeen: Date.now(), wrong: correct ? 0 : (prev?.wrong ?? 0) + 1 }
  try { kv.set(skillsKey(learnerId), JSON.stringify(stats)) } catch {}
}

/** Build today's review: prioritise never-seen, then wrong-heavy, then oldest. */
export function generateDaily(ageGroup: AgeGroup, learnerId: string, n = 5): DailyQuestion[] {
  const bank = SKILLS[ageGroup] ?? SKILLS['3-5']
  const stats = readSkillStats(learnerId)
  const ranked = [...bank].sort((a, b) => {
    const sa = stats[a.key], sb = stats[b.key]
    if (!sa && sb) return -1
    if (sa && !sb) return 1
    if (!sa && !sb) return 0
    if ((sb!.wrong) !== (sa!.wrong)) return sb!.wrong - sa!.wrong   // more-wrong first
    return sa!.lastSeen - sb!.lastSeen                              // oldest first
  })
  const chosen: { key: string; gen: Gen }[] = []
  for (let i = 0; i < n; i++) chosen.push(ranked[i % ranked.length])  // rotate if fewer skills than n
  return chosen.map(s => s.gen())
}

// ─── Streak (gentle: a missed day restarts warmly, never shames) ──
export interface DailyState { lastDay: string; streak: number; longest: number }
const stateKey = (id: string) => `milo_daily_${id}`
const dayKey = (d = new Date()) => d.toISOString().slice(0, 10)
const yesterdayKey = () => dayKey(new Date(Date.now() - 86_400_000))

function readState(id: string): DailyState {
  try { return JSON.parse(kv.get(stateKey(id)) ?? '') } catch { return { lastDay: '', streak: 0, longest: 0 } }
}

/** Is today's Daily still available (not yet completed today)? */
export function dailyStatus(learnerId: string): { available: boolean; streak: number; longest: number } {
  const s = readState(learnerId)
  return { available: s.lastDay !== dayKey(), streak: s.streak, longest: s.longest }
}

/** Mark today's Daily done; advance/restart the streak. Idempotent per day. */
export function recordDailyDone(learnerId: string): { streak: number; longest: number; isRecord: boolean; restarted: boolean } {
  const s = readState(learnerId)
  const today = dayKey()
  if (s.lastDay === today) return { streak: s.streak, longest: s.longest, isRecord: false, restarted: false }
  const continued = s.lastDay === yesterdayKey()
  const streak = continued ? s.streak + 1 : 1
  const restarted = !continued && s.streak > 0
  const longest = Math.max(s.longest, streak)
  const isRecord = streak >= longest && streak > 1
  try { kv.set(stateKey(learnerId), JSON.stringify({ lastDay: today, streak, longest })) } catch {}
  return { streak, longest, isRecord, restarted }
}

// ─── Streak from a set of completed-day keys (DB-derived source of truth) ──
const dayMs = (k: string) => Date.parse(`${k}T00:00:00Z`)
export function computeStreak(dayKeys: string[]): { current: number; longest: number; lastDay: string } {
  const days = [...new Set(dayKeys)].filter(Boolean).sort()
  if (days.length === 0) return { current: 0, longest: 0, lastDay: '' }
  let longest = 1, run = 1
  for (let i = 1; i < days.length; i++) {
    if (dayMs(days[i]) - dayMs(days[i - 1]) === 86_400_000) { run++; longest = Math.max(longest, run) }
    else run = 1
  }
  const lastDay = days[days.length - 1]
  let current = 0
  if (lastDay === dayKey() || lastDay === yesterdayKey()) {
    current = 1
    for (let i = days.length - 1; i > 0; i--) {
      if (dayMs(days[i]) - dayMs(days[i - 1]) === 86_400_000) current++
      else break
    }
  }
  return { current, longest: Math.max(longest, current), lastDay }
}

/**
 * Reconcile the local streak with the DB. `daily_complete` events are the source
 * of truth (so the streak is correct across devices); we union them with the
 * local last-completed day (covering a just-finished day not yet flushed) and
 * recompute. Best-effort, online-only, never throws.
 */
export async function reconcileStreakFromDB(learnerId: string): Promise<void> {
  try {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as any
    const { data, error } = await supabase
      .from('learner_events').select('created_at').eq('learner_id', learnerId).eq('event', 'daily_complete')
    if (error || !data) return
    const local = readState(learnerId)
    const days = new Set<string>(data.map((r: { created_at: string }) => dayKey(new Date(r.created_at))))
    if (local.lastDay) days.add(local.lastDay)
    const { current, longest, lastDay } = computeStreak([...days])
    kv.set(stateKey(learnerId), JSON.stringify({ lastDay, streak: current, longest: Math.max(longest, local.longest) }))
  } catch { /* offline / transient — local cache stands */ }
}
