# Moodify Production Safe Package (Neon + Spreadsheet Hybrid)

## 1) Arsitektur Aman

- Database utama: **Neon PostgreSQL** (users, checkins, community_posts).
- Backup audit/event: **Google Spreadsheet** via webhook (`VITE_SHEETS_WEBHOOK_URL`).
- Antrean backup lokal aktif: saat offline/gagal kirim, data masuk queue lalu retry otomatis saat online.

## 2) Environment Variables Wajib

Isi di lokal `.env` dan Vercel:

- `NEON_DATABASE_URL`
- `VITE_NEON_ENABLED`
- `VITE_API_BASE_URL` (kosongkan jika pakai same-origin di Vercel)
- `VITE_SHEETS_WEBHOOK_URL`
- `VITE_SHEETS_SOURCE_LABEL` (opsional, default `moodify-web`)

## 3) Proteksi API Neon

- Simpan `NEON_DATABASE_URL` hanya di environment server (Vercel), jangan di frontend.
- Batasi endpoint admin ke admin-only flow (jika nanti ditambah session token).
- Pakai query parameterized (sudah diterapkan di route `/api`).
- Pastikan tabel punya constraint (`unique`, `check`, `foreign key`) dari `NEON_SETUP.sql`.

## 4) Backup & Recovery

- Aktifkan backup/snapshot PostgreSQL harian di Neon.
- Simpan Spreadsheet backup sebagai audit trail.
- Simpan minimal 30-90 hari backup.

## 5) Monitoring

- Monitor usage Neon (storage/compute) dan query errors.
- Aktifkan alert budget di provider billing.
- Pantau ukuran antrean backup lokal (`moodify_sheets_backup_queue_v1`) saat uji lapangan.

## 6) Uji Beban Ringan (Pra Go-Live)

1. Simulasikan 50-100 submit check-in dalam 10-15 menit.
2. Pastikan data muncul di Admin Dashboard (Cloud).
3. Matikan internet 1 device, submit data, nyalakan lagi, cek data terkirim dari queue.
4. Verifikasi log backup masuk ke Spreadsheet.

## 7) SOP Insiden Singkat

- Jika Neon down: aplikasi tetap simpan lokal + queue backup.
- Jika Spreadsheet webhook down: data tetap aman di Neon, backup queue akan retry.
- Jika ada kehilangan data lokal: gunakan backup Neon + Spreadsheet audit untuk rekonstruksi.
