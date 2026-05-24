'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  getMyLearners, getLearnerStats, getLearnerProgress,
  getRecentSessions, signOut, createLearner,
  getReceivedInvites, acceptInvite,
  getMyAccessRole, deleteLearnerPermanently, removeMyselfFromLearner,
} from '@/lib/supabase/queries'
import { setActiveLearner } from '@/lib/supabase/useLearnerSession'
import { createClient } from '@/lib/supabase/client'
import type { Learner, LearnerStats, LearnerProgress, Session, InviteWithLearner } from '@/lib/supabase/types'

const AVATARS     = ['🦊', '🐰', '🐻', '🐱']
const AVATAR_SRCS = ['/assets/objects/fox.png','/assets/objects/bunny.png','/assets/objects/bear.png','/assets/objects/cat.png']
const CH_LABELS: Record<string, string> = {
  counting: 'Counting', numberOrdering: 'Number Order',
  numberRecognition: 'Number Doors', matchingQuantities: 'Apple Basket',
  numberComparison: 'Bigger or Smaller', shapes: 'Shape House',
  colors: 'Color Garden', addition: 'Addition', subtraction: 'Subtraction',
  patterns: 'Patterns', measurement: 'Measurement',
}
const CHAPTERS    = Object.keys(CH_LABELS)
const LEVEL_NAMES = ['Beginner','Counter','Explorer','Number Star','Math Wizard','Champion',"Milo's Champion",'Legend']

interface LearnerData {
  learner:     Learner
  stats:       LearnerStats | null
  progress:    LearnerProgress[]
  sessions:    Session[]
  accessRole:  'owner' | 'viewer' | null
}

export default function ParentDashboard() {
  const router = useRouter()
  const [learners,     setLearners]     = useState<LearnerData[]>([])
  const [selected,     setSelected]     = useState<string | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [parentName,   setParentName]   = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [invites,      setInvites]      = useState<InviteWithLearner[]>([])
  const [acceptingId,  setAcceptingId]  = useState<string | null>(null)
  const [inviteMsg,    setInviteMsg]    = useState<string | null>(null)
  const [actionMsg,    setActionMsg]    = useState<string | null>(null)
  const [confirming,   setConfirming]   = useState<string | null>(null) // learnerId being confirmed

  async function loadAll() {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/auth'); return }
    setParentName(user.user_metadata?.full_name?.split(' ')[0] ?? 'there')

    const [list, pendingInvites] = await Promise.all([
      getMyLearners(),
      getReceivedInvites(),
    ])
    setInvites(pendingInvites)

    if (list.length === 0) {
      setLearners([]); setSelected(null); setLoading(false); return
    }

    const data = await Promise.all(list.map(async learner => ({
      learner,
      stats:      await getLearnerStats(learner.id),
      progress:   await getLearnerProgress(learner.id),
      sessions:   await getRecentSessions(learner.id, 3),
      accessRole: await getMyAccessRole(learner.id),
    })))

    setLearners(data)
    setSelected(prev => {
      if (prev && data.find(d => d.learner.id === prev)) return prev
      return data[0].learner.id
    })
    setLoading(false)
  }

  useEffect(() => { loadAll() }, []) // eslint-disable-line

  async function handleAcceptInvite(inviteId: string) {
    setAcceptingId(inviteId)
    const result = await acceptInvite(inviteId)
    if (result.ok) {
      setInviteMsg('Access granted! Learner added to your dashboard.')
      setInvites(prev => prev.filter(i => i.id !== inviteId))
      await loadAll()
    } else {
      setInviteMsg(result.error ?? 'Something went wrong')
    }
    setAcceptingId(null)
  }

  function handleDeclineInvite(inviteId: string) {
    setInvites(prev => prev.filter(i => i.id !== inviteId))
  }

  async function handleDelete(learnerId: string) {
    const result = await deleteLearnerPermanently(learnerId)
    if (result.ok) {
      setActionMsg('Learner deleted.')
      setConfirming(null)
      await loadAll()
    } else {
      setActionMsg(result.error ?? 'Failed to delete')
    }
  }

  async function handleRemoveSelf(learnerId: string) {
    const result = await removeMyselfFromLearner(learnerId)
    if (result.ok) {
      setActionMsg('You have been removed from this learner.')
      setConfirming(null)
      await loadAll()
    } else {
      setActionMsg(result.error ?? 'Failed to remove')
    }
  }

  function launchGame(learner: Learner) {
    setActiveLearner(learner)
    router.push('/menu')
  }

  const active = learners.find(d => d.learner.id === selected)

  if (loading) return (
    <div style={{ minHeight:'100dvh', display:'flex', alignItems:'center', justifyContent:'center', background:'#FCEAB6', fontSize:48 }}>🦊</div>
  )

  return (
    <div style={{ minHeight:'100dvh', background:'linear-gradient(180deg,#FFF4D6 0%,#f9f9f9 40%)', fontFamily:'var(--font-body)' }}>

      {/* Top bar */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', background:'#fff', boxShadow:'0 1px 8px rgba(0,0,0,0.06)', position:'sticky', top:0, zIndex:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:28 }}>🦊</span>
          <div>
            <div style={{ fontSize:13, color:'#888', fontWeight:500 }}>Welcome back</div>
            <div style={{ fontSize:16, fontWeight:800, color:'#1a1a1a' }}>{parentName}</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => router.push('/parent/invites')} style={{ background:'none', border:'1.5px solid #e5e7eb', borderRadius:50, padding:'8px 14px', fontSize:13, fontWeight:600, color:'#888', cursor:'pointer' }}>✉️ Share</button>
          <button onClick={signOut} style={{ background:'none', border:'1.5px solid #e5e7eb', borderRadius:50, padding:'8px 14px', fontSize:13, fontWeight:600, color:'#888', cursor:'pointer' }}>Sign out</button>
        </div>
      </div>

      <div style={{ padding:'20px 16px', maxWidth:480, margin:'0 auto' }}>

        {/* Action message */}
        {actionMsg && (
          <div style={{ background:'#f0fdf4', border:'1.5px solid #bbf7d0', borderRadius:14, padding:'12px 16px', marginBottom:16, fontSize:14, fontWeight:600, color:'#166534', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            ✅ {actionMsg}
            <button onClick={() => setActionMsg(null)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:'#888' }}>×</button>
          </div>
        )}

        {/* Invite popups */}
        {invites.length > 0 && (
          <div style={{ marginBottom:20 }}>
            {inviteMsg && (
              <div style={{ background:'#f0fdf4', border:'1.5px solid #bbf7d0', borderRadius:14, padding:'12px 16px', marginBottom:12, fontSize:14, fontWeight:600, color:'#166534' }}>
                ✅ {inviteMsg}
              </div>
            )}
            {invites.map(inv => (
              <div key={inv.id} style={{ background:'#fff', borderRadius:20, padding:'18px 16px', marginBottom:12, boxShadow:'0 4px 20px rgba(242,107,44,0.15)', border:'2px solid #F26B2C' }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
                  <div style={{ width:44, height:44, borderRadius:12, background:'#FFF4D6', fontSize:24, display:'flex', alignItems:'center', justifyContent:'center' }}>📬</div>
                  <div>
                    <div style={{ fontSize:15, fontWeight:800, color:'#1a1a1a' }}>You've been invited!</div>
                    <div style={{ fontSize:13, color:'#888', marginTop:2 }}>
                      Access to: <strong>{inv.learner_name ?? 'a learner'}</strong>
                    </div>
                  </div>
                </div>
                <div style={{ display:'flex', gap:10 }}>
                  <button onClick={() => handleAcceptInvite(inv.id)} disabled={acceptingId === inv.id} style={{ flex:1, padding:'12px', background:'linear-gradient(135deg,#F26B2C 0%,#e05a1f 100%)', color:'#fff', border:'none', borderRadius:50, fontSize:14, fontWeight:800, cursor:'pointer' }}>
                    {acceptingId === inv.id ? 'Accepting...' : '✓ Accept'}
                  </button>
                  <button onClick={() => handleDeclineInvite(inv.id)} style={{ flex:1, padding:'12px', background:'#fff', color:'#888', border:'1.5px solid #e5e7eb', borderRadius:50, fontSize:14, fontWeight:700, cursor:'pointer' }}>
                    ✕ Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {learners.length === 0 && (
          <div style={{ textAlign:'center', padding:'60px 24px', display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
            <div style={{ fontSize:64 }}>🦊</div>
            <h2 style={{ fontSize:22, fontWeight:800, color:'#1a1a1a', margin:0 }}>Welcome to Milo!</h2>
            <p style={{ fontSize:15, color:'#888', margin:0, maxWidth:280, lineHeight:1.5 }}>
              Add your first learner to get started, or wait for someone to share access with you.
            </p>
            <button onClick={() => setShowAddModal(true)} style={{ marginTop:8, background:'linear-gradient(135deg,#F26B2C 0%,#e05a1f 100%)', color:'#fff', border:'none', borderRadius:50, padding:'16px 36px', fontSize:17, fontWeight:800, cursor:'pointer', boxShadow:'0 4px 20px rgba(242,107,44,0.3)' }}>
              + Add your first learner
            </button>
          </div>
        )}

        {/* Learner selector */}
        {learners.length > 0 && (
          <div style={{ marginBottom:20 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <h2 style={{ fontSize:16, fontWeight:800, margin:0, color:'#1a1a1a' }}>Your learners</h2>
              <button onClick={() => setShowAddModal(true)} style={{ background:'#F26B2C', color:'#fff', border:'none', borderRadius:50, padding:'7px 16px', fontSize:13, fontWeight:700, cursor:'pointer' }}>+ Add child</button>
            </div>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              {learners.map(({ learner }) => (
                <button key={learner.id} onClick={() => setSelected(learner.id)} style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 16px', borderRadius:50, border:'2px solid', borderColor:selected === learner.id ? '#F26B2C' : '#e5e7eb', background:selected === learner.id ? '#FFF4D6' : '#fff', cursor:'pointer', fontSize:14, fontWeight:700, transition:'all 0.15s' }}>
                  <img src={AVATAR_SRCS[learner.avatar_index]} alt="avatar" style={{width:28,height:28,objectFit:'cover',borderRadius:'50%',border:'2px solid var(--outline)'}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}} />
                  {learner.display_name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Active learner detail */}
        {active && (
          <>
            {/* Stats card */}
            <div style={{ background:'linear-gradient(135deg,#F26B2C 0%,#e05a1f 100%)', borderRadius:20, padding:'20px 20px 24px', color:'#fff', marginBottom:16, boxShadow:'0 4px 20px rgba(242,107,44,0.3)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
                <div style={{ width:52, height:52, borderRadius:14, background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28 }}>
                  <img src={['/assets/objects/fox.png','/assets/objects/bunny.png','/assets/objects/bear.png','/assets/objects/cat.png'][active.learner.avatar_index]} alt="avatar" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:12}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}} />
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:20, fontWeight:800 }}>{active.learner.display_name}</div>
                  <div style={{ fontSize:13, opacity:0.85 }}>
                    {LEVEL_NAMES[Math.min((active.stats?.current_level ?? 1) - 1, 7)]} · Level {active.stats?.current_level ?? 1}
                    {' · '}
                    <span style={{ opacity:0.7, fontSize:11, textTransform:'uppercase', letterSpacing:0.5 }}>
                      {active.accessRole === 'owner' ? '👑 Owner' : '👁 Viewer'}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display:'flex', gap:8, marginBottom:16 }}>
                {[
                  { label:'XP',     value: active.stats?.total_xp ?? 0 },
                  { label:'Coins',  value: active.stats?.total_coins ?? 0 },
                  { label:'Streak', value: `${active.stats?.current_streak ?? 0}d` },
                ].map(s => (
                  <div key={s.label} style={{ flex:1, background:'rgba(255,255,255,0.15)', borderRadius:12, padding:'10px 8px', textAlign:'center' }}>
                    <div style={{ fontSize:20, fontWeight:800 }}>{s.value}</div>
                    <div style={{ fontSize:11, opacity:0.8, marginTop:2 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              <button onClick={() => launchGame(active.learner)} style={{ width:'100%', padding:'14px', background:'#fff', color:'#F26B2C', border:'none', borderRadius:50, fontSize:16, fontWeight:800, cursor:'pointer' }}>
                ▶ Start learning
              </button>
            </div>

            {/* Owner: Delete / Viewer: Remove self */}
            {confirming === active.learner.id ? (
              <div style={{ background:'#FEF2F2', border:'1.5px solid #FCA5A5', borderRadius:16, padding:'16px', marginBottom:16 }}>
                <p style={{ fontSize:14, fontWeight:700, color:'#991B1B', margin:'0 0 12px' }}>
                  {active.accessRole === 'owner'
                    ? `⚠️ Permanently delete ${active.learner.display_name}? This cannot be undone. All progress, sessions and data will be lost.`
                    : `Remove yourself from ${active.learner.display_name}'s profile? You will lose access.`}
                </p>
                <div style={{ display:'flex', gap:10 }}>
                  <button
                    onClick={() => active.accessRole === 'owner' ? handleDelete(active.learner.id) : handleRemoveSelf(active.learner.id)}
                    style={{ flex:1, padding:'12px', background:'#DC2626', color:'#fff', border:'none', borderRadius:50, fontSize:14, fontWeight:800, cursor:'pointer' }}
                  >
                    {active.accessRole === 'owner' ? 'Yes, delete' : 'Yes, remove me'}
                  </button>
                  <button onClick={() => setConfirming(null)} style={{ flex:1, padding:'12px', background:'#fff', color:'#888', border:'1.5px solid #e5e7eb', borderRadius:50, fontSize:14, fontWeight:700, cursor:'pointer' }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirming(active.learner.id)}
                style={{ width:'100%', padding:'12px', background:'none', border:'1.5px solid #FCA5A5', borderRadius:50, fontSize:13, fontWeight:700, color:'#DC2626', cursor:'pointer', marginBottom:16 }}
              >
                {active.accessRole === 'owner'
                  ? `🗑 Delete ${active.learner.display_name}'s profile`
                  : `✕ Remove myself from ${active.learner.display_name}'s profile`}
              </button>
            )}

            {/* Chapter progress */}
            <div style={{ background:'#fff', borderRadius:20, padding:'18px 16px', marginBottom:16, boxShadow:'0 2px 12px rgba(0,0,0,0.05)' }}>
              <h3 style={{ fontSize:15, fontWeight:800, margin:'0 0 14px', color:'#1a1a1a' }}>Chapter progress</h3>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {CHAPTERS.map(ch => {
                  const prog  = active.progress.find(p => p.chapter === ch)
                  const stars = prog?.best_stars ?? 0
                  return (
                    <div key={ch} style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ fontSize:13, fontWeight:600, flex:1, color:'#1a1a1a', opacity:stars > 0 ? 1 : 0.4 }}>
                        {CH_LABELS[ch]}
                      </div>
                      <div style={{ fontSize:16 }}>
                        {[1,2,3].map(i => <span key={i} style={{ opacity: i <= stars ? 1 : 0.2 }}>⭐</span>)}
                      </div>
                      {prog?.total_sessions ? (
                        <div style={{ fontSize:11, color:'#888', fontWeight:600, minWidth:32, textAlign:'right' }}>{prog.total_sessions}x</div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Recent sessions */}
            {active.sessions.length > 0 && (
              <div style={{ background:'#fff', borderRadius:20, padding:'18px 16px', boxShadow:'0 2px 12px rgba(0,0,0,0.05)' }}>
                <h3 style={{ fontSize:15, fontWeight:800, margin:'0 0 14px', color:'#1a1a1a' }}>Recent activity</h3>
                {active.sessions.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'20px 0', display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
                    <div style={{ fontSize:36 }}>🎮</div>
                    <div style={{ fontSize:14, color:'#888', fontWeight:500 }}>No sessions yet — time to start playing!</div>
                    <button onClick={() => launchGame(active.learner)} style={{ marginTop:4, background:'#F26B2C', color:'#fff', border:'none', borderRadius:50, padding:'10px 20px', fontSize:13, fontWeight:700, cursor:'pointer' }}>▶ Start first session</button>
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    {active.sessions.map(s => (
                      <div key={s.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px', background:'#f9fafb', borderRadius:12 }}>
                        <div style={{ fontSize:24 }}>{s.stars_earned === 3 ? '🌟' : s.stars_earned === 2 ? '⭐' : '✨'}</div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:13, fontWeight:700, color:'#1a1a1a' }}>{CH_LABELS[s.chapter] ?? s.chapter}</div>
                          <div style={{ fontSize:11, color:'#888', marginTop:2 }}>{s.correct_count} correct · +{s.xp_earned} XP · {new Date(s.started_at).toLocaleDateString()}</div>
                        </div>
                        <div style={{ fontSize:12, fontWeight:700, color:'#16a34a' }}>+{s.coins_earned} 🪙</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Add child modal */}
      {showAddModal && (
        <AddLearnerModal
          onClose={() => setShowAddModal(false)}
          onAdded={async () => { setShowAddModal(false); await loadAll() }}
        />
      )}
    </div>
  )
}

function AddLearnerModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [name,        setName]        = useState('')
  const [avatarIndex, setAvatarIndex] = useState(0)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  async function handleAdd() {
    const trimmed = name.trim()
    if (!trimmed || trimmed.length < 2) { setError('Please enter a name (at least 2 characters)'); return }
    setLoading(true)
    const learner = await createLearner(trimmed, avatarIndex)
    if (!learner) { setError('Something went wrong. Please try again.'); setLoading(false); return }
    onAdded()
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:50, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'flex-end', justifyContent:'center' }} onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:'24px 24px 0 0', padding:'28px 24px 48px', width:'100%', maxWidth:480, animation:'slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)' }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize:20, fontWeight:800, margin:'0 0 20px', color:'#1a1a1a' }}>Add a learner</h3>
        <div style={{ display:'flex', gap:12, marginBottom:20, justifyContent:'center' }}>
          {AVATARS.map((emoji, i) => (
            <button key={i} onClick={() => setAvatarIndex(i)} style={{ width:64, height:64, fontSize:32, borderRadius:16, border:'none', cursor:'pointer', background:avatarIndex===i?'#FFF4D6':'#f3f4f6', outline:avatarIndex===i?'3px solid #F26B2C':'2px solid transparent', transition:'all 0.15s', transform:avatarIndex===i?'scale(1.1)':'scale(1)' }}>{emoji}</button>
          ))}
        </div>
        <input type="text" placeholder="Child's name" value={name} onChange={e => { setName(e.target.value); setError(null) }} onKeyDown={e => e.key === 'Enter' && handleAdd()} maxLength={30} autoFocus style={{ width:'100%', padding:'14px 16px', fontSize:16, fontWeight:600, border:`2px solid ${error?'#FCA5A5':'#e5e7eb'}`, borderRadius:14, outline:'none', boxSizing:'border-box', marginBottom:6 }} />
        {error && <p style={{ fontSize:13, color:'#EF4444', margin:'0 0 12px' }}>{error}</p>}
        <button onClick={handleAdd} disabled={loading} style={{ width:'100%', padding:'16px', marginTop:12, background:loading?'#e5e7eb':'linear-gradient(135deg,#F26B2C 0%,#e05a1f 100%)', color:loading?'#9ca3af':'#fff', border:'none', borderRadius:50, fontSize:17, fontWeight:800, cursor:loading?'wait':'pointer' }}>
          {loading ? 'Adding...' : 'Add learner 🎉'}
        </button>
      </div>
      <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
    </div>
  )
}