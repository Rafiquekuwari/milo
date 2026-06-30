'use client'
/**
 * /story — standalone preview of the story-mode chapters (the same experiences also
 * run inside the game via their chapter wrappers). Pick which one with `?ch=`:
 *   /story            → Counting    (forest walk)        [default]
 *   /story?ch=order   → Number Order (river crossing)
 *   /story?ch=kitchen → Comparison   (kitchen)
 *   /story?ch=doors   → Recognition  (number doors)
 *   /story?ch=grocery → Matching qty (little grocery)
 *   /story?ch=shapes  → Shapes       (shape town walk)
 *   /story?ch=rainbow → Colours      (rainbow town walk)
 *   /story?ch=beads   → Patterns     (bead shop)
 *
 * Counting opens a WORLD PICKER (Nature / Farm / Space). Skip it + jump straight into
 * one with `?story=`:  /story?story=farm  ·  /story?story=space  ·  /story?story=nature
 */
import { useEffect, useState } from 'react'
import ForestWalk from '@/components/story/ForestWalk'
import { type Chapter } from '@/components/story/ForestWalk'
import WorldSelect from '@/components/story/WorldSelect'
import { makeCountingChapter } from '@/components/story/chapters'
import { STORYTELLINGS, BIOMES, storytellingById } from '@/components/story/biomes'
import RiverCrossing from '@/components/story/RiverCrossing'
import Kitchen from '@/components/story/Kitchen'
import NumberDoors from '@/components/story/NumberDoors'
import Grocery from '@/components/story/Grocery'
import ShapeTown from '@/components/story/ShapeTown'
import RainbowTown from '@/components/story/RainbowTown'
import BeadShop from '@/components/story/BeadShop'

export default function StoryPage() {
  const [ch, setCh] = useState('counting')
  const [chapter, setChapter] = useState<Chapter | null>(null)
  const [orderWorld, setOrderWorld] = useState<string | undefined>(undefined)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setCh(params.get('ch') || 'counting')
    setOrderWorld(params.get('world') || undefined)   // ?world=river|train|sky jumps into an ordering world
    // ?story= jumps straight into a journey; otherwise the world picker shows.
    const forced = storytellingById(params.get('story'))
    if (forced) setChapter(makeCountingChapter(forced))
    setReady(true)
  }, [])

  if (ch === 'order') return <RiverCrossing world={orderWorld} />
  // ?world=kitchen|grocery|bakery jumps into a comparison world.
  if (ch === 'kitchen') return <Kitchen world={orderWorld} />
  // ?world=doors|balloons|buses jumps into a recognition world.
  if (ch === 'doors') return <NumberDoors world={orderWorld} />
  if (ch === 'grocery') return <Grocery world={orderWorld} />
  // ?world=town|fair|beach jumps into a shape world.
  if (ch === 'shapes') return <ShapeTown world={orderWorld} />
  // ?world=town|reef|candy jumps into a colour world.
  if (ch === 'rainbow') return <RainbowTown world={orderWorld} />
  // ?world=beads|party|train jumps into a pattern world.
  if (ch === 'beads') return <BeadShop world={orderWorld} />
  // Counting: play the forced/chosen world, else show the picker.
  if (chapter) return <ForestWalk chapter={chapter} />
  if (!ready) return null
  const worlds = STORYTELLINGS.map(s => ({ id: s.id, label: s.label, emoji: s.emoji, bgImage: BIOMES[s.biomes[0]].bgImage }))
  return <WorldSelect title="Where shall we count today?" worlds={worlds} onPick={(id) => { const s = storytellingById(id); if (s) setChapter(makeCountingChapter(s)) }} />
}
