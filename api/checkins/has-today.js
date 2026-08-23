import { json, normalizeUsername, requireSql } from '../_lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { ok: false, error: 'Method not allowed' });

  try {
    const sql = requireSql();
    const username = normalizeUsername(req.query?.username);
    if (!username) return json(res, 400, { ok: false, error: 'Username wajib diisi.' });

    const rows = await sql`
      select c.id
      from checkins c
      join users u on u.id = c.user_id
      where u.username = ${username}
        and c.checkin_day = (timezone('Asia/Makassar', now()))::date
      limit 1
    `;

    return json(res, 200, { ok: true, hasToday: rows.length > 0 });
  } catch (error) {
    return json(res, 500, { ok: false, error: error.message || 'Internal error' });
  }
}
