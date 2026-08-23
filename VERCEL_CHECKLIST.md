# Vercel Deploy Checklist

## 1) GitHub

- Pastikan file `.env` tidak ikut ter-push (sudah ada di `.gitignore`).
- Push kode terbaru ke branch GitHub kamu.

## 2) Environment Variables di Vercel

Isi variabel ini di `Project Settings -> Environment Variables`:

- `VITE_CEREBRAS_API_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_SHEETS_WEBHOOK_URL`
- `VITE_SHEETS_SOURCE_LABEL`
- `VITE_NEON_ENABLED`
- `VITE_API_BASE_URL`
- `NEON_DATABASE_URL`

Set untuk environment `Production` dan `Preview` (opsional juga `Development`).

## 3) Build Settings

- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`

## 4) Setelah Deploy

- Cek halaman chat/journal (AI response berjalan).
- Cek check-in tersimpan ke Supabase.
- Cek admin menampilkan `(Cloud)`.
- Coba hapus data dari admin (harus benar-benar terhapus).
- Jika pakai Neon, cek komunitas lintas device tanpa refresh manual berlebihan.
- Jika pakai Neon, cek endpoint `/api/health` menghasilkan `ok: true`.
- Cek backup event masuk ke Google Sheets (lihat `GOOGLE_SHEETS_WEBHOOK_SETUP.md`).

## 5) Hardening Production Aman

- Pastikan environment variable di Vercel **persis**:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_CEREBRAS_API_KEY`
- Di Supabase, jalankan SQL pada file `SUPABASE_SETUP.md` termasuk bagian:
  - hardening check-in per hari
  - tabel/policy komunitas lintas device
- Aktifkan backup otomatis di Supabase Project Settings.
- Jangan pernah commit `.env` ke GitHub.
- Setelah update env di Vercel, lakukan `Redeploy` agar build memakai env terbaru.
