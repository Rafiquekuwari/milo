-- Perf hardening (the CRITICAL learner_access grant fix is in the next migration,
-- 20260617261000, via a SECURITY DEFINER helper to avoid RLS recursion).

-- ── Perf: stop per-row re-evaluation of auth.uid() on the hottest table ──────
-- learner_events is the highest-write table; wrapping auth.uid() in a scalar
-- subselect makes Postgres evaluate it once per query instead of once per row.
drop policy if exists learner_events_insert on public.learner_events;
create policy learner_events_insert on public.learner_events
  for insert to authenticated
  with check (
    learner_id in (
      select learner_access.learner_id from public.learner_access
      where learner_access.parent_id = (select auth.uid())
    )
  );

drop policy if exists learner_events_select on public.learner_events;
create policy learner_events_select on public.learner_events
  for select to authenticated
  using (
    learner_id in (
      select learner_access.learner_id from public.learner_access
      where learner_access.parent_id = (select auth.uid())
    )
  );

-- ── Perf: composite index for "recent sessions for a learner" ────────────────
-- Backs WHERE learner_id = ? ORDER BY started_at DESC LIMIT N (parent dashboard).
create index if not exists sessions_learner_started_idx
  on public.sessions (learner_id, started_at desc);
