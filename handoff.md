# Session Handoff — Milo Story Mode

_Last updated: 2026-06-28_

Concise, current state. Per-chapter detail + conventions live in the auto-memory (`project-milo-*-chapter.md`, `project-milo-demo-voice.md`, `feedback-viewport-scaling.md`, …) — read those for the deep notes.

## TEEN EXPANSION 12–18 ("Field Lab") — current focus

Extending Milo to 12th grade. Curriculum + framing LOCKED; see `docs/curriculum-12-18.md`,
`docs/framing-12-18.md`, `docs/teen-kit-build-contract.md`, `docs/teen-kit-interfaces.md` and the
auto-memory `project-milo-{12-14,15-16,17-18}-curriculum`, `project-milo-teen-framing`,
`project-milo-teen-engagement`.

- **Bands:** 12–14 (middle), 15–16 (Algebra I + Geometry), 17–18 (Algebra II/Pre-Calc/Stats/**intro Calc**, 13 ch).
- **Design = "Milo Field Lab":** ONE mature dark-first design language that ages up (Milo: character→collaborator). NOT a cartoon story (teens reject that). Theme = scoped `[data-band]` token blocks in `globals.css` (IBM Plex + mono math); kit in `src/components/teen/` (16 components + `sims/`).
- **Every chapter = the SAME fundamentals:** portal wrapper → **intro (CaseCard) → Explore (interactive sim) → lesson (TeenLessonShell worked examples) → adaptive practice (`useAdaptive` L1/L2/L3) → re-explanation (ReteachPanel after 3 misses) → MasteryState.** Math-without-fear kept (no timer/red-X/visible tier). Mirror `IntegersChapter`/`IntegersTeenLesson`/`LineExplorer`.
- **Sims (engagement lever):** a play-with-it-first interactive per chapter (slider-driven, reuse `CoordGrid`/`FigureDiagram`). e.g. slope, balance-scale, parabola (live vertex/discriminant/roots), systems-intersection, Pythagoras, percent-bar.
- **DONE + build-green (UNCOMMITTED until this push):** **12–14 (12 ch)** and **15–16 (12 ch)** — all with sims, lessons, adaptive practice, re-teach. = **24 of 37** teen chapters.
- **DB applied to prod Supabase** (`qaymxunzlarwusogwyak`): `age_group` CHECK widened to all 6 bands; chapter rows seeded for 12–14 (sort 36–47) + 15–16 (48–59).
- **NEXT: build the 17–18 band** (13 ch + sims, incl. unit-circle drag + secant→tangent limit), then fan-in (sort 60–72) + seed migration.
- **Add a teen chapter:** add id to `ChapterType` + `CHAPTERS` (ageGroups) in `chapters.ts`, dispatch line in `game/page.tsx`, seed migration row; `npx tsc --noEmit` then `next build`. Preview any teen chapter: `/teen-preview?c=<id>`; kit gallery `/kit-preview`; a sim `/sim-preview`.
- **Known z-index rule:** kit body-portals (CalmAdvance, leave-dialog) MUST be z>900 or they hide behind the chapter portal (fixed 2026-06-28).

---


## Where things are

**EIGHT of the 3–5 skills are now story chapters** (each: a story component + a thin `createPortal` wrapper in `game/*Chapter.tsx` that calls `finishAndSync(skill,…)` + `CelebrationModal`; preview standalone via `/story?ch=…`):

| Ch | Skill | Component | `?ch=` |
|----|-------|-----------|--------|
| 1 | Counting | `ForestWalk` | (default) |
| 2 | Number Order | `RiverCrossing` | `order` |
| 3 | Comparison | `Kitchen` | `kitchen` |
| 4 | Recognition | `NumberDoors` | `doors` |
| 5 | Matching Qty | `Grocery` | `grocery` |
| 6 | Shapes | `ShapeTown` | `shapes` |
| 7 | Colours | `RainbowTown` | `rainbow` |
| 8 | Patterns | `BeadShop` | `beads` |

- **Ch.1–7 committed + deployed to production** (www.mi2utor.com / milo-story-mode.vercel.app), Vercel READY at **`3f9d847`**.
- **Uncommitted (built + verified, NOT pushed):** Ch.8 Bead Shop + the blocked-audio demo fix + the new `CLAUDE.md`.
- **3 drills remain to convert:** addition · subtraction · measurement.

## This session (2026-06-28)

- **2 non-AR Tier-0 fixes:** `useAdaptive` stale-closure → ref snapshot (rapid taps no longer corrupt promote/demote); removed the dead middleware auth guard (it bounced signed-in users to `/auth` on PWA cold launch; session is in localStorage, not cookies).
- **Ch.7 Rainbow Town (colours):** built + painted art + **greyscale-tint objects** (one greyscale sprite → tinted to the exact hex via mask-fill + multiply, so colours stay consistent with labels) + **cars sit on the road** (per-scene lower band, grouped right of Milo).
- **"Meet every colour/shape" showcases** added to Ch.6 + Ch.7 (all six shown, named one-by-one).
- **Explanation-pacing fixes** (the recurring "fast / without voice" reports):
  1. Showcases are **self-paced** (deterministic ~1.5s/item) — short single words race when tied to speech events.
  2. `speakSteps` silent-fallback hardened (2.8s grace, started-guards, 1.4s step) + `unlockSpeech()` on intro taps.
  3. **Blocked-audio fix:** gate speakSeq's `onDone` on `started` so a demo whose utterances `onerror` (no audio) falls through to the deliberate timer-fallback instead of flashing past. Verified by simulating blocked audio (demo: ~130ms flash → ~6.8s paced).
- **Committed + deployed** everything through Ch.7 to GitHub + Vercel (3 logical commits; `.claude/` gitignored).
- **Ch.8 Bead Shop (patterns):** Milo threads beads onto a necklace, child taps the bead that comes next; "what comes next" only, unit ramps AB→ABC→ABCD; code-drawn glossy beads; full autoplay verified.
- Added `CLAUDE.md` (reads `@AGENTS.md` + `@handoff.md` at session start; `/handoff` convention).

## Decisions / standing rules

- **No commit/push/deploy unless explicitly asked.**
- **This is Next.js 16 with breaking changes** — read `node_modules/next/dist/docs/` before Next code (e.g. `middleware`→`proxy` rename). `next build` does NOT gate on eslint; the wrapper `setBody(document.body)` `set-state-in-effect` "error" is accepted (it's in every shipped wrapper).
- **New story chapter = mirror ShapeTown/RainbowTown:** intro→demo→guided→practice, ONE adaptive `SkillBeat`; the Play renders **fixed-position bands** (SkillBeat stacks its own prompt button, so an `absolute inset:0` stage collapses); keep it code-drawn with optional `<img>`/sprite auto-upgrade hooks; clear Milo (bottom-left).
- **Demo voice:** short-word LISTS (showcase/counting) → self-paced fixed timer + `speak()` per word; SENTENCE demos → `speakSteps` (now blocked-audio-safe). Never fixed-timer multi-line `speak()` (cuts).
- **Viewport scaling:** no hard-coded sprite px on a 100vw stage — use a scale hook; verify ~1900px.
- **Recolorable objects:** greyscale sprite + code-tint (don't bake colour into PNGs for colour-recognition).

## Next steps

1. **Build the 17–18 band** (13 chapters + sims, incl. intro Calculus) — same pattern as 12–14/15–16, then fan-in (registry + dispatch + seed migration sort 60–72) and deploy. Completes the 37-chapter teen set.
2. **(3–5 backlog)** Convert the remaining drills: addition · subtraction · measurement.
3. **Optional art:** drop `backgrounds/bead_shop.jpeg` + `characters/milo_beads.png` to auto-upgrade Ch.8.
4. **Deferred (user's call):** AR work (consolidate `useHandGesture`/`useHandPincher`; AR chapters always score 3 stars); the architecture-audit medium/low backlog (offline-sync de-dupe, legacy lessons→`_kit`, `ResizeObserver` vs the 150ms poll, 2 DB indexes, parent-dashboard RPC, vitest+CI, remaining Tier-0: `acceptInvite` expiry, unbounded `/insights` fetch, `daily.ts` DST).

## Open questions / blockers

- **Does Milo's voice play *anywhere* on the user's test device** (e.g. on a practice-answer tap or the 🔊 button)? Determines whether the remaining "without voice" is a device/audio issue (no TTS/muted/autoplay) vs an unlock-timing issue with the auto-played demo. The pacing is now deliberate regardless; voice is the open item.

## How to test

`npm run dev` → `/story?ch=<key>` (table above; default = Counting). In-game, each runs via its menu chapter. Headless preview never fires speech `onstart` (so demos use the timer-fallback) — fine for verifying pacing/visuals, not real audio.

## Resources

- **Live:** www.mi2utor.com · milo-story-mode.vercel.app
- **Repo:** github.com/Rafiquekuwari/milo — `main` auto-deploys to Vercel production (project `milo-story-mode`, team `team_HQsF3tfxAuGgZi7CcdhSdN7Y`).
- **Detail:** the auto-memory `project-milo-*` files (one per chapter + sync/scaling/voice/launch-readiness).
