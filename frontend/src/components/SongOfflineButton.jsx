import { useEffect, useRef, useState } from 'react'
import { Download, Check, Loader2 } from 'lucide-react'
import { useOfflineDownload, isUrlCached } from '../lib/offline'
import { useDialogStore } from '../store/useDialogStore'

/**
 * Botão para baixar UMA música para ouvir offline.
 * Mostra ✓ verde quando a música já está disponível offline.
 */
export default function SongOfflineButton({ song, size = 18, className = '' }) {
  const { state, progress, message, start } = useOfflineDownload()
  const { showAlert } = useDialogStore()
  const [cached, setCached] = useState(false)
  const lastState = useRef(state)

  // Verifica, ao montar / trocar de música, se já está baixada.
  useEffect(() => {
    let active = true
    setCached(false)
    if (song?.file_url) {
      isUrlCached(song.file_url).then((v) => active && setCached(v))
    }
    return () => { active = false }
  }, [song?.file_url])

  // Avisa quando termina (sucesso ou erro).
  useEffect(() => {
    if (lastState.current === 'working' && state === 'done') {
      setCached(true)
      showAlert(message, { title: 'Download offline', icon: 'success' })
    } else if (lastState.current === 'working' && state === 'error') {
      showAlert(message, { title: 'Erro no download', icon: 'error' })
    }
    lastState.current = state
  }, [state, message, showAlert])

  const pct =
    progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0
  const isDone = cached || state === 'done'

  return (
    <button
      onClick={() => !isDone && start([song])}
      disabled={state === 'working' || !song}
      title={isDone ? 'Disponível offline' : 'Baixar música'}
      className={`relative flex items-center gap-1 transition-transform active:scale-110 disabled:opacity-70 ${
        isDone ? 'text-spotify-green' : 'text-white/70 hover:text-white'
      } ${className}`}
    >
      {state === 'working' ? (
        <>
          <Loader2 size={size} className="animate-spin text-spotify-green" />
          {pct > 0 && (
            <span className="text-[11px] font-bold text-spotify-green tabular-nums">
              {pct}%
            </span>
          )}
        </>
      ) : isDone ? (
        <Check size={size} strokeWidth={2.5} />
      ) : (
        <Download size={size} />
      )}
    </button>
  )
}
