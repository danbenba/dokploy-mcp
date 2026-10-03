import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The docs site shares the landing page's design system by importing the very same files, so
// '@' resolves into apps/web/src exactly as it does there: tokens, fonts, shadcn components and
// the shared site chrome cannot drift. '~' is this app's own source.
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
