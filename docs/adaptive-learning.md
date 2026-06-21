# Milo's Adaptive Learning System

How Milo's Story Mode keeps every child in their "just-right" zone — never bored, never overwhelmed — in real time, with no visible levels, scores, or red X's.

---

## 1. Philosophy — "math without fear"

The whole system is built on two product rules:

1. **Invisible difficulty.** The child never sees a "level". The game quietly gets a little harder when they're doing well and a little easier when they're struggling. They just experience "the next question."
2. **Warm wrong answers.** A wrong answer is never punished. There is no red X, no buzzer, no losing. Milo says something kind, and after a few stumbles he simply **re-explains** and lets the child try again.

The result: the child always feels successful, while the difficulty silently tracks their actual ability.

---

## 2. The big picture

```
                 ┌─────────────────────────────────────────────┐
   each answer → │  useAdaptive(skill).record(correct)         │
                 │   • updates streak / wrong-streak / accuracy │
                 │   • recomputes difficulty (1 ⇄ 2 ⇄ 3)        │
                 │   • picks a praise / encouragement line      │
                 └───────────────┬─────────────────────────────┘
                                 │ difficulty (1|2|3)
                                 ▼
   next round →  make(difficulty, round)  →  numbers sized to that tier
                                 │
                                 ▼
   3 wrong in a row?  →  Milo RE-EXPLAINS (reteach), then retry
```

Two pieces of code implement this:

- **`src/lib/adaptive.ts`** — `useAdaptive()`, the engine. Tracks performance and decides the difficulty + the tone of Milo's voice.
- **`src/components/story/StoryWorld.tsx` → `SkillBeat`** — the round loop that calls `record()` after each answer, asks the engine for the next difficulty, and triggers the re-explanation.

Every chapter plugs into this by supplying a small **`Beat`** object (what a round looks like, how to play it, how Milo re-teaches it). Same engine, different skin.

---

## 3. The three difficulty tiers

| Tier | Label shown internally | Feel | Example (Counting "how many?") |
|---|---|---|---|
| **1** | Starter ⭐ | gentle | count **1–4** things |
| **2** | Getting there ⭐⭐ | medium | count **3–7** things |
| **3** | Champion ⭐⭐⭐ | stretch | count **5–10** things |

Every child **starts at Tier 1** each time they play. The tier is held in memory for that play session (it isn't saved between sessions — each session re-calibrates from a gentle start).

---

## 4. How the difficulty moves

After **every** answer, `record(correct)` recomputes the tier with these rules (`calcDifficulty` in `adaptive.ts`):

**Promote (get harder) — needs both:**
- **3 correct in a row** (a streak), **and**
- overall **accuracy ≥ 80%**,
- and not already at Tier 3.

**Demote (get easier) — needs either:**
- **2 wrong in a row**, **or**
- accuracy **< 40%** after at least 4 questions,
- and not already at Tier 1.

Otherwise the tier stays put.

This asymmetry is intentional: it takes a confident **streak** to move up, but only a **brief stumble** (2 in a row) to ease off — so a struggling child is rescued quickly, while moving up requires genuine mastery.

> **One continuous sequence.** All of this lives in React state inside a single `useAdaptive`/`SkillBeat` instance. A practice must be **one** `SkillBeat` of N rounds — if you split it into several beats, the streak and difficulty reset to zero at each split. (Both chapters run their full 10-question practice as one beat for exactly this reason.)

---

## 5. The re-explanation safety net (reteach)

Independently of the difficulty, the engine watches the **wrong-in-a-row** count. When the child gets **3 wrong in a row** (`reteachAfter`, default 2 but both story chapters set **3**), the round doesn't just move on — Milo **re-explains the concept**:

- **Counting:** Milo counts that exact quantity out loud, one by one.
- **Number Order:** Milo shows the numbers sliding into order, smallest → biggest.

After the re-explanation the wrong-streak resets and the child tries again. This is the moment the child gets *taught*, not tested — right when they need it. (`SkillBeat` `phase: 'reteach'` → the beat's `Reteach` component → `finishReteach`.)

---

## 6. Warm feedback that adapts

The engine also chooses **what Milo says**, scaled to how the child is doing (`PRAISE` / `ENCOURAGEMENT` / `ON_FIRE` pools in `adaptive.ts`):

- **Correct** → a praise line. At Tier 1 it's calm ("Nice!"), Tier 2 warmer ("Brilliant!"), Tier 3 excited ("Superstar! ⭐").
- **3+ correct in a row** (`isOnFire`) → a special hype line ("You're on fire! 🔥", "Three in a row!").
- **Wrong** → a gentle, never-blaming line ("Good try!", "Almost — you can do it!"). The on-screen feedback flash is also soft: "Let's look together! 🙂", never a red X.

So the *tone* of the game rises with the child's success and softens when they slip.

---

## 7. Struggle detection (hints)

`shouldHint` turns true when the child is having a hard time — **2+ wrong in a row**, or stuck at Tier 1 with **< 50% accuracy**. Chapters can use this flag to show an extra visual hint or take the pressure off. (Some lesson-style chapters surface a "💡 Take your time!" nudge; the story chapters keep it implicit.)

---

## 8. How a tier becomes actual question content

The difficulty number is just a dial — each chapter turns it into real numbers via shared **difficulty-aware generators** (bottom of `adaptive.ts`) or its own inline logic. Examples:

| Generator | Tier 1 | Tier 2 | Tier 3 | Used by |
|---|---|---|---|---|
| `countTarget` | 1–3 | 3–6 | 5–9 | counting-style |
| `seqLength` | 3 items | 4 items | 5 items | Number Order (how many stones) |
| `matchTarget` | 1–3 | 3–6 | 6–10 | Apple Basket |
| `addPair` | sum ≤ 6 | sum ≤ 10 | sum ≤ 14 | Addition |
| `subPair` | from 3–5 | from 5–8 | from 7–10 | Subtraction |
| `patternUnitLen` | AB | ABC | ABCD | Patterns |

The two story chapters in this build:

- **Counting** (`practiceCountBeat`, `world1.tsx`): how many to count = Tier 1 `1–4`, Tier 2 `3–7`, Tier 3 `5–10`.
- **Number Order** (`riverOrderBeat`, `RiverCrossing.tsx`): number of items to arrange = `seqLength` (3 → 5), and the *kind* of set also scales — easy tiers use a **consecutive run** (1·2·3·4·5, "pre-ordering"), harder tiers use **random distinct** numbers (4·5·8).

---

## 9. How it's wired into a chapter

A chapter never re-implements the pedagogy. It supplies a **`Beat<T>`** (interface in `StoryWorld.tsx`) and renders a `<SkillBeat>`:

```ts
interface Beat<T> {
  skillId: ChapterType                 // which skill (shares its adaptive state)
  rounds: number                       // e.g. 10
  reteachAfter?: number                // wrong-in-a-row to trigger re-explanation (story = 3)
  make: (d: Difficulty, round?) => T   // build this round's data at the current tier
  prompt / say                         // what's shown / spoken
  Play: FC<{ data; onSubmit(correct) }>    // the interactive question
  Reteach: FC<{ data; onDone }>            // how Milo re-explains it
}
```

`SkillBeat` then owns the loop, identically for every skill:

1. `make(difficulty, roundIdx)` builds the round's data at the **current** tier.
2. Child plays → `Play` calls `onSubmit(correct)`.
3. `ada.record(correct)` → new tier + new praise line; Milo speaks; soft feedback flashes (~1.3 s).
4. **3 wrong in a row?** → `Reteach` (re-explain), then continue.
5. Otherwise advance to the next round (optionally with a "Milo walks to the next place" interlude).
6. After `rounds`, report the `{correct, wrong}` tally → the chapter awards XP/coins/stars.

This is why the doc-comment calls `SkillBeat` *"the unbreakable pedagogy core"*: adaptive difficulty, warm wrong-answers, and in-story re-teaching are present in **every** scene by construction, no matter how the visuals change.

---

## 10. Worked example (one 10-question run)

A child playing **Number Order**:

| Q | Tier in | Result | Streak | Why the tier moved |
|---|---|---|---|---|
| 1 | 1 | ✓ | 1 | — |
| 2 | 1 | ✓ | 2 | — |
| 3 | 1 | ✓ | 3 | streak 3 + 100% acc → **promote to 2** |
| 4 | 2 | ✓ | 4 | — (would need streak ≥3 *and* the bigger numbers) |
| 5 | 2 | ✗ | 0 | warm line; streak resets |
| 6 | 2 | ✗ | 0 | **2 wrong in a row → demote to 1** |
| 7 | 1 | ✗ | 0 | **3rd wrong in a row → Milo re-explains**, then retry |
| 8 | 1 | ✓ | 1 | gentle Tier-1 numbers; confidence rebuilds |
| 9 | 1 | ✓ | 2 | — |
| 10 | 1 | ✓ | 3 | promote to 2 (but the practice ends) |

The child finishes having been pushed when strong, caught when wobbling, and *taught* (not failed) at their lowest point — exactly the "math without fear" goal.

---

## 11. Where it lives & key invariants

| File | Role |
|---|---|
| `src/lib/adaptive.ts` | `useAdaptive()` engine: tiers, promote/demote rules, praise pools, number generators |
| `src/components/story/StoryWorld.tsx` | `SkillBeat` + the `Beat<T>` interface — the round loop that drives the engine |
| `src/components/story/world1.tsx` | Counting's `practiceCountBeat` (the `Beat` for Chapter 1) |
| `src/components/story/RiverCrossing.tsx` | Number Order's `riverOrderBeat` (the `Beat` for Chapter 2) |
| `src/lib/store.ts` | `ChapterType` (the `skillId` values) |

**Invariants (don't break these):**
- One practice = **one `SkillBeat`**. Splitting resets difficulty + the wrong-streak.
- `make()` is called **once per round** and its result memoized — it must be stable for the whole round (it holds the random target the answer is checked against).
- Difficulty is read at the **start** of a round; a promotion/demotion from answer *k* applies to round *k+1*.
- Adaptive state is **per play session** (React state), not persisted. Only the correct/wrong **tally** is reported out, which drives XP/coins/stars via the chapter's `finishAndSync`.
