/**
 * Age-band metadata, shared by every surface that lets someone pick a band
 * (add-learner modal, grade creation). The band keys mirror AgeGroup in
 * src/lib/chapters.ts and the learners/grades CHECK constraints.
 */
import type { AgeGroup } from './chapters'

export interface AgeGroupOption {
  value: AgeGroup
  label: string
  hint:  string
}

export const AGE_GROUP_OPTIONS: AgeGroupOption[] = [
  { value: '3-5',   label: 'Ages 3–5',   hint: 'Counting, shapes, first add & subtract' },
  { value: '6-8',   label: 'Ages 6–8',   hint: 'Bigger numbers, place value, times & money' },
  { value: '9-11',  label: 'Ages 9–11',  hint: 'Division, decimals, fractions, area & data' },
  { value: '12-14', label: 'Ages 12–14', hint: 'Integers, ratios, %, algebra, coordinate plane' },
  { value: '15-16', label: 'Ages 15–16', hint: 'Algebra I & Geometry' },
  { value: '17-18', label: 'Ages 17–18', hint: 'Algebra II, Pre-Calc, Stats & Calculus (coming soon)' },
]

export const AGE_GROUP_LABELS: Record<AgeGroup, string> =
  Object.fromEntries(AGE_GROUP_OPTIONS.map(o => [o.value, o.label])) as Record<AgeGroup, string>
