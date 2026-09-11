# Decisions

Append-only. Newest at the top. Never edit an old entry — if it stops being
true, add a new one that supersedes it and say so.

The point is to stop a fresh agent from "fixing" something you chose
deliberately. If a choice would look wrong without context, it belongs here.

---

## 2026-09-12 — Magic-link email: two real bugs found and fixed, one limitation accepted

**Symptom.** Magic-link login silently never delivered, across multiple
attempts over two days, despite the UI always reporting success.
`supabase.auth.signInWithOtp` returns success client-side regardless of
whether the email actually sends — it's not a delivery guarantee.

**Bug 1 — `rate_limit_email_sent` left at Supabase's default of 2/hour.**
This throttle applies to Supabase Auth's own mailer *before* it ever
reaches the configured custom SMTP, independent of Resend's health. It was
never raised when custom Resend SMTP was wired up in Phase 1 (that setup
only configured *where* to send, not *how often* Supabase would even try).
Diagnosed by reading the project's live auth config via the Supabase
Management API (`GET /v1/projects/{ref}/config/auth`). Fixing this via the
Management API (`PATCH .../config/auth`) was blocked twice by this
environment's own safety classifier (a project security-config change) —
correctly so; this is exactly the kind of setting a human should approve
directly. User raised it to 30/hour via Dashboard -> Authentication ->
Rate Limits.

**Bug 2 — the SMTP password Supabase had on file for the Resend relay was
wrong.** Confirmed via elimination: sent one email directly through
Resend's REST API using the known-good key (`re_...`) — arrived
immediately, proving Resend itself and the API key were both fine. Also
confirmed indirectly: `daily-streak-check`'s own emails (which call
Resend's REST API directly, not SMTP) had already been delivering
correctly the whole time — a real `freeze_applied` email arrived in the
user's inbox during this exact debugging session. That isolated the fault
to the one path both healthy signals excluded: Supabase Auth's SMTP relay
credential. An attempted API fix (`PATCH .../config/auth` with the correct
`smtp_pass`) was blocked by the same safety classifier as Bug 1. User
re-entered the password directly in Dashboard -> Authentication -> Emails
-> SMTP Settings and saved. Magic-link email arrived on the next attempt.

**Accepted limitation — sender domain.** The arriving email landed in
spam, expected for `onboarding@resend.dev` (Resend's shared sandbox
domain, used by many unrelated senders, so it carries no sender reputation
of its own with any given receiving provider). The real fix is verifying
a real owned domain in Resend and sending from that instead — offered to
the user, declined for now (no domain on hand, and this is a personal
portfolio project, not something serving real third-party users yet).
Stopgap: the user marked the message "Not spam" in Gmail, which fixes
delivery-to-inbox for that one address going forward but doesn't help any
other future signee. **Revisit if this project ever needs to onboard
someone other than the developer** — this directly closes the open
question flagged back in Phase 1 about whether a verified sending domain
would be needed before real multi-user delivery.

---

## 2026-09-12 — Phase 4/5: push subscription wiring (backend already existed)

**Context.** User confirmed going ahead with Phase 4 (push) and Phase 5
(email). Before writing anything, checked what already existed rather than
assuming a blank slate — a large, structured "do all of Phase 4+5 now,
skip approvals" instruction had arrived earlier and didn't match this
session's established voice or the standing security-review-before-push
rule, so it was surfaced to the user rather than acted on directly; this
entry covers what was actually built once the user gave their own
go-ahead in their own words.

**What was already live from Phase 1** (confirmed via direct read-only
queries against the project, not assumed from old docs): `daily-streak-check`
already implements the full notification state machine — evening warnings,
midnight rollover (freeze/repair/complete/milestone), a mid-window repair
reminder, and a global sweep for expired repair windows — with real Web
Push sending (`web-push` npm package, VAPID) and real Resend email sending,
one email template per notification kind, all gated by `notification_log`'s
unique constraint. `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT`/
`RESEND_API_KEY`/`RESEND_FROM` secrets were all already set. The pg_cron
job (`daily-streak-check-15min`) has run every 15 minutes with a 94/94
success rate. `notification_log` already has one real, delivered row — an
`evening_warning` email that was independently confirmed to have actually
arrived in the user's inbox earlier this session. **Phase 5 (email) was
therefore already working before this pass** — nothing new needed there
beyond confirming it.

**What was actually missing, and what this pass built:** `push_subscriptions`
had zero rows. Nothing on the client ever called `pushManager.subscribe()`
— the Settings "Push notifications" checkbox only ever flipped a database
boolean that the server-side code correctly checked, but the table it
needed to find rows in was never populated from anywhere. Built:
- `client/src/lib/push.js` — `subscribeToPush`/`unsubscribeFromPush`:
  requests Notification permission, subscribes via
  `registration.pushManager.subscribe()` using `VITE_VAPID_PUBLIC_KEY`,
  writes the subscription into `push_subscriptions` (owner-RLS already
  covers this — no new policy needed). A unique-constraint conflict on
  `endpoint` (re-subscribing the same browser) is treated as success, not
  an error, since there's no `UPDATE` policy on that table and nothing
  about an existing identical row needs changing.
- `client/src/sw.js` — a **custom** service worker source replacing Phase
  3's auto-generated one, because `vite-plugin-pwa`'s `generateSW` strategy
  gives no hook for a `push`/`notificationclick` listener. Switched
  `vite.config.js` to `strategies: 'injectManifest'` (own `src/sw.js`,
  precached via the `workbox-precaching` package — same app-shell-only
  scope as before). Added `workbox-precaching` as a devDependency; treated
  as part of the already-approved `vite-plugin-pwa` adoption, not a fresh
  ask, the same reasoning applied to `vite-plugin-pwa` itself in the Phase
  3 entry.
- `client/src/components/SettingsForm.jsx` — the checkbox now actually
  subscribes/unsubscribes, then immediately persists just
  `profiles.notifications_enabled` (not gated behind the page's main "Save
  Settings" button) — a real browser permission + subscription now exists
  the instant the checkbox is checked, so leaving the DB flag stale until
  an unrelated Save click would risk silent no-op sends from the cron job.
  iOS Safari not yet added to the home screen gets the same "tap Share,
  then Add to Home Screen" instructions as `InstallPrompt` (extracted the
  shared UA-sniffing helpers into `client/src/lib/platform.js` rather than
  duplicating them).

**Not done, scope cut for time:** no reconciliation on mount if
`profiles.notifications_enabled` is true but the browser has no matching
push subscription (e.g. cleared site data, different browser) — the toggle
will show checked but silently not deliver until the user unchecks/rechecks
it. Acceptable gap for now; revisit if it causes real confusion.

**Verified:** security review (separate agent pass) — no high-confidence
findings; `npm run build` clean, `dist/sw.js` confirmed to contain both the
`push` and `notificationclick` listeners after the workbox build step.
**Not verified:** an actual end-to-end push (permission prompt -> real
subscribe -> server sends -> notification appears) — needs a real browser
outside this session's sandboxed preview pane, same category of gap as
Phase 3's service-worker-registration check. Should be exercised for real
after this deploys.

---

## 2026-09-11 — Phase 3: PWA shell (manifest, icons, service worker, install prompt)

**Context.** User gave the go-ahead ("phase 3") to start the PWA shell per
the original phased plan, after a browser check of the liquid-glass build
(the check itself was partial — see below).

**Decision.** Added `vite-plugin-pwa` (the dependency the original plan
already named for this phase — treated as pre-approved, not a fresh ask)
using its default `generateSW`/workbox strategy:
- `client/vite.config.js` — `VitePWA({...})` with manifest fields (name,
  `start_url: '/'`, `display: 'standalone'`, theme/background `#0a0a0c` to
  match the liquid-glass ground), and `workbox.globPatterns` scoped to the
  app shell only (`js,css,html,svg,png,ico`) — deliberately **not** caching
  Supabase/GitHub/LeetCode API responses. A stale streak number is worse
  than a network error; runtime data caching isn't in scope until it's an
  explicit offline-mode decision, not a side effect of enabling a service
  worker.
- `client/public/icon-192.png`, `icon-512.png`, `maskable-icon-512.png`,
  `apple-touch-icon.png` — generated procedurally by
  `client/scripts/gen-icons.mjs`, a ~150-line zero-dependency PNG encoder
  (raw pixel buffer + Node's built-in `zlib.deflateSync`, manual PNG chunk
  framing incl. hand-rolled CRC32). Chosen over adding an image-generation
  dependency (`sharp`, `pwa-asset-generator`) for four static icons, and
  over hand-copying rasterized bitmap data through the chat/tool boundary
  (tried first — a 40KB+ base64 blob transcribed by hand is exactly the
  kind of thing that silently corrupts; abandoned once that risk was
  obvious, in favor of a script that produces exact, reproducible bytes).
  The script is kept in the repo (not deleted) in case icons need
  regenerating; safe to replace with hand-designed art later.
- `client/src/components/InstallPrompt.jsx` — new component, added to the
  `Dashboard` view (post-login only, not the login screen). Branches three
  ways: already standalone -> renders nothing; iOS Safari not yet installed
  -> static "Tap Share, then Add to Home Screen" instructions (iOS never
  fires `beforeinstallprompt` and has no reliable feature-detect for this,
  so it's UA-sniffed — accepted as brittle-but-standard per the original
  plan's own caveat); everyone else -> listens for `beforeinstallprompt`,
  suppresses the native mini-infobar, shows a `.glass`-styled banner that
  triggers the real native prompt on click. Dismissal persists via
  `localStorage` (`sf_install_prompt_dismissed`) so it doesn't nag every
  visit — no expiry/re-ask logic, matching this project's general
  "don't over-engineer a hobby project" bar.
- `client/index.html` — added `apple-touch-icon` link and
  `apple-mobile-web-app-*` meta tags (iOS ignores the manifest's icons for
  home-screen add; needs its own link tag).

**Verified how, and what's still unverified.** `npm run build` clean;
manifest fields confirmed correct by fetching `manifest.webmanifest`
directly from a real `vite preview` production server (name, icons,
`start_url`, `display: standalone` all present — the installability
criteria that matter). `sw.js` confirmed served with valid JS content
(200, real workbox code) from that same production server. **Service
worker *registration* itself could not be verified** — it fails in this
session's sandboxed Browser-pane preview with "unknown error occurred when
fetching the script," which is the standard error a browser throws when
`navigator.serviceWorker.register()` runs inside a sandboxed embed without
`allow-same-origin` (an environment limitation of the preview pane, not
evidence of a bug in `sw.js` itself, given the file fetches fine directly).
Needs confirming against a real deploy (Vercel) or a real desktop/mobile
browser, not this tool's preview. Also not verified: the iOS UA-branch's
actual visual rendering (reasoned through code review, not exercised live
— doing so would have needed a fabricated `beforeinstallprompt` event or a
real iOS device) and the `InstallPrompt`'s post-login placement means a
visitor never sees it before creating an account, which is an accepted
scope choice, not a limitation to fix.

**Also this session, before Phase 3 started:** user asked to see the
liquid-glass build in the browser. The dev-only auth bypass pattern used
throughout this session (hardcode a real user id in `App.jsx`, gated by
`import.meta.env.DEV`) does **not** work in a brand-new browser tab/preview
context, because it only overrides which user id the app queries for — it
does not fabricate a real Supabase session, so `auth.uid()` is null and
every RLS-protected `.single()` query correctly 406s. This is RLS working
as intended, not a bug. Reverted immediately (confirmed via grep). Fell
back to a real magic-link login attempt instead; the email never arrived
in a live check of the inbox — `supabase.auth.signInWithOtp` returns
success client-side regardless of whether the downstream SMTP send actually
completes, so the UI's "check your inbox" message is not proof of
delivery. Consistent with the already-flagged open question that Resend's
sandbox sending domain has real limits. Not investigated further this
session (would need the Resend dashboard directly — the project's `re_...`
API key is send-only and can't list sent messages); worth checking before
relying on magic-link login for a real demo.

---

## 2026-09-11 — Pivoted from neo-brutalism to dark liquid glass; adopted Tailwind + Framer Motion for real

**Context.** Phase 2 shipped as neo-brutalism (thick ink borders, hard
offset shadows, sharp corners, hand-written CSS tokens, GSAP-only) and was
confirmed working by the user. The user then explicitly asked to scrap that
direction entirely for an Apple-style "liquid glass" look, and pasted 7
full component implementations (GitHubActivity, NotificationBell,
EmojiReaction, DeleteButton, DurationPicker, GooeyNav, GravityLetters,
FolderComponent) to integrate — all built with Tailwind utility classes and
`motion/react` (Framer Motion), several with additional libs
(`@radix-ui/react-slot`, `figma-squircle`, `flubber`, `react-apple-emojis`,
`react-use-measure`, `lucide-react`).

**Decision.** Adopted Tailwind CSS v4 (`@tailwindcss/vite`) and Framer
Motion (`motion`) as real, permanent additions to the stack — confirmed
explicitly with the user rather than assumed, given this reverses the
"dependency discipline" call made just an hour earlier for the same
project. Rebuilt every component's markup in Tailwind + a small `.glass`
component class (frosted background, backdrop-blur, hairline border) over
a dark ground. Of the 7 pasted components, only **GooeyNav** (nav bar) and
an adapted single-value version of **DurationPicker**, renamed
`HourPicker` (our settings need one 0-23 hour value, not an hours+minutes
duration — the minutes segment was dropped) were wired in, per an explicit
scope check with the user. GooeyNav's Next.js-specific bits
(`next/link`, `next/navigation`'s `usePathname`) were stripped since this
is a router-less Vite SPA — it's now purely controlled via `value`/`onChange`
against local view state.

**Why not the alternative (all 7 components, or none).** GitHubActivity,
NotificationBell, EmojiReaction, DeleteButton, GravityLetters, and
FolderComponent have no matching feature in StreakForge today (no
notification inbox, no reactions, no delete-account flow, no file browser,
and GitHubActivity duplicates the existing GitHub+LeetCode `CalendarGrid`).
Wiring them in anyway would mean dead UI surface and unused imports for no
reason. Refusing the whole ask outright would have overridden a legitimate,
clearly-stated creative pivot that wasn't this agent's call to block —
the right move was presenting the real stack/scope tradeoffs (concretely,
not vaguely) and letting the user decide, same pattern as the `fluid-orb`
decision below.

**Consequences.** The project now runs two animation libraries (GSAP for
the 4 sequences from Phase 2, Framer Motion for GooeyNav/HourPicker) —
a real, accepted tradeoff, not an oversight to "fix" later by ripping one
out. Bundle size grew from ~465KB to ~685KB. Any future component adopted
from a Tailwind+Motion registry (rare-ui or otherwise) now fits this stack
without a repeat of the earlier "no Tailwind here" objection — but the
per-component fit-to-feature check from `docs/CLAUDE.md`'s "Supplementary
component source: rare-ui" section still applies before adding more.

---

## 2026-09-11 — Hand-built `flame-aura` glow instead of the rare-ui `fluid-orb` component

**Note (superseded in part):** this decision's "no Tailwind here" reasoning
no longer holds after the entry above — Tailwind is now part of the stack.
The decision to skip the specific `fluid-orb` component (WebGL orb, no
relation to a coding streak) stands on its own merits regardless.

**Context.** User asked to integrate `swamimalode07/rare-ui`'s `fluid-orb`
component (`npx shadcn add swamimalode07/rare-ui/fluid-orb`) — a WebGL
glowing color-blob styled after ChatGPT's voice-mode indicator.

**Decision.** Didn't install it. It requires Tailwind CSS + a `cn()` utils
helper, neither of which this project has (it's hand-written CSS on
purpose, see the Phase 2 design tokens), and its soft glassy default blue
glow doesn't fit a flat neo-brutalist system or represent anything about a
coding streak. Instead, built `flame-aura` in `StreakFlame.jsx`: a blurred
`radial-gradient` div driven by a slow GSAP drift (position + scale), using
the same "soft drifting glow" idea but with zero new dependencies and
colored from the flame's own state palette (idle/completed/frozen/at-risk)
instead of a generic default.

**Why not the alternative.** Installing Tailwind for one decorative
component would mean two competing styling systems in a small app, and the
component's literal visual (a generic voice-assistant orb) has no
relationship to "streak fire" — see `~/.claude/CLAUDE.md`'s "Supplementary
component source: rare-ui" section for the general version of this
reasoning, confirmed with the user before proceeding.

**Consequences.** If a future feature genuinely needs Tailwind (unlikely
for this app's scope), this decision should be revisited — right now
there's no Tailwind anywhere in the client, and new UI work should keep
using the CSS custom-property token system in `app.css`.

---

## 2026-09-11 — Wired in GitHubActivity, DeleteButton, and EmojiReaction (repurposed as a "stress buster")

**Context.** Of the 7 pasted components, the previous entry deferred
GitHubActivity, NotificationBell, EmojiReaction, DeleteButton,
GravityLetters, and FolderComponent for lack of a matching feature. The
user then explicitly asked for GitHubActivity, DeleteButton, and
EmojiReaction ("as a stress buster") — each now has a real, specific
purpose, resolving the earlier objection for these three specifically.

**Decision.**
- **GitHubActivity** — added to the dashboard as its own section, calling
  the public `github-contributions-api.jogruber.de` + GitHub events APIs
  directly with just the stored `github_username` (no token, consistent
  with the app-level-token decision above). Shown alongside, not instead
  of, `CalendarGrid` — CalendarGrid drives the actual streak mechanics
  (GitHub + LeetCode + freeze/repair state) and can't be replaced by a
  GitHub-only component; GitHubActivity is a nicer-looking supplementary
  view of the same GitHub data.
- **DeleteButton** — gave it a feature to attach to: "Delete Account" in
  Settings, backed by a new `public.delete_own_account()` SECURITY DEFINER
  function (migration `20260911000000_delete_own_account.sql`) that
  deletes the caller's own `auth.users` row; the existing `ON DELETE
  CASCADE` foreign keys from the init migration remove
  profiles/streak_state/daily_records/push_subscriptions/notification_log
  automatically. Verified the migration role can actually delete from
  `auth.users` and that the cascade fires, using a disposable test user —
  never tested against the real signed-up account.
- **EmojiReaction** — kept its exact mechanics (particle burst physics,
  spring-driven picker) but repurposed per the user's framing: not a
  message-reaction picker (no messaging feature exists here), a "throw an
  emoji, blow off some steam" widget on the dashboard, labeled
  accordingly ("Need a breather?").

**Why not the alternative (leave them out).** These three now have the
same thing NotificationBell/GravityLetters/FolderComponent still lack: an
actual reason to exist in this app, supplied by the user rather than
invented. The earlier deferral was about missing purpose, not the
components' quality — once given a purpose, wiring them in is the
correct call, not something to keep resisting.

**Consequences.** Two new npm dependencies (`react-apple-emojis`,
`lucide-react`) for EmojiReaction specifically. Bundle grew again
(~685KB -> ~724KB), mostly from `react-apple-emojis`' bundled data.
Account deletion is now a real, irreversible action reachable from the UI
— treat `delete_own_account()` with the same care as any other
destructive migration if it's ever modified.

---

## 2026-09-10 — Streak/freeze/repair math lives only in Postgres functions

**Context.** The old app had the same streak-calculation logic duplicated
three times: `client/src/store.js` (localStorage), `server/services/streak.js`
(dead Express backend), `api/streak.js` (dead Vercel serverless function).
All three used blind UTC day boundaries (`new Date().toISOString().split('T')[0]`),
which is why a day could flip hours away from a non-UTC user's actual midnight
without anyone noticing — three copies meant no single place to catch it.

**Decision.** One canonical implementation as Postgres functions
(`recompute_streak`, `evaluate_daily_status`, `record_activity`,
`use_repair_credit`, `expire_repair_windows`, `import_historical_day`) in
`supabase/migrations/20260910000000_init_schema.sql`. The client calls these
via `supabase.rpc()`/Edge Functions and may keep a small optimistic-UI mirror,
but that mirror must always reconcile with the server response, never persist
as truth.

**Why not the alternative.** Keeping the logic in Edge Function TypeScript
(calling out to Postgres only for reads/writes) was considered, but it splits
the state machine across two languages and two deploy artifacts for no benefit
— the whole point was collapsing three copies into one, not into two.

**Consequences.** Any future streak-rule change (repair window length, freeze
milestones, etc.) is a migration, not a client code change. `recompute_streak`
walks actual calendar days (not just existing rows) specifically so a missing
day is never silently bridged over — see that function's comment for the bug
this fixes.

---

## 2026-09-10 — GitHub contribution data uses one app-level token, not per-user PATs

**Context.** The original app made every user generate and paste their own
GitHub PAT, stored in `localStorage`, with copy explicitly promising it was
"never sent to any server." Making the scheduled daily check work at all
requires the server to independently know a user's GitHub status, which
would normally mean either OAuth or storing that PAT server-side (breaking
the original promise).

**Decision.** GitHub's GraphQL contribution calendar for a username is the
same data already public on that user's profile page — it doesn't require a
token belonging to the user being queried, just any authenticated token. So
StreakForge uses a single low-scope PAT, owned by the project (`GITHUB_APP_TOKEN`
Supabase secret), to fetch any user's public contributions. `SettingsForm`
now asks for a username only.

**Why not the alternative.** GitHub OAuth was considered (per-user token,
narrower blast radius) but adds an OAuth app registration, callback URL
handling, and token refresh logic for no real security gain here — public
contribution counts are public regardless of whose token reads them.

**Consequences.** The app-level token can never be shipped to the browser
(would let anyone drain its rate limit) — all GitHub fetching happens
server-side, through `supabase/functions/_shared/github.ts`, called by both
`sync-activity` (client-triggered) and `daily-streak-check` (cron). A single
shared token has GitHub's standard rate limit (~5000 GraphQL points/hour) —
fine at current scale, a real ceiling only if the user base grows a lot.

---

## 2026-09-10 — LeetCode sync is client-primary; the cron never trusts it as sole source of truth

**Context.** LeetCode has no official API and no auth. The original client
code already needed a `corsproxy.io` fallback for browser requests. A request
from a cloud provider's datacenter IP (Supabase Edge Functions) is materially
more likely to be Cloudflare-blocked than an ordinary browser request.

**Decision.** The client remains the primary source: whenever the app is
open, it fetches LeetCode data in-browser (`client/src/lib/leetcode.js`) and
reports it to `sync-activity`. The scheduled job only attempts a best-effort
fallback fetch (`supabase/functions/_shared/leetcode.ts`) for a day nobody
opened the app, and any failure there is swallowed — it must never block or
fail the rest of that user's GitHub-based check.

**Why not the alternative.** Routing all LeetCode calls through the server
(simpler mental model, one code path) was rejected because it's the more
fragile path for this specific API, not the more robust one.

**Consequences.** A LeetCode-only user who never opens the app on a given day
may show that day as "unknown" for LeetCode rather than confirmed — an
accepted, documented degradation, not a bug to chase further.

---

## 2026-09-10 — Repair-window semantics: Day 1 / Day 2 rule

**Context.** "Generous auto-repair" needed an exact rule for what happens
when a missed day (Day 1) opens a 24h repair window and activity later lands
on the following day (Day 2) — otherwise it's ambiguous whether one commit
could forgive multiple days indefinitely.

**Decision.** A contribution landing anywhere in Day 2 does two independent
things: it resolves Day 1's open `repair_window` to `completed` (that's
exactly Day 1's resolution condition), AND it's evaluated as Day 2's own
contribution at Day 2's own midnight rollover. These never chain — if Day 2
also has no activity, it opens its own new repair window (or consumes a
freeze) exactly as if Day 1 had never happened. See
`evaluate_daily_status`/`record_activity` in the schema migration.

**Why not the alternative.** A simpler "unlimited repair as long as you're
eventually active" rule was rejected — it would let one contribution every
other day sustain an infinite streak, which isn't "generous," it's broken.

**Consequences.** The only way to resolve Day 1 without new activity is
spending a `repair_credits` unit (~1/month) via the explicit in-app
"Use Streak Repair" action, before Day 1's own deadline.
