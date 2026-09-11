-- pg_cron drives the 15-minute daily-streak-check tick; pg_net lets a cron
-- job make the outbound HTTP call to the Edge Function. Both are Supabase-
-- provided extensions, safe to enable unconditionally. The actual
-- `cron.schedule(...)` job is NOT defined here on purpose — it needs this
-- project's real function URL and a Vault-stored service-role key, neither
-- of which should be hardcoded into a versioned migration. Run
-- supabase/setup/schedule-cron.sql once via the SQL editor after deploying
-- the Edge Functions (see that file's header comment for the exact steps).
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;
