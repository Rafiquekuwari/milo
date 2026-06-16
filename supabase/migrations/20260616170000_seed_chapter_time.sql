-- 6–8 chapter #8: Time. Row mirrors the code registry so progress
-- (FK → chapters.id) can be saved for it.
insert into public.chapters (id, name, emoji, sort_order, age_groups) values
  ('time', 'Time', '🕐', 19, array['6-8'])
on conflict (id) do update set
  name = excluded.name, emoji = excluded.emoji,
  sort_order = excluded.sort_order, age_groups = excluded.age_groups;
