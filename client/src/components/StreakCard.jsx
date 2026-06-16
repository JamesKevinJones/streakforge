import React from 'react';
import StreakFlame from './StreakFlame';
import FreezeTag from './FreezeTag';

export default function StreakCard({ streak, freezeCount, todayContributed, longestStreak }) {
  const getMilestone = (s) => {
    const milestones = [7, 30, 50, 100, 200, 365];
    for (const m of milestones) {
      if (s < m) return { next: m, prev: m - (m <= 7 ? 0 : milestones[milestones.indexOf(m) - 1] || 0) };
    }
    return null;
  };

  const milestone = getMilestone(streak);
  const progress = milestone ? (streak / milestone.next) * 100 : 100;

  return (
    <div className="streak-card">
      <div className="streak-card-main">
        <StreakFlame streak={streak} size={130} />

        <div className="streak-info">
          <h1 className="streak-title">
            {todayContributed ? "You're on fire! 🔥" : streak > 0 ? 'Keep it going!' : 'Start your streak!'}
          </h1>

          <div className="streak-count-container">
            <span className="streak-number">{streak}</span>
            <span className="streak-label">day streak</span>
          </div>

          {milestone && (
            <div className="streak-progress">
              <div className="streak-progress-label">
                <span>{streak} / {milestone.next} days</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="streak-progress-bar">
                <div
                  className="streak-progress-fill"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            </div>
          )}

          <div className="streak-stats">
            <div className="stat">
              <span className="stat-value">{longestStreak}</span>
              <span className="stat-label">Longest streak</span>
            </div>
            <FreezeTag count={freezeCount} />
          </div>
        </div>
      </div>
    </div>
  );
}
