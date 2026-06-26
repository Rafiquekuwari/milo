# Session Handoff — Milo Story Mode (Chapters 1, 2 & 3)

_Last updated: 2026-06-25_

## TL;DR
Three 3–5 story chapters are built: **Ch.1 Counting** (`ForestWalk`), **Ch.2 Number Order** (`RiverCrossing`), **Ch.3 Number Comparison** (`Kitchen`). This session (2026-06-21 → 22) did two big things:

1. **Built Chapter 3 — "Milo's Kitchen"** (number comparison), a brand-new non-forest/river theme: Milo the chef picks the bigger / more one across 4 rotating stations (fruit bowls · cookie trays · cake towers · candy jars). Started as a "Magic Kitchen" but **de-magicked per user** (no cauldron/potion/magic). User supplied painted art mid-session; all wired with code-drawn fallbacks. Counted explanation, big floating numbers, viewport-aware sizing. See the Chapter 3 section below.

2. **Reworked Chapter 1 (Counting) heavily** from user feedback: removed the **pond biome** (+duck); **parrot → eagle**; objects now **blink until tapped** (no more ✓ checkmark); count **numbers shown on each object** in the explanation; **no object repeats in a session** (12 unique creatures); garden creatures (squirrel/ant/snail) pinned to the **open ground**; **eagle bigger + flies below the sun**; **bee removed**; tap-difficulty fixed (less object bunching). See the Chapter 1 section below.

⚠️ **Pending art the user still needs to supply (render as emoji until then):** `objects/octopus.png` (🐙), `objects/rabbit.png` (🐰). Dead/unusable files (JPEGs/PNGs with the transparency **checkerboard baked in** → gray squares): `objects/candy.jpeg`, `objects/emptyjar.png`, `objects/butterfly.jpeg` — must be re-exported as true transparent PNGs to use.

⚠️ **Nothing is committed.** All work is in the working tree (modified + untracked files — see [Files changed](#files-changed)). The repo's last commit is `7057fb6`. Per project convention, **do not commit/push/deploy unless explicitly asked.**

To preview a chapter standalone, see [How to test](#how-to-test).

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
- In-game, all three run via the menu chapter components (`counting` / `numberOrdering` / `numberComparison`).
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
