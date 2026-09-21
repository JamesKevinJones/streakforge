# Hyperframes Composition Brief: StreakForge

## Objective
Create a short launch-style brag video for StreakForge, a GitHub + LeetCode
coding-streak tracker whose real pitch is that it refuses to let a streak
break by accident (auto freezes, a 24h repair window, repair credits).

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 19s target (actual: 5 scenes, 0-19s)

## Source Material
- Project root: `C:\Users\kj638\Kevin codes\streakforge`
- Primary files read: `brag-output/brag-plan.md`, `client/src/components/StreakFlame.jsx`,
  `client/src/components/StreakCard.jsx`, `client/src/components/ui/GitHubActivity.tsx`,
  `client/src/components/ui/EmojiReaction.tsx`, `client/src/styles/app.css`
- Product name: StreakForge
- Tagline / strongest claim: "Never lose the chain by accident."
- Key UI or visual moment to recreate: the liquid-glass frosted dashboard panel
  (flame + count-up), the repair-window banner state flip, the flame-orange
  contribution heatmap, and the stress-buster emoji-burst card.
- Copy that must appear verbatim:
  - "Missed a day?"
  - "Your streak is in a 24h repair window. Log a real contribution, or spend
    one of your repair credits to save it."
  - "Use Streak Repair"
  - "216 contributions in 2026"
  - "Need a breather? Throw a few feelings at the screen. No judgment."
  - "StreakForge"
  - "Never lose the chain by accident."

## Creative Direction
- Tone preset: default
- Creative direction: Duolingo-style streak warmth, executed in dark
  liquid-glass instead of bright cartoon style — playful stakes, not
  corporate reassurance.
- Interpretation: comfortable pacing (5 scenes, room to breathe), crossfades
  over hard cuts, humor earned from the product's own copy (stress-buster
  line) rather than invented jokes.
- Angle: every streak app hides the fact that one bad night resets the whole
  thing. StreakForge's pitch is a real safety net (freeze -> repair window ->
  repair credit), shown as a state change actually catching a miss, not a
  bullet-point claim — ending on an unexpectedly human stress-buster beat.
- Hook: black frame, a single ember grows into the flame mark with a soft
  ignite, "Missed a day?" fades in small beside it.
- Outro / punchline: stress-buster emoji burst -> wordmark "StreakForge" ->
  "Never lose the chain by accident."
- Avoid: generic SaaS language, abstract filler visuals, unrelated redesign.

## Visual Identity
- Background: `#0a0a0c` ground with radial glows
  `rgba(255,91,31,0.16)` top-left / `rgba(64,156,255,0.10)` top-right
- Text: `rgba(255,255,255,0.92)`
- Accent (flame): `#ff5b1f`; flame-soft `#ffb37a`; ember `#ffb800`;
  go/success `#34d399`; frost/info `#409cff`; danger `#ff453a`
- Flame mark gradient: `#ffb800` (core/top) -> `#ff5b1f` (edge/base), teardrop
  silhouette, used as a single hero icon (not the app's internal 3-layer
  animated version)
- Display/body font: Manrope (500/700/800) — not in Hyperframes' pre-bundled
  set, so embedded locally via `@font-face` -> `assets/fonts/Manrope-Variable.woff2`
  (downloaded once from Google Fonts, referenced as a local file to satisfy
  `font_family_without_font_face` and render offline/deterministically)
- Mono/data-label font: JetBrains Mono (pre-bundled by Hyperframes, no
  `@font-face` needed)
- Strongest visual element: the frosted-glass panel (`backdrop-filter:
  blur(20px) saturate(140%)`, `rgba(255,255,255,0.06)` fill, hairline
  border) — present in every scene, not just the flame scene

## Storyboard
Full storyboard in `brag-output/brag-plan.md`. Scene summary (absolute time):

1. Ignite — 0.00-2.50s (crossfade tail to 2.85s) — ember grows into the
   flame mark, ignite whoosh/thud, "Missed a day?" fades in
2. The streak, live — 2.50-6.50s (tail 6.85s) — glass dashboard panel,
   flame + streak count-up 0->47, "day streak" mono label, longest-streak
   badge, freeze-credit pill
3. The catch — 6.50-11.50s (tail 11.85s) — repair-window banner slides in
   with the verbatim copy and "Use Streak Repair" button, holds, then flips
   to a frozen/safe state on a beat-locked chime; streak number visibly
   unchanged
4. Real activity, not a mockup — 11.50-16.00s (tail 16.35s) — flame-orange
   contribution heatmap lights in 5 beat-grid-locked column groups, caption
   "216 contributions in 2026" settles at the end
5. The release — 16.00-19.00s — stress-buster card, simulated tap, emoji
   particle burst, card fades into the "StreakForge" wordmark + flame mark +
   tagline, beat-locked settle

## Audio
- Audio role: warm bed, motion-matched accents
- Audio arc: low under the ignite -> gentle build through the dashboard ->
  brief dip then swell on the repair-window save -> steady/rhythmic through
  the heatmap -> soft fade-out under the closing wordmark
- Music: `happy-beats-business-moves-vol-9-by-ende-dot-app.mp3` (mid-energy,
  slightly laid-back — matches the "warm bed, not corporate-motivational"
  direction; chosen from the shortlist per `audio.md`)
- Music treatment: `data-automation` volume envelope on the bed — 0.0 at
  t=0, rises to ~0.30 under the ignite, builds to ~0.34 through the
  dashboard, dips to ~0.24 during the repair-window tension beat, swells to
  ~0.38 on the flip, settles ~0.34-0.36 through the heatmap, fades to 0.0 by
  t=19.0 under the wordmark
- Music cue guidance: bundled rich cue JSON at
  `composition/assets/music/cues/happy-beats-business-moves-vol-9-by-ende-dot-app.music-cues.json`
  (`strongCues` + full `beats` grid, 114.84 BPM)
- Audio-reactive treatment: subtle — pre-extracted per-frame bands
  (`assets/audio-data/hook-bands.json`, trimmed to the first 3.0s via
  `hyperframes-creative/scripts/extract-audio-data.py`) drive the flame
  aura's opacity/scale in the hook only (Scene 1, after the ignite settles);
  no other scene is audio-reactive
- Audio-coupled moments:
  - Scene 1 — ignite thud synced to the flame's ignite frame (~0.20s;
    no strong cue exists that early, so natural timing is used)
  - Scene 3 — soft drop on the banner's entrance (~6.50s); low chime exactly
    on the state flip, beat-locked to the 8.4405s strong cue
  - Scene 4 — soft tick per heatmap column-group reveal, beat-grid-locked to
    5 every-other-beat timestamps (11.60/12.65/13.70/14.76/15.81s)
  - Scene 5 — light pop per emoji as it releases; soft resonant chime under
    the wordmark settle, beat-locked to the 17.9105s beat
- SFX selection guidance: `impact/impactSoft_medium_*` for the ignite and the
  repair-window flip (safest/warmest reveal family); `interface/drop_*` for
  the banner entrance and heatmap ticks; `interface/click_*` / `ui/click*`
  for the emoji pops; `impact/impactBell_heavy_000` for the final wordmark
  chime (used once, sparingly, per the tone table)
- Exact SFX choice: filenames/timestamps/volumes finalized against the
  implemented animation in `composition/index.html`
- Audio files: copied into `composition/assets/music/` and
  `composition/assets/sfx/{interface,impact}/`

## Hyperframes Instructions
Load `hyperframes-core`, `hyperframes-animation`, `hyperframes-creative`,
`hyperframes-keyframes`, `hyperframes-cli` (already loaded for this build).
`/brag` is its own workflow — the generic `hyperframes` intent interview and
promo/launch-video workflow were not entered.

Requirements:
- Show real UI/copy from the source project (glass panel, flame mark, repair
  banner copy, heatmap, stress-buster copy — all verbatim per the plan).
- Keep all text readable in the final render; verify with `check`'s
  layout + contrast audit.
- Total duration 15-25s (built: 19s).
- Include the music + SFX layer (not disabled, not silent).
- 1-3 strong beat locks used: banner flip (8.4405s), wordmark settle
  (17.9105s) — 2 major locks, plus one 5-point beat-grid sequence for the
  heatmap. Ignite thud uses natural timing (no cue exists that early).
- Audio-reactive: subtle, flame-aura only, hook scene only, per
  `hyperframes-creative/references/audio-reactive.md` (opacity + small scale
  swings from bass band, no waveform/equalizer visuals).
- `npx hyperframes check` run before render (brag's single gate).
