import { usePlayerStore } from '../store/usePlayerStore'
import { MoreHorizontal, X, Play } from 'lucide-react'
import Lyrics from './Lyrics'

export default function RightPanel() {
  const { currentSong, queue, isQueueOpen, toggleQueue, isLyricsOpen, toggleLyrics, playSong } = usePlayerStore()

  if (!currentSong) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-zinc-500 p-8 text-center space-y-4">
        <div className="w-20 h-20 bg-zinc-800 rounded-lg animate-pulse" />
        <h2 className="text-lg font-bold text-white">Pronto para dar o play?</h2>
        <p className="text-sm">Selecione uma música para começar a ouvir.</p>
      </div>
    )
  }

  const currentIndex = queue?.findIndex(s => s.id === currentSong.id) ?? -1
  const nextSongs = currentIndex >= 0 && queue ? queue.slice(currentIndex + 1, currentIndex + 11) : []
  const nextSong = nextSongs.length > 0 ? nextSongs[0] : null

  if (isLyricsOpen) {
    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
          <h3 className="text-white font-bold text-lg tracking-tight">{currentSong.title}</h3>
          <button onClick={toggleLyrics} className="text-zinc-400 hover:text-white transition rounded-full hover:bg-white/10 p-1" title="Fechar letras">
            <X size={20} />
          </button>
        </div>
        <Lyrics />
      </div>
    )
  }

  if (isQueueOpen) {
    return (
      <div className="h-full flex flex-col p-4 overflow-y-auto custom-scrollbar">
        {/* Header Fila */}
        <div className="flex items-center justify-between mb-6 shrink-0 mt-2">
          <h3 className="text-white font-bold text-lg tracking-tight">Fila</h3>
          <button onClick={toggleQueue} className="text-zinc-400 hover:text-white transition rounded-full hover:bg-white/10 p-1" title="Fechar a fila">
            <X size={20} />
          </button>
        </div>

        {/* Tocando agora */}
        <div className="mb-6 shrink-0">
          <h4 className="text-white font-bold text-sm mb-3">Tocando agora</h4>
          <div className="flex items-center gap-3 p-2 -mx-2 rounded-md hover:bg-white/[0.07] transition-colors group cursor-pointer" onClick={toggleQueue}>
            <div className="w-12 h-12 rounded overflow-hidden shrink-0 bg-zinc-800 flex items-center justify-center relative">
              {currentSong.cover_url ? (
                <img src={currentSong.cover_url} className="w-full h-full object-cover" alt="" />
              ) : (
                <span className="text-zinc-500 text-xs">&#9835;</span>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded">
                <Play size={16} fill="white" className="text-white ml-0.5" />
              </div>
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[15px] font-bold text-spotify-green truncate">{currentSong.title}</span>
              <span className="text-[13px] text-zinc-400 truncate">{currentSong.artist}</span>
            </div>
          </div>
        </div>

        {/* Próximas */}
        <div className="flex-1 flex flex-col min-h-0">
          <h4 className="text-white font-bold text-sm mb-3">A seguir</h4>
          <div className="flex flex-col">
            {nextSongs.length === 0 ? (
              <div className="text-zinc-500 text-sm p-2">Não há músicas na fila.</div>
            ) : (
              nextSongs.map((song, i) => (
                <div key={`${song.id}-${i}`} className="flex items-center gap-3 p-2 -mx-2 rounded-md hover:bg-white/[0.07] transition-colors group cursor-pointer" onClick={() => playSong(song, queue)}>
                  <div className="w-12 h-12 rounded overflow-hidden shrink-0 bg-zinc-800 flex items-center justify-center relative">
                    {song.cover_url ? (
                      <img src={song.cover_url} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <span className="text-zinc-500 text-xs">&#9835;</span>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded">
                      <Play size={16} fill="white" className="text-white ml-0.5" />
                    </div>
                  </div>
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="text-[15px] font-medium text-white truncate group-hover:underline">{song.title}</span>
                    <span className="text-[13px] text-zinc-400 truncate">{song.artist}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col p-4 overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <span className="font-bold text-sm tracking-wide text-white">{currentSong.title}</span>
        <div className="flex items-center gap-1">
          <button className="text-zinc-400 hover:text-white transition p-1.5 rounded-full hover:bg-white/10" title="Opções">
            <MoreHorizontal size={18} />
          </button>
          <button className="text-zinc-400 hover:text-white transition p-1.5 rounded-full hover:bg-white/10" title="Fechar painel">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Cover Art */}
      <div className="w-full aspect-square bg-zinc-800 rounded-lg shadow-2xl overflow-hidden shrink-0">
        {currentSong.cover_url ? (
          <img src={currentSong.cover_url} alt={currentSong.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-zinc-500 text-6xl">&#9835;</span>
          </div>
        )}
      </div>

      {/* Song Info */}
      <div className="mt-4 flex flex-col shrink-0">
        <h2 className="text-xl md:text-2xl font-bold text-white truncate hover:underline cursor-pointer">{currentSong.title}</h2>
        <p className="text-sm text-zinc-400 hover:underline cursor-pointer truncate mt-0.5">{currentSong.artist}</p>
      </div>

      {/* Credits block */}
      <div className="mt-8 bg-zinc-900/50 rounded-xl p-5 border border-white/5 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-white text-[15px]">Créditos</h3>
          <button className="text-xs font-bold text-zinc-400 hover:text-white transition-colors">Mostrar tudo</button>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-bold text-white text-[15px] hover:underline cursor-pointer">{currentSong.artist}</span>
            <span className="text-[13px] text-zinc-400">Artista Principal</span>
          </div>
          <button className="px-4 py-1.5 rounded-full border border-zinc-500 font-bold text-sm text-white hover:border-white hover:scale-105 transition-all">Seguir</button>
        </div>
      </div>

      {/* Up Next block */}
      {nextSong && (
        <div className="mt-4 bg-zinc-900/50 rounded-xl p-5 border border-white/5 shrink-0 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white text-[15px]">A seguir</h3>
            <button onClick={toggleQueue} className="text-xs font-bold text-zinc-400 hover:text-white transition-colors">Abrir fila</button>
          </div>
          
          <div className="flex items-center gap-3 group cursor-pointer p-2 -mx-2 rounded-md hover:bg-white/5 transition-colors">
            {nextSong.cover_url ? (
              <img src={nextSong.cover_url} className="w-12 h-12 rounded object-cover shadow bg-zinc-800" alt="" />
            ) : (
              <div className="w-12 h-12 rounded bg-zinc-800 flex items-center justify-center shrink-0">
                <span className="text-zinc-500 text-sm">&#9835;</span>
              </div>
            )}
            <div className="flex flex-col min-w-0 flex-1">
              <span className="font-bold text-white text-[15px] truncate group-hover:underline">{nextSong.title}</span>
              <span className="text-[13px] text-zinc-400 truncate hover:text-white hover:underline mt-0.5">{nextSong.artist}</span>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
