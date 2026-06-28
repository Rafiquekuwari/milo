# Teen Kit — Build Contract

> **Verified against the real code on 2026-06-28.** Every signature, prop name, import path, and
> `file:line` ref below was read from the actual source — not assumed. Where the framing assumed a
> token/name that does **not** exist, it is flagged in the **Corrections** section at the bottom.
>
> Stack: **Next.js 16.2.6** (breaking changes vs. older Next — read `node_modules/next/dist/docs/`
> before any framework-level code), **React 19.2.4**, **TypeScript 5**, plain CSS custom properties
> (NOT Tailwind for the app theme — Tailwind v4 is a dep but the design system is hand-rolled CSS
> variables in `globals.css`). Path alias: `@/* → ./src/*` (`tsconfig.json`).

---

## 1. Lesson kit — `src/components/lessons/_kit.tsx` (285 lines)

The shared scaffolding every animated *lesson* (the "watch then try" teaching phase) reuses. A new
lesson supplies a list of step render-functions + bubble text; the kit drives them.

### Exported API (all from `'@/components/lessons/_kit'` or `'../lessons/_kit'`)

| Export | Kind | Signature / shape | `file:line` |
|--------|------|-------------------|-------------|
| `numberToWords` | fn | `(n: number) => string` — spoken numbers 0–100, else `String(n)` | `_kit.tsx:22` |
| `singular`, `nounFor`, `countNoun` | re-export | from `@/lib/grammar` (see §8) | `_kit.tsx:33` |
| `CSS` | const string | shared `@keyframes` (`k_bounceIn`, `k_dropIn`, `k_flipIn`, `k_confetti`, `k_miloJump`, …). Inject via `<style>{CSS}</style>` | `_kit.tsx:36` |
| `Confetti` | component | `() => JSX` — absolute-positioned confetti burst | `_kit.tsx:53` |
| `SparkleAt` | component | `({x,y}:{x:number,y:number}) => JSX` | `_kit.tsx:67` |
| `CountBadge` | component | `({n,color}:{n:number,color:string}) => JSX` | `_kit.tsx:78` |
| `BigCount` | component | `({n}:{n:number\|string}) => JSX` — 60px orange numeral | `_kit.tsx:86` |
| `SectionBreak` | component | `({emoji,title,subtitle,onDone}:{emoji:string,title:string,subtitle:string,onDone:()=>void})` — self-running 2800ms timer, speaks `title. subtitle` | `_kit.tsx:93` |
| `cheerFor` | fn | `(step:number) => string` — rotating cheer string | `_kit.tsx:121` |
| `AdvancePopup` | component | `({onRetry,onNext,cheer}:{onRetry:()=>void,onNext:()=>void,cheer:string})` — full-screen portal Retry+Next popup | `_kit.tsx:123` |
| `ListeningHint` | component | `({show}:{show:boolean})` — "🎧 Listen to Milo…" | `_kit.tsx:141` |
| `LessonStep` | **type** | see below | `_kit.tsx:150` |
| `LessonScaffold` | **component** | the driver — see below | `_kit.tsx:211` |

> `Shell` (the back-bar + progress-dots + Milo bubble + canvas layout) and `StepHost` (the
> remount-to-replay host) are **NOT exported** — they are internal to `LessonScaffold`. You drive
> everything through `LessonScaffold`.

### `LessonStep` type — verbatim (`_kit.tsx:150`)

```ts
export type LessonStep = {
  bubble: string
  mood?: 'happy' | 'thinking' | 'celebrate'
  /** Call `onDone` when the step's animation/interaction is finished to unlock Next. */
  render: (onDone: () => void) => React.ReactNode
}
```

### `LessonScaffold` props — verbatim (`_kit.tsx:211`)

```ts
export function LessonScaffold({childName,onLessonComplete,steps,finalSpeech,chart}:{
  childName:string,onLessonComplete:()=>void,steps:LessonStep[],finalSpeech:string,
  /** Optional explore widget; when given, a 🔢 button in the header opens it. */
  chart?:React.ReactNode,
})
```

### How steps are defined and driven
- A lesson builds `const steps: LessonStep[] = [...]`. Each step's `render(onDone)` returns its
  visual; the step must call `onDone()` when its animation/speech finishes to unlock advancing.
- `LessonScaffold` holds `step` (index) + `nextReady` (bool). `onStepDone` is a **stable**
  `useCallback(()=>setNextReady(true),[])` so timer effects inside a step don't re-fire (`_kit.tsx:224`).
- **Watch vs. practice within a lesson is just a step convention, not a kit feature.** "Watch" steps
  render a self-running animated component (e.g. `EquationWatch`) that calls `onDone` when narration
  ends; "try" steps render an interactive component (e.g. `EquationAsk`) that calls `onDone` after a
  correct pick. The kit doesn't distinguish them — both are `LessonStep.render`.

### StepHost / remount-to-replay (`_kit.tsx:239,247,282`)
- The step is hosted as `<StepHost key={`${step}-${retry}`} render={cur.render} onDone={onStepDone}/>`.
- **Retry** (`retryStep`) does `stopSpeech(); setNextReady(false); setRetry(r=>r+1)`. Bumping `retry`
  changes the React `key`, so the step **fully remounts** → its mount effects (animation + speech)
  run again. This is the canonical "replay this slide" mechanism — rely on the `key` change, don't
  add internal replay state to a step.

### Advance / back / skip / self-paced reveal
- When `nextReady` flips true, `<AdvancePopup>` renders (a fixed portal over the slide) with Retry +
  Next; advancing past the last step speaks `finalSpeech` then calls `onLessonComplete` after 3200ms
  (`_kit.tsx:226-235`).
- **Back** (`← Menu`) opens a confirm modal (`confirmBack`) → "Yes, leave" `router.push('/menu')`.
- **Skip** (`Skip ▶`) → `stopSpeech(); onLessonComplete()` immediately (skips to practice).
- **Self-paced reveal:** a "watch" step controls its own pacing internally (see `EquationWatch`,
  §3) — typically `speakSeq`/`speakSteps` drives an `onWord`/`onStep` callback that reveals visuals,
  with a deliberate timer fallback when audio is blocked. The kit only gates Next on `onDone`.
- `chart` prop: when provided, a 🔢 header button opens a portal modal rendering `chart` (used for a
  number chart). Optional.

### Layout note (`Shell`, `_kit.tsx:158-208`)
- Root element has `className="milo-lesson"` and `minHeight:'100dvh'`. **This class is load-bearing**:
  `game/page.tsx`'s fit controller detects `.milo-lesson` and renders the lesson full-height WITHOUT
  zoom-scaling (practice chapters get `--game-zoom`). See §6.
- Milo art: `/assets/characters/milo-thinking.png` (mood `thinking`) else `/assets/characters/milo-happy.png`,
  with `onError` → `display:none`. Content is wrapped in `<ScaleToFill>` (`./ScaleToFill`).

---

## 2. Adaptive engine — `src/lib/adaptive.ts` (240 lines)

### Hook — `useAdaptive(chapter: ChapterType): AdaptiveState` (`adaptive.ts:106`)

`ChapterType` is imported from `'./store'` (which re-exports from `'./chapters'`).

### Return shape — `AdaptiveState` verbatim (`adaptive.ts:28`)

```ts
export type Difficulty = 1 | 2 | 3

export interface AdaptiveState {
  difficulty:     Difficulty
  streak:         number      // consecutive correct answers
  sessionCorrect: number
  sessionWrong:   number
  shouldHint:     boolean     // true when child is struggling
  isOnFire:       boolean     // 3+ correct in a row
  praise:         string
  encouragement:  string
  record:         (correct: boolean) => void
  difficultyLabel: string
}
```

### Thresholds (`adaptive.ts:72-90, 145`)
- **Promote** (`difficulty +1`, capped at 3): `streak >= 3 && accuracy >= 0.8`.
- **Demote** (`difficulty -1`, floored at 1): `wrongStreak >= 2 || (total >= 4 && accuracy < 0.4)`.
- **shouldHint** = `wrongStreak >= 2 || (difficulty === 1 && total >= 2 && correct/total < 0.5)`.
- **isOnFire** = `streak >= 3`.
- `difficultyLabel`: 1 `'Starter ⭐'`, 2 `'Getting there ⭐⭐'`, 3 `'Champion ⭐⭐⭐'`.
- Internally driven off a **ref snapshot** (`ref.current`) so rapid taps in one tick don't corrupt
  promote/demote — `record()` is a stable `useCallback`. (This was the June-28 stale-closure fix.)

### Wiring on an answer — the exact call sequence (from `ArithmeticChapter.handleAnswer`, `ArithmeticChapter.tsx:68-84`)

```ts
const ok = choice === round.answer
setSelected(choice); setFeedback(ok ? 'correct' : 'wrong')
ada.record(ok)                                   // ← tell the engine FIRST
if (ok) { setCorrect(c => c + 1); speakAt(`Yes! …! ${ada.praise}`, answerRef.current) }
else    { setWrong(w => w + 1);   speakAt(`It's …. ${ada.encouragement}`, answerRef.current) }
afterSpeech(() => { /* advance to next round, or onComplete(...) on the last */ })
```
Then the **next** round reads `ada.difficulty` to generate its numbers (`makeRound(op, ada.difficulty)`),
and renders `ada.shouldHint` / `<DifficultyBadge difficulty={ada.difficulty} isOnFire={ada.isOnFire}/>`.

### Difficulty-aware number generators (also exported, `adaptive.ts:176-240`)
`countTarget`, `patternUnitLen`, `matchTarget`, `addPair`, `subPair`, `seqStart`, `seqLength` — each
`(difficulty: Difficulty) => number | [number,number]`. Reuse or add new ones here for teen content.

---

## 3. End-to-end reference chapter — **Arithmetic (6–8, add/subtract to 100)**

This is the cleanest "kit + adaptive + parameterized + two thin wrappers" template. Mirror it.

### Files & line counts
- **Lesson:** `src/components/lessons/ArithmeticLesson.tsx` — **152 lines**.
- **Practice chapter:** `src/components/game/ArithmeticChapter.tsx` — **190 lines**.
- One component (`ArithmeticChapter`) parameterized by `op: '+' | '-'`; two thin named exports
  (`AdditionTo100Chapter`, `SubtractionTo100Chapter`) wrap it (`ArithmeticChapter.tsx:171-176`).

### Lesson structure (`ArithmeticLesson.tsx`)
```ts
import { LessonScaffold, Confetti, numberToWords, type LessonStep } from './_kit'
import { speak, speakSeq } from '@/lib/useMiloSpeaker'

// builds steps: LessonStep[] — 5 "watch" (EquationWatch) + 3 "ask" (EquationAsk)
return (
  <LessonScaffold childName={childName} onLessonComplete={onLessonComplete} steps={steps}
    finalSpeech={`Great work, ${childName}! …`} />
)
```
- Exports reusable pieces for the practice chapter + its re-teach: `Equation`, `BlockMath`,
  `EquationWatch`, `EquationAsk`, `buildArithChoices`, `applyOp`, `type Op` (`ArithmeticLesson.tsx:16-121`).
- `EquationWatch` uses `speakSeq([...], { onWord, onDone })` to reveal the answer mid-narration then
  `onDone` after a 1300ms tail — the self-paced reveal pattern (`ArithmeticLesson.tsx:64-84`).

### Practice chapter structure (`ArithmeticChapter.tsx`) — the composition recipe
```ts
import { useMiloSpeaker, afterSpeech, speakAfterCurrent, speakAt } from '@/lib/useMiloSpeaker'
import { useAdaptive } from '@/lib/adaptive'
import { DifficultyBadge } from '../ui/DifficultyBadge'
import { useChapterPhase } from '@/lib/useChapterPhase'
import SpeakingLock from '@/components/ui/SpeakingLock'
import GameTopbar from '../ui/GameTopbar'
import { numberToWords, CSS as KIT_CSS } from '../lessons/_kit'
import ArithmeticLesson, { BlockMath, EquationWatch, EquationAsk, buildArithChoices, applyOp, type Op } from '../lessons/ArithmeticLesson'

interface Props { onComplete: (c: number, w: number) => void; childName: string }   // ← REQUIRED chapter prop shape

const TOTAL_ROUNDS = 10
function ArithmeticChapter({ op, chapterId, title, onComplete, childName }: GenProps) {
  const { phase, startPractice } = useChapterPhase()      // 'lesson' | 'practice'
  const { speak } = useMiloSpeaker()
  const ada = useAdaptive(chapterId)
  // ... round state ...
  if (phase === 'lesson') return <ArithmeticLesson op={op} childName={childName} onLessonComplete={startPractice} />
  return ( /* practice UI: GameTopbar + DifficultyBadge + scene + choices */ )
}
```

Key composition points:
1. **Prop contract:** the component dispatched by the game MUST accept
   `{ onComplete: (correct: number, wrong: number) => void; childName: string }`. This is the
   `ChapterProps` type the game enforces (§6).
2. **Phase:** `useChapterPhase()` returns `{ phase, startPractice }`. Render the `<XxxLesson … onLessonComplete={startPractice}/>` when `phase==='lesson'`; render practice otherwise.
3. **Adaptive:** `const ada = useAdaptive(chapterId)`; call `ada.record(ok)` per answer; read
   `ada.difficulty` to generate the next round.
4. **Voice:** `speakAfterCurrent` for the question, `speakAt(text, el)` for feedback (points Milo's
   hand), `afterSpeech(cb)` to advance once speech ends. `<SpeakingLock />` blocks taps while talking.
5. **Topbar:** `<GameTopbar chapterName={title} roundIdx={roundIdx} totalRounds={TOTAL_ROUNDS} />`.
6. **Completion:** call `onComplete(correctCount, wrongCount)` on the last round. **The chapter does
   NOT call `finishAndSync` itself** — `game/page.tsx` wires `onComplete → handleComplete →
   finishAndSync(chapter, correct, wrong, 'practice')` with a double-fire guard (`game/page.tsx:152-160`).

### The OTHER pattern — story-mode wrappers (3–5, `createPortal`)
The 3–5 "story" chapters use a different, thinner shape (e.g. `PatternsChapter.tsx`, 40 lines): a
component that `createPortal`s a full-screen story component and calls `finishAndSync('patterns', …)`
**itself** plus renders its own `<CelebrationModal>`. **For the teen bands, mirror the Arithmetic
template (kit + adaptive + `onComplete`), not the story-portal one** — unless a teen chapter is a
bespoke story-world.

---

## 4. CSS design tokens — `src/app/globals.css` (690 lines)

Tokens live in a single `:root` block (`globals.css:18-121`). **Theming is currently flat — there is
NO dark mode, NO `[data-theme]`/`[data-band]` scope, NO `prefers-color-scheme` anywhere.** Components
read raw `var(--token)` values directly in inline styles.

### Corrections to the assumed token names (CRITICAL)
| Assumed | Real? | Real equivalent |
|---------|-------|-----------------|
| `--bg-page` | ✅ **real** | `--bg-page: #FCEAB6` (`globals.css:59`) |
| `--paper` | ✅ **real** | `--paper: #FFF8EC` (`globals.css:44`) |
| `--ink` | ✅ **real** | `--ink: #3D2516` (`globals.css:47`) |
| `--milo-orange` | ✅ **real** | `--milo-orange: #F26B2C` (`globals.css:20`) |
| `--garden-green` | ✅ **real** | `--garden-green: #6FBE3F` (`globals.css:28`) |
| `--apple-red` | ✅ **real** | `--apple-red: #E64545` (`globals.css:36`) |
| `--font-numeric` | ✅ **real** | `--font-numeric: 'Fredoka', system-ui, sans-serif` (`globals.css:69`) |

**All seven assumed names are real.** Note the families used everywhere in components are actually
`--font-display` (`'Fredoka'…`) and `--font-body` (`'Nunito'…`) — `--font-numeric` exists but is
rarely used in code (components use `--font-display` for numerals). There is **no `--ink-deep`**; the
darker ink ramp is `--ink` → `--ink-soft` (`#6F4E36`) → `--ink-muted` (`#A0856E`), plus `--outline`
(`#2A1A0F`) for borders. Soft/deep variants exist for each brand colour
(`--milo-orange-deep/-soft`, `--garden-green-deep/-soft`, `--apple-red-deep/-soft`, etc.).

### `:root` token block — verbatim (`globals.css:18-121`)

```css
:root {
  /* Brand colors */
  --milo-orange:        #F26B2C;
  --milo-orange-deep:   #C84F1A;
  --milo-orange-soft:   #FFD9B8;

  --sun-yellow:         #FFC933;
  --sun-yellow-deep:    #E0A800;
  --sun-yellow-soft:    #FFF1B8;

  --garden-green:       #6FBE3F;
  --garden-green-deep:  #4A8F20;
  --garden-green-soft:  #D6F0BD;

  --sky-blue:           #5BC3F0;
  --sky-blue-deep:      #2A8AB5;
  --sky-blue-soft:      #CFEFFB;

  --apple-red:          #E64545;
  --apple-red-deep:     #B02323;
  --apple-red-soft:     #FFD2D2;

  --berry-purple:       #9362D8;
  --berry-purple-deep:  #6B3DAA;

  /* Neutrals */
  --paper:              #FFF8EC;
  --paper-soft:         #FFFEFA;
  --cream:              #FFEFC9;
  --ink:                #3D2516;
  --ink-soft:           #6F4E36;
  --ink-muted:          #A0856E;
  --outline:            #2A1A0F;

  /* Semantic fg/bg */
  --fg-1:               var(--ink);
  --fg-2:               var(--ink-soft);
  --fg-3:               var(--ink-muted);
  --fg-on-color:        #FFFEFA;
  --bg-1:               var(--paper);
  --bg-2:               #FFF1D6;
  --bg-page:            #FCEAB6;

  --success:            var(--garden-green);
  --warning:            var(--sun-yellow-deep);
  --danger:             var(--apple-red);
  --info:               var(--sky-blue);

  /* Typography */
  --font-display:       'Fredoka', 'Baloo 2', 'Quicksand', system-ui, sans-serif;
  --font-body:          'Nunito', 'Fredoka', system-ui, sans-serif;
  --font-numeric:       'Fredoka', system-ui, sans-serif;

  --t-display:          84px;
  --t-h1:               44px;
  --t-h2:               32px;
  --t-h3:               24px;
  --t-body-lg:          22px;
  --t-body:             18px;
  --t-label:            16px;
  --t-tiny:             14px;

  --w-regular:          600;
  --w-bold:             700;
  --w-heavy:            800;
  --w-black:            900;

  --ls-tight:           -0.01em;
  --ls-normal:          0em;
  --ls-loose:           0.02em;

  /* Spacing */
  --s-1: 4px;  --s-2: 8px;  --s-3: 12px; --s-4: 16px;
  --s-5: 24px; --s-6: 32px; --s-7: 48px; --s-8: 64px;

  /* Radii */
  --r-sm:   12px;  --r-md:   18px;  --r-lg:   28px;  --r-xl:   40px;
  --r-pill: 999px; --r-blob: 36% 64% 60% 40% / 50% 40% 60% 50%;

  /* Borders */
  --bw-thin:   2px; --bw-md:     3px; --bw-thick:  4px; --bw-stroke: 5px;
  --b-color:   var(--outline);

  /* Shadows */ --sh-soft / --sh-card / --sh-press / --sh-pop / --sh-stack ...
  /* Motion */  --ease-bounce / --ease-smooth / --dur-fast(160ms)/--dur-med(300ms)/--dur-slow(450ms)
}
```

### Does a `[data-band]` token-remap scope work with the architecture? — **YES, with two caveats.**
1. Components read `var(--token)` at use-time, so adding `html[data-band="teen"] { --milo-orange:
   …; --bg-page: …; --font-display: … }` **will cascade** and re-skin everything automatically. This
   is the right approach.
2. **Caveat A — set `data-band` early.** `layout.tsx` renders `<html lang="en">` (`layout.tsx:39`)
   with no scope attribute. You'll need to set `data-band` on `<html>` (or a wrapper) based on the
   active learner's `age_group`. The active learner is in `sessionStorage` / via `getActiveLearner()`
   — so the band attribute must be applied client-side after the learner resolves (a small effect or
   a `StorageGate`-level hook), since `age_group` isn't known at SSR.
3. **Caveat B — hard-coded hex still exists.** Many components inline literal hex/rgba in JS styles
   (e.g. `#c8ac79` for button stripes in `ArithmeticChapter.tsx:128`, `rgba(61,37,22,…)` shadows
   everywhere, the `.kit-scene` gradient in `globals.css:470`). A pure token remap re-skins the
   token-driven parts but **NOT** these literals. For a clean teen theme, either (a) accept the
   warm-brown literals bleeding through, or (b) introduce tokens for them first.

---

## 5. Chapter registry — `src/lib/chapters.ts` (120 lines)

DATA-only module (no React imports). Single source of truth for chapter lists/metadata.

### `AgeGroup` & `ChapterType` — verbatim (`chapters.ts:18-29`)
```ts
export type AgeGroup = '3-5' | '6-8' | '9-11'

export type ChapterType =
  // 3–5
  | 'counting' | 'numberOrdering' | 'numberRecognition'
  | 'matchingQuantities' | 'numberComparison' | 'shapes'
  | 'colors' | 'patterns' | 'addition' | 'subtraction' | 'measurement'
  // 6–8
  | 'numbersTo100' | 'placeValue' | 'skipCounting' | 'storyProblems' | 'multiplication' | 'fractions' | 'money' | 'time'
  | 'compareNumbers' | 'additionTo100' | 'subtractionTo100' | 'shapes2d3d'
  // 9–11
  | 'bigNumbers' | 'rounding' | 'timesTables' | 'division' | 'factorsMultiples' | 'fractionsCompare' | 'decimals' | 'measurementUnits' | 'areaPerimeter' | 'anglesSymmetry' | 'dataGraphs' | 'wordProblems'
```

### `ChapterMeta` — verbatim (`chapters.ts:31-39`)
```ts
export interface ChapterMeta {
  id:          ChapterType
  name:        string        // full display name (menu + picker)
  parentLabel: string        // shorter label for the parent dashboard
  emoji:       string        // chapter icon
  asset:       string        // image on the menu "next up" card
  hint:        string        // one-line hint in the chapter picker
  ageGroups:   AgeGroup[]    // which age groups this chapter belongs to
}
```

### CHAPTERS array entry shape (`chapters.ts:46`)
```ts
{ id: 'counting', name: 'Counting', parentLabel: 'Counting', emoji: '🌟',
  asset: '/assets/objects/firefly.png', hint: 'Tap each one to count!', ageGroups: ['3-5'] },
```
Array order **is** play order. (`AgeGroup` already includes `'3-5' | '6-8' | '9-11'`.)

### Exported lookups/helpers (`chapters.ts:88-119`)
- `CHAPTERS: ChapterMeta[]` — the ordered list.
- `CHAPTER_IDS: ChapterType[]` = `CHAPTERS.map(c=>c.id)`.
- `getChapter(id: ChapterType): ChapterMeta`.
- `chaptersForAge(age: AgeGroup): ChapterMeta[]` — filtered + in play order.
- Back-compat derived maps: `CHAPTER_ORDER` (=`CHAPTER_IDS`), `CHAPTER_NAMES`, `CHAPTER_EMOJIS`,
  `CHAPTER_ASSETS`, `CHAPTER_PARENT_LABELS` (all `Record<ChapterType, …>`).

### Steps to add a NEW age band + chapter ids — exact order
1. **`src/lib/chapters.ts`** —
   (a) widen `AgeGroup` union (e.g. add `| '12-14'`);
   (b) add each new id to the `ChapterType` union;
   (c) append `ChapterMeta` entries to `CHAPTERS` (order = play order), tagging `ageGroups`.
   This auto-extends every derived map AND `ChapterStars`/`defaultChapterStars` in `store.ts`
   (keyed off `CHAPTER_IDS`), so star/XP storage is covered automatically.
2. **`src/app/game/page.tsx`** — add one line per new id to `CHAPTER_COMPONENTS` (§6). The
   `Record<ChapterType, …>` makes TS fail the build until every id is wired — that's your checklist.
3. **Build each chapter's lesson + practice component** (mirror §3) — `src/components/lessons/Xxx.tsx`
   + `src/components/game/XxxChapter.tsx`.
4. **DB** (§7): a `widen_age_group` migration (CHECK constraint) for the new band + one
   `seed_chapter_*` migration per new id (FK target).
5. Anywhere that enumerates age groups for UI (menu / age picker / parent dashboard) — grep for the
   `AgeGroup` literal usages and add the new band to those lists.

---

## 6. Game dispatch — `src/app/game/page.tsx` (190 lines)

### The map + lazy pattern (`game/page.tsx:18-59`)
```ts
type ChapterProps = { onComplete: (correct: number, wrong: number) => void; childName: string }
const lazyChapter = (loader: () => Promise<{ default: React.ComponentType<ChapterProps> }>) =>
  nextDynamic(loader, { ssr: false })          // ← `import nextDynamic from 'next/dynamic'`

const CHAPTER_COMPONENTS: Record<ChapterType, React.ComponentType<ChapterProps>> = {
  // … one line per chapter id …
  additionTo100:    lazyChapter(() => import('@/components/game/ArithmeticChapter').then(m => ({ default: m.AdditionTo100Chapter }))),
  subtractionTo100: lazyChapter(() => import('@/components/game/ArithmeticChapter').then(m => ({ default: m.SubtractionTo100Chapter }))),
  shapes2d3d:       lazyChapter(() => import('@/components/game/Shapes2D3DChapter')),
  // …
}
```
- **Default export** chapter → `lazyChapter(() => import('@/components/game/XxxChapter'))`.
- **Named export** chapter (parameterized, like Arithmetic) → `lazyChapter(() =>
  import('…').then(m => ({ default: m.NamedExport })))`.
- `Record<ChapterType, …>` enforces completeness — adding a `ChapterType` member without a map entry
  is a TS error (your safety net).
- Dispatch renders `<Chapter {...props}/>` with `props = { onComplete: handleComplete, childName }`
  inside `<Suspense fallback={null}>` (`game/page.tsx:166-181`). `handleComplete` calls
  `finishAndSync(playingChapter, correct, wrong, 'practice')` with a `completedRef` double-fire guard.
- **Zoom/fit:** the wrapper sets `--game-zoom` on `.game-zoom`; `.milo-lesson` roots are exempted
  from zoom (full-height), practice roots are scaled up to fit. (`game/page.tsx:86-122`, CSS
  `globals.css:670-677`.) → Keep practice chapter roots content-sized; keep lesson roots
  `className="milo-lesson"` + `100dvh` (the kit already does this).

---

## 7. DB / migrations — `supabase/migrations/`

### Schema: `public.chapters` reference table (`20260616093000_chapters_as_data.sql`)
```sql
create table if not exists public.chapters (
  id          text   primary key,
  name        text   not null,
  emoji       text   not null,
  sort_order  int    not null,
  age_groups  text[] not null default '{}'
);
```
`sessions.chapter` and `learner_progress.chapter` are `text` with FK → `chapters(id)`. So **a new
chapter id MUST have a seed row before any session for it can be saved** (FK integrity), and the
client-side `chapterId` string must exactly match `chapters.id`.

### Seed-a-chapter migration — real example (`20260616100000_seed_chapter_numbers_to_100.sql`, verbatim)
```sql
-- 6–8 chapter #1: Numbers to 100. Row mirrors the code registry so progress
-- (sessions / learner_progress, FK → chapters.id) can be saved for it.
insert into public.chapters (id, name, emoji, sort_order, age_groups) values
  ('numbersTo100', 'Numbers to 100', '💯', 12, array['6-8'])
on conflict (id) do update set
  name = excluded.name, emoji = excluded.emoji,
  sort_order = excluded.sort_order, age_groups = excluded.age_groups;
```
- Filename convention: `YYYYMMDDHHMMSS_seed_chapter_<snake_name>.sql`.
- Always `on conflict (id) do update set …` (idempotent / re-runnable).
- Multiple ids can be seeded in one migration (see `20260616180000_seed_chapters_6_8_extend.sql`).

### Widen `learners.age_group` CHECK — real example (`20260617120000_widen_age_group_9_11.sql`, verbatim)
```sql
-- Widen the learners.age_group check to allow the new 9–11 age group.
alter table public.learners drop constraint if exists learners_age_group_check;
alter table public.learners
  add constraint learners_age_group_check check (age_group in ('3-5','6-8','9-11'));
```
> For a new band, drop + re-add the constraint with the full set, e.g.
> `check (age_group in ('3-5','6-8','9-11','12-14'))`. Note `chapters.age_groups` is `text[]` with
> **no** CHECK — only `learners.age_group` is constrained, so the band string is validated only on
> the learner row.

### Current state (verified)
- **`learners.age_group` CHECK allowed values:** `'3-5'`, `'6-8'`, `'9-11'` (last set by the
  20260617120000 migration). Column default is `'3-5'`.
- **Max `sort_order` in the chapters seed:** **35** (`wordProblems`, the last 9–11 chapter,
  `20260617240000_seed_chapter_word_problems.sql`). New chapters should use `sort_order >= 36`.
- The server RPC `sync_session(p_chapter text, …)` (defined in `20260616093000…`) trusts the
  client-supplied stars/xp/coins and inserts into `sessions` + upserts `learner_progress` +
  `learner_stats`. No per-chapter logic — adding chapters needs only a seed row.

---

## 8. Voice + sync + scoring + grammar — import paths & signatures

### Voice — `'@/lib/useMiloSpeaker'` (`src/lib/useMiloSpeaker.ts`, 375 lines)
| Export | Signature | line |
|--------|-----------|------|
| `speak` | `(text: string, rate=0.88, pitch=1.05) => void` | `:172` |
| `speakAt` | `(text, target: HTMLElement\|null, rate?, pitch?) => void` — speaks + points Milo's hand | `:181` |
| `speakAfterCurrent` | `(text, rate?, pitch?) => void` — queues after current line | `:186` |
| `replayLast` | `() => void` | `:195` |
| `unlockSpeech` | `() => void` — call from a tap handler to unlock TTS on mobile | `:210` |
| `stopSpeech` | `() => void` | `:219` |
| `afterSpeech` | `(cb: () => void) => void` — run cb when speech ends (or now) | `:229` |
| `speakSeq` | `(words: string[], { onWord?(i), onDone?(), rate?, pitch? }) => () => void` (returns cancel; strictly sequential) | `:243` |
| `speakSteps` | `(lines: string[], { onStep?(i), onDone?(), fallbackStepMs=1400, rate?, pitch? }) => () => void` — **the right way to narrate a multi-line demo** (blocked-audio-safe timer fallback) | `:309` |
| `useIsSpeaking` | `() => boolean` | `:348` |
| `useIsBlocked` | `() => boolean` | `:356` |
| `useMiloSpeaker` | `(opts?:{rate?,pitch?}) => { speak:(t)=>void, stop:()=>void }` | `:364` |

**Voice convention (from handoff/auto-memory):** short-word LISTS (showcases) → self-paced fixed
timer + `speak()` per word; SENTENCE demos → `speakSteps` (or `speakSeq`). **Never** fixed-timer
multi-line `speak()` — a later `speak()` cancels the prior line mid-sentence.

### Sync — `'@/lib/supabase/useChapterSync'` (`useChapterSync.ts`)
```ts
const { finishAndSync, flushQueue } = useChapterSync()
finishAndSync(chapter: ChapterType, correct: number, wrong: number,
              phase: 'lesson' | 'practice' = 'practice'): Promise<void>
```
It (1) calls `store.finishChapter` (updates local profile + sets `celebration`, returns the score),
(2) builds the payload, (3) `syncSession` online or `enqueueSession` offline (retry-queues only
transient failures). **Practice chapters dispatched by `game/page.tsx` should NOT call this
directly** — the page does (with a double-fire guard). Story-portal wrappers call it themselves.

### Scoring — `'@/lib/scoring'` (`scoring.ts`)
```ts
calcStars(correct: number, wrong: number): number   // pct≥0.85→3, ≥0.6→2, else 1; total 0→1
calcXP(stars: number, correct: number): number      // stars*50 + correct*10
calcCoins(stars: number): number                    // stars*5
interface ChapterScore { stars: number; xp: number; coins: number }
scoreChapter(correct: number, wrong: number): ChapterScore
```
Authoritative formula (the server RPC trusts the client value). `store.finishChapter` uses it.

### Grammar — `'@/lib/grammar'` (also re-exported from `_kit`) (`grammar.ts`)
```ts
singular(plural: string): string            // apples→apple, bunnies→bunny, foxes→fox; IRREGULAR map for cookies/brownies/movies
nounFor(n: number, pluralNoun: string): string   // singular when n===1
countNoun(n: number, pluralNoun: string): string // "3 apples" / "1 apple"
```

### Supporting UI components (used by practice chapters)
- `GameTopbar` (default) — `src/components/ui/GameTopbar.tsx`:
  `{ chapterName: string; roundIdx: number; totalRounds: number; starsEarned?: number; onBack?: () => void }`.
- `DifficultyBadge` (named) — `src/components/ui/DifficultyBadge.tsx`:
  `{ difficulty: Difficulty; isOnFire: boolean }`.
- `SpeakingLock` (default) — `@/components/ui/SpeakingLock` (renders a tap-blocker while Milo talks).
- `CelebrationModal` (default) — `@/components/ui/CelebrationModal`:
  `{ onPlayAgain?: () => void; onExit?: () => void; exitLabel?; hideNext? }` (props all optional).
- `useChapterPhase` — `@/lib/useChapterPhase`: `() => { phase: 'lesson'|'practice'; startPractice: () => void }`.
- `TensOnes` (named) — `src/components/lessons/Numbers100Lesson.tsx`:
  `{ n: number; revealTens: number; revealOnes: number }` (base-ten block view, reused by Arithmetic).

---

## 9. Fonts

- **Loaded via CSS `@import` from Google Fonts**, NOT `next/font`:
  `globals.css:10` →
  `@import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@600;700;800;900&display=swap');`
- Wired to tokens: `--font-display: 'Fredoka', …`, `--font-body: 'Nunito', …`,
  `--font-numeric: 'Fredoka', …` (`globals.css:67-69`).
- `layout.tsx` does **not** import any font; it only renders `<html><body>` + metadata/SW script.
- **Where to add IBM Plex Sans + IBM Plex Mono:** add them to the Google Fonts `@import` in
  `globals.css:10` (e.g. `&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600`),
  then either (a) point the teen `[data-band="teen"]` scope's `--font-display`/`--font-body`/
  `--font-numeric` at them (recommended — keeps the band-remap approach), or (b) swap the `:root`
  values if going global. (Switching to `next/font` is possible but would be a larger change — the
  whole app reads families through the three CSS tokens, so a token remap is the lighter path.)

---

## 10. Build / verify

- **No `typecheck`/`tsc` script exists** in `package.json`. Scripts are exactly:
  ```json
  "dev":   "next dev",
  "build": "next build",
  "start": "next start",
  "lint":  "eslint"
  ```
  `tsc` **is** installed (`node_modules/.bin/tsc`), so the per-chapter convention is run manually:
  **`npx tsc --noEmit`** between chapters (fast type-only gate), then a full **`next build`** at the
  end. (Consider adding `"typecheck": "tsc --noEmit"` to scripts if you want it standardized — not
  present today.)
- **`next build` does NOT gate on ESLint** (documented convention). The wrapper
  `setBody(document.body)` "set-state-in-effect" eslint error is accepted (it's in every shipped
  story wrapper).

### Known gotchas (from `AGENTS.md` / `CLAUDE.md` / `handoff.md` / auto-memory)
1. **This is Next.js 16 with breaking changes** — read `node_modules/next/dist/docs/` before any
   framework code. Notable: `middleware` → `proxy` rename; the dead middleware auth guard was removed
   (sessions live in localStorage, not cookies).
2. **No commit/push/deploy unless explicitly asked.** (Standing rule.)
3. **New story chapter (3–5 style)** = mirror ShapeTown/RainbowTown: intro→demo→guided→practice, ONE
   adaptive `SkillBeat`, fixed-position bands (an `absolute inset:0` stage collapses because SkillBeat
   stacks its own prompt button), code-drawn with optional `<img>`/sprite upgrade hooks, Milo
   bottom-left. **For teen kit chapters, mirror the Arithmetic kit template instead** (§3).
4. **Viewport scaling:** never hard-code sprite px on a 100vw stage — use a scale hook; verify at
   ~1900px. (`feedback-viewport-scaling` memory.)
5. **Recolorable objects:** greyscale sprite + code-tint, don't bake colour into PNGs.
6. Lesson root MUST keep `className="milo-lesson"` (the fit controller keys off it; §6).
7. `onComplete` can double-fire (double-tap / re-render) — the game page guards it (`completedRef`),
   but bespoke wrappers must guard their own (`doneRef`, as `PatternsChapter` does).

---

## Quick "new teen chapter" checklist
1. `chapters.ts`: widen `AgeGroup` (new band) · add ids to `ChapterType` · append `ChapterMeta` entries.
2. Build `src/components/lessons/<Name>Lesson.tsx` (`LessonScaffold` + `LessonStep[]`).
3. Build `src/components/game/<Name>Chapter.tsx` (`useChapterPhase` + `useAdaptive` + `GameTopbar`;
   prop `{ onComplete, childName }`; call `onComplete(correct, wrong)` at the end; do NOT call
   `finishAndSync`).
4. `src/app/game/page.tsx`: add the `CHAPTER_COMPONENTS` line (default- or named-export form).
5. Migrations: widen `learners.age_group` CHECK + one `seed_chapter_*` row per id (`sort_order >= 36`).
6. Teen theme: add IBM Plex to the `globals.css` `@import`; add `html[data-band="teen"] { … }` token
   remap; set `data-band` client-side from the active learner's `age_group`.
7. `npx tsc --noEmit` after each chapter; `next build` at the end.
```
