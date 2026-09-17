# Project State

> Updated at the end of every session, by whichever agent was driving.
> Keep it under a page. This is a baton, not a diary.

**Last updated:** 2026-09-12 by claude-code (Phase 4/5 pass)

## Where things stand

**Phase 1 (Foundation) is confirmed complete** — deployed live to project ref
`ccbdmhycxcsxdmyogsyd` (region ap-northeast-2), magic-link email confirmed
received by the user. Schema, both Edge Functions, all secrets, Auth's
Resend SMTP, and the `pg_cron` job are live.

**Phase 2 shipped twice**: first as neo-brutalism (confirmed working by the
user), then the user explicitly asked to scrap that entirely for a dark
Apple-style "liquid glass" look and pasted 7 component implementations to
integrate. **Current state is the liquid-glass version** — see
`docs/DECISIONS.md`'s 2026-09-11 entries for the full reasoning on both the
aesthetic pivot and which of the 7 components actually got used.

What's live now:

- **Stack change, confirmed with the user first**: Tailwind CSS v4
  (`@tailwindcss/vite`) and Framer Motion (`motion`) are now real
  dependencies, not just GSAP + hand-CSS. `client/src/lib/utils.js` has the
  `cn()` helper the adopted components expect.
- `client/src/styles/app.css`: dark ground (`#0a0a0c`) with a `.glass`
  component class (frosted background, `backdrop-filter: blur`, hairline
  border) used everywhere; Manrope + JetBrains Mono replaced Archivo Black +
  Space Grotesk.
- `client/src/components/ui/GooeyNav.jsx` — adapted from the pasted source:
  stripped `next/link`/`next/navigation` (this is a router-less Vite SPA),
  now purely controlled via `value`/`onChange` against local view state.
  Replaces the plain nav-link buttons for Dashboard/Settings.
- `client/src/components/ui/HourPicker.jsx` — adapted from the pasted
  `DurationPicker`: dropped the minutes segment (we need one 0-23
  hour-of-day value, not an hours+minutes duration), kept the
  figma-squircle/flubber icon-morph mechanics. Replaces the plain number
  input for `daily_goal_notify_hour` in Settings.
- GitHubActivity, NotificationBell, EmojiReaction, DeleteButton,
  GravityLetters, FolderComponent were **not** wired in — no matching
  feature exists yet (no notification inbox, no reactions, no
  delete-account flow, no file browser; GitHubActivity would duplicate the
  existing `CalendarGrid`). Revisit individually if/when a real feature
  needs one, per the fit-check in `~/.claude/CLAUDE.md`.
- GSAP (flame timeline, count-up, calendar reveal, milestone burst) is
  unchanged from the brutalist pass — kept as-is rather than rewritten to
  Framer Motion, since it already worked and wasn't asked to change. The
  project now deliberately runs two animation libraries.

**Verified how**: real dev server against the live Supabase project (via a
temporary, reverted auth bypass — confirmed via grep nothing was left
behind), `npm run build` clean at each step. Screenshots this pass were
NOT stale (pane was in view) and show the glass nav pill correctly sliding
between Dashboard/Settings, the flame's glow bleeding through the frosted
circle, and the settings HourPicker. Directly exercised the HourPicker's
edit flow: clicked the pencil, typed a value that exceeded max (219 > 23),
confirmed it clamped to 23, confirmed the parent form's React state
actually updated (not just the picker's internal text) by checking the
controlled input reflected 23 after a re-render. Confirmed GooeyNav's
active-state switches correctly via `data-active` on click.

## Also done this session (after the liquid-glass pivot above)

Wired in 3 more of the originally-deferred components, each given a real
purpose per the user's explicit ask — see `docs/DECISIONS.md`:

- **GitHubActivity** (`client/src/components/ui/GitHubActivity.tsx`) — real
  GitHub contribution graph + top-repos panel on the dashboard, fetched
  client-side from public APIs using just the stored username. Verified
  with live data (real user `JamesKevinJones`: "207 contributions in
  2026", correct per-day opacity levels 0/0.3/0.52/0.76/1, real repo
  avatars in the expandable panel).
- **DeleteButton** (`.../DeleteButton.tsx`) — now backs a real "Delete
  Account" action in Settings, calling a new
  `public.delete_own_account()` RPC (migration
  `20260911000000_delete_own_account.sql`, deployed). Verified the
  Postgres role can delete `auth.users` and the cascade removes all
  related rows, using a disposable test user (id
  `99999999-...`) — **never tested the actual confirm-delete against the
  real signed-up account**, only the open/cancel UI flow.
- **EmojiReaction** (`.../EmojiReaction.tsx`) — repurposed as a "Need a
  breather?" stress-buster widget on the dashboard (not a message
  reaction — this app has no messaging surface). Verified live: opens,
  loads real Apple emoji images from `em-content.zobj.net`, spawns a
  5-particle burst on click.

New deps for this pass: `react-apple-emojis`, `lucide-react`. Bundle now
~724KB (was ~685KB after the liquid-glass pivot, ~465KB before Tailwind).

Still deferred, no feature to attach to yet: NotificationBell,
GravityLetters, FolderComponent.

## Phase 3 (PWA shell) — done this session, partially verified

User said "phase 3" (green light) after a browser check of the liquid-glass
build that only got as far as the login screen — see "Also done this
session" below for why. Built:

- `vite-plugin-pwa` wired into `client/vite.config.js` (manifest + workbox
  app-shell service worker, `generateSW` mode, app-shell files only —
  Supabase/GitHub/LeetCode responses are NOT cached, on purpose).
- Icon set (`client/public/icon-192.png`, `icon-512.png`,
  `maskable-icon-512.png`, `apple-touch-icon.png`) generated by
  `client/scripts/gen-icons.mjs` — a zero-dependency procedural PNG
  encoder, not hand-designed art. Looks like a reasonable on-brand flame
  silhouette, not a placeholder, but is programmer art — revisit if the
  user wants a real designed mark.
- `client/src/components/InstallPrompt.jsx` — `beforeinstallprompt`
  handling for Android/desktop with a `.glass` banner, iOS Safari UA-sniffed
  static "Add to Home Screen" instructions, dismissal persisted in
  `localStorage`. Wired into `Dashboard` in `App.jsx` (post-login only).

**Verified:** `npm run build` clean. Manifest fields (name, icons,
`start_url`, `display: standalone`) confirmed correct by fetching
`manifest.webmanifest` from a real `vite preview` production server —
that's the actual installability contract, not just "the plugin ran."
`sw.js` confirmed served with valid workbox content.

**NOT verified — needs a real browser/deploy, not this session's tools:**
service worker *registration* fails in this session's sandboxed preview
pane ("unknown error occurred when fetching the script" — the standard
error for SW registration inside a sandboxed embed without
`allow-same-origin`; `sw.js` itself fetches fine directly, so this reads as
a pane limitation, not a code bug, but it is genuinely unconfirmed). The
iOS UA-branch of `InstallPrompt` was reviewed, not exercised live. Full
Lighthouse PWA audit (installability, offline reload) not run — say so if
asked, don't assume it would pass.

Also hit and fixed mid-session: a corrupted Vite dependency pre-bundle
cache (`node_modules/.vite`) after adding the new dependency, which made
the dev server serve a raw CommonJS `react/index.js` straight from
`node_modules` instead of its ESM-shimmed pre-bundle, crashing the app
with "does not provide an export named 'default'." Fixed by stopping the
dev server fully before deleting `node_modules/.vite` (deleting it while
the server still holds files open left a half-deleted cache, which was the
first, failed fix attempt) and restarting clean. Not a StreakForge-specific
bug — a general Vite/Windows dep-optimization gotcha, worth remembering if
a fresh "does not provide an export" error shows up after any future
dependency change on this project.

## Also done this session (before Phase 3, same day)

Tried to show the user the liquid-glass dashboard live. Two things worth
remembering:

1. The dev-only auth-bypass pattern used all session (hardcode a real user
   id in `App.jsx` under `import.meta.env.DEV`) only overrides which
   `userId` the app queries for — it does **not** fabricate a real Supabase
   session. In a brand-new browser tab with no existing session,
   `auth.uid()` is null and every RLS-protected `.single()` query correctly
   406s. That's RLS working as intended, not a bug — but it means this
   bypass trick only ever worked in earlier testing because a real
   magic-link session already existed in that browser's `localStorage`
   from a prior login in the same tab. It will NOT work standalone. Fully
   reverted (confirmed via grep) once this was understood.
2. Fell back to a real magic-link login; the email never arrived despite
   the UI reporting success — confirmed via a live inbox check.
   `supabase.auth.signInWithOtp` returns success client-side regardless of
   whether the downstream SMTP send actually completes, so "check your
   inbox" is not proof of delivery. Matches the already-flagged open
   question about Resend's sandbox domain limits. The project's Resend API
   key is send-only (confirmed: `GET /emails` returns 401
   `restricted_api_key`), so this couldn't be diagnosed further from here —
   needs the Resend dashboard directly, or a verified sending domain.

## Deployed to production (2026-09-12)

First real commit + push of this whole rewrite (Phases 1-3 had only ever
existed locally/in Supabase — the live Vercel site was still the old
localStorage-only app until this). Ran the mandatory security review
(`docs/DECISIONS.md` has the summary — no findings) before pushing.

Two things broke on the way to actually going live, both fixed:
1. Vercel had never had `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`/
   `VITE_VAPID_PUBLIC_KEY` set as env vars — the old live site never needed
   them. Set via `vercel env add ... production`, then redeployed
   (`vercel --prod`).
2. `streakforge-gules.vercel.app` (the actual live domain) is a manually
   pinned alias — `vercel --prod` deploys and creates a new deployment URL
   but does **not** automatically repoint an existing custom alias to it.
   Had to `vercel alias set <new-deployment-url> streakforge-gules.vercel.app`
   explicitly. Worth remembering for every future deploy of this project:
   a green "Ready" from `vercel --prod` does not by itself mean the public
   URL updated — check the alias too.

**Confirmed live and working, for real, outside this session's sandboxed
preview pane:** the login screen renders correctly; the service worker
registers and is active (`sw.js`, scope `/`) — this is the thing the
sandboxed pane could never confirm in Phase 3, so it's now genuinely
verified, not just "should work."

## Phase 4/5 — done this pass (2026-09-12)

Confirmed SW registration works for real on the live Vercel deploy (see
"Deployed to production" section above) — that unblocked starting Phase 4.

Turned out most of Phase 4/5's backend already existed from Phase 1
(`daily-streak-check`'s full notification state machine, real VAPID push
send, real Resend email send+templates, pg_cron running every 15min at
94/94 success) — confirmed live via direct read-only queries, not assumed.
**Phase 5 (email) was already proven working**: `notification_log` has a
real `evening_warning` row whose email was independently confirmed
delivered to the user's inbox earlier this session.

The actual gap: `push_subscriptions` had 0 rows — nothing on the client
ever called `pushManager.subscribe()`. Built this pass:
- `client/src/lib/push.js` — subscribe/unsubscribe, writes to
  `push_subscriptions` (existing RLS already covers it).
- `client/src/sw.js` — custom service worker (switched `vite-plugin-pwa`
  to `injectManifest` strategy) with real `push`/`notificationclick`
  handlers — Phase 3's auto-generated SW had no hook for these.
- `client/src/components/SettingsForm.jsx` — the push-notifications
  checkbox now actually subscribes/unsubscribes instead of just flipping
  an inert DB column; iOS not-yet-installed gets the same "Add to Home
  Screen" instructions as `InstallPrompt` (shared via new
  `client/src/lib/platform.js`).

**Verified:** security review clean (separate agent pass, see
`docs/DECISIONS.md`); `npm run build` clean; `dist/sw.js` confirmed to
contain both new event listeners post-build.
**Not verified:** an actual real push round-trip (permission prompt through
a notification actually appearing) — needs a real browser, same category
of gap as the Phase 3 SW-registration check that this session's sandboxed
preview pane can't exercise.

## Magic-link email — fixed (2026-09-12, same day)

Was completely broken; now confirmed delivering. Two real bugs, both
needed the user directly since both were project-security-config changes
Claude Code's safety classifier correctly refused to make via API — full
diagnosis in `docs/DECISIONS.md`:
1. `rate_limit_email_sent` was Supabase's default 2/hour, never raised
   when custom SMTP was wired up in Phase 1. User raised it to 30/hour.
2. The SMTP password Supabase had on file for the Resend relay was wrong
   (diagnosed by elimination: a direct Resend REST API call with the real
   key worked instantly, and `daily-streak-check`'s Resend-REST-API emails
   had been delivering the whole time — isolating the fault to
   specifically the SMTP-relay credential). User re-entered it in
   Dashboard -> Authentication -> Emails -> SMTP Settings.

**Accepted, not fixed:** delivered mail lands in spam, because
`onboarding@resend.dev` is Resend's shared sandbox domain with no sender
reputation of its own. Real fix is a verified owned domain — offered,
declined (no domain on hand, personal project). Revisit if this project
ever needs real users other than the developer.

## Fixed 2026-09-17: live site was silently serving a 6-day-stale build

Root cause: this project has Vercel's GitHub integration connected, and the
prior session *also* ran manual `vercel --prod` right after each `git
push` — two independent deployment triggers for the same commit. Vercel
auto-aliases the production domain to whichever deployment **finishes**
last, not whichever is newest by commit; an older commit's git-triggered
build finished after a newer manual deploy and silently reclaimed the
alias. No code was lost (git history was clean throughout) — purely a
deployment-pointer bug, invisible unless you diff the live bundle hash
against what you last confirmed.

**Rule going forward: pick one deployment trigger per push.** Either let
the GitHub integration deploy on its own and just wait for it, or deploy
manually via `vercel --prod` — don't do both for the same commit. If a
manual deploy is genuinely needed right after a push, verify the alias
again a minute or two later (`vercel inspect <domain>` -> check the `id`/
`created` timestamp) rather than trusting the alias-set output alone.

## In progress

- [ ] Bundle size (now ~729KB) still not addressed with code-splitting —
      noted repeatedly, not yet asked for.
- [ ] Push-subscription reconciliation on mount (DB says enabled, browser
      has no matching subscription) is not handled — see Phase 4/5 entry
      above.
- [ ] Real end-to-end push notification test (needs a real browser).

## The exact next step

Do a real end-to-end pass in an actual browser (not this session's
sandboxed preview pane): log in via the now-working magic link, enable
push notifications in Settings, confirm a real OS notification appears
from a manually-triggered `daily-streak-check` invoke. That's the one
remaining unverified link in the whole pipeline — everything upstream and
downstream of it has now been confirmed working independently, including
email delivery itself.

## Open questions

- Verified sending domain for Resend — see "Magic-link email" section
  above; explicitly deferred, not forgotten.
- Whether to add CI (GitHub Actions) for `supabase db push`/`functions
  deploy` — flagged in the plan as a Phase 1 decision point, not yet made.
- Bundle size (685KB) — revisit with code-splitting if it ever matters for
  this project; not raised as a concern yet.

## Known traps

- **The Browser pane goes stale when hidden** — `computer` screenshots can
  return a cached frame from before it was backgrounded even after
  `scroll_to`/navigation succeed, AND raw `requestAnimationFrame` stops
  ticking entirely while hidden (confirmed: 0 frames in 1.5s), even though
  `document.hidden` reports `false`. Verify via `javascript_tool`
  DOM/computed-style queries when a screenshot looks suspicious; there's no
  way to prove live motion works from inside a hidden pane.
- `supabase/setup/schedule-cron.sql` has placeholder `<PROJECT_REF>` and
  `<SERVICE_ROLE_KEY>` values — never commit it with real values filled in.
- `vite.config.js` has `server.fs.strict: false` and `watch.usePolling: true`
  — both work around this machine's specific short-path (`KEVINC~1`)/space-
  in-path dev-server quirks. Also has a `resolve.alias` for `@` -> `src`
  now, needed by every component ported from the pasted rare-ui-style
  source (`@/lib/utils`).
- `.claude/launch.json` for this project's dev server lives at `C:\`, not
  the project root — this environment resolves preview configs from the
  session's original cwd, a local quirk worth knowing about.
