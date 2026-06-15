'use client'

import React, { useEffect, useState, useCallback, useRef } from 'react'
import { syncSession } from './supabase/queries'
import type { SessionPayload } from './supabase/queries'

const QUEUE_KEY = 'milo_offline_queue'

// ─── Queue helpers ────────────────────────────────────────────

export function enqueueSession(payload: SessionPayload) {
  try {
    const q: SessionPayload[] = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]')
    if (!q.find(p => p.clientId === payload.clientId)) {
      q.push(payload)
      localStorage.setItem(QUEUE_KEY, JSON.stringify(q))
    }
  } catch {}
}

export function getQueuedSessions(): SessionPayload[] {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]') } catch { return [] }
}

// App-wide lock: the banner, the hook, and chapter-sync all call flushQueue;
// this guarantees only ONE flush runs at a time across the whole app, so the
// same queued items aren't processed concurrently (which multiplied the errors).
let _flushing = false

export async function flushQueue(): Promise<number> {
  if (_flushing || !navigator.onLine) return 0
  _flushing = true
  try {
    const q = getQueuedSessions()
    if (q.length === 0) return 0
    let flushed = 0
    const remaining: SessionPayload[] = []
    for (const payload of q) {
      try {
        const ok = await syncSession(payload)
        if (ok) flushed++
        else remaining.push(payload)
      } catch { remaining.push(payload) }
    }
    if (remaining.length === 0) localStorage.removeItem(QUEUE_KEY)
    else localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining))
    return flushed
  } finally {
    _flushing = false
  }
}

// ─── Hook ─────────────────────────────────────────────────────

export function useOfflineSync() {
  // null = not yet determined (SSR safe)
  const [isOnline,     setIsOnline]     = useState<boolean | null>(null)
  const [pendingCount, setPendingCount] = useState(0)
  const [syncing,      setSyncing]      = useState(false)
  const syncingRef = useRef(false)

  const updatePendingCount = useCallback(() => {
    setPendingCount(getQueuedSessions().length)
  }, [])

  const doFlush = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return
    syncingRef.current = true
    setSyncing(true)
    try {
      const flushed = await flushQueue()
      if (flushed > 0) console.log(`[Milo] Synced ${flushed} queued sessions`)
    } finally {
      syncingRef.current = false
      setSyncing(false)
      updatePendingCount()
    }
  }, [updatePendingCount])

  useEffect(() => {
    // Set real value on mount
    setIsOnline(navigator.onLine)
    updatePendingCount()

    function onOnline()  { setIsOnline(true);  doFlush() }
    function onOffline() { setIsOnline(false); updatePendingCount() }

    window.addEventListener('online',  onOnline)
    window.addEventListener('offline', onOffline)

    function onSwMessage(event: MessageEvent) {
      if (event.data?.type === 'ONLINE')  { setIsOnline(true);  doFlush() }
      if (event.data?.type === 'OFFLINE') { setIsOnline(false) }
    }
    navigator.serviceWorker?.addEventListener('message', onSwMessage)

    if (navigator.onLine) doFlush()

    const interval = window.setInterval(() => {
      if (!navigator.onLine) {
        navigator.serviceWorker?.controller?.postMessage({ type: 'CHECK_ONLINE' })
      }
    }, 30000)

    return () => {
      window.removeEventListener('online',  onOnline)
      window.removeEventListener('offline', onOffline)
      navigator.serviceWorker?.removeEventListener('message', onSwMessage)
      window.clearInterval(interval)
    }
  }, [doFlush, updatePendingCount])

  return { isOnline: isOnline ?? true, pendingCount, syncing, flush: doFlush }
}

// ─── Offline Banner ───────────────────────────────────────────

export function OfflineBanner(): React.ReactElement | null {
  const [isOnline,     setIsOnline]     = useState<boolean | null>(null)
  const [pendingCount, setPendingCount] = useState(0)
  const [syncing,      setSyncing]      = useState(false)
  const syncingRef = useRef(false)

  const updateCount = useCallback(() => {
    setPendingCount(getQueuedSessions().length)
  }, [])

  const doFlush = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return
    syncingRef.current = true
    setSyncing(true)
    try { await flushQueue() }
    finally { syncingRef.current = false; setSyncing(false); updateCount() }
  }, [updateCount])

  useEffect(() => {
    setIsOnline(navigator.onLine)
    updateCount()

    const onOnline  = () => { setIsOnline(true);  doFlush() }
    const onOffline = () => { setIsOnline(false); updateCount() }

    window.addEventListener('online',  onOnline)
    window.addEventListener('offline', onOffline)

    const onMsg = (e: MessageEvent) => {
      if (e.data?.type === 'ONLINE')  { setIsOnline(true);  doFlush() }
      if (e.data?.type === 'OFFLINE') setIsOnline(false)
    }
    navigator.serviceWorker?.addEventListener('message', onMsg)

    if (navigator.onLine) doFlush()

    return () => {
      window.removeEventListener('online',  onOnline)
      window.removeEventListener('offline', onOffline)
      navigator.serviceWorker?.removeEventListener('message', onMsg)
    }
  }, [doFlush, updateCount])

  // Don't render until we know the real online status
  if (isOnline === null) return null
  // Online with nothing pending — hide
  if (isOnline && pendingCount === 0 && !syncing) return null

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
      padding: '12px 20px',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      fontSize: 14, fontWeight: 600, color: '#fff',
      background: !isOnline ? '#1f2937' : syncing ? '#166534' : '#92400e',
      transition: 'background 0.3s ease',
    }}>
      {!isOnline ? (
        <>
          <span>📡</span>
          <span>
            You're offline
            {pendingCount > 0
              ? ` — ${pendingCount} session${pendingCount !== 1 ? 's' : ''} will sync when reconnected`
              : ' — progress saves when reconnected'}
          </span>
        </>
      ) : (
        <>
          <span>{syncing ? '🔄' : '⏳'}</span>
          <span>
            {syncing
              ? 'Syncing your progress...'
              : `${pendingCount} session${pendingCount !== 1 ? 's' : ''} waiting to sync…`}
          </span>
        </>
      )}
    </div>
  )
}