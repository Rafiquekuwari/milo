# Teen "Field Lab" Kit — Interface Contract (v1)

Stable API every teen kit component exposes. The kit fan-out builds against THIS; teen chapters
(all 37) compose THESE. Pairs with [docs/teen-kit-build-contract.md](./teen-kit-build-contract.md)
(real engine APIs) and [docs/framing-12-18.md](./framing-12-18.md) (look/tone).

## Ground rules for every kit file
- Location: `src/components/teen/<Name>.tsx`. One component per file, default export unless noted.
- Import shared types from `@/components/teen/types` (`AgeBand`, `AnswerStatus`, `Pt`, `Choice`,
  `MiloMood`, `BAND_FRAMING`, `TEEN_BANDS`).
- **Colors/fonts: CSS variables ONLY** — `var(--accent)` (teal, per band), `var(--garden-green)`
  (the quiet correct-reveal), `var(--note-amber)` (gentle wrong reframe — NEVER red), `var(--ink)`
  / `--ink-soft` / `--ink-muted`, `var(--paper)` / `--bg-1` / `--bg-2` / `--bg-page`, `var(--outline)`
  for hairline borders, `var(--font-numeric)` (IBM Plex Mono) for **all** numbers/math/coords,
  `var(--font-body)` for prose. No literal hex/rgba anywhere.
- Style language: hairline 1px `var(--outline)` borders, generous whitespace, calm motion
  (150–300ms `var(--ease-smooth)`; honor `prefers-reduced-motion`); NO bounce/confetti/sparkle.
- Math-without-fear: wrong answers are neutral + an amber underline/note; nothing is ever marked
  with red, an X, or "wrong/fail". No losable progress.
- Theme is applied by an ancestor `data-band` attribute (see `BandScope`); components just read vars.
- TS strict; props interfaces exported as `<Name>Props`.

## Shared types (already created — `src/components/teen/types.ts`)
`AgeBand = '12-14'|'15-16'|'17-18'` · `AnswerStatus = 'idle'|'correct'|'wrong'` · `Pt {x,y}` ·
`Choice {value,label}` · `MiloMood = 'idle'|'thinking'|'speaking'` · `BAND_FRAMING` · `TEEN_BANDS`.

---

## A. Framing / chrome components

### `BandScope` (default) — `src/components/teen/BandScope.tsx`
Wrapper that scopes the teen theme to its subtree (sets `data-band`), so we never mutate `<html>`.
```ts
interface BandScopeProps { band: AgeBand; children: React.ReactNode; style?: React.CSSProperties; className?: string }
// renders <div data-band={band} style={{ background:'var(--bg-page)', color:'var(--ink)', minHeight:'100dvh', ...style }}>
```

### `MiloMark` (default) — `src/components/teen/MiloMark.tsx`
The aging-up monogram. 12-14 = rounded-square "M"; 15-16 = "M." avatar; 17-18 = "M·" mark + an
optional thinking/speaking waveform. Pure CSS/SVG, no PNG.
```ts
interface MiloMarkProps { band: AgeBand; mood?: MiloMood; size?: number /* px, default 40 */ }
```

### `TeenTopbar` (default) — `src/components/teen/TeenTopbar.tsx`
Teen equivalent of GameTopbar: chapter title + a thin hairline progress rail (no stars/coins shown).
```ts
interface TeenTopbarProps { band: AgeBand; title: string; roundIdx: number; totalRounds: number; onBack?: () => void }
```

### `CaseCard` (default) — `src/components/teen/CaseCard.tsx`
The applied-hook opener (Investigation / Commission brief / Analyst applied-card per band). Maps to
the chapter intro / LessonStep 1.
```ts
interface CaseCardProps {
  band: AgeBand
  kicker?: string        // e.g. "Investigation 03" — defaults to BAND_FRAMING[band].unit
  title: string          // the real-world hook title ("The Better Buy")
  why: string            // one line: why this matters
  question: string       // the question the chapter answers
  visual?: React.ReactNode  // optional small diagram/graph
  onStart: () => void
  startLabel?: string    // default "Start"
}
```

### `TeenLessonShell` (default) — `src/components/teen/TeenLessonShell.tsx`
Teen equivalent of `LessonScaffold` — drives worked-example steps with teen chrome. Reimplements the
step-driver (index + nextReady + retry-remount via `key`, exactly like `_kit` LessonScaffold) but
renders teen chrome and uses `CalmAdvance`. Reuses the **`LessonStep`** type from `@/components/lessons/_kit`.
```ts
import type { LessonStep } from '@/components/lessons/_kit'
interface TeenLessonShellProps {
  band: AgeBand
  childName: string
  chapterTitle: string
  steps: LessonStep[]        // each step.render(onDone) returns its visual; calls onDone() when ready
  finalSpeech: string
  onLessonComplete: () => void
  intro?: React.ReactNode    // optional CaseCard rendered as step 0
}
```
Behavior: holds `step`/`nextReady`/`retry`; hosts `<div key={`${step}-${retry}`}>` so Retry fully
remounts a step; on Next past the last step, `speak(finalSpeech)` then `onLessonComplete()` after a
short tail; Back → confirm → `router.push('/menu')`; Skip → `onLessonComplete()`. Root element must
carry `className="milo-lesson"` + `minHeight:'100dvh'` (the game fit-controller keys off it).

### `CalmAdvance` (default) — `src/components/teen/CalmAdvance.tsx`
Teen `AdvancePopup`: neutral Retry/Continue, per-band peer microcopy, no cheer emoji/bounce.
```ts
interface CalmAdvanceProps { band: AgeBand; onRetry: () => void; onContinue: () => void; note?: string;
  labels?: { retry?: string; next?: string } /* defaults: "Replay step" / "Continue" */ }
```
Also export `teenMicrocopy(band)`: `{ encouragement: string[]; reframe: string[]; mastery: string[] }`
(warm, no-judgement banks — the teen replacement for `cheerFor`).

### `MasteryState` (default) — `src/components/teen/MasteryState.tsx`
The de-confettied chapter-complete state. Three variants by band: SOLVED stamp (12-14) /
"Commission shipped" (15-16) / "Module complete — N concepts confirmed" (17-18).
```ts
interface MasteryStateProps {
  band: AgeBand
  conceptsConfirmed?: string[]   // ledger items (17-18); count drives the headline
  nextPointer?: string           // "where this goes next" (17-18)
  onPlayAgain?: () => void
  onExit?: () => void
}
```

### `StreakMarker` (default) — `src/components/teen/StreakMarker.tsx`
Positive-only momentum chip ("Streak ×4", mono, no flame). Renders nothing when `count < 2`.
```ts
interface StreakMarkerProps { band: AgeBand; count: number }
```

### `FindingsLog` (default) — `src/components/teen/FindingsLog.tsx`
Right-side accumulation panel — fills as the learner answers (findings / spec rows / concepts).
```ts
interface FindingsLogProps { band: AgeBand; items: { label: string; value?: string; done: boolean }[]; title?: string }
```

### `StudioSkyline` (default) — `src/components/teen/StudioSkyline.tsx`
15-16 ambient meta-reward: an isometric city; each shipped commission adds a block. Pure CSS/SVG.
```ts
interface StudioSkylineProps { shipped: number /* number of mastered 15-16 chapters */; max?: number }
```

---

## B. Input primitives (the answer surfaces — safe formats only)

> Math-without-fear answer policy: clean decimals → NumericEntry with tolerance; fractions →
> FractionEntry (equivalence-aware); irrational/complex → ChoiceGrid (MCQ) or structured fields.
> NEVER a free-text symbolic parser.

### `ChoiceGrid` (default) — `src/components/teen/ChoiceGrid.tsx`
Teen MCQ. Renders tap targets; correct→green reveal, wrong→neutral dim + amber underline.
```ts
interface ChoiceGridProps {
  band: AgeBand
  choices: Choice[]
  selected?: string | number | null
  status?: AnswerStatus       // applies to the selected choice
  correctValue?: string | number  // revealed on a wrong pick (amber → then show correct green)
  onPick: (value: string | number) => void
  columns?: number            // default auto (2)
  mono?: boolean              // render labels in --font-numeric (default true for math)
}
```

### `NumericEntry` (default) — `src/components/teen/NumericEntry.tsx`
Numeric answer with tolerance grading. The PARENT decides correctness; this just collects + shows state.
```ts
interface NumericEntryProps {
  band: AgeBand
  onSubmit: (value: number, raw: string) => void
  status?: AnswerStatus
  placeholder?: string
  suffix?: string             // e.g. "%", "cm"
  allowNegative?: boolean      // default true
  allowDecimal?: boolean       // default true
}
// export helper: numericEqual(a: number, b: number, tol = 1e-9): boolean
```

### `FractionEntry` (default) — `src/components/teen/FractionEntry.tsx`
Structured whole + num/den entry; equivalence-aware grading lives in an exported pure fn.
```ts
interface FractionValue { whole?: number; num: number; den: number }
interface FractionEntryProps { band: AgeBand; allowWhole?: boolean; onSubmit: (v: FractionValue) => void; status?: AnswerStatus }
// export helper: fractionsEqual(a: FractionValue, b: FractionValue): boolean  // 6/4 === 1½ === 3/2
```

### `NumberLine` (default) — `src/components/teen/NumberLine.tsx`
Two-sided integer/rational line; read a marked point OR tap a tick to select.
```ts
interface NumberLineProps {
  band: AgeBand
  min: number; max: number; step?: number      // default 1
  mode: 'read' | 'select'
  marked?: number[]                            // points drawn (read mode)
  value?: number | null                        // current selection (select mode)
  status?: AnswerStatus
  onSelect?: (n: number) => void
}
```

### `FigureDiagram` (default) — `src/components/teen/FigureDiagram.tsx`
Read-only labelled geometry figure from templates; answers come via NumericEntry/ChoiceGrid.
```ts
type FigureKind = 'triangle' | 'right-triangle' | 'rectangle' | 'parallelogram' | 'circle' | 'prism' | 'cylinder'
interface FigureDiagramProps { band: AgeBand; kind: FigureKind; labels: Record<string, string | number>; highlight?: string }
```

### `StepSelect` (default) — `src/components/teen/StepSelect.tsx`
"Pick the next correct step/statement+reason" — replaces all drag-builders (equations + proofs).
```ts
interface StepSelectProps {
  band: AgeBand
  shown: { text: string; reason?: string }[]   // steps already locked in
  options: { text: string; reason?: string }[] // candidates for the NEXT step
  status?: AnswerStatus
  onPick: (index: number) => void
}
```

### `CoordGrid` (default) — `src/components/teen/CoordGrid.tsx`  ⟵ KEYSTONE (used by ~16 chapters)
One interactive grid → xy-plane / complex-plane / unit-circle. Curves & lines are RENDERED by the
app and selected via tap; tap a lattice point to plot/read. NO draggable curve, no focus-tap on empty
space. Ship a tap-only MVP first (plot/read lattice points + render given lines/points), then extend.
```ts
interface CoordLine { kind: 'line'; m: number; b: number }            // y = mx + b
interface CoordCurve { kind: 'curve'; fn: (x: number) => number }     // sampled & polylined
interface CoordGridProps {
  band: AgeBand
  xRange: [number, number]; yRange: [number, number]
  step?: number                          // grid spacing, default 1
  mode: 'plot' | 'read'                  // plot: learner taps a lattice point; read: identify a shown point
  points?: Pt[]                          // pre-plotted points (read mode / context)
  lines?: CoordLine[]; curves?: CoordCurve[]
  value?: Pt | null                      // learner's plotted point (plot mode)
  highlight?: Pt | null                  // feature to tap (vertex/intercept/intersection)
  status?: AnswerStatus
  variant?: 'xy' | 'complex' | 'unit-circle'   // relabels axes; default 'xy'
  onPlot?: (p: Pt) => void
}
```

---

## C. How a teen chapter composes the kit (mirror of the Arithmetic template)
A teen chapter = `src/components/lessons/<Name>TeenLesson.tsx` (worked examples via `TeenLessonShell`)
+ `src/components/game/<Name>Chapter.tsx` (practice via `useChapterPhase` + `useAdaptive`, prop
`{ onComplete, childName }`, calls `onComplete(correct, wrong)` at the end — the game page syncs).
The practice frame uses `BandScope` + `TeenTopbar` + the relevant input primitive + `ChoiceGrid` +
`StreakMarker`, and renders `MasteryState` on completion. Read `ada.difficulty` (L1/L2/L3) to pick
the question; call `ada.record(ok)` per answer. Voice via `speakSteps`/`speakSeq` (never fixed-timer
multi-line `speak()`).
