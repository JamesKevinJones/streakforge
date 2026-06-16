const db = require('../db');

function recalculateStreak() {
  const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();

  const records = db.prepare(
    'SELECT * FROM daily_records ORDER BY date ASC'
  ).all();

  const today = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0];

  let currentStreak = 0;
  let longestStreak = 0;
  let freezeCount = settings.freeze_count;
  let consecutive = 0;
  let tempFreezeCount = freezeCount;

  const dateMap = {};
  for (const r of records) {
    dateMap[r.date] = r;
  }

  const cursor = new Date(today + 'T00:00:00');
  while (cursor.toISOString().split('T')[0] >= startDate) {
    cursor.setDate(cursor.getDate() - 1);
  }

  const checkDate = new Date(cursor);
  const dates = [];
  while (checkDate.toISOString().split('T')[0] <= today) {
    dates.push(checkDate.toISOString().split('T')[0]);
    checkDate.setDate(checkDate.getDate() + 1);
  }

  for (let i = dates.length - 1; i >= 0; i--) {
    const date = dates[i];
    const record = dateMap[date];
    const githubCount = record?.github_contributed || 0;
    const leetcodeCount = record?.leetcode_contributed || 0;
    const contributed = githubCount > 0 || leetcodeCount > 0;

    if (contributed) {
      consecutive++;
      currentStreak = consecutive;
      if (currentStreak > longestStreak) longestStreak = currentStreak;
    } else if (date !== today) {
      if (tempFreezeCount > 0) {
        tempFreezeCount--;
        consecutive++;
        currentStreak = consecutive;

        db.prepare(`
          INSERT INTO daily_records (date, github_contributed, leetcode_contributed, streak, freeze_used)
          VALUES (?, 0, 0, ?, 1)
          ON CONFLICT(date) DO UPDATE SET streak = ?, freeze_used = 1
        `).run(date, consecutive, consecutive);

        dateMap[date] = { date, github_contributed: 0, leetcode_contributed: 0, streak: consecutive, freeze_used: 1 };
      } else {
        break;
      }
    }
  }

  if (currentStreak === 0) {
    const recentRecords = db.prepare(
      'SELECT streak FROM daily_records ORDER BY date DESC LIMIT 1'
    ).get();
    if (recentRecords) {
      currentStreak = 0;
    }
  }

  const milestones = [7, 30, 50, 100, 200, 365];
  let newFreezeCount = tempFreezeCount;
  for (const m of milestones) {
    if (currentStreak >= m && currentStreak - consecutive <= m) {
      newFreezeCount = Math.max(newFreezeCount, Math.floor(currentStreak / m));
    }
  }

  db.prepare('UPDATE settings SET freeze_count = ? WHERE id = 1').run(newFreezeCount);

  return {
    currentStreak,
    longestStreak,
    freezeCount: newFreezeCount,
  };
}

function getStreakData() {
  const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();

  const history = db.prepare(
    'SELECT date, github_contributed, leetcode_contributed, freeze_used, streak FROM daily_records ORDER BY date DESC LIMIT 70'
  ).all();

  const today = new Date().toISOString().split('T')[0];
  const todayRecord = db.prepare('SELECT * FROM daily_records WHERE date = ?').get(today);

  const streakInfo = recalculateStreak();

  return {
    currentStreak: streakInfo.currentStreak,
    longestStreak: streakInfo.longestStreak,
    freezeCount: streakInfo.freezeCount,
    todayContributed: (todayRecord?.github_contributed || 0) > 0 || (todayRecord?.leetcode_contributed || 0) > 0,
    todayGithub: todayRecord?.github_contributed || 0,
    todayLeetcode: todayRecord?.leetcode_contributed || 0,
    hasSettings: !!(settings.github_username && settings.leetcode_username),
    history,
  };
}

function recordActivity(githubDateMap, leetcodeDateMap) {
  const allDates = new Set([...Object.keys(githubDateMap), ...Object.keys(leetcodeDateMap)]);

  for (const date of allDates) {
    const githubCount = githubDateMap[date] || 0;
    const leetcodeCount = leetcodeDateMap[date] || 0;

    db.prepare(`
      INSERT INTO daily_records (date, github_contributed, leetcode_contributed)
      VALUES (?, ?, ?)
      ON CONFLICT(date) DO UPDATE SET
        github_contributed = MAX(github_contributed, ?),
        leetcode_contributed = MAX(leetcode_contributed, ?)
    `).run(date, githubCount, leetcodeCount, githubCount, leetcodeCount);
  }

  return recalculateStreak();
}

module.exports = { getStreakData, recordActivity, recalculateStreak };
