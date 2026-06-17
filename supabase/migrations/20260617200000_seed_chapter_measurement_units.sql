-- 9–11 chapter #8: Measurement & Units. Mirrors the code registry.
insert into public.chapters (id, name, emoji, sort_order, age_groups) values
  ('measurementUnits', 'Measurement', '📏', 31, array['9-11'])
on conflict (id) do update set
  name = excluded.name, emoji = excluded.emoji,
  sort_order = excluded.sort_order, age_groups = excluded.age_groups;
