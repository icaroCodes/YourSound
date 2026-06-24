import { useState, useEffect, useCallback, useRef } from 'react'
import {
  collectMediaUrls,
  prefetchMedia,
  getStorageEstimate,
  filterDownloadedSongs,
} from './offlineCore'

// Reexporta utilitários puros para quem importa de 'offline'.
export {
  collectMediaUrls,
  prefetchMedia,
  getStorageEstimate,
  isUrlCached,
  getCachedUrlSet,
  filterDownloadedSongs,
} from './offlineCore'

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

/**
 * Hook: quando ONLINE, retorna a lista completa de músicas.
 * Quando OFFLINE, retorna só as que estão baixadas (áudio em cache).
 *
 * Útil para o catálogo/busca/playlists mostrarem apenas o que dá para
 * tocar sem internet.
 */
export function useDownloadedFilter(songs) {
  const online = useOnlineStatus()
  const [filtered, setFiltered] = useState([])

  useEffect(() => {
    let active = true
    if (online) {
      setFiltered(songs || [])
      return
    }
    filterDownloadedSongs(songs).then((r) => {
      if (active) setFiltered(r)
    })
    return () => {
      active = false
    }
  }, [songs, online])

  return online ? songs || [] : filtered
}

/**
 * Hook reutilizável para baixar músicas para offline.
 *
 * start(songsOrFetcher) aceita:
 *   - um array de músicas, ou
 *   - uma função async que retorna esse array (ex.: () => api.getSongs())
 *
 * Retorna { state, progress, message, start, reset }.
 *   state: 'idle' | 'working' | 'done' | 'error'
 */
export function useOfflineDownload() {
  const [state, setState] = useState('idle')
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [message, setMessage] = useState('')
  const runningRef = useRef(false)

  const reset = useCallback(() => {
    setState('idle')
    setProgress({ done: 0, total: 0 })
    setMessage('')
  }, [])

  const start = useCallback(async (songsOrFetcher) => {
    if (runningRef.current) return
    if (!navigator.onLine) {
      setState('error')
      setMessage('Você precisa de internet para baixar.')
      return
    }
    runningRef.current = true
    setState('working')
    setMessage('')
    setProgress({ done: 0, total: 0 })

    try {
      const songs =
        typeof songsOrFetcher === 'function'
          ? await songsOrFetcher()
          : songsOrFetcher
      const urls = collectMediaUrls(songs)

      if (urls.length === 0) {
        setState('done')
        setMessage('Nada para baixar ainda.')
        return
      }

      setProgress({ done: 0, total: urls.length })
      const { ok, failed } = await prefetchMedia(urls, {
        onProgress: (done, total) => setProgress({ done, total }),
      })

      setState('done')
      setMessage(
        failed > 0
          ? `${ok} prontos, ${failed} falharam. Toque de novo para tentar os que faltam.`
          : `Tudo pronto! ${ok} itens disponíveis offline.`
      )
    } catch (err) {
      setState('error')
      setMessage(err?.message || 'Falha ao baixar.')
    } finally {
      runningRef.current = false
    }
  }, [])

  return { state, progress, message, start, reset }
}
