-- One-time setup: run this in the Supabase SQL editor AFTER:
--   1. `supabase db push` has applied the migrations (pg_cron/pg_net enabled)
--   2. `supabase functions deploy daily-streak-check --no-verify-jwt` has
--      succeeded (--no-verify-jwt is required: pg_net's call has no
--      Supabase user session to present a real JWT for)
--   3. `CRON_SECRET` (and GITHUB_APP_TOKEN, VAPID_*, RESEND_*) are set via
--      `supabase secrets set` — see docs/VERIFY.md. CRON_SECRET must be
--      the exact same value used in the vault.create_secret call below.
--
-- Not a migration on purpose: it embeds this project's function URL and a
-- Vault reference to a secret, neither of which belongs in version control.
-- Replace <PROJECT_REF> and <CRON_SECRET> below before running.
--
-- Deliberately uses a purpose-built CRON_SECRET, not the platform
-- service-role key — smaller blast radius if this one value ever leaks,
-- since it can only call this one endpoint, not the database directly.

select vault.create_secret('<CRON_SECRET>', 'streakforge_cron_secret');

select cron.schedule(
  'daily-streak-check-15min',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/daily-streak-check',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets
        where name = 'streakforge_cron_secret'
      )
    ),
    body := '{}'::jsonb
  );
  $$
);

-- To inspect or remove later:
--   select * from cron.job;
--   select cron.unschedule('daily-streak-check-15min');
