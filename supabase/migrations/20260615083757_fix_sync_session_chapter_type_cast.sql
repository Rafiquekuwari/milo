-- Fix: sync_session compared learner_progress.chapter (enum chapter_type)
-- against the text argument p_chapter, which Postgres rejects with
-- "operator does not exist: chapter_type = text". This failed every session
-- sync for every chapter. Casting p_chapter::chapter_type at its three uses
-- resolves it; the signature is unchanged so CREATE OR REPLACE applies cleanly.
CREATE OR REPLACE FUNCTION public.sync_session(p_learner_id uuid, p_chapter text, p_phase text, p_correct integer, p_wrong integer, p_stars integer, p_xp integer, p_coins integer, p_client_id text, p_completed_at timestamp with time zone)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  -- 1. Insert session (ignore duplicate client_id)
  INSERT INTO public.sessions (
    learner_id, chapter, phase, correct_count, wrong_count,
    stars_earned, xp_earned, coins_earned, client_id, completed_at
  )
  VALUES (
    p_learner_id, p_chapter::chapter_type, p_phase, p_correct, p_wrong,
    p_stars, p_xp, p_coins, p_client_id, p_completed_at
  )
  ON CONFLICT (client_id) DO NOTHING;

  -- If duplicate, exit early — nothing else to update
  IF NOT FOUND THEN RETURN; END IF;

  -- 2. Upsert learner_progress
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
  )
  ON CONFLICT (learner_id, chapter) DO UPDATE SET
    best_stars     = GREATEST(learner_progress.best_stars, p_stars),
    total_xp       = learner_progress.total_xp + p_xp,
    total_sessions = learner_progress.total_sessions + 1,
    last_played_at = p_completed_at;

  -- 3. Upsert learner_stats
  SELECT total_xp, total_coins, current_streak, longest_streak, last_played_at
  INTO v_total_xp, v_total_coins, v_streak, v_longest, v_last_played
  FROM public.learner_stats
  WHERE learner_id = p_learner_id;

  v_total_xp    := COALESCE(v_total_xp, 0) + p_xp;
  v_total_coins := COALESCE(v_total_coins, 0) + p_coins;

  -- Streak logic: once per day
  IF v_last_played IS NULL THEN
    v_streak := 1;
  ELSIF v_last_played::DATE = v_today THEN
    v_streak := COALESCE(v_streak, 1); -- same day, no change
  ELSIF v_last_played::DATE = v_yesterday THEN
    v_streak := COALESCE(v_streak, 0) + 1; -- consecutive day
  ELSE
    v_streak := 1; -- missed a day, reset
  END IF;

  v_longest := GREATEST(COALESCE(v_longest, 0), v_streak);

  -- Level from XP
  FOR i IN REVERSE array_length(v_thresholds,1)..1 LOOP
    IF v_total_xp >= v_thresholds[i] THEN
      v_level := i;
      EXIT;
    END IF;
  END LOOP;

  INSERT INTO public.learner_stats
    (learner_id, total_xp, total_coins, current_level,
     current_streak, longest_streak, last_played_at)
  VALUES (
    p_learner_id, v_total_xp, v_total_coins, v_level,
    v_streak, v_longest, p_completed_at
  )
  ON CONFLICT (learner_id) DO UPDATE SET
    total_xp       = v_total_xp,
    total_coins    = v_total_coins,
    current_level  = v_level,
    current_streak = v_streak,
    longest_streak = v_longest,
    last_played_at = p_completed_at;
END;
$function$;
