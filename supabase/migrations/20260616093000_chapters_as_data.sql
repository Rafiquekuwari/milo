-- Step 3 (scaling roadmap): chapters as data — retire the `chapter_type` enum.
-- Adding a chapter becomes an INSERT into public.chapters instead of an enum
-- migration. sessions.chapter / learner_progress.chapter become text + FK.

-- 1) Reference table for chapters (FK target; data-driven add).
create table if not exists public.chapters (
  id          text   primary key,
  name        text   not null,
  emoji       text   not null,
  sort_order  int    not null,
  age_groups  text[] not null default '{}'
);

alter table public.chapters enable row level security;
drop policy if exists "chapters: select" on public.chapters;
create policy "chapters: select" on public.chapters for select using (true);

-- 2) Seed the 11 existing chapters (mirrors the code registry, src/lib/chapters.ts).
insert into public.chapters (id, name, emoji, sort_order, age_groups) values
  ('counting',           'Counting',           '🌟',  1, array['3-5']),
  ('numberOrdering',     'Number Order',       '🔢',  2, array['3-5']),
  ('numberRecognition',  'Number Doors',       '🚪',  3, array['3-5']),
  ('matchingQuantities', 'Apple Basket',       '🍎',  4, array['3-5']),
  ('numberComparison',   'Bigger or Smaller',  '⚖️',  5, array['3-5']),
  ('shapes',             'Shape House',        '🏠',  6, array['3-5']),
  ('colors',             'Color Garden',       '🌈',  7, array['3-5']),
  ('patterns',           'Patterns',           '🔷',  8, array['3-5']),
  ('addition',           'Simple Addition',    '➕',  9, array['3-5']),
  ('subtraction',        'Simple Subtraction', '➖', 10, array['3-5']),
  ('measurement',        'Measurement',        '📏', 11, array['3-5'])
on conflict (id) do update set
  name = excluded.name, emoji = excluded.emoji,
  sort_order = excluded.sort_order, age_groups = excluded.age_groups;

-- 3) Convert the enum columns to text (existing values map 1:1 to their labels).
alter table public.sessions
  alter column chapter type text using chapter::text;
alter table public.learner_progress
  alter column chapter type text using chapter::text;

-- 4) FK integrity to the reference table.
alter table public.sessions
  add constraint sessions_chapter_fkey
  foreign key (chapter) references public.chapters(id);
alter table public.learner_progress
  add constraint learner_progress_chapter_fkey
  foreign key (chapter) references public.chapters(id);

-- 5) sync_session no longer casts to the enum — chapter is plain text now.
create or replace function public.sync_session(
  p_learner_id uuid, p_chapter text, p_phase text,
  p_correct integer, p_wrong integer, p_stars integer,
  p_xp integer, p_coins integer, p_client_id text,
  p_completed_at timestamp with time zone
) returns void
language plpgsql security definer set search_path to 'public'
as $function$
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
    p_learner_id, p_chapter, p_phase, p_correct, p_wrong,
    p_stars, p_xp, p_coins, p_client_id, p_completed_at
  ) ON CONFLICT (client_id) DO NOTHING;

  IF NOT FOUND THEN RETURN; END IF;

  SELECT best_stars, total_xp, total_sessions
  INTO v_existing_stars, v_existing_xp, v_existing_sessions
  FROM public.learner_progress
  WHERE learner_id = p_learner_id AND chapter = p_chapter;

  INSERT INTO public.learner_progress
    (learner_id, chapter, best_stars, total_xp, total_sessions, last_played_at)
  VALUES (
    p_learner_id, p_chapter,
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

-- 6) Retire the now-unused enum. CASCADE also removes the leftover
--    text→chapter_type cast (a prior migration created it; nothing needs it now).
drop type if exists public.chapter_type cascade;
