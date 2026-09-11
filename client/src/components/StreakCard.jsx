import React, { useRef, useEffect, useState } from 'react';
import gsap from 'gsap';
import StreakFlame from './StreakFlame';
import FreezeTag from './FreezeTag';
import { prefersReducedMotion } from '../lib/motion';

const MILESTONES = [7, 30, 50, 100, 200, 365];

function flameState(todayStatus) {
  if (todayStatus === 'completed') return 'completed';
  if (todayStatus === 'freeze_applied') return 'frozen';
  if (todayStatus === 'repair_window') return 'atRisk';
  return 'idle';
}

export default function StreakCard({ streak, freezeCount, todayContributed, longestStreak, todayStatus }) {
  const numberRef = useRef(null);
  const prevStreakRef = useRef(streak);
  const [displayStreak, setDisplayStreak] = useState(streak);
  const [milestoneHit, setMilestoneHit] = useState(null);

  useEffect(() => {
    const from = prevStreakRef.current;
    prevStreakRef.current = streak;
    if (from === streak) return;

    const crossed = MILESTONES.find((m) => from < m && streak >= m);
    if (crossed) setMilestoneHit({ value: crossed, at: Date.now() });

    if (prefersReducedMotion()) {
      setDisplayStreak(streak);
      return;
    }

    const obj = { val: from };
    gsap.to(obj, {
      val: streak,
      duration: 0.7,
      ease: 'power2.out',
      onUpdate: () => setDisplayStreak(Math.round(obj.val)),
    });
  }, [streak]);

  const getMilestone = (s) => {
    for (const m of MILESTONES) {
      if (s < m) return { next: m };
    }
    return null;
  };

  const milestone = getMilestone(displayStreak);
  const progress = milestone ? (displayStreak / milestone.next) * 100 : 100;

  return (
    <div className="glass rounded-3xl p-6">
      <div className="relative flex flex-wrap items-center gap-6">
        <StreakFlame
          streak={displayStreak}
          size={130}
          state={flameState(todayStatus)}
          milestone={milestoneHit?.at}
        />

        <div className="min-w-[200px] flex-1">
          <h1 className="mb-2 text-lg font-bold text-white">
            {todayContributed ? "You're on fire!" : streak > 0 ? 'Keep it going' : 'Start your streak'}
          </h1>

          <div className="mb-3 flex items-baseline gap-2">
            <span ref={numberRef} className="text-6xl font-extrabold leading-none text-flame">{displayStreak}</span>
            <span className="font-mono text-xs font-bold uppercase tracking-wide text-white/50">day streak</span>
          </div>

          {milestone && (
            <div className="mb-4">
              <div className="mb-1.5 flex justify-between font-mono text-xs font-bold text-white/60">
                <span>{displayStreak} / {milestone.next} days</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-flame transition-[width] duration-500 ease-out"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-5">
            <div className="flex flex-col">
              <span className="text-xl font-extrabold text-white">{longestStreak}</span>
              <span className="font-mono text-[0.65rem] uppercase tracking-wide text-white/45">Longest streak</span>
            </div>
            <FreezeTag count={freezeCount} />
          </div>
        </div>
      </div>
    </div>
  );
}
