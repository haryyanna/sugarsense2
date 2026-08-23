import { json, normalizeUsername, requireSql } from '../_lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Method not allowed' });

  try {
    const sql = requireSql();
    const authorName = normalizeUsername(req.body?.authorName);
    const content = String(req.body?.content || '').trim();
    if (!authorName) return json(res, 400, { ok: false, error: 'Nama pengirim wajib diisi.' });
    if (!content) return json(res, 400, { ok: false, error: 'Konten wajib diisi.' });

    const inserted = await sql`
      insert into community_posts (author_name, content, likes)
      values (${authorName}, ${content}, 0)
      returning id, author_name, content, likes, created_at
    `;
    const row = inserted[0];
    return json(res, 200, {
      ok: true,
      post: {
        id: row.id,
        author: row.author_name,
        text: row.content,
        likes: Number(row.likes || 0),
        timestamp: new Date(row.created_at).getTime()
      }
    });
  } catch (error) {
    return json(res, 500, { ok: false, error: error.message || 'Internal error' });
  }
}
