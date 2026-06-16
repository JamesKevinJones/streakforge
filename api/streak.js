// Vercel serverless function: GET /api/streak, POST /api/streak/refresh
const { initDb } = require('./db');

async function fetchContributions(username, token) {
  if (!username || !token) return [];

  const query = `
    query($username: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $username) {
        contributionsCollection(from: $from, to: $to) {
          contributionCalendar {
            weeks {
              contributionDays {
                date
                contributionCount
              }
            }
          }
        }
      }
    }
  `;

  const now = new Date();
  const to = now.toISOString();
  const from = new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000).toISOString();

  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables: { username, from, to } }),
  });

  if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);

  const data = await res.json();
  if (data.errors) throw new Error(`GitHub GraphQL error: ${data.errors.map(e => e.message).join(', ')}`);

  const days = data.data?.user?.contributionsCollection?.contributionCalendar?.weeks
    ?.flatMap(w => w.contributionDays) || [];
  return days.map(d => ({ date: d.date, count: d.contributionCount }));
}

async function fetchSubmissions(username) {
  if (!username) return [];

  const query = `
    query($username: String!) {
      matchedUser(username: $username) {
        submissionCalendar
      }
    }
  `;

  const res = await fetch('https://leetcode.com/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { username } }),
  });

  if (!res.ok) throw new Error(`LeetCode API error: ${res.status} ${res.statusText}`);

  const data = await res.json();
  if (data.errors) throw new Error(`LeetCode GraphQL error: ${data.errors.map(e => e.message).join(', ')}`);

  const calendarStr = data.data?.matchedUser?.submissionCalendar;
  if (!calendarStr) return [];

  const calendar = JSON.parse(calendarStr);
  return Object.entries(calendar).map(([epochSec, count]) => ({
    date: new Date(parseInt(epochSec) * 1000).toISOString().split('T')[0],
    count,
  }));
}

function recalculateStreak(db) {
  const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
  const records = db.prepare('SELECT * FROM daily_records ORDER BY date ASC').all();
  const today = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  let currentStreak = 0;
  let longestStreak = 0;
  let freezeCount = settings.freeze_count;
  let consecutive = 0;
  let tempFreezeCount = freezeCount;

  const dateMap = {};
  for (const r of records) dateMap[r.date] = r;

  const cursor = new Date(today + 'T00:00:00');
  while (cursor.toISOString().split('T')[0] >= startDate) cursor.setDate(cursor.getDate() - 1);

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

  const milestones = [7, 30, 50, 100, 200, 365];
  let newFreezeCount = tempFreezeCount;
  for (const m of milestones) {
    if (currentStreak >= m && currentStreak - consecutive <= m) {
      newFreezeCount = Math.max(newFreezeCount, Math.floor(currentStreak / m));
    }
  }

  db.prepare('UPDATE settings SET freeze_count = ? WHERE id = 1').run(newFreezeCount);
  return { currentStreak, longestStreak, freezeCount: newFreezeCount };
}

function getStreakData(db) {
  const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
  const history = db.prepare(
    'SELECT date, github_contributed, leetcode_contributed, freeze_used, streak FROM daily_records ORDER BY date DESC LIMIT 70'
  ).all();
  const today = new Date().toISOString().split('T')[0];
  const todayRecord = db.prepare('SELECT * FROM daily_records WHERE date = ?').get(today);
  const streakInfo = recalculateStreak(db);

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

function recordActivity(db, githubDateMap, leetcodeDateMap) {
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
  return recalculateStreak(db);
}

export default async function handler(req, res) {
  const db = await initDb();

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = req.url || '';
  const isRefresh = url.includes('/refresh');

  try {
    if (req.method === 'GET' && !isRefresh) {
      const data = getStreakData(db);
      return res.status(200).json(data);
    }

    if (req.method === 'POST' && isRefresh) {
      const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
      if (!settings.github_username && !settings.leetcode_username) {
        return res.status(400).json({ error: 'Configure GitHub and LeetCode usernames in settings first' });
      }

      const [githubData, leetcodeData] = await Promise.all([
        fetchContributions(settings.github_username, settings.github_token),
        fetchSubmissions(settings.leetcode_username),
      ]);

      const githubDateMap = {};
      for (const d of githubData) {
        if (d.count > 0) githubDateMap[d.date] = (githubDateMap[d.date] || 0) + d.count;
      }

      const leetcodeDateMap = {};
      for (const d of leetcodeData) {
        if (d.count > 0) leetcodeDateMap[d.date] = (leetcodeDateMap[d.date] || 0) + d.count;
      }

      const result = recordActivity(db, githubDateMap, leetcodeDateMap);
      const today = new Date().toISOString().split('T')[0];
      const todayRecord = db.prepare('SELECT * FROM daily_records WHERE date = ?').get(today);

      return res.status(200).json({
        ...result,
        todayContributed: (todayRecord?.github_contributed || 0) > 0 || (todayRecord?.leetcode_contributed || 0) > 0,
        todayGithub: todayRecord?.github_contributed || 0,
        todayLeetcode: todayRecord?.leetcode_contributed || 0,
        message: 'Data refreshed successfully',
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Streak API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
