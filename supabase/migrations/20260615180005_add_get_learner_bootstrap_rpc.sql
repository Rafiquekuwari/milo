-- #6 PERF/mobile: one round trip for the menu instead of access-check + 3 reads.
-- SECURITY INVOKER → runs with the caller's privileges, so RLS still applies; the
-- explicit access check returns NULL (not an error) when the caller has no access.
create or replace function public.get_learner_bootstrap(p_learner_id uuid)
returns json
language plpgsql
security invoker
stable
set search_path to 'public'
as $$
declare v_role text;
begin
  select access_role into v_role
  from public.learner_access
  where learner_id = p_learner_id and parent_id = (select auth.uid());

  if v_role is null then return null; end if;

  return json_build_object(
    'role',     v_role,
    'stats',    (select to_json(s) from public.learner_stats s where s.learner_id = p_learner_id),
    'progress', (select coalesce(json_agg(p order by p.last_played_at desc nulls last), '[]'::json)
                 from public.learner_progress p where p.learner_id = p_learner_id),
    'state',    (select to_json(st) from public.learner_state st where st.learner_id = p_learner_id)
  );
end;
$$;

revoke execute on function public.get_learner_bootstrap(uuid) from anon, public;
grant  execute on function public.get_learner_bootstrap(uuid) to authenticated;
