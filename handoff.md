# Session Handoff — Milo Story Mode (Chapters 1–7)

_Last updated: 2026-06-27_

**Current state (2026-06-27):** SEVEN 3–5 skills are now story chapters — Ch.1 Counting (`ForestWalk`) · Ch.2 Number Order (`RiverCrossing`) · Ch.3 Number Comparison (`Kitchen`) · Ch.4 Number Recognition (`NumberDoors`) · Ch.5 Matching Quantities (`Grocery`) · Ch.6 Shapes (`ShapeTown`) · **Ch.7 Colours (`RainbowTown`)**. Ch.1–6 are committed + deployed to production (**www.mi2utor.com** / **milo-story-mode.vercel.app**) — last deployed: `d2c8598` (Ch.6 Shape Town + art) on top of `abfce36` (explanation voice-overlap fix, Ch.3–6). **Uncommitted in the working tree** (NOT pushed): 3 architecture-audit refactors (scoring extract / chapter code-split / AR `close()` leak) + 2 non-AR Tier-0 fixes (adaptive stale-closure, dead middleware removed) + **Ch.7 Rainbow Town**. Newest-first session logs follow. (The TL;DR below is the original Ch.3-session snapshot, kept for history.)

---

## Session 2026-06-28 (latest) — Explanation "goes fast" REAL fix: self-paced showcase ✅ (uncommitted)

The earlier `speakSteps` fallback fix (below) did NOT resolve it — user: "still that thing is happening." Ran a 5-lens diagnostic workflow (`diagnose-explanation-fast`). **Converged root cause:** the showcase's reveal + phase-advance were driven ENTIRELY by speech events (`onstart`/`onend`) with **no minimum dwell**. The showcase narrates **single short words** ("red", "circle") — on a real device those fire `onend` in ~300ms, so `speakSeq` advanced line→line in a fast cascade and `onDone` fired early, flashing the items and jumping to the next phase. Because `onstart` DID fire, `started` flipped true, which **suppressed** the fallback fix — so it never helped.

- **Real fix — self-paced showcases.** Rewrote `ColorShowcase` (RainbowTown) + `ShapeShowcase` (ShapeTown) to a **deterministic timer**: each item reveals + is named with a fixed `SHOWCASE_DWELL=1500ms` (intro line first, 2000ms before the first item), `onDone` after the last + 600ms. Speech is layered on top (one short word per item — the documented "counting" exception where fixed-timer `speak()` is safe, short words + generous gaps). The visuals NO LONGER depend on speech timing → they can't race even if `onend` is instant or audio is blocked (then it's silent but still deliberate + complete). The find-it DEMO keeps `speakSteps` (its lines are full SENTENCES, which don't have the short-word race).
- **Verified** (headless = the racing-prone path): both showcases now step a clean ~1.5s/item and complete all 6 before advancing — Rainbow: Red 2.2s→Yellow 3.6s→Blue 5.2s→Green 6.6s→Orange 8.3s→Purple 9.7s→demo 11.7s; Shape: Circle→…→Heart identical. Full flow showcase→demo→guided→practice intact, `tsc`/`build` clean, eslint 0 errors, 0 console errors.
- ⚠️ **Same-class risk NOT yet touched:** RiverCrossing (Ch.2) speaks the number-line "1,2,3…" (short words) via `speakSeq` with onWord-driven visuals — it could race the same way on a real device. Not reported by the user; apply the self-paced treatment there too if it shows.

⚠️ **Rule update:** for a list of SHORT single words (showcase / counting), drive the reveal with a SELF-PACED fixed timer (deterministic dwell) and speak each word — do NOT tie the visual pacing to `speakSeq`/`speakSteps` speech events (short words race). `speakSteps` is still correct for multi-SENTENCE demos (sentences don't race).

---

## Session 2026-06-28 — Explanation "goes fast / doesn't complete" first attempt (speakSteps fallback) ⚠️ insufficient (uncommitted)

User: "the explanation part is going fast without completing the things" in the colour + shape chapters. **Root cause in `speakSteps` (`useMiloSpeaker.ts`):** its silent-audio fallback was firing too eagerly and RACING real speech — the grace window was only **1.9s** (a real first utterance can take >2s to start right after the unlock tap), it stepped visuals every **900ms**, and its per-step timers **never re-checked** whether speech had since started. So when speech was merely slow to start, the fallback pre-empted it: flashed all the visuals fast AND called `onDone` early, advancing the phase mid-sentence. (The 7-line "meet every colour/shape" showcase made it obvious.)

- **`speakSteps` fixes:** grace window **1.9s → 2.8s**; step **900ms → 1400ms**; and **every fallback step + the early finish now bail (`if (started) return`)** the moment the real voice starts, so a slow voice takes over cleanly instead of the two racing. Benefits ALL chapters' speakSteps demos (Kitchen/NumberDoors/Grocery/ShapeTown/RainbowTown), not just these two.
- **New `unlockSpeech()`** (a volume-0 `' '` utterance spoken synchronously) — wired into the RainbowTown + ShapeTown intro buttons' `onClick`. Mobile speechSynthesis only unlocks from a speak() INSIDE a user gesture; the demo's speak() fires later from an effect and can be silently blocked → it then hits the (now slower) silent fallback. Unlocking on the tap makes the demo actually narrate aloud.
- **Verified** (headless = silent fallback path): showcase highlights now step ~1.4s apart and complete all 6 before advancing (Red 4.3s→…→Purple 11.3s→demo 14s), no early finish, full flow showcase→demo→guided→practice intact, `tsc`/`build` clean, 0 console errors. The real-device speech-paced path can't be exercised headless, but the fallback no longer pre-empts it (2.8s window + started-guards).

---

## Session 2026-06-28 — "Meet every colour/shape" showcase added to Ch.6 + Ch.7 ✅ (uncommitted)

Per user: the explanation in BOTH the colours (Rainbow Town) and shapes (Shape Town) chapters must **show every colour / every shape**. Before, the explanation only previewed a couple via the find-it demos. Added a new **`showcase` phase** that opens the explanation: all six items shown at once in a clean **3×2 grid**, Milo naming each one in turn (it scales up + glows as named), then it flows into the existing watch-demo → guided → practice.

- **`RainbowTown.tsx` → `ColorShowcase`** (all 6 colours as balloons) and **`ShapeTown.tsx` → `ShapeShowcase`** (all 6 `ShapeSVG` shapes). Both: a responsive numeric `px` (resize-tracked) so the SVGs scale; labelled under each (colour word tinted its own `deep` hue for contrast); driven by **`speakSteps`** — line 0 is the intro ("These are the colours/shapes!"), lines 1–6 are the names, `onStep(i)` lights item `i-1`, `onDone` advances after 800ms (so it can't overlap/cut, and the speakSteps timer fallback still plays it through silently in headless). Grid is `gridTemplateColumns: repeat(3, auto)` → an even 3+3 at every width (a greedy flex-wrap gave an awkward 5+1 mid-width — fixed).
- **Wiring:** new `Phase` value `'showcase'`; intro button now → `setPhase('showcase')` (copy changed to "First, let's meet the colours/shapes!"); showcase `onDone` → `setPhase('demo')`. `bgScene` default already covers the new phase (balloons / park). The find-it demos + guided + practice are unchanged.
- **Verified** in preview: `tsc` clean, `next build` exit 0, eslint clean (only `<img>` warnings). Both showcases render all 6 in a 3×2 grid (verified label positions: Red/Yellow/Blue · Green/Orange/Purple; Circle/Square/Triangle · Rectangle/Star/Heart), the named item glows in sequence (via the fallback), and the showcase advances into the demo (reached "Find the shape Milo names (2/2)"). **0 console errors.** Still uncommitted.

---

## Session 2026-06-27 — Ch.7 Rainbow Town (colours) ✅ built + verified (uncommitted)

Built **Chapter 7 — "Milo's Rainbow Town Walk"**, the COLOUR-recognition story (skill `colors`, the old "Color Garden" drill reborn as story mode — the 7th 3–5 chapter). Milo walks through Rainbow Town where everything comes in every colour; each round he names a colour ("Can you find the red balloon?") and the child taps the matching one. Decisions locked with the user: theme = **Rainbow Town walk** (rotating streets of recolorable objects); colour set = **six** (red, yellow, blue, green, orange, purple). **NOT committed** (no-auto-push).

- **New file `src/components/story/RainbowTown.tsx`** — mirrors `ShapeTown.tsx` ~1:1 (phases intro→demo→guided→practice, ONE continuous `rainbowTownBeat` SkillBeat, `skillId:'colors'`, 10 rounds, `walkEvery:3`). **THREE** scenes rotate every round (`sceneForRound = SCENE_ORDER[round%3]`): 🎈 Balloon Stand · 🚗 Toy Street · 🌷 Flower Market. **Each round shows the SAME object type in DIFFERENT colours** so COLOUR is the only variable. Objects are pure code-drawn SVG (`ObjectSVG`: balloon / car / flower) filled with the round's hex — **NO art needed** (each scene has a code-drawn gradient + an optional `<img>` auto-upgrade hook for `backgrounds/rainbow_{balloons,street,market}.jpeg`; Milo tries `milo_painter.png`→`milo_explorer.png`→`milo_idle.png`→🐴+🌈). Spoken with the object noun ("find the red **balloon**") so the ask stays concrete; flower centre is neutral cream so the bloom colour is unambiguous; each fill has a darker `deep` stroke so light colours (yellow) read against the backdrop.
- **`makeColorRound(d, round)`:** target cycles `COLOR_ORDER[round%6]` (full coverage, never two the same in a row); difficulty grows the field **3 → 4** choices and at the top tier **GUARANTEES the look-alike twin** is on screen (`TWIN`: red↔orange, yellow→orange, green↔blue, purple→blue) so it's recognition, not elimination. Easiest tier drops the twin from the pool. Capped at **4 options / single row** (NumberDoors/ShapeTown's proven regime).
- **Reused ShapeTown's verified machinery verbatim:** voice-safety (`useIsSpeaking` gate + synchronous `tapLock` `SPEAK_LOCK_MS=600` + `wrongLock` 1300ms; practice `finish` does NOT speak praise — the SkillBeat does; guided DOES), demo via **`speakSteps`** (lines chain on `end`, can't overlap; glow on the 3rd line; timer fallback so it plays silently in headless), `useThingScale` (floored 0.62, capped 1.5×, clamped above Milo's bottom-left sprite), `layoutFor` (defensive ≥n slots).
- **Wiring (Ch.6 pattern):** rewrote `game/ColorGardenChapter.tsx` → thin `createPortal` wrapper around `RainbowTown`, `finishAndSync('colors', …)` + `CelebrationModal`. Added `?ch=rainbow` to `app/story/page.tsx`. Renamed the menu entry in `chapters.ts` "Color Garden" → **"Rainbow Town"** (🌈, hint "Tap the colour Milo names!"). The chapter already exists in the registry (id `colors`) and game-page map (`colors: ColorGardenChapter`) — no edits needed there. **Deleted orphaned `lessons/ColorGardenLesson.tsx`** (zero importers after the rewrite, `git rm`).
- **Verified** in preview (1280×800): `tsc` clean, `next build` exit 0, eslint clean (only the standard `<img>` warnings + the pre-existing `_props`/`set-state-in-effect` that EVERY story wrapper trips — confirmed identical in the shipped `ShapeHouseChapter`, build doesn't gate on it). Played intro→2 demos (red balloon glows via the speakSteps fallback)→guided→**all 10 practice rounds**→clean finish (exits to /menu). Confirmed live: scene cycles balloons→cars→flowers, target cycles all 6 colours, difficulty ramped to 4 options with the red/orange twin present at round 7, full-bleed layout via `getBoundingClientRect` (1280×800), all 3 scenes render (code-drawn balloons/cars/flowers + painted `milo_explorer.png`), **0 console errors** across the whole run.

**Art now PAINTED (user supplied 2026-06-28):** `backgrounds/rainbow_{balloons,street,market}.jpeg` (1376×768) + `characters/milo_painter.png` all load over the code-drawn fallbacks (verified all 3 scenes; play band + lower-left stay clear). The street bg was first saved `rainbow_stree.jpeg` (typo) → renamed. `milo_painter.png` is 2048²/~2MB (could be downscaled).
**Painted OBJECTS via greyscale + code-tint (2026-06-28):** `objects/rainbow_{balloon,car,flower}.png` (1024² greyscale+alpha). `ObjectSVG` tints each to the round's EXACT hex — a hex-filled div masked by the sprite's alpha + the greyscale art `mix-blend-mode:multiply`'d on top (shading without hue-shift), wrapper `isolation:isolate`. **ONE greyscale sprite serves all 6 colours**, so colours stay exactly consistent with the labels/showcase (the point of NOT baking colour into PNGs in a colour game). `usePaintedObject` probes via `new Image()` into a module cache, reads it at render (no setState-in-effect). SVG stays as auto-fallback; near-black wheels stay dark when tinted. Verified: all 6 tints true + distinct across balloons/cars/flowers + showcase, glow states still apply, `tsc`/`build` clean, 0 console errors.

✅ **4 chapters remain** as old drills (a future "World 2/3/4"): patterns · addition · subtraction · measurement. See `docs/story-mode-3-5.md`. **Working tree now carries:** the 3 audit refactors + 2 Tier-0 fixes + this chapter (+ the Ch.6/7 showcases + Ch.7 art), all uncommitted.

---

## Session 2026-06-27 (later) — Two non-AR Tier-0 fixes applied ✅ (uncommitted)

Knocked out the two correctness items from the architecture audit that (a) aren't AR and (b) actually affect the live story chapters / sign-in. Both **applied to the working tree, verified, NOT committed** (per no-auto-push). AR work stays deferred.

1. **`useAdaptive.record()` stale closure — FIXED** (`src/lib/adaptive.ts`). The hook read `streak/wrongStreak/difficulty/wrong` from a render closure and wrote them with plain setters, so two `record()` calls in the same tick (rapid taps) both recomputed from the *same* stale base — last-write-wins collapsed the streak and silently dropped promote/demote. Rewrote the hook to hold ALL counters in **one snapshot object mirrored in a `useRef`** that is the synchronous source of truth: each tap reads the prior tap's result from `ref.current`, then `setSnapshot(next)` re-renders. Formulas (`calcDifficulty`, hint/fire/praise/encouragement) are **byte-for-byte preserved** — behavior only changes under rapid taps, which is the bug. Dropped the `eslint-disable exhaustive-deps` (callback is now `[]`-stable). Affects EVERY chapter's difficulty ramp. **Verified:** deterministic reducer test (3 rapid correct → streak 3, promote 1→2; old path would've stuck at streak 1/diff 1; 2-wrong demote works) + live smoke (Counting practice plays, rounds advance, 0 console errors).
2. **Dead middleware auth guard — REMOVED** (`git rm middleware.ts`). The guard gated `/` on an `sb-*-auth-token` **cookie**, but the session lives in **localStorage** (`client.ts` `storageKey:'milo-auth'`, supabase-js default; `server.ts`'s `@supabase/ssr` cookie client has **zero importers** — dead scaffolding). So the cookie never existed → the guard **always** redirected `/`→`/auth`, and since `/auth` doesn't bounce signed-in users, an installed-PWA cold launch (`start_url:'/'`) **stranded signed-in users on the login form**. The root `page.tsx` already does the correct client check (`getSession()` → `/parent` else `/auth`); the middleware only pre-empted it on full loads. Deleting it lets that run. (Bonus: `middleware.ts` is a **deprecated** convention in Next 16 — renamed to `proxy.ts`; we just remove it, no `proxy.ts` needed. No real protection lost — server can't see a localStorage session anyway; `/` renders no sensitive content.) **Verified:** `fetch('/')` now returns **200** (was a server redirect); signed-out `/`→`/auth` via the client dispatcher; `next build` emits 27 static routes, no Middleware entry.

`tsc` clean, `next build` exit 0, eslint clean (only the pre-existing unused-`chapter`-param warning, part of the public `useAdaptive(chapter)` API). **Working tree now carries:** the 3 audit refactors (scoring/code-split/AR-close) **+** these 2 fixes, all uncommitted. Remaining non-AR Tier-0: `acceptInvite` expired-invite cosmetic state, `insights` unbounded fetch + phantom `lesson_skip` metric, `daily.ts` DST streak math. **Dead-code note:** `src/lib/supabase/server.ts` is now confirmed-unused scaffolding (safe to delete in a cleanup pass).

---

## Session 2026-06-27 (later) — Architecture audit + 3 verified refactors applied 🔍

A senior-engineer pass to reverse-engineer the whole codebase and surface quality/scalability/maintainability debt. Method: multi-agent audit (11 subsystems mapped → 5 dimensions audited → every finding adversarially fact-checked → behavior-preserving refactor code generated + verified). **Completed: 38 findings, all confirmed.** Adversarial verification right-sized severities hard — asking "is this overstated for a kids' PWA at modest scale?" left **0 critical, 0 high, 10 medium, 28 low**. The "scary" headline items (scoring triplication, no code-splitting, AR GPU leak, unbounded `/insights` fetch, zero tests) all landed at **medium**; the Tier-0 correctness/security items below are real but separate (they change behavior → need sign-off).

**3 verified behavior-preserving refactors were APPLIED to the working tree (uncommitted, NOT pushed) and confirmed running live** (dev server: menu renders, code-split Counting chapter loads with 25 imgs/0 broken, AR mount→dispose clean, `tsc` 0):
  1. **Scoring extracted** → `src/lib/scoring.ts` (new `scoreChapter()`); `store.ts.finishChapter` now returns the score, `useChapterSync` reuses it instead of recomputing. Duplicates deleted.
  2. **Chapter code-splitting** → `game/page.tsx` now `next/dynamic`-lazy-loads each chapter (was 35 static imports); `/game` still prerenders static, 69 split chunks.
  3. **AR `HandLandmarker.close()` leak fixed** + partial bootstrap consolidation → `src/lib/ar/dispose.ts` + `handLandmarker.ts`, `useFingerCounter` migrated, 4 catch/sort pages call `disposeLandmarker`. (The 3 hooks' full consolidation + `useHandGesture/Pincher` migration is still pending.)

Two refactors were **rejected / not applied**: centralizing `force-static` via a re-export (verifier proved against Next 16 source that re-exporting `dynamic` silently DROPS `force-static` on all 15 PWA pages — never do this), and a `useClassicChapter` hook (only safe for ~14 of 27 chapters; the other 12 use different effect deps). Full machine pass is resumable: script `.../workflows/scripts/milo-architecture-audit-wf_18fb49b8-82e.js`, `resumeFromRunId: wf_18fb49b8-82e`.

### Clean architecture (as-built)
Local-first PWA. **Auth** (Supabase, `client.ts` singleton, token in localStorage under `storageKey:'milo-auth'`) → **parent dashboard** picks a learner (`sessionStorage milo_active_learner`) → **per-learner Zustand profile** persisted to IndexedDB (`milo-profile-<id>` via the `kv` shim, gated by `StorageGate`) → **chapter play** calls `finishChapter` (instant, local) then `syncSession` RPC (or enqueues to `kv` offline queue) → **menu** pulls server state via the `get_learner_bootstrap` RPC and merges **monotonically** (`max`) into local. Three layers (Zustand local / sessionStorage active-learner / Supabase server) are the three sources of truth, reconciled on the menu. Content = a single chapter registry (`lib/chapters.ts`) → `CHAPTER_COMPONENTS` map in `app/game/page.tsx` → 35 `*Chapter.tsx` + 33 `*Lesson.tsx`, with a newer `components/story/*` SkillBeat layer for the 3–5 rewrites. Speech is a module-global singleton (`useMiloSpeaker.ts`).

### Tier 0 — correctness/security smells (fixing these CHANGES behavior → needs sign-off; out of the "quality-only" scope)
- ✅ **DONE this session (uncommitted): Middleware auth guard removed** (`git rm middleware.ts`). It gated `/` on an `sb-*-auth-token` cookie, but `client.ts:15` sets `storageKey:'milo-auth'` and supabase-js stores the session in **localStorage, not cookies** → the guard always redirected `/`→`/auth`, stranding signed-in users on the login form on installed-PWA cold launch. Root `page.tsx`'s client check now handles routing. (`middleware.ts` is also deprecated in Next 16 → `proxy.ts`.) See the latest-session entry up top.
- **AR/play chapters always score 3 stars.** ~8 call sites pass `wrong=0` unconditionally to `finishAndSync` (e.g. `catch-it:197`, `catch-color:187`, `finger-counting:125`) even though they track `ada.sessionWrong` — 100% accuracy every time, defeating the star formula. **Confirmed** (still open — behavior change, needs sign-off).
- **MediaPipe leak — mostly fixed this session (uncommitted):** the 4 catch/sort pages + `useFingerCounter` now call `lib/ar/dispose.ts` which **does** `landmarker.close()` + clears `srcObject`. **Still leaking:** `useHandGesture` + `useHandPincher` (not yet migrated, no `close()`). The 8 MB model is still re-fetched from Google CDN on every cold start (no SW cache rule).
- ✅ **DONE this session (uncommitted): `useAdaptive.record()` stale closure FIXED** (`adaptive.ts`) — all counters moved into one `useRef` snapshot (synchronous source of truth) so rapid taps compose instead of reading a stale closure; formulas byte-for-byte preserved, `eslint-disable` dropped. See the latest-session entry up top.
- **`acceptInvite` accepts expired invites** (`queries.ts:394`): filters `status='pending'` but not `expires_at` — marks an expired invite `accepted` (the DB `can_self_grant_access()` still blocks the actual grant, so it's cosmetic-but-wrong state).
- **Analytics/dashboards:** `insights/page.tsx` consumes a `lesson_skip` metric that `track()` **never emits** (always 0); `insights` fetches **all** sessions + `learner_events` with no date filter/projection/pagination (unbounded browser fetch). `daily.ts` streak math uses `Date.now()-86_400_000` (breaks across DST).

### Tier 1 — duplicate logic (behavior-preserving; the bulk of the cleanup)
- ✅ **DONE this session (uncommitted):** `calcStars`/`calcXP`/`calcCoins` were triplicated (`store.ts`, `useChapterSync.ts`, + the `sync_session` SQL body) → extracted to `src/lib/scoring.ts` (`scoreChapter()`), wired into both TS sites, duplicates deleted; `useChapterSync` now reuses `finishChapter`'s return instead of recomputing. SQL stays as the server mirror (it trusts client-supplied stars/xp/coins, so no formula recompute there).
- **Online/offline + flush effect duplicated** in `useOfflineSync()` and `OfflineBanner()` (same file, ~50 lines twice) → one shared hook.
- **MediaPipe bootstrap** was copy-pasted across 4 catch/sort pages + 3 hooks. ✅ **Partly done (uncommitted):** `lib/ar/handLandmarker.ts` (`createHandLandmarker`/`openCamera`) + `dispose.ts` now exist; the 4 catch/sort pages + `useFingerCounter` are migrated. **Remaining:** `useHandGesture` + `useHandPincher` still inline `createFromOptions`/`getUserMedia` + their own `VERSION`/URL constants; the 4 pages still inline their `createHandLandmarker` call. Finish migrating them (also closes their leak above).
- **Legacy lessons** (`CountingLesson`, `AdditionLesson`, `Shapes/Patterns/Subtraction/NumberOrdering/MeasurementLesson`) each carry private copies of `Shell`/`Confetti`/`SparkleAt`/`BigCount`, their own `@keyframes` block, and a private `numberWord()` — all already in `_kit.tsx`. → migrate to `LessonScaffold`.
- **Per-chapter `const S: Record<string,CSSProperties>`** with near-identical keys across 29 classic chapters + a duplicated fixed progress bar (5 chapters render a second bar on top of `GameTopbar`'s). → shared layout shell + style tokens.
- **5 separate `useScale` implementations** in `story/*` (world1, RiverCrossing, Kitchen, NumberDoors, ShapeTown) with different clamps → one parametric hook. (Note: memory says scaling is deliberately "linear for objects / dampened for creatures" — preserve both modes.)
- `isSpeakingRef` reactive→ref pattern copied across 8 AR pages; `InviteWithLearner` declared twice (`types.ts:148` + `queries.ts:292`).

### Tier 2 — performance
- ✅ **DONE this session (uncommitted):** all 35 chapters used to be statically imported into `app/game/page.tsx` (every child downloaded all 35 to play one). Now each `CHAPTER_COMPONENTS` value is a `next/dynamic(() => import(...), { ssr:false })` lazy load; `/game` still prerenders static, verified `next build` emits 69 split chunks and the Counting chapter loads on demand with no regression.
- **150ms `setInterval` DOM-polling** in `game/page.tsx:148` (and `ScaleToFill.tsx:28`) running `getBoundingClientRect`/`getComputedStyle` for the whole session → `ResizeObserver`/`MutationObserver`.
- **0 `next/image`, 92 raw `<img>`** over `.jpeg` backgrounds + `.png` sprites; no optimization. **Confirmed.**
- **`analytics.ts:81` registers a `setInterval` + listener at module import time** with no cleanup → leaks on hot-reload/tests.
- `useIsSpeaking`/`useIsBlocked` share one `_subs` Set → each fires the other's subscribers (spurious re-renders).

### Tier 3 — scalability
- **Adding a chapter touches many files** (registry + `game/page` map + lesson wiring + a SQL seed migration); `lib/chapters.ts` and DB `public.chapters` are maintained **independently** and have already drifted (seed migrations still say "Apple Basket"/old ids).
- **Missing indexes:** `learner_invites(invited_email)` (RLS filters by it; seq scan) and a covering `learner_access(parent_id, learner_id)` (every RLS `EXISTS` join uses both; only `parent_id` indexed).
- **Parent dashboard N+1:** `parent/page.tsx:69` fires 4 calls/learner (4N round trips) and re-fetches `accessRole` even though `get_learner_bootstrap` already returns it (1 RPC). The menu uses bootstrap; the dashboard doesn't.
- **`learner_events` unbounded** if `pg_cron` isn't enabled (the retention migration silently no-ops on plans without the add-on).
- **`db(): any`** (`queries.ts:12`) + `createClient() as any` (`analytics.ts:52`) erase all generated DB types; `types.ts` is hand-maintained and drifting (`learner_events` missing entirely).

### Tier 4 — maintainability
- **158 eslint-disable** comments — 97 `react-hooks/exhaustive-deps` (systemic mount-once effects), 15 `no-explicit-any`. **Confirmed.**
- God-files: `CountingLesson.tsx` **1159 lines**, `menu/page.tsx` 381 (data orchestration + fully inline-styled render), `parent/page.tsx` 427 (93 inline styles).
- `reactStrictMode:false` hides effect double-invoke bugs (several `ran`-ref guards exist to compensate).
- **Dead code:** `app/name-entry/page.tsx` (redirect stub), `components/ui/ChapterLesson.tsx` (never imported), `AudioUnlock.tsx` (no-op stub), `next-pwa` dep (SW is hand-rolled in `public/sw.js`).
- Error strategy is `console.error` + `toast`; no tests anywhere.

### Suggested order (all behavior-preserving unless noted)
**DONE this session (applied + verified, uncommitted):** scoring extraction · chapter code-splitting · AR `close()` leak fix (see the 3 items above). **Remaining, in priority order:** 1. Finish AR consolidation — migrate `useHandGesture`/`useHandPincher` + the 4 catch/sort pages' inline bootstrap onto `handLandmarker.ts`/`dispose.ts`. 2. De-dupe the offline-sync effect + migrate the 8 legacy lessons to `_kit`'s `LessonScaffold`. 3. Add a `ResizeObserver` to `game/page.tsx` + `ScaleToFill` (replace the 150ms poll). 4. Add the two DB indexes + switch the parent dashboard to the `get_learner_bootstrap` RPC. 5. Add vitest around the pure functions (scoring/level/adaptive/merge) + a `lint`+`tsc`+`test` CI gate. 6. Tier 0 items separately, each with explicit sign-off (they change behavior).

---

## Session 2026-06-27 (later) — Ch.6 Shape Town (shapes) ✅ built + painted + reviewed + deployed (`d2c8598`)

Built **Chapter 6 — "Milo's Shape Town Walk"**, the SHAPE-recognition story (skill `shapes`, the old "Shape House" drill reborn as story mode — the 6th 3–5 chapter, first of a future "Shape Town" world). Milo the explorer strolls Shape Town where everyday things are made of shapes; each round he names a shape ("Can you find the triangle?") and the child taps the matching one. Decisions locked with the user: skill = **Shapes**; frame = **"Shape Town Walk"** (spot shapes in the scenery — the lightest of the 3 options, closest to the Number Doors rotating-scenes pattern).

- **New file `src/components/story/ShapeTown.tsx`** — mirrors `NumberDoors.tsx` almost 1:1 (phases intro→demo→guided→practice, ONE continuous `shapeTownBeat` SkillBeat). **THREE** places rotate every round (`sceneForRound = SCENE_ORDER[round%3]`): 🎈 Balloon Park · 🪧 Sign Street · 🌷 Flower Garden. (A 4th, 🪁 Kite Festival, was built then **removed per user** — they didn't want it; SCENE_ORDER/SCENE_INTRO/SCENE_BG, the kite-tail decoration, and a demo round were all stripped.) Each presents the 6 shapes as a themed town object (balloon string+knot / signpost+board / flower stem+leaves) drawn purely in CSS around the shape. **Shapes need no art** — reuses `ShapeSVG`/`SHAPES`/`SHAPE_ORDER` from `lessons/ShapesLesson.tsx` (pure SVG, canonical per-shape colours).
- **Painted art (user supplied 2026-06-27):** `characters/milo_explorer.png` (Milo pony in safari explorer gear — hat, vest, backpack, map; 1024²) + 3 clean empty-centre backdrops `backgrounds/town_{park,street,garden}.jpeg` (1376×768) all load. Backdrops keep the centre/lower-left open so the shapes + Milo sit clear; the painted SHOP SIGNS on Sign Street are blank (no text) by design. Each scene still has a code-drawn gradient fallback (palette matches the painted art) + `milo_idle.png` → 🐴+🗺️ fallback chain.
- **`makeShapeRound(d, round)`:** target cycles `SHAPE_ORDER[round%6]` (full coverage of all 6 shapes, never two-the-same in a row); difficulty grows the field **3 → 4** choices and at the top tier **GUARANTEES the square↔rectangle look-alike** is on screen (recognition, not elimination). **Capped at 4 options / single row** (was briefly 6 with a 2-row layout — dropped: at desktop the bottom-left shape collided with Milo, and the 3 columns overlapped on mobile; 4 single-row keeps it in NumberDoors' proven regime, and 6 shapes is too many for 3–5 anyway).
- **Voice-safety (same lessons as Ch.4):** in-game taps gated by `useIsSpeaking()` + synchronous `tapLock` (`SPEAK_LOCK_MS=600`) + `wrongLock` (1300ms); demo/re-teach (`ShapesExplain`) are TIMER-driven (can't hang); practice `finish` does NOT speak praise (the SkillBeat does — double-speak was the old cut source); guided DOES praise.
- **Viewport-scaled** (`useThingScale`): grows with `innerWidth` but **floored at 0.62** (narrow phones shrink the shapes to fit — the per-shape width fraction is already under the column spacing, so it never overlaps), **capped at 1.5×** (no oversize on wide desktops — the Ch.1/Ch.2 scaling lesson), AND **clamped so the whole thing (shape + decoration band) stays above Milo's bottom-left sprite** (`clearScale` from `miloTop`) — this fixed a code-review finding where, on short / tablet-landscape viewports (1024×768, 600×400), the decoration dipped ~12–19px into Milo. TOP=50 (a touch higher than the door siblings' 56) because each shape has a decoration hanging below it. `layoutFor` always returns exactly `n` slots (defensive — no undefined-slot crash).
- **Wiring (Ch.4/5 pattern):** rewrote `game/ShapeHouseChapter.tsx` → thin `createPortal` wrapper, `finishAndSync('shapes', …)` + `CelebrationModal`. Added `?ch=shapes` to `app/story/page.tsx`. The chapter already exists in the registry (`chapters.ts`, id `shapes`, "Shape House" 🏠) and game-page map (`shapes: ShapeHouseChapter`) — no edits needed there. `lessons/ShapesLesson.tsx` stays (ShapeTown imports its SVG primitives); the old drill code inside the rewritten wrapper is gone.
- **Code review (adversarial, 4-lens + verify, 2026-06-27):** voice-safety / conventions / generation-logic all clean; 2 real fixes applied — the Milo-collision scale clamp above, and `finish` timing 600→650ms to match NumberDoors' settle window. The reviewer's other suggestion (raise TOP 50→56) was rejected — raising TOP moves shapes DOWN toward Milo, worsening the collision.
- **Verified** in preview: `tsc` clean, `next build` exit 0, eslint clean (only the standard `<img>` warning). Played the full intro→2 demos→guided→**10 practice rounds**→finish (twice); all 3 painted scenes render + cross-fade; the painted `milo_explorer.png` + 3 backdrops load; targets cycle all 6 shapes with no repeats; difficulty ramps 3→4 and caps at 4; geometry checked via `getBoundingClientRect` at 1440 / 1024×768 (shapes clear Milo) / 375 mobile (shapes shrink, no overlap); no React error boundary across the whole run. (A burst of `…reading 'left'` console errors during development were all HMR hot-swap artifacts from editing the layout while a stale 6-option round was mounted — gone on fresh load, now structurally impossible.)

✅ **Committed + deployed** (`d2c8598`, on top of the voice fix `abfce36`) — pushed to `main`, Vercel production deploy READY (www.mi2utor.com). **5 chapters remain** as old drills (a future "World 2/3/4"): colors (Color Garden) · patterns · addition · subtraction · measurement. See `docs/story-mode-3-5.md`.

---

## Session 2026-06-27 (later) — Voice overlap/cut in explanations FIXED (Ch.3–6)

User report: "Milo's voice in all chapters except Counting overlaps and gets cut **in the explanation part**." **Root cause:** every `speak()` does `speechSynthesis.cancel()` first (`useMiloSpeaker.ts`), so it cuts whatever is talking. The demos in **Kitchen, NumberDoors, Grocery, ShapeTown** fired each explanation line on a **fixed `setTimeout`** (e.g. line 2 at 2.7s) — but a long/slow line often runs past its slot, so the next line **cancelled it mid-word**. Counting (Ch.1) was clean only because it speaks **single short words** ("1","2"…) with gaps longer than the word; RiverCrossing (Ch.2) was already clean (opens straight into practice; its reteach uses `speakSeq`).

- **New helper `speakSteps(lines, { onStep, onDone })` in `useMiloSpeaker.ts`** — the project's blessed pattern made reusable: `speakSeq` plays the lines strictly one-after-another (each waits for the previous `end`, so they can NEVER overlap/clip), `onStep(i)` reveals the visual for line i (driven by real speech `onstart`), AND a **~1.9s "did it start?" fallback** drives the same visuals + advance on fixed timers if speech never starts (blocked autoplay / no voices / headless) so the demo still plays silently. Fires `onDone` exactly once.
- **Converted all four explanations** (`ShapesExplain`, `DoorsExplain`, `GroceryExplain`, `CompareExplain`) from fixed-timer `speak()` to `speakSteps` — glow chapters reveal on the last line; counting chapters build a parallel `script`/`actions` array (one entry per spoken number → reveal that item). **Removed the intro-button `speak()`** in those four (it was the same line the demo immediately cancelled; the on-screen card keeps the instruction, the click still unblocks audio).
- **Verified** in preview (`tsc` + `next build` clean): instrumented `speechSynthesis` shows lines now fire **strictly sequentially, no overlap**; ShapeTown demo glow appears (via the fallback, since headless never fires `onstart`) and advances to guided; Kitchen demo reveals items one-by-one (0→6) with the big count numbers + the bigger-side reveal, all 4 examples → guided. On a real device `onstart` fires, so `onStep` syncs visuals to the actual speech. **Committed `abfce36` + deployed.**

⚠️ **Rule for any NEW demo/explanation:** never narrate multiple lines on fixed `setTimeout`+`speak()` (they cut each other). Use `speakSteps` (or `speakSeq`) so lines chain on `end`, and drive visuals from `onStep`/`onWord` with the timer fallback. Single short words with generous gaps (counting) are the only safe exception.

## TL;DR
Three 3–5 story chapters are built: **Ch.1 Counting** (`ForestWalk`), **Ch.2 Number Order** (`RiverCrossing`), **Ch.3 Number Comparison** (`Kitchen`). This session (2026-06-21 → 22) did two big things:

1. **Built Chapter 3 — "Milo's Kitchen"** (number comparison), a brand-new non-forest/river theme: Milo the chef picks the bigger / more one across 4 rotating stations (fruit bowls · cookie trays · cake towers · candy jars). Started as a "Magic Kitchen" but **de-magicked per user** (no cauldron/potion/magic). User supplied painted art mid-session; all wired with code-drawn fallbacks. Counted explanation, big floating numbers, viewport-aware sizing. See the Chapter 3 section below.

2. **Reworked Chapter 1 (Counting) heavily** from user feedback: removed the **pond biome** (+duck); **parrot → eagle**; objects now **blink until tapped** (no more ✓ checkmark); count **numbers shown on each object** in the explanation; **no object repeats in a session** (12 unique creatures); garden creatures (squirrel/ant/snail) pinned to the **open ground**; **eagle bigger + flies below the sun**; **bee removed**; tap-difficulty fixed (less object bunching). See the Chapter 1 section below.

⚠️ **Pending art the user still needs to supply (render as emoji until then):** `objects/octopus.png` (🐙), `objects/rabbit.png` (🐰). Dead/unusable files (JPEGs/PNGs with the transparency **checkerboard baked in** → gray squares): `objects/candy.jpeg`, `objects/emptyjar.png`, `objects/butterfly.jpeg` — must be re-exported as true transparent PNGs to use.

⚠️ **Commit/deploy policy:** per project convention, **do not commit/push/deploy unless explicitly asked.** (Historical line — as of 2026-06-27 everything through Ch.5 IS committed + deployed; see the Current-state note at the very top.)

To preview a chapter standalone, see [How to test](#how-to-test).

---

## Session 2026-06-27 — Ch.5 Little Grocery (matching quantities) ✅ + deployed

Built **Chapter 5 — "Milo's Little Grocery"**, the matching-QUANTITY story (skill `matchingQuantities`, the old "Apple Basket" drill reborn as story mode — the 5th and last core 3–5 skill). Milo runs a corner shop; each round a new customer orders **exactly N** of one item — the child taps items off the shelf into the bag (each tap counts aloud), uses "↩ put one back" to fix miscounts, then rings the **🔔 bell** to serve (correct only when the bag holds exactly N). Decisions locked with the user: grocery theme (**5 stalls** for max anti-repetition) · numbers **1–10 ramping** (reuses `matchTarget`) · **pure counting** (no decoys).

- **New file `src/components/story/Grocery.tsx`** — mirrors NumberDoors/Kitchen (phases intro→demo→guided→practice, ONE `groceryBeat` SkillBeat). FIVE stalls rotate every round (`stallForRound = STALL_ORDER[round%5]`): 🍎 produce · 🥐 bakery · 🥚 deli · 🌷 flowers · 🍬 sweets. `makeOrder(d, round)`: target via `matchTarget` (1–3 / 3–6 / 6–10); `shelf = min(10, target + spares)` where spares ramp 0→2→3-4 (harder = fuller shelf → child must STOP at N). Build-a-set logic ported from world1.tsx's `BasketPlay` (tap to pick + count aloud, undo, ring-up===target). **`pickedRef` is the synchronous source of truth** — rapid taps mustn't lose a count (fixed a stale-closure bug). Warm wrong-answers (too few/many → spoken nudge, shake, NO advance, re-ring); Play reports `!erred` like Kitchen/NumberDoors.
- **User changes mid-build:** (1) **removed the running "N / target" count badge** on the bag — it was a crutch (kid just waited for it to hit N); now the child counts the items themselves and can self-correct. (2) **Order ticket** shows the big number FIGURE + the item ("this chapter is ALSO figure-recognition with voice" — recognise the numeral + hear it, then build that many). Grammar helper `qty(n,cfg)` → "1 apple" / "3 apples".
- **Wiring (Ch.3/4 pattern):** rewrote `game/MatchingQuantitiesChapter.tsx` → thin `createPortal` wrapper, `finishAndSync('matchingQuantities', …)`. Added `?ch=grocery` to `app/story/page.tsx`. Renamed the menu entry in `chapters.ts` "Apple Basket" 🍎 → **"Little Grocery" 🛒**. Deleted orphaned `lessons/MatchingQuantitiesLesson.tsx` (zero importers).
- **Art (user supplied 2026-06-27):** `characters/milo_grocer.png` (Milo pony in a green apron) + 5 **simple open backdrops** `backgrounds/grocery_{produce,bakery,deli,flowers,sweets}.jpeg` + item sprites `objects/grocery_{bun,egg,candy,flower}.png`. The first-pass backdrops were busy full shop-scenes (with text) that crowded the gameplay → a translucent "counter-mat" panel was added, then the user regenerated **clean empty-centre backdrops** and the panel was removed (gameplay sits directly on them like the other chapters). **Produce reuses `objects/apple.png`**, cropped to its alpha `bbox` (background-image crop in `Item`) since it's mostly transparent padding. The painted item is shown CONSISTENTLY on shelf, order ticket AND bag (was emoji in the bag — fixed per user). Animal customers stay emoji (🐰🐻🐱🐭🦔; auto-upgrade hooks exist if painted ones are added).
- **Verified** in preview: all 5 stalls + backdrops, the figure ticket, no count badge, pick→count→ring→advance, warm wrong-ring, put-back, singular/plural grammar, painted items everywhere. `tsc` clean, `next build` passes. **Committed `379c695` + pushed + deployed to production** (milo-story-mode.vercel.app / www.mi2utor.com).

⚠️ **All 5 core 3–5 skills are now story-mode.** Remaining drills (a future "World 2"): shapes (Shape House), colors (Color Garden), patterns, addition, subtraction, measurement — see `docs/story-mode-3-5.md`.

---

## Session 2026-06-25 — Ch.4 Number Doors (recognition) story ✅

Built **Chapter 4 — "Milo's Delivery Round"**, the number-RECOGNITION story (skill `numberRecognition`), converting the old plain "Number Doors" drill into story mode the same way Ch.3 converted the comparison drill. Milo is a **postman fox**: each round he has a parcel and the address is **spoken** ("…goes to number 4!"); the child taps the door whose numeral matches the SOUND (recognition by ear — the target is heard, never shown as text). Decisions locked with the user: postman theme · numbers **1–10 ramping** · **pure audio + hear-again** (no quantity hint).

- **New file `src/components/story/NumberDoors.tsx`** — mirrors Kitchen.tsx exactly: phases intro→demo→guided→practice, ONE continuous `doorsRecognizeBeat` SkillBeat (from StoryWorld). FOUR scenes rotate every round (anti-repetition): 🏘️ houses (roof) · 📬 mailboxes (flag) · 🧰 lockers (vents) · 🏪 shops (awning) — code-drawn doors with a big numeral plaque, palette + topper per scene, auto-upgrade hooks for `backgrounds/door_*.jpeg` + `objects` PNGs + `characters/milo_postman.png` (falls back to milo_idle then 🦊+📬).
- **Difficulty ramps the listening load:** range 1–5 → 1–10 · choices **2 → 3 → 4** doors · look-alike distractors (6/9, 7/1) seeded at the hardest tier (`LOOKALIKE` map). `makeDoorRound(d, round)` builds each round; `sceneForRound` rotates the scene; `friendFor(n)` puts a deterministic animal friend behind each door (revealed when it swings open on a correct tap).
- **Audio = heard not read:** `prompt` (shown on the SkillBeat hear-again button) says "Which house is the parcel for?" with NO number; `say` (spoken each round + on the 🔊 button, which SkillBeat provides for free) says "…number 4. Tap … number 4!". Demo + 3-wrong re-teach reuse `DoorsExplain` (timer-driven, names + shows the number big, glows then opens the right door). Voice-safety mirrors Kitchen (tapLock `SPEAK_LOCK_MS=600` + `useIsSpeaking` gate; practice praise spoken by SkillBeat, not the Play).
- **Wiring (Ch.3 pattern):** rewrote `src/components/game/NumberDoorsChapter.tsx` → thin `createPortal` wrapper around `NumberDoors`, `finishAndSync('numberRecognition', …)`. Added `?ch=doors` to `src/app/story/page.tsx`. The chapter already appears in the menu (CHAPTERS registry, id `numberRecognition`, "Number Doors" 🚪) and the game-page registry — no edits needed there.
- **Verified** in preview (1440×820): intro, both demos (big number + glow), guided, practice; all 4 scenes render (roof/flag/vent/awning); correct tap opens the door + advances; wrong tap doesn't; delivered strip + progress + Milo. `tsc` clean, `next build` passes, lint matches existing conventions. (Headless Chrome wedges `speechSynthesis.speaking` so taps stall until the ~6–7s watchdog — a known headless-only quirk, fine on real devices.)
- **Dead code from the swap — DELETED 2026-06-26:** `src/components/lessons/NumberDoorsLesson.tsx` (old Ch.4 drill intro) AND `src/components/lessons/BiggerSmallerLesson.tsx` (old Ch.3 drill, TODO #9) — both confirmed orphaned (zero importers), removed via `git rm`; `tsc` clean. Only `order.tsx`-style standalone orphans remain none; the Ch.1 unused `CountKind`s (parrot/duck/bee + art) are the last optional cleanup.

✅ **Art now PAINTED (user supplied 2026-06-26).** `characters/milo_postman.png` (the Milo pony in a postman outfit), 4 backgrounds `backgrounds/door_{houses,street,lockers,shops}.jpeg`, and 4 door sprites `objects/door_{house,mailbox,locker,shop}.png` all load. `PaintedDoor` crops each sprite to its measured `SCENE_BBOX` (fills the slot); the code-drawn `DoorFace` stays as the missing-PNG fallback (blank plaque).

✅ **UX simplified (user, 2026-06-26): number ABOVE the door + no emojis.** The numeral no longer sits on the door's plaque — it floats on a little paper/orange **sign above each door** (`Door`, the `top:-16%` pill), shown on every door so the child reads it and matches the heard number. Removed all the gameplay emojis for a clean **ask → tap → next** loop: the animal-friend reveal (gone — correct tap just glows green), the "Delivered 📦" strip, the demo's `BigNumber` pop, and the 📮/👆 in the intro/banners. (`FRIENDS`/`friendFor`/`BigNumber`/`SCENE_PLAQUE`/`nd_friend`/`nd_numpop` all deleted.) Verified: numbers sit above all doors in demo/guided/practice, no friend/strip, `tsc`/build clean (stale `probe`/`friendFor` console lines were HMR-only).

---

## Session 2026-06-25 — Ch.3 natural fruit/candy/cookie piles ✅

User feedback (with screenshots): the Kitchen vessels rendered items as a flat, evenly-spaced grid that looked unnatural — "the apples are coming out of the bowl", "the cookies are floating", "make them appear heaped INSIDE the vessel like the painted bowls in the background". Reworked all three item-vessels in `src/components/story/Kitchen.tsx` to a deterministic **natural pile**. (Cake unchanged — its vertical layer stack already encodes count.) `tsc` clean, lint clean (only the project's standard `<img>` warnings), verified at counts 1–9 + game scale, no console errors.

- **`buildPile(val, opts)`** — new pure helper → per-index `{x,y,rot,z,size}` (design-box px). Wide base narrowing up = a rounded heap; bottom-row-first fill; front/bottom rows highest z. **Computed from the FINAL `val`, render only `pile.slice(0, visible)`** so the counted reveal pops each item into a FIXED slot with no reflow (item i always lands in slot i — deterministic, identical every question/practice/retry). Row recipes: `FRUIT_ROWS` / `CANDY_ROWS` / `COOKIE_TRAY_ROWS`.
- **`CropSprite`** replaces `ItemImg` — the apple/candy/cookie PNGs are mostly transparent padding (apple body is only **32%** of its image width → looked like marbles in a big bowl). CropSprite crops each PNG to its measured alpha bbox (`SPRITE_BBOX`) so the item fills its slot; `size` = visible height. The slot anchor (translate+rotate) lives on an **outer wrapper div**, never on CropSprite's `mk_appear` span, or the pop animation's `transform:scale` fights the anchor.
- **🍎 Fruit bowl** — rim-occlusion composite: bowl PNG painted twice, the 2nd clipped to its front belly (`clipPath:'inset(53% 0 0 0)'`) at **zIndex 200** so it covers the whole pile (apples reach ~z50); the lowest apples tuck behind the front rim = "inside the bowl". The original z-bug (overlay at z30, below the front apples) was exactly the "apples coming out of the bowl" the user saw.
- **🍬 Candy jar** — same mound inside the glass body; its existing `overflow:hidden` is the occlusion (taller heap = fuller). `flatBottomRow` so the bottom gumdrops sit square.
- **🍪 Cookie tray** — the tray PNG is ~32% tray + 68% empty margin (why it looked tiny and the cookies floated). Now **cropped to its bbox** → a big tray sitting low, with cookies RESTING on the surface in 1–2 receding rows (front lower & in front). 1 row up to 5, two rows for 6–9.
- A temporary `?probe` grid (renders every vessel at counts 1–9 + game-scale pairs + a reveal sequence) was used to tune the layout, then **removed**. Dead `ItemImg`/unused `useMemo` import also removed.

---

## Session 2026-06-23 — Ch.1 roster rework, Ch.2 restructure, viewport scaling ✅

This session made several user-requested changes across Chapters 1 & 2, all verified in preview (`tsc` clean, no console errors).

### Chapter 1 (Counting / ForestWalk) — roster + placement rework
- **Added rabbit + octopus art** earlier (now both painted in-game), then a bigger rework:
- **Sky biome REMOVED.** Pigeon ("the bird") removed from all rosters; the `'sky'` BiomeId/biome/order and the `SceneBg` sky branch are gone. **3 biomes now:** forest, underwater, garden.
- **Eagle → forest**, perched in the treetops, in SMALL numbers (new `MAX_N` cap map: `{eagle:4, shark:5}` clamps the count in `howManyData`).
- **Octopus → SHARK** (underwater). **Snail → LADYBUG** (garden). Both new kinds render as emoji (🦈 / 🐞) until a PNG is dropped at `objects/shark.png` / `objects/ladybug.png` (art prompts were given to the user; old `octopus`/`snail`/`pigeon` kinds left dormant in art.tsx).
- **Fish bigger** (`SIZE_BOOST` 2.0→2.6); **turtle spread**, **crab scattered**; **squirrel** → grass by the cart/rock (left), **ant** → open central grass (both moved out of the edge flower beds). Bands tuned against the real `garden.png`/`forest_1.jpeg`/`underwater.jpeg` art.
- **Butterfly → 🦋 emoji** (per request): `COUNT_SRC.butterfly = []` so it falls back to the emoji (was wrongly still pointing at the deleted `butterfly_1/2.png` — fixed). Drop a PNG path back to upgrade.
- **No-repeat fix (the "answered question repeats" bug):** the practice was hard-coded `rounds: 10` but the pool after sky-removal is **9** creatures, so round 10 fell back to `_plan[8]` and repeated. Now `rounds = PRACTICE_ROUNDS` (= pool size), so every round is a distinct creature and the count auto-follows the roster. Session is now **9 rounds**.
- **Biome-pin fix:** the `catch` practice beat was pinned to `biome:'forest'`, which (on mount) overrode round 1's per-round biome. ForestWalk's beat-effect now skips `kind==='catch'`, letting `onRound` drive the biome every round.

### Chapter 2 (Number Order / RiverCrossing) — restructure
- **Removed the opening explanation** (intro screen + 1→10 demo + guided round). The chapter now opens **straight into practice** (`phase`/`Banner`/intro-demo-guided JSX deleted). The 3-wrong in-context re-teach is untouched.
- **Theme changes EVERY round** now (`scenarioForRound = SCENARIO_ORDER[round % 4]`): crossing → bridge → train → fishing → … never two in a row. Replaced the old 3/2/2/3 blocks + `SCENARIO_STARTS`. `walkBeforeRound` → `walkEvery: 3` (light travel pause every 3 rounds; bg still cross-fades every round). Verified: 10 rounds, 0 adjacent repeats.

### ⚠️ Viewport scaling — the lesson (don't repeat this mistake)
**The bug:** Ch.1 & Ch.2 sized every sprite in **fixed px** (Milo 148, stones 124, cars 190, creatures base 78 × `SIZE_BOOST`, etc.). A 1000px preview looked right, but on a real ~1900px desktop browser each sprite occupied half the screen-fraction → everything looked tiny/sparse. **Ch.3 (Kitchen) already had this solved** via `useVesselScale` — Ch.1/Ch.2 never got it.
**The fix:** a `useScale()` hook (one per file) that grows sprites with `window.innerWidth` (designed against `DESIGN_W = 1000`), applied to every sprite.
- **Ch.2** uses **linear** scaling (`innerWidth/1000`, clamped 0.8–2.3) — the stones/cars/engine SHOULD fill the scene; user was happy.
- **Ch.1** first used linear too, but that **overshot** — creatures looked oversized & crowded on a real browser. So Ch.1 uses a **DAMPENED, sub-linear curve**: `raw<=1 ? raw : 1 + (raw-1)*0.4`, clamped **0.85–1.45** → "medium" at any width (~preview size at 1000px, only modestly bigger on wide screens). The count-number badge scales with the creature too.
**Rule of thumb for any NEW scene:** never hard-code sprite px sizes for a full-bleed `100vw` stage. Use a viewport-scale hook. For "objects that fill the scene" (stones/vessels) linear is fine; for "creatures scattered in a scene" use the dampened curve so they don't blow up on wide monitors.

---

## Chapter 1 — Counting: "Milo's Counting Journey" ✅ done

A landscape side-scroll where Milo **walks through 4 biomes**, counting themed creatures in each. Plays via `ForestWalk` (the journey engine).

**Pedagogy (don't split — ONE `SkillBeat`):** intro → Milo demo-counts fireflies 1→10 (explanation) → child taps butterflies to 10 (guided) → **one continuous 10-round adaptive practice** (harder on a streak, easier when struggling, Milo re-explains after 3 wrong). Splitting the practice per-biome would reset difficulty + the wrong-streak.

**Biomes & creatures — 12 creatures, 3 per biome (`biomes.ts` + `bandFor` in `world1.tsx`):**
| Biome | Background | Creatures | Spawn band |
|---|---|---|---|
| 🌳 Forest | `forest_1.jpeg` | butterfly, firefly, **rabbit** | butterfly y8–52 (canopy); firefly y28–70 (mid); rabbit x18–90 y60–82 (ground) |
| 🐠 Underwater | `underwater.jpeg` | fish, turtle, **octopus**, **crab** | fish y12–68; turtle y52–80; octopus y50–80; crab y60–82 (seabed) |
| ☁️ Sky | `sky.jpeg` | pigeon, eagle | pigeon y6–38 (high); eagle x13–92 y24–52 (below the top-right sun) |
| 🌷 Garden | `garden.png` | snail, squirrel, ant | all on the OPEN CENTRAL ground: squirrel x22–88 y58–86, snail x24–86 y60–84, ant x22–88 y60–88 |

**NO pond biome** (removed this session, with the duck) — `'pond'` is gone from `BiomeId`/`BIOMES`/`BIOME_ORDER`, the pond `milo_boat` avatar, and the pond-no-scroll gate.

**Key behaviours (don't regress — all from explicit user feedback):**
- **NO object repeats in a session** (`buildPlan` in `world1.tsx`): the explanation uses firefly (demo) + butterfly (guided); the 10 practice rounds use every OTHER biome creature exactly once (shuffled, no biome two-in-a-row). `EXPLAIN_OBJS = {firefly, butterfly}` are excluded from the practice pool. Session = 12 unique objects. (Needs ≥12 creatures — that's why octopus/crab/rabbit were added and bee removed.)
- **Blink to invite a tap:** not-yet-counted objects pulse via `fw_blink` (opacity + 1.05 scale); tapping switches to `fw_tap` pop (blink stops). **NO ✓ checkmark** (removed — the blink-stop + pop is the feedback). Keyframes in `ForestWalk.tsx`.
- **Numbers in the explanation:** the count demo (`FlyingCountDemo`) shows a count-number badge **centred ON each object** as it's counted (passes `num={i+1}` to `PerchedItem`). Practice/guided don't show per-object numbers.
- **Tap difficulty fixed:** objects were bunching/overlapping → `scatter()` jitter cut hard (stagger ±0.14cw, jx ±0.26cw, jy ±0.45ch), base size 78, tilt ±12°, wider (landscape) layouts; `fw_blink` scale 1.12→1.05.
- Creatures **hide in the foliage** (no dim overlay; soft shadow, hidden-object hunt), **scattered** via `scatter()` (`PerchedItem`).
- Per-creature **size boosts** (`SIZE_BOOST`): firefly 2.6, **eagle 1.9** (bigger, per user), pigeon 1.9, fish 2.0, turtle 1.8, octopus 1.6, crab 1.7, ant 1.75, snail 1.5, squirrel 1.5, rabbit 1.6.
- **Milo avatar** (`MiloAvatar`): underwater → `milo_underwater.png` (scuba, bob); everywhere else → walking sprite. (No more pond boat.)
- Biome changes coincide with a **walk** (`walkEvery: 3`). The opening demo is **timer-driven** (not speech-gated) so it plays before audio is unblocked.
- **`?skip` dev param**: `/story?skip=1` jumps straight to the practice beat.

**Sky parrot → EAGLE (2 variants, user to pick):** `COUNT_SRC.eagle = ['eagle1.png','eagle2.png']` cycles BOTH so they show together for comparison — once the user picks, drop the other from the array.

**Files:** `chapters.tsx` (`countingChapter`), `world1.tsx`, `art.tsx`, `ForestWalk.tsx`, `biomes.ts`, `game/CountingStoryChapter.tsx`.

---

## Chapter 2 — Number Order: "Milo's Number-Order Journey" ✅ done

⚠️ **Important:** Chapter 2 was first built side-view (`order.tsx` + `orderChapter`) then **redesigned top-down** into `src/components/story/RiverCrossing.tsx`. `NumberOrderingChapter.tsx` now wraps **`RiverCrossing`**. The old side-view code (`order.tsx`, `orderChapter` in `chapters.tsx`, and the `orderDemo`/`orderGuide` beat kinds in `ForestWalk.tsx`) is **DEAD CODE** — safe to delete in a cleanup pass.

**Everything lives in one file: `src/components/story/RiverCrossing.tsx`** (does NOT use ForestWalk). It opens with a **1→10 number-line explanation** (`speakSeq`, each number fully spoken before the next) + a guided round, then **10 adaptive rounds rotate through FOUR mini-games** — one continuous `riverOrderBeat` `SkillBeat`:

| Round group | Mini-game | Mechanic | Background |
|---|---|---|---|
| 0–2 | 🪨 **River Crossing** | tap stones smallest→biggest → path, Milo hops over | `River.jpeg` (top-down, zoomed 1.4×) |
| 3–4 | 🌉 **Mend the Bridge** | tap **planks** smallest→biggest (same as stones) | `pond_top.jpeg` |
| 5–6 | 🚂 **Build the Train** | tap **cars** smallest→biggest; line up behind engine | `train_bg.jpeg` (side-view) |
| 7–9 | 🎣 **Go Fishing** | tap **fish** smallest→biggest into the bucket | `fishing_bg.jpeg` (side-view) |

**Key facts (mostly from explicit user feedback — don't regress):**
- Numbers mix **consecutive "pre-ordering"** (1·2·3·4·5, easier) and **random distinct** (4·5·8, harder). **Train is ALWAYS consecutive** (no skipped numbers — user requirement).
- A round counts **wrong** if any out-of-order tap (but the child always completes — warm).
- **Voice:** the demo uses `speakSeq`; in-game taps are blocked while `useIsSpeaking()` so numbers aren't cut; round `say` is short; `finish` does NOT speak in practice (SkillBeat says the praise — that double-speak was a cut source).
- **Voice cut fix #1 — fast taps (2026-06-20):** the `useIsSpeaking()` gate alone wasn't enough — `_speaking` only flips true ~100–150ms after `speak()` (Chrome cancel→speak gap + onstart latency), so a fast 2nd tap slipped through and `speak(nextNumber)` cancelled the current number mid-word. Added a synchronous `tapLock` ref (const `SPEAK_LOCK_MS = 600`) on the **correct-tap** path in BOTH `useOrderTaps` and `CrossingPlay` (the wrong-tap path already had `wrongLock`). Measured a single number = 500–714ms to speak, so 600ms bridges to the `speaking` gate. Verified: full 10-round autoplay through all 4 scenarios, taps paced, no cut, no deadlock, clean finish.
- **Voice cut fix #2 — demo/guided intro (2026-06-20):** instrumented the speech API and found (a) the demo's closing "You crossed! 🎉" was cut mid-word because the demo's `speakSeq` cleanup `cancel()`s on unmount when handing off to guided, and (b) the **guided round was completely silent** (only `demo` mode spoke). Fix in `CrossingPlay`: `finish` now praises out loud only in `guided` mode (demo ends silently after "…ten", nothing left to cut); the mount effect now speaks "Now you! Tap the smallest one first." in `guided` mode. Verified via speech timeline: count 1→10 clean, no trailing cut, guided prompt plays full (~2.8s). (The intro button's "Watch me put the numbers in order…" line never actually plays — suppressed by the demo `speakSeq` ~2ms later — harmless, left as-is.)
- **Water zoomed 1.4×** (`Background`) so water fills the screen, banks are thin. `MiloTop` size **148**; stones **124**.
- **Train:** engine (`train_engine.png`, faces right) on the RIGHT (`ENGINE_X=86`), cars trail LEFT, both **big** (engine 250w, car 190w), sit on the rail (`RAIL_Y=70`).
- **Fishing:** Milo sits **on the dock**; fish spawn in the **darker underwater area** (lower water), not on the surface. Reuses `fish.png` with a code-drawn number badge.
- `OrderItem` is the shared stone/plank sprite (takes `src`/`aria`); `useOrderTaps` is the shared tap-smallest-first hook (crossing/bridge/train/fishing).

**Files:** `RiverCrossing.tsx`, `game/NumberOrderingChapter.tsx`. (skillId `numberOrdering`, shares adaptive state.)

---

## Chapter 3 — Number Comparison: "Milo's Kitchen" ✅ done (2026-06-21)

A **brand-new theme** (deliberately NOT forest/river — user asked to "think in variation"): Milo is a tiny chef cooking a yummy feast; at each station he picks the bigger / **more** one. The skill is `numberComparison` (the existing "Bigger or Smaller" ⚖️ chapter, redesigned as story mode — same as how Ch.1/Ch.2 replaced their drills).

⚠️ **NO magic** (user requirement, 2026-06-21): the first cut was a "Magic Kitchen" with a bubbling cauldron/potion/purple-glow station; the user said they can't show magic, so it was fully de-magicked — file renamed `MagicKitchen.tsx`→**`Kitchen.tsx`** (export `Kitchen`), the cauldron replaced with a **🍎 fruit bowl** (count apples, fresh green bg), all "magic/potion" wording + purple glow removed. Keep it magic-free.

**Everything lives in one file: `src/components/story/Kitchen.tsx`** (does NOT use ForestWalk — same shape as RiverCrossing: phases intro→demo→guided→practice, ONE continuous `kitchenCompareBeat` SkillBeat rotating stations via `stationForRound`). `game/NumberComparisonChapter.tsx` was rewritten to a thin portal wrapper around it (the old drill + `BiggerSmallerLesson` are no longer wired — see TODO).

**The anti-repetition design (the user's #1 requirement — comparison is just one binary tap, so it's the most repetition-prone skill).** Each round varies on FIVE axes, all mapped onto adaptive difficulty so variation = progression:

| Station (rotates EVERY round) | Reasoning cue | Background |
|---|---|---|
| 🍎 **Fruit Bowls** | count apples (discrete) | fresh green kitchen |
| 🍪 **Cookie Trays** | count cookies (discrete grid) | warm amber oven |
| 🎂 **Cake Towers** | compare **height** (taller = more) | cream/pink bakery |
| 🍬 **Candy Jars** | compare **fill level** (fuller = more) | soft pink pantry |

- **Theme changes every round** (2026-06-21, per user — like Ch.1's biome cycling): `stationForRound = STATION_ORDER[round % 4]` → fruit→cookies→cake→jars→fruit…, never two in a row. The bg cross-fades each round; `walkEvery:3` adds only a brief pause every 3 rounds (NOT every round). (Was blocks of 3/2/2/3 — replaced.)
- **Polarity** flips: "more/bigger" only at easy → "fewer/smaller" creeps in at medium+ (kills the always-tap-the-big-blob reflex).
- **Choices**: 2 vessels → occasionally **3** ("which has the MOST / LEAST?") at hard.
- **Symbolic tier**: fruit bowls/cookies show a NUMERAL only (no countable items) at difficulty 3 — concrete→abstract bridge. Cakes/jars stay visual (height/fill is the whole point).
- **Feast strip** (bottom): each round adds its station's treat (🧪🍪🧁🍬) — visible momentum.

**Counted explanation (2026-06-21, per user "3-4 examples that count 1-2-3 on both sides, then show which is bigger"):** the intro now plays FOUR counted examples (`CompareExplain`, one per station so it also previews every theme — fruit 2v4, cookies 3v1, cake 1v3, jars 4v2). Milo counts each group item-by-item (one item revealed per number, a BIG floating number above each vessel ticking up — not a small badge), then the bigger vessel glows. Timer-driven (not `speakSeq`) so it can't hang. The 3-wrong re-teach reuses `CompareExplain`.

**Voice safety (same lessons as Ch.2, don't regress):** the counted explanation is **timer-driven** (not `speakSeq`) so it can't hang; in-game taps gated on `useIsSpeaking()`; synchronous `tapLock` (`SPEAK_LOCK_MS=600`) + `wrongLock` (1300ms); practice `finish` does NOT speak praise (the SkillBeat does — double-speak cuts). Note: in the **headless preview** Chrome's `speechSynthesis.speaking` can wedge `true` and stall taps; the speaker hook's 6s watchdog (`useMiloSpeaker.ts` line ~146) clears `_speaking` so a real device recovers in ≤6s. A clean click always advances.

**Art:** painted (user supplied 2026-06-21). Backgrounds `kitchen_{fruit,oven,bakery,pantry}.jpeg` + `characters/milo_chef.png` auto-load. Vessels: 🍎 `objects/fruitbowl.png`+`apple.png`, 🍪 `objects/bakingTray.png`+`cookie.png`, 🎂 cake = `objects/cakeLayer1.png` stacked N times (height=count) + `objects/cherry.png`, 🍬 jar = **code-drawn clean glass** + `objects/candy.png`. ⚠️ `objects/emptyjar.png` AND `objects/candy.jpeg` are both DEAD — baked-in transparency checkerboard (no alpha), render as gray squares; re-export `emptyjar` transparent to use the painted jar. Image vessels fall back to `*Drawn`; `ItemImg`/`Cherry` have their own fallbacks; cake crops the layer's centred band (`backgroundSize:'100% auto'`), hidden `<img onError>` detects a missing layer.

**Sizing:** vessels scale up via `useVesselScale(n)` (viewport-aware, `Vessel` renders the 188×210 design under `transform:scale`; everything grows together) — ~1.9× on a 1000-wide screen, 2-up wider than 3-up, never overlapping. 2-up x = `[28,72]`, `TOP=56`, Milo `min(26vh,220px)`. Items inside each vessel are now a deterministic **natural pile** (`buildPile` + `CropSprite` + rim occlusion) — see [Session 2026-06-25](#session-2026-06-25--ch3-natural-fruitcandycookie-piles); the old "apples in ONE row" rule is superseded. **Counting numbers** (1·2·3 popping as Milo counts each side) are a separate `CountNumber` (zIndex 47, above the banner) over each vessel's upper area — moved out of `Vessel` because the big vessels clipped them behind the banner.

**Files:** `Kitchen.tsx`, `game/NumberComparisonChapter.tsx`, `app/story/page.tsx` (added `?ch=` switch). (skillId `numberComparison`.)

---

## Assets

All new art lives under `public/assets/`. Numbers are **drawn in code** on top of blank object sprites. Backgrounds are JPEG, objects are transparent PNG.

**Backgrounds:** `forest_1`, `underwater`, `sky`, `garden` (Ch.1) · `River`, `pond_top`, `lake`, `train_bg`, `fishing_bg` (Ch.2) · `kitchen_{fruit,oven,bakery,pantry}.jpeg` (Ch.3).
**Ch.1 creature objects (in use):** butterfly, firefly, fish, turtle, pigeon, snail, squirrel, ant (pre-existing) + `eagle1.png`/`eagle2.png`, `crab.png`. Render as EMOJI until supplied: `octopus.png` 🐙, `rabbit.png` 🐰.
**Ch.3 objects:** `fruitbowl`, `bakingTray`, `cookie`, `candy.png`, `cakeLayer1` (+spare `cakelayer2/3/4`), `cherry`, `apple` (reused). Ch.2 objects: `stone_top`, `plank_top`, `train_engine`, `train_car`, `bucket`.
**Characters:** milo sprites + `milo_top`, `milo_boat`, `milo_fishing`, `milo_underwater`, `milo_chef.png` (Ch.3).
**No longer used (PNGs still on disk):** `parrot.png` (→eagle), `duck.png` (pond removed), `bee.png`, `dragonfly.png`, `frog.png`, `caterpillar.png`.
**DEAD — baked-in transparency checkerboard (no alpha), unusable; re-export as transparent PNG:** `candy.jpeg`, `emptyjar.png`, `butterfly.jpeg`.

Upgrade pattern: drop a PNG at the referenced path and it auto-loads (components have emoji/code-drawn fallbacks).

---

## How to test

`src/app/story/page.tsx` now switches chapters by `?ch=` query param (default = Counting), so no more temporary edits to preview:
- **Counting:** visit `/story` (or `/story?skip=1` to jump straight to the 10-round practice and see biome cycling).
- **Number Order:** `/story?ch=order` (RiverCrossing).
- **Number Comparison:** `/story?ch=kitchen` (Kitchen).
- **Number Recognition:** `/story?ch=doors` (NumberDoors) · **Matching Quantities:** `/story?ch=grocery` (Grocery) · **Shapes:** `/story?ch=shapes` (ShapeTown).
- In-game, each runs via its menu chapter component (`counting` / `numberOrdering` / `numberComparison` / `numberRecognition` / `matchingQuantities` / `shapes`).
- Verified throughout with the preview MCP (landscape, ~1000×620). A handy autoplay snippet (paste in the preview console) taps items in order:
  ```js
  setInterval(()=>{const it=[...document.querySelectorAll('button[aria-label^="stone"],button[aria-label^="plank"],button[aria-label^="car"],button[aria-label^="fish"]')].filter(b=>!b.disabled).map(b=>({b,n:+b.getAttribute('aria-label').split(' ')[1]})).sort((a,c)=>a.n-c.n);if(it.length)it[0].b.click();const go=[...document.querySelectorAll('button')].find(b=>/Let/.test(b.textContent||''));if(go)go.click();},600)
  ```

---

## Pending / TODO

1. ~~**`milo_fishing` art**~~ ✅ **DONE (2026-06-20).** Re-exported as a proper transparent `milo_fishing.png` (2048², RGBA, 77% transparent). Serves `200 image/png`; `RiverCrossing` loads it directly (no `milo_idle` fallback).
2. ~~**Delete dead Ch.2 side-view code**~~ ✅ **DONE (2026-06-20).** Removed `order.tsx`, `orderChapter` (+ its comment) from `chapters.tsx`, and the `orderDemo`/`orderGuide` beat kinds, import, speak-handler, and render blocks from `ForestWalk.tsx`; fixed the stale doc comment in `NumberOrderingChapter.tsx`. `npx tsc --noEmit` clean; `/story` (Counting) still renders correctly in landscape with no console errors.
3. ~~**Tap feedback**~~ ✅ **DONE (2026-06-21).** `fw_tap` pop + green ✓ badge keyframes added to `ForestWalk.tsx`. `PerchedItem` in `world1.tsx` applies them on tap.
4. ~~**Biome cycling**~~ ✅ **DONE (2026-06-21).** `JOURNEY` restructured to count:1 per visit × 5 biomes × 2 passes; `buildPlan` shuffles each pool and tracks a cursor for no-repeat variety.
5. ~~**Creature roster overhaul**~~ ✅ **DONE (2026-06-21).** Removed dragonfly, bee, caterpillar, frog. Added underwater biome (fish + turtle). Pond = duck only. Sky = pigeon + parrot. Garden = snail + squirrel + ant. Updated `SIZE_BOOST` and `CountKind`.
6. ~~**Milo underwater avatar**~~ ✅ **DONE (2026-06-21).** `MiloAvatar` in `ForestWalk.tsx` swaps to `milo_underwater.png` (bob animation) when biome is `'underwater'`.
7. ~~**Ecological creature placement**~~ ✅ **DONE (2026-06-21).** `bandFor` in `world1.tsx` expanded to a full `switch(obj)` covering all 10 creature types — every animal spawns at its natural height (butterfly in canopy, ants/snails on ground, turtles near bottom, etc.).
8. **Optional polish** the user may revisit: scatter tightness, bridge difficulty (Ch.2). Ch.3 painted art is now COMPLETE — bgs, chef, fruit bowl/tray/jar + apple/cookie/candy sprites, and the cake (stacked `cakeLayer1.png` + `cherry.png`). All wired with code-drawn fallbacks; item/layer positions tuned but easy to nudge. Dead file: `objects/candy.jpeg` (superseded by `candy.png`). 3 spare cake-layer variants (`cakelayer2/3/4`) unused if you want alternating tiers later.
9. ~~**Dead code from the Ch.3 swap:** `BiggerSmallerLesson.tsx`~~ ✅ **DELETED 2026-06-26** (together with Ch.4's orphaned `NumberDoorsLesson.tsx`; both confirmed zero importers, `git rm`, `tsc` clean).
10. **Ch.1 pending art / decisions (waiting on user):**
    - Supply `objects/octopus.png` 🐙 and `objects/rabbit.png` 🐰 (emoji placeholders until then). Prompts already given.
    - **Pick the eagle:** `eagle1.png` vs `eagle2.png` currently both cycle in `COUNT_SRC.eagle` for comparison — once chosen, drop the other.
    - Re-export the **dead** files as transparent PNGs if wanted: `butterfly.jpeg` (new butterfly variant), `emptyjar.png` (to swap the code-drawn Ch.3 jar for the painted one).
    - Optional cleanup: unused `CountKind`s `parrot`/`duck`/`bee` (+ their art) can be removed.
11. **Commit when asked** — all of this is uncommitted (`AGENTS.md`: read `node_modules/next/dist/docs/` before Next.js changes; no auto-push).

---

## Files changed

**Modified:** `src/components/game/{NumberOrderingChapter,NumberComparisonChapter}.tsx`, `src/components/story/{ForestWalk,StoryWorld,art,chapters,world1}.tsx`, `src/app/story/page.tsx`
**New code:** `src/components/story/{RiverCrossing,biomes,Kitchen}.tsx`
**New assets (user-supplied this session):** see [Assets](#assets). Ch.3: `backgrounds/kitchen_{fruit,oven,bakery,pantry}.jpeg`, `characters/milo_chef.png`, `objects/{fruitbowl,bakingTray,cookie,candy,cakeLayer1,cherry}.png` (+spare `cakelayer2/3/4`). Ch.1: `objects/{eagle1,eagle2,crab}.png`. Still pending (emoji): `objects/{octopus,rabbit}.png`. Dead (baked checkerboard): `objects/{candy.jpeg,emptyjar.png,butterfly.jpeg}`. All wired with code-drawn/emoji fallbacks.

Detailed, canonical notes also live in the auto-memory: `project-milo-counting-journey.md`, `project-milo-order-chapter.md`, and `project-milo-comparison-chapter.md`.
