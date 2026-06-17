'use client'
/**
 * analytics — lightweight, local-first product-event logging.
 *
 * `track(event, props)` records a funnel/engagement event for the ACTIVE learner.
 * Events buffer in kv (offline-safe) and flush to Supabase `learner_events`,
 * deduped by client_id. Fully best-effort: never throws, no-ops when there is no
 * active learner or no network. Day-level retention is derived from the existing
 * `sessions` table — these events add the funnel (opens vs completes, skips).
 *
 * Read it all on the founder dashboard at /insights.
 */
import { kv } from './kv'
import { getActiveLearner } from './supabase/useLearnerSession'
import { createClient } from './supabase/client'

const QUEUE_KEY = 'milo_events_queue'
const MAX_QUEUE = 500   // cap so a persistently-failing flush can't grow unbounded

export interface LearnerEvent {
  learner_id: string
  event: string
  props: Record<string, unknown>
  client_id: string
  client_ts: string
}

function randomId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

function readQueue(): LearnerEvent[] {
  try { return JSON.parse(kv.get(QUEUE_KEY) ?? '[]') } catch { return [] }
}
function writeQueue(q: LearnerEvent[]): void {
  try { kv.set(QUEUE_KEY, JSON.stringify(q.slice(-MAX_QUEUE))) } catch {}
}

let _flushing = false
export async function flushEvents(): Promise<number> {
  if (_flushing || typeof navigator === 'undefined' || !navigator.onLine) return 0
  const q = readQueue()
  if (q.length === 0) return 0
  _flushing = true
  try {
    // Untyped client: the generated Database types don't include learner_events
    // yet (same pattern as queries.ts `db(): any`).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as any
    // upsert with ignoreDuplicates so retries can't double-insert (client_id is unique)
    const { error } = await supabase
      .from('learner_events')
      .upsert(q, { onConflict: 'client_id', ignoreDuplicates: true })
    if (error) return 0          // keep queued; try again later
    kv.remove(QUEUE_KEY)
    return q.length
  } catch {
    return 0                     // transient — keep queued
  } finally {
    _flushing = false
  }
}

/** Record a product event for the active learner. Best-effort; never throws. */
export function track(event: string, props: Record<string, unknown> = {}): void {
  try {
    const learner = getActiveLearner()
    if (!learner) return
    const q = readQueue()
    q.push({ learner_id: learner.id, event, props, client_id: randomId(), client_ts: new Date().toISOString() })
    writeQueue(q)
    void flushEvents()
  } catch { /* analytics must never break the app */ }
}

// Self-contained flushing: retry when the tab regains connectivity, and on a
// gentle interval, without needing a provider wired into the tree.
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { void flushEvents() })
  window.setInterval(() => { void flushEvents() }, 60_000)
}
