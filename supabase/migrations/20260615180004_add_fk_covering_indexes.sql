-- #4 PERF: covering indexes for foreign keys used in joins/lookups.
create index if not exists idx_learner_access_parent_id on public.learner_access(parent_id);
create index if not exists idx_learners_created_by      on public.learners(created_by);
create index if not exists idx_learner_invites_invited_by on public.learner_invites(invited_by);
create index if not exists idx_learner_invites_learner_id on public.learner_invites(learner_id);
