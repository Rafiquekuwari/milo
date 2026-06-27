'use client'
/**
 * useFingerCounter — webcam finger detection for AR activities.
 *
 * Simple model: each frame we detect the extended fingers and number them
 * left-to-right (1..N) over the hand — no per-finger identity, no raise-order
 * locking. Show whatever fingers however you like; it just counts them. When the
 * hand leaves, there are no fingers, so it resets to 0 on its own.
 *
 * Game logic stays in the page via one callback, onCount(n), which fires when
 * the number of raised fingers changes. The reported count is lightly stabilised
 * (must hold a few frames) so a one-frame detection blip can't fool the game.
 *
 * Reusable across future AR activities. On-device only.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { extendedFingerTips } from './fingerCount'
import { createHandLandmarker, openCamera } from './handLandmarker'
import { disposeLandmarker } from './dispose'

const STABLE_FRAMES = 3 // a changed count must hold this many frames before we report it

export type FingerStatus = 'idle' | 'loading' | 'running' | 'error'
interface Opts { onCount?: (n: number) => void }

export function useFingerCounter(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  opts: Opts = {},
) {
  const [status, setStatus] = useState<FingerStatus>('idle')
  const [error, setError] = useState('')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const landmarkerRef = useRef<any>(null)
  const rafRef = useRef<number>(0)
  const stableRef = useRef({ count: 0, cand: -1, streak: 0 })
  const optsRef = useRef(opts)
  optsRef.current = opts

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    disposeLandmarker(videoRef, landmarkerRef)
    setStatus('idle')
  }, [videoRef])

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current)
    disposeLandmarker(videoRef, landmarkerRef)
  }, [videoRef])

  const loop = useCallback(() => {
    const video = videoRef.current, canvas = canvasRef.current, lm = landmarkerRef.current
    if (!video || !canvas || !lm) return
    const W = video.clientWidth, H = video.clientHeight
    if (canvas.width !== W) canvas.width = W
    if (canvas.height !== H) canvas.height = H
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, W, H)

    if (video.readyState >= 2) {
      const res = lm.detectForVideo(video, performance.now())

      // All extended fingertips this frame → screen positions, left-to-right.
      const pts: { sx: number; sy: number }[] = []
      ;(res.landmarks ?? []).forEach((hand: { x: number; y: number; z: number }[], i: number) => {
        const handed = res.handednesses?.[i]?.[0]?.categoryName ?? `H${i}`
        extendedFingerTips(hand, handed).forEach(t => pts.push({ sx: (1 - t.x) * W, sy: t.y * H }))
      })
      pts.sort((a, b) => a.sx - b.sx)

      // Number them 1..N over the fingers (height-staggered so they don't overlap).
      const R = 18, TOP = 46, STAGGER = 34
      pts.forEach((p, i) => {
        const bx = Math.min(Math.max(p.sx, R + 2), W - R - 2)
        const by = Math.max(p.sy - TOP - (i % 2 ? STAGGER : 0), R + 2)
        ctx.beginPath(); ctx.moveTo(bx, by + R); ctx.lineTo(p.sx, p.sy)
        ctx.strokeStyle = 'rgba(242,107,44,.85)'; ctx.lineWidth = 3; ctx.stroke()
        ctx.beginPath(); ctx.arc(bx, by, R, 0, Math.PI * 2)
        ctx.fillStyle = '#F26B2C'; ctx.fill()
        ctx.lineWidth = 4; ctx.strokeStyle = '#3D2516'; ctx.stroke()
        ctx.fillStyle = '#fff'; ctx.font = 'bold 26px system-ui, sans-serif'
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(String(i + 1), bx, by + 1)
      })

      // Report the count, lightly stabilised so a 1-frame blip doesn't register.
      const n = pts.length
      const s = stableRef.current
      if (n !== s.count) {
        if (n === s.cand) s.streak++; else { s.cand = n; s.streak = 1 }
        if (s.streak >= STABLE_FRAMES) { s.count = n; s.cand = -1; s.streak = 0; optsRef.current.onCount?.(n) }
      } else { s.cand = -1; s.streak = 0 }
    }
    rafRef.current = requestAnimationFrame(loop)
  }, [videoRef, canvasRef])

  const start = useCallback(async () => {
    try {
      setStatus('loading'); setError('')
      stableRef.current = { count: 0, cand: -1, streak: 0 }
      // Counting needs both hands; keep MediaPipe's default 0.5 presence/tracking
      // (the other AR surfaces loosen these to 0.3) — pass them explicitly so the
      // shared helper reproduces this site's exact prior behaviour.
      landmarkerRef.current = await createHandLandmarker({
        numHands: 2, minHandPresenceConfidence: 0.5, minTrackingConfidence: 0.5,
      })
      await openCamera(videoRef.current!)
      setStatus('running')
      loop()
    } catch (e) {
      setError(e instanceof Error ? (e.name || e.message) : String(e))
      setStatus('error')
    }
  }, [videoRef, loop])

  return { status, error, start, stop }
}
