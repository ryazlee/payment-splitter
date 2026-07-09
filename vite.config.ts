import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/payment-splitter/',
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'spa-fallback',
      closeBundle() {
        const indexPath = path.resolve('dist/index.html')
        fs.copyFileSync(indexPath, path.resolve('dist/404.html'))
      },
    },
  ],
  optimizeDeps: {
    exclude: ['onnxruntime-web', 'ppu-paddle-ocr'],
  },
  worker: {
    format: 'es',
  },
})
