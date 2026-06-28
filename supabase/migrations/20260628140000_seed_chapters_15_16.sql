-- Seed the 15–16 (Algebra I + Geometry) "Field Lab" chapters. Rows mirror the
-- code registry so sessions / learner_progress FK → chapters.id can be saved.
-- sort_order continues after the 12–14 band (max 47).

insert into public.chapters (id, name, emoji, sort_order, age_groups) values
  ('signedNumberFluency',        'Signed & Real Numbers',        '🌡️', 48, array['15-16']),
  ('expressionsVariables',       'Expressions & Variables',      '🔤', 49, array['15-16']),
  ('linearEquationsInequalities','Linear Equations',             '🟰', 50, array['15-16']),
  ('slopeLinearGraphs',          'Slope & Linear Graphs',        '📈', 51, array['15-16']),
  ('functionsFamilies',          'Functions',                    '🔢', 52, array['15-16']),
  ('systemsOfEquations',         'Systems of Equations',         '✖️', 53, array['15-16']),
  ('exponentsPolynomials',       'Exponents & Polynomials',      '⬆️', 54, array['15-16']),
  ('radicalsPythagorean',        'Radicals & Pythagoras',        '√',  55, array['15-16']),
  ('factoringPolynomials',       'Factoring',                    '🧩', 56, array['15-16']),
  ('quadraticsParabolas',        'Quadratics & Parabolas',       '📉', 57, array['15-16']),
  ('geometryTransformations',    'Geometry & Transformations',   '🔷', 58, array['15-16']),
  ('geometryProofTrig',          'Proof & Right-Triangle Trig',  '📐', 59, array['15-16'])
on conflict (id) do update set
  name = excluded.name, emoji = excluded.emoji,
  sort_order = excluded.sort_order, age_groups = excluded.age_groups;
