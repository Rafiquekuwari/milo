'use client'
/**
 * StoryWorld — the 3–5 "story mode" engine.
 *
 * A world is an ordered list of scenes. Milo walks the path with a goal; between
 * scenes a short walk transition plays; friends collected accumulate in his party.
 * See docs/story-mode-3-5.md.
 *
 * The pedagogy is NOT in the story — it's in <SkillBeat>, which every skill scene
 * uses. SkillBeat owns the non-negotiables (adaptive difficulty + in-story
 * re-explanation + warm wrong-answers), so they're present in every scene by
 * construction, no matter how the story changes.
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { speak, stopSpeech } from '@/lib/useMiloSpeaker'
import { useAdaptive, type Difficulty } from '@/lib/adaptive'
import { type ChapterType } from '@/lib/store'
import { CSS as KIT_CSS } from '../lessons/_kit'
import { Backdrop, type BackdropKind } from './art'
import MiloSprite from './MiloSprite'

const STORY_CSS = `
@keyframes s_walk { 0%,100%{transform:translateY(0) rotate(-2deg)} 50%{transform:translateY(-10px) rotate(2deg)} }
@keyframes s_bobIn { 0%{transform:translateY(18px) scale(.8);opacity:0} 100%{transform:translateY(0) scale(1);opacity:1} }
@keyframes s_pathMove { from{background-position-x:0} to{background-position-x:-120px} }
@keyframes s_twinkle { 0%,100%{opacity:.55;transform:scale(.9)} 50%{opacity:1;transform:scale(1.12)} }
`

// ─── A skill round: data + how to play it + how Milo re-teaches it ──
export interface Beat<T> {
  skillId: ChapterType
  rounds: number
  reteachAfter?: number                  // wrong-in-a-row streak that triggers Milo's
                                         // re-explanation (defaults to 2)
  walkEvery?: number                     // play a short walk interlude every N rounds,
                                         // so a long practice feels like a journey
  make: (d: Difficulty) => T
  prompt: (data: T) => string            // shown on screen
  say?: (data: T) => string              // spoken by Milo (defaults to prompt). Use
                                         // a different `say` when the answer must be
                                         // HEARD not read (e.g. number-recognition doors).
  Play: React.FC<{ data: T; onSubmit: (correct: boolean) => void }>
  Reteach: React.FC<{ data: T; onDone: () => void }>
}

export type Scene =
  | { kind: 'intro'; bg: string; backdrop: BackdropKind; bubble: string }
  | { kind: 'skill'; bg: string; backdrop: BackdropKind; bubble: string; friend?: { emoji: string; name: string }; beat: Beat<any> } // eslint-disable-line @typescript-eslint/no-explicit-any
  | { kind: 'payoff'; bg: string; backdrop: BackdropKind; bubble: string }

export interface World { id: string; title: string; scenes: Scene[] }

// ─── SkillBeat: the unbreakable pedagogy core ──────────────────
// Runs `rounds` adaptive rounds. Warm wrong-answers (no red X). On a 2-wrong
// streak, Milo re-explains in-story, then the child retries.
export function SkillBeat({ beat, onComplete, onInterlude }: { beat: Beat<any>; onComplete: (correct: number, wrong: number) => void; onInterlude?: () => Promise<void> }) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const ada = useAdaptive(beat.skillId)
  const adaRef = useRef(ada); adaRef.current = ada
  const [roundIdx, setRoundIdx] = useState(0)
  const [phase, setPhase] = useState<'play' | 'feedback' | 'reteach' | 'interlude'>('play')
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [wrongRun, setWrongRun] = useState(0)
  const tally = useRef({ correct: 0, wrong: 0 })   // reported to onComplete → drives XP

  // ONE data object per round. Must be stable across re-renders (it holds the
  // random target), or the Play UI and the answer-check would disagree and the
  // round could never complete. Difficulty is read at round start.
  const data = useMemo(() => beat.make(adaRef.current.difficulty), [roundIdx, beat])

  // Announce each new round. The SPOKEN text may differ from the shown text —
  // e.g. doors reveal the number only by voice, not on screen.
  useEffect(() => {
    speak((beat.say ?? beat.prompt)(data))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIdx])

  const onSubmit = useCallback((correct: boolean) => {
    if (phase !== 'play') return
    ada.record(correct)
    if (correct) tally.current.correct++; else tally.current.wrong++
    setFeedback(correct ? 'correct' : 'wrong')
    setPhase('feedback')
    const newRun = correct ? 0 : wrongRun + 1
    setWrongRun(newRun)
    speak(correct ? ada.praise : ada.encouragement)
    window.setTimeout(() => {
      setFeedback(null)
      if (!correct && newRun >= (beat.reteachAfter ?? 2)) { setPhase('reteach'); return }
      const next = roundIdx + 1
      if (next >= beat.rounds) { onComplete(tally.current.correct, tally.current.wrong); return }
      // Storyline interlude: Milo walks a few steps every `walkEvery` rounds. The
      // adaptive streak/tally carry across it untouched.
      if (onInterlude && beat.walkEvery && next % beat.walkEvery === 0) {
        setPhase('interlude')
        onInterlude().then(() => { setPhase('play'); setRoundIdx(next) })
        return
      }
      setPhase('play'); setRoundIdx(next)
    }, 1300)
  }, [phase, ada, wrongRun, roundIdx, beat, onComplete, onInterlude])

  const finishReteach = useCallback(() => {
    setWrongRun(0)
    const next = roundIdx + 1
    if (next >= beat.rounds) onComplete(tally.current.correct, tally.current.wrong)
    else { setPhase('play'); setRoundIdx(next) }
  }, [roundIdx, beat, onComplete])

  return (
    <div style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      {/* Progress bar for a longer practice — shows how much is left to finish. */}
      {beat.rounds >= 3 && (
        <>
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 9, zIndex: 25, background: 'rgba(255,255,255,.45)' }}>
            <div style={{ height: '100%', width: `${Math.round((roundIdx / beat.rounds) * 100)}%`, transition: 'width .45s ease',
              background: 'linear-gradient(90deg,var(--garden-green),var(--garden-green-deep))', borderRadius: '0 6px 6px 0' }} />
          </div>
          <div style={{ position: 'fixed', top: 14, right: 16, zIndex: 25, background: 'var(--paper)', border: '3px solid var(--garden-green)', borderRadius: 999,
            padding: '3px 14px', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 16, color: 'var(--garden-green-deep)' }}>
            {Math.min(roundIdx + 1, beat.rounds)} / {beat.rounds}
          </div>
        </>
      )}
      {/* The task is shown AND spoken. Tapping replays Milo's voice — a tap is a
          user gesture, so it reliably plays even if autoplay was blocked. */}
      {(phase === 'play' || phase === 'feedback') && beat.prompt(data).trim() && (
        <button onClick={() => speak((beat.say ?? beat.prompt)(data))} aria-label="Hear it again"
          style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
            fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 19, color: 'var(--milo-orange)',
            background: 'var(--paper)', border: '3px solid var(--milo-orange)', borderRadius: 999, padding: '8px 20px', textAlign: 'center', boxShadow: '0 4px 0 rgba(242,107,44,.25)' }}>
          <span>{beat.prompt(data)}</span>
          <span style={{ fontSize: 22, lineHeight: 1 }}>🔊</span>
        </button>
      )}
      {phase === 'reteach'
        ? <beat.Reteach data={data} onDone={finishReteach} />
        : phase === 'interlude'
          ? null
          : <beat.Play key={roundIdx} data={data} onSubmit={onSubmit} />}
      {feedback && (
        <div style={{ position: 'fixed', top: '40%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 60,
          background: feedback === 'correct' ? 'var(--garden-green)' : 'var(--milo-orange)', color: '#fff',
          fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 30, padding: '14px 36px', borderRadius: 24,
          border: '4px solid var(--outline)', boxShadow: '0 8px 0 rgba(61,37,22,.2)', animation: 'k_bounceIn .4s cubic-bezier(.34,1.56,.64,1) both' }}>
          {feedback === 'correct' ? '🎉 Yes!' : 'Let\'s look together! 🙂'}
        </div>
      )}
    </div>
  )
}

// ─── Walk transition between scenes ────────────────────────────
function WalkTransition({ onDone }: { onDone: () => void }) {
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return; ran.current = true
    const id = window.setTimeout(onDone, 2400)   // long enough to see the walk
    return () => window.clearTimeout(id)
  }, [onDone])
  return (
    <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      backgroundImage: 'repeating-linear-gradient(90deg, var(--garden-green-soft) 0 60px, var(--sky-blue-soft) 60px 120px)',
      backgroundSize: '120px 100%', animation: 's_pathMove .5s linear infinite', borderRadius: 22 }}>
      <div style={{ width: '85%', maxWidth: 320, height: '92%' }}><MiloSprite play /></div>
    </div>
  )
}

// ─── Party (friends collected so far) ──────────────────────────
function Party({ friends }: { friends: { emoji: string; name: string }[] }) {
  if (!friends.length) return null
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {friends.map((f, i) => (
        <span key={i} title={f.name} style={{ fontSize: 24, animation: 's_bobIn .4s ease both' }}>{f.emoji}</span>
      ))}
    </div>
  )
}

// ─── The world orchestrator ────────────────────────────────────
export default function StoryWorld({ world, onExit }: { world: World; onExit?: () => void }) {
  const router = useRouter()
  const [idx, setIdx] = useState(0)
  const [walking, setWalking] = useState(false)
  const [friends, setFriends] = useState<{ emoji: string; name: string }[]>([])
  const scene = world.scenes[idx]

  // Speak the scene bubble when a (non-walking) scene appears.
  useEffect(() => {
    if (walking) return
    speak(scene.bubble)
    return () => stopSpeech()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, walking])

  const advance = useCallback(() => {
    if (scene.kind === 'skill' && scene.friend) setFriends(f => [...f, scene.friend!])
    if (idx >= world.scenes.length - 1) { stopSpeech(); (onExit ?? (() => router.push('/menu')))(); return }
    setWalking(true)
  }, [scene, idx, world.scenes.length, onExit, router])

  const arrive = useCallback(() => { setWalking(false); setIdx(i => i + 1) }, [])

  return (
    <div className="milo-lesson" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center',
      background: scene.bg, padding: '10px 14px 22px', gap: 10 }}>
      <style>{KIT_CSS}{STORY_CSS}</style>

      {/* Header: exit + progress dots + party */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', maxWidth: 540, paddingTop: 6 }}>
        <button onClick={() => { stopSpeech(); (onExit ?? (() => router.push('/menu')))() }}
          style={{ padding: '7px 14px', borderRadius: 50, flexShrink: 0, background: 'var(--paper)', border: '3px solid var(--milo-orange)',
            color: 'var(--milo-orange)', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, cursor: 'pointer', boxShadow: '0 3px 0 rgba(242,107,44,.25)' }}>← Menu</button>
        <div style={{ display: 'flex', gap: 4, flex: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
          {world.scenes.map((_, i) => (
            <div key={i} style={{ width: i === idx ? 22 : 8, height: 8, borderRadius: 4, transition: 'all .3s ease',
              background: i < idx ? 'var(--garden-green)' : i === idx ? 'var(--milo-orange)' : 'rgba(61,37,22,.12)' }} />
          ))}
        </div>
        <Party friends={friends} />
      </div>

      {/* Milo + speech bubble */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, width: '100%', maxWidth: 540 }}>
        <img src="/assets/characters/milo_idle.png" alt="Milo"
          style={{ width: 64, height: 64, objectFit: 'contain', flexShrink: 0, filter: 'drop-shadow(0 4px 8px rgba(61,37,22,.2))', animation: 's_walk 3s ease-in-out infinite' }}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        <div style={{ background: '#fff', border: '3px solid var(--outline)', borderRadius: '18px 18px 18px 4px', padding: '10px 14px', flex: 1,
          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--ink)', lineHeight: 1.4, boxShadow: '0 4px 0 rgba(61,37,22,.07)' }}>{scene.bubble}</div>
      </div>

      {/* Stage */}
      {walking ? <WalkTransition onDone={arrive} /> : (
        <div style={{ flex: 1, width: '100%', maxWidth: 540, border: '3px solid var(--outline)',
          borderRadius: 22, boxShadow: '0 5px 0 rgba(61,37,22,.07)', display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'flex-end', padding: 16, minHeight: 320, position: 'relative', overflow: 'hidden' }}>
          <Backdrop kind={scene.backdrop} />
          <div style={{ position: 'relative', zIndex: 1, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', flex: 1, paddingBottom: 8 }}>
            {scene.kind === 'skill'
              ? <SkillBeat beat={scene.beat} onComplete={advance} />
              : <IntroOrPayoff onNext={advance} kind={scene.kind} />}
          </div>
        </div>
      )}
    </div>
  )
}

function IntroOrPayoff({ onNext, kind }: { onNext: () => void; kind: 'intro' | 'payoff' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, position: 'relative' }}>
      {kind === 'payoff'
        ? <div style={{ fontSize: 90, animation: 'k_miloJump .8s ease-in-out infinite' }}>🎉</div>
        : <div style={{ width: 220, height: 220 }}><MiloSprite play={false} /></div>}
      <button onClick={onNext} style={{ padding: '16px 40px', borderRadius: 50, border: 'none', cursor: 'pointer',
        background: 'linear-gradient(135deg,var(--milo-orange) 0%,var(--milo-orange-deep) 100%)', color: '#fff',
        fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, boxShadow: '0 6px 18px rgba(242,107,44,.4)' }}>
        {kind === 'payoff' ? 'Yay! 🌟' : "Let's go! ▶"}
      </button>
    </div>
  )
}
