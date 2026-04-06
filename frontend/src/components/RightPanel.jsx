import { usePlayerStore } from '../store/usePlayerStore'
import { MoreHorizontal, X } from 'lucide-react'

export default function RightPanel() {
  const { currentSong } = usePlayerStore()

  if (!currentSong) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-zinc-500 p-8 text-center space-y-4">
        <div className="w-20 h-20 bg-zinc-800 rounded-lg animate-pulse" />
        <h2 className="text-lg font-bold text-white">Pronto para dar o play?</h2>
        <p className="text-sm">Selecione uma música para começar a ouvir.</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="font-bold text-sm tracking-wide text-white">{currentSong.title}</span>
        <div className="flex items-center gap-1">
          <button className="text-zinc-400 hover:text-white transition p-1.5 rounded-full hover:bg-white/10">
            <MoreHorizontal size={18} />
          </button>
          <button className="text-zinc-400 hover:text-white transition p-1.5 rounded-full hover:bg-white/10">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Cover Art */}
      <div className="w-full aspect-square bg-zinc-800 rounded-lg shadow-2xl overflow-hidden">
        {currentSong.cover_url ? (
          <img src={currentSong.cover_url} alt={currentSong.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-zinc-500 text-6xl">&#9835;</span>
          </div>
        )}
      </div>

      {/* Song Info */}
      <div className="mt-4 flex flex-col">
        <h2 className="text-xl font-bold text-white truncate">{currentSong.title}</h2>
        <p className="text-sm text-zinc-400 truncate">{currentSong.artist}</p>
      </div>

      {/* Progress dots (visual decoration like Spotify) */}
      <div className="flex items-center justify-center gap-1 mt-6">
        <span className="w-1.5 h-1.5 rounded-full bg-white" />
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
      </div>
    </div>
  )
}
