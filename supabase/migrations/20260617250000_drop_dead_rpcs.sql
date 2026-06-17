-- Pre-launch hardening: drop five orphaned SECURITY DEFINER functions.
-- They were written against an old schema (reference owner_user_id / user_id /
-- permission / email columns that no longer exist) and would raise at runtime.
-- The client never calls them (only get_learner_bootstrap + sync_session are
-- invoked). Dropping them clears the security-advisor warnings and removes an
-- unused privileged learner-delete path.
drop function if exists public.delete_learner_profile(text);
drop function if exists public.accept_learner_invite(uuid);
drop function if exists public.accept_learner_invites_for_current_user();
drop function if exists public.reject_learner_invite(uuid);
drop function if exists public.remove_my_learner_access(text);
