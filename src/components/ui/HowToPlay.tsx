'use client'
/**
 * HowToPlay — a quick "how to play" demo shown before an AR activity starts, so
 * a first-timer sees the gesture. Loops a simple emoji animation of the move,
 * narrates the steps, and continues on "Got it!". `demo` picks the animation;
 * `steps` are the lines (also spoken). Reused across all AR activities.
 */
import { useEffect } from 'react'
import { useMiloSpeaker } from '@/lib/useMiloSpeaker'

export type Demo = 'fingers' | 'catch' | 'sort' | 'pinch'
interface Props { title: string; steps: string[]; demo: Demo; onStart: () => void }

export default function HowToPlay({ title, steps, demo, onStart }: Props) {
  const { speak } = useMiloSpeaker()
  useEffect(() => { speak(`${title}. ${steps.join('. ')}`) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, background: 'linear-gradient(180deg,var(--sky-blue-soft) 0%,var(--bg-page) 55%)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center', background: 'var(--paper)', border: '4px solid var(--outline)', borderRadius: 24, padding: '24px 22px 26px', maxWidth: 420, width: '100%', boxShadow: '0 8px 0 rgba(61,37,22,.2)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--ink)', margin: 0, fontSize: 24 }}>How to play</h2>
        <p style={{ fontFamily: 'var(--font-display)', color: 'var(--milo-orange-deep, #B8431A)', margin: 0, fontSize: 18 }}>{title}</p>

        <div style={{ position: 'relative', width: 'min(80vw, 280px)', height: 150, background: 'var(--sky-blue-soft)', borderRadius: 16, border: '3px solid var(--outline)', overflow: 'hidden' }}>
          <Demo demo={demo} />
        </div>

        <ol style={{ textAlign: 'left', margin: '2px 0 6px', paddingLeft: 22, color: 'var(--ink-soft)', fontFamily: 'var(--font-body)', fontSize: 16, lineHeight: 1.6 }}>
          {steps.map((s, i) => <li key={i}>{s}</li>)}
        </ol>

        <button className="milo-btn tone-green size-lg" onClick={onStart} style={{ width: '100%' }}>Got it! ▶</button>
      </div>
      <style>{KEYFRAMES}</style>
    </div>
  )
}

function Demo({ demo }: { demo: Demo }) {
  if (demo === 'fingers') {
    return (
      <>
        <div style={{ ...center, fontSize: 64, animation: 'htpBob 1.6s ease-in-out infinite' }}>🖐️</div>
        <div style={{ position: 'absolute', top: 10, width: '100%', textAlign: 'center', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, color: 'var(--ink)' }}>
          {[1, 2, 3].map(n => <span key={n} style={{ margin: '0 6px', display: 'inline-block', animation: `htpPop 1.8s ease-in-out ${n * 0.25}s infinite` }}>{n}</span>)}
        </div>
      </>
    )
  }
  if (demo === 'catch') {
    return (
      <>
        <div style={{ position: 'absolute', left: '50%', top: -6, fontSize: 30, animation: 'htpFall 1.8s ease-in infinite' }}>🍎</div>
        <div style={{ position: 'absolute', bottom: 8, fontSize: 46, animation: 'htpSlide 1.8s ease-in-out infinite' }}>🧺</div>
      </>
    )
  }
  if (demo === 'sort') {
    return (
      <>
        <div style={{ position: 'absolute', left: 18, bottom: 8, fontSize: 30 }}>🔵</div>
        <div style={{ position: 'absolute', right: 22, bottom: 12, fontSize: 18 }}>🔵</div>
        <div style={{ position: 'absolute', left: '46%', top: -4, fontSize: 30, animation: 'htpSort 2.2s ease-in-out infinite' }}>🔵</div>
      </>
    )
  }
  // pinch
  return (
    <>
      <div style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', fontSize: 30 }}>🎯</div>
      <div style={{ position: 'absolute', fontSize: 40, left: '50%', animation: 'htpPinch 2.2s ease-in-out infinite' }}>🤏</div>
    </>
  )
}

const center: React.CSSProperties = { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }

const KEYFRAMES = `
@keyframes htpBob { 0%,100%{transform:translateY(4px)} 50%{transform:translateY(-6px)} }
@keyframes htpPop { 0%,60%,100%{opacity:.25;transform:scale(.85)} 30%{opacity:1;transform:scale(1.15)} }
@keyframes htpFall { 0%{top:-6px} 60%{top:96px} 60.1%,100%{top:-6px;opacity:0} }
@keyframes htpSlide { 0%,100%{left:14%} 50%{left:62%} }
@keyframes htpSort { 0%{top:-4px;left:46%} 45%{top:96px;left:8%} 50%,100%{top:-4px;left:46%} }
@keyframes htpPinch { 0%{top:104px;left:46%} 45%{top:18px;left:46%} 55%{top:18px} 60%,100%{top:104px;opacity:.6} }
`
