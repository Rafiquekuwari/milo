/**
 * Question variety — keep a practice session from asking the same question twice.
 *
 * Most chapters generate each round by randomising values (e.g. `makeRound(d)`),
 * so the same question CAN come up again within a session, which reads as
 * "boring repetition". `makeDistinct` re-rolls the generator a few times to
 * avoid a question whose signature has already been seen this session.
 *
 * Usage (inside a practice loop):
 *   const seen = useRef<Set<string>>(new Set())
 *   const r = makeDistinct(() => makeRound(ada.difficulty), seen.current)
 *
 * It degrades gracefully: if the generator is deterministic (e.g. a fixed pool
 * keyed by round) the re-roll returns the same item, no signature is duplicated,
 * and nothing changes. If every re-roll collides (a tiny value space), it gives
 * up after `maxTries` and returns the last item rather than looping forever.
 */

/** Stable-ish signature of a generated question; good enough to spot a repeat. */
export function questionSig(item: unknown): string {
  try {
    // Drop functions/undefined so JSX-carrying data still serialises.
    return JSON.stringify(item, (_k, v) => (typeof v === 'function' ? undefined : v))
  } catch {
    return String(item)
  }
}

export function makeDistinct<T>(
  make: () => T,
  seen: Set<string>,
  sig: (item: T) => string = questionSig,
  maxTries = 12,
): T {
  let item = make()
  let tries = 0
  while (seen.has(sig(item)) && tries < maxTries) {
    item = make()
    tries++
  }
  seen.add(sig(item))
  return item
}
