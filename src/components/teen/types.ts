// Shared types for the teen "Field Lab" kit (ages 12–18).
// Every teen kit component + chapter imports from here so the fan-out stays compatible.

export type AgeBand = '12-14' | '15-16' | '17-18'

export const TEEN_BANDS: AgeBand[] = ['12-14', '15-16', '17-18']

/** Answer feedback state — math-without-fear: 'wrong' renders neutral + amber, NEVER red. */
export type AnswerStatus = 'idle' | 'correct' | 'wrong'

/** A point on the coordinate grid (lattice or value space). */
export interface Pt { x: number; y: number }

/** Milo's embodiment per band: 'M' monogram (12-14) → 'M.' avatar (15-16) → 'M·' mark (17-18). */
export type MiloMood = 'idle' | 'thinking' | 'speaking'

/** A multiple-choice option used by ChoiceGrid / StepSelect. */
export interface Choice {
  value: string | number
  label: string
}

/** Framing label per band — drives copy ("Investigation" / "Commission" / "Module"). */
export const BAND_FRAMING: Record<AgeBand, { unit: string; persona: string }> = {
  '12-14': { unit: 'Investigation', persona: 'lab partner' },
  '15-16': { unit: 'Commission', persona: 'studio analyst' },
  '17-18': { unit: 'Module', persona: 'research coach' },
}
