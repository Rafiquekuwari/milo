'use client'
export const dynamic = 'force-static'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useMiloStore, type ChapterType } from '@/lib/store'
import { CHAPTER_NAMES, CHAPTER_EMOJIS, CHAPTER_ASSETS, chaptersForAge, type AgeGroup } from '@/lib/chapters'
import { useMiloSpeaker } from '@/lib/useMiloSpeaker'
import BackButton from '@/components/ui/BackButton'
import ChapterPicker from '@/components/ui/ChapterPicker'
import PWAInstallBanner from '@/components/ui/PWAInstallBanner'
import { getActiveLearner, clearActiveLearner } from '@/lib/supabase/useLearnerSession'
import { getLearnerBootstrap, saveLearnerState } from '@/lib/supabase/queries'
import type { LearnerState } from '@/lib/supabase/types'
import { getLastPlayed, setLastPlayed, reconcileLastPlayed } from '@/lib/lastPlayed'

const AVATAR_SRCS = ['/assets/objects/fox.png','/assets/objects/bunny.png','/assets/objects/bear.png','/assets/objects/cat.png']
const LEVEL_NAMES   = ['Beginner','Counter','Explorer','Number Star','Math Wizard','Champion',"Milo's Champion",'Legend']

// True when this device's shop state equals what's on the server, so we can skip
// the write-back on a plain menu visit. (After applyServerProgress merges the
// server in, local is always a superset, so equality means "nothing new here".)
function shopStateMatchesServer(
  p: { coinsSpent: number; ownedItems: string[]; equippedItems: Record<string, string> },
  state: LearnerState | null,
): boolean {
  if (!state) {
    return p.coinsSpent === 0 && p.ownedItems.length === 0 && Object.keys(p.equippedItems).length === 0
  }
  if ((state.coins_spent ?? 0) !== (p.coinsSpent ?? 0)) return false
  const owned = [...p.ownedItems].sort()
  const sOwned = [...(state.owned_items ?? [])].sort()
  if (owned.length !== sOwned.length || owned.some((x, i) => x !== sOwned[i])) return false
  const pe = p.equippedItems ?? {}
  const se = state.equipped_items ?? {}
  const keys = new Set([...Object.keys(pe), ...Object.keys(se)])
  for (const k of keys) if (pe[k] !== se[k]) return false
  return true
}

export default function MainMenu() {
  const router = useRouter()
  const { profile, startChapter, loadLearner, applyServerProgress } = useMiloStore()
  const { speak } = useMiloSpeaker()
  const [showPicker,   setShowPicker]   = useState(false)
  const [ready,        setReady]        = useState(false)
  const [learnerId,    setLearnerId]    = useState<string | null>(null)
  const [ageGroup,     setAgeGroup]     = useState<AgeGroup>('3-5')
  const [lastPlayed,   setLastPlayedState] = useState<ChapterType | null>(null)

  useEffect(() => {
    const learner = getActiveLearner()

    if (learner) {
      loadLearner(learner.id, learner.display_name, learner.avatar_index)
      setLearnerId(learner.id)
      setAgeGroup(learner.age_group)
      const lp = getLastPlayed(learner.id)?.chapter ?? null
      setLastPlayedState(lp)
      setReady(true)

      // Cross-device sync: pull this learner's full state from Supabase (progress,
      // coins, shop items) and merge it in, so everything shows on whatever device
      // they log in on. Then push the merged state back to reconcile the server
      // (propagates anything bought/earned offline). All merges are monotonic.
      ;(async () => {
        try {
          // Offline: local profile stands; nothing to pull/push.
          if (!navigator.onLine) return

          // One round trip pulls access role + stats + progress + shop state.
          const boot = await getLearnerBootstrap(learner.id)
          // Not signed in yet / transient — leave the active learner untouched.
          if (boot.status === 'no-auth') return
          // Signed in but no access → stale or foreign active learner. Clear it
          // and bounce to the picker (stops the FK/RLS sync errors at the source).
          if (boot.status === 'no-access') { clearActiveLearner(); router.replace('/parent'); return }

          const { stats, progress, state } = boot.data
          applyServerProgress(stats, progress, state)

          // Continue-where-you-left-off, cross-device: progress is ordered by
          // last_played_at desc, so progress[0] is the most recently played
          // chapter on ANY device. Adopt it if it's newer than this device's
          // local open, so "Continue" follows the learner between devices.
          const top = progress[0]
          const resolved = reconcileLastPlayed(learner.id, top?.chapter as ChapterType | undefined, top?.last_played_at)
          if (resolved) setLastPlayedState(resolved)

          // Push shop state back ONLY when this device has something the server
          // doesn't (offline purchases, etc.). applyServerProgress merges the
          // server in monotonically, so equal state means a plain menu visit —
          // no write needed, no needless mobile request.
          const p = useMiloStore.getState().profile
          if (!shopStateMatchesServer(p, state)) {
            await saveLearnerState(learner.id, {
              coinsSpent:    p.coinsSpent,
              ownedItems:    p.ownedItems,
              equippedItems: p.equippedItems,
            })
          }
        } catch { /* offline / transient — local profile stands until next online load */ }
      })()

      // Personalised greeting based on whether they've played before
      const ids = chaptersForAge(learner.age_group).map(c => c.id)
      const doneCount = ids.filter(ch => (profile.chapterStars[ch] ?? 0) > 0).length
      if (lp && doneCount > 0) {
        speak(`Welcome back, ${learner.display_name}! Ready to continue ${CHAPTER_NAMES[lp]}?`)
      } else {
        speak(`Welcome, ${learner.display_name}! Which chapter do you want to play?`)
      }
      return
    }

    if (profile.hasCompletedSetup) {
      setReady(true)
      return
    }

    router.replace('/parent')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const levelName   = LEVEL_NAMES[Math.min(profile.currentLevel - 1, LEVEL_NAMES.length - 1)]
  const avatarSrc = AVATAR_SRCS[profile.avatarIndex] ?? AVATAR_SRCS[0]
  const childName   = profile.childName

  // Chapters this learner sees, scoped to their age group.
  const chapterIds = chaptersForAge(ageGroup).map(c => c.id)

  // Next unplayed chapter
  const nextChapter = chapterIds.find(ch => (profile.chapterStars[ch] ?? 0) === 0)
    ?? chapterIds[chapterIds.length - 1]

  const doneCount = chapterIds.filter(ch => (profile.chapterStars[ch] ?? 0) > 0).length
  const allDone   = doneCount === chapterIds.length

  // Resume chapter = last played if different from next, else null
  const resumeChapter: ChapterType | null = (
    lastPlayed && lastPlayed !== nextChapter && !allDone
  ) ? lastPlayed : null

  function playChapter(chapter: ChapterType) {
    if (learnerId) setLastPlayed(learnerId, chapter)
    speak(`Let's play ${CHAPTER_NAMES[chapter]}!`)
    startChapter(chapter)
    router.push('/game')
  }

  function handlePlay() { if (nextChapter) playChapter(nextChapter) }
  function handleResume() { if (resumeChapter) playChapter(resumeChapter) }

  if (!ready) return (
    <div style={{
      minHeight: '100dvh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: '#FCEAB6', fontSize: 48,
    }}>🦊</div>
  )

  const resumeStars = resumeChapter ? (profile.chapterStars[resumeChapter] ?? 0) : 0

  return (
    <div className="kit-screen" style={{ background: 'var(--bg-page)' }}>
      <div className="kit-cloud" style={{ width: 140, height: 56, top: 40,  left: 60 }} />
      <div className="kit-cloud" style={{ width: 100, height: 38, top: 110, left: 240 }} />
      <div className="kit-cloud" style={{ width: 110, height: 42, top: 50,  right: 200 }} />

      {/* Topbar */}
      <div className="kit-topbar" style={{ padding: '20px 28px' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <span className="milo-chip tone-yellow">
            <span className="kit-coin size-sm">C</span>
            <span className="numeric">{profile.totalCoins}</span>
          </span>
          <span className="milo-chip tone-green">
            <span className="numeric">{profile.currentStreak}</span>&nbsp;day streak
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="milo-chip tone-blue">
            Level {profile.currentLevel} · {levelName}
          </span>
          <BackButton href='/parent' label='← Switch' size='sm' />
        </div>
      </div>

      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '70px 32px 0', position: 'relative', zIndex: 2,
        gap: 18,
      }}>
        {/* Avatar + greeting */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 28, marginBottom: 4 }}>
          <div style={{
            width: 90, height: 90, borderRadius: 22,
            background: 'var(--milo-orange-soft)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '3px solid var(--milo-orange)',
            overflow: 'hidden',
          }}>
            <img
              src={avatarSrc}
              alt="avatar"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={e => { (e.target as HTMLImageElement).style.display='none' }}
            />
          </div>
          <div>
            <div className="kit-wordmark" style={{ fontSize: 48, whiteSpace: 'nowrap' }}>
              Hi, {childName}!
            </div>
            <div style={{
              fontFamily: 'var(--font-display)', fontWeight: 700,
              fontSize: 20, color: 'var(--ink-soft)', marginTop: 2,
            }}>
              {doneCount > 0 ? `${doneCount} / ${chapterIds.length} chapters done` : 'Ready to play?'}
            </div>
          </div>
        </div>

        {/* ── Resume card — shown when child has a chapter in progress ── */}
        {resumeChapter && (
          <div className="milo-card" style={{
            width: '100%', maxWidth: 700,
            padding: '14px 20px',
            background: 'linear-gradient(135deg, var(--milo-orange-soft) 0%, #fff 100%)',
            border: '3px solid var(--milo-orange)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', rowGap: 10 }}>
              <div style={{ fontSize: 36 }}>{CHAPTER_EMOJIS[resumeChapter]}</div>
              <div style={{ flex: 1, minWidth: 140 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--milo-orange)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>
                  Continue where you left off
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20 }}>
                  {CHAPTER_NAMES[resumeChapter]}
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>
                  {resumeStars > 0
                    ? `${[1,2,3].map(i => i <= resumeStars ? '⭐' : '☆').join('')} — play again to improve!`
                    : 'Not completed yet'}
                </div>
              </div>
              <button
                className="milo-btn tone-green"
                onClick={handleResume}
                style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                ▶ Continue
              </button>
            </div>
          </div>
        )}

        {/* ── Next chapter ribbon ── */}
        <div className="milo-card" style={{ width: '100%', maxWidth: 700, padding: '14px 20px', position: 'relative' }}>
          {/* First time indicator */}
          {doneCount === 0 && (
            <div style={{
              position: 'absolute', top: -14, right: 20,
              background: 'var(--garden-green)', color: '#fff',
              borderRadius: 50, padding: '4px 14px',
              fontSize: 12, fontWeight: 800,
              border: '2.5px solid var(--outline)',
              boxShadow: '0 3px 0 rgba(61,37,22,.15)',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}>
              ★ Start here!
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span className="label" style={{ fontSize: 12 }}>
              {allDone ? 'ALL DONE — REPLAY ANYTIME' : 'NEXT CHAPTER'}
            </span>
            <span className="numeric" style={{ fontSize: 14, color: 'var(--fg-2)' }}>
              {doneCount} / {chapterIds.length} done
            </span>
          </div>
          {nextChapter ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', rowGap: 10 }}>
              <img
                src={CHAPTER_ASSETS[nextChapter]}
                style={{ width: 56, height: 56, objectFit: 'contain' }}
                alt=""
              />
              <div style={{ flex: 1, minWidth: 140 }}>
                <h3 style={{ fontSize: 22, margin: 0 }}>{CHAPTER_NAMES[nextChapter]}</h3>
                <p style={{ fontSize: 14, marginTop: 2, color: 'var(--ink-soft)' }}>
                  {allDone ? 'Great job! All chapters complete!' : 'Tap Play to start!'}
                </p>
              </div>
              <button className="milo-btn tone-green" onClick={handlePlay}>Play</button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ fontSize: 44 }}>🚧</div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 20, margin: 0 }}>New chapters coming soon!</h3>
                <p style={{ fontSize: 14, marginTop: 2, color: 'var(--ink-soft)' }}>
                  We&apos;re building activities for this age group. Try Hand Games meanwhile!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* CTA row — no duplicate Play button, green one in the ribbon already handles it */}
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="milo-btn tone-purple size-lg" onClick={() => setShowPicker(true)}>📚 Chapter</button>
          <button className="milo-btn tone-red size-lg" onClick={() => router.push('/play')}>✋ Hand Games</button>
          <button className="milo-btn tone-blue size-lg" onClick={() => router.push('/profile')}>👤 Profile</button>
          <button className="milo-btn tone-yellow size-lg" onClick={() => router.push('/shop')}>🛍 Shop</button>
        </div>
      </div>

      {showPicker && <ChapterPicker onClose={() => setShowPicker(false)} />}
      <style>{`@keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }`}</style>
      <PWAInstallBanner />
    </div>
  )
}