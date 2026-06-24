import { useEffect, useRef } from 'react'
import { Download, Check, Loader2 } from 'lucide-react'
import { useOfflineDownload } from '../lib/offline'
import { useDialogStore } from '../store/useDialogStore'

/**
 * Botão para baixar SÓ as músicas desta playlist para offline.
 * Mostra o progresso no próprio ícone e um aviso ao terminar.
 */
export default function PlaylistOfflineButton({ songs, size = 24 }) {
  const { state, progress, message, start } = useOfflineDownload()
  const { showAlert } = useDialogStore()
  const lastState = useRef(state)

  const pct =
    progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0

  // Avisa quando termina (sucesso ou erro).
  useEffect(() => {
    if (lastState.current === 'working' && state === 'done') {
      showAlert(message, { title: 'Download offline', icon: 'success' })
    } else if (lastState.current === 'working' && state === 'error') {
      showAlert(message, { title: 'Erro no download', icon: 'error' })
    }
    lastState.current = state
  }, [state, message, showAlert])

  const disabled = state === 'working' || !songs?.length

  return (
    <button
      onClick={() => start(songs)}
      disabled={disabled}
      title="Baixar playlist para ouvir offline"
      className="relative flex items-center gap-1.5 text-zinc-400 hover:text-white transition-transform active:scale-110 disabled:opacity-60"
    >
      {state === 'working' ? (
        <>
          <Loader2 size={size} className="animate-spin text-spotify-green" />
          <span className="text-xs font-bold text-spotify-green tabular-nums">
            {pct}%
          </span>
        </>
      ) : state === 'done' ? (
        <Check size={size} className="text-spotify-green" />
      ) : (
        <Download size={size} />
      )}
    </button>
  )
}
