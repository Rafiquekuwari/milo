-- Widen the learners.age_group check to allow the new 9–11 age group.
alter table public.learners drop constraint if exists learners_age_group_check;
alter table public.learners
  add constraint learners_age_group_check check (age_group in ('3-5','6-8','9-11'));
