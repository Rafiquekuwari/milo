'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthCallbackPage() {
  const router = useRouter()
  const ran    = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    const supabase = createClient()

    async function handleCallback() {
      // Try existing session first
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        router.replace('/parent')
        return
      }

      // Wait for OAuth exchange
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, session) => {
          if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
            subscription.unsubscribe()
            router.replace('/parent')
          }
        }
      )

      // 5s fallback
      window.setTimeout(async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          router.replace('/parent')
        } else {
          router.replace('/auth')
        }
      }, 5000)
    }

    handleCallback()
  }, [router])

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(180deg, #FFF4D6 0%, #FCEAB6 100%)',
      gap: 16,
    }}>
      <img
        src="/assets/characters/milo-happy.png"
        alt="Milo"
        style={{ width: 80, height: 80, objectFit: 'contain', animation: 'bounce 1s ease-in-out infinite' }}
      />
      <p style={{ fontSize: 16, fontWeight: 600, color: '#888' }}>Signing you in...</p>
      <style>{`@keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }`}</style>
    </div>
  )
}