-- #7 cleanup: the DB-backed offline_queue was only used by the now-deleted sync.ts.
-- Offline sessions queue in the browser (localStorage) instead. The table, its
-- policy and its (unused) index go away together.
drop table if exists public.offline_queue cascade;
