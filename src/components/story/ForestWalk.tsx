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
import { BIOMES, BIOME_ORDER, type BiomeId } from './biomes'

const CSS = `
@keyframes fw_bg  { to { transform: translateX(-25%) } }
@keyframes fw_pop { 0%{transform:translateY(10px) scale(.9);opacity:0} 100%{transform:translateY(0) scale(1);opacity:1} }
@keyframes fw_fly { 0%{transform:translate(0,0) rotate(0)} 25%{transform:translate(12px,-14px) rotate(5deg)} 50%{transform:translate(-9px,9px) rotate(-4deg)} 75%{transform:translate(9px,5px) rotate(3deg)} 100%{transform:translate(0,0) rotate(0)} }
@keyframes fw_bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
@keyframes fw_blink { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(1.05)} }
@keyframes fw_tap { 0%{transform:scale(1)} 30%{transform:scale(1.65)} 65%{transform:scale(1.1)} 100%{transform:scale(1.25)} }
@keyframes fw_check { 0%{transform:scale(0) rotate(-45deg);opacity:0} 60%{transform:scale(1.3) rotate(5deg);opacity:1} 100%{transform:scale(1) rotate(0deg);opacity:1} }
@keyframes fw_drift { from{transform:translateX(0)} to{transform:translateX(-60px)} }
@keyframes fw_boat { 0%,100%{transform:translateY(0) rotate(-1.4deg)} 50%{transform:translateY(-3%) rotate(1.4deg)} }
`

// Milo on screen. Underwater gets a scuba sprite (gently bobs); everywhere else he
// walks. Falls back to the normal walk sprite if the asset is missing.
function MiloAvatar({ biome, walking }: { biome: BiomeId; walking: boolean }) {
  const [underwaterOk, setUnderwaterOk] = useState(true)
  if (biome === 'underwater' && underwaterOk) {
    return (
      <img src="/assets/characters/milo_underwater.png" alt="Milo underwater" draggable={false}
        onError={() => setUnderwaterOk(false)}
        style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'bottom center', animation: 'fw_boat 3.2s ease-in-out infinite' }} />
    )
  }
  return <MiloSprite play={walking} style={{ pointerEvents: 'none' }} />
}

// ─── Biome backgrounds ─────────────────────────────────────────
// A painted scene scrolls behind Milo as he walks. Image biomes (forest, garden)
// tile a real JPEG/PNG; the others render a gradient placeholder until painted art
// is dropped into BIOMES[id].bgImage. All biome layers are stacked and cross-fade
// by opacity, so walking from forest→pond→sky→garden dissolves smoothly.

// Painted background: 8 copies, alternating normal/mirrored so the seam never shows.
// Walking → scroll; stopped → ease to a fixed "hero" frame so hidden objects line up.
function ImageScroll({ src, moving }: { src: string; moving: boolean }) {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', width: 'max-content', filter: 'brightness(.85) saturate(1.05)',
      animation: moving ? 'fw_bg 30s linear infinite' : 'none',
      transform: moving ? undefined : 'translateX(0)',
      transition: moving ? 'none' : 'transform .7s ease-out' }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <img key={i} src={src} alt="" draggable={false}
          style={{ height: '100%', width: 'auto', display: 'block', flexShrink: 0, transform: i % 2 ? 'scaleX(-1)' : 'none' }} />
      ))}
    </div>
  )
}

// Gradient placeholder for any biome without painted art yet (all current biomes —
// forest, underwater, garden — ship a bgImage, so this is just a graceful fallback).
function SceneBg({ moving }: { id: BiomeId; moving: boolean }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,#bfe6f7 0%,#d8f0e6 38%,#8fd0e8 46%,#5fb4d8 72%,#3f97c2 100%)' }}>
      <div style={{ position: 'absolute', top: '8%', left: '16%', width: 70, height: 70, borderRadius: '50%', background: 'radial-gradient(circle,#fff6c2,#ffe9a8)', opacity: 0.9 }} />
      {/* water ripples */}
      <div style={{ position: 'absolute', inset: 0, animation: moving ? 'fw_drift 5s linear infinite' : 'none' }}>
        {[52, 64, 76, 88].map((y, i) => (
          <div key={i} style={{ position: 'absolute', left: '-5%', right: '-5%', top: `${y}%`, height: 3, borderRadius: 3, background: 'rgba(255,255,255,.35)' }} />
        ))}
      </div>
    </div>
  )
}

function BiomeBackground({ biome, walking, ids = BIOME_ORDER }: { biome: BiomeId; walking: boolean; ids?: BiomeId[] }) {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#bfe6f7' }}>
      {ids.map(id => {
        const active = id === biome
        const b = BIOMES[id]
        return (
          <div key={id} style={{ position: 'absolute', inset: 0, overflow: 'hidden', opacity: active ? 1 : 0, transition: 'opacity 1s ease', pointerEvents: 'none' }}>
            {b.bgImage
              ? <ImageScroll src={b.bgImage} moving={active && walking} />
              : <SceneBg id={id} moving={active && walking} />}
          </div>
        )
      })}
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
// `biome` sets the place (background + where creatures spawn). It carries forward
// until the next beat overrides it; a `walk` with `toBiome` switches the background
// DURING the walk, so Milo arrives somewhere new.
export type WalkBeat =
  | { kind: 'walk'; ms?: number; toBiome?: BiomeId }
  | { kind: 'say'; text: string; biome?: BiomeId }
  | { kind: 'count'; to: number; obj: CountKind; biome?: BiomeId }   // Milo demonstrates counting 1→N aloud
  | { kind: 'guide'; n: number; obj: CountKind; biome?: BiomeId }    // child taps all N to count (guided, unscored)
  | { kind: 'catch'; beat: Beat<any>; biome?: BiomeId }              // the scored practice (SkillBeat) // eslint-disable-line @typescript-eslint/no-explicit-any
  | { kind: 'skill'; beat: Beat<any> } // eslint-disable-line @typescript-eslint/no-explicit-any

// `biomes` lists the backgrounds this chapter visits (its storytelling's three
// places), so BiomeBackground stacks only those — not every biome in the registry.
export interface Chapter { id: string; title: string; beats: WalkBeat[]; biomes?: BiomeId[] }

export default function ForestWalk({ chapter, onFinish, onExit }: {
  chapter: Chapter
  onFinish?: (correct: number, wrong: number, mastered?: boolean) => void   // chapter completed → award XP
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
  // ?skip jumps straight to the catch/practice beat (dev shortcut to preview biome changes)
  const skipToPractice = typeof window !== 'undefined' && window.location.search.includes('skip')
  const startIdx = skipToPractice ? chapter.beats.findIndex(b => b.kind === 'catch') : 0
  const [idx, setIdx] = useState(Math.max(0, startIdx))
  const [forceWalk, setForceWalk] = useState(false)   // brief walk interlude during practice
  const [biome, setBiome] = useState<BiomeId>(chapter.biomes?.[0] ?? 'forest')   // current place (bg + spawn band)
  const beat = chapter.beats[idx]
  const walking = beat?.kind === 'walk' || forceWalk
  const band = BIOMES[biome].band
  // The place follows the beats: a beat's `biome` sets it; a `walk` with `toBiome`
  // switches it as the walk starts, so the background cross-fades while Milo travels.
  useEffect(() => {
    if (!beat) return
    if (beat.kind === 'walk') { if (beat.toBiome) setBiome(beat.toBiome) }
    // The 'catch' practice rotates biome PER ROUND via its SkillBeat onRound (below),
    // so don't pin it here — otherwise this effect overrides round 1's biome on mount
    // (child onRound runs first, then this parent effect would snap it back).
    else if (beat.kind !== 'catch' && 'biome' in beat && beat.biome) setBiome(beat.biome)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx])
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
  const result = useRef({ correct: 0, wrong: 0, mastered: false })
  const finished = useRef(false)
  useEffect(() => {
    if (idx < chapter.beats.length || finished.current) return
    finished.current = true
    stopSpeech()
    if (onFinish) onFinish(result.current.correct, result.current.wrong, result.current.mastered)
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
      <BiomeBackground biome={biome} walking={walking} ids={chapter.biomes} />

      {/* No dim overlay during counting: the objects are meant to HIDE in the
          foliage (a find-and-count hunt), so the forest stays bright and they
          blend in until the child finds and taps each one (then it pops + glows). */}

      {/* Milo — 2D sprite walk cycle (faces right); turns to idle when he stops. */}
      <div style={{ position: 'absolute', left: '4%', bottom: 24, width: miloW, height: miloH, zIndex: 12, pointerEvents: 'none' }}>
        <MiloAvatar biome={biome} walking={walking} />
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
          <FlyingCountDemo key={idx} to={beat.to} obj={beat.obj} band={band} onDone={advance} />
        </>
      )}

      {/* Guided slide — child taps all N objects to count them (unscored). */}
      {beat?.kind === 'guide' && (
        <>
          <div style={{ position: 'absolute', top: 48, left: 0, right: 0, zIndex: 20, display: 'flex', justifyContent: 'center', padding: '0 12px' }}>
            <div style={{ background: 'var(--paper)', border: '3px solid var(--milo-orange)', borderRadius: 999, padding: '10px 24px',
              fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 19, color: 'var(--milo-orange)', boxShadow: '0 4px 0 rgba(242,107,44,.25)' }}>Now you count — tap each one! 👆</div>
          </div>
          <FlyingCountPlay key={idx} data={{ n: beat.n, obj: beat.obj, band }} onSubmit={advance} />
        </>
      )}

      {/* Catch station — the scored practice; only the prompt sits up top. */}
      {beat?.kind === 'catch' && (
        <div style={{ position: 'absolute', top: 48, left: 0, right: 0, zIndex: 20, display: 'flex', justifyContent: 'center', padding: '0 12px' }}>
          <SkillBeat beat={beat.beat} onInterlude={interlude}
            onRound={(data) => { if (data?.biomeId) setBiome(data.biomeId) }}
            onComplete={(c, w, mastered) => { result.current.correct += c; result.current.wrong += w; if (mastered) result.current.mastered = true; advance() }} />
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
