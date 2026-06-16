'use client'
export const dynamic = 'force-static'
/**
 * Sort into Bins — AR activity. One item falls at a time; the child guides it
 * left/right with their hand into the BIG basket (left) or SMALL basket (right).
 * Teaches size sorting / classification. On-device, consent-gated, adaptive.
 * Unlike the other games this scores real correct/wrong (sorting has answers).
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useMiloSpeaker } from '@/lib/useMiloSpeaker'
import { useChapterSync } from '@/lib/supabase/useChapterSync'
import { useAdaptive } from '@/lib/adaptive'
import { DifficultyBadge } from '@/components/ui/DifficultyBadge'
import CelebrationModal from '@/components/ui/CelebrationModal'
import CameraError from '@/components/ui/CameraError'
import { kv } from '@/lib/kv'

const VERSION = '0.10.35'
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/wasm`
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'
const TOTAL_ITEMS = 10

type Phase = 'gate' | 'playing' | 'done'
type Status = 'idle' | 'loading' | 'running' | 'error'
interface Item { x: number; y: number; big: boolean }

export default function SortBinsActivity() {
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
  const [sorted, setSorted] = useState(0)
  const startedRef = useRef(false)
  const promptedRef = useRef(false)

  const ada = useAdaptive('measurement')

  const handXRef = useRef(0.5)
  const itemRef = useRef<Item | null>(null)
  const countRef = useRef(0)
  const correctRef = useRef(0)
  const wrongRef = useRef(0)
  const doneRef = useRef(false)
  const vyRef = useRef(2.8)
  const evalRef = useRef<(correct: boolean, big: boolean) => void>(() => {})
  const finishRef = useRef<() => void>(() => {})

  useEffect(() => { setConsented(kv.get('milo-camera-consent') === '1') }, [])

  evalRef.current = (correct: boolean, big: boolean) => {
    ada.record(correct)
    speak(correct ? `Yes!` : `Oops! The ${big ? 'big' : 'small'} one goes ${big ? 'left' : 'right'}.`)
  }
  finishRef.current = () => {
    stop()
    finishAndSync('measurement', correctRef.current, wrongRef.current)
    setPhase('done')
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
    const binY = H * 0.78

    if (video.readyState >= 2) {
      const res = lm.detectForVideo(video, performance.now())
      const hand = res.landmarks?.[0]
      if (hand) {
        const ids = [0, 5, 9, 13, 17]
        const cx = ids.reduce((s, i) => s + hand[i].x, 0) / ids.length
        handXRef.current += ((1 - cx) - handXRef.current) * 0.6
      }

      if (!doneRef.current) {
        if (!itemRef.current) {
          if (countRef.current >= TOTAL_ITEMS) { doneRef.current = true; finishRef.current() }
          else itemRef.current = { x: 0.5, y: -30, big: Math.random() < 0.5 }
        } else {
          const it = itemRef.current
          it.x += (handXRef.current - it.x) * 0.5  // drag toward hand
          it.y += vyRef.current
          if (it.y >= binY) {
            const bin = it.x < 0.5 ? 'left' : 'right'
            const correct = (it.big && bin === 'left') || (!it.big && bin === 'right')
            countRef.current++
            if (correct) correctRef.current++; else wrongRef.current++
            setSorted(countRef.current)
            evalRef.current(correct, it.big)
            itemRef.current = null
          }
        }
      }

      // Bins (labels) + divider.
      ctx.font = '15px system-ui, sans-serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(W / 2, binY); ctx.lineTo(W / 2, H); ctx.stroke()
      ctx.fillStyle = 'rgba(91,195,240,.85)'; ctx.beginPath(); ctx.arc(W * 0.25, H - 36, 24, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = 'rgba(91,195,240,.85)'; ctx.beginPath(); ctx.arc(W * 0.75, H - 36, 11, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#fff'; ctx.font = 'bold 16px system-ui, sans-serif'
      ctx.fillText('BIG ←', W * 0.25, binY + 18); ctx.fillText('→ SMALL', W * 0.75, binY + 18)

      // Current item.
      const it = itemRef.current
      if (it) {
        ctx.beginPath(); ctx.arc(it.x * W, it.y, it.big ? 34 : 16, 0, Math.PI * 2)
        ctx.fillStyle = '#5BC3F0'; ctx.fill()
        ctx.lineWidth = 4; ctx.strokeStyle = '#3D2516'; ctx.stroke()
      }
    }
    rafRef.current = requestAnimationFrame(loop)
  }, [])

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
      setError(e instanceof Error ? (e.name || e.message) : String(e)); setStatus('error')
    }
  }, [loop])

  useEffect(() => {
    if (phase === 'playing' && !startedRef.current) { startedRef.current = true; start() }
  }, [phase, start])

  useEffect(() => {
    if (phase === 'playing' && status === 'running' && !promptedRef.current) {
      promptedRef.current = true
      vyRef.current = ada.difficulty === 1 ? 2.6 : ada.difficulty === 2 ? 3.2 : 3.8
      speak(`Sort them! Big things go to the left, small things go to the right.`)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, status])

  function replay() {
    countRef.current = 0; correctRef.current = 0; wrongRef.current = 0
    itemRef.current = null; doneRef.current = false; promptedRef.current = false
    setSorted(0); startedRef.current = false; setPhase('playing')
  }
  function begin() { kv.set('milo-camera-consent', '1'); setConsented(true); setPhase('playing') }

  if (phase === 'gate') {
    return (
      <Shell>
        <div style={card}>
          <div style={{ fontSize: 64 }}>📦</div>
          <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--ink)', margin: '8px 0' }}>Sort the Sizes</h1>
          {consented
            ? <p style={muted}>Guide each shape with your hand: big ones to the left, small ones to the right!</p>
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
        Big → left, small → right! 📦
      </div>
      <div style={{ position: 'relative', width: 'min(92vw, 520px)', aspectRatio: '4/3', borderRadius: 20, overflow: 'hidden', border: '5px solid var(--outline)', background: '#000', boxShadow: '0 6px 0 rgba(61,37,22,.2)' }}>
        <video ref={videoRef} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
        {status === 'loading' && <div style={overlayCenter}>Loading Milo’s eyes… 👀</div>}
        {status === 'error' && <CameraError errorName={error} onRetry={start} onBack={() => router.push('/play')} />}
      </div>
      <p style={{ fontFamily: 'var(--font-body)', color: 'var(--ink-muted)', margin: 0 }}>Sorted {Math.min(sorted, TOTAL_ITEMS)} of {TOTAL_ITEMS}</p>
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
