# Curriculum — New Age Bands 12–14, 15–16, 17–18 (LOCKED 2026-06-28)

Extends Milo to 12th grade. Built on the same pattern as 6–8 / 9–11:
**explanation → practice → adaptive re-explanation** on the `_kit.tsx` LessonScaffold
+ `useAdaptive` (L1/L2/L3 promote/demote/re-teach) engine. Each chapter ships as a
lesson+practice component, a registry entry in `src/lib/chapters.ts`, a `CHAPTER_COMPONENTS`
dispatch line in `src/app/game/page.tsx`, and a `public.chapters` DB seed row.

Locked decisions (this session):
- 3 new bands: **12–14** (middle), **15–16** (Algebra I + Geometry), **17–18** (Algebra II / Pre-Calc / Stats / **intro Calculus**).
- HS bands use **new input types + MCQ backbone**; 12–14 stays tap/MCQ + simple numeric entry.
- Generic / international (no country-specific notation, currency, or unit labels).
- Standard depth, grade-mapped.
- 12–14 & 15–16 = 12 chapters; 17–18 = **13 chapters** (calculus added per owner call).
- All `id`s are unique and collision-free vs the existing 35 chapters (3–5 / 6–8 / 9–11).

---

## Band 12–14 — theme: "field journal / maker-lab"
Tween reskin: drop the picture-book Milo; clean modern palette, real diagrams over cartoon
sprites; each chapter is an "investigation" with a real-world hook (sports stats, recipes,
game economies, maps, builds). Warm, no-judging, invisible-difficulty tone kept. Quiet
mastery celebration, no confetti slides. Fits the existing kit; tap + numeric-entry primary.

| # | Chapter | id | Type | New primitive |
|---|---|---|---|---|
| 1 | Integers & the Number Line | `integers` | NEW | numberLine |
| 2 | Operations with Signed Rational Numbers | `signedRationalOps` | NEW | — |
| 3 | Fraction & Decimal Operations | `rationalOps` | EXTEND ← fractionsCompare | fractionEntry |
| 4 | Ratios, Rates & Proportions | `ratioProportion` | NEW | — |
| 5 | Percentages | `percentages` | NEW | — |
| 6 | Exponents, Square Roots & Scientific Notation | `exponentsRoots` | NEW | — |
| 7 | Order of Operations | `orderOfOperations` | NEW | — |
| 8 | Algebraic Expressions | `algebraicExpressions` | NEW | — |
| 9 | Equations & Inequalities | `equationsInequalities` | NEW | — |
| 10 | The Coordinate Plane | `coordinatePlane` | NEW | **coordGrid (MVP here)** |
| 11 | Linear Relationships & Functions | `linearRelationships` | NEW | — |
| 12 | Area, Volume & the Pythagorean Theorem | `geometryMeasurement` | EXTEND ← areaPerimeter | figureDiagram |

Difficulty ramps (L1→L2→L3):
1. `integers` — read/compare on a labelled line → absolute value & ordering negatives without a line → position/distance reasoning.
2. `signedRationalOps` — add/subtract integers crossing zero → multiply/divide w/ sign rules, subtract a negative → signed fractions & decimals, short chains.
3. `rationalOps` — +/- unlike denominators (review) → multiply fractions/decimals, mixed +/- → divide fractions/decimals, multi-step.
4. `ratioProportion` — write/simplify & equivalent ratios → unit rate / best buy → solve a proportion for the unknown + word problems.
5. `percentages` — percent↔fraction↔decimal & benchmarks → percent of a quantity / find the percent → increase/decrease + reverse via scaffolded division.
6. `exponentsRoots` — evaluate powers & perfect-square roots → exponent laws, zero exponent, scientific notation → estimate non-perfect roots, rational vs irrational, negative exponent meaning.
7. `orderOfOperations` — two-op expressions → brackets + one exponent → full order with brackets, exponents, negatives.
8. `algebraicExpressions` — write & evaluate at a value → combine like terms & distribute → multi-variable simplify/evaluate.
9. `equationsInequalities` — one-step (all ops) → two-step + one-step inequalities (pick matching line image) → variables both sides + sign-flip inequalities.
10. `coordinatePlane` — identify a plotted point & quadrant → plot a given pair by tapping → distance on a shared axis + reflection across an axis.
11. `linearRelationships` — complete a table from a rule & is-it-a-function → slope/rate from table or two points, recognise y=mx → match equation↔line, read y=mx+b from a graph.
12. `geometryMeasurement` — area of triangle & parallelogram, perimeter → circle area/circumference, prism SA/volume → Pythagorean missing side + composite area.

---

## Band 15–16 — theme: "design studio / city-builder"
Junior engineers/architects using math to model, build, analyse. Calm dark-mode-friendly
studio aesthetic, blueprint/graph motifs. Milo is a low-key lab partner who poses challenges
and explains the why. Real-world framings (ramps, budgets, trajectories, structures, surveys).

| # | Chapter | id | Type | New primitive |
|---|---|---|---|---|
| 1 | Signed Numbers & Real-Number Fluency | `signedNumberFluency` | EXTEND ← decimals | — |
| 2 | Expressions & Variables | `expressionsVariables` | NEW | — |
| 3 | Linear Equations & Inequalities | `linearEquationsInequalities` | NEW | **stepSelect** |
| 4 | Slope & Linear Graphs | `slopeLinearGraphs` | NEW | coordGrid |
| 5 | Functions: Notation, Linear & Exponential | `functionsFamilies` | NEW | — |
| 6 | Systems of Equations | `systemsOfEquations` | NEW | — |
| 7 | Exponents & Polynomials | `exponentsPolynomials` | EXTEND ← multiplication | — |
| 8 | Radicals & the Pythagorean Theorem | `radicalsPythagorean` | NEW | — |
| 9 | Factoring | `factoringPolynomials` | EXTEND ← factorsMultiples | — |
| 10 | Quadratics & Parabolas | `quadraticsParabolas` | NEW | — |
| 11 | Geometry: Mensuration & Transformations | `geometryTransformations` | EXTEND ← anglesSymmetry | — |
| 12 | Triangles, Proof & Right-Triangle Trig | `geometryProofTrig` | EXTEND ← anglesSymmetry | — |

Sequencing note: `radicalsPythagorean` (#8) is intentionally **before** `quadraticsParabolas`
(#10) because the quadratic formula needs radical simplification. `stepSelect` (next-correct-step
MCQ) is introduced in #3 and reused for proofs in #12.

Difficulty ramps (L1→L2→L3):
1. `signedNumberFluency` — add/subtract signed & order rationals → multiply/divide & multi-step → classify rational/irrational, order of ops with negatives & exponents.
2. `expressionsVariables` — evaluate one-step, match phrase↔expression → combine like terms & distribute → multi-term w/ distribution, negatives, nested grouping.
3. `linearEquationsInequalities` — one/two-step → multi-step w/ distribution & variables both sides → inequalities (sign-flip) + |x|=a.
4. `slopeLinearGraphs` — read slope & intercept from a graph → slope from two points, identify y=mx+b graph → write a line's equation from graph/point+slope/two points (incl. standard form).
5. `functionsFamilies` — is-it-a-function & evaluate f(x) → domain/range/intercepts from graph or table → linear vs exponential (y=a·bˣ), growth/decay, continue geometric sequences.
6. `systemsOfEquations` — solve by graphing / find intersection → substitution → elimination, classify one/none/infinite, set up from a word problem.
7. `exponentsPolynomials` — product/quotient/power rules (positive) → zero/negative exponents, sci-notation arithmetic → add/subtract polynomials, multiply binomials (area model shown, MCQ answer).
8. `radicalsPythagorean` — perfect-square roots, estimate a root between integers → simplify/multiply/divide radicals, add/subtract like radicals → Pythagoras for a missing side + grid distance.
9. `factoringPolynomials` — factor out GCF → x²+bx+c trinomials & difference of squares → ax²+bx+c (a>1), zero-product property.
10. `quadraticsParabolas` — read roots/vertex/axis from a parabola → solve by factoring & square roots → quadratic formula (radical discriminant), match equation↔parabola.
11. `geometryTransformations` — circle circumference/area, arc & sector → SA/volume of prisms, cylinders, cones, spheres → translate/reflect/rotate/dilate on the grid + identify the rule, midpoint.
12. `geometryProofTrig` — angle relationships (vertical/supplementary, triangle-angle-sum, parallel lines + transversal, algebraic angle eqns) → congruence (SSS/SAS/ASA) & similarity, 3–4 step proof via stepSelect → SOH-CAH-TOA missing side, then missing angle w/ inverse trig (angle of elevation).

---

## Band 17–18 — theme: "math studio / analyst" (13 chapters)
Near-adults heading to college/work. Sleek, no mascot; analyst/STEM-explorer tone. Real-world
hooks (signal processing, growth/decay, orbits, polling, risk, motion) as compact applied
cards. Milo is a quiet lab-assistant coach. Carries the shared HS kit — almost no new primitives.

| # | Chapter | id | Type | New primitive |
|---|---|---|---|---|
| 1 | Functions, Transformations & Composition | `functionToolkit` | EXTEND ← functionsFamilies | — |
| 2 | Quadratic Functions in Depth | `quadraticAnalysis` | EXTEND ← quadraticsParabolas | — |
| 3 | Polynomial Functions & Their Graphs | `polynomialFunctions` | EXTEND ← factoringPolynomials | — |
| 4 | Complex Numbers | `complexNumbers` | NEW | — |
| 5 | Rational Functions | `rationalFunctions` | NEW | — |
| 6 | Exponential & Logarithmic Functions | `expLogFunctions` | NEW | — |
| 7 | Trigonometry & the Unit Circle | `unitCircleTrig` | NEW | — |
| 8 | Trig Graphs & Identities | `trigGraphsIdentities` | NEW | — |
| 9 | Conic Sections | `conicSections` | NEW | — |
| 10 | Systems & Matrices | `systemsMatrices` | EXTEND ← systemsOfEquations | — |
| 11 | Sequences, Series & the Binomial Theorem | `sequencesSeries` | EXTEND ← patterns | — |
| 12 | Probability, Distributions & Inference | `statsInference` | EXTEND ← dataGraphs | — |
| 13 | Intro to Calculus | `introCalculus` | NEW (owner-added) | — |

Difficulty ramps (L1→L2→L3):
1. `functionToolkit` — single transform of a parent fn (incl. abs-value/piecewise) → combined a·f(b(x−h))+k w/ domain/range → composition f(g(x)) + read an inverse (horizontal-line test).
2. `quadraticAnalysis` — vertex & axis from vertex form, opening → complete the square, standard↔vertex → discriminant (number/type of roots), build from features; MCQ for irrational roots.
3. `polynomialFunctions` — end-behaviour & y-intercept from degree+leading coeff → real zeros from factored form, multiplicity, sign chart → synthetic division, factor & remainder theorem, build from zeros.
4. `complexNumbers` — powers of i, add/subtract a+bi, plot → multiply & divide via conjugates → modulus + complex-conjugate roots from a negative discriminant.
5. `rationalFunctions` — domain restrictions & vertical asymptote → vertical+horizontal asymptotes, solve basic rational eqns → holes vs asymptotes, reject extraneous solutions.
6. `expLogFunctions` — evaluate bˣ, growth vs decay, log as missing exponent → log laws & exp↔log form → solve exp eqns with logs, compound-growth & half-life.
7. `unitCircleTrig` — degree↔radian, arc length & sector, SOH-CAH-TOA review → unit-circle coords & exact values, reference angles → sign by quadrant, basic trig eqns on [0,2π), law of sines/cosines.
8. `trigGraphsIdentities` — amplitude/period/midline of sin/cos → transform a·sin(b(x−h))+k, match graph → Pythagorean/reciprocal/quotient identities to simplify, verify via equivalence MCQ.
9. `conicSections` — circle center & radius → classify a conic, parabola/ellipse features → complete the square to standard form, extract center/vertices/foci.
10. `systemsMatrices` — matrix +/−/scalar, 2×2 determinant → matrix multiplication, solve a 2-var system by matrix method → 3-var linear & nonlinear systems (line + parabola).
11. `sequencesSeries` — arithmetic vs geometric, next term / common difference or ratio → explicit nth-term, recursive vs explicit, Pascal/binomial coefficients → finite series sums + limit of a convergent geometric series.
12. `statsInference` — single/compound/conditional probability, read mean/spread/shape → permutations vs combinations, independent vs dependent → normal distribution & 68-95-99.7, sampling/bias/margin-of-error intuition.
13. `introCalculus` — average rate of change (secant slope) + read a limit from a table/graph → evaluate simple limits (direct sub, removable), instantaneous rate as the limit of average rate → derivative as tangent slope: power-rule for simple polynomials, increasing/decreasing & max/min.

---

## Shared HS "engine" — the only new UI primitives (build once, reuse everywhere)

| Primitive | Effort | Used by | Notes |
|---|---|---|---|
| `numberLine` | S | integers, signedRationalOps, equationsInequalities | Two-sided int/rational line; tap a tick to select / read a marked point. Inequality solutions are MCQ over pre-drawn line images (no ray/endpoint editing). |
| `fractionEntry` | M | rationalOps | Structured whole + num/den input. **Equivalence-aware grading** — accepts any equivalent or unsimplified-correct form (math-without-fear). |
| `figureDiagram` | M | geometryMeasurement, geometryProofTrig | Read-only labelled geometry figure (polygon/circle/prism/right-triangle), parameterised from templates; answers via numeric-entry/MCQ. |
| `stepSelect` | M | linearEquationsInequalities, geometryProofTrig | "Pick the next correct step/statement+reason" MCQ. Replaces ALL drag-builders. Distractors must be pedagogically meaningful (common-error steps). |
| **`coordGrid`** | **L** | 16 chapters | One grid → xy-plane, complex plane, unit circle. Tap a lattice point to plot/read; tap a plotted feature. Curves are **rendered by the app**, selected via tap+MCQ — **no draggable curve, no focus-tap on empty regions**. Ship a tap-only MVP in `coordinatePlane` (12–14) and harden before HS bands lean on it. |

Answer-format policy (math-without-fear guardrail): clean decimals → numeric entry with a
tolerance band; fractions → `fractionEntry`; irrational (e.g. 2√3, (−3±√5)/2) and complex
(a+bi) results → MCQ or structured two-field entry, never free-typed (a parser would risk
wrong-marking a correct answer).

---

## Progression (no overlap, no gaps)
- **9–11 → 12–14:** 9–11 ends at whole-number place value, tenths/hundredths decimals,
  unit-fraction compare, area/perimeter, basic angles/symmetry, bar/pictograph data. 12–14
  opens with negatives, then unifies signed integers/fractions/decimals (`signedRationalOps`),
  so decimal +/- is reviewed not re-taught; `fractionsCompare→rationalOps`,
  `areaPerimeter→geometryMeasurement` (adds circles/volume/Pythagoras). Delivers the Grade-8
  bridge (`exponentsRoots`, `equationsInequalities` w/ variables-both-sides, the keystone
  `linearRelationships`/functions chapter).
- **12–14 → 15–16:** 15–16 can ASSUME signed fluency, one-variable equations, square roots,
  scientific notation, basic function notation, the coordinate plane. `signedNumberFluency`
  and `functionsFamilies`-L1 are deliberately light review. Algebra I arc:
  expressions→equations→slope→systems→polynomials, then Geometry.
- **15–16 → 17–18:** EXTEND pointers reach the 15–16 band (functionToolkit←functionsFamilies,
  quadraticAnalysis←quadraticsParabolas, polynomialFunctions←factoringPolynomials,
  systemsMatrices←systemsOfEquations). 17–18 is Algebra-II/Pre-Calc DEPTH only; trig L1 reviews
  SOH-CAH-TOA before the unit circle; stats = inference/combinatorics/normal distribution;
  `complexNumbers` sits right after the polynomial block so negative-discriminant roots resolve
  when first met; `sequencesSeries`' convergent-series limit previews `introCalculus` (#13).

## Risks / watch-items
- `coordGrid` (L) is the front-loaded risk — 16 chapters depend on it; ship tap-only MVP in
  12–14, harden before HS.
- Numeric-entry answer formats: enforce the answer-format policy above or risk wrong-marking
  correct irrational/complex answers.
- `fractionEntry` equivalence-aware grading is the subtle build (accept 6/4 for 1½, 2/4 for ½) —
  spec acceptance rules before authoring.
- `stepSelect` distractor quality is make-or-break (proofs/solving shouldn't feel like guessing);
  use common-error steps, not random.
- Dense bundles to playtest: 15–16 geometry (#11–12 mensuration+transformations+proof+trig);
  12–14 `signedRationalOps` (one chapter for a lot) — may need re-splitting if too dense.
