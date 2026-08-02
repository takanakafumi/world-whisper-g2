import { defineConfig } from 'vite'

export default defineConfig({
  // Relative asset paths work both on a GitHub Pages project site and in an Even Hub package.
  base: './',
  server: { host: true, port: 5173 },
  build: { target: 'esnext' },
})
