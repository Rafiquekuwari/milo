'use client'
/**
 * MiloPointer — a bouncing 👆 that points at whatever Milo is talking about.
 *
 * Rendered once in the game wrapper. It shows only while Milo is speaking AND a
 * target element is set (via pointAt / speakAt), follows the target every frame
 * (so it tracks growing towers, scrolling, etc.), and hides itself otherwise.
 */

import { useEffect, useRef, useState } from 'react'
import { useIsSpeaking } from '@/lib/useMiloSpeaker'
import { usePointerTarget } from '@/lib/miloPointer'

export default function MiloPointer() {
  const target = usePointerTarget()
  const speaking = useIsSpeaking()
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const raf = useRef<number | undefined>(undefined)
  const active = !!target && speaking

  useEffect(() => {
    if (!active || !target) { setPos(null); return }
    const tick = () => {
      const r = target.getBoundingClientRect()
      // Sit just under the target's centre and point up at it.
      if (r.width || r.height) setPos({ x: r.left + r.width / 2, y: r.bottom })
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [active, target])

  if (!active || !pos) return null

  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y + 4,
        zIndex: 250,
        pointerEvents: 'none',
        fontSize: 44,
        lineHeight: 1,
        animation: 'milo-point-bob 0.8s ease-in-out infinite',
        filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.35))',
        willChange: 'transform',
      }}
    >
      👆
    </div>
  )
}
