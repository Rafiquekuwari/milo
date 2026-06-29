'use client'
/**
 * useLearnerChapters
 *
 * Resolves the chapter id list the active learner should see:
 *   • assigned to a grade → that grade's hand-picked subset (teacher's order)
 *   • no grade            → all chapters in the learner's age band (the default)
 *
 * Starts synchronously with the age-band list (no empty flash), then refines to
 * the grade subset once grade_chapters loads. Falls back to the band if the
 * grade is empty or the fetch fails, so a learner can never end up with no
 * chapters.
 */
import { useEffect, useState } from 'react'
import { chaptersForAge, type AgeGroup, type ChapterType } from './chapters'
import { getActiveLearner } from './supabase/useLearnerSession'
import { getGradeChapterIds } from './supabase/queries'

function bandChapters(band: AgeGroup): ChapterType[] {
  return chaptersForAge(band).map(c => c.id)
}

function activeBand(): AgeGroup {
  try { return getActiveLearner()?.age_group ?? '3-5' } catch { return '3-5' }
}

export function useLearnerChapters(): {
  ageGroup:   AgeGroup
  chapterIds: ChapterType[]
  ready:      boolean
} {
  const [ageGroup]            = useState<AgeGroup>(() => activeBand())
  const [chapterIds, setIds]  = useState<ChapterType[]>(() => bandChapters(activeBand()))
  const [ready, setReady]     = useState(false)

  useEffect(() => {
    const learner  = getActiveLearner()
    const band     = learner?.age_group ?? '3-5'
    const fallback = bandChapters(band)
    const gradeId  = learner?.grade_id

    if (!gradeId) { setIds(fallback); setReady(true); return }

    let cancelled = false
    getGradeChapterIds(gradeId)
      .then(ids => {
        if (cancelled) return
        // Keep the grade's order; drop any chapter not in this band (stale/foreign).
        const valid = ids.filter(id => fallback.includes(id))
        setIds(valid.length ? valid : fallback)
        setReady(true)
      })
      .catch(() => { if (!cancelled) { setIds(fallback); setReady(true) } })

    return () => { cancelled = true }
  }, [])

  return { ageGroup, chapterIds, ready }
}
