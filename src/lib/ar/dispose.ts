/**
 * Shared teardown for MediaPipe HandLandmarker surfaces.
 *
 * Every AR activity holds a GPU-delegate `HandLandmarker` in a ref and a webcam
 * MediaStream on the <video>. On exit we must (a) stop the camera tracks and
 * (b) call `landmarker.close()` — the documented teardown on the TaskRunner
 * base class ("Closes and cleans up the resources held by this task") that frees
 * the WASM/WebGL inference context. Without it the GPU context leaks per exit.
 *
 * The caller still owns `cancelAnimationFrame` (it holds the rAF id and must
 * cancel BEFORE releasing resources). This helper does only the stream + model
 * release, so the loop can never run against a closed landmarker.
 */
import type { RefObject } from 'react'

export function disposeLandmarker(
  videoRef: RefObject<HTMLVideoElement | null>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  landmarkerRef: RefObject<any>,
) {
  const v = videoRef.current
  ;(v?.srcObject as MediaStream | null)?.getTracks().forEach(t => t.stop())
  if (v) v.srcObject = null
  // Free the GPU/WASM inference context. Guarded so a double-stop (stop() then
  // unmount cleanup) can't throw on an already-closed task.
  try { landmarkerRef.current?.close() } catch { /* already closed */ }
  landmarkerRef.current = null
}
