-- 9–11 chapter #3: Times Tables & Multi-digit ×. Mirrors the code registry.
insert into public.chapters (id, name, emoji, sort_order, age_groups) values
  ('timesTables', 'Times Tables', '✖️', 26, array['9-11'])
on conflict (id) do update set
  name = excluded.name, emoji = excluded.emoji,
  sort_order = excluded.sort_order, age_groups = excluded.age_groups;
