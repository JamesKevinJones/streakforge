# Verification

Exact commands to prove a change works. Any agent, any tool, no guessing.

Rule: **don't report work as done without running these.** "It should work" is
not a result.

## Client: install, build

```bash
npm install
npm run build
```

`npm run build` must succeed with no errors — this catches JS syntax/import
bugs without needing a live Supabase project. It does NOT prove the app
actually works end to end (that needs real Supabase credentials — see below).

## Client: dev server

```bash
npm run dev
```

Requires `client/.env.local` (copy from `client/.env.example`) pointing at a
real Supabase project, or the app will fail at the login screen. Visit
`http://localhost:5173`.

## Database migrations: syntax + logic, without a real Supabase project

There's no `psql`/Supabase CLI local stack assumed to be installed. This repo
was validated by spinning up a throwaway `postgres:16-alpine` container (via
WSL Docker — see `Kevin codes\_agent-framework` conventions on this machine),
stubbing a minimal `auth.users` table + `auth.uid()`, then applying
`supabase/migrations/20260910000000_init_schema.sql` directly and running
smoke tests against it. To repeat:

1. Start a throwaway Postgres container and wait for it to be ready.
2. Create a stub `auth` schema: `auth.users(id uuid pk, email text)` and
   `auth.uid()` returning `current_setting('sf_test.uid', true)::uuid`, plus
   `authenticated`/`anon` roles (for the grants to resolve).
3. Apply the migration file directly via `psql < migration.sql`.
4. Insert a fake `auth.users` row, confirm the `on_auth_user_created` trigger
   creates `profiles`/`streak_state` rows.
5. Exercise: a genuine gap (missing day) breaks the chain; an open
   `repair_window` still displays the pre-miss `current_streak` (not 0); a
   contribution on Day 2 resolves Day 1's repair window AND completes Day 2
   independently; a cross-user RPC call is rejected by the ownership check;
   freeze consumption + milestone freeze awards; `expire_repair_windows`
   flips an overdue window to `broken` and the streak actually resets to 0.

This does NOT test `pg_cron`/`pg_net`/Supabase Vault (not present in a plain
Postgres image) or the Edge Functions (Deno runtime, need `supabase functions serve`
or a deployed project) — those need a real Supabase project per the steps
in `README.md`.

**Known bugs this process already caught and fixed** (so don't "fix" them
again without checking the fix is still there): `recompute_streak` used to
silently bridge over a missing day instead of treating it as a break, and
separately used to lock `current_streak` at 0 the moment it saw an open
`repair_window` instead of continuing to show the pre-miss value. Both fixed
in the current migration — the day-by-day walk with no "lock" flag.

## Full end-to-end (needs a real Supabase project + Resend account)

Not yet runnable — this project doesn't have live Supabase/Resend credentials
configured. Once they exist:

```bash
npx supabase link --project-ref <ref>
npx supabase db push
npx supabase functions deploy sync-activity
npx supabase functions deploy daily-streak-check
```

Then sign up via magic link on the running client and confirm the email
arrives promptly (proves Resend SMTP, not just Supabase's rate-limited
default), and that Settings saves a username with no token field anywhere.

## Known-failing

None yet — nothing has been deployed to a real backend to fail against.
