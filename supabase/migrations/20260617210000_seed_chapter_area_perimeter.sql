-- 9–11 chapter #9: Area & Perimeter. Mirrors the code registry.
insert into public.chapters (id, name, emoji, sort_order, age_groups) values
  ('areaPerimeter', 'Area & Perimeter', '🟧', 32, array['9-11'])
on conflict (id) do update set
  name = excluded.name, emoji = excluded.emoji,
  sort_order = excluded.sort_order, age_groups = excluded.age_groups;
