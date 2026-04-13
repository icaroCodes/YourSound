import { useState } from 'react'
import { useAuthStore } from '../store/useAuthStore'
import { usePlayerStore } from '../store/usePlayerStore'
import { useLikeStore } from '../store/useLikeStore'
import { Play, Pause, Shuffle, Clock, List, Heart, Plus } from 'lucide-react'
import AddToPlaylistModal from '../components/AddToPlaylistModal'

export default function LikedSongs() {
  const { userProfile } = useAuthStore()
  const { playSong, currentSong, isPlaying, togglePlay } = usePlayerStore()
  const { likedSongs, toggleLike, isLiked } = useLikeStore()
  const [hoveredRow, setHoveredRow] = useState(null)
  const [playlistModalSong, setPlaylistModalSong] = useState(null)

  const username = userProfile?.display_name || 'Usuário'

  const handlePlayAll = () => {
    if (likedSongs.length > 0) playSong(likedSongs[0], likedSongs)
  }

  const handleRowClick = (song) => {
    if (currentSong?.id === song.id) togglePlay()
    else playSong(song, likedSongs)
  }

  const formatTime = (seconds) => {
    if (!seconds) return '--:--'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  const formatAddedDate = (dateStr) => {
    if (!dateStr) return '--'
    const date = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return 'hoje'
    if (diffDays === 1) return 'há 1 dia'
    if (diffDays < 7) return `há ${diffDays} dias`
    if (diffDays < 14) return 'há 1 semana'
    if (diffDays < 30) return `há ${Math.floor(diffDays / 7)} semanas`
    return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const totalDuration = likedSongs.reduce((acc, s) => acc + (s.duration || 0), 0)
  const formatTotalTime = (seconds) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    if (h > 0) return `${h}h ${m}min ${String(s).padStart(2, '0')}s`
    return `${m}min ${String(s).padStart(2, '0')}s`
  }

  return (
    <div className="pb-8">
      {/* ─── Purple Gradient Header ─── */}
      <div
        className="px-6 pt-12 pb-6 flex items-end gap-6"
        style={{ background: 'linear-gradient(to bottom, #0a2818 0%, #0d1f13 50%, #121212 100%)' }}
      >
        {/* Cover — purple gradient with heart */}
        <div className="w-57.5 h-57.5 rounded shadow-2xl shrink-0 overflow-hidden bg-linear-to-br from-spotify-green to-[#0d9e42] flex items-center justify-center">
          <Heart size={80} fill="white" stroke="none" />
        </div>

        {/* Info */}
        <div className="flex flex-col gap-2 min-w-0 pb-1">
          <span className="text-xs font-medium uppercase tracking-wider text-white/70">Playlist</span>
          <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight leading-none">
            Músicas Curtidas
          </h1>
          <div className="flex items-center gap-1.5 text-sm mt-2 flex-wrap">
            <span className="font-bold text-white">{username}</span>
            <span className="text-zinc-400">&bull;</span>
            <span className="text-zinc-400">
              {likedSongs.length} música{likedSongs.length !== 1 ? 's' : ''}
              {totalDuration > 0 && `, ${formatTotalTime(totalDuration)}`}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Actions Bar ─── */}
      <div className="px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handlePlayAll}
            disabled={likedSongs.length === 0}
            className="w-14 h-14 bg-spotify-green rounded-full flex items-center justify-center hover:scale-105 hover:bg-spotify-green-hover transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
          >
            <Play fill="black" stroke="none" size={24} className="ml-0.5" />
          </button>
          <button className="text-zinc-400 hover:text-white transition p-2">
            <Shuffle size={22} />
          </button>
        </div>
        <div className="flex items-center gap-2 text-zinc-400">
          <span className="text-sm font-medium">Lista</span>
          <List size={18} />
        </div>
      </div>

      {/* ─── Song Table ─── */}
      <div className="px-6">
        {likedSongs.length === 0 ? (
          <div className="text-zinc-500 py-16 text-center border border-dashed border-white/5 rounded-lg">
            <Heart size={40} className="mx-auto mb-3 text-zinc-600" />
            <p className="text-base">Você ainda não curtiu nenhuma música.</p>
            <p className="text-sm mt-1 text-zinc-600">Curta músicas para vê-las aqui.</p>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="grid grid-cols-[40px_2fr_1.5fr_1.2fr_40px_40px_60px] items-center px-4 py-2 border-b border-white/10 text-zinc-400 text-xs uppercase tracking-wider font-medium mb-2">
              <span className="text-center">#</span>
              <span>Título</span>
              <span className="hidden md:block">Álbum</span>
              <span className="hidden lg:block">Adicionada em</span>
              <span></span>
              <span></span>
              <span className="flex justify-end"><Clock size={14} /></span>
            </div>

            {/* Song Rows */}
            {likedSongs.map((song, idx) => {
              const isActive = currentSong?.id === song.id
              const playing = isActive && isPlaying
              const hovered = hoveredRow === idx

              return (
                <div
                  key={song.id}
                  className={`group grid grid-cols-[40px_2fr_1.5fr_1.2fr_40px_40px_60px] items-center px-4 py-1.5 rounded-md transition-colors cursor-pointer ${
                    isActive ? 'bg-white/8' : 'hover:bg-white/6'
                  }`}
                  onMouseEnter={() => setHoveredRow(idx)}
                  onMouseLeave={() => setHoveredRow(null)}
                  onClick={() => handleRowClick(song)}
                >
                  {/* # / Play icon */}
                  <div className="flex items-center justify-center w-6 h-6">
                    {hovered ? (
                      playing
                        ? <Pause size={14} fill="white" stroke="none" />
                        : <Play size={14} fill="white" stroke="none" className="ml-0.5" />
                    ) : isActive ? (
                      <div className="flex items-end gap-0.5 h-3">
                        <span className="w-0.75 bg-spotify-green rounded-full animate-pulse" style={{ height: '60%' }} />
                        <span className="w-0.75 bg-spotify-green rounded-full animate-pulse" style={{ height: '100%', animationDelay: '0.15s' }} />
                        <span className="w-0.75 bg-spotify-green rounded-full animate-pulse" style={{ height: '40%', animationDelay: '0.3s' }} />
                      </div>
                    ) : (
                      <span className="text-sm text-zinc-400 font-medium">{idx + 1}</span>
                    )}
                  </div>

                  {/* Title + Cover + Artist */}
                  <div className="flex items-center gap-3 min-w-0 pr-4">
                    {song.cover_url ? (
                      <img src={song.cover_url} className="w-10 h-10 rounded object-cover shrink-0" alt="" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-zinc-800 flex items-center justify-center shrink-0 text-zinc-500 text-xs">&#9835;</div>
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className={`font-medium truncate text-sm ${isActive ? 'text-spotify-green' : 'text-white'}`}>
                        {song.title}
                      </span>
                      <span className="text-xs text-zinc-400 truncate">{song.artist}</span>
                    </div>
                  </div>

                  {/* Álbum */}
                  <span className="text-sm text-zinc-400 truncate hidden md:block hover:underline hover:text-white transition-colors">
                    {song.album || song.title}
                  </span>

                  {/* Adicionada em */}
                  <span className="text-sm text-zinc-400 truncate hidden lg:block">
                    {formatAddedDate(song.liked_at)}
                  </span>

                  {/* Unlike */}
                  <div className="flex items-center justify-center">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleLike(song) }}
                      className="text-spotify-green hover:scale-110 transition-all"
                    >
                      <Heart size={14} fill="currentColor" />
                    </button>
                  </div>

                  {/* Add to Playlist */}
                  <div className="flex items-center justify-center">
                    <button
                      onClick={(e) => { e.stopPropagation(); setPlaylistModalSong(song) }}
                      className="text-zinc-400 hover:text-white transition-all opacity-0 group-hover:opacity-100 p-1"
                      title="Adicionar à playlist"
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  {/* Duration */}
                  <div className="flex items-center justify-end">
                    <span className="text-sm text-zinc-400">{formatTime(song.duration)}</span>
                  </div>
                </div>
              )
            })}
          </>
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
