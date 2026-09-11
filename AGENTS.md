# StreakForge

The canonical context file. Claude Code, Antigravity (`agy`), and Codex all read
this — directly or by import. Put durable project knowledge here; put
session-to-session status in `docs/STATE.md`.

## What this is

A coding-streak tracker (GitHub + LeetCode) being rebuilt from a pure-
localStorage single-browser toy into a real account-based app: a dark
"liquid glass" UI (frosted translucent panels, GSAP + Framer Motion),
installable as a mobile PWA, with push notifications and email reminders
that make a streak very hard to lose by accident (auto freezes + a 24h
repair window + a small monthly repair-credit allowance — never *literally*
unbreakable, that would defeat the point). Full rationale and phased plan:
see the approved plan this was built from, summarized in `docs/DECISIONS.md`.

**Visual direction history**: shipped first as neo-brutalism (thick borders,
hard shadows), then pivoted to Apple-style liquid glass on the user's
explicit direction — see the 2026-09-11 entries in `docs/DECISIONS.md`. If
you're reading old context that mentions brutalism, it's superseded.

## Stack

- Frontend: React 18 + Vite (`client/`), Tailwind CSS v4 (`@tailwindcss/vite`),
  GSAP (4 specific sequences — flame timeline, count-up, calendar reveal,
  milestone burst) + Framer Motion (`motion/react`, used by the adapted
  GooeyNav/HourPicker components) — two animation libraries is a deliberate,
  accepted tradeoff of adopting Motion-based components, not an oversight
- Backend: Supabase — Postgres, Auth (magic-link email only), Edge Functions (Deno), pg_cron + pg_net
- Email: Resend (both Supabase Auth's SMTP and application reminder emails)
- PWA: `vite-plugin-pwa` (manifest + workbox app-shell service worker, Phase 3) — app-shell caching only, no runtime/API caching
- Push: Web Push (VAPID), service worker push handling (Phase 4, not yet built)
- Deploy: Vercel (static `client/dist` only — no Node server, no Vercel serverless functions; those were deleted)

## Layout

```
client/src/
  hooks/        useAuth (magic link), useStreak (Supabase read/write)
  lib/          supabaseClient, leetcode (browser fetch), localImport (one-time migration),
                utils.js (cn() — clsx+tailwind-merge, expected by the adapted components)
  components/   LoginScreen, ImportPrompt, StreakCard, StreakFlame, FreezeTag,
                DailyGoals, CalendarGrid, SettingsForm (username-only, no token field)
  components/ui/  GooeyNav, HourPicker, GitHubActivity, DeleteButton,
                EmojiReaction — adapted from pasted rare-ui-style source
                (Next.js bits stripped, DurationPicker's minutes segment
                dropped, EmojiReaction repurposed as a stress-buster, not
                message reactions) — see docs/DECISIONS.md for what changed
                and why. Kept as .tsx (Vite/esbuild strips TS without the
                project needing to be a TS project).
  components/   InstallPrompt (Phase 3 PWA install banner + iOS instructions)
client/scripts/ gen-icons.mjs — one-off zero-dep PNG generator for the PWA
                icon set (client/public/*.png); rerun after changing the
                flame mark, otherwise leave alone
supabase/
  migrations/   schema + all streak/freeze/repair logic as Postgres functions
  functions/    sync-activity (client-triggered), daily-streak-check (pg_cron, every 15min)
  setup/        one-time post-deploy SQL (pg_cron job) — NOT a migration, has project-specific values
```

## Rules

1. Streak/freeze/repair logic lives in ONE place: the Postgres functions in
   `supabase/migrations/20260910000000_init_schema.sql`. Do not reintroduce a
   second copy client-side — that duplication is exactly what caused the old
   UTC-boundary bug. Client-side math is optimistic-UI only and must always
   reconcile with the server response.
2. Every SECURITY DEFINER function callable by `authenticated` must check
   `auth.uid()` against the `p_user_id` it's about to touch (see
   `record_activity`/`use_repair_credit`/`recompute_streak`/
   `import_historical_day` for the pattern) — a null `auth.uid()` means a
   trusted service-role caller and is allowed through.
3. Never put a per-user GitHub token back into the schema or the client. GitHub
   contribution data is fetched server-side with one shared app-level PAT
   (`GITHUB_APP_TOKEN` secret) — see `docs/DECISIONS.md` for why.
4. Don't add dependencies without asking.
5. Run the checks in `docs/VERIFY.md` before reporting work as done — most of
   Phase 1 can't be fully verified without a real Supabase project; say so
   explicitly rather than claiming it works.

## Read these too

- `docs/STATE.md` — where we stopped, what's next
- `docs/DECISIONS.md` — why things are the way they are
- `docs/VERIFY.md` — how to prove a change works

## Don't touch

- `supabase/setup/schedule-cron.sql` is deliberately NOT a migration — it embeds
  a project ref and a Vault secret reference that must never be committed with
  real values filled in. Keep the placeholders.
