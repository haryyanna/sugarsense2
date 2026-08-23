import { json, normalizeUsername, requireSql } from '../_lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Method not allowed' });

  try {
    const sql = requireSql();
    const username = normalizeUsername(req.body?.username);
    if (!username) return json(res, 400, { ok: false, error: 'Username wajib diisi.' });

    const existing = await sql`
      select id, username, created_at
      from users
      where username = ${username}
      limit 1
    `;

    if (existing.length > 0) {
      return json(res, 200, { ok: true, user: existing[0] });
    }

    const inserted = await sql`
      insert into users (username)
      values (${username})
      returning id, username, created_at
    `;

    return json(res, 200, { ok: true, user: inserted[0] });
  } catch (error) {
    return json(res, 500, { ok: false, error: error.message || 'Internal error' });
  }
}
