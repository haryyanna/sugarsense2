import { json, normalizeUsername, requireSql } from '../_lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Method not allowed' });

  try {
    const sql = requireSql();
    const postId = Number(req.body?.postId);
    const authorName = normalizeUsername(req.body?.authorName);
    const content = String(req.body?.content || '').trim();
    if (!Number.isFinite(postId)) return json(res, 400, { ok: false, error: 'ID post tidak valid.' });
    if (!authorName) return json(res, 400, { ok: false, error: 'Nama pengirim wajib diisi.' });
    if (!content) return json(res, 400, { ok: false, error: 'Konten wajib diisi.' });

    const rows = await sql`
      update community_posts
      set content = ${content}
      where id = ${postId}
        and author_name = ${authorName}
      returning id
    `;
    if (!rows.length) return json(res, 403, { ok: false, error: 'Tidak diizinkan mengubah post ini.' });
    return json(res, 200, { ok: true });
  } catch (error) {
    return json(res, 500, { ok: false, error: error.message || 'Internal error' });
  }
}
