'use client'
import { useEffect, useState } from 'react'
import { useMiloStore } from '@/lib/store'
import { kv } from '@/lib/kv'

/**
 * Holds the app behind a splash until the IndexedDB-backed kv store has hydrated
 * its in-memory cache, then rehydrates the Zustand profile store. This is what
 * lets the rest of the app keep reading local state synchronously (kv is async).
 * Mounted once in the root layout, so it runs per full page load, not per route.
 */
export default function StorageGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    kv.ready().then(async () => {
      await useMiloStore.persist.rehydrate()
      if (!cancelled) setReady(true)
    })
    return () => { cancelled = true }
  }, [])

  if (!ready) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FCEAB6', fontSize: 48 }}>
        🦊
      </div>
    )
  }
  return <>{children}</>
}
