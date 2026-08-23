import { json, requireSql } from '../_lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { ok: false, error: 'Method not allowed' });

  try {
    const sql = requireSql();
    const rows = await sql`
      select id, author_name, content, likes, created_at
      from community_posts
      order by created_at desc
      limit 1000
    `;
    return json(res, 200, {
      ok: true,
      posts: rows.map((r) => ({
        id: r.id,
        author: r.author_name,
        text: r.content,
        likes: Number(r.likes || 0),
        timestamp: new Date(r.created_at).getTime()
      }))
    });
  } catch (error) {
    return json(res, 500, { ok: false, error: error.message || 'Internal error' });
  }
}
