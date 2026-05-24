'use client'
/**
 * Toast — lightweight network error notifications
 * Usage: import { toast } from '@/components/ui/Toast'
 *        toast.error('Failed to save')
 *        toast.success('Saved!')
 */
import React, { useEffect, useState } from 'react'

interface ToastItem { id: number; msg: string; type: 'error' | 'success' | 'info' }

let _setToasts: React.Dispatch<React.SetStateAction<ToastItem[]>> | null = null
let _id = 0

export const toast = {
  error:   (msg: string) => _add(msg, 'error'),
  success: (msg: string) => _add(msg, 'success'),
  info:    (msg: string) => _add(msg, 'info'),
}

function _add(msg: string, type: ToastItem['type']) {
  if (!_setToasts) return
  const id = ++_id
  _setToasts(prev => [...prev, { id, msg, type }])
  window.setTimeout(() => {
    _setToasts!(prev => prev.filter(t => t.id !== id))
  }, 3500)
}

export function ToastProvider() {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  _setToasts = setToasts

  if (toasts.length === 0) return null

  return (
    <div style={{
      position: 'fixed', bottom: 80, left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9998, display: 'flex', flexDirection: 'column',
      alignItems: 'center', gap: 8, pointerEvents: 'none',
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: t.type === 'error' ? '#DC2626' : t.type === 'success' ? '#16a34a' : '#1f2937',
          color: '#fff', borderRadius: 50,
          padding: '12px 24px', fontSize: 14, fontWeight: 700,
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          whiteSpace: 'nowrap',
          animation: 'toastIn 0.3s cubic-bezier(.34,1.56,.64,1)',
        }}>
          {t.type === 'error' ? '❌ ' : t.type === 'success' ? '✅ ' : 'ℹ️ '}{t.msg}
        </div>
      ))}
      <style>{`@keyframes toastIn { from { transform: translateY(20px); opacity:0 } to { transform: translateY(0); opacity:1 } }`}</style>
    </div>
  )
}
