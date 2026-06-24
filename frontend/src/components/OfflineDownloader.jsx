import { useEffect, useState } from 'react'
import { Download, Check, HardDrive } from 'lucide-react'
import { api } from '../lib/api'
import {
  useOfflineDownload,
  useOnlineStatus,
  getStorageEstimate,
} from '../lib/offline'

/**
 * Baixa todo o catálogo (áudios, capas e vídeos de legenda) para o aparelho,
 * permitindo tocar tudo sem internet depois.
 */
export default function OfflineDownloader() {
  const online = useOnlineStatus()
  const { state, progress, message, start } = useOfflineDownload()
  const [usage, setUsage] = useState(null)

  // Atualiza o espaço usado quando termina.
  useEffect(() => {
    if (state === 'done') getStorageEstimate().then(setUsage)
  }, [state])

  const pct =
    progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <div className="mt-10 pt-8 border-t border-zinc-900">
      <p className="text-xs text-zinc-600 uppercase tracking-wider font-medium mb-3">
        Modo offline
      </p>
      <p className="text-sm text-zinc-400 mb-4 leading-relaxed">
        Baixe o catálogo para tocar suas músicas, playlists e legendas (por
        vídeo) <span className="text-white font-medium">sem internet</span>.
      </p>

      <button
        onClick={() => start(() => api.getSongs())}
        disabled={state === 'working' || !online}
        className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-spotify-green text-black text-sm font-bold hover:opacity-90 transition disabled:opacity-60"
      >
        {state === 'working' ? (
          <>
            <Download size={16} className="animate-bounce" />
            Baixando… {pct}%
          </>
        ) : state === 'done' ? (
          <>
            <Check size={16} strokeWidth={3} />
            Baixar novamente
          </>
        ) : (
          <>
            <Download size={16} />
            Baixar catálogo para offline
          </>
        )}
      </button>

      {state === 'working' && progress.total > 0 && (
        <div className="mt-4">
          <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-spotify-green transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-zinc-500 mt-1.5">
            {progress.done} de {progress.total} itens
          </p>
        </div>
      )}

      {message && (
        <p
          className={`mt-3 text-sm ${
            state === 'error' ? 'text-red-400' : 'text-zinc-400'
          }`}
        >
          {message}
        </p>
      )}

      {!online && state !== 'working' && (
        <p className="mt-2 text-xs text-amber-500">
          Conecte-se à internet para baixar.
        </p>
      )}

      {usage && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-zinc-600">
          <HardDrive size={12} />
          Usando {usage.usageMB.toFixed(0)} MB no aparelho
        </p>
      )}
    </div>
  )
}
