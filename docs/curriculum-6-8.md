# 6–8 age group — math curriculum (FINALIZED)

Status: **locked** (2026-06-16). The 3–5 group is feature-complete (math-only);
this is the next age group. Scope chosen: the "Recommended 12" below. Division,
Even/Odd, Measurement-with-units, Number patterns, and Simple graphs are Phase 2.

Maps to early-elementary (Grade 1–2). Builds on the 3–5 foundation (counting to
~10, basic add/sub to 10, shapes, comparison). The defining jump for 6–8 is
numbers to 100, **place value**, two-digit operations, and first exposure to
multiplication, fractions, money, and time.

`build`: **NEW** = needs a new chapter component + lesson; **EXTEND** = reuse the
existing 3–5 chapter with wider number ranges / added difficulty.

| # | id (proposed)        | Name                    | Strand       | What the child does                                   | build  |
|---|----------------------|-------------------------|--------------|-------------------------------------------------------|--------|
| 1 | numbersTo100         | Numbers to 100          | Number sense | Count, read, write numbers past 10 up to 100          | NEW    |
| 2 | placeValue           | Tens & Ones             | Number sense | Build a number from tens + ones (34 = 3 tens, 4 ones) | NEW    |
| 3 | skipCounting         | Skip Counting           | Number sense | Count by 2s, 5s, 10s (bridges to multiplication)      | NEW    |
| 4 | numberComparison*    | Compare Numbers         | Comparison   | Use >, <, = with numbers to 100                        | EXTEND |
| 5 | addition*            | Addition to 20 → 100    | Operations   | Add within 20, then two-digit; "make a ten"           | EXTEND |
| 6 | subtraction*         | Subtraction to 20 → 100 | Operations   | Subtract within 20, then two-digit                    | EXTEND |
| 7 | storyProblems        | Story Problems          | Operations   | Word problems — Milo tells a story, child solves       | NEW    |
| 8 | multiplication       | Multiplication (intro)  | Operations   | Groups-of / repeated addition / arrays                | NEW    |
| 9 | fractions            | Fractions               | Fractions    | Halves, thirds, quarters by splitting shapes & groups | NEW    |
| 10| money                | Money                   | Real-world   | Recognize & count coins                               | NEW    |
| 11| time                 | Time                    | Real-world   | Tell time: o'clock, half past, then 5-min             | NEW    |
| 12| shapes*              | Shapes 2D & 3D          | Geometry     | 2D attributes + intro to 3D solids                    | EXTEND |

`*` already exists for 3–5 — extend its difficulty ranges rather than rebuild.

## Phase 2 backlog (not in first 6–8 release)
Division (pairs with multiplication), Even & Odd, Measurement with units,
Number patterns / number line, Simple graphs.

## Implementation note
This depends on the structural work in `scaling-roadmap.md` Tier 1 (age-group
dimension + single chapter registry). Without an age-group concept, every learner
sees every chapter — so that foundation lands before the new chapters. See
scaling-roadmap.md for the locked structural decisions.
