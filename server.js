require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');
const { sendAcknowledgement, sendStarted, sendCompletion } = require('./mailer');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const SECRET = process.env.SECRET || 'dev-secret';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';
const AVG_TURNAROUND_HOURS = Number(process.env.AVG_TURNAROUND_HOURS || 24);
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

function ratingToken(id) {
  return crypto.createHmac('sha256', SECRET).update(id).digest('hex').slice(0, 16);
}

function requireAdmin(req, res, next) {
  const pw = req.header('x-admin-password');
  if (pw !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Invalid admin password' });
  next();
}

function queuePosition(id) {
  const row = db.prepare(`SELECT created_at FROM requests WHERE id = ?`).get(id);
  if (!row) return null;
  const { count } = db
    .prepare(
      `SELECT COUNT(*) as count FROM requests WHERE status = 'requested' AND created_at < ?`
    )
    .get(row.created_at);
  return count + 1;
}

// ---------- Public: create a request ----------
app.post('/api/requests', async (req, res) => {
  const { name, phone, email, videoType, notes } = req.body || {};
  if (!name || !phone || !email || !videoType) {
    return res.status(400).json({ error: 'name, phone, email and videoType are required' });
  }
  const id = uuidv4();
  const created_at = new Date().toISOString();
  db.prepare(
    `INSERT INTO requests (id, name, phone, email, video_type, notes, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'requested', ?)`
  ).run(id, name.trim(), phone.trim(), email.trim(), videoType.trim(), notes || '', created_at);

  const position = queuePosition(id);
  const etaHours = position * AVG_TURNAROUND_HOURS;

  try {
    await sendAcknowledgement({ to: email, name, videoType, position, etaHours });
  } catch (e) {
    console.error('Failed to send acknowledgement email:', e.message);
  }

  res.json({ id, position, etaHours });
});

// ---------- Public: queue dashboard (no personal contact info exposed) ----------
app.get('/api/queue', (req, res) => {
  const rows = db
    .prepare(
      `SELECT id, name, video_type, status, created_at, started_at FROM requests
       WHERE status IN ('requested','in_progress') ORDER BY created_at ASC`
    )
    .all();

  let position = 0;
  const result = rows.map((r) => {
    if (r.status === 'requested') position += 1;
    return {
      id: r.id,
      name: maskName(r.name),
      videoType: r.video_type,
      status: r.status,
      position: r.status === 'requested' ? position : null,
    };
  });
  res.json(result);
});

function maskName(name) {
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

// ---------- Public: submit rating (from email link) ----------
app.post('/api/requests/:id/rate', (req, res) => {
  const { id } = req.params;
  const { token, score } = req.body || {};
  if (token !== ratingToken(id)) return res.status(403).json({ error: 'Invalid rating link' });
  const s = Number(score);
  if (![1, 2, 3].includes(s)) return res.status(400).json({ error: 'score must be 1, 2 or 3' });
  const info = db.prepare(`UPDATE requests SET rating = ? WHERE id = ?`).run(s, id);
  if (info.changes === 0) return res.status(404).json({ error: 'Request not found' });
  res.json({ ok: true });
});

app.get('/api/requests/:id/public', (req, res) => {
  const row = db
    .prepare(`SELECT id, name, video_type, status, rating FROM requests WHERE id = ?`)
    .get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

// ---------- Admin ----------
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body || {};
  if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Wrong password' });
  res.json({ ok: true });
});

app.get('/api/admin/requests', requireAdmin, (req, res) => {
  const rows = db.prepare(`SELECT * FROM requests ORDER BY created_at DESC`).all();
  // Calculate positions for requested items
  const requestedRows = rows.filter(r => r.status === 'requested').sort((a, b) => a.created_at.localeCompare(b.created_at));
  const posMap = {};
  requestedRows.forEach((r, i) => { posMap[r.id] = i + 1; });
  const withPos = rows.map((r) => ({
    ...r,
    position: posMap[r.id] || null,
  }));
  res.json(withPos);
});

app.patch('/api/admin/requests/:id/start', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const row = db.prepare(`SELECT * FROM requests WHERE id = ? AND status = 'requested'`).get(id);
  if (!row) return res.status(400).json({ error: 'Request not in a startable state' });

  const started_at = new Date().toISOString();
  db.prepare(`UPDATE requests SET status = 'in_progress', started_at = ? WHERE id = ?`).run(started_at, id);

  // Send "editing started" notification email
  try {
    await sendStarted({ to: row.email, name: row.name, videoType: row.video_type });
  } catch (e) {
    console.error('Failed to send started email:', e.message);
  }

  res.json({ ok: true });
});

app.patch('/api/admin/requests/:id/finish', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const row = db.prepare(`SELECT * FROM requests WHERE id = ?`).get(id);
  if (!row) return res.status(404).json({ error: 'Not found' });

  const completed_at = new Date().toISOString();
  db.prepare(`UPDATE requests SET status = 'completed', completed_at = ? WHERE id = ?`).run(completed_at, id);

  const token = ratingToken(id);
  const ratingLinkBase = `${APP_URL}/rate.html?id=${id}&token=${token}`;

  try {
    await sendCompletion({ to: row.email, name: row.name, videoType: row.video_type, ratingLinkBase });
  } catch (e) {
    console.error('Failed to send completion email:', e.message);
  }

  res.json({ ok: true });
});

app.delete('/api/admin/requests/:id', requireAdmin, (req, res) => {
  db.prepare(`DELETE FROM requests WHERE id = ?`).run(req.params.id);
  res.json({ ok: true });
});

app.get('/api/admin/stats', requireAdmin, (req, res) => {
  const total = db.prepare(`SELECT COUNT(*) c FROM requests`).get().c;
  const requested = db.prepare(`SELECT COUNT(*) c FROM requests WHERE status='requested'`).get().c;
  const inProgress = db.prepare(`SELECT COUNT(*) c FROM requests WHERE status='in_progress'`).get().c;
  const completed = db.prepare(`SELECT COUNT(*) c FROM requests WHERE status='completed'`).get().c;
  const topTypes = db
    .prepare(
      `SELECT video_type, COUNT(*) c FROM requests GROUP BY video_type ORDER BY c DESC LIMIT 5`
    )
    .all();
  const avgRatingRow = db
    .prepare(`SELECT AVG(rating) a, COUNT(rating) n FROM requests WHERE rating IS NOT NULL`)
    .get();
  res.json({
    total,
    requested,
    inProgress,
    completed,
    topTypes,
    avgRating: avgRatingRow.a,
    ratedCount: avgRatingRow.n,
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🎬 FrameCraft Studio running on http://localhost:${PORT}`));
