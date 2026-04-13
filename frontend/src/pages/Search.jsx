import { useState, useEffect } from 'react'
import { Search as SearchIcon, Play, Pause, ListMusic, Heart, Plus, Music } from 'lucide-react'
import { api } from '../lib/api'
import { usePlayerStore } from '../store/usePlayerStore'
import { useLikeStore } from '../store/useLikeStore'
import PlayingBars from '../components/PlayingBars'
import AddToPlaylistModal from '../components/AddToPlaylistModal'

export default function Search() {
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const { playSong, currentSong, isPlaying, togglePlay } = usePlayerStore()
  const { isLiked, toggleLike } = useLikeStore()
  const [playlistModalSong, setPlaylistModalSong] = useState(null)

  useEffect(() => {
    // Debounced search to avoid spamming the API
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const results = await api.searchSongs(searchQuery)
        setSongs(results)
      } catch (err) {
        console.error('Search error:', err)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleSearch = (e) => {
    setSearchQuery(e.target.value)
  }

  if (loading && !songs.length) {
    return (
      <div className="px-4 pt-8">
        <div className="h-10 w-32 skeleton mb-6" />
        <div className="h-12 w-full rounded-md skeleton mb-8" />
        <div className="grid grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="aspect-[4/3] rounded-lg skeleton" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-black text-white px-4 pt-8 pb-32 select-none">
      {/* Search Header */}
      <h1 className="text-3xl font-black mb-6">Buscar</h1>

      {/* Search Input Area */}
      <div className="relative mb-8">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-900">
          <SearchIcon size={24} strokeWidth={2.5} />
        </div>
        <input 
          type="text"
          value={searchQuery}
          onChange={handleSearch}
          placeholder="O que você quer ouvir?"
          className="w-full bg-white text-zinc-900 py-3.5 pl-12 pr-4 rounded-md font-bold text-base placeholder:text-zinc-500 placeholder:font-bold outline-none border-none"
        />
      </div>

      {/* Results / All Songs Label */}
      <h2 className="text-xl font-black mb-6">
        {searchQuery ? 'Resultados' : 'Navegar por todas as músicas'}
      </h2>

      {/* Songs Grid / List */}
      <div className="space-y-3">
          {loading ? (
            <div className="py-10 text-center animate-pulse text-zinc-500">Buscando músicas...</div>
          ) : songs.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center gap-4">
               <Music size={48} className="text-zinc-800" />
               <p className="text-zinc-500">Nenhum resultado para "{searchQuery}"</p>
            </div>
          ) : (
            songs.map((song) => {
            const isActive = currentSong?.id === song.id;
            return (
              <div 
                key={song.id}
                className="flex items-center gap-4 active:bg-white/5 p-2 rounded-md transition-colors group"
                onClick={() => isActive ? togglePlay() : playSong(song, songs)}
              >
                <div className="relative w-14 h-14 rounded-[4px] overflow-hidden bg-zinc-800 shrink-0 shadow-md">
                   {song.cover_url ? (
                     <img src={song.cover_url} className="w-full h-full object-cover" alt="" />
                   ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-600 text-sm">&#9835;</div>
                   )}
                   {isActive && isPlaying && (
                     <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <PlayingBars isPlaying={true} height={16} />
                     </div>
                   )}
                </div>
                <div className="flex-1 min-w-0">
                   <h4 className={`text-base font-bold truncate tracking-tight ${isActive ? 'text-spotify-green' : 'text-white'}`}>
                      {song.title}
                   </h4>
                   <p className="text-[13px] text-zinc-400 truncate leading-tight">{song.artist}</p>
                </div>
                <div className="flex items-center gap-6">
                   <button 
                     onClick={(e) => { e.stopPropagation(); toggleLike(song) }}
                     className={`transition-all active:scale-125 ${isLiked(song.id) ? 'text-spotify-green' : 'text-zinc-500'}`}
                   >
                      <Heart size={22} fill={isLiked(song.id) ? "currentColor" : "none"} />
                   </button>
                   <button 
                     onClick={(e) => { e.stopPropagation(); setPlaylistModalSong(song) }}
                     className="text-zinc-500 hover:text-white transition-all active:scale-125"
                   >
                      <Plus size={22} />
                   </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {playlistModalSong && (
        <AddToPlaylistModal 
          song={playlistModalSong} 
          onClose={() => setPlaylistModalSong(null)} 
        />
      )}
    </div>
  )
}
