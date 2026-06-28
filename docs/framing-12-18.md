# Framing / Storytelling — New Bands 12–14, 15–16, 17–18 (LOCKED 2026-06-28)

Product name for the teen scope: **"Milo Field Lab."** ONE design language + the EXISTING engine,
aging up — not three separate aesthetics. Companion to [docs/curriculum-12-18.md](./curriculum-12-18.md).

## Locked decisions (this session)
- **No visible adaptive tier on any band** (drop the proposed 15–16 Drafting→Engineer→Lead role
  tier). Honors the locked invisible-difficulty rule; progress shown only as *accumulation*.
- **Ambient meta-rewards in v1**: the 15–16 studio skyline (each shipped commission adds a block)
  + cross-chapter portfolio/binder spines.
- **Build order: shared kit first** — theme block + framing components + all 5 input primitives —
  before authoring chapters, so the HS bands aren't blocked later.
- Fonts: **IBM Plex Sans** (UI/body) + **IBM Plex Mono** (ALL math/numbers/coords/fractions).
  Open-licensed; mono-math is the load-bearing maturity signal across all 37 chapters.
- One **teal/cyan accent family**, three brightness steps across bands.
- One **evolving Milo monogram**: `M` (12–14) → `M.` (15–16) → `M·` + optional voice waveform (17–18).
- **12–14 light-default** (graph-paper), **15–18 dark-default**. Dark mode first-class everywhere.
- Voice: 12–14 on / 15–16 off-by-default / 17–18 optional; single global toggle.

## The aging-up spine
1. **Milo's embodiment**: 3–5 illustrated fox → 6–8/9–11 kit guide (PNG + bubble) → 12–14 line-art
   `M` monogram → 15–16 corner `M.` avatar → 17–18 presence-only `M·` mark + calm voice. Same voice
   engine, steadily less "character," more competent peer.
2. **Framing metaphor**: literal story → lesson kit → Investigation (case file) → Studio commission
   (brief → build → review) → Analyst module. All teen framings are the SAME three-act loop
   (hook → worked reference → your turn → re-run), relabeled.
3. **Reward gravity**: confetti+stars → coins/shop → findings-log + SOLVED stamp → "Commission
   shipped" + portfolio/skyline → "Module complete, N concepts confirmed" ledger. Always additive,
   never subtractive (no losable stars).

## Per band
| Band | Milo | Look | Chapter framing | Reward |
|---|---|---|---|---|
| 12–14 | line-art `M` lab partner ("left you good notes") | field-journal/maker-lab; light graph-paper #F4F6F8 (dark #14181D on toggle); teal ink #2E7D8C; Inter + Plex Mono | "Investigation" case file with a real-world hook | findings log fills → hairline "SOLVED" stamp + completed real-world answer; mastered chapters = filled binder tabs |
| 15–16 | corner `M.` analyst peer (studio lead reviewing a junior) | dark CAD/drafting studio #10141A–#161B22, 1px blueprint grid, drafting cyan #3DD6C4; left project-tree + central drafting surface + right spec panel | "Commission: brief → build → review" | spec rows lock in → "Commission shipped" → portfolio shelf + **studio skyline grows** (v1) |
| 17–18 | presence-only `M·` mark + calm voice (research-coach TA) | dark analyst console #0E1116; plotted curves, sparklines, applied-card chips; two-zone canvas + slim panel | "Study module" opened with a compact applied card | feature lights teal on canvas → "Module complete — N concepts confirmed" ledger + "where this goes next" pointer |

## Shared design system ("Field Lab" tokens)
A single **CSS-variable `[data-band]` override block** that REMAPS existing global tokens — band
identity in one place, **no component forks**:
- `--bg-page`/`--paper` → graphite/charcoal (light off-white-graph for 12–14, dark for 15–18; dark-first)
- `--ink` → cool slate · `--milo-orange` → teal/cyan accent (annotation-only)
- `--garden-green` → kept, as the quiet correct-reveal · `--apple-red` → **never used**
  (wrong = neutral slate dim + thin amber underline #E8A33D/#E8B04B)
- `--font-numeric` → **IBM Plex Mono** for all math/numbers/coords/equations/fractions
- Motion: retire bounce/jump/confetti/sparkle for teen scope → 150–300ms fades/slides, curve
  draw-on (stroke-dasharray), value-settle ticks; honor `prefers-reduced-motion`.
- Layout: roomy single-column notebook (12–14) → project-tree + drafting surface + spec panel (15–18);
  hairline 1px borders, faint graph/blueprint backdrop, binder/spec-sheet chrome.

## Reuse vs new
**REUSE UNCHANGED:** `useAdaptive` (L1/L2/L3 promote/demote/re-teach); explanation→practice→re-teach
flow; LessonScaffold step-driver / StepHost remount-replay / back-skip-confirm / self-paced reveal;
`createPortal` overlay; `finishAndSync`/offline-queue/cross-device sync; chapters registry +
chapters-as-data DB; grammar.ts; positive-only streak; Web Speech (speakSeq, blocked-audio-safe).
The CSS-variable architecture itself is the reuse hook.

**REUSE-BUT-RESKINNED (token/variant, same component):** LessonScaffold Shell, AdvancePopup, cheerFor
microcopy banks, ListeningHint, streak chip.

**NEW (build once, shared) — Step-3 kit:**
- **~9 framing components:** `TeenLessonShell` (drives all 37 chapters), `BandTheme` token block,
  `MiloMark` (M/M./M· variants), `CaseCard`/`BriefCard` (applied-hook card → scaffold step 1),
  `NotebookPanel`/`DraftingSurface`/`WorkspaceCanvas` (work surface), `SpecPanel`/`FindingsLog`,
  `CalmAdvance` (reskin of AdvancePopup+cheerFor; per-band peer microcopy), `MasteryState`
  (SOLVED / Commission shipped / Module complete — 3 variants), `StreakMarker` (mono, no flame),
  `ProgressRail`+`ProjectTree`, `StudioSkyline` (15–16 ambient, v1).
- **5 input primitives:** `coordGrid` (L — xy/complex-plane/unit-circle/site-plan; ~16 chapters;
  ship MVP in 12–14 `coordinatePlane` then harden), `numberLine` (S), `fractionEntry` (M,
  equivalence-aware), `figureDiagram` (M), `stepSelect` (M). Safe answer formats only — MCQ /
  structured two-field / tap-to-plot, **never a free-text parser**.

**DELETE from teen scope:** SectionBreak (already unused), Confetti, SparkleAt, CountBadge/BigCount
bounce, the illustrated-Milo Shell variant.
