import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Same arrangement as apps/docs: '@' is the landing page's source, so the shared design system is
// the one and only copy, and '~' is this app's own. The repository root is readable because the
// documents served here are PRIVACY.md, LICENSE and NOTICE, imported as raw text.
const repoRoot = path.resolve(import.meta.dirname, '../..')

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '~': path.resolve(import.meta.dirname, './src'),
      '@': path.resolve(import.meta.dirname, '../web/src'),
    },
  },
  server: {
    port: 5175,
    fs: { allow: [repoRoot] },
  },
})
