'use client'

import { toast } from '@/components/ui/Toast'
/**
 * Supabase query helpers — all DB access goes through here
 */
import { createClient } from './client'
import type { ChapterType, Learner, LearnerStats, LearnerProgress, Session } from './types'

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
  dob?: string
): Promise<Learner | null> {
  const supabase = db()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { console.error('[createLearner] no user'); return null }

  const { data, error } = await supabase
    .from('learners')
    .insert({
      display_name:  name,
      avatar_index:  avatarIndex,
      date_of_birth: dob ?? null,
      created_by:    user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('[createLearner]', error.code, error.message)
    toast.error('Failed to create learner — please try again')
    return null
  }
  return data as Learner
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

export async function syncSession(payload: SessionPayload): Promise<boolean> {
  const supabase = db()

  const { error: sessionError } = await supabase
    .from('sessions')
    .upsert(
      {
        learner_id:    payload.learnerId,
        chapter:       payload.chapter,
        phase:         payload.phase,
        correct_count: payload.correctCount,
        wrong_count:   payload.wrongCount,
        stars_earned:  payload.starsEarned,
        xp_earned:     payload.xpEarned,
        coins_earned:  payload.coinsEarned,
        client_id:     payload.clientId,
        completed_at:  payload.completedAt,
      },
      { onConflict: 'client_id', ignoreDuplicates: true }
    )

  if (sessionError) {
    console.error('[syncSession] insert failed:', sessionError.message)
    toast.error('Progress sync failed — will retry when online')
    return false
  }

  // Upsert learner_progress
  const { data: existing } = await supabase
    .from('learner_progress')
    .select('best_stars, total_xp, total_sessions')
    .eq('learner_id', payload.learnerId)
    .eq('chapter', payload.chapter)
    .single()

  const prev = existing as { best_stars: number; total_xp: number; total_sessions: number } | null

  await supabase
    .from('learner_progress')
    .upsert(
      {
        learner_id:     payload.learnerId,
        chapter:        payload.chapter,
        best_stars:     Math.max(prev?.best_stars ?? 0, payload.starsEarned),
        total_xp:       (prev?.total_xp ?? 0) + payload.xpEarned,
        total_sessions: (prev?.total_sessions ?? 0) + 1,
        last_played_at: payload.completedAt,
      },
      { onConflict: 'learner_id,chapter' }
    )

  // Upsert learner_stats
  const { data: statsRaw } = await supabase
    .from('learner_stats')
    .select('total_xp, total_coins, current_streak, longest_streak, last_played_at')
    .eq('learner_id', payload.learnerId)
    .single()

  const stats = statsRaw as {
    total_xp: number; total_coins: number
    current_streak: number; longest_streak: number
    last_played_at: string | null
  } | null

  const newXP    = (stats?.total_xp    ?? 0) + payload.xpEarned
  const newCoins = (stats?.total_coins ?? 0) + payload.coinsEarned

  const today      = new Date().toDateString()
  const lastPlayed = stats?.last_played_at
    ? new Date(stats.last_played_at).toDateString() : null
  const yesterday  = new Date(Date.now() - 86400000).toDateString()
  let streak  = stats?.current_streak ?? 0
  let longest = stats?.longest_streak ?? 0
  if (lastPlayed !== today) {
    streak  = lastPlayed === yesterday ? streak + 1 : 1
    longest = Math.max(longest, streak)
  }

  const THRESHOLDS = [0, 500, 1200, 2500, 4500, 7000, 10000, 14000]
  let level = 1
  for (let i = THRESHOLDS.length - 1; i >= 0; i--) {
    if (newXP >= THRESHOLDS[i]) { level = i + 1; break }
  }

  await supabase
    .from('learner_stats')
    .upsert(
      {
        learner_id:     payload.learnerId,
        total_xp:       newXP,
        total_coins:    newCoins,
        current_level:  level,
        current_streak: streak,
        longest_streak: longest,
        last_played_at: payload.completedAt,
      },
      { onConflict: 'learner_id' }
    )

  return true
}

// ─── Offline queue ────────────────────────────────────────────

export async function queueOfflineSession(payload: SessionPayload) {
  const supabase = db()
  await supabase
    .from('offline_queue')
    .insert({
      learner_id: payload.learnerId,
      payload:    payload as unknown as Record<string, unknown>,
    })
}

export async function flushOfflineQueue(learnerId: string) {
  const supabase = db()
  const { data: queued } = await supabase
    .from('offline_queue')
    .select('*')
    .eq('learner_id', learnerId)
    .is('synced_at', null)
    .order('queued_at', { ascending: true })

  if (!queued || queued.length === 0) return

  for (const item of queued as { id: string; payload: SessionPayload }[]) {
    const success = await syncSession(item.payload)
    await supabase
      .from('offline_queue')
      .update(
        success
          ? { synced_at: new Date().toISOString() }
          : { error: 'sync_failed' }
      )
      .eq('id', item.id)
  }
}

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