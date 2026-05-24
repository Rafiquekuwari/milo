'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Mode = 'login' | 'signup'

export default function AuthPage() {
  const [mode,     setMode]     = useState<Mode>('login')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [success,  setSuccess]  = useState<string | null>(null)

  function reset() { setError(null); setSuccess(null) }

  async function handleEmailAuth() {
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true); reset()
    const supabase = createClient()

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) {
        setError(error.message)
      } else {
        setSuccess('Check your email for a confirmation link!')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (error) {
        setError(
          error.message.includes('Invalid login')
            ? 'Incorrect email or password'
            : error.message
        )
      }
      // On success Supabase triggers onAuthStateChange → callback page handles redirect
    }
    setLoading(false)
  }

  async function signInWithGoogle() {
    setLoading(true); reset()
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    })
    if (error) { setError(error.message); setLoading(false) }
  }

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(180deg, #FFF4D6 0%, #FCEAB6 100%)',
      padding: 24, gap: 28,
    }}>
      {/* Logo */}
      <div style={{ textAlign: 'center' }}>
        <img
          src="/assets/characters/milo-happy.png"
          alt="Milo"
          style={{ width: 90, height: 90, objectFit: 'contain', marginBottom: 8 }}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
        <h1 style={{
          fontSize: 30, fontWeight: 800,
          color: '#F26B2C', margin: 0,
          fontFamily: 'var(--font-display)',
        }}>Milo Story Mode</h1>
        <p style={{ fontSize: 15, color: '#888', margin: '6px 0 0', fontWeight: 500 }}>
          Learning adventures for little ones
        </p>
      </div>

      {/* Card */}
      <div style={{
        background: '#fff', borderRadius: 24,
        padding: '28px 24px',
        width: '100%', maxWidth: 380,
        boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
        display: 'flex', flexDirection: 'column', gap: 16,
        border: '3px solid var(--outline)',
      }}>

        {/* Mode toggle */}
        <div style={{
          display: 'flex', background: '#f3f4f6',
          borderRadius: 12, padding: 4, gap: 4,
        }}>
          {(['login', 'signup'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); reset() }}
              style={{
                flex: 1, padding: '9px',
                borderRadius: 9, border: 'none',
                fontSize: 14, fontWeight: 700, cursor: 'pointer',
                background: mode === m ? '#fff' : 'transparent',
                color: mode === m ? '#F26B2C' : '#888',
                boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {m === 'login' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>

        {/* Error / Success messages */}
        {error && (
          <div style={{
            background: '#FEF2F2', border: '1.5px solid #FCA5A5',
            borderRadius: 12, padding: '10px 14px',
            fontSize: 13, color: '#991B1B', fontWeight: 600,
          }}>❌ {error}</div>
        )}
        {success && (
          <div style={{
            background: '#F0FDF4', border: '1.5px solid #86EFAC',
            borderRadius: 12, padding: '10px 14px',
            fontSize: 13, color: '#166534', fontWeight: 600,
          }}>✅ {success}</div>
        )}

        {/* Email input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>
            Email address
          </label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => { setEmail(e.target.value); reset() }}
            onKeyDown={e => e.key === 'Enter' && handleEmailAuth()}
            autoComplete="email"
            style={{
              padding: '12px 14px', fontSize: 15,
              border: '2px solid #e5e7eb', borderRadius: 12,
              outline: 'none', width: '100%', boxSizing: 'border-box',
              fontWeight: 500,
              transition: 'border-color 0.15s',
            }}
            onFocus={e => { e.target.style.borderColor = '#F26B2C' }}
            onBlur={e => { e.target.style.borderColor = '#e5e7eb' }}
          />
        </div>

        {/* Password input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>
            Password
          </label>
          <input
            type="password"
            placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'}
            value={password}
            onChange={e => { setPassword(e.target.value); reset() }}
            onKeyDown={e => e.key === 'Enter' && handleEmailAuth()}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            style={{
              padding: '12px 14px', fontSize: 15,
              border: '2px solid #e5e7eb', borderRadius: 12,
              outline: 'none', width: '100%', boxSizing: 'border-box',
              fontWeight: 500,
              transition: 'border-color 0.15s',
            }}
            onFocus={e => { e.target.style.borderColor = '#F26B2C' }}
            onBlur={e => { e.target.style.borderColor = '#e5e7eb' }}
          />
        </div>

        {/* Email auth button */}
        <button
          onClick={handleEmailAuth}
          disabled={loading}
          style={{
            width: '100%', padding: '14px',
            background: loading
              ? '#e5e7eb'
              : 'linear-gradient(135deg, #F26B2C 0%, #e05a1f 100%)',
            color: loading ? '#9ca3af' : '#fff',
            border: 'none', borderRadius: 50,
            fontSize: 16, fontWeight: 800,
            cursor: loading ? 'wait' : 'pointer',
            boxShadow: loading ? 'none' : '0 4px 16px rgba(242,107,44,0.3)',
            transition: 'all 0.2s',
          }}
        >
          {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>

        {/* Divider */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          color: '#9ca3af', fontSize: 13,
        }}>
          <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
          or
          <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
        </div>

        {/* Google button */}
        <button
          onClick={signInWithGoogle}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 10, width: '100%', padding: '13px 20px',
            background: '#fff', border: '2px solid #e5e7eb',
            borderRadius: 50, cursor: loading ? 'wait' : 'pointer',
            fontSize: 15, fontWeight: 700, color: '#1f2937',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#d1d5db' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af', margin: 0 }}>
          Your child's progress is saved securely to your account
        </p>
      </div>
    </div>
  )
}