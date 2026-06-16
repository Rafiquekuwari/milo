-- 6–8 chapters #9–12 (the "extend" set, built as new kit-based chapters).
-- Rows mirror the code registry so progress (FK → chapters.id) can be saved.
insert into public.chapters (id, name, emoji, sort_order, age_groups) values
  ('compareNumbers',   'Compare Numbers', '⚖️', 20, array['6-8']),
  ('additionTo100',    'Add to 100',      '➕', 21, array['6-8']),
  ('subtractionTo100', 'Subtract to 100', '➖', 22, array['6-8']),
  ('shapes2d3d',       'Shapes 2D & 3D',  '🔷', 23, array['6-8'])
on conflict (id) do update set
  name = excluded.name, emoji = excluded.emoji,
  sort_order = excluded.sort_order, age_groups = excluded.age_groups;
