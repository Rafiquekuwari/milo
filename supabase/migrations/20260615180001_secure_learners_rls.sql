-- #1 CRITICAL: learners had policies but RLS was disabled → table was world-readable/writable.
alter table public.learners enable row level security;

-- Broaden SELECT so the creator can always see their own row (removes any dependency
-- on the grant_owner_access trigger having populated learner_access before RETURNING is
-- re-checked), and wrap auth.uid() in a scalar subquery so it's evaluated once, not per row.
alter policy "learners: select" on public.learners
  using (
    created_by = (select auth.uid())
    or id in (select learner_id from public.learner_access where parent_id = (select auth.uid()))
  );
alter policy "learners: insert" on public.learners
  with check (created_by = (select auth.uid()));
alter policy "learners: update" on public.learners
  using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));
alter policy "learners: delete" on public.learners
  using (created_by = (select auth.uid()));
