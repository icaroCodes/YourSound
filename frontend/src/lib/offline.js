import { useEffect, useState } from 'react'

/**
 * Hook: estado de conexão (online/offline) em tempo real.
 */
export function useOnlineStatus() {
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

// Só pré-baixamos URLs públicas e estáveis do Supabase Storage.
function isCacheableMediaUrl(url) {
  return typeof url === 'string' && url.includes('/storage/v1/object/public/')
}

/**
 * Coleta todas as URLs de mídia (áudio, capa, vídeo de legenda) de uma
 * lista de músicas que podem ser guardadas offline.
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
 * Faz o download das mídias para o cache do service worker, em paralelo
 * limitado. Chama onProgress(feito, total) a cada item.
 * Retorna { ok, failed }.
 */
export async function prefetchMedia(urls, { concurrency = 4, onProgress } = {}) {
  let done = 0
  let ok = 0
  let failed = 0
  const queue = [...urls]
  const total = queue.length

  async function worker() {
    while (queue.length) {
      const url = queue.shift()
      try {
        // O fetch é interceptado pelo service worker (CacheFirst) e guardado.
        const res = await fetch(url, { mode: 'cors', credentials: 'omit' })
        if (res.ok || res.type === 'opaque') ok++
        else failed++
      } catch {
        failed++
      } finally {
        done++
        onProgress?.(done, total)
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, total || 1) }, worker)
  )
  return { ok, failed, total }
}

/**
 * Estima quanto espaço o app já usa no aparelho (MB).
 */
export async function getStorageEstimate() {
  try {
    if (navigator.storage?.estimate) {
      const { usage = 0, quota = 0 } = await navigator.storage.estimate()
      return { usageMB: usage / 1048576, quotaMB: quota / 1048576 }
    }
  } catch {}
  return null
}
