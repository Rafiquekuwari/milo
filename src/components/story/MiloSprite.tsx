'use client'
/**
 * MiloSprite — Milo as a flat 2D flipbook sprite (hand-generated art).
 * Walking is a 2-frame cycle (stride ⇄ neutral, side profile facing right — flip
 * in code for left). When he stops he switches to the front-facing idle pose so he
 * "turns to face" the child while talking. No WebGL; runs on any tablet.
 */
import React, { useState, useEffect } from 'react'

const DIR = '/assets/characters'
const WALK = [`${DIR}/milo_a.png`, `${DIR}/milo_c.png`]   // stride, then legs-together
const IDLE = `${DIR}/milo_idle.png`                       // front-facing talk pose

export default function MiloSprite({ play = true, fps = 5, flip = false, style }: {
  play?: boolean; fps?: number; flip?: boolean; style?: React.CSSProperties
}) {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (!play) { setI(0); return }
    const id = window.setInterval(() => setI(p => (p + 1) % WALK.length), 1000 / fps)
    return () => window.clearInterval(id)
  }, [play, fps])

  // Walking → alternate the two side-profile stride frames (flip for direction);
  // a gentle bob sells the step. Stopped → the front-facing idle pose, unflipped.
  const src = play ? WALK[i] : IDLE
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', ...style }}>
      <img src={src} alt="Milo" draggable={false} style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        objectFit: 'contain', objectPosition: 'bottom center',
        transform: flip && play ? 'scaleX(-1)' : 'none',
        animation: play ? 'milo_bob .42s ease-in-out infinite' : 'none',
      }} />
      <style>{`@keyframes milo_bob{0%,100%{translate:0 0}50%{translate:0 -3.5%}}`}</style>
    </div>
  )
}
