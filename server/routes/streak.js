const express = require('express');
const router = express.Router();
const db = require('../db');
const { fetchContributions } = require('../services/github');
const { fetchSubmissions } = require('../services/leetcode');
const { getStreakData, recordActivity } = require('../services/streak');

router.get('/', (req, res) => {
  try {
    const data = getStreakData();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/refresh', async (req, res) => {
  try {
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

    const result = recordActivity(githubDateMap, leetcodeDateMap);
    const today = new Date().toISOString().split('T')[0];
    const todayRecord = db.prepare('SELECT * FROM daily_records WHERE date = ?').get(today);

    res.json({
      ...result,
      todayContributed: (todayRecord?.github_contributed || 0) > 0 || (todayRecord?.leetcode_contributed || 0) > 0,
      todayGithub: todayRecord?.github_contributed || 0,
      todayLeetcode: todayRecord?.leetcode_contributed || 0,
      message: 'Data refreshed successfully',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
