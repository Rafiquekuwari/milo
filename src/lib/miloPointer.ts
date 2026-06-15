'use client'
/**
 * miloPointer — a tiny singleton that tracks the on-screen element Milo's voice
 * is currently talking about, so a bouncing-hand pointer can point at it.
 *
 * Decoupled from the speaker so there's no import cycle. Pair it with speech:
 *   speakAt('Put 3 apples in the basket!', basketEl)   // see useMiloSpeaker
 * or drive it directly during animations:
 *   pointAt(currentCellEl)   // …each beat
 *   clearPointer()           // when done
 */

import { useSyncExternalStore } from 'react'

let _target: HTMLElement | null = null
const _subs = new Set<() => void>()
function _notify() { _subs.forEach(f => f()) }

export function pointAt(el: HTMLElement | null) {
  _target = el
  _notify()
}

export function clearPointer() {
  if (_target !== null) { _target = null; _notify() }
}

export function usePointerTarget(): HTMLElement | null {
  return useSyncExternalStore(
    (cb) => { _subs.add(cb); return () => _subs.delete(cb) },
    () => _target,
    () => null,
  )
}
