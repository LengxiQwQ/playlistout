import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import { resolve } from 'path';
import { existsSync, mkdirSync, copyFileSync } from 'fs';

function dashboardDirectoryPlugin(): Plugin {
  return {
    name: 'dashboard-directory-plugin',
    closeBundle() {
      const distDir = fileURLToPath(new URL('dist', import.meta.url));
      const srcHtml = resolve(distDir, 'dashboard.html');
      const targetDir = resolve(distDir, 'dashboard');
      const targetHtml = resolve(targetDir, 'index.html');
      if (existsSync(srcHtml)) {
        if (!existsSync(targetDir)) {
          mkdirSync(targetDir, { recursive: true });
        }
        copyFileSync(srcHtml, targetHtml);
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), dashboardDirectoryPlugin()],
  // Hosted on GitHub Pages with custom domain playlistout.lengxiqwq.com (served from root /)
  base: '/',
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('index.html', import.meta.url)),
        dashboard: fileURLToPath(new URL('dashboard.html', import.meta.url)),
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    testTimeout: 15000,
    pool: 'threads',
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    // Automatically proxy API requests to local Worker in development mode
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
    },
  },
});
