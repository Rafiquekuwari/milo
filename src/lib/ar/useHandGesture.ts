'use client'
/**
 * useHandGesture — webcam thumbs-up / thumbs-down detection for AR quiz games.
 *
 * Classifies the hand each frame (orientation-robust: fingers curled + thumb
 * above/below the knuckles), debounces, and fires onGesture('thumbsUp' |
 * 'thumbsDown') once when a steady gesture appears. Draws a 👍/👎 indicator so
 * the child can see it's recognised. Reusable (Thumbs quiz, Milo Says). On-device.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { disposeLandmarker } from './dispose'

const VERSION = '0.10.35'
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/wasm`
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'
const STABLE_FRAMES = 4 // gesture must hold this many frames before it counts

export type Gesture = 'thumbsUp' | 'thumbsDown'
export type GestureStatus = 'idle' | 'loading' | 'running' | 'error'
interface Opts { onGesture?: (g: Gesture) => void }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function classify(lm: any[]): Gesture | null {
  if (!lm || lm.length < 21) return null
  const d = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y)
  const wrist = lm[0]
  // Fingers (index→pinky) should be curled: tip not much farther from the wrist
  // than its knuckle. If 2+ are clearly extended, it's not a thumbs gesture.
  const fingers: [number, number][] = [[8, 5], [12, 9], [16, 13], [20, 17]]
  const extended = fingers.filter(([t, m]) => d(lm[t], wrist) > d(lm[m], wrist) * 1.6).length
  if (extended >= 2) return null
  // Thumb above or below the knuckle line → up / down (works upright or inverted).
  const mcpY = (lm[5].y + lm[9].y + lm[13].y + lm[17].y) / 4
  const margin = 0.04
  if (lm[4].y < mcpY - margin) return 'thumbsUp'
  if (lm[4].y > mcpY + margin) return 'thumbsDown'
  return null
}

export function useHandGesture(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  opts: Opts = {},
) {
  const [status, setStatus] = useState<GestureStatus>('idle')
  const [error, setError] = useState('')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const landmarkerRef = useRef<any>(null)
  const rafRef = useRef<number>(0)
  const stableRef = useRef<{ g: Gesture | null; cand: Gesture | null; streak: number }>({ g: null, cand: null, streak: 0 })
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
      const g = res.landmarks?.[0] ? classify(res.landmarks[0]) : null
      const s = stableRef.current
      if (g === s.cand) s.streak++; else { s.cand = g; s.streak = 1 }
      if (s.streak >= STABLE_FRAMES && g !== s.g) { s.g = g; if (g) optsRef.current.onGesture?.(g) }

      // Indicator of what's currently recognised.
      if (s.g) {
        ctx.font = `${Math.round(Math.min(W, H) * 0.3)}px serif`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.globalAlpha = 0.9
        ctx.fillText(s.g === 'thumbsUp' ? '👍' : '👎', W / 2, H / 2)
        ctx.globalAlpha = 1
      }
    }
    rafRef.current = requestAnimationFrame(loop)
  }, [videoRef, canvasRef])

  const start = useCallback(async () => {
    try {
      setStatus('loading'); setError('')
      stableRef.current = { g: null, cand: null, streak: 0 }
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
  }, [videoRef, loop])

  return { status, error, start, stop }
}
