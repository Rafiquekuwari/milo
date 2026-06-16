'use client'
export const dynamic = 'force-static'
/**
 * Thumbs Up / Thumbs Down — AR quiz. Milo shows + says a true/false question
 * (mixed: counting, comparison, shapes, colours, number facts); the child
 * answers with 👍 (yes) or 👎 (no). On-device, consent-gated, adaptive.
 */
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMiloSpeaker } from '@/lib/useMiloSpeaker'
import { useChapterSync } from '@/lib/supabase/useChapterSync'
import { useAdaptive } from '@/lib/adaptive'
import { DifficultyBadge } from '@/components/ui/DifficultyBadge'
import CelebrationModal from '@/components/ui/CelebrationModal'
import CameraError from '@/components/ui/CameraError'
import HowToPlay from '@/components/ui/HowToPlay'
import { useHandGesture, type Gesture } from '@/lib/ar/useHandGesture'
import { makeQuiz, type Quiz } from '@/lib/ar/quizQuestions'
import { kv } from '@/lib/kv'

const TOTAL_ROUNDS = 10
type Phase = 'gate' | 'howto' | 'playing' | 'done'

export default function ThumbsQuizActivity() {
  const router = useRouter()
  const { speak } = useMiloSpeaker()
  const { finishAndSync } = useChapterSync()

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [phase, setPhase] = useState<Phase>('gate')
  const [consented, setConsented] = useState(false)
  const [roundIdx, setRoundIdx] = useState(0)
  const [quiz, setQuiz] = useState<Quiz>({ visual: '', question: '', answer: true })
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const startedRef = useRef(false)

  const ada = useAdaptive('numberComparison')
  const answeredRef = useRef(false)
  const correctRef = useRef(0)
  const wrongRef = useRef(0)
  const quizRef = useRef(quiz)
  quizRef.current = quiz
  const onGestureImpl = useRef<(g: Gesture) => void>(() => {})

  useEffect(() => { setConsented(kv.get('milo-camera-consent') === '1') }, [])

  onGestureImpl.current = (g: Gesture) => {
    if (answeredRef.current) return
    answeredRef.current = true
    const ok = (g === 'thumbsUp') === quizRef.current.answer
    if (ok) correctRef.current++; else wrongRef.current++
    ada.record(ok)
    setFeedback(ok ? 'correct' : 'wrong')
    speak(ok ? `Yes! ${ada.praise}` : `The answer was ${quizRef.current.answer ? 'yes' : 'no'}. ${ada.encouragement}`)
    const next = roundIdx + 1
    window.setTimeout(() => {
      setFeedback(null)
      if (next >= TOTAL_ROUNDS) finish(); else setRoundIdx(next)
    }, 1700)
  }

  const { status, error, start, stop } = useHandGesture(videoRef, canvasRef, { onGesture: g => onGestureImpl.current(g) })

  useEffect(() => {
    if (phase === 'playing' && !startedRef.current) { startedRef.current = true; start() }
  }, [phase, start])

  useEffect(() => {
    if (phase !== 'playing' || status !== 'running') return
    const q = makeQuiz(ada.difficulty)
    setQuiz(q); answeredRef.current = false; setFeedback(null)
    speak(`${q.question} Thumbs up for yes, thumbs down for no!`)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIdx, status, phase])

  function finish() { stop(); finishAndSync('numberComparison', correctRef.current, wrongRef.current); setPhase('done') }
  function replay() { correctRef.current = 0; wrongRef.current = 0; answeredRef.current = false; setFeedback(null); setRoundIdx(0); startedRef.current = false; setPhase('playing') }
  function begin() { kv.set('milo-camera-consent', '1'); setConsented(true); setPhase('howto') }

  if (phase === 'gate') {
    return (
      <Shell>
        <div style={card}>
          <div style={{ fontSize: 64 }}>👍</div>
          <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--ink)', margin: '8px 0' }}>Thumbs Up or Down</h1>
          {consented
            ? <p style={muted}>Milo asks a question — answer 👍 for yes, 👎 for no!</p>
            : <p style={muted}>Ask a grown-up first! This uses the camera so Milo can see your hand. The video stays on this device and is never saved or sent anywhere.</p>}
          <button className="milo-btn tone-green size-lg" onClick={begin}>{consented ? '▶ Start' : '✅ Allow camera'}</button>
          <button className="milo-btn tone-cream" onClick={() => router.push('/play')}>← Back</button>
        </div>
      </Shell>
    )
  }

  if (phase === 'howto') {
    return <HowToPlay title="Thumbs Up or Down" steps={['Milo asks a question.', 'Thumbs up 👍 for yes, thumbs down 👎 for no!']} demo="fingers" onStart={() => setPhase('playing')} />
  }

  if (phase === 'done') {
    return (
      <Shell>
        <CelebrationModal hideNext onPlayAgain={replay} onExit={() => router.push('/play')} exitLabel="← Back to games" />
      </Shell>
    )
  }

  return (
    <Shell>
      <DifficultyBadge difficulty={ada.difficulty} isOnFire={ada.isOnFire} />
      <div className="milo-bubble" style={{ fontSize: 40, lineHeight: 1.1, maxWidth: 520, textAlign: 'center', fontFamily: 'var(--font-display)' }}>
        {feedback === 'correct' ? <span style={{ fontSize: 26 }}>✅ Yes!</span>
          : feedback === 'wrong' ? <span style={{ fontSize: 26 }}>❌ Oops!</span>
          : quiz.visual}
      </div>
      <div style={{ position: 'relative', width: 'min(92vw, 520px)', aspectRatio: '4/3', borderRadius: 20, overflow: 'hidden', border: '5px solid var(--outline)', background: '#000', boxShadow: '0 6px 0 rgba(61,37,22,.2)' }}>
        <video ref={videoRef} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
        {status === 'loading' && <div style={overlayCenter}>Loading Milo’s eyes… 👀</div>}
        {status === 'error' && <CameraError errorName={error} onRetry={start} onBack={() => router.push('/play')} />}
      </div>
      <p style={{ fontFamily: 'var(--font-body)', color: 'var(--ink-muted)', margin: 0 }}>👍 yes · 👎 no — Round {Math.min(roundIdx + 1, TOTAL_ROUNDS)} of {TOTAL_ROUNDS}</p>
      <button className="milo-btn tone-cream" onClick={() => { stop(); router.push('/play') }}>← Back</button>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, padding: 24, background: 'linear-gradient(180deg,var(--sky-blue-soft) 0%,var(--bg-page) 55%)' }}>
      {children}
    </div>
  )
}

const card: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center', background: 'var(--paper)', border: '4px solid var(--outline)', borderRadius: 24, padding: '28px 24px', maxWidth: 460, boxShadow: '0 8px 0 rgba(61,37,22,.2)' }
const muted: React.CSSProperties = { fontFamily: 'var(--font-body)', color: 'var(--ink-soft)', fontSize: 16, lineHeight: 1.5, margin: 0 }
const overlayCenter: React.CSSProperties = { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'var(--font-display)', fontSize: 20, background: 'rgba(0,0,0,.45)' }
