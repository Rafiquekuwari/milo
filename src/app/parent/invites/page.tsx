'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  getMyLearners, getSentInvites, getReceivedInvites,
  sendInvite, acceptInvite, revokeInvite,
} from '@/lib/supabase/queries'
import type { Learner, InviteWithLearner } from '@/lib/supabase/types'

export default function InvitesPage() {
  const router = useRouter()
  const [learners,   setLearners]   = useState<Learner[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [sentInvites, setSentInvites] = useState<InviteWithLearner[]>([])
  const [received,    setReceived]    = useState<InviteWithLearner[]>([])
  const [email,       setEmail]       = useState('')
  const [sending,     setSending]     = useState(false)
  const [msg,         setMsg]         = useState<{ text: string; ok: boolean } | null>(null)
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    async function load() {
      const [ls, recv] = await Promise.all([getMyLearners(), getReceivedInvites()])
      setLearners(ls)
      setReceived(recv)
      if (ls.length > 0) {
        setSelectedId(ls[0].id)
        const sent = await getSentInvites(ls[0].id)
        setSentInvites(sent)
      }
      setLoading(false)
    }
    load()
  }, [])

  async function onLearnerChange(id: string) {
    setSelectedId(id)
    const sent = await getSentInvites(id)
    setSentInvites(sent)
  }

  async function handleSend() {
    if (!email.trim() || !selectedId) return
    setSending(true); setMsg(null)
    const result = await sendInvite(selectedId, email.trim())
    if (result.ok) {
      setMsg({ text: `Invite sent to ${email.trim()}!`, ok: true })
      setEmail('')
      const sent = await getSentInvites(selectedId)
      setSentInvites(sent)
    } else {
      setMsg({ text: result.error ?? 'Failed to send invite', ok: false })
    }
    setSending(false)
  }

  async function handleAccept(inviteId: string) {
    const result = await acceptInvite(inviteId)
    if (result.ok) {
      setReceived(r => r.filter(i => i.id !== inviteId))
      setMsg({ text: 'Access granted! Learner added to your dashboard.', ok: true })
      const ls = await getMyLearners()
      setLearners(ls)
    } else {
      setMsg({ text: result.error ?? 'Failed to accept', ok: false })
    }
  }

  async function handleRevoke(inviteId: string) {
    const ok = await revokeInvite(inviteId)
    if (ok) setSentInvites(s => s.filter(i => i.id !== inviteId))
  }

  if (loading) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FCEAB6', fontSize: 36 }}>🦊</div>
  )

  const selectedLearner = learners.find(l => l.id === selectedId)

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'linear-gradient(180deg, #FFF4D6 0%, #f9f9f9 40%)',
      fontFamily: 'var(--font-body)',
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '16px 20px',
        background: '#fff',
        boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button onClick={() => router.push('/parent')} style={{
          background: 'none', border: '1.5px solid #e5e7eb',
          borderRadius: 50, padding: '8px 16px',
          fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#888',
        }}>← Back</button>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-dark)' }}>Share Access</div>
          <div style={{ fontSize: 12, color: '#888' }}>Invite anyone to view a learner's progress</div>
        </div>
      </div>

      <div style={{ padding: '20px 16px', maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Received invites */}
        {received.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 20, padding: '18px 16px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 14px', color: 'var(--text-dark)' }}>
              📬 Invites waiting for you
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {received.map(inv => (
                <div key={inv.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px', background: '#f0fdf4',
                  borderRadius: 14, border: '1.5px solid #bbf7d0',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#166534' }}>
                      Access to: {inv.learner_name ?? 'a learner'}
                    </div>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                      Expires {new Date(inv.expires_at).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={() => handleAccept(inv.id)}
                    style={{
                      background: '#16a34a', color: '#fff',
                      border: 'none', borderRadius: 50,
                      padding: '8px 16px', fontSize: 13, fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >Accept</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Send invite */}
        <div style={{ background: '#fff', borderRadius: 20, padding: '18px 16px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 4px', color: 'var(--text-dark)' }}>
            ✉️ Send an invite
          </h3>
          <p style={{ fontSize: 13, color: '#888', margin: '0 0 16px' }}>
            Share a learner's progress with a parent, teacher, or carer
          </p>

          {/* Learner selector */}
          {learners.length > 1 && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#333', display: 'block', marginBottom: 6 }}>
                Which learner?
              </label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {learners.map(l => (
                  <button key={l.id} onClick={() => onLearnerChange(l.id)} style={{
                    padding: '8px 14px', borderRadius: 50, fontSize: 13, fontWeight: 700,
                    border: '2px solid',
                    borderColor: selectedId === l.id ? 'var(--milo-orange)' : '#e5e7eb',
                    background: selectedId === l.id ? 'var(--milo-orange-soft)' : '#fff',
                    cursor: 'pointer',
                  }}>
                    {['🦊','🐰','🐻','🐱'][l.avatar_index]} {l.display_name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Email input */}
          <label style={{ fontSize: 13, fontWeight: 700, color: '#333', display: 'block', marginBottom: 6 }}>
            Their email address
          </label>
          <input
            type="email"
            placeholder="e.g. teacher@school.com"
            value={email}
            onChange={e => { setEmail(e.target.value); setMsg(null) }}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            style={{
              width: '100%', padding: '13px 16px',
              fontSize: 15, fontWeight: 500,
              border: '2px solid #e5e7eb', borderRadius: 14,
              outline: 'none', boxSizing: 'border-box',
              marginBottom: 12,
            }}
          />

          {msg && (
            <div style={{
              padding: '10px 14px', borderRadius: 12, marginBottom: 12,
              fontSize: 14, fontWeight: 600,
              background: msg.ok ? '#f0fdf4' : '#fef2f2',
              color: msg.ok ? '#166534' : '#991b1b',
              border: `1.5px solid ${msg.ok ? '#bbf7d0' : '#fecaca'}`,
            }}>
              {msg.ok ? '✅' : '❌'} {msg.text}
            </div>
          )}

          <button
            onClick={handleSend}
            disabled={sending || !email.trim() || !selectedId}
            style={{
              width: '100%', padding: '14px',
              background: sending || !email.trim()
                ? '#e5e7eb'
                : 'linear-gradient(135deg, var(--milo-orange) 0%, var(--milo-orange-deep) 100%)',
              color: sending || !email.trim() ? '#9ca3af' : '#fff',
              border: 'none', borderRadius: 50,
              fontSize: 16, fontWeight: 800,
              cursor: sending || !email.trim() ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {sending ? 'Sending...' : `Send invite for ${selectedLearner?.display_name ?? 'learner'}`}
          </button>
        </div>

        {/* Sent invites */}
        {sentInvites.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 20, padding: '18px 16px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 14px', color: 'var(--text-dark)' }}>
              Pending invites sent
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sentInvites.map(inv => (
                <div key={inv.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', background: '#f9fafb',
                  borderRadius: 12,
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#333' }}>{inv.invited_email}</div>
                    <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                      {inv.status === 'accepted' ? '✅ Accepted' : `Expires ${new Date(inv.expires_at).toLocaleDateString()}`}
                    </div>
                  </div>
                  {inv.status === 'pending' && (
                    <button onClick={() => handleRevoke(inv.id)} style={{
                      background: 'none', border: '1.5px solid #fecaca',
                      borderRadius: 50, padding: '5px 12px',
                      fontSize: 12, fontWeight: 600, color: '#991b1b',
                      cursor: 'pointer',
                    }}>Revoke</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
