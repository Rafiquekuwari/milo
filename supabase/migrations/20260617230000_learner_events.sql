-- Lightweight product-analytics events (funnel + engagement), on top of the
-- existing `sessions` table (which already gives day-level activity / retention).
-- Parents can write/read only events for learners they have access to.
create table if not exists public.learner_events (
  id          uuid primary key default gen_random_uuid(),
  learner_id  uuid not null references public.learners(id) on delete cascade,
  event       text not null,
  props       jsonb not null default '{}'::jsonb,
  client_id   text unique,                 -- dedup key for offline-queue retries
  client_ts   timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists learner_events_learner_created_idx on public.learner_events (learner_id, created_at);
create index if not exists learner_events_event_created_idx   on public.learner_events (event, created_at);

alter table public.learner_events enable row level security;

drop policy if exists learner_events_insert on public.learner_events;
create policy learner_events_insert on public.learner_events for insert
  with check (learner_id in (select learner_id from public.learner_access where parent_id = auth.uid()));

drop policy if exists learner_events_select on public.learner_events;
create policy learner_events_select on public.learner_events for select
  using (learner_id in (select learner_id from public.learner_access where parent_id = auth.uid()));
