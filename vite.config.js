import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // OTTIMIZZAZIONI BUILD
  build: {
    // Chunk splitting per librerie pesanti
    rollupOptions: {
      output: {
        manualChunks: {
          // Separa GrapesJS in chunk separato
          'grapesjs-core': ['grapesjs', '@grapesjs/studio-sdk'],
          'grapesjs-plugins': [
            'grapesjs-blocks-basic',
            'grapesjs-plugin-forms', 
            'grapesjs-custom-code',
            'grapesjs-plugin-export',
            'grapesjs-tabs',
            '@grapesjs/studio-sdk-plugins'
          ],
          // TinyMCE separato
          'tinymce': ['tinymce', '@tinymce/tinymce-react'],
          // Email editor components
          'email-editor': ['react-email-editor'],
          // Supabase separato
          'supabase': ['@supabase/supabase-js'],
          // Utilities
          'vendor': ['react', 'react-dom', 'lucide-react']
        }
      }
    },
    // Chunk size warning threshold più alto
    chunkSizeWarningLimit: 2000
  },
  
  // OTTIMIZZAZIONI DEV  
  optimizeDeps: {
    // Pre-bundle delle dipendenze pesanti
    include: [
      'react', 
      'react-dom',
      'lucide-react',
      '@supabase/supabase-js',
      'react-email-editor'
    ],
    // Escludi GrapesJS dal pre-bundling per evitare problemi
    exclude: [
      'grapesjs',
      '@grapesjs/studio-sdk',
      'tinymce'
    ]
  },
  
  server: {
    host: '0.0.0.0', // Espone su tutte le interfacce di rete
    port: 5173,      // Porta fissa
    strictPort: true, // Fallisce se la porta è occupata
    proxy: {
      '/api/print': {
        target: 'https://sacred-eagle-similarly.ngrok-free.app',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      }
    }
  }
})
