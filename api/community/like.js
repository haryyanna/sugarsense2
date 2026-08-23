import { json, requireSql } from '../_lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Method not allowed' });

  try {
    const sql = requireSql();
    const postId = Number(req.body?.postId);
    const likes = Math.max(0, Number(req.body?.likes || 0));
    if (!Number.isFinite(postId)) return json(res, 400, { ok: false, error: 'ID post tidak valid.' });

    await sql`
      update community_posts
      set likes = ${likes}
      where id = ${postId}
    `;
    return json(res, 200, { ok: true });
  } catch (error) {
    return json(res, 500, { ok: false, error: error.message || 'Internal error' });
  }
}
