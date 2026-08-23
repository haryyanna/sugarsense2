import { json, requireSql } from '../_lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { ok: false, error: 'Method not allowed' });

  try {
    const sql = requireSql();
    const rows = await sql`
      select
        u.id as user_id,
        u.username,
        u.created_at as user_created_at,
        c.id as checkin_id,
        c.mood,
        c.sadness,
        c.anxiety,
        c.stress,
        c.journal,
        c.created_at as checkin_created_at
      from users u
      left join checkins c on c.user_id = u.id
      order by u.created_at desc, c.created_at asc
    `;

    const byUser = new Map();
    for (const row of rows) {
      const key = row.user_id;
      if (!byUser.has(key)) {
        byUser.set(key, {
          id: row.user_id,
          username: row.username,
          created_at: row.user_created_at,
          history: []
        });
      }
      if (row.checkin_id) {
        byUser.get(key).history.push({
          id: row.checkin_id,
          mood: row.mood,
          sadness: row.sadness,
          anxiety: row.anxiety,
          stress: row.stress,
          journal: row.journal,
          created_at: row.checkin_created_at
        });
      }
    }

    return json(res, 200, { ok: true, users: Array.from(byUser.values()) });
  } catch (error) {
    return json(res, 500, { ok: false, error: error.message || 'Internal error' });
  }
}
