# Session Handoff — Milo Story Mode

_Last updated: 2026-06-30_

Concise, current state. Per-chapter detail + conventions live in the auto-memory (`project-milo-*-chapter.md`, `project-milo-demo-voice.md`, `feedback-viewport-scaling.md`, …) — read those for the deep notes.

## LATEST SESSION (2026-06-30 pm) — LAST 3 of the 3–5 chapters converted to story mode (Addition · Subtraction · Measurement) — COMMITTED + PUSHED to `main` → Vercel

**Goal (user):** finish the 3–5 set — convert the remaining 3 drills (addition · subtraction · measurement) to the same 3-world WorldSelect story pattern as the other 8. Same locked structure (3 storytellings × 3 bg × 3 objects), everything must BLEND. **→ The whole 3–5 set (11 chapters) is now story-mode. Committed + pushed to `main` (auto-deploys to Vercel production).**

**DONE — all 3 built, `tsc` + `next build` clean, verified live via `/story?ch=…`:**
- **Ch.9 Addition** — `src/components/story/Orchard.tsx` (+ thin wrapper `game/AdditionChapter.tsx`, preview `?ch=add`). Count both groups → pick the total; "altogether" basket fills as reward. Worlds: 🍎 Orchard · 🐠 Coral Reef · 🚀 Space. REUSED art only.
- **Ch.10 Subtraction** — `LilyPond.tsx` (`game/SubtractionChapter.tsx`, `?ch=sub`). N objects, some LEAVE (staggered drift), count what's left. Worlds: 🐸 Lily Pond (hop in) · 🎉 Party (float up) · 🌙 Night Sky (blink out). REUSED art only.
- **Ch.11 Measurement** — `TallForest.tsx` (`game/MeasurementChapter.tsx`, `?ch=measure`). Tap the bigger one; each world = ONE attribute. 🌳 Tall Forest (height, uniform scale) · 🐍 Long Trail (length, `object-fit:fill` stretch) · ⚖️ Balance Market (weight, code-drawn SEESAW tilts toward heavier).
  - **5 NEW AI sprites** generated (Nano Banana 2, ~7.5 cr) — snake, giraffe, watermelon, pumpkin, flour_sack — referenced original library art (caterpillar/bear/apple/grocery_bun), cutout via remove_background, snake autocropped tight (for fill-stretch), rest square-padded. In `public/assets/objects/`. Backgrounds REUSED from existing photoreal library.
  - **Then EXPANDED each measurement world 3→6 objects** (user wanted more variety; was repetitive cycling only 3 over 10 rounds). All from existing assets: height +tulip/daisy/pine; length +train_engine/bus/fish; weight +crate·egg/bucket·cookie/fruitbowl·candy. Verified live (giraffe/tulip scale, snake/train/bus stretch, watermelon/sack seesaw).

All 3 mirror the Grocery pattern (WorldSelect → intro → demo → guided → one adaptive `SkillBeat` 10-round, reteach after 3, mastery early-exit). Detail in auto-memory `project-milo-{addition,subtraction,measurement}-chapter`.

**REFINEMENTS (same session, after the build):**
- **Measurement expanded 3→6 objects per world** (was repetitive cycling only 3 over 10 rounds) — all existing assets: height +tulip/daisy/pine; length +train_engine/bus/fish; weight +crate·egg/bucket·cookie/fruitbowl·candy. Verified live.
- **Addition + Subtraction now have a STAGED REVEAL** (user: don't dump everything on screen at once). The question builds up — group A pops in one-by-one → `+` → group B → THEN the choices/answer box fade in (subtraction: pop in → the `take` leave → then choices). Object sizes bumped for prominence. `AddPlay`/`SubPlay` drive it with timers; `Stage`/`Group` gained `aShown/bShown/showPlus/showQ` (add) and `shown?/showQ?` (sub). Verified live, `tsc`+`next build` clean.

- **Addition: basket REMOVED** (user said the "ALTOGETHER" basket/box looked bad). No vessel now — on a correct answer (and in the demo) the objects are COUNTED one-by-one (each glows via `lit`) while the answer box climbs 1→total then turns green. `Orchard` `Stage`/`AddPlay`/`AddExplain` use `lit`/`boxValue`/`boxDone`; old `Basket`+`filled` deleted. (Subtraction never had a basket.) Verified live across all 3 worlds, `tsc`+`next build` clean.

- **Demo now pops one-by-one too** (user: the first explanation showed everything in one take). `AddExplain`/`SubExplain` rewritten from `speakSteps` to timer-driven staged pop-in matching the play (each object pops in one at a time counting up, then `+`, then group B; subtraction pops all in → `take` leave → count left). Verified via DOM object-count sampling. Object sizes also bumped big (`clamp(74px,13.5vmin,150px)`) since the old vmin floor read tiny on mobile.

**NEXT:** (committed + pushed to `main` → Vercel). The whole 3–5 set (11 chapters) is now story-mode. Optional follow-ups: smoke-test on prod; apply the same count-up reveal / bigger-object polish to other 3–5 chapters if desired.

---

## EARLIER (2026-06-30 am) — STORYTELLING EXPANSION COMPLETE: ALL 8 of the 3–5 chapters now have 3 picked worlds — COMMITTED + PUSHED

**Goal (user):** give each 3–5 chapter **3 storytellings (worlds), each with its own backgrounds + objects** (the locked structure: **3 storytellings × 3 backgrounds × 3 objects**), chosen by the child from a picker — so it never feels repetitive. The hard requirement throughout: **everything must BLEND** (objects look like they belong in the scene — grounded, sized right, no floating).

**Now COMPLETE — all 8 of the 3–5 chapters refactored to the WorldSelect 3-world pattern (`tsc` + `next build` clean, verified live, committed + pushed to `main` → Vercel production):**
- The 4 below (Counting · Number Order · Recognition · Matching Qty) were done earlier; the remaining 4 were finished this session:
  - **Ch.7 Colours** (`RainbowTown.tsx`): 🌈 Rainbow Town · 🐠 Coral Reef · 🍭 Candy Shop. Objects are code-drawn + **code-tinted greyscale sprites** (colour must stay exact). New AI: reef/candy backgrounds + greyscale sprites (fish/starfish/jelly/lollipop/cupcake/candy).
  - **Ch.6 Shapes** (`ShapeTown.tsx`): 🏙️ Shape Town · 🎪 Fun Fair · 🏖️ Beach Day. Shapes stay exact SVG; per-scene code-drawn "mounts" (kite/lollipop/ribbon/flag/boat/plate). New AI: fair_* + beach_* backgrounds. **Fixed a latent bug:** the shape's `translateX(-50%)` centring was clobbered by the sway/pop `animation` transform → shapes drifted ~½-box right of their mount; split centring (outer) from animation (inner).
  - **Ch.8 Patterns** (`BeadShop.tsx`): 📿 Bead Shop (beads/buttons/gems) · 🎉 Party (flags/balloons/lanterns) · 🧸 Toy Box (cars/blocks/ducks). Items code-drawn + **code-tinted greyscale sprites** (colour is the pattern variable). 9 backgrounds + 9 greyscale sprites.
  - **Ch.3 Comparison** (`Kitchen.tsx`): 🍳 Kitchen (apple/cookie/candy) · 🛒 Grocery (orange/egg/strawberry) · 🧁 Bakery (cupcake/cake/cherry). Quantity not colour → uses **COLOURED** sprites directly: REUSED the existing consistent library + generated only 3 fresh (strawberry/orange/cupcake). Vessel renderers (bowl/tray/jar/cake) parameterised by item sprite. Per-world Milo (chef/grocer).

**REFERENCE-IMAGE RULE — USE ONLY THE ORIGINAL/OLDER IMAGES AS REFERENCES (hard-won, carry forward — do NOT skip):**
- **Always reference the ORIGINAL / earliest art set** — the hand-made / first-batch committed assets like `apple.png`, `cookie.png`, `pear.png`, `duck.png`, `pond.jpeg`, `forest_*.jpeg`. **These are PERFECT for the use case** — correct style, correct object type. **Do NOT use the later-generated images as references** — the newer AI batches drift slightly (style + type are a little off), so referencing them compounds the drift. Older images in, perfect images out.
- **Why later refs failed silently:** Higgsfield `media_import_url` only works on **committed/deployed** URLs. Many later assets were *uncommitted* → the URL 404s → the reference **silently fails to attach** → the model generates from text alone → drift. So the rule is doubly true: the older images are both *on-style* AND *actually deployed* (so the ref attaches). Always verify `media_import_url` returns a `media_id` before generating; if it 404s, that asset is not a usable reference.
- **Pipeline:** for colour-recognition + patterns, objects must be **greyscale** sprites tinted in code (never bake colour into the PNG); comparison keeps colour. Scratch helpers `proc.py`/`proc_color.py`/`measure.py`: cutout via `remove_background` → desaturate (greyscale only) → autocrop to alpha bbox → square-pad (top-align for hanging items) → for Kitchen, measure alpha bbox into `SPRITE_BBOX`.

**Earlier-done 4 chapters (also part of this commit):**

**Done this session — 4 chapters refactored (all `tsc` + `next build` clean, verified live, NOT committed):**

| Ch | File | 3 worlds | `?…` to test |
|----|------|----------|-------------|
| 1 Counting | `ForestWalk`/`biomes.ts`/`world1.tsx`/`chapters.tsx` | 🌳 Nature Walk *(kept)* · 🐔 Farm Day · 🚀 Space Adventure | `/story?story=farm\|space\|nature` |
| 2 Number Order | `RiverCrossing.tsx` | 🪨 River Crossing · 🚂 Train Yard · ☁️ Sky Hop | `/story?ch=order&world=river\|train\|sky` |
| 4 Recognition | `NumberDoors.tsx` | 🚪 Number Doors *(kept)* · 🎈 Balloon Pop · 🚌 Bus Stop | `/story?ch=doors&world=doors\|balloons\|buses` |
| 5 Matching Qty | `Grocery.tsx` | 🛒 Little Grocery *(kept)* · 🍕 Pizza Parlor · 🌻 Flower Garden | `/story?ch=grocery&world=grocery\|pizza\|garden` |

- **Shared picker:** `src/components/story/WorldSelect.tsx` — generic (`{title, worlds:[{id,label,emoji,bgImage}], onPick(id)}`). Each chapter renders it FIRST (world `null` → picker); "play again" / replay re-shows it. Counting also keeps `pickStorytelling()` round-robin for back-compat but the live path uses the picker.
- **Each chapter is config-driven** (`SCENE`/`WORLDS`/`makeXBeat(world)`, beat **memoized** — never build inline or SkillBeat resets). The 10-round adaptive practice + re-teach is unchanged; only the world/scene dressing rotates.
- **Counting** expanded `biomes.ts` 3→9 biomes; **Number Order** generalized its 4 mini-games into 3 mechanics (`path`/`line`/`collect`); **Recognition** uses one `RecogItem` (door-sprite/balloon/bus + numeral chip, `hue-rotate` colour variety); **Matching Qty** uses one `Container` by `cType` (`bag`/`pizza`/`ground`).
- **ART via Nano Banana 2 (~115 credits this session):** new backgrounds (`farm_*`, `space_*`, `order_yard/depot/balloonsky`, `balloon_fair`, `bus_stop/bus_depot`, `pizzeria`, `garden_meadow/fence/park`) + new sprites (chick/lamb/duckling/pear, rocket/star/cloud/planet/comet/satellite/astronaut/moon_rock/alien, lilypad/cart/crate/balloon, bus, pizza_base/topping_olive/mushroom/pepper, flower_tulip/daisy/sunflower). All in `public/assets/`. Per-chapter detail in the auto-memory `project-milo-{counting-journey,order,recognition,grocery}-chapter`; pipeline how-to in `reference-nano-banana-pipeline`.

**BLEND CONVENTIONS (hard-won from user feedback — carry to every new chapter):**
1. **Give EVERY new sprite a `SIZE_BOOST`/size** (~1.8–2.3). Missing = tiny.
2. **Subject-dominant sprites:** a tall stem / big padding renders a tiny subject at any box size → regenerate so the subject fills the frame (e.g. flowers = big bloom, short stem).
3. **Grounded objects** sit low + cast a contact shadow; **flyers** stay airborne with NO ground shadow; **elevated** items (fruit) go on their support (tree canopy via anchor points).
4. **A grounded scene needs a LOW-HORIZON background (>50% ground)** + a tall ground band — else objects "on the ground" end up in the sky. Regenerated barnyard + garden bgs for this.
5. **Prefer flat-surface / open-ground "containers" (pizza disk, grass) over 3D boxes** — items sit ON them, no occlusion, nothing floats. (Toy Shop's 3D box was dropped for this reason → Flower Garden.)
6. **Fisher-Yates shuffle** (not `sort(()=>Math.random()-.5)`) for real round variety.
7. **Numeral chips:** small ON the object (balloon bulb / bus sign), or floating ABOVE a tall object (door) — a big on-object chip hides the object.

**NEXT:** (a) **commit** the batch (user must ask — no auto-push); (b) expand the remaining 3–5 chapters with the same pattern + WorldSelect: **Ch.3 Comparison (`Kitchen`), Ch.6 Shapes (`ShapeTown`), Ch.7 Colours (`RainbowTown`), Ch.8 Patterns (`BeadShop`)**. To preview locally `.claude/launch.json` is on port 3017 + `autoPort` (Linkcage holds 3000).

## EARLIER (2026-06-29 → 30) — three features SHIPPED to production

All `tsc --noEmit` + `next build` clean. **Committed + pushed to `main` → Vercel production READY (live on www.mi2utor.com).** Three logical commits on top of `c4dd322`: `ff47d57` (grades) · `21565b1` (practice early-exit/dedupe) · `5971aa5` (scene grounding). Detail in auto-memory `project-milo-grades-feature`, `project-milo-engagement-improvements`.

1. **Grades feature** (teacher use). Teacher creates a named **grade** = (name + one age band + a hand-picked chapter subset); children are added into a grade and see exactly that grade's chapters. Optional/coexist: a learner with no grade falls back to all band chapters (today's behavior). New tables `grades` + `grade_chapters` + nullable `learners.grade_id`. **Migration APPLIED to prod Supabase** (`qaymxunzlarwusogwyak`, file `supabase/migrations/20260629120000_grades.sql`) — verified (RLS, triggers, search_path pinned). UI: `/parent/grades` (list + create/edit modal), grade selector in AddLearnerModal, menu/picker scope to grade chapters. `createLearner` only sends `grade_id` when a grade is chosen, so existing learners (no grade) are unaffected. **Grades UI now LIVE.** Not yet exercised end-to-end by a real teacher login — worth a smoke test (create grade → add child → child sees only those chapters).

2. **Practice: mastery early-exit + non-repeating questions** (all ages). `useAdaptive.record()` returns `{…, mastered}` (top tier + 6 correct in a row → finish early with full ⭐⭐⭐). New `src/lib/questionVariety.ts` `makeDistinct` dedupes questions per session. `SkillBeat` change covers all 3–5 scenes; ~50 `game/*Chapter.tsx` inline-loop chapters wired via a 57-chapter workflow (refs: `IntegersChapter` A1 / `AdditionChapter` A2). Math-without-fear preserved.

3. **Object placement re-grounded** (all 8 story scenes). Replaced the flat even-row `layoutFor` with depth-aware placement: per-object depth (near=bigger+lower, far=smaller+higher), a soft contact-shadow ellipse on a per-scene ground line, organic x jitter. Ref impl `RainbowTown.tsx` (`placeFor`/`SCENE_GROUND`/contact shadow in `ColorThing`); rolled to the other 7 (free-standing scenes fully grounded; Grocery shelf + BeadShop necklace kept their composition + shadow cues; ForestWalk butterflies scatter at depth, no ground shadow). All verified live at `/story?ch=<key>`.

**Asset pipeline (Higgsfield MCP / Nano Banana 2):** connected for AI image gen. Model `nano_banana_2`, **metered ~1.5 credits/1k image** (NOT unlimited — verified), Plus account ~1,208 credits. **1k for everything** (1k @16:9 = 1376×768 = exact match to existing backgrounds; 1k @1:1 ≈ 1024² for sprites). STANDING RULE (see `feedback-higgsfield-reference-images`): always pass the **pond/forest/objects** assets as reference images for style consistency; **never regenerate existing art** unless asked. Import refs via deployed URLs (`https://milo-story-mode.vercel.app/assets/...`) → `media_import_url` → `media_id`; sprites need `remove_background` (+ greyscale for recolorable objects). Nothing generated/committed yet — awaiting a specific target.

**Next:** (a) teacher-login smoke test of grades on prod; (b) when asked, generate new app art via Nano Banana 2 against the pond/forest/objects references. To preview `/story` locally, set `.claude/launch.json` port to a free one (Linkcage holds 3000); the OAuth callback wants 3000.

## TEEN EXPANSION 12–18 ("Field Lab") — earlier focus

Extending Milo to 12th grade. Curriculum + framing LOCKED; see `docs/curriculum-12-18.md`,
`docs/framing-12-18.md`, `docs/teen-kit-build-contract.md`, `docs/teen-kit-interfaces.md` and the
auto-memory `project-milo-{12-14,15-16,17-18}-curriculum`, `project-milo-teen-framing`,
`project-milo-teen-engagement`.

- **Bands:** 12–14 (middle), 15–16 (Algebra I + Geometry), 17–18 (Algebra II/Pre-Calc/Stats/**intro Calc**, 13 ch).
- **Design = "Milo Field Lab":** ONE mature dark-first design language that ages up (Milo: character→collaborator). NOT a cartoon story (teens reject that). Theme = scoped `[data-band]` token blocks in `globals.css` (IBM Plex + mono math); kit in `src/components/teen/` (16 components + `sims/`).
- **Every chapter = the SAME fundamentals:** portal wrapper → **intro (CaseCard) → Explore (interactive sim) → lesson (TeenLessonShell worked examples) → adaptive practice (`useAdaptive` L1/L2/L3) → re-explanation (ReteachPanel after 3 misses) → MasteryState.** Math-without-fear kept (no timer/red-X/visible tier). Mirror `IntegersChapter`/`IntegersTeenLesson`/`LineExplorer`.
- **Sims (engagement lever):** a play-with-it-first interactive per chapter (slider-driven, reuse `CoordGrid`/`FigureDiagram`). e.g. slope, balance-scale, parabola (live vertex/discriminant/roots), systems-intersection, Pythagoras, percent-bar.
- **SHIPPED to production (2026-06-29):** **12–14 (12 ch)** and **15–16 (12 ch)** — all with sims, lessons, adaptive practice, re-teach. = **24 of 37** teen chapters. Committed `c4dd322` on `main` → Vercel production **READY** (live on www.mi2utor.com). The live 3–11 app is unaffected (teen theme + content are additive + age-gated).
- **DB applied to prod Supabase** (`qaymxunzlarwusogwyak`): `age_group` CHECK widened to all 6 bands; chapter rows seeded for 12–14 (sort 36–47) + 15–16 (48–59). To see teen content on prod, create a learner in the 12–14 or 15–16 age group.
- **Dev preview routes shipped too** (harmless, no data, but public): `/teen-preview?c=<id>`, `/kit-preview`, `/sim-preview`, `/integers-preview`. Remove/gate before a wider launch if desired.
- **NEXT: build the 17–18 band** (13 ch + sims, incl. unit-circle drag + secant→tangent limit), then fan-in (sort 60–72) + seed migration + deploy.
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

- **Ch.1–8 committed + deployed to production** (www.mi2utor.com / milo-story-mode.vercel.app). As of 2026-06-29, `main` + Vercel production are at **`c4dd322`** (Ch.8 Bead Shop, the blocked-audio voice fix, `CLAUDE.md`, AND the teen 12–18 expansion are all shipped — see the TEEN EXPANSION section above).
- **3 drills remain to convert (3–5):** addition · subtraction · measurement.

## SESSION 2026-06-28 (historical — Ch.7 colours + explanation-pacing fixes)

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

- **Live app (Vercel production):** https://milo-story-mode.vercel.app/ · also https://www.mi2utor.com
  - Latest production deploy: commit `4bfa6eb` (all 11 of the 3–5 chapters in story mode) — state READY.
  - Preview a 3–5 chapter directly: `https://milo-story-mode.vercel.app/story?ch=add|sub|measure|order|kitchen|doors|grocery|shapes|rainbow|beads`
- **Repo:** github.com/Rafiquekuwari/milo — `main` auto-deploys to Vercel production (project `milo-story-mode`, team `team_HQsF3tfxAuGgZi7CcdhSdN7Y`).
- **Detail:** the auto-memory `project-milo-*` files (one per chapter + sync/scaling/voice/launch-readiness).
