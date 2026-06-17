-- 9–11 chapter #5: Factors, Multiples & Primes. Mirrors the code registry.
insert into public.chapters (id, name, emoji, sort_order, age_groups) values
  ('factorsMultiples', 'Factors & Primes', '🧩', 28, array['9-11'])
on conflict (id) do update set
  name = excluded.name, emoji = excluded.emoji,
  sort_order = excluded.sort_order, age_groups = excluded.age_groups;
