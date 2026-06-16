-- Covering indexes for the new chapter foreign keys (Step 3 follow-up).
-- Matches the project convention (see 20260615180004_add_fk_covering_indexes.sql).
create index if not exists idx_sessions_chapter
  on public.sessions(chapter);
create index if not exists idx_learner_progress_chapter
  on public.learner_progress(chapter);
