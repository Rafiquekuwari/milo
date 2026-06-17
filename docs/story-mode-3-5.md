# Milo Story Mode — 3–5 redesign (story worlds)

Status: design / script (2026-06-17). Driven by real kid feedback: the
slide-by-slide "explain → explain → explain" drill format frustrated 3–5s and
they quit. Fix = wrap the same skills in a **continuous story** where Milo the
fox travels a path with a goal: walk → meet something → help Milo → cheer →
walk on. Engagement is the foundation; coverage is secondary.

## Non-negotiable core — the SkillBeat (never lost, in every scene)
The story is the *wrapper*; the pedagogy is a reusable **SkillBeat** dropped into
every scene. A SkillBeat ALWAYS contains:
- **Adaptive difficulty** — story stays the same, the challenge inside flexes
  (count 3 vs 8; compare close vs far). Reuses the existing `useAdaptive` engine.
- **Re-explanation as a story moment** — on the existing struggle trigger (~2–3
  wrong), Milo gently steps in *in-story* ("Hmm, let's look together"),
  demonstrates, hands it back. No red X, no kicking out. A friend helping fits a
  story better than it fit the drills.
- **Warm wrong-answers / no timer / no fear / invisible difficulty** — preserved
  exactly (see [[project-math-without-fear]] rules).

This guarantees adaptive + re-teach are present everywhere **by construction**.

## Animation / art approach
- **Now (engine + motion):** build the story flow, walking path, scene
  transitions and SkillBeats in code with **Framer Motion** + the existing
  art/emoji. Smooth on low-end tablets, fast to build, enough to test the format.
- **Later (premium art):** drop in **Rive** (interactive character) / **Lottie**
  (scene animation) `.riv`/JSON files once the format is validated. Structure the
  Milo character + scene props as swappable components so this needs no rearchitecting.
- **Three.js / WebGL: deferred.** Too heavy for the target devices and too big a
  build to bet on before retention is proven; 2D character animation out-engages
  clunky 3D for this age. Revisit for selective "wow" scenes post-validation.

## Curriculum coverage (3–5)
Already covered by the current chapters: counting, number recognition, number
order, matching quantity, more/less, add, subtract, shapes, colors, patterns,
measurement. Gaps worth adding:
- **Subitizing** — instantly seeing 1–5 without counting.
- **Positional/spatial words** — in / on / under / behind.
- **Sorting & classifying** — grouping by colour/shape/size (explicit).

## Story-world roadmap (each world = one adventure, full curriculum across 3–4)
1. **The Number Forest** (Picnic) — counting · number doors · matching quantity ·
   more/less · number order · subitizing. *Core number sense.* ← build + test first.
2. **Milo's Kitchen** — adding & taking away (food) · full/empty.
3. **Shape Town** — shapes · patterns · sorting · colours · positional words.
4. **Measure Mountain** (optional) — tall/short · heavy/light · big/small.

---

## World 1 script — "Milo's Picnic Party" (The Number Forest)
Goal that pulls the kid forward: Milo is throwing a picnic; he travels the forest
path gathering things and inviting friends. Friends accumulate as you go. Walks
are ~2s hops, skippable on replay. Each scene = a SkillBeat (adaptive + re-teach).

- **Scene 0 — Milo's door (hook).** "Hi [name]! I'm having a PICNIC with all my
  friends! Will you help me get ready? Let's go!" → step onto the path.
- **Scene 1 — Firefly path (COUNTING + subitizing).** Count the fireflies lighting
  the way (1–2–3…). Adaptive: how many fireflies. Re-teach: Milo counts them slowly
  with the child if they miss.
- **Scene 2 — Friends' doors (NUMBER RECOGNITION).** "Bunny is behind door 3 —
  knock on it!" Recognize the numeral; friend joins. Adaptive: numeral range.
- **Scene 3 — Apple tree (MATCHING QUANTITY).** "Put 4 apples in the basket for the
  pie." Make a quantity. Adaptive: target count. Re-teach: Milo drops them in one
  by one, counting.
- **Scene 4 — Two berry baskets (MORE/LESS).** "Who picked more — Squirrel or
  Bunny?" Compare. Adaptive: how close the amounts are.
- **Scene 5 — Stepping stones (NUMBER ORDER).** "Hop the stones in order, smallest
  first!" Sequence. Re-teach: Milo lights the next correct stone.
- **Scene 6 — The picnic (payoff).** All friends gathered; final happy count of
  everyone; reward. "Best picnic ever — thank you for helping me!"

## Build plan
1. Build the reusable **SkillBeat** wrapper (adaptive + re-teach + warm feedback),
   reusing the existing chapter interactions as the beat's interior.
2. Build **World 1** as a playable prototype: a side-scrolling path, Framer Motion
   walks/transitions, the 6 scenes above, friends accumulating.
3. **Test with real kids.** If engagement/retention jump → templatize and build
   Worlds 2–4. Then commission Rive/Lottie art to replace the placeholder motion.
