'use client'

import { toast } from '@/components/ui/Toast'
/**
 * Supabase query helpers — all DB access goes through here
 */
import { createClient } from './client'
import type { ChapterType, Learner, LearnerStats, LearnerProgress, LearnerState, Session, Grade } from './types'
import type { AgeGroup } from '../chapters'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(): any {
  return createClient()
}

// ─── Auth ─────────────────────────────────────────────────────

export async function getProfile() {
  const supabase = db()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  return data as { id: string; role: string; display_name: string; avatar_index: number } | null
}

export async function signOut() {
  const supabase = db()
  await supabase.auth.signOut()
  window.location.href = '/auth'
}

// ─── Learners ─────────────────────────────────────────────────

export async function getMyLearners(): Promise<Learner[]> {
  const supabase = db()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: access } = await supabase
    .from('learner_access')
    .select('learner_id')
    .eq('parent_id', user.id)

  if (!access || access.length === 0) return []

  const ids = access.map((a: { learner_id: string }) => a.learner_id)

  const { data } = await supabase
    .from('learners')
    .select('*')
    .in('id', ids)
    .order('created_at', { ascending: true })

  return (data ?? []) as Learner[]
}

export async function createLearner(
  name: string,
  avatarIndex: number,
  ageGroup: AgeGroup,
  dob?: string,
  gradeId?: string,
): Promise<Learner | null> {
  const supabase = db()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { console.error('[createLearner] no user'); return null }

  // grade_id is only sent when a grade was actually chosen, so the no-grade
  // path stays identical to the original insert (forward-compatible with DBs
  // that predate the grades migration).
  const payload: Record<string, unknown> = {
    display_name:  name,
    avatar_index:  avatarIndex,
    date_of_birth: dob ?? null,
    age_group:     ageGroup,
    created_by:    user.id,
  }
  if (gradeId) payload.grade_id = gradeId

  const { data, error } = await supabase
    .from('learners')
    .insert(payload)
    .select()
    .single()

  if (error) {
    console.error('[createLearner]', error.code, error.message)
    toast.error('Failed to create learner — please try again')
    return null
  }
  return data as Learner
}

/** Move an existing learner into a grade (or clear it with null). */
export async function setLearnerGrade(learnerId: string, gradeId: string | null): Promise<boolean> {
  const supabase = db()
  const { error } = await supabase
    .from('learners')
    .update({ grade_id: gradeId })
    .eq('id', learnerId)
  if (error) { console.error('[setLearnerGrade]', error.message); toast.error('Could not change grade'); return false }
  return true
}

// ─── Grades ───────────────────────────────────────────────────

export interface GradeSummary extends Grade {
  chapterCount: number
  learnerCount: number
}

/** Grades owned by the current account, with chapter + learner counts. */
export async function getMyGrades(): Promise<GradeSummary[]> {
  const supabase = db()
  const { data, error } = await supabase
    .from('grades')
    .select('*, grade_chapters(count), learners(count)')
    .order('created_at', { ascending: true })
  if (error) {
    // Pre-migration the tables don't exist yet — degrade to "no grades" rather
    // than throwing, so the dashboard still renders.
    console.warn('[getMyGrades]', error.message)
    return []
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map(g => ({
    ...g,
    chapterCount: g.grade_chapters?.[0]?.count ?? 0,
    learnerCount: g.learners?.[0]?.count ?? 0,
  })) as GradeSummary[]
}

/** A grade's chapter ids, in the teacher's chosen order. */
export async function getGradeChapterIds(gradeId: string): Promise<ChapterType[]> {
  const supabase = db()
  const { data, error } = await supabase
    .from('grade_chapters')
    .select('chapter_id, sort_order')
    .eq('grade_id', gradeId)
    .order('sort_order', { ascending: true })
  if (error) { console.warn('[getGradeChapterIds]', error.message); return [] }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map(r => r.chapter_id as ChapterType)
}

/** Create a grade for one band with a chosen chapter subset (in order). */
export async function createGrade(
  name: string,
  ageGroup: AgeGroup,
  chapterIds: ChapterType[],
): Promise<Grade | null> {
  const supabase = db()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { console.error('[createGrade] no user'); return null }

  const { data: grade, error } = await supabase
    .from('grades')
    .insert({ name: name.trim(), age_group: ageGroup, created_by: user.id })
    .select()
    .single()

  if (error || !grade) {
    console.error('[createGrade]', error?.code, error?.message)
    toast.error('Could not create grade — please try again')
    return null
  }

  if (chapterIds.length) {
    const rows = chapterIds.map((id, i) => ({ grade_id: grade.id, chapter_id: id, sort_order: i }))
    const { error: ce } = await supabase.from('grade_chapters').insert(rows)
    if (ce) console.error('[createGrade] chapters', ce.message)
  }
  return grade as Grade
}

/** Rename a grade and/or replace its chapter set (delete + re-insert in order). */
export async function updateGrade(
  gradeId: string,
  opts: { name?: string; chapterIds?: ChapterType[] },
): Promise<boolean> {
  const supabase = db()

  if (opts.name !== undefined) {
    const { error } = await supabase.from('grades').update({ name: opts.name.trim() }).eq('id', gradeId)
    if (error) { console.error('[updateGrade] name', error.message); toast.error('Could not save grade'); return false }
  }

  if (opts.chapterIds) {
    const { error: de } = await supabase.from('grade_chapters').delete().eq('grade_id', gradeId)
    if (de) { console.error('[updateGrade] clear', de.message); toast.error('Could not save chapters'); return false }
    if (opts.chapterIds.length) {
      const rows = opts.chapterIds.map((id, i) => ({ grade_id: gradeId, chapter_id: id, sort_order: i }))
      const { error: ie } = await supabase.from('grade_chapters').insert(rows)
      if (ie) { console.error('[updateGrade] chapters', ie.message); toast.error('Could not save chapters'); return false }
    }
  }
  return true
}

/** Delete a grade. Its children revert to the band default (FK ON DELETE SET NULL). */
export async function deleteGrade(gradeId: string): Promise<boolean> {
  const supabase = db()
  const { error } = await supabase.from('grades').delete().eq('id', gradeId)
  if (error) { console.error('[deleteGrade]', error.message); toast.error('Could not delete grade'); return false }
  return true
}

export async function deleteLearner(learnerId: string) {
  const supabase = db()
  const { error } = await supabase
    .from('learners')
    .delete()
    .eq('id', learnerId)
  if (error) console.error('[deleteLearner]', error.message)
}

// ─── Stats + Progress ─────────────────────────────────────────

export async function getLearnerStats(learnerId: string): Promise<LearnerStats | null> {
  const supabase = db()
  const { data } = await supabase
    .from('learner_stats')
    .select('*')
    .eq('learner_id', learnerId)
    .single()
  return data as LearnerStats | null
}

export async function getLearnerProgress(learnerId: string): Promise<LearnerProgress[]> {
  const supabase = db()
  const { data } = await supabase
    .from('learner_progress')
    .select('*')
    .eq('learner_id', learnerId)
    .order('last_played_at', { ascending: false })
  return (data ?? []) as LearnerProgress[]
}

export async function getRecentSessions(learnerId: string, limit = 5): Promise<Session[]> {
  const supabase = db()
  const { data } = await supabase
    .from('sessions')
    .select('*')
    .eq('learner_id', learnerId)
    .order('started_at', { ascending: false })
    .limit(limit)
  return (data ?? []) as Session[]
}

// ─── Menu bootstrap (single round trip) ───────────────────────

export interface LearnerBootstrap {
  role:     'owner' | 'viewer'
  stats:    LearnerStats | null
  progress: LearnerProgress[]
  state:    LearnerState | null
}

export type BootstrapResult =
  | { status: 'ok'; data: LearnerBootstrap }
  | { status: 'no-auth' }     // not signed in / session not hydrated / transient error — leave local state
  | { status: 'no-access' }   // signed in, but this account has no access to the learner — stale/foreign

/**
 * One RPC for everything the menu needs: access role + stats + progress + shop
 * state. Replaces getMyAccessRole + getLearnerStats + getLearnerProgress +
 * getLearnerState (4 round trips → 1).
 *
 * Resolves the auth user first so we can tell "not signed in yet" (don't touch
 * the active learner) apart from "signed in but no access" (evict the stale
 * learner). A cold-start race must never bounce a valid learner.
 */
export async function getLearnerBootstrap(learnerId: string): Promise<BootstrapResult> {
  const supabase = db()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { status: 'no-auth' }

  const { data, error } = await supabase.rpc('get_learner_bootstrap', { p_learner_id: learnerId })
  if (error) { console.error('[getLearnerBootstrap] rpc failed:', error.message); return { status: 'no-auth' } }
  if (!data) return { status: 'no-access' }

  const d = data as { role: 'owner' | 'viewer'; stats: LearnerStats | null; progress: LearnerProgress[] | null; state: LearnerState | null }
  return { status: 'ok', data: { role: d.role, stats: d.stats ?? null, progress: d.progress ?? [], state: d.state ?? null } }
}

// ─── Shop / coins state (cross-device) ────────────────────────

export async function getLearnerState(learnerId: string): Promise<LearnerState | null> {
  const supabase = db()
  const { data } = await supabase
    .from('learner_state')
    .select('*')
    .eq('learner_id', learnerId)
    .maybeSingle()
  return (data ?? null) as LearnerState | null
}

export async function saveLearnerState(
  learnerId: string,
  state: { coinsSpent: number; ownedItems: string[]; equippedItems: Record<string, string> },
): Promise<boolean> {
  const supabase = db()

  // learner_state is the only direct client write gated by RLS (progress/stats/
  // sessions all go through the sync_session SECURITY DEFINER RPC). The policy
  // requires auth.uid() to own the learner, so resolve the session first — this
  // both forces the singleton client to hydrate its session before we write and
  // lets us skip the write cleanly when genuinely signed out (expired token,
  // stale sessionStorage learner) instead of throwing an RLS error.
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { error } = await supabase
    .from('learner_state')
    .upsert({
      learner_id:     learnerId,
      coins_spent:    state.coinsSpent,
      owned_items:    state.ownedItems,
      equipped_items: state.equippedItems,
      updated_at:     new Date().toISOString(),
    }, { onConflict: 'learner_id' })
  if (error) { console.error('[saveLearnerState] upsert failed:', error.message); return false }
  return true
}

// ─── Session sync ─────────────────────────────────────────────

export interface SessionPayload {
  learnerId:    string
  chapter:      ChapterType
  phase:        'lesson' | 'practice'
  correctCount: number
  wrongCount:   number
  starsEarned:  number
  xpEarned:     number
  coinsEarned:  number
  clientId:     string
  completedAt:  string
}

/**
 * Outcome of a session sync attempt:
 *  - 'ok'    — saved (or already saved); remove from any queue
 *  - 'retry' — transient failure (network/server); keep queued and try later
 *  - 'drop'  — permanent failure (the row can never be accepted, e.g. the learner
 *              no longer exists or isn't owned by this account); discard the item
 *              so it doesn't loop forever in the offline queue
 */
export type SyncOutcome = 'ok' | 'retry' | 'drop'

// SQLSTATE codes that a retry can never fix — the payload is fundamentally
// rejected (missing FK target, RLS denial, bad data), not a transient hiccup.
const NON_RETRYABLE_CODES = new Set([
  '23503', // foreign_key_violation     — learner_id not in learners
  '42501', // insufficient_privilege    — RLS: not owned by this account
  '23502', // not_null_violation
  '23514', // check_violation
  '22P02', // invalid_text_representation — malformed uuid
])

function classifySyncError(error: { code?: string; message?: string }): SyncOutcome {
  const code = error?.code ?? ''
  if (code === '23505') return 'ok'               // unique_violation → already recorded
  if (NON_RETRYABLE_CODES.has(code)) return 'drop'
  // Fallback for drivers that don't surface a SQLSTATE on the error object.
  const msg = (error?.message ?? '').toLowerCase()
  if (msg.includes('foreign key') || msg.includes('row-level security')) return 'drop'
  return 'retry'
}

export async function syncSession(payload: SessionPayload): Promise<SyncOutcome> {
  const supabase = db()

  // Single RPC call — replaces 3 separate upserts
  // Reduces DB round trips from 3 to 1
  const { error } = await supabase.rpc('sync_session', {
    p_learner_id:   payload.learnerId,
    p_chapter:      payload.chapter,
    p_phase:        payload.phase,
    p_correct:      payload.correctCount,
    p_wrong:        payload.wrongCount,
    p_stars:        payload.starsEarned,
    p_xp:           payload.xpEarned,
    p_coins:        payload.coinsEarned,
    p_client_id:    payload.clientId,
    p_completed_at: payload.completedAt,
  })

  if (error) {
    const outcome = classifySyncError(error)
    // No toast here — this runs once PER queued item during a flush, which would
    // spam a toast per item. The OfflineBanner shows pending status instead.
    console.error(
      `[syncSession] rpc failed (${outcome === 'drop' ? 'permanent — discarding' : 'will retry'}):`,
      error.message,
    )
    return outcome
  }

  return 'ok'
}

// Offline queueing lives entirely in the browser (IndexedDB via kv, see
// useOfflineSync). The old DB-backed `offline_queue` table + its helpers were
// dead code (only the removed sync.ts referenced them) and have been dropped.

// ─── Invites ──────────────────────────────────────────────────

export interface InviteWithLearner {
  id:             string
  learner_id:     string
  invited_by:     string
  invited_email:  string
  status:         'pending' | 'accepted' | 'expired'
  expires_at:     string
  created_at:     string
  learner_name?:  string
}

/** Send an invite — anyone can invite anyone to access a learner */
export async function sendInvite(
  learnerId: string,
  invitedEmail: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = db()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not logged in' }

  // Check sender has access to this learner
  const { data: access } = await supabase
    .from('learner_access')
    .select('access_role')
    .eq('learner_id', learnerId)
    .eq('parent_id', user.id)
    .single()

  if (!access) return { ok: false, error: 'You do not have access to this learner' }

  // Check not already invited or has access
  const { data: existing } = await supabase
    .from('learner_invites')
    .select('id, status')
    .eq('learner_id', learnerId)
    .eq('invited_email', invitedEmail.toLowerCase().trim())
    .eq('status', 'pending')
    .single()

  if (existing) return { ok: false, error: 'An invite has already been sent to this email' }

  const { error } = await supabase
    .from('learner_invites')
    .insert({
      learner_id:     learnerId,
      invited_by:     user.id,
      invited_email:  invitedEmail.toLowerCase().trim(),
      status:         'pending',
      expires_at:     new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/** Get all pending invites sent by the current user */
export async function getSentInvites(learnerId: string): Promise<InviteWithLearner[]> {
  const supabase = db()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('learner_invites')
    .select('*')
    .eq('learner_id', learnerId)
    .eq('invited_by', user.id)
    .order('created_at', { ascending: false })

  return (data ?? []) as InviteWithLearner[]
}

/** Get all pending invites received by the current user's email */
export async function getReceivedInvites(): Promise<InviteWithLearner[]> {
  const supabase = db()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const email = user.email?.toLowerCase().trim()
  if (!email) return []

  const { data } = await supabase
    .from('learner_invites')
    .select('*, learners(display_name)')
    .eq('invited_email', email)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  return ((data ?? []) as unknown as (InviteWithLearner & { learners: { display_name: string } })[])
    .map(i => ({ ...i, learner_name: i.learners?.display_name }))
}

/** Accept a received invite — grants viewer access to the learner */
export async function acceptInvite(
  inviteId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = db()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not logged in' }

  // Get the invite
  const { data: invite } = await supabase
    .from('learner_invites')
    .select('*')
    .eq('id', inviteId)
    .eq('invited_email', user.email?.toLowerCase().trim())
    .eq('status', 'pending')
    .single()

  if (!invite) return { ok: false, error: 'Invite not found or already used' }

  const inv = invite as { learner_id: string }

  // Grant access
  const { error: accessError } = await supabase
    .from('learner_access')
    .upsert(
      { learner_id: inv.learner_id, parent_id: user.id, access_role: 'viewer' },
      { onConflict: 'learner_id,parent_id', ignoreDuplicates: true }
    )

  if (accessError) return { ok: false, error: accessError.message }

  // Mark invite as accepted
  await supabase
    .from('learner_invites')
    .update({ status: 'accepted' })
    .eq('id', inviteId)

  return { ok: true }
}

/** Revoke a sent invite */
export async function revokeInvite(inviteId: string): Promise<boolean> {
  const supabase = db()
  const { error } = await supabase
    .from('learner_invites')
    .delete()
    .eq('id', inviteId)
  return !error
}

// ─── Learner access management ────────────────────────────────

/** Get the current user's access role for a learner */
export async function getMyAccessRole(
  learnerId: string
): Promise<'owner' | 'viewer' | null> {
  const supabase = db()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('learner_access')
    .select('access_role')
    .eq('learner_id', learnerId)
    .eq('parent_id', user.id)
    .single()

  return (data as { access_role: 'owner' | 'viewer' } | null)?.access_role ?? null
}

/** Owner only: permanently delete the learner and all their data */
export async function deleteLearnerPermanently(
  learnerId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = db()
  const role = await getMyAccessRole(learnerId)
  if (role !== 'owner') return { ok: false, error: 'Only the owner can delete a learner' }

  const { error } = await supabase
    .from('learners')
    .delete()
    .eq('id', learnerId)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/** Viewer only: remove yourself from this learner (revoke own access) */
export async function removeMyselfFromLearner(
  learnerId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = db()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not logged in' }

  const role = await getMyAccessRole(learnerId)
  if (role === 'owner') return { ok: false, error: 'Owners cannot remove themselves — delete the learner instead' }

  const { error } = await supabase
    .from('learner_access')
    .delete()
    .eq('learner_id', learnerId)
    .eq('parent_id', user.id)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}