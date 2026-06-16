'use client'
export const dynamic = 'force-static'
/**
 * Finger Counting — standalone AR activity. Milo asks "show me N fingers", the
 * webcam counts them with numbered bubbles, and each finger is spoken aloud.
 * Camera is on-device only and gated behind a one-time grown-up consent. Falls
 * back to the normal tap-based Counting chapter if the camera isn't available.
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useMiloStore } from '@/lib/store'
import { useMiloSpeaker, useIsSpeaking } from '@/lib/useMiloSpeaker'
import { useChapterSync } from '@/lib/supabase/useChapterSync'
import { useFingerCounter } from '@/lib/ar/useFingerCounter'
import { useAdaptive } from '@/lib/adaptive'
import { DifficultyBadge } from '@/components/ui/DifficultyBadge'
import CelebrationModal from '@/components/ui/CelebrationModal'
import CameraError from '@/components/ui/CameraError'
import { kv } from '@/lib/kv'

const TOTAL_ROUNDS = 10
const HOLD_MS = 900 // hold the right number of fingers this long to lock it in

type Phase = 'gate' | 'intro' | 'playing' | 'done'

export default function FingerCountingActivity() {
  const router = useRouter()
  const { speak } = useMiloSpeaker()
  const { finishAndSync } = useChapterSync()
  const startChapter = useMiloStore(s => s.startChapter)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [phase, setPhase] = useState<Phase>('gate')
  const [consented, setConsented] = useState(false)
  const [roundIdx, setRoundIdx] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [liveCount, setLiveCount] = useState(0)
  const [matched, setMatched] = useState(false)
  const startedRef = useRef(false)
  const spokenRef = useRef(0) // highest count spoken so far this round (for count-aloud)
  const isSpeaking = useIsSpeaking()
  const isSpeakingRef = useRef(false)
  isSpeakingRef.current = isSpeaking

  // Adaptive: the target range grows with the child's performance.
  // difficulty 1 → 1–5, 2 → 1–8, 3 → 1–10 (both hands).
  const ada = useAdaptive('counting')
  const [target, setTarget] = useState(1)
  const prevTargetRef = useRef(0)

  useEffect(() => { setConsented(kv.get('milo-camera-consent') === '1') }, [])

  // Count aloud as the number of fingers goes up ("one… two… three").
  // Only speak when the voice is free, so numbers never cut off Milo's prompt /
  // praise or each other (that was the overlap bug).
  const onCount = useCallback((n: number) => {
    setLiveCount(n)
    if (n > spokenRef.current && !isSpeakingRef.current) speak(String(n))
    spokenRef.current = n
  }, [speak])
  const { status, error, start, stop } = useFingerCounter(videoRef, canvasRef, { onCount })

  // Start the camera when we enter the warm-up (the gate tap is the user gesture).
  useEffect(() => {
    if ((phase === 'intro' || phase === 'playing') && !startedRef.current) { startedRef.current = true; start() }
  }, [phase, start])

  // Warm-up: count to ten together. Milo prompts, onAssign speaks each number,
  // and reaching 10 (held briefly) moves on to the asking rounds.
  useEffect(() => {
    if (phase === 'intro' && status === 'running') {
      spokenRef.current = 0
      speak(`Let's count to ten! Put your fingers up one at a time.`)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, status])

  useEffect(() => {
    if (phase !== 'intro' || status !== 'running' || liveCount < 10) return
    const id = window.setTimeout(() => { speak(`Ten! Wonderful counting!`); setPhase('playing') }, 700)
    return () => window.clearTimeout(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, status, liveCount])

  // Prompt at the start of each asking round — pick the target from the current
  // adaptive difficulty (no immediate repeats).
  useEffect(() => {
    if (phase === 'playing' && status === 'running') {
      const max = ada.difficulty === 1 ? 5 : ada.difficulty === 2 ? 8 : 10
      let t = prevTargetRef.current
      while (t === prevTargetRef.current) t = 1 + Math.floor(Math.random() * max)
      prevTargetRef.current = t
      setTarget(t)
      setMatched(false); setLiveCount(0); spokenRef.current = 0
      speak(roundIdx === 0 ? `Great! Now show me ${t}!` : `Now show me ${t} ${t === 1 ? 'finger' : 'fingers'}!`)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIdx, status, phase])

  // Hold-to-confirm: the right number of fingers must stay up for a moment.
  useEffect(() => {
    if (phase !== 'playing' || matched || status !== 'running') return
    if (liveCount !== target) return
    const id = window.setTimeout(() => {
      setMatched(true)
      setCorrect(c => c + 1)
      ada.record(true)
      speak(`Yes! ${target}! ${ada.praise}`)
      window.setTimeout(() => {
        if (roundIdx + 1 >= TOTAL_ROUNDS) finish()
        else setRoundIdx(i => i + 1)
      }, 1600)
    }, HOLD_MS)
    return () => window.clearTimeout(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveCount, target, matched, phase, status])

  function finish() {
    stop()
    // Record into the same progress/coins pipeline as the Counting chapter; this
    // sets the celebration state, which CelebrationModal (rendered below) shows.
    finishAndSync('counting', TOTAL_ROUNDS, 0)
    setPhase('done')
  }
  function replay() {
    setCorrect(0); setMatched(false); setRoundIdx(0)
    startedRef.current = false
    setPhase('playing')
  }

  function begin() {
    kv.set('milo-camera-consent', '1')
    setConsented(true)
    setPhase('intro')
  }

  function useTapInstead() {
    stop()
    startChapter('counting')
    router.push('/game')
  }

  // ── Gate ──────────────────────────────────────────────────────
  if (phase === 'gate') {
    return (
      <Shell>
        <div style={card}>
          <div style={{ fontSize: 64 }}>🖐️</div>
          <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--ink)', margin: '8px 0' }}>Finger Counting</h1>
          {consented ? (
            <p style={muted}>Hold up your fingers and Milo will count them with you!</p>
          ) : (
            <p style={muted}>
              Ask a grown-up first! This uses the camera so Milo can see your fingers.
              The video stays on this device and is never saved or sent anywhere.
            </p>
          )}
          <button className="milo-btn tone-green size-lg" onClick={begin}>
            {consented ? '▶ Start' : '✅ Allow camera'}
          </button>
          <button className="milo-btn tone-cream" onClick={() => router.push('/menu')}>← Back</button>
        </div>
      </Shell>
    )
  }

  // ── Done ──────────────────────────────────────────────────────
  if (phase === 'done') {
    return (
      <Shell>
        <CelebrationModal hideNext onPlayAgain={replay} onExit={() => router.push('/play')} exitLabel="← Back to games" />
      </Shell>
    )
  }

  // ── Warm-up (intro) or asking rounds (playing) — shared camera view ──
  const isIntro = phase === 'intro'
  return (
    <Shell>
      {!isIntro && <DifficultyBadge difficulty={ada.difficulty} isOnFire={ada.isOnFire} />}
      <div className="milo-bubble" style={{ fontSize: 22, maxWidth: 520, textAlign: 'center' }}>
        {isIntro
          ? (liveCount >= 10 ? 'Ten! 🎉' : 'Show all your fingers — let’s count to 10! 🖐️🖐️')
          : (matched ? `Yes! ${target}! 🎉` : `Show me ${target} ${target === 1 ? 'finger' : 'fingers'}!`)}
      </div>

      <div style={{ position: 'relative', width: 'min(92vw, 520px)', aspectRatio: '4/3', borderRadius: 20, overflow: 'hidden', border: '5px solid var(--outline)', background: '#000', boxShadow: '0 6px 0 rgba(61,37,22,.2)' }}>
        <video ref={videoRef} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
        {status === 'loading' && (
          <div style={overlayCenter}>Loading Milo’s eyes… 👀</div>
        )}
        {status === 'error' && <CameraError errorName={error} onRetry={start} onBack={() => router.push('/play')} fallback={{ label: 'Count by tapping instead', onClick: useTapInstead }} />}
      </div>

      {isIntro
        ? <button className="milo-btn tone-green size-lg" onClick={() => setPhase('playing')}>Let’s play! ▶</button>
        : <p style={{ fontFamily: 'var(--font-body)', color: 'var(--ink-muted)', margin: 0 }}>Round {Math.min(roundIdx + 1, TOTAL_ROUNDS)} of {TOTAL_ROUNDS}</p>}
      <button className="milo-btn tone-cream" onClick={() => { stop(); router.push('/menu') }}>← Back</button>
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
