import { json, normalizeUsername, requireSql } from '../_lib/db.js';

const toInt = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Method not allowed' });

  try {
    const sql = requireSql();
    const username = normalizeUsername(req.body?.username);
    if (!username) return json(res, 400, { ok: false, error: 'Username wajib diisi.' });

    const mood = toInt(req.body?.mood, 0);
    const sadness = toInt(req.body?.sadness, 0);
    const anxiety = toInt(req.body?.anxiety, 0);
    const stress = toInt(req.body?.stress, 0);
    const journal = String(req.body?.journal || '');
    const createdAt = req.body?.createdAt ? new Date(req.body.createdAt) : new Date();

    const userRows = await sql`
      insert into users (username)
      values (${username})
      on conflict (username) do update set username = excluded.username
      returning id
    `;
    const userId = userRows[0]?.id;
    if (!userId) return json(res, 500, { ok: false, error: 'Gagal mendapatkan user_id.' });

    const existing = await sql`
      select id
      from checkins
      where user_id = ${userId}
        and checkin_day = (timezone('Asia/Makassar', now()))::date
      limit 1
    `;
    if (existing.length > 0) {
      return json(res, 200, { ok: true, skipped: true, reason: 'already_checked_in_today' });
    }

    const inserted = await sql`
      insert into checkins (user_id, mood, sadness, anxiety, stress, journal, created_at)
      values (${userId}, ${mood}, ${sadness}, ${anxiety}, ${stress}, ${journal}, ${createdAt.toISOString()})
      returning id, created_at
    `;

    return json(res, 200, { ok: true, checkin: inserted[0], skipped: false });
  } catch (error) {
    return json(res, 500, { ok: false, error: error.message || 'Internal error' });
  }
}
