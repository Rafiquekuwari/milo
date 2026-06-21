'use client'
/**
 * Hand-built SVG art for Story Mode — scenery backdrops + illustrated objects.
 * Zero dependencies, tiny, scales crisply, and animates with CSS. A big step up
 * from emoji while the premium Rive/Lottie pipeline is sorted. See docs/story-mode-3-5.md.
 */
import React, { useState } from 'react'

// ─── Full-bleed scene backdrops ────────────────────────────────
export type BackdropKind = 'meadow' | 'dusk' | 'stream' | 'orchard'

export function Backdrop({ kind }: { kind: BackdropKind }) {
  return (
    <svg viewBox="0 0 400 320" preserveAspectRatio="xMidYMax slice" aria-hidden
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0 }}>
      <defs>
        <linearGradient id={`sky-${kind}`} x1="0" y1="0" x2="0" y2="1">
          {kind === 'dusk'
            ? (<><stop offset="0" stopColor="#5b4b86" /><stop offset="0.6" stopColor="#9d8bc4" /><stop offset="1" stopColor="#e7ddf2" /></>)
            : (<><stop offset="0" stopColor="#bfe6f7" /><stop offset="0.7" stopColor="#dff1ec" /><stop offset="1" stopColor="#eef8e6" /></>)}
        </linearGradient>
        <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#fff7d6" /><stop offset="1" stopColor="#fff7d6" stopOpacity="0" /></radialGradient>
      </defs>

      <rect x="0" y="0" width="400" height="320" fill={`url(#sky-${kind})`} />

      {/* sun / moon + sky decor */}
      {kind === 'dusk' ? (
        <>
          <circle cx="320" cy="60" r="26" fill="#fdf6e3" />
          <circle cx="312" cy="54" r="22" fill={`url(#sky-${kind})`} opacity="0.9" />
          {[[40, 40], [90, 70], [150, 35], [220, 55], [280, 30], [360, 95], [120, 100]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={i % 2 ? 2 : 2.6} fill="#fff" opacity="0.9" />
          ))}
        </>
      ) : (
        <>
          <circle cx="328" cy="58" r="30" fill="#ffe9a8" />
          <circle cx="328" cy="58" r="46" fill="url(#glow)" />
          <ellipse cx="90" cy="64" rx="34" ry="16" fill="#ffffff" opacity="0.85" />
          <ellipse cx="120" cy="60" rx="26" ry="14" fill="#ffffff" opacity="0.85" />
        </>
      )}

      {/* rolling hills */}
      <path d="M0 250 Q 110 200 220 244 T 400 232 V320 H0 Z" fill={kind === 'dusk' ? '#5f8f54' : '#a6dd84'} />
      <path d="M0 280 Q 130 236 260 276 T 400 272 V320 H0 Z" fill={kind === 'dusk' ? '#4f7d46' : '#86ca63'} />

      {/* trees */}
      {(kind === 'meadow' || kind === 'dusk' || kind === 'stream') && [[34, 252], [372, 244]].map(([x, y], i) => (
        <g key={i}>
          <rect x={x - 5} y={y} width="10" height="34" rx="4" fill={kind === 'dusk' ? '#5a3d2b' : '#9c6b43'} />
          <circle cx={x} cy={y - 6} r="26" fill={kind === 'dusk' ? '#3f6b39' : '#6fbe3f'} />
          <circle cx={x - 16} cy={y + 4} r="16" fill={kind === 'dusk' ? '#37602f' : '#62ad36'} />
          <circle cx={x + 16} cy={y + 4} r="16" fill={kind === 'dusk' ? '#37602f' : '#62ad36'} />
        </g>
      ))}

      {/* orchard tree */}
      {kind === 'orchard' && (
        <g>
          <rect x="190" y="150" width="22" height="100" rx="8" fill="#9c6b43" />
          <circle cx="201" cy="140" r="70" fill="#6fbe3f" />
          <circle cx="150" cy="160" r="44" fill="#62ad36" />
          <circle cx="252" cy="160" r="44" fill="#62ad36" />
          {[[170, 120], [230, 118], [150, 170], [255, 172], [201, 150], [200, 100]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="9" fill="#e64545" stroke="#b8312f" strokeWidth="1.5" />
          ))}
        </g>
      )}

      {/* stream */}
      {kind === 'stream' && (
        <g>
          <path d="M0 286 Q 200 262 400 286 V320 H0 Z" fill="#7cc4e8" />
          <path d="M0 296 Q 200 276 400 296" fill="none" stroke="#a6dcf2" strokeWidth="4" opacity="0.8" />
        </g>
      )}

      {/* winding path */}
      {kind !== 'stream' && (
        <path d="M150 320 Q 200 280 200 250 Q 200 220 250 210" fill="none" stroke="#e8d5a8" strokeWidth="26" strokeLinecap="round" opacity="0.85" />
      )}
    </svg>
  )
}

// ─── Objects ───────────────────────────────────────────────────
export function Firefly({ lit, size = 56 }: { lit: boolean; size?: number }) {
  return (
    <img src="/assets/objects/firefly.png" alt="firefly" draggable={false} width={size} height={size}
      style={{ objectFit: 'contain', transition: 'opacity .3s ease, filter .3s ease',
        opacity: lit ? 1 : 0.5, filter: lit ? 'drop-shadow(0 0 9px #fff3b0)' : 'grayscale(.55) brightness(.92)' }} />
  )
}

// Real generated object PNGs, used as tappable count items across Story Mode.
// butterfly/pigeon have no art yet — they fall back to an emoji placeholder and
// auto-upgrade the moment /assets/objects/butterfly.png (or pigeon.png) is added.
export type CountKind =
  // forest
  | 'firefly' | 'butterfly' | 'rabbit'
  // pond (legacy — pond biome removed; duck no longer used in a biome)
  | 'duck'
  // underwater
  | 'fish' | 'turtle' | 'octopus' | 'crab'
  // sky
  | 'pigeon' | 'bee' | 'eagle'
  // garden
  | 'snail' | 'squirrel' | 'ant'
  // other scenes
  | 'mushroom' | 'apple' | 'flower'
// Each kind can have several art variants (e.g. butterflies of different colors, a
// pigeon flying left vs right); instances cycle through them for variety. Kinds
// with an EMPTY list have no painted art yet → they render as a big emoji and
// auto-upgrade the moment a PNG is dropped in here.
export const COUNT_SRC: Record<CountKind, string[]> = {
  firefly: ['/assets/objects/firefly.png'],
  butterfly: ['/assets/objects/butterfly_1.png', '/assets/objects/butterfly_2.png'],
  pigeon: ['/assets/objects/pigeon_1.png', '/assets/objects/pigeon_2.png'],
  mushroom: ['/assets/objects/mushroom.png'],
  apple: ['/assets/objects/apple.png'],
  flower: ['/assets/objects/flower-red.png'],
  duck: ['/assets/objects/duck.png'],
  fish: ['/assets/objects/fish.png'],
  turtle: ['/assets/objects/turtle.png'],
  bee: ['/assets/objects/bee.png'],
  snail: ['/assets/objects/snail.png'],
  squirrel: ['/assets/objects/squirrel.png'],
  ant: ['/assets/objects/ant.png'],
  // Two eagle variants dropped in for comparison — instances cycle through both so
  // you can see them side by side; once you pick, drop the other from this array.
  eagle: ['/assets/objects/eagle1.png', '/assets/objects/eagle2.png'],
  // New objects so a session never repeats a creature — render as emoji until the PNG
  // is dropped in (then they auto-upgrade).
  octopus: ['/assets/objects/octopus.png'],
  crab: ['/assets/objects/crab.png'],
  rabbit: ['/assets/objects/rabbit.png'],
}
export const COUNT_EMOJI: Record<CountKind, string> = {
  firefly: '🪲', butterfly: '🦋',
  duck: '🦆', fish: '🐟', turtle: '🐢',
  pigeon: '🐦', bee: '🐝', eagle: '🦅',
  snail: '🐌', squirrel: '🐿️', ant: '🐜',
  mushroom: '🍄', apple: '🍎', flower: '🌸',
  octopus: '🐙', crab: '🦀', rabbit: '🐰',
}
export const COUNT_LABEL: Record<CountKind, string> = {
  firefly: 'firefly', butterfly: 'butterfly',
  duck: 'duck', fish: 'fish', turtle: 'turtle',
  pigeon: 'bird', bee: 'bee', eagle: 'eagle',
  snail: 'snail', squirrel: 'squirrel', ant: 'ant',
  mushroom: 'mushroom', apple: 'apple', flower: 'flower',
  octopus: 'octopus', crab: 'crab', rabbit: 'rabbit',
}
export const COUNT_PLURAL: Record<CountKind, string> = {
  firefly: 'fireflies', butterfly: 'butterflies',
  duck: 'ducks', fish: 'fish', turtle: 'turtles',
  pigeon: 'birds', bee: 'bees', eagle: 'eagles',
  snail: 'snails', squirrel: 'squirrels', ant: 'ants',
  mushroom: 'mushrooms', apple: 'apples', flower: 'flowers',
  octopus: 'octopuses', crab: 'crabs', rabbit: 'rabbits',
}

// `on` = counted/found. When tapped, an object pops + glows so "I found one!" is
// clear. At rest the look depends on `blend`:
//   • blend=false (default) — bright white halo so it stands out (canvas scenes).
//   • blend=true — soft natural shadow only, so it tucks INTO the forest foliage
//     and the child has to HUNT for it (the forest-walk find-and-count beats).
// Missing art (placeholders) falls back to a big emoji.
export function CountItem({ kind, on, size = 56, variant = 0, blend = false }: { kind: CountKind; on: boolean; size?: number; variant?: number; blend?: boolean }) {
  const [missing, setMissing] = useState(false)
  const glow = kind === 'firefly'
  const srcs = COUNT_SRC[kind]
  // Resting filter: blended objects sit in the leaves with just a soft contact
  // shadow (no bright halo); non-blended keep the stand-out white halo.
  const rest = blend
    ? (glow ? 'drop-shadow(0 0 5px rgba(255,246,194,.5))' : 'drop-shadow(0 2px 5px rgba(0,0,0,.42))')
    : (glow ? 'drop-shadow(0 0 8px #fff6c2)' : 'drop-shadow(0 0 5px rgba(255,255,255,.92)) drop-shadow(0 4px 6px rgba(0,0,0,.5))')
  if (missing || !srcs.length) {
    return (
      <span role="img" aria-label={kind} style={{ display: 'inline-block', width: size, height: size, lineHeight: `${size}px`, textAlign: 'center',
        fontSize: Math.round(size * 0.82), transition: 'filter .25s, transform .18s',
        filter: on ? 'drop-shadow(0 0 4px #fff) drop-shadow(0 5px 6px rgba(0,0,0,.45))' : (blend ? 'drop-shadow(0 2px 5px rgba(0,0,0,.42))' : 'drop-shadow(0 0 4px rgba(255,255,255,.9)) drop-shadow(0 4px 6px rgba(0,0,0,.5))'),
        transform: on ? 'translateY(-7px) scale(1.24)' : 'none' }}>{COUNT_EMOJI[kind]}</span>
    )
  }
  return (
    <img src={srcs[variant % srcs.length]} alt={kind} draggable={false} width={size} height={size} onError={() => setMissing(true)}
      style={{ objectFit: 'contain', transition: 'transform .18s ease, filter .25s ease',
        filter: on
          ? (glow ? 'drop-shadow(0 0 16px #fff3b0) brightness(1.05)' : 'drop-shadow(0 0 5px #fff) drop-shadow(0 6px 7px rgba(0,0,0,.45)) brightness(1.06)')
          : rest,
        transform: on ? 'translateY(-7px) scale(1.24)' : 'none' }} />
  )
}

// Places the count items in a fitting setting so counting always has context:
// apples grow ON the tree, mushrooms/flowers sit on the grass, fireflies float.
const STAGE_TREE = '/assets/objects/tree_5.png'   // the bare apple tree
export function CountStage({ kind, children }: { kind: CountKind; children: React.ReactNode }) {
  if (kind === 'apple') {
    return (
      <div style={{ position: 'relative', width: 250, height: 250, margin: '0 auto', display: 'flex', justifyContent: 'center' }}>
        <img src={STAGE_TREE} alt="" aria-hidden draggable={false}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }} />
        {/* apples clustered over the canopy */}
        <div style={{ position: 'absolute', top: 26, left: '50%', transform: 'translateX(-50%)', width: 170,
          display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center', zIndex: 1 }}>
          {children}
        </div>
      </div>
    )
  }
  if (kind === 'mushroom' || kind === 'flower') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', maxWidth: 320 }}>{children}</div>
        <div style={{ width: 260, height: 16, borderRadius: '50%', background: 'radial-gradient(ellipse at center,#86ca63 0%,rgba(134,202,99,0) 70%)' }} />
      </div>
    )
  }
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 320 }}>{children}</div>
}

export function DoorArt({ n, highlight }: { n: number; highlight?: boolean }) {
  return (
    <svg viewBox="0 0 90 120" width="100%" height="100%">
      <rect x="6" y="14" width="78" height="102" rx="10" fill="#b07a4f" stroke="#8b5a2b" strokeWidth="3" />
      <path d="M6 24 Q45 -6 84 24" fill="#c98f5e" stroke="#8b5a2b" strokeWidth="3" />
      <rect x="18" y="34" width="54" height="74" rx="8" fill={highlight ? '#dff3cf' : '#f4e3c8'} stroke="#8b5a2b" strokeWidth="2.5" />
      <circle cx="62" cy="72" r="4" fill="#8b5a2b" />
      <text x="45" y="84" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="900" fontSize="40" fill="#5a3d2b">{n}</text>
    </svg>
  )
}

export function Apple({ size = 44 }: { size?: number }) {
  return <img src="/assets/objects/apple.png" alt="apple" draggable={false} width={size} height={size} style={{ objectFit: 'contain' }} />
}

export function Berry({ size = 26 }: { size?: number }) {
  return (
    <svg viewBox="0 0 30 30" width={size} height={size}>
      <circle cx="15" cy="17" r="11" fill="#6a5acd" stroke="#4b3f9e" strokeWidth="2" />
      <circle cx="11" cy="13" r="3" fill="#fff" opacity="0.5" />
      <path d="M9 8 L15 12 L21 8" fill="none" stroke="#4caf50" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

export function Stone({ n, stepped, size = 66 }: { n: number; stepped?: boolean; size?: number }) {
  return (
    <svg viewBox="0 0 70 70" width={size} height={size}>
      <ellipse cx="35" cy="58" rx="30" ry="9" fill="#5a4a3a" opacity="0.2" />
      <path d="M8 40 Q6 22 35 20 Q64 22 62 40 Q64 54 35 56 Q6 54 8 40 Z" fill={stepped ? '#a6dd84' : '#c9bca8'} stroke={stepped ? '#6fbe3f' : '#9c8f7a'} strokeWidth="3" />
      <ellipse cx="26" cy="32" rx="8" ry="4" fill="#fff" opacity="0.3" />
      <text x="35" y="48" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="900" fontSize="26" fill="#5a4a3a">{n}</text>
    </svg>
  )
}

export function Basket({ count }: { count: number }) {
  return (
    <div style={{ position: 'relative', width: 120, height: 84, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', top: 6, display: 'flex', gap: 2, flexWrap: 'wrap', width: 90, justifyContent: 'center' }}>
        {Array.from({ length: count }).map((_, i) => <span key={i} style={{ animation: 'k_dropIn .4s ease both' }}><Apple size={26} /></span>)}
      </div>
      <svg viewBox="0 0 120 70" width="120" height="64" style={{ position: 'absolute', bottom: 0 }}>
        <path d="M10 18 L110 18 L100 64 Q60 70 20 64 Z" fill="#c98f5e" stroke="#8b5a2b" strokeWidth="3" />
        {[28, 46, 64, 82, 100].map((x, i) => <line key={i} x1={x - 6} y1="20" x2={x} y2="62" stroke="#8b5a2b" strokeWidth="2" opacity="0.6" />)}
        <path d="M8 18 Q60 2 112 18" fill="none" stroke="#8b5a2b" strokeWidth="5" strokeLinecap="round" />
        <rect x="6" y="14" width="108" height="8" rx="4" fill="#b07a4f" stroke="#8b5a2b" strokeWidth="2" />
      </svg>
    </div>
  )
}
