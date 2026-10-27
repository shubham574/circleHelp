import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // In production, VITE_API_URL is set via Render env vars
  // In dev, requests are proxied to localhost:3001
  server: {
    port: 5173,
    proxy:
      mode === 'development'
        ? {
            '/api': {
              target: 'http://localhost:3001',
              changeOrigin: true,
              rewrite: (path) => path.replace(/^\/api/, ''),
            },
          }
        : undefined,
  },
}));
