// Vercel serverless function: /api/db.js (shared database module)
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

// On Vercel, /tmp is the only writable directory
const dbPath = process.env.DB_PATH || path.join('/tmp', 'streakforge.db');
let db = null;
let ready = null;

function save() {
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

function toArray(args) {
  if (args.length === 0) return null;
  if (args.length === 1 && Array.isArray(args[0])) return args[0];
  return Array.from(args);
}

const api = {
  prepare(sql) {
    return {
      get: (...params) => {
        try {
          const stmt = db.prepare(sql);
          const arr = toArray(params);
          if (arr) stmt.bind(arr);
          if (stmt.step()) {
            const cols = stmt.getColumnNames();
            const vals = stmt.get();
            const obj = {};
            cols.forEach((c, i) => { obj[c.toLowerCase()] = vals[i]; });
            stmt.free();
            return obj;
          }
          stmt.free();
          return undefined;
        } catch (e) { return undefined; }
      },
      all: (...params) => {
        const results = [];
        try {
          const stmt = db.prepare(sql);
          const arr = toArray(params);
          if (arr) stmt.bind(arr);
          while (stmt.step()) {
            const cols = stmt.getColumnNames();
            const vals = stmt.get();
            const obj = {};
            cols.forEach((c, i) => { obj[c.toLowerCase()] = vals[i]; });
            results.push(obj);
          }
          stmt.free();
        } catch (e) {}
        return results;
      },
      run: (...params) => {
        try {
          const stmt = db.prepare(sql);
          const arr = toArray(params);
          if (arr) stmt.bind(arr);
          stmt.step();
          stmt.free();
          save();
        } catch (e) { save(); }
      },
    };
  },
  exec(sql) {
    db.run(sql);
    save();
  },
  get(sql, ...params) {
    return api.prepare(sql).get(...params);
  },
  all(sql, ...params) {
    return api.prepare(sql).all(...params);
  },
  run(sql, ...params) {
    api.prepare(sql).run(...params);
  },
};

async function initDb() {
  if (db) return api;
  try {
    if (fs.existsSync(dbPath)) {
      const buffer = fs.readFileSync(dbPath);
      const SQL = await initSqlJs();
      db = new SQL.Database(buffer);
    } else {
      const SQL = await initSqlJs();
      db = new SQL.Database();
    }
  } catch (e) {
    const SQL = await initSqlJs();
    db = new SQL.Database();
  }

  api.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY,
      github_username TEXT NOT NULL DEFAULT '',
      leetcode_username TEXT NOT NULL DEFAULT '',
      github_token TEXT NOT NULL DEFAULT '',
      freeze_count INTEGER NOT NULL DEFAULT 2
    )
  `);

  api.exec(`
    CREATE TABLE IF NOT EXISTS daily_records (
      id INTEGER PRIMARY KEY,
      date TEXT NOT NULL UNIQUE,
      github_contributed INTEGER NOT NULL DEFAULT 0,
      leetcode_contributed INTEGER NOT NULL DEFAULT 0,
      streak INTEGER NOT NULL DEFAULT 0,
      freeze_used INTEGER NOT NULL DEFAULT 0
    )
  `);

  const row = api.get('SELECT COUNT(*) as count FROM settings');
  if (!row || row.count === 0) {
    api.run("INSERT INTO settings (id) VALUES (1)");
  }

  return api;
}

module.exports = { initDb };
