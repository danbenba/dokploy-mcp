import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '~': path.resolve(import.meta.dirname, './src'),
      '@': path.resolve(import.meta.dirname, '../web/src'),
    },
  },
  server: {
    port: 5174,
    fs: { allow: [path.resolve(import.meta.dirname, '..')] },
  },
})
