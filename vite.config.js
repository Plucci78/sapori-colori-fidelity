import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Espone su tutte le interfacce di rete
    port: 5173,      // Porta fissa
    strictPort: true, // Fallisce se la porta è occupata
    proxy: {
      '/api/print': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
