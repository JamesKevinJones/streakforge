# Project State

> Updated at the end of every session, by whichever agent was driving.
> Keep it under a page. This is a baton, not a diary.

**Last updated:** 2026-09-11 by claude-code (Phase 3 pass)

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

## In progress

- [ ] Nothing mid-edit. Bundle size (now ~726KB) still not addressed with
      code-splitting — noted repeatedly, not yet asked for.
- [ ] Service worker registration needs confirming on a real deploy or
      real browser (see Phase 3 section above) before calling push
      notifications (Phase 4) safe to build on top of it.

## The exact next step

Confirm SW registration works for real (deploy to Vercel, or open the dev
build in an actual browser tab outside this session's tools) before
starting Phase 4 (push notifications) — push depends on a working service
worker, and that specific piece is the one thing this session could not
verify itself. Also worth fixing before then: magic-link email delivery
(see above) — Phase 4/5 both assume email/push actually reach the user, and
that's currently unconfirmed for a fresh login.

## Open questions

- Resend sandbox sender only delivers to the Resend account's own
  registered email — confirm whether a verified sending domain is needed
  before real multi-user delivery (not just the developer's own testing).
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
