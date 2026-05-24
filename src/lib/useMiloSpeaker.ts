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

const _subs = new Set<() => void>()
function _notify() { _subs.forEach(f => f()) }

function _setSpeaking(v: boolean) {
  if (_speaking === v) return
  _speaking = v
  _notify()
  if (!v) {
    if (_keepalive) { clearInterval(_keepalive); _keepalive = null }
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
  _doSpeak(text, rate, pitch)
}

export function speakAfterCurrent(text: string, rate = 0.88, pitch = 1.05) {
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

export function stopSpeech() {
  if (_speakTimer) { clearTimeout(_speakTimer); _speakTimer = null }
  _onEndCbs = []
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