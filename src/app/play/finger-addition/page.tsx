'use client'
export const dynamic = 'force-static'
/**
 * Finger Addition — standalone AR activity. Milo shows "a + b = ?"; the child
 * works out the answer and holds up that many fingers TOTAL across both hands.
 * The webcam counts the total (reusing useFingerCounter) and counts aloud.
 * On-device only, behind the same grown-up consent gate, with a tap fallback.
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
import HowToPlay from '@/components/ui/HowToPlay'
import { kv } from '@/lib/kv'

const TOTAL_ROUNDS = 10
const HOLD_MS = 900

type Phase = 'gate' | 'howto' | 'playing' | 'done'

export default function FingerAdditionActivity() {
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
  const spokenRef = useRef(0)
  const isSpeaking = useIsSpeaking()
  const isSpeakingRef = useRef(false)
  isSpeakingRef.current = isSpeaking

  // Adaptive: addend size grows with performance. difficulty 1 → 1–3 (sum ≤6),
  // 2 → 1–4 (≤8), 3 → 1–5 (≤10, both hands).
  const ada = useAdaptive('addition')
  const [a, setA] = useState(1)
  const [b, setB] = useState(1)
  const sum = a + b

  useEffect(() => { setConsented(kv.get('milo-camera-consent') === '1') }, [])

  // Count aloud only when the voice is free, so numbers never cut off Milo's
  // sum prompt / praise or each other (the overlap bug in this activity).
  const onCount = useCallback((n: number) => {
    setLiveCount(n)
    if (n > spokenRef.current && !isSpeakingRef.current) speak(String(n))
    spokenRef.current = n
  }, [speak])
  const { status, error, start, stop } = useFingerCounter(videoRef, canvasRef, { onCount })

  useEffect(() => {
    if (phase === 'playing' && !startedRef.current) { startedRef.current = true; start() }
  }, [phase, start])

  // Prompt each round — DON'T say the answer; the child works out a+b and shows it.
  useEffect(() => {
    if (phase === 'playing' && status === 'running') {
      const max = ada.difficulty === 1 ? 3 : ada.difficulty === 2 ? 4 : 5
      const na = 1 + Math.floor(Math.random() * max)
      const nb = 1 + Math.floor(Math.random() * max)
      setA(na); setB(nb)
      setMatched(false); setLiveCount(0); spokenRef.current = 0
      speak(roundIdx === 0
        ? `Let's add with your fingers! What is ${na} plus ${nb}? Show me with your fingers!`
        : `What is ${na} plus ${nb}? Show the answer with your fingers!`)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIdx, status, phase])

  // Hold the correct total for a moment to lock it in.
  useEffect(() => {
    if (phase !== 'playing' || matched || status !== 'running') return
    if (liveCount !== sum) return
    const id = window.setTimeout(() => {
      setMatched(true)
      setCorrect(c => c + 1)
      ada.record(true)
      speak(`Yes! ${a} plus ${b} is ${sum}! ${ada.praise}`)
      window.setTimeout(() => {
        if (roundIdx + 1 >= TOTAL_ROUNDS) finish()
        else setRoundIdx(i => i + 1)
      }, 1700)
    }, HOLD_MS)
    return () => window.clearTimeout(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveCount, sum, matched, phase, status])

  function finish() {
    stop()
    finishAndSync('addition', TOTAL_ROUNDS, 0) // sets celebration → CelebrationModal shows
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
    setPhase('playing')
  }

  function useTapInstead() {
    stop()
    startChapter('addition')
    router.push('/game')
  }

  if (phase === 'gate') {
    return (
      <Shell>
        <div style={card}>
          <div style={{ fontSize: 64 }}>➕</div>
          <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--ink)', margin: '8px 0' }}>Add with Fingers</h1>
          {consented ? (
            <p style={muted}>Milo gives you a sum — show the answer on your fingers!</p>
          ) : (
            <p style={muted}>
              Ask a grown-up first! This uses the camera so Milo can see your fingers.
              The video stays on this device and is never saved or sent anywhere.
            </p>
          )}
          <button className="milo-btn tone-green size-lg" onClick={begin}>{consented ? '▶ Start' : '✅ Allow camera'}</button>
          <button className="milo-btn tone-cream" onClick={() => router.push('/menu')}>← Back</button>
        </div>
      </Shell>
    )
  }

  if (phase === 'howto') {
    return <HowToPlay title="Add with Fingers" steps={['Milo gives you a sum.', 'Show the answer on your fingers.']} demo="fingers" onStart={() => setPhase('playing')} />
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
      <div className="milo-bubble" style={{ fontSize: 22, maxWidth: 520, textAlign: 'center' }}>
        {matched ? `${a} + ${b} = ${sum}! 🎉` : `${a} + ${b} = ?`}
      </div>

      <div style={{ position: 'relative', width: 'min(92vw, 520px)', aspectRatio: '4/3', borderRadius: 20, overflow: 'hidden', border: '5px solid var(--outline)', background: '#000', boxShadow: '0 6px 0 rgba(61,37,22,.2)' }}>
        <video ref={videoRef} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
        {status === 'loading' && <div style={overlayCenter}>Loading Milo’s eyes… 👀</div>}
        {status === 'error' && <CameraError errorName={error} onRetry={start} onBack={() => router.push('/play')} fallback={{ label: 'Add by tapping instead', onClick: useTapInstead }} />}
      </div>

      <p style={{ fontFamily: 'var(--font-body)', color: 'var(--ink-muted)', margin: 0 }}>Round {Math.min(roundIdx + 1, TOTAL_ROUNDS)} of {TOTAL_ROUNDS}</p>
      <button className="milo-btn tone-cream" onClick={() => { stop(); router.push('/menu') }}>← Back</button>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, padding: 24, background: 'linear-gradient(180deg,var(--sun-yellow-soft) 0%,var(--bg-page) 55%)' }}>
      {children}
    </div>
  )
}

const card: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center', background: 'var(--paper)', border: '4px solid var(--outline)', borderRadius: 24, padding: '28px 24px', maxWidth: 460, boxShadow: '0 8px 0 rgba(61,37,22,.2)' }
const muted: React.CSSProperties = { fontFamily: 'var(--font-body)', color: 'var(--ink-soft)', fontSize: 16, lineHeight: 1.5, margin: 0 }
const overlayCenter: React.CSSProperties = { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'var(--font-display)', fontSize: 20, background: 'rgba(0,0,0,.45)' }
