# Brag Plan: StreakForge

## What is this app?
A GitHub + LeetCode coding-streak tracker that makes the streak nearly
impossible to lose by accident — auto-applied freeze credits, a 24-hour
repair window, and real push/email nudges before it's ever at risk.

## The angle
The joke every streak app hides: one bad night, a timezone bug, a missed
day — and the whole thing you cared about resets to zero. StreakForge's
actual pitch is that it refuses to let that happen by accident, and it
backs that up with a real safety net (freeze → repair window → repair
credit) instead of just saying "keep your streak!" like every habit app.
The video's job is to show the safety net actually catching a miss, not
just describe it — and to end somewhere unexpectedly human (a "need a
breather" stress-buster) for a tool that's otherwise all discipline and
GitHub squares.

## Hook (first 2-3 seconds)
Black frame. A single ember catches and grows into the app's flame mark,
igniting with a soft whoosh. As it stabilizes: "Missed a day?" fades in
beside it, small, almost a threat — a beat before the reveal answers it.

## Key moments (the middle)
- The streak flame + count-up on the real Dashboard, in the actual
  liquid-glass frosted panel — the number ticking up, not a static digit.
- The repair-window banner appearing ("out of freezes... 24h to save it"),
  then flipping to "frozen, no worries" — the safety net working, shown as
  a state change, not a bullet point.
- The real GitHub activity heatmap lighting up square by square — genuine
  contribution data, not a placeholder grid.

## Outro / punchline
Cut to the "Need a breather? Throw a few feelings at the screen. No
judgment." card — a tap sends a burst of emoji across the glass panel.
Wordmark settles in as the burst fades: **StreakForge.** *Never lose the
chain by accident.*

## User flow worth showing
Entry → key action → result, pulled straight from the real product:
1. **Entry**: the Dashboard loads mid-streak — flame already lit, count-up
   plays on load (not a login screen; the login itself isn't visually
   interesting).
2. **Key action**: a missed day triggers the repair-window banner; the
   user's real GitHub heatmap is checked/lit in the same beat, tying "the
   data StreakForge tracks" to "the safety net that protects it."
3. **Result**: the day is saved (banner flips to "frozen" state) and the
   video closes on the stress-buster — the emotional release after the
   near-miss, which is also the single most human, least-generic-SaaS beat
   in the whole product.

## Tone
- Preset: **default**
- Creative direction: Duolingo-style streak warmth, executed in dark
  liquid-glass instead of Duolingo's bright cartoon style — playful
  stakes, not corporate reassurance.
- Interpretation: comfortable pacing (4-5 scenes, scenes allowed to
  breathe), crossfades over hard cuts, humor earned from the product's own
  copy (the stress-buster line) rather than invented jokes layered on top.

## Format: landscape — 1920x1080
## Duration: 19s target

## Visual identity (from the project)
- Background: `#0a0a0c` (near-black "ground"), with soft warm/cool radial
  glows (`rgba(255,91,31,0.16)` top-left, `rgba(64,156,255,0.10)` top-right)
  — never a flat black frame.
- Accent (flame): `#ff5b1f`, soft flame highlight `#ffb37a`, ember `#ffb800`
- Secondary accents: go/success `#34d399`, frost/info `#409cff`,
  danger `#ff453a`
- Text: `rgba(255,255,255,0.92)` on the dark ground
- Display + body font: **Manrope** (weights 500/700/800)
- Mono/data-label font: **JetBrains Mono** (used for small caps labels like
  "DAY STREAK", "LONGEST STREAK" in the real UI — reuse this for any
  video-original data labels so it reads as the same product)
- Strongest visual element: the frosted-glass panel itself
  (`backdrop-filter: blur(20px) saturate(140%)`, `rgba(255,255,255,0.06)`
  fill, hairline border) with the flame's glow bleeding through it — this
  translucency is the single most distinctive visual signature of the app
  and should appear in every scene, not just the flame scene.

## Share copy (draft)
StreakForge tracks your real GitHub + LeetCode streak and actually backs
up "don't worry, we've got you" — auto freezes, a real 24h repair window,
push reminders before it's ever at risk. 🔥

## Audio direction
- Role: warm bed, motion-matched accents
- Music: soft synth-pad bed with a simple rising melodic hook — warm, a
  little cozy, not corporate-motivational and not dramatic/epic
- Music treatment: starts under the ignite whoosh at low volume, swells
  slightly under the repair-window save (the video's emotional turn), soft
  fade-out under the wordmark
- Music cue guidance: to be detected at composition time (no bundled
  preset assumed); target strong cues at (a) the flame ignite ~0.3s in,
  (b) the repair-window flip to "frozen," and (c) the wordmark settle.
  Beat-grid window for the heatmap's sequential square-lighting: space
  reveals every other beat, not every beat, so they stay readable as
  motion rather than a flicker.
- Audio-reactive treatment: subtle — the flame's glow may breathe gently
  with music energy in the hook only; never audio-reactive text or bars
- SFX posture: moderate, motion-matched, tasteful — this product is warm,
  not chaotic
- Audio-coupled moments: whoosh/ignite on the flame catching; a soft tick
  per contribution square as the heatmap lights (sequential); a satisfying
  low chime on the repair-window save; a light playful "pop" per emoji in
  the stress-buster burst; a soft resonant chime under the final wordmark
- Restraint rule: no SFX on the count-up digits themselves (would read as
  a slot machine, not a real product) — let the number tick silently under
  the music bed

## Storyboard

### Scene 1 — Ignite — 2.5s
Black frame. A single ember point grows into the app's flame mark (the
real flame shape/gradient: `#ffb800` core to `#ff5b1f` edge), igniting
with a whoosh. As it settles, "Missed a day?" fades in small beside it in
Manrope, white/85%.
Sequential/interaction: none
Audio intent: a spark of tension under warmth — the whoosh should feel
warm, not alarming
Audio-coupled idea: whoosh synced exactly to the flame's ignite frame
Music: bed starts low under the whoosh
Transition mood: soft crossfade → Scene 2

### Scene 2 — The streak, live — 4s
Cut to the real Dashboard glass panel: the flame (idle/lit state) inside
its frosted circle, streak count-up animates from 0 to the current real
streak number, "DAY STREAK" mono label beneath it, longest-streak badge
visible. The liquid-glass panel's translucency and background glow are
fully visible — this is the product, not a mockup.
Sequential/interaction: yes — the streak number ticks up on load, ending
on a settled hold long enough to read
Audio intent: warm build, quiet satisfaction
Audio-coupled idea: none on the digits themselves (see restraint rule);
music bed continues its build under this scene
Music: warm bed, building
Transition mood: clean crossfade → Scene 3

### Scene 3 — The catch — 5s
The repair-window glass banner slides in: "Your streak is in a 24h repair
window. Log a real contribution, or spend one of your repair credits to
save it." with the snowflake icon and "Use Streak Repair" button. Beat of
held tension, then it flips: banner and copy swap to the "frozen, no
worries" state, streak number holds instead of resetting. This is the
product's actual safety net firing, shown as a state change.
Sequential/interaction: yes — banner enters, holds ~1.5s (enough to read
the full line), then flips state
Audio intent: brief tension, then relief — the emotional turn of the video
Audio-coupled idea: low satisfying chime exactly on the state flip
Music: brief dip in energy during the tension beat, swell back on the flip
Transition mood: soft crossfade → Scene 4

### Scene 4 — Real activity, not a mockup — 4.5s
Cut to the real GitHub Activity panel: contribution squares light up left
to right in small sequential groups (not all at once), "216 contributions
in 2026" caption settles at the end. Flame-orange intensity levels
(matching the real app's actual opacity scale), not a generic green
GitHub-style grid — this is StreakForge's own themed heatmap.
Sequential/interaction: yes — squares light in groups of ~4-6 per beat
Audio intent: light, rhythmic, data coming alive
Audio-coupled idea: soft tick per group of squares lighting, on the beat
grid (every other beat, not every beat, to stay readable)
Music: steady, rhythmic under this scene
Transition mood: clean crossfade → Scene 5

### Scene 5 — The release — 3s
Cut to the "Need a breather? Throw a few feelings at the screen. No
judgment." glass card. A tap on the emoji trigger sends a burst of Apple
emoji particles arcing outward. As the burst settles, the StreakForge
wordmark + flame mark settle centered, tagline "Never lose the chain by
accident" beneath it in Manrope.
Sequential/interaction: yes — simulated tap, then the particle burst
(several emoji arcing out, matching the real product's physics)
Audio intent: playful release after the earlier tension — this is the
video's punchline
Audio-coupled idea: light "pop" per emoji as it releases; soft resonant
chime under the final wordmark settle
Music: soft fade-out starting under the wordmark
Transition mood: soft crossfade → end

**Music mood for this video:** upbeat but warm — closer to "cozy morning
sync" than "epic launch trailer." The product's own tone (a serious safety
net wrapped in playful, humane copy) should carry through the music too.
**Audio summary:** A warm synth-pad bed opens under the ignite whoosh,
builds quietly through the streak reveal, dips for a breath at the
repair-window tension beat, swells on the save, stays rhythmic and light
through the heatmap, then releases into a playful pop-per-emoji burst
before fading softly under the closing wordmark and chime.
