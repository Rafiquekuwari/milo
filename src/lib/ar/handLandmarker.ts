'use client'

export const VERSION = '0.10.35'
export const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/wasm`
export const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type HandLandmarkerInstance = any

export interface CreateHandLandmarkerOptions {
  numHands?: number
  minHandDetectionConfidence?: number
  minHandPresenceConfidence?: number
  minTrackingConfidence?: number
}

export async function createHandLandmarker(
  opts: CreateHandLandmarkerOptions = {},
): Promise<HandLandmarkerInstance> {
  const {
    numHands = 1,
    minHandDetectionConfidence = 0.5,
    minHandPresenceConfidence = 0.3,
    minTrackingConfidence = 0.3,
  } = opts
  const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision')
  const fileset = await FilesetResolver.forVisionTasks(WASM_URL)
  return HandLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
    runningMode: 'VIDEO',
    numHands,
    ...(minHandDetectionConfidence !== undefined ? { minHandDetectionConfidence } : {}),
    ...(minHandPresenceConfidence !== undefined ? { minHandPresenceConfidence } : {}),
    ...(minTrackingConfidence !== undefined ? { minTrackingConfidence } : {}),
  })
}

export async function openCamera(video: HTMLVideoElement): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
    audio: false,
  })
  video.srcObject = stream
  await video.play()
  return stream
}
