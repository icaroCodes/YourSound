// Lógica de download offline SEM dependência de React/DOM, para ser
// testável de forma isolada (Node) e reutilizada pelos hooks em offline.js.

// Nome do cache de mídia — precisa bater com o usado no service worker (sw.js).
export const MEDIA_CACHE = 'ys-media'

// Só guardamos URLs públicas e estáveis do Supabase Storage.
export function isCacheableMediaUrl(url) {
  return typeof url === 'string' && url.includes('/storage/v1/object/public/')
}

/**
 * Coleta as URLs de mídia (áudio, capa, vídeo de legenda) de uma lista de
 * músicas que podem ser guardadas offline. Sem duplicatas.
 */
export function collectMediaUrls(songs) {
  const urls = new Set()
  for (const s of songs || []) {
    if (isCacheableMediaUrl(s.file_url)) urls.add(s.file_url)
    if (isCacheableMediaUrl(s.cover_url)) urls.add(s.cover_url)
    if (s.subtitle_mode === 'video' && isCacheableMediaUrl(s.subtitle_video_url)) {
      urls.add(s.subtitle_video_url)
    }
  }
  return [...urls]
}

/**
 * Baixa UMA url para o Cache Storage, com timeout e novas tentativas.
 * Grava direto no cache (cache.put) — não depende do service worker
 * interceptar o fetch, o que é bem mais confiável em redes móveis.
 */
export async function downloadOne(cache, url, { retries = 3, timeoutMs = 45000 } = {}) {
  // Já está salvo? Pula (permite retomar de onde parou).
  try {
    if (await cache.match(url)) return true
  } catch {}

  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    try {
      const res = await fetch(url, { mode: 'cors', credentials: 'omit', signal: ctrl.signal })
      clearTimeout(timer)
      if (!res.ok) throw new Error('HTTP ' + res.status)
      // cache.put consome o stream inteiro = baixa o arquivo completo e grava.
      await cache.put(url, res)
      return true
    } catch {
      clearTimeout(timer)
      if (attempt < retries) {
        // Backoff progressivo: 0.7s, 1.4s, 2.1s
        await new Promise((r) => setTimeout(r, 700 * (attempt + 1)))
      }
    }
  }
  return false
}

/**
 * Baixa várias mídias em paralelo limitado, com progresso.
 * Retorna { ok, failed, total }. Re-executar tenta só o que faltou.
 */
export async function prefetchMedia(
  urls,
  { concurrency = 3, onProgress, retries = 3, timeoutMs = 45000 } = {}
) {
  const total = urls.length
  if (total === 0) return { ok: 0, failed: 0, total: 0 }

  const cache = await caches.open(MEDIA_CACHE)
  let done = 0
  let ok = 0
  let failed = 0
  const queue = [...urls]

  async function worker() {
    while (queue.length) {
      const url = queue.shift()
      const success = await downloadOne(cache, url, { retries, timeoutMs })
      success ? ok++ : failed++
      done++
      onProgress?.(done, total)
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, total) }, worker))
  return { ok, failed, total }
}

/**
 * Diz se uma URL já está guardada no cache de mídia (já disponível offline).
 */
export async function isUrlCached(url) {
  if (!url) return false
  try {
    const cache = await caches.open(MEDIA_CACHE)
    return !!(await cache.match(url))
  } catch {
    return false
  }
}

/**
 * Retorna um Set com todas as URLs de mídia já guardadas no cache offline.
 */
export async function getCachedUrlSet() {
  try {
    const cache = await caches.open(MEDIA_CACHE)
    const reqs = await cache.keys()
    return new Set(reqs.map((r) => r.url))
  } catch {
    return new Set()
  }
}

/**
 * Filtra uma lista de músicas, mantendo apenas as que têm o ÁUDIO baixado
 * (ou seja, dá para tocar offline). Pode receber um Set pronto (cachedSet)
 * para evitar reabrir o cache a cada chamada.
 */
export async function filterDownloadedSongs(songs, cachedSet) {
  const set = cachedSet || (await getCachedUrlSet())
  return (songs || []).filter((s) => s.file_url && set.has(s.file_url))
}

/**
 * Estima quanto espaço o app já usa no aparelho (MB).
 */
export async function getStorageEstimate() {
  try {
    if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
      const { usage = 0, quota = 0 } = await navigator.storage.estimate()
      return { usageMB: usage / 1048576, quotaMB: quota / 1048576 }
    }
  } catch {}
  return null
}
