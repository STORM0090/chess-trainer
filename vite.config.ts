import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };

// The base path is passed on the command line by CI:
//   main branch  -> --base=/chess-trainer/
//   stage branch -> --base=/chess-trainer/preview/<branch>/
// Locally it stays "/".
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    VitePWA({
      // "prompt": never reload the page behind the user's back in the middle of an exercise.
      registerType: 'prompt',
      manifest: {
        name: 'Chess Trainer',
        short_name: 'Chess Trainer',
        description: 'Шахматные ловушки и тактика: 5 минут в день',
        lang: 'ru',
        display: 'standalone',
        theme_color: '#1f2937',
        background_color: '#111827',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        // The engine (1.9 MB) is cached on first use instead of on install.
        globIgnores: ['engine/**'],
        // The root app's scope also covers /preview/<branch>/. Without this, the first visit
        // to a preview would be answered with the root app's cached index.html.
        navigateFallbackDenylist: [/\/preview\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /\/engine\/[^/]+\.(?:js|wasm)$/,
            handler: 'CacheFirst',
            options: { cacheName: 'engine-stockfish-19.0.1' },
          },
        ],
      },
    }),
  ],
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
