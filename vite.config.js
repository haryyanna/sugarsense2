import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { localApiPlugin } from './vite-plugin-local-api.js'

export default defineConfig({
  // GitHub Pages serves this project under /sugarsense2/.
  base: '/sugarsense2/',
  plugins: [react(), basicSsl(), localApiPlugin(), viteSingleFile()],
  server: {
    host: true,
  },
})
