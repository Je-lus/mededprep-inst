import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 9000,
    proxy: {
      '/api': 'http://localhost:9001',
      '/storage': 'http://localhost:9001',
    },
  },
});
