-- Anti-abuse / growth control: a daily job that purges analytics events older
-- than 90 days, so spammed (or just accumulated) events can't fill the DB.
-- daily_complete events are KEPT (they're the source of truth for streaks and are
-- at most one row per learner per day — negligible volume).
create extension if not exists pg_cron;

-- idempotent re-schedule
do $$ begin perform cron.unschedule('purge-old-learner-events'); exception when others then null; end $$;

select cron.schedule(
  'purge-old-learner-events',
  '17 3 * * *',  -- daily at 03:17 UTC
  $job$ delete from public.learner_events
        where created_at < now() - interval '90 days'
          and event <> 'daily_complete' $job$
);
