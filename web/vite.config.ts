import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Hosted on GitHub Pages with custom domain playlistout.com (served from root /)
  base: '/',
  server: {
    port: 5173,
  },
});
