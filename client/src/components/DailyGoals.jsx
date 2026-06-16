import React from 'react';

function GoalItem({ label, done, icon }) {
  return (
    <div className={`goal-item ${done ? 'goal-done' : ''}`}>
      <div className={`goal-check ${done ? 'goal-checked' : ''}`}>
        {done ? '✓' : icon}
      </div>
      <span className="goal-label">{label}</span>
    </div>
  );
}

export default function DailyGoals({ githubDone, leetcodeDone }) {
  const total = 2;
  const completed = [githubDone, leetcodeDone].filter(Boolean).length;
  const allDone = completed === total;

  return (
    <div className="daily-goals">
      <div className="goals-header">
        <h2 className="goals-title">Today's Progress</h2>
        <span className="goals-count">{completed}/{total}</span>
      </div>

      {allDone && (
        <div className="goals-celebration">
          All goals complete! Great job today! 🎉
        </div>
      )}

      <div className="goals-list">
        <GoalItem
          label="Contribute on GitHub"
          done={githubDone}
          icon="🐙"
        />
        <GoalItem
          label="Solve a LeetCode problem"
          done={leetcodeDone}
          icon="⚡"
        />
      </div>
    </div>
  );
}
