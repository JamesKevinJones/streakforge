import React from 'react';

export default function CalendarGrid({ history }) {
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

  const isToday = (date) => {
    const d = date.toISOString().split('T')[0];
    return d === today.toISOString().split('T')[0];
  };

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

  const monthLabels = [];
  let lastMonth = -1;
  for (const d of days) {
    if (d.getMonth() !== lastMonth) {
      monthLabels.push({ date: d, month: d.toLocaleString('default', { month: 'short' }) });
      lastMonth = d.getMonth();
    }
  }

  return (
    <div className="calendar-grid">
      <h2 className="calendar-title">Activity</h2>

      <div className="calendar-months">
        {monthLabels.map((m, i) => (
          <span key={i} className="calendar-month-label" style={{ gridColumn: Math.floor((days.indexOf(m.date) + 7) / 7) + 1 }}>
            {m.month}
          </span>
        ))}
      </div>

      <div className="calendar-body">
        <div className="calendar-day-labels">
          {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((label, i) => (
            <span key={i} className="calendar-day-label">{label}</span>
          ))}
        </div>

        <div className="calendar-weeks">
          {weeks.map((week, wi) => (
            <div key={wi} className="calendar-week">
              {week.map((date, di) => {
                const dateStr = date.toISOString().split('T')[0];
                const record = dateMap[dateStr];
                const count = record ? (record.github_contributed || 0) + (record.leetcode_contributed || 0) : 0;
                const intensity = getIntensity(count);
                const frozen = record?.freeze_used > 0;
                const todayFlag = isToday(date);

                return (
                  <div
                    key={di}
                    className={`calendar-cell intensity-${intensity} ${todayFlag ? 'today' : ''} ${frozen ? 'frozen' : ''}`}
                    title={`${dateStr}: ${count} contributions${frozen ? ' (freeze used)' : ''}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="calendar-legend">
        <span>Less</span>
        <div className="legend-cell intensity-0" />
        <div className="legend-cell intensity-1" />
        <div className="legend-cell intensity-2" />
        <div className="legend-cell intensity-3" />
        <div className="legend-cell intensity-4" />
        <span>More</span>
      </div>
    </div>
  );
}
