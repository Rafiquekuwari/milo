# Scaling roadmap — multi-age-group & more content

Goal: today the app is one age group with 11 chapters. Make the structure ready
for multiple age groups and a lot more content, so adding a chapter is cheap and
adding an age group is a config change — not a refactor.

## Why this is needed (current pain)
Adding one chapter today touches ~8 places:
`ChapterType` union (`src/lib/store.ts`), `ChapterStars` interface + `defaultChapterStars`,
`CHAPTER_ORDER` / `CHAPTER_NAMES` / `CHAPTER_EMOJIS` (store), a duplicated emoji map
(`src/app/menu/page.tsx`), `CH_LABELS` (`src/app/parent/page.tsx`), the dispatch in
`src/app/game/page.tsx`, the DB `chapter_type` enum, and `src/lib/adaptive.ts`.
There is **no age-group concept** — `learners.date_of_birth` exists but nothing scopes
content by it, so every learner sees all 11 chapters.

## Decisions (locked)
- **Age group:** explicit `age_group` column on the learner (set at setup; parent can
  override an advanced/behind child). DOB kept for analytics only.
- **Chapters:** reference table — retire the `chapter_type` enum; `learner_progress.chapter`
  and `sessions.chapter` become `text` + FK to `chapters(id)`. Adding a chapter = inserting
  a row, no schema migration.

---

## Tier 1 — Structural multipliers (before adding new content)

### 1. Single chapter registry (one source of truth)
- New `src/lib/chapters.ts`: array of `{ id, name, emoji, order, ageGroups: string[], adaptiveKey, component, lesson }`.
- Menu, ChapterPicker, parent dashboard, game dispatch, and ordering all derive from it.
- Removes the duplicated maps and the 11-line `game/page.tsx` dispatch.
- Code stays the source of truth for component/lesson wiring; the DB `chapters` table
  (item 3) holds the id/name/emoji/order/age-group rows for FK integrity + data-driven add.
- **Impact: ~8 edit sites → 1 per new chapter.** Highest ROI.

### 2. Age-group dimension
- Add `age_group` to `learners` (+ to the setup flow and parent dashboard).
- A curriculum map (age group → ordered chapter ids) — can live in the registry via
  each chapter's `ageGroups`, plus a per-group order.
- Menu shows only the active learner's age-group chapters.

### 3. Chapters as data (retire the enum)
- Create `chapters` table (id text PK, name, emoji, sort_order, age_groups text[]).
- Migrate `learner_progress.chapter` and `sessions.chapter` from `chapter_type` enum → text + FK.
- Update `sync_session` to accept text (drop the `::chapter_type` casts).
- Seed the table from the code registry (or a one-time seed script).

## Tier 2 — Make each new chapter cheap

### 4. Shared chapter engine
- Extract the repeated scaffolding (round loop, adaptive difficulty, feedback flash,
  remediation, GameTopbar, progress bar) into `useChapterEngine` + `<ChapterShell>`.
- New chapters become "content + a render function."
- Bonus: shared bugs (e.g. shuffle-on-render, answer-reveal) get fixed once, not per chapter.

### 5. Content/data separation
- Move per-chapter content (the `STORIES` arrays, themes, number ranges) out of the
  `.tsx` into data files (or DB), keyed by age group / difficulty.
- Lets you add questions and age variants without touching component code.

## Tier 3 — Consistency & safety net

### 6. Consistent naming
- Align file names with ids: `NumberDoorsChapter`→`numberRecognition`,
  `ShapeHouseChapter`→`shapes`, `ColorGardenChapter`→`colors`, `BiggerSmallerLesson`→`numberComparison`.

### 7. Progress keying for multi-track
- Decide whether progress/stats key by `chapter` alone or `(age_group, chapter)`.
- Safer to settle before age groups ship to avoid a backfill.

### 8. Content-validation script + smoke tests
- Script asserts every registry chapter has a component, a lesson, and a `chapters` row.
- Catches the "added a chapter, forgot an edit site" class of bug.

### 9. Asset namespacing
- Namespace `/public/assets` by age-group/chapter as the library grows.

---

## Suggested order
1 → 2 → 3 (foundation) → 4 → 5 (per-chapter cost) → 6–9 (polish).
