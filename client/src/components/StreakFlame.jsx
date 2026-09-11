import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { prefersReducedMotion } from '../lib/motion';
import MilestoneBurst from './MilestoneBurst';

const PALETTE = {
  idle: { inner: '#ff9600', outer: '#ffc800', core: '#ffee58', glow: '#ff9600' },
  completed: { inner: '#ff4d00', outer: '#ffb800', core: '#fff3c4', glow: '#ff4d00' },
  frozen: { inner: '#2e6ff2', outer: '#7ea6ff', core: '#e4edff', glow: '#2e6ff2' },
  atRisk: { inner: '#a8a29e', outer: '#c9c3bd', core: '#e7e3de', glow: '#a8a29e' },
};

/**
 * A GSAP timeline drives the flame's SVG paths directly (replacing the old
 * raw SVG <animate> loop) so its state can react to real data: idle
 * flicker, a one-shot flare when today's goal is complete, a slowed
 * blue-tinted animation while a freeze is covering a missed day, or a
 * dimmed/guttering look while the streak is at risk (open repair window).
 */
export default function StreakFlame({ streak, size = 120, state = 'idle', milestone = null }) {
  const innerRef = useRef(null);
  const outerRef = useRef(null);
  const auraRef = useRef(null);
  const timelineRef = useRef(null);
  const palette = PALETTE[state] || PALETTE.idle;

  // A soft, slowly-drifting glow behind the flame — our own hand-built take
  // on a "fluid orb" idea (color + gentle organic drift), reusing the
  // existing GSAP/CSS stack rather than pulling in a WebGL component and a
  // Tailwind dependency for one decorative effect. Themed to the flame's
  // own palette instead of a generic blue, and confined to the one surface
  // in this design that's already deliberately soft. See docs/DECISIONS.md.
  useEffect(() => {
    if (!auraRef.current || prefersReducedMotion()) return undefined;

    const tl = gsap.timeline({ repeat: -1, yoyo: true, defaults: { ease: 'sine.inOut' } });
    tl.to(auraRef.current, { x: 6, y: -4, scale: 1.08, duration: 3.2 }, 0);
    tl.to(auraRef.current, { x: -5, y: 5, scale: 0.96, duration: 3.6 }, '>-0.4');
    tl.to(auraRef.current, { x: 0, y: 0, scale: 1, duration: 3 }, '>-0.5');

    return () => tl.kill();
  }, [state]);

  useEffect(() => {
    if (prefersReducedMotion()) return undefined;

    const tl = gsap.timeline({ repeat: -1, yoyo: true });
    const speed = state === 'frozen' ? 2.4 : state === 'atRisk' ? 2.2 : 1.4;

    tl.to(innerRef.current, {
      attr: {
        d: 'M50 12 C43 28, 28 38, 33 53 C36 63, 44 68, 50 73 C56 68, 64 63, 67 53 C72 38, 57 28, 50 12Z',
      },
      duration: speed,
      ease: 'sine.inOut',
    }, 0);
    tl.to(outerRef.current, {
      attr: {
        d: 'M50 22 C45 32, 36 40, 40 50 C42 56, 47 60, 50 63 C53 60, 58 56, 60 50 C64 40, 55 32, 50 22Z',
      },
      duration: speed * 0.85,
      ease: 'sine.inOut',
    }, 0);

    timelineRef.current = tl;
    return () => tl.kill();
  }, [state]);

  useEffect(() => {
    if (state !== 'completed' || prefersReducedMotion()) return;
    gsap.fromTo(
      [innerRef.current, outerRef.current],
      { scale: 1, transformOrigin: '50% 50%' },
      { scale: 1.15, duration: 0.25, ease: 'back.out(1.7)', yoyo: true, repeat: 1 }
    );
  }, [state, streak]);

  return (
    <div className="streak-flame" style={{ width: size, height: size }}>
      <div
        ref={auraRef}
        className="flame-aura"
        style={{ background: `radial-gradient(circle, ${palette.glow} 0%, transparent 70%)` }}
      />
      <svg viewBox="0 0 100 100" width={size} height={size} className="flame-svg">
        <defs>
          <radialGradient id="flameGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={palette.glow} stopOpacity={0.3} />
            <stop offset="100%" stopColor={palette.glow} stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="45" fill="url(#flameGlow)" />
        <path
          ref={innerRef}
          d="M50 15 C45 30, 30 40, 35 55 C38 65, 45 70, 50 75 C55 70, 62 65, 65 55 C70 40, 55 30, 50 15Z"
          fill={palette.inner}
        />
        <path
          ref={outerRef}
          d="M50 25 C47 35, 38 42, 42 52 C44 58, 48 62, 50 65 C52 62, 56 58, 58 52 C62 42, 53 35, 50 25Z"
          fill={palette.outer}
        />
        <path
          d="M50 35 C48 40, 44 44, 46 50 C47 53, 49 55, 50 57 C51 55, 53 53, 54 50 C56 44, 52 40, 50 35Z"
          fill={palette.core}
        />
      </svg>
      <div className="flame-count" style={{ fontSize: size * 0.28 }}>{streak}</div>
      <MilestoneBurst milestone={milestone} />
    </div>
  );
}
