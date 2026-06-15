-- #2 CRITICAL: sync_session was SECURITY DEFINER, callable by anon/PUBLIC, with no
-- ownership check → anyone with the public anon key could forge any learner's progress.
-- Add an auth.uid() ownership guard (auth.uid() reflects the CALLER even inside a
-- SECURITY DEFINER function) and revoke anon/public EXECUTE.
create or replace function public.sync_session(
  p_learner_id uuid, p_chapter text, p_phase text, p_correct integer, p_wrong integer,
  p_stars integer, p_xp integer, p_coins integer, p_client_id text, p_completed_at timestamptz)
returns void language plpgsql security definer set search_path to 'public' as $function$
DECLARE
  v_existing_stars    INT := 0;
  v_existing_xp       INT := 0;
  v_existing_sessions INT := 0;
  v_total_xp          INT := 0;
  v_total_coins       INT := 0;
  v_streak            INT := 0;
  v_longest           INT := 0;
  v_last_played       TIMESTAMPTZ;
  v_today             DATE := NOW()::DATE;
  v_yesterday         DATE := (NOW() - INTERVAL '1 day')::DATE;
  v_level             INT := 1;
  v_thresholds        INT[] := ARRAY[0,500,1200,2500,4500,7000,10000,14000];
  i                   INT;
BEGIN
  -- Authorization: caller must have access to this learner.
  IF NOT EXISTS (
    SELECT 1 FROM public.learner_access
    WHERE learner_id = p_learner_id AND parent_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not authorized for learner %', p_learner_id USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.sessions (
    learner_id, chapter, phase, correct_count, wrong_count,
    stars_earned, xp_earned, coins_earned, client_id, completed_at
  ) VALUES (
    p_learner_id, p_chapter::chapter_type, p_phase, p_correct, p_wrong,
    p_stars, p_xp, p_coins, p_client_id, p_completed_at
  ) ON CONFLICT (client_id) DO NOTHING;

  IF NOT FOUND THEN RETURN; END IF;

  SELECT best_stars, total_xp, total_sessions
  INTO v_existing_stars, v_existing_xp, v_existing_sessions
  FROM public.learner_progress
  WHERE learner_id = p_learner_id AND chapter = p_chapter::chapter_type;

  INSERT INTO public.learner_progress
    (learner_id, chapter, best_stars, total_xp, total_sessions, last_played_at)
  VALUES (
    p_learner_id, p_chapter::chapter_type,
    GREATEST(COALESCE(v_existing_stars, 0), p_stars),
    COALESCE(v_existing_xp, 0) + p_xp,
    COALESCE(v_existing_sessions, 0) + 1,
    p_completed_at
  ) ON CONFLICT (learner_id, chapter) DO UPDATE SET
    best_stars     = GREATEST(learner_progress.best_stars, p_stars),
    total_xp       = learner_progress.total_xp + p_xp,
    total_sessions = learner_progress.total_sessions + 1,
    last_played_at = p_completed_at;

  SELECT total_xp, total_coins, current_streak, longest_streak, last_played_at
  INTO v_total_xp, v_total_coins, v_streak, v_longest, v_last_played
  FROM public.learner_stats WHERE learner_id = p_learner_id;

  v_total_xp    := COALESCE(v_total_xp, 0) + p_xp;
  v_total_coins := COALESCE(v_total_coins, 0) + p_coins;

  IF v_last_played IS NULL THEN v_streak := 1;
  ELSIF v_last_played::DATE = v_today THEN v_streak := COALESCE(v_streak, 1);
  ELSIF v_last_played::DATE = v_yesterday THEN v_streak := COALESCE(v_streak, 0) + 1;
  ELSE v_streak := 1; END IF;

  v_longest := GREATEST(COALESCE(v_longest, 0), v_streak);

  FOR i IN REVERSE array_length(v_thresholds,1)..1 LOOP
    IF v_total_xp >= v_thresholds[i] THEN v_level := i; EXIT; END IF;
  END LOOP;

  INSERT INTO public.learner_stats
    (learner_id, total_xp, total_coins, current_level, current_streak, longest_streak, last_played_at)
  VALUES (p_learner_id, v_total_xp, v_total_coins, v_level, v_streak, v_longest, p_completed_at)
  ON CONFLICT (learner_id) DO UPDATE SET
    total_xp = v_total_xp, total_coins = v_total_coins, current_level = v_level,
    current_streak = v_streak, longest_streak = v_longest, last_played_at = p_completed_at;
END;
$function$;

-- User-facing RPCs: keep authenticated, drop anon/public.
revoke execute on function public.sync_session(uuid,text,text,integer,integer,integer,integer,integer,text,timestamptz) from anon, public;
revoke execute on function public.accept_learner_invite(uuid) from anon, public;
revoke execute on function public.accept_learner_invites_for_current_user() from anon, public;
revoke execute on function public.delete_learner_profile(text) from anon, public;
revoke execute on function public.reject_learner_invite(uuid) from anon, public;
revoke execute on function public.remove_my_learner_access(text) from anon, public;

-- Trigger-only functions: never meant to be called via the REST API. Triggers run as the
-- table owner regardless of grants, so revoking EXECUTE does not affect them.
revoke execute on function public.grant_owner_access() from anon, public, authenticated;
revoke execute on function public.handle_new_user() from anon, public, authenticated;
revoke execute on function public.init_learner_stats() from anon, public, authenticated;
revoke execute on function public.set_updated_at() from anon, public, authenticated;
revoke execute on function public.rls_auto_enable() from anon, public, authenticated;

-- Fix mutable search_path warning.
alter function public.set_updated_at() set search_path = public;
