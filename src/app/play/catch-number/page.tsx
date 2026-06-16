'use client'
export const dynamic = 'force-static'
/**
 * Catch by Number — AR activity. Numbered items fall; Milo calls a number and
 * the child moves their open hand (basket) to catch the matching one, skipping
 * the rest. Teaches number recognition. On-device, consent-gated, adaptive.
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useMiloSpeaker, useIsSpeaking } from '@/lib/useMiloSpeaker'
import { useChapterSync } from '@/lib/supabase/useChapterSync'
import { useAdaptive } from '@/lib/adaptive'
import { DifficultyBadge } from '@/components/ui/DifficultyBadge'
import CelebrationModal from '@/components/ui/CelebrationModal'
import { kv } from '@/lib/kv'

const VERSION = '0.10.35'
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/wasm`
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'
const TOTAL_ROUNDS = 5
const COLORS = ['#F26B2C', '#5BC3F0', '#6FBE3F', '#9362D8', '#E64545', '#FFC933']

type Phase = 'gate' | 'playing' | 'done'
type Status = 'idle' | 'loading' | 'running' | 'error'
interface Item { x: number; y: number; vy: number; value: number; done: boolean }

export default function CatchNumberActivity() {
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
  const [target, setTarget] = useState(1)
  const [matched, setMatched] = useState(false)
  const startedRef = useRef(false)

  const ada = useAdaptive('numberRecognition')
  const isSpeaking = useIsSpeaking()
  const isSpeakingRef = useRef(false)
  isSpeakingRef.current = isSpeaking

  const itemsRef = useRef<Item[]>([])
  const basketXRef = useRef(0.5)
  const targetRef = useRef(1)
  const prevTargetRef = useRef(0)
  const matchedRef = useRef(false)
  const frameRef = useRef(0)
  const lastSpawnXRef = useRef(0.5)
  const cfgRef = useRef({ vy: 3.0, spawnEvery: 55, max: 5 })
  const successRef = useRef<() => void>(() => {})

  useEffect(() => { setConsented(kv.get('milo-camera-consent') === '1') }, [])

  successRef.current = () => {
    setMatched(true)
    ada.record(true)
    speak(`Yes! That's ${targetRef.current}! ${ada.praise}`)
    const next = roundIdx + 1
    window.setTimeout(() => { if (next >= TOTAL_ROUNDS) finish(); else setRoundIdx(next) }, 1500)
  }

  function stop() {
    cancelAnimationFrame(rafRef.current)
    ;(videoRef.current?.srcObject as MediaStream | null)?.getTracks().forEach(t => t.stop())
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
      const res = lm.detectForVideo(video, performance.now())
      const hand = res.landmarks?.[0]
      if (hand) {
        const ids = [0, 5, 9, 13, 17]
        const cx = ids.reduce((s, i) => s + hand[i].x, 0) / ids.length
        basketXRef.current += ((1 - cx) - basketXRef.current) * 0.6
      }
      const bx = basketXRef.current * W

      if (!matchedRef.current) {
        frameRef.current++
        if (frameRef.current % cfgRef.current.spawnEvery === 0 && itemsRef.current.length < 3) {
          // ~45% chance the target, else a distractor.
          let v = targetRef.current
          if (Math.random() >= 0.45) { do { v = 1 + Math.floor(Math.random() * cfgRef.current.max) } while (v === targetRef.current) }
          let nx = 0.1 + Math.random() * 0.8
          if (Math.abs(nx - lastSpawnXRef.current) < 0.4) nx = lastSpawnXRef.current < 0.5 ? 0.6 + Math.random() * 0.3 : 0.1 + Math.random() * 0.3
          lastSpawnXRef.current = nx
          itemsRef.current.push({ x: nx, y: -30, vy: cfgRef.current.vy, value: v, done: false })
        }
        const survivors: Item[] = []
        for (const it of itemsRef.current) {
          it.y += it.vy
          if (!it.done && it.y >= basketY) {
            it.done = true
            if (Math.abs(it.x * W - bx) < catchR) {
              if (it.value === targetRef.current) { matchedRef.current = true; successRef.current(); continue }
              else { if (!isSpeakingRef.current) speak(`That's ${it.value}. We want ${targetRef.current}!`); continue }
            }
          }
          if (it.y < H + 50) survivors.push(it)
        }
        itemsRef.current = survivors
      }

      // Draw numbered items.
      for (const it of itemsRef.current) {
        const x = it.x * W
        ctx.beginPath(); ctx.arc(x, it.y, 26, 0, Math.PI * 2)
        ctx.fillStyle = COLORS[it.value % COLORS.length]; ctx.fill()
        ctx.lineWidth = 4; ctx.strokeStyle = '#3D2516'; ctx.stroke()
        ctx.fillStyle = '#fff'; ctx.font = 'bold 30px system-ui, sans-serif'
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(String(it.value), x, it.y + 1)
      }
      // Basket.
      ctx.font = '64px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
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
      setError(e instanceof Error ? e.message : String(e)); setStatus('error')
    }
  }, [loop])

  useEffect(() => {
    if (phase === 'playing' && !startedRef.current) { startedRef.current = true; start() }
  }, [phase, start])

  useEffect(() => {
    if (phase !== 'playing' || status !== 'running') return
    const max = ada.difficulty === 1 ? 5 : ada.difficulty === 2 ? 8 : 10
    let t = prevTargetRef.current
    while (t === prevTargetRef.current) t = 1 + Math.floor(Math.random() * max)
    prevTargetRef.current = t
    targetRef.current = t
    cfgRef.current = { vy: ada.difficulty === 1 ? 3.0 : ada.difficulty === 2 ? 3.8 : 4.6, spawnEvery: ada.difficulty === 1 ? 55 : ada.difficulty === 2 ? 48 : 40, max }
    itemsRef.current = []
    lastSpawnXRef.current = 0.5
    matchedRef.current = false
    setTarget(t); setMatched(false)
    speak(`Catch the number ${t}!`)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIdx, status, phase])

  function finish() {
    stop()
    finishAndSync('numberRecognition', TOTAL_ROUNDS, 0)
    setPhase('done')
  }
  function replay() { setMatched(false); setRoundIdx(0); startedRef.current = false; setPhase('playing') }
  function begin() { kv.set('milo-camera-consent', '1'); setConsented(true); setPhase('playing') }

  if (phase === 'gate') {
    return (
      <Shell>
        <div style={card}>
          <div style={{ fontSize: 64 }}>🔢</div>
          <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--ink)', margin: '8px 0' }}>Catch the Number</h1>
          {consented
            ? <p style={muted}>Milo calls a number — catch the matching one with your hand!</p>
            : <p style={muted}>Ask a grown-up first! This uses the camera so Milo can see your hand. The video stays on this device and is never saved or sent anywhere.</p>}
          <button className="milo-btn tone-green size-lg" onClick={begin}>{consented ? '▶ Start' : '✅ Allow camera'}</button>
          <button className="milo-btn tone-cream" onClick={() => router.push('/play')}>← Back</button>
        </div>
      </Shell>
    )
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
        {matched ? `You caught ${target}! 🎉` : `Catch the number ${target}! 🔢`}
      </div>
      <div style={{ position: 'relative', width: 'min(92vw, 520px)', aspectRatio: '4/3', borderRadius: 20, overflow: 'hidden', border: '5px solid var(--outline)', background: '#000', boxShadow: '0 6px 0 rgba(61,37,22,.2)' }}>
        <video ref={videoRef} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
        {status === 'loading' && <div style={overlayCenter}>Loading Milo’s eyes… 👀</div>}
        {status === 'error' && (
          <div style={{ ...overlayCenter, padding: 20, textAlign: 'center', gap: 12, flexDirection: 'column', display: 'flex' }}>
            <span>Couldn’t use the camera.</span>
            <button className="milo-btn tone-yellow" onClick={() => router.push('/play')}>Back to games</button>
          </div>
        )}
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
