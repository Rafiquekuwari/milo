'use client'

/**
 * PWAInstallBanner
 * 
 * Shows an "Add to Home Screen" prompt when:
 * - Chrome on Android: uses the native beforeinstallprompt event
 * - Safari on iOS: shows manual instructions (iOS doesn't support the API)
 * - Already installed or dismissed: hidden forever (localStorage)
 *
 * WHY THIS MATTERS FOR MILO:
 * Once installed as a PWA, Chrome grants autoplay permanently —
 * no more "tap to hear Milo" workarounds needed at all.
 */

import { useEffect, useState } from 'react'

type Platform = 'android' | 'ios' | null

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PWAInstallBanner() {
  const [platform, setPlatform]       = useState<Platform>(null)
  const [deferredPrompt, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible]         = useState(false)

  useEffect(() => {
    // Don't show if already installed or previously dismissed
    if (localStorage.getItem('milo-pwa-dismissed')) return
    if (window.matchMedia('(display-mode: fullscreen)').matches) return
    if (window.matchMedia('(display-mode: standalone)').matches) return

    const ua = navigator.userAgent

    // iOS Safari — no beforeinstallprompt, show manual instructions
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as {MSStream?: unknown}).MSStream
    const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua)
    if (isIOS && isSafari) {
      // Delay so page renders first
      setTimeout(() => { setPlatform('ios'); setVisible(true) }, 2000)
      return
    }

    // Android Chrome — use native prompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      setPlatform('android')
      setTimeout(() => setVisible(true), 2000)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function dismiss() {
    localStorage.setItem('milo-pwa-dismissed', '1')
    setVisible(false)
  }

  async function install() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      localStorage.setItem('milo-pwa-dismissed', '1')
    }
    setVisible(false)
    setDeferred(null)
  }

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      zIndex: 9999,
      background: 'linear-gradient(135deg, #F26B2C 0%, #e05a1f 100%)',
      color: '#fff',
      padding: '16px 20px 24px',
      borderRadius: '20px 20px 0 0',
      boxShadow: '0 -4px 24px rgba(0,0,0,0.2)',
      animation: 'slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
    }}>
      {/* Close button */}
      <button
        onClick={dismiss}
        style={{
          position: 'absolute', top: 12, right: 16,
          background: 'rgba(255,255,255,0.2)', border: 'none',
          borderRadius: '50%', width: 28, height: 28,
          color: '#fff', fontSize: 16, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >×</button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
        {/* Milo icon */}
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: '#FCEAB6',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 30, flexShrink: 0,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}>🦊</div>

        <div>
          <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 2 }}>
            Add Milo to Home Screen!
          </div>
          <div style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.4 }}>
            {platform === 'ios'
              ? 'Play offline & hear Milo\'s voice without tapping first'
              : 'Install for the best experience — works offline too!'}
          </div>
        </div>
      </div>

      {platform === 'android' && (
        <button
          onClick={install}
          style={{
            width: '100%', padding: '14px',
            background: '#fff', color: '#F26B2C',
            border: 'none', borderRadius: 50,
            fontSize: 16, fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          📲 Install App
        </button>
      )}

      {platform === 'ios' && (
        <div style={{
          background: 'rgba(255,255,255,0.15)',
          borderRadius: 14, padding: '12px 16px',
          fontSize: 14, lineHeight: 1.8,
        }}>
          <div>1. Tap the <strong>Share</strong> button <span style={{fontSize:18}}>⬆</span> in Safari</div>
          <div>2. Scroll down and tap <strong>"Add to Home Screen"</strong></div>
          <div>3. Tap <strong>"Add"</strong> — done! 🎉</div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  )
}
