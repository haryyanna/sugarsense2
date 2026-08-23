# Neon Migration Guide (End-to-End + Spreadsheet Backup)

## 1) Buat Database Neon

1. Buat project baru di [Neon](https://neon.tech/).
2. Ambil connection string PostgreSQL (`postgresql://...`) dari dashboard.
3. Jalankan SQL dari file `NEON_SETUP.sql` di Neon SQL Editor.

## 2) Set Environment Variables

Untuk Vercel:

- `NEON_DATABASE_URL` = connection string Neon
- `VITE_NEON_ENABLED` = `true`
- `VITE_API_BASE_URL` = kosongkan (pakai same-origin)
- `VITE_SHEETS_WEBHOOK_URL` = URL Apps Script Web App
- `VITE_SHEETS_SOURCE_LABEL` = `moodify-web`
- `VITE_CEREBRAS_API_KEY` = key AI kamu

Untuk lokal (`.env`), isi variabel yang sama.

## 3) API Endpoints yang Dipakai Frontend

- `POST /api/users/ensure`
- `GET /api/checkins/has-today`
- `POST /api/checkins/create`
- `GET /api/admin/users`
- `POST /api/admin/delete-user`
- `GET /api/community/list`
- `POST /api/community/create`
- `POST /api/community/update`
- `POST /api/community/delete`
- `POST /api/community/like`

## 4) Backup Spreadsheet Tetap Aktif

Lihat file `GOOGLE_SHEETS_WEBHOOK_SETUP.md`.

Event backup yang dikirim:

- `checkin_saved`
- `community_post_created`
- `community_post_updated`
- `community_post_deleted`
- `community_like_updated`

## 5) Checklist Go-Live

1. Tes login user A dan user B.
2. Cek check-in user A/B muncul di Admin Database.
3. Cek komunitas lintas device (buat/edit/hapus/like).
4. Cek event backup masuk ke Google Sheets.
5. Jalankan uji 50+ check-in untuk sanity test.
