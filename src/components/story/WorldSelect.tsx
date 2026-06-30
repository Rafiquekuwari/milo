'use client'
/**
 * WorldSelect — a reusable "pick a world" screen. The child chooses which storytelling
 * to play instead of it being chosen for them, so they have agency over where the
 * chapter goes. Each card previews a world's background + emoji + name. Generic over any
 * chapter: pass the list of `worlds` and an `onPick(id)`. Used by the Counting chapter
 * (Nature/Farm/Space) and the Number-Order chapter (River/Train/Sky).
 */
import React from 'react'
import { speak, unlockSpeech } from '@/lib/useMiloSpeaker'

export interface PickWorld { id: string; label: string; emoji: string; bgImage?: string }

export default function WorldSelect({ title = 'Where shall we go today?', worlds, onPick, onExit }: {
  title?: string
  worlds: PickWorld[]
  onPick: (id: string) => void
  onExit?: () => void
}) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'clamp(14px,3vh,28px)', padding: '4vh 4vw', background: 'linear-gradient(180deg,#bfe6f7 0%,#d9f0e6 60%,#cdeccf 100%)' }}>
      {onExit && (
        <button onClick={onExit} style={{ position: 'absolute', top: 14, left: 16, padding: '7px 14px', borderRadius: 50, background: 'var(--paper)', border: '3px solid var(--milo-orange)', color: 'var(--milo-orange)', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>← Menu</button>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <img src="/assets/characters/milo_explorer.png" alt="" draggable={false} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
          style={{ width: 'clamp(48px,8vh,76px)', height: 'clamp(48px,8vh,76px)', objectFit: 'contain' }} />
        <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(22px,4.4vh,38px)', color: 'var(--ink)' }}>{title}</h1>
      </div>

      <div style={{ display: 'flex', gap: 'clamp(14px,3vw,34px)', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'stretch' }}>
        {worlds.map(world => (
          <button key={world.id}
            onClick={() => { unlockSpeech(); speak(world.label); onPick(world.id) }}
            style={{ width: 'clamp(200px,26vw,300px)', borderRadius: 24, overflow: 'hidden', cursor: 'pointer', padding: 0,
              border: '5px solid var(--paper)', background: 'var(--paper)', boxShadow: '0 8px 0 rgba(61,37,22,.18)',
              transition: 'transform .18s ease, box-shadow .18s ease' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = '0 12px 0 rgba(61,37,22,.18)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 8px 0 rgba(61,37,22,.18)' }}>
            <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 10', background: '#cfe8df' }}>
              {world.bgImage && <img src={world.bgImage} alt="" draggable={false} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
              <span style={{ position: 'absolute', top: 8, right: 10, fontSize: 'clamp(28px,5vh,44px)', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.35))' }}>{world.emoji}</span>
            </div>
            <div style={{ padding: '12px 10px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(16px,2.6vh,22px)', color: 'var(--milo-orange)', textAlign: 'center' }}>{world.label.replace(/^Milo's /, '')}</span>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 'clamp(11px,1.7vh,14px)', color: 'var(--ink-soft)' }}>Tap to explore ▶</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
