'use client'
export const dynamic = 'force-static'
/**
 * Pattern Builder — AR pinch-to-drag activity. A colour pattern ends with a "?";
 * the child pinches the colour that continues it and drags it into the slot.
 * Teaches patterns. On-device, consent-gated, adaptive.
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
const PAL = ['#E64545', '#5BC3F0', '#6FBE3F', '#FFC933', '#9362D8']
const VISIBLE = 4 // pattern cells shown before the "?"
type Phase = 'gate' | 'playing' | 'done'

export default function PatternBuilderActivity() {
  const router = useRouter()
  const { speak } = useMiloSpeaker()
  const { finishAndSync } = useChapterSync()

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [phase, setPhase] = useState<Phase>('gate')
  const [consented, setConsented] = useState(false)
  const [roundIdx, setRoundIdx] = useState(0)
  const [matched, setMatched] = useState(false)
  const startedRef = useRef(false)

  const ada = useAdaptive('patterns')
  const isSpeaking = useIsSpeaking()
  const isSpeakingRef = useRef(false)
  isSpeakingRef.current = isSpeaking

  const patternRef = useRef<number[]>([])   // VISIBLE colour indices
  const answerRef = useRef(0)               // colour index that continues it
  const optionsRef = useRef<number[]>([])   // 3 colour-index choices
  const grabbedRef = useRef(-1)
  const dragRef = useRef({ x: 0, y: 0 })
  const prevPinchRef = useRef(false)
  const matchedRef = useRef(false)
  const successRef = useRef<() => void>(() => {})

  useEffect(() => { setConsented(kv.get('milo-camera-consent') === '1') }, [])

  successRef.current = () => {
    setMatched(true)
    ada.record(true)
    speak(`Yes! You finished the pattern! ${ada.praise}`)
    const next = roundIdx + 1
    window.setTimeout(() => { if (next >= TOTAL_ROUNDS) finish(); else setRoundIdx(next) }, 1500)
  }

  function onFrame(ctx: CanvasRenderingContext2D, W: number, H: number, cursor: { x: number; y: number } | null, pinching: boolean) {
    const unit = Math.min(W, H)
    const cells = VISIBLE + 1
    const cr = unit * 0.055               // pattern circle radius
    const rowY = H * 0.28
    const cellX = (i: number) => W * ((i + 0.5) / cells)
    const qx = cellX(VISIBLE)             // "?" slot x
    const optR = unit * 0.08
    const optY = H * 0.82
    const optX = (i: number) => W * (0.25 + i * 0.25)

    const pinchStart = pinching && !prevPinchRef.current
    const pinchEnd = !pinching && prevPinchRef.current
    prevPinchRef.current = pinching

    if (!matchedRef.current && cursor) {
      if (pinchStart && grabbedRef.current < 0) {
        for (let i = 0; i < optionsRef.current.length; i++) {
          if (Math.hypot(cursor.x - optX(i), cursor.y - optY) < optR) { grabbedRef.current = i; break }
        }
      }
      if (grabbedRef.current >= 0) {
        dragRef.current = { x: cursor.x, y: cursor.y }
        if (pinchEnd) {
          if (Math.hypot(cursor.x - qx, cursor.y - rowY) < cr * 1.6) {
            if (optionsRef.current[grabbedRef.current] === answerRef.current) { matchedRef.current = true; successRef.current() }
            else if (!isSpeakingRef.current) speak(`Not quite — look at the pattern again!`)
          }
          grabbedRef.current = -1
        }
      }
    }

    // Pattern row + "?" slot (filled green when solved).
    for (let i = 0; i < VISIBLE; i++) {
      ctx.beginPath(); ctx.arc(cellX(i), rowY, cr, 0, Math.PI * 2)
      ctx.fillStyle = PAL[patternRef.current[i]]; ctx.fill()
      ctx.lineWidth = 3; ctx.strokeStyle = '#3D2516'; ctx.stroke()
    }
    if (matchedRef.current) {
      ctx.beginPath(); ctx.arc(qx, rowY, cr, 0, Math.PI * 2)
      ctx.fillStyle = PAL[answerRef.current]; ctx.fill()
      ctx.lineWidth = 3; ctx.strokeStyle = '#3D2516'; ctx.stroke()
    } else {
      ctx.setLineDash([5, 7]); ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(61,37,22,.5)'
      ctx.beginPath(); ctx.arc(qx, rowY, cr, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([])
      ctx.fillStyle = 'rgba(61,37,22,.6)'; ctx.font = `bold ${Math.round(cr)}px system-ui, sans-serif`
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', qx, rowY + 1)
    }

    // Option tiles.
    for (let i = 0; i < optionsRef.current.length; i++) {
      const grabbed = i === grabbedRef.current
      const cx = grabbed ? dragRef.current.x : optX(i)
      const cy = grabbed ? dragRef.current.y : optY
      ctx.beginPath(); ctx.arc(cx, cy, optR, 0, Math.PI * 2)
      ctx.fillStyle = PAL[optionsRef.current[i]]; ctx.fill()
      ctx.lineWidth = 4; ctx.strokeStyle = '#3D2516'; ctx.stroke()
    }

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
    // Base unit by difficulty: AB / ABC-ish / longer.
    const bases: number[][] = ada.difficulty === 1 ? [[0, 1]]
      : ada.difficulty === 2 ? [[0, 1], [0, 1, 2], [0, 0, 1]]
      : [[0, 1, 2], [0, 1, 1], [0, 0, 1, 2]]
    const base = bases[Math.floor(Math.random() * bases.length)]
    // Map abstract base indices → actual distinct colours.
    const colours = [...Array(PAL.length).keys()].sort(() => Math.random() - .5)
    const seq = Array.from({ length: VISIBLE + 1 }, (_, i) => colours[base[i % base.length]])
    patternRef.current = seq.slice(0, VISIBLE)
    answerRef.current = seq[VISIBLE]
    const others = colours.filter(c => c !== answerRef.current).slice(0, 2)
    optionsRef.current = [answerRef.current, ...others].sort(() => Math.random() - .5)
    grabbedRef.current = -1; matchedRef.current = false; prevPinchRef.current = false
    setMatched(false)
    speak(`What comes next? Pinch the right colour and drag it to the question mark!`)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIdx, status, phase])

  function finish() { stop(); finishAndSync('patterns', TOTAL_ROUNDS, 0); setPhase('done') }
  function replay() { setMatched(false); setRoundIdx(0); startedRef.current = false; setPhase('playing') }
  function begin() { kv.set('milo-camera-consent', '1'); setConsented(true); setPhase('playing') }

  if (phase === 'gate') {
    return (
      <Shell>
        <div style={card}>
          <div style={{ fontSize: 64 }}>🎨</div>
          <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--ink)', margin: '8px 0' }}>Pattern Builder</h1>
          {consented
            ? <p style={muted}>Pinch the colour that comes next and drag it onto the question mark!</p>
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
        {matched ? `You finished the pattern! 🎉` : `What comes next? Pinch & drag! 🎨`}
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
