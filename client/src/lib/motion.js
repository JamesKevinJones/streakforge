// Shared GSAP eases/durations, used everywhere instead of ad hoc values.
// GSAP is scoped to four sequences only (see docs/DECISIONS.md): the flame
// state-machine timeline, the streak-number count-up, the calendar reveal,
// and the milestone celebration burst. Button/card press feedback is plain
// CSS :active — see app.css — to avoid touch input lag and JS overhead.
export const EASE_OUT = 'power2.out';
export const EASE_POP = 'back.out(1.7)';
export const EASE_INOUT = 'power1.inOut';

export const DURATION = {
  countUp: 0.7,
  calendarStagger: 0.05, // 50ms/cell, matches the skill's stagger-choreography sweet spot
  calendarStaggerCap: 12,
  flameFlicker: 1.4,
  flameFlare: 0.5,
  celebrationBurst: 0.9,
};

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
