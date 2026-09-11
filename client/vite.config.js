import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // injectManifest (not generateSW) because Phase 4 needs a custom
      // `push`/`notificationclick` handler in the service worker itself —
      // generateSW's auto-built workbox SW has no hook point for that.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      injectManifest: {
        // Same app-shell-only scope as the generateSW config it replaces —
        // still deliberately not caching Supabase/GitHub/LeetCode responses.
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'StreakForge',
        short_name: 'StreakForge',
        description: 'Track your coding streak. Never lose it by accident.',
        start_url: '/',
        display: 'standalone',
        background_color: '#0a0a0c',
        theme_color: '#0a0a0c',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    // Native fs-event watching crashes under some Windows/short-path dev
    // setups (libuv assertion in fs-event.c); polling avoids it entirely.
    watch: { usePolling: true },
    // The dev launcher starts this from an 8.3 short path (KEVINC~1) to
    // work around a separate path-with-spaces issue, which then makes
    // Vite's fs allow-list check compare short-path vs realpath'd long-path
    // forms of the same file and reject it. Local dev only; safe to relax.
    fs: { strict: false },
  },
});
