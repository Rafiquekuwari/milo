-- #3 PERF: wrap auth.uid()/auth.jwt() in (select ...) so the planner evaluates them
-- once per query instead of once per row.

alter policy "profiles: own row" on public.profiles
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

alter policy "sessions: parent can read" on public.sessions
  using (exists (select 1 from public.learner_access la
                 where la.learner_id = sessions.learner_id and la.parent_id = (select auth.uid())));
alter policy "sessions: parent can insert" on public.sessions
  with check (exists (select 1 from public.learner_access la
                      where la.learner_id = sessions.learner_id and la.parent_id = (select auth.uid())));

alter policy "learner_progress: parent access" on public.learner_progress
  using (exists (select 1 from public.learner_access la
                 where la.learner_id = learner_progress.learner_id and la.parent_id = (select auth.uid())))
  with check (exists (select 1 from public.learner_access la
                      where la.learner_id = learner_progress.learner_id and la.parent_id = (select auth.uid())));

alter policy "learner_stats: parent access" on public.learner_stats
  using (exists (select 1 from public.learner_access la
                 where la.learner_id = learner_stats.learner_id and la.parent_id = (select auth.uid())))
  with check (exists (select 1 from public.learner_access la
                      where la.learner_id = learner_stats.learner_id and la.parent_id = (select auth.uid())));

alter policy "learner_state: parent access" on public.learner_state
  using (exists (select 1 from public.learner_access la
                 where la.learner_id = learner_state.learner_id and la.parent_id = (select auth.uid())))
  with check (exists (select 1 from public.learner_access la
                      where la.learner_id = learner_state.learner_id and la.parent_id = (select auth.uid())));

alter policy "learner_access: select" on public.learner_access
  using (parent_id = (select auth.uid()));
alter policy "learner_access: insert" on public.learner_access
  with check (parent_id = (select auth.uid()));

alter policy "learner_invites: sender" on public.learner_invites
  using (invited_by = (select auth.uid())) with check (invited_by = (select auth.uid()));
alter policy "learner_invites: recipient can view" on public.learner_invites
  using (invited_email = lower(((select auth.jwt()) ->> 'email')));
alter policy "learner_invites: recipient can accept" on public.learner_invites
  using (invited_email = lower(((select auth.jwt()) ->> 'email')))
  with check (invited_email = lower(((select auth.jwt()) ->> 'email')));
