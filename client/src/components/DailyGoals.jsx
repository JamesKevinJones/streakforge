import React from 'react';
import { GithubIcon, CodeIcon, CheckIcon } from './icons';

function GoalItem({ label, done, icon: Icon }) {
  return (
    <div
      className={`glass flex items-center gap-3 rounded-2xl p-4 transition-colors ${
        done ? 'border-go/30 bg-go/10' : ''
      }`}
    >
      <div
        className={`flex size-9 shrink-0 items-center justify-center rounded-full border border-white/15 ${
          done ? 'bg-go text-white' : 'bg-white/5 text-white/70'
        }`}
      >
        {done ? <CheckIcon width={18} height={18} /> : <Icon width={18} height={18} />}
      </div>
      <span className="text-sm font-semibold text-white/90">{label}</span>
    </div>
  );
}

export default function DailyGoals({ githubDone, leetcodeDone }) {
  const total = 2;
  const completed = [githubDone, leetcodeDone].filter(Boolean).length;
  const allDone = completed === total;

  return (
    <div className="glass rounded-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Today's Progress</h2>
        <span className="glass rounded-full px-3 py-1 font-mono text-sm font-bold text-white/80">{completed}/{total}</span>
      </div>

      {allDone && (
        <div className="mb-4 rounded-2xl border border-go/30 bg-go/10 p-3 text-sm font-semibold text-emerald-200">
          Both goals done. Streak's covered today.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <GoalItem label="Contribute on GitHub" done={githubDone} icon={GithubIcon} />
        <GoalItem label="Solve a LeetCode problem" done={leetcodeDone} icon={CodeIcon} />
      </div>
    </div>
  );
}
