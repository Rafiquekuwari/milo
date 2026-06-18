'use client'
/**
 * /story — standalone preview of the Counting story-mode chapter (landscape forest
 * walk). The same chapter also runs inside the game (see CountingStoryChapter).
 */
import ForestWalk from '@/components/story/ForestWalk'
import { countingChapter } from '@/components/story/chapters'

export default function StoryPage() {
  return <ForestWalk chapter={countingChapter} />
}
