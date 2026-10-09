/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs';
import { defineConfig, type Connect, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { handleFeedRequest } from './api/_lib/feed.ts';
import { fixtureFetch, serveFixture } from './test/fixture-server.ts';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

/**
 * Stellt /api/feed auch im Vite-Dev-Server bereit (gleiche Logik wie die Vercel-Function).
 * Mit HK_FIXTURES=1 kommen Feeds und Audio aus test/fixtures – für Tests ohne Internet.
 */
function devApi(): Plugin {
  const fixtures = process.env.HK_FIXTURES === '1';
  const mount = (server: { middlewares: Connect.Server }): void => {
    server.middlewares.use(async (req, res, next) => {
      const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
      if (fixtures && url.pathname.startsWith('/__fixtures/')) return serveFixture(url.pathname, res, req.headers.range);
      if (url.pathname !== '/api/feed') return next();
      const result = await handleFeedRequest(url.searchParams.get('url'), fixtures ? fixtureFetch(url.origin) : fetch);
      res.statusCode = result.status;
      for (const [k, v] of Object.entries(result.headers)) res.setHeader(k, v);
      res.end(result.body);
    });
  };
  return { name: 'hoerkiste-dev-api', configureServer: mount, configurePreviewServer: mount };
}

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [
    react(),
    devApi(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'Hörkiste',
        short_name: 'Hörkiste',
        description: 'Kinder-Podcasts ohne Werbung – Hörkiste',
        lang: 'de',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#FFF6E5',
        theme_color: '#FFB703',
        categories: ['kids', 'education', 'entertainment'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        globIgnores: ['**/*cyrillic*', '**/*vietnamese*'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/__fixtures\//],
        runtimeCaching: [
          {
            // Zuletzt geladene Folgenlisten bleiben offline sichtbar
            urlPattern: ({ url }) => url.pathname === '/api/feed',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'feeds',
              networkTimeoutSeconds: 8,
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 14 },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'covers',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Audio wird bewusst nicht gecacht (Phase 2: Offline-Download)
        ],
      },
    }),
  ],
  test: { include: ['test/**/*.test.ts'] },
});
