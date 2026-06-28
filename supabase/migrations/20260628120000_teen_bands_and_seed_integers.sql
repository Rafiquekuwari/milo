-- Teen "Field Lab" rollout, step 1: widen the learners.age_group CHECK to allow
-- the three new bands, and seed the first teen chapter (integers) so its
-- sessions/learner_progress rows satisfy the FK → chapters(id).
--
-- (More teen chapters will be seeded as their components land; sort_order
-- continues after 9–11's max of 35.)

alter table public.learners drop constraint if exists learners_age_group_check;
alter table public.learners
  add constraint learners_age_group_check
  check (age_group in ('3-5','6-8','9-11','12-14','15-16','17-18'));

insert into public.chapters (id, name, emoji, sort_order, age_groups) values
  ('integers', 'Integers & the Number Line', '➖', 36, array['12-14'])
on conflict (id) do update set
  name = excluded.name, emoji = excluded.emoji,
  sort_order = excluded.sort_order, age_groups = excluded.age_groups;
