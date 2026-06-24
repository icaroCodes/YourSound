/// <reference lib="webworker" />
/**
 * YourSound — Service Worker (offline / PWA)
 *
 * Estratégia:
 *  - App shell (HTML/JS/CSS/ícones) → precache (funciona 100% offline)
 *  - Catálogo, playlists, likes (GET /api/...) → NetworkFirst (mostra o
 *    último catálogo carregado quando estiver sem internet)
 *  - Áudios, capas e vídeos de legenda do Supabase Storage → CacheFirst
 *    com suporte a Range (toca offline e permite arrastar/seek)
 *  - Fontes do Google → cache de longa duração
 *
 * Observação: a reprodução offline usa as URLs PÚBLICAS e estáveis do
 * Supabase (file_url / cover_url / subtitle_video_url). URLs assinadas
 * (/sign/?token=) não são usadas offline porque expiram.
 */
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { RangeRequestsPlugin } from 'workbox-range-requests'

self.skipWaiting()

// __WB_MANIFEST é injetado pelo vite-plugin-pwa (lista do app shell)
precacheAndRoute(self.__WB_MANIFEST || [])

// ── SPA: qualquer navegação cai no index.html (abre offline em qualquer rota) ──
const navHandler = createHandlerBoundToURL('index.html')
registerRoute(
  new NavigationRoute(navHandler, {
    denylist: [/^\/api\//, /^\/download/, /\/[^/?]+\.[^/]+$/],
  })
)

// ── Mídia do Supabase Storage (áudio, capa, vídeo de legenda) ──
// Suporta Range (seek) e guarda offline por até 60 dias.
registerRoute(
  ({ url }) => url.pathname.includes('/storage/v1/object/'),
  new CacheFirst({
    cacheName: 'ys-media',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200, 206] }),
      new RangeRequestsPlugin(),
      new ExpirationPlugin({
        maxEntries: 600,
        maxAgeSeconds: 60 * 24 * 60 * 60, // 60 dias
        purgeOnQuotaError: true,
      }),
    ],
  })
)

// ── API: catálogo / playlists / likes (somente GET) ──
// NetworkFirst: usa a rede quando há internet; cai no cache quando offline.
// Excluímos /stream e /proxy-stream (devolvem URLs assinadas/temporárias).
registerRoute(
  ({ url, request }) =>
    request.method === 'GET' &&
    url.pathname.startsWith('/api/') &&
    !url.pathname.includes('/stream') &&
    !url.pathname.includes('/proxy-stream'),
  new NetworkFirst({
    cacheName: 'ys-api',
    networkTimeoutSeconds: 6,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 300,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 dias
      }),
    ],
  })
)

// ── Google Fonts (CSS + arquivos de fonte) ──
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new StaleWhileRevalidate({ cacheName: 'google-fonts-css' })
)
registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-files',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 365 * 24 * 60 * 60 }),
    ],
  })
)

// Permite que a página peça pra ativar a nova versão imediatamente.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting()
})
