'use client'
/**
 * kv — local key/value store backed by IndexedDB.
 *
 * The app is local-first and reads its profile synchronously (e.g. loadLearner
 * swaps learners instantly), but IndexedDB is async-only. So at boot we hydrate
 * an in-memory Map from IndexedDB once, then serve reads synchronously from the
 * Map and persist writes to IndexedDB asynchronously (non-blocking, large quota).
 *
 * Callers must await `kv.ready()` before the first read — StorageGate gates the
 * UI on it, and the Zustand store rehydrates after it. SSR and browsers without
 * IndexedDB fall back to localStorage so behaviour degrades gracefully.
 *
 * NOT moved here on purpose: Supabase auth (`milo-auth`, managed by supabase-js
 * in localStorage) and the active learner (`milo_active_learner`, sessionStorage
 * by design — per-tab, cleared on sign-out).
 */

const DB_NAME = 'milo'
const STORE = 'kv'
const MIGRATED_FLAG = 'milo-kv-migrated'
// Gameplay keys to lift out of localStorage on first run so existing players
// (especially anything queued offline) don't lose local state.
const MIGRATE_PREFIXES = ['milo-profile', 'milo-last-played', 'milo_offline_queue']

let mem = new Map<string, string>()
let useFallback = false
let resolveReady: () => void
const readyPromise = new Promise<void>((r) => { resolveReady = r })

let dbPromise: Promise<IDBDatabase> | null = null
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}
function db(): Promise<IDBDatabase> { return (dbPromise ??= openDB()) }

function idbWrite(mode: 'put' | 'delete', key: string, value?: string): Promise<void> {
  return db().then(d => new Promise<void>((resolve, reject) => {
    const tx = d.transaction(STORE, 'readwrite')
    const os = tx.objectStore(STORE)
    if (mode === 'put') os.put(value, key); else os.delete(key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  }))
}

function safeLS<T>(fn: () => T, fallback: T): T {
  try { return fn() } catch { return fallback }
}

async function hydrate(): Promise<void> {
  if (typeof indexedDB === 'undefined') { useFallback = true; resolveReady(); return }
  try {
    const d = await db()
    const entries = await new Promise<[string, string][]>((resolve, reject) => {
      const out: [string, string][] = []
      const cur = d.transaction(STORE, 'readonly').objectStore(STORE).openCursor()
      cur.onsuccess = () => {
        const c = cur.result
        if (c) { out.push([String(c.key), c.value as string]); c.continue() } else resolve(out)
      }
      cur.onerror = () => reject(cur.error)
    })
    mem = new Map(entries)

    // One-time migration of existing localStorage gameplay data.
    if (!safeLS(() => localStorage.getItem(MIGRATED_FLAG), '1')) {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (!k || mem.has(k)) continue
        if (!MIGRATE_PREFIXES.some(p => k.startsWith(p))) continue
        const v = localStorage.getItem(k)
        if (v != null) { mem.set(k, v); idbWrite('put', k, v).catch(() => {}) }
      }
      safeLS(() => localStorage.setItem(MIGRATED_FLAG, '1'), undefined)
    }
  } catch {
    useFallback = true
  }
  resolveReady()
}

if (typeof window !== 'undefined') hydrate()

export const kv = {
  /** Resolves once the in-memory cache has hydrated from IndexedDB. */
  ready: (): Promise<void> => readyPromise,

  get(key: string): string | null {
    if (useFallback) return safeLS(() => localStorage.getItem(key), null)
    return mem.has(key) ? mem.get(key)! : null
  },

  set(key: string, value: string): void {
    if (useFallback) { safeLS(() => localStorage.setItem(key, value), undefined); return }
    mem.set(key, value)
    idbWrite('put', key, value).catch(() => {})
  },

  remove(key: string): void {
    if (useFallback) { safeLS(() => localStorage.removeItem(key), undefined); return }
    mem.delete(key)
    idbWrite('delete', key).catch(() => {})
  },
}
