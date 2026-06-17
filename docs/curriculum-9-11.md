# 9–11 age group — math curriculum (FINALIZED)

Status: **locked** (2026-06-17). The 3–5 and 6–8 groups are feature-complete.
This is the third age group. Scope chosen: the "Recommended 12" below.

Maps to upper-elementary (Grade 3–5). Builds on 6–8 (numbers to 100, place value,
two-digit +/−, intro multiplication, unit fractions, money, time, 2D/3D shapes).
The defining jumps for 9–11 are: larger numbers & place value to 10,000, division,
multi-digit multiplication, **decimals**, richer fractions, measurement with units,
area/perimeter, data handling, and multi-step reasoning.

Decisions (2026-06-17): **standard depth** — Division includes remainders; Decimals
cover tenths & hundredths. All EXTEND chapters are built as **new kit-based 9–11
components** (the shipped 6–8 chapters are left untouched).

`build`: **NEW** = new chapter component + lesson; **EXTEND** = same strand as a
younger chapter, rebuilt for 9–11 with larger ranges / harder skills.

| #  | id (proposed)        | Name                          | Strand        | What the child does                                          | build  |
|----|----------------------|-------------------------------|---------------|-------------------------------------------------------------|--------|
| 1  | bigNumbers           | Big Numbers & Place Value     | Number sense  | Read/build numbers to 1,000 → 10,000; thousands…ones        | EXTEND |
| 2  | rounding             | Rounding & Estimation         | Number sense  | Round to nearest 10/100; estimate sums                      | NEW    |
| 3  | timesTables          | Times Tables & Multi-digit ×  | Operations    | Fact fluency + 2-digit × 1-digit                            | EXTEND |
| 4  | division             | Division                      | Operations    | Share equally → division facts → remainders                 | NEW    |
| 5  | factorsMultiples     | Factors, Multiples & Primes   | Number sense  | Even/odd, factors, multiples, prime vs composite            | NEW    |
| 6  | fractionsCompare     | Fractions: Equivalent & Compare| Fractions    | Non-unit fractions, equivalence, +/− same denominator       | EXTEND |
| 7  | decimals             | Decimals                      | Number sense  | Tenths & hundredths, place value, on a number line          | NEW    |
| 8  | measurementUnits     | Measurement & Units           | Measurement   | Length/mass/capacity; simple unit conversions               | NEW    |
| 9  | areaPerimeter        | Area & Perimeter              | Measurement   | Count squares; rectangle area & perimeter formulas          | NEW    |
| 10 | anglesSymmetry       | Angles & Symmetry             | Geometry      | Right/acute/obtuse angles; lines of symmetry                | EXTEND |
| 11 | dataGraphs           | Data & Graphs                 | Data          | Read bar charts & pictographs; answer questions             | NEW    |
| 12 | wordProblems         | Multi-step Word Problems      | Operations    | Mixed-operation, multi-step reasoning                       | EXTEND |

Flow: number sense → operations → fractions/decimals → measurement/geometry → data → applied.

**Phase 2 backlog** (deferred to stay at 12): long 3–4 digit +/− with carrying,
elapsed/24-hour time, money with decimals & change, negative numbers, coordinates,
mixed numbers, fraction × fraction.

## Build notes
Same pattern as 6–8. Each chapter = a kit-based lesson + adaptive practice component,
a registry entry in `src/lib/chapters.ts` (ageGroups `['9-11']`), a dispatch entry in
`src/app/game/page.tsx`, and a `public.chapters` row (sort_order 24–35). Follow the
shared conventions: centered Retry+Next pop-up (free via `LessonScaffold`), no
celebration slides, grammar via `@/lib/grammar`, `speakSeq` for narration,
phase-guarded practice round effect, and portal overlays to `document.body`.
