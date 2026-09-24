import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root,
  plugins: [react()],
  build: { outDir: 'dist', emptyOutDir: true, chunkSizeWarningLimit: 1500 },
  server: {
    port: 5173,
    fs: { allow: ['..'] },   // shared/ lives next to client/
    proxy: { '/api': 'http://127.0.0.1:7700', '/files': 'http://127.0.0.1:7700' },
  },
});
