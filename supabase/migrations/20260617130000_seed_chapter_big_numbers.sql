-- 9–11 chapter #1: Big Numbers & Place Value. Mirrors the code registry so
-- progress (FK → chapters.id) can be saved. sort_order continues after 6–8 (23).
insert into public.chapters (id, name, emoji, sort_order, age_groups) values
  ('bigNumbers', 'Big Numbers', '🔢', 24, array['9-11'])
on conflict (id) do update set
  name = excluded.name, emoji = excluded.emoji,
  sort_order = excluded.sort_order, age_groups = excluded.age_groups;
