// Storage keys
const KEYS = {
  SETTINGS: 'sf_settings',
  RECORDS: 'sf_records',
};

// --- Settings ---
export function getSettings() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.SETTINGS)) || {
      github_username: '',
      leetcode_username: '',
      github_token: '',
      freeze_count: 2,
    };
  } catch {
    return { github_username: '', leetcode_username: '', github_token: '', freeze_count: 2 };
  }
}

export function saveSettings(settings) {
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
}

// --- Daily Records ---
export function getRecords() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.RECORDS)) || {};
  } catch {
    return {};
  }
}

export function saveRecords(records) {
  localStorage.setItem(KEYS.RECORDS, JSON.stringify(records));
}

export function mergeActivity(githubDateMap, leetcodeDateMap) {
  const records = getRecords();
  const allDates = new Set([...Object.keys(githubDateMap), ...Object.keys(leetcodeDateMap)]);
  for (const date of allDates) {
    const gh = githubDateMap[date] || 0;
    const lc = leetcodeDateMap[date] || 0;
    const existing = records[date] || { github_contributed: 0, leetcode_contributed: 0, freeze_used: 0 };
    records[date] = {
      ...existing,
      github_contributed: Math.max(existing.github_contributed, gh),
      leetcode_contributed: Math.max(existing.leetcode_contributed, lc),
    };
  }
  saveRecords(records);
  return records;
}

// --- Streak Calculation ---
export function computeStreakData() {
  const settings = getSettings();
  const records = getRecords();

  const today = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Build date array from startDate to today
  const dates = [];
  const cursor = new Date(startDate + 'T00:00:00');
  while (cursor.toISOString().split('T')[0] <= today) {
    dates.push(cursor.toISOString().split('T')[0]);
    cursor.setDate(cursor.getDate() + 1);
  }

  let currentStreak = 0;
  let longestStreak = 0;
  let consecutive = 0;
  let tempFreezeCount = settings.freeze_count;
  const updatedRecords = { ...records };

  for (let i = dates.length - 1; i >= 0; i--) {
    const date = dates[i];
    const record = records[date];
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
        updatedRecords[date] = {
          ...(updatedRecords[date] || { github_contributed: 0, leetcode_contributed: 0 }),
          freeze_used: 1,
        };
      } else {
        break;
      }
    }
  }

  // Award freeze credits at milestones
  const milestones = [7, 30, 50, 100, 200, 365];
  let newFreezeCount = tempFreezeCount;
  for (const m of milestones) {
    if (currentStreak >= m && currentStreak - consecutive <= m) {
      newFreezeCount = Math.max(newFreezeCount, Math.floor(currentStreak / m));
    }
  }

  // Update freeze_count in settings if it changed
  if (newFreezeCount !== settings.freeze_count) {
    saveSettings({ ...settings, freeze_count: newFreezeCount });
  }

  // Save updated records (with freeze flags)
  saveRecords(updatedRecords);

  // Build history (last 70 days)
  const historyDates = dates.slice(-70).reverse();
  const history = historyDates.map(date => ({
    date,
    github_contributed: updatedRecords[date]?.github_contributed || 0,
    leetcode_contributed: updatedRecords[date]?.leetcode_contributed || 0,
    freeze_used: updatedRecords[date]?.freeze_used || 0,
    streak: 0, // not critical for display
  }));

  const todayRecord = updatedRecords[today];

  return {
    currentStreak,
    longestStreak,
    freezeCount: newFreezeCount,
    todayContributed: (todayRecord?.github_contributed || 0) > 0 || (todayRecord?.leetcode_contributed || 0) > 0,
    todayGithub: todayRecord?.github_contributed || 0,
    todayLeetcode: todayRecord?.leetcode_contributed || 0,
    hasSettings: !!(settings.github_username && settings.leetcode_username),
    history,
  };
}

// --- GitHub API ---
export async function fetchGitHubContributions(username, token) {
  if (!username || !token) return {};

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
  if (data.errors) throw new Error(`GitHub error: ${data.errors.map(e => e.message).join(', ')}`);

  const days = data.data?.user?.contributionsCollection?.contributionCalendar?.weeks
    ?.flatMap(w => w.contributionDays) || [];

  const map = {};
  for (const d of days) {
    if (d.contributionCount > 0) map[d.date] = (map[d.date] || 0) + d.contributionCount;
  }
  return map;
}

// --- LeetCode API (via proxy to avoid CORS) ---
export async function fetchLeetCodeContributions(username) {
  if (!username) return {};

  // LeetCode blocks direct browser requests - use a CORS proxy
  const query = `query($username: String!) {
    matchedUser(username: $username) {
      submissionCalendar
    }
  }`;

  // Try direct first, fall back to proxy
  let data;
  try {
    const res = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Referer': 'https://leetcode.com' },
      body: JSON.stringify({ query, variables: { username } }),
    });
    if (!res.ok) throw new Error('direct failed');
    data = await res.json();
  } catch {
    // Use CORS-anywhere proxy
    const res = await fetch('https://corsproxy.io/?https://leetcode.com/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { username } }),
    });
    if (!res.ok) throw new Error(`LeetCode API error: ${res.status}`);
    data = await res.json();
  }

  if (data.errors) throw new Error(`LeetCode error: ${data.errors.map(e => e.message).join(', ')}`);

  const calendarStr = data.data?.matchedUser?.submissionCalendar;
  if (!calendarStr) return {};

  const calendar = JSON.parse(calendarStr);
  const map = {};
  for (const [epochSec, count] of Object.entries(calendar)) {
    if (count > 0) {
      const date = new Date(parseInt(epochSec) * 1000).toISOString().split('T')[0];
      map[date] = (map[date] || 0) + count;
    }
  }
  return map;
}
