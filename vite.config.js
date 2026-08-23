import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { localApiPlugin } from './vite-plugin-local-api.js'

// https://vite.dev/config/
export default defineConfig({
  // Menjalankan endpoint /api yang sama saat pengembangan lokal.
  // Di Vercel, folder /api dijalankan sebagai serverless functions.
  plugins: [react(), basicSsl(), localApiPlugin(), viteSingleFile()],
  server: {
    // Listen on every interface so devices on the same LAN can open the app.
  base: "/sugarsense",
    host: true,
  },
})
