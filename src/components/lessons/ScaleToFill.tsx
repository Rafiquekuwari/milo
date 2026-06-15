'use client'
/**
 * ScaleToFill — grows its children to fill the available space (the lesson's
 * centered canvas), so the door/number/shape is as big as the screen allows
 * instead of a small fixed size with blank space around it.
 *
 * Measures the children's natural size via offsetWidth/Height (unaffected by the
 * transform, so there's no feedback loop) and scales up/down to fit the parent.
 */
import React, { useEffect, useRef, useState } from 'react'

export default function ScaleToFill({ children, max = 2.6 }: { children: React.ReactNode; max?: number }) {
  const outer = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const measure = () => {
      const o = outer.current, i = inner.current
      if (!o || !i) return
      const ow = o.clientWidth, oh = o.clientHeight
      const iw = i.offsetWidth, ih = i.offsetHeight   // natural size (transform doesn't affect offset*)
      if (!ow || !oh || !iw || !ih) return
      const next = Math.max(0.6, Math.min(max, (ow * 0.98) / iw, (oh * 0.98) / ih))
      setScale(prev => (Math.abs(prev - next) > 0.01 ? next : prev))
    }
    measure()
    const id = window.setInterval(measure, 150)   // re-measures when the step's content swaps
    window.addEventListener('resize', measure)
    return () => { window.clearInterval(id); window.removeEventListener('resize', measure) }
  }, [max])

  return (
    <div ref={outer} style={{ flex: 1, width: '100%', minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <div ref={inner} style={{ transform: `scale(${scale})`, transformOrigin: 'center center', display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
        {children}
      </div>
    </div>
  )
}
