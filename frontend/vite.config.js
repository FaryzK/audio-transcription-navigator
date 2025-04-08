import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy API requests to the backend server
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        // Remove the /api prefix when forwarding to the backend
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      // Proxy demo file requests to the backend server
      '/demo': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})
