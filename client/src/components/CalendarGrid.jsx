import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { prefersReducedMotion } from '../lib/motion';

const INTENSITY_BG = [
  'bg-white/5',
  'bg-flame/25',
  'bg-flame/45',
  'bg-flame/70',
  'bg-flame',
];

export default function CalendarGrid({ history }) {
  const gridRef = useRef(null);
  const today = new Date();
  const days = [];

  for (let i = 69; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d);
  }

  const dateMap = {};
  for (const h of history) {
    dateMap[h.date] = h;
  }

  const getIntensity = (count) => {
    if (count <= 0) return 0;
    if (count <= 2) return 1;
    if (count <= 5) return 2;
    if (count <= 10) return 3;
    return 4;
  };

  const isToday = (date) => date.toISOString().split('T')[0] === today.toISOString().split('T')[0];
  const isSunday = (date) => date.getDay() === 0;

  const weeks = [];
  let week = [];
  for (const d of days) {
    week.push(d);
    if (isSunday(d)) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) weeks.push(week);

  useEffect(() => {
    if (!gridRef.current || prefersReducedMotion()) return;
    const cells = gridRef.current.querySelectorAll('.calendar-cell');
    gsap.fromTo(
      cells,
      { opacity: 0, y: 6 },
      {
        opacity: 1,
        y: 0,
        duration: 0.3,
        ease: 'power2.out',
        // "Stop at 12" per stagger-choreography: past 12 items, everything
        // past that point reveals together instead of trailing forever.
        stagger: (index) => Math.min(index, 12) * 0.03,
      }
    );
  }, [history.length]);

  return (
    <div className="glass overflow-x-auto rounded-3xl p-6">
      <h2 className="mb-4 text-lg font-bold text-white">Activity</h2>

      <div className="flex min-w-[480px] gap-2">
        <div className="flex flex-col gap-[3px] pt-0.5 font-mono text-[0.65rem] text-white/40">
          {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((label, i) => (
            <span key={i} className="h-[14px] leading-[14px]">{label}</span>
          ))}
        </div>

        <div className="flex gap-[3px]" ref={gridRef}>
          {weeks.map((wk, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {wk.map((date, di) => {
                const dateStr = date.toISOString().split('T')[0];
                const record = dateMap[dateStr];
                const count = record ? (record.github_contributed || 0) + (record.leetcode_contributed || 0) : 0;
                const intensity = getIntensity(count);
                const frozen = record?.freeze_used > 0;
                const status = record?.status;

                let stateClass = INTENSITY_BG[intensity];
                if (frozen) stateClass = 'bg-frost/60';
                if (status === 'repair_window') stateClass = 'bg-ember/70';
                if (status === 'broken') stateClass = 'bg-danger/40';

                return (
                  <div
                    key={di}
                    className={`calendar-cell h-[14px] w-[14px] rounded-[3px] border border-white/10 ${stateClass} ${
                      isToday(date) ? 'ring-2 ring-frost' : ''
                    }`}
                    title={`${dateStr}: ${count} contributions${frozen ? ' (freeze used)' : ''}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-1.5 font-mono text-xs text-white/50">
        <span>Less</span>
        {INTENSITY_BG.map((bg, i) => (
          <div key={i} className={`h-3 w-3 rounded-sm border border-white/10 ${bg}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
