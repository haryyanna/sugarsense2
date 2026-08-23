import { json, normalizeUsername, requireSql } from '../_lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Method not allowed' });

  try {
    const sql = requireSql();
    const username = normalizeUsername(req.body?.username);
    if (!username) return json(res, 400, { ok: false, error: 'Username wajib diisi.' });

    await sql`delete from users where username = ${username}`;
    return json(res, 200, { ok: true });
  } catch (error) {
    return json(res, 500, { ok: false, error: error.message || 'Internal error' });
  }
}
