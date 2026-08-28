import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['esm'],
  target: 'node20',
  platform: 'node',
  clean: true,
  splitting: false,
  noExternal: ['@dokploy-mcp/core'],
  banner: { js: '#!/usr/bin/env node' },
})
