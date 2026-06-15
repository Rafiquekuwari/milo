-- Per-learner shop/coins state for cross-device sync.
-- coins_spent is monotonic; balance = learner_stats.total_coins (earned) - coins_spent.
-- owned_items / equipped_items carry purchases + equips across devices.
create table if not exists public.learner_state (
  learner_id     uuid primary key references public.learners(id) on delete cascade,
  coins_spent    int not null default 0,
  owned_items    text[] not null default '{}',
  equipped_items jsonb not null default '{}'::jsonb,
  updated_at     timestamptz not null default now()
);

alter table public.learner_state enable row level security;

create policy "learner_state: parent access" on public.learner_state
  for all
  using (exists (
    select 1 from public.learner_access la
    where la.learner_id = learner_state.learner_id and la.parent_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.learner_access la
    where la.learner_id = learner_state.learner_id and la.parent_id = auth.uid()
  ));
