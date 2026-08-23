import { json, requireSql } from './_lib/db.js';

export default async function handler(req, res) {
  try {
    const sql = requireSql();
    await sql`select 1 as ok`;
    return json(res, 200, { ok: true, provider: 'neon' });
  } catch (error) {
    return json(res, 500, { ok: false, error: error.message || 'Health check failed' });
  }
}
