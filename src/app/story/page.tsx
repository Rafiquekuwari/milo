'use client'
/**
 * /story — the 3–5 story-mode prototype (World 1: Milo's Picnic Party).
 * See docs/story-mode-3-5.md.
 */
import StoryWorld from '@/components/story/StoryWorld'
import { world1 } from '@/components/story/world1'

export default function StoryPage() {
  return <StoryWorld world={world1} />
}
