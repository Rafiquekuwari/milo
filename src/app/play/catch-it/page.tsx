'use client'
export const dynamic = 'force-static'
/**
 * Catch It! — standalone AR activity. Apples fall; the child moves their open
 * hand like a basket (hand X-position) to catch them up to a target count, with
 * each catch counted aloud. Robust mechanic (hand position, not precision).
 * On-device, consent-gated, adaptive.
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import CelebrationModal from '@/components/ui/CelebrationModal'
import CameraError from '@/components/ui/CameraError'
import HowToPlay from '@/components/ui/HowToPlay'
import { useMiloSpeaker, useIsSpeaking } from '@/lib/useMiloSpeaker'
import { useChapterSync } from '@/lib/supabase/useChapterSync'
import { useAdaptive } from '@/lib/adaptive'
import { DifficultyBadge } from '@/components/ui/DifficultyBadge'
import { kv } from '@/lib/kv'
import { disposeLandmarker } from '@/lib/ar/dispose'

const VERSION = '0.10.35'
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/wasm`
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'
const TOTAL_ROUNDS = 10

type Phase = 'gate' | 'howto' | 'playing' | 'done'
type Status = 'idle' | 'loading' | 'running' | 'error'
interface Apple { x: number; y: number; vy: number; done: boolean }

export default function CatchItActivity() {
  const router = useRouter()
  const { speak } = useMiloSpeaker()
  const { finishAndSync } = useChapterSync()

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const landmarkerRef = useRef<any>(null)
  const rafRef = useRef<number>(0)

  const [phase, setPhase] = useState<Phase>('gate')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')
  const [consented, setConsented] = useState(false)
  const [roundIdx, setRoundIdx] = useState(0)
  const [target, setTarget] = useState(5)
  const [caught, setCaught] = useState(0)
  const [matched, setMatched] = useState(false)
  const startedRef = useRef(false)

  const ada = useAdaptive('counting')
  const isSpeaking = useIsSpeaking()
  const isSpeakingRef = useRef(false)
  isSpeakingRef.current = isSpeaking

  // Game state in refs so the loop reads the latest without restarting.
  const applesRef = useRef<Apple[]>([])
  const basketXRef = useRef(0.5)
  const caughtRef = useRef(0)
  const targetRef = useRef(3)
  const matchedRef = useRef(false)
  const frameRef = useRef(0)
  const lastSpawnXRef = useRef(0.5)
  const cfgRef = useRef({ vy: 3.2, spawnEvery: 70 })
  const successRef = useRef<() => void>(() => {})

  useEffect(() => { setConsented(kv.get('milo-camera-consent') === '1') }, [])

  successRef.current = () => {
    setMatched(true)
    ada.record(true)
    speak(`You caught ${targetRef.current}! ${ada.praise}`)
    const next = roundIdx + 1
    window.setTimeout(() => { if (next >= TOTAL_ROUNDS) finish(); else setRoundIdx(next) }, 1700)
  }

  function stop() {
    cancelAnimationFrame(rafRef.current)
    disposeLandmarker(videoRef, landmarkerRef)
  }
  useEffect(() => stop, [])

  const loop = useCallback(() => {
    const video = videoRef.current, canvas = canvasRef.current, lm = landmarkerRef.current
    if (!video || !canvas || !lm) return
    const W = video.clientWidth, H = video.clientHeight
    if (canvas.width !== W) canvas.width = W
    if (canvas.height !== H) canvas.height = H
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, W, H)
    const basketY = H * 0.84
    const catchR = W * 0.1

    if (video.readyState >= 2) {
      // Basket follows the hand, smoothed. Use the PALM CENTRE (average of wrist
      // + knuckles) so a single jittery landmark can't make it jump, and a
      // snappier lerp so it doesn't lag behind fast moves. Mirror: x → 1-x.
      const res = lm.detectForVideo(video, performance.now())
      const hand = res.landmarks?.[0]
      if (hand) {
        const ids = [0, 5, 9, 13, 17]
        const cx = ids.reduce((s, i) => s + hand[i].x, 0) / ids.length
        const targetX = 1 - cx
        basketXRef.current += (targetX - basketXRef.current) * 0.6
      }
      const bx = basketXRef.current * W

      if (!matchedRef.current) {
        // Spawn apples — each lands far from the previous one (and fewer on
        // screen at once) so the child has to drag the basket across to catch.
        frameRef.current++
        if (frameRef.current % cfgRef.current.spawnEvery === 0 && applesRef.current.length < 3) {
          let nx = 0.1 + Math.random() * 0.8
          if (Math.abs(nx - lastSpawnXRef.current) < 0.4) {
            nx = lastSpawnXRef.current < 0.5 ? 0.6 + Math.random() * 0.3 : 0.1 + Math.random() * 0.3
          }
          lastSpawnXRef.current = nx
          applesRef.current.push({ x: nx, y: -30, vy: cfgRef.current.vy, done: false })
        }
        // Fall + catch. Caught apples are removed; missed ones fall off-screen.
        const survivors: Apple[] = []
        for (const a of applesRef.current) {
          a.y += a.vy
          if (!a.done && a.y >= basketY) {
            a.done = true
            if (Math.abs(a.x * W - bx) < catchR) {
              caughtRef.current++
              setCaught(caughtRef.current)
              if (!isSpeakingRef.current) speak(String(caughtRef.current))
              continue // caught → remove
            }
          }
          if (a.y < H + 50) survivors.push(a)
        }
        applesRef.current = survivors
        if (caughtRef.current >= targetRef.current) { matchedRef.current = true; successRef.current() }
      }

      // Draw apples.
      ctx.font = '40px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      for (const a of applesRef.current) ctx.fillText('🍎', a.x * W, a.y)
      // Draw basket.
      ctx.font = '64px serif'
      ctx.fillText('🧺', bx, basketY + 8)
    }
    rafRef.current = requestAnimationFrame(loop)
  }, [speak])

  const start = useCallback(async () => {
    try {
      setStatus('loading'); setError('')
      const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision')
      const fileset = await FilesetResolver.forVisionTasks(WASM_URL)
      landmarkerRef.current = await HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' }, runningMode: 'VIDEO', numHands: 1,
        // Lower tracking/presence thresholds so the hand isn't dropped during
        // fast horizontal moves (the cause of the basket sticking / snapping).
        minHandDetectionConfidence: 0.5, minHandPresenceConfidence: 0.3, minTrackingConfidence: 0.3,
      })
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false,
      })
      const video = videoRef.current!
      video.srcObject = stream
      await video.play()
      setStatus('running')
      loop()
    } catch (e) {
      setError(e instanceof Error ? (e.name || e.message) : String(e)); setStatus('error')
    }
  }, [loop])

  useEffect(() => {
    if (phase === 'playing' && !startedRef.current) { startedRef.current = true; start() }
  }, [phase, start])

  // Set up each round from the current difficulty.
  useEffect(() => {
    if (phase !== 'playing' || status !== 'running') return
    const t = ada.difficulty === 1 ? 5 + Math.floor(Math.random() * 2)   // 5–6
      : ada.difficulty === 2 ? 7 + Math.floor(Math.random() * 2)         // 7–8
      : 9 + Math.floor(Math.random() * 2)                                // 9–10
    cfgRef.current = ada.difficulty === 1 ? { vy: 3.2, spawnEvery: 70 }
      : ada.difficulty === 2 ? { vy: 4.0, spawnEvery: 60 }
      : { vy: 4.8, spawnEvery: 50 }
    applesRef.current = []
    lastSpawnXRef.current = 0.5
    caughtRef.current = 0
    matchedRef.current = false
    targetRef.current = t
    setTarget(t); setCaught(0); setMatched(false)
    speak(`Catch ${t} apples with your hand!`)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIdx, status, phase])

  function finish() {
    stop()
    finishAndSync('counting', TOTAL_ROUNDS, 0) // sets celebration → CelebrationModal shows
    setPhase('done')
  }
  function replay() {
    setCaught(0); setMatched(false); setRoundIdx(0)
    startedRef.current = false
    setPhase('playing')
  }

  function begin() { kv.set('milo-camera-consent', '1'); setConsented(true); setPhase('howto') }

  if (phase === 'gate') {
    return (
      <Shell>
        <div style={card}>
          <div style={{ fontSize: 64 }}>🧺</div>
          <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--ink)', margin: '8px 0' }}>Catch It!</h1>
          {consented
            ? <p style={muted}>Move your open hand like a basket to catch the falling apples!</p>
            : <p style={muted}>Ask a grown-up first! This uses the camera so Milo can see your hand. The video stays on this device and is never saved or sent anywhere.</p>}
          <button className="milo-btn tone-green size-lg" onClick={begin}>{consented ? '▶ Start' : '✅ Allow camera'}</button>
          <button className="milo-btn tone-cream" onClick={() => router.push('/play')}>← Back</button>
        </div>
      </Shell>
    )
  }

  if (phase === 'howto') {
    return <HowToPlay title="Catch It!" steps={['Move your open hand like a basket.', 'Catch the falling apples!']} demo="catch" onStart={() => setPhase('playing')} />
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
        {matched ? `You caught ${target}! 🎉` : `Catch ${target} apples! 🍎  (${caught}/${target})`}
      </div>
      <div style={{ position: 'relative', width: 'min(92vw, 520px)', aspectRatio: '4/3', borderRadius: 20, overflow: 'hidden', border: '5px solid var(--outline)', background: '#000', boxShadow: '0 6px 0 rgba(61,37,22,.2)' }}>
        <video ref={videoRef} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
        {status === 'loading' && <div style={overlayCenter}>Loading Milo’s eyes… 👀</div>}
        {status === 'error' && <CameraError errorName={error} onRetry={start} onBack={() => router.push('/play')} />}
      </div>
      <p style={{ fontFamily: 'var(--font-body)', color: 'var(--ink-muted)', margin: 0 }}>Round {Math.min(roundIdx + 1, TOTAL_ROUNDS)} of {TOTAL_ROUNDS}</p>
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
