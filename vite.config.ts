import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/payment-splitter/',
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    exclude: ['onnxruntime-web', 'ppu-paddle-ocr'],
  },
  worker: {
    format: 'es',
  },
})
