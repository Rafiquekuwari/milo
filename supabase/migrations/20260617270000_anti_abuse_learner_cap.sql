-- Anti-abuse: cap learners per account so a scripted attacker can't mass-create
-- learners (each fires the owner-access + stats-seed triggers) to fan out writes
-- and fill the DB. created_by is RLS-locked to auth.uid(), so this cap can't be
-- bypassed by spoofing ownership. 25 is far above any real family / small group.
create or replace function public.enforce_learner_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare cnt int;
begin
  select count(*) into cnt from public.learners where created_by = new.created_by;
  if cnt >= 25 then
    raise exception 'Learner limit reached (max 25 per account).' using errcode = 'check_violation';
  end if;
  return new;
end $$;
revoke all on function public.enforce_learner_cap() from public, anon, authenticated;

drop trigger if exists trg_enforce_learner_cap on public.learners;
create trigger trg_enforce_learner_cap
  before insert on public.learners
  for each row execute function public.enforce_learner_cap();
