'use client'
export const dynamic = 'force-static'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import BackButton from '@/components/ui/BackButton'
import { useMiloStore } from '@/lib/store'
import { useMiloSpeaker } from '@/lib/useMiloSpeaker'
import { getActiveLearner } from '@/lib/supabase/useLearnerSession'
import { saveLearnerState } from '@/lib/supabase/queries'

// Push the latest coins/owned/equipped to Supabase so the shop syncs across devices.
function syncShopState() {
  const learner = getActiveLearner()
  if (!learner) return
  const p = useMiloStore.getState().profile
  saveLearnerState(learner.id, {
    coinsSpent:    p.coinsSpent,
    ownedItems:    p.ownedItems,
    equippedItems: p.equippedItems,
  }).catch(() => {})
}

interface ShopItem {
  id: string; name: string; emoji: string
  cost: number; slot: string; desc: string
}

const SHOP_ITEMS: ShopItem[] = [
  { id:'hat-red',    name:'Red Hat',      emoji:'🎩', cost:20,  slot:'hat',   desc:'A dashing red top hat!' },
  { id:'hat-blue',   name:'Blue Hat',     emoji:'🪖', cost:20,  slot:'hat',   desc:'Cool blue style!' },
  { id:'hat-party',  name:'Party Hat',    emoji:'🎉', cost:40,  slot:'hat',   desc:'For celebrations!' },
  { id:'hat-crown',  name:'Crown',        emoji:'👑', cost:80,  slot:'hat',   desc:'For champions only!' },
  { id:'hat-wizard', name:'Wizard Hat',   emoji:'🧙', cost:60,  slot:'hat',   desc:'Magic powers!' },
  { id:'shirt-green',name:'Green Shirt',  emoji:'🟩', cost:30,  slot:'shirt', desc:'Fresh green look!' },
  { id:'shirt-purple',name:'Purple Shirt',emoji:'🟪', cost:30,  slot:'shirt', desc:'Royal purple!' },
  { id:'badge-gold', name:'Gold Badge',   emoji:'⭐', cost:60,  slot:'badge', desc:'Shine bright!' },
  { id:'pet-star',   name:'Star Pet',     emoji:'🌟', cost:35,  slot:'pet',   desc:'A shiny companion!' },
  { id:'pet-dino',   name:'Dino Pet',     emoji:'🦕', cost:45,  slot:'pet',   desc:'Friendly dino!' },
]

const SLOT_LABELS: Record<string, string> = {
  hat: '🎩 Hats', shirt: '👕 Shirts', badge: '🏅 Badges', pet: '🐾 Pets',
}

export default function ShopPage() {
  const router  = useRouter()
  const { profile, purchaseItem, equipItem } = useMiloStore()
  const { speak } = useMiloSpeaker()
  const [flash, setFlash] = useState<string | null>(null)

  const coins = profile.totalCoins

  // First owned item or first item as preview
  const allSlots = [...new Set(SHOP_ITEMS.map(i => i.slot))]

  function showFlash(msg: string) {
    setFlash(msg)
    window.setTimeout(() => setFlash(null), 2000)
  }

  function handleBuy(item: ShopItem) {
    if (profile.ownedItems.includes(item.id)) {
      equipItem(item.slot, item.id)
      syncShopState()
      speak(`${item.name} equipped!`)
      showFlash(`✅ ${item.name} equipped!`)
      return
    }
    if (coins < item.cost) {
      speak(`You need ${item.cost - coins} more coins!`)
      showFlash(`❌ Need ${item.cost - coins} more coins!`)
      return
    }
    const ok = purchaseItem(item.id, item.cost)
    if (ok) {
      equipItem(item.slot, item.id)
      syncShopState()
      speak(`You got the ${item.name}! Great choice!`)
      showFlash(`🎉 Got ${item.name}!`)
    }
  }

  // Currently equipped item for preview panel
  const equippedItems = profile.equippedItems
  const featuredId    = Object.values(equippedItems)[0] ?? SHOP_ITEMS[0].id
  const featured      = SHOP_ITEMS.find(i => i.id === featuredId) ?? SHOP_ITEMS[0]

  return (
    <div style={{
      minHeight: '100dvh', background: 'var(--bg-page)',
      fontFamily: 'var(--font-body)', display: 'flex', flexDirection: 'column',
    }}>
      {/* Topbar */}
      <div className="kit-topbar" style={{ padding: '16px 20px' }}>
        <BackButton href='/menu' label='← Menu' />
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'var(--sun-yellow-soft)',
          border: '2.5px solid var(--outline)',
          borderRadius: 50, padding: '6px 16px',
        }}>
          <span className="kit-coin size-sm">C</span>
          <span className="numeric" style={{ fontSize: 16, fontWeight: 800 }}>{coins}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-muted)' }}>coins</span>
        </div>
      </div>

      {/* Flash */}
      {flash && (
        <div style={{
          position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)',
          zIndex: 50, background: flash.startsWith('❌') ? 'var(--apple-red)' : 'var(--garden-green)',
          color: '#fff', borderRadius: 50, padding: '10px 24px',
          fontSize: 15, fontWeight: 800,
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          animation: 'popIn 0.3s cubic-bezier(.34,1.56,.64,1)',
          whiteSpace: 'nowrap',
        }}>
          {flash}
        </div>
      )}

      {/* Two-column layout */}
      <div style={{
        flex: 1, display: 'flex', gap: 16,
        padding: '16px 20px',
        maxWidth: 760, width: '100%', margin: '0 auto',
        flexWrap: 'wrap',
      }}>

        {/* ── Left: preview panel ── */}
        <div style={{
          flex: '0 0 200px', minWidth: 180,
          background: 'var(--paper)',
          border: '4px solid var(--outline)',
          borderRadius: 28,
          boxShadow: '0 6px 0 rgba(61,37,22,.12)',
          padding: '24px 16px',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 16,
        }}>
          {/* Milo preview */}
          <div style={{
            width: 140, height: 140,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
          }}>
            <img
              src="/assets/characters/milo-happy.png"
              alt="Milo"
              style={{ width: 130, height: 130, objectFit: 'contain',
                filter: 'drop-shadow(0 4px 10px rgba(61,37,22,.15))',
              }}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
            {/* Equipped hat floating above */}
            {equippedItems['hat'] && (
              <div style={{
                position: 'absolute', top: -8, left: '50%',
                transform: 'translateX(-50%)',
                fontSize: 40,
              }}>
                {SHOP_ITEMS.find(i => i.id === equippedItems['hat'])?.emoji}
              </div>
            )}
          </div>

          <div style={{
            background: 'var(--cream)', border: '3px solid var(--outline)',
            borderRadius: 20, padding: '14px 16px',
            width: '100%', textAlign: 'center',
            boxShadow: '0 3px 0 rgba(61,37,22,.08)',
          }}>
            <div style={{
              fontFamily: 'var(--font-display)', fontWeight: 800,
              fontSize: 16, color: 'var(--ink)', marginBottom: 4,
            }}>
              {featured.name}
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
              {profile.ownedItems.includes(featured.id) ? 'Milo is wearing this.' : featured.desc}
            </div>
            {profile.ownedItems.includes(featured.id) && (
              <button
                onClick={() => {
                  // Unequip — remove from equipped
                  equipItem(featured.slot, '')
                  syncShopState()
                  speak('Taken off!')
                  showFlash('Taken off!')
                }}
                style={{
                  marginTop: 10, width: '100%', padding: '10px',
                  background: 'var(--paper)', border: '3px solid var(--outline)',
                  borderRadius: 50, fontFamily: 'var(--font-display)',
                  fontWeight: 800, fontSize: 14, cursor: 'pointer',
                  color: 'var(--ink)',
                }}
              >Take off</button>
            )}
          </div>

          {/* Earn coins hint */}
          <div style={{
            fontSize: 12, color: 'var(--ink-muted)',
            textAlign: 'center', lineHeight: 1.5,
          }}>
            💡 Play chapters to earn more coins!
          </div>
        </div>

        {/* ── Right: wardrobe grid ── */}
        <div style={{
          flex: '1 1 280px',
          background: 'var(--paper)',
          border: '4px solid var(--outline)',
          borderRadius: 28,
          boxShadow: '0 6px 0 rgba(61,37,22,.12)',
          padding: '20px',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontWeight: 900,
            fontSize: 22, color: 'var(--ink)', margin: 0,
          }}>Milo's wardrobe</h2>

          {allSlots.map(slot => {
            const slotItems = SHOP_ITEMS.filter(i => i.slot === slot)
            return (
              <div key={slot}>
                <div style={{
                  fontSize: 12, fontWeight: 700, color: 'var(--ink-muted)',
                  textTransform: 'uppercase', letterSpacing: 0.8,
                  marginBottom: 8,
                }}>{SLOT_LABELS[slot]}</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {slotItems.map(item => {
                    const owned    = profile.ownedItems.includes(item.id)
                    const equipped = profile.equippedItems[item.slot] === item.id
                    const canAfford = coins >= item.cost

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleBuy(item)}
                        style={{
                          width: 100, background: equipped ? 'var(--sun-yellow-soft)' : 'var(--cream)',
                          border: `4px solid ${equipped ? 'var(--milo-orange)' : 'var(--outline)'}`,
                          borderRadius: 20,
                          boxShadow: `0 4px 0 ${equipped ? 'var(--milo-orange-deep)' : 'rgba(61,37,22,.12)'}`,
                          padding: '12px 8px 10px',
                          display: 'flex', flexDirection: 'column',
                          alignItems: 'center', gap: 6,
                          cursor: canAfford || owned ? 'pointer' : 'not-allowed',
                          opacity: !canAfford && !owned ? 0.6 : 1,
                          transition: 'transform 0.1s',
                          position: 'relative',
                        }}
                        onMouseDown={e => { e.currentTarget.style.transform = 'translateY(4px)' }}
                        onMouseUp={e => { e.currentTarget.style.transform = '' }}
                        onMouseLeave={e => { e.currentTarget.style.transform = '' }}
                      >
                        <span style={{ fontSize: 36, lineHeight: 1 }}>{item.emoji}</span>
                        <span style={{
                          fontFamily: 'var(--font-display)', fontWeight: 800,
                          fontSize: 12, color: 'var(--ink)', textAlign: 'center',
                        }}>{item.name}</span>
                        {equipped ? (
                          <span style={{
                            fontSize: 11, fontWeight: 800,
                            color: 'var(--milo-orange)',
                            textTransform: 'uppercase',
                          }}>EQUIPPED</span>
                        ) : owned ? (
                          <span style={{
                            fontSize: 11, fontWeight: 800,
                            color: 'var(--garden-green)',
                          }}>✓ Owned</span>
                        ) : (
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: 3,
                          }}>
                            <span className="kit-coin size-sm">C</span>
                            <span className="numeric" style={{ fontSize: 13 }}>{item.cost}</span>
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <style>{`
        @keyframes popIn {
          from { transform: translateX(-50%) scale(0.8); opacity: 0; }
          to   { transform: translateX(-50%) scale(1);   opacity: 1; }
        }
      `}</style>
    </div>
  )
}