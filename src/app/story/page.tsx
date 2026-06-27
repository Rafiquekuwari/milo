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
 */
import { useEffect, useState } from 'react'
import ForestWalk from '@/components/story/ForestWalk'
import { countingChapter } from '@/components/story/chapters'
import RiverCrossing from '@/components/story/RiverCrossing'
import Kitchen from '@/components/story/Kitchen'
import NumberDoors from '@/components/story/NumberDoors'
import Grocery from '@/components/story/Grocery'
import ShapeTown from '@/components/story/ShapeTown'

export default function StoryPage() {
  const [ch, setCh] = useState('counting')
  useEffect(() => { setCh(new URLSearchParams(window.location.search).get('ch') || 'counting') }, [])

  if (ch === 'order') return <RiverCrossing />
  if (ch === 'kitchen') return <Kitchen />
  if (ch === 'doors') return <NumberDoors />
  if (ch === 'grocery') return <Grocery />
  if (ch === 'shapes') return <ShapeTown />
  return <ForestWalk chapter={countingChapter} />
}
