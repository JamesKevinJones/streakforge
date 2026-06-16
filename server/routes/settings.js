const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  try {
    const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
    const { github_token, ...safe } = settings;
    res.json({ ...safe, github_token: github_token ? '••••••••' : '' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/', (req, res) => {
  try {
    const { github_username, leetcode_username, github_token, freeze_count } = req.body;

    if (github_username !== undefined && typeof github_username !== 'string') {
      return res.status(400).json({ error: 'github_username must be a string' });
    }
    if (leetcode_username !== undefined && typeof leetcode_username !== 'string') {
      return res.status(400).json({ error: 'leetcode_username must be a string' });
    }
    if (freeze_count !== undefined && (typeof freeze_count !== 'number' || freeze_count < 0)) {
      return res.status(400).json({ error: 'freeze_count must be a non-negative number' });
    }

    const existing = db.prepare('SELECT * FROM settings WHERE id = 1').get();
    const token = github_token && !github_token.startsWith('••') ? github_token : existing.github_token;

    db.prepare(`
      UPDATE settings SET
        github_username = COALESCE(?, github_username),
        leetcode_username = COALESCE(?, leetcode_username),
        github_token = ?,
        freeze_count = COALESCE(?, freeze_count)
      WHERE id = 1
    `).run(
      github_username ?? null,
      leetcode_username ?? null,
      token,
      freeze_count ?? null
    );

    const updated = db.prepare('SELECT * FROM settings WHERE id = 1').get();
    const { github_token: _, ...safe } = updated;
    res.json({ ...safe, github_token: '••••••••' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
