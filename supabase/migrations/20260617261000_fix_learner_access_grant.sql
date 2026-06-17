-- ── CRITICAL security fix ────────────────────────────────────────────────────
-- The learner_access INSERT policy only required parent_id = auth.uid(), so any
-- signed-in user could grant THEMSELVES access to ANY learner UUID and then read
-- another family's child PII + play data and tamper with their stats.
--
-- The entitlement check lives in a SECURITY DEFINER function (bypasses RLS
-- internally, so it doesn't recurse back into learner_access via learners /
-- learner_invites policies) but still reads the CALLER's identity through
-- auth.uid()/auth.jwt(). A grant is allowed only when granting to yourself AND
-- either (a) you own the learner, or (b) a pending non-expired invite to your
-- email exists — and the invite path can mint a 'viewer' grant only (never owner;
-- owner grants come solely from the grant_owner_access trigger on learner create).
create or replace function public.can_self_grant_access(p_learner_id uuid, p_role text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    exists (
      select 1 from public.learners l
      where l.id = p_learner_id and l.created_by = (select auth.uid())
    )
    or (
      p_role = 'viewer'
      and exists (
        select 1 from public.learner_invites i
        where i.learner_id = p_learner_id
          and i.status = 'pending'
          and i.expires_at > now()
          and lower(i.invited_email) = lower((select auth.jwt() ->> 'email'))
      )
    );
$$;
revoke all on function public.can_self_grant_access(uuid, text) from public, anon;
grant execute on function public.can_self_grant_access(uuid, text) to authenticated;

drop policy if exists "learner_access: insert" on public.learner_access;
create policy "learner_access: insert" on public.learner_access
  for insert to authenticated
  with check (
    parent_id = (select auth.uid())
    and public.can_self_grant_access(learner_id, access_role)
  );
