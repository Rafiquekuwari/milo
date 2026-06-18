'use client'
/**
 * ForestWalk — a single chapter told as a LANDSCAPE side-scroll story.
 * Milo walks (side profile) through a parallax forest built from real PNG art
 * (tree.png, fireflies, ground objects); the world scrolls past him. He stops at
 * "stations" to demonstrate counting, to talk, and to practise (SkillBeat:
 * adaptive + re-teach + voice). One chapter = one ForestWalk. See docs/story-mode-3-5.md.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { speak, speakSeq, stopSpeech } from '@/lib/useMiloSpeaker'
import MiloSprite from './MiloSprite'
import { SkillBeat, type Beat } from './StoryWorld'
import { type CountKind } from './art'
import { FlyingCountDemo, FlyingCountPlay } from './world1'

// ─── Forest background ─────────────────────────────────────────
// A full painted dense-forest scene that scrolls behind Milo. It is mirror-tiled
// (every other copy flipped) so the left/right edges always meet → seamless loop.
const FOREST = '/assets/backgrounds/forest_1.jpeg'

const CSS = `
@keyframes fw_bg  { to { transform: translateX(-25%) } }
@keyframes fw_pop { 0%{transform:translateY(10px) scale(.9);opacity:0} 100%{transform:translateY(0) scale(1);opacity:1} }
@keyframes fw_fly { 0%{transform:translate(0,0) rotate(0)} 25%{transform:translate(12px,-14px) rotate(5deg)} 50%{transform:translate(-9px,9px) rotate(-4deg)} 75%{transform:translate(9px,5px) rotate(3deg)} 100%{transform:translate(0,0) rotate(0)} }
`

function ForestBackground({ walking }: { walking: boolean }) {
  // 8 copies, alternating normal / mirrored. Translating -25% advances exactly two
  // copies (one mirror pair) — the point where the pattern repeats — so it loops
  // with no visible seam.
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', width: 'max-content', filter: 'brightness(.8) saturate(1.05)',
        animation: 'fw_bg 30s linear infinite', animationPlayState: walking ? 'running' : 'paused' }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <img key={i} src={FOREST} alt="" draggable={false}
            style={{ height: '100%', width: 'auto', display: 'block', flexShrink: 0, transform: i % 2 ? 'scaleX(-1)' : 'none' }} />
        ))}
      </div>
    </div>
  )
}

// ─── Rotate-to-landscape gate (mobile) ─────────────────────────
function useNeedsRotate() {
  const [need, setNeed] = useState(false)
  useEffect(() => {
    const check = () => setNeed(window.innerHeight > window.innerWidth && window.innerWidth < 820)
    check()
    window.addEventListener('resize', check)
    window.addEventListener('orientationchange', check)
    return () => { window.removeEventListener('resize', check); window.removeEventListener('orientationchange', check) }
  }, [])
  return need
}

// ─── Beats ─────────────────────────────────────────────────────
export type WalkBeat =
  | { kind: 'walk'; ms?: number }
  | { kind: 'say'; text: string }
  | { kind: 'count'; to: number; obj: CountKind }   // Milo demonstrates counting 1→N aloud
  | { kind: 'guide'; n: number; obj: CountKind }    // child taps all N to count (guided, unscored)
  | { kind: 'catch'; beat: Beat<any> }              // the scored practice (SkillBeat) // eslint-disable-line @typescript-eslint/no-explicit-any
  | { kind: 'skill'; beat: Beat<any> } // eslint-disable-line @typescript-eslint/no-explicit-any

export interface Chapter { id: string; title: string; beats: WalkBeat[] }

export default function ForestWalk({ chapter, onFinish, onExit }: {
  chapter: Chapter
  onFinish?: (correct: number, wrong: number) => void   // chapter completed → award XP
  onExit?: () => void                                    // bailed out via the Menu button
}) {
  const router = useRouter()
  const needsRotate = useNeedsRotate()
  const [vp, setVp] = useState({ w: 0, h: 0 })
  useEffect(() => {
    const f = () => setVp({ w: window.innerWidth, h: window.innerHeight })
    f(); window.addEventListener('resize', f); window.addEventListener('orientationchange', f)
    return () => { window.removeEventListener('resize', f); window.removeEventListener('orientationchange', f) }
  }, [])
  const miloH = Math.min(Math.round((vp.h || 450) * 0.46), 320)
  const miloW = Math.round(miloH * 0.82)
  const [idx, setIdx] = useState(0)
  const [forceWalk, setForceWalk] = useState(false)   // brief walk interlude during practice
  const beat = chapter.beats[idx]
  const walking = beat?.kind === 'walk' || forceWalk
  // Milo walks a couple of steps, then resolves so the practice resumes.
  const interlude = useCallback(() => new Promise<void>(resolve => {
    setForceWalk(true)
    window.setTimeout(() => { setForceWalk(false); resolve() }, 2400)
  }), [])
  const exit = useCallback(() => { stopSpeech(); (onExit ?? (() => router.push('/menu')))() }, [router, onExit])
  const advance = useCallback(() => setIdx(i => i + 1), [])
  // Walking past the last beat ends the chapter. When embedded in the game we report
  // the practice result (XP/coins come from the catch rounds); standalone we exit.
  // Done in an effect (not the setState updater) so the router/parent isn't updated
  // during React's render.
  // XP/coins come from the scored practice only (the 'catch' SkillBeat reports its
  // correct/wrong tally); the demo + guided slides don't count.
  const result = useRef({ correct: 0, wrong: 0 })
  const finished = useRef(false)
  useEffect(() => {
    if (idx < chapter.beats.length || finished.current) return
    finished.current = true
    stopSpeech()
    if (onFinish) onFinish(result.current.correct, result.current.wrong)
    else exit()
  }, [idx, chapter.beats, onFinish, exit])

  // walk beats auto-advance after their duration; say beats speak AND auto-advance
  // (no Next button) so explanation flows straight into the practice. (count/catch
  // beats run their own sequence and call advance / onComplete when finished.)
  useEffect(() => {
    if (!beat) return
    if (beat.kind === 'walk') {
      const id = window.setTimeout(advance, beat.ms ?? 2600)
      return () => window.clearTimeout(id)
    }
    if (beat.kind === 'say') {
      // speakSeq finishes the whole line before advancing — Milo is never cut off.
      const cancel = speakSeq([beat.text], { onDone: () => window.setTimeout(advance, 700) })
      return () => cancel()
    }
    if (beat.kind === 'guide') { speak('Now you count! Tap each one you see.') }
    return () => stopSpeech()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx])

  if (needsRotate) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, background: 'linear-gradient(180deg,#bfe6f7,#d6efc0)', padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 64, animation: 'fw_pop .6s ease both' }}>🔄</div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, color: 'var(--ink)' }}>Turn your phone sideways</div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--ink-soft)' }}>Milo&apos;s forest adventure plays in landscape! 🐴</div>
        <style>{CSS}</style>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100dvh', overflow: 'hidden', background: '#bfe6f7' }}>
      <style>{CSS}</style>
      <ForestBackground walking={walking} />

      {/* During counting, dim the forest so the bright flying objects stand out —
          but not during a walk interlude, where the bright forest reads as travel. */}
      {(beat?.kind === 'count' || beat?.kind === 'catch' || beat?.kind === 'guide') && !forceWalk && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 8, background: 'rgba(10,18,8,0.36)', pointerEvents: 'none' }} />
      )}

      {/* Milo — 2D sprite walk cycle (faces right); turns to idle when he stops. */}
      <div style={{ position: 'absolute', left: '4%', bottom: 24, width: miloW, height: miloH, zIndex: 12, pointerEvents: 'none' }}>
        <MiloSprite play={walking} style={{ pointerEvents: 'none' }} />
      </div>

      {/* Top bar */}
      <div style={{ position: 'absolute', top: 12, left: 14, right: 14, display: 'flex', alignItems: 'center', gap: 10, zIndex: 20 }}>
        <button onClick={exit} style={{ padding: '7px 14px', borderRadius: 50, background: 'var(--paper)', border: '3px solid var(--milo-orange)', color: 'var(--milo-orange)', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>← Menu</button>
        <div style={{ display: 'flex', gap: 4, flex: 1, justifyContent: 'center' }}>
          {chapter.beats.map((_, i) => (
            <div key={i} style={{ width: i === idx ? 18 : 7, height: 7, borderRadius: 4, transition: 'all .3s', background: i < idx ? 'var(--garden-green)' : i === idx ? 'var(--milo-orange)' : 'rgba(61,37,22,.18)' }} />
          ))}
        </div>
        <div style={{ width: 60 }} />
      </div>

      {/* Milo speech bubble (say beats) — top banner; auto-advances, no Next button */}
      {beat?.kind === 'say' && (
        <div onClick={() => speak(beat.text)} style={{ position: 'absolute', top: 52, left: '50%', transform: 'translateX(-50%)', maxWidth: '64%', zIndex: 20, animation: 'fw_pop .4s ease both',
          background: '#fff', border: '3px solid var(--outline)', borderRadius: 18, padding: '12px 18px', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--ink)', lineHeight: 1.4, textAlign: 'center', boxShadow: '0 4px 0 rgba(61,37,22,.1)', cursor: 'pointer' }}>
          {beat.text} <span style={{ fontSize: 18 }}>🔊</span>
        </div>
      )}

      {/* Count demo — Milo tells 1→N with objects flying around the scene (same
          look as the practice, so explanation → practice is one continuous flow). */}
      {beat?.kind === 'count' && (
        <>
          <div style={{ position: 'absolute', top: 48, left: 0, right: 0, zIndex: 20, display: 'flex', justifyContent: 'center', padding: '0 12px' }}>
            <div style={{ background: 'var(--paper)', border: '3px solid var(--milo-orange)', borderRadius: 999, padding: '10px 24px',
              fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 19, color: 'var(--milo-orange)', boxShadow: '0 4px 0 rgba(242,107,44,.25)' }}>Let&apos;s count together! 🔢</div>
          </div>
          <FlyingCountDemo key={idx} to={beat.to} obj={beat.obj} onDone={advance} />
        </>
      )}

      {/* Guided slide — child taps all N objects to count them (unscored). */}
      {beat?.kind === 'guide' && (
        <>
          <div style={{ position: 'absolute', top: 48, left: 0, right: 0, zIndex: 20, display: 'flex', justifyContent: 'center', padding: '0 12px' }}>
            <div style={{ background: 'var(--paper)', border: '3px solid var(--milo-orange)', borderRadius: 999, padding: '10px 24px',
              fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 19, color: 'var(--milo-orange)', boxShadow: '0 4px 0 rgba(242,107,44,.25)' }}>Now you count — tap each one! 👆</div>
          </div>
          <FlyingCountPlay key={idx} data={{ n: beat.n, obj: beat.obj }} onSubmit={advance} />
        </>
      )}

      {/* Catch station — the scored practice; only the prompt sits up top. */}
      {beat?.kind === 'catch' && (
        <div style={{ position: 'absolute', top: 48, left: 0, right: 0, zIndex: 20, display: 'flex', justifyContent: 'center', padding: '0 12px' }}>
          <SkillBeat beat={beat.beat} onInterlude={interlude} onComplete={(c, w) => { result.current.correct += c; result.current.wrong += w; advance() }} />
        </div>
      )}

      {/* Practice station (SkillBeat) */}
      {beat?.kind === 'skill' && (
        <div style={{ position: 'absolute', right: '4%', top: '50%', transform: 'translateY(-50%)', width: '52%', maxWidth: 520, zIndex: 20,
          background: 'rgba(255,255,255,.82)', border: '3px solid var(--outline)', borderRadius: 22, padding: 16, boxShadow: '0 6px 0 rgba(61,37,22,.1)', animation: 'fw_pop .4s ease both' }}>
          <SkillBeat beat={beat.beat} onComplete={advance} />
        </div>
      )}
    </div>
  )
}
