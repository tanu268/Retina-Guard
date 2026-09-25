import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Lets the dev server talk to the edge backend without CORS setup.
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        // Recharts is large and only the admin ever loads it; keeping it in its
        // own chunk stops it landing in the technician's initial download.
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
            if (id.includes('framer-motion') || id.includes('motion-dom')) return 'vendor-motion';
            if (id.includes('react')) return 'vendor-react';
          }
          return undefined;
        },
      },
    },
  },
});
