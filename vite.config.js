import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { join } from 'path'

export default defineConfig({
  plugins: [vue()],
  base: './',
  root: join(__dirname, 'src'),
  publicDir: join(__dirname, 'public'),
  build: {
    outDir: join(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        format: 'cjs'
      }
    }
  },
  server: {
    port: 5173,
    strictPort: true,
    cors: true
  },
  optimizeDeps: {
    exclude: ['electron']
  }
}) 