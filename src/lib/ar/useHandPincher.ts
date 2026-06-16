'use client'
/**
 * useHandPincher — webcam pinch-to-grab input for AR drag-and-drop activities.
 *
 * Loads MediaPipe Hands, runs the loop, and each frame computes the index-finger
 * CURSOR (screen coords, mirrored) and whether the hand is PINCHING (thumb tip
 * close to index tip, relative to hand size). It clears the canvas and hands the
 * game an onFrame(ctx, W, H, cursor, pinching) callback to update + draw — so the
 * pinch/cursor plumbing is shared and each activity just defines its objects.
 *
 * Reusable across Match the Number / Number Order / Pattern Builder. On-device.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

const VERSION = '0.10.35'
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/wasm`
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'
// Hysteresis so a pinch reads as deliberate: ENGAGE only when the thumb + index
// tips genuinely meet (tight), RELEASE only when they clearly separate (looser).
// Between the two it holds its current state, so it doesn't flicker mid-drag.
const PINCH_CLOSE = 0.32 // engage when tip-gap < handSize * this (fingers close together)
const PINCH_OPEN = 0.36  // release when tip-gap > handSize * this (a small open drops it)
const RELEASE_FRAMES = 2 // must read "open" this many frames before dropping (anti-jitter)

export type PinchStatus = 'idle' | 'loading' | 'running' | 'error'
export interface Cursor { x: number; y: number }
type FrameFn = (ctx: CanvasRenderingContext2D, W: number, H: number, cursor: Cursor | null, pinching: boolean) => void

export function useHandPincher(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  onFrame: FrameFn,
) {
  const [status, setStatus] = useState<PinchStatus>('idle')
  const [error, setError] = useState('')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const landmarkerRef = useRef<any>(null)
  const rafRef = useRef<number>(0)
  const pinchedRef = useRef(false)
  const openRef = useRef(0)
  const onFrameRef = useRef(onFrame)
  onFrameRef.current = onFrame

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    ;(videoRef.current?.srcObject as MediaStream | null)?.getTracks().forEach(t => t.stop())
    if (videoRef.current) videoRef.current.srcObject = null
    setStatus('idle')
  }, [videoRef])

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current)
    ;(videoRef.current?.srcObject as MediaStream | null)?.getTracks().forEach(t => t.stop())
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
      const hand = res.landmarks?.[0]
      let cursor: Cursor | null = null
      if (hand) {
        const handSize = Math.hypot(hand[0].x - hand[9].x, hand[0].y - hand[9].y) || 1e-6
        const ratio = Math.hypot(hand[4].x - hand[8].x, hand[4].y - hand[8].y) / handSize
        if (pinchedRef.current) {
          // Release only after the fingers stay apart for a few frames, so a
          // one-frame detection glitch can't drop the held item mid-drag.
          if (ratio > PINCH_OPEN) { openRef.current++; if (openRef.current >= RELEASE_FRAMES) pinchedRef.current = false }
          else openRef.current = 0
        } else if (ratio < PINCH_CLOSE) { pinchedRef.current = true; openRef.current = 0 }
        // While pinching, the cursor is the pinch POINT (midpoint of thumb +
        // index tips) — steadier than the index tip alone, which drifts toward
        // the other fingers when they meet. Index tip when not pinching.
        const ix = (1 - hand[8].x) * W, iy = hand[8].y * H
        if (pinchedRef.current) {
          const tx = (1 - hand[4].x) * W, ty = hand[4].y * H
          cursor = { x: (ix + tx) / 2, y: (iy + ty) / 2 }
        } else cursor = { x: ix, y: iy }
      } else {
        pinchedRef.current = false; openRef.current = 0 // hand left the frame → drop
      }
      onFrameRef.current(ctx, W, H, cursor, pinchedRef.current)
    }
    rafRef.current = requestAnimationFrame(loop)
  }, [videoRef, canvasRef])

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

  return { status, error, start, stop }
}
