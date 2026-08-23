const Database = require('better-sqlite3');
const path = require('path');

const isVercel = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
const dbPath = isVercel ? path.join('/tmp', 'queue.db') : path.join(__dirname, 'queue.db');

const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS requests (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    video_type TEXT NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'requested', -- requested | in_progress | completed
    rating INTEGER,                            -- 1 (meh), 2 (good), 3 (love it) or NULL
    created_at TEXT NOT NULL,
    started_at TEXT,
    completed_at TEXT
  );
`);

module.exports = db;
