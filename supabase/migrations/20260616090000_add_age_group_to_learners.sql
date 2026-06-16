-- Phase 2 (multi-age-group): every learner gets an age group so the menu can
-- scope content to that child. '3-5' is the only content today, so existing
-- learners are backfilled to it via the column default.
alter table public.learners
  add column if not exists age_group text not null default '3-5';

-- Constrain to known groups. Guarded so the migration is safe to re-run.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'learners_age_group_check') then
    alter table public.learners
      add constraint learners_age_group_check check (age_group in ('3-5','6-8'));
  end if;
end $$;
