'use client'

// TeenLessonShell — the teen "Field Lab" equivalent of the kids' LessonScaffold
// (src/components/lessons/_kit.tsx). It reuses the SAME step-driver shape:
//   - a `step` index + `nextReady` gate + a `retry` counter
//   - the current step hosted under `key={`${step}-${retry}`}` so Retry fully
//     remounts the step (re-running its mount effects / animation / narration)
//   - on Next past the last step, speak(finalSpeech) then onLessonComplete()
//     after a short tail
//   - Back → confirm → router.push('/menu'); Skip → onLessonComplete()
//
// It renders TEEN chrome instead of the warm kids Shell: a MiloMark + a hairline
// progress rail + a quiet Milo bubble, advancing via <CalmAdvance/> (neutral
// Replay/Continue, no cheer/bounce/confetti). The root keeps
// className="milo-lesson" + minHeight:'100dvh' so the game fit-controller renders
// it full-height (no zoom-scaling), exactly like the kids lesson root.
//
// An optional `intro` (typically a <CaseCard/>) is rendered as step 0.

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { speak, stopSpeech } from '@/lib/useMiloSpeaker'
import type { LessonStep } from '@/components/lessons/_kit'
import type { AgeBand, MiloMood } from '@/components/teen/types'
import MiloMark from '@/components/teen/MiloMark'
import CalmAdvance, { teenMicrocopy } from '@/components/teen/CalmAdvance'

export interface TeenLessonShellProps {
  band: AgeBand
  childName: string
  chapterTitle: string
  steps: LessonStep[] // each step.render(onDone) returns its visual; calls onDone() when ready
  finalSpeech: string
  onLessonComplete: () => void
  intro?: React.ReactNode // optional CaseCard rendered as step 0
}

// Map a LessonStep's kid mood onto the teen MiloMark mood vocabulary.
function moodFor(stepMood: LessonStep['mood']): MiloMood {
  return stepMood === 'thinking' ? 'thinking' : 'speaking'
}

export default function TeenLessonShell({
  band,
  childName,
  chapterTitle,
  steps,
  finalSpeech,
  onLessonComplete,
  intro,
}: TeenLessonShellProps) {
  const router = useRouter()

  // Compose the intro (if any) as a synthetic step 0 — a static panel whose
  // render() immediately unlocks Next (there's no animation to wait on).
  const allSteps: LessonStep[] = React.useMemo(() => {
    if (!intro) return steps
    const introStep: LessonStep = {
      bubble: '',
      mood: 'happy',
      render: (onDone) => <IntroStep onDone={onDone}>{intro}</IntroStep>,
    }
    return [introStep, ...steps]
  }, [intro, steps])

  const total = allSteps.length

  const [step, setStep] = useState(0)
  const [nextReady, setNextReady] = useState(false)
  const [retry, setRetry] = useState(0) // bumping this remounts the step → replays it
  const [confirmBack, setConfirmBack] = useState(false)

  const cur = allSteps[step]
  const isIntro = !!intro && step === 0

  // Stable so step components depending on it (e.g. timer effects) don't re-fire.
  const onStepDone = useCallback(() => setNextReady(true), [])

  // Keep the latest completion callback in a ref so the deferred tail-timer fires
  // the current handler even after re-renders.
  const completeRef = useRef(onLessonComplete)
  completeRef.current = onLessonComplete

  // Clean up any pending tail-timer + speech on unmount.
  const tailRef = useRef<number | null>(null)
  useEffect(() => {
    return () => {
      if (tailRef.current != null) window.clearTimeout(tailRef.current)
      stopSpeech()
    }
  }, [])

  function next() {
    if (!nextReady) return
    stopSpeech()
    if (step >= total - 1) {
      speak(finalSpeech)
      tailRef.current = window.setTimeout(() => completeRef.current(), 2600)
      return
    }
    setStep((s) => s + 1)
    setNextReady(false)
  }

  // Retry = replay the current step: re-mount it (key change re-runs its
  // animation + narration) and hide the advance panel until it finishes again.
  function retryStep() {
    stopSpeech()
    setNextReady(false)
    setRetry((r) => r + 1)
  }

  function skip() {
    stopSpeech()
    if (tailRef.current != null) window.clearTimeout(tailRef.current)
    completeRef.current()
  }

  // A calm, no-judgement encouragement line on the advance panel — the teen
  // replacement for the kids' cheerFor(). Rotates per step; the intro gets none.
  const advanceNote = React.useMemo(() => {
    if (isIntro) return undefined
    const bank = teenMicrocopy(band).encouragement
    if (bank.length === 0) return undefined
    return bank[step % bank.length]
  }, [isIntro, band, step])

  return (
    <div
      className="milo-lesson"
      data-band={undefined /* set by an ancestor BandScope; never set here */}
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: 'var(--bg-page)',
        color: 'var(--ink)',
        fontFamily: 'var(--font-body)',
      }}
    >
      <style>{SHELL_CSS}</style>

      {/* ── Header: Back · chapter title · hairline progress rail · Skip ── */}
      <header
        style={{
          width: '100%',
          maxWidth: 720,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          padding: '14px 18px 10px',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 30 }}>
          <button
            type="button"
            onClick={() => setConfirmBack(true)}
            aria-label="Back to menu"
            style={btnGhostStyle}
          >
            <span aria-hidden="true" style={{ fontSize: '1em', lineHeight: 1 }}>
              ‹
            </span>{' '}
            Menu
          </button>

          <h1
            style={{
              margin: 0,
              flex: 1,
              minWidth: 0,
              fontFamily: 'var(--font-body)',
              fontSize: '1rem',
              fontWeight: 600,
              lineHeight: 1.25,
              color: 'var(--ink)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {chapterTitle}
          </h1>

          <span
            aria-hidden="true"
            style={{
              flexShrink: 0,
              fontFamily: 'var(--font-numeric)',
              fontSize: '0.8125rem',
              color: 'var(--ink-muted)',
              letterSpacing: '0.02em',
            }}
          >
            {Math.min(step + 1, total)} / {total}
          </span>

          <button
            type="button"
            onClick={skip}
            title="Skip the walkthrough and start the practice"
            style={btnGhostStyle}
          >
            Skip ›
          </button>
        </div>

        {/* Hairline progress rail — segmented, calm fill. */}
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={Math.min(step + 1, total)}
          aria-label={`Step ${Math.min(step + 1, total)} of ${total}`}
          style={{ display: 'flex', gap: 4, width: '100%' }}
        >
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 2,
                borderRadius: 999,
                background: i <= step ? 'var(--accent)' : 'var(--bg-2)',
                transition: 'background 250ms var(--ease-smooth)',
              }}
            />
          ))}
        </div>
      </header>

      {/* ── Milo bubble (skipped for the intro, which carries its own copy) ── */}
      {!isIntro && cur.bubble && (
        <div
          style={{
            width: '100%',
            maxWidth: 720,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            padding: '4px 18px 0',
            boxSizing: 'border-box',
          }}
        >
          <MiloMark band={band} mood={moodFor(cur.mood)} size={36} />
          <div
            style={{
              flex: 1,
              minWidth: 0,
              background: 'var(--paper)',
              border: '1px solid var(--outline)',
              borderRadius: 12,
              padding: '10px 14px',
              fontFamily: 'var(--font-body)',
              fontWeight: 500,
              fontSize: 15,
              lineHeight: 1.5,
              color: 'var(--ink)',
            }}
          >
            {cur.bubble}
          </div>
        </div>
      )}

      {/* ── Step canvas ── */}
      <main
        style={{
          flex: 1,
          width: '100%',
          maxWidth: 720,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          justifyContent: 'center',
          padding: isIntro ? '14px 18px 28px' : '16px 18px 28px',
          boxSizing: 'border-box',
        }}
      >
        <StepHost key={`${step}-${retry}`} render={cur.render} onDone={onStepDone} />
      </main>

      {/* ── Calm advance panel (Replay / Continue) ── */}
      {nextReady && (
        <CalmAdvance band={band} onRetry={retryStep} onContinue={next} note={advanceNote} />
      )}

      {/* ── Leave-confirm ── */}
      {confirmBack &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            data-band={band}
            role="dialog"
            aria-modal="true"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1000, // above a chapter's full-screen portal (z 900)
              backgroundColor: 'color-mix(in srgb, var(--ink) 28%, transparent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px 20px',
              animation: 'teen_shell_fade 200ms var(--ease-smooth)',
            }}
          >
            <div
              style={{
                background: 'var(--paper)',
                border: '1px solid var(--outline)',
                borderRadius: 14,
                padding: '22px 24px 20px',
                maxWidth: 380,
                width: '100%',
                boxShadow: '0 6px 28px color-mix(in srgb, var(--ink) 14%, transparent)',
              }}
            >
              <h2
                style={{
                  margin: '0 0 8px',
                  fontFamily: 'var(--font-body)',
                  fontSize: 17,
                  fontWeight: 700,
                  color: 'var(--ink)',
                }}
              >
                Leave the walkthrough?
              </h2>
              <p
                style={{
                  margin: '0 0 18px',
                  fontFamily: 'var(--font-body)',
                  fontSize: 15,
                  lineHeight: 1.5,
                  color: 'var(--ink-soft)',
                }}
              >
                You can pick this back up any time — nothing here is lost.
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setConfirmBack(false)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: 10,
                    background: 'var(--paper)',
                    border: '1px solid var(--outline)',
                    color: 'var(--ink-soft)',
                    fontFamily: 'var(--font-body)',
                    fontWeight: 600,
                    fontSize: 15,
                    cursor: 'pointer',
                  }}
                >
                  Stay
                </button>
                <button
                  type="button"
                  onClick={() => {
                    stopSpeech()
                    router.push('/menu')
                  }}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 10,
                    background: 'var(--accent)',
                    border: '1px solid var(--accent)',
                    color: 'var(--paper)',
                    fontFamily: 'var(--font-body)',
                    fontWeight: 700,
                    fontSize: 15,
                    cursor: 'pointer',
                  }}
                >
                  Leave
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}

// childName is part of the documented contract (parity with LessonScaffold) and
// may be woven into step copy by the chapter; referenced here to keep it live.
TeenLessonShell.displayName = 'TeenLessonShell'

const btnGhostStyle: React.CSSProperties = {
  flexShrink: 0,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '5px 10px',
  background: 'transparent',
  border: '1px solid var(--outline)',
  borderRadius: 8,
  color: 'var(--ink-soft)',
  fontFamily: 'var(--font-body)',
  fontWeight: 600,
  fontSize: '0.8125rem',
  cursor: 'pointer',
  transition: 'color 200ms var(--ease-smooth), border-color 200ms var(--ease-smooth)',
}

// Hosts a step's render(onDone); remounts whenever its `key` changes (Retry).
function StepHost({
  render,
  onDone,
}: {
  render: (onDone: () => void) => React.ReactNode
  onDone: () => void
}) {
  return <>{render(onDone)}</>
}

// The intro panel (CaseCard) rendered as step 0. It has no animation to wait on,
// so it unlocks Next immediately on mount.
function IntroStep({ onDone, children }: { onDone: () => void; children: React.ReactNode }) {
  const doneRef = useRef(onDone)
  doneRef.current = onDone
  useEffect(() => {
    doneRef.current()
  }, [])
  return <>{children}</>
}

const SHELL_CSS = `
@keyframes teen_shell_fade { from { opacity: 0 } to { opacity: 1 } }
@media (prefers-reduced-motion: reduce) {
  .milo-lesson [role="progressbar"] > div { transition: none !important }
  .milo-lesson [role="dialog"] { animation: none !important }
}
`
