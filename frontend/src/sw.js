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
import { CacheFirst, CacheOnly, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies'
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
// IMPORTANTE: NÃO usar CacheFirst aqui. Com CacheFirst + RangeRequestsPlugin,
// um arquivo ainda não cacheado é baixado INTEIRO (o Range é removido) antes de
// o navegador poder tocar/dar seek — o que trava a reprodução até o download
// terminar. Em músicas grandes isso "demora muito" e no vídeo de legenda
// (até 50MB) costuma estourar timeout → "Vídeo indisponível".
//
// Estratégia correta: só servimos do cache o que JÁ foi baixado explicitamente
// para offline (offlineCore.js grava via cache.put, sem depender deste SW).
// Se não estiver no cache, deixamos o pedido ir DIRETO para a rede, onde o
// navegador faz streaming progressivo com suporte nativo a Range (rápido).
const mediaFromCache = new CacheOnly({
  cacheName: 'ys-media',
  plugins: [
    new CacheableResponsePlugin({ statuses: [0, 200, 206] }),
    new RangeRequestsPlugin(),
  ],
})

registerRoute(
  ({ url }) => url.pathname.includes('/storage/v1/object/'),
  async (params) => {
    // Já baixado offline? Serve do cache (com suporte a Range/seek).
    try {
      const cached = await mediaFromCache.handle(params)
      if (cached) return cached
    } catch {
      // CacheOnly lança quando não há match — segue para a rede.
    }
    // Não cacheado → streaming direto do Supabase (Range nativo, sem travar).
    return fetch(params.request)
  }
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
