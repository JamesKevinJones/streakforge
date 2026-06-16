// Vercel serverless function: GET /api/settings, PUT /api/settings
const { initDb } = require('./db');

export default async function handler(req, res) {
  const db = await initDb();

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
      const { github_token, ...safe } = settings;
      return res.status(200).json({ ...safe, github_token: github_token ? '••••••••' : '' });
    }

    if (req.method === 'PUT') {
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
      return res.status(200).json({ ...safe, github_token: '••••••••' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Settings API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
