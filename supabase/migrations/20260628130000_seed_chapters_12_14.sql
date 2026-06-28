-- Seed the remaining 12–14 "Field Lab" chapters (rows mirror the code registry
-- so sessions / learner_progress FK → chapters.id can be saved). sort_order
-- continues after integers (36).

insert into public.chapters (id, name, emoji, sort_order, age_groups) values
  ('signedRationalOps',     'Signed Number Operations',   '🌡️', 37, array['12-14']),
  ('rationalOps',           'Fraction & Decimal Ops',     '🍰', 38, array['12-14']),
  ('ratioProportion',       'Ratios & Proportions',       '⚖️', 39, array['12-14']),
  ('percentages',           'Percentages',                '％', 40, array['12-14']),
  ('exponentsRoots',        'Exponents & Roots',          '⬆️', 41, array['12-14']),
  ('orderOfOperations',     'Order of Operations',        '🔣', 42, array['12-14']),
  ('algebraicExpressions',  'Algebraic Expressions',      '🔤', 43, array['12-14']),
  ('equationsInequalities', 'Equations & Inequalities',   '🟰', 44, array['12-14']),
  ('coordinatePlane',       'The Coordinate Plane',       '📍', 45, array['12-14']),
  ('linearRelationships',   'Linear Relationships',       '📈', 46, array['12-14']),
  ('geometryMeasurement',   'Area, Volume & Pythagoras',  '📐', 47, array['12-14'])
on conflict (id) do update set
  name = excluded.name, emoji = excluded.emoji,
  sort_order = excluded.sort_order, age_groups = excluded.age_groups;
