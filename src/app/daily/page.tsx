'use client'
/**
 * /daily — "Milo's Daily": a short spaced-repetition review (5 questions) + a
 * gentle streak. The retention loop. Math-without-fear: no timer, warm wrong
 * answers (correct reveals green, the pick stays soft), and a missed day never
 * shames — the streak just restarts warmly. Logs daily_open / daily_complete.
 */
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getActiveLearner } from '@/lib/supabase/useLearnerSession'
import { speak, stopSpeech } from '@/lib/useMiloSpeaker'
import { track } from '@/lib/analytics'
import { generateDaily, recordSkillResult, recordDailyDone, type DailyQuestion } from '@/lib/daily'
import type { AgeGroup } from '@/lib/chapters'

const TOTAL = 5

export default function DailyPage() {
  const router = useRouter()
  const [learner, setLearner] = useState<{ id: string; name: string; age: AgeGroup } | null | 'none'>(null)
  const [qs, setQs] = useState<DailyQuestion[]>([])
  const [idx, setIdx] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [correct, setCorrect] = useState(0)
  const [reward, setReward] = useState<{ streak: number; isRecord: boolean; restarted: boolean } | null>(null)
  const spoken = useRef('')

  // Boot: load the active learner and build today's review once.
  useEffect(() => {
    const l = getActiveLearner()
    if (!l) { setLearner('none'); return }
    const age = (l.age_group ?? '3-5') as AgeGroup
    setLearner({ id: l.id, name: l.display_name, age })
    setQs(generateDaily(age, l.id, TOTAL))
    track('daily_open', { ageGroup: age })
  }, [])
  useEffect(() => { if (learner === 'none') router.replace('/menu') }, [learner, router])

  // Speak each question as it appears.
  useEffect(() => {
    const q = qs[idx]
    if (!q || reward || spoken.current === `${idx}`) return
    spoken.current = `${idx}`
    speak(q.say)
  }, [qs, idx, reward])

  if (!learner || learner === 'none' || qs.length === 0) {
    return <Shell><p style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-display)' }}>Loading Milo&apos;s Daily…</p></Shell>
  }

  const q = qs[idx]

  function choose(c: string) {
    if (selected !== null || !learner || learner === 'none') return
    const ok = c === q.answer
    setSelected(c); setFeedback(ok ? 'correct' : 'wrong')
    setCorrect(n => n + (ok ? 1 : 0))
    recordSkillResult(learner.id, q.skill, ok)
    speak(ok ? 'Yes! Nice!' : `It's ${q.answer} — now you know!`)
    window.setTimeout(() => {
      if (idx + 1 >= TOTAL) {
        stopSpeech()
        const r = recordDailyDone(learner.id)
        track('daily_complete', { streak: r.streak, correct: correct + (ok ? 1 : 0) })
        setReward({ streak: r.streak, isRecord: r.isRecord, restarted: r.restarted })
      } else {
        setIdx(i => i + 1); setSelected(null); setFeedback(null)
      }
    }, ok ? 1100 : 1700)
  }

  if (reward) {
    const headline = reward.restarted
      ? 'Welcome back! 🌱'
      : `🔥 ${reward.streak} day${reward.streak === 1 ? '' : 's'} with Milo!`
    const sub = reward.restarted
      ? 'A fresh start — Day 1. Lovely to see you!'
      : reward.isRecord ? 'A new best streak! ⭐' : 'You reviewed 5 skills today.'
    return (
      <Shell>
        <Confetti />
        <img src="/assets/characters/milo-happy.png" alt="Milo" style={{ width: 120, height: 120, objectFit: 'contain' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 30, color: 'var(--milo-orange)', margin: '6px 0 4px', textAlign: 'center' }}>{headline}</h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: 'var(--ink-soft)', margin: 0, textAlign: 'center' }}>{sub}</p>
        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: 'var(--garden-green-deep)', margin: '10px 0 0' }}>You got {correct} of {TOTAL}! 🌟</p>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--ink-muted)', margin: '14px 0 0', textAlign: 'center' }}>Come back tomorrow for a new Daily! 🌙</p>
        <button onClick={() => { stopSpeech(); router.push('/menu') }} style={{ marginTop: 22, padding: '15px 32px', background: 'linear-gradient(135deg,var(--milo-orange) 0%,var(--milo-orange-deep) 100%)', color: '#fff', border: 'none', borderRadius: 50, fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, cursor: 'pointer', boxShadow: '0 4px 18px rgba(242,107,44,0.35)' }}>Back to Milo 🏠</button>
      </Shell>
    )
  }

  return (
    <Shell>
      <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
        {Array.from({ length: TOTAL }).map((_, i) => (
          <div key={i} style={{ width: i === idx ? 22 : 9, height: 9, borderRadius: 5, transition: 'all .3s', background: i < idx ? 'var(--garden-green)' : i === idx ? 'var(--milo-orange)' : 'rgba(61,37,22,0.12)' }} />
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, width: '100%', maxWidth: 460 }}>
        <img src="/assets/characters/milo-happy.png" alt="Milo" style={{ width: 64, height: 64, objectFit: 'contain', flexShrink: 0 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        <div style={{ background: '#fff', border: '3px solid var(--outline)', borderRadius: '18px 18px 18px 4px', padding: '10px 14px', flex: 1, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--ink)', boxShadow: '0 4px 0 rgba(61,37,22,.07)' }}>
          {selected === null ? q.say : feedback === 'correct' ? '🎉 Yes!' : `It's ${q.answer} — now you know! 🙂`}
        </div>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.7)', border: '4px solid var(--outline)', borderRadius: 24, boxShadow: '0 6px 0 rgba(61,37,22,.08)', padding: '26px 22px', minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 44, color: 'var(--milo-orange)', textAlign: 'center', lineHeight: 1.1 }}>{q.prompt}</div>
      </div>

      <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
        {q.choices.map(c => {
          const answered = selected !== null, isOk = c === q.answer, isSel = selected === c
          return (
            <button key={c} onClick={() => choose(c)} disabled={answered} style={{
              minWidth: 96, height: 84, padding: '0 16px',
              background: (answered && isOk) ? 'var(--garden-green-soft)' : 'var(--paper)',
              border: `4px solid ${(answered && isOk) ? 'var(--garden-green)' : isSel ? 'var(--ink-muted)' : 'var(--outline)'}`,
              borderRadius: 22, boxShadow: `0 6px 0 ${(answered && isOk) ? 'var(--garden-green-deep)' : '#c8ac79'}`,
              fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 30, color: 'var(--ink)',
              cursor: answered ? 'default' : 'pointer',
              transform: ((answered && isOk) || isSel) ? 'scale(1.06) translateY(-3px)' : 'scale(1)',
              transition: 'transform 160ms cubic-bezier(.34,1.56,.64,1), background 160ms ease',
            }}>{c}</button>
          )
        })}
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '24px 16px', background: 'linear-gradient(180deg,var(--sun-yellow-soft) 0%,var(--bg-page) 55%)', position: 'relative' }}>
      {children}
    </div>
  )
}

function Confetti() {
  const colors = ['#F26B2C', '#FFC933', '#6FBE3F', '#5BC3F0', '#9362D8', '#E64545']
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {Array.from({ length: 18 }).map((_, i) => (
        <div key={i} style={{ position: 'absolute', left: `${(i * 23) % 100}%`, top: `${(i * 17) % 30}%`, width: 12, height: 12, borderRadius: i % 2 ? '3px' : '50%', background: colors[i % colors.length], animation: `confettiFall ${1.2 + (i % 3) * 0.3}s ease-in ${(i % 5) * 0.1}s both` }} />
      ))}
    </div>
  )
}
