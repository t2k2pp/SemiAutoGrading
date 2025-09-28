import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/SemiAutoGrading/',  // GitHub Pagesのリポジトリ名
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          services: ['./src/services/llmService.ts', './src/services/dataService.ts']
        }
      }
    }
  }
})
