'use client'
export const dynamic = 'force-static'
/**
 * Match the Number — AR pinch-to-drag activity. A group of apples is shown; the
 * child pinches a number tile and drags it onto the group to match the count.
 * Teaches quantity ↔ numeral. On-device, consent-gated, adaptive.
 */
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMiloSpeaker, useIsSpeaking } from '@/lib/useMiloSpeaker'
import { useChapterSync } from '@/lib/supabase/useChapterSync'
import { useAdaptive } from '@/lib/adaptive'
import { DifficultyBadge } from '@/components/ui/DifficultyBadge'
import CelebrationModal from '@/components/ui/CelebrationModal'
import { useHandPincher } from '@/lib/ar/useHandPincher'
import { kv } from '@/lib/kv'

const TOTAL_ROUNDS = 5
type Phase = 'gate' | 'playing' | 'done'
interface Tile { value: number; slot: number }

export default function MatchNumberActivity() {
  const router = useRouter()
  const { speak } = useMiloSpeaker()
  const { finishAndSync } = useChapterSync()

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [phase, setPhase] = useState<Phase>('gate')
  const [consented, setConsented] = useState(false)
  const [roundIdx, setRoundIdx] = useState(0)
  const [target, setTarget] = useState(2)
  const [matched, setMatched] = useState(false)
  const startedRef = useRef(false)

  const ada = useAdaptive('matchingQuantities')
  const isSpeaking = useIsSpeaking()
  const isSpeakingRef = useRef(false)
  isSpeakingRef.current = isSpeaking

  const tilesRef = useRef<Tile[]>([])
  const targetRef = useRef(2)
  const grabbedRef = useRef(-1)
  const dragRef = useRef({ x: 0, y: 0 })
  const prevPinchRef = useRef(false)
  const matchedRef = useRef(false)
  const successRef = useRef<() => void>(() => {})
  const wrongRef = useRef<(v: number) => void>(() => {})

  useEffect(() => { setConsented(kv.get('milo-camera-consent') === '1') }, [])

  successRef.current = () => {
    setMatched(true)
    ada.record(true)
    speak(`Yes! ${targetRef.current}! ${ada.praise}`)
    const next = roundIdx + 1
    window.setTimeout(() => { if (next >= TOTAL_ROUNDS) finish(); else setRoundIdx(next) }, 1500)
  }
  wrongRef.current = (v: number) => { if (!isSpeakingRef.current) speak(`That's ${v}. Count the apples again!`) }

  function onFrame(ctx: CanvasRenderingContext2D, W: number, H: number, cursor: { x: number; y: number } | null, pinching: boolean) {
    const unit = Math.min(W, H)
    const dz = { x: W / 2, y: H * 0.30, w: unit * 0.46, h: unit * 0.30 }
    const tileR = unit * 0.085
    const slotY = H * 0.82
    const slotX = (i: number) => W * (0.25 + i * 0.25)

    const pinchStart = pinching && !prevPinchRef.current
    const pinchEnd = !pinching && prevPinchRef.current
    prevPinchRef.current = pinching

    if (!matchedRef.current && cursor) {
      if (pinchStart && grabbedRef.current < 0) {
        for (let i = 0; i < tilesRef.current.length; i++) {
          if (Math.hypot(cursor.x - slotX(tilesRef.current[i].slot), cursor.y - slotY) < tileR) { grabbedRef.current = i; break }
        }
      }
      if (grabbedRef.current >= 0) {
        dragRef.current = { x: cursor.x, y: cursor.y }
        if (pinchEnd) {
          const overZone = Math.abs(cursor.x - dz.x) < dz.w / 2 && Math.abs(cursor.y - dz.y) < dz.h / 2
          const t = tilesRef.current[grabbedRef.current]
          if (overZone) { if (t.value === targetRef.current) { matchedRef.current = true; successRef.current() } else wrongRef.current(t.value) }
          grabbedRef.current = -1
        }
      }
    }

    // Drop zone with the apple group.
    ctx.setLineDash([6, 8]); ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(61,37,22,.4)'
    roundRect(ctx, dz.x - dz.w / 2, dz.y - dz.h / 2, dz.w, dz.h, 16); ctx.stroke(); ctx.setLineDash([])
    ctx.font = `${Math.round(unit * 0.07)}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    const N = targetRef.current, perRow = Math.min(N, 5), rows = Math.ceil(N / 5)
    const ax = unit * 0.075, ay = unit * 0.075
    for (let i = 0; i < N; i++) {
      const r = Math.floor(i / 5), c = i % 5, inRow = r === rows - 1 ? N - r * 5 : perRow
      ctx.fillText('🍎', dz.x + (c - (inRow - 1) / 2) * ax, dz.y + (r - (rows - 1) / 2) * ay)
    }

    // Tiles (grabbed one follows the cursor).
    for (let i = 0; i < tilesRef.current.length; i++) {
      const t = tilesRef.current[i]
      const grabbed = i === grabbedRef.current
      const cx = grabbed ? dragRef.current.x : slotX(t.slot)
      const cy = grabbed ? dragRef.current.y : slotY
      ctx.fillStyle = '#F26B2C'; ctx.strokeStyle = '#3D2516'; ctx.lineWidth = 4
      roundRect(ctx, cx - tileR, cy - tileR, tileR * 2, tileR * 2, 14); ctx.fill(); ctx.stroke()
      ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.round(tileR * 1.1)}px system-ui, sans-serif`
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(String(t.value), cx, cy + 1)
    }

    // Cursor — ring open, filled when pinching.
    if (cursor) {
      ctx.beginPath(); ctx.arc(cursor.x, cursor.y, 12, 0, Math.PI * 2)
      ctx.fillStyle = pinching ? '#3BA55D' : 'rgba(255,255,255,.5)'; ctx.fill()
      ctx.lineWidth = 3; ctx.strokeStyle = '#3D2516'; ctx.stroke()
    }
  }

  const { status, error, start, stop } = useHandPincher(videoRef, canvasRef, onFrame)

  useEffect(() => {
    if (phase === 'playing' && !startedRef.current) { startedRef.current = true; start() }
  }, [phase, start])

  useEffect(() => {
    if (phase !== 'playing' || status !== 'running') return
    const max = ada.difficulty === 1 ? 3 : ada.difficulty === 2 ? 5 : 6
    const N = 1 + Math.floor(Math.random() * max)
    const pool: number[] = []; for (let i = 1; i <= Math.max(max, 3); i++) pool.push(i)
    const others = pool.filter(v => v !== N).sort(() => Math.random() - .5).slice(0, 2)
    const values = [N, ...others].sort(() => Math.random() - .5)
    tilesRef.current = values.map((value, slot) => ({ value, slot }))
    targetRef.current = N; grabbedRef.current = -1; matchedRef.current = false; prevPinchRef.current = false
    setTarget(N); setMatched(false)
    speak(`How many apples? Pinch the number and drag it onto them!`)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIdx, status, phase])

  function finish() { stop(); finishAndSync('matchingQuantities', TOTAL_ROUNDS, 0); setPhase('done') }
  function replay() { setMatched(false); setRoundIdx(0); startedRef.current = false; setPhase('playing') }
  function begin() { kv.set('milo-camera-consent', '1'); setConsented(true); setPhase('playing') }

  if (phase === 'gate') {
    return (
      <Shell>
        <div style={card}>
          <div style={{ fontSize: 64 }}>🔢</div>
          <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--ink)', margin: '8px 0' }}>Match the Number</h1>
          {consented
            ? <p style={muted}>Pinch a number with your fingers and drag it onto the matching apples!</p>
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
        {matched ? `Yes! ${target}! 🎉` : `Drag the number onto the apples! 🍎`}
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

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
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
