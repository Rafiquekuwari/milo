'use client'
/**
 * /insights — founder retention dashboard (NOT kid-facing). Answers the one
 * question that matters before building more content: do kids come back?
 *
 * Retention is derived from the existing `sessions` table (day-level activity);
 * the funnel (opens → completes, skips) comes from `learner_events`. Scoped by
 * RLS to the signed-in account's learners — for cross-account aggregates you'll
 * later want a service-role admin view.
 */
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getMyLearners } from '@/lib/supabase/queries'
import { computeStreak } from '@/lib/daily'
import type { Learner } from '@/lib/supabase/types'

const DAY = 86_400_000
type Sess = { learner_id: string; phase: string; correct_count: number; wrong_count: number; completed_at: string | null; created_at: string }
type Evt = { learner_id: string; event: string; created_at: string }

const ms = (s: string) => new Date(s).getTime()
const dayKey = (s: string) => new Date(s).toISOString().slice(0, 10)

export default function InsightsPage() {
  const router = useRouter()
  const [state, setState] = useState<'loading' | 'ready' | 'no-auth'>('loading')
  const [learners, setLearners] = useState<Learner[]>([])
  const [sessions, setSessions] = useState<Sess[]>([])
  const [events, setEvents] = useState<Evt[]>([])

  async function load() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setState('no-auth'); return }
    const ls = await getMyLearners()
    const ids = ls.map(l => l.id)
    if (ids.length) {
      const [s, e] = await Promise.all([
        supabase.from('sessions').select('learner_id, phase, correct_count, wrong_count, completed_at, created_at').in('learner_id', ids),
        supabase.from('learner_events').select('learner_id, event, created_at').in('learner_id', ids),
      ])
      setSessions((s.data ?? []) as Sess[])
      setEvents((e.data ?? []) as Evt[])
    }
    setLearners(ls)
    setState('ready')
  }
  useEffect(() => { load() }, [])
  useEffect(() => { if (state === 'no-auth') router.replace('/auth') }, [state, router])

  const m = useMemo(() => computeMetrics(learners, sessions, events), [learners, sessions, events])

  if (state !== 'ready') return <Shell><p style={S.dim}>{state === 'no-auth' ? 'Sign in required…' : 'Loading insights…'}</p></Shell>

  return (
    <Shell>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <h1 style={S.h1}>Retention insights</h1>
        <button onClick={() => { setState('loading'); load() }} style={S.refresh}>↻ Refresh</button>
      </div>
      <p style={S.dim}>Scoped to your account&apos;s {m.learners} learner{m.learners === 1 ? '' : 's'}. The number that matters: do they come back?</p>

      {m.learners === 0 || m.totalSessions === 0 ? (
        <div style={S.empty}>No activity yet. Get a few kids playing, then this fills in. (Each finished chapter logs a session; opens/completes log events.)</div>
      ) : (
        <>
          <div style={S.cardsRow}>
            <Stat label="Learners" value={m.learners} />
            <Stat label="Active last 7d" value={m.active7} sub={`${pct(m.active7, m.learners)} of learners`} />
            <Stat label="Active last 30d" value={m.active30} sub={`${pct(m.active30, m.learners)} of learners`} />
            <Stat label="Came back ≥2 days" value={m.returning} sub={`${pct(m.returning, m.learners)} returned at all`} hot />
          </div>

          <h2 style={S.h2}>Return rate (the headline)</h2>
          <p style={S.dim}>Of learners who first played at least N days ago, how many were still active N+ days later.</p>
          <div style={S.cardsRow}>
            <Stat label="Day 1" value={frac(m.d1)} sub={`${m.d1.retained}/${m.d1.eligible} eligible`} />
            <Stat label="Day 7" value={frac(m.d7)} sub={`${m.d7.retained}/${m.d7.eligible} eligible`} hot />
            <Stat label="Day 30" value={frac(m.d30)} sub={`${m.d30.retained}/${m.d30.eligible} eligible`} />
          </div>

          <h2 style={S.h2}>Engagement funnel</h2>
          <div style={S.cardsRow}>
            <Stat label="Chapters opened" value={m.opens} />
            <Stat label="Chapters finished" value={m.completes} sub={`${pct(m.completes, m.opens)} completion`} />
            <Stat label="Opened, not finished" value={Math.max(0, m.opens - m.completes)} sub={m.opens ? `${pct(Math.max(0, m.opens - m.completes), m.opens)} of opens` : ''} />
            <Stat label="Avg accuracy" value={m.accuracy != null ? `${m.accuracy}%` : '—'} sub="practice rounds" />
          </div>

          <h2 style={S.h2}>Milo&apos;s Daily (the retention loop)</h2>
          <div style={S.cardsRow}>
            <Stat label="Daily opened" value={m.dailyOpens} />
            <Stat label="Daily finished" value={m.dailyCompletes} sub={`${pct(m.dailyCompletes, m.dailyOpens)} completion`} />
            <Stat label="On a streak now" value={m.activeStreaks} sub={`${pct(m.activeStreaks, m.learners)} of learners`} hot />
            <Stat label="Longest current" value={`${m.maxStreak}d`} />
            <Stat label="Longest ever" value={`${m.bestStreak}d`} />
          </div>

          <h2 style={S.h2}>Per learner</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={S.table}>
              <thead><tr>{['Learner', 'Age', 'First seen', 'Last seen', 'Days active', 'Sessions', 'Span', 'Streak'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>
                {m.rows.map(r => (
                  <tr key={r.id}>
                    <td style={S.td}>{r.name}</td>
                    <td style={S.td}>{r.age}</td>
                    <td style={S.td}>{r.first}</td>
                    <td style={S.td}>{r.last}</td>
                    <td style={S.td}>{r.activeDays}</td>
                    <td style={S.td}>{r.sessions}</td>
                    <td style={S.td}>{r.spanDays}d</td>
                    <td style={S.td}>{r.streakCur > 0 ? `🔥 ${r.streakCur}` : '—'}{r.streakBest > r.streakCur ? ` (best ${r.streakBest})` : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Shell>
  )
}

function computeMetrics(learners: Learner[], sessions: Sess[], events: Evt[]) {
  const now = Date.now()
  const byLearner = new Map<string, number[]>()  // learner_id → session timestamps
  for (const s of sessions) {
    const t = ms(s.completed_at ?? s.created_at)
    if (!byLearner.has(s.learner_id)) byLearner.set(s.learner_id, [])
    byLearner.get(s.learner_id)!.push(t)
  }

  const per = learners.map(l => {
    const times = (byLearner.get(l.id) ?? []).sort((a, b) => a - b)
    const days = new Set(times.map(t => dayKey(new Date(t).toISOString())))
    const first = times[0] ?? null, last = times[times.length - 1] ?? null
    const st = computeStreak(events.filter(e => e.event === 'daily_complete' && e.learner_id === l.id).map(e => dayKey(e.created_at)))
    return {
      id: l.id, name: l.display_name, age: l.age_group ?? '3-5',
      firstMs: first, lastMs: last, activeDays: days.size, sessions: times.length,
      spanDays: first && last ? Math.round((last - first) / DAY) : 0,
      streakCur: st.current, streakBest: st.longest,
      first: first ? dayKey(new Date(first).toISOString()) : '—',
      last: last ? dayKey(new Date(last).toISOString()) : '—',
    }
  })

  const played = per.filter(p => p.sessions > 0)
  const active7 = played.filter(p => p.lastMs! >= now - 7 * DAY).length
  const active30 = played.filter(p => p.lastMs! >= now - 30 * DAY).length
  const returning = played.filter(p => p.activeDays >= 2).length

  const retention = (N: number) => {
    const eligible = played.filter(p => p.firstMs! <= now - N * DAY)
    const retained = eligible.filter(p => p.lastMs! - p.firstMs! >= N * DAY)
    return { eligible: eligible.length, retained: retained.length }
  }

  const opens = events.filter(e => e.event === 'chapter_open').length
  const completes = events.filter(e => e.event === 'practice_complete').length
  const skips = events.filter(e => e.event === 'lesson_skip').length
  const dailyOpens = events.filter(e => e.event === 'daily_open').length
  const dailyCompletes = events.filter(e => e.event === 'daily_complete').length
  const practice = sessions.filter(s => s.phase === 'practice')
  const totC = practice.reduce((a, s) => a + s.correct_count, 0)
  const totW = practice.reduce((a, s) => a + s.wrong_count, 0)
  const accuracy = totC + totW > 0 ? Math.round((totC / (totC + totW)) * 100) : null

  return {
    learners: learners.length, totalSessions: sessions.length,
    active7, active30, returning,
    d1: retention(1), d7: retention(7), d30: retention(30),
    opens, completes: completes || practice.length, skips, accuracy,
    dailyOpens, dailyCompletes,
    activeStreaks: per.filter(p => p.streakCur >= 1).length,
    maxStreak: Math.max(0, ...per.map(p => p.streakCur)),
    bestStreak: Math.max(0, ...per.map(p => p.streakBest)),
    rows: per.sort((a, b) => (b.lastMs ?? 0) - (a.lastMs ?? 0)),
  }
}

const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : '—')
const frac = (r: { retained: number; eligible: number }) => (r.eligible > 0 ? `${Math.round((r.retained / r.eligible) * 100)}%` : '—')

function Stat({ label, value, sub, hot }: { label: string; value: number | string; sub?: string; hot?: boolean }) {
  return (
    <div style={{ ...S.card, ...(hot ? { borderColor: '#F26B2C', background: '#FFF4D6' } : {}) }}>
      <div style={S.statLabel}>{label}</div>
      <div style={S.statValue}>{value}</div>
      {sub ? <div style={S.statSub}>{sub}</div> : null}
    </div>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div style={S.page}><div style={{ maxWidth: 920, margin: '0 auto' }}>{children}</div></div>
}

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: '100dvh', background: '#faf7f0', padding: '32px 20px 64px', fontFamily: 'var(--font-body, system-ui)', color: '#1a1a1a' },
  h1: { fontFamily: 'var(--font-display, system-ui)', fontSize: 28, fontWeight: 900, margin: 0 },
  h2: { fontFamily: 'var(--font-display, system-ui)', fontSize: 18, fontWeight: 800, margin: '28px 0 6px' },
  dim: { color: '#6b7280', fontSize: 14, margin: '4px 0 0' },
  empty: { marginTop: 24, padding: 24, background: '#fff', border: '2px dashed #d1d5db', borderRadius: 16, color: '#6b7280', textAlign: 'center' },
  refresh: { padding: '8px 16px', borderRadius: 999, border: '2px solid #e5e7eb', background: '#fff', fontWeight: 700, cursor: 'pointer' },
  cardsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginTop: 12 },
  card: { background: '#fff', border: '2px solid #e5e7eb', borderRadius: 16, padding: '14px 16px' },
  statLabel: { fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontFamily: 'var(--font-display, system-ui)', fontSize: 32, fontWeight: 900, lineHeight: 1.1, marginTop: 4 },
  statSub: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: 8, fontSize: 14, background: '#fff', borderRadius: 12, overflow: 'hidden' },
  th: { textAlign: 'left', padding: '10px 12px', background: '#f3f4f6', fontWeight: 800, fontSize: 12, color: '#374151', textTransform: 'uppercase', letterSpacing: 0.4 },
  td: { padding: '10px 12px', borderTop: '1px solid #f0f0f0' },
}
