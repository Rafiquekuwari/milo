'use client'

/**
 * useMiloSpeaker — Milo's speech engine
 *
 * Root cause of silence bug:
 * Chrome's speechSynthesis gets stuck when:
 * 1. cancel() and speak() are called too close together
 * 2. Multiple speak() calls queue up (pending: true, speaking: true, no audio)
 *
 * Fix:
 * - cancel() then wait 100ms BEFORE speak() — gives Chrome time to reset
 * - Dedupe: if same text is already speaking, don't re-queue
 * - Single active utterance — always cancel previous before new one
 */

import { useCallback, useSyncExternalStore } from 'react'
import { pointAt, clearPointer } from './miloPointer'

// ─── Singleton state ──────────────────────────────────────────────────────────
let _voices: SpeechSynthesisVoice[] = []
let _speaking   = false
let _blocked    = false
let _lastText   = ''
let _lastRate   = 0.88
let _lastPitch  = 1.05
let _speakTimer: ReturnType<typeof setTimeout> | null = null
let _onEndCbs: Array<() => void> = []
let _keepalive: ReturnType<typeof setInterval> | null = null
// Safety watchdog for a single utterance: if onstart fires but onend/onerror
// never do (a known mobile interruption), this clears _speaking so SpeakingLock
// can't freeze the whole screen and afterSpeech() callbacks still run.
let _singleWatch: ReturnType<typeof setTimeout> | null = null
// Cancel fn for an in-flight speakSeq(). stopSpeech()/speak() call this so a
// sequence is truly stopped — otherwise cancelling its current utterance just
// makes it advance to the next line (it would keep talking after Skip).
let _activeSeqCancel: (() => void) | null = null

const _subs = new Set<() => void>()
function _notify() { _subs.forEach(f => f()) }

function _setSpeaking(v: boolean) {
  if (_speaking === v) return
  _speaking = v
  _notify()
  if (!v) {
    if (_keepalive) { clearInterval(_keepalive); _keepalive = null }
    if (_singleWatch) { clearTimeout(_singleWatch); _singleWatch = null }
    const cbs = [..._onEndCbs]; _onEndCbs = []
    cbs.forEach(cb => cb())
  }
}

function _setBlocked(v: boolean) {
  if (_blocked === v) return
  _blocked = v
  _notify()
}

// ─── Voice loading ─────────────────────────────────────────────────────────────
function _loadVoices() {
  if (typeof window === 'undefined') return
  const v = window.speechSynthesis?.getVoices() ?? []
  if (v.length) _voices = v
}
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  _loadVoices()
  window.speechSynthesis.addEventListener('voiceschanged', _loadVoices)
}

function _pickVoice(): SpeechSynthesisVoice | null {
  _loadVoices()
  if (!_voices.length) return null
  const PREFER = [
    'Google US English', 'Google UK English Female',
    'Samantha', 'Karen', 'Moira', 'Daniel',
    'Microsoft Zira', 'Microsoft David',
  ]
  for (const name of PREFER) {
    const v = _voices.find(v => v.name.includes(name))
    if (v) return v
  }
  return (
    _voices.find(v => v.lang === 'en-US' && v.localService) ??
    _voices.find(v => v.lang === 'en-US') ??
    _voices.find(v => v.lang?.startsWith('en')) ??
    _voices[0] ?? null
  )
}

// ─── Core speak ───────────────────────────────────────────────────────────────
function _doSpeak(text: string, rate: number, pitch: number) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  if (!text?.trim()) return

  // A new single utterance supersedes any running sequence (stop it for real).
  if (_activeSeqCancel) { const c = _activeSeqCancel; _activeSeqCancel = null; c() }

  _lastText  = text
  _lastRate  = rate
  _lastPitch = pitch

  // Cancel any pending scheduled speak
  if (_speakTimer) { clearTimeout(_speakTimer); _speakTimer = null }

  // Cancel current speech
  try { window.speechSynthesis.cancel() } catch {}

  // CRITICAL: wait 100ms after cancel() before speak()
  // Chrome needs this gap — without it, speak() silently fails
  _speakTimer = setTimeout(() => {
    _speakTimer = null

    // Double-check synthesis isn't stuck
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      try { window.speechSynthesis.cancel() } catch {}
      // Wait another 50ms if still stuck
      setTimeout(() => _actuallySpeak(text, rate, pitch), 50)
      return
    }

    _actuallySpeak(text, rate, pitch)
  }, 100)
}

function _actuallySpeak(text: string, rate: number, pitch: number) {
  const u = new SpeechSynthesisUtterance(text)
  u.rate   = rate
  u.pitch  = pitch
  u.volume = 1
  u.lang   = 'en-US'
  const voice = _pickVoice()
  if (voice) u.voice = voice

  u.onstart = () => {
    _setBlocked(false)
    _setSpeaking(true)
    _keepalive = setInterval(() => {
      try {
        if (window.speechSynthesis.paused) window.speechSynthesis.resume()
      } catch {}
    }, 5000)
    // If onend/onerror never arrive, force-clear after a generous ceiling so the
    // invisible SpeakingLock tap-blocker can't stay up over the child forever.
    if (_singleWatch) clearTimeout(_singleWatch)
    _singleWatch = setTimeout(() => _setSpeaking(false), Math.max(6000, text.length * 140))
  }

  u.onend = () => _setSpeaking(false)

  u.onerror = (e) => {
    _setSpeaking(false)
    if (e.error === 'not-allowed') {
      _setBlocked(true)
      return
    }
    if (e.error !== 'canceled' && e.error !== 'interrupted') {
      console.warn('[Milo] Speech error:', e.error)
    }
  }

  try {
    window.speechSynthesis.speak(u)
  } catch (err) {
    console.warn('[Milo] speak() threw:', err)
    _setSpeaking(false)
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function speak(text: string, rate = 0.88, pitch = 1.05) {
  clearPointer()          // a plain line isn't about any specific element
  _doSpeak(text, rate, pitch)
}

/**
 * Speak a line AND point Milo's hand at the element it's about. The pointer shows
 * while the line plays and hides when Milo stops. Pass null to just speak.
 */
export function speakAt(text: string, target: HTMLElement | null, rate = 0.88, pitch = 1.05) {
  _doSpeak(text, rate, pitch)
  pointAt(target)
}

export function speakAfterCurrent(text: string, rate = 0.88, pitch = 1.05) {
  clearPointer()
  if (_speaking) {
    _onEndCbs.push(() => setTimeout(() => _doSpeak(text, rate, pitch), 200))
  } else {
    setTimeout(() => _doSpeak(text, rate, pitch), 100)
  }
}

export function replayLast() {
  if (_lastText) {
    _setBlocked(false)
    _doSpeak(_lastText, _lastRate, _lastPitch)
  }
}

/**
 * Unlock the speech engine from inside a user gesture (a tap/click handler). Mobile browsers
 * (iOS Safari especially) only allow speechSynthesis after the FIRST speak() that runs
 * synchronously within a gesture — a later speak() fired from an effect is silently blocked, which
 * makes a demo fall back to its silent fast-stepping path. Speaking a near-silent token here, in
 * the gesture, unlocks the engine so the demo that mounts next actually narrates aloud. Call it
 * from the intro button's onClick. Cheap and idempotent.
 */
export function unlockSpeech() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  try {
    const u = new SpeechSynthesisUtterance(' ')
    u.volume = 0
    window.speechSynthesis.speak(u)
  } catch {}
}

export function stopSpeech() {
  if (_speakTimer) { clearTimeout(_speakTimer); _speakTimer = null }
  _onEndCbs = []
  clearPointer()
  // Truly stop any running sequence so it can't advance to its next line.
  if (_activeSeqCancel) { const c = _activeSeqCancel; _activeSeqCancel = null; c() }
  _setSpeaking(false)
  try { window.speechSynthesis.cancel() } catch {}
}

export function afterSpeech(cb: () => void) {
  if (_speaking) {
    _onEndCbs.push(cb)
  } else {
    cb()
  }
}

/**
 * Speak a list of phrases strictly one after another — each starts only when the
 * previous one's `end` event fires, so words can never overlap or get cut off
 * (regardless of device speech speed). `onWord(i)` fires when phrase i starts
 * (use it to sync visuals). Returns a cancel function.
 */
export function speakSeq(
  words: string[],
  opts: { onWord?: (i: number) => void; onDone?: () => void; rate?: number; pitch?: number } = {},
): () => void {
  const { onWord, onDone, rate = 0.88, pitch = 1.05 } = opts
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) { onDone?.(); return () => {} }
  clearPointer()   // callers re-point per word via onWord if they want a pointer
  // Supersede any previous sequence cleanly.
  if (_activeSeqCancel) { const c = _activeSeqCancel; _activeSeqCancel = null; c() }
  if (_speakTimer) { clearTimeout(_speakTimer); _speakTimer = null }
  let cancelled = false
  let i = 0
  const cancel = () => {
    if (cancelled) return
    cancelled = true
    if (_activeSeqCancel === cancel) _activeSeqCancel = null
    try { window.speechSynthesis.cancel() } catch {}
    _setSpeaking(false)
  }
  const next = () => {
    if (cancelled) return
    if (i >= words.length) {
      if (_activeSeqCancel === cancel) _activeSeqCancel = null
      _setSpeaking(false); onDone?.(); return
    }
    const idx = i; i++
    const txt = words[idx]
    if (!txt || !txt.trim()) { next(); return }
    // Per-line guard: exactly ONE of {onend, onerror, throw, watchdog} advances.
    let moved = false, started = false
    let watch: ReturnType<typeof setTimeout> | null = null
    const clearWatch = () => { if (watch) { clearTimeout(watch); watch = null } }
    const advance = () => { if (moved || cancelled) return; moved = true; clearWatch(); next() }
    const u = new SpeechSynthesisUtterance(txt)
    u.rate = rate; u.pitch = pitch; u.volume = 1; u.lang = 'en-US'
    const v = _pickVoice(); if (v) u.voice = v
    u.onstart = () => {
      started = true; _setSpeaking(true); try { onWord?.(idx) } catch {}
      // It started — guard against an end event that never arrives.
      clearWatch(); watch = setTimeout(advance, Math.max(5000, txt.length * 140))
    }
    u.onend   = advance
    u.onerror = advance
    try { window.speechSynthesis.speak(u) } catch { advance(); return }
    // If speech never even STARTS (iOS/Safari can silently drop speak() with no
    // onstart/onend/onerror), advance anyway so the lesson can never hang on a
    // frozen, silent slide. This is the safety net for older speakSeq-only steps.
    watch = setTimeout(() => { if (!started) advance() }, 2200)
  }
  _activeSeqCancel = cancel
  try { window.speechSynthesis.cancel() } catch {}
  _speakTimer = setTimeout(() => { _speakTimer = null; if (!cancelled) next() }, 120)
  return cancel
}

/**
 * speakSeq + a "did speech actually start?" fallback — the right way to narrate a multi-line
 * demo/explanation.
 *
 * `lines` play strictly one-after-another (speakSeq, so they can NEVER overlap or clip each
 * other — a fixed-timer speak() clips a slow/long line). `onStep(i)` reveals the visual for
 * line i: driven by the real speech `onstart` when audio works (so visuals stay in sync), OR
 * by fixed timers if speech never starts within ~1.9s (blocked autoplay / no voices) so the
 * demo still plays its visuals silently. `onDone` fires exactly once, after the last line (or
 * the silent fallback) finishes. Returns a cancel fn (call it from the effect cleanup).
 */
export function speakSteps(
  lines: string[],
  opts: { onStep?: (i: number) => void; onDone?: () => void; fallbackStepMs?: number; rate?: number; pitch?: number } = {},
): () => void {
  const { onStep, onDone, fallbackStepMs = 1400, rate, pitch } = opts
  let started = false, doneOnce = false
  const timers: Array<ReturnType<typeof setTimeout>> = []
  const finish = () => { if (doneOnce) return; doneOnce = true; onDone?.() }
  const cancelSeq = speakSeq(lines, {
    onWord: (i) => { started = true; try { onStep?.(i) } catch {} },
    // CRITICAL: only finish via speakSeq if speech ACTUALLY started. When audio is blocked, each
    // utterance fires onerror (not onstart); speakSeq advances on onerror, so it races through every
    // line in milliseconds and its onDone fires almost instantly — flashing the explanation past with
    // no voice. Gating on `started` makes that blocked/raced case fall through to the deliberate
    // timer-fallback below instead (which paces the reveals + finishes), so a silent demo plays at a
    // watchable speed rather than vanishing. A truly spoken run sets `started` and finishes normally.
    onDone: () => { if (started) finish() },
    rate, pitch,
  })
  // The fallback exists ONLY for the silent case (blocked autoplay / no voices). It must not
  // pre-empt a real voice that's just slow to start, so:
  //  - the grace window is generous (a real first utterance can take >2s to start right after
  //    the tap that unlocks audio), and
  //  - EVERY fallback step (and the early finish) bails the instant real speech starts, so a
  //    late-arriving voice takes over cleanly instead of the two racing each other.
  // It also steps slowly so a genuinely silent demo is watchable, not a flash. `started` flips
  // on the FIRST utterance's onstart, so a single redundant onStep(0) is the worst overlap.
  const fb = setTimeout(() => {
    if (started) return
    let t = 0
    lines.forEach((_, i) => {
      timers.push(setTimeout(() => { if (started) return; try { onStep?.(i) } catch {} }, t))
      t += fallbackStepMs
    })
    timers.push(setTimeout(() => { if (started) return; finish() }, t + 600))
  }, 2800)
  return () => { cancelSeq(); clearTimeout(fb); timers.forEach(clearTimeout) }
}

export function useIsSpeaking(): boolean {
  return useSyncExternalStore(
    (cb) => { _subs.add(cb); return () => _subs.delete(cb) },
    () => _speaking,
    () => false,
  )
}

export function useIsBlocked(): boolean {
  return useSyncExternalStore(
    (cb) => { _subs.add(cb); return () => _subs.delete(cb) },
    () => _blocked,
    () => false,
  )
}

export function useMiloSpeaker(opts?: { rate?: number; pitch?: number }) {
  const rate  = opts?.rate  ?? 0.88
  const pitch = opts?.pitch ?? 1.05

  const speakFn = useCallback((text: string) => {
    speak(text, rate, pitch)
  }, [rate, pitch])

  const stop = useCallback(() => stopSpeech(), [])

  return { speak: speakFn, stop }
}